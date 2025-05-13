import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Space, 
  NavBar, 
  Grid, 
  Card,
  Toast,
  Dialog,
  Divider,
  WaterMark
} from 'antd-mobile';
import { SoundOutline, AudioOutline, CloseCircleOutline } from 'antd-mobile-icons';
import { v4 as uuidv4 } from 'uuid';
import MobileNavButton from '../../components/MobileNavButton';
import apiClient from '../../services/apiClient';
import useTTS from '../../hooks/useTTS';
import useVoice from '../../hooks/useVoice';
import useIntent from '../../hooks/useIntent';
import './VoiceAIMobile.css';

// 添加兼容性检查
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition || null;

const VoiceAIMobile = () => {
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [apiAvailable, setApiAvailable] = useState(true);
  const [waitingForConfirmation, setWaitingForConfirmation] = useState(false);
  const [currentToolId, setCurrentToolId] = useState('');
  const [currentParams, setCurrentParams] = useState({});
  const [originalQuery, setOriginalQuery] = useState('');
  
  // 使用hooks
  const { speak, cancel, isSpeaking } = useTTS();
  const voice = useVoice(); // 使用useVoice hook代替原生API
  const { classifyIntent } = useIntent(); // 使用useIntent hook进行意图分类
  
  useEffect(() => {
    // 检查API可用性
    if (!SpeechRecognitionAPI) {
      setApiAvailable(false);
      Toast.show({
        icon: 'fail',
        content: '您的浏览器不支持语音识别',
        duration: 3000,
      });
      return;
    }
    
    // 生成新的会话ID
    setSessionId(uuidv4());
  }, []);
  
  // 使用useEffect监听voice.transcript变化
  useEffect(() => {
    if (waitingForConfirmation && voice.transcript) {
      console.log("收到确认语音回复:", voice.transcript);
      
      // 使用useIntent的classifyIntent方法分类意图,传入原始查询文本
      const intent = classifyIntent(voice.transcript, originalQuery);
      console.log("分类意图结果:", intent);
      
      // 如果返回IGNORE,跳过本次输入处理
      if (intent === 'IGNORE') {
        console.log("忽略当前输入,继续等待确认");
        return;
      }
      
      // 停止监听
      voice.stopListening();
      
      // 根据意图类型执行不同操作
      if (intent === 'CONFIRM') {
        // 设置执行标志,防止重复执行
        if (executing) {
          console.log("已经在执行中,忽略重复确认");
          return;
        }
        
        // 延迟执行,等待状态更新完成
        setTimeout(() => {
          // 确保操作信息存在
          if (currentToolId) {
            Toast.show({
              icon: 'loading',
              content: '正在执行操作...',
              duration: 0,
            });
            
            setWaitingForConfirmation(false);
            executeAction(currentToolId, currentParams).finally(() => {
              Toast.clear();
            });
          } else {
            console.log("工具ID为空,无法执行操作");
            Toast.show({
              content: '无法执行操作,请重试',
            });
            setWaitingForConfirmation(false);
          }
        }, 300);
      } else if (intent === 'RETRY') {
        // 重新处理原始文本
        setWaitingForConfirmation(false);
        if (text) {
          Toast.show({
            content: '正在重新处理您的请求...',
          });
          processIntent(text);
        }
      } else if (intent === 'CANCEL') {
        Toast.show({
          icon: 'success',
          content: '已取消操作',
        });
        setWaitingForConfirmation(false);
        setConfirmText('');
        setCurrentToolId('');
        setCurrentParams({});
      } else {
        // 如果意图不明确,默认为取消
        Toast.show({
          icon: 'info',
          content: '未能识别您的回复,已取消操作',
        });
        setWaitingForConfirmation(false);
        setConfirmText('');
      }
    }
  }, [voice.transcript, waitingForConfirmation, classifyIntent, currentToolId, currentParams, text, originalQuery, executing]);
  
  // 使用useEffect监听isSpeaking状态变化
  useEffect(() => {
    setSpeaking(isSpeaking);
    
    // 当TTS停止播放且在等待确认状态时,自动开始语音识别
    if (!isSpeaking && waitingForConfirmation && confirmText) {
      console.log("TTS播放结束,准备监听确认回复...");
      
      // 使用更长的延迟,确保TTS完全停止且用户有足够时间反应
      // 避免TTS/STT冲突和循环
      const delay = 2000; // 增加到2秒,给用户足够反应时间
      const timer = setTimeout(() => {
        // 再次检查是否仍然处于等待确认状态
        // 增加检查执行状态,如果已经在执行或处理中则不启动语音识别
        if (waitingForConfirmation && !voice.isListening && !processing && !executing) {
          console.log("开始监听确认回复...");
          voice.startListening();
          setListening(true);
        } else {
          console.log("状态已变化,取消启动语音识别");
        }
      }, delay);
      
      // 清理函数,避免组件卸载时仍然执行定时器
      return () => clearTimeout(timer);
    }
  }, [isSpeaking, waitingForConfirmation, confirmText, voice, processing, executing]);
  
  // 使用useEffect监听voice.isListening状态
  useEffect(() => {
    setListening(voice.isListening);
    
    // 当语音识别结束且有结果且不是在等待确认的状态下,处理语音识别结果
    if (!voice.isListening && voice.transcript && !waitingForConfirmation && !processing) {
      // 为防止重复处理,添加一个标记或检查对象
      const currentTranscript = voice.transcript;
      console.log("语音识别结束,处理用户输入:", currentTranscript);
      
      // 保存原始查询文本,用于后续意图分类
      setOriginalQuery(currentTranscript);
      
      // 短暂延迟确保状态已稳定
      setTimeout(() => {
        if (!processing) {
          setText(currentTranscript);
          processIntent(currentTranscript);
        }
      }, 200);
    }
  }, [voice.isListening, voice.transcript, waitingForConfirmation, processing]);

  // 监听语音识别错误
  useEffect(() => {
    if (voice.error) {
      console.error("语音识别错误:", voice.error);
      Toast.show({
        icon: 'fail',
        content: voice.error,
        duration: 2000,
      });
    }
  }, [voice.error]);
  
  // 开始语音识别
  const startListening = async () => {
    if (!apiAvailable) {
      Toast.show({
        icon: 'fail',
        content: '您的浏览器不支持语音识别',
      });
      return;
    }
    
    // 重置状态
    setText('');
    setResult('');
    setConfirmText('');
    setCurrentToolId('');
    setCurrentParams({});
    setWaitingForConfirmation(false);
    
    // 如果已经在监听，先停止
    if (voice.isListening) {
      await voice.stopListening();
      // 短暂延迟确保完全停止
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    try {
      console.log("VoiceAIMobile: 开始语音识别...");
      setListening(true);
      voice.startListening();
    } catch (error) {
      console.error('启动语音识别失败:', error);
      setListening(false);
      Toast.show({
        icon: 'fail',
        content: '启动语音识别失败，请重试',
      });
    }
  };
  
  // 处理用户意图
  const processIntent = async (userText) => {
    if (processing) {
      console.log("已经在处理中,忽略重复请求");
      return; // 避免重复处理
    }
    
    setProcessing(true);
    
    try {
      console.log(`开始处理意图: "${userText}"`);
      const response = await apiClient.interpret(userText, sessionId, 1);
      
      // 判断是否需要确认
      if (response.type === 'confirm' || (response.tool_calls && response.tool_calls.length > 0)) {
        // 获取确认文本
        const confirmMessage = response.confirmText || response.confirm_text || '您确定要执行此操作吗？';
        setConfirmText(confirmMessage);
        
        // 准备工具ID和参数
        let toolId = '';
        let params = {};
        
        if (response.tool_calls && response.tool_calls.length > 0) {
          // 新的API结构
          const toolCall = response.tool_calls[0];
          toolId = toolCall.tool_id;
          params = toolCall.parameters || {};
        } else {
          // 旧的API结构
          toolId = response.action;
          params = response.params || {};
        }
        
        // 先存储当前工具ID和参数,用于后续执行
        setCurrentToolId(toolId);
        setCurrentParams(params);
        
        // 确保不会在TTS播放前就开始监听语音
        setListening(false);
        if (voice.isListening) {
          await voice.stopListening();
        }
        
        // 设置等待确认状态
        setWaitingForConfirmation(true);
        
        // 延迟一点再播放TTS,确保状态更新已完成
        // 停止任何正在播放的语音
        if (isSpeaking) {
          cancel();
          // 给取消操作一点时间完成
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // 播放确认文本
        console.log(`开始播放确认文本: "${confirmMessage}"`);
        speak(confirmMessage);
        setSpeaking(true);
      } else if (response.content) {
        // 直接响应
        setResult(response.content);
        speak(response.content);
      } else {
        setResult('无法理解您的请求,请重试');
        speak('无法理解您的请求,请重试');
      }
    } catch (error) {
      console.error('处理意图失败:', error);
      Toast.show({
        icon: 'fail',
        content: error.message || '服务器错误,请重试',
      });
    } finally {
      // 短延迟后才释放processing状态,避免重复处理
      setTimeout(() => {
        setProcessing(false);
      }, 300);
    }
  };
  
  // 执行操作
  const executeAction = async (toolId, params) => {
    // 防止重复执行
    if (executing) {
      console.log("已经在执行操作,忽略重复请求");
      return;
    }
    
    setExecuting(true);
    
    try {
      // 确保在执行操作前,不再处于等待确认状态
      setWaitingForConfirmation(false);
      
      console.log(`开始执行操作,工具ID: ${toolId}`);
      const response = await apiClient.execute(toolId, params, sessionId, 1);
      
      if (response.success) {
        // 确保TTS已停止
        cancel();
        
        // 提取要显示的文本内容
        const displayText = formatResultForDisplay(response.data);
        setResult(displayText);
        
        // 提取要播报的语音内容
        const speechText = formatResultForSpeech(response.data);
        
        // 延迟一点播放TTS,确保状态更新已完成
        setTimeout(() => {
          console.log(`播报执行结果: "${speechText.substring(0, 30)}${speechText.length > 30 ? '...' : ''}"`);
          speak(speechText);
        }, 300);
      } else {
        const errorMessage = `执行失败: ${response.error?.message || '未知错误'}`;
        setResult(errorMessage);
        
        // 确保TTS已停止
        cancel();
        
        // 延迟一点播放错误信息
        setTimeout(() => {
          speak(`很抱歉,执行失败。${response.error?.message || '发生了未知错误'}`);
        }, 300);
      }
    } catch (error) {
      console.error('执行操作失败:', error);
      setResult('服务器错误,请重试');
      
      // 确保TTS已停止
      cancel();
      
      // 延迟一点播放错误信息
      setTimeout(() => {
        speak('很抱歉,服务器出现错误,请重试');
      }, 300);
    } finally {
      // 延迟一点重置状态
      setTimeout(() => {
        setExecuting(false);
        // 重置工具ID和参数
        setCurrentToolId('');
        setCurrentParams({});
        // 清除确认文本
        setConfirmText('');
      }, 300);
    }
  };
  
  // 格式化结果用于语音播报
  const formatResultForSpeech = (data) => {
    if (!data) return '没有返回结果';
    
    // 优先使用专门为TTS准备的字段
    if (typeof data === 'object') {
      if (data.tts_message) return data.tts_message;
      if (data.summary) return data.summary;
    }
    
    // 如果没有专门的TTS字段,使用通用格式化
    return formatResultForDisplay(data);
  };
  
  // 格式化结果用于显示
  const formatResultForDisplay = (data) => {
    if (!data) return '没有返回结果';
    
    // 处理字符串
    if (typeof data === 'string') return data;
    
    // 处理对象
    if (typeof data === 'object') {
      // 优先级处理常见的返回字段
      if (data.tts_message) return data.tts_message;
      if (data.message) return data.message;
      if (data.summary) return data.summary;
      if (data.result) return data.result;
      
      // 处理天气数据
      if (data.weather || data.temperature) {
        let result = '';
        if (data.location) result += `${data.location}的天气：`;
        if (data.weather) result += data.weather;
        if (data.temperature) result += `,温度${data.temperature}`;
        if (result) return result;
      }
      
      // 处理其他结构化数据
      try {
        return JSON.stringify(data, null, 2);
      } catch (e) {
        return '操作已完成,但无法显示详细结果';
      }
    }
    
    return '操作已完成';
  };
  
  // 取消语音输出
  const cancelSpeech = () => {
    cancel();
    setSpeaking(false);
    
    // 如果正在等待确认,取消确认流程
    if (waitingForConfirmation) {
      // 延迟重置状态,确保取消操作完全生效
      setTimeout(() => {
        setWaitingForConfirmation(false);
        if (voice.isListening) {
          voice.stopListening();
        }
        setConfirmText('');
        setCurrentToolId('');
        setCurrentParams({});
        setListening(false);
      }, 300);
    }
  };
  
  // 添加重置会话的函数
  const resetSession = async () => {
    // 取消任何正在进行的语音
    cancel();
    
    // 如果正在监听,停止监听
    if (voice.isListening) {
      await voice.stopListening();
    }
    
    // 重置所有状态
    setText('');
    setResult('');
    setConfirmText('');
    setListening(false);
    setProcessing(false);
    setExecuting(false);
    setSpeaking(false);
    setWaitingForConfirmation(false);
    setCurrentToolId('');
    setCurrentParams({});
    
    // 生成新的会话ID
    const newSessionId = uuidv4();
    setSessionId(newSessionId);
    console.log('已重置会话,新的会话ID:', newSessionId);
    
    // 显示提示
    Toast.show({
      icon: 'success',
      content: '会话已重置',
      duration: 1500,
    });
  };
  
  // 添加测试按钮用于非语音环境
  const handleDemoText = () => {
    const demoText = "查询今天的天气";
    setText(demoText);
    processIntent(demoText);
  };

  return (
    <div className="voice-ai-container">
      <NavBar backArrow={false} style={{ 
        background: '#1677ff', 
        color: 'white',
        fontWeight: 'bold'
      }}>全语音 AI 助手</NavBar>
      
      <div className="content-area">
        {text && (
          <Card title="您的请求" headerStyle={{ color: '#1677ff' }}>
            <div className="user-text">{text}</div>
          </Card>
        )}
        
        {confirmText && (
          <Card title="确认信息" headerStyle={{ color: '#722ed1' }}>
            <div className="confirm-text">{confirmText}</div>
          </Card>
        )}
        
        {waitingForConfirmation && voice.transcript && (
          <Card title="您的回复" headerStyle={{ color: '#1890ff' }}>
            <div className="user-text">{voice.transcript}</div>
          </Card>
        )}
        
        {result && (
          <Card title="执行结果" headerStyle={{ color: '#52c41a' }}>
            <div className="result-text">
              {(() => {
                try {
                  const jsonObj = JSON.parse(result);
                  // 是JSON,格式化显示
                  return (
                    <pre style={{ 
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflowX: 'auto',
                      padding: '8px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '4px'
                    }}>
                      {JSON.stringify(jsonObj, null, 2)}
                    </pre>
                  );
                } catch (e) {
                  // 不是JSON,按普通文本显示
                  return <p style={{ lineHeight: '1.5' }}>{result}</p>;
                }
              })()}
            </div>
          </Card>
        )}
        
        {!text && !confirmText && !result && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            color: '#666' 
          }}>
            <SoundOutline style={{ fontSize: 48, color: '#1677ff' }} />
            <p style={{ marginTop: 16 }}>点击下方按钮开始语音对话</p>
          </div>
        )}
      </div>
      
      <div className="status-indicator">
        {listening && <div className="status listening">正在聆听{waitingForConfirmation ? '您的确认' : '您的指令'}...</div>}
        {processing && <div className="status processing">正在处理...</div>}
        {executing && <div className="status executing">正在执行...</div>}
        {speaking && <div className="status speaking">正在播报...</div>}
        {waitingForConfirmation && !listening && !speaking && (
          <div className="status waiting">请语音确认或取消...</div>
        )}
        {!listening && !processing && !executing && !speaking && !waitingForConfirmation && (
          <div style={{ padding: '8px', color: '#666' }}>空闲中,等待您的指令</div>
        )}
      </div>
      
      <div className="control-area">
        <Grid columns={3} gap={8}>
          <Grid.Item>
            <Button
              block
              color="primary"
              size="large"
              loading={listening}
              disabled={processing || executing || speaking || waitingForConfirmation || !apiAvailable}
              onClick={startListening}
              icon={<SoundOutline />}
            >
              {listening ? '录音中...' : '开始录音'}
            </Button>
          </Grid.Item>
          
          <Grid.Item>
            <Button
              block
              color="warning"
              size="large"
              disabled={!speaking && !waitingForConfirmation}
              onClick={cancelSpeech}
              icon={<CloseCircleOutline />}
            >
              {speaking ? '停止播报' : '取消操作'}
            </Button>
          </Grid.Item>
          
          <Grid.Item>
            <Button
              block
              color="success"
              size="large"
              disabled={!result}
              onClick={() => {
                try {
                  const resultData = JSON.parse(result);
                  speak(formatResultForSpeech(resultData));
                } catch(e) {
                  speak(result);
                }
              }}
              icon={<AudioOutline />}
            >
              重新播报
            </Button>
          </Grid.Item>
        </Grid>
        
        {/* 添加重置按钮 */}
        {(text || result || confirmText) && (
          <Button
            block
            color="default"
            size="middle"
            onClick={resetSession}
            style={{ marginTop: '12px' }}
          >
            清除并重置会话
          </Button>
        )}
        
        {!apiAvailable && (
          <Button
            block
            color="primary"
            size="large"
            onClick={handleDemoText}
            style={{ marginTop: '12px' }}
          >
            测试功能（不用语音）
          </Button>
        )}
      </div>
      
      <div style={{ 
        padding: '8px 0', 
        textAlign: 'center',
        fontSize: '12px',
        color: '#999',
        backgroundColor: '#f5f5f5',
        borderTop: '1px solid #eee'
      }}>
        Echo AI 语音助手 © 2025
      </div>
      
      <WaterMark content="Echo AI" />
      
      {/* 添加导航按钮 */}
      <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
        <Button 
          size="mini" 
          onClick={() => window.location.href = '/classic'}
        >
          切换到经典版
        </Button>
      </div>
    </div>
  );
};

export default VoiceAIMobile; 
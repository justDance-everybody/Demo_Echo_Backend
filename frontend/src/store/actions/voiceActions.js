/**
 * 语音交互相关的Action Creators
 */

import { VOICE_ACTIONS } from '../reducers/voiceReducer';

// 录音相关actions
export const startRecording = () => ({
  type: VOICE_ACTIONS.START_RECORDING,
});

export const stopRecording = () => ({
  type: VOICE_ACTIONS.STOP_RECORDING,
});

// 播放相关actions
export const startPlaying = () => ({
  type: VOICE_ACTIONS.START_PLAYING,
});

export const stopPlaying = () => ({
  type: VOICE_ACTIONS.STOP_PLAYING,
});

// 处理状态actions
export const startProcessing = () => ({
  type: VOICE_ACTIONS.START_PROCESSING,
});

export const stopProcessing = () => ({
  type: VOICE_ACTIONS.STOP_PROCESSING,
});

// 音频相关actions
export const updateAudioLevel = (level) => ({
  type: VOICE_ACTIONS.UPDATE_AUDIO_LEVEL,
  payload: { level },
});

export const setCurrentAudio = (audio) => ({
  type: VOICE_ACTIONS.SET_CURRENT_AUDIO,
  payload: { audio },
});

export const updateRecordingDuration = (duration) => ({
  type: VOICE_ACTIONS.UPDATE_RECORDING_DURATION,
  payload: { duration },
});

// 设置相关actions
export const updateVoiceSettings = (settings) => ({
  type: VOICE_ACTIONS.UPDATE_VOICE_SETTINGS,
  payload: { settings },
});

// 错误处理actions
export const setVoiceError = (error) => ({
  type: VOICE_ACTIONS.SET_ERROR,
  payload: { error },
});

export const clearVoiceError = () => ({
  type: VOICE_ACTIONS.CLEAR_ERROR,
});

// 转录相关actions
export const setTranscript = (transcript) => ({
  type: VOICE_ACTIONS.SET_TRANSCRIPT,
  payload: { transcript },
});

// 监听状态actions
export const startListening = () => ({
  type: VOICE_ACTIONS.START_LISTENING,
});

export const stopListening = () => ({
  type: VOICE_ACTIONS.STOP_LISTENING,
});

export const resetVoiceState = () => ({
  type: VOICE_ACTIONS.RESET_VOICE_STATE,
});

// 复合actions（异步操作）
export const performVoiceRecording = () => async (dispatch, getState, { voiceService }) => {
  try {
    dispatch(startRecording());
    const audioData = await voiceService.startRecording();
    dispatch(setCurrentAudio(audioData));
    return { success: true, audioData };
  } catch (error) {
    dispatch(setVoiceError(error.message));
    dispatch(stopRecording());
    return { success: false, error: error.message };
  }
};

export const performVoiceTranscription = (audioData) => async (dispatch, getState, { voiceService }) => {
  try {
    dispatch(startProcessing());
    const transcript = await voiceService.transcribeAudio(audioData);
    dispatch(setTranscript(transcript));
    dispatch(stopProcessing());
    return { success: true, transcript };
  } catch (error) {
    dispatch(setVoiceError(error.message));
    dispatch(stopProcessing());
    return { success: false, error: error.message };
  }
};

export const performTextToSpeech = (text) => async (dispatch, getState, { voiceService }) => {
  try {
    dispatch(startProcessing());
    const audioUrl = await voiceService.synthesizeSpeech(text);
    dispatch(setCurrentAudio(audioUrl));
    dispatch(startPlaying());
    dispatch(stopProcessing());
    return { success: true, audioUrl };
  } catch (error) {
    dispatch(setVoiceError(error.message));
    dispatch(stopProcessing());
    return { success: false, error: error.message };
  }
};

export const performVoiceCommand = (command) => async (dispatch, getState, { voiceService, intentService }) => {
  try {
    dispatch(startProcessing());
    
    // 意图识别
    const intent = await intentService.recognizeIntent(command);
    
    // 执行相应的操作
    const result = await voiceService.executeVoiceCommand(intent);
    
    dispatch(stopProcessing());
    return { success: true, intent, result };
  } catch (error) {
    dispatch(setVoiceError(error.message));
    dispatch(stopProcessing());
    return { success: false, error: error.message };
  }
};
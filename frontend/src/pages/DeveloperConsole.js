import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../components/Layout/AppLayout';
import apiClient from '../services/apiClient';
import { toast } from '../components/common/Toast';

// 样式定义
const Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Card = styled.div`
  background: var(--card-bg);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
  padding: 20px;
  margin-bottom: 20px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
`;

const ActionButton = styled.button`
  background-color: var(--primary);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: var(--primary-dark);
  }
  
  &:disabled {
    background-color: var(--disabled);
    cursor: not-allowed;
  }
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid var(--border);
  margin-bottom: 20px;
`;

const Tab = styled.div`
  padding: 10px 16px;
  cursor: pointer;
  border-bottom: 2px solid ${props => props.active ? 'var(--primary)' : 'transparent'};
  color: ${props => props.active ? 'var(--primary)' : 'var(--text-secondary)'};
  font-weight: ${props => props.active ? '600' : '400'};
  transition: all 0.2s;
  
  &:hover {
    color: var(--primary);
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid var(--border-light);
  }
  
  th {
    font-weight: 600;
    color: var(--text-secondary);
  }
  
  tr:hover td {
    background-color: var(--hover);
  }
`;

const Badge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  background-color: ${props => {
    switch (props.status) {
      case 'active': return 'var(--success-light)';
      case 'pending': return 'var(--warning-light)';
      case 'rejected': return 'var(--error-light)';
      default: return 'var(--info-light)';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'active': return 'var(--success)';
      case 'pending': return 'var(--warning)';
      case 'rejected': return 'var(--error)';
      default: return 'var(--info)';
    }
  }};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  text-align: center;
  color: var(--text-secondary);
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background-color: var(--input-bg);
  color: var(--text);
  
  &:focus {
    border-color: var(--primary);
    outline: none;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background-color: var(--input-bg);
  color: var(--text);
  min-height: 120px;
  resize: vertical;
  
  &:focus {
    border-color: var(--primary);
    outline: none;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background-color: var(--input-bg);
  color: var(--text);
  
  &:focus {
    border-color: var(--primary);
    outline: none;
  }
`;

// 返回按钮
const BackButton = styled.button`
  background: none;
  border: none;
  color: var(--primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  font-weight: 500;
  margin-bottom: 20px;
  
  &:hover {
    text-decoration: underline;
  }
`;

// 详情项
const DetailItem = styled.div`
  margin-bottom: 16px;
  
  .label {
    font-weight: 500;
    margin-bottom: 4px;
    color: var(--text-secondary);
  }
  
  .value {
    color: var(--text);
  }
`;

// API测试表单
const TestForm = styled.div`
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
`;

// 代码块
const CodeBlock = styled.pre`
  background-color: ${props => props.theme.isDark ? '#1E1E2F' : '#f5f5f5'};
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: monospace;
  margin: 16px 0;
`;

/**
 * 第三方开发者控制台页面
 */
const DeveloperConsole = () => {
  const navigate = useNavigate();
  const params = useParams();
  const [activeTab, setActiveTab] = useState('services');
  const [services, setServices] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    type: 'http',
    description: '',
    endpoint: '',
    authType: 'none',
    authKey: ''
  });
  
  // 服务详情状态
  const [currentService, setCurrentService] = useState(null);
  const [testPayload, setTestPayload] = useState('{\n  "query": "测试查询"\n}');
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  
  // 检查是否在详情页面
  const isDetailPage = params && params.id;
  
  // 加载服务详情
  useEffect(() => {
    const loadServiceDetail = async () => {
      if (!isDetailPage) return;
      
      setLoading(true);
      try {
        // 尝试从API获取服务详情
        const serviceData = await apiClient.getDeveloperServiceById(params.id);
        setCurrentService(serviceData);
        setLoading(false);
      } catch (error) {
        console.error('加载服务详情失败:', error);
        toast.warning('使用模拟数据，实际API连接失败');
        
        // 使用模拟数据作为回退
        setTimeout(() => {
          setCurrentService({
            id: params.id,
            name: '示例API服务',
            type: 'http',
            description: '这是一个演示用的API服务，用于展示开发者控制台功能。',
            endpoint: 'https://api.example.com/demo',
            status: 'active',
            created: '2025-05-01',
            usage: 1243,
            authType: 'apikey',
            authKey: 'X-API-Key',
            schema: {
              input: {
                type: 'object',
                properties: {
                  query: { type: 'string' }
                }
              },
              output: {
                type: 'object',
                properties: {
                  result: { type: 'string' },
                  confidence: { type: 'number' }
                }
              }
            }
          });
          setLoading(false);
        }, 800);
      }
    };
    
    loadServiceDetail();
  }, [isDetailPage, params.id]);

  // 模拟加载开发者服务数据
  useEffect(() => {
    const loadDeveloperData = async () => {
      if (isDetailPage) return; // 如果是详情页面，不加载列表数据
      
      setLoading(true);
      try {
        // 尝试从API获取服务列表
        const servicesData = await apiClient.getDeveloperServices();
        setServices(servicesData || []);
        
        // 尝试从API获取应用列表
        const applicationsData = await apiClient.getDeveloperApplications();
        setApplications(applicationsData || []);
        
        setLoading(false);
      } catch (error) {
        console.error('加载开发者数据失败:', error);
        toast.warning('使用模拟数据，实际API连接失败');
        
        // 使用模拟数据作为回退
        setTimeout(() => {
          setServices([
            {
              id: 'dev-svc-1',
              name: '股票查询服务',
              type: 'http',
              status: 'active',
              created: '2025-04-30',
              usage: 1243
            },
            {
              id: 'dev-svc-2',
              name: '新闻资讯API',
              type: 'mcp',
              status: 'active',
              created: '2025-05-01',
              usage: 532
            },
            {
              id: 'dev-svc-3',
              name: '智能翻译工具',
              type: 'http',
              status: 'pending',
              created: '2025-05-10',
              usage: 0
            }
          ]);
          
          setApplications([
            {
              id: 'app-1',
              name: '旅游助手',
              appKey: 'app_key_12345',
              status: 'active',
              created: '2025-04-15',
              services: 3
            },
            {
              id: 'app-2',
              name: '学习工具集',
              appKey: 'app_key_67890',
              status: 'active',
              created: '2025-04-29',
              services: 2
            }
          ]);
          
          setLoading(false);
        }, 800);
      }
    };
    
    loadDeveloperData();
  }, [isDetailPage]);
  
  // 处理创建新服务
  const handleCreateService = async () => {
    if (!newService.name || !newService.description || !newService.endpoint) {
      toast.warning('请完成所有必填字段');
      return;
    }
    
    setLoading(true);
    try {
      // 调用API创建新服务
      const result = await apiClient.createDeveloperService(newService);
      
      // 如果成功，更新服务列表
      if (result) {
        setServices(prev => [...prev, result]);
        setShowCreateForm(false);
        setNewService({
          name: '',
          type: 'http',
          description: '',
          endpoint: '',
          authType: 'none',
          authKey: ''
        });
        
        toast.success('服务创建成功，等待审核');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('创建服务失败:', error);
      toast.error('创建服务失败: ' + (error.message || '未知错误'));
      
      // 模拟创建成功作为回退
      setTimeout(() => {
        const newServiceData = {
          id: `dev-svc-${Date.now()}`,
          name: newService.name,
          type: newService.type,
          status: 'pending',
          created: new Date().toISOString().split('T')[0],
          usage: 0
        };
        
        setServices([...services, newServiceData]);
        setShowCreateForm(false);
        setNewService({
          name: '',
          type: 'http',
          description: '',
          endpoint: '',
          authType: 'none',
          authKey: ''
        });
        
        toast.success('服务创建成功（模拟），等待审核');
        setLoading(false);
      }, 1000);
    }
  };
  
  // 处理API测试
  const handleTestApi = async () => {
    if (!currentService) return;
    
    let parsedPayload;
    try {
      parsedPayload = JSON.parse(testPayload);
    } catch (error) {
      toast.error('JSON 格式错误，请检查测试数据');
      return;
    }
    
    setTestLoading(true);
    setTestResult(null);
    
    try {
      // 调用API测试服务
      const result = await apiClient.testApiService(currentService.id, parsedPayload);
      setTestResult(result);
      toast.success('API测试成功');
    } catch (error) {
      console.error('API测试失败:', error);
      toast.error('API测试失败: ' + (error.message || '未知错误'));
      
      // 模拟测试结果作为回退
      setTimeout(() => {
        setTestResult({
          result: '这是一个模拟的API响应结果',
          confidence: 0.95,
          timestamp: new Date().toISOString()
        });
        toast.success('API测试成功（模拟）');
      }, 1000);
    } finally {
      setTestLoading(false);
    }
  };
  
  // 渲染服务详情页面
  const renderServiceDetail = () => {
    if (!currentService) return <div>加载中...</div>;
    
    return (
      <>
        <BackButton onClick={() => navigate('/developer')}>
          ← 返回服务列表
        </BackButton>
        
        <Card>
          <Header>
            <Title>{currentService.name}</Title>
            <Badge status={currentService.status}>
              {currentService.status === 'active' ? '已上线' : 
               currentService.status === 'pending' ? '审核中' : '已拒绝'}
            </Badge>
          </Header>
          
          <DetailItem>
            <div className="label">服务类型</div>
            <div className="value">{currentService.type === 'http' ? 'HTTP接口' : 'MCP服务'}</div>
          </DetailItem>
          
          <DetailItem>
            <div className="label">描述</div>
            <div className="value">{currentService.description}</div>
          </DetailItem>
          
          <DetailItem>
            <div className="label">端点</div>
            <div className="value"><code>{currentService.endpoint}</code></div>
          </DetailItem>
          
          <DetailItem>
            <div className="label">认证类型</div>
            <div className="value">
              {currentService.authType === 'none' ? '无认证' : 
               currentService.authType === 'apikey' ? 'API密钥' : 'OAuth 2.0'}
            </div>
          </DetailItem>
          
          {currentService.authType !== 'none' && (
            <DetailItem>
              <div className="label">认证密钥</div>
              <div className="value"><code>{currentService.authKey}</code></div>
            </DetailItem>
          )}
          
          <DetailItem>
            <div className="label">创建日期</div>
            <div className="value">{currentService.created}</div>
          </DetailItem>
          
          <DetailItem>
            <div className="label">使用次数</div>
            <div className="value">{currentService.usage}</div>
          </DetailItem>
          
          <TestForm>
            <Title>测试API</Title>
            <FormGroup>
              <Label htmlFor="test-payload">测试数据</Label>
              <TextArea
                id="test-payload"
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                placeholder="输入JSON格式的测试数据"
              />
            </FormGroup>
            
            <ActionButton onClick={handleTestApi} disabled={testLoading}>
              {testLoading ? '测试中...' : '执行测试'}
            </ActionButton>
            
            {testResult && (
              <>
                <h3 style={{ marginTop: '20px' }}>测试结果</h3>
                <CodeBlock>
                  {JSON.stringify(testResult, null, 2)}
                </CodeBlock>
              </>
            )}
          </TestForm>
        </Card>
      </>
    );
  };
  
  // 渲染服务标签页内容
  const renderServicesTab = () => (
    <>
      <Header>
        <Title>我的服务</Title>
        <ActionButton onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? '取消' : '创建服务'}
        </ActionButton>
      </Header>
      
      {showCreateForm && (
        <Card>
          <Title style={{ marginBottom: '20px' }}>创建新服务</Title>
          
          <FormGroup>
            <Label htmlFor="service-name">服务名称 *</Label>
            <Input 
              id="service-name"
              type="text"
              value={newService.name}
              onChange={(e) => setNewService({...newService, name: e.target.value})}
              placeholder="给您的服务起个名字"
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="service-type">服务类型 *</Label>
            <Select
              id="service-type"
              value={newService.type}
              onChange={(e) => setNewService({...newService, type: e.target.value})}
            >
              <option value="http">HTTP接口</option>
              <option value="mcp">MCP服务</option>
            </Select>
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="service-description">服务描述 *</Label>
            <TextArea
              id="service-description"
              value={newService.description}
              onChange={(e) => setNewService({...newService, description: e.target.value})}
              placeholder="详细描述您的服务功能和用途"
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="service-endpoint">服务端点 *</Label>
            <Input
              id="service-endpoint"
              type="text"
              value={newService.endpoint}
              onChange={(e) => setNewService({...newService, endpoint: e.target.value})}
              placeholder={newService.type === 'http' ? 'https://api.example.com/service' : 'mcp://service-name'}
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="auth-type">认证类型</Label>
            <Select
              id="auth-type"
              value={newService.authType}
              onChange={(e) => setNewService({...newService, authType: e.target.value})}
            >
              <option value="none">无认证</option>
              <option value="apikey">API密钥</option>
              <option value="oauth">OAuth 2.0</option>
            </Select>
          </FormGroup>
          
          {newService.authType !== 'none' && (
            <FormGroup>
              <Label htmlFor="auth-key">认证密钥</Label>
              <Input
                id="auth-key"
                type="text"
                value={newService.authKey}
                onChange={(e) => setNewService({...newService, authKey: e.target.value})}
                placeholder="认证密钥名称或令牌位置"
              />
            </FormGroup>
          )}
          
          <ActionButton 
            onClick={handleCreateService}
            disabled={loading || !newService.name || !newService.description || !newService.endpoint}
          >
            {loading ? '创建中...' : '创建服务'}
          </ActionButton>
        </Card>
      )}
      
      {services.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <th>服务名称</th>
              <th>类型</th>
              <th>状态</th>
              <th>创建日期</th>
              <th>使用次数</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {services.map(service => (
              <tr key={service.id}>
                <td>{service.name}</td>
                <td>{service.type === 'http' ? 'HTTP接口' : 'MCP服务'}</td>
                <td>
                  <Badge status={service.status}>
                    {service.status === 'active' ? '已上线' : 
                     service.status === 'pending' ? '审核中' : '已拒绝'}
                  </Badge>
                </td>
                <td>{service.created}</td>
                <td>{service.usage}</td>
                <td>
                  <ActionButton onClick={() => navigate(`/developer/services/${service.id}`)}>
                    详情
                  </ActionButton>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState data-testid="empty-services">
          <p>您还没有创建任何服务</p>
          <ActionButton onClick={() => setShowCreateForm(true)}>创建第一个服务</ActionButton>
        </EmptyState>
      )}
    </>
  );
  
  // 渲染应用标签页内容
  const renderApplicationsTab = () => (
    <>
      <Header>
        <Title>我的应用</Title>
        <ActionButton>创建应用</ActionButton>
      </Header>
      
      {applications.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <th>应用名称</th>
              <th>应用密钥</th>
              <th>状态</th>
              <th>创建日期</th>
              <th>集成服务</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {applications.map(app => (
              <tr key={app.id}>
                <td>{app.name}</td>
                <td><code>{app.appKey}</code></td>
                <td>
                  <Badge status={app.status}>
                    {app.status === 'active' ? '已激活' : 
                     app.status === 'pending' ? '待审核' : '已禁用'}
                  </Badge>
                </td>
                <td>{app.created}</td>
                <td>{app.services}</td>
                <td>
                  <ActionButton onClick={() => navigate(`/developer/apps/${app.id}`)}>
                    管理
                  </ActionButton>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState data-testid="empty-apps">
          <p>您还没有创建任何应用</p>
          <ActionButton>创建第一个应用</ActionButton>
        </EmptyState>
      )}
    </>
  );
  
  // 渲染文档标签页内容
  const renderDocsTab = () => (
    <>
      <Header>
        <Title>开发文档</Title>
      </Header>
      
      <Card>
        <h3>集成指南</h3>
        <p>了解如何将您的服务集成到我们的平台中。</p>
        <ul>
          <li>HTTP API集成教程</li>
          <li>MCP服务开发指南</li>
          <li>认证与安全最佳实践</li>
          <li>数据格式规范</li>
        </ul>
      </Card>
      
      <Card>
        <h3>API参考</h3>
        <p>浏览我们的API文档，了解所有可用端点和参数。</p>
        <ul>
          <li>开发者API</li>
          <li>MCP协议规范</li>
          <li>Webhook事件</li>
        </ul>
      </Card>
      
      <Card>
        <h3>示例代码</h3>
        <p>参考示例代码快速开始开发。</p>
        <ul>
          <li>Python示例</li>
          <li>JavaScript示例</li>
          <li>Java示例</li>
        </ul>
      </Card>
    </>
  );

  // 如果是详情页面，显示服务详情
  if (isDetailPage) {
    return (
      <AppLayout title={currentService ? `服务详情: ${currentService.name}` : '服务详情'} showBack={true} onBack={() => navigate('/developer')}>
        <Container>
          {renderServiceDetail()}
        </Container>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="开发者控制台" showBack={true} onBack={() => navigate(-1)}>
      <Container>
        <TabContainer>
          <Tab 
            active={activeTab === 'services'} 
            onClick={() => setActiveTab('services')}
            data-testid="services-tab"
          >
            服务
          </Tab>
          <Tab 
            active={activeTab === 'applications'} 
            onClick={() => setActiveTab('applications')}
            data-testid="applications-tab"
          >
            应用
          </Tab>
          <Tab 
            active={activeTab === 'docs'} 
            onClick={() => setActiveTab('docs')}
            data-testid="docs-tab"
          >
            文档
          </Tab>
        </TabContainer>
        
        {activeTab === 'services' && renderServicesTab()}
        {activeTab === 'applications' && renderApplicationsTab()}
        {activeTab === 'docs' && renderDocsTab()}
      </Container>
    </AppLayout>
  );
};

export default DeveloperConsole; 
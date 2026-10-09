import mockAPI from './index';

describe('Mock服务测试', () => {
  test('应该能获取工具列表', async () => {
    const tools = await mockAPI.call('getTools');
    
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
    
    // 验证工具的结构
    const firstTool = tools[0];
    expect(firstTool).toHaveProperty('tool_id');
    expect(firstTool).toHaveProperty('name');
    expect(firstTool).toHaveProperty('type');
    expect(firstTool).toHaveProperty('description');
  });

  test('应该能解析天气意图', async () => {
    const sessionId = 'test-session-1';
    const response = await mockAPI.call('interpret', {
      text: '北京今天天气怎么样',
      sessionId
    });
    
    expect(response).toHaveProperty('type', 'confirm');
    expect(response).toHaveProperty('action', 'weather');
    expect(response.params).toHaveProperty('city', '北京');
    expect(response).toHaveProperty('confirmText');
  });

  test('应该能解析导航意图', async () => {
    const sessionId = 'test-session-2';
    const response = await mockAPI.call('interpret', {
      text: '导航到上海东方明珠',
      sessionId
    });
    
    expect(response).toHaveProperty('action', 'maps');
    expect(response.params).toHaveProperty('destination');
    expect(response.params.destination).toContain('东方明珠');
  });

  test('应该能执行天气工具', async () => {
    const sessionId = 'test-session-3';
    // 先执行interpret建立会话状态
    await mockAPI.call('interpret', {
      text: '北京天气',
      sessionId
    });
    
    // 然后执行天气工具
    const result = await mockAPI.call('execute', {
      action: 'weather',
      params: { city: '北京' },
      sessionId
    });
    
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('data');
    expect(result.data).toHaveProperty('city', '北京');
    expect(result.data).toHaveProperty('temperature');
    expect(result.data).toHaveProperty('condition');
    expect(result).toHaveProperty('message');
  });

  test('应该能创建新会话', async () => {
    const response = await mockAPI.call('createSession', {
      userId: 'test-user-1'
    });
    
    expect(response).toHaveProperty('sessionId');
    expect(response).toHaveProperty('status', 'created');
    
    // 会话ID应该是有效的UUID
    expect(response.sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  test('应该处理未知意图', async () => {
    const sessionId = 'test-session-4';
    const response = await mockAPI.call('interpret', {
      text: '这是一个完全无法理解的句子xyz123',
      sessionId
    });
    
    expect(response).toHaveProperty('action', 'unknown');
    expect(response.confirmText).toContain('抱歉');
  });

  test('应该处理无效会话', async () => {
    const result = await mockAPI.call('execute', {
      action: 'weather',
      params: { city: '北京' },
      sessionId: 'non-existent-session'
    });
    
    expect(result).toHaveProperty('success', false);
    expect(result).toHaveProperty('error');
    expect(result.error).toHaveProperty('code', 'SESSION_NOT_FOUND');
  });

  test('应该抛出未知方法的错误', async () => {
    await expect(mockAPI.call('nonExistentMethod')).rejects.toThrow('未找到模拟方法');
  });
}); 
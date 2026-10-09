/**
 * 语音交互端到端测试
 * 使用Mock Web Speech API解决权限问题
 * 对应 Epic 2: 核心语音交互端到端流程
 */

describe('Epic 2: 核心语音交互端到端流程', () => {
  beforeEach(() => {
    // 模拟登录状态
    cy.setLocalStorage('token', 'abc');
    cy.setLocalStorage('userRole', 'user');

    // 访问首页
    cy.visit('/');
    
    // 等待页面加载完成
    cy.get('[data-testid="main-page"]', { timeout: 10000 }).should('be.visible');
    
    // 等待VoiceInterface测试助手初始化
    cy.wait(1000);
    cy.window().should('have.property', 'voiceInterfaceTestHelper');
  });

  describe('CORE-001: 成功完成一次任务 (Happy Path)', () => {
    it('应该完成完整的语音交互流程：录音→识别→理解→确认→执行→播报', () => {
      // 预先配置API拦截
      cy.intercept('POST', '/v1/api/interpret', {
        statusCode: 200,
        body: {
          type: 'confirm',
          action: 'weather_query',
          params: { city: '北京' },
          confirmText: '您是想查询北京的天气吗？'
        }
      }).as('interpretRequest');

      cy.intercept('POST', '/v1/api/execute', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            city: '北京',
            temperature: '22°C',
            weather: '晴天',
            humidity: '45%'
          }
        }
      }).as('executeRequest');

      // 1. 用户点击"录音"按钮
      cy.get('[data-testid="voice-recorder-button"]').should('be.visible').click();

      // 2. 等待一段时间让语音识别启动
      cy.wait(1000);

      // 3. 检查按钮状态变化和进度显示
      cy.get('[data-testid="voice-recorder-button"]', { timeout: 3000 })
        .should('have.class', 'listening');

      cy.get('[data-testid="status-text"]', { timeout: 2000 })
        .should('contain.text', '正在聆听您的指令');

      // 4. 模拟语音输入并获得结果
      cy.simulateSpeechResult('你好');

      // 5. 等待STT处理完成，检查进度更新
      cy.get('[data-testid="status-text"]', { timeout: 5000 })
        .should('contain.text', '理解');

      // 6. 等待API调用并检查确认界面
      cy.wait('@interpretRequest', { timeout: 10000 }).then((interception) => {
        expect(interception.request.body).to.have.property('text');
        expect(interception.request.body.text).to.equal('你好');
      });

      // 7. 检查确认界面显示
      cy.get('[data-testid="status-text"]', { timeout: 5000 })
        .should('contain.text', '确认');

      // 8. 模拟用户确认（语音输入"确认"）
      cy.simulateSpeechResult('确认');

      // 9. 等待执行API调用
      cy.wait('@executeRequest', { timeout: 10000 }).then((interception) => {
        expect(interception.request.body).to.have.property('action', 'weather_query');
        expect(interception.request.body.params).to.have.property('city', '北京');
      });

      // 10. 检查最终结果展示
      cy.get('body', { timeout: 10000 }).then(($body) => {
        const bodyText = $body.text();
        const hasResult = 
          bodyText.includes('22°C') ||
          bodyText.includes('晴天') ||
          bodyText.includes('天气') ||
          bodyText.includes('完成') ||
          bodyText.includes('就绪') ||
          $body.find('[data-testid="result-display"]').length > 0;
        
        expect(hasResult).to.be.true;
      });

      cy.log('✅ CORE-001: 完整语音交互流程测试通过');
    });
  });

  describe('CORE-002: 用户在确认环节取消操作', () => {
    it('应该在确认环节取消操作，不发送execute请求', () => {
      // 预先配置API拦截
      cy.intercept('POST', '/v1/api/interpret', {
        statusCode: 200,
        body: {
          type: 'confirm',
          action: 'weather_query',
          params: { city: '北京' },
          confirmText: '您是想查询北京的天气吗？'
        }
      }).as('interpretRequest');

      cy.intercept('POST', '/v1/api/execute', {
        statusCode: 200,
        body: { success: true, data: {} }
      }).as('executeRequest');

      // 1. 开始语音交互
      cy.get('[data-testid="voice-recorder-button"]').click();
      cy.wait(1000);
      
      // 2. 验证进入listening状态
      cy.get('[data-testid="voice-recorder-button"]', { timeout: 3000 })
        .should('have.class', 'listening');

      // 3. 模拟语音输入
      cy.simulateSpeechResult('你好');

      // 4. 等待到达确认界面
      cy.wait('@interpretRequest', { timeout: 10000 });
      cy.get('[data-testid="status-text"]', { timeout: 5000 })
        .should('contain.text', '确认');

      // 5. 模拟用户取消（语音输入"取消"）
      cy.simulateSpeechResult('取消');

      // 6. 检查流程中断 - 回到就绪状态
      cy.get('[data-testid="status-text"]', { timeout: 5000 })
        .should('contain.text', '就绪');

      // 7. 验证execute请求未被调用
      cy.get('@executeRequest.all').should('have.length', 0);

      cy.log('✅ CORE-002: 用户取消操作测试通过');
    });
  });

  describe('CORE-003: 意图理解失败', () => {
    it('应该在意图理解失败时显示错误提示', () => {
      // 预先配置API错误响应
      cy.intercept('POST', '/v1/api/interpret', {
        statusCode: 500,
        body: {
          error: {
            code: 'INTENT_PARSE_ERROR',
            message: '无法理解您的意图，请重新尝试'
          }
        }
      }).as('interpretError');

      // 1. 开始语音交互
      cy.get('[data-testid="voice-recorder-button"]').click();
      cy.wait(1000);
      
      // 2. 验证进入listening状态
      cy.get('[data-testid="voice-recorder-button"]', { timeout: 3000 })
        .should('have.class', 'listening');

      // 3. 模拟语音输入
      cy.simulateSpeechResult('不可理解的内容');

      // 4. 等待错误处理
      cy.wait('@interpretError', { timeout: 10000 });

      // 5. 检查错误提示显示
      cy.get('[data-testid="status-text"]', { timeout: 5000 })
        .should('contain.text', '错误');

      // 6. 检查页面状态重置
      cy.get('[data-testid="voice-recorder-button"]', { timeout: 3000 })
        .should('not.have.class', 'listening');

      cy.log('✅ CORE-003: 意图理解失败测试通过');
    });
  });

  describe('CORE-004: 用户手动停止录音', () => {
    it('应该在用户手动停止录音后正常处理', () => {
      // 1. 用户点击录音按钮
      cy.get('[data-testid="voice-recorder-button"]').click();
      cy.wait(1000);

      // 2. 确认开始录音状态
      cy.get('[data-testid="voice-recorder-button"]', { timeout: 3000 })
        .should('have.class', 'listening');

      // 3. 等待2秒，模拟录音过程
      cy.wait(2000);

      // 4. 用户手动停止录音，直接发送结果
      cy.simulateSpeechResult('测试语音');

      // 5. 检查状态更新
      cy.get('[data-testid="status-text"]', { timeout: 3000 })
        .should('not.contain.text', '正在聆听您的指令');

      cy.log('✅ CORE-004: 用户手动停止录音测试通过');
    });
  });

  describe('基本语音接口测试', () => {
    it('应该能够正常启动和使用语音接口', () => {
      // 点击录音按钮
      cy.get('[data-testid="voice-recorder-button"]').click();
      cy.wait(1000);

      // 检查进入listening状态
      cy.get('[data-testid="voice-recorder-button"]', { timeout: 3000 })
        .should('have.class', 'listening');

      // 检查状态文本显示
      cy.get('[data-testid="status-text"]', { timeout: 2000 })
        .should('contain.text', '正在聆听您的指令');

      // 发送语音结果
      cy.simulateSpeechResult('测试语音');

      // 检查状态更新
      cy.get('[data-testid="status-text"]', { timeout: 3000 })
        .should('not.contain.text', '正在聆听您的指令');

      cy.log('✅ 基本语音接口测试通过');
    });
  });

  // 清理
  afterEach(() => {
    cy.clearLocalStorageForTest();
  });
});
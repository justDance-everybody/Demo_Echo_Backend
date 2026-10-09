describe('语音录音功能测试', () => {
  beforeEach(() => {
    // 访问主页
    cy.visit('/');
    
    // Mock Speech Recognition API
    cy.window().then((win) => {
      // 创建Mock SpeechRecognition
      win.SpeechRecognition = class MockSpeechRecognition {
        constructor() {
          this.continuous = false;
          this.lang = 'zh-CN';
          this.interimResults = false;
          this.maxAlternatives = 1;
          this.onstart = null;
          this.onresult = null;
          this.onerror = null;
          this.onend = null;
          this._isRunning = false;
        }
        
        start() {
          if (!this._isRunning) {
            this._isRunning = true;
            setTimeout(() => {
              if (this.onstart) this.onstart();
            }, 100);
          }
        }
        
        stop() {
          if (this._isRunning) {
            this._isRunning = false;
            setTimeout(() => {
              if (this.onend) this.onend();
            }, 100);
          }
        }
        
        abort() {
          this.stop();
        }
      };
      
      win.webkitSpeechRecognition = win.SpeechRecognition;
    });
  });

  it('应该正确显示录音按钮状态变化', () => {
    // 查找录音按钮
    cy.get('[data-testid="voice-recorder"]').should('be.visible');
    
    // 检查初始状态
    cy.get('.recorder-button').should('contain', '点击录音');
    
    // 点击开始录音
    cy.get('.recorder-button').click();
    
    // 验证按钮文本变化
    cy.get('.recorder-button').should('contain', '点击停止');
    
    // 验证按钮样式变化
    cy.get('.recorder-button').should('have.class', 'listening');
  });

  it('应该显示正确的状态文本', () => {
    // 检查初始状态
    cy.get('.status-text').should('contain', '空闲，等待语音输入');
    
    // 点击录音按钮
    cy.get('.recorder-button').click();
    
    // 检查录音状态 - 使用修复后的状态文本
    cy.get('.status-text').should('contain', '正在监听...');
  });

  it('应该支持停止录音', () => {
    // 开始录音
    cy.get('.recorder-button').click();
    cy.get('.recorder-button').should('contain', '点击停止');
    
    // 停止录音 - 等待一下确保状态变化完成
    cy.wait(500);
    cy.get('.recorder-button').click();
    
    // 验证返回初始状态 - 添加等待确保状态更新
    cy.wait(500);
    cy.get('.recorder-button').should('contain', '点击录音');
    cy.get('.recorder-button').should('not.have.class', 'listening');
  });
}); 
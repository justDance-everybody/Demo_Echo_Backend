describe('Authentication', () => {
  beforeEach(() => {
    // 访问登录页面，假设登录页面的路由是 /auth
    // 您可能需要根据您的实际路由调整
    cy.visit('/auth'); 
    cy.injectAxe(); // Inject axe-core for accessibility testing
    cy.clearLocalStorageForTest(); // Clear localStorage to ensure clean state
    // cy.clearCookies(); // Uncomment if your app uses cookies for auth state

    // 确保 AuthProvider 和 ThemeProvider 包裹了我们的应用
    // 通常在 cy.visit() 之前或之后，Cypress 会自动加载页面
    // 如果您的 AuthContext 或 ThemeContext 对登录有影响，
    // 确保它们在测试环境中被正确初始化。
    // Mock 服务 (MSW) 应该已经配置为拦截 /api/auth/login 请求
  });

  it('should display the login form and be accessible', () => {
    // TODO: Add data-testid="username-input" to username input in LoginForm.js
    cy.get('input[name="username"]').should('be.visible');
    // TODO: Add data-testid="password-input" to password input in LoginForm.js
    cy.get('input[name="password"]').should('be.visible');
    // TODO: Add data-testid="login-button" to login button in LoginForm.js
    cy.contains('button', '登录').should('be.visible');
    cy.checkA11y(); // Check initial form accessibility
  });

  it('should allow a user to log in with valid credentials and be accessible', () => {
    // 假设 mock API 返回成功的登录
    // 我们需要确保 MSW 或您的 mock 服务配置了 /api/auth/login 的成功响应
    // 例如，返回一个 token 和用户信息
    cy.intercept('POST', '/auth/login', { // Changed from /api/auth/login to match handlers.js
      statusCode: 200,
      body: {
        token: 'fake-jwt-token',
        user: { id: 1, username: 'testuser', email: 'test@example.com', role: 'user' },
      },
    }).as('loginRequest');

    cy.get('input[name="username"]').type('testuser');
    cy.get('input[name="password"]').type('password'); // Using password from mock handler
    cy.contains('button', '登录').click();

    // 等待登录请求完成
    cy.wait('@loginRequest');

    // 验证登录成功后的行为
    // 例如，跳转到首页或用户仪表盘
    // 这里假设登录成功后会跳转到 '/'
    cy.url().should('include', '/'); 
    // 或者验证某个表示已登录的元素存在
    // cy.get('.user-avatar').should('be.visible'); 
    cy.checkA11y(); // Check accessibility of the page after login (e.g., homepage)
  });

  it('should show an error message with invalid credentials and be accessible', () => {
    // 假设 mock API 返回失败的登录
    cy.intercept('POST', '/auth/login', { // Changed from /api/auth/login
      statusCode: 401,
      body: {
        // Matching the error structure from frontend/src/mocks/handlers.js
        error: { code: 'AUTH_FAILED', msg: 'Invalid credentials' } 
      },
    }).as('loginRequestFailed');

    cy.get('input[name="username"]').type('wronguser');
    cy.get('input[name="password"]').type('wrongpassword');
    cy.contains('button', '登录').click();
    
    cy.wait('@loginRequestFailed');

    // 验证错误提示是否显示
    // 具体的选择器和文本需要根据您的 LoginForm 组件实现来调整
    // TODO: Add data-testid="login-error-message" to the error display element in LoginForm.js
    cy.contains('Invalid credentials').should('be.visible'); 
    // 确保页面没有跳转
    cy.url().should('include', '/auth');
    cy.checkA11y(); // Check accessibility with error message displayed
  });

  it('should navigate to register page when "立即注册" is clicked and be accessible', () => {
    // 假设登录表单上有 "立即注册" 或类似链接/按钮
    // 并且点击后会切换到注册视图或跳转到 /auth?mode=register
    cy.contains('a', '立即注册').click(); // 或者 cy.contains('button', '立即注册').click();
    
    // 验证是否切换到了注册表单的视图
    // 这取决于您的 AuthPage 组件如何处理登录/注册切换
    // TODO: Add data-testid="register-link" to the register link/button in AuthPage.js or LoginForm.js
    cy.get('input[name="email"]').should('be.visible'); // 假设注册表单有 email 字段
    // TODO: Add data-testid="email-input" to email input in RegisterForm.js
    cy.contains('button', '注册').should('be.visible');
    // TODO: Add data-testid="register-button" to register button in RegisterForm.js
    cy.checkA11y(); // Check accessibility of the registration form
  });
}); 
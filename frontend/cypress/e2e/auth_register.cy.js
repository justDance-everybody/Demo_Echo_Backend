describe('User Registration Functionality', () => {
  beforeEach(() => {
    cy.visit('/auth'); // Visit the main auth page
    // Assumes a data-testid="navigate-to-register-link" is on the link/button
    cy.getByTestId("navigate-to-register-link").click(); // Click to ensure we are on the registration form/mode
    
    cy.injectAxe();
    cy.clearLocalStorageForTest();
  });

  it('should display the registration form correctly and be accessible', () => {
    cy.getByTestId('register-username-input').should('be.visible');
    cy.getByTestId('register-email-input').should('be.visible');
    cy.getByTestId('register-password-input').should('be.visible');
    // cy.getByTestId('register-confirm-password-input').should('be.visible'); // If it exists
    cy.getByTestId('register-submit-button').should('be.visible').and('contain', '注册');
    cy.checkA11y();
  });

  it('should successfully register a new user and be accessible', () => {
    cy.intercept('POST', '/auth/register', {
      statusCode: 201,
      // PRD (section 3.2) example response for /auth/register
      body: { id: 123, username: 'newuser', email: 'newuser@example.com' }, 
    }).as('registerRequest');

    cy.getByTestId('register-username-input').type('newuser');
    cy.getByTestId('register-email-input').type('newuser@example.com');
    cy.getByTestId('register-password-input').type('password123');
    // if confirmPassword exists: cy.getByTestId('register-confirm-password-input').type('password123');
    cy.getByTestId('register-submit-button').click();

    cy.wait('@registerRequest');

    // According to PRD 7.2, on successful registration, a success message is shown.
    cy.getByTestId('register-success-message').should('be.visible').and('contain', '注册成功');
    cy.checkA11y();
  });

  it('should show an error message if username or email already exists and be accessible', () => {
    cy.intercept('POST', '/auth/register', {
      statusCode: 400, // Or 409 Conflict
      body: { error: { code: 'VALIDATION_ERROR', msg: 'Email already exists' } }, 
    }).as('registerRequestFailed');

    cy.getByTestId('register-username-input').type('existinguser');
    cy.getByTestId('register-email-input').type('existing@example.com');
    cy.getByTestId('register-password-input').type('password123');
    cy.getByTestId('register-submit-button').click();

    cy.wait('@registerRequestFailed');
    cy.getByTestId('register-error-message').should('be.visible').and('contain', 'Email already exists');
    cy.url().should('include', '/auth'); // Stay on the auth page
    cy.checkA11y();
  });

  it('should show client-side validation errors for invalid input and be accessible', () => {
    // Scenario A: Invalid email format
    cy.getByTestId('register-email-input').type('invalidemail');
    cy.getByTestId('register-username-input').click(); // Click elsewhere to trigger validation if needed
    cy.getByTestId('register-email-validation-error').should('be.visible').and('contain', '有效邮箱');
    cy.checkA11y();
    cy.getByTestId('register-email-input').clear();

    // Scenario B: Password too short (assuming a min length, e.g., 6 chars)
    // Let's also assume the component shows a generic message or specific one like "密码长度至少为6位"
    cy.getByTestId('register-password-input').type('123');
    cy.getByTestId('register-username-input').click(); // Click elsewhere
    cy.getByTestId('register-password-validation-error').should('be.visible'); // Check for visibility first
    // Then check for content if the message is specific, e.g. .and('contain', '密码长度'); 
    cy.checkA11y();
    cy.getByTestId('register-password-input').clear();
    
    // Ensure the register button is still there, form not submitted
    cy.getByTestId('register-submit-button').should('be.visible');
  });
}); 
// frontend/cypress/support/e2e.js

// Import commands.js using ES2015 syntax:
import './commands'

// Optionally, import and configure cypress-axe for accessibility testing in E2E
import 'cypress-axe'

// Alternatively, you can import common utilities or global setups here.
// For example, if you have utility functions or beforeAll/beforeEach hooks
// that apply to all E2E tests, you can define or import them here.

// A common practice is to ensure the application is in a clean state before each test.
// beforeEach(() => {
//   // cy.exec('npm run db:reset && npm run db:seed') // Example: Reset database
//   // cy.visit('/') // Visit a common starting page
// });

// You can also configure global settings or listeners here.
// Cypress.on('uncaught:exception', (err, runnable) => {
//   // returning false here prevents Cypress from
//   // failing the test
//   return false
// }) 
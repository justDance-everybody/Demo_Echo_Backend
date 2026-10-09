// frontend/cypress/support/commands.js

// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... }) 

// Helper command to get item from localStorage
Cypress.Commands.add("getLocalStorage", (key) => {
  return cy.window().then((window) => {
    return window.localStorage.getItem(key);
  });
});

// Helper command to set item in localStorage
Cypress.Commands.add("setLocalStorage", (key, value) => {
  cy.window().then((window) => {
    window.localStorage.setItem(key, value);
  });
});

// Helper command to clear localStorage for the current domain
Cypress.Commands.add("clearLocalStorageForTest", () => {
  cy.window().then((window) => {
    window.localStorage.clear();
  });
});

// Helper command to save localStorage snapshot for debugging
Cypress.Commands.add("saveLocalStorageSnapshot", (name) => {
  cy.window().then((window) => {
    const snapshot = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const storageKey = window.localStorage.key(i);
      if (storageKey) {
        snapshot[storageKey] = window.localStorage.getItem(storageKey);
      }
    }
    // Ensure the directory exists
    cy.exec('mkdir -p cypress/localstorage-snapshots', { failOnNonZeroExit: false });
    cy.writeFile(`cypress/localstorage-snapshots/${name}.json`, snapshot);
  });
});

// Command to get an element by its data-testid attribute
Cypress.Commands.add("getByTestId", (testId) => {
  return cy.get(`[data-testid="${testId}"]`);
}); 
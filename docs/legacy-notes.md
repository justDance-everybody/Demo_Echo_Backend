# Legacy documentation review

The older PRD and API notes describe the prior voice confirmation flow, developer API integrations, and developer portal. Those behaviors are represented by the retained backend routes and React source. The review found no additional product goal that needs to be carried into this consolidation; the documents are not copied wholesale because they also contain stale deployment and test-account instructions.

The smaller `Frontend/src/` tree is an older fragment. Compared with the retained `Frontend/frontend/src/`, it contains an older `utils/mockWebSpeechAPI.js`; the nested app also has additional voice UI, TTS, address book, and microphone permission code. Only the nested React app is retained.

The nested React package defines Cypress scripts and has its own `cypress.config.js` and `cypress/` E2E specs; those test assets are retained. The outer `Frontend/cypress/` and root `Frontend/cypress.config.js` belong to the older wrapper tree and are not referenced by the nested package scripts, so they are omitted.

describe('Services Page Functionality', () => {
  const mockTools = [
    {
      tool_id: 'system_tool_1',
      name: 'System Weather Service',
      description: 'Provides current weather information globally.',
      type: 'http',
      provider: 'System',
      tags: ['weather', 'system', 'information'],
      isDeveloperTool: false,
      created_at: '2024-01-01T00:00:00Z',
      rating: 4.5,
    },
    {
      tool_id: 'system_tool_2',
      name: 'System Stock Checker',
      description: 'Checks stock prices from major exchanges.',
      type: 'http',
      provider: 'System',
      tags: ['finance', 'stock', 'system'],
      isDeveloperTool: false,
      created_at: '2024-02-15T00:00:00Z',
      rating: 4.2,
    },
    {
      tool_id: 'dev_tool_translate',
      name: 'Advanced Translator',
      description: 'Translates text between multiple languages using AI.',
      type: 'http',
      provider: 'DevCommunity',
      tags: ['translation', 'ai', 'developer'],
      isDeveloperTool: true,
      created_at: '2024-03-10T00:00:00Z',
      rating: 4.8,
    },
    {
      tool_id: 'dev_tool_imagegen',
      name: 'AI Image Generator',
      description: 'Generates images from textual descriptions.',
      type: 'http',
      provider: 'ArtifyTools',
      tags: ['image', 'ai', 'developer', 'creative'],
      isDeveloperTool: true,
      created_at: '2024-04-20T00:00:00Z',
      rating: 4.9,
    },
  ];

  beforeEach(() => {
    cy.visit('/services'); // Assuming '/services' is the route for the services page
    cy.injectAxe();
    cy.clearLocalStorageForTest();

    cy.intercept('GET', '/v1/api/tools', {
      statusCode: 200,
      body: { tools: mockTools },
    }).as('getToolsRequest');
  });

  it('should load and display the list of services correctly and be accessible', () => {
    cy.wait('@getToolsRequest');
    // TODO: Add data-testid="service-card" to each ServiceCard component for better selection
    // TODO: Add data-testid="service-list-container" to the container of service cards
    cy.get('[data-testid="service-list-container"]').children().should('have.length', mockTools.length);

    // Sample verification for the first card
    // TODO: Inside ServiceCard, add data-testid for name, description etc.
    cy.get('[data-testid="service-card"]').first().as('firstCard');
    cy.get('@firstCard').should('contain', mockTools[0].name);
    cy.get('@firstCard').should('contain', mockTools[0].description);
    
    cy.checkA11y();
  });

  it('should allow toggling between list and grid views and be accessible', () => {
    cy.wait('@getToolsRequest');
    // TODO: Add data-testid="service-list-container" to the service list container
    // TODO: Add data-testid="view-toggle-button-grid" for grid view button
    // TODO: Add data-testid="view-toggle-button-list" for list view button
    
    const serviceListContainerSelector = '[data-testid="service-list-container"]';
    const gridViewButtonSelector = '[data-testid="view-toggle-button-grid"]';
    const listViewButtonSelector = '[data-testid="view-toggle-button-list"]';

    // Assuming default is list view, check for a class or attribute that indicates list view
    // cy.get(serviceListContainerSelector).should('have.class', 'list-view-active'); // Example assertion

    cy.log('Switching to Grid View');
    cy.get(gridViewButtonSelector).click();
    // cy.get(serviceListContainerSelector).should('have.class', 'grid-view-active'); // Example assertion
    cy.checkA11y();

    cy.log('Switching back to List View');
    cy.get(listViewButtonSelector).click();
    // cy.get(serviceListContainerSelector).should('have.class', 'list-view-active'); // Example assertion
    cy.checkA11y();
  });

  it('should filter services based on search input and be accessible', () => {
    cy.wait('@getToolsRequest');
    // TODO: Add data-testid="services-search-input" to the search input field
    const searchInputSelector = '[data-testid="services-search-input"]';
    // TODO: Add data-testid="service-card" to each ServiceCard component
    const serviceCardSelector = '[data-testid="service-card"]';
    // TODO: Add data-testid="empty-state-message" for when no services match search
    const emptyStateSelector = '[data-testid="empty-state-message"]';

    // Scenario A: Search for an existing service by name
    cy.log('Searching for "Weather"');
    cy.get(searchInputSelector).type('Weather');
    cy.get(serviceCardSelector).should('have.length', 1);
    cy.get(serviceCardSelector).first().should('contain', 'System Weather Service');
    cy.checkA11y();

    // Scenario B: Search for services by tag/description (e.g., 'ai')
    cy.log('Searching for "ai"');
    cy.get(searchInputSelector).clear().type('ai');
    cy.get(serviceCardSelector).should('have.length', 2); // Advanced Translator, AI Image Generator
    cy.checkA11y();

    // Scenario C: Search for a non-existing service
    cy.log('Searching for "NonExistentServiceXYZ"');
    cy.get(searchInputSelector).clear().type('NonExistentServiceXYZ');
    cy.get(serviceCardSelector).should('not.exist');
    cy.get(emptyStateSelector).should('be.visible').and('contain', '未找到服务'); // Or similar text
    cy.checkA11y();

    // Scenario D: Clear search input
    cy.log('Clearing search input');
    cy.get(searchInputSelector).clear();
    cy.get(serviceCardSelector).should('have.length', mockTools.length);
    cy.checkA11y();
  });
}); 
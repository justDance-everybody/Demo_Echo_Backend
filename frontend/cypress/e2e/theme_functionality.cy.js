describe('Theme Functionality', () => {
  beforeEach(() => {
    // 访问设置页面
    cy.visit('/settings');
    cy.injectAxe(); // Inject axe-core for accessibility testing
    // 清理localStorage，确保测试环境纯净
    cy.clearLocalStorageForTest(); 
    cy.saveLocalStorageSnapshot('before-each-theme-test'); // 保存清理后的状态快照
  });

  afterEach(() => {
    // 保存localStorage快照，用于调试或验证
    cy.saveLocalStorageSnapshot('after-each-theme-test');
  });

  context('Theme Toggle (Dark/Light Mode)', () => {
    it('should toggle between light and dark themes, persist choice, and be accessible', () => {
      cy.checkA11y(); // Initial accessibility check

      // 初始状态检查 (假设默认为 light 主题)
      cy.get('html').should('not.have.attr', 'data-theme', 'dark');
      cy.getLocalStorage('theme').then(initialTheme => {
        // 初始localStorage中 theme 可能是 null 或 'light'
        // 对于本测试，我们主要关注切换行为是否正确写入 localStorage
        if (initialTheme !== null) {
            expect(initialTheme).to.equal('light'); // 如果存在，应该是 light
        }
      });

      const themeToggleSelector = '.ant-switch'; 
      cy.get(themeToggleSelector).first().as('themeToggle');

      // 切换到暗黑主题
      cy.log('Clicking theme toggle to enable dark mode');
      cy.get('@themeToggle').click();
      cy.get('html').should('have.attr', 'data-theme', 'dark');
      cy.getLocalStorage('theme').should('equal', 'dark');
      cy.checkA11y(); // Check accessibility after dark mode toggle
      cy.saveLocalStorageSnapshot('after-dark-mode');

      // 切换回明亮主题
      cy.log('Clicking theme toggle to disable dark mode');
      cy.get('@themeToggle').click();
      cy.get('html').should('have.attr', 'data-theme', 'light'); //明确检查light
      cy.getLocalStorage('theme').should('equal', 'light');
      cy.checkA11y(); // Check accessibility after toggling back to light mode
      cy.saveLocalStorageSnapshot('after-light-mode-toggle-back');
    });
  });

  context('Custom Theme Adjustments (ThemeSettings)', () => {
    it('should allow adjusting primary color, persist it, and be accessible', () => {
      cy.checkA11y(); // Initial accessibility check
      const newPrimaryColor = '#ff00ff'; // Example: Magenta

      cy.log('Finding primary color input');
      // 使用更具体的选择器，例如基于其旁边的label文本，或添加data-testid
      cy.contains('label', '主色调').next('input[type="color"]').as('primaryColorInput');

      cy.log('Changing primary color');
      cy.get('@primaryColorInput')
        .invoke('val', newPrimaryColor)
        .trigger('input') 
        .trigger('change'); 
      cy.checkA11y(); // Check accessibility after color change

      cy.log('Verifying CSS variable for primary color');
      cy.document().then((doc) => {
        const primaryColorVar = doc.documentElement.style.getPropertyValue('--primary-color').trim();
        expect(primaryColorVar).to.equal(newPrimaryColor);
      });

      cy.log('Verifying localStorage for custom theme');
      cy.getLocalStorage('customTheme').then(customThemeJSON => {
        expect(customThemeJSON).to.not.be.null;
        const customTheme = JSON.parse(customThemeJSON);
        expect(customTheme['--primary-color']).to.equal(newPrimaryColor);
      });
      cy.saveLocalStorageSnapshot('after-custom-primary-color');
    });

    it('should allow adjusting border radius, persist it, and be accessible', () => {
      cy.checkA11y(); // Initial accessibility check
      const newBorderRadius = '12px';
      const newBorderRadiusVal = '12'; 

      cy.log('Finding border radius input');
      // 假设圆角调整控件旁边有标签 "圆角大小"
      cy.contains('label', '圆角大小').next('input[type="range"]').as('borderRadiusSlider');
      // 如果是InputNumber, 则可能是 cy.contains('label', '圆角大小').next('.ant-input-number').find('input')

      cy.log('Changing border radius');
      cy.get('@borderRadiusSlider')
        .invoke('val', newBorderRadiusVal)
        .trigger('input')
        .trigger('change');
      cy.checkA11y(); // Check accessibility after radius change

      cy.log('Verifying CSS variable for border radius');
      cy.document().then((doc) => {
        const borderRadiusVar = doc.documentElement.style.getPropertyValue('--border-radius').trim();
        expect(borderRadiusVar).to.equal(newBorderRadius);
      });

      cy.log('Verifying localStorage for custom theme');
      cy.getLocalStorage('customTheme').then(customThemeJSON => {
        expect(customThemeJSON).to.not.be.null;
        const customTheme = JSON.parse(customThemeJSON);
        expect(customTheme['--border-radius']).to.equal(newBorderRadius);
      });
       cy.saveLocalStorageSnapshot('after-custom-border-radius');
    });
  });
});

// Helper command to get item from localStorage
Cypress.Commands.add("getLocalStorage", (key) => {
  cy.window().then((window) => {
    return window.localStorage.getItem(key);
  });
});

// Helper command to save localStorage snapshot for debugging
Cypress.Commands.add("saveLocalStorage", (name) => {
  cy.window().then((window) => {
    const snapshot = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      snapshot[key] = window.localStorage.getItem(key);
    }
    cy.writeFile(`cypress/localstorage-snapshots/${name}.json`, snapshot);
  });
});

// Helper command to clear localStorage snapshot before test
Cypress.Commands.add("clearLocalStorageSnapshot", () => {
  cy.window().then((window) => {
    // No direct command to clear snapshot, but we ensure localStorage is clean for the test
    // window.localStorage.clear(); // Clearing actual localStorage
    // This is now part of beforeEach logic in test file for clarity.
  });
}); 
// 修复确认对话框选择器问题
// 将 .confirmation-dialog 替换为正确的选择器
// 根据 ConfirmationModal.js 组件，应该使用 .ant-modal 或者 [data-testid="confirmation-modal"]

// 例如：
// cy.get('.confirmation-dialog') 替换为
// cy.get('[data-testid="confirmation-modal"]') 或者
// cy.get('.ant-modal-content') 

// 同时添加适当的 data-testid 属性到 ConfirmationModal 组件中 
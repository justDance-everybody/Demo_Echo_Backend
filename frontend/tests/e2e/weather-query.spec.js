const { test, expect } = require('@playwright/test');

test.describe('前端核心交互流程测试', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到主页
    await page.goto('/');
    
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
    
    // 等待主要组件加载
    await page.waitForSelector('[data-testid="main-page"]', { timeout: 10000 });
  });

  test('测试语音输入"深圳明天的天气"完整交互流程', async ({ page }) => {
    console.log('开始测试语音输入流程...');
    
    // 1. 验证页面基本元素存在
    await expect(page.locator('[data-testid="main-page"]')).toBeVisible();
    
    // 查找录音按钮（通过文本）
    const recordButton = page.locator('button:has-text("点击录音")');
    await expect(recordButton).toBeVisible();
    
    // 2. 模拟语音输入
    // 点击录音按钮开始录音
    await recordButton.click();
    
    // 等待一小段时间让录音状态稳定
    await page.waitForTimeout(1000);
    
    // 模拟语音输入 - 通过React DevTools方式查找组件
    await page.evaluate(() => {
        // 查找所有可能的React实例
        const allElements = document.querySelectorAll('*');
        let found = false;
        
        for (let element of allElements) {
            // 检查React 16的内部属性
            const reactFiber = element._reactInternalFiber || element._reactInternalInstance;
            if (reactFiber) {
                // 遍历React fiber树查找onResult属性
                let current = reactFiber;
                while (current && !found) {
                    if (current.memoizedProps && current.memoizedProps.onResult) {
                        console.log('Found onResult in React 16 style');
                        current.memoizedProps.onResult('深圳明天的天气');
                        found = true;
                        break;
                    }
                    current = current.return || current.parent;
                }
            }
            
            // 检查React 17+的内部属性
            const reactInternals = element._reactInternals;
            if (reactInternals && !found) {
                let current = reactInternals;
                while (current && !found) {
                    if (current.memoizedProps && current.memoizedProps.onResult) {
                        console.log('Found onResult in React 17+ style');
                        current.memoizedProps.onResult('深圳明天的天气');
                        found = true;
                        break;
                    }
                    current = current.return || current.parent;
                }
            }
            
            if (found) break;
        }
        
        if (!found) {
            console.log('Could not find React onResult prop, trying global event');
            window.dispatchEvent(new CustomEvent('voiceResult', {
                detail: { transcript: '深圳明天的天气' }
            }));
        }
    });
    
    // 等待确认模态框出现
    await page.waitForSelector('[data-testid="confirmation-modal"]', { timeout: 15000 });
    await expect(page.locator('[data-testid="confirmation-modal"]')).toBeVisible();
    
    // 验证确认文本包含天气相关内容
    const confirmText = await page.locator('[data-testid="confirm-text"]').textContent();
    console.log('确认文本:', confirmText);
    expect(confirmText).toMatch(/(天气|深圳|明天)/i);
    
    // 点击确认按钮
    await page.locator('[data-testid="confirm-button"]').click();
    
    // 等待工具执行完成
    await page.waitForSelector('[data-testid="result-display"]', { timeout: 20000 });
    
    // 验证结果显示
    const resultDisplay = page.locator('[data-testid="result-display"]');
    await expect(resultDisplay).toBeVisible();
    
    // 验证结果包含天气信息
    const resultText = await resultDisplay.textContent();
    console.log('结果文本:', resultText);
    expect(resultText).toMatch(/(天气|温度|湿度|风|晴|雨|云)/i);
    
    console.log('测试完成！');
  });
  
  test('测试错误处理流程', async ({ page }) => {
    console.log('开始测试错误处理流程...');
    
    // 模拟网络错误或API失败
    await page.route('**/api/**', route => {
      route.abort('failed');
    });
    
    // 尝试触发语音输入
    const testButton = page.locator('button:has-text("测试交互")');
    if (await testButton.isVisible()) {
      await testButton.click();
      
      // 验证错误状态
      await page.waitForSelector('[data-testid="error-message"]', { timeout: 10000 });
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    }
  });
  
  test('测试重置功能', async ({ page }) => {
    console.log('开始测试重置功能...');
    
    // 检查重置按钮
    const resetButton = page.locator('[data-testid="reset-button"]');
    if (await resetButton.isVisible()) {
      await resetButton.click();
      
      // 验证状态重置
      await expect(page.locator('[data-testid="status-bar"]')).toContainText('准备就绪');
    }
  });
});
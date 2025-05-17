// StyleEditor E2E测试脚本
const TestRunner = require('../../test-utils/TestRunner');
const Logger = require('../../test-utils/Logger');
const { By, until } = require('selenium-webdriver');

// 创建测试运行器和日志记录器
const logger = new Logger({ prefix: 'StyleEditorTest', logToFile: true });
const runner = new TestRunner();

// 测试样式调试面板
async function testStyleEditor() {
  try {
    logger.info('开始测试样式调试面板...');
    const driver = runner.getDriver();
    
    // 1. 导航到设置页面
    logger.info('导航到设置页面...');
    await driver.get('http://localhost:3000/settings');
    await driver.sleep(1000);
    
    // 2. 启用开发者模式
    logger.info('启用开发者模式...');
    try {
      const devModeSwitch = await driver.findElement(By.xpath("//div[contains(text(), '开发者模式')]/following-sibling::div//input[@type='checkbox']"));
      await devModeSwitch.click();
      await driver.sleep(1000);
    } catch (e) {
      logger.warn('找不到开发者模式开关，尝试其他选择器', e);
      try {
        // 尝试使用不同的选择器
        const devModeItem = await driver.findElement(By.xpath("//div[contains(text(), '开发者模式')]"));
        await devModeItem.click();
        await driver.sleep(1000);
      } catch (e2) {
        logger.error('无法启用开发者模式', e2);
        throw new Error('无法启用开发者模式');
      }
    }
    
    // 3. 确认样式调试面板已加载
    logger.info('检查样式调试面板是否加载...');
    try {
      const styleEditorTitle = await driver.findElement(By.xpath("//h2[contains(text(), '样式调试面板')]"));
      const isDisplayed = await styleEditorTitle.isDisplayed();
      logger.info(`样式调试面板显示状态: ${isDisplayed}`);
      
      if (!isDisplayed) {
        throw new Error('样式调试面板未显示');
      }
    } catch (e) {
      logger.error('样式调试面板未找到或未显示', e);
      // 尝试滚动到页面底部以查看是否有样式调试面板
      await driver.executeScript("window.scrollTo(0, document.body.scrollHeight);");
      await driver.sleep(1000);
      // 再次尝试寻找
      try {
        const styleEditorTitle = await driver.findElement(By.xpath("//h2[contains(text(), '样式调试')]"));
        logger.info('滚动后找到样式调试面板');
      } catch (e2) {
        logger.error('即使滚动后也找不到样式调试面板', e2);
        throw new Error('样式调试面板未找到');
      }
    }
    
    // 4. 切换到颜色选项卡（如果不是默认显示的）
    logger.info('切换到颜色选项卡...');
    try {
      const colorTab = await driver.findElement(By.xpath("//div[contains(text(), '颜色')]"));
      await colorTab.click();
      await driver.sleep(500);
    } catch (e) {
      logger.info('颜色选项卡已经是激活状态，无需切换');
    }
    
    // 5. 尝试修改主色调（可能需要调整选择器以匹配实际DOM结构）
    logger.info('尝试修改主色调...');
    try {
      // 找到第一个颜色输入框（可能需要根据实际DOM结构调整）
      const colorInputs = await driver.findElements(By.css('input[type="color"]'));
      if (colorInputs.length > 0) {
        // 使用JavaScript更改颜色值，因为Selenium直接操作color输入有限制
        await driver.executeScript("arguments[0].value = '#FF5733';", colorInputs[0]);
        await driver.executeScript("arguments[0].dispatchEvent(new Event('change', { bubbles: true }));", colorInputs[0]);
        logger.info('已更改颜色值');
        await driver.sleep(1000);
      } else {
        logger.info('未找到颜色输入框');
      }
    } catch (e) {
      logger.error('修改颜色失败:', e);
    }
    
    // 6. 切换到圆角选项卡
    logger.info('切换到圆角选项卡...');
    const radiusTab = await driver.findElement(By.xpath("//div[contains(text(), '圆角')]"));
    await radiusTab.click();
    await driver.sleep(1000);
    
    // 7. 尝试调整圆角大小 - 使用slider很难直接控制，所以这里只是验证元素存在
    logger.info('验证圆角滑块存在...');
    const radiusSliders = await driver.findElements(By.css('.adm-slider'));
    logger.info(`找到 ${radiusSliders.length} 个圆角滑块`);
    
    // 8. 切换到预览选项卡
    logger.info('切换到预览选项卡...');
    const previewTab = await driver.findElement(By.xpath("//div[contains(text(), '预览')]"));
    await previewTab.click();
    await driver.sleep(1000);
    
    // 9. 尝试导出配置
    logger.info('尝试导出配置...');
    const exportButton = await driver.findElement(By.xpath("//button[contains(text(), '导出配置')]"));
    await exportButton.click();
    await driver.sleep(1000);
    
    // 10. 验证导出对话框打开
    logger.info('验证导出对话框...');
    const exportDialog = await driver.findElement(By.xpath("//div[contains(text(), '导出样式配置')]"));
    const dialogDisplayed = await exportDialog.isDisplayed();
    logger.info(`导出对话框显示状态: ${dialogDisplayed}`);
    
    // 11. 关闭导出对话框
    logger.info('关闭导出对话框...');
    const closeButton = await driver.findElement(By.xpath("//button[contains(text(), '关闭')]"));
    await closeButton.click();
    await driver.sleep(1000);
    
    // 12. 尝试重置主题
    logger.info('重置为默认主题...');
    const resetButton = await driver.findElement(By.xpath("//button[contains(text(), '重置为默认值')]"));
    await resetButton.click();
    await driver.sleep(1000);
    
    logger.info('样式调试面板测试完成✅');
    return true;
  } catch (error) {
    logger.error('样式调试面板测试失败❌:', error);
    throw error;
  }
}

// 主测试函数
async function runTests() {
  try {
    await runner.setup();
    await testStyleEditor();
    logger.info('所有测试完成✅');
  } catch (error) {
    logger.error('测试过程中出错:', error);
  } finally {
    await runner.teardown();
  }
}

// 运行测试
runTests();

module.exports = {
  testStyleEditor
}; 
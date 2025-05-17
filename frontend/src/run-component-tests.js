/**
 * 组件测试运行脚本
 * 
 * 这个脚本用于运行和汇总前端组件的单元测试结果
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 创建日志目录
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 创建日志文件名（包含时间戳）
const timestamp = new Date().toISOString().replace(/[:.]/g, '_').split('T')[0];
const logFileName = `component_tests_${timestamp}.log`;
const logFilePath = path.join(logDir, logFileName);

// 开始记录测试日志
fs.writeFileSync(logFilePath, `组件测试开始运行: ${new Date().toISOString()}\n\n`);

// 需要测试的组件目录
const componentDirectories = [
  'components/common/__tests__',
  'components/Layout/__tests__',
  'components/VoiceRecorder/__tests__',
  'contexts/__tests__'
];

// 测试结果统计
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// 运行每个目录的测试
componentDirectories.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  
  // 检查目录是否存在
  if (!fs.existsSync(fullPath)) {
    fs.appendFileSync(logFilePath, `目录不存在，跳过: ${dir}\n`);
    return;
  }
  
  // 读取目录中的测试文件
  const testFiles = fs.readdirSync(fullPath)
    .filter(file => file.endsWith('.test.js'));
  
  if (testFiles.length === 0) {
    fs.appendFileSync(logFilePath, `目录中没有测试文件: ${dir}\n`);
    return;
  }
  
  fs.appendFileSync(logFilePath, `运行目录 ${dir} 中的测试...\n`);
  
  // 针对每个测试文件运行测试
  testFiles.forEach(file => {
    const testFile = path.join(fullPath, file);
    fs.appendFileSync(logFilePath, `运行测试: ${file}\n`);
    
    try {
      // 运行测试并捕获输出
      const output = execSync(`npx jest ${testFile} --no-cache`, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      fs.appendFileSync(logFilePath, `${output}\n`);
      
      // 解析测试结果 (简单的解析，实际可能需要更复杂的逻辑)
      const testCount = (output.match(/PASS/g) || []).length;
      totalTests += testCount;
      passedTests += testCount;
      
      fs.appendFileSync(logFilePath, `✅ 测试通过: ${file}\n\n`);
    } catch (error) {
      fs.appendFileSync(logFilePath, `测试失败: ${file}\n`);
      fs.appendFileSync(logFilePath, `${error.stdout}\n\n`);
      
      // 计算失败的测试数量 (简单的解析)
      const failCount = (error.stdout.match(/FAIL/g) || []).length;
      totalTests += failCount;
      failedTests += failCount;
    }
  });
});

// 输出测试统计结果
const summary = `
测试完成汇总:
总测试数: ${totalTests}
通过: ${passedTests}
失败: ${failedTests}
通过率: ${totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%
`;

fs.appendFileSync(logFilePath, summary);
console.log(summary);
console.log(`测试日志已保存到: ${logFilePath}`);

// 如果有测试失败，退出代码非0
process.exit(failedTests > 0 ? 1 : 0); 
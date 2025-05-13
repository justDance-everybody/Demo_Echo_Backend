#!/bin/bash

# 前端测试文件清理脚本
# 用于删除自动化测试相关文件

echo "============================================="
echo "语音AI代理前端自动化测试 - 清理脚本"
echo "============================================="

# 恢复App.js为原始版本
cat > src/App.js << 'EOF'
import React from 'react';
import MainPage from './pages/MainPage/MainPage';
import './App.css';

function App() {
  return (
    <div className="App">
      <MainPage />
    </div>
  );
}

export default App;
EOF

echo "✅ 已恢复App.js"

# 删除测试相关文件
rm -f src/mocks/AutomatedTest.js
rm -f src/mocks/TestRunner.js
rm -f src/mocks/TestPage.js
rm -f src/mocks/api-mock-extension.js
rm -f src/mocks/TEST-DOCUMENTATION.md
rm -f src/mocks/cleanup-tests.sh

echo "✅ 已删除测试文件"
echo "✅ 测试环境清理完成" 
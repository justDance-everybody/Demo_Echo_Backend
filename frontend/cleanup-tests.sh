#!/bin/bash

# 语音AI前端自动化测试清理脚本
# 清理测试文件和恢复环境

echo "======================================"
echo "    语音AI自动化测试环境清理工具     "
echo "======================================"

# 询问用户是否要保存测试日志
echo "是否要保存测试日志? (y/n)"
read -r save_logs

# 创建备份目录
if [[ $save_logs == "y" ]] || [[ $save_logs == "Y" ]]; then
  timestamp=$(date +"%Y%m%d_%H%M%S")
  backup_dir="test_logs_$timestamp"
  mkdir -p "$backup_dir"
  
  echo "将测试日志保存到目录: $backup_dir"
  
  # 复制测试日志文件
  if [ -f "frontend_test.log" ]; then
    cp frontend_test.log "$backup_dir/"
  fi
  
  # 复制浏览器控制台保存的日志文件（如果有）
  if [ -d "logs" ]; then
    find logs -name "*test*.log" -exec cp {} "$backup_dir/" \;
  fi
  
  echo "✅ 测试日志已保存"
fi

# 停止可能正在运行的测试服务器
echo "正在检查是否有测试服务器在运行..."
test_pid=$(pgrep -f "npm start" || echo "")
if [ -n "$test_pid" ]; then
  echo "发现测试服务器进程 (PID: $test_pid)，正在停止..."
  kill "$test_pid" 2>/dev/null || true
  echo "✅ 测试服务器已停止"
else
  echo "未发现正在运行的测试服务器"
fi

# 恢复环境变量配置
if [ -f ".env" ]; then
  # 备份原始.env文件
  cp .env .env.backup
  
  # 移除测试相关的环境变量
  grep -v "REACT_APP_TEST_" .env.backup > .env
  rm .env.backup
  
  echo "✅ 已移除测试环境变量"
fi

# 询问是否要保留测试文件
echo "是否要保留测试文件? (y/n)"
read -r keep_files

if [[ $keep_files != "y" ]] && [[ $keep_files != "Y" ]]; then
  echo "正在清理测试文件..."
  
  # 清理前端测试文件
  if [ -f "frontend_test.log" ]; then
    rm frontend_test.log
  fi
  
  echo "✅ 测试文件已清理"
else
  echo "保留测试文件"
fi

echo ""
echo "清理完成！"
echo "如需重新运行测试，请执行 ./run-tests.sh"
echo "======================================" 
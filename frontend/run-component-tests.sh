#!/bin/bash

# 设置颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

echo -e "${BLUE}开始运行前端组件测试...${NC}"

# 切换到前端目录
cd "$(dirname "$0")"

# 运行测试脚本
node src/run-component-tests.js

# 获取测试结果
TEST_RESULT=$?

# 显示测试结果
if [ $TEST_RESULT -eq 0 ]; then
  echo -e "${GREEN}所有组件测试通过!${NC}"
else
  echo -e "${RED}组件测试失败，请检查日志获取详细信息。${NC}"
fi

exit $TEST_RESULT 
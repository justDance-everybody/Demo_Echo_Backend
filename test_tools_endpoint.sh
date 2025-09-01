# 测试工具端点修复

echo "=================================================="
echo "测试工具端点修复"
echo "=================================================="

# 测试健康检查
echo "1. 测试健康检查:"
curl -s -o /dev/null -w "HTTP状态码: %{http_code}\n" http://localhost:8000/health

echo ""
echo "2. 测试需要认证的工具端点 (应该返回401):"
curl -s -o /dev/null -w "HTTP状态码: %{http_code}\n" http://localhost:8000/api/v1/tools

echo ""
echo "3. 测试无需认证的工具端点 (应该返回200):"
curl -s -o /dev/null -w "HTTP状态码: %{http_code}\n" http://localhost:8000/api/v1/tools/public

echo ""
echo "4. 获取工具列表内容:"
curl -s http://localhost:8000/api/v1/tools/public | python -m json.tool 2>/dev/null || echo "响应不是有效的JSON"

echo ""
echo "测试完成"

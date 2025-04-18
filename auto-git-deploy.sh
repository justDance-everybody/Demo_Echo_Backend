#!/bin/bash

echo "📦 添加所有变动..."
git add -A

echo "📝 输入提交信息（直接回车默认：sync update）:"
read msg
if [ -z "$msg" ]; then
  msg="sync: update"
fi

echo "🧠 提交中..."
git commit -m "$msg"

echo "🚀 推送到 GitHub..."
git push origin master

echo "♻️ 重新拉取最新代码（确保一致）..."
git pull origin master

echo "🔄 重启 PM2 管理的服务（echo-backend）..."
pm2 restart echo-backend

echo "✅ 部署完成：代码已同步，服务已重启！"

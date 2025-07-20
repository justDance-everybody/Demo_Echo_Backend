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

echo "🔍 检测当前分支..."
current_branch=$(git branch --show-current)
echo "📍 当前分支: $current_branch"
echo "🚀 推送到 GitHub..."
git push demo_echo $current_branch

echo "✅ 完成：代码已推送到 GitHub！"

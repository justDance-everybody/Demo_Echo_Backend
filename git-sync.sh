#!/bin/bash

echo "开始同步代码到GitHub..."

# 获取当前时间作为提交信息
current_time=$(date "+%Y-%m-%d %H:%M:%S")

# 添加所有变更
git add .

# 提交变更
git commit -m "自动同步: $current_time"

# 推送到GitHub
git push

echo "同步完成！" 
#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "第一次使用需要先安装 Node.js（免费）。已为你打开下载页面，装完后再双击本文件。"
  open https://nodejs.org/zh-cn
  read -n 1 -s -r -p "按任意键关闭"; exit 1
fi
(sleep 2; open http://localhost:3000) &
echo "趣伴正在运行，请不要关闭这个窗口。"
node server.js

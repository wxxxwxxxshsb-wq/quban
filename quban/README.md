# 趣伴 QuBan 1.0（电脑版）

聊天加好友 · AI 助手「小伴」 · 6 个小游戏 · 待办/便签/计算器/番茄钟 · 每日打卡与成就

## 运行
1. 安装 Node.js 18+（https://nodejs.org）
2. VS Code 打开本文件夹，终端执行：`npm start`
   （或按 F5；`npm run dev` 改代码自动重启）
3. 浏览器打开 http://localhost:3000

零依赖，不需要 npm install。

## 接上 AI（二选一）
**A. 免费、不用密钥（默认）**：安装 Ollama（ollama.com），终端运行 `ollama pull qwen2.5:3b`，之后趣伴自动使用，不用重启。
**B. 更聪明**：复制 `.env.example` 为 `.env`，填 `ANTHROPIC_API_KEY`，重启。填了密钥就优先用 Claude。

## 手机也能用
- 同一 Wi-Fi：手机浏览器打开 `http://电脑局域网IP:3000`，再「添加到主屏幕」。
- 外网使用需把项目部署到服务器（Render / Railway / 云服务器），代码无需改动。

## 目录
- `server.js` 后端：账号、好友、聊天(SSE 实时)、排行榜、AI 代理
- `public/app.js` 前端全部功能　`public/style.css` 样式　`public/logo.svg` Logo
- `data/db.json` 运行后自动生成的数据

## 下一步（2.0 想法）
好友对战（五子棋/你画我猜）· 更多游戏 · 群聊 · 手机 App 打包（Capacitor）· 云端同步待办

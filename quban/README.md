# 趣伴 QuBan 2.0（网页 / 手机桌面版）

聊天加好友 · AI 助手「小伴」 · 7 个小游戏（含同屏双人五子棋） · 多条备忘录 · 每日打开日志 · 待办/计算器/番茄钟 · 每日打卡与成就

## 2.0 新增
- 备忘录支持多条记录、搜索、置顶和自动保存；原有单条便签会自动迁移为第一条备忘。
- “我的”页面记录每日打开次数和首次打开时间，最多保留最近 180 天。备忘录和打开日志保存在当前设备/浏览器，不会跨设备同步。
- 新增同屏双人五子棋，可轮流落子和悔一步；原有人机五子棋仍保留。
- 刷新 PWA 缓存版本，部署更新后会下载新版前端资源。

## 从现有 GitHub 仓库更新
如果仓库里应用项目放在 `quban/` 子目录，请把本次更新包解压后，将 `package.json`、`README.md` 和 `public/` 上传到仓库的 `quban/` 目录，覆盖同名文件，然后提交更改并在 Render 发起部署。若 Render 的 Root Directory 已设为 `quban`，保持该设置不变。

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

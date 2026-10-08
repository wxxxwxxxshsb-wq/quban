# Google 登录配置

本版本已接入 Google Identity Services，并在 Privacy 服务端验证 Google ID 凭证。要启用 Google 登录，需要先创建一个 Web OAuth Client ID。

## 1. 在 Google Cloud 创建客户端 ID

1. 打开 [Google Cloud Console](https://console.cloud.google.com/)，新建或选择一个项目。
2. 在 Google Auth Platform 完成应用信息和受众设置。若应用处于测试状态，把需要测试的 Google 账号加入测试用户。
3. 创建 OAuth 客户端，应用类型选择 **Web application**。
4. 在 **Authorized JavaScript origins（已获授权的 JavaScript 来源）**加入：

   `https://quban.onrender.com`

   如果还会在本机测试，可以另加 `http://localhost:3000`。
5. 创建后复制客户端 ID。只需要 Client ID；不要把 Client Secret 放进前端、GitHub 或 Render 环境变量。

## 2. 在 Render 设置

1. 打开 Privacy 的 Render 服务，进入左侧 **Environment**。
2. 点击 **Edit**，新增变量：

   - **Key：** `GOOGLE_CLIENT_ID`
   - **Value：** 粘贴刚才创建的 Client ID（通常以 `.apps.googleusercontent.com` 结尾）

3. 保存后等待 Render 自动重新部署。部署成功后，重新打开 Privacy 并测试注册与登录。

Google 注册第一次会要求设置 Privacy ID；之后从同一个下拉菜单选择 Google 即可登录。邮箱和手机号注册仍使用本项目现有的验证码服务设置。

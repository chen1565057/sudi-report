# 部署到公有云（生成公网链接，任何人可打开/协同编辑）

> 为什么不是在这里一键发布：当前 WorkBuddy 会话的「内置一键发布」工具被停用，且运行环境无外网，
> 无法在对话框里直接生成公网链接。因此需要在你**自己联网的电脑**上，用免费云平台部署一次。
> 本项目已 100% 适配云端：单端口、`PORT` 注入、`0.0.0.0`、原生 WebSocket，并自带 `Dockerfile` /
> `railway.json` / `render.yaml`。

---

## 推荐：Railway（免费，支持 Node + WebSocket，最省事）

1. **注册 GitHub**：打开 https://github.com ，免费注册一个账号。
2. **新建仓库**：点右上角 `+` → `New repository`，名字随意（如 `sudi-report`），选 **Public** 或 **Private** 都行，勾不勾 README 均可，点 Create。
3. **上传代码**（二选一）：
   - **方式一（推荐，最稳）：GitHub Desktop**。到 https://desktop.github.com 下载安装 → 登录 → `File` → `Add Local Repository` 选本 `sudi-report` 文件夹 → `Publish` 到刚建的仓库 → `Push`。它会自动按 `.gitignore` 跳过 `node_modules`。
   - **方式二：网页上传**。进仓库 → `Add file` → `Upload files`，把 `sudi-report` 里的文件拖进去。**注意：不要传 `node_modules` 文件夹**（已用 `.gitignore` 排除，网页上传时手动别选它即可），其余 `public/`、`server.js`、`package.json`、`Dockerfile`、`railway.json`、`render.yaml` 等都要在，且**保留文件夹结构**。
   - 网页拖拽单个文件夹有时较慢/易漏子目录，所以更推荐方式一。
4. **注册 Railway**：打开 https://railway.app ，用 GitHub 账号登录（免费）。
5. **部署**：Railway 里点 `New Project` → `Deploy from GitHub repo` → 选刚才的仓库。
   - 它会自动识别 `Dockerfile` 构建，无需任何配置。
   - 第一次构建约 1–2 分钟。
6. **拿到链接**：部署完成后，Railway 给出一个 `https://xxx.up.railway.app` 的公网地址。
   点开它就是线上报告；把这个链接发给任何同事，他们打开即可**实时协同编辑**（光标、改动秒同步）。
7. **管理**：Railway 面板里可查看日志、重新部署、删除。免费额度/试用足够一次市调汇报使用。

---

## 备选：Render（免费，类似流程）

1. 同样先把代码上传到 GitHub（见上面第 1–3 步）。
2. 打开 https://render.com 注册（可用 GitHub 登录）。
3. `New` → `Web Service` → 关联 GitHub 仓库 → Runtime 选 **Docker** → 其余默认 → Create Web Service。
4. 完成后得到 `https://xxx.onrender.com` 公网链接。
   - 注意：Render 免费版**空闲 15 分钟后会休眠**，下次有人打开会冷启动（约十几秒），属正常。

---

## 重要：云端数据的保存

免费容器的硬盘是**临时**的，平台重启/重新部署会清空服务端协同数据。本项目已内置应对：

- 顶栏右侧有 **「导出备份」/「导入备份」** 按钮。
- 重要节点（每天下班前、汇报前）点「导出备份」，会把整份报告存成一个 `.ybin` 文件到你电脑——这是你自己的离线副本，永不丢失。
- 万一云端数据被清空，点「导入备份」选回那个 `.ybin` 即可瞬间恢复，并同步给所有在线的人。
- 若需要长期稳定保存，可在 Railway/Render 升级到付费版并挂载持久卷。

---

## 端口说明

应用读取环境变量 `PORT`，监听 `0.0.0.0`。Railway/Render 会自动注入端口，**无需手动改任何配置**。

## 本地运行（不用云，同事同办公室）

见 `README.md`：双击 `start.bat` 即可，把启动时显示的局域网地址发给同 WiFi 同事。

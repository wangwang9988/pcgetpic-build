# PcGetPic Store (当图应用商店前端)

本项目是基于 Vue 3 + Vite + TypeScript 构建的商店前端项目。

## 项目项目常用命令

### 1. 安装依赖

```bash
# 使用 npm
npm install

# 使用 pnpm (推荐)
pnpm install

# 使用 yarn
yarn install
```

### 2. 本地开发运行

```bash
# 使用 npm
npm run dev

# 使用 pnpm
pnpm run dev

# 使用 yarn
yarn dev
```
启动后会在本地运行 Vite 开发服务器，并在浏览器中自动打开控制台服务。

> **前置条件**：请先启动后端授权服务器（`cd server && npm run dev`），否则套餐数据无法加载。

#### 端口配置说明

store 前端通过 Vite 代理将 `/api` 请求转发到后端授权服务器，默认目标地址为 `http://127.0.0.1:3001`。

| 项目 | 配置位置 | 默认端口 |
|------|---------|---------|
| `server`（后端） | `server/.env` 的 `PORT` | `3001` |
| `store`（前端） | `store/.env` 的 `VITE_API_TARGET` | `http://127.0.0.1:3001` |

如果后端端口被占用需要更换端口，请同步修改两处配置：

1. 修改 `server/.env`：`PORT=3002`
2. 复制 `store/.env.example` 为 `store/.env`，设置：`VITE_API_TARGET=http://127.0.0.1:3002`

Vite 启动时会自动检测后端是否可达，如果连接失败会在终端输出醒目的警告。

### 3. 项目打包构建

```bash
# 使用 npm
npm run build

# 使用 pnpm
pnpm run build

# 使用 yarn
yarn build

# 使用 bun
bun run build
```
打包构建说明：
- 执行打包命令后，系统会首先调用 `vue-tsc` 进行 TypeScript 类型检查与校验。
- 校验通过后，使用 `vite build` 完成前端资源的打包构建。
- 构建打包后的静态资源文件会输出在根目录下的 `dist` 文件夹中。

### 4. 预览打包产物

在本地构建完成后，可以使用以下命令预览 `dist` 目录下的静态应用：

```bash
# 使用 npm
npm run preview

# 使用 pnpm
pnpm run preview

# 使用 yarn
yarn preview
```

## 技术栈说明

- **框架**: Vue 3 (Composition API)
- **构建工具**: Vite 6
- **语言**: TypeScript 5
- **UI 组件库**: Naive UI
- **网络请求**: Axios

## 客户端下载与分发配置

在 `src/config.ts` 中集中管理客户端的下载链接：
- **官方 EXE 直链（Cloudflare R2 免流量加速）**: `https://dl.webtongbu.com/clientGetPic/dangtu.exe`
- **微软应用商店主推链接**: `https://apps.microsoft.com/detail/9P5S2FVP6CR5`

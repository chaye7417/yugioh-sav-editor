# 游戏王 NDS 存档编辑器（可视化版本）

基于 [yugioh-deck-tool](https://github.com/RillingDev/yugioh-deck-tool) 改造的 NDS 游戏王存档可视化编辑器，支持 WC2007/WC2008/WC2009 三个版本。

## 在线访问

- **网站：** http://81.70.28.90/yugioh/
- **域名：** https://ygosave.com（备案中）

## 功能特性

- 解析和编辑 NDS 游戏王存档文件（.sav）
- 自动检测存档版本（WC2007/WC2008/WC2009）
- 无需上传文件，可直接使用空白存档开始编辑
- 可视化卡组编辑：拖拽排序、卡片搜索、过滤
- 预制卡组编辑（50~64 个槽位）
- 卡片背包编辑，同步 flag 数组防止幽灵卡
- 赛制卡组库：按卡片名搜索、筛选、兼容性检查、批量导入
- 支持导入/导出 YDK 卡组文件
- 卡片悬浮预览（图片 + 详细信息）
- DP 修改
- CRC32 校验 + LZ10 压缩，确保存档完整性
- 移动端响应式适配，手机浏览器可用

## 开发

### 环境要求

- Node.js 22+
- npm

### 安装与运行

```bash
git clone https://github.com/chaye7417/yugioh-sav-editor.git
cd yugioh-sav-editor
npm install --legacy-peer-deps
npm run dev
```

### 构建

```bash
npm run build
```

构建产物在 `dist/` 目录。

### 卡片数据构建

```bash
npm run build:cards           # WC2009（默认）
npm run build:cards:wc2008    # WC2008
npm run build:cards:wc2007    # WC2007
```

## 部署

项目已配置 GitHub Actions 自动部署：

1. 推送到 `master` 分支
2. `trigger-deploy.yml` 触发网站仓库 [liujiaye.cn](https://github.com/chaye7417/liujiaye.cn) 的部署
3. 网站仓库自动构建并通过 rsync 部署到服务器

## 技术栈

- Vue 2.7 + TypeScript + Vite 7
- Pinia（状态管理）
- Bootstrap Vue（UI 组件）
- pako（数据压缩）

## 架构

```
src/
├── core/sav/    # 存档处理：解析、写入、CRC32、LZ10、flag 同步
├── core/card/   # 卡片系统：数据库、搜索、过滤、排序
├── core/deck/   # 卡组管理：导入导出 YDK
├── application/ # Vue 应用入口和 UI 组件
├── data/        # 卡片数据加载、赛制卡组 API
└── tooltip/     # 卡片悬浮预览
```

## 许可证

Apache 2.0（原项目），改造部分同协议。

Yu-Gi-Oh! 是集英社和科乐美的商标。本项目与集英社和科乐美无关。

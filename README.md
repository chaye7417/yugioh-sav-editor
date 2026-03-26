# 游戏王 NDS 存档编辑器（可视化版本）

基于 [yugioh-deck-tool](https://github.com/RillingDev/yugioh-deck-tool) 改造的 NDS 游戏王存档可视化编辑器，支持 WC2007/WC2008/WC2009 三个版本。

## 功能特性

- 解析和编辑 NDS 游戏王存档文件（.sav）
- 自动检测存档版本（WC2007/WC2008/WC2009）
- 可视化卡组编辑：拖拽排序、卡片搜索、过滤
- 卡片收藏编辑、配方编辑
- 支持导入/导出 YDK 卡组文件
- 卡片悬浮预览（图片 + 详细信息）
- CRC32 校验 + LZ10 压缩，确保存档完整性

## 在线访问

- 网站：`http://81.70.28.90/yugioh/`（域名恢复后：`https://www.liujiaye.cn/yugioh/`）

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

Vite `base` 配置为 `/yugioh/`，部署在网站的 `/yugioh/` 子路径下。

## 技术栈

- Vue 2.7 + TypeScript + Vite 7
- Pinia（状态管理）
- Bootstrap Vue（UI 组件）
- html2canvas（截图）
- pako（数据压缩）

## 架构

```
src/
├── core/
│   ├── sav/          # 存档处理：解析、写入、CRC32、LZ10 压缩
│   ├── card/         # 卡片系统：数据库、搜索、过滤、排序
│   └── deck/         # 卡组管理：导入导出 YDK
├── application/      # Vue 应用入口和 UI 组件
├── data/             # 卡片数据加载（JSON）
└── tooltip/          # 卡片悬浮预览
```

### 数据流

```
用户上传 .sav → savParser 解析（检测版本、解压 LZ10）
  → 加载对应版本 cards.json → UI 展示卡组/收藏/配方
  → 用户编辑 → savWriter 写回（压缩、CRC32）→ 下载 .sav
```

### 版本支持

通过 `gameProfiles.ts` 配置不同版本的偏移量和参数，savParser 自动探测 TDGY 块位置来判断版本。

## 许可证

Apache 2.0（原项目），改造部分同协议。

Yu-Gi-Oh! 是集英社和科乐美的商标。本项目与集英社和科乐美无关。

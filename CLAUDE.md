# 游戏王 NDS 存档编辑器（可视化版本）

## 项目概览
- **愿景：** 为游戏王 NDS 系列（WC2007/WC2008/WC2009）提供浏览器端的存档可视化编辑工具
- **当前阶段：** 已完成，已部署到个人网站
- **核心架构：** Vue 2 + TypeScript + Vite 纯前端 SPA，所有存档处理在浏览器内完成
- **原项目：** 基于 [yugioh-deck-tool](https://github.com/RillingDev/yugioh-deck-tool) (Apache 2.0) 改造

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | Vue 2.7 + TypeScript 5.1 |
| 构建工具 | Vite 7.1 |
| 状态管理 | Pinia 2.0 |
| UI 组件 | Bootstrap Vue 2.21 |
| 数据压缩 | pako (zlib)、LZ10 自实现 |
| 校验 | CRC32 自实现 |
| 测试 | Vitest 3.0 |

## 项目结构

```
src/
├── core/
│   ├── sav/           # 存档处理核心
│   │   ├── savParser.ts       # 存档解析、版本检测
│   │   ├── savWriter.ts       # 存档写回
│   │   ├── crc32.ts           # CRC32 校验
│   │   ├── lz10.ts            # LZ10 压缩/解压
│   │   ├── gameProfiles.ts    # WC2007/2008/2009 版本配置
│   │   ├── activeDeckEditor.ts
│   │   ├── collectionEditor.ts
│   │   └── recipeEditor.ts
│   ├── card/          # 卡片系统
│   │   ├── CardDatabase.ts    # 卡片数据库
│   │   ├── CardService.ts     # 卡片服务
│   │   ├── FilterService.ts   # 过滤
│   │   └── SortingService.ts  # 排序
│   └── deck/          # 卡组管理
│       ├── DeckService.ts
│       ├── DeckFileService.ts # YDK 导入
│       └── DeckExportService.ts
├── application/       # Vue 应用
│   ├── main.ts        # 入口
│   ├── App.vue        # 根组件
│   └── components/    # UI 组件
├── data/              # 卡片数据加载
│   └── cardDatabase.ts  # 使用 import.meta.env.BASE_URL 拼接路径
└── tooltip/           # 卡片悬浮预览
```

## 部署

### 自动部署流水线

```
本地 git push → 编辑器仓库 trigger-deploy.yml
  → repository_dispatch → 网站仓库 deploy-yugioh.yml
  → npm ci --legacy-peer-deps && npm run build-only
  → rsync 到服务器 /home/ubuntu/website/yugioh/
```

### 关键配置
- **Vite base:** `/yugioh/`（vite.config.ts）
- **资源路径:** 代码中使用 `import.meta.env.BASE_URL` 拼接，不要硬编码绝对路径
- **npm install:** 需要 `--legacy-peer-deps`（@vitejs/plugin-vue2 与 vite 7 peer dep 冲突）
- **网站仓库:** [chaye7417/liujiaye.cn](https://github.com/chaye7417/liujiaye.cn)，本项目作为 git submodule
- **服务器:** 腾讯云 81.70.28.90，Nginx 提供 `/yugioh/` 静态文件

### GitHub Secrets
- `yugioh-sav-editor` 仓库：`DISPATCH_TOKEN`（GitHub PAT，repo 权限）
- `liujiaye.cn` 仓库：`SERVER_HOST`、`SERVER_USER`、`SSH_PRIVATE_KEY`

## 开发命令

```bash
npm run dev              # 开发服务器
npm run build            # 类型检查 + 构建
npm run build-only       # 仅构建
npm run test:unit        # 单元测试
npm run build:cards      # 构建 WC2009 卡片数据
npm run build:cards:wc2008
npm run build:cards:wc2007
```

## 注意事项
- 加载数据文件路径必须用 `import.meta.env.BASE_URL` 前缀，否则子目录部署会 404
- `fl-decks.js`（11MB）是最大的静态资源，服务器需开启 gzip 压缩
- 版本检测通过探测 TDGY 块位置实现，不依赖文件大小

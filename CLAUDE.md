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

## 功能列表

- **存档解析：** 自动检测 WC2007/WC2008/WC2009 版本（TDGY 块探测）
- **存档总览：** 显示基本信息、DP、卡片统计
- **活动卡组编辑：** 可视化编辑当前使用的卡组，支持 YDK 导入导出
- **预制卡组编辑：** 编辑 50~64 个预制卡组槽位
- **卡片背包：** 修改每张卡的持有数量（0-9），同步更新 flag 数组防止幽灵卡
- **DP 修改：** 直接修改决斗积分
- **赛制卡组库：** 浏览在线赛制卡组，支持：
  - 按赛制、年份、来源、名次筛选
  - 按卡片名搜索（模糊匹配，显示包含该卡的所有卡组）
  - 兼容性检查（哪些卡不在当前版本卡池中）
  - 单个导入到活动卡组或指定预制卡组槽位
  - 批量多选导入到连续预制卡组槽位
  - 槽位下拉框显示占用状态和卡组名
  - 导入后自动跳到下一个槽位
- **空白存档：** 无需上传文件，一键加载 WC2007/2008/2009 空白存档开始编辑
- **面板缓存：** 使用 keep-alive，切换选项卡不丢失状态
- **移动端适配：** 全站响应式布局（768px 断点），侧边栏改横向 tab、双栏改上下堆叠、卡图缩小

## 项目结构

```
src/
├── core/
│   ├── sav/           # 存档处理核心
│   │   ├── savParser.ts       # 存档解析、版本检测
│   │   ├── savWriter.ts       # 存档写回
│   │   ├── crc32.ts           # CRC32 校验
│   │   ├── lz10.ts            # LZ10 压缩/解压
│   │   ├── gameProfiles.ts    # WC2007/2008/2009 版本配置（含 flag 偏移）
│   │   ├── collectionEditor.ts # 卡片收藏编辑（nibble + flag 同步）
│   │   ├── activeDeckEditor.ts
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
│   └── components/
│       └── sav/
│           ├── SavLayout.vue       # 主布局（侧边栏+内容区+keep-alive）
│           ├── SavUpload.vue       # 上传页（含空白存档按钮）
│           ├── SavOverview.vue     # 存档总览
│           ├── ActiveDeckEditor.vue
│           ├── RecipeEditor.vue
│           ├── Collection.vue      # 卡片背包
│           ├── DpEditor.vue
│           ├── FormatLibrary.vue   # 赛制卡组库（搜索+批量导入+槽位选择）
│           └── CardInfoPanel.vue   # 卡片详情面板
├── data/              # 卡片数据加载
│   ├── cardDatabase.ts  # 使用 import.meta.env.BASE_URL 拼接路径
│   └── formatLibraryApi.ts # 赛制卡组数据接口
└── tooltip/           # 卡片悬浮预览
```

## 存档数据结构要点

### 幽灵卡防护
gamedata 中有两个并行数组：
- **nibble array**：每张卡 4 bit，存持有数量（0-9）
- **flag array**：每张卡 1 byte，0x09=持有，0x00=未持有

设置数量时必须同步两个数组，否则数量=0但flag未清会产生"幽灵卡"。

| 版本 | nibble 偏移 | flag 偏移 |
|------|------------|----------|
| WC2007 | +0x0260 | +0x05A1 |
| WC2008 | +0x065A | +0x0A5A |
| WC2009 | +0x0A4E | +0x100A |

## 部署

### 自动部署流水线

```
本地 git push → 编辑器仓库 trigger-deploy.yml
  → repository_dispatch → 网站仓库 deploy-yugioh.yml
  → npm ci --legacy-peer-deps && npm run build-only
  → rsync（--exclude='rom/'）到服务器 /home/ubuntu/website/yugioh/
```

### 关键配置
- **Vite base:** `/yugioh/`（vite.config.ts）
- **资源路径:** 代码中使用 `import.meta.env.BASE_URL` 拼接，不要硬编码绝对路径
- **npm install:** 需要 `--legacy-peer-deps`（@vitejs/plugin-vue2 与 vite 7 peer dep 冲突）
- **网站仓库:** [chaye7417/liujiaye.cn](https://github.com/chaye7417/liujiaye.cn)，本项目作为 git submodule
- **服务器:** 腾讯云 81.70.28.90，Nginx 提供 `/yugioh/` 静态文件
- **域名:** ygosave.com（备案中）

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
- 修改卡片数量时必须同时操作 nibble 和 flag 数组，传入 `flagBase` 参数
- 移动端断点为 768px，媒体查询写在各组件 scoped SCSS 末尾，不影响桌面端样式

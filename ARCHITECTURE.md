# 架构

### 模块结构

- `core/sav` — 存档处理核心：解析（savParser）、写入（savWriter）、CRC32 校验、LZ10 压缩解压、版本配置（gameProfiles）
- `core/card` — 卡片系统：数据结构（Card）、数据库（CardDatabase）、服务（CardService）、过滤（FilterService）、排序（SortingService）
- `core/deck` — 卡组管理：卡组数据结构（Deck）、服务（DeckService）、文件导入导出（DeckFileService/DeckExportService）
- `application` — Vue 应用入口（main.ts、App.vue）和 UI 组件
- `data` — 卡片数据库加载（从 JSON 文件初始化）
- `tooltip` — 卡片悬浮预览（图片 + 信息面板）

### 依赖注入

通过构造函数依赖注入实现控制反转。依赖的组装和解析在入口包的 `ctx.ts` 中完成。

### 数据流

```
用户上传 .sav 文件
  → savParser 解析存档（检测版本、解压 LZ10）
  → 加载对应版本的 cards.json
  → UI 展示卡组/收藏/配方
  → 用户编辑
  → savWriter 写回（重新压缩、计算 CRC32）
  → 下载修改后的 .sav
```

### 版本支持

通过 `gameProfiles.ts` 配置不同版本的偏移量和参数，savParser 自动探测 TDGY 块位置来判断版本。

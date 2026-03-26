# 游戏王 WC2009 存档可视化编辑器 — 设计文档

## 项目定位

基于 yugioh-deck-tool 魔改的纯前端 Web 应用，为游戏王 WC2009 NDS 存档提供可视化编辑界面。

**用户操作流程：** 打开网页 → 上传 .sav → 可视化编辑 → 下载修改后的 .sav

## 技术栈

| 项目 | 选择 |
|------|------|
| 前端框架 | Vue 2.7 + Pinia |
| 构建工具 | Vite 7 |
| 语言 | TypeScript |
| UI | Bootstrap-Vue |
| 卡片数据 | 本地 JSON（从 CDB 构建） |
| 卡图 CDN | cdn.233.momobako.com |
| 部署方式 | 纯静态托管 |

## 支持的游戏版本

- WC2009（Yu-Gi-Oh! 5D's Stardust Accelerator, CY8J 日版）
- 支持 64KB 标准存档和 512KB 模拟器扩展存档

## 功能清单

### 存档编辑

- .sav 文件上传/下载（支持 64KB 和 512KB）
- 存档总览（文件信息、卡组使用情况、背包总数、DP）
- 活动卡组编辑（拖拽添加/移动/删除）
- 预制卡组编辑（50 个槽位，可视化选卡）
- 卡片背包管理（查看/修改每张卡持有数量，一键全卡）
- DP 修改（直接输入或预设快捷值）

### 赛制卡组库（Format Library）

集成 formatlibrary.com 的 12,088 个卡组数据，全面中文化：

- **6 维筛选：** 赛制、年份（1999-2025）、来源（比赛/用户）、名次、排序、WC2009 兼容性
- **中文翻译：** 122 个赛制名 + 649 个卡组类型名完整汉化（`flI18n.ts`）
- **兼容性检查：** 自动标记不在 WC2009 卡池中的卡片
- **一键导入：** 导入到活动卡组或预制卡组（自动分离主/额外卡组）
- **左右布局：** 左侧筛选+列表（滚动自动加载），右侧卡组详情

### 卡片详情面板（全局常驻）

- 鼠标悬停任意卡图即显示大图 + 中文卡名/类型/攻防/效果
- 支持 WC2009 卡池内外的卡片（额外卡片数据从 `fl-extra-cards.json` 加载）
- 所有面板通用（活动卡组、预制卡组、卡片背包、赛制卡组库）

### 保留功能（来自 yugioh-deck-tool）

- 卡片搜索/筛选（按类型、属性、种族、星级等）
- 拖拽交互
- YDK 导入/导出

## 数据文件

| 文件 | 大小 | 用途 |
|------|------|------|
| `public/cards.json` | 1.1 MB | WC2009 卡池 2,807 张（CID → 中文名/效果/属性/passcode/nibbleIndex） |
| `public/fl-formats.js` | 44 KB | 122 个赛制 → `window.__FL_FORMATS__` |
| `public/fl-decks.js` | 11 MB | 12,088 个卡组 → `window.__FL_DECKS__` |
| `public/fl-extra-cards.json` | 1.5 MB | 3,657 张非 WC2009 卡池卡片信息 |

### Errata 密码映射

部分卡片被 Konami 修改效果后分配了新密码，在 `cardDatabase.ts` 的 `ERRATA_PASSCODE_MAP` 中注册别名（8 张卡）。

## 存档引擎

### 模块清单

| TS 模块 | 功能 |
|---|---|
| `lz10.ts` | LZ10 压缩/解压 |
| `savParser.ts` | .sav 读取，TDGY/CRGY 定位（≥64KB） |
| `savWriter.ts` | .sav 写回（保留原始大小 + CRC32 + 备份同步） |
| `constants.ts` | 存档格式常量 |
| `collectionEditor.ts` | nibble 数组读写 |
| `recipeEditor.ts` | CRGY 预制卡组读写 |
| `trunkReader.ts` | 背包解析 |

### 存档格式要点（WC2009）

- 文件头：`YuGiWC08`
- TDGY 位置：0xB51C, 0xDA8C（主 + 备份）
- TDGY gamedata：LZ10 压缩，解压后 9,552 bytes
- CRGY 预制卡组：0x45A8 起，50 槽 × 228 bytes
- nibble 偏移（解压后）：+0xA4E

## UI 布局

```
┌──────────────────────────────────────────────────────────────────┐
│  游戏王 WC2009 存档编辑器                   [上传.sav] [下载.sav] │
├────────┬──────────────────────────────────────────┬──────────────┤
│ 侧边栏  │              主内容区                     │  卡片详情面板  │
│        │                                          │ （全局常驻）   │
│ 存档总览 │  根据侧边栏选择切换对应面板                 │  [卡图大图]   │
│ 活动卡组 │                                          │  卡名        │
│ 预制卡组 │  赛制卡组库特殊布局：                      │  类型/种族    │
│ 卡片背包 │  ┌─────────┬──────────────┐              │  ATK/DEF    │
│ DP 修改  │  │ 筛选+列表 │  卡组详情预览  │              │  效果描述    │
│ 赛制卡组库│  └─────────┴──────────────┘              │             │
└────────┴──────────────────────────────────────────┴──────────────┘
```

## 项目文件结构

```
src/
├── core/sav/                    # 存档引擎
├── data/
│   ├── cardDatabase.ts          # 卡片数据库（含 Errata 密码映射）
│   ├── cidMapping.ts            # CID/passcode/nibble 双向查询
│   ├── i18n.ts                  # 类型/种族/属性中文枚举
│   ├── flI18n.ts                # 赛制名+卡组类型名中英翻译（771条）
│   ├── formatLibraryApi.ts      # 赛制卡组库筛选/排序/展开
│   └── wc2009Compat.ts          # WC2009 兼容性检查
├── application/
│   ├── components/sav/
│   │   ├── SavLayout.vue        # 整体布局（侧边栏+内容区+卡片详情面板）
│   │   ├── SavUpload.vue        # 上传界面
│   │   ├── SavOverview.vue      # 存档总览
│   │   ├── ActiveDeckEditor.vue # 活动卡组编辑
│   │   ├── RecipeList.vue       # 预制卡组槽位列表
│   │   ├── RecipeEditor.vue     # 预制卡组编辑
│   │   ├── Collection.vue       # 卡片背包
│   │   ├── DpEditor.vue         # DP 修改
│   │   ├── FormatLibrary.vue    # 赛制卡组库
│   │   └── CardInfoPanel.vue    # 卡片详情面板（全局常驻）
│   └── store/
│       ├── sav.ts               # 存档状态管理
│       └── cardHover.ts         # 卡片悬停状态管理（全局）
```

## 性能要点

### Vue 2 大数据处理

赛制卡组库的 12,000+ 条数据**完全不经过 Vue 响应式系统**：

- `rawFormats`、`rawDecks`、`filteredDecks` 存在模块级普通变量中
- 只将当前页（50 条）的轻量纯对象放入 `data()`
- 兼容性缓存在模块级，组件销毁重建不丢失
- 使用 `mounted()` 而非 `created()` 初始化

## 关键数据文件位置

| 文件 | 路径 |
|------|------|
| 中文 CDB | `reference-data/zh-CN-cards.cdb` |
| CID → nibble | `reference-data/cid_to_nibble.json` |
| Konami CID 数据库 | `reference-data/konami_card_db.json` |
| 密码 → 英文名 | `reference-data/pw_to_name.json` |
| 测试存档 | `reference-data/2009.sav` |

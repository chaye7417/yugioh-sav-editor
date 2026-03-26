# 游戏王 NDS 存档可视化编辑器 — 设计文档

## 项目定位

基于 yugioh-deck-tool 魔改的纯前端 Web 应用，为游戏王 NDS 系列存档提供可视化编辑界面。

**用户操作流程：** 打开网页 → 上传 .sav → 自动识别版本 → 可视化编辑 → 下载修改后的 .sav

## 技术栈

| 项目 | 选择 |
|------|------|
| 前端框架 | Vue 2.7 + Pinia |
| 构建工具 | Vite 7 |
| 语言 | TypeScript |
| UI | Bootstrap-Vue |
| 卡片数据 | 本地 JSON（从 CDB 构建，按版本切换） |
| 卡图 CDN | cdn.233.momobako.com |
| 部署方式 | 纯静态托管 |

## 支持的游戏版本

| 版本 | 文件头 | 卡池 | 预制槽位 | 主卡组上限 | 检测方式 |
|------|--------|------|----------|-----------|----------|
| WC2007 | `YuGiWC07` | 1,636 张 | 64 | 80 | 文件头 |
| WC2008 | `YuGiWC08` | 2,010 张 | 64 | 80 | 文件头 + TDGY 位置探测 |
| WC2009 | `YuGiWC08` | 2,807 张 | 50 | 60 | 文件头 + TDGY 位置探测 |

**版本检测逻辑（不依赖文件大小，兼容各种模拟器）：**
1. `YuGiWC07` → WC2007
2. `YuGiWC08` → 检查 TDGY 魔数在 WC2008/WC2009 各自偏移处是否存在来区分

## 功能清单

### 存档编辑

- .sav 文件上传/下载（兼容各种模拟器产生的不同大小存档）
- 存档总览（文件信息、游戏版本、卡组使用情况、背包总数、DP）
- 活动卡组编辑（拖拽添加/移动/删除）
- 预制卡组编辑（WC2007/2008: 64 槽位，WC2009: 50 槽位）
- 卡片背包管理（查看/修改每张卡持有数量，一键全卡）
- DP 修改（直接输入或预设快捷值）

### 赛制卡组库（Format Library）

集成 formatlibrary.com 的 12,088 个卡组数据，全面中文化：

- **6 维筛选：** 赛制、年份（1999-2025）、来源（比赛/用户）、名次、排序、当前版本兼容性
- **中文翻译：** 122 个赛制名 + 649 个卡组类型名完整汉化（`flI18n.ts`）
- **兼容性检查：** 根据当前加载的版本动态标记不兼容卡片
- **一键导入：** 导入到活动卡组或预制卡组（自动分离主/额外卡组）
- **左右布局：** 左侧筛选+列表（滚动自动加载），右侧卡组详情

### 卡片详情面板（全局常驻）

- 鼠标悬停任意卡图即显示大图 + 中文卡名/类型/攻防/效果
- 支持卡池内外的卡片（额外卡片数据从 `fl-extra-cards.json` 加载）
- 所有面板通用（活动卡组、预制卡组、卡片背包、赛制卡组库）

### 保留功能（来自 yugioh-deck-tool）

- 卡片搜索/筛选（按类型、属性、种族、星级等）
- 拖拽交互
- YDK 导入/导出

## 数据文件

| 文件 | 大小 | 用途 |
|------|------|------|
| `public/cards.json` | 1.1 MB | WC2009 卡池 2,807 张 |
| `public/cards-wc2008.json` | ~0.8 MB | WC2008 卡池 2,010 张 |
| `public/cards-wc2007.json` | ~0.6 MB | WC2007 卡池 1,636 张 |
| `public/fl-formats.js` | 44 KB | 122 个赛制 → `window.__FL_FORMATS__` |
| `public/fl-decks.js` | 11 MB | 12,088 个卡组 → `window.__FL_DECKS__` |
| `public/fl-extra-cards.json` | 1.5 MB | 3,657 张非卡池卡片信息（悬停详情用） |

### Errata 密码映射

部分卡片被 Konami 修改效果后分配了新密码，在 `cardDatabase.ts` 的 `ERRATA_PASSCODE_MAP` 中注册别名（8 张卡）。

## 存档引擎

### 架构：GameProfile 版本配置系统

所有版本差异（偏移、大小、结构）封装在 `GameProfile` 配置对象中，引擎通过 profile 参数化运行：

```
gameProfiles.ts  →  定义 WC2007/WC2008/WC2009 三个 profile
                    + detectGameVersion() 自动检测
savParser.ts     →  parseSav() 用 profile 驱动解析
savWriter.ts     →  writeSav() 用 profile 驱动写回
activeDeckEditor →  读写活动卡组，偏移从 profile 获取
collectionEditor →  nibble 数组读写，nibbleBase 参数化
```

### 模块清单

| TS 模块 | 功能 |
|---|---|
| `gameProfiles.ts` | 版本配置定义 + 自动检测 |
| `lz10.ts` | LZ10 压缩/解压 |
| `savParser.ts` | .sav 解析（TDGY 多块选择、CRGY 读取） |
| `savWriter.ts` | .sav 写回（全部 TDGY 同步、CRC32 更新） |
| `activeDeckEditor.ts` | 活动卡组读写 |
| `collectionEditor.ts` | nibble 数组读写（nibbleBase 参数化） |
| `trunkReader.ts` | 背包解析 |
| `constants.ts` | 通用常量（魔数等） |

### 三版本存档格式对比

| 项目 | WC2007 | WC2008 | WC2009 |
|------|--------|--------|--------|
| 文件头 | `YuGiWC07` | `YuGiWC08` | `YuGiWC08` |
| TDGY 块数 | 4 | 4 | 2 |
| Gamedata 解压大小 | 5,968 B | 9,968 B | 9,552 B |
| CRGY 槽位 | 64 × 384B | 64 × 384B | 50 × 228B |
| 主卡组上限 | 80 | 80 | 60 |
| Nibble 偏移 | 0x260 | 0x65A | 0xA4E |
| CRGY 填充字节 | 0xFF | 0xFF | 0x00 |
| CRGY count 类型 | uint32 | uint32 | uint16 |

## UI 布局

```
┌──────────────────────────────────────────────────────────────────┐
│  游戏王 {版本} 存档编辑器                    [上传.sav] [下载.sav] │
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
│   ├── gameProfiles.ts          # 版本配置 + 自动检测
│   ├── savParser.ts             # 解析器
│   ├── savWriter.ts             # 写回器
│   ├── activeDeckEditor.ts      # 活动卡组
│   ├── collectionEditor.ts      # 卡片收藏（nibble）
│   ├── trunkReader.ts           # 背包读取
│   ├── lz10.ts / crc32.ts       # 通用算法
│   ├── constants.ts / types.ts  # 常量和类型
│   └── index.ts                 # 统一导出
├── data/
│   ├── cardDatabase.ts          # 卡片数据库（多版本切换 + Errata 映射）
│   ├── cidMapping.ts            # CID/passcode/nibble 双向查询
│   ├── i18n.ts                  # 类型/种族/属性中文枚举
│   ├── flI18n.ts                # 赛制名+卡组类型名中英翻译（771条）
│   ├── formatLibraryApi.ts      # 赛制卡组库筛选/排序/展开
│   └── wc2009Compat.ts          # 兼容性检查
├── application/
│   ├── components/sav/
│   │   ├── SavLayout.vue        # 整体布局
│   │   ├── SavUpload.vue        # 上传界面（支持三版本）
│   │   ├── SavOverview.vue      # 存档总览（动态版本显示）
│   │   ├── ActiveDeckEditor.vue # 活动卡组编辑
│   │   ├── RecipeList.vue       # 预制卡组槽位列表
│   │   ├── RecipeEditor.vue     # 预制卡组编辑
│   │   ├── Collection.vue       # 卡片背包
│   │   ├── DpEditor.vue         # DP 修改
│   │   ├── FormatLibrary.vue    # 赛制卡组库
│   │   └── CardInfoPanel.vue    # 卡片详情面板（全局常驻）
│   └── store/
│       ├── sav.ts               # 存档状态管理（版本感知）
│       └── cardHover.ts         # 卡片悬停状态管理
└── scripts/
    └── buildCardData.ts         # 卡片数据构建（--game wc2007/wc2008/wc2009）
```

## 性能要点

### Vue 2 大数据处理

赛制卡组库的 12,000+ 条数据**完全不经过 Vue 响应式系统**：

- `rawFormats`、`rawDecks`、`filteredDecks` 存在模块级普通变量中
- 只将当前页（50 条）的轻量纯对象放入 `data()`
- 兼容性缓存在模块级，组件销毁重建不丢失
- 使用 `mounted()` 而非 `created()` 初始化
- 滚动自动加载（IntersectionObserver），无"加载更多"按钮

## 关键数据文件位置

| 文件 | 路径 |
|------|------|
| 中文 CDB | `reference-data/zh-CN-cards.cdb` |
| CID → nibble (WC2009) | `reference-data/cid_to_nibble.json` |
| CID → nibble (WC2008) | `reference-data/cid_to_nibble_wc2008.json` |
| CID → nibble (WC2007) | `reference-data/cid_to_nibble_wc2007.json` |
| Konami CID 数据库 | `reference-data/konami_card_db.json` |
| 密码 → 英文名 | `reference-data/pw_to_name.json` |

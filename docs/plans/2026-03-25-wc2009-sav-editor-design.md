# 游戏王 WC2009 存档可视化编辑器 — 设计文档

## 项目定位

基于 yugioh-deck-tool 魔改的纯前端 Web 应用，为游戏王 WC2009 NDS 存档提供可视化编辑界面。

**用户操作流程：** 打开网页 → 上传 .sav → 可视化编辑 → 下载修改后的 .sav

## 技术栈

| 项目 | 选择 |
|------|------|
| 前端框架 | Vue 2（沿用原项目） |
| 构建工具 | Vite |
| 语言 | TypeScript |
| 卡片数据 | 本地 JSON（从 CDB 构建） |
| 卡图 CDN | cdn.233.momobako.com |
| 部署方式 | 纯静态托管 |

## 支持的游戏版本

- WC2009（Yu-Gi-Oh! 5D's Stardust Accelerator, CY8J 日版）
- WC2008 后续扩展

## 功能清单

### 保留功能（来自 yugioh-deck-tool）

- 卡片搜索/筛选（按类型、属性、种族、星级等）
- 卡组可视化展示（主/额外/副卡组，卡图网格）
- 拖拽交互
- YDK 导入/导出
- 截图导出
- 卡组列表导出（纯文本）
- 模拟抽卡
- 禁限表筛选

### 砍掉的功能

- 价格显示/购买链接
- Collection 过滤（依赖 YGOProDeck 账号）
- YDKE URL
- 分享链接
- 随机卡组

### 新增功能（存档编辑）

- .sav 文件上传/下载
- 存档总览（文件信息、卡组使用情况、背包总数、DP）
- 预制卡组编辑（50 个槽位，可视化选卡）
- 背包管理（查看/修改每张卡持有数量，一键全卡×3）
- DP 修改（直接输入或预设快捷值）

## 卡片数据方案

### 数据来源

- **中文卡名/效果：** `ygopro-database/locales/zh-CN/cards.cdb`（14,592 张，SQLite）
- **CID → nibble 映射：** `wc2009/data/cid_to_nibble.json`（2,934 张，WC2009 卡池）
- **CID → passcode 映射：** 通过 `konami_card_db.json` + `pw_to_name.json` 英文名关联（100% 匹配）
- **卡图：** `cdn.233.momobako.com/images/cards/{passcode}.jpg`

### 构建产物

**cards.json**（构建时从 CDB 生成，只含 WC2009 卡池 2,934 张）：

```json
{
  "3500": {
    "name": "青眼白龙",
    "desc": "以高攻击力著称的传说之龙...",
    "type": 17,
    "atk": 3000,
    "def": 2500,
    "level": 8,
    "race": 8192,
    "attribute": 16,
    "passcode": "89631139",
    "nibbleIndex": 42
  }
}
```

### 枚举中文映射

type/race/attribute 的 bitmask 需映射为中文（如 race 8192 → "龙族"）。

## 存档引擎（Python → TS 重写）

### 模块清单

| Python 模块 | TS 模块 | 功能 |
|---|---|---|
| `lz10.py` | `lz10.ts` | LZ10 压缩/解压 |
| `sav_io.py` | `savParser.ts` | .sav 读取，TDGY/CRGY 定位 |
| `constants.py` | `constants.ts` | 存档格式常量 |
| `collection_editor.py` | `collectionEditor.ts` | nibble 数组读写 |
| `recipe_writer.py` | `recipeEditor.ts` | CRGY 预制卡组读写 |
| `trunk_reader.py` | `trunkReader.ts` | 背包解析 |
| — | `savWriter.ts` | .sav 写回（CRC32 + 同步备份） |

### 存档格式要点（WC2009）

- 存档大小：64 KB
- 文件头：`YuGiWC08`
- TDGY 位置：0xB51C, 0xDA8C（主 + 备份）
- TDGY gamedata：LZ10 压缩，解压后 9,552 bytes
- CRGY 预制卡组：0x45A8 起，50 槽 × 228 bytes
- nibble 偏移（解压后）：+0xA4E
- CID 范围：0xDAC-0x1FC9（3,500-8,137）

### 数据流

```
上传 .sav (ArrayBuffer)
    ↓
savParser: 验证文件头 → 定位 TDGY/CRGY
    ↓
LZ10 解压 TDGY gamedata
    ↓
解析三类数据:
  ├── 预制卡组 (CRGY × 50)
  ├── 背包 (nibble array → 持有列表)
  └── DP 值
    ↓
用户编辑 (Vue UI)
    ↓
savWriter: 修改 → LZ10 压缩 → CRC32 → 同步备份
    ↓
下载修改后的 .sav
```

## UI 布局

### 整体结构

```
┌──────────────────────────────────────────────────┐
│  游戏王 WC2009 存档编辑器       [上传.sav] [下载.sav] │
├────────┬─────────────────────────────────────────┤
│ 侧边栏  │              主内容区                    │
│        │                                         │
│ 存档总览 │  根据侧边栏选择切换对应面板                │
│ 预制卡组 │                                         │
│ 背包管理 │                                         │
│ DP 修改  │                                         │
└────────┴─────────────────────────────────────────┘
```

### 预制卡组编辑面板

```
┌──────────────────┬───────────────────────────┐
│  卡组槽位列表      │     卡组编辑区              │
│                  │                           │
│  ▸ 槽位 0: 青眼   │  主卡组 (卡图网格)          │
│    槽位 1: 空     │  额外卡组 (卡图网格)         │
│    ...           │  副卡组 (卡图网格)           │
│                  │                           │
│  [新建] [导入YDK]  │                           │
├──────────────────┤                           │
│  卡片搜索/筛选     │                           │
│  类型▾ 属性▾ 星级▾ │                           │
│  搜索结果(卡图)    │                           │
└──────────────────┴───────────────────────────┘
```

## 项目文件结构

```
yugioh-deck-tool/
├── scripts/
│   └── buildCardData.ts          # CDB → JSON 构建脚本
├── public/
│   └── cards.json                # 构建产物
├── src/
│   ├── core/
│   │   ├── card/                 # 保留：卡片模型、筛选、排序
│   │   ├── deck/                 # 保留：卡组模型、YDK 读写
│   │   └── sav/                  # 新增：存档引擎
│   │       ├── constants.ts
│   │       ├── lz10.ts
│   │       ├── savParser.ts
│   │       ├── savWriter.ts
│   │       ├── recipeEditor.ts
│   │       ├── collectionEditor.ts
│   │       └── types.ts
│   ├── data/                     # 新增：数据层
│   │   ├── cardDatabase.ts
│   │   ├── cidMapping.ts
│   │   └── i18n.ts
│   ├── application/
│   │   ├── components/
│   │   │   ├── builder/          # 复用
│   │   │   ├── deck/             # 复用
│   │   │   ├── toolbar/          # 精简
│   │   │   ├── sav/              # 新增
│   │   │   │   ├── SavUpload.vue
│   │   │   │   ├── SavOverview.vue
│   │   │   │   ├── RecipeList.vue
│   │   │   │   ├── RecipeEditor.vue
│   │   │   │   ├── Collection.vue
│   │   │   │   └── DpEditor.vue
│   │   │   ├── YgoCard.vue       # 复用
│   │   │   └── YgoFilter.vue     # 复用
│   │   ├── store/
│   │   │   ├── sav.ts            # 新增
│   │   │   ├── deck.ts           # 保留
│   │   │   └── data.ts           # 改造
│   │   └── App.vue               # 改造
│   └── ygoprodeck/               # 删除
```

## 实施阶段

### 阶段 1：数据准备

- 写构建脚本从 CDB 提取 WC2009 卡池中文数据
- 生成 cards.json（CID → 中文名/效果/属性/passcode/nibbleIndex）
- 编写中文枚举映射（种族/属性/卡片类型 bitmask → 中文）

### 阶段 2：存档引擎（Python → TS）

- 重写 LZ10 压缩/解压
- 重写 .sav 解析器
- 重写 nibble 数组读写（背包）
- 重写 CRGY 预制卡组读写
- 重写 .sav 写回（CRC32 + 备份同步）
- 用现有 .sav 做对比测试

### 阶段 3：清理原项目 + 对接本地数据

- 删除 ygoprodeck API 层、价格模块、不需要的组件
- 改造 CardDatabase 对接本地 JSON
- 卡图 URL 改为 233 CDN
- UI 文字全部汉化

### 阶段 4：新增存档编辑 UI

- 上传/下载 .sav 组件
- 存档总览面板
- 预制卡组编辑面板
- 背包管理面板
- DP 修改面板
- 侧边栏导航 + 整体布局

### 阶段 5：打磨与部署

- 响应式适配
- 错误处理
- 构建优化
- 部署

## 关键数据文件位置

| 文件 | 路径 |
|------|------|
| 中文 CDB | `/Users/liujiaye/Developer/汉化工作/ygopro-database/locales/zh-CN/cards.cdb` |
| CID → nibble | `/Users/liujiaye/Developer/汉化工作/游戏王NDS存档编辑器/wc2009/data/cid_to_nibble.json` |
| Konami CID 数据库 | `/Users/liujiaye/Developer/汉化工作/游戏王NDS存档编辑器/common/konami_card_db.json` |
| 密码 → 英文名 | `/Users/liujiaye/Developer/汉化工作/游戏王NDS存档编辑器/common/pw_to_name.json` |
| 测试存档 | `/Users/liujiaye/Developer/汉化工作/游戏王NDS存档编辑器/wc2009/2009.sav` |
| Python 参考实现 | `/Users/liujiaye/Developer/汉化工作/游戏王NDS存档编辑器/wc2009/tools/` |

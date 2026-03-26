# 赛制卡组库（Format Library）集成 — 当前状态与待修复问题

## 功能目标

在编辑器中集成 formatlibrary.com 的 12088 个卡组数据，支持：
- 多条件筛选（赛制、来源、名次、排序）
- WC2009 兼容性检查
- 一键导入到活动卡组/预制卡组

## 数据已就绪

本地数据文件已下载完成，浏览器可正常加载：

| 文件 | 大小 | 内容 | 浏览器加载测试 |
|------|------|------|----------------|
| `public/fl-formats.json` | 44 KB | 122 个赛制 | ✅ 53ms |
| `public/fl-decks-slim.json` | 11 MB | 12088 个卡组（精简格式） | ✅ 53ms |
| `public/fl-formats.js` | 44 KB | JSONP: `window.__FL_FORMATS__` | ✅ |
| `public/fl-decks.js` | 11 MB | JSONP: `window.__FL_DECKS__` | ✅ |

### 精简格式 (SlimDeck)

```json
{
  "id": 2523,
  "n": null,          // name
  "t": "Diva Frog",   // deckTypeName
  "b": "Roghnach",    // builderName
  "f": "Edison",       // formatName
  "p": 1,             // placement
  "r": 3522,          // rating
  "dl": 328,          // downloads
  "e": "RBCT",        // eventAbbreviation
  "m": ["9748752", ...],  // main deck artworkIds (注意：是字符串不是数字)
  "x": [...],         // extra deck
  "s": [...]          // side deck
}
```

**注意：** `o` (origin) 字段在下载时遗漏，全部缺失。`m`/`x`/`s` 中的 artworkId 是字符串类型。

## 已完成的文件

### `src/data/formatLibraryApi.ts`
- `loadFormats()`: 异步加载赛制 JSON
- `loadAllDecks()`: 异步加载卡组 JSON（返回 SlimDeck[]，不做展开）
- `expandDeck(slim)`: 按需将 SlimDeck 展开为 DeckDetail（用于详情显示）
- `filterAndSort(decks, filter, sort)`: 前端筛选排序（操作 SlimDeck 的短字段名）
- 类型定义：`FormatInfo`, `SlimDeck`, `DeckDetail`, `DeckCard`, `DeckFilter`, `DeckSort`

### `src/data/wc2009Compat.ts`
- `checkWc2009Compat(cards)`: 检查卡组中每张卡是否在 WC2009 卡池
- 返回 `CompatResult`（totalCards, compatibleCards, incompatibleCards, percentage, isFullyCompatible）

### `src/application/components/sav/FormatLibrary.vue`
- 模板已完成（筛选区 + 卡组列表 + 详情预览 + 导入按钮）
- 列表用 SlimDeck 短字段名（`deck.t`, `deck.f`, `deck.p` 等）
- 详情区用 DeckDetail 完整字段名（通过 `expandDeck` 转换）

### `index.html`
- 通过 `<script>` 标签预加载 JSONP 数据到 `window.__FL_FORMATS__` 和 `window.__FL_DECKS__`

## 核心 BUG：组件白屏

### 症状
FormatLibrary.vue 组件在侧边栏点击后显示**完全空白**（连标题都不显示），或者卡在"正在加载卡组数据..."。

### 已排除的原因
1. ✅ 数据文件正常（curl 和独立 HTML 测试页面都能正常加载和解析）
2. ✅ API 模块类型检查通过（vue-tsc --noEmit 无错误）
3. ✅ 浏览器 fetch/XHR 对这些文件工作正常
4. ✅ JSONP 方式也正常（独立页面验证 window.__FL_FORMATS__ 和 __FL_DECKS__ 有数据）

### 尝试过但失败的方案
1. **Composition API setup() + fetch/Promise** — Promise.then 不触发 Vue 2 响应式更新
2. **Composition API setup() + 同步 XHR** — 同步 XHR 导致 setup 崩溃（组件白屏）
3. **Options API mounted() + async/await** — 一直卡在加载中
4. **Options API mounted() + XHR 异步回调** — 一直卡在加载中
5. **Options API created() + XHR 异步回调** — 一直卡在加载中
6. **Options API created() + window 全局变量** — 组件白屏
7. **import JSON（Vite 打包）** — Vite dev 模式下 10MB JSON 导致问题

### 可能的根本原因
- Vue 2.7 的 `defineComponent` 或 `Vue.extend` 与 Options API 的 data/methods/computed 混用时可能有兼容性问题
- 组件 script 部分可能有隐藏的运行时错误（类型正确但运行时崩溃），但由于 Vue 2 的错误处理机制，错误被静默吞掉
- Vite HMR 可能干扰了组件的生命周期

### 建议修复方向
1. **回退到纯 Composition API setup()**，因为这是唯一能显示标题的方案
2. 在 setup 中用 `ref` 存数据，用 `setTimeout(() => { ... }, 0)` 延迟执行数据加载
3. 或者把数据加载放在 App.vue 的 onMounted 中（和 cards.json 一起加载），存到全局 store，FormatLibrary 直接从 store 读取
4. 最简单的方案：在 Pinia store 中新建一个 formatLibrary store，App.vue mounted 时加载数据

## SavLayout 集成

侧边栏已添加"赛制卡组库"导航项，store 的 ActivePanel 已添加 `"formatLibrary"`。

## 相关文件清单

```
src/data/formatLibraryApi.ts          — API 服务（类型 + 加载 + 筛选）
src/data/wc2009Compat.ts              — WC2009 兼容性检查
src/application/components/sav/FormatLibrary.vue — UI 组件（有 BUG）
src/application/store/sav.ts          — ActivePanel 包含 "formatLibrary"
src/application/components/sav/SavLayout.vue — 侧边栏 + 路由
index.html                            — JSONP script 标签
public/fl-formats.json                — 赛制数据
public/fl-decks-slim.json             — 卡组数据（精简）
public/fl-formats.js                  — JSONP 赛制
public/fl-decks.js                    — JSONP 卡组
```

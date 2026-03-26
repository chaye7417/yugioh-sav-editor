# 赛制卡组库（Format Library）集成

## 功能目标

在编辑器中集成 formatlibrary.com 的 12088 个卡组数据，支持：
- 多条件筛选（赛制、来源、名次、排序）
- WC2009 兼容性检查与筛选
- 一键导入到活动卡组/预制卡组

## 当前状态：已修复（2026-03-26）

### 修复的问题

1. **组件白屏** — Vue 2 对 12000+ 条 SlimDeck 对象递归 `Object.defineProperty` 添加响应式，导致浏览器主线程卡死
2. **created() 生命周期时机问题** — `created()` 阶段 `data()` 的响应式属性未完全就绪，改用 `mounted()` 解决
3. **"只看 WC2009 完全兼容" 复选框无效** — 缺少 `@change` 绑定，且兼容度数据仅在点击卡组时计算

### 解决方案

**核心原则：大数据不进 Vue 响应式系统。**

```
模块级变量（不响应式）        Vue data()（响应式）
┌──────────────────────┐    ┌──────────────────────┐
│ rawFormats (122条)    │    │ formatOptions (下拉)  │
│ rawDecks (12000+条)   │    │ pageItems (当前页50条) │
│ filteredDecks (引用)  │    │ selectedDeckId       │
│ compatCache (缓存)    │    │ currentDetail        │
│ slimCompatCache       │    │ compatMap (已查看的)  │
└──────────────────────┘    └──────────────────────┘
```

- `rawFormats` / `rawDecks`：模块级普通变量，从 `window.__FL_FORMATS__` / `window.__FL_DECKS__` 一次性读取
- `filteredDecks`：模块级引用，`filterAndSort()` 返回值直接赋给它
- `pageItems`：每页最多 50 条，手动提取 6 个字段的纯对象，Vue 响应式开销极小
- `slimCompatCache`：模块级缓存，快速判断 SlimDeck 是否全部在 WC2009 卡池中（遍历 `m`/`x`/`s` 的 passcode）
- `compatCache`：模块级缓存，组件销毁重建不丢失

## 数据文件

| 文件 | 大小 | 内容 | 加载方式 |
|------|------|------|----------|
| `public/fl-formats.js` | 44 KB | 122 个赛制 → `window.__FL_FORMATS__` | `<script>` 同步 |
| `public/fl-decks.js` | 11 MB | 12088 个卡组 → `window.__FL_DECKS__` | `<script>` 同步 |
| `public/fl-formats.json` | 44 KB | 同上（JSON 格式备用） | — |
| `public/fl-decks-slim.json` | 11 MB | 同上（JSON 格式备用） | — |

### SlimDeck 精简格式

```json
{
  "id": 2523,
  "n": null,          // name
  "t": "Diva Frog",   // deckTypeName
  "b": "Roghnach",    // builderName
  "f": "Edison",      // formatName
  "p": 1,             // placement
  "r": 3522,          // rating
  "dl": 328,          // downloads
  "e": "RBCT",        // eventAbbreviation
  "m": ["9748752", ...],  // main deck artworkIds（字符串）
  "x": [...],         // extra deck
  "s": [...]          // side deck
}
```

**注意：** `o` (origin) 字段在下载时遗漏，全部缺失。`m`/`x`/`s` 中的 artworkId 是字符串类型。

## 相关文件清单

```
src/data/formatLibraryApi.ts          — 类型定义 + filterAndSort + expandDeck
src/data/wc2009Compat.ts              — WC2009 兼容性检查（checkWc2009Compat）
src/application/components/sav/FormatLibrary.vue — 重写后的 UI 组件
src/application/store/sav.ts          — ActivePanel 包含 "formatLibrary"
src/application/components/sav/SavLayout.vue — 侧边栏 + 路由
index.html                            — JSONP script 标签
public/fl-formats.js                  — JSONP 赛制
public/fl-decks.js                    — JSONP 卡组
```

## 踩坑记录

| 尝试 | 结果 | 原因 |
|------|------|------|
| 把 12000+ SlimDeck 放进 `data()` | 白屏 | Vue 2 递归 defineProperty 卡死 |
| `Object.freeze()` 后放进 `data()` | 仍白屏 | Vue 2 赋值时仍尝试处理 |
| `created()` 中初始化 | 白屏 | data 响应式属性未完全就绪 |
| 模块级变量 + `mounted()` | 成功 | 大数据完全脱离响应式 |

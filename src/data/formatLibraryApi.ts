/**
 * Format Library API 服务模块。
 *
 * 对接 formatlibrary.com 的公开 API，
 * 提供赛制、卡组列表、卡组详情等查询能力。
 */

const API_BASE = "/flapi";

// ============================================================
// 类型定义
// ============================================================

/** 赛制信息 */
export interface FormatInfo {
  id: number;
  name: string;
  date: string;
  banlist: string;
  category: string;
  era: string;
  isPopular: boolean;
}

/** 卡组摘要（列表项） */
export interface DeckSummary {
  id: number;
  name: string | null;
  deckTypeName: string;
  builderName: string;
  formatName: string;
  origin: string;
  placement: number | null;
  rating: number;
  downloads: number;
  eventAbbreviation: string | null;
}

/** 卡组中的单张卡 */
export interface DeckCard {
  name: string;
  artworkId: number;
}

/** 卡组详情（含完整卡表） */
export interface DeckDetail extends DeckSummary {
  ydk: string;
  main: DeckCard[];
  extra: DeckCard[];
  side: DeckCard[];
}

/** 卡组筛选条件 */
export interface DeckFilter {
  formatName?: string;
  origin?: "event" | "user";
  placementMax?: number;
  deckTypeName?: string;
}

/** 卡组排序 */
export interface DeckSort {
  field: "rating" | "downloads" | "publishDate";
  order: "ASC" | "DESC";
}

// ============================================================
// 内部工具
// ============================================================

/**
 * 将 DeckFilter 转成 API filter 查询字符串片段。
 *
 * @param filter - 筛选条件
 * @returns filter 查询参数值，空字符串表示无筛选
 */
function buildFilterString(filter: DeckFilter): string {
  const parts: string[] = [];

  if (filter.formatName) {
    parts.push(`formatName:eq:${filter.formatName}`);
  }
  if (filter.origin) {
    parts.push(`origin:eq:${filter.origin}`);
  }
  if (filter.placementMax && filter.placementMax > 0) {
    const values = Array.from(
      { length: filter.placementMax },
      (_, i) => String(i + 1)
    ).join(";");
    parts.push(`placement:or:arr(${values})`);
  }
  if (filter.deckTypeName) {
    parts.push(`deckTypeName:eq:${filter.deckTypeName}`);
  }

  return parts.join(",");
}

/**
 * 构建完整的查询 URL。
 *
 * @param path - API 路径（不含基地址）
 * @param params - 查询参数
 * @returns 完整 URL
 */
function buildUrl(path: string, params: Record<string, string>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v) parts.push(`${k}=${v}`);
  }
  const qs = parts.length > 0 ? `?${parts.join("&")}` : "";
  return `${API_BASE}${path}${qs}`;
}

// ============================================================
// 缓存
// ============================================================

let formatsCache: FormatInfo[] | null = null;
const deckDetailCache = new Map<number, DeckDetail>();

// ============================================================
// 公开 API 函数
// ============================================================

/**
 * 获取所有赛制列表。
 * 结果缓存到内存，只请求一次。
 *
 * @returns 赛制信息数组
 */
export async function fetchFormats(): Promise<FormatInfo[]> {
  if (formatsCache) return formatsCache;

  const resp = await fetch(`${API_BASE}/formats`);
  if (!resp.ok) {
    throw new Error(`获取赛制列表失败: ${resp.status}`);
  }
  const data: FormatInfo[] = await resp.json();
  formatsCache = data;
  return data;
}

/**
 * 获取卡组列表（带筛选和排序）。
 *
 * @param filter - 筛选条件
 * @param sort - 排序方式
 * @param limit - 每页数量
 * @param page - 页码（从 1 开始）
 * @returns 卡组摘要数组
 */
export async function fetchDecks(
  filter: DeckFilter,
  sort: DeckSort,
  limit: number,
  page: number
): Promise<DeckSummary[]> {
  const filterStr = buildFilterString(filter);
  const sortStr = `${sort.field}:${sort.order}`;

  const url = buildUrl("/decks", {
    filter: filterStr,
    sort: sortStr,
    limit: String(limit),
    page: String(page),
  });

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`获取卡组列表失败: ${resp.status}`);
  }
  return resp.json();
}

/**
 * 获取符合筛选条件的卡组总数。
 *
 * @param filter - 筛选条件
 * @returns 卡组数量
 */
export async function fetchDeckCount(filter: DeckFilter): Promise<number> {
  const filterStr = buildFilterString(filter);

  const url = buildUrl("/decks/count", {
    filter: filterStr,
  });

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`获取卡组数量失败: ${resp.status}`);
  }
  return resp.json();
}

/**
 * 获取单个卡组详情。
 * 结果缓存到内存，避免重复请求。
 *
 * @param id - 卡组 ID
 * @returns 卡组详情
 */
export async function fetchDeckDetail(id: number): Promise<DeckDetail> {
  const cached = deckDetailCache.get(id);
  if (cached) return cached;

  const resp = await fetch(`${API_BASE}/decks/${id}`);
  if (!resp.ok) {
    throw new Error(`获取卡组详情失败: ${resp.status}`);
  }
  const data: DeckDetail = await resp.json();
  deckDetailCache.set(id, data);
  return data;
}

/**
 * 清除所有缓存（用于测试或刷新）。
 */
export function clearCache(): void {
  formatsCache = null;
  deckDetailCache.clear();
}

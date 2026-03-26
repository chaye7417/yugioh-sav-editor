/**
 * Format Library 本地数据服务模块。
 *
 * 从 public/ 目录下的 JSON 文件加载赛制和卡组数据，
 * 所有筛选、排序、分页都在前端完成。
 */

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

/** 卡组中的单张卡 */
export interface DeckCard {
	name: string;
	artworkId: number;
}

/** 卡组详情（本地数据已包含完整信息） */
export interface DeckDetail {
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
// 缓存
// ============================================================

let formatsData: FormatInfo[] | null = null;
let decksData: DeckDetail[] | null = null;

// ============================================================
// 数据加载
// ============================================================

/**
 * 加载赛制列表（44KB，首次请求后缓存）。
 *
 * @returns 赛制信息数组
 */
export async function loadFormats(): Promise<FormatInfo[]> {
	if (formatsData) return formatsData;
	const resp = await fetch("/fl-formats.json");
	if (!resp.ok) {
		throw new Error(`加载赛制数据失败: ${resp.status}`);
	}
	formatsData = await resp.json();
	return formatsData!;
}

/**
 * 加载全部卡组数据（约 56MB，首次请求后缓存）。
 * 因为文件较大，调用方应在加载时显示 loading 提示。
 *
 * @returns 卡组详情数组
 */
export async function loadAllDecks(): Promise<DeckDetail[]> {
	if (decksData) return decksData;
	const resp = await fetch("/fl-decks.json");
	if (!resp.ok) {
		throw new Error(`加载卡组数据失败: ${resp.status}`);
	}
	decksData = await resp.json();
	return decksData!;
}

/**
 * 检查卡组数据是否已加载到内存。
 *
 * @returns 是否已缓存
 */
export function isDecksLoaded(): boolean {
	return decksData !== null;
}

// ============================================================
// 前端筛选 / 排序 / 分页
// ============================================================

/**
 * 对全量卡组数据进行筛选、排序、分页。
 *
 * @param allDecks - 全量卡组数组
 * @param filter - 筛选条件
 * @param sort - 排序方式
 * @param page - 页码（从 1 开始）
 * @param pageSize - 每页数量
 * @returns 筛选后的结果和总数
 */
export function filterAndPageDecks(
	allDecks: DeckDetail[],
	filter: DeckFilter,
	sort: DeckSort,
	page: number,
	pageSize: number
): { items: DeckDetail[]; total: number } {
	let result = allDecks;

	// 筛选
	if (filter.formatName) {
		result = result.filter((d) => d.formatName === filter.formatName);
	}
	if (filter.origin) {
		result = result.filter((d) => d.origin === filter.origin);
	}
	if (filter.placementMax && filter.placementMax > 0) {
		result = result.filter(
			(d) =>
				d.placement != null &&
				d.placement >= 1 &&
				d.placement <= filter.placementMax!
		);
	}
	if (filter.deckTypeName) {
		result = result.filter((d) => d.deckTypeName === filter.deckTypeName);
	}

	// 排序
	const sortField = sort.field === "publishDate" ? "id" : sort.field;
	result = [...result].sort((a, b) => {
		const va = (a as Record<string, unknown>)[sortField] ?? 0;
		const vb = (b as Record<string, unknown>)[sortField] ?? 0;
		if (sort.order === "DESC") {
			return (vb as number) - (va as number);
		}
		return (va as number) - (vb as number);
	});

	const total = result.length;

	// 分页
	const start = (page - 1) * pageSize;
	const items = result.slice(start, start + pageSize);

	return { items, total };
}

/**
 * 清除所有缓存（用于测试或刷新）。
 */
export function clearCache(): void {
	formatsData = null;
	decksData = null;
}

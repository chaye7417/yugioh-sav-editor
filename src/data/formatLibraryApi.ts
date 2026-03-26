/**
 * Format Library 本地数据服务模块。
 *
 * 从 public/ 目录异步加载 JSON 数据，前端筛选/排序/分页。
 * 使用 slim 格式直接操作，避免 12000+ 条全量展开的性能问题。
 */

// ============================================================
// 类型定义
// ============================================================

export interface FormatInfo {
	id: number;
	name: string;
	date: string;
	banlist: string;
	category: string;
	era: string;
	isPopular: boolean;
}

export interface DeckCard {
	name: string;
	artworkId: number;
}

/** slim 格式的卡组（直接来自 JSON，列表用） */
export interface SlimDeck {
	id: number;
	n: string | null;
	t: string;
	b: string;
	f: string;
	o?: string;
	p: number | null;
	r: number;
	dl: number;
	e: string | null;
	m: (number | string)[];
	x: (number | string)[];
	s: (number | string)[];
}

/** 展开后的卡组详情（点击时按需生成） */
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
	main: DeckCard[];
	extra: DeckCard[];
	side: DeckCard[];
}

export interface DeckFilter {
	formatName?: string;
	origin?: "event" | "user";
	placementMax?: number;
}

export interface DeckSort {
	field: "rating" | "downloads" | "publishDate";
	order: "ASC" | "DESC";
}

// ============================================================
// 异步加载（直接返回 slim 格式，不做转换）
// ============================================================

export async function loadFormats(): Promise<FormatInfo[]> {
	const r = await fetch("/fl-formats.json");
	return r.json();
}

export async function loadAllDecks(): Promise<SlimDeck[]> {
	const r = await fetch("/fl-decks-slim.json");
	return r.json();
}

// ============================================================
// 按需展开单个卡组
// ============================================================

function toNum(v: number | string): number {
	return typeof v === "string" ? Number(v) : v;
}

export function expandDeck(s: SlimDeck): DeckDetail {
	return {
		id: s.id,
		name: s.n,
		deckTypeName: s.t,
		builderName: s.b,
		formatName: s.f,
		origin: s.o ?? "unknown",
		placement: s.p,
		rating: s.r,
		downloads: s.dl,
		eventAbbreviation: s.e,
		main: s.m.map((a) => ({ name: "", artworkId: toNum(a) })),
		extra: s.x.map((a) => ({ name: "", artworkId: toNum(a) })),
		side: s.s.map((a) => ({ name: "", artworkId: toNum(a) })),
	};
}

// ============================================================
// 前端筛选（直接操作 slim 格式）
// ============================================================

export function filterAndSort(
	decks: SlimDeck[],
	filter: DeckFilter,
	sort: DeckSort,
): SlimDeck[] {
	let result = decks;
	if (filter.formatName) result = result.filter((d) => d.f === filter.formatName);
	if (filter.origin) {
		// o 字段在数据中缺失，用 e (eventAbbreviation) 推断：有比赛缩写 → event，否则 → user
		result = result.filter((d) => {
			const origin = d.o ?? (d.e ? "event" : "user");
			return origin === filter.origin;
		});
	}
	if (filter.placementMax && filter.placementMax > 0) {
		result = result.filter(
			(d) => d.p != null && d.p >= 1 && d.p <= filter.placementMax!,
		);
	}
	const sf =
		sort.field === "rating" ? "r" : sort.field === "downloads" ? "dl" : "id";
	return [...result].sort((a, b) => {
		const va = (a as any)[sf] ?? 0;
		const vb = (b as any)[sf] ?? 0;
		return sort.order === "DESC" ? vb - va : va - vb;
	});
}

/**
 * Format Library 本地数据服务模块。
 *
 * 从 public/ 目录异步加载 JSON 数据，前端筛选/排序/分页。
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
// 异步加载
// ============================================================

interface SlimDeck {
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

function toNum(v: number | string): number {
	return typeof v === "string" ? Number(v) : v;
}

function expandSlim(s: SlimDeck): DeckDetail {
	return {
		id: s.id, name: s.n, deckTypeName: s.t, builderName: s.b,
		formatName: s.f, origin: s.o ?? "unknown", placement: s.p,
		rating: s.r, downloads: s.dl, eventAbbreviation: s.e,
		main: s.m.map(a => ({ name: "", artworkId: toNum(a) })),
		extra: s.x.map(a => ({ name: "", artworkId: toNum(a) })),
		side: s.s.map(a => ({ name: "", artworkId: toNum(a) })),
	};
}

export async function loadFormats(): Promise<FormatInfo[]> {
	const r = await fetch("/fl-formats.json");
	return r.json();
}

export async function loadAllDecks(): Promise<DeckDetail[]> {
	const r = await fetch("/fl-decks-slim.json");
	const raw: SlimDeck[] = await r.json();
	return raw.map(expandSlim);
}

// ============================================================
// 前端筛选
// ============================================================

export function filterAndSort(
	decks: DeckDetail[],
	filter: DeckFilter,
	sort: DeckSort,
): DeckDetail[] {
	let result = decks;
	if (filter.formatName) result = result.filter(d => d.formatName === filter.formatName);
	if (filter.origin) result = result.filter(d => d.origin === filter.origin);
	if (filter.placementMax && filter.placementMax > 0) {
		result = result.filter(d => d.placement != null && d.placement >= 1 && d.placement <= filter.placementMax!);
	}
	const sf = sort.field === "publishDate" ? "id" : sort.field;
	return [...result].sort((a, b) => {
		const va = (a as any)[sf] ?? 0;
		const vb = (b as any)[sf] ?? 0;
		return sort.order === "DESC" ? vb - va : va - vb;
	});
}

<template>
	<div class="format-library">
		<!-- 标题 -->
		<div class="format-library__header">
			<h3 class="format-library__title">赛制卡组库</h3>
			<span class="format-library__subtitle">formatlibrary.com | {{ statusText }}</span>
		</div>

		<!-- 筛选区 -->
		<div class="format-library__filters">
			<div class="format-library__filter-row">
				<select
					v-model="selectedFormat"
					class="form-control form-control-sm format-library__select"
					@change="applyFilter"
				>
					<option value="">全部赛制</option>
					<option
						v-for="fmt in formatOptions"
						:key="fmt.value"
						:value="fmt.value"
					>
						{{ fmt.label }}
					</option>
				</select>

				<select
					v-model="selectedOrigin"
					class="form-control form-control-sm format-library__select"
					@change="applyFilter"
				>
					<option value="">全部来源</option>
					<option value="event">比赛卡组</option>
					<option value="user">用户卡组</option>
				</select>

				<select
					v-model="selectedPlacement"
					class="form-control form-control-sm format-library__select"
					@change="applyFilter"
				>
					<option :value="0">全部名次</option>
					<option :value="1">冠军</option>
					<option :value="3">前 3</option>
					<option :value="8">前 8</option>
				</select>

				<select
					v-model="selectedSort"
					class="form-control form-control-sm format-library__select"
					@change="applyFilter"
				>
					<option value="rating:DESC">评分最高</option>
					<option value="downloads:DESC">下载最多</option>
					<option value="publishDate:DESC">最新</option>
				</select>
			</div>

			<label class="format-library__checkbox">
				<input
					v-model="onlyCompatible"
					type="checkbox"
					@change="applyFilter"
				/>
				只看 WC2009 完全兼容
			</label>
		</div>

		<!-- 卡组列表 -->
		<div class="format-library__list-section">
			<div v-if="errorMsg" class="format-library__error">
				{{ errorMsg }}
			</div>

			<div v-else-if="pageItems.length === 0" class="format-library__empty">
				没有找到符合条件的卡组
			</div>

			<div v-else class="format-library__list">
				<div
					v-for="deck in pageItems"
					:key="deck.id"
					class="format-library__deck-item"
					:class="{ 'format-library__deck-item--active': selectedDeckId === deck.id }"
					@click="selectDeck(deck.id)"
				>
					<div class="format-library__deck-row1">
						<span class="format-library__deck-type">{{ deck.t || '未知类型' }}</span>
						<span class="format-library__deck-format">{{ deck.f }}</span>
						<span v-if="deck.p" class="format-library__deck-placement">
							{{ placementLabel(deck.p) }}
						</span>
					</div>
					<div class="format-library__deck-row2">
						<span class="format-library__deck-builder">by {{ deck.b || '匿名' }}</span>
						<span class="format-library__deck-stats">
							<span class="format-library__deck-rating" title="评分">{{ deck.r }}</span>
							<span class="format-library__deck-downloads" title="下载量">{{ deck.dl }}</span>
						</span>
					</div>
					<div
						v-if="compatMap[deck.id]"
						class="format-library__deck-compat"
						:class="{
							'format-library__deck-compat--full': compatMap[deck.id].isFullyCompatible,
							'format-library__deck-compat--partial': !compatMap[deck.id].isFullyCompatible,
						}"
					>
						WC2009: {{ compatMap[deck.id].compatibleCards }}/{{ compatMap[deck.id].totalCards }}
						<template v-if="compatMap[deck.id].isFullyCompatible">&#x2705;</template>
						<template v-else>
							&#x26A0;&#xFE0F; ({{ compatMap[deck.id].incompatibleCards.length }}张不在卡池)
						</template>
					</div>
				</div>

				<div v-if="hasMore" class="format-library__load-more">
					<button
						class="btn btn-sm btn-outline-primary"
						@click="loadMore"
					>
						加载更多
					</button>
				</div>
			</div>
		</div>

		<!-- 卡组详情 -->
		<div v-if="currentDetail" class="format-library__detail-section">
			<div class="format-library__detail-header">
				<div class="format-library__detail-info">
					<strong>{{ currentDetail.deckTypeName || currentDetail.name || '卡组' }}</strong>
					<span>赛制：{{ currentDetail.formatName }}</span>
					<span v-if="currentDetail.placement">
						名次：{{ placementLabel(currentDetail.placement) }}
					</span>
				</div>
				<div v-if="currentCompat" class="format-library__detail-compat">
					<span
						class="format-library__compat-badge"
						:class="{
							'format-library__compat-badge--full': currentCompat.isFullyCompatible,
							'format-library__compat-badge--partial': !currentCompat.isFullyCompatible,
						}"
					>
						兼容度 {{ currentCompat.percentage }}%
						({{ currentCompat.compatibleCards }}/{{ currentCompat.totalCards }})
					</span>
				</div>
			</div>

			<!-- 主卡组 -->
			<div class="format-library__card-section">
				<h4 class="format-library__card-section-title format-library__card-section-title--main">
					主卡组 ({{ currentDetail.main.length }})
				</h4>
				<div class="format-library__card-grid">
					<div
						v-for="(card, idx) in currentDetail.main"
						:key="'m' + idx"
						class="format-library__card-cell"
						:class="{ 'format-library__card-cell--incompatible': !isCardCompatible(card.artworkId) }"
						:title="isCardCompatible(card.artworkId) ? '' : '不在 WC2009 卡池'"
					>
						<img
							:src="cardImgUrl(card.artworkId)"
							class="format-library__card-img"
							loading="lazy"
						/>
						<div v-if="!isCardCompatible(card.artworkId)" class="format-library__card-overlay"></div>
					</div>
				</div>
			</div>

			<!-- 额外卡组 -->
			<div v-if="currentDetail.extra.length > 0" class="format-library__card-section">
				<h4 class="format-library__card-section-title format-library__card-section-title--extra">
					额外卡组 ({{ currentDetail.extra.length }})
				</h4>
				<div class="format-library__card-grid">
					<div
						v-for="(card, idx) in currentDetail.extra"
						:key="'x' + idx"
						class="format-library__card-cell"
						:class="{ 'format-library__card-cell--incompatible': !isCardCompatible(card.artworkId) }"
					>
						<img
							:src="cardImgUrl(card.artworkId)"
							class="format-library__card-img"
							loading="lazy"
						/>
						<div v-if="!isCardCompatible(card.artworkId)" class="format-library__card-overlay"></div>
					</div>
				</div>
			</div>

			<!-- 副卡组 -->
			<div v-if="currentDetail.side.length > 0" class="format-library__card-section">
				<h4 class="format-library__card-section-title format-library__card-section-title--side">
					副卡组 ({{ currentDetail.side.length }})
				</h4>
				<div class="format-library__card-grid">
					<div
						v-for="(card, idx) in currentDetail.side"
						:key="'s' + idx"
						class="format-library__card-cell"
						:class="{ 'format-library__card-cell--incompatible': !isCardCompatible(card.artworkId) }"
					>
						<img
							:src="cardImgUrl(card.artworkId)"
							class="format-library__card-img"
							loading="lazy"
						/>
						<div v-if="!isCardCompatible(card.artworkId)" class="format-library__card-overlay"></div>
					</div>
				</div>
			</div>

			<!-- 导入按钮 -->
			<div class="format-library__import-actions">
				<button
					class="btn btn-sm btn-primary"
					:disabled="!savStore.isLoaded"
					@click="importToActiveDeck"
				>
					导入到活动卡组
				</button>
				<button
					class="btn btn-sm btn-outline-primary"
					:disabled="!savStore.isLoaded"
					@click="importToRecipe"
				>
					导入到预制卡组 #{{ savStore.activeRecipeSlot + 1 }}
				</button>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useSavStore } from "@/application/store/sav";
import { cardDatabase } from "@/data/cardDatabase";
import {
	filterAndSort,
	expandDeck,
	type FormatInfo,
	type SlimDeck,
	type DeckDetail,
	type DeckSort,
	type DeckFilter,
} from "@/data/formatLibraryApi";
import { checkWc2009Compat, type CompatResult } from "@/data/wc2009Compat";

const CARD_IMG_BASE = "https://cdn.233.momobako.com/ygopro/pics/";
const PAGE_SIZE = 50;
const EXTRA_DECK_TYPE_MASK = 0x40 | 0x2000 | 0x800000 | 0x4000000;

// ============================================================
// 模块级变量 —— 完全不经过 Vue 响应式系统
// ============================================================

/** 从 window.__FL_FORMATS__ 读取的赛制列表（只读） */
let rawFormats: FormatInfo[] = [];

/** 从 window.__FL_DECKS__ 读取的全量卡组（只读，12000+ 条） */
let rawDecks: SlimDeck[] = [];

/** 当前筛选+排序后的结果引用（不复制，只引用） */
let filteredDecks: SlimDeck[] = [];

/** 兼容度缓存（模块级，不丢失） */
const compatCache: Record<number, CompatResult> = {};

/** 是否已从 window 读取过数据 */
let dataReady = false;

function ensureData(): void {
	if (dataReady) return;
	const w = window as any;
	rawFormats = w.__FL_FORMATS__ || [];
	rawDecks = w.__FL_DECKS__ || [];
	filteredDecks = rawDecks;
	dataReady = true;
}

/** 快速检查一个 SlimDeck 的所有卡是否都在 WC2009 卡池中 */
function isSlimDeckCompatible(d: SlimDeck): boolean {
	const allCards = [...d.m, ...d.x, ...d.s];
	for (const c of allCards) {
		if (!cardDatabase.getCidByPasscode(String(c))) return false;
	}
	return true;
}

/** SlimDeck 兼容性缓存（deck.id → boolean），避免重复计算 */
const slimCompatCache: Record<number, boolean> = {};

export default defineComponent({
	name: "FormatLibrary",

	data() {
		let fmtOptions: Array<{ value: string; label: string }> = [];
		let status = "";
		let initError = "";

		try {
			ensureData();
			fmtOptions = rawFormats.map((f) => ({
				value: f.name,
				label: `${f.name} (${(f.date || "").slice(0, 4)})`,
			}));
			status = `${rawFormats.length} 赛制 | ${rawDecks.length} 卡组`;
		} catch (e: any) {
			initError = "data() 初始化错误: " + (e?.message || e);
			console.error("[FormatLibrary] data() error:", e);
		}

		return {
			formatOptions: fmtOptions,
			statusText: status,
			errorMsg: initError,

			selectedFormat: "",
			selectedOrigin: "",
			selectedPlacement: 0,
			selectedSort: "rating:DESC",
			onlyCompatible: false,

			pageItems: [] as Array<{ id: number; t: string; b: string; f: string; p: number | null; r: number; dl: number }>,
			pageEnd: 0,
			totalFiltered: 0,
			hasMore: false,

			selectedDeckId: null as number | null,
			currentDetail: null as DeckDetail | null,
			compatMap: {} as Record<number, CompatResult>,
		};
	},

	computed: {
		savStore() {
			return useSavStore();
		},
		currentCompat(): CompatResult | null {
			if (!this.selectedDeckId) return null;
			return this.compatMap[this.selectedDeckId] ?? null;
		},
	},

	mounted() {
		// 用 mounted 代替 created，确保 DOM 和 data 都就绪
		try {
			if (!this.errorMsg) {
				this.applyFilter();
			}
		} catch (e: any) {
			this.errorMsg = "mounted() 错误: " + (e?.message || e);
			console.error("[FormatLibrary] mounted() error:", e);
		}
	},

	methods: {
		/** 执行筛选+排序，重置到第一页 */
		applyFilter(): void {
			try {
				const filter: DeckFilter = {};
				if (this.selectedFormat) filter.formatName = this.selectedFormat;
				if (this.selectedOrigin) filter.origin = this.selectedOrigin as "event" | "user";
				if (this.selectedPlacement > 0) filter.placementMax = this.selectedPlacement;

				const sortStr = this.selectedSort || "rating:DESC";
				const [sortField, sortOrder] = sortStr.split(":") as [DeckSort["field"], DeckSort["order"]];
				let result = filterAndSort(rawDecks, filter, { field: sortField, order: sortOrder });

				// 只看 WC2009 完全兼容
				if (this.onlyCompatible) {
					result = result.filter((d) => {
						if (!(d.id in slimCompatCache)) {
							slimCompatCache[d.id] = isSlimDeckCompatible(d);
						}
						return slimCompatCache[d.id];
					});
				}

				filteredDecks = result;
				this.totalFiltered = filteredDecks.length;
				this.pageEnd = 0;
				this.selectedDeckId = null;
				this.currentDetail = null;
				this.errorMsg = "";
				this.showPage(true);
			} catch (e) {
				this.errorMsg = e instanceof Error ? e.message : "筛选失败";
			}
		},

		/** 从 filteredDecks 取下一页数据，转为轻量纯对象放进 pageItems */
		showPage(reset: boolean): void {
			if (reset) {
				this.pageEnd = 0;
				this.pageItems = [];
			}
			const start = this.pageEnd;
			const end = Math.min(start + PAGE_SIZE, filteredDecks.length);

			const newItems: typeof this.pageItems = [];
			for (let i = start; i < end; i++) {
				const d = filteredDecks[i];
				// 只提取模板需要的字段，生成纯对象
				newItems.push({ id: d.id, t: d.t, b: d.b, f: d.f, p: d.p, r: d.r, dl: d.dl });
			}

			if (reset) {
				this.pageItems = newItems;
			} else {
				this.pageItems = [...this.pageItems, ...newItems];
			}
			this.pageEnd = end;
			this.hasMore = end < filteredDecks.length;
		},

		loadMore(): void {
			this.showPage(false);
		},

		/** 选中/取消选中卡组 */
		selectDeck(deckId: number): void {
			if (this.selectedDeckId === deckId) {
				this.selectedDeckId = null;
				this.currentDetail = null;
				return;
			}

			this.selectedDeckId = deckId;

			// 从模块级 rawDecks 查找原始数据
			const slim = rawDecks.find((d) => d.id === deckId);
			if (!slim) {
				this.currentDetail = null;
				return;
			}

			const detail = expandDeck(slim);
			this.currentDetail = detail;

			// 计算兼容度
			if (!compatCache[deckId]) {
				const allCards = [...detail.main, ...detail.extra, ...detail.side];
				compatCache[deckId] = checkWc2009Compat(allCards);
			}
			// 复制到响应式 compatMap 以触发视图更新
			this.compatMap = { ...this.compatMap, [deckId]: compatCache[deckId] };
		},

		placementLabel(p: number): string {
			if (p === 1) return "1st";
			if (p === 2) return "2nd";
			if (p === 3) return "3rd";
			return `${p}th`;
		},

		cardImgUrl(passcode: number): string {
			return `${CARD_IMG_BASE}${passcode}.jpg`;
		},

		isCardCompatible(artworkId: number): boolean {
			return cardDatabase.getCidByPasscode(String(artworkId)) !== undefined;
		},

		/** artworkId 数组 → WC2009 CID 数组 */
		convertToCids(cards: { name: string; artworkId: number }[]): [number[], number] {
			const cids: number[] = [];
			let skipped = 0;
			for (const card of cards) {
				const cidStr = cardDatabase.getCidByPasscode(String(card.artworkId));
				if (cidStr) {
					cids.push(Number(cidStr));
				} else {
					skipped++;
				}
			}
			return [cids, skipped];
		},

		isExtraDeckCard(cid: number): boolean {
			const card = cardDatabase.getByCid(String(cid));
			if (!card) return false;
			return (card.type & EXTRA_DECK_TYPE_MASK) !== 0;
		},

		/** 分离主卡组中混入的额外卡组类型 */
		splitMainExtra(mainCids: number[]): { realMain: number[]; extraFromMain: number[] } {
			const realMain: number[] = [];
			const extraFromMain: number[] = [];
			for (const cid of mainCids) {
				if (this.isExtraDeckCard(cid)) {
					extraFromMain.push(cid);
				} else {
					realMain.push(cid);
				}
			}
			return { realMain, extraFromMain };
		},

		importToActiveDeck(): void {
			if (!this.currentDetail || !this.savStore.isLoaded) return;

			const [mainCids, ms] = this.convertToCids(this.currentDetail.main);
			const [extraCids, es] = this.convertToCids(this.currentDetail.extra);
			const [sideCids, ss] = this.convertToCids(this.currentDetail.side);

			const { realMain, extraFromMain } = this.splitMainExtra(mainCids);
			const finalExtra = [...extraCids, ...extraFromMain];

			this.savStore.updateActiveDeck({
				name: this.currentDetail.deckTypeName || this.currentDetail.name || "Imported",
				mainCount: realMain.length,
				sideCount: sideCids.length,
				extraCount: finalExtra.length,
				mainCids: realMain.slice(0, 60),
				sideCids: sideCids.slice(0, 15),
				extraCids: finalExtra.slice(0, 15),
			});

			const totalSkipped = ms + es + ss;
			alert(totalSkipped > 0
				? `已导入到活动卡组。跳过了 ${totalSkipped} 张不在 WC2009 卡池的卡。`
				: "已导入到活动卡组。");
		},

		importToRecipe(): void {
			if (!this.currentDetail || !this.savStore.isLoaded) return;

			const [mainCids, ms] = this.convertToCids(this.currentDetail.main);
			const [extraCids, es] = this.convertToCids(this.currentDetail.extra);
			const [sideCids, ss] = this.convertToCids(this.currentDetail.side);

			const { realMain, extraFromMain } = this.splitMainExtra(mainCids);
			const finalExtra = [...extraCids, ...extraFromMain];
			const slot = this.savStore.activeRecipeSlot;

			this.savStore.updateRecipe(slot, {
				name: (this.currentDetail.deckTypeName || this.currentDetail.name || "Imported").slice(0, 22),
				mainCids: realMain.slice(0, 60),
				sideCids: sideCids.slice(0, 15),
				extraCids: finalExtra.slice(0, 15),
			});

			const totalSkipped = ms + es + ss;
			alert(totalSkipped > 0
				? `已导入到预制卡组 #${slot + 1}。跳过了 ${totalSkipped} 张不在 WC2009 卡池的卡。`
				: `已导入到预制卡组 #${slot + 1}。`);
		},
	},
});
</script>

<style lang="scss" scoped>
.format-library {
	display: flex;
	flex-direction: column;
	height: 100%;
	padding: 0.75rem;
	overflow: hidden;

	&__header {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		flex-shrink: 0;
	}

	&__title {
		font-size: 1.1rem;
		font-weight: 700;
		margin: 0;
		color: #2c3e50;
	}

	&__subtitle {
		font-size: 0.75rem;
		color: #999;
	}

	&__filters {
		flex-shrink: 0;
		margin-bottom: 0.75rem;
	}

	&__filter-row {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
		margin-bottom: 0.4rem;
	}

	&__select {
		font-size: 0.8rem;
		padding: 0.25rem 0.4rem;
		flex: 1;
		min-width: 100px;
	}

	&__checkbox {
		font-size: 0.8rem;
		color: #555;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.3rem;

		input { cursor: pointer; }
	}

	&__list-section {
		flex: 1;
		overflow-y: auto;
		border: 1px solid #e0e0e0;
		border-radius: 6px;
		background: #fafafa;
		min-height: 150px;
	}

	&__list {
		padding: 0.4rem;
	}

	&__deck-item {
		padding: 0.5rem 0.6rem;
		margin-bottom: 0.3rem;
		border-radius: 5px;
		background: #fff;
		border: 1px solid #eee;
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s;

		&:hover {
			background: #f0f6ff;
			border-color: #c8ddf5;
		}

		&--active {
			background: #e8f0fe;
			border-color: #3f88c5;
		}
	}

	&__deck-row1 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
	}

	&__deck-type {
		font-weight: 600;
		color: #2c3e50;
	}

	&__deck-format {
		color: #888;
		font-size: 0.75rem;
	}

	&__deck-placement {
		margin-left: auto;
		font-size: 0.75rem;
		font-weight: 600;
		color: #d4a017;
	}

	&__deck-row2 {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.75rem;
		color: #888;
		margin-top: 0.15rem;
	}

	&__deck-builder { color: #666; }

	&__deck-stats {
		display: flex;
		gap: 0.6rem;
	}

	&__deck-rating::before { content: "\2B50 "; }
	&__deck-downloads::before { content: "\1F4E5 "; }

	&__deck-compat {
		font-size: 0.72rem;
		margin-top: 0.2rem;

		&--full { color: #27ae60; }
		&--partial { color: #e67e22; }
	}

	&__load-more {
		text-align: center;
		padding: 0.5rem;
	}

	&__detail-section {
		flex-shrink: 0;
		margin-top: 0.75rem;
		border: 1px solid #e0e0e0;
		border-radius: 6px;
		padding: 0.6rem;
		background: #fff;
		max-height: 50%;
		overflow-y: auto;
	}

	&__detail-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	&__detail-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.85rem;
		color: #555;

		strong { color: #2c3e50; }
	}

	&__compat-badge {
		padding: 0.15rem 0.5rem;
		border-radius: 10px;
		font-size: 0.75rem;
		font-weight: 600;

		&--full { background: #e6f9ee; color: #27ae60; }
		&--partial { background: #fef3e0; color: #e67e22; }
	}

	&__card-section {
		margin-bottom: 0.6rem;
	}

	&__card-section-title {
		font-size: 0.8rem;
		font-weight: 600;
		margin: 0 0 0.3rem;
		padding: 0.2rem 0.4rem;
		border-radius: 3px;
		color: #fff;

		&--main { background: #9f653d; }
		&--extra { background: #756aaa; }
		&--side { background: #628045; }
	}

	&__card-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 3px;
	}

	&__card-cell {
		position: relative;
		border-radius: 2px;
		overflow: hidden;
		transition: transform 0.1s;

		&:hover {
			transform: scale(1.08);
			z-index: 1;
		}

		&--incompatible {
			border: 2px solid #e74c3c;
			opacity: 0.7;
		}
	}

	&__card-img {
		display: block;
		width: 56px;
		height: 82px;
		object-fit: cover;
	}

	&__card-overlay {
		position: absolute;
		inset: 0;
		background: rgba(231, 76, 60, 0.35);
		pointer-events: none;
	}

	&__import-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	&__loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 2rem;
		color: #999;
		font-size: 0.85rem;
	}

	&__error {
		color: #e74c3c;
		padding: 1rem;
		text-align: center;
		font-size: 0.85rem;
	}

	&__empty {
		color: #999;
		padding: 2rem;
		text-align: center;
		font-size: 0.85rem;
	}
}

@keyframes format-library-spin {
	to { transform: rotate(360deg); }
}
</style>

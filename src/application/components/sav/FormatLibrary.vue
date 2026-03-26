<template>
	<div class="format-library">
		<!-- 左侧：筛选 + 卡组列表 -->
		<div class="format-library__left">
			<div class="format-library__header">
				<h3 class="format-library__title">赛制卡组库</h3>
				<span class="format-library__subtitle">{{ statusText }}</span>
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
						v-model="selectedEra"
						class="form-control form-control-sm format-library__select"
						@change="applyFilter"
					>
						<option
							v-for="opt in eraOptions"
							:key="opt.value"
							:value="opt.value"
						>
							{{ opt.label }}
						</option>
					</select>
				</div>
				<div class="format-library__filter-row">
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
					只看 {{ gameShortName }} 完全兼容
				</label>

				<!-- 批量导入 -->
				<div v-if="checkedIds.length > 0" class="format-library__batch-bar">
					<span>已选 {{ checkedIds.length }} 个卡组</span>
					<button
						class="btn btn-sm btn-primary"
						:disabled="!savStore.isLoaded"
						@click="batchImportToRecipes"
					>
						批量导入到预制卡组（从 #{{ savStore.activeRecipeSlot + 1 }} 开始）
					</button>
					<button class="btn btn-sm btn-outline-secondary" @click="checkedIds = []">
						取消
					</button>
				</div>
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
							<input
								type="checkbox"
								:checked="checkedIds.includes(deck.id)"
								@click.stop="toggleCheck(deck.id)"
								class="format-library__deck-check"
							/>
							<span class="format-library__deck-type">{{ deck.tZh || deck.t || '未知类型' }}</span>
							<span class="format-library__deck-format">{{ deck.fZh || deck.f }}</span>
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
							{{ gameShortName }}: {{ compatMap[deck.id].compatibleCards }}/{{ compatMap[deck.id].totalCards }}
							<template v-if="compatMap[deck.id].isFullyCompatible">&#x2705;</template>
							<template v-else>
								&#x26A0;&#xFE0F; ({{ compatMap[deck.id].incompatibleCards.length }}张不在卡池)
							</template>
						</div>
					</div>

					<div v-if="hasMore" ref="sentinel" class="format-library__sentinel"></div>
				</div>
			</div>
		</div>

		<!-- 右侧：卡组详情 -->
		<div class="format-library__right">
			<div v-if="!currentDetail" class="format-library__placeholder">
				点击左侧卡组查看详情
			</div>

			<template v-else>
				<div class="format-library__detail-header">
					<div class="format-library__detail-info">
						<strong>{{ translateDeckType(currentDetail.deckTypeName) || currentDetail.name || '卡组' }}</strong>
						<span>赛制：{{ translateFormat(currentDetail.formatName) }}</span>
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

				<div class="format-library__detail-body">
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
								@mouseenter="onCardHover(card.artworkId)"
								:title="isCardCompatible(card.artworkId) ? '' : `不在 ${gameShortName} 卡池`"
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
								@mouseenter="onCardHover(card.artworkId)"
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
								@mouseenter="onCardHover(card.artworkId)"
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
			</template>
		</div>

	</div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useSavStore } from "@/application/store/sav";
import { cardDatabase } from "@/data/cardDatabase";
import { useCardHoverStore } from "@/application/store/cardHover";
import { translateFormat, translateDeckType } from "@/data/flI18n";
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

let rawFormats: FormatInfo[] = [];
let rawDecks: SlimDeck[] = [];
let filteredDecks: SlimDeck[] = [];
const compatCache: Record<number, CompatResult> = {};
let dataReady = false;


/** 赛制名 → 年份 */
const formatYearMap: Record<string, number> = {};

function ensureData(): void {
	if (dataReady) return;
	const w = window as any;
	rawFormats = w.__FL_FORMATS__ || [];
	rawDecks = w.__FL_DECKS__ || [];
	filteredDecks = rawDecks;
	// 建赛制→年份映射
	for (const f of rawFormats) {
		formatYearMap[f.name] = Number((f.date || "").slice(0, 4)) || 0;
	}
	dataReady = true;
}

function isSlimDeckCompatible(d: SlimDeck): boolean {
	const allCards = [...d.m, ...d.x, ...d.s];
	for (const c of allCards) {
		if (!cardDatabase.getCidByPasscode(String(c))) return false;
	}
	return true;
}

const slimCompatCache: Record<number, boolean> = {};

export default defineComponent({
	name: "FormatLibrary",

	data() {
		let fmtOptions: Array<{ value: string; label: string }> = [];
		let eraOptions: Array<{ value: string; label: string }> = [{ value: "", label: "全部年份" }];
		let status = "";
		let initError = "";

		try {
			ensureData();
			fmtOptions = rawFormats.map((f) => ({
				value: f.name,
				label: `${translateFormat(f.name)} (${(f.date || "").slice(0, 4)})`,
			}));
			status = `${rawFormats.length} 赛制 | ${rawDecks.length} 卡组`;

			// 构建年代选项
			const years = [...new Set(Object.values(formatYearMap))].filter(y => y > 0).sort();
			eraOptions = [
				{ value: "", label: "全部年份" },
				...years.map(y => ({ value: String(y), label: `${y}年` })),
			];
		} catch (e: any) {
			initError = "data() 初始化错误: " + (e?.message || e);
			console.error("[FormatLibrary] data() error:", e);
		}

		return {
			formatOptions: fmtOptions,
			eraOptions,
			statusText: status,
			errorMsg: initError,

			selectedFormat: "",
			selectedEra: "",
			selectedOrigin: "",
			selectedPlacement: 0,
			selectedSort: "rating:DESC",
			onlyCompatible: false,

			pageItems: [] as Array<{ id: number; t: string; tZh: string; b: string; f: string; fZh: string; p: number | null; r: number; dl: number }>,
			pageEnd: 0,
			totalFiltered: 0,
			hasMore: false,

			selectedDeckId: null as number | null,
			currentDetail: null as DeckDetail | null,
			compatMap: {} as Record<number, CompatResult>,
			checkedIds: [] as number[],
		};
	},

	computed: {
		savStore() {
			return useSavStore();
		},
		gameShortName(): string {
			return this.savStore.gameShortName;
		},
		currentCompat(): CompatResult | null {
			if (!this.selectedDeckId) return null;
			return this.compatMap[this.selectedDeckId] ?? null;
		},
	},

	mounted() {
		try {
			if (!this.errorMsg) {
				this.applyFilter();
			}
		} catch (e: any) {
			this.errorMsg = "mounted() 错误: " + (e?.message || e);
			console.error("[FormatLibrary] mounted() error:", e);
		}
		this.setupObserver();
	},

	beforeDestroy() {
		if ((this as any)._observer) {
			(this as any)._observer.disconnect();
		}
	},

	methods: {
		applyFilter(): void {
			try {
				const filter: DeckFilter = {};
				if (this.selectedFormat) filter.formatName = this.selectedFormat;
				if (this.selectedOrigin) filter.origin = this.selectedOrigin as "event" | "user";
				if (this.selectedPlacement > 0) filter.placementMax = this.selectedPlacement;

				const sortStr = this.selectedSort || "rating:DESC";
				const [sortField, sortOrder] = sortStr.split(":") as [DeckSort["field"], DeckSort["order"]];
				let result = filterAndSort(rawDecks, filter, { field: sortField, order: sortOrder });

				// 年份筛选
				if (this.selectedEra) {
					const targetYear = Number(this.selectedEra);
					result = result.filter((d) => formatYearMap[d.f] === targetYear);
				}

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
				this.$nextTick(() => this.observeSentinel());
			} catch (e) {
				this.errorMsg = e instanceof Error ? e.message : "筛选失败";
			}
		},

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
				newItems.push({ id: d.id, t: d.t, tZh: translateDeckType(d.t), b: d.b, f: d.f, fZh: translateFormat(d.f), p: d.p, r: d.r, dl: d.dl });
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
			this.$nextTick(() => this.observeSentinel());
		},

		/** 创建 IntersectionObserver */
		setupObserver(): void {
			(this as any)._observer = new IntersectionObserver(
				(entries) => {
					if (entries[0]?.isIntersecting && this.hasMore) {
						this.loadMore();
					}
				},
				{ root: null, rootMargin: "100px", threshold: 0 },
			);
			this.$nextTick(() => this.observeSentinel());
		},

		/** 让 observer 观察当前哨兵元素 */
		observeSentinel(): void {
			const obs = (this as any)._observer as IntersectionObserver | undefined;
			if (!obs) return;
			obs.disconnect();
			const el = this.$refs.sentinel as HTMLElement | undefined;
			if (el) obs.observe(el);
		},

		selectDeck(deckId: number): void {
			if (this.selectedDeckId === deckId) {
				this.selectedDeckId = null;
				this.currentDetail = null;
				return;
			}

			this.selectedDeckId = deckId;

			const slim = rawDecks.find((d) => d.id === deckId);
			if (!slim) {
				this.currentDetail = null;
				return;
			}

			const detail = expandDeck(slim);
			this.currentDetail = detail;

			if (!compatCache[deckId]) {
				const allCards = [...detail.main, ...detail.extra, ...detail.side];
				compatCache[deckId] = checkWc2009Compat(allCards);
			}
			this.compatMap = { ...this.compatMap, [deckId]: compatCache[deckId] };
		},

		placementLabel(p: number): string {
			if (p === 1) return "1st";
			if (p === 2) return "2nd";
			if (p === 3) return "3rd";
			return `${p}th`;
		},

		translateFormat,
		translateDeckType,

		cardImgUrl(passcode: number): string {
			return `${CARD_IMG_BASE}${passcode}.jpg`;
		},

		isCardCompatible(artworkId: number): boolean {
			return cardDatabase.getCidByPasscode(String(artworkId)) !== undefined;
		},

		/** 鼠标悬停卡片时通知全局 store */
		onCardHover(artworkId: number): void {
			useCardHoverStore().hover(artworkId);
		},

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

			const mainMax = this.savStore.saveData?.profile?.gdDeckMainMax ?? 60;
			this.savStore.updateActiveDeck({
				name: this.currentDetail.deckTypeName || this.currentDetail.name || "Imported",
				mainCount: realMain.length,
				sideCount: sideCids.length,
				extraCount: finalExtra.length,
				mainCids: realMain.slice(0, mainMax),
				sideCids: sideCids.slice(0, 15),
				extraCids: finalExtra.slice(0, 15),
			});

			const totalSkipped = ms + es + ss;
			alert(totalSkipped > 0
				? `已导入到活动卡组。跳过了 ${totalSkipped} 张不在 ${this.gameShortName} 卡池的卡。`
				: "已导入到活动卡组。");
		},

		toggleCheck(deckId: number): void {
			const idx = this.checkedIds.indexOf(deckId);
			if (idx >= 0) {
				this.checkedIds.splice(idx, 1);
			} else {
				this.checkedIds.push(deckId);
			}
		},

		batchImportToRecipes(): void {
			if (!this.savStore.isLoaded || this.checkedIds.length === 0) return;

			const slotCount = this.savStore.saveData?.profile?.crgySlotCount ?? 50;
			const startSlot = this.savStore.activeRecipeSlot;
			const available = slotCount - startSlot;

			if (this.checkedIds.length > available) {
				alert(`从槽位 #${startSlot + 1} 开始只剩 ${available} 个空位，但选了 ${this.checkedIds.length} 个卡组。`);
				return;
			}

			let imported = 0;
			let totalSkipped = 0;

			for (let i = 0; i < this.checkedIds.length; i++) {
				const deckId = this.checkedIds[i];
				const slim = rawDecks.find((d) => d.id === deckId);
				if (!slim) continue;

				const detail = expandDeck(slim);
				const [mainCids, ms] = this.convertToCids(detail.main);
				const [extraCids, es] = this.convertToCids(detail.extra);
				const [sideCids, ss] = this.convertToCids(detail.side);

				const { realMain, extraFromMain } = this.splitMainExtra(mainCids);
				const finalExtra = [...extraCids, ...extraFromMain];

				const slot = startSlot + i;
				const recipeMainMax = this.savStore.saveData?.profile?.crgyMainMax ?? 60;
				const nameMax = this.savStore.saveData?.profile?.crgyNameSize ?? 23;

				this.savStore.updateRecipe(slot, {
					name: (detail.deckTypeName || detail.name || "Imported").slice(0, nameMax - 1),
					mainCids: realMain.slice(0, recipeMainMax),
					sideCids: sideCids.slice(0, 15),
					extraCids: finalExtra.slice(0, 15),
				});

				imported++;
				totalSkipped += ms + es + ss;
			}

			this.checkedIds = [];
			alert(totalSkipped > 0
				? `已批量导入 ${imported} 个卡组到预制卡组 #${startSlot + 1} ~ #${startSlot + imported}。共跳过 ${totalSkipped} 张不兼容的卡。`
				: `已批量导入 ${imported} 个卡组到预制卡组 #${startSlot + 1} ~ #${startSlot + imported}。`);
		},

		importToRecipe(): void {
			if (!this.currentDetail || !this.savStore.isLoaded) return;

			const [mainCids, ms] = this.convertToCids(this.currentDetail.main);
			const [extraCids, es] = this.convertToCids(this.currentDetail.extra);
			const [sideCids, ss] = this.convertToCids(this.currentDetail.side);

			const { realMain, extraFromMain } = this.splitMainExtra(mainCids);
			const finalExtra = [...extraCids, ...extraFromMain];
			const slot = this.savStore.activeRecipeSlot;

			const recipeMainMax = this.savStore.saveData?.profile?.crgyMainMax ?? 60;
			const nameMax = this.savStore.saveData?.profile?.crgyNameSize ?? 23;
			this.savStore.updateRecipe(slot, {
				name: (this.currentDetail.deckTypeName || this.currentDetail.name || "Imported").slice(0, nameMax - 1),
				mainCids: realMain.slice(0, recipeMainMax),
				sideCids: sideCids.slice(0, 15),
				extraCids: finalExtra.slice(0, 15),
			});

			const totalSkipped = ms + es + ss;
			alert(totalSkipped > 0
				? `已导入到预制卡组 #${slot + 1}。跳过了 ${totalSkipped} 张不在 ${this.gameShortName} 卡池的卡。`
				: `已导入到预制卡组 #${slot + 1}。`);
		},
	},
});
</script>

<style lang="scss" scoped>
.format-library {
	display: flex;
	height: 100%;
	overflow: hidden;

	// ============================
	// 左侧：筛选 + 卡组列表
	// ============================
	&__left {
		width: 320px;
		min-width: 260px;
		display: flex;
		flex-direction: column;
		border-right: 1px solid #e0e0e0;
		padding: 0.75rem;
		overflow: hidden;
	}

	&__header {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		flex-shrink: 0;
	}

	&__title {
		font-size: 1rem;
		font-weight: 700;
		margin: 0;
		color: #2c3e50;
	}

	&__subtitle {
		font-size: 0.7rem;
		color: #999;
	}

	&__filters {
		flex-shrink: 0;
		margin-bottom: 0.5rem;
	}

	&__filter-row {
		display: flex;
		gap: 0.3rem;
		margin-bottom: 0.3rem;
	}

	&__select {
		font-size: 0.75rem;
		padding: 0.2rem 0.3rem;
		flex: 1;
		min-width: 0;
	}

	&__checkbox {
		font-size: 0.75rem;
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
	}

	&__list {
		padding: 0.3rem;
	}

	&__deck-item {
		padding: 0.4rem 0.5rem;
		margin-bottom: 0.2rem;
		border-radius: 4px;
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

	&__batch-bar {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.4rem;
		padding: 0.3rem 0.5rem;
		background: #e8f0fe;
		border-radius: 4px;
		font-size: 0.75rem;
		color: #2c3e50;

		span { font-weight: 600; }
	}

	&__deck-check {
		flex-shrink: 0;
		cursor: pointer;
	}

	&__deck-row1 {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
	}

	&__deck-type {
		font-weight: 600;
		color: #2c3e50;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	&__deck-format {
		color: #888;
		font-size: 0.7rem;
		flex-shrink: 0;
	}

	&__deck-placement {
		margin-left: auto;
		font-size: 0.7rem;
		font-weight: 600;
		color: #d4a017;
		flex-shrink: 0;
	}

	&__deck-row2 {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.7rem;
		color: #888;
		margin-top: 0.1rem;
	}

	&__deck-builder { color: #666; }

	&__deck-stats {
		display: flex;
		gap: 0.5rem;
	}

	&__deck-rating::before { content: "\2B50 "; }
	&__deck-downloads::before { content: "\1F4E5 "; }

	&__deck-compat {
		font-size: 0.68rem;
		margin-top: 0.15rem;

		&--full { color: #27ae60; }
		&--partial { color: #e67e22; }
	}

	&__sentinel {
		height: 1px;
	}

	// ============================
	// 右侧：卡组详情
	// ============================
	&__right {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		padding: 0.75rem;
	}

	&__placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: #bbb;
		font-size: 0.9rem;
	}

	&__detail-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.6rem;
		flex-shrink: 0;
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
		white-space: nowrap;

		&--full { background: #e6f9ee; color: #27ae60; }
		&--partial { background: #fef3e0; color: #e67e22; }
	}

	&__detail-body {
		flex: 1;
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
		margin-top: 0.75rem;
		flex-shrink: 0;
	}

	// ============================
	// 通用状态
	// ============================
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
</style>

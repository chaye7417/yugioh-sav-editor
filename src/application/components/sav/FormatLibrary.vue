<template>
	<div class="format-library">
		<!-- 标题 -->
		<div class="format-library__header">
			<h3 class="format-library__title">赛制卡组库</h3>
			<span class="format-library__subtitle">formatlibrary.com | {{ debugInfo }}</span>
		</div>

		<!-- 筛选区 -->
		<div class="format-library__filters">
			<div class="format-library__filter-row">
				<select
					v-model="selectedFormat"
					class="form-control form-control-sm format-library__select"
					@change="onFilterChange"
				>
					<option value="">全部赛制</option>
					<option
						v-for="fmt in formats"
						:key="fmt.id"
						:value="fmt.name"
					>
						{{ fmt.name }} ({{ fmt.date.slice(0, 4) }})
					</option>
				</select>

				<select
					v-model="selectedOrigin"
					class="form-control form-control-sm format-library__select"
					@change="onFilterChange"
				>
					<option value="">全部来源</option>
					<option value="event">比赛卡组</option>
					<option value="user">用户卡组</option>
				</select>

				<select
					v-model="selectedPlacement"
					class="form-control form-control-sm format-library__select"
					@change="onFilterChange"
				>
					<option :value="0">全部名次</option>
					<option :value="1">冠军</option>
					<option :value="3">前 3</option>
					<option :value="8">前 8</option>
				</select>

				<select
					v-model="selectedSort"
					class="form-control form-control-sm format-library__select"
					@change="onFilterChange"
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
				/>
				只看 WC2009 完全兼容
			</label>
		</div>

		<!-- 卡组列表 -->
		<div class="format-library__list-section">
			<!-- 初始加载大文件 -->
			<div v-if="dataLoading" class="format-library__loading">
				<div class="format-library__spinner"></div>
				<span>正在加载卡组数据...</span>
			</div>

			<!-- 加载中 -->
			<div v-else-if="listLoading && decks.length === 0" class="format-library__loading">
				<div class="format-library__spinner"></div>
				<span>加载中...</span>
			</div>

			<!-- 错误 -->
			<div v-else-if="listError" class="format-library__error">
				{{ listError }}
				<button class="btn btn-sm btn-outline-secondary" @click="loadDecks(true)">
					重试
				</button>
			</div>

			<!-- 空状态 -->
			<div v-else-if="!listLoading && decks.length === 0" class="format-library__empty">
				没有找到符合条件的卡组
			</div>

			<!-- 卡组列表 -->
			<div v-else class="format-library__list">
				<div
					v-for="deck in filteredDecks"
					:key="deck.id"
					class="format-library__deck-item"
					:class="{
						'format-library__deck-item--active': selectedDeckId === deck.id,
					}"
					@click="selectDeck(deck.id)"
				>
					<div class="format-library__deck-row1">
						<span class="format-library__deck-type">{{ deck.deckTypeName || '未知类型' }}</span>
						<span class="format-library__deck-format">{{ deck.formatName }}</span>
						<span
							v-if="deck.placement"
							class="format-library__deck-placement"
						>
							{{ placementLabel(deck.placement) }}
						</span>
					</div>
					<div class="format-library__deck-row2">
						<span class="format-library__deck-builder">by {{ deck.builderName || '匿名' }}</span>
						<span class="format-library__deck-stats">
							<span class="format-library__deck-rating" title="评分">{{ deck.rating }}</span>
							<span class="format-library__deck-downloads" title="下载量">{{ deck.downloads }}</span>
						</span>
					</div>
					<!-- 兼容度（仅在已加载详情后显示） -->
					<div
						v-if="compatCache[deck.id]"
						class="format-library__deck-compat"
						:class="{
							'format-library__deck-compat--full': getCompat(deck.id).isFullyCompatible,
							'format-library__deck-compat--partial': !getCompat(deck.id).isFullyCompatible,
						}"
					>
						WC2009: {{ getCompat(deck.id).compatibleCards }}/{{ getCompat(deck.id).totalCards }}
						<template v-if="getCompat(deck.id).isFullyCompatible">
							&#x2705;
						</template>
						<template v-else>
							&#x26A0;&#xFE0F; ({{ getCompat(deck.id).incompatibleCards.length }}张不在卡池)
						</template>
					</div>
				</div>

				<!-- 加载更多 -->
				<div v-if="hasMore" class="format-library__load-more">
					<button
						class="btn btn-sm btn-outline-primary"
						:disabled="listLoading"
						@click="loadMore"
					>
						{{ listLoading ? '加载中...' : '加载更多' }}
					</button>
				</div>
			</div>
		</div>

		<!-- 卡组详情 -->
		<div v-if="selectedDeckId !== null" class="format-library__detail-section">
			<div v-if="detailLoading" class="format-library__loading">
				<div class="format-library__spinner"></div>
				<span>加载卡组详情...</span>
			</div>

			<div v-else-if="detailError" class="format-library__error">
				{{ detailError }}
			</div>

			<template v-else-if="currentDetail">
				<!-- 详情头部 -->
				<div class="format-library__detail-header">
					<div class="format-library__detail-info">
						<strong>{{ currentDetail.deckTypeName || currentDetail.name || '卡组' }}</strong>
						<span>赛制：{{ currentDetail.formatName }}</span>
						<span v-if="currentDetail.placement">名次：{{ placementLabel(currentDetail.placement) }}</span>
					</div>
					<div v-if="currentCompat" class="format-library__detail-compat">
						<span
							class="format-library__compat-badge"
							:class="{
								'format-library__compat-badge--full': currentCompat.isFullyCompatible,
								'format-library__compat-badge--partial': !currentCompat.isFullyCompatible,
							}"
						>
							兼容度 {{ currentCompat.percentage }}% ({{ currentCompat.compatibleCards }}/{{ currentCompat.totalCards }})
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
							:key="'main-' + idx"
							class="format-library__card-cell"
							:class="{ 'format-library__card-cell--incompatible': !isCardCompatible(card.artworkId) }"
							:title="card.name + (isCardCompatible(card.artworkId) ? '' : ' (不在 WC2009 卡池)')"
						>
							<img
								:src="getCardImageUrl(card.artworkId)"
								:alt="card.name"
								class="format-library__card-img"
								loading="lazy"
							/>
							<div
								v-if="!isCardCompatible(card.artworkId)"
								class="format-library__card-overlay"
							></div>
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
							:key="'extra-' + idx"
							class="format-library__card-cell"
							:class="{ 'format-library__card-cell--incompatible': !isCardCompatible(card.artworkId) }"
							:title="card.name + (isCardCompatible(card.artworkId) ? '' : ' (不在 WC2009 卡池)')"
						>
							<img
								:src="getCardImageUrl(card.artworkId)"
								:alt="card.name"
								class="format-library__card-img"
								loading="lazy"
							/>
							<div
								v-if="!isCardCompatible(card.artworkId)"
								class="format-library__card-overlay"
							></div>
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
							:key="'side-' + idx"
							class="format-library__card-cell"
							:class="{ 'format-library__card-cell--incompatible': !isCardCompatible(card.artworkId) }"
							:title="card.name + (isCardCompatible(card.artworkId) ? '' : ' (不在 WC2009 卡池)')"
						>
							<img
								:src="getCardImageUrl(card.artworkId)"
								:alt="card.name"
								class="format-library__card-img"
								loading="lazy"
							/>
							<div
								v-if="!isCardCompatible(card.artworkId)"
								class="format-library__card-overlay"
							></div>
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
import Vue from "vue";
import { useSavStore } from "@/application/store/sav";
import { cardDatabase } from "@/data/cardDatabase";
import {
	loadFormats,
	loadAllDecks,
	filterAndSort,
	type FormatInfo,
	type DeckDetail,
	type DeckSort,
	type DeckFilter,
} from "@/data/formatLibraryApi";
import { checkWc2009Compat, type CompatResult } from "@/data/wc2009Compat";

const CARD_IMG_BASE = "https://cdn.233.momobako.com/ygopro/pics/";
const PAGE_SIZE = 50;
const EXTRA_DECK_TYPE_MASK = 0x40 | 0x2000 | 0x800000 | 0x4000000;

export default Vue.extend({
	name: "FormatLibrary",

	data() {
		return {
			// 初始加载状态
			dataLoading: true as boolean,
			debugInfo: "" as string,

			// 数据源
			formats: [] as FormatInfo[],
			allDecks: [] as DeckDetail[],

			// 筛选状态
			selectedFormat: "" as string,
			selectedOrigin: "" as string,
			selectedPlacement: 0 as number,
			selectedSort: "rating:DESC" as string,
			onlyCompatible: false as boolean,

			// 列表状态
			decks: [] as DeckDetail[],
			currentPage: 1 as number,
			allFilteredDecks: [] as DeckDetail[],
			hasMore: true as boolean,
			listLoading: false as boolean,
			listError: null as string | null,

			// 详情状态
			selectedDeckId: null as number | null,
			currentDetail: null as DeckDetail | null,
			detailLoading: false as boolean,
			detailError: null as string | null,

			// 兼容度缓存
			compatCache: {} as Record<number, CompatResult>,
		};
	},

	computed: {
		/** Pinia store（在 computed 中访问确保响应式） */
		savStore() {
			return useSavStore();
		},

		/** 当前选中卡组的兼容度结果 */
		currentCompat(): CompatResult | null {
			if (!this.selectedDeckId) return null;
			return this.compatCache[this.selectedDeckId] ?? null;
		},

		/** 前端过滤：只看 WC2009 完全兼容 */
		filteredDecks(): DeckDetail[] {
			if (!this.onlyCompatible) return this.decks;
			return this.decks.filter((d) => {
				const compat = this.compatCache[d.id];
				return compat?.isFullyCompatible === true;
			});
		},
	},

	async mounted() {
		this.dataLoading = true;
		try {
			const [formats, decks] = await Promise.all([
				loadFormats(),
				loadAllDecks(),
			]);
			this.formats = formats;
			this.allDecks = decks;
			this.debugInfo = `${formats.length} 赛制 | ${decks.length} 卡组`;
			this.loadDecks(true);
		} catch (e) {
			this.debugInfo =
				"加载失败: " + (e instanceof Error ? e.message : String(e));
		} finally {
			this.dataLoading = false;
		}
	},

	methods: {
		/** 解析排序字符串 */
		parseSort(): DeckSort {
			const [field, order] = this.selectedSort.split(":") as [
				DeckSort["field"],
				DeckSort["order"],
			];
			return { field, order };
		},

		/** 构建筛选条件 */
		buildFilter(): DeckFilter {
			const filter: DeckFilter = {};
			if (this.selectedFormat) filter.formatName = this.selectedFormat;
			if (this.selectedOrigin) {
				filter.origin = this.selectedOrigin as "event" | "user";
			}
			if (this.selectedPlacement > 0) {
				filter.placementMax = this.selectedPlacement;
			}
			return filter;
		},

		/**
		 * 从内存中的 allDecks 筛选并加载卡组列表。
		 *
		 * @param reset - 是否重置列表（筛选条件变化时）
		 */
		loadDecks(reset: boolean): void {
			if (reset) {
				this.currentPage = 1;
				this.decks = [];
				this.hasMore = true;
				this.selectedDeckId = null;
				this.currentDetail = null;
			}

			if (this.allDecks.length === 0) return;

			this.listLoading = true;
			this.listError = null;

			try {
				// filterAndSort 返回全量筛选+排序结果
				this.allFilteredDecks = filterAndSort(
					this.allDecks,
					this.buildFilter(),
					this.parseSort(),
				);

				// 手动分页：取前 PAGE_SIZE * currentPage 条
				const end = PAGE_SIZE * this.currentPage;
				this.decks = this.allFilteredDecks.slice(0, end);
				this.hasMore = this.decks.length < this.allFilteredDecks.length;
			} catch (e) {
				this.listError = e instanceof Error ? e.message : "筛选失败";
			} finally {
				this.listLoading = false;
			}
		},

		/** 加载更多（下一页） */
		loadMore(): void {
			this.currentPage++;
			this.loadDecks(false);
		},

		/** 筛选条件变化时 */
		onFilterChange(): void {
			this.loadDecks(true);
		},

		/** 选中某个卡组（从内存直接获取详情） */
		selectDeck(deckId: number): void {
			if (this.selectedDeckId === deckId) {
				this.selectedDeckId = null;
				this.currentDetail = null;
				return;
			}

			this.selectedDeckId = deckId;
			this.detailLoading = false;
			this.detailError = null;

			const detail = this.allDecks.find((d) => d.id === deckId);
			if (!detail) {
				this.detailError = "未找到卡组详情";
				this.currentDetail = null;
				return;
			}

			this.currentDetail = detail;

			// 计算兼容度并缓存
			if (!this.compatCache[deckId]) {
				const allCards = [
					...detail.main,
					...detail.extra,
					...detail.side,
				];
				const compat = checkWc2009Compat(allCards);
				// 使用展开创建新对象以触发 Vue 2 响应式更新
				this.compatCache = { ...this.compatCache, [deckId]: compat };
			}
		},

		/** 获取卡组兼容度（模板 helper） */
		getCompat(deckId: number): CompatResult {
			return (
				this.compatCache[deckId] ?? {
					totalCards: 0,
					compatibleCards: 0,
					incompatibleCards: [],
					percentage: 0,
					isFullyCompatible: false,
				}
			);
		},

		/** 名次标签 */
		placementLabel(placement: number): string {
			if (placement === 1) return "1st";
			if (placement === 2) return "2nd";
			if (placement === 3) return "3rd";
			return `${placement}th`;
		},

		/** 卡图 URL */
		getCardImageUrl(passcode: number): string {
			return `${CARD_IMG_BASE}${passcode}.jpg`;
		},

		/** 检查单张卡是否兼容 WC2009 */
		isCardCompatible(artworkId: number): boolean {
			return (
				cardDatabase.getCidByPasscode(String(artworkId)) !== undefined
			);
		},

		/**
		 * 将卡组的 artworkId 数组转换为 WC2009 CID 数组。
		 * 跳过不在卡池中的卡。
		 */
		convertToCids(
			cards: { name: string; artworkId: number }[],
		): [number[], number] {
			const cids: number[] = [];
			let skipped = 0;
			for (const card of cards) {
				const cidStr = cardDatabase.getCidByPasscode(
					String(card.artworkId),
				);
				if (cidStr) {
					cids.push(Number(cidStr));
				} else {
					skipped++;
				}
			}
			return [cids, skipped];
		},

		/** 判断卡片是否属于额外卡组 */
		isExtraDeckCard(cid: number): boolean {
			const card = cardDatabase.getByCid(String(cid));
			if (!card) return false;
			return (card.type & EXTRA_DECK_TYPE_MASK) !== 0;
		},

		/** 导入到活动卡组 */
		importToActiveDeck(): void {
			if (!this.currentDetail || !this.savStore.isLoaded) return;

			const [mainCids, mainSkipped] = this.convertToCids(
				this.currentDetail.main,
			);
			const [extraCids, extraSkipped] = this.convertToCids(
				this.currentDetail.extra,
			);
			const [sideCids, sideSkipped] = this.convertToCids(
				this.currentDetail.side,
			);

			// 对主卡组中混入的额外卡组类型做分离
			const realMain: number[] = [];
			const extraFromMain: number[] = [];
			for (const cid of mainCids) {
				if (this.isExtraDeckCard(cid)) {
					extraFromMain.push(cid);
				} else {
					realMain.push(cid);
				}
			}

			const finalExtra = [...extraCids, ...extraFromMain];

			this.savStore.updateActiveDeck({
				name:
					this.currentDetail.deckTypeName ||
					this.currentDetail.name ||
					"Imported",
				mainCount: realMain.length,
				sideCount: sideCids.length,
				extraCount: finalExtra.length,
				mainCids: realMain.slice(0, 60),
				sideCids: sideCids.slice(0, 15),
				extraCids: finalExtra.slice(0, 15),
			});

			const totalSkipped = mainSkipped + extraSkipped + sideSkipped;
			if (totalSkipped > 0) {
				alert(
					`已导入到活动卡组。跳过了 ${totalSkipped} 张不在 WC2009 卡池的卡。`,
				);
			} else {
				alert("已导入到活动卡组。");
			}
		},

		/** 导入到当前选中的预制卡组槽位 */
		importToRecipe(): void {
			if (!this.currentDetail || !this.savStore.isLoaded) return;

			const [mainCids, mainSkipped] = this.convertToCids(
				this.currentDetail.main,
			);
			const [extraCids, extraSkipped] = this.convertToCids(
				this.currentDetail.extra,
			);
			const [sideCids, sideSkipped] = this.convertToCids(
				this.currentDetail.side,
			);

			const realMain: number[] = [];
			const extraFromMain: number[] = [];
			for (const cid of mainCids) {
				if (this.isExtraDeckCard(cid)) {
					extraFromMain.push(cid);
				} else {
					realMain.push(cid);
				}
			}

			const finalExtra = [...extraCids, ...extraFromMain];

			this.savStore.updateRecipe(this.savStore.activeRecipeSlot, {
				name: (
					this.currentDetail.deckTypeName ||
					this.currentDetail.name ||
					"Imported"
				).slice(0, 22),
				mainCids: realMain.slice(0, 60),
				sideCids: sideCids.slice(0, 15),
				extraCids: finalExtra.slice(0, 15),
			});

			const totalSkipped = mainSkipped + extraSkipped + sideSkipped;
			if (totalSkipped > 0) {
				alert(
					`已导入到预制卡组 #${this.savStore.activeRecipeSlot + 1}。跳过了 ${totalSkipped} 张不在 WC2009 卡池的卡。`,
				);
			} else {
				alert(
					`已导入到预制卡组 #${this.savStore.activeRecipeSlot + 1}。`,
				);
			}
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

	// 筛选区
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

		input {
			cursor: pointer;
		}
	}

	// 列表区
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

	&__deck-builder {
		color: #666;
	}

	&__deck-stats {
		display: flex;
		gap: 0.6rem;
	}

	&__deck-rating::before {
		content: "\2B50 ";
	}

	&__deck-downloads::before {
		content: "\1F4E5 ";
	}

	&__deck-compat {
		font-size: 0.72rem;
		margin-top: 0.2rem;

		&--full {
			color: #27ae60;
		}

		&--partial {
			color: #e67e22;
		}
	}

	&__load-more {
		text-align: center;
		padding: 0.5rem;
	}

	// 详情区
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

		strong {
			color: #2c3e50;
		}
	}

	&__compat-badge {
		padding: 0.15rem 0.5rem;
		border-radius: 10px;
		font-size: 0.75rem;
		font-weight: 600;

		&--full {
			background: #e6f9ee;
			color: #27ae60;
		}

		&--partial {
			background: #fef3e0;
			color: #e67e22;
		}
	}

	// 卡片区域
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

		&--main {
			background: #9f653d;
		}

		&--extra {
			background: #756aaa;
		}

		&--side {
			background: #628045;
		}
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

	// 导入按钮
	&__import-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	// 通用状态
	&__loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 2rem;
		color: #999;
		font-size: 0.85rem;
	}

	&__spinner {
		width: 18px;
		height: 18px;
		border: 2px solid #e0e0e0;
		border-top-color: #3f88c5;
		border-radius: 50%;
		animation: format-library-spin 0.6s linear infinite;
	}

	&__error {
		color: #e74c3c;
		padding: 1rem;
		text-align: center;
		font-size: 0.85rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	&__empty {
		color: #999;
		padding: 2rem;
		text-align: center;
		font-size: 0.85rem;
	}
}

@keyframes format-library-spin {
	to {
		transform: rotate(360deg);
	}
}
</style>

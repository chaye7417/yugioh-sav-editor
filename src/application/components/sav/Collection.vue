<template>
	<div class="collection">
		<div class="collection__header">
			<h2 class="collection__title">卡片收藏</h2>
			<div class="collection__stats">
				持有 {{ stats.uniqueCount }} / {{ totalCardCount }} 种，共 {{ stats.totalCount }} 张
			</div>
		</div>

		<div class="collection__toolbar">
			<button class="btn btn-sm btn-success" @click="setAll3">
				全部 x3
			</button>
			<button class="btn btn-sm btn-outline-danger" @click="clearAll">
				全部清零
			</button>
			<button
				class="btn btn-sm"
				:class="showAllCards ? 'btn-outline-secondary' : 'btn-info'"
				@click="showAllCards = !showAllCards"
			>
				{{ showAllCards ? '只看已拥有' : '显示全部卡片' }}
			</button>
			<div class="collection__search">
				<input
					v-model="searchKeyword"
					type="text"
					class="form-control form-control-sm"
					placeholder="搜索卡名..."
				/>
			</div>
			<div class="collection__filter">
				<select
					v-model="filterType"
					class="form-control form-control-sm"
				>
					<option value="">全部类型</option>
					<option value="monster">怪兽</option>
					<option value="spell">魔法</option>
					<option value="trap">陷阱</option>
				</select>
			</div>
		</div>

		<div ref="scrollContainer" class="collection__grid" @scroll="onScroll">
			<div
				v-for="item in visibleCards"
				:key="item.cid"
				class="collection__card"
			>
				<div class="collection__card-img-wrap" @mouseenter="onHover(item.card.passcode)">
					<img
						:src="getCardImageUrl(item.card.passcode)"
						:alt="item.card.name"
						class="collection__card-img"
						loading="lazy"
					/>
				</div>
				<div class="collection__card-info">
					<span class="collection__card-name" :title="item.card.name">
						{{ item.card.name }}
					</span>
					<div class="collection__card-controls">
						<button
							class="collection__btn collection__btn--minus"
							:disabled="item.count <= 0"
							@click="decrementCard(item.cid)"
						>
							-
						</button>
						<span class="collection__card-qty">{{ item.count }}</span>
						<button
							class="collection__btn collection__btn--plus"
							:disabled="item.count >= 9"
							@click="incrementCard(item.cid)"
						>
							+
						</button>
					</div>
				</div>
			</div>

			<div v-if="filteredCards.length === 0" class="collection__empty">
				没有匹配的卡片
			</div>
		</div>

		<div class="collection__pager">
			显示 {{ visibleCards.length }} / {{ filteredCards.length }} 张
			<span v-if="visibleCards.length < filteredCards.length">
				（向下滚动加载更多）
			</span>
		</div>
	</div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch } from "vue";
import { useSavStore } from "@/application/store/sav";
import { useCardHoverStore } from "@/application/store/cardHover";
import { cardDatabase, type CardEntry } from "@/data/cardDatabase";
import { getCardCount } from "@/core/sav";

const CARD_IMG_BASE = "https://cdn.233.momobako.com/ygopro/pics/";
const PAGE_SIZE = 60;

interface CollectionCardItem {
	cid: number;
	card: CardEntry;
	count: number;
}

export default defineComponent({
	name: "CollectionPanel",
	setup() {
		const savStore = useSavStore();
		const searchKeyword = ref("");
		const filterType = ref("");
		const visibleCount = ref(PAGE_SIZE);
		const scrollContainer = ref<HTMLElement | null>(null);

		/** 所有卡片（含持有数量，依赖 gamedataVersion 以响应修改） */
		const allCards = computed<CollectionCardItem[]>(() => {
			const entries = cardDatabase.getAllEntries();
			if (!savStore.saveData) return [];
			// 访问 gamedataVersion 以建立响应式依赖
			void savStore.gamedataVersion;

			return entries.map(([cidStr, card]) => {
				const count = getCardCount(
					savStore.saveData!.gamedata,
					card.nibbleIndex,
					savStore.saveData!.profile.gdNibbleArray
				);
				return {
					cid: Number(cidStr),
					card,
					count,
				};
			});
		});

		const showAllCards = ref(false);

		/** 筛选后的卡片 */
		const filteredCards = computed<CollectionCardItem[]>(() => {
			let result = allCards.value;

			// 默认只显示已拥有的卡
			if (!showAllCards.value) {
				result = result.filter((item) => item.count > 0);
			}

			const keyword = searchKeyword.value.trim().toLowerCase();
			if (keyword) {
				result = result.filter(
					(item) =>
						item.card.name.toLowerCase().includes(keyword) ||
						item.card.desc.toLowerCase().includes(keyword)
				);
			}

			if (filterType.value === "monster") {
				result = result.filter((item) => item.card.type & 0x1);
			} else if (filterType.value === "spell") {
				result = result.filter((item) => item.card.type & 0x2);
			} else if (filterType.value === "trap") {
				result = result.filter((item) => item.card.type & 0x4);
			}

			return result;
		});

		/** 虚拟列表：只渲染可见部分 */
		const visibleCards = computed(() =>
			filteredCards.value.slice(0, visibleCount.value)
		);

		const stats = computed(() => savStore.trunkStats);
		const totalCardCount = computed(() => cardDatabase.size || 2807);

		// 搜索变化时重置滚动
		watch([searchKeyword, filterType], () => {
			visibleCount.value = PAGE_SIZE;
			if (scrollContainer.value) {
				scrollContainer.value.scrollTop = 0;
			}
		});

		function onScroll(): void {
			const el = scrollContainer.value;
			if (!el) return;

			const threshold = 200;
			if (el.scrollHeight - el.scrollTop - el.clientHeight < threshold) {
				if (visibleCount.value < filteredCards.value.length) {
					visibleCount.value += PAGE_SIZE;
				}
			}
		}

		function getCardImageUrl(passcode: string): string {
			return `${CARD_IMG_BASE}${passcode}.jpg`;
		}

		const cardHoverStore = useCardHoverStore();
		function onHover(passcode: string): void {
			cardHoverStore.hover(Number(passcode));
		}

		function incrementCard(cid: number): void {
			const item = allCards.value.find((c) => c.cid === cid);
			if (!item || item.count >= 9) return;
			savStore.updateCollection(cid, item.count + 1);
		}

		function decrementCard(cid: number): void {
			const item = allCards.value.find((c) => c.cid === cid);
			if (!item || item.count <= 0) return;
			savStore.updateCollection(cid, item.count - 1);
		}

		function setAll3(): void {
			savStore.setAllCardsQuantity(3);
		}

		function clearAll(): void {
			savStore.setAllCardsQuantity(0);
		}

		return {
			searchKeyword,
			filterType,
			filteredCards,
			visibleCards,
			stats,
			totalCardCount,
			scrollContainer,
			onScroll,
			getCardImageUrl,
			onHover,
			incrementCard,
			decrementCard,
			showAllCards,
			setAll3,
			clearAll,
		};
	},
});
</script>

<style lang="scss" scoped>
.collection {
	display: flex;
	flex-direction: column;
	height: 100%;
	max-height: 100vh;
	overflow: hidden;
	padding: 0.75rem;

	&__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	&__title {
		font-size: 1.2rem;
		font-weight: 700;
		color: #333;
		margin: 0;
	}

	&__stats {
		font-size: 0.85rem;
		color: #666;
	}

	&__toolbar {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		margin-bottom: 0.75rem;
		flex-wrap: wrap;
	}

	&__search {
		flex: 1;
		min-width: 150px;
	}

	&__filter {
		width: 120px;
	}

	&__grid {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		display: flex;
		flex-wrap: wrap;
		align-content: flex-start;
		gap: 8px;
		padding: 4px;
	}

	&__card {
		width: 110px;
		background: #fff;
		border-radius: 6px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		transition: box-shadow 0.15s;

		&:hover {
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		}
	}

	&__card-img-wrap {
		position: relative;
		width: 100%;
	}

	&__card-img {
		width: 100%;
		height: auto;
		display: block;
	}

	&__card-count-badge {
		position: absolute;
		top: 4px;
		right: 4px;
		background: rgba(63, 136, 197, 0.9);
		color: #fff;
		font-size: 0.7rem;
		font-weight: 700;
		padding: 1px 5px;
		border-radius: 3px;

		&--zero {
			background: rgba(0, 0, 0, 0.4);
		}
	}

	&__card-info {
		padding: 4px 6px;
	}

	&__card-name {
		display: block;
		font-size: 0.7rem;
		color: #333;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		margin-bottom: 4px;
	}

	&__card-controls {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
	}

	&__btn {
		width: 22px;
		height: 22px;
		border: 1px solid #ccc;
		border-radius: 3px;
		background: #fff;
		cursor: pointer;
		font-size: 0.8rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		line-height: 1;
		transition: background 0.1s;

		&:hover:not(:disabled) {
			background: #eef4fb;
		}

		&:disabled {
			opacity: 0.3;
			cursor: default;
		}

		&--plus {
			color: #3f88c5;
			border-color: #3f88c5;
		}

		&--minus {
			color: #e74b68;
			border-color: #e74b68;
		}
	}

	&__card-qty {
		font-size: 0.8rem;
		font-weight: 600;
		min-width: 14px;
		text-align: center;
	}

	&__empty {
		color: #999;
		font-size: 0.9rem;
		padding: 2rem;
		text-align: center;
		width: 100%;
	}

	&__pager {
		text-align: center;
		font-size: 0.75rem;
		color: #999;
		padding-top: 0.5rem;
		flex-shrink: 0;
	}
}
</style>

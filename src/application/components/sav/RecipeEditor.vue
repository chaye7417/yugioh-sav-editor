<template>
	<div class="recipe-editor">
		<!-- 顶部：卡组名编辑 + 操作 -->
		<div class="recipe-editor__header">
			<div class="recipe-editor__name-row">
				<label class="recipe-editor__name-label">卡组名</label>
				<input
					v-model="deckName"
					type="text"
					class="form-control form-control-sm recipe-editor__name-input"
					maxlength="22"
					placeholder="输入卡组名（ASCII）"
					@input="onNameChange"
				/>
			</div>
			<div class="recipe-editor__actions">
				<button class="btn btn-sm btn-outline-secondary" @click="exportYdk">
					导出 YDK
				</button>
			</div>
		</div>

		<div class="recipe-editor__body">
			<!-- 左侧：搜索/筛选 -->
			<div class="recipe-editor__search-panel">
				<div class="recipe-editor__search-bar">
					<input
						v-model="searchKeyword"
						type="text"
						class="form-control form-control-sm"
						placeholder="搜索卡名..."
						@input="onSearch"
					/>
				</div>

				<div class="recipe-editor__filters">
					<select
						v-model="filterType"
						class="form-control form-control-sm recipe-editor__filter-select"
					>
						<option value="">全部类型</option>
						<option value="monster">怪兽</option>
						<option value="spell">魔法</option>
						<option value="trap">陷阱</option>
					</select>
					<select
						v-model="filterAttribute"
						class="form-control form-control-sm recipe-editor__filter-select"
					>
						<option :value="0">全部属性</option>
						<option :value="0x1">地</option>
						<option :value="0x2">水</option>
						<option :value="0x4">炎</option>
						<option :value="0x8">风</option>
						<option :value="0x10">光</option>
						<option :value="0x20">暗</option>
						<option :value="0x40">神</option>
					</select>
					<select
						v-model="filterLevel"
						class="form-control form-control-sm recipe-editor__filter-select"
					>
						<option :value="0">全部等级</option>
						<option v-for="l in 12" :key="l" :value="l">{{ l }} 星</option>
					</select>
				</div>

				<draggable
					class="recipe-editor__search-results"
					:list="searchResultItems"
					:group="{ name: 'recipe-cards', pull: 'clone', put: false }"
					:sort="false"
					:clone="cloneSearchItem"
					@start="onDragStart"
					@end="onDragEnd"
				>
					<div
						v-for="item in searchResultItems"
						:key="item.key"
						class="recipe-editor__card-item"
						:title="buildTooltip(item.card)"
						@click="addCard(item.cid, item.card)"
					>
						<img
							:src="getCardImageUrl(item.card.passcode)"
							:alt="item.card.name"
							class="recipe-editor__card-img recipe-editor__card-img--small"
							@mouseenter="onHover(item.card.passcode)"
							loading="lazy"
						/>
						<span class="recipe-editor__card-name-overlay">
							{{ item.card.name }}
						</span>
					</div>
				</draggable>
				<p class="recipe-editor__hint">
					点击添加 | 可拖拽到任意卡组区域
				</p>
				<p
					v-if="searchResultItems.length === 0 && searchKeyword"
					class="recipe-editor__no-results"
				>
					没有找到匹配的卡片
				</p>
			</div>

			<!-- 右侧：卡组编辑区 -->
			<div class="recipe-editor__deck-panel">
				<!-- 主卡组 -->
				<div class="recipe-editor__deck-section">
					<h4 class="recipe-editor__deck-section-title recipe-editor__deck-section-title--main">
						主卡组 {{ mainDeckItems.length }}/60
					</h4>
					<draggable
						class="recipe-editor__card-grid"
						:class="{ 'recipe-editor__card-grid--drag-over': isDragging }"
						:list="mainDeckItems"
						group="recipe-cards"
						@change="onMainChange"
						@start="onDragStart"
						@end="onDragEnd"
					>
						<div
							v-for="item in mainDeckItems"
							:key="item.key"
							class="recipe-editor__deck-card"
							:title="buildTooltip(item.card)"
							@click="removeFromMain(item.index)"
						>
							<img
								:src="getCardImageUrl(item.card.passcode)"
								:alt="item.card.name"
								class="recipe-editor__card-img recipe-editor__card-img--medium"
								@mouseenter="onHover(item.card.passcode)"
								loading="lazy"
							/>
						</div>
					</draggable>
					<div
						v-if="mainDeckItems.length === 0 && !isDragging"
						class="recipe-editor__empty-hint"
					>
						点击左侧卡片添加到主卡组
					</div>
				</div>

				<!-- 额外卡组 -->
				<div class="recipe-editor__deck-section">
					<h4 class="recipe-editor__deck-section-title recipe-editor__deck-section-title--extra">
						额外卡组 {{ extraDeckItems.length }}/15
					</h4>
					<draggable
						class="recipe-editor__card-grid"
						:class="{ 'recipe-editor__card-grid--drag-over': isDragging }"
						:list="extraDeckItems"
						group="recipe-cards"
						@change="onExtraChange"
						@start="onDragStart"
						@end="onDragEnd"
					>
						<div
							v-for="item in extraDeckItems"
							:key="item.key"
							class="recipe-editor__deck-card"
							:title="buildTooltip(item.card)"
							@click="removeFromExtra(item.index)"
						>
							<img
								:src="getCardImageUrl(item.card.passcode)"
								:alt="item.card.name"
								class="recipe-editor__card-img recipe-editor__card-img--medium"
								@mouseenter="onHover(item.card.passcode)"
								loading="lazy"
							/>
						</div>
					</draggable>
					<div
						v-if="extraDeckItems.length === 0 && !isDragging"
						class="recipe-editor__empty-hint"
					>
						融合/同调怪兽会被添加到此处
					</div>
				</div>

				<!-- 副卡组 -->
				<div class="recipe-editor__deck-section">
					<h4 class="recipe-editor__deck-section-title recipe-editor__deck-section-title--side">
						副卡组 {{ sideDeckItems.length }}/15
					</h4>
					<draggable
						class="recipe-editor__card-grid"
						:class="{ 'recipe-editor__card-grid--drag-over': isDragging }"
						:list="sideDeckItems"
						group="recipe-cards"
						@change="onSideChange"
						@start="onDragStart"
						@end="onDragEnd"
					>
						<div
							v-for="item in sideDeckItems"
							:key="item.key"
							class="recipe-editor__deck-card"
							:title="buildTooltip(item.card)"
							@click="removeFromSide(item.index)"
						>
							<img
								:src="getCardImageUrl(item.card.passcode)"
								:alt="item.card.name"
								class="recipe-editor__card-img recipe-editor__card-img--medium"
								@mouseenter="onHover(item.card.passcode)"
								loading="lazy"
							/>
						</div>
					</draggable>
					<div
						v-if="sideDeckItems.length === 0 && !isDragging"
						class="recipe-editor__empty-hint"
					>
						拖拽卡片到此处添加副卡组
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch } from "vue";
import draggable from "vuedraggable";
import { useSavStore } from "@/application/store/sav";
import { useCardHoverStore } from "@/application/store/cardHover";
import { cardDatabase, type CardEntry } from "@/data/cardDatabase";
import {
	getMainType,
	getSubTypeDescription,
	getRaceName,
	getAttributeName,
} from "@/data/i18n";

/** 卡图 CDN 地址 */
const CARD_IMG_BASE = "https://cdn.233.momobako.com/ygopro/pics/";

/** 额外卡组类型标记 (融合 | 同调 | 超量 | 连接) */
const EXTRA_DECK_TYPE_MASK = 0x40 | 0x2000 | 0x800000 | 0x4000000;

interface DeckCardItem {
	cid: number;
	card: CardEntry;
	key: string;
	index: number;
}

let uidCounter = 0;
function nextUid(): string {
	return `dci-${++uidCounter}`;
}

export default defineComponent({
	name: "RecipeEditor",
	components: { draggable },
	setup() {
		const savStore = useSavStore();

		const searchKeyword = ref("");
		const filterType = ref("");
		const filterAttribute = ref(0);
		const filterLevel = ref(0);
		const deckName = ref("");
		const isDragging = ref(false);

		// 当槽位切换时同步卡组名
		watch(
			() => savStore.activeRecipeSlot,
			() => {
				const recipe = savStore.activeRecipe;
				deckName.value = recipe?.name ?? "";
			},
			{ immediate: true }
		);

		// 搜索结果
		const searchResultItems = computed<DeckCardItem[]>(() => {
			const keyword = searchKeyword.value.trim();
			let entries: [string, CardEntry][];

			if (keyword) {
				entries = cardDatabase.search(keyword, 200);
			} else {
				entries = cardDatabase.getAllEntries();
			}

			return entries
				.filter(([, card]) => {
					if (filterType.value === "monster" && !(card.type & 0x1))
						return false;
					if (filterType.value === "spell" && !(card.type & 0x2))
						return false;
					if (filterType.value === "trap" && !(card.type & 0x4))
						return false;
					if (
						filterAttribute.value !== 0 &&
						card.attribute !== filterAttribute.value
					)
						return false;
					if (filterLevel.value !== 0 && card.level !== filterLevel.value)
						return false;
					return true;
				})
				.map(([cid, card]) => ({
					cid: Number(cid),
					card,
					key: `search-${cid}`,
					index: -1,
				}));
		});

		/** 将 CID 数组转成 DeckCardItem 数组 */
		function cidsToDeckItems(cids: number[], prefix: string): DeckCardItem[] {
			const result: DeckCardItem[] = [];
			for (let i = 0; i < cids.length; i++) {
				const card = cardDatabase.getByCid(String(cids[i]));
				if (card) {
					result.push({
						cid: cids[i],
						card,
						key: `${prefix}-${i}-${cids[i]}`,
						index: i,
					});
				}
			}
			return result;
		}

		const mainDeckItems = computed(() => {
			const recipe = savStore.activeRecipe;
			if (!recipe) return [];
			return cidsToDeckItems(recipe.mainCids, "main");
		});

		const extraDeckItems = computed(() => {
			const recipe = savStore.activeRecipe;
			if (!recipe) return [];
			return cidsToDeckItems(recipe.extraCids, "extra");
		});

		const sideDeckItems = computed(() => {
			const recipe = savStore.activeRecipe;
			if (!recipe) return [];
			return cidsToDeckItems(recipe.sideCids, "side");
		});

		function getCardImageUrl(passcode: string): string {
			return `${CARD_IMG_BASE}${passcode}.jpg`;
		}

		const cardHoverStore = useCardHoverStore();
		function onHover(passcode: string): void {
			cardHoverStore.hover(Number(passcode));
		}

		function buildTooltip(card: CardEntry): string {
			const mainType = getMainType(card.type);
			const subType = getSubTypeDescription(card.type);
			let tip = `${card.name}\n[${mainType}`;
			if (subType) tip += ` / ${subType}`;
			tip += "]";

			if (card.type & 0x1) {
				// 怪兽
				const race = getRaceName(card.race);
				const attr = getAttributeName(card.attribute);
				tip += `\n${attr} / ${race} / ★${card.level}`;
				const atk = card.atk === -2 ? "?" : String(card.atk);
				const def = card.def === -2 ? "?" : String(card.def);
				tip += `\nATK/${atk} DEF/${def}`;
			}

			if (card.desc) {
				const shortDesc =
					card.desc.length > 100
						? card.desc.substring(0, 100) + "..."
						: card.desc;
				tip += `\n\n${shortDesc}`;
			}

			return tip;
		}

		function isExtraDeckCard(card: CardEntry): boolean {
			return (card.type & EXTRA_DECK_TYPE_MASK) !== 0;
		}

		/** 克隆搜索结果项（拖拽 clone 模式需要） */
		function cloneSearchItem(item: DeckCardItem): DeckCardItem {
			return { ...item, key: nextUid() };
		}

		/** 从 DeckCardItem 数组提取 CID 数组 */
		function itemsToCids(items: DeckCardItem[]): number[] {
			return items.map((it) => it.cid);
		}

		function syncToStore(
			mainItems: DeckCardItem[],
			extraItems: DeckCardItem[],
			sideItems: DeckCardItem[]
		): void {
			const recipe = savStore.activeRecipe;
			if (!recipe) return;
			savStore.updateRecipe(savStore.activeRecipeSlot, {
				...recipe,
				mainCids: itemsToCids(mainItems).slice(0, 60),
				extraCids: itemsToCids(extraItems).slice(0, 15),
				sideCids: itemsToCids(sideItems).slice(0, 15),
			});
		}

		/** 处理主卡组 draggable 变化 */
		function onMainChange(evt: any): void {
			const recipe = savStore.activeRecipe;
			if (!recipe) return;

			if (evt.added) {
				const item: DeckCardItem = evt.added.element;
				const newMain = [...recipe.mainCids];
				if (newMain.length >= 60) return;
				newMain.splice(evt.added.newIndex, 0, item.cid);
				savStore.updateRecipe(savStore.activeRecipeSlot, {
					...recipe,
					mainCids: newMain,
				});
			} else if (evt.removed) {
				const newMain = [...recipe.mainCids];
				newMain.splice(evt.removed.oldIndex, 1);
				savStore.updateRecipe(savStore.activeRecipeSlot, {
					...recipe,
					mainCids: newMain,
				});
			} else if (evt.moved) {
				const newMain = [...recipe.mainCids];
				const [moved] = newMain.splice(evt.moved.oldIndex, 1);
				newMain.splice(evt.moved.newIndex, 0, moved);
				savStore.updateRecipe(savStore.activeRecipeSlot, {
					...recipe,
					mainCids: newMain,
				});
			}
		}

		/** 处理额外卡组 draggable 变化 */
		function onExtraChange(evt: any): void {
			const recipe = savStore.activeRecipe;
			if (!recipe) return;

			if (evt.added) {
				const item: DeckCardItem = evt.added.element;
				const newExtra = [...recipe.extraCids];
				if (newExtra.length >= 15) return;
				newExtra.splice(evt.added.newIndex, 0, item.cid);
				savStore.updateRecipe(savStore.activeRecipeSlot, {
					...recipe,
					extraCids: newExtra,
				});
			} else if (evt.removed) {
				const newExtra = [...recipe.extraCids];
				newExtra.splice(evt.removed.oldIndex, 1);
				savStore.updateRecipe(savStore.activeRecipeSlot, {
					...recipe,
					extraCids: newExtra,
				});
			} else if (evt.moved) {
				const newExtra = [...recipe.extraCids];
				const [moved] = newExtra.splice(evt.moved.oldIndex, 1);
				newExtra.splice(evt.moved.newIndex, 0, moved);
				savStore.updateRecipe(savStore.activeRecipeSlot, {
					...recipe,
					extraCids: newExtra,
				});
			}
		}

		/** 处理副卡组 draggable 变化 */
		function onSideChange(evt: any): void {
			const recipe = savStore.activeRecipe;
			if (!recipe) return;

			if (evt.added) {
				const item: DeckCardItem = evt.added.element;
				const newSide = [...recipe.sideCids];
				if (newSide.length >= 15) return;
				newSide.splice(evt.added.newIndex, 0, item.cid);
				savStore.updateRecipe(savStore.activeRecipeSlot, {
					...recipe,
					sideCids: newSide,
				});
			} else if (evt.removed) {
				const newSide = [...recipe.sideCids];
				newSide.splice(evt.removed.oldIndex, 1);
				savStore.updateRecipe(savStore.activeRecipeSlot, {
					...recipe,
					sideCids: newSide,
				});
			} else if (evt.moved) {
				const newSide = [...recipe.sideCids];
				const [moved] = newSide.splice(evt.moved.oldIndex, 1);
				newSide.splice(evt.moved.newIndex, 0, moved);
				savStore.updateRecipe(savStore.activeRecipeSlot, {
					...recipe,
					sideCids: newSide,
				});
			}
		}

		function addCard(cid: number, card: CardEntry): void {
			const recipe = savStore.activeRecipe;
			if (!recipe) return;

			if (isExtraDeckCard(card)) {
				if (recipe.extraCids.length >= 15) return;
				savStore.updateRecipe(savStore.activeRecipeSlot, {
					...recipe,
					extraCids: [...recipe.extraCids, cid],
				});
			} else {
				if (recipe.mainCids.length >= 60) return;
				savStore.updateRecipe(savStore.activeRecipeSlot, {
					...recipe,
					mainCids: [...recipe.mainCids, cid],
				});
			}
		}

		function removeFromMain(index: number): void {
			const recipe = savStore.activeRecipe;
			if (!recipe) return;
			const newMain = [...recipe.mainCids];
			newMain.splice(index, 1);
			savStore.updateRecipe(savStore.activeRecipeSlot, {
				...recipe,
				mainCids: newMain,
			});
		}

		function removeFromExtra(index: number): void {
			const recipe = savStore.activeRecipe;
			if (!recipe) return;
			const newExtra = [...recipe.extraCids];
			newExtra.splice(index, 1);
			savStore.updateRecipe(savStore.activeRecipeSlot, {
				...recipe,
				extraCids: newExtra,
			});
		}

		function removeFromSide(index: number): void {
			const recipe = savStore.activeRecipe;
			if (!recipe) return;
			const newSide = [...recipe.sideCids];
			newSide.splice(index, 1);
			savStore.updateRecipe(savStore.activeRecipeSlot, {
				...recipe,
				sideCids: newSide,
			});
		}

		function onNameChange(): void {
			const recipe = savStore.activeRecipe;
			if (!recipe) return;
			savStore.updateRecipe(savStore.activeRecipeSlot, {
				...recipe,
				name: deckName.value,
			});
		}

		function onSearch(): void {
			// searchResults 是 computed，会自动更新
		}

		function onDragStart(): void {
			isDragging.value = true;
		}

		function onDragEnd(): void {
			isDragging.value = false;
		}

		function exportYdk(): void {
			const recipe = savStore.activeRecipe;
			if (!recipe) return;

			function cidsToPasscodes(cids: number[]): string[] {
				const result: string[] = [];
				for (const cid of cids) {
					const card = cardDatabase.getByCid(String(cid));
					if (card) result.push(card.passcode);
				}
				return result;
			}

			const lines: string[] = [];
			lines.push("#created by WC2009 SAV Editor");
			lines.push("#main");
			for (const pc of cidsToPasscodes(recipe.mainCids)) {
				lines.push(pc);
			}
			lines.push("#extra");
			for (const pc of cidsToPasscodes(recipe.extraCids)) {
				lines.push(pc);
			}
			lines.push("!side");
			for (const pc of cidsToPasscodes(recipe.sideCids)) {
				lines.push(pc);
			}

			const text = lines.join("\n");
			const blob = new Blob([text], { type: "text/plain" });
			const name = (recipe.name || "deck") + ".ydk";
			const url = URL.createObjectURL(blob);

			const el = document.createElement("a");
			el.href = url;
			el.download = name;
			document.body.appendChild(el);
			el.click();
			el.remove();
			URL.revokeObjectURL(url);
		}

		return {
			savStore,
			searchKeyword,
			filterType,
			filterAttribute,
			filterLevel,
			deckName,
			isDragging,
			searchResultItems,
			mainDeckItems,
			extraDeckItems,
			sideDeckItems,
			getCardImageUrl,
			onHover,
			buildTooltip,
			cloneSearchItem,
			addCard,
			removeFromMain,
			removeFromExtra,
			removeFromSide,
			onMainChange,
			onExtraChange,
			onSideChange,
			onNameChange,
			onSearch,
			onDragStart,
			onDragEnd,
			exportYdk,
		};
	},
});
</script>

<style lang="scss" scoped>
.recipe-editor {
	display: flex;
	flex-direction: column;
	height: 100%;
	padding: 0.75rem;

	&__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
		flex-shrink: 0;
	}

	&__name-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	&__name-label {
		font-size: 0.85rem;
		color: #666;
		white-space: nowrap;
	}

	&__name-input {
		width: 200px;
	}

	&__actions {
		display: flex;
		gap: 0.5rem;
	}

	&__body {
		display: flex;
		gap: 0.75rem;
		flex: 1;
		overflow: hidden;
	}

	// 左侧搜索面板
	&__search-panel {
		width: 280px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	&__search-bar {
		margin-bottom: 0.5rem;
	}

	&__filters {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 0.5rem;
	}

	&__filter-select {
		font-size: 0.75rem;
		padding: 0.2rem 0.3rem;
	}

	&__search-results {
		overflow-y: auto;
		max-height: calc(100vh - 250px);
		display: flex;
		flex-wrap: wrap;
		align-content: flex-start;
		gap: 4px;
		padding: 2px;
	}

	&__card-item {
		position: relative;
		cursor: pointer;
		border-radius: 3px;
		overflow: hidden;
		transition: transform 0.1s;

		&:hover {
			transform: scale(1.05);
			z-index: 1;
		}
	}

	&__card-name-overlay {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: rgba(0, 0, 0, 0.7);
		color: #fff;
		font-size: 0.55rem;
		padding: 1px 2px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		pointer-events: none;
	}

	&__card-img {
		display: block;
		object-fit: cover;

		&--small {
			width: 60px;
			height: 87px;
		}

		&--medium {
			width: 80px;
			height: 116px;
		}
	}

	&__hint {
		color: #aaa;
		font-size: 0.75rem;
		text-align: center;
		width: 100%;
		margin: 0.25rem 0;
		padding: 0;
	}

	&__no-results {
		color: #999;
		font-size: 0.85rem;
		padding: 1rem;
		text-align: center;
		width: 100%;
	}

	// 右侧卡组面板
	&__deck-panel {
		flex: 1;
		overflow-y: auto;
	}

	&__deck-section {
		margin-bottom: 1rem;
	}

	&__deck-section-title {
		font-size: 0.9rem;
		font-weight: 600;
		margin-bottom: 0.4rem;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
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
		min-height: 60px;
		padding: 4px;
		background: #f5f5f5;
		border-radius: 4px;
		transition: box-shadow 0.2s, border-color 0.2s;
		border: 2px solid transparent;

		&--drag-over {
			border-color: #409eff;
			box-shadow: inset 0 0 8px rgba(64, 158, 255, 0.2);
		}
	}

	&__deck-card {
		cursor: pointer;
		border-radius: 2px;
		overflow: hidden;
		transition: transform 0.1s;

		&:hover {
			transform: scale(1.08);
			z-index: 1;
			box-shadow: 0 0 6px rgba(231, 75, 104, 0.5);
		}
	}

	&__empty-hint {
		color: #bbb;
		font-size: 0.8rem;
		padding: 1rem;
		text-align: center;
		width: 100%;
	}
}

// vuedraggable 拖拽中的 ghost 样式
.sortable-ghost {
	opacity: 0.5;
}
</style>

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

				<div class="recipe-editor__search-results">
					<div
						v-for="item in searchResults"
						:key="item.cid"
						class="recipe-editor__card-item"
						:title="buildTooltip(item.card)"
						@click="addCard(item.cid, item.card)"
					>
						<img
							:src="getCardImageUrl(item.card.passcode)"
							:alt="item.card.name"
							class="recipe-editor__card-img recipe-editor__card-img--small"
							loading="lazy"
						/>
						<span class="recipe-editor__card-name-overlay">
							{{ item.card.name }}
						</span>
					</div>
					<p
						v-if="searchResults.length === 0 && searchKeyword"
						class="recipe-editor__no-results"
					>
						没有找到匹配的卡片
					</p>
				</div>
			</div>

			<!-- 右侧：卡组编辑区 -->
			<div class="recipe-editor__deck-panel">
				<!-- 主卡组 -->
				<div class="recipe-editor__deck-section">
					<h4 class="recipe-editor__deck-section-title recipe-editor__deck-section-title--main">
						主卡组 {{ mainCards.length }}/60
					</h4>
					<div class="recipe-editor__card-grid">
						<div
							v-for="(card, index) in mainCards"
							:key="'main-' + index"
							class="recipe-editor__deck-card"
							:title="buildTooltip(card)"
							@click="removeFromMain(index)"
						>
							<img
								:src="getCardImageUrl(card.passcode)"
								:alt="card.name"
								class="recipe-editor__card-img recipe-editor__card-img--medium"
								loading="lazy"
							/>
						</div>
						<div
							v-if="mainCards.length === 0"
							class="recipe-editor__empty-hint"
						>
							点击左侧卡片添加到主卡组
						</div>
					</div>
				</div>

				<!-- 额外卡组 -->
				<div class="recipe-editor__deck-section">
					<h4 class="recipe-editor__deck-section-title recipe-editor__deck-section-title--extra">
						额外卡组 {{ extraCards.length }}/15
					</h4>
					<div class="recipe-editor__card-grid">
						<div
							v-for="(card, index) in extraCards"
							:key="'extra-' + index"
							class="recipe-editor__deck-card"
							:title="buildTooltip(card)"
							@click="removeFromExtra(index)"
						>
							<img
								:src="getCardImageUrl(card.passcode)"
								:alt="card.name"
								class="recipe-editor__card-img recipe-editor__card-img--medium"
								loading="lazy"
							/>
						</div>
						<div
							v-if="extraCards.length === 0"
							class="recipe-editor__empty-hint"
						>
							融合/同调怪兽会被添加到此处
						</div>
					</div>
				</div>

				<!-- 副卡组 -->
				<div class="recipe-editor__deck-section">
					<h4 class="recipe-editor__deck-section-title recipe-editor__deck-section-title--side">
						副卡组 {{ sideCards.length }}/15
					</h4>
					<div class="recipe-editor__card-grid">
						<div
							v-for="(card, index) in sideCards"
							:key="'side-' + index"
							class="recipe-editor__deck-card"
							:title="buildTooltip(card)"
							@click="removeFromSide(index)"
						>
							<img
								:src="getCardImageUrl(card.passcode)"
								:alt="card.name"
								class="recipe-editor__card-img recipe-editor__card-img--medium"
								loading="lazy"
							/>
						</div>
						<div
							v-if="sideCards.length === 0"
							class="recipe-editor__empty-hint"
						>
							点击左侧卡片添加到副卡组（按住 Shift）
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch } from "vue";
import { useSavStore } from "@/application/store/sav";
import { cardDatabase, type CardEntry } from "@/data/cardDatabase";
import {
	getMainType,
	getSubTypeDescription,
	getRaceName,
	getAttributeName,
} from "@/data/i18n";

/** 卡图 CDN 地址 */
const CARD_IMG_BASE = "https://cdn.233.momobako.com/images/cards/";

/** 额外卡组类型标记 (融合 | 同调 | 超量 | 连接) */
const EXTRA_DECK_TYPE_MASK = 0x40 | 0x2000 | 0x800000 | 0x4000000;

interface SearchResultItem {
	cid: string;
	card: CardEntry;
}

export default defineComponent({
	name: "RecipeEditor",
	setup() {
		const savStore = useSavStore();

		const searchKeyword = ref("");
		const filterType = ref("");
		const filterAttribute = ref(0);
		const filterLevel = ref(0);
		const deckName = ref("");

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
		const searchResults = computed<SearchResultItem[]>(() => {
			const keyword = searchKeyword.value.trim();
			let entries: [string, CardEntry][];

			if (keyword) {
				entries = cardDatabase.search(keyword, 200);
			} else {
				entries = cardDatabase.getAllEntries().slice(0, 100);
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
				.slice(0, 80)
				.map(([cid, card]) => ({ cid, card }));
		});

		// 将 CID 列表转为 CardEntry 列表
		function cidsToCards(cids: number[]): CardEntry[] {
			const result: CardEntry[] = [];
			for (const cid of cids) {
				const card = cardDatabase.getByCid(String(cid));
				if (card) result.push(card);
			}
			return result;
		}

		const mainCards = computed(() => {
			const recipe = savStore.activeRecipe;
			if (!recipe) return [];
			return cidsToCards(recipe.mainCids);
		});

		const extraCards = computed(() => {
			const recipe = savStore.activeRecipe;
			if (!recipe) return [];
			return cidsToCards(recipe.extraCids);
		});

		const sideCards = computed(() => {
			const recipe = savStore.activeRecipe;
			if (!recipe) return [];
			return cidsToCards(recipe.sideCids);
		});

		function getCardImageUrl(passcode: string): string {
			return `${CARD_IMG_BASE}${passcode}.jpg`;
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

		function addCard(cidStr: string, card: CardEntry): void {
			const recipe = savStore.activeRecipe;
			if (!recipe) return;
			const cid = Number(cidStr);

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
			searchResults,
			mainCards,
			extraCards,
			sideCards,
			getCardImageUrl,
			buildTooltip,
			addCard,
			removeFromMain,
			removeFromExtra,
			removeFromSide,
			onNameChange,
			onSearch,
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
		flex: 1;
		overflow-y: auto;
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
</style>

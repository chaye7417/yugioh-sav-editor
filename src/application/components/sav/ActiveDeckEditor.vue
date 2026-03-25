<template>
	<div class="recipe-editor">
		<!-- 顶部：卡组名编辑 + 操作 -->
		<div class="recipe-editor__header">
			<div class="recipe-editor__name-row">
				<label class="recipe-editor__name-label">活动卡组</label>
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
				<label class="btn btn-sm btn-outline-secondary">
					导入 YDK
					<input
						type="file"
						accept=".ydk"
						class="recipe-editor__hidden-input"
						@change="importYdk"
					/>
				</label>
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
import { computed, defineComponent, ref } from "vue";
import { useSavStore } from "@/application/store/sav";
import { cardDatabase, type CardEntry } from "@/data/cardDatabase";
import type { ActiveDeck } from "@/core/sav";
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

interface SearchResultItem {
	cid: string;
	card: CardEntry;
}

export default defineComponent({
	name: "ActiveDeckEditor",
	setup() {
		const savStore = useSavStore();

		const searchKeyword = ref("");
		const filterType = ref("");
		const filterAttribute = ref(0);
		const filterLevel = ref(0);
		const deckName = ref("");

		// 初始化卡组名
		if (savStore.saveData) {
			deckName.value = savStore.saveData.activeDeck.name;
		}

		/** 获取当前活动卡组的快捷方式 */
		function getDeck(): ActiveDeck | null {
			return savStore.saveData?.activeDeck ?? null;
		}

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

		function cidsToCards(cids: number[]): CardEntry[] {
			const result: CardEntry[] = [];
			for (const cid of cids) {
				const card = cardDatabase.getByCid(String(cid));
				if (card) result.push(card);
			}
			return result;
		}

		const mainCards = computed(() => {
			const deck = getDeck();
			if (!deck) return [];
			return cidsToCards(deck.mainCids);
		});

		const extraCards = computed(() => {
			const deck = getDeck();
			if (!deck) return [];
			return cidsToCards(deck.extraCids);
		});

		const sideCards = computed(() => {
			const deck = getDeck();
			if (!deck) return [];
			return cidsToCards(deck.sideCids);
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

		function updateDeck(partial: Partial<ActiveDeck>): void {
			const deck = getDeck();
			if (!deck) return;
			savStore.updateActiveDeck({ ...deck, ...partial });
		}

		function addCard(cidStr: string, card: CardEntry): void {
			const deck = getDeck();
			if (!deck) return;
			const cid = Number(cidStr);

			if (isExtraDeckCard(card)) {
				if (deck.extraCids.length >= 15) return;
				updateDeck({
					extraCids: [...deck.extraCids, cid],
					extraCount: deck.extraCids.length + 1,
				});
			} else {
				if (deck.mainCids.length >= 60) return;
				updateDeck({
					mainCids: [...deck.mainCids, cid],
					mainCount: deck.mainCids.length + 1,
				});
			}
		}

		function removeFromMain(index: number): void {
			const deck = getDeck();
			if (!deck) return;
			const newMain = [...deck.mainCids];
			newMain.splice(index, 1);
			updateDeck({ mainCids: newMain, mainCount: newMain.length });
		}

		function removeFromExtra(index: number): void {
			const deck = getDeck();
			if (!deck) return;
			const newExtra = [...deck.extraCids];
			newExtra.splice(index, 1);
			updateDeck({ extraCids: newExtra, extraCount: newExtra.length });
		}

		function removeFromSide(index: number): void {
			const deck = getDeck();
			if (!deck) return;
			const newSide = [...deck.sideCids];
			newSide.splice(index, 1);
			updateDeck({ sideCids: newSide, sideCount: newSide.length });
		}

		function onNameChange(): void {
			updateDeck({ name: deckName.value });
		}

		function exportYdk(): void {
			const deck = getDeck();
			if (!deck) return;

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
			for (const pc of cidsToPasscodes(deck.mainCids)) {
				lines.push(pc);
			}
			lines.push("#extra");
			for (const pc of cidsToPasscodes(deck.extraCids)) {
				lines.push(pc);
			}
			lines.push("!side");
			for (const pc of cidsToPasscodes(deck.sideCids)) {
				lines.push(pc);
			}

			const text = lines.join("\n");
			const blob = new Blob([text], { type: "text/plain" });
			const name = (deck.name || "active_deck") + ".ydk";
			const url = URL.createObjectURL(blob);

			const el = document.createElement("a");
			el.href = url;
			el.download = name;
			document.body.appendChild(el);
			el.click();
			el.remove();
			URL.revokeObjectURL(url);
		}

		function importYdk(event: Event): void {
			const target = event.target as HTMLInputElement;
			if (!target.files || target.files.length === 0) return;

			const file = target.files[0];
			const reader = new FileReader();
			reader.onload = () => {
				const text = reader.result as string;
				const lines = text.split(/\r?\n/);

				let section = "";
				const mainCids: number[] = [];
				const extraCids: number[] = [];
				const sideCids: number[] = [];

				for (const line of lines) {
					const trimmed = line.trim();
					if (trimmed === "#main") {
						section = "main";
						continue;
					}
					if (trimmed === "#extra") {
						section = "extra";
						continue;
					}
					if (trimmed === "!side") {
						section = "side";
						continue;
					}
					if (trimmed.startsWith("#") || trimmed === "") continue;

					const passcode = trimmed;
					const cidStr = cardDatabase.getCidByPasscode(passcode);
					if (!cidStr) continue;

					const cid = Number(cidStr);
					if (section === "main") {
						mainCids.push(cid);
					} else if (section === "extra") {
						extraCids.push(cid);
					} else if (section === "side") {
						sideCids.push(cid);
					}
				}

				const newName = file.name.replace(/\.ydk$/i, "").substring(0, 22);
				savStore.updateActiveDeck({
					name: newName,
					mainCount: mainCids.length,
					sideCount: sideCids.length,
					extraCount: extraCids.length,
					mainCids: mainCids.slice(0, 60),
					sideCids: sideCids.slice(0, 15),
					extraCids: extraCids.slice(0, 15),
				});
				deckName.value = newName;
			};
			reader.readAsText(file);
			target.value = "";
		}

		return {
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
			exportYdk,
			importYdk,
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
		font-weight: 600;
	}

	&__name-input {
		width: 200px;
	}

	&__actions {
		display: flex;
		gap: 0.5rem;
	}

	&__hidden-input {
		display: none;
	}

	&__body {
		display: flex;
		gap: 0.75rem;
		flex: 1;
		overflow: hidden;
	}

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

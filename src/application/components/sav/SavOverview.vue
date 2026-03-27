<template>
	<div class="sav-overview">
		<h2 class="sav-overview__title">存档总览</h2>

		<!-- 文件信息 -->
		<div class="sav-overview__section">
			<h3 class="sav-overview__section-title">文件信息</h3>
			<table class="sav-overview__table">
				<tbody>
					<tr>
						<td class="sav-overview__label">文件名</td>
						<td>{{ savStore.fileName }}</td>
					</tr>
					<tr>
						<td class="sav-overview__label">文件大小</td>
						<td>{{ fileSizeText }}</td>
					</tr>
					<tr>
						<td class="sav-overview__label">游戏版本</td>
						<td>{{ savStore.gameShortName }} ({{ savStore.gameDisplayName }})</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- 卡组使用情况 -->
		<div class="sav-overview__section">
			<h3 class="sav-overview__section-title">预制卡组</h3>
			<div class="sav-overview__stat-row">
				<span class="sav-overview__stat-label">已用槽位</span>
				<span class="sav-overview__stat-value">
					{{ savStore.usedSlotCount }} / {{ savStore.recipeSlotCount }}
				</span>
			</div>
			<div class="sav-overview__progress-bar">
				<div
					class="sav-overview__progress-fill"
					:style="{ width: slotPercent + '%' }"
				></div>
			</div>
			<div class="sav-overview__slot-list">
				<div
					v-for="(recipe, index) in usedRecipes"
					:key="index"
					class="sav-overview__slot-item"
					@click="goToSlot(recipe.index)"
				>
					<span class="sav-overview__slot-num">#{{ recipe.index }}</span>
					<span class="sav-overview__slot-name">
						{{ recipe.name || '(未命名)' }}
					</span>
					<span class="sav-overview__slot-count">
						{{ recipe.total }} 张
					</span>
				</div>
			</div>
		</div>

		<!-- 活动卡组 -->
		<div v-if="activeDeckInfo" class="sav-overview__section">
			<h3 class="sav-overview__section-title">活动卡组</h3>
			<div class="sav-overview__stat-row">
				<span class="sav-overview__stat-label">卡组名</span>
				<span class="sav-overview__stat-value">
					{{ activeDeckInfo.name || '(未命名)' }}
				</span>
			</div>
			<div class="sav-overview__stat-row">
				<span class="sav-overview__stat-label">主卡组</span>
				<span class="sav-overview__stat-value">{{ activeDeckInfo.mainCount }} 张</span>
			</div>
			<div class="sav-overview__stat-row">
				<span class="sav-overview__stat-label">副卡组</span>
				<span class="sav-overview__stat-value">{{ activeDeckInfo.sideCount }} 张</span>
			</div>
			<div class="sav-overview__stat-row">
				<span class="sav-overview__stat-label">额外卡组</span>
				<span class="sav-overview__stat-value">{{ activeDeckInfo.extraCount }} 张</span>
			</div>
			<button
				class="btn btn-sm btn-outline-primary"
				style="margin-top: 0.5rem"
				@click="goToActiveDeck"
			>
				编辑活动卡组
			</button>
		</div>

		<!-- 卡片收藏 -->
		<div class="sav-overview__section">
			<h3 class="sav-overview__section-title">卡片收藏</h3>
			<div class="sav-overview__stat-row">
				<span class="sav-overview__stat-label">持有种类</span>
				<span class="sav-overview__stat-value">
					{{ savStore.trunkStats.uniqueCount }} / {{ totalCardCount }}
				</span>
			</div>
			<div class="sav-overview__progress-bar">
				<div
					class="sav-overview__progress-fill sav-overview__progress-fill--green"
					:style="{ width: collectionPercent + '%' }"
				></div>
			</div>
			<div class="sav-overview__stat-row">
				<span class="sav-overview__stat-label">总张数</span>
				<span class="sav-overview__stat-value">
					{{ savStore.trunkStats.totalCount }}
				</span>
			</div>
		</div>

		<!-- DP -->
		<div class="sav-overview__section">
			<h3 class="sav-overview__section-title">DP</h3>
			<div class="sav-overview__dp">
				{{ dpFormatted }}
			</div>
		</div>

		<!-- 操作按钮 -->
		<div class="sav-overview__actions">
			<button
				class="btn btn-primary sav-overview__download-btn"
				:disabled="!savStore.isModified"
				@click="savStore.downloadSav()"
			>
				下载修改后存档
			</button>
			<span v-if="savStore.isModified" class="sav-overview__modified-hint">
				存档已修改
			</span>
		</div>
	</div>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import { useSavStore } from "@/application/store/sav";
import { cardDatabase } from "@/data/cardDatabase";

export default defineComponent({
	name: "SavOverview",
	setup() {
		const savStore = useSavStore();

		const slotPercent = computed(() =>
			Math.round((savStore.usedSlotCount / savStore.recipeSlotCount) * 100)
		);

		const fileSizeText = computed(() => {
			if (!savStore.saveData) return "0 KB";
			const bytes = savStore.saveData.rawBuffer.byteLength;
			return `${Math.round(bytes / 1024)} KB`;
		});

		const totalCardCount = computed(() => cardDatabase.size || 2807);

		const collectionPercent = computed(() =>
			Math.round((savStore.trunkStats.uniqueCount / totalCardCount.value) * 100)
		);

		const dpFormatted = computed(() => {
			if (!savStore.saveData) return "0";
			return savStore.saveData.dp.toLocaleString();
		});

		const usedRecipes = computed(() => {
			if (!savStore.saveData) return [];
			return savStore.saveData.recipes
				.map((r, i) => ({
					index: i,
					name: r.name,
					total: r.mainCids.length + r.sideCids.length + r.extraCids.length,
				}))
				.filter((r) => r.total > 0);
		});

		const activeDeckInfo = computed(() => {
			if (!savStore.saveData) return null;
			const deck = savStore.saveData.activeDeck;
			if (deck.mainCids.length === 0 && deck.sideCids.length === 0 && deck.extraCids.length === 0) {
				return null;
			}
			return {
				name: deck.name,
				mainCount: deck.mainCids.length,
				sideCount: deck.sideCids.length,
				extraCount: deck.extraCids.length,
			};
		});

		function goToSlot(slot: number): void {
			savStore.setActiveRecipeSlot(slot);
		}

		function goToActiveDeck(): void {
			savStore.setActivePanel("activeDeck");
		}

		return {
			savStore,
			slotPercent,
			fileSizeText,
			totalCardCount,
			collectionPercent,
			dpFormatted,
			usedRecipes,
			activeDeckInfo,
			goToSlot,
			goToActiveDeck,
		};
	},
});
</script>

<style lang="scss" scoped>
.sav-overview {
	padding: 1.5rem;
	max-width: 700px;

	&__title {
		font-size: 1.4rem;
		font-weight: 700;
		margin-bottom: 1.5rem;
		color: #333;
	}

	&__section {
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: #f9f9f9;
		border-radius: 8px;
	}

	&__section-title {
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 0.75rem;
		color: #444;
	}

	&__table {
		width: 100%;

		td {
			padding: 0.3rem 0;
		}
	}

	&__label {
		color: #888;
		width: 100px;
	}

	&__stat-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.4rem;
	}

	&__stat-label {
		color: #666;
		font-size: 0.9rem;
	}

	&__stat-value {
		font-weight: 600;
		color: #333;
	}

	&__progress-bar {
		height: 8px;
		background: #e0e0e0;
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 0.5rem;
	}

	&__progress-fill {
		height: 100%;
		background: #3f88c5;
		border-radius: 4px;
		transition: width 0.3s ease;

		&--green {
			background: #9ad557;
		}
	}

	&__slot-list {
		max-height: 200px;
		overflow-y: auto;
		margin-top: 0.5rem;
	}

	&__slot-item {
		display: flex;
		align-items: center;
		padding: 0.35rem 0.5rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.85rem;

		&:hover {
			background: #eef4fb;
		}
	}

	&__slot-num {
		width: 30px;
		color: #999;
		font-size: 0.8rem;
	}

	&__slot-name {
		flex: 1;
		color: #444;
	}

	&__slot-count {
		color: #888;
		font-size: 0.8rem;
	}

	&__dp {
		font-size: 1.5rem;
		font-weight: 700;
		color: #e28503;
	}

	&__actions {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-top: 1rem;
	}

	&__download-btn {
		padding: 0.5rem 1.5rem;
	}

	&__modified-hint {
		color: #e28503;
		font-size: 0.85rem;
	}
}

@media (max-width: 768px) {
	.sav-overview {
		max-width: 100%;
		padding: 1rem;

		&__actions {
			flex-direction: column;
			align-items: stretch;
		}

		&__download-btn {
			width: 100%;
		}
	}
}
</style>

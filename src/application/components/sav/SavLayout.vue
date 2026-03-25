<template>
	<div class="sav-layout">
		<!-- 未上传时显示上传界面 -->
		<SavUpload v-if="!savStore.isLoaded" />

		<!-- 已上传后显示编辑界面 -->
		<template v-else>
			<!-- 顶部栏 -->
			<header class="sav-layout__topbar">
				<h1 class="sav-layout__brand">游戏王 WC2009 存档编辑器</h1>
				<div class="sav-layout__topbar-actions">
					<button
						class="btn btn-sm btn-outline-secondary"
						@click="uploadNew"
					>
						上传 .sav
					</button>
					<button
						class="btn btn-sm btn-primary"
						:disabled="!savStore.isModified"
						@click="savStore.downloadSav()"
					>
						下载 .sav
					</button>
					<span v-if="savStore.isModified" class="sav-layout__modified-dot">
					</span>
				</div>
			</header>

			<div class="sav-layout__main">
				<!-- 侧边栏 -->
				<aside class="sav-layout__sidebar">
					<nav class="sav-layout__nav">
						<button
							class="sav-layout__nav-item"
							:class="{ 'sav-layout__nav-item--active': savStore.activePanel === 'overview' }"
							@click="savStore.setActivePanel('overview')"
						>
							存档总览
						</button>
						<button
							class="sav-layout__nav-item"
							:class="{ 'sav-layout__nav-item--active': savStore.activePanel === 'activeDeck' }"
							@click="savStore.setActivePanel('activeDeck')"
						>
							活动卡组
						</button>
						<button
							class="sav-layout__nav-item"
							:class="{ 'sav-layout__nav-item--active': savStore.activePanel === 'recipe' }"
							@click="savStore.setActivePanel('recipe')"
						>
							预制卡组
						</button>
						<button
							class="sav-layout__nav-item"
							:class="{ 'sav-layout__nav-item--active': savStore.activePanel === 'collection' }"
							@click="savStore.setActivePanel('collection')"
						>
							卡片收藏
						</button>
						<button
							class="sav-layout__nav-item"
							:class="{ 'sav-layout__nav-item--active': savStore.activePanel === 'dp' }"
							@click="savStore.setActivePanel('dp')"
						>
							DP 修改
						</button>
					</nav>

					<!-- 当选中预制卡组时，显示卡组列表 -->
					<RecipeList v-if="savStore.activePanel === 'recipe'" />
				</aside>

				<!-- 主内容区 -->
				<main class="sav-layout__content">
					<SavOverview v-if="savStore.activePanel === 'overview'" />
					<ActiveDeckEditor v-else-if="savStore.activePanel === 'activeDeck'" />
					<RecipeEditor v-else-if="savStore.activePanel === 'recipe'" />
					<Collection v-else-if="savStore.activePanel === 'collection'" />
					<DpEditor v-else-if="savStore.activePanel === 'dp'" />
				</main>
			</div>

			<input
				ref="savFileInput"
				type="file"
				accept=".sav"
				class="sav-layout__hidden-input"
				@change="onNewSavFile"
			/>
		</template>
	</div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { useSavStore } from "@/application/store/sav";
import SavUpload from "./SavUpload.vue";
import SavOverview from "./SavOverview.vue";
import RecipeList from "./RecipeList.vue";
import RecipeEditor from "./RecipeEditor.vue";
import ActiveDeckEditor from "./ActiveDeckEditor.vue";
import Collection from "./Collection.vue";
import DpEditor from "./DpEditor.vue";

export default defineComponent({
	name: "SavLayout",
	components: {
		SavUpload,
		SavOverview,
		RecipeList,
		RecipeEditor,
		ActiveDeckEditor,
		Collection,
		DpEditor,
	},
	setup() {
		const savStore = useSavStore();
		const savFileInput = ref<HTMLInputElement | null>(null);

		function uploadNew(): void {
			savFileInput.value?.click();
		}

		async function onNewSavFile(event: Event): Promise<void> {
			const target = event.target as HTMLInputElement;
			if (!target.files || target.files.length === 0) return;
			try {
				await savStore.loadSav(target.files[0]);
			} catch (e) {
				alert(e instanceof Error ? e.message : "文件加载失败");
			}
			target.value = "";
		}

		return {
			savStore,
			savFileInput,
			uploadNew,
			onNewSavFile,
		};
	},
});
</script>

<style lang="scss" scoped>
.sav-layout {
	min-height: 100vh;
	display: flex;
	flex-direction: column;
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
		"Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif;
	color: #333;

	&__topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.6rem 1rem;
		background: #2c3e50;
		color: #fff;
		flex-shrink: 0;
	}

	&__brand {
		font-size: 1.1rem;
		font-weight: 700;
		margin: 0;
	}

	&__topbar-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	&__modified-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #e28503;
		display: inline-block;
	}

	&__main {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	&__sidebar {
		width: 220px;
		background: #f4f5f7;
		border-right: 1px solid #e0e0e0;
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		overflow-y: auto;
	}

	&__nav {
		display: flex;
		flex-direction: column;
		padding: 0.5rem;
		gap: 2px;
	}

	&__nav-item {
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.5rem 0.75rem;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: #555;
		font-size: 0.9rem;
		cursor: pointer;
		transition: background 0.15s;

		&:hover {
			background: #e4e8ed;
		}

		&--active {
			background: #3f88c5;
			color: #fff;
			font-weight: 600;

			&:hover {
				background: #3578b0;
			}
		}
	}

	&__content {
		flex: 1;
		overflow-y: auto;
		background: #fff;
	}

	&__hidden-input {
		display: none;
	}
}
</style>

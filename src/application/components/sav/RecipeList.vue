<template>
	<div class="recipe-list">
		<h3 class="recipe-list__title">预制卡组</h3>

		<div class="recipe-list__actions">
			<button class="btn btn-sm btn-outline-primary" @click="importYdk">
				导入 YDK
			</button>
			<button
				class="btn btn-sm btn-outline-danger"
				:disabled="!hasActiveRecipe"
				@click="clearCurrent"
			>
				清空卡组
			</button>
		</div>

		<div class="recipe-list__slots">
			<div
				v-for="(slot, index) in slots"
				:key="index"
				class="recipe-list__slot"
				:class="{
					'recipe-list__slot--active': index === savStore.activeRecipeSlot,
					'recipe-list__slot--empty': slot.isEmpty,
				}"
				@click="savStore.setActiveRecipeSlot(index)"
			>
				<span class="recipe-list__slot-index">{{ index }}</span>
				<span class="recipe-list__slot-name">
					{{ slot.isEmpty ? '(空)' : (slot.name || '(未命名)') }}
				</span>
				<span v-if="!slot.isEmpty" class="recipe-list__slot-count">
					{{ slot.total }}
				</span>
			</div>
		</div>

		<input
			ref="ydkInput"
			type="file"
			accept=".ydk"
			class="recipe-list__hidden-input"
			@change="onYdkFileChange"
		/>
	</div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from "vue";
import { useSavStore } from "@/application/store/sav";
import { cardDatabase } from "@/data/cardDatabase";

export default defineComponent({
	name: "RecipeList",
	setup() {
		const savStore = useSavStore();
		const ydkInput = ref<HTMLInputElement | null>(null);

		const slots = computed(() => {
			if (!savStore.saveData) return [];
			return savStore.saveData.recipes.map((r) => {
				const total =
					r.mainCids.length + r.sideCids.length + r.extraCids.length;
				return {
					name: r.name,
					total,
					isEmpty: total === 0,
				};
			});
		});

		const hasActiveRecipe = computed(() => {
			const s = slots.value[savStore.activeRecipeSlot];
			return s != null && !s.isEmpty;
		});

		function importYdk(): void {
			ydkInput.value?.click();
		}

		function clearCurrent(): void {
			savStore.clearRecipe(savStore.activeRecipeSlot);
		}

		async function onYdkFileChange(event: Event): Promise<void> {
			const target = event.target as HTMLInputElement;
			if (!target.files || target.files.length === 0) return;

			const file = target.files[0];
			const text = await file.text();
			const recipe = parseYdk(text);

			savStore.updateRecipe(savStore.activeRecipeSlot, recipe);

			// 重置 input 以允许重复选择同一文件
			target.value = "";
		}

		/**
		 * 解析 YDK 文件内容为 CrgyRecipe。
		 */
		function parseYdk(text: string): {
			name: string;
			mainCids: number[];
			sideCids: number[];
			extraCids: number[];
		} {
			const lines = text.split(/\r?\n/);
			const mainCids: number[] = [];
			const sideCids: number[] = [];
			const extraCids: number[] = [];

			let section: "main" | "extra" | "side" = "main";

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
				if (trimmed === "" || trimmed.startsWith("#") || trimmed.startsWith("!")) {
					continue;
				}

				const passcode = trimmed;
				const cidStr = cardDatabase.getCidByPasscode(passcode);
				if (!cidStr) continue;
				const cid = Number(cidStr);

				if (section === "main") {
					mainCids.push(cid);
				} else if (section === "extra") {
					extraCids.push(cid);
				} else {
					sideCids.push(cid);
				}
			}

			return {
				name: "",
				mainCids,
				sideCids,
				extraCids,
			};
		}

		return {
			savStore,
			slots,
			hasActiveRecipe,
			ydkInput,
			importYdk,
			clearCurrent,
			onYdkFileChange,
		};
	},
});
</script>

<style lang="scss" scoped>
.recipe-list {
	padding: 0.5rem;

	&__title {
		font-size: 0.95rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
		color: #444;
	}

	&__actions {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	&__slots {
		overflow-y: auto;
		max-height: calc(100vh - 280px);
	}

	&__slot {
		display: flex;
		align-items: center;
		padding: 0.3rem 0.5rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.8rem;
		transition: background 0.15s;

		&:hover {
			background: #eef4fb;
		}

		&--active {
			background: #dce9f7;
			font-weight: 600;
		}

		&--empty {
			opacity: 0.5;
		}
	}

	&__slot-index {
		width: 24px;
		color: #999;
		font-size: 0.75rem;
		flex-shrink: 0;
	}

	&__slot-name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: #444;
	}

	&__slot-count {
		color: #888;
		font-size: 0.75rem;
		margin-left: 0.25rem;
	}

	&__hidden-input {
		display: none;
	}
}
</style>

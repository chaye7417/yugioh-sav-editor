<template>
	<div class="dp-editor">
		<h2 class="dp-editor__title">DP 修改</h2>

		<div class="dp-editor__card">
			<div class="dp-editor__current">
				<span class="dp-editor__current-label">当前 DP</span>
				<span class="dp-editor__current-value">
					{{ currentDpFormatted }}
				</span>
			</div>

			<div class="dp-editor__input-row">
				<label class="dp-editor__input-label">修改为</label>
				<input
					v-model.number="dpValue"
					type="number"
					class="form-control dp-editor__input"
					min="0"
					max="4294967295"
					@change="onDpChange"
				/>
			</div>

			<div class="dp-editor__presets">
				<span class="dp-editor__presets-label">快捷设置</span>
				<div class="dp-editor__preset-buttons">
					<button
						class="btn btn-sm btn-outline-warning dp-editor__preset-btn"
						@click="setDp(99999)"
					>
						99,999
					</button>
					<button
						class="btn btn-sm btn-outline-warning dp-editor__preset-btn"
						@click="setDp(999999)"
					>
						999,999
					</button>
					<button
						class="btn btn-sm btn-outline-warning dp-editor__preset-btn"
						@click="setDp(9999999)"
					>
						9,999,999
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch } from "vue";
import { useSavStore } from "@/application/store/sav";

export default defineComponent({
	name: "DpEditor",
	setup() {
		const savStore = useSavStore();
		const dpValue = ref(0);

		// 同步 store 中的 DP 到本地
		watch(
			() => savStore.saveData?.dp,
			(newDp) => {
				if (newDp !== undefined) {
					dpValue.value = newDp;
				}
			},
			{ immediate: true }
		);

		const currentDpFormatted = computed(() => {
			if (!savStore.saveData) return "0";
			return savStore.saveData.dp.toLocaleString();
		});

		function onDpChange(): void {
			const val = Math.max(0, Math.min(4294967295, Math.floor(dpValue.value || 0)));
			dpValue.value = val;
			savStore.updateDp(val);
		}

		function setDp(value: number): void {
			dpValue.value = value;
			savStore.updateDp(value);
		}

		return {
			dpValue,
			currentDpFormatted,
			onDpChange,
			setDp,
		};
	},
});
</script>

<style lang="scss" scoped>
.dp-editor {
	padding: 1.5rem;
	max-width: 500px;

	&__title {
		font-size: 1.4rem;
		font-weight: 700;
		margin-bottom: 1.5rem;
		color: #333;
	}

	&__card {
		background: #f9f9f9;
		border-radius: 10px;
		padding: 1.5rem;
	}

	&__current {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	&__current-label {
		display: block;
		font-size: 0.85rem;
		color: #888;
		margin-bottom: 0.25rem;
	}

	&__current-value {
		font-size: 2.5rem;
		font-weight: 700;
		color: #e28503;
	}

	&__input-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	&__input-label {
		font-size: 0.9rem;
		color: #666;
		white-space: nowrap;
	}

	&__input {
		font-size: 1.1rem;
		text-align: right;
	}

	&__presets {
		text-align: center;
	}

	&__presets-label {
		display: block;
		font-size: 0.85rem;
		color: #888;
		margin-bottom: 0.5rem;
	}

	&__preset-buttons {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
	}

	&__preset-btn {
		min-width: 100px;
	}
}
</style>

<template>
	<div class="sav-upload">
		<div class="sav-upload__container">
			<h1 class="sav-upload__title">游戏王 WC2009 存档编辑器</h1>
			<p class="sav-upload__subtitle">
				可视化编辑预制卡组、背包和 DP
			</p>
			<div
				class="sav-upload__dropzone"
				:class="{ 'sav-upload__dropzone--active': isDragging }"
				@click="handleClick"
				@dragenter.prevent="onDragEnter"
				@dragover.prevent="onDragOver"
				@dragleave.prevent="onDragLeave"
				@drop.prevent="onDrop"
			>
				<div class="sav-upload__dropzone-content">
					<svg
						class="sav-upload__icon"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
						/>
						<polyline points="17 8 12 3 7 8" />
						<line x1="12" y1="3" x2="12" y2="15" />
					</svg>
					<p class="sav-upload__text">
						拖拽 .sav 文件到此处，或点击选择文件
					</p>
					<p class="sav-upload__hint">
						支持 WC2009 存档（64 KB）
					</p>
				</div>
			</div>
			<p v-if="errorMessage" class="sav-upload__error">
				{{ errorMessage }}
			</p>
			<input
				ref="fileInput"
				type="file"
				accept=".sav"
				class="sav-upload__input"
				@change="onFileChange"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { useSavStore } from "@/application/store/sav";

const EXPECTED_SIZE = 65536; // 64KB

export default defineComponent({
	name: "SavUpload",
	setup() {
		const savStore = useSavStore();
		const fileInput = ref<HTMLInputElement | null>(null);
		const isDragging = ref(false);
		const errorMessage = ref("");

		function handleClick(): void {
			fileInput.value?.click();
		}

		function onDragEnter(): void {
			isDragging.value = true;
		}

		function onDragOver(): void {
			isDragging.value = true;
		}

		function onDragLeave(): void {
			isDragging.value = false;
		}

		async function processFile(file: File): Promise<void> {
			errorMessage.value = "";

			if (!file.name.toLowerCase().endsWith(".sav")) {
				errorMessage.value = "请选择 .sav 文件";
				return;
			}

			if (file.size !== EXPECTED_SIZE) {
				errorMessage.value = `文件大小应为 64 KB (${EXPECTED_SIZE} 字节)，实际 ${file.size} 字节`;
				return;
			}

			try {
				await savStore.loadSav(file);
			} catch (e) {
				errorMessage.value =
					e instanceof Error ? e.message : "文件解析失败";
			}
		}

		function onDrop(event: DragEvent): void {
			isDragging.value = false;
			const files = event.dataTransfer?.files;
			if (files && files.length > 0) {
				processFile(files[0]);
			}
		}

		function onFileChange(event: Event): void {
			const target = event.target as HTMLInputElement;
			if (target.files && target.files.length > 0) {
				processFile(target.files[0]);
			}
		}

		return {
			fileInput,
			isDragging,
			errorMessage,
			handleClick,
			onDragEnter,
			onDragOver,
			onDragLeave,
			onDrop,
			onFileChange,
		};
	},
});
</script>

<style lang="scss" scoped>
.sav-upload {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 80vh;

	&__container {
		text-align: center;
		max-width: 520px;
		width: 100%;
		padding: 2rem;
	}

	&__title {
		font-size: 1.75rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
		color: #333;
	}

	&__subtitle {
		color: #666;
		margin-bottom: 2rem;
		font-size: 0.95rem;
	}

	&__dropzone {
		border: 2px dashed #bbb;
		border-radius: 12px;
		padding: 3rem 2rem;
		cursor: pointer;
		transition: all 0.2s ease;
		background: #fafafa;

		&:hover {
			border-color: #3f88c5;
			background: #f0f7ff;
		}

		&--active {
			border-color: #3f88c5;
			background: #e8f2ff;
			transform: scale(1.02);
		}
	}

	&__dropzone-content {
		pointer-events: none;
	}

	&__icon {
		width: 48px;
		height: 48px;
		color: #999;
		margin-bottom: 1rem;
	}

	&__text {
		font-size: 1rem;
		color: #555;
		margin-bottom: 0.5rem;
	}

	&__hint {
		font-size: 0.8rem;
		color: #999;
		margin: 0;
	}

	&__error {
		color: #e74b68;
		margin-top: 1rem;
		font-size: 0.9rem;
	}

	&__input {
		display: none;
	}
}
</style>

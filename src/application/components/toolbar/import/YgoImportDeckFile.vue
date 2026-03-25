<template>
	<BDropdownItemButton @click="() => openFileDialog()">
		<span class="fas fa-file fas-in-button" aria-hidden="true"></span>
		导入 YDK 文件
	</BDropdownItemButton>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { ImportResult } from "@/core/lib";
import { getLogger } from "@/core/lib";
import { BDropdownItemButton } from "bootstrap-vue";
import { uploadFile } from "../../../composition/io/uploadFile";
import {
	showError,
	showSuccess,
	showWarning,
	useToast,
} from "../../../composition/feedback";
import { useDeckStore } from "@/application/store/deck";
import { deckFileService } from "@/application/ctx";

const logger = getLogger("YgoImportDeckFile");

export default defineComponent({
	components: { BDropdownItemButton },
	props: {},
	emits: [],
	setup() {
		const deckStore = useDeckStore();

		const toast = useToast();

		const importDeckFile = async (file: File): Promise<ImportResult> => {
			const fileContent = await file.text();
			const result = deckFileService.fromFile({
				fileContent,
				fileName: file.name,
			});
			deckStore.replace({
				deck: result.deck,
			});

			return result;
		};

		const processUpload = (file: File): void => {
			importDeckFile(file)
				.then((result: ImportResult) => {
					if (result.missing.length > 0) {
						showWarning(
							toast,
							`${result.missing.length} 张卡片无法导入！`,
							"deck-tool__portal",
						);
					} else {
						showSuccess(
							toast,
							"卡组文件已导入。",
							"deck-tool__portal",
						);
					}
				})
				.catch((e) => {
					logger.error("Could not read deck file!", e);
					showError(
						toast,
						"读取卡组文件失败。",
						"deck-tool__portal",
					);
				});
		};

		const openFileDialog = (): void =>
			uploadFile(
				".ydk",
				(files) => {
					if (files != null && files.length > 0) {
						processUpload(files[0]);
					}
				},
				document,
			);

		return { openFileDialog };
	},
});
</script>

<template>
	<BDropdownItemButton @click="() => copyList()">
		<span class="fas fa-paragraph fas-in-button" aria-hidden="true"></span>
		复制卡组列表
	</BDropdownItemButton>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { getLogger } from "@/core/lib";
import { BDropdownItemButton } from "bootstrap-vue";
import {
	showError,
	showSuccess,
	useToast,
} from "../../../composition/feedback";
import { useDeckStore } from "@/application/store/deck";
import { storeToRefs } from "pinia";
import { deckExportService } from "@/application/ctx";

const logger = getLogger("YgoExportDeckList");

export default defineComponent({
	components: { BDropdownItemButton },
	props: {},
	emits: [],
	setup() {
		const { deck } = storeToRefs(useDeckStore());

		const toast = useToast();

		const copyList = (): void => {
			const deckList = deckExportService.toShareableText(deck.value);

			navigator.clipboard
				.writeText(deckList)
				.then(() =>
					showSuccess(
						toast,
						"卡组列表已复制到剪贴板。",
						"deck-tool__portal",
					),
				)
				.catch((err) => {
					logger.error("Could not copy deck list!", err);
					showError(
						toast,
						"复制卡组列表失败。",
						"deck-tool__portal",
					);
				});
		};

		return { copyList };
	},
});
</script>

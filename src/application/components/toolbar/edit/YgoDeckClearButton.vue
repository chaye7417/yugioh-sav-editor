<template>
	<BDropdownItemButton v-b-modal.clearDeck :disabled="deckEmpty">
		<span class="fas fa-trash fas-in-button" aria-hidden="true"></span>
		清空
		<BModal
			id="clearDeck"
			modal-class="deck-tool__portal"
			title="清空卡组"
			@ok="() => clear()"
		>
			<p>确定要清空卡组吗？</p>
		</BModal>
	</BDropdownItemButton>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import { BDropdownItemButton, BModal } from "bootstrap-vue";
import { useDeckStore } from "@/application/store/deck";

export default defineComponent({
	components: {
		BModal,
		BDropdownItemButton,
	},
	props: {},
	emits: [],
	setup() {
		const deckStore = useDeckStore();

		const deckEmpty = computed(() => deckStore.deckEmpty);

		const clear = (): void => deckStore.clear();

		return { deckEmpty, clear };
	},
});
</script>

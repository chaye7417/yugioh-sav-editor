<template>
	<div class="form-group">
		<label :for="deckNameId">卡组名称</label>
		<input
			:id="deckNameId"
			v-model="deckName"
			class="form-control"
			placeholder="我的卡组"
			type="text"
		/>
	</div>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import { useId } from "@/application/composition/id";
import { useDeckStore } from "@/application/store/deck";

export default defineComponent({
	components: {},
	props: {},
	emits: [],
	setup() {
		const deckStore = useDeckStore();
		const deckName = computed({
			get: () => deckStore.deck.name,
			set: (newName) => (deckStore.deck.name = newName),
		});

		return { deckNameId: useId(), deckName };
	},
});
</script>

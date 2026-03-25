<template>
	<div class="deck-tool">
		<BOverlay :show="loading">
			<SavLayout />
		</BOverlay>
	</div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from "vue";
import { BOverlay } from "bootstrap-vue";
import SavLayout from "./components/sav/SavLayout.vue";
import { loadCardDatabase } from "@/data/cardDatabase";

export default defineComponent({
	components: {
		BOverlay,
		SavLayout,
	},
	setup() {
		const loading = ref(true);

		onMounted(async () => {
			try {
				await loadCardDatabase();
			} catch (e) {
				console.error("加载卡片数据失败", e);
			} finally {
				loading.value = false;
			}
		});

		return { loading };
	},
});
</script>

<style lang="scss">
.deck-tool {
	min-height: 100vh;
}
</style>

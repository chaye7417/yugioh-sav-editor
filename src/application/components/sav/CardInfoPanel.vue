<template>
	<div class="card-info-panel">
		<div v-if="!store.info" class="card-info-panel__empty">
			悬停卡片查看详情
		</div>
		<template v-else>
			<img
				:src="imgUrl"
				class="card-info-panel__img"
			/>
			<div class="card-info-panel__name">{{ store.info.name }}</div>

			<div v-if="!store.info.inWc2009" class="card-info-panel__warn">
				不在 {{ gameShortName }} 卡池
			</div>

			<div class="card-info-panel__meta">
				<div v-if="store.info.type" class="card-info-panel__type">
					{{ store.info.type }}
					<template v-if="store.info.subType"> / {{ store.info.subType }}</template>
				</div>
				<div v-if="store.info.isMonster" class="card-info-panel__stats">
					<span>{{ store.info.attribute }}</span>
					<span>{{ store.info.race }}</span>
					<span>Lv.{{ store.info.level }}</span>
				</div>
				<div v-if="store.info.isMonster" class="card-info-panel__atk">
					ATK/{{ store.info.atk === -2 ? '?' : store.info.atk }}
					DEF/{{ store.info.def === -2 ? '?' : store.info.def }}
				</div>
				<div v-if="store.info.desc" class="card-info-panel__desc">{{ store.info.desc }}</div>
			</div>
		</template>
	</div>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import { useCardHoverStore } from "@/application/store/cardHover";
import { useSavStore } from "@/application/store/sav";

const CARD_IMG_BASE = "https://cdn.233.momobako.com/ygopro/pics/";

export default defineComponent({
	name: "CardInfoPanel",
	setup() {
		const store = useCardHoverStore();
		const savStore = useSavStore();
		const imgUrl = computed(() =>
			store.artworkId ? `${CARD_IMG_BASE}${store.artworkId}.jpg` : "",
		);
		const gameShortName = computed(() => savStore.gameShortName);
		return { store, imgUrl, gameShortName };
	},
});
</script>

<style lang="scss" scoped>
.card-info-panel {
	width: 220px;
	min-width: 220px;
	border-left: 1px solid #e0e0e0;
	padding: 0.6rem;
	overflow-y: auto;
	background: #fafbfc;
	display: flex;
	flex-direction: column;
	align-items: center;

	&__empty {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: #bbb;
		font-size: 0.8rem;
		text-align: center;
	}

	&__img {
		width: 180px;
		border-radius: 4px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		margin-bottom: 0.5rem;
	}

	&__name {
		font-size: 0.9rem;
		font-weight: 700;
		color: #2c3e50;
		text-align: center;
		margin-bottom: 0.4rem;
		word-break: break-all;
	}

	&__warn {
		font-size: 0.75rem;
		color: #e67e22;
		font-weight: 600;
		text-align: center;
		margin-bottom: 0.3rem;
	}

	&__meta {
		width: 100%;
		font-size: 0.75rem;
		color: #555;
	}

	&__type {
		text-align: center;
		color: #666;
		margin-bottom: 0.25rem;
	}

	&__stats {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		margin-bottom: 0.2rem;
		font-weight: 600;
		color: #444;
	}

	&__atk {
		text-align: center;
		font-weight: 600;
		color: #c0392b;
		margin-bottom: 0.4rem;
	}

	&__desc {
		font-size: 0.72rem;
		color: #444;
		line-height: 1.45;
		white-space: pre-wrap;
		border-top: 1px solid #e0e0e0;
		padding-top: 0.4rem;
	}
}
</style>

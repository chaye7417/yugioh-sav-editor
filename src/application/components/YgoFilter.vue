<template>
	<form @submit.prevent="() => {}">
		<div v-if="isFieldVisible('search')" class="form-group">
			<label :for="nameId">卡名</label>
			<input
				:id="nameId"
				v-model="internalFilter.name"
				class="form-control"
				type="search"
				@input="() => onFilterChanged()"
			/>
		</div>

		<div v-if="isFieldVisible('description')" class="form-group">
			<label :for="descriptionId">描述/效果</label>
			<input
				:id="descriptionId"
				v-model="internalFilter.description"
				class="form-control"
				type="search"
				@input="() => onFilterChanged()"
			/>
		</div>

		<div
			v-if="isFieldVisible('banState')"
			v-show="hasBanStates"
			class="form-group"
		>
			<VSelect
				v-model="internalFilter.banState"
				:get-option-key="getBanStateName"
				:get-option-label="getBanStateName"
				:options="banStates"
				:searchable="false"
				@input="() => onFilterChanged()"
			>
				<template #header>
					<label>禁限</label>
				</template>
			</VSelect>
		</div>

		<div
			v-if="isFieldVisible('sets') && essentialDataLoaded"
			class="form-group"
		>
			<VSelect
				v-model="internalFilter.sets"
				:get-option-key="getSetName"
				:get-option-label="getSetName"
				multiple
				:options="sets"
				@input="() => onFilterChanged()"
			>
				<template #header>
					<label>卡包</label>
				</template>
			</VSelect>
		</div>

		<div
			v-if="isFieldVisible('archetype') && essentialDataLoaded"
			class="form-group"
		>
			<VSelect
				v-model="internalFilter.archetype"
				:options="archetypes"
				@input="() => onFilterChanged()"
			>
				<template #header>
					<label>系列</label>
				</template>
			</VSelect>
		</div>

		<div v-if="isFieldVisible('typeCategory')" class="form-group">
			<VSelect
				v-model="internalFilter.typeCategory"
				:options="cardTypeCategories"
				:searchable="false"
				@input="() => onFilterChanged()"
			>
				<template #header>
					<label>类型</label>
				</template>
			</VSelect>
		</div>

		<div
			v-if="isFieldVisible('type') && essentialDataLoaded"
			v-show="isMonster"
			class="form-group"
		>
			<VSelect
				v-model="internalFilter.type"
				:get-option-key="getTypeName"
				:get-option-label="getTypeLabel"
				:options="types"
				@input="() => onFilterChanged()"
			>
				<template #header>
					<label>怪兽类型</label>
				</template>
			</VSelect>
		</div>

		<div
			v-if="isFieldVisible('subType') && essentialDataLoaded"
			v-show="internalFilter.typeCategory != null"
			class="form-group"
		>
			<VSelect
				v-model="internalFilter.subType"
				:options="subTypes"
				@input="() => onFilterChanged()"
			>
				<template #header>
					<label>子类型</label>
				</template>
			</VSelect>
		</div>

		<div
			v-show="isMonster"
			v-if="isFieldVisible('attribute') && essentialDataLoaded"
			class="form-group"
		>
			<VSelect
				v-model="internalFilter.attribute"
				:options="attributes"
				@input="() => onFilterChanged()"
			>
				<template #header>
					<label>属性</label>
				</template>
			</VSelect>
		</div>

		<div
			v-if="isFieldVisible('level') && essentialDataLoaded"
			v-show="isMonster"
			class="form-group"
		>
			<VSelect
				v-model="internalFilter.level"
				:options="levels"
				:searchable="false"
				@input="() => onFilterChanged()"
			>
				<template #header>
					<label>等级/阶级</label>
				</template>
			</VSelect>
		</div>

		<div
			v-if="isFieldVisible('linkMarkers') && essentialDataLoaded"
			v-show="isMonster"
			class="form-group"
		>
			<VSelect
				v-model="internalFilter.linkMarkers"
				multiple
				:options="linkMarkers"
				@input="() => onFilterChanged()"
			>
				<template #header>
					<label>连接标记</label>
				</template>
			</VSelect>
		</div>

		<template v-if="isFieldVisible('reset')">
			<hr />
			<button class="btn btn-danger" @click="() => resetFilter()">
				<span
					class="fas fas-in-button fa-trash"
					aria-hidden="true"
				></span>
				重置筛选
			</button>
		</template>
	</form>
</template>

<script lang="ts">
import type {
	BanState,
	CardFilter,
	CardSet,
	CardType,
} from "@/core/lib";
import {
	CardTypeCategory,
	DEFAULT_BAN_STATE_ARR,
} from "@/core/lib";
import type { PropType } from "vue";
import { computed, defineComponent, reactive, watch } from "vue";
import { clone } from "lodash";

import VSelect from "vue-select";
import { useId } from "@/application/composition/id";
import { useDataStore } from "@/application/store/data";
import { useFormatStore } from "@/application/store/format";
import { storeToRefs } from "pinia";
import {
	banlistService,
	cardDatabase,
	filterService,
} from "@/application/ctx";

export default defineComponent({
	components: {
		VSelect,
	},
	model: {
		prop: "filter",
		event: "change",
	},
	props: {
		filter: {
			required: true,
			type: Object as PropType<CardFilter>,
		},
		showOnly: {
			required: false,
			type: Array as PropType<string[] | null>,
			default: null,
		},
	},
	emits: ["change"],
	setup: function (props, context) {
		const { format } = storeToRefs(useFormatStore());

		const { essentialDataLoaded } = storeToRefs(useDataStore());

		const banStates = DEFAULT_BAN_STATE_ARR;
		const cardTypeCategories = Object.values(CardTypeCategory);

		const internalFilter = reactive<CardFilter>(clone(props.filter));

		const sets = computed<CardSet[]>(() => cardDatabase.getSets());
		const archetypes = computed<string[]>(() =>
			cardDatabase.getArchetypes(),
		);
		const types = computed<CardType[]>(() =>
			internalFilter.typeCategory != null
				? cardDatabase.getTypes(internalFilter.typeCategory)
				: [],
		);
		const subTypes = computed<string[]>(() =>
			internalFilter.typeCategory != null
				? cardDatabase.getSubTypes(internalFilter.typeCategory)
				: [],
		);
		const attributes = computed<string[]>(() =>
			cardDatabase.getAttributes(),
		);
		const levels = computed<number[]>(() => cardDatabase.getLevels());
		const linkMarkers = computed<string[]>(() =>
			cardDatabase.getLinkMarkers(),
		);

		const hasBanStates = computed<boolean>(() => {
			if (format.value == null) {
				return false;
			}
			return banlistService.hasBanlist(format.value);
		});
		const isMonster = computed<boolean>(
			() => internalFilter.typeCategory === CardTypeCategory.MONSTER,
		);

		const resetFilter = (): void => {
			Object.assign(internalFilter, filterService.createDefaultFilter());
			onFilterChanged();
		};

		const isFieldVisible = (fieldName: string): boolean =>
			props.showOnly == null || props.showOnly.includes(fieldName);

		const onFilterChanged = (): void =>
			context.emit("change", clone(internalFilter));

		const getBanStateName = (banState: BanState): string => banState.name;
		const getSetName = (set: CardSet): string => set.name;
		const getTypeName = (type: CardType): string => type.name;
		const getTypeLabel = (type: CardType): string =>
			type.name.replace(" Monster", "");

		watch(
			() => internalFilter.typeCategory,
			() => {
				internalFilter.type = null;
				internalFilter.subType = null;
				internalFilter.attribute = null;
				internalFilter.level = null;
				internalFilter.linkMarkers = [];
			},
		);
		watch(
			() => hasBanStates.value,
			() => {
				internalFilter.banState = null;
			},
		);

		return {
			nameId: useId(),
			descriptionId: useId(),

			banStates,
			sets,
			archetypes,
			cardTypeCategories,
			types,
			subTypes,
			attributes,
			levels,
			linkMarkers,

			internalFilter,

			essentialDataLoaded,
			hasBanStates,
			isMonster,
			resetFilter,
			onFilterChanged,
			isFieldVisible,
			getBanStateName,
			getSetName,
			getTypeName,
			getTypeLabel,
		};
	},
});
</script>

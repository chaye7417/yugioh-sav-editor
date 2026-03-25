/**
 * 存档状态管理 (Pinia Store)。
 *
 * 管理 WC2009 .sav 文件的加载、编辑和下载。
 */

import { defineStore } from "pinia";
import type { SaveData, CrgyRecipe } from "@/core/sav";
import { parseSav, writeSav, setCardCount, setAllCards, readTrunk, getTrunkStats } from "@/core/sav";
import { cardDatabase, type CardEntry } from "@/data/cardDatabase";

/** 当前激活的面板 */
export type ActivePanel = "overview" | "recipe" | "collection" | "dp";

interface SavState {
	/** 上传的文件名 */
	fileName: string | null;
	/** 原始 .sav 数据 */
	originalBuffer: ArrayBuffer | null;
	/** 解析后的存档数据 */
	saveData: SaveData | null;
	/** 是否有未保存的修改 */
	isModified: boolean;
	/** 当前面板 */
	activePanel: ActivePanel;
	/** 当前编辑的卡组槽位 */
	activeRecipeSlot: number;
}

export const useSavStore = defineStore("sav", {
	state(): SavState {
		return {
			fileName: null,
			originalBuffer: null,
			saveData: null,
			isModified: false,
			activePanel: "overview",
			activeRecipeSlot: 0,
		};
	},

	getters: {
		/** 存档是否已加载 */
		isLoaded: (state): boolean => state.saveData !== null,

		/** 当前选中槽位的卡组 */
		activeRecipe(state): CrgyRecipe | null {
			if (!state.saveData) return null;
			return state.saveData.recipes[state.activeRecipeSlot] ?? null;
		},

		/** 已使用的卡组槽位数 */
		usedSlotCount(state): number {
			if (!state.saveData) return 0;
			return state.saveData.recipes.filter(
				(r) => r.mainCids.length > 0 || r.sideCids.length > 0 || r.extraCids.length > 0
			).length;
		},

		/** 背包统计 */
		trunkStats(state): { uniqueCount: number; totalCount: number } {
			if (!state.saveData) return { uniqueCount: 0, totalCount: 0 };
			const cidToNibble = buildCidToNibbleMap();
			const trunk = readTrunk(state.saveData.gamedata, cidToNibble);
			return getTrunkStats(trunk);
		},
	},

	actions: {
		/**
		 * 加载 .sav 文件。
		 *
		 * @param file - 用户上传的文件
		 */
		async loadSav(file: File): Promise<void> {
			const buffer = await file.arrayBuffer();
			const saveData = parseSav(buffer);
			this.fileName = file.name;
			this.originalBuffer = buffer;
			this.saveData = saveData;
			this.isModified = false;
			this.activePanel = "overview";
			this.activeRecipeSlot = 0;
		},

		/**
		 * 下载修改后的 .sav 文件。
		 */
		downloadSav(): void {
			if (!this.originalBuffer || !this.saveData) return;

			const buffer = writeSav(this.originalBuffer, this.saveData);
			const blob = new Blob([buffer], { type: "application/octet-stream" });
			const name = this.fileName ?? "modified.sav";
			const url = URL.createObjectURL(blob);

			const el = document.createElement("a");
			el.href = url;
			el.download = name;
			document.body.appendChild(el);
			el.click();
			el.remove();
			URL.revokeObjectURL(url);

			// 下载后更新原始 buffer
			this.originalBuffer = buffer;
			this.isModified = false;
		},

		/**
		 * 修改指定槽位的预制卡组。
		 *
		 * @param slot - 槽位索引 (0-49)
		 * @param recipe - 新的卡组数据
		 */
		updateRecipe(slot: number, recipe: CrgyRecipe): void {
			if (!this.saveData) return;
			this.saveData.recipes[slot] = recipe;
			this.isModified = true;
		},

		/**
		 * 清空指定槽位。
		 *
		 * @param slot - 槽位索引 (0-49)
		 */
		clearRecipe(slot: number): void {
			if (!this.saveData) return;
			this.saveData.recipes[slot] = {
				name: "",
				mainCids: [],
				sideCids: [],
				extraCids: [],
			};
			this.isModified = true;
		},

		/**
		 * 修改卡片持有数量。
		 *
		 * @param cid - Konami CID
		 * @param quantity - 目标数量 (0-9)
		 */
		updateCollection(cid: number, quantity: number): void {
			if (!this.saveData) return;
			const card = cardDatabase.getByCid(String(cid));
			if (!card) return;
			setCardCount(this.saveData.gamedata, card.nibbleIndex, quantity);
			this.isModified = true;
		},

		/**
		 * 一键设置所有卡片为指定数量。
		 *
		 * @param quantity - 目标数量 (默认 3)
		 */
		setAllCardsQuantity(quantity: number = 3): void {
			if (!this.saveData) return;
			const cidToNibble = buildCidToNibbleMap();
			setAllCards(this.saveData.gamedata, cidToNibble, quantity);
			this.isModified = true;
		},

		/**
		 * 修改 DP 值。
		 *
		 * @param value - 新的 DP 值
		 */
		updateDp(value: number): void {
			if (!this.saveData) return;
			this.saveData.dp = Math.max(0, Math.min(0xFFFFFFFF, Math.floor(value)));
			this.isModified = true;
		},

		/**
		 * 切换面板。
		 */
		setActivePanel(panel: ActivePanel): void {
			this.activePanel = panel;
		},

		/**
		 * 切换编辑的卡组槽位。
		 */
		setActiveRecipeSlot(slot: number): void {
			this.activeRecipeSlot = slot;
			this.activePanel = "recipe";
		},
	},
});

/**
 * 构建 CID → nibbleIndex 映射。
 * 从已加载的 cardDatabase 获取。
 */
function buildCidToNibbleMap(): Map<number, number> {
	const map = new Map<number, number>();
	for (const [cidStr, card] of cardDatabase.getAllEntries()) {
		map.set(Number(cidStr), card.nibbleIndex);
	}
	return map;
}

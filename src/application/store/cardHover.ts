/**
 * 卡片悬停状态管理 (Pinia Store)。
 *
 * 全局共享当前悬停的卡片信息，供 CardInfoPanel 显示。
 */

import { defineStore } from "pinia";
import { cardDatabase } from "@/data/cardDatabase";
import { getMainType, getSubTypeDescription, getRaceName, getAttributeName } from "@/data/i18n";

export interface CardDisplayInfo {
	name: string;
	desc: string;
	type: string;
	subType: string;
	race: string;
	attribute: string;
	atk: number;
	def: number;
	level: number;
	passcode: string;
	isMonster: boolean;
	inWc2009: boolean;
}

/** 额外卡片数据（不在当前版本卡池中的卡） */
interface ExtraCardRaw {
	n: string; d: string; t: number; a: number; f: number;
	l: number; r: number; b: number;
}

let extraCards: Record<string, ExtraCardRaw> = {};
let extraLoaded = false;

async function ensureExtraCards(): Promise<void> {
	if (extraLoaded) return;
	extraLoaded = true;
	try {
		const resp = await fetch(`${import.meta.env.BASE_URL}fl-extra-cards.json`);
		extraCards = await resp.json();
	} catch { /* 静默失败 */ }
}

function buildInfo(
	name: string, desc: string, typeBits: number,
	atk: number, def: number, level: number,
	race: number, attribute: number, passcode: string, inWc2009: boolean,
): CardDisplayInfo {
	return {
		name, desc,
		type: getMainType(typeBits),
		subType: getSubTypeDescription(typeBits),
		race: getRaceName(race),
		attribute: getAttributeName(attribute),
		atk, def, level, passcode,
		isMonster: (typeBits & 0x1) !== 0,
		inWc2009,
	};
}

export const useCardHoverStore = defineStore("cardHover", {
	state() {
		return {
			artworkId: null as number | null,
			info: null as CardDisplayInfo | null,
		};
	},

	actions: {
		/**
		 * 设置当前悬停的卡片。
		 * 任何组件中的卡片都可以调用此方法。
		 *
		 * @param id - artworkId / passcode
		 */
		async hover(id: number): Promise<void> {
			if (this.artworkId === id) return;
			this.artworkId = id;

			const pc = String(id);

			// 先查当前版本数据库
			const card = cardDatabase.getByPasscode(pc);
			if (card) {
				this.info = buildInfo(card.name, card.desc, card.type, card.atk, card.def, card.level, card.race, card.attribute, pc, true);
				return;
			}

			// 查额外卡片数据
			await ensureExtraCards();
			const extra = extraCards[pc];
			if (extra) {
				this.info = buildInfo(extra.n, extra.d, extra.t, extra.a, extra.f, extra.l, extra.r, extra.b, pc, false);
				return;
			}

			// 都查不到
			this.info = {
				name: "未知卡片", desc: "", type: "", subType: "",
				race: "", attribute: "", atk: 0, def: 0, level: 0,
				passcode: pc, isMonster: false, inWc2009: false,
			};
		},
	},
});

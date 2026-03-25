/**
 * WC2009 卡池兼容性检查工具。
 *
 * 检查 Format Library 卡组中的卡片是否存在于 WC2009 卡池中。
 */

import { cardDatabase } from "./cardDatabase";

// ============================================================
// 类型定义
// ============================================================

/** 兼容性检查结果 */
export interface CompatResult {
  /** 卡组总卡片数 */
  totalCards: number;
  /** WC2009 卡池中存在的卡数 */
  compatibleCards: number;
  /** 不在卡池中的卡 */
  incompatibleCards: { name: string; passcode: string }[];
  /** 兼容百分比 0-100 */
  percentage: number;
  /** 是否完全兼容 */
  isFullyCompatible: boolean;
}

/** 输入卡片信息（与 DeckCard 兼容） */
export interface CompatCardInput {
  name: string;
  artworkId: number;
}

// ============================================================
// 公开函数
// ============================================================

/**
 * 检查一组卡片的 WC2009 兼容性。
 *
 * 遍历卡组中每张卡，用 cardDatabase.getCidByPasscode() 检查
 * 是否在 WC2009 卡池中。
 *
 * @param cards - 卡组中所有卡（含 artworkId 即 passcode）
 * @returns 兼容性检查结果
 */
export function checkWc2009Compat(cards: CompatCardInput[]): CompatResult {
  const totalCards = cards.length;
  const incompatibleCards: { name: string; passcode: string }[] = [];
  const seen = new Set<number>();

  for (const card of cards) {
    // 每个 passcode 只检查一次不兼容性，但总数仍计入
    if (seen.has(card.artworkId)) {
      // 已检查过，如果不兼容则已记录
      continue;
    }
    seen.add(card.artworkId);

    const cid = cardDatabase.getCidByPasscode(String(card.artworkId));
    if (!cid) {
      incompatibleCards.push({
        name: card.name,
        passcode: String(card.artworkId),
      });
    }
  }

  // 统计不兼容卡的总出现次数
  const incompatiblePasscodes = new Set(incompatibleCards.map((c) => c.passcode));
  let incompatibleCount = 0;
  for (const card of cards) {
    if (incompatiblePasscodes.has(String(card.artworkId))) {
      incompatibleCount++;
    }
  }

  const compatibleCards = totalCards - incompatibleCount;
  const percentage = totalCards > 0
    ? Math.round((compatibleCards / totalCards) * 100)
    : 100;

  return {
    totalCards,
    compatibleCards,
    incompatibleCards,
    percentage,
    isFullyCompatible: incompatibleCards.length === 0,
  };
}

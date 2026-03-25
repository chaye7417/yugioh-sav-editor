/**
 * CID / passcode / nibbleIndex 三者之间的映射查询工具。
 *
 * 依赖 CardDatabase 已加载的数据，提供便捷的双向查询。
 */

import { cardDatabase, type CardEntry } from "./cardDatabase";

// ============================================================
// CID → passcode
// ============================================================

/**
 * 通过 CID 获取 passcode。
 *
 * @param cid - Konami CID（字符串）
 * @returns passcode 字符串，不存在返回 undefined
 */
export function getPasscodeByCid(cid: string): string | undefined {
  return cardDatabase.getByCid(cid)?.passcode;
}

// ============================================================
// passcode → CID
// ============================================================

/**
 * 通过 passcode 获取 CID。
 *
 * @param passcode - YGOPro 密码
 * @returns CID 字符串，不存在返回 undefined
 */
export function getCidByPasscode(passcode: string): string | undefined {
  return cardDatabase.getCidByPasscode(passcode);
}

// ============================================================
// CID → nibbleIndex
// ============================================================

/**
 * 通过 CID 获取 nibbleIndex。
 *
 * @param cid - Konami CID（字符串）
 * @returns nibbleIndex 数值，不存在返回 undefined
 */
export function getNibbleIndexByCid(cid: string): number | undefined {
  return cardDatabase.getByCid(cid)?.nibbleIndex;
}

// ============================================================
// nibbleIndex → CID
// ============================================================

/**
 * 通过 nibbleIndex 获取 CID。
 *
 * @param nibbleIndex - WC2009 nibble 数组中的索引
 * @returns CID 字符串，不存在返回 undefined
 */
export function getCidByNibbleIndex(nibbleIndex: number): string | undefined {
  const card = cardDatabase.getByNibbleIndex(nibbleIndex);
  if (!card) return undefined;
  return cardDatabase.getCidByPasscode(card.passcode);
}

// ============================================================
// nibbleIndex → passcode
// ============================================================

/**
 * 通过 nibbleIndex 获取 passcode。
 *
 * @param nibbleIndex - WC2009 nibble 数组中的索引
 * @returns passcode 字符串，不存在返回 undefined
 */
export function getPasscodeByNibbleIndex(
  nibbleIndex: number
): string | undefined {
  return cardDatabase.getByNibbleIndex(nibbleIndex)?.passcode;
}

// ============================================================
// passcode → nibbleIndex
// ============================================================

/**
 * 通过 passcode 获取 nibbleIndex。
 *
 * @param passcode - YGOPro 密码
 * @returns nibbleIndex 数值，不存在返回 undefined
 */
export function getNibbleIndexByPasscode(
  passcode: string
): number | undefined {
  return cardDatabase.getByPasscode(passcode)?.nibbleIndex;
}

// ============================================================
// 批量工具
// ============================================================

/**
 * 将 nibbleIndex 数组转换为 CardEntry 数组。
 * 用于解析存档中的卡组数据。
 *
 * @param nibbleIndices - nibbleIndex 数组
 * @returns CardEntry 数组（跳过不存在的索引）
 */
export function nibbleIndicesToCards(
  nibbleIndices: number[]
): CardEntry[] {
  const cards: CardEntry[] = [];
  for (const idx of nibbleIndices) {
    const card = cardDatabase.getByNibbleIndex(idx);
    if (card) {
      cards.push(card);
    }
  }
  return cards;
}

/**
 * 将 CardEntry 数组转换为 nibbleIndex 数组。
 * 用于写回存档中的卡组数据。
 *
 * @param cards - CardEntry 数组
 * @returns nibbleIndex 数组
 */
export function cardsToNibbleIndices(cards: CardEntry[]): number[] {
  return cards.map((card) => card.nibbleIndex);
}

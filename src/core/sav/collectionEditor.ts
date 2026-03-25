/**
 * 卡片收藏编辑器 (nibble 数组操作)。
 *
 * 从 Python collection_editor.py 精确重写。
 *
 * 解压后 gamedata 中的半字节数组:
 * - 每个 nibble (4 bit) 表示一张卡的持有数量 (0-9)
 * - 低 nibble = 偶数索引, 高 nibble = 奇数索引
 */

import type { CardCollection, TrunkCard } from "./types";
import { GD_NIBBLE_ARRAY, COUNT_MAX } from "./constants";

/**
 * 读取指定卡片的持有数量。
 *
 * @param gamedata - 解压后的 gamedata
 * @param nibbleIndex - 该卡在 nibble 数组中的索引
 * @returns 持有数量 (0-9)
 */
export function getCardCount(
  gamedata: Uint8Array,
  nibbleIndex: number,
): number {
  const byteOffset = GD_NIBBLE_ARRAY + Math.floor(nibbleIndex / 2);
  if (byteOffset >= gamedata.length) return 0;

  const byte = gamedata[byteOffset];
  if (nibbleIndex % 2 === 0) {
    return byte & 0x0f;
  } else {
    return (byte >>> 4) & 0x0f;
  }
}

/**
 * 设置指定卡片的持有数量。
 *
 * @param gamedata - 可变的解压后 gamedata
 * @param nibbleIndex - 该卡在 nibble 数组中的索引
 * @param count - 目标数量 (会被 clamp 到 0-9)
 */
export function setCardCount(
  gamedata: Uint8Array,
  nibbleIndex: number,
  count: number,
): void {
  const byteOffset = GD_NIBBLE_ARRAY + Math.floor(nibbleIndex / 2);
  if (byteOffset >= gamedata.length) return;

  const clampedCount = Math.max(0, Math.min(COUNT_MAX, count));
  let byte = gamedata[byteOffset];

  if (nibbleIndex % 2 === 0) {
    byte = (byte & 0xf0) | (clampedCount & 0x0f);
  } else {
    byte = (byte & 0x0f) | ((clampedCount & 0x0f) << 4);
  }

  gamedata[byteOffset] = byte;
}

/**
 * 批量注入卡片到收藏。
 *
 * @param gamedata - 可变的解压后 gamedata
 * @param cards - CID → nibbleIndex 映射 (仅包含要修改的卡)
 * @param count - 设置的持有数量 (默认 3)
 * @returns 成功注入的卡片数
 */
export function injectCards(
  gamedata: Uint8Array,
  cards: Map<number, number>,
  count: number = 3,
): number {
  let injected = 0;
  for (const [, nibbleIndex] of cards) {
    setCardCount(gamedata, nibbleIndex, count);
    injected++;
  }
  return injected;
}

/**
 * 读取所有持有卡片。
 *
 * @param gamedata - 解压后的 gamedata
 * @param cidToNibble - CID → nibbleIndex 的完整映射
 * @returns 持有卡片列表 (仅 count > 0 的)
 */
export function readCollection(
  gamedata: Uint8Array,
  cidToNibble: Map<number, number>,
): TrunkCard[] {
  const result: TrunkCard[] = [];
  for (const [cid, nibbleIndex] of cidToNibble) {
    const count = getCardCount(gamedata, nibbleIndex);
    if (count > 0) {
      result.push({ cid, count });
    }
  }
  return result.sort((a, b) => a.cid - b.cid);
}

/**
 * 一键设置所有卡片为指定数量。
 *
 * @param gamedata - 可变的解压后 gamedata
 * @param cidToNibble - CID → nibbleIndex 的完整映射
 * @param count - 目标数量 (默认 3)
 * @returns 修改的卡片数
 */
export function setAllCards(
  gamedata: Uint8Array,
  cidToNibble: Map<number, number>,
  count: number = 3,
): number {
  return injectCards(gamedata, cidToNibble, count);
}

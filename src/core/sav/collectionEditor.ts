/**
 * 卡片收藏编辑器 (nibble 数组操作)。
 *
 * 从 Python collection_editor.py 精确重写。
 *
 * 解压后 gamedata 中的半字节数组:
 * - 每个 nibble (4 bit) 表示一张卡的持有数量 (0-9)
 * - 低 nibble = 偶数索引, 高 nibble = 奇数索引
 */

import type { TrunkCard } from "./types";
import { COUNT_MAX } from "./constants";

/**
 * 读取指定卡片的持有数量。
 *
 * @param gamedata - 解压后的 gamedata
 * @param nibbleIndex - 该卡在 nibble 数组中的索引
 * @param nibbleBase - nibble 数组在 gamedata 中的偏移（WC2008: 0x65A, WC2009: 0xA4E）
 * @returns 持有数量 (0-9)
 */
export function getCardCount(
  gamedata: Uint8Array,
  nibbleIndex: number,
  nibbleBase: number,
): number {
  const byteOffset = nibbleBase + Math.floor(nibbleIndex / 2);
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
 * @param nibbleBase - nibble 数组在 gamedata 中的偏移
 */
export function setCardCount(
  gamedata: Uint8Array,
  nibbleIndex: number,
  count: number,
  nibbleBase: number,
): void {
  const byteOffset = nibbleBase + Math.floor(nibbleIndex / 2);
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
 * 一键设置所有卡片为指定数量。
 *
 * @param gamedata - 可变的解压后 gamedata
 * @param cidToNibble - CID → nibbleIndex 的完整映射
 * @param count - 目标数量 (默认 3)
 * @param nibbleBase - nibble 数组在 gamedata 中的偏移
 * @returns 修改的卡片数
 */
export function setAllCards(
  gamedata: Uint8Array,
  cidToNibble: Map<number, number>,
  count: number = 3,
  nibbleBase: number = 0xa4e,
): number {
  let modified = 0;
  for (const [, nibbleIndex] of cidToNibble) {
    setCardCount(gamedata, nibbleIndex, count, nibbleBase);
    modified++;
  }
  return modified;
}

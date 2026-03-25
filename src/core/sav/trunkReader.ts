/**
 * 背包读取模块。
 *
 * 从 Python trunk_reader.py 重写。
 * 在 Web 版中，背包数据从 .sav 的 TDGY gamedata 中读取 (通过 nibble 数组)，
 * 不依赖 savestate。
 */

import type { TrunkCard, CardCollection } from "./types";
import { GD_NIBBLE_ARRAY, CID_MIN, CID_MAX, COUNT_MAX } from "./constants";
import { getCardCount } from "./collectionEditor";

/**
 * 从解压后的 gamedata 读取背包卡片列表。
 *
 * 通过 CID → nibbleIndex 映射遍历所有卡片，
 * 读取每张卡的持有数量。
 *
 * @param gamedata - 解压后的 gamedata
 * @param cidToNibble - CID → nibbleIndex 映射
 * @returns 持有数量 > 0 的卡片列表 (按 CID 排序)
 */
export function readTrunk(
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
 * 从背包卡片列表转换为 CardCollection Map。
 *
 * @param cards - TrunkCard 列表
 * @returns CID → count 的 Map
 */
export function trunkToCollection(cards: TrunkCard[]): CardCollection {
  const collection: CardCollection = new Map();
  for (const card of cards) {
    collection.set(card.cid, card.count);
  }
  return collection;
}

/**
 * 获取背包统计信息。
 *
 * @param cards - TrunkCard 列表
 * @returns 统计对象
 */
export function getTrunkStats(cards: TrunkCard[]): {
  uniqueCount: number;
  totalCount: number;
} {
  let totalCount = 0;
  for (const card of cards) {
    totalCount += card.count;
  }
  return {
    uniqueCount: cards.length,
    totalCount,
  };
}

/**
 * 活动卡组读写模块。
 *
 * 从解压后的 TDGY gamedata 中读写活动卡组（当前作战用卡组）。
 * 存储在 gamedata 偏移 0xC0 - 0x19B。
 */

import type { ActiveDeck } from "./types";
import {
  GD_ACTIVE_DECK_FLAG,
  GD_ACTIVE_DECK_NAME,
  GD_ACTIVE_DECK_NAME_SIZE,
  GD_ACTIVE_DECK_MAIN_COUNT,
  GD_ACTIVE_DECK_SIDE_COUNT,
  GD_ACTIVE_DECK_EXTRA_COUNT,
  GD_ACTIVE_DECK_CARDS,
  GD_ACTIVE_DECK_MAIN_SLOTS,
  GD_ACTIVE_DECK_SIDE_OFFSET,
  GD_ACTIVE_DECK_SIDE_SLOTS,
  GD_ACTIVE_DECK_EXTRA_OFFSET,
  GD_ACTIVE_DECK_EXTRA_SLOTS,
} from "./constants";

/**
 * 从解压后的 gamedata 读取活动卡组。
 *
 * @param gamedata - 解压后的 gamedata
 * @returns 活动卡组数据
 */
export function readActiveDeck(gamedata: Uint8Array): ActiveDeck {
  const view = new DataView(
    gamedata.buffer,
    gamedata.byteOffset,
    gamedata.byteLength,
  );

  // 读取标志位
  const flag = gamedata[GD_ACTIVE_DECK_FLAG];

  // 标志位无效时返回空卡组
  if (flag !== 0x01) {
    return {
      name: "",
      mainCount: 0,
      sideCount: 0,
      extraCount: 0,
      mainCids: [],
      sideCids: [],
      extraCids: [],
    };
  }

  // 读取卡组名 (ASCII/Shift-JIS, null 结尾)
  const nameBytes = gamedata.subarray(
    GD_ACTIVE_DECK_NAME,
    GD_ACTIVE_DECK_NAME + GD_ACTIVE_DECK_NAME_SIZE,
  );
  let nameEnd = nameBytes.indexOf(0);
  if (nameEnd === -1) nameEnd = GD_ACTIVE_DECK_NAME_SIZE;
  const name = new TextDecoder("ascii").decode(nameBytes.subarray(0, nameEnd));

  // 读取数量 (uint32 LE)
  const mainCount = view.getUint32(GD_ACTIVE_DECK_MAIN_COUNT, true);
  const sideCount = view.getUint32(GD_ACTIVE_DECK_SIDE_COUNT, true);
  const extraCount = view.getUint32(GD_ACTIVE_DECK_EXTRA_COUNT, true);

  // 读取主卡组 CID (uint16 LE)
  const mainCids: number[] = [];
  for (let i = 0; i < Math.min(mainCount, GD_ACTIVE_DECK_MAIN_SLOTS); i++) {
    const cid = view.getUint16(GD_ACTIVE_DECK_CARDS + i * 2, true);
    if (cid !== 0) mainCids.push(cid);
  }

  // 读取副卡组 CID (uint16 LE)
  const sideCids: number[] = [];
  for (let i = 0; i < Math.min(sideCount, GD_ACTIVE_DECK_SIDE_SLOTS); i++) {
    const cid = view.getUint16(GD_ACTIVE_DECK_SIDE_OFFSET + i * 2, true);
    if (cid !== 0) sideCids.push(cid);
  }

  // 读取额外卡组 CID (uint16 LE)
  const extraCids: number[] = [];
  for (let i = 0; i < Math.min(extraCount, GD_ACTIVE_DECK_EXTRA_SLOTS); i++) {
    const cid = view.getUint16(GD_ACTIVE_DECK_EXTRA_OFFSET + i * 2, true);
    if (cid !== 0) extraCids.push(cid);
  }

  return {
    name,
    mainCount: mainCids.length,
    sideCount: sideCids.length,
    extraCount: extraCids.length,
    mainCids,
    sideCids,
    extraCids,
  };
}

/**
 * 将活动卡组写回解压后的 gamedata。
 *
 * @param gamedata - 可变的解压后 gamedata
 * @param deck - 活动卡组数据
 */
export function writeActiveDeck(
  gamedata: Uint8Array,
  deck: ActiveDeck,
): void {
  const view = new DataView(
    gamedata.buffer,
    gamedata.byteOffset,
    gamedata.byteLength,
  );

  // 写入标志位
  gamedata[GD_ACTIVE_DECK_FLAG] = 0x01;

  // 写入卡组名 (先清零，再写入)
  gamedata.fill(
    0,
    GD_ACTIVE_DECK_NAME,
    GD_ACTIVE_DECK_NAME + GD_ACTIVE_DECK_NAME_SIZE,
  );
  const nameBytes = new TextEncoder().encode(deck.name);
  const nameLen = Math.min(nameBytes.length, GD_ACTIVE_DECK_NAME_SIZE - 1);
  gamedata.set(nameBytes.subarray(0, nameLen), GD_ACTIVE_DECK_NAME);

  // 写入数量 (uint32 LE)
  view.setUint32(GD_ACTIVE_DECK_MAIN_COUNT, deck.mainCids.length, true);
  view.setUint32(GD_ACTIVE_DECK_SIDE_COUNT, deck.sideCids.length, true);
  view.setUint32(GD_ACTIVE_DECK_EXTRA_COUNT, deck.extraCids.length, true);

  // 清零主卡组区域并写入 CID
  const mainAreaEnd = GD_ACTIVE_DECK_CARDS + GD_ACTIVE_DECK_MAIN_SLOTS * 2;
  gamedata.fill(0, GD_ACTIVE_DECK_CARDS, mainAreaEnd);
  const mainCids = deck.mainCids.slice(0, GD_ACTIVE_DECK_MAIN_SLOTS);
  for (let i = 0; i < mainCids.length; i++) {
    view.setUint16(GD_ACTIVE_DECK_CARDS + i * 2, mainCids[i], true);
  }

  // 清零副卡组区域并写入 CID
  const sideAreaEnd = GD_ACTIVE_DECK_SIDE_OFFSET + GD_ACTIVE_DECK_SIDE_SLOTS * 2;
  gamedata.fill(0, GD_ACTIVE_DECK_SIDE_OFFSET, sideAreaEnd);
  const sideCids = deck.sideCids.slice(0, GD_ACTIVE_DECK_SIDE_SLOTS);
  for (let i = 0; i < sideCids.length; i++) {
    view.setUint16(GD_ACTIVE_DECK_SIDE_OFFSET + i * 2, sideCids[i], true);
  }

  // 清零额外卡组区域并写入 CID
  const extraAreaEnd = GD_ACTIVE_DECK_EXTRA_OFFSET + GD_ACTIVE_DECK_EXTRA_SLOTS * 2;
  gamedata.fill(0, GD_ACTIVE_DECK_EXTRA_OFFSET, extraAreaEnd);
  const extraCids = deck.extraCids.slice(0, GD_ACTIVE_DECK_EXTRA_SLOTS);
  for (let i = 0; i < extraCids.length; i++) {
    view.setUint16(GD_ACTIVE_DECK_EXTRA_OFFSET + i * 2, extraCids[i], true);
  }
}

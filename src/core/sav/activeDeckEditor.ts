/**
 * 活动卡组读写模块。
 *
 * 从解压后的 TDGY gamedata 中读写活动卡组（当前作战用卡组）。
 * 通过 GameProfile 适配 WC2008 和 WC2009 的不同偏移。
 */

import type { ActiveDeck } from "./types";
import type { GameProfile } from "./gameProfiles";

/** 副卡组固定槽位数 */
const SIDE_SLOTS = 15;
/** 额外卡组固定槽位数 */
const EXTRA_SLOTS = 15;

/**
 * 从解压后的 gamedata 读取活动卡组。
 *
 * @param gamedata - 解压后的 gamedata
 * @param profile - 游戏版本配置
 * @returns 活动卡组数据
 */
export function readActiveDeck(
  gamedata: Uint8Array,
  profile: GameProfile,
): ActiveDeck {
  const view = new DataView(
    gamedata.buffer,
    gamedata.byteOffset,
    gamedata.byteLength,
  );

  // 读取标志位
  const flag = gamedata[profile.gdActiveDeckFlag];

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
    profile.gdActiveDeckName,
    profile.gdActiveDeckName + profile.gdActiveDeckNameSize,
  );
  let nameEnd = nameBytes.indexOf(0);
  if (nameEnd === -1) nameEnd = profile.gdActiveDeckNameSize;
  const name = new TextDecoder("ascii").decode(nameBytes.subarray(0, nameEnd));

  // 读取数量 (uint32 LE)
  const mainCount = view.getUint32(profile.gdDeckCounts.main, true);
  const sideCount = view.getUint32(profile.gdDeckCounts.side, true);
  const extraCount = view.getUint32(profile.gdDeckCounts.extra, true);

  // 主卡组 CID 起始偏移
  const mainCidsOffset = profile.gdDeckMainCids;
  const mainMax = profile.gdDeckMainMax;

  // 副卡组 CID 起始偏移 = 主卡组起始 + 主卡组最大数 * 2
  const sideCidsOffset = mainCidsOffset + mainMax * 2;
  // 额外卡组 CID 起始偏移 = 副卡组起始 + 副卡组槽位数 * 2
  const extraCidsOffset = sideCidsOffset + SIDE_SLOTS * 2;

  // 读取主卡组 CID (uint16 LE)
  const mainCids: number[] = [];
  for (let i = 0; i < Math.min(mainCount, mainMax); i++) {
    const cid = view.getUint16(mainCidsOffset + i * 2, true);
    if (cid !== 0) mainCids.push(cid);
  }

  // 读取副卡组 CID (uint16 LE)
  const sideCids: number[] = [];
  for (let i = 0; i < Math.min(sideCount, SIDE_SLOTS); i++) {
    const cid = view.getUint16(sideCidsOffset + i * 2, true);
    if (cid !== 0) sideCids.push(cid);
  }

  // 读取额外卡组 CID (uint16 LE)
  const extraCids: number[] = [];
  for (let i = 0; i < Math.min(extraCount, EXTRA_SLOTS); i++) {
    const cid = view.getUint16(extraCidsOffset + i * 2, true);
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
 * @param profile - 游戏版本配置
 */
export function writeActiveDeck(
  gamedata: Uint8Array,
  deck: ActiveDeck,
  profile: GameProfile,
): void {
  const view = new DataView(
    gamedata.buffer,
    gamedata.byteOffset,
    gamedata.byteLength,
  );

  // 写入标志位
  gamedata[profile.gdActiveDeckFlag] = 0x01;

  // 写入卡组名 (先清零，再写入)
  gamedata.fill(
    0,
    profile.gdActiveDeckName,
    profile.gdActiveDeckName + profile.gdActiveDeckNameSize,
  );
  const nameBytes = new TextEncoder().encode(deck.name);
  const nameLen = Math.min(nameBytes.length, profile.gdActiveDeckNameSize - 1);
  gamedata.set(nameBytes.subarray(0, nameLen), profile.gdActiveDeckName);

  // 写入数量 (uint32 LE)
  view.setUint32(profile.gdDeckCounts.main, deck.mainCids.length, true);
  view.setUint32(profile.gdDeckCounts.side, deck.sideCids.length, true);
  view.setUint32(profile.gdDeckCounts.extra, deck.extraCids.length, true);

  // 偏移计算
  const mainCidsOffset = profile.gdDeckMainCids;
  const mainMax = profile.gdDeckMainMax;
  const sideCidsOffset = mainCidsOffset + mainMax * 2;
  const extraCidsOffset = sideCidsOffset + SIDE_SLOTS * 2;

  // 清零主卡组区域并写入 CID
  const mainAreaEnd = mainCidsOffset + mainMax * 2;
  gamedata.fill(0, mainCidsOffset, mainAreaEnd);
  const mainCids = deck.mainCids.slice(0, mainMax);
  for (let i = 0; i < mainCids.length; i++) {
    view.setUint16(mainCidsOffset + i * 2, mainCids[i], true);
  }

  // 清零副卡组区域并写入 CID
  const sideAreaEnd = sideCidsOffset + SIDE_SLOTS * 2;
  gamedata.fill(0, sideCidsOffset, sideAreaEnd);
  const sideCids = deck.sideCids.slice(0, SIDE_SLOTS);
  for (let i = 0; i < sideCids.length; i++) {
    view.setUint16(sideCidsOffset + i * 2, sideCids[i], true);
  }

  // 清零额外卡组区域并写入 CID
  const extraAreaEnd = extraCidsOffset + EXTRA_SLOTS * 2;
  gamedata.fill(0, extraCidsOffset, extraAreaEnd);
  const extraCids = deck.extraCids.slice(0, EXTRA_SLOTS);
  for (let i = 0; i < extraCids.length; i++) {
    view.setUint16(extraCidsOffset + i * 2, extraCids[i], true);
  }
}

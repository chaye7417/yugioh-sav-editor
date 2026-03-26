/**
 * .sav 文件写回。
 *
 * 将修改后的 SaveData 写回 ArrayBuffer，包括:
 * - LZ10 重新压缩 gamedata
 * - 更新 CRC32
 * - 同步所有 TDGY 块
 * - 更新 CRGY 预制卡组
 *
 * 通过 GameProfile 适配 WC2008 和 WC2009 的存档格式差异。
 */

import type { SaveData } from "./types";
import type { GameProfile } from "./gameProfiles";
import {
  TDGY_DATALEN_OFFSET,
  TDGY_CRC32_OFFSET,
  TDGY_GAMEDATA_OFFSET,
  CRGY_MAGIC,
  CRGY_CRC32_OFFSET,
} from "./constants";
import { compress, decompress } from "./lz10";
import { crc32 } from "./crc32";
import { writeActiveDeck } from "./activeDeckEditor";

/** CRGY 标志位偏移 (相对槽位起始) */
const CRGY_FLAG_OFFSET = 0x08;
/** 副卡组最大数量 */
const SIDE_MAX = 15;
/** 额外卡组最大数量 */
const EXTRA_MAX = 15;

/**
 * 将修改后的 TDGY gamedata 写回 .sav 的一个 TDGY 块。
 *
 * @param sav - 可变 .sav 数据
 * @param tdgyOffset - TDGY 块偏移
 * @param compressed - LZ10 压缩后的数据
 * @param oldDataLen - 原始压缩数据长度 (用于清零)
 */
function writeTdgyBlock(
  sav: Uint8Array,
  tdgyOffset: number,
  compressed: Uint8Array,
  oldDataLen: number,
): void {
  const view = new DataView(sav.buffer, sav.byteOffset, sav.byteLength);
  const gsOffset = tdgyOffset + TDGY_GAMEDATA_OFFSET;

  // 清零旧数据区域
  const clearLen = Math.max(oldDataLen, compressed.length);
  sav.fill(0, gsOffset, gsOffset + clearLen);

  // 写入新压缩数据
  sav.set(compressed, gsOffset);

  // 更新数据长度
  view.setUint32(tdgyOffset + TDGY_DATALEN_OFFSET, compressed.length, true);

  // 更新 CRC32
  const crcVal = crc32(compressed);
  view.setUint32(tdgyOffset + TDGY_CRC32_OFFSET, crcVal, true);
}

/**
 * 将单个 CRGY 预制卡组写回 .sav。
 *
 * @param sav - 可变 .sav 数据
 * @param slotOffset - 槽位偏移
 * @param recipe - 卡组数据
 * @param profile - 游戏版本配置
 */
function writeCrgySlot(
  sav: Uint8Array,
  slotOffset: number,
  recipe: { name: string; mainCids: number[]; sideCids: number[]; extraCids: number[] },
  profile: GameProfile,
): void {
  const view = new DataView(sav.buffer, sav.byteOffset, sav.byteLength);

  // 空卡组: 用填充字节清零整个槽位并返回
  if (
    recipe.name === "" &&
    recipe.mainCids.length === 0 &&
    recipe.sideCids.length === 0 &&
    recipe.extraCids.length === 0
  ) {
    sav.fill(profile.crgyPadByte, slotOffset, slotOffset + profile.crgySlotSize);
    return;
  }

  // 用填充字节清空槽位 (保留前4字节之后的区域)
  sav.fill(profile.crgyPadByte, slotOffset + 4, slotOffset + profile.crgySlotSize);

  // 写入 CRGY 魔数
  sav.set(CRGY_MAGIC, slotOffset);

  // 标志位
  sav[slotOffset + CRGY_FLAG_OFFSET] = 0x01;

  // 卡组名 (ASCII)
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(recipe.name);
  const nameLen = Math.min(nameBytes.length, profile.crgyNameSize - 1);
  // 先清零名称区域
  sav.fill(0, slotOffset + profile.crgyNameOffset, slotOffset + profile.crgyNameOffset + profile.crgyNameSize);
  sav.set(nameBytes.subarray(0, nameLen), slotOffset + profile.crgyNameOffset);

  // 截断处理
  const mainCids = recipe.mainCids.slice(0, profile.crgyMainMax);
  const sideCids = recipe.sideCids.slice(0, SIDE_MAX);
  const extraCids = recipe.extraCids.slice(0, EXTRA_MAX);

  // 数量
  const writeCount =
    profile.crgyCountType === "uint16"
      ? (offset: number, val: number) => view.setUint16(offset, val, true)
      : (offset: number, val: number) => view.setUint32(offset, val, true);

  writeCount(slotOffset + profile.crgyCountOffsets.main, mainCids.length);
  writeCount(slotOffset + profile.crgyCountOffsets.side, sideCids.length);
  writeCount(slotOffset + profile.crgyCountOffsets.extra, extraCids.length);

  // CID 数组 (uint16 LE)
  const mainCidBase = slotOffset + profile.crgyCidOffsets.main;
  const sideCidBase = slotOffset + profile.crgyCidOffsets.side;
  const extraCidBase = slotOffset + profile.crgyCidOffsets.extra;

  for (let i = 0; i < mainCids.length; i++) {
    view.setUint16(mainCidBase + i * 2, mainCids[i], true);
  }
  for (let i = 0; i < sideCids.length; i++) {
    view.setUint16(sideCidBase + i * 2, sideCids[i], true);
  }
  for (let i = 0; i < extraCids.length; i++) {
    view.setUint16(extraCidBase + i * 2, extraCids[i], true);
  }

  // 更新 CRC32
  const crcData = sav.subarray(
    slotOffset + profile.crgyCrcStart,
    slotOffset + profile.crgyCrcEnd,
  );
  const crcVal = crc32(crcData);
  view.setUint32(slotOffset + CRGY_CRC32_OFFSET, crcVal, true);
}

/**
 * 将修改后的 SaveData 写回为新的 ArrayBuffer。
 *
 * @param originalBuffer - 原始 .sav ArrayBuffer
 * @param saveData - 修改后的存档数据
 * @returns 新的 .sav ArrayBuffer
 * @throws Error LZ10 roundtrip 验证失败
 */
export function writeSav(
  originalBuffer: ArrayBuffer,
  saveData: SaveData,
): ArrayBuffer {
  const profile = saveData.profile;

  // 复制原始数据（保留原始大小，兼容模拟器扩展的存档）
  const originalSize = Math.max(originalBuffer.byteLength, profile.savMinSize);
  const result = new ArrayBuffer(originalSize);
  const sav = new Uint8Array(result);
  sav.set(new Uint8Array(originalBuffer));

  const gdView = new DataView(
    saveData.gamedata.buffer,
    saveData.gamedata.byteOffset,
    saveData.gamedata.byteLength,
  );

  // 写入 DP 到 gamedata
  gdView.setUint32(profile.gdDp, saveData.dp, true);

  // 写入活动卡组到 gamedata
  writeActiveDeck(saveData.gamedata, saveData.activeDeck, profile);

  // LZ10 压缩 gamedata
  const compressed = compress(saveData.gamedata);

  // Roundtrip 验证
  const verify = decompress(compressed);
  if (verify.length !== saveData.gamedata.length) {
    throw new Error(
      `LZ10 roundtrip 验证失败: 解压后大小 ${verify.length} != 原始 ${saveData.gamedata.length}`,
    );
  }
  for (let i = 0; i < verify.length; i++) {
    if (verify[i] !== saveData.gamedata[i]) {
      throw new Error(`LZ10 roundtrip 验证失败: 字节 ${i} 不匹配`);
    }
  }

  // 写入所有 TDGY 块
  for (const tdgyOffset of profile.tdgyOffsets) {
    writeTdgyBlock(sav, tdgyOffset, compressed, saveData.tdgy.dataLen);
  }

  // 写入 CRGY 预制卡组
  for (let i = 0; i < profile.crgySlotCount; i++) {
    const slotOffset = profile.crgyBaseOffset + i * profile.crgySlotSize;
    writeCrgySlot(sav, slotOffset, saveData.recipes[i], profile);
  }

  return result;
}

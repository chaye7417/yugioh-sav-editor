/**
 * .sav 文件写回。
 *
 * 将修改后的 SaveData 写回 ArrayBuffer，包括:
 * - LZ10 重新压缩 gamedata
 * - 更新 CRC32
 * - 同步备份 TDGY 块
 * - 更新 CRGY 预制卡组
 */

import type { SaveData } from "./types";
import {
  SAV_SIZE,
  TDGY_OFFSET,
  TDGY_BACKUP_OFFSET,
  TDGY_SIZE,
  TDGY_DATALEN_OFFSET,
  TDGY_CRC32_OFFSET,
  TDGY_GAMEDATA_OFFSET,
  GD_DP,
  CRGY_SLOT_COUNT,
  CRGY_SLOT_OFFSETS,
  CRGY_SIZE,
  CRGY_MAGIC,
  CRGY_FLAG_OFFSET,
  CRGY_NAME_OFFSET,
  CRGY_NAME_SIZE,
  CRGY_MAIN_COUNT_OFFSET,
  CRGY_SIDE_COUNT_OFFSET,
  CRGY_EXTRA_COUNT_OFFSET,
  CRGY_CARDS_OFFSET,
  CRGY_MAIN_MAX,
  CRGY_SIDE_MAX,
  CRGY_EXTRA_MAX,
  CRGY_SIDE_START,
  CRGY_EXTRA_START,
  CRGY_MAX_CARDS,
  CRGY_CRC32_OFFSET,
} from "./constants";
import { compress, decompress } from "./lz10";
import { crc32 } from "./crc32";

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
 */
function writeCrgySlot(
  sav: Uint8Array,
  slotOffset: number,
  recipe: { name: string; mainCids: number[]; sideCids: number[]; extraCids: number[] },
): void {
  const view = new DataView(sav.buffer, sav.byteOffset, sav.byteLength);

  // 空卡组: 不写入 (保持原始数据中清零状态)
  if (
    recipe.name === "" &&
    recipe.mainCids.length === 0 &&
    recipe.sideCids.length === 0 &&
    recipe.extraCids.length === 0
  ) {
    return;
  }

  // 清空槽位 (保留前4字节之后的区域)
  sav.fill(0, slotOffset + 4, slotOffset + CRGY_SIZE);

  // 写入 CRGY 魔数
  sav.set(CRGY_MAGIC, slotOffset);

  // 标志位
  sav[slotOffset + CRGY_FLAG_OFFSET] = 0x01;

  // 卡组名 (ASCII)
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(recipe.name);
  const nameLen = Math.min(nameBytes.length, CRGY_NAME_SIZE - 1);
  sav.set(nameBytes.subarray(0, nameLen), slotOffset + CRGY_NAME_OFFSET);

  // 截断处理
  const mainCids = recipe.mainCids.slice(0, CRGY_MAIN_MAX);
  const sideCids = recipe.sideCids.slice(0, CRGY_SIDE_MAX);
  const extraCids = recipe.extraCids.slice(0, CRGY_EXTRA_MAX);

  // 数量
  view.setUint16(slotOffset + CRGY_MAIN_COUNT_OFFSET, mainCids.length, true);
  view.setUint16(slotOffset + CRGY_SIDE_COUNT_OFFSET, sideCids.length, true);
  view.setUint16(slotOffset + CRGY_EXTRA_COUNT_OFFSET, extraCids.length, true);

  // CID 数组
  const cidBase = slotOffset + CRGY_CARDS_OFFSET;
  for (let i = 0; i < mainCids.length; i++) {
    view.setUint16(cidBase + i * 2, mainCids[i], true);
  }
  for (let i = 0; i < sideCids.length; i++) {
    view.setUint16(cidBase + (CRGY_SIDE_START + i) * 2, sideCids[i], true);
  }
  for (let i = 0; i < extraCids.length; i++) {
    view.setUint16(cidBase + (CRGY_EXTRA_START + i) * 2, extraCids[i], true);
  }

  // 更新 CRC32 (从 flag_offset 到槽位结束)
  const crcData = sav.subarray(slotOffset + 0x08, slotOffset + CRGY_SIZE);
  const crcVal = crc32(crcData);
  view.setUint32(slotOffset + CRGY_CRC32_OFFSET, crcVal, true);
}

/**
 * 将修改后的 SaveData 写回为新的 ArrayBuffer。
 *
 * @param originalBuffer - 原始 .sav ArrayBuffer
 * @param saveData - 修改后的存档数据
 * @returns 新的 .sav ArrayBuffer (64KB)
 * @throws Error LZ10 roundtrip 验证失败
 */
export function writeSav(
  originalBuffer: ArrayBuffer,
  saveData: SaveData,
): ArrayBuffer {
  // 复制原始数据
  const result = new ArrayBuffer(SAV_SIZE);
  const sav = new Uint8Array(result);
  sav.set(new Uint8Array(originalBuffer));
  const gdView = new DataView(
    saveData.gamedata.buffer,
    saveData.gamedata.byteOffset,
    saveData.gamedata.byteLength,
  );

  // 写入 DP 到 gamedata
  gdView.setUint32(GD_DP, saveData.dp, true);

  // LZ10 压缩 gamedata
  const compressed = compress(saveData.gamedata);

  // Roundtrip 验证
  const verify = decompress(compressed);
  if (verify.length !== saveData.gamedata.length) {
    throw new Error(
      `LZ10 roundtrip 验证失败: 解压后大小 ${verify.length} != 原始 ${saveData.gamedata.length}`
    );
  }
  for (let i = 0; i < verify.length; i++) {
    if (verify[i] !== saveData.gamedata[i]) {
      throw new Error(`LZ10 roundtrip 验证失败: 字节 ${i} 不匹配`);
    }
  }

  // 写入主 TDGY 块
  writeTdgyBlock(sav, TDGY_OFFSET, compressed, saveData.tdgy.dataLen);

  // 同步备份 TDGY 块 (直接复制主块)
  const primaryBlock = sav.subarray(TDGY_OFFSET, TDGY_OFFSET + TDGY_SIZE);
  sav.set(primaryBlock, TDGY_BACKUP_OFFSET);

  // 写入 CRGY 预制卡组
  for (let i = 0; i < CRGY_SLOT_COUNT; i++) {
    writeCrgySlot(sav, CRGY_SLOT_OFFSETS[i], saveData.recipes[i]);
  }

  return result;
}

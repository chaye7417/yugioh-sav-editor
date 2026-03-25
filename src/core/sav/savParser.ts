/**
 * .sav 文件解析器。
 *
 * 从 Python sav_io.py + collection_editor.py 精确重写。
 * 验证文件头，定位 TDGY/CRGY 块，LZ10 解压 gamedata。
 */

import type { SaveData, TdgyBlock, CrgyRecipe, ActiveDeck } from "./types";
import {
  SAV_SIZE,
  SAV_MAGIC,
  TDGY_OFFSET,
  TDGY_BACKUP_OFFSET,
  TDGY_MAGIC,
  TDGY_DATALEN_OFFSET,
  TDGY_CRC32_OFFSET,
  TDGY_GAMEDATA_OFFSET,
  GD_DP,
  CRGY_SLOT_COUNT,
  CRGY_SLOT_OFFSETS,
  CRGY_MAGIC,
  CRGY_SIZE,
  CRGY_NAME_OFFSET,
  CRGY_NAME_SIZE,
  CRGY_MAIN_COUNT_OFFSET,
  CRGY_SIDE_COUNT_OFFSET,
  CRGY_EXTRA_COUNT_OFFSET,
  CRGY_CARDS_OFFSET,
  CRGY_SIDE_START,
  CRGY_EXTRA_START,
} from "./constants";
import { decompress } from "./lz10";
import { readActiveDeck } from "./activeDeckEditor";

/**
 * 比较两个 Uint8Array 前 N 字节是否相同。
 */
function bytesEqual(a: Uint8Array, b: Uint8Array, len: number): boolean {
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * 解析 TDGY 块。
 *
 * @param sav - 完整 .sav 数据
 * @param offset - TDGY 块偏移
 * @returns TdgyBlock 或 null (魔数不匹配)
 */
function parseTdgy(sav: Uint8Array, offset: number): TdgyBlock | null {
  const magic = sav.subarray(offset, offset + 4);
  if (!bytesEqual(magic, TDGY_MAGIC, 4)) {
    return null;
  }

  const view = new DataView(sav.buffer, sav.byteOffset, sav.byteLength);
  const dataLen = view.getUint32(offset + TDGY_DATALEN_OFFSET, true);
  const crc32Val = view.getUint32(offset + TDGY_CRC32_OFFSET, true);

  if (dataLen === 0) {
    return null;
  }

  const compressedStart = offset + TDGY_GAMEDATA_OFFSET;
  const compressed = sav.subarray(compressedStart, compressedStart + dataLen);
  const gamedata = decompress(compressed);

  return {
    offset,
    dataLen,
    crc32: crc32Val,
    gamedata,
  };
}

/**
 * 解析单个 CRGY 预制卡组槽位。
 *
 * @param sav - 完整 .sav 数据
 * @param slotOffset - 槽位起始偏移
 * @returns CrgyRecipe
 */
function parseCrgySlot(sav: Uint8Array, slotOffset: number): CrgyRecipe {
  const magic = sav.subarray(slotOffset, slotOffset + 4);
  if (!bytesEqual(magic, CRGY_MAGIC, 4)) {
    // 空槽位
    return { name: "", mainCids: [], sideCids: [], extraCids: [] };
  }

  const view = new DataView(sav.buffer, sav.byteOffset, sav.byteLength);

  // 卡组名 (ASCII, null terminated)
  const nameStart = slotOffset + CRGY_NAME_OFFSET;
  const nameBytes = sav.subarray(nameStart, nameStart + CRGY_NAME_SIZE);
  let nameEnd = nameBytes.indexOf(0);
  if (nameEnd === -1) nameEnd = CRGY_NAME_SIZE;
  const name = new TextDecoder("ascii").decode(nameBytes.subarray(0, nameEnd));

  // 各区卡片数量
  const mainCount = view.getUint16(slotOffset + CRGY_MAIN_COUNT_OFFSET, true);
  const sideCount = view.getUint16(slotOffset + CRGY_SIDE_COUNT_OFFSET, true);
  const extraCount = view.getUint16(slotOffset + CRGY_EXTRA_COUNT_OFFSET, true);

  const cidBase = slotOffset + CRGY_CARDS_OFFSET;

  // 主卡组: 索引 0 ~ mainCount-1
  const mainCids: number[] = [];
  for (let i = 0; i < mainCount; i++) {
    mainCids.push(view.getUint16(cidBase + i * 2, true));
  }

  // 副卡组: 索引 CRGY_SIDE_START ~ CRGY_SIDE_START+sideCount-1
  const sideCids: number[] = [];
  for (let i = 0; i < sideCount; i++) {
    sideCids.push(view.getUint16(cidBase + (CRGY_SIDE_START + i) * 2, true));
  }

  // 额外卡组: 索引 CRGY_EXTRA_START ~ CRGY_EXTRA_START+extraCount-1
  const extraCids: number[] = [];
  for (let i = 0; i < extraCount; i++) {
    extraCids.push(view.getUint16(cidBase + (CRGY_EXTRA_START + i) * 2, true));
  }

  return { name, mainCids, sideCids, extraCids };
}

/**
 * 解析整个 .sav 文件。
 *
 * @param buffer - .sav 文件的 ArrayBuffer
 * @returns SaveData 解析结果
 * @throws Error 文件大小/文件头不正确，或 TDGY 块无效
 */
export function parseSav(buffer: ArrayBuffer): SaveData {
  const sav = new Uint8Array(buffer);

  // 验证文件大小
  if (sav.length !== SAV_SIZE) {
    throw new Error(`SAV 文件大小应为 ${SAV_SIZE}, 实际 ${sav.length}`);
  }

  // 验证文件头 "YuGiWC08"
  if (!bytesEqual(sav.subarray(0, 8), SAV_MAGIC, 8)) {
    throw new Error("SAV 文件头错误, 期望 YuGiWC08");
  }

  // 解析主 TDGY 块
  const tdgy = parseTdgy(sav, TDGY_OFFSET);
  if (!tdgy) {
    throw new Error("主 TDGY 块无效");
  }

  // 解析备份 TDGY 块
  const tdgyBackup = parseTdgy(sav, TDGY_BACKUP_OFFSET);
  if (!tdgyBackup) {
    throw new Error("备份 TDGY 块无效");
  }

  // 读取 DP (从解压后的 gamedata)
  const gdView = new DataView(
    tdgy.gamedata.buffer,
    tdgy.gamedata.byteOffset,
    tdgy.gamedata.byteLength,
  );
  const dp = gdView.getUint32(GD_DP, true);

  // 解析 50 个 CRGY 预制卡组
  const recipes: CrgyRecipe[] = [];
  for (let i = 0; i < CRGY_SLOT_COUNT; i++) {
    recipes.push(parseCrgySlot(sav, CRGY_SLOT_OFFSETS[i]));
  }

  // 创建 gamedata 的可变副本
  const gamedata = new Uint8Array(tdgy.gamedata.length);
  gamedata.set(tdgy.gamedata);

  // 解析活动卡组
  const activeDeck = readActiveDeck(gamedata);

  return {
    rawBuffer: buffer,
    tdgy,
    tdgyBackup,
    recipes,
    dp,
    gamedata,
    activeDeck,
  };
}

/**
 * CRGY 预制卡组读写。
 *
 * 从 Python recipe_writer.py 精确重写。
 * 提供对 50 个预制卡组槽位的读取和写入功能。
 */

import type { CrgyRecipe } from "./types";
import {
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
  CRGY_CRC32_OFFSET,
} from "./constants";
import { crc32 } from "./crc32";

/**
 * 比较字节数组前 N 字节。
 */
function bytesEqual(a: Uint8Array, b: Uint8Array, len: number): boolean {
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * 从 .sav 数据读取指定槽位的预制卡组。
 *
 * @param savData - 完整 .sav 数据
 * @param slot - 槽位索引 (0-49)
 * @returns CrgyRecipe
 * @throws Error 槽位索引越界
 */
export function readRecipe(savData: Uint8Array, slot: number): CrgyRecipe {
  if (slot < 0 || slot >= CRGY_SLOT_COUNT) {
    throw new Error(`槽位必须为 0-${CRGY_SLOT_COUNT - 1}, 收到: ${slot}`);
  }

  const base = CRGY_SLOT_OFFSETS[slot];
  const magic = savData.subarray(base, base + 4);
  if (!bytesEqual(magic, CRGY_MAGIC, 4)) {
    return { name: "", mainCids: [], sideCids: [], extraCids: [] };
  }

  const view = new DataView(
    savData.buffer,
    savData.byteOffset,
    savData.byteLength,
  );

  // 卡组名 (ASCII, null terminated)
  const nameStart = base + CRGY_NAME_OFFSET;
  const nameBytes = savData.subarray(nameStart, nameStart + CRGY_NAME_SIZE);
  let nameEnd = nameBytes.indexOf(0);
  if (nameEnd === -1) nameEnd = CRGY_NAME_SIZE;
  const name = new TextDecoder("ascii").decode(nameBytes.subarray(0, nameEnd));

  // 各区数量
  const mainCount = view.getUint16(base + CRGY_MAIN_COUNT_OFFSET, true);
  const sideCount = view.getUint16(base + CRGY_SIDE_COUNT_OFFSET, true);
  const extraCount = view.getUint16(base + CRGY_EXTRA_COUNT_OFFSET, true);

  const cidBase = base + CRGY_CARDS_OFFSET;

  // 主卡组
  const mainCids: number[] = [];
  for (let i = 0; i < mainCount; i++) {
    mainCids.push(view.getUint16(cidBase + i * 2, true));
  }

  // 副卡组 (从索引 60 开始)
  const sideCids: number[] = [];
  for (let i = 0; i < sideCount; i++) {
    sideCids.push(view.getUint16(cidBase + (CRGY_SIDE_START + i) * 2, true));
  }

  // 额外卡组 (从索引 75 开始)
  const extraCids: number[] = [];
  for (let i = 0; i < extraCount; i++) {
    extraCids.push(view.getUint16(cidBase + (CRGY_EXTRA_START + i) * 2, true));
  }

  return { name, mainCids, sideCids, extraCids };
}

/**
 * 读取所有 50 个预制卡组槽位。
 *
 * @param savData - 完整 .sav 数据
 * @returns CrgyRecipe 数组 (长度 50)
 */
export function readAllRecipes(savData: Uint8Array): CrgyRecipe[] {
  const recipes: CrgyRecipe[] = [];
  for (let i = 0; i < CRGY_SLOT_COUNT; i++) {
    recipes.push(readRecipe(savData, i));
  }
  return recipes;
}

/**
 * 写入预制卡组到 .sav 数据的指定槽位。
 *
 * 超出上限的卡片会被自动截断并返回警告。
 *
 * @param savData - 可变 .sav 数据
 * @param slot - 槽位索引 (0-49)
 * @param deck - 要写入的卡组
 * @returns 警告信息列表
 * @throws Error 槽位索引越界
 */
export function writeRecipe(
  savData: Uint8Array,
  slot: number,
  deck: CrgyRecipe,
): string[] {
  if (slot < 0 || slot >= CRGY_SLOT_COUNT) {
    throw new Error(`槽位必须为 0-${CRGY_SLOT_COUNT - 1}, 收到: ${slot}`);
  }

  const warnings: string[] = [];
  let mainCids = deck.mainCids;
  let sideCids = deck.sideCids;
  let extraCids = deck.extraCids;

  if (mainCids.length > CRGY_MAIN_MAX) {
    warnings.push(`主卡组 ${mainCids.length} 张截断到 ${CRGY_MAIN_MAX}`);
    mainCids = mainCids.slice(0, CRGY_MAIN_MAX);
  }
  if (sideCids.length > CRGY_SIDE_MAX) {
    warnings.push(`副卡组 ${sideCids.length} 张截断到 ${CRGY_SIDE_MAX}`);
    sideCids = sideCids.slice(0, CRGY_SIDE_MAX);
  }
  if (extraCids.length > CRGY_EXTRA_MAX) {
    warnings.push(`额外卡组 ${extraCids.length} 张截断到 ${CRGY_EXTRA_MAX}`);
    extraCids = extraCids.slice(0, CRGY_EXTRA_MAX);
  }

  const base = CRGY_SLOT_OFFSETS[slot];
  const view = new DataView(
    savData.buffer,
    savData.byteOffset,
    savData.byteLength,
  );

  // 清空槽位 (保留前4字节之后)
  savData.fill(0, base + 4, base + CRGY_SIZE);

  // 写入 CRGY 魔数
  savData.set(CRGY_MAGIC, base);

  // 标志位
  savData[base + CRGY_FLAG_OFFSET] = 0x01;

  // 卡组名 (ASCII)
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(deck.name);
  const nameLen = Math.min(nameBytes.length, CRGY_NAME_SIZE - 1);
  savData.set(nameBytes.subarray(0, nameLen), base + CRGY_NAME_OFFSET);

  // 数量
  view.setUint16(base + CRGY_MAIN_COUNT_OFFSET, mainCids.length, true);
  view.setUint16(base + CRGY_SIDE_COUNT_OFFSET, sideCids.length, true);
  view.setUint16(base + CRGY_EXTRA_COUNT_OFFSET, extraCids.length, true);

  // CID 数组
  const cidBase = base + CRGY_CARDS_OFFSET;
  for (let i = 0; i < mainCids.length; i++) {
    view.setUint16(cidBase + i * 2, mainCids[i], true);
  }
  for (let i = 0; i < sideCids.length; i++) {
    view.setUint16(cidBase + (CRGY_SIDE_START + i) * 2, sideCids[i], true);
  }
  for (let i = 0; i < extraCids.length; i++) {
    view.setUint16(cidBase + (CRGY_EXTRA_START + i) * 2, extraCids[i], true);
  }

  // 更新 CRC32 (从 offset+0x08 到槽位结束)
  const crcData = savData.subarray(base + 0x08, base + CRGY_SIZE);
  const crcVal = crc32(crcData);
  view.setUint32(base + CRGY_CRC32_OFFSET, crcVal, true);

  return warnings;
}

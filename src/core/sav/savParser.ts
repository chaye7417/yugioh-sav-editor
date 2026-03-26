/**
 * .sav 文件解析器。
 *
 * 通过 GameProfile 适配 WC2008 和 WC2009 的存档格式差异。
 * 验证文件头，定位 TDGY/CRGY 块，LZ10 解压 gamedata。
 */

import type { SaveData, TdgyBlock, CrgyRecipe, ActiveDeck } from "./types";
import type { GameProfile } from "./gameProfiles";
import { detectGameVersion } from "./gameProfiles";
import {
  TDGY_MAGIC,
  TDGY_VERSION_OFFSET,
  TDGY_DATALEN_OFFSET,
  TDGY_CRC32_OFFSET,
  TDGY_GAMEDATA_OFFSET,
  CRGY_MAGIC,
  CRGY_CRC32_OFFSET,
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
 * 从多个 TDGY 偏移中选择版本号最高的块。
 *
 * WC2008 有 4 个 TDGY 块，需选版本号最高的作为主块。
 * WC2009 只有 2 个块（主 + 备份）。
 *
 * @param sav - 完整 .sav 数据
 * @param offsets - TDGY 块偏移列表
 * @returns 主 TDGY 和备份 TDGY
 * @throws Error 如果没有有效的 TDGY 块
 */
function selectTdgyBlocks(
  sav: Uint8Array,
  offsets: number[],
): { tdgy: TdgyBlock; tdgyBackup: TdgyBlock } {
  const view = new DataView(sav.buffer, sav.byteOffset, sav.byteLength);

  // 解析所有有效的 TDGY 块并记录版本号
  const blocks: { block: TdgyBlock; version: number }[] = [];
  for (const offset of offsets) {
    const block = parseTdgy(sav, offset);
    if (block) {
      const version = view.getUint32(offset + TDGY_VERSION_OFFSET, true);
      blocks.push({ block, version });
    }
  }

  if (blocks.length === 0) {
    throw new Error("未找到有效的 TDGY 块");
  }

  // 按版本号降序排列
  blocks.sort((a, b) => b.version - a.version);

  // 版本最高的作为主块
  const tdgy = blocks[0].block;
  // 第二个作为备份（如果只有一个，备份也用同一个）
  const tdgyBackup = blocks.length > 1 ? blocks[1].block : tdgy;

  return { tdgy, tdgyBackup };
}

/**
 * 解析单个 CRGY 预制卡组槽位。
 *
 * @param sav - 完整 .sav 数据
 * @param slotOffset - 槽位起始偏移
 * @param profile - 游戏版本配置
 * @returns CrgyRecipe
 */
function parseCrgySlot(
  sav: Uint8Array,
  slotOffset: number,
  profile: GameProfile,
): CrgyRecipe {
  const magic = sav.subarray(slotOffset, slotOffset + 4);
  if (!bytesEqual(magic, CRGY_MAGIC, 4)) {
    // 空槽位
    return { name: "", mainCids: [], sideCids: [], extraCids: [] };
  }

  const view = new DataView(sav.buffer, sav.byteOffset, sav.byteLength);

  // 卡组名 (ASCII, null terminated)
  const nameStart = slotOffset + profile.crgyNameOffset;
  const nameBytes = sav.subarray(nameStart, nameStart + profile.crgyNameSize);
  let nameEnd = nameBytes.indexOf(0);
  if (nameEnd === -1) nameEnd = profile.crgyNameSize;
  const name = new TextDecoder("ascii").decode(nameBytes.subarray(0, nameEnd));

  // 各区卡片数量
  const readCount =
    profile.crgyCountType === "uint16"
      ? (offset: number) => view.getUint16(offset, true)
      : (offset: number) => view.getUint32(offset, true);

  const mainCount = readCount(slotOffset + profile.crgyCountOffsets.main);
  const sideCount = readCount(slotOffset + profile.crgyCountOffsets.side);
  const extraCount = readCount(slotOffset + profile.crgyCountOffsets.extra);

  // CID 读取 (uint16 LE)
  const mainCidBase = slotOffset + profile.crgyCidOffsets.main;
  const sideCidBase = slotOffset + profile.crgyCidOffsets.side;
  const extraCidBase = slotOffset + profile.crgyCidOffsets.extra;

  // 主卡组
  const mainCids: number[] = [];
  const mainMax = Math.min(mainCount, profile.crgyMainMax);
  for (let i = 0; i < mainMax; i++) {
    mainCids.push(view.getUint16(mainCidBase + i * 2, true));
  }

  // 副卡组
  const sideCids: number[] = [];
  for (let i = 0; i < Math.min(sideCount, 15); i++) {
    sideCids.push(view.getUint16(sideCidBase + i * 2, true));
  }

  // 额外卡组
  const extraCids: number[] = [];
  for (let i = 0; i < Math.min(extraCount, 15); i++) {
    extraCids.push(view.getUint16(extraCidBase + i * 2, true));
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
  // 检测游戏版本
  const profile = detectGameVersion(buffer);

  const sav = new Uint8Array(buffer);

  // 验证文件大小
  if (sav.length < profile.savMinSize) {
    throw new Error(
      `SAV 文件太小: 最少需要 ${profile.savMinSize} 字节, 实际 ${sav.length}`,
    );
  }

  // 文件头验证已在 detectGameVersion 中完成

  // 从多个 TDGY 块中选择版本最高的
  const { tdgy, tdgyBackup } = selectTdgyBlocks(sav, profile.tdgyOffsets);

  // 验证解压后大小
  if (tdgy.gamedata.length !== profile.gamedataDecompSize) {
    throw new Error(
      `Gamedata 解压大小不匹配: 期望 ${profile.gamedataDecompSize}, 实际 ${tdgy.gamedata.length}`,
    );
  }

  // 读取 DP (从解压后的 gamedata)
  const gdView = new DataView(
    tdgy.gamedata.buffer,
    tdgy.gamedata.byteOffset,
    tdgy.gamedata.byteLength,
  );
  const dp = gdView.getUint32(profile.gdDp, true);

  // 解析 CRGY 预制卡组
  const recipes: CrgyRecipe[] = [];
  for (let i = 0; i < profile.crgySlotCount; i++) {
    const slotOffset = profile.crgyBaseOffset + i * profile.crgySlotSize;
    recipes.push(parseCrgySlot(sav, slotOffset, profile));
  }

  // 创建 gamedata 的可变副本
  const gamedata = new Uint8Array(tdgy.gamedata.length);
  gamedata.set(tdgy.gamedata);

  // 解析活动卡组
  const activeDeck = readActiveDeck(gamedata, profile);

  return {
    profile,
    rawBuffer: buffer,
    tdgy,
    tdgyBackup,
    recipes,
    dp,
    gamedata,
    activeDeck,
  };
}

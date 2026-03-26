/**
 * 游戏版本配置系统。
 *
 * 定义 WC2008 和 WC2009 的存档格式差异，
 * 让存档引擎通过 GameProfile 适配不同版本。
 */

// ── 类型定义 ────────────────────────────────────────────────

/** 支持的游戏版本 */
export type GameVersion = "wc2007" | "wc2008" | "wc2009";

/** 游戏版本配置 */
export interface GameProfile {
  /** 版本标识 */
  version: GameVersion;
  /** 显示名称 */
  displayName: string;

  // ── 存档文件 ──
  /** 最小存档大小 (字节) */
  savMinSize: number;

  // ── TDGY ──
  /** TDGY 块偏移列表 (主 + 备份) */
  tdgyOffsets: number[];

  // ── CRGY 预制卡组 ──
  /** CRGY 块起始偏移 */
  crgyBaseOffset: number;
  /** 每个槽位字节数 */
  crgySlotSize: number;
  /** 槽位数量 */
  crgySlotCount: number;
  /** 卡组名偏移 (相对槽位起始) */
  crgyNameOffset: number;
  /** 卡组名最大长度 */
  crgyNameSize: number;
  /** 数量字段偏移 (相对槽位起始) */
  crgyCountOffsets: { main: number; extra: number; side: number };
  /** 数量字段类型 */
  crgyCountType: "uint16" | "uint32";
  /** CID 数组起始偏移 (相对槽位起始) */
  crgyCidOffsets: { main: number; side: number; extra: number };
  /** 主卡组最大数量 */
  crgyMainMax: number;
  /** CRC32 计算起始偏移 (相对槽位起始) */
  crgyCrcStart: number;
  /** CRC32 计算结束偏移 (相对槽位起始) */
  crgyCrcEnd: number;
  /** 空白填充字节 */
  crgyPadByte: number;

  // ── Gamedata ──
  /** 解压后 gamedata 大小 */
  gamedataDecompSize: number;
  /** DP 偏移 (相对 gamedata 起始) */
  gdDp: number;
  /** 活动卡组标志位偏移 */
  gdActiveDeckFlag: number;
  /** 活动卡组名偏移 */
  gdActiveDeckName: number;
  /** 活动卡组名最大长度 */
  gdActiveDeckNameSize: number;
  /** 活动卡组数量字段偏移 */
  gdDeckCounts: { main: number; extra: number; side: number };
  /** 活动卡组主卡 CID 数组起始偏移 */
  gdDeckMainCids: number;
  /** 活动卡组主卡最大数量 */
  gdDeckMainMax: number;
  /** 半字节数组偏移 (卡片收藏) */
  gdNibbleArray: number;
}

// ── WC2007 配置 ──────────────────────────────────────────────

export const WC2007_PROFILE: GameProfile = {
  version: "wc2007",
  displayName: "Yu-Gi-Oh! World Championship 2007",

  savMinSize: 0x40000,

  tdgyOffsets: [0x28000, 0x29800, 0x2b000, 0x2c800],

  crgyBaseOffset: 0x10000,
  crgySlotSize: 384,
  crgySlotCount: 64,
  crgyNameOffset: 0x09,
  crgyNameSize: 27,
  crgyCountOffsets: { main: 0x24, extra: 0x2c, side: 0x28 },
  crgyCountType: "uint32",
  crgyCidOffsets: { main: 0x30, side: 0xd0, extra: 0xee },
  crgyMainMax: 80,
  crgyCrcStart: 0x08,
  crgyCrcEnd: 0x12c,
  crgyPadByte: 0xff,

  gamedataDecompSize: 0x1750,
  gdDp: 0x024,
  gdActiveDeckFlag: 0x094,
  gdActiveDeckName: 0x095,
  gdActiveDeckNameSize: 27,
  gdDeckCounts: { main: 0x0b0, extra: 0x0b8, side: 0x0b4 },
  gdDeckMainCids: 0x0bc,
  gdDeckMainMax: 80,
  gdNibbleArray: 0x0260,
};

// ── WC2008 配置 ──────────────────────────────────────────────

export const WC2008_PROFILE: GameProfile = {
  version: "wc2008",
  displayName: "Yu-Gi-Oh! World Championship 2008",

  savMinSize: 0x40000,

  tdgyOffsets: [0x28000, 0x2ab00, 0x2d600, 0x30100],

  crgyBaseOffset: 0x10000,
  crgySlotSize: 0x180,
  crgySlotCount: 64,
  crgyNameOffset: 0x09,
  crgyNameSize: 39,
  crgyCountOffsets: { main: 0x30, extra: 0x34, side: 0x38 },
  crgyCountType: "uint32",
  crgyCidOffsets: { main: 0x3c, side: 0xfa, extra: 0xdc },
  crgyMainMax: 80,
  crgyCrcStart: 0x08,
  crgyCrcEnd: 0x138,
  crgyPadByte: 0xff,

  gamedataDecompSize: 0x26f0,
  gdDp: 0x024,
  gdActiveDeckFlag: 0x0a0,
  gdActiveDeckName: 0x0a1,
  gdActiveDeckNameSize: 39,
  gdDeckCounts: { main: 0x0c8, extra: 0x0cc, side: 0x0d0 },
  gdDeckMainCids: 0x0d4,
  gdDeckMainMax: 80,
  gdNibbleArray: 0x65a,
};

// ── WC2009 配置 ──────────────────────────────────────────────

export const WC2009_PROFILE: GameProfile = {
  version: "wc2009",
  displayName: "Yu-Gi-Oh! World Championship 2009",

  savMinSize: 0x10000,

  tdgyOffsets: [0xb51c, 0xda8c],

  crgyBaseOffset: 0x45a8,
  crgySlotSize: 228,
  crgySlotCount: 50,
  crgyNameOffset: 0x09,
  crgyNameSize: 23,
  crgyCountOffsets: { main: 0x24, extra: 0x2c, side: 0x28 },
  crgyCountType: "uint16",
  crgyCidOffsets: { main: 0x30, side: 0xa8, extra: 0xc6 },
  crgyMainMax: 60,
  crgyCrcStart: 0x08,
  crgyCrcEnd: 228,
  crgyPadByte: 0x00,

  gamedataDecompSize: 0x2550,
  gdDp: 0x024,
  gdActiveDeckFlag: 0xc0,
  gdActiveDeckName: 0xc1,
  gdActiveDeckNameSize: 23,
  gdDeckCounts: { main: 0xdc, extra: 0xe4, side: 0xe0 },
  gdDeckMainCids: 0xe8,
  gdDeckMainMax: 60,
  gdNibbleArray: 0xa4e,
};

// ── 全部配置 ─────────────────────────────────────────────────

/** 所有支持的游戏配置 */
export const GAME_PROFILES: Record<GameVersion, GameProfile> = {
  wc2007: WC2007_PROFILE,
  wc2008: WC2008_PROFILE,
  wc2009: WC2009_PROFILE,
};

// ── 版本检测 ─────────────────────────────────────────────────

/** WC07 文件头魔数 "YuGiWC07" */
const SAV_MAGIC_WC07 = new Uint8Array([
  0x59, 0x75, 0x47, 0x69, 0x57, 0x43, 0x30, 0x37,
]);

/** WC08 文件头魔数 "YuGiWC08" */
const SAV_MAGIC_WC08 = new Uint8Array([
  0x59, 0x75, 0x47, 0x69, 0x57, 0x43, 0x30, 0x38,
]);

/**
 * 比较两个 Uint8Array 前 N 字节是否相同。
 */
function bytesEq(a: Uint8Array, b: Uint8Array, len: number): boolean {
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * 根据文件头和文件大小自动检测游戏版本。
 *
 * - "YuGiWC07" → WC2007
 * - "YuGiWC08" → 按大小区分 WC2008 / WC2009
 *
 * @param buffer 存档文件的 ArrayBuffer
 * @returns 匹配的 GameProfile
 * @throws Error 如果文件头不匹配任何已知版本
 */
/** TDGY 魔数 */
const TDGY_MAGIC = new Uint8Array([0x54, 0x44, 0x47, 0x59]); // "TDGY"

/**
 * 检查指定偏移是否有有效的 TDGY 块。
 */
function hasTdgyAt(sav: Uint8Array, offset: number): boolean {
  if (offset + 4 > sav.length) return false;
  return bytesEq(sav.subarray(offset, offset + 4), TDGY_MAGIC, 4);
}

/**
 * 自动检测存档版本。
 *
 * - YuGiWC07 文件头 → WC2007
 * - YuGiWC08 文件头 → 通过 TDGY 块位置区分 WC2008 和 WC2009
 *   （不依赖文件大小，兼容不同模拟器产生的各种存档尺寸）
 *
 * @param buffer - 存档文件 ArrayBuffer
 * @returns 对应的 GameProfile
 * @throws Error 无法识别的存档
 */
export function detectGameVersion(buffer: ArrayBuffer): GameProfile {
  const sav = new Uint8Array(buffer);
  const header = sav.subarray(0, 8);

  // YuGiWC07 → WC2007
  if (bytesEq(header, SAV_MAGIC_WC07, 8)) {
    return WC2007_PROFILE;
  }

  // YuGiWC08 → 通过 TDGY 块位置区分 WC2008 和 WC2009
  if (bytesEq(header, SAV_MAGIC_WC08, 8)) {
    // 先检查 WC2009 的 TDGY 位置（偏移较小，64KB 存档也能覆盖）
    const has2009 = WC2009_PROFILE.tdgyOffsets.some((o) => hasTdgyAt(sav, o));
    // 再检查 WC2008 的 TDGY 位置（偏移较大，需要 256KB+）
    const has2008 = WC2008_PROFILE.tdgyOffsets.some((o) => hasTdgyAt(sav, o));

    if (has2009 && !has2008) return WC2009_PROFILE;
    if (has2008 && !has2009) return WC2008_PROFILE;
    if (has2008 && has2009) {
      // 极罕见：两个位置都有 TDGY，按文件大小推测
      return buffer.byteLength >= WC2008_PROFILE.savMinSize
        ? WC2008_PROFILE
        : WC2009_PROFILE;
    }

    throw new Error(
      "存档文件头为 YuGiWC08，但未找到有效的 TDGY 块，文件可能已损坏",
    );
  }

  // 未知文件头
  const headerHex = Array.from(header)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
  throw new Error(
    `未知的存档文件头: ${headerHex}，期望 YuGiWC07 或 YuGiWC08`,
  );
}

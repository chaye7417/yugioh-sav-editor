/**
 * WC2009 存档格式常量。
 *
 * 从 Python constants.py 精确转换。
 */

// ── SAV 文件 ──────────────────────────────────────────────
/** 存档文件大小: 64KB */
export const SAV_SIZE = 0x10000;

/** 文件头魔数 "YuGiWC08" */
export const SAV_MAGIC = new Uint8Array([
  0x59, 0x75, 0x47, 0x69, 0x57, 0x43, 0x30, 0x38,
]);

// ── CRGY 预制卡组块 (My Recipe) ───────────────────────────
/** CRGY 起始偏移 */
export const CRGY_OFFSET = 0x45a8;
/** 每个槽位字节数 */
export const CRGY_SIZE = 228;
/** CRGY 魔数 "CRGY" */
export const CRGY_MAGIC = new Uint8Array([0x43, 0x52, 0x47, 0x59]);
/** 标志位偏移 (相对槽位起始) */
export const CRGY_FLAG_OFFSET = 0x08;
/** 卡组名偏移 (ASCII, 23 字节) */
export const CRGY_NAME_OFFSET = 0x09;
/** 卡组名最大长度 */
export const CRGY_NAME_SIZE = 23;
/** 主卡组数量偏移 (uint16 LE) */
export const CRGY_MAIN_COUNT_OFFSET = 0x24;
/** 副卡组数量偏移 (uint16 LE) */
export const CRGY_SIDE_COUNT_OFFSET = 0x28;
/** 额外卡组数量偏移 (uint16 LE) */
export const CRGY_EXTRA_COUNT_OFFSET = 0x2c;
/** CID 数组偏移 (uint16 LE x 90) */
export const CRGY_CARDS_OFFSET = 0x30;
/** 最大卡片数 (主60 + 副15 + 额外15) */
export const CRGY_MAX_CARDS = 90;
/** 主卡组最大数量 */
export const CRGY_MAIN_MAX = 60;
/** 副卡组最大数量 */
export const CRGY_SIDE_MAX = 15;
/** 额外卡组最大数量 */
export const CRGY_EXTRA_MAX = 15;
/** CID 数组中副卡组起始索引 */
export const CRGY_SIDE_START = 60;
/** CID 数组中额外卡组起始索引 */
export const CRGY_EXTRA_START = 75;
/** 预制卡组槽位数 */
export const CRGY_SLOT_COUNT = 50;
/** CRC32 偏移 (相对槽位起始) */
export const CRGY_CRC32_OFFSET = 0x04;

/** 预计算 50 个槽位偏移 */
export const CRGY_SLOT_OFFSETS: readonly number[] = Array.from(
  { length: CRGY_SLOT_COUNT },
  (_, i) => CRGY_OFFSET + i * CRGY_SIZE,
);

// ── TDGY 游戏状态 ────────────────────────────────────────
/** 主 TDGY 块偏移 */
export const TDGY_OFFSET = 0xb51c;
/** TDGY 块大小 */
export const TDGY_SIZE = 2259;
/** TDGY 魔数 "TDGY" */
export const TDGY_MAGIC = new Uint8Array([0x54, 0x44, 0x47, 0x59]);
/** 备份 TDGY 块偏移 */
export const TDGY_BACKUP_OFFSET = 0xda8c;

// ── TDGY 头部字段 (相对于 TDGY 块起始) ────────────────────
/** 版本号偏移 (uint32 LE) */
export const TDGY_VERSION_OFFSET = 0x04;
/** 版本号基值 */
export const TDGY_VERSION_BASE = 0x3b9aca00;
/** LZ10 压缩数据长度偏移 (uint32 LE) */
export const TDGY_DATALEN_OFFSET = 0x08;
/** CRC32 校验偏移 (uint32 LE) */
export const TDGY_CRC32_OFFSET = 0x0c;
/** LZ10 压缩 gamedata 起始偏移 */
export const TDGY_GAMEDATA_OFFSET = 0x10;

// ── 解压后 gamedata 结构 ─────────────────────────────────
/** WC2009 解压后 gamedata 大小: 9552 bytes */
export const GAMEDATA_DECOMP_SIZE = 0x2550;
/** DP 偏移 (uint32 LE, 相对 gamedata 起始) */
export const GD_DP = 0x024;
/** 半字节数组偏移 (相对 gamedata 起始) */
export const GD_NIBBLE_ARRAY = 0xa4e;
/** 半字节数组大小 */
export const GD_NIBBLE_ARRAY_SIZE = 1488;

// ── 活动卡组 (在解压后 gamedata 中) ─────────────────────────
/** 活动卡组标志位 (uint8, 0x01 = 有效) */
export const GD_ACTIVE_DECK_FLAG = 0xC0;
/** 活动卡组名偏移 (23 bytes, ASCII/Shift-JIS, null 结尾) */
export const GD_ACTIVE_DECK_NAME = 0xC1;
/** 活动卡组名最大长度 */
export const GD_ACTIVE_DECK_NAME_SIZE = 23;
/** 主卡组数量偏移 (uint32 LE) */
export const GD_ACTIVE_DECK_MAIN_COUNT = 0xDC;
/** 副卡组数量偏移 (uint32 LE) */
export const GD_ACTIVE_DECK_SIDE_COUNT = 0xE0;
/** 额外卡组数量偏移 (uint32 LE) */
export const GD_ACTIVE_DECK_EXTRA_COUNT = 0xE4;
/** 主卡组 CID 数组起始偏移 */
export const GD_ACTIVE_DECK_CARDS = 0xE8;
/** 主卡组固定槽位数 */
export const GD_ACTIVE_DECK_MAIN_SLOTS = 60;
/** 副卡组 CID 数组起始偏移 */
export const GD_ACTIVE_DECK_SIDE_OFFSET = 0x160;
/** 副卡组固定槽位数 */
export const GD_ACTIVE_DECK_SIDE_SLOTS = 15;
/** 额外卡组 CID 数组起始偏移 */
export const GD_ACTIVE_DECK_EXTRA_OFFSET = 0x17E;
/** 额外卡组固定槽位数 */
export const GD_ACTIVE_DECK_EXTRA_SLOTS = 15;

// ── CID 有效范围 ─────────────────────────────────────────
/** 最小有效 CID */
export const CID_MIN = 3500;
/** 最大有效 CID */
export const CID_MAX = 8200;
/** 每张卡最多持有数 */
export const COUNT_MAX = 9;

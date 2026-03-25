/**
 * WC2009 存档相关类型定义。
 */

/** 预制卡组数据 */
export interface CrgyRecipe {
  /** 卡组名称 (ASCII) */
  name: string;
  /** 主卡组 CID 列表 */
  mainCids: number[];
  /** 副卡组 CID 列表 */
  sideCids: number[];
  /** 额外卡组 CID 列表 */
  extraCids: number[];
}

/** TDGY 块解析结果 */
export interface TdgyBlock {
  /** TDGY 块在 .sav 中的偏移 */
  offset: number;
  /** LZ10 压缩数据长度 */
  dataLen: number;
  /** CRC32 校验值 */
  crc32: number;
  /** 解压后的 gamedata */
  gamedata: Uint8Array;
}

/** 背包中的一张卡 */
export interface TrunkCard {
  /** Konami CID */
  cid: number;
  /** 持有数量 (0-9) */
  count: number;
}

/** 卡片收藏 (CID → 持有数量) */
export type CardCollection = Map<number, number>;

/** 活动卡组（当前作战用） */
export interface ActiveDeck {
  /** 卡组名称 */
  name: string;
  /** 主卡组实际数量 */
  mainCount: number;
  /** 副卡组实际数量 */
  sideCount: number;
  /** 额外卡组实际数量 */
  extraCount: number;
  /** 主卡组 CID 列表 (长度 = mainCount) */
  mainCids: number[];
  /** 副卡组 CID 列表 (长度 = sideCount) */
  sideCids: number[];
  /** 额外卡组 CID 列表 (长度 = extraCount) */
  extraCids: number[];
}

/** 整体存档数据 */
export interface SaveData {
  /** 原始 .sav 缓冲区引用 */
  rawBuffer: ArrayBuffer;
  /** 主 TDGY 块 */
  tdgy: TdgyBlock;
  /** 备份 TDGY 块 */
  tdgyBackup: TdgyBlock;
  /** 50 个预制卡组槽位 */
  recipes: CrgyRecipe[];
  /** DP 值 */
  dp: number;
  /** 解压后的 gamedata (可变副本，用于编辑) */
  gamedata: Uint8Array;
  /** 活动卡组 */
  activeDeck: ActiveDeck;
}

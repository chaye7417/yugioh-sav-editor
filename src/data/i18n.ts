/**
 * 中文枚举映射模块。
 *
 * 提供 YGOPro 标准 bitmask 到中文名称的映射，
 * 包括卡片类型、种族、属性。
 */

// ============================================================
// 卡片类型 (bitmask，可组合)
// ============================================================

/** 卡片类型 bitmask → 中文名 */
export const TYPE_NAMES: Record<number, string> = {
  0x1: "怪兽",
  0x2: "魔法",
  0x4: "陷阱",
  0x8: "魔法陷阱",
  0x10: "通常",
  0x20: "效果",
  0x40: "融合",
  0x80: "仪式",
  0x100: "陷阱怪兽",
  0x200: "灵魂",
  0x400: "同盟",
  0x800: "二重",
  0x1000: "调整",
  0x2000: "同调",
  0x4000: "衍生物",
  0x8000: "不可被通常召唤（系统用）",
  0x10000: "速攻",
  0x20000: "永续",
  0x40000: "装备",
  0x80000: "场地",
  0x100000: "反击",
  0x200000: "反转",
  0x400000: "卡通",
  0x800000: "超量",
  0x1000000: "灵摆",
  0x2000000: "特殊召唤",
  0x4000000: "连接",
};

/**
 * 解析组合类型 bitmask，返回中文类型名列表。
 *
 * @param typeBits - 卡片类型 bitmask
 * @returns 中文类型名数组
 */
export function parseTypeNames(typeBits: number): string[] {
  const names: string[] = [];
  for (const [bit, name] of Object.entries(TYPE_NAMES)) {
    if (typeBits & Number(bit)) {
      names.push(name);
    }
  }
  return names;
}

/**
 * 获取卡片的主类型（怪兽/魔法/陷阱）。
 *
 * @param typeBits - 卡片类型 bitmask
 * @returns 主类型中文名
 */
export function getMainType(typeBits: number): string {
  if (typeBits & 0x1) return "怪兽";
  if (typeBits & 0x2) return "魔法";
  if (typeBits & 0x4) return "陷阱";
  return "未知";
}

/**
 * 获取卡片的子类型描述。
 * 例如：「效果/调整/同调」「速攻魔法」「反击陷阱」
 *
 * @param typeBits - 卡片类型 bitmask
 * @returns 子类型描述字符串
 */
export function getSubTypeDescription(typeBits: number): string {
  const subTypes: string[] = [];

  // 怪兽子类型
  if (typeBits & 0x10) subTypes.push("通常");
  if (typeBits & 0x20) subTypes.push("效果");
  if (typeBits & 0x40) subTypes.push("融合");
  if (typeBits & 0x80) subTypes.push("仪式");
  if (typeBits & 0x200) subTypes.push("灵魂");
  if (typeBits & 0x400) subTypes.push("同盟");
  if (typeBits & 0x800) subTypes.push("二重");
  if (typeBits & 0x1000) subTypes.push("调整");
  if (typeBits & 0x2000) subTypes.push("同调");
  if (typeBits & 0x200000) subTypes.push("反转");
  if (typeBits & 0x400000) subTypes.push("卡通");
  if (typeBits & 0x800000) subTypes.push("超量");
  if (typeBits & 0x1000000) subTypes.push("灵摆");
  if (typeBits & 0x4000000) subTypes.push("连接");

  // 魔法子类型
  if (typeBits & 0x10000) subTypes.push("速攻");
  if (typeBits & 0x20000) subTypes.push("永续");
  if (typeBits & 0x40000) subTypes.push("装备");
  if (typeBits & 0x80000) subTypes.push("场地");

  // 陷阱子类型
  if (typeBits & 0x100000) subTypes.push("反击");

  return subTypes.join("/");
}

// ============================================================
// 种族 (单一值，非 bitmask 组合)
// ============================================================

/** 种族值 → 中文名 */
export const RACE_NAMES: Record<number, string> = {
  0x1: "战士族",
  0x2: "魔法使族",
  0x4: "天使族",
  0x8: "恶魔族",
  0x10: "不死族",
  0x20: "机械族",
  0x40: "水族",
  0x80: "炎族",
  0x100: "岩石族",
  0x200: "鸟兽族",
  0x400: "植物族",
  0x800: "昆虫族",
  0x1000: "雷族",
  0x2000: "龙族",
  0x4000: "兽族",
  0x8000: "兽战士族",
  0x10000: "恐龙族",
  0x20000: "鱼族",
  0x40000: "海龙族",
  0x80000: "爬虫族",
  0x100000: "念动力族",
  0x200000: "幻神兽族",
  0x400000: "创造神族",
  0x800000: "幻龙族",
  0x1000000: "电子界族",
  0x2000000: "幻想魔族",
};

/**
 * 获取种族中文名。
 *
 * @param raceValue - 种族值
 * @returns 中文种族名，未知时返回 "未知种族"
 */
export function getRaceName(raceValue: number): string {
  return RACE_NAMES[raceValue] ?? "未知种族";
}

// ============================================================
// 属性 (单一值)
// ============================================================

/** 属性值 → 中文名 */
export const ATTRIBUTE_NAMES: Record<number, string> = {
  0x1: "地",
  0x2: "水",
  0x4: "炎",
  0x8: "风",
  0x10: "光",
  0x20: "暗",
  0x40: "神",
};

/**
 * 获取属性中文名。
 *
 * @param attrValue - 属性值
 * @returns 中文属性名，未知时返回 "未知属性"
 */
export function getAttributeName(attrValue: number): string {
  return ATTRIBUTE_NAMES[attrValue] ?? "未知属性";
}

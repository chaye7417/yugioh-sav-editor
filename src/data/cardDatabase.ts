/**
 * 卡片数据库服务模块。
 *
 * 从构建产物 cards.json 加载 WC2009 卡池数据，
 * 提供按 CID、passcode、关键词等查询卡片的能力。
 */

// ============================================================
// 类型定义
// ============================================================

/** 单张卡片数据（与 cards.json 结构一致） */
export interface CardEntry {
  /** 中文卡名 */
  name: string;
  /** 中文效果描述 */
  desc: string;
  /** 卡片类型 bitmask */
  type: number;
  /** 攻击力（-2 表示 ?） */
  atk: number;
  /** 守备力（-2 表示 ?） */
  def: number;
  /** 等级/阶级 */
  level: number;
  /** 种族 */
  race: number;
  /** 属性 */
  attribute: number;
  /** YGOPro 密码（passcode） */
  passcode: string;
  /** WC2009 nibble 索引 */
  nibbleIndex: number;
}

/** cards.json 的完整结构：CID(string) → CardEntry */
export type CardDataMap = Record<string, CardEntry>;

// ============================================================
// CardDatabase 类
// ============================================================

/** 卡片数据库，提供多种查询方式。 */
export class CardDatabase {
  private _cards: CardDataMap = {};
  private _byPasscode: Map<string, CardEntry> = new Map();
  private _byNibbleIndex: Map<number, CardEntry> = new Map();
  private _cidByPasscode: Map<string, string> = new Map();
  private _loaded = false;

  /**
   * 从 JSON 数据初始化数据库。
   *
   * @param data - cards.json 解析后的对象
   */
  load(data: CardDataMap): void {
    this._cards = data;
    this._byPasscode.clear();
    this._byNibbleIndex.clear();
    this._cidByPasscode.clear();

    for (const [cid, card] of Object.entries(data)) {
      this._byPasscode.set(card.passcode, card);
      this._byNibbleIndex.set(card.nibbleIndex, card);
      this._cidByPasscode.set(card.passcode, cid);
    }

    // 注册 Errata 修正版密码别名
    // 部分卡片被官方修改效果后分配了新密码（通常 +1），
    // Format Library 等外部数据源使用新密码，WC2009 使用旧密码
    for (const [altPasscode, origPasscode] of ERRATA_PASSCODE_MAP) {
      const card = this._byPasscode.get(origPasscode);
      if (card) {
        this._byPasscode.set(altPasscode, card);
        const cid = this._cidByPasscode.get(origPasscode);
        if (cid) this._cidByPasscode.set(altPasscode, cid);
      }
    }

    this._loaded = true;
  }

  /** 数据库是否已加载。 */
  get isLoaded(): boolean {
    return this._loaded;
  }

  /** 获取所有卡片数量。 */
  get size(): number {
    return Object.keys(this._cards).length;
  }

  /**
   * 通过 CID 查询卡片。
   *
   * @param cid - Konami CID（字符串）
   * @returns 卡片数据，不存在返回 undefined
   */
  getByCid(cid: string): CardEntry | undefined {
    return this._cards[cid];
  }

  /**
   * 通过 passcode 查询卡片。
   *
   * @param passcode - YGOPro 密码
   * @returns 卡片数据，不存在返回 undefined
   */
  getByPasscode(passcode: string): CardEntry | undefined {
    return this._byPasscode.get(passcode);
  }

  /**
   * 通过 nibble 索引查询卡片。
   *
   * @param nibbleIndex - WC2009 nibble 数组中的索引
   * @returns 卡片数据，不存在返回 undefined
   */
  getByNibbleIndex(nibbleIndex: number): CardEntry | undefined {
    return this._byNibbleIndex.get(nibbleIndex);
  }

  /**
   * 通过 passcode 查询 CID。
   *
   * @param passcode - YGOPro 密码
   * @returns CID 字符串，不存在返回 undefined
   */
  getCidByPasscode(passcode: string): string | undefined {
    return this._cidByPasscode.get(passcode);
  }

  /**
   * 获取所有卡片（CID → CardEntry 的条目数组）。
   *
   * @returns [CID, CardEntry] 元组数组
   */
  getAllEntries(): [string, CardEntry][] {
    return Object.entries(this._cards);
  }

  /**
   * 按关键词搜索卡片（匹配卡名或描述）。
   *
   * @param keyword - 搜索关键词
   * @param limit - 最大返回数量，默认 50
   * @returns 匹配的 [CID, CardEntry] 数组
   */
  search(keyword: string, limit: number = 50): [string, CardEntry][] {
    if (!keyword.trim()) return [];

    const lowerKeyword = keyword.toLowerCase();
    const results: [string, CardEntry][] = [];

    for (const [cid, card] of Object.entries(this._cards)) {
      if (
        card.name.toLowerCase().includes(lowerKeyword) ||
        card.desc.toLowerCase().includes(lowerKeyword)
      ) {
        results.push([cid, card]);
        if (results.length >= limit) break;
      }
    }

    return results;
  }
}

// ============================================================
// 单例实例
// ============================================================

/** 全局卡片数据库单例 */
export const cardDatabase = new CardDatabase();

/** 当前已加载的卡片数据库对应的版本 */
let currentLoadedVersion: string = "wc2009";

/** 版本 → 卡片数据 JSON URL 映射 */
const base = import.meta.env.BASE_URL;
const VERSION_CARD_URL: Record<string, string> = {
  wc2007: `${base}cards-wc2007.json`,
  wc2009: `${base}cards.json`,
  wc2008: `${base}cards-wc2008.json`,
};

/**
 * 从网络加载 cards.json 并初始化数据库。
 * 适用于浏览器环境。
 *
 * @param url - cards.json 的 URL，默认 "/cards.json"
 */
export async function loadCardDatabase(
  url: string = `${import.meta.env.BASE_URL}cards.json`
): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`加载卡片数据库失败: ${response.status} ${response.statusText}`);
  }
  const data: CardDataMap = await response.json();
  cardDatabase.load(data);
}

/**
 * 根据游戏版本重新加载对应的卡片数据库。
 * 如果当前已加载的版本与目标版本相同，则跳过。
 *
 * @param version - 游戏版本标识 ("wc2008" | "wc2009")
 */
export async function reloadForVersion(version: string): Promise<void> {
  if (currentLoadedVersion === version && cardDatabase.isLoaded) return;
  const url = VERSION_CARD_URL[version] ?? `${base}cards.json`;
  await loadCardDatabase(url);
  currentLoadedVersion = version;
}

/**
 * 获取当前已加载的卡片数据库版本。
 *
 * @returns 当前版本标识
 */
export function getCurrentCardDbVersion(): string {
  return currentLoadedVersion;
}

// ============================================================
// Errata 密码映射
// ============================================================

/**
 * Errata 修正版密码 → 原始密码。
 *
 * 部分卡片被 Konami 官方修改效果后分配了新密码（通常在原密码基础上 +1）。
 * Format Library 等外部数据源使用新密码，WC2009 使用旧密码。
 * 在此注册别名后，用新密码也能查到 WC2009 中的卡片。
 */
const ERRATA_PASSCODE_MAP: [string, string][] = [
  // [Format Library 密码, WC2009 密码]
  // —— Errata 修正版（效果修改后新密码，通常 +1）
  ["83555667", "83555666"],  // 破坏轮
  ["81439174", "81439173"],  // 愚蠢的埋葬
  ["23401840", "23401839"],  // 千手神
  ["81172177", "81172176"],  // 恶魔喜剧演员
  ["98502115", "98502113"],  // 超魔导剑士-黑魔导剑士
  ["90330454", "90330453"],  // 魔女狩猎
  // —— 异画版（alternate artwork，完全不同的密码）
  ["78734254", "17955766"],  // 新空间侠·水波海豚
  ["74335036", "24094653"],  // 融合
];

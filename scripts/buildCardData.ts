/**
 * 构建脚本：从 SQLite CDB 提取 WC 系列卡池的中文卡片数据，生成 public/cards[-wc20XX].json。
 *
 * 数据流：
 * 1. cid_to_nibble.json 确定卡池
 * 2. konami_card_db.json 提供 CID → 英文名
 * 3. pw_to_name.json 提供 passcode → 英文名（反转得到 英文名 → passcode）
 * 4. 通过英文名关联 CID → passcode
 * 5. 用 passcode 查 zh-CN-cards.cdb 获取中文名/效果/数值数据
 *
 * 用法：
 *   npx tsx scripts/buildCardData.ts              # 构建 WC2009（默认）
 *   npx tsx scripts/buildCardData.ts --game wc2008 # 构建 WC2008
 *   npx tsx scripts/buildCardData.ts --game wc2009 # 构建 WC2009
 */

import Database from "better-sqlite3";
import * as fs from "node:fs";
import * as path from "node:path";

// ============================================================
// 类型定义
// ============================================================

/** CDB texts 表行 */
interface CdbTextRow {
  id: number;
  name: string;
  desc: string;
}

/** CDB datas 表行 */
interface CdbDataRow {
  id: number;
  ot: number;
  alias: number;
  setcode: number;
  type: number;
  atk: number;
  def: number;
  level: number;
  race: number;
  attribute: number;
  category: number;
}

/** Konami 卡片数据库条目 */
interface KonamiCardEntry {
  name_en: string;
  type: string;
  race: string;
  attribute: string;
  atk: number | null;
  def: number | null;
  level: number | null;
}

/** 输出的卡片数据 */
interface CardData {
  name: string;
  desc: string;
  type: number;
  atk: number;
  def: number;
  level: number;
  race: number;
  attribute: number;
  passcode: string;
  nibbleIndex: number;
}

/** 游戏配置 */
interface GameConfig {
  label: string;
  cidToNibbleFile: string;
  outputFile: string;
}

// ============================================================
// 游戏配置
// ============================================================

const GAME_CONFIGS: Record<string, GameConfig> = {
  wc2009: {
    label: "WC2009",
    cidToNibbleFile: "cid_to_nibble.json",
    outputFile: "cards.json",
  },
  wc2008: {
    label: "WC2008",
    cidToNibbleFile: "cid_to_nibble_wc2008.json",
    outputFile: "cards-wc2008.json",
  },
  wc2007: {
    label: "WC2007",
    cidToNibbleFile: "cid_to_nibble_wc2007.json",
    outputFile: "cards-wc2007.json",
  },
};

// ============================================================
// 路径常量
// ============================================================

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const REF_DATA_DIR = path.join(PROJECT_ROOT, "reference-data");

const CDB_PATH = path.join(REF_DATA_DIR, "zh-CN-cards.cdb");
const KONAMI_DB_PATH = path.join(REF_DATA_DIR, "konami_card_db.json");
const PW_TO_NAME_PATH = path.join(REF_DATA_DIR, "pw_to_name.json");

// ============================================================
// 辅助函数
// ============================================================

/**
 * 解析命令行参数，返回游戏标识。
 *
 * @returns 游戏标识（wc2008 或 wc2009）
 */
function parseGameArg(): string {
  const args = process.argv.slice(2);
  const gameIdx = args.indexOf("--game");
  if (gameIdx !== -1 && args[gameIdx + 1]) {
    const game = args[gameIdx + 1].toLowerCase();
    if (!(game in GAME_CONFIGS)) {
      console.error(`不支持的游戏: ${game}，可选: ${Object.keys(GAME_CONFIGS).join(", ")}`);
      process.exit(1);
    }
    return game;
  }
  return "wc2009"; // 默认
}

/**
 * 从 CDB 的 level 字段提取真实等级。
 * 灵摆怪兽的 level 字段高位编码了灵摆刻度。
 *
 * @param rawLevel - CDB 中的原始 level 值
 * @returns 真实等级（1-12）
 */
function extractLevel(rawLevel: number): number {
  return rawLevel & 0xff;
}

/**
 * 读取 JSON 文件并解析。
 *
 * @param filePath - JSON 文件的绝对路径
 * @returns 解析后的对象
 */
function readJson<T>(filePath: string): T {
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content) as T;
}

// ============================================================
// 主流程
// ============================================================

function main(): void {
  const gameKey = parseGameArg();
  const config = GAME_CONFIGS[gameKey];

  const cidToNibblePath = path.join(REF_DATA_DIR, config.cidToNibbleFile);
  const outputPath = path.join(PROJECT_ROOT, "public", config.outputFile);

  console.log(`=== ${config.label} 卡片数据构建 ===\n`);

  // 1. 读取 CID → nibble 映射
  const cidToNibble: Record<string, number> = readJson(cidToNibblePath);
  const cidList = Object.keys(cidToNibble);
  console.log(`${config.label} 卡池数量: ${cidList.length}`);

  // 2. 读取 Konami 卡片数据库（CID → 英文名等）
  const konamiDb: Record<string, KonamiCardEntry> = readJson(KONAMI_DB_PATH);
  console.log(`Konami DB 条目数: ${Object.keys(konamiDb).length}`);

  // 3. 读取 passcode → 英文名，反转为 英文名 → passcode
  const pwToName: Record<string, string> = readJson(PW_TO_NAME_PATH);
  const nameToPasscode = new Map<string, string>();
  for (const [passcode, name] of Object.entries(pwToName)) {
    nameToPasscode.set(name, passcode);
  }
  console.log(`pw_to_name 条目数: ${Object.keys(pwToName).length}`);

  // 4. 建立 CID → passcode 映射
  const cidToPasscode = new Map<string, string>();
  let mappingMissCount = 0;
  for (const cid of cidList) {
    const konamiEntry = konamiDb[cid];
    if (!konamiEntry) {
      console.warn(`  [跳过] CID ${cid} 在 konami_card_db.json 中不存在`);
      mappingMissCount++;
      continue;
    }
    const passcode = nameToPasscode.get(konamiEntry.name_en);
    if (!passcode) {
      console.warn(
        `  [跳过] CID ${cid} (${konamiEntry.name_en}) 在 pw_to_name.json 中找不到 passcode`
      );
      mappingMissCount++;
      continue;
    }
    cidToPasscode.set(cid, passcode);
  }
  console.log(
    `CID → passcode 映射成功: ${cidToPasscode.size}, 失败: ${mappingMissCount}`
  );

  // 5. 打开 CDB，查询中文数据
  const db = new Database(CDB_PATH, { readonly: true });

  const textStmt = db.prepare<[number], CdbTextRow>(
    "SELECT id, name, desc FROM texts WHERE id = ?"
  );
  const dataStmt = db.prepare<[number], CdbDataRow>(
    "SELECT * FROM datas WHERE id = ?"
  );

  // 6. 组装输出数据
  const result: Record<string, CardData> = {};
  let successCount = 0;
  let cdbMissCount = 0;

  for (const cid of cidList) {
    const passcode = cidToPasscode.get(cid);
    if (!passcode) continue;

    const passcodeNum = Number(passcode);
    const textRow = textStmt.get(passcodeNum);
    const dataRow = dataStmt.get(passcodeNum);

    if (!textRow || !dataRow) {
      // 尝试用 alias 查找（有些卡在 CDB 中可能用了 alias）
      console.warn(
        `  [CDB未找到] CID ${cid}, passcode ${passcode}`
      );
      cdbMissCount++;
      continue;
    }

    result[cid] = {
      name: textRow.name,
      desc: textRow.desc,
      type: dataRow.type,
      atk: dataRow.atk,
      def: dataRow.def,
      level: extractLevel(dataRow.level),
      race: dataRow.race,
      attribute: dataRow.attribute,
      passcode: passcode,
      nibbleIndex: cidToNibble[cid],
    };
    successCount++;
  }

  db.close();

  console.log(`\n构建结果:`);
  console.log(`  成功: ${successCount}`);
  console.log(`  CID→passcode 映射失败: ${mappingMissCount}`);
  console.log(`  CDB 查询失败: ${cdbMissCount}`);
  console.log(`  总计: ${successCount + mappingMissCount + cdbMissCount} / ${cidList.length}`);

  // 7. 写入输出文件
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`\n已写入: ${outputPath}`);

  // 8. 抽查几张卡
  const sampleCids = cidList.slice(0, 5);
  console.log("\n=== 抽查 ===");
  for (const cid of sampleCids) {
    const card = result[cid];
    if (card) {
      console.log(
        `  CID ${cid}: ${card.name} (passcode=${card.passcode}, nibble=${card.nibbleIndex}, ATK=${card.atk}, DEF=${card.def}, Lv=${card.level})`
      );
    } else {
      console.log(`  CID ${cid}: [缺失]`);
    }
  }
}

main();

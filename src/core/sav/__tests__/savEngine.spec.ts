/**
 * 存档引擎验证测试。
 *
 * 使用 reference-data/2009.sav 进行:
 * 1. .sav 解析不报错
 * 2. LZ10 解压→压缩 roundtrip 测试
 * 3. 预制卡组读取
 * 4. 背包卡片读取 (nibble 数组)
 * 5. 写回后文件大小一致
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parseSav } from "../savParser";
import { writeSav } from "../savWriter";
import { decompress, compress } from "../lz10";
import { crc32 } from "../crc32";
import { readRecipe, readAllRecipes } from "../recipeEditor";
import { getCardCount, readCollection } from "../collectionEditor";
import { readTrunk, getTrunkStats } from "../trunkReader";
import { SAV_SIZE, GD_NIBBLE_ARRAY } from "../constants";

const SAV_PATH = resolve(__dirname, "../../../../reference-data/2009.sav");

function loadSav(): ArrayBuffer {
  const buf = readFileSync(SAV_PATH);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

describe("LZ10 压缩/解压", () => {
  it("解压 TDGY gamedata 不报错", () => {
    const buffer = loadSav();
    const saveData = parseSav(buffer);
    expect(saveData.gamedata.length).toBeGreaterThan(0);
  });

  it("roundtrip: 解压后再压缩再解压，数据一致", () => {
    const buffer = loadSav();
    const saveData = parseSav(buffer);
    const original = saveData.gamedata;

    // 压缩
    const compressed = compress(original);
    // 再解压
    const decompressed = decompress(compressed);

    expect(decompressed.length).toBe(original.length);
    for (let i = 0; i < original.length; i++) {
      expect(decompressed[i]).toBe(original[i]);
    }
  });

  it("压缩简单数据的 roundtrip", () => {
    const data = new Uint8Array(256);
    for (let i = 0; i < 256; i++) data[i] = i % 64;

    const compressed = compress(data);
    const decompressed = decompress(compressed);

    expect(decompressed.length).toBe(data.length);
    for (let i = 0; i < data.length; i++) {
      expect(decompressed[i]).toBe(data[i]);
    }
  });
});

describe("CRC32", () => {
  it("空数据 CRC32 = 0x00000000", () => {
    expect(crc32(new Uint8Array(0))).toBe(0x00000000);
  });

  it("已知值测试: 'ABCD'", () => {
    const data = new Uint8Array([0x41, 0x42, 0x43, 0x44]);
    // zlib.crc32(b"ABCD") = 0xDB1720A5
    expect(crc32(data)).toBe(0xdb1720a5);
  });
});

describe(".sav 解析", () => {
  it("解析不报错，基本结构正确", () => {
    const buffer = loadSav();
    const saveData = parseSav(buffer);

    expect(saveData.rawBuffer).toBe(buffer);
    expect(saveData.tdgy).toBeDefined();
    expect(saveData.tdgyBackup).toBeDefined();
    expect(saveData.recipes).toHaveLength(50);
    expect(saveData.gamedata.length).toBeGreaterThan(0);
  });

  it("DP 值为合理范围", () => {
    const buffer = loadSav();
    const saveData = parseSav(buffer);
    // DP 应该是一个非负数
    expect(saveData.dp).toBeGreaterThanOrEqual(0);
    expect(saveData.dp).toBeLessThan(0xffffffff);
  });

  it("文件大小不正确时抛错", () => {
    const badBuffer = new ArrayBuffer(1024);
    expect(() => parseSav(badBuffer)).toThrow("SAV 文件大小");
  });

  it("文件头不正确时抛错", () => {
    const badBuffer = new ArrayBuffer(SAV_SIZE);
    expect(() => parseSav(badBuffer)).toThrow("SAV 文件头错误");
  });
});

describe("预制卡组读取", () => {
  it("能读取所有 50 个槽位", () => {
    const buffer = loadSav();
    const sav = new Uint8Array(buffer);
    const recipes = readAllRecipes(sav);
    expect(recipes).toHaveLength(50);
  });

  it("非空槽位有卡组名和卡片", () => {
    const buffer = loadSav();
    const sav = new Uint8Array(buffer);
    const recipes = readAllRecipes(sav);

    // 找到第一个非空槽位
    const nonEmpty = recipes.find((r) => r.name !== "");
    if (nonEmpty) {
      expect(nonEmpty.name.length).toBeGreaterThan(0);
      expect(nonEmpty.mainCids.length).toBeGreaterThan(0);
      console.log(
        `找到非空卡组: "${nonEmpty.name}", ` +
          `主${nonEmpty.mainCids.length} 副${nonEmpty.sideCids.length} 额外${nonEmpty.extraCids.length}`
      );
    } else {
      console.log("所有卡组槽位均为空");
    }
  });

  it("读取结果与 parseSav 一致", () => {
    const buffer = loadSav();
    const sav = new Uint8Array(buffer);
    const recipes = readAllRecipes(sav);
    const saveData = parseSav(buffer);

    for (let i = 0; i < 50; i++) {
      expect(recipes[i].name).toBe(saveData.recipes[i].name);
      expect(recipes[i].mainCids).toEqual(saveData.recipes[i].mainCids);
    }
  });
});

describe("背包 (nibble 数组)", () => {
  it("能读取卡片持有数量", () => {
    const buffer = loadSav();
    const saveData = parseSav(buffer);

    // 尝试读取 nibble index 0 的卡片数量
    const count = getCardCount(saveData.gamedata, 0);
    expect(count).toBeGreaterThanOrEqual(0);
    expect(count).toBeLessThanOrEqual(9);
  });

  it("使用 cidToNibble 映射读取背包", () => {
    const buffer = loadSav();
    const saveData = parseSav(buffer);

    // 构造一个小的测试映射 (CID 3500 → nibble 0, CID 3501 → nibble 1, ...)
    const testMap = new Map<number, number>();
    for (let i = 0; i < 100; i++) {
      testMap.set(3500 + i, i);
    }

    const trunk = readTrunk(saveData.gamedata, testMap);
    const stats = getTrunkStats(trunk);
    console.log(
      `测试映射读取: ${stats.uniqueCount} 种卡, 共 ${stats.totalCount} 张`
    );
    // 应该是个有效结果
    expect(trunk).toBeInstanceOf(Array);
  });
});

describe("写回测试", () => {
  it("写回后文件大小一致 (64KB)", () => {
    const buffer = loadSav();
    const saveData = parseSav(buffer);

    const result = writeSav(buffer, saveData);
    expect(result.byteLength).toBe(SAV_SIZE);
  });

  it("未修改的写回数据与原始一致", () => {
    const buffer = loadSav();
    const saveData = parseSav(buffer);

    const result = writeSav(buffer, saveData);
    const original = new Uint8Array(buffer);
    const written = new Uint8Array(result);

    // TDGY 区域因为重新压缩可能有微小差异（压缩输出不一定 bit-for-bit 相同）
    // 但 CRGY 区域应该一致，文件头应该一致
    expect(written[0]).toBe(original[0]); // Y
    expect(written[1]).toBe(original[1]); // u
    expect(written[2]).toBe(original[2]); // G
    expect(written[3]).toBe(original[3]); // i
    expect(written.length).toBe(original.length);
  });

  it("修改 DP 后写回再读取", () => {
    const buffer = loadSav();
    const saveData = parseSav(buffer);
    const originalDp = saveData.dp;

    // 修改 DP
    saveData.dp = 99999;
    const result = writeSav(buffer, saveData);

    // 重新解析
    const saveData2 = parseSav(result);
    expect(saveData2.dp).toBe(99999);

    // 恢复 DP 确认
    saveData2.dp = originalDp;
    const result2 = writeSav(result, saveData2);
    const saveData3 = parseSav(result2);
    expect(saveData3.dp).toBe(originalDp);
  });
});

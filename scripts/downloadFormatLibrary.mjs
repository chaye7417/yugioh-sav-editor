/**
 * 下载 formatlibrary.com 全部赛制和卡组数据到本地 JSON。
 *
 * 用法: node scripts/downloadFormatLibrary.mjs
 * 产出: public/fl-formats.json, public/fl-decks.json
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://formatlibrary.com/api";
const PAGE_SIZE = 100;

async function fetchJson(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`${url} -> ${resp.status}`);
  return resp.json();
}

async function main() {
  // 1. 下载赛制
  console.log("下载赛制列表...");
  const formats = await fetchJson(`${API}/formats`);
  console.log(`  ${formats.length} 个赛制`);

  // 2. 下载全部卡组（分页）
  console.log("下载卡组列表...");
  const total = await fetchJson(`${API}/decks/count`);
  console.log(`  共 ${total} 个卡组，开始分页下载...`);

  const allDecks = [];
  const totalPages = Math.ceil(total / PAGE_SIZE);

  for (let page = 1; page <= totalPages; page++) {
    const url = `${API}/decks?limit=${PAGE_SIZE}&page=${page}&sort=rating:DESC`;
    const batch = await fetchJson(url);
    allDecks.push(...batch);
    process.stdout.write(`  页 ${page}/${totalPages} (${allDecks.length}/${total})\r`);
    // 避免请求太快
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log(`\n  下载完成: ${allDecks.length} 个卡组`);

  // 3. 下载每个卡组的详情（含 YDK 和卡片列表）
  console.log("下载卡组详情（含卡片列表）...");
  const details = [];
  for (let i = 0; i < allDecks.length; i++) {
    const deck = allDecks[i];
    try {
      const detail = await fetchJson(`${API}/decks/${deck.id}`);
      details.push({
        id: detail.id,
        name: detail.name,
        deckTypeName: detail.deckTypeName,
        builderName: detail.builderName,
        formatName: detail.formatName,
        origin: detail.origin,
        placement: detail.placement,
        rating: detail.rating,
        downloads: detail.downloads,
        eventAbbreviation: detail.eventAbbreviation,
        ydk: detail.ydk,
        main: (detail.main || []).map((c) => ({ name: c.name, artworkId: c.artworkId })),
        extra: (detail.extra || []).map((c) => ({ name: c.name, artworkId: c.artworkId })),
        side: (detail.side || []).map((c) => ({ name: c.name, artworkId: c.artworkId })),
      });
    } catch (e) {
      console.warn(`  跳过卡组 ${deck.id}: ${e.message}`);
    }

    if ((i + 1) % 50 === 0 || i === allDecks.length - 1) {
      process.stdout.write(`  ${i + 1}/${allDecks.length}\r`);
    }
    // 控制请求频率
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log(`\n  详情下载完成: ${details.length} 个`);

  // 4. 写入文件
  const outDir = join(__dirname, "..", "public");

  const formatsPath = join(outDir, "fl-formats.json");
  writeFileSync(formatsPath, JSON.stringify(formats));
  console.log(`写入 ${formatsPath} (${(JSON.stringify(formats).length / 1024).toFixed(1)} KB)`);

  const decksPath = join(outDir, "fl-decks.json");
  writeFileSync(decksPath, JSON.stringify(details));
  const sizeMB = (JSON.stringify(details).length / 1024 / 1024).toFixed(1);
  console.log(`写入 ${decksPath} (${sizeMB} MB)`);

  console.log("完成！");
}

main().catch((e) => {
  console.error("失败:", e);
  process.exit(1);
});

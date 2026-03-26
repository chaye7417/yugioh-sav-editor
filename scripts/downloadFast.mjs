/**
 * 快速下载 formatlibrary.com 全部数据（20 并发）。
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://formatlibrary.com/api";
const CONCURRENCY = 20;

async function fetchJson(url) {
  for (let retry = 0; retry < 3; retry++) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`${resp.status}`);
      return await resp.json();
    } catch (e) {
      if (retry === 2) throw e;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

/** 并发执行任务，限制同时运行数 */
async function parallel(tasks, concurrency) {
  const results = new Array(tasks.length);
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

async function main() {
  console.log("1/3 下载赛制列表...");
  const formats = await fetchJson(`${API}/formats`);
  console.log(`  ${formats.length} 个赛制`);

  console.log("2/3 下载卡组列表（并发）...");
  const total = await fetchJson(`${API}/decks/count`);
  const pageSize = 100;
  const totalPages = Math.ceil(total / pageSize);
  console.log(`  共 ${total} 个卡组，${totalPages} 页`);

  const pageTasks = Array.from({ length: totalPages }, (_, i) => {
    const page = i + 1;
    return async () => {
      const data = await fetchJson(`${API}/decks?limit=${pageSize}&page=${page}&sort=rating:DESC`);
      if (page % 10 === 0) process.stdout.write(`  列表 ${page}/${totalPages}\n`);
      return data;
    };
  });

  const pageResults = await parallel(pageTasks, CONCURRENCY);
  const allDecks = pageResults.flat();
  console.log(`  列表完成: ${allDecks.length} 个卡组`);

  console.log(`3/3 下载卡组详情（${CONCURRENCY} 并发）...`);
  let done = 0;
  const detailTasks = allDecks.map((deck) => {
    return async () => {
      try {
        const detail = await fetchJson(`${API}/decks/${deck.id}`);
        done++;
        if (done % 200 === 0) process.stdout.write(`  详情 ${done}/${allDecks.length}\n`);
        return {
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
        };
      } catch {
        done++;
        return null;
      }
    };
  });

  const details = (await parallel(detailTasks, CONCURRENCY)).filter(Boolean);
  console.log(`  详情完成: ${details.length} 个`);

  const outDir = join(__dirname, "..", "public");

  writeFileSync(join(outDir, "fl-formats.json"), JSON.stringify(formats));
  console.log(`写入 fl-formats.json`);

  writeFileSync(join(outDir, "fl-decks.json"), JSON.stringify(details));
  const sizeMB = (JSON.stringify(details).length / 1024 / 1024).toFixed(1);
  console.log(`写入 fl-decks.json (${sizeMB} MB)`);

  console.log("完成！");
}

main().catch((e) => { console.error(e); process.exit(1); });

// 驗證三個回收來源爬蟲的實際回傳：筆數、內容抽樣、跨來源交集
// 直接載入 production 的 TS 原始碼，測到的就是線上真正執行的邏輯
// 用法：npx tsx scripts/verify-recycle-sources.ts
import {
  scrapeSource1, scrapeSource2, scrapeSource3, scrapeUs3cAirPods,
} from "../src/lib/recycle/sources";
import type { ScrapedRow } from "../src/lib/recycle/sources";
import { normalizeRecycleRow } from "../src/lib/normalize-model";

function report(name: string, rows: ScrapedRow[]) {
  console.log(`\n===== ${name}：${rows.length} 筆 =====`);
  if (!rows.length) { console.log("  ❌ 0 筆 — 來源已失效"); return; }
  const byCat: Record<string, number> = {};
  for (const r of rows) byCat[r.category] = (byCat[r.category] || 0) + 1;
  console.log("  分類:", Object.entries(byCat).map(([k, v]) => `${k}=${v}`).join(" "));
  const prices = rows.map(r => r.price);
  console.log("  價格區間:", Math.min(...prices), "~", Math.max(...prices));
  console.log("  帶官方價筆數:", rows.filter(r => r.officialPrice).length);
  console.log("  抽樣:");
  for (const r of rows.slice(0, 4)) {
    console.log(`    ${r.modelKey} | ${r.brand} ${r.modelName} ${r.storage || ""} ${r.variant || ""} = $${r.price}${r.officialPrice ? ` (官方 $${r.officialPrice})` : ""}`);
  }
  const bad = rows.filter(r => !r.modelKey || !Number.isInteger(r.price) || r.price <= 0);
  console.log(bad.length ? `  ⚠️ 格式異常 ${bad.length} 筆` : "  ✅ 資料格式檢查通過");
}

async function main() {
  const t0 = Date.now();
  const [s1, s2, s3, sA] = await Promise.all([
    scrapeSource1(), scrapeSource2(), scrapeSource3(), scrapeUs3cAirPods(),
  ]);

  report("source1 (second3c)", s1);
  report("source2 (us3c)", s2);
  report("source2-airpods (us3c speaker)", sA);
  report("source3 (jyes)", s3);

  // 用 aggregate.ts 實際採用的正規化 key 比對（不是 scraper 的原始 modelKey）
  const nk = (rows: ScrapedRow[]) => new Set(rows.map(r => normalizeRecycleRow({
    brand: r.brand, modelName: r.modelName, storage: r.storage, variant: r.variant,
  }).modelKey));
  const k1 = nk(s1), k2 = nk([...s2, ...sA]), k3 = nk(s3);
  console.log("\n===== 跨來源交集（正規化後的 modelKey）=====");
  console.log(`  s1∩s2: ${[...k1].filter(k => k2.has(k)).length}  s1∩s3: ${[...k1].filter(k => k3.has(k)).length}  s2∩s3: ${[...k2].filter(k => k3.has(k)).length}`);
  console.log(`  三來源皆有: ${[...k1].filter(k => k2.has(k) && k3.has(k)).length}`);
  console.log(`  總不重複 modelKey: ${new Set([...k1, ...k2, ...k3]).size}`);
  const only3 = [...k3].filter(k => !k1.has(k) && !k2.has(k));
  console.log(`  只有 s3 有的: ${only3.length} 筆（jyes 多為無容量的基礎機型）`);
  console.log(`    例:`, only3.slice(0, 5).join(", "));
  console.log(`\n耗時 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch(e => { console.error(e); process.exit(1); });

// 重新計算所有 RecyclePrice.minPrice
// 新公式：
//   有官方價 → max(officialPrice × 1.4, comp × 0.85)，capped at comp
//   無官方價 → comp × 0.85（之前是 0.7，太低）
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("missing env"); process.exit(1); }
const client = createClient({ url, authToken });

const OFFICIAL_MARGIN = 0.4;
const COMPETITOR_DISCOUNT = 0.85; // 從 0.7 調高
const ROUND_TO = 100;

function calcFinalPrice(competitorPrices, officialPrice) {
  const minComp = competitorPrices.length > 0 ? Math.min(...competitorPrices) : 0;
  let target;
  if (officialPrice && officialPrice > 0) {
    const fromOfficial = officialPrice * (1 + OFFICIAL_MARGIN);
    const fromCompetitor = minComp * COMPETITOR_DISCOUNT;
    target = Math.max(fromOfficial, fromCompetitor);
    target = Math.min(target, minComp);
  } else {
    target = minComp * COMPETITOR_DISCOUNT;
  }
  return Math.round(target / ROUND_TO) * ROUND_TO;
}

console.log("[1] 抓所有 row...");
const all = await client.execute(`
  SELECT id, source1Price, source2Price, source3Price, officialPrice, minPrice
  FROM RecyclePrice
`);
console.log(`  ${all.rows.length} rows`);

let updated = 0;
for (const r of all.rows) {
  const comps = [r.source1Price, r.source2Price, r.source3Price].filter(p => p && p > 0);
  if (comps.length === 0) continue;
  const newMin = calcFinalPrice(comps, r.officialPrice);
  if (newMin !== r.minPrice) {
    await client.execute({
      sql: "UPDATE RecyclePrice SET minPrice = ? WHERE id = ?",
      args: [newMin, r.id],
    });
    updated++;
  }
}

// 同時更新 SiteSetting
await client.execute({
  sql: "UPDATE SiteSetting SET recycleCompetitorDiscount = ? WHERE id = 1",
  args: [COMPETITOR_DISCOUNT],
});

console.log(`\n[done] 更新 ${updated} 筆，新 competitor discount = ${COMPETITOR_DISCOUNT}`);

// 比對結果
const sample = await client.execute(`
  SELECT modelName, storage, source1Price, source2Price, source3Price, officialPrice, minPrice
  FROM RecyclePrice
  WHERE modelName LIKE 'iPhone 13 Pro%' AND category = 'phone'
  ORDER BY modelName,
    CASE WHEN storage='128GB' THEN 1 WHEN storage='256GB' THEN 2 WHEN storage='512GB' THEN 3 WHEN storage='1TB' THEN 4 ELSE 99 END
`);
console.log(`\n[verify] iPhone 13 Pro 系列:`);
for (const r of sample.rows) {
  const comps = [r.source1Price, r.source2Price, r.source3Price].filter(Boolean).join(',');
  console.log(`  ${r.modelName.padEnd(20)} ${(r.storage||'').padEnd(7)} → ${r.minPrice} (官方=${r.officialPrice||'-'}, 同業=${comps})`);
}

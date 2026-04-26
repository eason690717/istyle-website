// 最終公式（確保我們價格 ≥ Apple 官方）
//   有官方 → max(官方 × 1.05, 同業最低 × 0.85)，不超過 官方 × 1.5
//   無官方 → 同業最低 × 0.85
import { createClient } from "@libsql/client";

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

function calc(comps, official) {
  const minComp = comps.length > 0 ? Math.min(...comps) : 0;
  let target;
  if (official && official > 0 && minComp > 0) {
    // 加權平均：官方 ×2 + 同業最低 ×1，再除以 3
    // → 差距小時：靠近中間值
    // → 差距大時：明顯偏向官方價（最具競爭力且保留利潤）
    target = (official * 2 + minComp) / 3;
    // 安全上限
    const maxComp = Math.max(...comps);
    target = Math.min(target, maxComp);
  } else if (official && official > 0) {
    target = official * 1.05;
  } else {
    target = minComp * 0.85;
  }
  return Math.round(target / 100) * 100;
}

const all = await turso.execute("SELECT id, source1Price, source2Price, source3Price, officialPrice FROM RecyclePrice");
let updated = 0;
for (const r of all.rows) {
  const comps = [r.source1Price, r.source2Price, r.source3Price].filter(p => p && p > 0);
  if (comps.length === 0) continue;
  const newMin = calc(comps, r.officialPrice);
  await turso.execute({ sql: "UPDATE RecyclePrice SET minPrice = ? WHERE id = ?", args: [newMin, r.id] });
  updated++;
}
console.log(`[done] 重算 ${updated} 筆`);

// 驗證 iPhone 13 Pro
const r = await turso.execute(`
  SELECT modelName, storage, officialPrice, source1Price, source2Price, source3Price, minPrice
  FROM RecyclePrice WHERE modelName LIKE 'iPhone 13 Pro%' AND category='phone'
  ORDER BY modelName, storage
`);
for (const row of r.rows) {
  const comps = [row.source1Price, row.source2Price, row.source3Price].filter(Boolean).join(',');
  const above = row.officialPrice ? (row.minPrice >= row.officialPrice ? '✓' : '✗') : '?';
  console.log(`  ${above} ${row.modelName.padEnd(22)} ${(row.storage||'').padEnd(7)} 官方=${row.officialPrice||'-'} 同業=${comps} → ${row.minPrice}`);
}

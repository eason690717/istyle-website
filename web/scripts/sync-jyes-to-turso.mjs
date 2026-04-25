// 把 jyes-data.json 同步到 Turso（source3 = jyes）
// 寫入前用共用正規化，確保跟 source1/2 共用同樣的 modelKey
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeRecycleRow } from "./_normalize.mjs";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("missing env"); process.exit(1); }

const client = createClient({ url, authToken });

const dataPath = resolve(process.cwd(), "..", "jyes-data.json");
const { rows: rawRows } = JSON.parse(readFileSync(dataPath, "utf-8"));
console.log(`[sync] ${rawRows.length} rows from jyes-data.json`);

// 統一正規化（同機型不同來源 → 同 modelKey）
const rows = rawRows.map(r => {
  const norm = normalizeRecycleRow(r);
  return { ...r, ...norm };
});

const now = new Date().toISOString();
let upserts = 0;

for (const r of rows) {
  // Check if record exists
  const existing = await client.execute({
    sql: "SELECT id, source1Price, source2Price, officialPrice FROM RecyclePrice WHERE modelKey = ?",
    args: [r.modelKey],
  });

  if (existing.rows.length > 0) {
    const ex = existing.rows[0];
    // 取最低同業價
    const competitorPrices = [ex.source1Price, ex.source2Price, r.price].filter(Boolean);
    const minComp = Math.min(...competitorPrices);
    let finalPrice;
    if (ex.officialPrice && ex.officialPrice > 0) {
      finalPrice = Math.round(Math.min(Math.max(ex.officialPrice * 1.4, minComp * 0.7), minComp) / 100) * 100;
    } else {
      finalPrice = Math.round((minComp * 0.7) / 100) * 100;
    }
    await client.execute({
      sql: `UPDATE RecyclePrice
            SET source3Price = ?, source3At = ?, minPrice = ?, lastUpdatedAt = ?
            WHERE modelKey = ?`,
      args: [r.price, now, finalPrice, now, r.modelKey],
    });
  } else {
    const finalPrice = Math.round((r.price * 0.7) / 100) * 100;
    await client.execute({
      sql: `INSERT INTO RecyclePrice
            (modelKey, category, brand, modelName, storage, variant,
             source3Price, source3At, minPrice,
             isAvailable, searchKeywords, sortOrder, lastUpdatedAt, createdAt)
            VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, 1, ?, 0, ?, ?)`,
      args: [
        r.modelKey, r.category, r.brand, r.modelName, r.storage,
        r.price, now, finalPrice,
        `${r.modelName} ${r.storage || ""}`,
        now, now,
      ],
    });
  }
  upserts++;
  if (upserts % 100 === 0) console.log(`  ${upserts}/${rows.length}`);
}

const total = await client.execute("SELECT COUNT(*) as c FROM RecyclePrice");
console.log(`\n[done] synced ${upserts}, total RecyclePrice now: ${total.rows[0].c}`);

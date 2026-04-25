// Import jyes-data.json → Turso DB
// 由 GitHub Actions 跑（每週四自動）
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) {
  console.error("TURSO_DATABASE_URL not set");
  process.exit(1);
}

const jsonPath = resolve(process.cwd(), "..", "jyes-data.json");
if (!existsSync(jsonPath)) {
  console.error("jyes-data.json not found at:", jsonPath);
  process.exit(1);
}

const { rows } = JSON.parse(readFileSync(jsonPath, "utf-8"));
console.log(`[import] reading ${rows.length} rows`);

const client = createClient({ url, authToken });
const now = new Date().toISOString();

let upserts = 0;
for (const row of rows) {
  // upsert: 若已存在則更新 source3，否則 insert
  const existing = await client.execute({
    sql: "SELECT id, source1Price, source2Price FROM RecyclePrice WHERE modelKey = ?",
    args: [row.modelKey],
  });
  if (existing.rows.length > 0) {
    const r = existing.rows[0];
    const prices = [r.source1Price, r.source2Price, row.price].filter(p => p !== null && p !== undefined);
    const minPrice = prices.length > 0 ? Math.min(...prices) : row.price;
    await client.execute({
      sql: `UPDATE RecyclePrice
            SET source3Price = ?, source3At = ?, minPrice = ?, lastUpdatedAt = ?
            WHERE id = ?`,
      args: [row.price, now, minPrice, now, r.id],
    });
  } else {
    await client.execute({
      sql: `INSERT INTO RecyclePrice
            (modelKey, brand, category, modelName, storage,
             source3Price, source3At, minPrice, isAvailable, sortOrder, lastUpdatedAt, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`,
      args: [
        row.modelKey, row.brand, row.category, row.modelName, row.storage,
        row.price, now, row.price, now, now,
      ],
    });
  }
  upserts++;
}

console.log(`[done] upserted ${upserts} rows`);

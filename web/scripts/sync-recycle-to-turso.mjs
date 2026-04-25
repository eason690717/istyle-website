// 把本機 dev.db 的 RecyclePrice 同步到 Turso
import { createClient } from "@libsql/client";
import Database from "better-sqlite3";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("missing env"); process.exit(1); }

const turso = createClient({ url, authToken });
const local = new Database("./dev.db", { readonly: true });

const rows = local.prepare("SELECT * FROM RecyclePrice").all();
console.log(`[sync] ${rows.length} rows from local`);

let upserts = 0;
for (const r of rows) {
  await turso.execute({
    sql: `INSERT OR REPLACE INTO RecyclePrice
          (modelKey, category, brand, modelName, storage, variant,
           source1Price, source1At, source2Price, source2At, source3Price, source3At,
           officialPrice, officialAt, minPrice, manualOverride,
           isAvailable, searchKeywords, sortOrder, lastUpdatedAt, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      r.modelKey, r.category, r.brand, r.modelName, r.storage, r.variant,
      r.source1Price, r.source1At, r.source2Price, r.source2At, r.source3Price, r.source3At,
      r.officialPrice, r.officialAt, r.minPrice, r.manualOverride,
      r.isAvailable, r.searchKeywords, r.sortOrder, r.lastUpdatedAt, r.createdAt,
    ],
  });
  upserts++;
  if (upserts % 100 === 0) console.log(`  ${upserts}/${rows.length}`);
}
console.log(`[done] ${upserts} synced`);

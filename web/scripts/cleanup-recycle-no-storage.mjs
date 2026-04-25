// 清除「沒容量但同機型其他 row 有容量」的重複 RecyclePrice
// (這些通常是 source 表格的 section 標題被誤抓為單一商品)
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("missing env"); process.exit(1); }

const client = createClient({ url, authToken });

console.log("[1] 找出有重複（同 modelName 有的有容量、有的沒）的 row...");
const dup = await client.execute(`
  SELECT id, modelName, storage, minPrice
  FROM RecyclePrice
  WHERE (storage IS NULL OR storage = '')
    AND modelName IN (
      SELECT modelName FROM RecyclePrice
      WHERE storage IS NOT NULL AND storage != ''
      GROUP BY modelName
    )
  ORDER BY modelName
`);
console.log(`  找到 ${dup.rows.length} 筆要刪`);

if (dup.rows.length > 0) {
  console.log("\n  範例（前 10 筆）:");
  for (const r of dup.rows.slice(0, 10)) {
    console.log(`    [${r.id}] ${r.modelName} (no storage) $${r.minPrice}`);
  }

  console.log("\n[2] 刪除...");
  let deleted = 0;
  for (const r of dup.rows) {
    await client.execute({ sql: "DELETE FROM RecyclePrice WHERE id = ?", args: [r.id] });
    deleted++;
  }
  console.log(`  ✓ 刪除 ${deleted} 筆`);
}

console.log("\n[3] 統計剩餘:");
const total = await client.execute("SELECT COUNT(*) as c FROM RecyclePrice");
const noStorage = await client.execute("SELECT COUNT(*) as c FROM RecyclePrice WHERE storage IS NULL OR storage = ''");
console.log(`  總筆數: ${total.rows[0].c}`);
console.log(`  仍無容量(類別不需要 ex 桌機/Dyson): ${noStorage.rows[0].c}`);

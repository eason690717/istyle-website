// 隱藏「玻璃破裂」欄位：把對應 RepairPrice 設 isAvailable=false
// 不刪資料、隨時可回復（把 isAvailable 改回 true）
import "dotenv/config";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("Missing TURSO env"); process.exit(1); }
const db = createClient({ url, authToken });

// 找出所有 name 含「玻璃破裂」的 RepairItem
const items = await db.execute({
  sql: "SELECT id, name FROM RepairItem WHERE name LIKE ?",
  args: ["%玻璃破裂%"],
});
console.log(`Found ${items.rows.length} 玻璃破裂 items:`);
items.rows.forEach(r => console.log(`  #${r.id} - ${r.name}`));

if (items.rows.length === 0) { console.log("Nothing to hide."); process.exit(0); }

const ids = items.rows.map(r => r.id);
const placeholders = ids.map(() => "?").join(",");

// 改 RepairPrice.isAvailable = false
const result = await db.execute({
  sql: `UPDATE RepairPrice SET isAvailable = 0 WHERE itemId IN (${placeholders})`,
  args: ids,
});
console.log(`\nUpdated ${result.rowsAffected} RepairPrice rows → isAvailable=false`);

// 也把 RepairItem 本身設 isActive=false（保險）
const r2 = await db.execute({
  sql: `UPDATE RepairItem SET isActive = 0 WHERE id IN (${placeholders})`,
  args: ids,
});
console.log(`Updated ${r2.rowsAffected} RepairItem rows → isActive=false`);

console.log("\n✅ 「玻璃破裂」欄位已從前台隱藏（資料保留，可回復）");

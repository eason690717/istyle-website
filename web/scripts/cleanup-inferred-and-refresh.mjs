// 1. 刪除我推算的 row（沒有任何 source 來源）
// 2. 重新從 source1+2 抓 + jyes JSON 同步
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("missing env"); process.exit(1); }
const client = createClient({ url, authToken });

console.log("[1] 刪除推算的 row（無任何 source 來源）...");
const inferredRes = await client.execute(`
  SELECT COUNT(*) as c FROM RecyclePrice
  WHERE source1Price IS NULL AND source2Price IS NULL AND source3Price IS NULL
`);
console.log(`  找到 ${inferredRes.rows[0].c} 筆推算 row`);

await client.execute(`
  DELETE FROM RecyclePrice
  WHERE source1Price IS NULL AND source2Price IS NULL AND source3Price IS NULL
`);
console.log("  ✓ 已刪除");

const remain = await client.execute("SELECT COUNT(*) as c FROM RecyclePrice");
console.log(`\n[total] 剩下 ${remain.rows[0].c} 筆（純來源資料）`);

// 統計各 source 來源筆數
const stats = await client.execute(`
  SELECT
    SUM(CASE WHEN source1Price IS NOT NULL THEN 1 ELSE 0 END) as s1,
    SUM(CASE WHEN source2Price IS NOT NULL THEN 1 ELSE 0 END) as s2,
    SUM(CASE WHEN source3Price IS NOT NULL THEN 1 ELSE 0 END) as s3
  FROM RecyclePrice
`);
const s = stats.rows[0];
console.log(`  source1 (second3c): ${s.s1}`);
console.log(`  source2 (us3c): ${s.s2}`);
console.log(`  source3 (jyes): ${s.s3}`);

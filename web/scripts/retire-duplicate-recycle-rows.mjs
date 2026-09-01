// 下架「舊 key 格式」造成的重複回收機型
// 背景：buildModelKey 曾改版加上品牌前綴（iphone-17-pro-max-1tb → apple-iphone-17-pro-max-1tb），
// 舊 key 的列從此不再被 cron 更新，但 isAvailable 仍為 1，
// 導致前台同一機型出現兩筆、其中一筆是 4 月的過期價。
// 判定：同 brand+modelName+storage+variant 已有 14 天內更新過的列 → 舊列純屬重複，下架。
// 用法：node scripts/retire-duplicate-recycle-rows.mjs [--apply]
import "dotenv/config";
import { createClient } from "@libsql/client";

const APPLY = process.argv.includes("--apply");
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const WHERE = `
  isAvailable = 1
  AND date(lastUpdatedAt) < date('now','-14 day')
  AND EXISTS (
    SELECT 1 FROM RecyclePrice n
    WHERE n.id <> RecyclePrice.id
      AND n.isAvailable = 1
      AND n.brand = RecyclePrice.brand
      AND n.modelName = RecyclePrice.modelName
      AND IFNULL(n.storage,'') = IFNULL(RecyclePrice.storage,'')
      AND IFNULL(n.variant,'') = IFNULL(RecyclePrice.variant,'')
      AND date(n.lastUpdatedAt) >= date('now','-14 day')
  )`;

const preview = await db.execute(
  `SELECT modelKey, brand, modelName, storage, minPrice, date(lastUpdatedAt) d
   FROM RecyclePrice WHERE ${WHERE} ORDER BY brand, modelName LIMIT 10`,
);
const count = await db.execute(`SELECT COUNT(*) c FROM RecyclePrice WHERE ${WHERE}`);

console.log(`符合下架條件：${count.rows[0].c} 筆`);
console.log("抽樣：");
for (const r of preview.rows) {
  console.log(`  ${r.modelKey} | ${r.brand} ${r.modelName} ${r.storage || ""} = $${r.minPrice} (${r.d})`);
}

if (!APPLY) {
  console.log("\n這是預覽。實際執行請加 --apply");
  process.exit(0);
}

const res = await db.execute(`UPDATE RecyclePrice SET isAvailable = 0 WHERE ${WHERE}`);
console.log(`\n✅ 已下架 ${res.rowsAffected} 筆`);

const after = await db.execute(
  "SELECT COUNT(*) c FROM RecyclePrice WHERE isAvailable=1",
);
const stale = await db.execute(
  "SELECT COUNT(*) c FROM RecyclePrice WHERE isAvailable=1 AND date(lastUpdatedAt) < date('now','-14 day')",
);
console.log(`剩餘上架：${after.rows[0].c} 筆（其中 ${stale.rows[0].c} 筆為 14 天以上未更新的舊機型 → 前台顯示「LINE 詢價」）`);

// 文章唯一性 migration —— 分兩階段：
//   node scripts/apply-article-uniqueness-migration.mjs           第一階段：加 subject / contentHash 欄位
//   node scripts/apply-article-uniqueness-migration.mjs --step2   第二階段：清掉重複後建唯一索引
import "dotenv/config";
import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const dir = "prisma/migrations/20261021120000_article_uniqueness/";
const step2 = process.argv.includes("--step2");
const cols = (await db.execute(`PRAGMA table_info("AutoArticle")`)).rows.map(r => r.name);
if (!step2) {
  if (cols.includes("contentHash")) { console.log("欄位已存在，略過"); process.exit(0); }
  await db.executeMultiple(readFileSync(dir + "migration.sql", "utf-8"));
  console.log("✅ 已加入 subject / contentHash 欄位");
} else {
  const dupT = (await db.execute(`SELECT COUNT(*) c FROM (SELECT title FROM "AutoArticle" GROUP BY title HAVING COUNT(*)>1)`)).rows[0].c;
  const dupH = (await db.execute(`SELECT COUNT(*) c FROM (SELECT contentHash FROM "AutoArticle" WHERE contentHash IS NOT NULL GROUP BY contentHash HAVING COUNT(*)>1)`)).rows[0].c;
  const nullH = (await db.execute(`SELECT COUNT(*) c FROM "AutoArticle" WHERE contentHash IS NULL`)).rows[0].c;
  if (dupT || dupH || nullH) { console.error(`❌ 還不能建索引：重複標題 ${dupT} 組、重複指紋 ${dupH} 組、缺指紋 ${nullH} 篇`); process.exit(1); }
  await db.executeMultiple(readFileSync(dir + "step2.sql", "utf-8"));
  console.log("✅ 已建立 title / contentHash 唯一索引");
}

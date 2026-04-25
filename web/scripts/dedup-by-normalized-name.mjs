// 正規化機型名稱 + 合併重複（同機型不同來源拆開的問題）
// 規則：去除「Apple」「APPLE」「蘋果」開頭、統一空白、統一大小寫
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("missing env"); process.exit(1); }
const client = createClient({ url, authToken });

function normalize(name) {
  return name
    .replace(/^(Apple|APPLE|蘋果)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

console.log("[1] 抓所有 RecyclePrice...");
const all = await client.execute(`
  SELECT id, modelKey, category, brand, modelName, storage, variant,
         source1Price, source2Price, source3Price, officialPrice, minPrice
  FROM RecyclePrice
`);
console.log(`  ${all.rows.length} rows`);

// 群組 key：normalized(modelName) + storage + variant + category
const groups = new Map();
for (const r of all.rows) {
  const norm = normalize(r.modelName);
  const key = `${r.category}|${norm}|${r.storage || ""}|${r.variant || ""}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r);
}

console.log(`[2] 群組數: ${groups.size} (應該明顯少於 ${all.rows.length})`);

let merged = 0, deleted = 0;
for (const [key, rows] of groups) {
  if (rows.length < 2) continue;

  // 取最低 id 作為 master，把其他 row 的 source price 合併過來，再刪除
  rows.sort((a, b) => a.id - b.id);
  const master = rows[0];
  const others = rows.slice(1);

  let s1 = master.source1Price, s2 = master.source2Price, s3 = master.source3Price, off = master.officialPrice;
  for (const o of others) {
    if (!s1 && o.source1Price) s1 = o.source1Price;
    if (!s2 && o.source2Price) s2 = o.source2Price;
    if (!s3 && o.source3Price) s3 = o.source3Price;
    if (!off && o.officialPrice) off = o.officialPrice;
  }

  // 重算 minPrice：用同業最低 × 0.7 + 進位 100
  const competitorPrices = [s1, s2, s3].filter(p => p && p > 0);
  const newMin = competitorPrices.length > 0
    ? Math.round(Math.min(...competitorPrices) * 0.7 / 100) * 100
    : master.minPrice;

  const normalizedName = normalize(master.modelName);
  await client.execute({
    sql: `UPDATE RecyclePrice SET
            modelName = ?, source1Price = ?, source2Price = ?, source3Price = ?,
            officialPrice = ?, minPrice = ?
          WHERE id = ?`,
    args: [normalizedName, s1, s2, s3, off, newMin, master.id],
  });

  for (const o of others) {
    await client.execute({ sql: "DELETE FROM RecyclePrice WHERE id = ?", args: [o.id] });
    deleted++;
  }
  merged++;
}

// 把剩下沒被合併的也順便正規化名稱
console.log("\n[3] 正規化剩餘 row 的名稱...");
const remaining = await client.execute("SELECT id, modelName FROM RecyclePrice");
let renamed = 0;
for (const r of remaining.rows) {
  const norm = normalize(r.modelName);
  if (norm !== r.modelName) {
    await client.execute({ sql: "UPDATE RecyclePrice SET modelName = ? WHERE id = ?", args: [norm, r.id] });
    renamed++;
  }
}

const total = await client.execute("SELECT COUNT(*) as c FROM RecyclePrice");
console.log(`\n[done]`);
console.log(`  合併群組: ${merged}`);
console.log(`  刪除重複: ${deleted}`);
console.log(`  正規化名稱: ${renamed}`);
console.log(`  最終總筆數: ${total.rows[0].c}`);

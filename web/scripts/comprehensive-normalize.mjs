// 全品牌徹底正規化命名 + 合併重複
// 處理：
//   - 品牌前綴（SAMSUNG/Apple/小米/Sony 等）
//   - 大小寫（SAMSUNG → Samsung）
//   - 括號型號代碼 (S9380)、(SM-G990)
//   - Galaxy/iPhone 等冗詞
//   - 多餘空白
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("missing env"); process.exit(1); }
const client = createClient({ url, authToken });

// 品牌正規化（顯示用 brand 欄位）
const BRAND_NORM = {
  "SAMSUNG": "Samsung", "三星": "Samsung",
  "APPLE": "Apple", "蘋果": "Apple",
  "XIAOMI": "Xiaomi", "小米": "Xiaomi", "MI": "Xiaomi",
  "SONY": "Sony",
  "GOOGLE": "Google",
  "ASUS": "ASUS", "華碩": "ASUS",
  "OPPO": "OPPO",
  "VIVO": "vivo",
  "REDMI": "Redmi", "紅米": "Redmi",
  "POCO": "POCO",
  "REALME": "realme",
  "HUAWEI": "Huawei", "華為": "Huawei",
  "HTC": "HTC",
  "MOTOROLA": "motorola",
  "LENOVO": "Lenovo",
  "SHARP": "SHARP",
  "NOTHING": "Nothing",
  "HONOR": "HONOR",
  "BLACKSHARK": "黑鯊", "黑鯊": "黑鯊",
};

function normalizeBrand(b) {
  if (!b) return b;
  const upper = b.toUpperCase();
  return BRAND_NORM[upper] || BRAND_NORM[b] || b;
}

// 機型名稱正規化
function normalizeModel(name, brand) {
  let n = name;

  // 1. 移除品牌前綴（中英文，不分大小寫）
  const brandsRegex = Object.keys(BRAND_NORM).map(b => b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  n = n.replace(new RegExp(`^(${brandsRegex})\\s+`, "i"), "");

  // 2. 移除括號內的型號代碼（純字母+數字+橫線）
  //    例如 "S25 Ultra (S9380)" → "S25 Ultra"
  //    例如 "iPhone 16 Pro Max (A3084)" → "iPhone 16 Pro Max"
  n = n.replace(/\s*[（(]\s*[A-Z0-9-]+\s*[）)]\s*/g, " ");

  // 3. Galaxy 前綴（Samsung 機型有時會加 "Galaxy S25"）
  //    保留 Galaxy 因為它是系列名，但統一用 "Galaxy S25" 而非 "S25"
  //    不動

  // 4. 移除「舊機高額回收價」「高價回收」等行銷詞（jyes 殘留）
  n = n.replace(/(舊機高額回收價|高額回收價|高價回收|回收價|現金回收價)/g, "");

  // 5. 統一空白
  n = n.replace(/\s+/g, " ").trim();

  // 6. 大小寫統一（iPhone, iPad 等保持原樣 — 太複雜，跳過）

  return n;
}

console.log("[1] 抓所有 RecyclePrice...");
const all = await client.execute(`
  SELECT id, modelKey, category, brand, modelName, storage, variant,
         source1Price, source2Price, source3Price, officialPrice, minPrice
  FROM RecyclePrice
`);
console.log(`  原始 ${all.rows.length} rows`);

// 收集所有正規化後的 (key) → rows 群組
const groups = new Map();
for (const r of all.rows) {
  const newBrand = normalizeBrand(r.brand);
  const newModel = normalizeModel(r.modelName, newBrand);
  const key = `${r.category}|${newBrand}|${newModel}|${r.storage || ""}|${r.variant || ""}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push({ ...r, _newBrand: newBrand, _newModel: newModel });
}

console.log(`[2] 正規化後群組: ${groups.size}`);

let mergedGroups = 0, deletedRows = 0, updatedNames = 0;
for (const [, rows] of groups) {
  rows.sort((a, b) => a.id - b.id);
  const master = rows[0];
  const others = rows.slice(1);

  // 合併 source 價格
  let s1 = master.source1Price, s2 = master.source2Price, s3 = master.source3Price, off = master.officialPrice;
  for (const o of others) {
    if (!s1 && o.source1Price) s1 = o.source1Price;
    if (!s2 && o.source2Price) s2 = o.source2Price;
    if (!s3 && o.source3Price) s3 = o.source3Price;
    if (!off && o.officialPrice) off = o.officialPrice;
  }

  // 重算 minPrice
  const competitorPrices = [s1, s2, s3].filter(p => p && p > 0);
  let newMin = master.minPrice;
  if (competitorPrices.length > 0) {
    const minComp = Math.min(...competitorPrices);
    if (off && off > 0) {
      newMin = Math.round(Math.min(Math.max(off * 1.4, minComp * 0.7), minComp) / 100) * 100;
    } else {
      newMin = Math.round(minComp * 0.7 / 100) * 100;
    }
  }

  // 更新 master row（含正規化的 brand + modelName）
  const nameChanged = master._newBrand !== master.brand || master._newModel !== master.modelName;
  await client.execute({
    sql: `UPDATE RecyclePrice SET
            brand = ?, modelName = ?,
            source1Price = ?, source2Price = ?, source3Price = ?,
            officialPrice = ?, minPrice = ?
          WHERE id = ?`,
    args: [master._newBrand, master._newModel, s1, s2, s3, off, newMin, master.id],
  });
  if (nameChanged) updatedNames++;

  // 刪除其他重複 row
  if (others.length > 0) {
    for (const o of others) {
      await client.execute({ sql: "DELETE FROM RecyclePrice WHERE id = ?", args: [o.id] });
      deletedRows++;
    }
    mergedGroups++;
  }
}

const total = await client.execute("SELECT COUNT(*) as c FROM RecyclePrice");
console.log(`\n[done]`);
console.log(`  合併群組: ${mergedGroups}`);
console.log(`  刪除重複: ${deletedRows}`);
console.log(`  更新名稱: ${updatedNames}`);
console.log(`  最終總筆數: ${total.rows[0].c}`);

// 輸出各品牌統計
const brandStats = await client.execute(`
  SELECT brand, COUNT(*) as cnt
  FROM RecyclePrice
  GROUP BY brand
  ORDER BY cnt DESC
`);
console.log(`\n[brand stats]`);
for (const r of brandStats.rows) {
  console.log(`  ${(r.brand || "(none)").padEnd(15)} ${r.cnt}`);
}

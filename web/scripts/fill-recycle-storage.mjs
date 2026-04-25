// 智慧補齊：每個機型確保有「完整容量階梯」對應的 row
// 演算法：
//   1. 抓每個 modelName 已存在的 (storage, price) 配對
//   2. 推算缺失的標準容量 tier
//   3. 用「翻倍價差比例」自動內插/外推
//   4. INSERT 新 row（標記為 inferred）
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("missing env"); process.exit(1); }
const client = createClient({ url, authToken });

// 標準容量階梯（依機型推測）
const STANDARD_TIERS_GB = [64, 128, 256, 512, 1024, 2048];

// 機型 → 應有的容量範圍（最大、最小）
function getExpectedTiers(modelName, category) {
  const n = modelName.toLowerCase();
  const isPro = /pro/i.test(n);
  const isProMax = /pro\s*max/i.test(n);
  const isMax = /max/i.test(n);
  const isMini = /mini/i.test(n);
  const isPlus = /plus/i.test(n);
  const isUltra = /ultra/i.test(n);
  const isAir = /\bair\b/i.test(n);

  if (category === "phone") {
    // iPhone Pro Max 17：256-2TB；Pro Max 13-16：128-1TB
    if (/iphone\s*1[6-9]\s*pro\s*max/i.test(n)) return [256, 512, 1024, 2048];
    if (isProMax) return [128, 256, 512, 1024];
    if (isPro) return [128, 256, 512, 1024];
    if (/iphone\s*se/i.test(n)) return [64, 128, 256];
    if (/iphone\s*1[3-7](?!\s*pro)/i.test(n) || isMini || isPlus) return [128, 256, 512];
    if (/iphone\s*1[12]/i.test(n)) return [64, 128, 256];
    // Samsung Galaxy / 其他 Android：常見 128/256/512
    if (isUltra) return [256, 512, 1024];
    return [128, 256, 512];
  }
  if (category === "tablet") {
    // iPad Pro M4：256-2TB；iPad Air：64-1TB
    if (/ipad\s*pro/i.test(n)) return [256, 512, 1024, 2048];
    if (/ipad\s*air/i.test(n) || /ipad\s*mini/i.test(n)) return [64, 128, 256, 512, 1024];
    return [64, 128, 256];
  }
  if (category === "laptop_pro") {
    if (/m4\s*max/i.test(n)) return [512, 1024, 2048];
    return [256, 512, 1024, 2048];
  }
  if (category === "laptop_air") {
    return [256, 512, 1024];
  }
  return null; // 其他類別不補
}

function gbToStorage(gb) {
  return gb >= 1024 ? `${gb / 1024}TB` : `${gb}GB`;
}
function storageToGb(s) {
  if (!s) return null;
  const m = s.match(/(\d+(?:\.\d+)?)\s*(TB|GB|G|T)/i);
  if (!m) return null;
  const num = parseFloat(m[1]);
  return /T/i.test(m[2]) ? num * 1024 : num;
}

// 給定已知 (gb, price) 點，推算目標 gb 的價格
function estimatePrice(known, targetGb) {
  // known: [{gb, price}] sorted by gb asc
  if (known.length === 0) return null;
  if (known.length === 1) {
    // 用 1.15 倍 / GB 翻倍當預設
    const k = known[0];
    const doublings = Math.log2(targetGb / k.gb);
    return Math.round(k.price * Math.pow(1.15, doublings));
  }

  // 兩點以上：線性內插（在 log GB 與 price 上）
  // 找最接近的兩點
  let lower = null, upper = null;
  for (const k of known) {
    if (k.gb <= targetGb) lower = k;
    if (k.gb >= targetGb && !upper) upper = k;
  }

  if (lower && upper && lower.gb !== upper.gb) {
    // 內插
    const t = (Math.log2(targetGb) - Math.log2(lower.gb)) / (Math.log2(upper.gb) - Math.log2(lower.gb));
    return Math.round(lower.price + (upper.price - lower.price) * t);
  }
  if (lower) {
    // 外推（往上）
    const last2 = known.slice(-2);
    if (last2.length === 2) {
      const ratio = Math.pow(last2[1].price / last2[0].price, 1 / Math.log2(last2[1].gb / last2[0].gb));
      return Math.round(lower.price * Math.pow(ratio, Math.log2(targetGb / lower.gb)));
    }
    return Math.round(lower.price * Math.pow(1.15, Math.log2(targetGb / lower.gb)));
  }
  if (upper) {
    // 外推（往下）
    const first2 = known.slice(0, 2);
    if (first2.length === 2) {
      const ratio = Math.pow(first2[1].price / first2[0].price, 1 / Math.log2(first2[1].gb / first2[0].gb));
      return Math.round(upper.price / Math.pow(ratio, Math.log2(upper.gb / targetGb)));
    }
    return Math.round(upper.price / Math.pow(1.15, Math.log2(upper.gb / targetGb)));
  }
  return null;
}

function roundTo100(n) { return Math.round(n / 100) * 100; }

// ---- main ----
console.log("[1] 抓所有有容量的 RecyclePrice...");
const all = await client.execute(`
  SELECT id, modelKey, category, brand, modelName, storage, variant, minPrice
  FROM RecyclePrice
  WHERE minPrice IS NOT NULL AND minPrice > 0
`);
console.log(`  ${all.rows.length} rows`);

// 群組到 (modelName, category, variant) 桶子
const groups = new Map();
for (const r of all.rows) {
  const variant = r.variant || "";
  const key = `${r.category}|${r.modelName}|${variant}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push({
    id: r.id,
    storage: r.storage,
    gb: storageToGb(r.storage),
    price: r.minPrice,
    brand: r.brand,
    modelName: r.modelName,
    category: r.category,
    variant,
    modelKey: r.modelKey,
  });
}
console.log(`[2] 群組數: ${groups.size}`);

let inserted = 0;
let skipped = 0;
const now = new Date().toISOString();

for (const [key, rows] of groups) {
  const [category, modelName, variant] = key.split("|");
  const expectedTiers = getExpectedTiers(modelName, category);
  if (!expectedTiers) { skipped++; continue; }

  const known = rows.filter(r => r.gb).sort((a, b) => a.gb - b.gb);
  if (known.length === 0) continue;
  const knownGbs = new Set(known.map(r => r.gb));

  const sample = rows[0];
  for (const tierGb of expectedTiers) {
    if (knownGbs.has(tierGb)) continue; // 已存在

    const estPrice = estimatePrice(known, tierGb);
    if (!estPrice || estPrice < 100) continue;
    const finalPrice = roundTo100(estPrice);
    const newStorage = gbToStorage(tierGb);
    const newKey = `${sample.modelKey}-${newStorage.toLowerCase()}`.replace(/--+/g, "-");

    await client.execute({
      sql: `INSERT OR IGNORE INTO RecyclePrice
            (modelKey, category, brand, modelName, storage, variant,
             minPrice, isAvailable, searchKeywords, sortOrder, lastUpdatedAt, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 0, ?, ?)`,
      args: [
        newKey, sample.category, sample.brand, sample.modelName,
        newStorage, variant || null, finalPrice,
        `${sample.modelName} ${newStorage} ${variant}`,
        now, now,
      ],
    });
    inserted++;
  }
}

console.log(`\n[done] 新增 ${inserted} 筆推算容量、跳過 ${skipped} 個無階梯類別`);
const totalAfter = await client.execute("SELECT COUNT(*) as c FROM RecyclePrice");
console.log(`[total] RecyclePrice 現在有 ${totalAfter.rows[0].c} 筆`);

// 拉最近流量 + Apple 螢幕/電池/尾插報價分析
import "dotenv/config";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("Missing TURSO env"); process.exit(1); }
const db = createClient({ url, authToken });

console.log("=".repeat(60));
console.log("📊 最近 30 天流量分析");
console.log("=".repeat(60));

// 1. 總流量 + 不重複訪客
const since = new Date(Date.now() - 30 * 86400_000).toISOString();
const totalPV = await db.execute({ sql: "SELECT COUNT(*) as c FROM PageView WHERE createdAt >= ?", args: [since] });
const uniqSess = await db.execute({ sql: "SELECT COUNT(DISTINCT sessionId) as c FROM PageView WHERE createdAt >= ?", args: [since] });
console.log(`總 PV: ${totalPV.rows[0].c} | 不重複訪客: ${uniqSess.rows[0].c}`);

// 2. Top 10 頁面
console.log("\n🔝 Top 10 頁面 (近 30 天):");
const topPages = await db.execute({
  sql: `SELECT path, COUNT(*) as pv, COUNT(DISTINCT sessionId) as uniq
        FROM PageView WHERE createdAt >= ?
        GROUP BY path ORDER BY pv DESC LIMIT 10`,
  args: [since],
});
topPages.rows.forEach((r, i) => {
  console.log(`  ${(i+1).toString().padStart(2)}. [${String(r.pv).padStart(4)} PV / ${String(r.uniq).padStart(3)} 訪客] ${r.path}`);
});

// 3. Top referrers (排除 direct)
console.log("\n🌐 Top 10 來源網站 (排除直接造訪):");
const refs = await db.execute({
  sql: `SELECT referrer, COUNT(*) as pv FROM PageView
        WHERE createdAt >= ? AND referrer != '(direct)' AND referrer IS NOT NULL
        GROUP BY referrer ORDER BY pv DESC LIMIT 10`,
  args: [since],
});
if (refs.rows.length === 0) {
  console.log("  (尚未有外部連結進入流量)");
} else {
  refs.rows.forEach((r) => console.log(`  ${String(r.pv).padStart(4)} - ${r.referrer}`));
}

// 4. 裝置分布
console.log("\n📱 裝置分布:");
const dev = await db.execute({
  sql: `SELECT device, COUNT(*) as c FROM PageView WHERE createdAt >= ? AND device IS NOT NULL GROUP BY device`,
  args: [since],
});
dev.rows.forEach((r) => console.log(`  ${r.device}: ${r.c}`));

// 5. 國家分布
console.log("\n🌏 國家分布:");
const countries = await db.execute({
  sql: `SELECT country, COUNT(*) as c FROM PageView WHERE createdAt >= ? AND country IS NOT NULL GROUP BY country ORDER BY c DESC LIMIT 5`,
  args: [since],
});
countries.rows.forEach((r) => console.log(`  ${r.country}: ${r.c}`));

// 6. 跳出率（單頁訪客 / 總訪客）
const bounce = await db.execute({
  sql: `SELECT COUNT(*) as bounced FROM (
    SELECT sessionId FROM PageView WHERE createdAt >= ? GROUP BY sessionId HAVING COUNT(*) = 1
  )`,
  args: [since],
});
const bounceRate = uniqSess.rows[0].c > 0
  ? ((Number(bounce.rows[0].bounced) / Number(uniqSess.rows[0].c)) * 100).toFixed(1)
  : "—";
console.log(`\n📉 跳出率: ${bounceRate}% (${bounce.rows[0].bounced} / ${uniqSess.rows[0].c} 只看一頁就走)`);

// 7. 哪些 quote 頁有人看（哪個品牌/機型最熱）
console.log("\n🔧 維修報價熱度（哪個機型最多人查）:");
const quoteHits = await db.execute({
  sql: `SELECT path, COUNT(*) as c FROM PageView
        WHERE createdAt >= ? AND path LIKE '/quote/%/%'
        GROUP BY path ORDER BY c DESC LIMIT 10`,
  args: [since],
});
if (quoteHits.rows.length === 0) {
  console.log("  (還沒有人查機型報價)");
} else {
  quoteHits.rows.forEach((r) => console.log(`  ${String(r.c).padStart(3)} - ${r.path}`));
}

// === Apple 報價分析 ===
console.log("\n");
console.log("=".repeat(60));
console.log("💰 Apple 螢幕 / 電池 / 尾插 報價分析");
console.log("=".repeat(60));

// 找 Apple 品牌 ID + 所有 iPhone/iPad 機型
const apple = await db.execute({ sql: "SELECT id, slug, name FROM Brand WHERE slug = 'apple' LIMIT 1" });
if (apple.rows.length === 0) { console.log("找不到 Apple brand"); await db.close?.(); process.exit(0); }
const appleId = apple.rows[0].id;

const models = await db.execute({
  sql: `SELECT id, slug, name FROM DeviceModel
        WHERE brandId = ? AND isActive = 1
        ORDER BY name`,
  args: [appleId],
});
console.log(`\n找到 ${models.rows.length} 台 Apple 機型`);

// 找跟「螢幕、電池、尾插」相關的 RepairItem
const items = await db.execute({
  sql: `SELECT id, slug, name FROM RepairItem
        WHERE name LIKE '%螢幕%' OR name LIKE '%電池%' OR name LIKE '%尾插%' OR name LIKE '%充電孔%'`,
});
const itemMap = new Map();
items.rows.forEach((r) => itemMap.set(r.id, r.name));

// 撈所有相關 RepairPrice
const prices = await db.execute({
  sql: `SELECT rp.modelId, rp.itemId, rp.tier, rp.cerphonePrice, rp.calculatedPrice, rp.manualOverride,
               m.name as modelName, m.section as modelSection
        FROM RepairPrice rp
        JOIN DeviceModel m ON m.id = rp.modelId
        WHERE m.brandId = ? AND rp.itemId IN (${items.rows.map(_=>'?').join(',')}) AND rp.isAvailable = 1
        ORDER BY m.sortOrder, m.name, rp.itemId, rp.tier`,
  args: [appleId, ...items.rows.map((r) => r.id)],
});

// 分組顯示：每機型 → 各項目 → 標準/原廠
const byModel = new Map();
prices.rows.forEach((r) => {
  const key = r.modelName;
  if (!byModel.has(key)) byModel.set(key, []);
  byModel.get(key).push(r);
});

const ANOMALIES = []; // 異常列表
const seenItems = ["螢幕破裂", "玻璃破裂", "認證電池", "APPLE原廠電池", "充電麥克風", "尾插", "充電孔"];

console.log("\n格式: 機型 | 項目 | 標準 / 原廠 | cerphone參考");
console.log("-".repeat(60));

for (const [modelName, rows] of byModel.entries()) {
  // 只列示有相關項目的機型
  const relevant = rows.filter((r) => {
    const itName = itemMap.get(r.itemId) || "";
    return /螢幕|電池|尾插|充電/.test(itName);
  });
  if (relevant.length === 0) continue;

  console.log(`\n📱 ${modelName}`);
  // 分項目歸類
  const byItem = new Map();
  relevant.forEach((r) => {
    const it = itemMap.get(r.itemId);
    if (!byItem.has(it)) byItem.set(it, { STANDARD: null, OEM: null, raw: null });
    const slot = byItem.get(it);
    const sellPrice = r.manualOverride ?? r.calculatedPrice;
    if (r.tier === "STANDARD") slot.STANDARD = sellPrice;
    if (r.tier === "OEM") slot.OEM = sellPrice;
    slot.raw = r.cerphonePrice;
  });

  for (const [it, p] of byItem.entries()) {
    const std = p.STANDARD ? `$${Number(p.STANDARD).toLocaleString()}` : "—";
    const oem = p.OEM ? `$${Number(p.OEM).toLocaleString()}` : "—";
    const raw = p.raw ? `$${Number(p.raw).toLocaleString()}` : "—";
    console.log(`  ${it.padEnd(12)} | 標 ${std.padEnd(8)} | 原 ${oem.padEnd(8)} | cerphone ${raw}`);

    // 找異常：標準價 > 原廠價（不合理）
    if (p.STANDARD && p.OEM && Number(p.STANDARD) > Number(p.OEM)) {
      ANOMALIES.push({
        type: "STD>OEM",
        model: modelName, item: it,
        msg: `標準價 ${std} > 原廠價 ${oem}（理應原廠較貴）`,
      });
    }
    // 異常：標準價 < 1.1 倍 cerphone（毛利太低）
    if (p.STANDARD && p.raw && Number(p.STANDARD) < Number(p.raw) * 1.1) {
      ANOMALIES.push({
        type: "LOW_MARGIN",
        model: modelName, item: it,
        msg: `標準價 ${std} 距 cerphone ${raw} < 10%（毛利太低）`,
      });
    }
    // 異常：標準價 > 2 倍 cerphone（過高）
    if (p.STANDARD && p.raw && Number(p.STANDARD) > Number(p.raw) * 2) {
      ANOMALIES.push({
        type: "HIGH_MARGIN",
        model: modelName, item: it,
        msg: `標準價 ${std} > cerphone ${raw} 兩倍（過高）`,
      });
    }
  }
}

console.log("\n");
console.log("=".repeat(60));
console.log(`🚨 異常項目 ${ANOMALIES.length} 筆`);
console.log("=".repeat(60));
ANOMALIES.slice(0, 30).forEach((a, i) => {
  console.log(`${(i+1).toString().padStart(2)}. [${a.type}] ${a.model} / ${a.item}`);
  console.log(`    ${a.msg}`);
});

if (db.close) await db.close();

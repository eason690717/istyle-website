// 修 Apple 報價異常 + 補齊 iPad 尾插
import "dotenv/config";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) { console.error("Missing TURSO env"); process.exit(1); }
const db = createClient({ url, authToken });

// === Step 1: 列出所有可能跟「尾插/充電」相關的 RepairItem ===
console.log("=== 充電/尾插 相關 RepairItem ===");
const items = await db.execute({
  sql: `SELECT id, slug, name, category FROM RepairItem
        WHERE name LIKE '%尾插%' OR name LIKE '%充電%' OR name LIKE '%插孔%' OR name LIKE '%USB%' OR name LIKE '%Type%'`,
});
items.rows.forEach(r => console.log(`  id=${r.id} | ${r.name} | ${r.category || "-"} | ${r.slug}`));

// === Step 2: 列 Apple 機型 inventory，看哪些有「尾插」哪些沒 ===
console.log("\n=== iPad 系列「尾插」項目報價狀況 ===");
const ipadModels = await db.execute({
  sql: `SELECT m.id, m.name FROM DeviceModel m
        JOIN Brand b ON b.id = m.brandId
        WHERE b.slug = 'apple' AND m.name LIKE 'iPad%' AND m.isActive = 1
        ORDER BY m.sortOrder`,
});
console.log(`找到 ${ipadModels.rows.length} 台 iPad 機型`);

// 看目前 iPad 哪些有充電/尾插的 RepairPrice
const ipadCharging = await db.execute({
  sql: `SELECT DISTINCT m.id, m.name FROM RepairPrice rp
        JOIN DeviceModel m ON m.id = rp.modelId
        JOIN Brand b ON b.id = m.brandId
        JOIN RepairItem i ON i.id = rp.itemId
        WHERE b.slug = 'apple' AND m.name LIKE 'iPad%'
          AND (i.name LIKE '%尾插%' OR i.name LIKE '%充電%' OR i.name LIKE '%Type%')`,
});
const ipadHaveCharging = new Set(ipadCharging.rows.map(r => r.id));
console.log(`其中 ${ipadHaveCharging.size} 台已有充電孔報價，缺 ${ipadModels.rows.length - ipadHaveCharging.size} 台`);

// === Step 3: 異常價檢查 ===
console.log("\n=== 螢幕價異常檢查 ===");
const anomalies = await db.execute({
  sql: `SELECT m.name, m.id, rp.calculatedPrice, rp.manualOverride, rp.cerphonePrice, rp.tier, i.name as itemName
        FROM RepairPrice rp
        JOIN DeviceModel m ON m.id = rp.modelId
        JOIN Brand b ON b.id = m.brandId
        JOIN RepairItem i ON i.id = rp.itemId
        WHERE b.slug = 'apple'
          AND (i.name = '螢幕破裂' OR i.name = '組裝螢幕總成')
          AND m.isActive = 1
        ORDER BY m.sortOrder, m.name`,
});

// 找 iPhone 16 Plus / 15 Plus / 16 標準
const iphone16 = anomalies.rows.find(r => r.name === "iPhone 16");
const iphone16Plus = anomalies.rows.find(r => r.name === "iPhone 16 Plus");
const iphone15 = anomalies.rows.find(r => r.name === "iPhone 15");
const iphone15Plus = anomalies.rows.find(r => r.name === "iPhone 15 Plus");
const iphone15Pro = anomalies.rows.find(r => r.name === "iPhone 15 Pro");

console.log(`\n  iPhone 16:        $${iphone16?.manualOverride ?? iphone16?.calculatedPrice ?? "?"}`);
console.log(`  iPhone 16 Plus:   $${iphone16Plus?.manualOverride ?? iphone16Plus?.calculatedPrice ?? "?"}  ⚠️ 應比 16 貴`);
console.log(`  iPhone 15:        $${iphone15?.manualOverride ?? iphone15?.calculatedPrice ?? "?"}`);
console.log(`  iPhone 15 Plus:   $${iphone15Plus?.manualOverride ?? iphone15Plus?.calculatedPrice ?? "?"}  ⚠️ 應比 15 貴`);

const ipad12_2 = anomalies.rows.find(r => r.name === "iPad Pro 12.9 第二代");
const ipad12_6 = anomalies.rows.find(r => r.name === "iPad Pro 12.9 第六代");
const ipad12_3 = anomalies.rows.find(r => r.name === "iPad Pro 12.9 第三代");
console.log(`\n  iPad Pro 12.9 第二代: $${ipad12_2?.manualOverride ?? ipad12_2?.calculatedPrice ?? "?"}  ⚠️ 應比第三代便宜`);
console.log(`  iPad Pro 12.9 第三代: $${ipad12_3?.manualOverride ?? ipad12_3?.calculatedPrice ?? "?"}`);
console.log(`  iPad Pro 12.9 第六代: $${ipad12_6?.manualOverride ?? ipad12_6?.calculatedPrice ?? "?"}`);

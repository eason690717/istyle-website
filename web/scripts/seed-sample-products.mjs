// 上架 8 個範例商品到 Turso（圖片用 Pexels API 自動找）
import { createClient } from "@libsql/client";

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const PEXELS = process.env.PEXELS_API_KEY;

const SAMPLES = [
  {
    slug: "iphone-15-pro-clear-case",
    name: "iPhone 15 Pro 透明防摔保護殼",
    category: "case", brand: "Apple",
    price: 290, comparePrice: 590, stock: 50, isFeatured: true,
    description: "高品質 TPU + PC 雙層材質，四角強化防摔設計\n保留無線充電與 MagSafe 功能\n精準開孔，按鍵手感佳\n保固 30 天",
    pexelsQuery: "iphone clear case",
  },
  {
    slug: "iphone-15-pro-tempered-glass",
    name: "iPhone 15 Pro 全螢幕滿版鋼化玻璃保護貼",
    category: "screen-protector", brand: "Apple",
    price: 190, comparePrice: 390, stock: 100, isFeatured: true,
    description: "9H 硬度防刮防刺\n全屏滿版黑邊\n2.5D 弧邊，不影響手感\n含安裝工具包\n破裂保固 30 天",
    pexelsQuery: "smartphone screen protector",
  },
  {
    slug: "samsung-s24-tempered-glass",
    name: "Samsung Galaxy S24 滿版玻璃保護貼",
    category: "screen-protector", brand: "Samsung",
    price: 180, stock: 60,
    description: "S24 / S24 Plus / S24 Ultra 各機型適用\n9H 鋼化玻璃，防刮防爆\n指紋辨識區精準開孔",
    pexelsQuery: "samsung galaxy phone",
  },
  {
    slug: "fast-charger-20w",
    name: "PD 20W 快充充電頭（USB-C）",
    category: "charger",
    price: 290, comparePrice: 490, stock: 80, isFeatured: true,
    description: "Type-C PD 快充協議\n支援 iPhone 8 以上 / iPad / MacBook Air\nBSMI 認證，過充過熱保護\n保固 1 年",
    pexelsQuery: "usb c charger",
  },
  {
    slug: "type-c-cable-1m",
    name: "USB-C 對 Lightning 編織充電線（1M）",
    category: "cable",
    price: 250, stock: 120,
    description: "原廠認證等級\nMFi 編織線材，耐拉扯\n支援 PD 快充\n1 公尺長度",
    pexelsQuery: "lightning cable iphone",
  },
  {
    slug: "powerbank-10000",
    name: "大容量行動電源 10000mAh PD 快充",
    category: "power",
    price: 690, comparePrice: 990, stock: 40,
    description: "10000mAh 容量\nPD 18W 快充\nUSB-C + USB-A 雙輸出\nLED 電量顯示\n可上飛機（< 100Wh）\nBSMI 認證",
    pexelsQuery: "power bank battery",
  },
  {
    slug: "airpods-silicone-case",
    name: "AirPods Pro 矽膠保護套（多色）",
    category: "audio", brand: "Apple",
    price: 150, stock: 200,
    description: "AirPods Pro 1 / 2 通用\n食品級矽膠材質，柔軟防摔\n保留無線充電\n含掛勾鈕扣\n顏色：黑 / 白 / 透明 / 粉",
    pexelsQuery: "airpods earbuds",
  },
  {
    slug: "iphone-12-used-128gb",
    name: "二手 iPhone 12 128GB（黑色．九成新）",
    category: "used-phone", brand: "Apple",
    price: 9900, comparePrice: 14900, stock: 1, isFeatured: true,
    description: "二手 iPhone 12 128GB 黑色\n外觀九成新，無刮痕\n電池健康度 89%\n配件：原廠盒裝、傳輸線、退卡針\n7 天保固，現場驗機",
    pexelsQuery: "iphone 12 black",
  },
];

async function searchPexels(query) {
  if (!PEXELS) return null;
  const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=square`, {
    headers: { Authorization: PEXELS },
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.photos?.[0]?.src?.large || null;
}

let inserted = 0, updated = 0;
for (const p of SAMPLES) {
  // 抓 Pexels 圖
  const imageUrl = await searchPexels(p.pexelsQuery).catch(() => null);

  const existing = await turso.execute({ sql: "SELECT id FROM Product WHERE slug = ?", args: [p.slug] });
  const now = new Date().toISOString();

  if (existing.rows.length > 0) {
    await turso.execute({
      sql: `UPDATE Product SET
              name = ?, category = ?, brand = ?, description = ?, imageUrl = ?,
              price = ?, comparePrice = ?, stock = ?, isFeatured = ?,
              isActive = 1, updatedAt = ?
            WHERE slug = ?`,
      args: [
        p.name, p.category, p.brand || null, p.description, imageUrl,
        p.price, p.comparePrice || null, p.stock, p.isFeatured ? 1 : 0,
        now, p.slug,
      ],
    });
    updated++;
    console.log(`  ↻ ${p.slug}`);
  } else {
    await turso.execute({
      sql: `INSERT INTO Product
              (slug, name, category, brand, description, imageUrl,
               price, comparePrice, stock, isActive, isFeatured, sortOrder,
               createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 0, ?, ?)`,
      args: [
        p.slug, p.name, p.category, p.brand || null, p.description, imageUrl,
        p.price, p.comparePrice || null, p.stock, p.isFeatured ? 1 : 0,
        now, now,
      ],
    });
    inserted++;
    console.log(`  + ${p.slug}`);
  }
}

console.log(`\n[done] +${inserted} new, ↻${updated} updated`);
const total = await turso.execute("SELECT COUNT(*) as c FROM Product");
console.log(`[total] Product 共 ${total.rows[0].c} 筆`);

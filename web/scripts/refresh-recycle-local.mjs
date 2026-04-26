// 本機執行 source1+source2 重抓，含 Apple 官方收購價，同步到 Turso
import { createClient } from "@libsql/client";
import { load as cheerioLoad } from "cheerio";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const turso = createClient({ url, authToken });

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const SOURCE2_PAGES = [
  { url: "https://www.us3c.com.tw/promotion-recycle-phones", category: "phone", priceCol: 1 },
  { url: "https://www.us3c.com.tw/promotion-recycle-ipad", category: "tablet", priceCol: 1 },
  { url: "https://www.us3c.com.tw/promotion-recycle-macbook-pro", category: "laptop_pro", priceCol: 1 },
  { url: "https://www.us3c.com.tw/promotion-recycle-macbook-air", category: "laptop_air", priceCol: 1 },
];

function parsePrice(s) {
  if (!s) return null;
  const m = s.replace(/[\s,$NT]/g, "").match(/^(\d+)/);
  return m ? parseInt(m[1]) : null;
}

function parseModel(text, category) {
  if (!text) return null;
  const cleaned = text.trim();
  if (!cleaned || cleaned.length > 200) return null;
  // 簡易：先嘗試取出 brand + storage
  let brand = "Apple"; // us3c 主要是 Apple
  if (/samsung|galaxy/i.test(cleaned)) brand = "Samsung";
  if (/sony/i.test(cleaned)) brand = "Sony";
  // 容量
  const sm = cleaned.match(/(\d+(?:\.\d+)?)\s*(TB|T|GB|G)\b/i);
  const storage = sm ? `${sm[1]}${/T/i.test(sm[2]) ? "TB" : "GB"}` : null;
  // 規格
  let variant = null;
  if (/wifi.*[+5g LTE]/i.test(cleaned)) variant = "WiFi+5G";
  else if (/wifi/i.test(cleaned)) variant = "WiFi";
  // 機型名稱：去掉容量+規格
  let modelName = cleaned
    .replace(/\d+(?:\.\d+)?\s*(TB|T|GB|G)\b/gi, "")
    .replace(/wifi[+\s]*5?g?|lte|行動網路/gi, "")
    .replace(/\s+/g, " ").trim();
  return { brand, modelName, storage, variant, category };
}

function buildKey({ brand, modelName, storage, variant }) {
  const slug = (s) => s.toLowerCase().replace(/[（）()]/g, "").replace(/[\s_/\\.,'"`]+/g, "-").replace(/[^a-z0-9一-鿿-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return [brand, modelName, storage, variant].filter(Boolean).map(slug).join("-");
}

let totalScraped = 0, totalOfficial = 0;

for (const page of SOURCE2_PAGES) {
  console.log(`\n[fetch] ${page.url}`);
  try {
    const r = await fetch(page.url, { headers: { "User-Agent": UA } });
    const html = await r.text();
    const $ = cheerioLoad(html);

    let pageScraped = 0, pageOfficial = 0;

    $("table").each((_, tbl) => {
      const $tbl = $(tbl);
      // 找含「官方」的 row 當 header
      let officialCol = -1;
      $tbl.find("tr").each((_, hr) => {
        if (officialCol >= 0) return;
        const hc = $(hr).find("th,td").map((_, c) => $(c).text().trim()).get();
        for (let i = 0; i < hc.length; i++) {
          if (/官方|Apple\s*官網/i.test(hc[i])) { officialCol = i; break; }
        }
      });

      $tbl.find("tr").each((_, tr) => {
        const cells = $(tr).find("td").map((_, td) => $(td).text().trim()).get();
        if (cells.length < page.priceCol + 1) return;
        const parsed = parseModel(cells[0], page.category);
        const price = parsePrice(cells[page.priceCol]);
        if (!parsed || !price || price < 100 || price > 200000) return;

        let officialPrice = null;
        if (officialCol > 0 && cells[officialCol]) {
          const cv = cells[officialCol].trim();
          // 跳過 "-", "—", "尚未回收"
          if (cv && !/^[-—–]$/.test(cv) && !/尚未/.test(cv)) {
            const op = parsePrice(cv);
            if (op && op > 100 && op < 200000) officialPrice = op;
          }
        }

        const key = buildKey(parsed);
        // upsert：找現有 row，更新 source2Price + officialPrice
        turso.execute({
          sql: `UPDATE RecyclePrice SET source2Price = ?, source2At = ?,
                officialPrice = COALESCE(?, officialPrice), officialAt = COALESCE(?, officialAt)
                WHERE modelKey = ?`,
          args: [price, new Date().toISOString(), officialPrice, officialPrice ? new Date().toISOString() : null, key],
        }).catch(e => console.error("update error", e.message));

        pageScraped++;
        if (officialPrice) pageOfficial++;
      });
    });

    console.log(`  scraped ${pageScraped}, with official ${pageOfficial}`);
    totalScraped += pageScraped;
    totalOfficial += pageOfficial;
  } catch (e) {
    console.error("[fetch error]", e.message);
  }
}

console.log(`\n[done] 總計 ${totalScraped} 筆 update, ${totalOfficial} 筆有官方價`);

// 重算 minPrice
console.log("\n[recalc] 重算 minPrice...");
const all = await turso.execute("SELECT id, source1Price, source2Price, source3Price, officialPrice FROM RecyclePrice");
let updated = 0;
for (const r of all.rows) {
  const comps = [r.source1Price, r.source2Price, r.source3Price].filter(p => p && p > 0);
  if (comps.length === 0) continue;
  const minComp = Math.min(...comps);
  let target;
  if (r.officialPrice && r.officialPrice > 0) {
    target = Math.max(r.officialPrice * 1.4, minComp * 0.85);
    target = Math.min(target, minComp);
  } else {
    target = minComp * 0.85;
  }
  const newMin = Math.round(target / 100) * 100;
  await turso.execute({ sql: "UPDATE RecyclePrice SET minPrice = ? WHERE id = ?", args: [newMin, r.id] });
  updated++;
}
console.log(`[done] 重算 ${updated} 筆`);

const stats = await turso.execute(`
  SELECT brand, COUNT(*) total, SUM(CASE WHEN officialPrice IS NOT NULL THEN 1 ELSE 0 END) hasOff
  FROM RecyclePrice GROUP BY brand ORDER BY total DESC LIMIT 5
`);
console.log("\n[stats] 各品牌官方價覆蓋:");
for (const r of stats.rows) console.log(`  ${r.brand}: ${r.hasOff}/${r.total}`);

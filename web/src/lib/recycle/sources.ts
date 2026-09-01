// 三個來源網站的爬蟲（不對外洩露來源資訊）
import * as cheerio from "cheerio";
import {
  parseModelByCategory, parseGenericModel, parsePriceText,
  type Category, type ParsedModel,
} from "./normalizer";
import { isReasonablePrice, strictParsePrice } from "./validation";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface ScrapedRow extends ParsedModel {
  price: number;
  officialPrice?: number;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Fetch ${url} → ${res.status}`);
  return await res.text();
}

// === Source 1 =================================================================
const SOURCE1_PAGES: Array<{ url: string; category: Category }> = [
  { url: "https://www.second3c.com.tw/pages/iphone-trade-in", category: "phone" },
  { url: "https://www.second3c.com.tw/pages/ipad-trade-in", category: "tablet" },
  { url: "https://www.second3c.com.tw/pages/macbook-pro-trade-in", category: "laptop_pro" },
  { url: "https://www.second3c.com.tw/pages/macbook-air-trade-in", category: "laptop_air" },
];

export async function scrapeSource1(): Promise<ScrapedRow[]> {
  const results: ScrapedRow[] = [];
  for (const page of SOURCE1_PAGES) {
    try {
      const html = await fetchHtml(page.url);
      const $ = cheerio.load(html);
      $("table tr").each((_, tr) => {
        const cells = $(tr).find("td").map((_, td) => $(td).text().trim()).get();
        if (cells.length < 2) return;
        const parsed = parseModelByCategory(cells[0], page.category);
        const price = strictParsePrice(cells[1]) ?? parsePriceText(cells[1]);
        if (parsed && price && isReasonablePrice(price, page.category)) {
          results.push({ ...parsed, price });
        }
      });
    } catch (e) { console.error(`[source1] ${page.url}`, e); }
  }
  return results;
}

// === Source 2 =================================================================
// 2026-09 改版：us3c 從靜態 <table> 改成 Next.js SPA，價格表是 client-side render
// （HTML 內只有 BAILOUT_TO_CLIENT_SIDE_RENDERING +「載入價格表中...」佔位）。
// 但完整資料仍以 JSON 物件內嵌在 RSC flight payload 中，形如：
//   {"slug":"iphone-17-pro-max-2t","model":"iPhone 17 Pro Max 2T","capacity":"-",
//    "us3cPrice":43500,"applePrice":"尚未回收","isHot":true,"note":"..."}
// 故改為解析 payload，不需 headless browser（Vercel serverless 跑不動）。
const SOURCE2_PAGES: Array<{ url: string; category: Category }> = [
  { url: "https://www.us3c.com.tw/promotion-recycle-phones", category: "phone" },
  { url: "https://www.us3c.com.tw/promotion-recycle-ipad", category: "tablet" },
  { url: "https://www.us3c.com.tw/promotion-recycle-macbook-pro", category: "laptop_pro" },
  { url: "https://www.us3c.com.tw/promotion-recycle-macbook-air", category: "laptop_air" },
];

interface Us3cRow {
  model: string;
  us3cPrice: number;
  applePrice?: unknown;   // 可能是數字、0、"尚未回收" 或 null
  capacity?: string;
}

// RSC flight payload 內的 JSON 是雙重跳脫的字串，先還原成正常 JSON 文字
function unescapeFlightPayload(html: string): string {
  return html.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

// 掃出所有 {"slug":...} 物件。用大括號配對取完整 JSON 再 parse，
// 這樣各頁 schema 差異（speaker 頁多 year/accessories/bonusPrice）都能通吃。
function extractUs3cRows(html: string): Us3cRow[] {
  const text = unescapeFlightPayload(html);
  const rows: Us3cRow[] = [];
  let idx = 0;
  while ((idx = text.indexOf('{"slug":"', idx)) !== -1) {
    let depth = 0, end = -1, inStr = false, esc = false;
    for (let i = idx; i < text.length && i < idx + 4000; i++) {
      const ch = text[i];
      if (esc) { esc = false; continue; }
      if (ch === "\\") { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) { end = i + 1; break; } }
    }
    if (end === -1) { idx += 9; continue; }
    try {
      const obj = JSON.parse(text.slice(idx, end)) as Us3cRow;
      if (obj && typeof obj.model === "string" && typeof obj.us3cPrice === "number") rows.push(obj);
    } catch { /* 非價格物件，略過 */ }
    idx = end;
  }
  return rows;
}

// applePrice 只在確定是有效正數時才採用（0 / "尚未回收" / null 都代表沒有官方價）
function parseOfficialPrice(raw: unknown, category: Category): number | undefined {
  let n: number | null = null;
  if (typeof raw === "number") n = raw;
  else if (typeof raw === "string") n = parsePriceText(raw);
  if (!n || n <= 0) return undefined;
  return isReasonablePrice(n, category) ? n : undefined;
}

export async function scrapeSource2(): Promise<ScrapedRow[]> {
  const results: ScrapedRow[] = [];
  for (const page of SOURCE2_PAGES) {
    try {
      const html = await fetchHtml(page.url);
      for (const row of extractUs3cRows(html)) {
        const parsed = parseModelByCategory(row.model, page.category);
        if (!parsed) continue;
        if (!isReasonablePrice(row.us3cPrice, page.category)) {
          console.warn(`[source2] 異常價 ${page.category} ${row.model} = ${row.us3cPrice}`);
          continue;
        }
        const officialPrice = parseOfficialPrice(row.applePrice, page.category);
        results.push({ ...parsed, price: row.us3cPrice, ...(officialPrice ? { officialPrice } : {}) });
      }
    } catch (e) { console.error(`[source2] ${page.url}`, e); }
  }
  return results;
}

// === Source 2 補：us3c speaker-recycle（AirPods 收購價） ======================
// 同樣走 RSC payload；此頁含各家藍牙喇叭／耳機，只挑 AirPods
export async function scrapeUs3cAirPods(): Promise<ScrapedRow[]> {
  const results: ScrapedRow[] = [];
  try {
    const html = await fetchHtml("https://www.us3c.com.tw/speaker-recycle");
    for (const row of extractUs3cRows(html)) {
      if (!/airpod/i.test(row.model)) continue;
      if (!isReasonablePrice(row.us3cPrice, "earphone")) {
        console.warn(`[source2 airpods] 異常價 ${row.model} = ${row.us3cPrice}`);
        continue;
      }
      const parsed = parseModelByCategory(row.model, "earphone");
      if (parsed) results.push({ ...parsed, price: row.us3cPrice });
    }
  } catch (e) { console.error("[source2 airpods]", e); }
  return results;
}

// === Source 3：jyes（全品牌主頁，含 Samsung、OPPO、vivo、Sony…） =================
const SOURCE3_PAGES: Array<{ cid: number; brand: string; category: Category }> = [
  { cid: 1,  brand: "Apple",    category: "phone" },
  { cid: 2,  brand: "Apple",    category: "tablet" },
  { cid: 3,  brand: "Samsung",  category: "phone" },
  { cid: 4,  brand: "Samsung",  category: "tablet" },
  { cid: 5,  brand: "OPPO",     category: "phone" },
  { cid: 6,  brand: "vivo",     category: "phone" },
  { cid: 7,  brand: "Sony",     category: "phone" },
  { cid: 8,  brand: "ASUS",     category: "phone" },
  { cid: 9,  brand: "realme",   category: "phone" },
  { cid: 10, brand: "Xiaomi",   category: "phone" },
  { cid: 11, brand: "Redmi",    category: "phone" },
  { cid: 12, brand: "POCO",     category: "phone" },
  { cid: 13, brand: "Google",   category: "phone" },
  { cid: 14, brand: "HTC",      category: "phone" },
  { cid: 18, brand: "motorola", category: "phone" },
  { cid: 19, brand: "黑鯊",      category: "phone" },
  { cid: 20, brand: "SHARP",    category: "phone" },
  { cid: 21, brand: "Lenovo",   category: "phone" },
  { cid: 78, brand: "Nothing",  category: "phone" },
  { cid: 86, brand: "HONOR",    category: "phone" },
];

export async function scrapeSource3(): Promise<ScrapedRow[]> {
  const results: ScrapedRow[] = [];
  for (const page of SOURCE3_PAGES) {
    try {
      const url = `https://www.jyes.com.tw/recycle.php?act=list&cid=${page.cid}`;
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);
      // jyes 表格固定 4 欄：[名稱, 名稱(重複), $價格, 詳細價格]
      // 嚴格只取「以 $ 開頭」的 cell 當價格，避免被名稱裡的數字誤判
      $("table tr").each((_, tr) => {
        const cells = $(tr).find("td").map((_, td) => $(td).text().trim()).get();
        if (cells.length < 3) return;
        const modelText = cells[0];
        // 只跳過真正的表頭列。注意不能用 /回收價$/ 之類的寬鬆比對：
        // jyes 每一列商品名稱都以「舊機高額回收價」結尾，會把整張表全部誤判成表頭。
        if (/^(商品名稱|商品|名稱|最高回收價|回收價)$/.test(modelText)) return;
        // strict：price cell 必須以 $ 起頭
        const priceCell = cells.find(c => /^\$/.test(c.trim()));
        if (!priceCell) return;
        const price = strictParsePrice(priceCell);
        if (!price) return;
        // 合理性檢查
        if (!isReasonablePrice(price, page.category)) {
          console.warn(`[source3] 異常價 cid=${page.cid} ${modelText} = ${price}`);
          return;
        }
        const looksApple = /iphone|ipad/i.test(modelText);
        let parsed: ParsedModel | null = null;
        const cleanedName = modelText.replace(/舊機高額回收價/g, "").trim();
        if (looksApple) {
          parsed = parseModelByCategory(cleanedName, page.category);
        } else {
          parsed = parseGenericModel(cleanedName, page.brand, page.category);
        }
        if (parsed) results.push({ ...parsed, price });
      });
    } catch (e) { console.error(`[source3 cid=${page.cid}]`, e); }
  }
  return results;
}

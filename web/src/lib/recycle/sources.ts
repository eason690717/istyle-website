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
const SOURCE2_PAGES: Array<{ url: string; category: Category; priceCol: number }> = [
  { url: "https://www.us3c.com.tw/promotion-recycle-phones", category: "phone", priceCol: 1 },
  { url: "https://www.us3c.com.tw/promotion-recycle-ipad", category: "tablet", priceCol: 1 },
  { url: "https://www.us3c.com.tw/promotion-recycle-macbook-pro", category: "laptop_pro", priceCol: 1 },
  { url: "https://www.us3c.com.tw/promotion-recycle-macbook-air", category: "laptop_air", priceCol: 1 },
];

export async function scrapeSource2(): Promise<ScrapedRow[]> {
  const results: ScrapedRow[] = [];
  for (const page of SOURCE2_PAGES) {
    try {
      const html = await fetchHtml(page.url);
      const $ = cheerio.load(html);
      $("table tr").each((_, tr) => {
        const cells = $(tr).find("td").map((_, td) => $(td).text().trim()).get();
        if (cells.length < page.priceCol + 1) return;
        const parsed = parseModelByCategory(cells[0], page.category);
        const price = parsePriceText(cells[page.priceCol]);
        if (parsed && price && isReasonablePrice(price, page.category)) {
          results.push({ ...parsed, price });
        }
      });
    } catch (e) { console.error(`[source2] ${page.url}`, e); }
  }
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
        if (/^商品|名稱|回收價$/.test(modelText)) return; // skip header
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

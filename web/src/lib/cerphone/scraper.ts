// Cerphone 維修報價爬蟲（TypeScript 版本，可在 Vercel cron 跑）
// 功能：抓 10 個品牌頁面 → 解析表格 → 套公式（×1.15 進位百）→ upsert RepairPrice
import * as cheerio from "cheerio";
import { prisma } from "@/lib/prisma";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const BRANDS: Array<{ slug: string; name: string; nameZh: string; sortOrder: number; url: string }> = [
  { slug: "apple",    name: "Apple",    nameZh: "蘋果",    sortOrder: 1, url: "https://cerphone.com/index.php/quotation_apple/" },
  { slug: "samsung",  name: "Samsung",  nameZh: "三星",    sortOrder: 2, url: "https://cerphone.com/index.php/quotation_samsung/" },
  { slug: "google",   name: "Google",   nameZh: "Google",  sortOrder: 3, url: "https://cerphone.com/index.php/quotation_google/" },
  { slug: "sony",     name: "Sony",     nameZh: "索尼",    sortOrder: 4, url: "https://cerphone.com/index.php/quotation_sony/" },
  { slug: "asus",     name: "ASUS",     nameZh: "華碩",    sortOrder: 5, url: "https://cerphone.com/index.php/quotation_asus/" },
  { slug: "oppo",     name: "OPPO",     nameZh: "OPPO",    sortOrder: 6, url: "https://cerphone.com/index.php/quotation_oppo/" },
  { slug: "xiaomi",   name: "Xiaomi",   nameZh: "小米",    sortOrder: 7, url: "https://cerphone.com/index.php/quotation_mi/" },
  { slug: "huawei",   name: "Huawei",   nameZh: "華為等",   sortOrder: 8, url: "https://cerphone.com/index.php/quotation_huawei_etc/" },
  { slug: "dyson",    name: "Dyson",    nameZh: "Dyson",   sortOrder: 9, url: "https://cerphone.com/index.php/quotation_dyson/" },
  { slug: "nintendo", name: "Nintendo", nameZh: "任天堂",   sortOrder: 10, url: "https://cerphone.com/index.php/quotation_nintendo/" },
];

function slugify(s: string): string {
  return s.toLowerCase()
    .replace(/[（）()]/g, "")
    .replace(/[\s_/\\]+/g, "-")
    .replace(/[^a-z0-9\u4e00-\u9fff-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function ceilToHundred(n: number): number {
  return Math.ceil(n / 100) * 100;
}

function parseInt2(s: string): number | null {
  const m = s.match(/(\d{2,6})/);
  return m ? parseInt(m[1]) : null;
}

function itemCategory(name: string): string {
  if (/螢幕|玻璃|液晶|觸控|蓋板|TP/.test(name)) return "screen";
  if (/電池/.test(name)) return "battery";
  if (/鏡頭|相機/.test(name)) return "camera";
  if (/HOME|指紋/.test(name)) return "home";
  if (/聽筒|麥克風|喇叭|響鈴|震動|耳機/.test(name)) return "audio";
  if (/充電|尾插/.test(name)) return "charging";
  if (/開機|音量|按鍵/.test(name)) return "button";
  if (/FACE|臉部|人臉/i.test(name)) return "face_id";
  if (/主機板|機板|CPU|資料/.test(name)) return "logic_board";
  if (/容量|擴充|硬碟/.test(name)) return "storage";
  if (/背蓋|外殼|中框/.test(name)) return "housing";
  if (/天線|WIFI|訊號/.test(name)) return "antenna";
  if (/卡座|SIM/i.test(name)) return "sim";
  return "other";
}

interface ScrapedPrice {
  brandSlug: string;
  section: string;
  modelName: string;
  itemName: string;
  cerphonePriceRaw: string;
  cerphonePrice: number;
  istylePrice: number;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-TW,zh;q=0.9",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Fetch ${url} → ${res.status}`);
  return res.text();
}

export async function scrapeCerphoneAll() {
  const startedAt = new Date();
  const all: ScrapedPrice[] = [];

  for (const brand of BRANDS) {
    try {
      const html = await fetchHtml(brand.url);
      const $ = cheerio.load(html);

      let currentSection = brand.name;
      // 走訪 h2/h3/h4 + table 順序
      $("h2, h3, h4, table").each((_, el) => {
        const tag = (el as { tagName?: string; name?: string }).tagName ?? (el as { name?: string }).name;
        if (tag === "h2" || tag === "h3" || tag === "h4") {
          const t = $(el).text().trim();
          if (t && t.length < 50) currentSection = t;
        } else if (tag === "table") {
          const rows = $(el).find("tr").toArray();
          if (rows.length < 2) return;
          const headerCells = $(rows[0]).find("td, th").toArray().map(c => $(c).text().trim());
          if (!headerCells.length) return;
          for (let i = 1; i < rows.length; i++) {
            const cells = $(rows[i]).find("td, th").toArray().map(c => $(c).text().trim());
            if (!cells.length) continue;
            const modelName = cells[0];
            if (!modelName || modelName.length > 100) continue;
            for (let j = 1; j < Math.min(cells.length, headerCells.length); j++) {
              const itemName = headerCells[j];
              const raw = cells[j];
              const priceVal = parseInt2(raw);
              if (!itemName || !priceVal) continue;
              all.push({
                brandSlug: brand.slug,
                section: currentSection,
                modelName,
                itemName,
                cerphonePriceRaw: raw,
                cerphonePrice: priceVal,
                istylePrice: ceilToHundred(priceVal * 1.15),
              });
            }
          }
        }
      });
    } catch (e) {
      console.error(`[cerphone] ${brand.slug}`, e);
    }
  }

  console.log(`[cerphone] scraped ${all.length} (model × item) prices`);

  // === Upsert to DB ===
  let priceUpserts = 0;
  let modelUpserts = 0;
  let itemUpserts = 0;

  // Brand 確保存在
  const brandIdMap = new Map<string, number>();
  for (const b of BRANDS) {
    const dbBrand = await prisma.brand.upsert({
      where: { slug: b.slug },
      create: { slug: b.slug, name: b.name, nameZh: b.nameZh, sortOrder: b.sortOrder },
      update: { name: b.name, nameZh: b.nameZh, sortOrder: b.sortOrder },
    });
    brandIdMap.set(b.slug, dbBrand.id);
  }

  // Cache model + item ids
  const modelKeyToId = new Map<string, number>();
  const itemNameToId = new Map<string, number>();
  let modelOrder = 0, itemOrder = 0;

  for (const r of all) {
    const brandId = brandIdMap.get(r.brandSlug);
    if (!brandId) continue;

    const modelKey = `${r.brandSlug}|${r.modelName}`;
    let modelId = modelKeyToId.get(modelKey);
    if (!modelId) {
      const baseSlug = slugify(`${r.brandSlug}-${r.modelName}`);
      const m = await prisma.deviceModel.upsert({
        where: { slug: baseSlug },
        create: { brandId, slug: baseSlug, name: r.modelName, section: r.section, sortOrder: modelOrder++ },
        update: { section: r.section },
      });
      modelId = m.id;
      modelKeyToId.set(modelKey, modelId);
      modelUpserts++;
    }

    let itemId = itemNameToId.get(r.itemName);
    if (!itemId) {
      const baseSlug = slugify(r.itemName);
      const it = await prisma.repairItem.upsert({
        where: { slug: baseSlug },
        create: {
          slug: baseSlug, name: r.itemName,
          category: itemCategory(r.itemName),
          sortOrder: itemOrder++,
          warrantyMonths: /認證/.test(r.itemName) ? 6 : 3,
        },
        update: {},
      });
      itemId = it.id;
      itemNameToId.set(r.itemName, itemId);
      itemUpserts++;
    }

    const tier = /原廠|APPLE\s*原|OEM/i.test(r.itemName) ? "OEM" : "STANDARD";

    await prisma.repairPrice.upsert({
      where: { modelId_itemId_tier: { modelId, itemId, tier } },
      create: {
        modelId, itemId, tier,
        cerphonePriceRaw: r.cerphonePriceRaw,
        cerphonePrice: r.cerphonePrice,
        calculatedPrice: r.istylePrice,
        isAvailable: true,
      },
      update: {
        cerphonePriceRaw: r.cerphonePriceRaw,
        cerphonePrice: r.cerphonePrice,
        calculatedPrice: r.istylePrice,
      },
    });
    priceUpserts++;
  }

  return {
    scrapedCount: all.length,
    priceUpserts,
    modelUpserts,
    itemUpserts,
    startedAt,
    finishedAt: new Date(),
  };
}

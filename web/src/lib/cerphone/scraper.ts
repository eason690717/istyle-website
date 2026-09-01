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
  const brandFailures: Array<{ brand: string; error: string }> = [];

  for (const brand of BRANDS) {
    const brandStart = new Date();
    const beforeCount = all.length;
    try {
      const html = await fetchHtml(brand.url);
      const $ = cheerio.load(html);

      let currentSection = brand.name;
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

      const brandCount = all.length - beforeCount;
      // 解析成功但 0 筆 = 視為 partial（可能 cerphone 改版）
      const status = brandCount === 0 ? "partial" : "success";
      await prisma.cerphoneScrapeLog.create({
        data: {
          scope: "brand",
          brand: brand.slug,
          status,
          recordCount: brandCount,
          errorMsg: status === "partial" ? "解析成功但 0 筆，可能 cerphone 改版" : null,
          durationMs: Date.now() - brandStart.getTime(),
          startedAt: brandStart,
        },
      }).catch(err => console.error("[cerphone log brand]", err));
    } catch (e) {
      const errStr = String(e);
      console.error(`[cerphone] ${brand.slug}`, e);
      brandFailures.push({ brand: brand.slug, error: errStr });
      await prisma.cerphoneScrapeLog.create({
        data: {
          scope: "brand",
          brand: brand.slug,
          status: "error",
          recordCount: 0,
          errorMsg: errStr.slice(0, 500),
          durationMs: Date.now() - brandStart.getTime(),
          startedAt: brandStart,
        },
      }).catch(err => console.error("[cerphone log brand err]", err));
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

  // === 效能：預載對照表，避免每筆資料各打一次 DB ===
  // 舊版對 4,000 筆資料逐筆 await upsert，每筆都是一趟 Turso HTTP round-trip（~70ms），
  // 累積 280 秒 → 300 秒 timeout 砍在迴圈中途，導致固定只更新到前 ~1,200 筆，
  // 後面 2,600 筆自開站起從未被更新過。改為預載 + 差異寫入 + 並行批次。
  const [existingModels, existingItems] = await Promise.all([
    prisma.deviceModel.findMany({ select: { id: true, slug: true, section: true } }),
    prisma.repairItem.findMany({ select: { id: true, slug: true } }),
  ]);
  const modelSlugToId = new Map(existingModels.map(m => [m.slug, m.id]));
  const modelSlugToSection = new Map(existingModels.map(m => [m.slug, m.section]));
  const itemSlugToId = new Map(existingItems.map(i => [i.slug, i.id]));
  const sectionUpdates: Array<{ slug: string; section: string }> = [];

  // 先補齊缺少的 DeviceModel / RepairItem（數量少，循序即可）
  let modelOrder = existingModels.length, itemOrder = existingItems.length;
  const seenModelSlugs = new Set<string>();
  const seenItemSlugs = new Set<string>();
  for (const r of all) {
    const brandId = brandIdMap.get(r.brandSlug);
    if (!brandId) continue;
    const mSlug = slugify(`${r.brandSlug}-${r.modelName}`);
    if (!seenModelSlugs.has(mSlug)) {
      seenModelSlugs.add(mSlug);
      if (!modelSlugToId.has(mSlug)) {
        const m = await prisma.deviceModel.create({
          data: { brandId, slug: mSlug, name: r.modelName, section: r.section, sortOrder: modelOrder++ },
        }).catch(() => null);
        if (m) { modelSlugToId.set(mSlug, m.id); modelUpserts++; }
      } else if (modelSlugToSection.get(mSlug) !== r.section) {
        // 來源重新分區時同步（不碰 isActive，人工隱藏的機型要保持隱藏）
        sectionUpdates.push({ slug: mSlug, section: r.section });
      }
    }
    const iSlug = slugify(r.itemName);
    if (!seenItemSlugs.has(iSlug)) {
      seenItemSlugs.add(iSlug);
      if (!itemSlugToId.has(iSlug)) {
        const it = await prisma.repairItem.create({
          data: {
            slug: iSlug, name: r.itemName,
            category: itemCategory(r.itemName),
            sortOrder: itemOrder++,
            warrantyMonths: /認證/.test(r.itemName) ? 6 : 3,
          },
        }).catch(() => null);
        if (it) { itemSlugToId.set(iSlug, it.id); itemUpserts++; }
      }
    }
  }

  // 套用 section 變更（通常 0 筆，來源改版時才有）
  for (let i = 0; i < sectionUpdates.length; i += 25) {
    await Promise.allSettled(sectionUpdates.slice(i, i + 25).map(u =>
      prisma.deviceModel.update({ where: { slug: u.slug }, data: { section: u.section } }),
    ));
  }
  if (sectionUpdates.length) console.log(`[cerphone] 更新 section ${sectionUpdates.length} 筆`);

  // 預載既有報價，只寫「真的變動」的列（多數日子價格不變 → 寫入量大幅下降）
  const existingPrices = await prisma.repairPrice.findMany({
    select: { modelId: true, itemId: true, tier: true, cerphonePrice: true, calculatedPrice: true },
  });
  const priceKey = (modelId: number, itemId: number, tier: string) => `${modelId}|${itemId}|${tier}`;
  const existingPriceMap = new Map(
    existingPrices.map(p => [priceKey(p.modelId, p.itemId, p.tier), p]),
  );

  type PendingWrite = {
    modelId: number; itemId: number; tier: string;
    raw: string; cerphonePrice: number; istylePrice: number; isNew: boolean;
  };
  const pending: PendingWrite[] = [];
  const queuedKeys = new Set<string>();

  for (const r of all) {
    const modelId = modelSlugToId.get(slugify(`${r.brandSlug}-${r.modelName}`));
    const itemId = itemSlugToId.get(slugify(r.itemName));
    if (!modelId || !itemId) continue;
    const tier = /原廠|APPLE\s*原|OEM/i.test(r.itemName) ? "OEM" : "STANDARD";
    const k = priceKey(modelId, itemId, tier);
    if (queuedKeys.has(k)) continue;   // 同一輪重複列，取第一筆
    const prev = existingPriceMap.get(k);
    // 價格沒變就跳過，省下一次 round-trip
    if (prev && prev.cerphonePrice === r.cerphonePrice && prev.calculatedPrice === r.istylePrice) continue;
    queuedKeys.add(k);
    pending.push({
      modelId, itemId, tier,
      raw: r.cerphonePriceRaw, cerphonePrice: r.cerphonePrice, istylePrice: r.istylePrice,
      isNew: !prev,
    });
  }

  // 並行批次寫入（Turso 是 HTTP，平行化才有意義；批次大小取保守值避免打爆連線）
  const BATCH = 25;
  for (let i = 0; i < pending.length; i += BATCH) {
    const slice = pending.slice(i, i + BATCH);
    const done = await Promise.allSettled(slice.map(w =>
      prisma.repairPrice.upsert({
        where: { modelId_itemId_tier: { modelId: w.modelId, itemId: w.itemId, tier: w.tier } },
        create: {
          modelId: w.modelId, itemId: w.itemId, tier: w.tier,
          cerphonePriceRaw: w.raw,
          cerphonePrice: w.cerphonePrice,
          calculatedPrice: w.istylePrice,
          isAvailable: true,
        },
        // 注意：不動 manualOverride / isAvailable，人工覆寫與隱藏欄位要保留
        update: {
          cerphonePriceRaw: w.raw,
          cerphonePrice: w.cerphonePrice,
          calculatedPrice: w.istylePrice,
        },
      }),
    ));
    priceUpserts += done.filter(d => d.status === "fulfilled").length;
    const failures = done.filter(d => d.status === "rejected");
    if (failures.length) {
      console.error(`[cerphone] batch ${i / BATCH} 有 ${failures.length} 筆寫入失敗`,
        String((failures[0] as PromiseRejectedResult).reason).slice(0, 200));
    }
  }
  const unchangedCount = all.length - pending.length;
  console.log(`[cerphone] 待寫 ${pending.length} 筆（未變動 ${unchangedCount} 筆跳過），實寫 ${priceUpserts} 筆`);

  const finishedAt = new Date();
  // summary：失敗品牌 > 0 = partial；全失敗 = error
  const summaryStatus =
    brandFailures.length === BRANDS.length ? "error"
    : brandFailures.length > 0 ? "partial"
    : "success";
  const summaryErr = brandFailures.length
    ? brandFailures.map(f => `${f.brand}: ${f.error}`).join(" | ").slice(0, 500)
    : null;
  await prisma.cerphoneScrapeLog.create({
    data: {
      scope: "summary",
      brand: null,
      status: summaryStatus,
      recordCount: all.length,
      priceUpserts,
      modelUpserts,
      itemUpserts,
      errorMsg: summaryErr,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      startedAt,
    },
  }).catch(err => console.error("[cerphone log summary]", err));

  return {
    scrapedCount: all.length,
    priceUpserts,
    modelUpserts,
    itemUpserts,
    failedBrands: brandFailures.map(f => f.brand),
    startedAt,
    finishedAt,
  };
}

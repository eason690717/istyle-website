// Seed: 把 cerphone 報價灌進 DB
// 來源：D:\GA\0424_iStyle\data\cerphone\cerphone_baseline.csv
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const url = process.env.TURSO_DATABASE_URL || "file:./dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const adapter = new PrismaLibSql({ url, authToken });
const prisma = new PrismaClient({ adapter });

const CSV_PATH = join(process.cwd(), "..", "data", "cerphone", "cerphone_baseline.csv");

// 簡易 CSV parser（cerphone CSV 沒有引號內逗號）
function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",");
  return lines.slice(1).map(line => {
    const cells: string[] = [];
    let cur = "";
    let inQuote = false;
    for (const c of line) {
      if (c === '"') { inQuote = !inQuote; continue; }
      if (c === "," && !inQuote) { cells.push(cur); cur = ""; continue; }
      cur += c;
    }
    cells.push(cur);
    const row: Record<string, string> = {};
    header.forEach((h, i) => row[h] = cells[i] ?? "");
    return row;
  });
}

function slugify(s: string): string {
  return s.trim().toLowerCase()
    .replace(/[（）()]/g, "")
    .replace(/[\s_/\\]+/g, "-")
    .replace(/[^a-z0-9\u4e00-\u9fff-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const BRAND_DISPLAY: Record<string, { name: string; nameZh: string; sortOrder: number }> = {
  Apple:    { name: "Apple",    nameZh: "蘋果",     sortOrder: 1 },
  Samsung:  { name: "Samsung",  nameZh: "三星",     sortOrder: 2 },
  Google:   { name: "Google",   nameZh: "Google",   sortOrder: 3 },
  Sony:     { name: "Sony",     nameZh: "索尼",     sortOrder: 4 },
  ASUS:     { name: "ASUS",     nameZh: "華碩",     sortOrder: 5 },
  OPPO:     { name: "OPPO",     nameZh: "OPPO",     sortOrder: 6 },
  Mi:       { name: "Xiaomi",   nameZh: "小米",     sortOrder: 7 },
  "Huawei等": { name: "Huawei",  nameZh: "華為等",    sortOrder: 8 },
  Dyson:    { name: "Dyson",    nameZh: "Dyson",    sortOrder: 9 },
  Switch:   { name: "Nintendo", nameZh: "任天堂",    sortOrder: 10 },
};

// 維修項目分類規則（粗略對應，後台可調）
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

async function main() {
  console.log("[seed] 讀取 CSV:", CSV_PATH);
  const csvText = readFileSync(CSV_PATH, "utf-8");
  const rows = parseCsv(csvText);
  console.log(`[seed] 讀到 ${rows.length} 筆 raw 報價`);

  // 1. Brands
  const brandSlugMap = new Map<string, number>();
  for (const [brandKey, info] of Object.entries(BRAND_DISPLAY)) {
    const slug = slugify(info.name);
    const b = await prisma.brand.upsert({
      where: { slug },
      create: { slug, name: info.name, nameZh: info.nameZh, sortOrder: info.sortOrder },
      update: { name: info.name, nameZh: info.nameZh, sortOrder: info.sortOrder },
    });
    brandSlugMap.set(brandKey, b.id);
  }
  console.log(`[seed] Brands: ${brandSlugMap.size}`);

  // 2. Models + RepairItems + RepairPrices
  const modelMap = new Map<string, number>();   // brand|model_name -> id
  const itemMap = new Map<string, number>();    // item_name -> id

  let priceCount = 0;
  let modelOrder = 0;
  let itemOrder = 0;

  for (const r of rows) {
    const brandId = brandSlugMap.get(r.brand);
    if (!brandId) continue;
    const modelName = r.model.trim();
    const itemName = r.repair_item.trim();
    const cerphonePriceRaw = r.cerphone_price_raw || "";
    const cerphonePrice = r.cerphone_price ? parseInt(r.cerphone_price) : null;
    const istylePrice = r.istyle_price ? parseInt(r.istyle_price) : null;
    if (!modelName || !itemName) continue;

    // Upsert model
    const modelKey = `${r.brand}|${modelName}`;
    let modelId = modelMap.get(modelKey);
    if (!modelId) {
      const baseSlug = slugify(`${r.brand}-${modelName}`);
      const m = await prisma.deviceModel.upsert({
        where: { slug: baseSlug },
        create: {
          brandId,
          slug: baseSlug,
          name: modelName,
          section: r.section || null,
          sortOrder: modelOrder++,
        },
        update: { section: r.section || null },
      });
      modelId = m.id;
      modelMap.set(modelKey, modelId);
    }

    // Upsert repair item
    let itemId = itemMap.get(itemName);
    if (!itemId) {
      const baseSlug = slugify(itemName);
      const it = await prisma.repairItem.upsert({
        where: { slug: baseSlug },
        create: {
          slug: baseSlug,
          name: itemName,
          category: itemCategory(itemName),
          sortOrder: itemOrder++,
          warrantyMonths: 3,
        },
        update: {},
      });
      itemId = it.id;
      itemMap.set(itemName, itemId);
    }

    // Determine tier: 含「原廠」「APPLE」「OEM」字眼歸 OEM，其他歸 STANDARD
    const tier = /原廠|APPLE\s*原|OEM/i.test(itemName) ? "OEM" : "STANDARD";

    if (cerphonePrice !== null) {
      await prisma.repairPrice.upsert({
        where: { modelId_itemId_tier: { modelId, itemId, tier } },
        create: {
          modelId, itemId, tier,
          cerphonePriceRaw, cerphonePrice,
          calculatedPrice: istylePrice,
          isAvailable: true,
        },
        update: {
          cerphonePriceRaw, cerphonePrice, calculatedPrice: istylePrice,
        },
      });
      priceCount++;
    }
  }
  console.log(`[seed] Models: ${modelMap.size}, Items: ${itemMap.size}, Prices: ${priceCount}`);

  // 3. Site setting (一筆)
  await prisma.siteSetting.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      phone: "",
      addressLine: "板橋區",
      metaTitle: "i時代 — 板橋手機維修專門店",
      metaDescription: "iPhone・iPad・MacBook・Switch・Dyson 全方位維修．14 年技術經驗．透明報價．當日完工．新北板橋江子翠",
      metaKeywords: "板橋手機維修,iPhone維修,iPad維修,MacBook維修,Switch維修,Dyson維修,江子翠手機維修,新北手機維修,板橋換螢幕,板橋換電池",
    },
    update: {},
  });
  console.log("[seed] SiteSetting 完成");

  // 4. Admin user
  await prisma.user.upsert({
    where: { email: "admin@i-style.store" },
    create: { email: "admin@i-style.store", name: "Eason Hsieh", role: "ADMIN" },
    update: {},
  });
  console.log("[seed] Admin user 完成");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async e => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

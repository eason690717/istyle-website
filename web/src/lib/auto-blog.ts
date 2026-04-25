// 自動產生部落格文章
// 從 RecyclePrice / RepairPrice 抓資料，套模板生成 Markdown 內文
// 用途：每日/每週新內容，SEO 持續豐富
import { prisma } from "@/lib/prisma";

// 主題 → 候選圖片（圖文一致，避免 iPhone 文章配 MacBook 圖）
// 順序：越靠前越相關
const TOPIC_COVERS: Array<{ keywords: RegExp; covers: string[] }> = [
  { keywords: /電池|膨脹|續航|健康度|過熱|發燙|降頻/i, covers: ["/cases/iphone-battery.jpg", "/cases/soldering.jpg"] },
  { keywords: /綠屏|綠色波紋|綠線|顯示異常|花屏|觸控失靈/i, covers: ["/cases/iphone-broken-screen.jpg", "/cases/screen-replacement.jpg"] },
  { keywords: /macbook|筆電|筆記型電腦|mac\s*air|mac\s*pro/i, covers: ["/cases/macbook-repair.jpg", "/cases/soldering.jpg"] },
  { keywords: /ipad|平板/i, covers: ["/cases/ipad-repair.jpg", "/cases/screen-replacement.jpg"] },
  { keywords: /switch|遊戲主機|joy.?con|磨菇頭|nintendo/i, covers: ["/cases/switch-controller.jpg"] },
  { keywords: /dyson|吸塵器|吹風機/i, covers: ["/cases/dyson-vacuum.jpg"] },
  { keywords: /回收|賣|二手|trade.?in|收購/i, covers: ["/cases/phone-repair-bench.jpg", "/cases/iphone-disassembly.jpg"] },
  { keywords: /板橋|江子翠|門市|實體店|推薦/i, covers: ["/cases/tech-shop.jpg", "/cases/phone-repair-bench.jpg"] },
  { keywords: /主機板|機板|cpu|焊接|資料救援|拆機|零件/i, covers: ["/cases/soldering.jpg", "/cases/iphone-disassembly.jpg"] },
  { keywords: /螢幕|玻璃|破裂|碎裂|液晶|顯示/i, covers: ["/cases/iphone-broken-screen.jpg", "/cases/screen-replacement.jpg"] },
  { keywords: /iphone|蘋果手機/i, covers: ["/cases/iphone-disassembly.jpg", "/cases/iphone-battery.jpg", "/cases/iphone-broken-screen.jpg"] },
  { keywords: /samsung|三星/i, covers: ["/cases/phone-repair-bench.jpg", "/cases/screen-replacement.jpg"] },
];

const FALLBACK_COVERS = [
  "/cases/phone-repair-bench.jpg",
  "/cases/tech-shop.jpg",
];

// 根據文章內容（標題 + 關鍵字）智慧選圖，確保圖文一致
function pickCover(seed: string, ...contextStrings: string[]): string {
  const haystack = [seed, ...contextStrings].join(" ").toLowerCase();
  // 匹配第一個符合的主題
  for (const topic of TOPIC_COVERS) {
    if (topic.keywords.test(haystack)) {
      // 同主題多張時用 hash 分散
      let h = 0;
      for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      return topic.covers[h % topic.covers.length];
    }
  }
  // 都沒中 → fallback
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return FALLBACK_COVERS[h % FALLBACK_COVERS.length];
}

function fmtDate(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function fmtTwd(n: number): string {
  return `NT$ ${n.toLocaleString("zh-TW")}`;
}

// 每週二手回收行情總覽
export async function generateWeeklyRecycleDigest() {
  const today = fmtDate();
  const slug = `weekly-recycle-${today}`;

  // 是否今天已產生
  const existing = await prisma.autoArticle.findUnique({ where: { slug } }).catch(() => null);
  if (existing) return existing;

  // 抓各類別前 5 高回收價
  const phones = await prisma.recyclePrice.findMany({
    where: { category: "phone", minPrice: { not: null } },
    orderBy: { minPrice: "desc" },
    take: 10,
  });
  const tablets = await prisma.recyclePrice.findMany({
    where: { category: "tablet", minPrice: { not: null } },
    orderBy: { minPrice: "desc" },
    take: 8,
  });
  const laptops = await prisma.recyclePrice.findMany({
    where: { category: { in: ["laptop_pro", "laptop_air"] }, minPrice: { not: null } },
    orderBy: { minPrice: "desc" },
    take: 8,
  });

  const totalRecords = await prisma.recyclePrice.count();

  const body = `## 本週二手 3C 回收行情總覽

i時代每日自動比對市場行情，提供最即時的二手機回收價。本週收錄 **${totalRecords} 個機型**，以下為各類別前段班：

## 📱 手機回收價 Top 10

| 機型 | 容量 | 回收價（起） |
|---|---|---:|
${phones.map(p => `| ${p.modelName} | ${p.storage || "—"} | ${fmtTwd(p.minPrice!)} |`).join("\n")}

## 📲 平板回收價 Top 8

| 機型 | 規格 | 回收價（起） |
|---|---|---:|
${tablets.map(p => `| ${p.modelName} | ${[p.storage, p.variant].filter(Boolean).join("．") || "—"} | ${fmtTwd(p.minPrice!)} |`).join("\n")}

## 💻 筆電回收價 Top 8

| 機型 | 容量 | 回收價（起） |
|---|---|---:|
${laptops.map(p => `| ${p.modelName} | ${p.storage || "—"} | ${fmtTwd(p.minPrice!)} |`).join("\n")}

## 怎麼讓回收價更高？

1. **保留原廠盒裝、配件、發票** — 可多 $500-1,500
2. **電池健康度 90% 以上** — 評估更高
3. **外觀完好無刮痕** — 避免折價 10-20%
4. **登出 Apple ID / 取消配對** — 避免重置爭議
5. **盡早處理** — 機型每月貶值 1-2%

## i時代回收流程

帶機到店現場估價、現金當場給付，最快 10 分鐘完成。

可直接 [LINE 預約](https://line.me/R/ti/p/@563amdnh) 或來電 [02-8252-7208](tel:0282527208)。

## 板橋江子翠實體門市

地址：新北市板橋區（江子翠商圈）
營業時間：每日 11:00–21:00

更多即時回收價請見 [二手回收估價](/recycle) 頁。
`;

  const article = await prisma.autoArticle.create({
    data: {
      slug,
      kind: "weekly_recycle",
      title: `${today} 二手 3C 回收行情總覽 — Top 機型一覽`,
      excerpt: `本週 i時代收錄 ${totalRecords} 個機型回收價，最高回收 ${phones[0] ? fmtTwd(phones[0].minPrice!) : "—"}。完整 Top 10 手機 / 平板 / 筆電行情。`,
      body,
      coverImage: pickCover(slug, "二手回收"),
      metaDescription: `${today} 二手 iPhone / iPad / MacBook 回收行情：Top 10 高價機型一覽，i時代板橋江子翠每日更新行情。`,
      keywords: "二手回收價,iPhone 回收價格,iPad 回收,MacBook 回收,2026 回收行情,板橋二手機回收",
    },
  });
  return article;
}

// 每週自動產生「品牌維修指南」文章（基於 DB 真實資料）
// 每週輪流選一個品牌，避免重複
export async function generateBrandGuide() {
  const today = fmtDate();
  const allBrands = await prisma.brand.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { models: true } },
      models: {
        take: 50,
        orderBy: { sortOrder: "asc" },
        include: {
          prices: {
            where: { isAvailable: true, calculatedPrice: { not: null } },
            take: 8,
            include: { item: { select: { name: true } } },
          },
        },
      },
    },
  }).catch(() => []);

  if (allBrands.length === 0) return null;

  // 用日期決定本週輪到哪個品牌（每週輪換）
  const week = Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
  const brand = allBrands[week % allBrands.length];

  const slug = `brand-guide-${brand.slug}-${today.slice(0, 7)}`;
  const existing = await prisma.autoArticle.findUnique({ where: { slug } }).catch(() => null);
  if (existing) return existing;

  // 找 top 8 機型 + 各自最常見維修項目
  const topModels = brand.models.filter(m => m.prices.length > 0).slice(0, 10);
  const itemFreq = new Map<string, number>();
  for (const m of topModels) {
    for (const p of m.prices) {
      itemFreq.set(p.item.name, (itemFreq.get(p.item.name) || 0) + 1);
    }
  }
  const topItems = Array.from(itemFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([n]) => n);

  const body = `## ${brand.name} 全機型維修指南（${today.slice(0, 7)} 更新）

i時代收錄 **${brand.name} ${brand._count.models} 個機型**的透明維修報價，14 年技術經驗。本月精選熱門機型維修報價如下：

## 熱門機型維修報價

| 機型 | ${topItems.slice(0, 4).join(" | ")} |
|---|${topItems.slice(0, 4).map(() => "---:").join("|")}|
${topModels.slice(0, 8).map(m => {
  const priceMap = new Map(m.prices.map(p => [p.item.name, p.manualOverride ?? p.calculatedPrice]));
  return `| ${m.name} | ${topItems.slice(0, 4).map(it => {
    const p = priceMap.get(it);
    return p ? `$${p.toLocaleString()}` : "—";
  }).join(" | ")} |`;
}).join("\n")}

## ${brand.name} 維修注意事項

- **保固承諾**：標準 3 個月、認證零件 6 個月
- **透明報價**：所有維修費用線上即可查詢，無隱藏費用
- **現場維修**：板橋江子翠實體門市，30 分鐘起完工
- **資料保留**：維修不影響儲存資料

## 為什麼選 i時代

- 14 年技術經驗，累積維修超過 10,000 台
- ${brand.name} 系列維修經驗豐富
- 副廠認證零件 + 原廠雙選擇
- LINE 預約現折 $100

## 立即查詢 ${brand.name} 報價

請至 [${brand.name} 維修報價](/quote/${brand.slug}) 頁面查看完整 ${brand._count.models} 個機型報價。

不確定型號？[免費自助診斷](/diagnose) 立即知道可能問題與費用。
`;

  return prisma.autoArticle.create({
    data: {
      slug, kind: "brand_guide",
      title: `${brand.name} ${brand.nameZh} 全機型維修指南｜${brand._count.models} 個機型透明報價`,
      excerpt: `i時代收錄 ${brand.name} ${brand._count.models} 個機型，本月精選熱門機型維修報價、保固政策、選擇建議。`,
      body,
      coverImage: pickCover(slug, brand.name, brand.nameZh),
      metaDescription: `${brand.name} ${brand.nameZh} 維修報價：i時代收錄 ${brand._count.models} 個機型，板橋江子翠 14 年技術經驗，透明價目，當日完工。`,
      keywords: `${brand.name} 維修,${brand.nameZh} 維修,${brand.name} 換螢幕,${brand.name} 換電池,板橋 ${brand.name} 維修`,
    },
  });
}

// 每週自動產生「機型通病解析」文章
// 從 RecyclePrice 抓最熱門機型 + 從常見故障模板生成
const TROUBLE_TEMPLATES = [
  { issue: "螢幕破裂", causes: "摔機、重壓", price: "副廠 OLED $1,800 起、APPLE 原廠 $4,500 起" },
  { issue: "電池老化", causes: "循環次數過多、充放電習慣不良", price: "認證電池 $1,500 起 ★ 推薦" },
  { issue: "充電孔氧化", causes: "灰塵、口袋摩擦", price: "$1,000–1,500" },
  { issue: "Face ID 失效", causes: "排線受損、螢幕維修不當", price: "$3,500 起" },
  { issue: "聽筒沒聲音", causes: "進水、灰塵阻塞", price: "$1,000–1,800" },
];

export async function generateModelTroublePost() {
  const today = fmtDate();
  // 抓回收價最高的前 30 個機型
  const topRecycle = await prisma.recyclePrice.findMany({
    where: { category: "phone", minPrice: { not: null } },
    orderBy: { minPrice: "desc" },
    take: 30,
  });

  if (topRecycle.length === 0) return null;

  // 用日期挑一個
  const dayIndex = Math.floor(Date.now() / (24 * 3600 * 1000));
  const target = topRecycle[dayIndex % topRecycle.length];
  const safeName = target.modelName.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "-");
  const slug = `trouble-${target.brand.toLowerCase()}-${safeName}-${today}`.toLowerCase();
  const existing = await prisma.autoArticle.findUnique({ where: { slug } }).catch(() => null);
  if (existing) return existing;

  const body = `## ${target.modelName} 常見故障與維修費用

${target.modelName} 是 ${target.brand} 旗下熱門機型（目前回收價約 ${fmtTwd(target.minPrice!)}）。i時代整理 14 年維修經驗，本機型常見故障如下：

${TROUBLE_TEMPLATES.map((t, i) => `### ${i + 1}. ${t.issue}

**常見原因**：${t.causes}

**維修費用**：${t.price}

**處理建議**：發生上述狀況請盡快送修，避免擴大損壞。
`).join("\n")}

## 為什麼選 i時代維修 ${target.modelName}？

- **14 年技術經驗**：累積維修超過 10,000 台
- **透明報價**：[${target.brand} 維修報價](/quote) 線上即可查詢
- **保固 3-6 個月**：認證零件保固延長
- **現場 30 分鐘起完工**

## 不修了？高價回收

${target.modelName} 目前回收價 **${fmtTwd(target.minPrice!)}**${target.storage ? `（${target.storage}）` : ""}，i時代每日比對市場行情，**保證高於市場**。

[👉 立即查詢回收價](/recycle)

## 預約方式

- **LINE 預約折 $100**：[加入 ${SITE.lineId}](${SITE.lineAddUrl})
- **免費自助診斷**：[${SITE.url}/diagnose](/diagnose)
- **來電**：${SITE.phone}
`;

  return prisma.autoArticle.create({
    data: {
      slug, kind: "trouble_article",
      title: `${target.modelName} 常見故障維修指南｜${target.brand} 5 大問題解析`,
      excerpt: `${target.modelName} 螢幕破裂、電池老化、Face ID 失效等 5 大常見故障與維修費用解析。回收價 ${fmtTwd(target.minPrice!)}。`,
      body,
      coverImage: pickCover(slug, target.modelName, target.brand, "螢幕電池"),
      metaDescription: `${target.modelName} 維修費用、常見故障、回收價：i時代板橋江子翠 14 年技術經驗，透明報價，當日完工。`,
      keywords: `${target.modelName} 維修,${target.brand} 維修,${target.modelName} 螢幕,${target.modelName} 電池,${target.modelName} 回收,板橋手機維修`,
    },
  });
}

// SITE 引用
import { SITE } from "@/lib/site-config";

// 每月維修報價變動報告（templated）
export async function generateMonthlyRepairReport() {
  const today = fmtDate();
  const slug = `monthly-repair-${today.slice(0, 7)}`;
  const existing = await prisma.autoArticle.findUnique({ where: { slug } }).catch(() => null);
  if (existing) return existing;

  const totalPrices = await prisma.repairPrice.count();
  const brandStats = await prisma.brand.findMany({
    include: { _count: { select: { models: true } }, models: { select: { _count: { select: { prices: true } } } } },
    orderBy: { sortOrder: "asc" },
  });

  const body = `## 本月維修報價更新報告

i時代維修報價系統已收錄 **${totalPrices.toLocaleString()} 筆**透明報價，涵蓋 **${brandStats.length} 個品牌、${brandStats.reduce((s, b) => s + b._count.models, 0)} 個機型**。

## 各品牌維修報價收錄狀況

| 品牌 | 機型數 | 維修項目報價 |
|---|---:|---:|
${brandStats.map(b => `| ${b.name} ${b.nameZh} | ${b._count.models} | ${b.models.reduce((s, m) => s + m._count.prices, 0)} |`).join("\n")}

## 為什麼選 i時代？

- **透明價目**：所有費用線上即可查詢，無隱藏費用
- **公式運算**：基於市場行情自動計算，定期更新
- **14 年技術經驗**：累積維修超過 10,000 台
- **保固承諾**：標準維修 3 個月、認證零件 6 個月

## 立即查詢您的機型

請至 [維修報價](/quote) 頁選擇品牌與機型，即時看到完整報價。
`;

  return prisma.autoArticle.create({
    data: {
      slug, kind: "monthly_summary",
      title: `${today.slice(0, 7)} 維修報價收錄報告 — ${totalPrices.toLocaleString()} 筆透明價目`,
      excerpt: `i時代收錄 ${totalPrices.toLocaleString()} 筆維修報價、${brandStats.length} 大品牌全覆蓋。本月新增更新與行情解析。`,
      body,
      coverImage: pickCover(slug, "板橋維修推薦"),
      metaDescription: `i時代 ${today.slice(0, 7)} 維修報價收錄 ${totalPrices.toLocaleString()} 筆，${brandStats.length} 品牌全覆蓋，板橋江子翠透明價目。`,
      keywords: "維修報價,iPhone 維修,Android 維修,MacBook 維修,板橋手機維修,2026 維修價目",
    },
  });
}

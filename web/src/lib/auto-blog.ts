// 自動產生部落格文章
// 從 RecyclePrice / RepairPrice 抓資料，套模板生成 Markdown 內文
// 用途：每日/每週新內容，SEO 持續豐富
import { prisma } from "@/lib/prisma";
import { pickUniqueCover } from "@/lib/article-cover";

function fmtDate(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function fmtTwd(n: number): string {
  return `NT$ ${n.toLocaleString("zh-TW")}`;
}

// 每週二手回收行情總覽
export async function generateWeeklyRecycleDigest(usedCovers?: Set<string>, usedHashes?: Set<string>) {
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
      excerpt: `本週 i時代收錄 ${totalRecords} 個機型回收價。完整 Top 10 手機 / 平板 / 筆電行情。`,
      body,
      coverImage: await pickUniqueCover([slug, "二手回收"], usedCovers, usedHashes),
      metaDescription: `${today} 二手 iPhone / iPad / MacBook 回收行情：Top 10 高價機型一覽，i時代板橋江子翠每日更新行情。`,
      keywords: "二手回收價,iPhone 回收價格,iPad 回收,MacBook 回收,2026 回收行情,板橋二手機回收",
    },
  });
  return article;
}

// 每週自動產生「品牌維修指南」文章（基於 DB 真實資料）
// 每週輪流選一個品牌，避免重複
export async function generateBrandGuide(usedCovers?: Set<string>, usedHashes?: Set<string>) {
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

i時代收錄 **${brand.name} ${brand._count.models} 個機型**的透明維修報價，14 年技術經驗。

## 熱門送修機型

本月 ${brand.name} 送修量較高的機型與常見項目：

| 機型 | 常見維修項目 |
|---|---|
${topModels.slice(0, 8).map(m => {
  const has = new Set(m.prices.map(p => p.item.name));
  const items = topItems.filter(it => has.has(it)).slice(0, 4);
  return `| ${m.name} | ${items.join("、") || "多項目"} |`;
}).join("\n")}

各項目價格會隨零件行情調整，站上每日自動更新，請直接查詢即時報價：
[👉 ${brand.name} 完整維修報價](/quote/${brand.slug})

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
      excerpt: `i時代收錄 ${brand.name} ${brand._count.models} 個機型，本文整理熱門送修機型、保固政策與選擇建議，報價可線上即時查詢。`,
      body,
      coverImage: await pickUniqueCover([slug, brand.name, brand.nameZh], usedCovers, usedHashes),
      metaDescription: `${brand.name} ${brand.nameZh} 維修報價：i時代收錄 ${brand._count.models} 個機型，板橋江子翠 14 年技術經驗，透明價目，當日完工。`,
      keywords: `${brand.name} 維修,${brand.nameZh} 維修,${brand.name} 換螢幕,${brand.name} 換電池,板橋 ${brand.name} 維修`,
    },
  });
}

// 每週自動產生「機型通病解析」文章
// 從 RecyclePrice 抓最熱門機型 + 從常見故障模板生成
// 刻意不放具體維修金額：文章一旦寫死價格就會跟每日更新的報價系統對不上，
// 客人看到舊價到店會有爭議。改描述症狀與判斷方式，價格一律導到 /quote 查即時報價。
const TROUBLE_TEMPLATES = [
  { issue: "螢幕破裂", causes: "摔機、重壓", note: "分「僅外玻璃碎」與「顯示／觸控異常」兩種，處理方式與費用不同，需現場判斷。" },
  { issue: "電池老化", causes: "循環次數過多、充放電習慣不良", note: "健康度低於 80% 或已出現無預警關機，建議更換。" },
  { issue: "充電孔氧化", causes: "灰塵、口袋摩擦", note: "先嘗試清潔，確認接觸不良才需更換尾插排線。" },
  { issue: "Face ID 失效", causes: "排線受損、螢幕維修不當", note: "多因前次維修拆裝造成，需檢測是排線或點陣投射器問題。" },
  { issue: "聽筒沒聲音", causes: "進水、灰塵阻塞", note: "先排除軟體與喇叭網孔堵塞，再判斷是否需更換聽筒。" },
];

// offset：同一次執行要產多篇時往後挑不同機型，避免一次跑出重複主題
export async function generateModelTroublePost(usedCovers?: Set<string>, offset = 0, usedHashes?: Set<string>) {
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
  const target = topRecycle[(dayIndex + offset) % topRecycle.length];
  const safeName = target.modelName.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "-");
  const slug = `trouble-${target.brand.toLowerCase()}-${safeName}-${today}`.toLowerCase();
  const existing = await prisma.autoArticle.findUnique({ where: { slug } }).catch(() => null);
  if (existing) return existing;

  const body = `## ${target.modelName} 常見故障與判斷方式

${target.modelName} 是 ${target.brand} 旗下熱門機型。i時代整理 14 年維修經驗，本機型常見故障如下：

${TROUBLE_TEMPLATES.map((t, i) => `### ${i + 1}. ${t.issue}

**常見原因**：${t.causes}

**判斷方式**：${t.note}

**處理建議**：發生上述狀況請盡快送修，避免擴大損壞。
`).join("\n")}

## ${target.modelName} 維修要多少錢？

各項目的維修費用會隨零件行情調整，站上報價每日自動更新，請直接查詢最新價格：

[👉 查詢 ${target.modelName} 即時維修報價](/quote)

不確定是哪個部位故障，可先用[免費自助診斷](/diagnose)初步判斷，或直接 LINE 傳照片給我們看。

## 為什麼選 i時代維修 ${target.modelName}？

- **14 年技術經驗**：累積維修超過 10,000 台
- **透明報價**：[${target.brand} 維修報價](/quote) 線上即可查詢，每日更新
- **保固 3-6 個月**：認證零件保固延長
- **現場 30 分鐘起完工**

## 不修了？高價回收

修不如換的時候，${target.modelName} 也可以直接折現。i時代每日比對市場行情，**保證高於市場**，實際金額依機況現場核定。

[👉 立即查詢 ${target.modelName} 回收價](/recycle)

## 預約方式

- **LINE 預約折 $100**：[加入 ${SITE.lineId}](${SITE.lineAddUrl})
- **免費自助診斷**：[${SITE.url}/diagnose](/diagnose)
- **來電**：${SITE.phone}
`;

  return prisma.autoArticle.create({
    data: {
      slug, kind: "trouble_article",
      title: `${target.modelName} 常見故障維修指南｜${target.brand} 5 大問題解析`,
      excerpt: `${target.modelName} 螢幕破裂、電池老化、Face ID 失效等 5 大常見故障的成因與判斷方式，維修報價可線上即時查詢。`,
      body,
      coverImage: await pickUniqueCover([slug, target.modelName, target.brand, "螢幕電池"], usedCovers, usedHashes),
      metaDescription: `${target.modelName} 維修費用、常見故障、回收價：i時代板橋江子翠 14 年技術經驗，透明報價，當日完工。`,
      keywords: `${target.modelName} 維修,${target.brand} 維修,${target.modelName} 螢幕,${target.modelName} 電池,${target.modelName} 回收,板橋手機維修`,
    },
  });
}

// SITE 引用
import { SITE } from "@/lib/site-config";

// 每月維修報價變動報告（templated）
export async function generateMonthlyRepairReport(usedCovers?: Set<string>, usedHashes?: Set<string>) {
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
      coverImage: await pickUniqueCover([slug, "板橋維修推薦"], usedCovers, usedHashes),
      metaDescription: `i時代 ${today.slice(0, 7)} 維修報價收錄 ${totalPrices.toLocaleString()} 筆，${brandStats.length} 品牌全覆蓋，板橋江子翠透明價目。`,
      keywords: "維修報價,iPhone 維修,Android 維修,MacBook 維修,板橋手機維修,2026 維修價目",
    },
  });
}

// 常青保養知識文章 — 純衛教內容，不含任何金額
// 目的：讓「維修知識」不再只有回收行情與故障排查兩種樣板，
// 也提供不會過期的實用內容（SEO 長尾 + 降低跳出率）
const CARE_TOPICS: Array<{
  key: string; title: string; intro: string;
  sections: Array<{ h: string; body: string }>;
}> = [
  {
    key: "battery-habits",
    title: "手機電池怎麼用才耐久？5 個充電習慣一次說清楚",
    intro: "鋰電池的壽命是用「循環次數」計算的，充電習慣直接決定你多久要換一次電池。",
    sections: [
      { h: "1. 不要每次都充到 100%", body: "長期充滿並持續插著，電池會維持在高電壓狀態而加速老化。日常用到 20% 再充、充到 80-90% 拔掉，對壽命最友善。" },
      { h: "2. 避免長時間邊充邊玩", body: "高溫是電池最大的敵人。邊充電邊玩遊戲會讓機身溫度長時間偏高，等於同時折損電池與主機板。" },
      { h: "3. 不要等到自動關機才充", body: "深度放電（低於 5%）會明顯增加循環損耗。看到 20% 就補電，比一路用到關機健康得多。" },
      { h: "4. 夏天別放車上", body: "車內溫度可達 60°C 以上，遠超過鋰電池的安全工作溫度，一次就可能造成不可逆的容量衰退。" },
      { h: "5. 用合格的充電器", body: "劣質充電器電壓不穩，除了傷電池也可能燒毀充電 IC。認明有 BSMI 認證的產品。" },
    ],
  },
  {
    key: "water-damage",
    title: "手機進水了怎麼辦？前 30 分鐘做對這 4 件事",
    intro: "手機進水後真正致命的不是水，而是通電後造成的短路與後續的主機板腐蝕。",
    sections: [
      { h: "1. 立刻關機，不要試著開機", body: "水在電路板上會導電。通電狀態下進水，短路會直接燒毀零件；已經關機的話千萬不要按開機鍵測試。" },
      { h: "2. 不要充電", body: "插上充電線等於強制通電，是進水後最常見的二次傷害來源。" },
      { h: "3. 不要用吹風機熱風吹", body: "高溫會讓水氣往機身內部擴散，也可能融化排線膠條。自然陰乾或用吸的方式移除表面水分即可。" },
      { h: "4. 儘快送修做超音波清洗", body: "腐蝕從進水那一刻就開始，拖越久主機板氧化越嚴重。專業清洗能在氧化擴散前處理乾淨，成功率差很多。" },
    ],
  },
  {
    key: "screen-protector",
    title: "螢幕保護貼真的有用嗎？該怎麼挑",
    intro: "保護貼不能防止所有破裂，但能大幅降低「日常刮傷」與「輕度摔落」造成的損失。",
    sections: [
      { h: "保護貼擋得住什麼", body: "鋼化玻璃貼主要吸收點狀衝擊與刮傷。從口袋高度掉落、鑰匙摩擦這類情境，保護貼確實能救下原廠螢幕。" },
      { h: "擋不住什麼", body: "高處墜落、機身扭曲、螢幕邊角直接撞擊硬物時，力量會直接傳到面板，保護貼幫助有限。" },
      { h: "挑選重點", body: "看透光率（95% 以上）、硬度（9H）、是否滿版貼合。太便宜的貼片邊緣容易翹起進灰，反而磨傷螢幕。" },
      { h: "搭配手機殼效果最好", body: "殼的邊框高於螢幕平面時，正面朝下落地不會直接接觸地面，這比保護貼本身更關鍵。" },
    ],
  },
  {
    key: "storage-full",
    title: "手機儲存空間爆滿？先清這 5 個地方",
    intro: "空間不足除了不能拍照，也會讓系統無法正常運作、造成卡頓與 App 閃退。",
    sections: [
      { h: "1. 通訊軟體的媒體快取", body: "LINE、Messenger 累積的圖片影片通常是最大宗，動輒數十 GB。在 App 內的儲存空間設定即可清除。" },
      { h: "2. 已下載的離線影音", body: "串流 App 的離線內容不會自動刪除，看完的影集記得手動移除。" },
      { h: "3. 重複與模糊的照片", body: "連拍產生的相似照片佔用大量空間，相簿內建的「重複項目」功能可以批次處理。" },
      { h: "4. 「最近刪除」相簿", body: "刪掉的照片會保留 30 天才真正釋放空間，急需空間時要進去清空。" },
      { h: "5. 不再使用的 App", body: "長期沒開的 App 連同其資料一起移除，通常能一次釋放數 GB。" },
    ],
  },
  {
    key: "buy-used-phone",
    title: "買二手機怎麼驗機？現場一定要檢查的 6 個項目",
    intro: "二手機價差大，但驗機沒做足很容易買到泡水機或整新機。以下是現場就能完成的檢查。",
    sections: [
      { h: "1. 查 IMEI 與保固狀態", body: "撥 *#06# 取得 IMEI，到原廠官網查詢保固與啟用日期，可判斷是否為宣稱的年份。" },
      { h: "2. 檢查螢幕顯示", body: "開全白與全黑畫面，檢查亮點、暗點、烙印與色塊不均。副廠螢幕在斜視角下色偏會較明顯。" },
      { h: "3. 測試所有相機", body: "前後鏡頭、各倍率都拍一張，注意對焦速度與畫面是否有霧化（可能是進水痕跡）。" },
      { h: "4. 確認電池健康度", body: "iPhone 可在設定內直接查看；Android 可用第三方 App 檢測。低於 85% 要把換電池成本算進去。" },
      { h: "5. 檢查 Face ID / 指紋", body: "當場重新註冊一次，能用才算數。這兩項故障的維修成本偏高。" },
      { h: "6. 確認已登出原帳號", body: "iCloud／Google 帳號未登出的機器無法正常使用，且可能是來源不明的機器。" },
    ],
  },
];

export async function generateCareTipsPost(usedCovers?: Set<string>, offset = 0, usedHashes?: Set<string>) {
  const today = fmtDate();
  const weekIndex = Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
  const topic = CARE_TOPICS[(weekIndex + offset) % CARE_TOPICS.length];
  const slug = `care-${topic.key}-${today}`;
  const existing = await prisma.autoArticle.findUnique({ where: { slug } }).catch(() => null);
  if (existing) return existing;

  const body = `## ${topic.title.replace(/？.*$/, "")}

${topic.intro}

${topic.sections.map(s => `### ${s.h}\n\n${s.body}\n`).join("\n")}

## 需要專業協助？

判斷不出問題可以先用[免費自助診斷](/diagnose)，或直接把狀況與照片傳 LINE 給我們。
維修項目的費用可在[維修報價](/quote)查詢，站上每日自動更新。

- **LINE 預約折 $100**：[加入 ${SITE.lineId}](${SITE.lineAddUrl})
- **來電**：${SITE.phone}
`;

  return prisma.autoArticle.create({
    data: {
      slug, kind: "care_tips",
      title: topic.title,
      excerpt: topic.intro,
      body,
      coverImage: await pickUniqueCover([slug, topic.title], usedCovers, usedHashes),
      metaDescription: `${topic.intro} i時代板橋江子翠 14 年維修經驗整理。`,
      keywords: `${topic.title},手機保養,手機維修知識,板橋手機維修`,
    },
  });
}

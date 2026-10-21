// 自動產生部落格文章
//
// 2026-10-21 改寫：舊版造成 445 篇中約 397 篇重複（回收週報其實每天一篇、
// 故障文章只換機型名、保養題目 5 個輪播）。現在每種文章都「一個主題只寫一次」：
//   - 機型故障文章：每個機型一篇（trouble-<機型 slug>），內文由該機型真實資料組成
//   - 回收行情週報：每週一篇，每週輪流聚焦不同類別；價格與上一份相同就不發
//   - 知識文章：題目由本機排程從網路真實搜尋需求產生、本地 LLM 撰寫（scripts/local-article-writer.ts），不在這裡
//   - 品牌指南：每個品牌一篇（brand-guide-<品牌>）
//   - 每月收錄報告：已停用（每月只差幾個統計數字，對讀者沒有價值）
// 所有寫入都經過 createUniqueArticle：標題或內文指紋重複就拒寫，資料庫唯一索引兜底。
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site-config";
import { pickUniqueCover } from "@/lib/article-cover";
import { createUniqueArticle, type CreateResult } from "@/lib/article-uniqueness";
import { pickModelsWithoutArticle, buildTroubleArticle } from "@/lib/trouble-article";

export type GenResult = CreateResult | { ok: false; reason: string };

function fmtTwd(n: number): string {
  return `NT$ ${n.toLocaleString("zh-TW")}`;
}

// ISO 週次（週一為一週起始），用來決定「每週一篇」
export function isoWeek(d = new Date()): { year: number; week: number; label: string } {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: t.getUTCFullYear(), week, label: `${t.getUTCFullYear()}-w${String(week).padStart(2, "0")}` };
}

// ── 機型故障文章 ─────────────────────────────────────────────────────────
// 依瀏覽量挑還沒寫過的機型；標題撞名就換下一個寫法，內文撞到就換下一個機型
export async function generateModelTroublePost(usedCovers?: Set<string>, usedHashes?: Set<string>): Promise<GenResult> {
  const candidates = await pickModelsWithoutArticle(8);
  if (!candidates.length) return { ok: false, reason: "所有機型都已有文章" };
  const reasons: string[] = [];
  for (const m of candidates) {
    const a = buildTroubleArticle(m);
    const coverImage = await pickUniqueCover(a.coverContext, usedCovers, usedHashes);
    for (const title of a.titleCandidates) {
      const r = await createUniqueArticle({
        slug: a.slug, kind: a.kind, subject: a.subject, title,
        excerpt: a.excerpt, body: a.body, coverImage,
        metaDescription: a.metaDescription, keywords: a.keywords,
      });
      if (r.ok) return r;
      reasons.push(`${m.name}：${r.reason}`);
      if (!r.reason.startsWith("標題重複")) break;          // 只有標題撞才換標題，其他原因換下一個機型
    }
  }
  return { ok: false, reason: reasons.join("；") };
}

// ── 回收行情週報 ─────────────────────────────────────────────────────────
// 每週輪流聚焦一個類別，讓每期內容本質上不同；同類別價格完全沒變就不發
const WEEKLY_FOCUS: Array<{ key: string; label: string; where: Record<string, unknown> }> = [
  { key: "iphone", label: "iPhone", where: { category: "phone", brand: "Apple" } },
  { key: "android", label: "安卓手機", where: { category: "phone", NOT: { brand: "Apple" } } },
  { key: "ipad", label: "iPad", where: { category: "tablet" } },
  { key: "macbook", label: "MacBook", where: { category: { in: ["laptop_pro", "laptop_air"] } } },
  { key: "others", label: "遊戲主機・Dyson・AirPods", where: { category: { in: ["console", "dyson", "earphone"] } } },
];
const STORAGE_REQUIRED = new Set(["phone", "tablet", "laptop_pro", "laptop_air", "desktop"]);

export async function generateWeeklyRecycleDigest(usedCovers?: Set<string>, usedHashes?: Set<string>): Promise<GenResult> {
  const w = isoWeek();
  const slug = `weekly-recycle-${w.label}`;
  if (await prisma.autoArticle.findUnique({ where: { slug }, select: { id: true } })) {
    return { ok: false, reason: "本週已發布" };
  }
  const focus = WEEKLY_FOCUS[w.week % WEEKLY_FOCUS.length];
  const fresh = new Date(Date.now() - 14 * 86400_000);
  const rows = (await prisma.recyclePrice.findMany({
    where: { ...focus.where, isAvailable: true, minPrice: { not: null }, lastUpdatedAt: { gte: fresh } },
    select: { brand: true, modelName: true, storage: true, variant: true, minPrice: true, category: true },
  })).filter(r => !STORAGE_REQUIRED.has(r.category) || r.storage);
  if (rows.length < 5) return { ok: false, reason: `${focus.label} 近期行情不足（${rows.length} 筆）` };

  // 同機型排在一起、新機在前（以機型最高價代表新舊），同機型容量由小到大
  const top = new Map<string, number>();
  for (const r of rows) top.set(`${r.brand}|${r.modelName}`, Math.max(top.get(`${r.brand}|${r.modelName}`) || 0, r.minPrice!));
  const cap = (s: string | null) => {
    const m = s?.match(/(\d+)(GB|TB)/); return m ? Number(m[1]) * (m[2] === "TB" ? 1024 : 1) : 0;
  };
  rows.sort((a, b) =>
    (top.get(`${b.brand}|${b.modelName}`)! - top.get(`${a.brand}|${a.modelName}`)!) ||
    a.modelName.localeCompare(b.modelName) || cap(a.storage) - cap(b.storage));
  const shown = rows.slice(0, 40);
  const highest = shown.reduce((m, r) => (r.minPrice! > m.minPrice! ? r : m), shown[0]);
  const spec = (r: typeof rows[number]) => [r.storage, r.variant].filter(Boolean).join("・") || "—";

  const body = `## ${w.year} 第 ${w.week} 週 ${focus.label} 二手回收行情

本週聚焦 **${focus.label}**，共 ${rows.length} 款有近兩週的最新行情，以下列出 ${shown.length} 款。
價格為機況良好、配件齊全的參考收購價，實際金額依現場檢測核定。

| 機型 | 容量／規格 | 參考收購價 |
|---|---|---:|
${shown.map(r => `| ${r.brand === "Apple" || focus.key === "iphone" ? "" : r.brand + " "}${r.modelName} | ${spec(r)} | ${fmtTwd(r.minPrice!)} |`).join("\n")}

## 讓收購價更高的小技巧

- 保留原廠盒裝、配件與購買證明
- 電池健康度越高，評估越好
- 送來前先登出雲端帳號、關閉「尋找」功能，避免無法完成交易

完整機型與即時價格請見 [二手回收估價](/recycle)，也可以直接 [LINE 傳照片估價](${SITE.lineAddUrl})。
`;
  return createUniqueArticle({
    slug, kind: "weekly_recycle",
    title: `${w.year} 第 ${w.week} 週 ${focus.label} 二手回收行情｜最高 ${fmtTwd(highest.minPrice!)}`,
    excerpt: `${w.year} 第 ${w.week} 週 ${focus.label} 二手回收行情，${rows.length} 款最新參考收購價整理。`,
    body,
    coverImage: await pickUniqueCover([slug, "二手回收", focus.label], usedCovers, usedHashes),
    metaDescription: `${w.year} 第 ${w.week} 週 ${focus.label} 二手回收價格，i時代板橋江子翠每日比對市場行情。`,
    keywords: `${focus.label} 回收價,${focus.label} 二手收購,二手回收行情,板橋二手機回收`,
  });
}

// ── 品牌指南 ─────────────────────────────────────────────────────────────
// 每個品牌只寫一篇；本月已經寫過一篇品牌指南就不再寫
export async function generateBrandGuide(usedCovers?: Set<string>, usedHashes?: Set<string>): Promise<GenResult> {
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  if (await prisma.autoArticle.findFirst({ where: { kind: "brand_guide", publishedAt: { gte: monthStart } }, select: { id: true } })) {
    return { ok: false, reason: "本月已發過品牌指南" };
  }
  const done = new Set((await prisma.autoArticle.findMany({ where: { kind: "brand_guide" }, select: { slug: true } })).map(a => a.slug));
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      // 只列上架中的機型（先前漏了 isActive，Apple 指南會出現已下架的 Watch／AirPods）
      models: {
        where: { isActive: true, prices: { some: { isAvailable: true } } },
        orderBy: { sortOrder: "asc" },
        take: 50,
        include: { prices: { where: { isAvailable: true }, take: 8, include: { item: { select: { name: true } } } } },
      },
    },
  });
  const brand = brands.find(b => !done.has(`brand-guide-${b.slug}`) && b.models.length > 0);
  if (!brand) return { ok: false, reason: "所有品牌都已有指南" };

  const topModels = brand.models.slice(0, 10);
  const itemFreq = new Map<string, number>();
  for (const m of topModels) for (const p of m.prices) itemFreq.set(p.item.name, (itemFreq.get(p.item.name) || 0) + 1);
  const topItems = [...itemFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n]) => n);
  const slug = `brand-guide-${brand.slug}`;

  const body = `## ${brand.name} 全機型維修指南

i時代收錄 **${brand.name} ${brand.models.length} 個機型**的透明維修報價。

## 熱門送修機型

| 機型 | 常見維修項目 |
|---|---|
${topModels.slice(0, 8).map(m => {
  const has = new Set(m.prices.map(p => p.item.name));
  return `| ${m.name} | ${topItems.filter(it => has.has(it)).slice(0, 4).join("、") || "多項目"} |`;
}).join("\n")}

各項目價格會隨零件行情調整，站上每日自動更新，請直接查詢即時報價：
[👉 ${brand.name} 完整維修報價](/quote/${brand.slug})

## ${brand.name} 維修注意事項

- **保固承諾**：標準 3 個月、認證零件 6 個月
- **透明報價**：所有維修費用線上即可查詢，無隱藏費用
- **現場維修**：板橋江子翠實體門市
- **資料保留**：一般維修不影響儲存資料

不確定型號？[免費自助診斷](/diagnose) 先了解可能的問題。
`;
  return createUniqueArticle({
    slug, kind: "brand_guide",
    title: `${brand.name} ${brand.nameZh} 全機型維修指南｜${brand.models.length} 個機型透明報價`,
    excerpt: `i時代收錄 ${brand.name} ${brand.models.length} 個機型，整理熱門送修機型、保固政策與選擇建議，報價可線上即時查詢。`,
    body,
    coverImage: await pickUniqueCover([slug, brand.name, brand.nameZh], usedCovers, usedHashes),
    metaDescription: `${brand.name} ${brand.nameZh} 維修報價：i時代收錄 ${brand.models.length} 個機型，板橋江子翠透明價目。`,
    keywords: `${brand.name} 維修,${brand.nameZh} 維修,${brand.name} 換螢幕,${brand.name} 換電池,板橋 ${brand.name} 維修`,
  });
}

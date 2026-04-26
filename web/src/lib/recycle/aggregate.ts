// 整合三來源資料 → upsert 到 RecyclePrice
// 公式：往 Apple 官方價靠攏，避免被同業哄抬而虧本收
// 寫入前統一透過 normalize-model 正規化（資料源頭統一）
import { prisma } from "@/lib/prisma";
import { scrapeSource1, scrapeSource2, scrapeSource3, type ScrapedRow } from "./sources";
import { normalizeRecycleRow } from "@/lib/normalize-model";

interface AggregatedRow {
  modelKey: string;
  category: string;
  brand: string;
  modelName: string;
  storage?: string;
  variant?: string;
  source1Price?: number;
  source2Price?: number;
  source3Price?: number;
  officialPrice?: number;
  minPrice: number;
}

const ROUND_TO = 100;

// 計算最終對外報價
// 邏輯：
// 1. 有 Apple 官方參考價 → 報 = max(官方 × (1 + officialMargin), 同業最低 × competitorDiscount)
//    取較高，避免比官方還低；但不超過同業最低（不會比同業貴）
// 2. 無官方價 → 報 = 同業最低 × competitorDiscount
function calcFinalPrice(
  competitorPrices: number[],
  officialPrice: number | undefined,
  officialMargin: number,
  competitorDiscount: number,
): number {
  const minComp = competitorPrices.length > 0 ? Math.min(...competitorPrices) : 0;
  let target: number;
  if (officialPrice && officialPrice > 0) {
    const fromOfficial = officialPrice * (1 + officialMargin);
    const fromCompetitor = minComp * competitorDiscount;
    target = Math.max(fromOfficial, fromCompetitor);
    target = Math.min(target, minComp); // 不超過同業最低
  } else {
    target = minComp * competitorDiscount;
  }
  return Math.round(target / ROUND_TO) * ROUND_TO;
}

export async function refreshRecyclePrices() {
  const startedAt = new Date();

  // 取得設定
  const setting = await prisma.siteSetting.findUnique({ where: { id: 1 } }).catch(() => null);
  const officialMargin = setting?.recycleOfficialMargin ?? 0.4;
  const competitorDiscount = setting?.recycleCompetitorDiscount ?? 0.85;

  const [r1, r2, r3] = await Promise.allSettled([
    scrapeSource1(),
    scrapeSource2(),
    scrapeSource3(),
  ]);
  const s1 = r1.status === "fulfilled" ? r1.value : [];
  const s2 = r2.status === "fulfilled" ? r2.value : [];
  const s3 = r3.status === "fulfilled" ? r3.value : [];

  await logScrape("source1", r1.status === "fulfilled" ? "success" : "error", s1.length, startedAt, r1.status === "rejected" ? String(r1.reason) : undefined);
  await logScrape("source2", r2.status === "fulfilled" ? "success" : "error", s2.length, startedAt, r2.status === "rejected" ? String(r2.reason) : undefined);
  await logScrape("source3", r3.status === "fulfilled" ? "success" : "error", s3.length, startedAt, r3.status === "rejected" ? String(r3.reason) : undefined);

  const agg = new Map<string, AggregatedRow>();
  function addRow(r: ScrapedRow, src: "source1" | "source2" | "source3") {
    // ⭐ 入庫前統一正規化（單一來源 of truth）
    const norm = normalizeRecycleRow({
      brand: r.brand,
      modelName: r.modelName,
      storage: r.storage,
      variant: r.variant,
    });
    const stableKey = norm.modelKey;
    const existing = agg.get(stableKey);
    const base: AggregatedRow = existing ?? {
      modelKey: stableKey,
      category: r.category,
      brand: norm.brand,
      modelName: norm.modelName,
      storage: norm.storage || undefined,
      variant: norm.variant || undefined,
      minPrice: 0,
    };
    if (src === "source1") base.source1Price = r.price;
    if (src === "source2") base.source2Price = r.price;
    if (src === "source3") base.source3Price = r.price;
    if (r.officialPrice && (!base.officialPrice || r.officialPrice < base.officialPrice)) {
      base.officialPrice = r.officialPrice;
    }
    const prices = [base.source1Price, base.source2Price, base.source3Price].filter((x): x is number => typeof x === "number");
    base.minPrice = calcFinalPrice(prices, base.officialPrice, officialMargin, competitorDiscount);
    agg.set(stableKey, base);
  }
  s1.forEach(r => addRow(r, "source1"));
  s2.forEach(r => addRow(r, "source2"));
  s3.forEach(r => addRow(r, "source3"));

  let upserts = 0;
  const now = new Date();
  for (const row of agg.values()) {
    await prisma.recyclePrice.upsert({
      where: { modelKey: row.modelKey },
      create: {
        modelKey: row.modelKey,
        category: row.category,
        brand: row.brand,
        modelName: row.modelName,
        storage: row.storage,
        variant: row.variant,
        source1Price: row.source1Price ?? null,
        source1At: row.source1Price ? now : null,
        source2Price: row.source2Price ?? null,
        source2At: row.source2Price ? now : null,
        source3Price: row.source3Price ?? null,
        source3At: row.source3Price ? now : null,
        officialPrice: row.officialPrice ?? null,
        officialAt: row.officialPrice ? now : null,
        minPrice: row.minPrice,
        searchKeywords: `${row.modelName} ${row.storage || ""} ${row.variant || ""}`,
      },
      update: {
        modelName: row.modelName,
        storage: row.storage,
        variant: row.variant,
        ...(row.source1Price ? { source1Price: row.source1Price, source1At: now } : {}),
        ...(row.source2Price ? { source2Price: row.source2Price, source2At: now } : {}),
        ...(row.source3Price ? { source3Price: row.source3Price, source3At: now } : {}),
        ...(row.officialPrice ? { officialPrice: row.officialPrice, officialAt: now } : {}),
        minPrice: row.minPrice,
      },
    });
    upserts++;
  }

  return {
    source1Count: s1.length,
    source2Count: s2.length,
    source3Count: s3.length,
    aggregatedCount: agg.size,
    upsertCount: upserts,
    formula: { officialMargin, competitorDiscount, roundTo: ROUND_TO },
    startedAt,
    finishedAt: new Date(),
  };
}

async function logScrape(source: string, status: string, count: number, startedAt: Date, errorMsg?: string) {
  try {
    await prisma.recycleScrapeLog.create({
      data: {
        source,
        status,
        recordCount: count,
        startedAt,
        errorMsg,
        durationMs: Date.now() - startedAt.getTime(),
      },
    });
  } catch (e) {
    console.error("logScrape failed", e);
  }
}

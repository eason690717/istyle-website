// 整合三來源資料 → upsert 到 RecyclePrice
// 公式：往 Apple 官方價靠攏，避免被同業哄抬而虧本收
// 寫入前統一透過 normalize-model 正規化（資料源頭統一）
import { prisma } from "@/lib/prisma";
import { scrapeSource1, scrapeSource2, scrapeSource3, scrapeUs3cAirPods, type ScrapedRow } from "./sources";
import { normalizeRecycleRow } from "@/lib/normalize-model";
import { notifyOwner } from "@/lib/notify";

// 來源健康度門檻：低於此值視為爬蟲失效（來源改版 / 被擋 / selector 失準）
// 依 2026-09-01 實測基準：source1≈317、source2≈403、source3≈688
const MIN_EXPECTED: Record<string, number> = {
  source1: 100,
  source2: 100,
  source3: 100,
};
// 相對門檻：低於近 7 日成功紀錄平均的此比例也視為異常
const RELATIVE_FLOOR = 0.5;

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
// 公式：(官方 ×2 + 同業最低 ×1) / 3
//   - 同業 ≈ 官方 → 接近兩者中間
//   - 同業 ≫ 官方 → 偏向官方（避免被同業哄抬）
//   - 同業 < 官方 → 介於兩者間
//   - 安全上限：不超過同業最大值
//   - 無官方價 → 同業最低 × discount（預設 0.85）
function calcFinalPrice(
  competitorPrices: number[],
  officialPrice: number | undefined,
  _officialMargin: number,
  competitorDiscount: number,
): number {
  const minComp = competitorPrices.length > 0 ? Math.min(...competitorPrices) : 0;
  const maxComp = competitorPrices.length > 0 ? Math.max(...competitorPrices) : 0;
  let target: number;
  if (officialPrice && officialPrice > 0 && minComp > 0) {
    target = (officialPrice * 2 + minComp) / 3;
    target = Math.min(target, maxComp);
  } else if (officialPrice && officialPrice > 0) {
    target = officialPrice * 1.05;
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

  const [r1, r2, r3, rA] = await Promise.allSettled([
    scrapeSource1(),
    scrapeSource2(),
    scrapeSource3(),
    scrapeUs3cAirPods(),
  ]);
  const s1 = r1.status === "fulfilled" ? r1.value : [];
  // AirPods 來源同 us3c，併入 s2 一起參與 source2Price 計算
  const s2 = [
    ...(r2.status === "fulfilled" ? r2.value : []),
    ...(rA.status === "fulfilled" ? rA.value : []),
  ];
  const s3 = r3.status === "fulfilled" ? r3.value : [];

  // 判定各來源健康度。抓到 0 筆卻回報 success 會讓失效來源長期無聲，
  // 過去 source2 就這樣死了 42 天、source3 從未成功卻沒人發現。
  const health = await Promise.all([
    judgeSource("source1", s1.length, r1.status === "rejected" ? String(r1.reason) : undefined),
    judgeSource("source2", s2.length,
      [r2, rA].filter(r => r.status === "rejected").map(r => String((r as PromiseRejectedResult).reason)).join(" | ") || undefined),
    judgeSource("source3", s3.length, r3.status === "rejected" ? String(r3.reason) : undefined),
  ]);
  for (const h of health) await logScrape(h.source, h.status, h.count, startedAt, h.errorMsg);

  const failed = health.filter(h => h.status !== "success");
  if (failed.length > 0) {
    await notifyOwner(
      `⚠️ 二手回收爬蟲異常\n\n` +
      failed.map(h => `・${h.source}：${h.count} 筆（${h.reason}）`).join("\n") +
      `\n\n正常來源：${health.filter(h => h.status === "success").map(h => `${h.source} ${h.count} 筆`).join("、") || "無"}` +
      `\n\n請檢查來源網站是否改版：/admin/recycle`
    ).catch(e => console.error("[refresh-recycle] notify failed", e));
  }

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
  // 並行批次寫入：逐筆 await 在 Turso（HTTP round-trip ~70ms）上
  // 1,000+ 筆會逼近 300 秒 timeout，寫到一半被砍會留下半更新的資料
  const rows = [...agg.values()];
  const BATCH = 25;
  for (let i = 0; i < rows.length; i += BATCH) {
    const done = await Promise.allSettled(rows.slice(i, i + BATCH).map(row =>
      prisma.recyclePrice.upsert({
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
      }),
    ));
    upserts += done.filter(d => d.status === "fulfilled").length;
    const failures = done.filter(d => d.status === "rejected");
    if (failures.length) {
      console.error(`[refresh-recycle] batch ${i / BATCH} 有 ${failures.length} 筆寫入失敗`,
        String((failures[0] as PromiseRejectedResult).reason).slice(0, 200));
    }
  }

  return {
    // ok=false 代表「有跑，但結果不可信」— 呼叫端（cron route）據此回非 200，
    // 讓 Vercel cron 記錄成失敗而不是靜默成功
    ok: failed.length === 0,
    sources: health.map(h => ({ source: h.source, status: h.status, count: h.count, reason: h.reason })),
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

interface SourceHealth {
  source: string;
  status: "success" | "warning" | "error";
  count: number;
  reason: string;
  errorMsg?: string;
}

// 判定單一來源是否健康：先看有沒有 throw，再看筆數是否掉到門檻以下
async function judgeSource(source: string, count: number, errorMsg?: string): Promise<SourceHealth> {
  if (errorMsg) {
    return { source, status: "error", count, reason: "抓取拋出例外", errorMsg };
  }
  const absoluteMin = MIN_EXPECTED[source] ?? 10;
  if (count < absoluteMin) {
    return {
      source, status: "error", count,
      reason: `僅 ${count} 筆，低於最低門檻 ${absoluteMin}`,
      errorMsg: `count=${count} < absoluteMin=${absoluteMin}`,
    };
  }
  // 相對門檻：跟近 7 日的成功紀錄比，突然腰斬代表來源可能部分改版
  try {
    const since = new Date(Date.now() - 7 * 86400_000);
    const recent = await prisma.recycleScrapeLog.findMany({
      where: { source, status: "success", startedAt: { gte: since } },
      select: { recordCount: true },
    });
    if (recent.length >= 3) {
      const avg = recent.reduce((s, r) => s + r.recordCount, 0) / recent.length;
      if (avg > 0 && count < avg * RELATIVE_FLOOR) {
        return {
          source, status: "warning", count,
          reason: `${count} 筆，低於近 7 日平均 ${Math.round(avg)} 的 ${RELATIVE_FLOOR * 100}%`,
          errorMsg: `count=${count} < avg=${Math.round(avg)} * ${RELATIVE_FLOOR}`,
        };
      }
    }
  } catch (e) {
    console.error(`[judgeSource] ${source} 相對門檻檢查失敗`, e);
  }
  return { source, status: "success", count, reason: "正常" };
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

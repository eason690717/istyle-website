// 換機決策器 API：根據機型 + 故障 + 預算，回傳維修費 / 回收價 / 推薦
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 故障類型 → 對應 RepairItem name pattern + 預設估價（cerphone 沒對到時 fallback）
const ISSUE_MAP: Record<string, { keywords: RegExp; fallback: number }> = {
  screen:   { keywords: /螢幕|外玻璃|顯示|液晶|觸控/, fallback: 4500 },
  battery:  { keywords: /電池/, fallback: 1500 },
  water:    { keywords: /進水|水損/, fallback: 6000 },
  charging: { keywords: /充電孔|充電/, fallback: 1500 },
  camera:   { keywords: /鏡頭/, fallback: 3500 },
  back:     { keywords: /背蓋|背玻璃/, fallback: 3000 },
  none:     { keywords: /^$/, fallback: 0 },
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const modelId = Number(url.searchParams.get("modelId"));
  const issue = url.searchParams.get("issue") || "screen";
  const budget = Number(url.searchParams.get("budget") || "25000");

  if (!modelId) return NextResponse.json({ error: "missing modelId" }, { status: 400 });

  const cfg = ISSUE_MAP[issue] || ISSUE_MAP.screen;

  // 1. 找維修費（從 RepairPrice 抓 STANDARD tier 的最低值）
  let repairEstimate = cfg.fallback;
  if (issue !== "none") {
    const prices = await prisma.repairPrice.findMany({
      where: { modelId, tier: "STANDARD" },
      include: { item: true },
    }).catch(() => []);
    const matching = prices.filter(p => cfg.keywords.test(p.item.name));
    if (matching.length > 0) {
      const valid = matching.map(p => p.cerphonePrice ?? null).filter((n): n is number => !!n);
      if (valid.length > 0) {
        // 取中位數 × 1.15 (i時代售價公式)
        valid.sort((a, b) => a - b);
        const median = valid[Math.floor(valid.length / 2)];
        repairEstimate = Math.ceil((median * 1.15) / 100) * 100;
      }
    }
  }

  // 2. 找回收價（從 RecyclePrice 抓 minPrice or manualOverride）
  const model = await prisma.deviceModel.findUnique({ where: { id: modelId } }).catch(() => null);
  let recycleEstimate: number | null = null;
  if (model) {
    // 試著用 modelName 或 slug 對 RecyclePrice
    const rp = await prisma.recyclePrice.findFirst({
      where: {
        OR: [
          { modelName: { contains: model.name } },
          { modelKey: model.slug },
        ],
      },
    }).catch(() => null);
    if (rp) {
      const base = rp.manualOverride ?? rp.minPrice ?? rp.officialPrice ?? null;
      if (base) {
        // 螢幕破/進水/嚴重損壞 → 回收價打 50%；輕微 → 80%；無損 → 100%
        const factor = ["water", "screen"].includes(issue) ? 0.5 : issue === "none" ? 1.0 : 0.8;
        recycleEstimate = Math.floor((base * factor) / 100) * 100;
      }
    }
  }

  // 3. 計算淨成本
  // 修：直接是 repairEstimate
  // 換：budget - recycleEstimate
  const netCostIfRepair = repairEstimate;
  const netCostIfTradeAndUpgrade = budget - (recycleEstimate ?? 0);

  // 4. 推薦邏輯
  let recommendation: "REPAIR" | "TRADE_UPGRADE" | "NEUTRAL" = "NEUTRAL";
  let reasonText = "";
  if (issue === "none") {
    recommendation = "TRADE_UPGRADE";
    reasonText = `沒壞就賣個好價錢換新比較划算，回收價最高 NT$ ${recycleEstimate?.toLocaleString() || "—"}`;
  } else if (recycleEstimate === null) {
    if (repairEstimate < budget * 0.3) {
      recommendation = "REPAIR";
      reasonText = "您這台型號目前沒收購行情，但維修費佔換新預算不到 30%，修一修最划算";
    } else {
      recommendation = "NEUTRAL";
      reasonText = "您這台型號目前沒收購行情，建議直接 LINE 詢問估價";
    }
  } else if (repairEstimate < recycleEstimate * 0.3) {
    // 修很便宜 < 回收價 30% → 修
    recommendation = "REPAIR";
    reasonText = `修一下只要 NT$ ${repairEstimate.toLocaleString()}，比賣掉這台的損失（${recycleEstimate.toLocaleString()}）小很多，繼續用最划算`;
  } else if (repairEstimate > recycleEstimate * 0.7) {
    // 修很貴 > 回收價 70% → 換
    recommendation = "TRADE_UPGRADE";
    reasonText = `這個維修費 NT$ ${repairEstimate.toLocaleString()} 已經接近回收價 NT$ ${recycleEstimate.toLocaleString()}，不如賣掉換新，淨支出 NT$ ${netCostIfTradeAndUpgrade.toLocaleString()}`;
  } else {
    recommendation = "NEUTRAL";
    reasonText = "兩邊差不多，看您是想省錢還是想換新機，都不會吃虧";
  }

  return NextResponse.json({
    recycleEstimate,
    repairEstimate,
    netCostIfRepair,
    netCostIfTradeAndUpgrade,
    recommendation,
    reasonText,
  });
}

// Cron endpoint：每日自動更新二手回收價
// Vercel Cron 設定在 vercel.json
// 也可手動呼叫：GET /api/cron/refresh-recycle?secret=...
import { NextRequest, NextResponse } from "next/server";
import { refreshRecyclePrices } from "@/lib/recycle/aggregate";

export const maxDuration = 60; // 秒
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // 驗證：來自 Vercel Cron，或帶 secret
  const authHeader = req.headers.get("authorization");
  const secret = req.nextUrl.searchParams.get("secret");
  const expected = process.env.CRON_SECRET;
  const isVercelCron = authHeader === `Bearer ${expected}`;
  const isManualCall = expected && secret === expected;

  if (expected && !isVercelCron && !isManualCall) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshRecyclePrices();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron] refresh-recycle failed:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

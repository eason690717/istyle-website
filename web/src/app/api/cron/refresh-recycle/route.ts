// Cron endpoint：每日自動更新二手回收價
// Vercel Cron 設定在 vercel.json
// 也可手動呼叫：GET /api/cron/refresh-recycle?secret=...
import { NextRequest, NextResponse } from "next/server";
import { refreshRecyclePrices } from "@/lib/recycle/aggregate";
import { checkCronAuth } from "@/lib/cron-auth";

export const maxDuration = 60; // 秒
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = checkCronAuth(req);
  if (!auth.ok) {
    console.error("[cron/refresh-recycle]", auth.reason);
    return NextResponse.json({ error: "unauthorized", reason: auth.reason }, { status: 401 });
  }

  try {
    const result = await refreshRecyclePrices();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron] refresh-recycle failed:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

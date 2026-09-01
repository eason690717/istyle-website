// Cron endpoint：每日自動更新二手回收價
// Vercel Cron 設定在 vercel.json
// 也可手動呼叫：GET /api/cron/refresh-recycle?secret=...
import { NextRequest, NextResponse } from "next/server";
import { refreshRecyclePrices } from "@/lib/recycle/aggregate";
import { checkCronAuth } from "@/lib/cron-auth";

export const maxDuration = 300; // 秒（4 us3c + 4 second3c + 20 jyes + AirPods，需要時間）
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = checkCronAuth(req);
  if (!auth.ok) {
    console.error("[cron/refresh-recycle]", auth.reason);
    return NextResponse.json({ error: "unauthorized", reason: auth.reason }, { status: 401 });
  }

  try {
    const result = await refreshRecyclePrices();
    // 來源失效時回 207：有跑完但結果不完整，別讓失敗被記成成功
    if (!result.ok) {
      console.error("[cron/refresh-recycle] 來源異常:", JSON.stringify(result.sources));
      return NextResponse.json(result, { status: 207 });
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error("[cron] refresh-recycle failed:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

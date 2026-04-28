// 每週自動更新維修報價（cerphone 全品牌）
import { NextRequest, NextResponse } from "next/server";
import { scrapeCerphoneAll } from "@/lib/cerphone/scraper";
import { checkCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // cerphone 10 個品牌頁需時較長

export async function GET(req: NextRequest) {
  const auth = checkCronAuth(req);
  if (!auth.ok) {
    console.error("[cron/refresh-prices]", auth.reason);
    return NextResponse.json({ error: "unauthorized", reason: auth.reason }, { status: 401 });
  }

  try {
    const result = await scrapeCerphoneAll();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

// 每週自動更新維修報價（cerphone 全品牌）
import { NextRequest, NextResponse } from "next/server";
import { scrapeCerphoneAll } from "@/lib/cerphone/scraper";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // cerphone 10 個品牌頁需時較長

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const secret = req.nextUrl.searchParams.get("secret");
  if (expected && auth !== `Bearer ${expected}` && secret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await scrapeCerphoneAll();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

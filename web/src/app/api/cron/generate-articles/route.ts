import { NextRequest, NextResponse } from "next/server";
import {
  generateWeeklyRecycleDigest,
  generateMonthlyRepairReport,
  generateBrandGuide,
  generateModelTroublePost,
} from "@/lib/auto-blog";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const secret = req.nextUrl.searchParams.get("secret");
  if (expected && auth !== `Bearer ${expected}` && secret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const [weekly, monthly, brandGuide, troublePost] = await Promise.all([
      generateWeeklyRecycleDigest(),
      generateMonthlyRepairReport(),
      generateBrandGuide(),
      generateModelTroublePost(),
    ]);
    return NextResponse.json({
      ok: true,
      generated: {
        weekly: weekly?.slug,
        monthly: monthly?.slug,
        brandGuide: brandGuide?.slug,
        troublePost: troublePost?.slug,
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

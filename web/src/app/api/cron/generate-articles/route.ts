import { NextRequest, NextResponse } from "next/server";
import {
  generateWeeklyRecycleDigest,
  generateMonthlyRepairReport,
  generateBrandGuide,
  generateModelTroublePost,
} from "@/lib/auto-blog";
import { checkCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const auth = checkCronAuth(req);
  if (!auth.ok) {
    console.error("[cron/generate-articles]", auth.reason);
    return NextResponse.json({ error: "unauthorized", reason: auth.reason }, { status: 401 });
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

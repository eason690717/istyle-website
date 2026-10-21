import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateModelTroublePost,
  generateWeeklyRecycleDigest,
  generateBrandGuide,
} from "@/lib/auto-blog";
import { loadUsedCovers } from "@/lib/article-cover";
import { checkCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// 老闆的要求是「每週至少 3 篇」—— 先前誤做成每天 3 篇，題目不夠只好一直重複，
// 最後 445 篇裡約 397 篇重複。現在每天最多寫各類型一篇，且一律經過唯一性把關，
// 寧可少寫也不重複。成功與否看「近 7 天新增篇數」，不看單次執行。
const WEEKLY_TARGET = 3;

export async function GET(req: NextRequest) {
  const auth = checkCronAuth(req);
  if (!auth.ok) {
    console.error("[cron/generate-articles]", auth.reason);
    return NextResponse.json({ error: "unauthorized", reason: auth.reason }, { status: 401 });
  }

  try {
    // 封面：全站網址唯一 + 本批次內容 hash 唯一（見 article-cover.ts）
    const usedCovers = await loadUsedCovers();
    const batchHashes = new Set<string>();

    // 循序執行：並行會讓兩篇同時挑到同一張封面、或同時搶同一個機型
    const results: Record<string, unknown> = {};
    results.trouble = await generateModelTroublePost(usedCovers, batchHashes);   // 每天：一個新機型
    results.weekly = await generateWeeklyRecycleDigest(usedCovers, batchHashes); // 每週一篇
    results.brand = await generateBrandGuide(usedCovers, batchHashes);           // 每月一篇，每品牌一次

    const since = new Date(Date.now() - 7 * 86400_000);
    const last7 = await prisma.autoArticle.count({ where: { createdAt: { gte: since } } });
    const ok = last7 >= WEEKLY_TARGET;
    if (!ok) console.error(`[cron/generate-articles] 近 7 天只新增 ${last7} 篇，低於目標 ${WEEKLY_TARGET}`, results);
    return NextResponse.json({ ok, last7Days: last7, target: WEEKLY_TARGET, results }, { status: ok ? 200 : 207 });
  } catch (e) {
    console.error("[cron/generate-articles] failed:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

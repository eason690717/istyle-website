import { NextRequest, NextResponse } from "next/server";
import {
  generateWeeklyRecycleDigest,
  generateMonthlyRepairReport,
  generateBrandGuide,
  generateModelTroublePost,
  generateCareTipsPost,
} from "@/lib/auto-blog";
import { loadUsedCovers } from "@/lib/article-cover";
import { checkCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;   // 取唯一封面要打 Pexels API，比純模板慢

// 每次執行至少要產出這麼多篇「新」文章
const MIN_NEW_ARTICLES = 3;

export async function GET(req: NextRequest) {
  const auth = checkCronAuth(req);
  if (!auth.ok) {
    console.error("[cron/generate-articles]", auth.reason);
    return NextResponse.json({ error: "unauthorized", reason: auth.reason }, { status: 401 });
  }

  try {
    // 全站已用過的封面。整批共用同一個 Set 並逐篇累加，
    // 才能保證「同一次執行產出的文章之間」也不會撞圖。
    // 也因此各生成器必須循序執行 — 並行會讓兩篇同時挑到同一張。
    const usedCovers = await loadUsedCovers();
    const before = usedCovers.size;

    const created: Array<{ kind: string; slug: string }> = [];
    const skipped: string[] = [];

    // 依序嘗試各類型。已存在的（例如當月的月報）會回傳既有文章，不算新增。
    const tasks: Array<{ kind: string; run: () => Promise<{ slug: string } | null> }> = [
      { kind: "weekly_recycle", run: () => generateWeeklyRecycleDigest(usedCovers) },
      { kind: "trouble_article", run: () => generateModelTroublePost(usedCovers, 0) },
      { kind: "care_tips", run: () => generateCareTipsPost(usedCovers, 0) },
      { kind: "brand_guide", run: () => generateBrandGuide(usedCovers) },
      { kind: "monthly_summary", run: () => generateMonthlyRepairReport(usedCovers) },
    ];

    const seenSlugs = new Set<string>();
    for (const t of tasks) {
      try {
        const r = await t.run();
        if (!r) { skipped.push(`${t.kind}(無資料)`); continue; }
        if (seenSlugs.has(r.slug)) { skipped.push(`${t.kind}(重複)`); continue; }
        seenSlugs.add(r.slug);
        created.push({ kind: t.kind, slug: r.slug });
      } catch (e) {
        console.error(`[cron/generate-articles] ${t.kind} 失敗`, e);
        skipped.push(`${t.kind}(錯誤)`);
      }
    }

    // 上面多數類型有「一天/一月一篇」的 slug 限制，回傳的可能是既有文章。
    // 用 usedCovers 的增長量判斷真正新增了幾篇（每建立一篇就會佔用一張新封面）。
    let newCount = usedCovers.size - before;

    // 不足門檻時，補產不同機型的故障解析與不同主題的保養知識
    for (let offset = 1; newCount < MIN_NEW_ARTICLES && offset <= 12; offset++) {
      const filler = offset % 2 === 1
        ? await generateModelTroublePost(usedCovers, offset).catch(() => null)
        : await generateCareTipsPost(usedCovers, offset).catch(() => null);
      if (filler && !seenSlugs.has(filler.slug)) {
        seenSlugs.add(filler.slug);
        created.push({ kind: "filler", slug: filler.slug });
      }
      newCount = usedCovers.size - before;
    }

    const ok = newCount >= MIN_NEW_ARTICLES;
    if (!ok) {
      console.error(`[cron/generate-articles] 只新增 ${newCount} 篇，低於目標 ${MIN_NEW_ARTICLES}`, skipped);
    }
    return NextResponse.json(
      { ok, newCount, target: MIN_NEW_ARTICLES, created, skipped },
      { status: ok ? 200 : 207 },
    );
  } catch (e) {
    console.error("[cron/generate-articles] failed:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

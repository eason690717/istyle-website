// 自動文章「不可重複」的單一把關點
//
// 2026-10-21 稽核：445 篇自動文章中約 397 篇重複 —— 回收週報其實每天一篇、
// 故障文章扣掉機型名後只有 7 種內文（iPhone 17 Pro Max 寫了 42 次）、保養知識 5 個題目輪播。
// 圖片當時已用內容 hash 去重，但內文完全沒把關。
//
// 「重複」的定義（兩者都由資料庫唯一索引兜底，同時執行的 cron 也寫不進去）：
//   1. 標題完全相同
//   2. 內文指紋相同。算指紋前先拿掉：
//        - 日期、週次：只差日期的系列文章就是同一篇
//        - 文章主角名稱（subject，例如機型名）：同一套樣板只換機型名就是同一篇
//        - 空白與標點：排版差異不算不同內容
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export function contentFingerprint(body: string, subject?: string | null): string {
  let s = body;
  if (subject) s = s.split(subject).join("");
  s = s
    .replace(/\d{4}-\d{2}-\d{2}/g, "")
    .replace(/\d{4}-\d{2}/g, "")
    .replace(/\d{4}\s*第\s*\d+\s*週/g, "")
    .replace(/[\s\p{P}\p{S}]/gu, "");
  return createHash("sha1").update(s).digest("hex");
}

export interface ArticleInput {
  slug: string;
  kind: string;
  title: string;
  excerpt: string;
  body: string;
  coverImage?: string | null;
  metaDescription?: string | null;
  keywords?: string | null;
  subject?: string | null;
}

export type CreateResult =
  | { ok: true; slug: string }
  | { ok: false; reason: string };

// 寫入前先查一次（給出清楚的拒絕原因），寫入時再由唯一索引兜底（擋同時執行的競態）
export async function createUniqueArticle(data: ArticleInput): Promise<CreateResult> {
  const contentHash = contentFingerprint(data.body, data.subject);
  const clash = await prisma.autoArticle.findFirst({
    where: { OR: [{ slug: data.slug }, { title: data.title }, { contentHash }] },
    select: { slug: true, title: true, contentHash: true },
  });
  if (clash) {
    const why = clash.slug === data.slug ? "網址已存在"
      : clash.title === data.title ? "標題重複"
      : "內文重複";
    return { ok: false, reason: `${why}（與 ${clash.slug}）` };
  }
  try {
    await prisma.autoArticle.create({ data: { ...data, contentHash } });
    return { ok: true, slug: data.slug };
  } catch (e) {
    if (/Unique constraint|UNIQUE/i.test(String(e))) return { ok: false, reason: "唯一索引擋下（同時執行）" };
    throw e;
  }
}

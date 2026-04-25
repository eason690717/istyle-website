import Link from "next/link";
import Image from "next/image";
import { BLOG_POSTS, CATEGORY_LABEL, getCoverImage } from "@/lib/blog-posts";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "部落格 — 手機維修知識、保養技巧、回收行情",
  description: `${SITE.name}部落格：iPhone / iPad / MacBook / Android 維修知識、電池保養、2026 回收行情、板橋維修推薦。`,
};

export const dynamic = "force-dynamic";

export default async function BlogIndexPage() {
  // 自動產生的文章（最新優先）
  const auto = await prisma.autoArticle.findMany({
    orderBy: { publishedAt: "desc" },
    take: 12,
  }).catch(() => []);

  // 真實照片：用文章 coverImage（已透過 keyword 配對）
  const autoCards = auto.map(a => ({
    slug: a.slug,
    href: `/blog/auto/${a.slug}`,
    title: a.title,
    excerpt: a.excerpt,
    cover: a.coverImage || "/cases/tech-shop.jpg",
    badge: a.kind === "weekly_recycle" ? "週報" : a.kind === "monthly_summary" ? "月報" : "自動",
    date: a.publishedAt.toISOString().slice(0, 10),
  }));
  const manualCards = BLOG_POSTS.map(p => ({
    slug: p.slug,
    href: `/blog/${p.slug}`,
    title: p.title,
    excerpt: p.excerpt,
    cover: getCoverImage(p),
    badge: CATEGORY_LABEL[p.category],
    date: p.publishedAt,
  }));

  // 自動文章排前面（讓 cron 產的內容最新可見）
  const all = [...autoCards, ...manualCards];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="text-center">
        <h1 className="font-serif text-3xl text-[var(--gold)] md:text-4xl">
          <span className="gold-underline">維修知識庫</span>
        </h1>
        <p className="mt-4 text-sm text-[var(--fg-muted)]">
          手機維修、保養、回收行情．14 年職人經驗整理
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {all.map(c => (
          <Link
            key={c.slug}
            href={c.href}
            className="group overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] transition hover:border-[var(--gold)]"
          >
            <div className="relative aspect-[16/9] bg-[var(--bg-soft)]">
              <Image src={c.cover} alt={c.title} fill className="object-cover" sizes="400px" />
              <span className="absolute left-3 top-3 rounded bg-black/70 px-2 py-0.5 text-[10px] text-[var(--gold)]">
                {c.badge}
              </span>
            </div>
            <div className="p-5">
              <h2 className="font-serif text-lg text-[var(--gold)] group-hover:text-[var(--gold-bright)]">
                {c.title}
              </h2>
              <p className="mt-2 text-xs text-[var(--fg-muted)] line-clamp-3 leading-relaxed">
                {c.excerpt}
              </p>
              <div className="mt-3 text-[10px] text-[var(--fg-muted)]">
                {c.date}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

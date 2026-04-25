// 自動產生的文章（每週/每月）
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site-config";
import type { Metadata } from "next";

type Params = { slug: string };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const a = await prisma.autoArticle.findUnique({ where: { slug } }).catch(() => null);
  if (!a) return { title: "找不到文章" };
  return {
    title: a.title,
    description: a.metaDescription || a.excerpt,
    keywords: a.keywords?.split(",") || [],
    openGraph: {
      type: "article",
      title: a.title,
      description: a.metaDescription || a.excerpt,
      publishedTime: a.publishedAt.toISOString(),
      images: [{ url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/og/article/${a.slug}`, width: 1200, height: 630 }],
    },
  };
}

// 簡易 Markdown 渲染（重用 blog/[slug] 的邏輯）
function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--gold)]">$1</strong>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-[var(--gold)] underline hover:text-[var(--gold-bright)]">$1</a>')
    .replace(/`(.+?)`/g, '<code class="rounded bg-[var(--bg-soft)] px-1 py-0.5 font-mono text-xs">$1</code>');
}

function renderBody(md: string) {
  const lines = md.split("\n");
  const out: React.ReactElement[] = [];
  let listBuf: string[] = [];
  let tableBuf: string[] = [];
  const flushList = () => {
    if (listBuf.length > 0) {
      out.push(<ul key={`ul-${out.length}`} className="my-4 space-y-2 pl-5">
        {listBuf.map((t, i) => <li key={i} className="text-[var(--fg)]" dangerouslySetInnerHTML={{ __html: formatInline(t) }} />)}
      </ul>);
      listBuf = [];
    }
  };
  const flushTable = () => {
    if (tableBuf.length >= 2) {
      const rows = tableBuf.map(r => r.split("|").map(c => c.trim()).filter(Boolean));
      const [header, _div, ...body] = rows;
      out.push(
        <div key={`tbl-${out.length}`} className="my-5 overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="min-w-full text-sm">
            <thead className="bg-[#1f1810] text-left text-[var(--gold)]">
              <tr>{header.map((h, i) => <th key={i} className="px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {body.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-[#141414]" : "bg-[#181818]"}>
                  {row.map((c, ci) => <td key={ci} className="px-3 py-2 text-[var(--fg)]" dangerouslySetInnerHTML={{ __html: formatInline(c) }} />)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    tableBuf = [];
  };

  for (const line of lines) {
    if (/^\|/.test(line.trim())) { flushList(); tableBuf.push(line); continue; }
    else if (tableBuf.length > 0) flushTable();

    if (/^## /.test(line)) { flushList(); out.push(<h2 key={out.length} className="mt-10 mb-4 font-serif text-2xl text-[var(--gold)]">{line.slice(3)}</h2>); }
    else if (/^### /.test(line)) { flushList(); out.push(<h3 key={out.length} className="mt-6 mb-3 font-serif text-lg text-[var(--gold-soft)]">{line.slice(4)}</h3>); }
    else if (/^- /.test(line)) listBuf.push(line.slice(2));
    else if (/^\d+\.\s/.test(line)) listBuf.push(line.replace(/^\d+\.\s/, ""));
    else if (line.trim() === "") flushList();
    else { flushList(); out.push(<p key={out.length} className="my-4 leading-relaxed text-[var(--fg)]" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />); }
  }
  flushList();
  flushTable();
  return out;
}

export default async function AutoArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const article = await prisma.autoArticle.findUnique({ where: { slug } }).catch(() => null);
  if (!article) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article.title,
            description: article.metaDescription || article.excerpt,
            datePublished: article.publishedAt.toISOString(),
            author: { "@type": "Organization", name: SITE.name },
            publisher: { "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: `${SITE.url}/logo.png` } },
          }),
        }}
      />

      <article className="mx-auto max-w-3xl px-4 py-12">
        <nav className="mb-6 text-xs text-[var(--fg-muted)]">
          <Link href="/" className="hover:text-[var(--gold)]">首頁</Link>
          {" / "}
          <Link href="/blog" className="hover:text-[var(--gold)]">部落格</Link>
          {" / "}
          <span className="text-[var(--fg)]">{article.title}</span>
        </nav>

        <div className="mb-3 flex items-center gap-3 text-xs">
          <span className="rounded bg-[var(--gold)]/15 px-2 py-0.5 text-[var(--gold)]">
            {article.kind === "weekly_recycle" ? "週報" : article.kind === "monthly_summary" ? "月報" : "自動"}
          </span>
          <span className="text-[var(--fg-muted)]">{article.publishedAt.toISOString().slice(0, 10)}</span>
          <span className="text-[var(--gold-soft)]">．系統自動產生</span>
        </div>

        <h1 className="font-serif text-3xl leading-tight text-[var(--gold)] md:text-4xl">{article.title}</h1>

        {/* 動態 OG 圖：標題 + 主題 emoji + 品牌風格，圖文一致 */}
        <div className="relative my-8 aspect-[16/9] overflow-hidden rounded-lg border border-[var(--border)]">
          <Image src={`/og/article/${article.slug}`} alt={article.title} fill className="object-cover" sizes="800px" priority unoptimized />
        </div>

        <div className="prose prose-invert">{renderBody(article.body)}</div>

        <div className="mt-10 rounded-xl border border-[var(--gold)] bg-[var(--bg-elevated)] p-6 text-center">
          <p className="font-serif text-xl text-[var(--gold)]">查看更多即時行情</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/recycle" className="btn-gold rounded-full px-6 py-3 text-sm">二手回收估價</Link>
            <Link href="/quote" className="btn-gold-outline rounded-full px-6 py-3 text-sm">維修報價</Link>
            <a href={SITE.lineAddUrl} className="btn-gold-outline rounded-full px-6 py-3 text-sm">LINE 詢問</a>
          </div>
        </div>
      </article>
    </>
  );
}

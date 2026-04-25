import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BLOG_POSTS, getBlogPost, CATEGORY_LABEL } from "@/lib/blog-posts";
import { SITE } from "@/lib/site-config";
import type { Metadata } from "next";

type Params = { slug: string };

export function generateStaticParams() {
  return BLOG_POSTS.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getBlogPost(slug);
  if (!p) return { title: "找不到文章" };
  return {
    title: p.title,
    description: p.metaDescription,
    keywords: p.keywords,
    openGraph: {
      type: "article",
      title: p.title,
      description: p.metaDescription,
      publishedTime: p.publishedAt,
      authors: [p.author],
      images: [{ url: p.coverImage, width: 1200, height: 630 }],
    },
  };
}

// 簡易 Markdown 渲染（標題、列表、段落、表格）
function renderBody(md: string) {
  const lines = md.split("\n");
  const out: React.ReactElement[] = [];
  let listBuf: string[] = [];
  let tableBuf: string[] = [];
  const flushList = () => {
    if (listBuf.length > 0) {
      out.push(
        <ul key={`ul-${out.length}`} className="my-4 space-y-2 pl-5">
          {listBuf.map((t, i) => (
            <li key={i} className="text-[var(--fg)]" dangerouslySetInnerHTML={{ __html: formatInline(t) }} />
          ))}
        </ul>
      );
      listBuf = [];
    }
  };
  const flushTable = () => {
    if (tableBuf.length >= 2) {
      const rows = tableBuf.map(r => r.split("|").map(c => c.trim()).filter(Boolean));
      const [header, divider, ...body] = rows;
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
      tableBuf = [];
    } else {
      tableBuf = [];
    }
  };

  for (const raw of lines) {
    const line = raw;
    if (/^\|/.test(line.trim())) { flushList(); tableBuf.push(line); continue; }
    else if (tableBuf.length > 0) flushTable();

    if (/^## /.test(line)) {
      flushList();
      out.push(<h2 key={out.length} className="mt-10 mb-4 font-serif text-2xl text-[var(--gold)]">{line.slice(3)}</h2>);
    } else if (/^### /.test(line)) {
      flushList();
      out.push(<h3 key={out.length} className="mt-6 mb-3 font-serif text-lg text-[var(--gold-soft)]">{line.slice(4)}</h3>);
    } else if (/^- /.test(line)) {
      listBuf.push(line.slice(2));
    } else if (/^\d+\.\s/.test(line)) {
      listBuf.push(line.replace(/^\d+\.\s/, ""));
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      out.push(<p key={out.length} className="my-4 leading-relaxed text-[var(--fg)]" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />);
    }
  }
  flushList();
  flushTable();
  return out;
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--gold)]">$1</strong>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-[var(--gold)] underline hover:text-[var(--gold-bright)]">$1</a>')
    .replace(/`(.+?)`/g, '<code class="rounded bg-[var(--bg-soft)] px-1 py-0.5 font-mono text-xs">$1</code>')
    .replace(/❌/g, '<span style="color:#f87171">❌</span>')
    .replace(/★/g, '<span style="color:var(--gold)">★</span>');
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const related = (post.relatedSlugs || []).map(s => getBlogPost(s)).filter(Boolean);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.metaDescription,
      image: post.coverImage.startsWith("http") ? post.coverImage : `${SITE.url}${post.coverImage}`,
      datePublished: post.publishedAt,
      author: { "@type": "Organization", name: post.author },
      publisher: {
        "@type": "Organization",
        name: SITE.name,
        logo: { "@type": "ImageObject", url: `${SITE.url}/logo.png` },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE.url}/blog/${post.slug}` },
    },
    ...(post.faqs && post.faqs.length > 0 ? [{
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: post.faqs.map(f => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    }] : []),
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "首頁", item: SITE.url },
        { "@type": "ListItem", position: 2, name: "部落格", item: `${SITE.url}/blog` },
        { "@type": "ListItem", position: 3, name: post.title, item: `${SITE.url}/blog/${post.slug}` },
      ],
    },
  ];

  return (
    <>
      {jsonLd.map((data, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
      ))}

      <article className="mx-auto max-w-3xl px-4 py-12">
        <nav className="mb-6 text-xs text-[var(--fg-muted)]">
          <Link href="/" className="hover:text-[var(--gold)]">首頁</Link>
          {" / "}
          <Link href="/blog" className="hover:text-[var(--gold)]">部落格</Link>
          {" / "}
          <span className="text-[var(--fg)]">{post.title}</span>
        </nav>

        <div className="mb-4 flex items-center gap-3 text-xs">
          <span className="rounded bg-[var(--gold)]/15 px-2 py-0.5 text-[var(--gold)]">{CATEGORY_LABEL[post.category]}</span>
          <span className="text-[var(--fg-muted)]">{post.publishedAt}．{post.readingMinutes} 分鐘閱讀</span>
        </div>

        <h1 className="font-serif text-3xl leading-tight text-[var(--gold)] md:text-4xl">{post.title}</h1>

        <div className="relative my-8 aspect-[16/9] overflow-hidden rounded-lg border border-[var(--border)]">
          <Image src={post.coverImage} alt={post.title} fill className="object-cover" sizes="800px" priority />
        </div>

        <div className="prose prose-invert">
          {renderBody(post.body)}
        </div>

        {post.faqs && post.faqs.length > 0 && (
          <>
            <h2 className="mt-10 font-serif text-2xl text-[var(--gold)]">常見問題</h2>
            <div className="mt-4 divide-y divide-[var(--border)]">
              {post.faqs.map(f => (
                <details key={f.q} className="group py-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-center justify-between text-left">
                    <span className="font-medium text-[var(--fg)]">{f.q}</span>
                    <span className="ml-4 text-[var(--gold)] transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm text-[var(--fg-muted)] leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </>
        )}

        {/* CTA */}
        <div className="mt-10 rounded-xl border border-[var(--gold)] bg-[var(--bg-elevated)] p-6 text-center">
          <p className="font-serif text-xl text-[var(--gold)]">需要維修或估價？</p>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">板橋江子翠實體門市．現場 30 分鐘完工．14 年技術經驗</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/booking" className="btn-gold rounded-full px-6 py-3 text-sm">線上預約</Link>
            <Link href="/quote" className="btn-gold-outline rounded-full px-6 py-3 text-sm">查詢報價</Link>
            <a href={SITE.lineAddUrl} className="btn-gold-outline rounded-full px-6 py-3 text-sm">LINE 詢問</a>
          </div>
        </div>

        {/* 相關文章 */}
        {related.length > 0 && (
          <>
            <h2 className="mt-12 font-serif text-2xl text-[var(--gold)]">延伸閱讀</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {related.map(r => r && (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4 transition hover:border-[var(--gold)]"
                >
                  <div className="font-serif text-base text-[var(--gold)]">{r.title}</div>
                  <p className="mt-1 text-xs text-[var(--fg-muted)] line-clamp-2">{r.excerpt}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </article>
    </>
  );
}

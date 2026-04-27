import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SITE } from "@/lib/site-config";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await prisma.caseStudy.findUnique({ where: { slug } }).catch(() => null);
  if (!c) return { title: "找不到案例" };
  return {
    title: c.title,
    description: `${c.brand} ${c.deviceModel} ${c.issueType} - 板橋 i時代維修真實案例．${c.repairMinutes ? `${c.repairMinutes} 分鐘完工` : ""}`,
    alternates: { canonical: `${SITE.url}/cases/${c.slug}` },
    openGraph: {
      title: c.title,
      description: `${c.brand} ${c.deviceModel} ${c.issueType} 維修案例`,
      images: (() => {
        const after = JSON.parse(c.afterPhotos || "[]") as string[];
        const before = JSON.parse(c.beforePhotos || "[]") as string[];
        return [{ url: after[0] || before[0] || `${SITE.url}/logo.png` }];
      })(),
    },
  };
}

export default async function CaseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await prisma.caseStudy.findUnique({ where: { slug } }).catch(() => null);
  if (!c || !c.isPublished) return notFound();

  const before = JSON.parse(c.beforePhotos || "[]") as string[];
  const after = JSON.parse(c.afterPhotos || "[]") as string[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: c.title,
    image: [...after, ...before].slice(0, 3),
    datePublished: c.publishedAt,
    author: { "@type": "Organization", name: SITE.name },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      logo: { "@type": "ImageObject", url: `${SITE.url}/logo.png` },
    },
    mainEntityOfPage: `${SITE.url}/cases/${c.slug}`,
  };

  // 推薦其他案例（同 brand，最多 4 筆）
  const related = await prisma.caseStudy.findMany({
    where: { brand: c.brand, isPublished: true, id: { not: c.id } },
    orderBy: { publishedAt: "desc" },
    take: 4,
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="mx-auto max-w-3xl px-4 py-8">
        <nav className="text-xs text-[var(--fg-muted)]">
          <Link href="/cases" className="hover:text-[var(--gold)]">案例集</Link>
          <span className="mx-2">›</span>
          <span className="text-[var(--gold)]">{c.brand}</span>
        </nav>

        <h1 className="mt-3 font-serif text-3xl text-[var(--gold)]">{c.title}</h1>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded bg-[var(--gold)]/10 px-3 py-1 text-[var(--gold-bright)]">{c.brand}</span>
          <span className="rounded bg-[var(--border)] px-3 py-1 text-[var(--fg-muted)]">{c.deviceModel}</span>
          <span className="rounded bg-[var(--border)] px-3 py-1 text-[var(--fg-muted)]">{c.issueType}</span>
        </div>

        {/* 修前 / 修後 對比 */}
        {(before.length > 0 || after.length > 0) && (
          <section className="mt-6 grid gap-4 md:grid-cols-2">
            {before.length > 0 && (
              <div>
                <div className="mb-2 text-sm font-medium text-red-400">📷 修前</div>
                <div className="grid gap-2">
                  {before.map((url, i) => (
                    <img key={i} src={url} alt={`修前 ${i + 1}`} className="w-full rounded-lg border border-[var(--border)]" />
                  ))}
                </div>
              </div>
            )}
            {after.length > 0 && (
              <div>
                <div className="mb-2 text-sm font-medium text-green-400">✅ 修後</div>
                <div className="grid gap-2">
                  {after.map((url, i) => (
                    <img key={i} src={url} alt={`修後 ${i + 1}`} className="w-full rounded-lg border border-[var(--gold)]/40" />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* 數據 */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {c.repairMinutes && <Stat label="維修耗時" value={`${c.repairMinutes} 分鐘`} />}
          {c.cost != null && <Stat label="實際費用" value={`NT$ ${c.cost.toLocaleString()}`} />}
          {c.customerInitial && <Stat label="客戶" value={c.customerInitial} />}
        </div>

        {/* 內文 */}
        <section className="prose prose-invert mt-8 max-w-none text-sm leading-relaxed text-[var(--fg)]">
          {c.description.split("\n").map((p, i) =>
            p.trim() ? <p key={i} className="mb-3">{p}</p> : null
          )}
        </section>

        {/* CTA */}
        <section className="mt-10 rounded-2xl border-2 border-[var(--gold)]/40 bg-[var(--bg-elevated)] p-6 text-center">
          <p className="text-sm text-[var(--fg)]">您的{c.brand} 也有類似問題嗎？</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Link href="/quote" className="btn-gold rounded-full px-5 py-2.5 text-sm">查維修報價</Link>
            <a href={SITE.lineAddUrl} className="rounded-full border border-[var(--gold)]/40 px-5 py-2.5 text-sm text-[var(--gold)]">LINE 預約折 $100</a>
          </div>
        </section>

        {/* 相關案例 */}
        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="font-serif text-lg text-[var(--gold)]">其他 {c.brand} 案例</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {related.map(r => {
                const ra = JSON.parse(r.afterPhotos || "[]") as string[];
                return (
                  <Link key={r.id} href={`/cases/${r.slug}`} className="flex gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3 hover:border-[var(--gold)]">
                    {ra[0] && <img src={ra[0]} alt="" className="h-16 w-16 shrink-0 rounded object-cover" />}
                    <div className="min-w-0">
                      <p className="truncate text-sm">{r.title}</p>
                      <p className="text-xs text-[var(--fg-muted)]">{r.deviceModel}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </article>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-center">
      <div className="font-serif text-lg text-[var(--gold)]">{value}</div>
      <div className="mt-1 text-[10px] text-[var(--fg-muted)]">{label}</div>
    </div>
  );
}

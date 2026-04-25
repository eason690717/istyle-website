import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE } from "@/lib/site-config";
import { SERVICES, getService } from "@/lib/services-catalog";
import { getCasesByService } from "@/lib/case-studies";
import { CaseCard } from "@/components/case-card";
import type { Metadata } from "next";

type Params = { slug: string };

export function generateStaticParams() {
  return SERVICES.map(s => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const s = getService(slug);
  if (!s) return { title: "找不到服務" };
  return {
    title: s.title,
    description: s.description,
    keywords: s.keywords,
    openGraph: {
      title: s.title,
      description: s.description,
      images: [{ url: SITE.ogImage, width: 1200, height: 630 }],
    },
  };
}

export default async function ServicePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const s = getService(slug);
  if (!s) notFound();

  // Schema.org Service + FAQPage
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      serviceType: s.shortTitle,
      provider: {
        "@type": "LocalBusiness",
        name: SITE.name,
        url: SITE.url,
        telephone: SITE.phone,
        address: {
          "@type": "PostalAddress",
          addressCountry: "TW",
          addressRegion: SITE.address.city,
          addressLocality: SITE.address.district,
          streetAddress: SITE.address.street,
        },
      },
      areaServed: { "@type": "City", name: "新北市板橋區" },
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "TWD",
        lowPrice: s.priceRange.min,
        highPrice: s.priceRange.max,
        priceSpecification: {
          "@type": "PriceSpecification",
          priceCurrency: "TWD",
          minPrice: s.priceRange.min,
          maxPrice: s.priceRange.max,
        },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: s.faqs.map(f => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "首頁", item: SITE.url },
        { "@type": "ListItem", position: 2, name: "服務項目", item: `${SITE.url}/services` },
        { "@type": "ListItem", position: 3, name: s.shortTitle, item: `${SITE.url}/services/${s.slug}` },
      ],
    },
  ];

  const related = (s.relatedSlugs || []).map(slug => SERVICES.find(x => x.slug === slug)).filter(Boolean);
  const cases = getCasesByService(s.slug);

  return (
    <>
      {jsonLd.map((data, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
      ))}

      <article className="mx-auto max-w-3xl px-4 py-12">
        <nav className="mb-6 text-xs text-[var(--fg-muted)]">
          <Link href="/" className="hover:text-[var(--gold)]">首頁</Link>
          {" / "}
          <Link href="/services" className="hover:text-[var(--gold)]">服務項目</Link>
          {" / "}
          <span className="text-[var(--fg)]">{s.shortTitle}</span>
        </nav>

        <h1 className="font-serif text-3xl text-[var(--gold)] md:text-4xl">{s.title}</h1>
        <p className="mt-6 text-base leading-relaxed text-[var(--fg)]">{s.intro}</p>

        {/* 摘要區 */}
        <div className="mt-8 grid gap-3 rounded-lg border border-[var(--gold)] bg-[var(--bg-elevated)] p-5 sm:grid-cols-3">
          <Stat label="價格範圍" value={`NT$${s.priceRange.min.toLocaleString()}–${s.priceRange.max.toLocaleString()}`} />
          <Stat label="維修時間" value={s.estimatedTime} />
          <Stat label="保固期" value={s.warranty} />
        </div>

        {/* CTA Top */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/booking" className="btn-gold rounded-full px-6 py-3 text-sm">線上預約</Link>
          <a href={`tel:${SITE.phoneRaw}`} className="btn-gold-outline rounded-full px-6 py-3 text-sm">來電 {SITE.phone}</a>
          <a href={SITE.lineAddUrl} className="btn-gold-outline rounded-full px-6 py-3 text-sm">LINE 詢問</a>
        </div>

        {/* 服務項目 */}
        <h2 className="mt-12 font-serif text-2xl text-[var(--gold)]">維修內容</h2>
        <ul className="mt-4 space-y-2">
          {s.whatWeReplace.map(w => (
            <li key={w} className="flex items-start gap-2 text-[var(--fg)]">
              <span className="mt-1 text-[var(--gold)]">●</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>

        {/* 為什麼選 i時代 */}
        <h2 className="mt-12 font-serif text-2xl text-[var(--gold)]">為什麼選 i時代</h2>
        <ul className="mt-4 space-y-2">
          {s.whyChooseUs.map(w => (
            <li key={w} className="flex items-start gap-2 text-[var(--fg)]">
              <span className="mt-1 text-[var(--gold)]">✓</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>

        {/* 維修案例 */}
        {cases.length > 0 && (
          <>
            <h2 className="mt-12 font-serif text-2xl text-[var(--gold)]">維修案例</h2>
            <p className="mt-2 text-sm text-[var(--fg-muted)]">真實客戶維修記錄</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {cases.map(c => <CaseCard key={c.slug} c={c} />)}
            </div>
          </>
        )}

        {/* FAQ */}
        <h2 className="mt-12 font-serif text-2xl text-[var(--gold)]">常見問題</h2>
        <div className="mt-4 divide-y divide-[var(--border)]">
          {s.faqs.map(f => (
            <details key={f.q} className="group py-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between text-left">
                <span className="font-medium text-[var(--fg)]">{f.q}</span>
                <span className="ml-4 text-[var(--gold)] transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-[var(--fg-muted)] leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>

        {/* 相關服務 */}
        {related.length > 0 && (
          <>
            <h2 className="mt-12 font-serif text-2xl text-[var(--gold)]">相關服務</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {related.map(r => (
                <Link
                  key={r!.slug}
                  href={`/services/${r!.slug}`}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4 transition hover:border-[var(--gold)]"
                >
                  <div className="font-serif text-lg text-[var(--gold)]">{r!.shortTitle}</div>
                  <p className="mt-1 text-xs text-[var(--fg-muted)]">{r!.intro.slice(0, 80)}…</p>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* CTA Bottom */}
        <div className="mt-12 rounded-xl border border-[var(--gold)] bg-[var(--bg-elevated)] p-6 text-center">
          <p className="font-serif text-xl text-[var(--gold)]">準備預約？</p>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">14 年職人技術．當日完工．保固 3 個月</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/booking" className="btn-gold rounded-full px-6 py-3 text-sm">線上預約</Link>
            <a href={`tel:${SITE.phoneRaw}`} className="btn-gold-outline rounded-full px-6 py-3 text-sm">來電預約</a>
          </div>
        </div>
      </article>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-[var(--fg-muted)]">{label}</div>
      <div className="mt-1 font-serif text-base text-[var(--gold)]">{value}</div>
    </div>
  );
}

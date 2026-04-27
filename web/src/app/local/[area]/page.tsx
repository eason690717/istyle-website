import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { LOCAL_AREAS, getAreaBySlug } from "@/lib/local-areas";
import { SITE } from "@/lib/site-config";
import type { Metadata } from "next";

// 預先 SSG 所有地區頁
export function generateStaticParams() {
  return LOCAL_AREAS.map(a => ({ area: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ area: string }> }): Promise<Metadata> {
  const { area } = await params;
  const a = getAreaBySlug(area);
  if (!a) return { title: "找不到頁面" };
  const title = `${a.zhName}手機維修推薦 — i時代 ${a.distanceMin === 0 ? "在地門市" : `離 ${a.zhName} ${a.distanceMin} 分鐘`}`;
  return {
    title,
    description: a.description,
    keywords: [
      `${a.zhName}手機維修`,
      `${a.zhName}iPhone維修`,
      `${a.zhName}換螢幕`,
      `${a.zhName}換電池`,
      `${a.fullName}手機維修`,
      "板橋手機維修",
    ],
    alternates: { canonical: `${SITE.url}/local/${a.slug}` },
    openGraph: {
      title,
      description: a.description,
      url: `${SITE.url}/local/${a.slug}`,
      type: "website",
    },
  };
}

export default async function LocalAreaPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  const a = getAreaBySlug(area);
  if (!a) return notFound();

  // LocalBusiness JSON-LD with serviceArea
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: SITE.name,
    description: a.description,
    url: `${SITE.url}/local/${a.slug}`,
    telephone: SITE.phone,
    image: `${SITE.url}/logo.png`,
    address: {
      "@type": "PostalAddress",
      addressCountry: "TW",
      addressRegion: SITE.address.city,
      addressLocality: SITE.address.district,
      streetAddress: SITE.address.street,
    },
    areaServed: { "@type": "City", name: a.fullName },
  };

  const otherAreas = LOCAL_AREAS.filter(x => x.slug !== a.slug);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Hero */}
        <div className="rounded-2xl border border-[var(--gold)]/30 bg-gradient-to-br from-[var(--bg-elevated)] to-black p-6 md:p-10">
          <div className="text-xs text-[var(--fg-muted)]">
            <Link href="/" className="hover:text-[var(--gold)]">首頁</Link>
            <span className="mx-2">›</span>
            <span>地區服務</span>
            <span className="mx-2">›</span>
            <span className="text-[var(--gold)]">{a.zhName}</span>
          </div>

          <h1 className="mt-3 font-serif text-3xl text-[var(--gold)] md:text-4xl">
            {a.zhName}手機維修推薦 — i時代
          </h1>
          <p className="mt-2 text-sm text-[var(--fg-muted)] md:text-base">
            {a.fullName}居民／上班族最近的專業手機維修．{a.distanceMin === 0 ? "我們就開在這裡" : `從 ${a.zhName} 過來只要 ${a.distanceMin} 分鐘`}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <Stat label="技術經驗" value={`${SITE.experienceYears()} 年`} />
            <Stat label="累計修機" value={SITE.repairsCount} />
            <Stat label="距離 {a.zhName}" value={a.distanceMin === 0 ? "0 分鐘" : `${a.distanceMin} 分鐘`} />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a href={SITE.lineAddUrl} className="btn-gold rounded-full px-5 py-2.5 text-sm">
              💬 LINE 預約折 $100
            </a>
            <a href={`tel:${SITE.phoneRaw}`} className="rounded-full border border-[var(--gold)]/40 px-5 py-2.5 text-sm text-[var(--gold)]">
              📞 {SITE.phone}
            </a>
            <Link href="/quote" className="rounded-full border border-[var(--border)] px-5 py-2.5 text-sm text-[var(--fg)] hover:border-[var(--gold)]">
              📋 立即查維修報價
            </Link>
          </div>
        </div>

        {/* 在地特色 */}
        <section className="mt-8">
          <h2 className="font-serif text-2xl text-[var(--gold)]">為什麼 {a.zhName} 居民選 i時代</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {a.highlights.map((h, i) => (
              <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
                <div className="text-2xl">✓</div>
                <p className="mt-2 text-sm text-[var(--fg)]">{h}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 熱門維修項目 */}
        <section className="mt-8">
          <h2 className="font-serif text-2xl text-[var(--gold)]">{a.zhName}人氣維修項目</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {a.popularServices.map(s => (
              <Link
                key={s}
                href="/quote"
                className="rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-4 py-2 text-sm text-[var(--gold-bright)] hover:bg-[var(--gold)]/20"
              >
                {s}
              </Link>
            ))}
          </div>
        </section>

        {/* 鄰近地標 */}
        <section className="mt-8">
          <h2 className="font-serif text-2xl text-[var(--gold)]">鄰近地標／商圈</h2>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">
            從以下地點過來都很方便，歡迎下班順路來：
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {a.landmarks.map(l => (
              <span key={l} className="rounded-full bg-[var(--bg-elevated)] px-3 py-1.5 text-xs text-[var(--fg-muted)]">
                📍 {l}
              </span>
            ))}
          </div>
        </section>

        {/* CTA 區塊 */}
        <section className="mt-10 rounded-2xl border-2 border-[var(--gold)]/40 bg-[var(--bg-elevated)] p-6 text-center">
          <h2 className="font-serif text-2xl text-[var(--gold)]">立即預約 — 現折 $100</h2>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">
            LINE 預約：到店出示對話．當日完工．不修不收費
          </p>
          <a href={SITE.lineAddUrl} className="btn-gold mt-4 inline-block rounded-full px-8 py-3 text-sm font-semibold">
            💬 LINE 預約
          </a>
        </section>

        {/* 其他地區 */}
        <section className="mt-10">
          <h2 className="font-serif text-lg text-[var(--gold)]">服務範圍（雙北全區）</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-4">
            {otherAreas.map(o => (
              <Link
                key={o.slug}
                href={`/local/${o.slug}`}
                className="rounded border border-[var(--border)] bg-[var(--bg-elevated)] p-2 text-center text-xs text-[var(--fg-muted)] hover:border-[var(--gold)] hover:text-[var(--gold)]"
              >
                {o.zhName}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="font-serif text-2xl text-[var(--gold)] md:text-3xl">{value}</div>
      <div className="mt-1 text-[10px] text-[var(--fg-muted)]">{label}</div>
    </div>
  );
}

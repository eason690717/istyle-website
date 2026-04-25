import Link from "next/link";
import Image from "next/image";
import { SITE } from "@/lib/site-config";
import { prisma } from "@/lib/prisma";
import { CASES } from "@/lib/case-studies";
import { CaseCard } from "@/components/case-card";
import { TestimonialsGrid } from "@/components/testimonials";
import { GoogleMap } from "@/components/google-map";
import { HeroSearch } from "@/components/hero-search";
import { TESTIMONIALS, getAggregateRating } from "@/lib/testimonials";

// FAQ — 寫成資料結構，同時餵給 UI 和 JSON-LD（GEO 加分）
const FAQS = [
  {
    q: "i時代位於哪裡？營業時間？",
    a: "i時代位於新北市板橋區（江子翠商圈），每日 11:00–20:00 營業，可現場維修或預約。",
  },
  {
    q: "維修需要多久時間？",
    a: "常見維修（換螢幕、換電池）通常 30 分鐘 – 2 小時內完成；主機板等複雜維修需委外，工期 1–3 天。",
  },
  {
    q: "維修保固多久？",
    a: "標準維修保固 3 個月，原廠零件維修保固期可延長。若同部位再故障，免費檢修。",
  },
  {
    q: "報價透明嗎？",
    a: "所有機型維修費用線上即可查詢，無隱藏費用。詳見「維修報價」頁。",
  },
  {
    q: "支援哪些品牌？",
    a: "Apple（iPhone/iPad/MacBook）、Samsung、Google、Sony、ASUS、OPPO、Xiaomi、Switch、Dyson 等十大品牌。",
  },
  {
    q: "可以網購配件嗎？",
    a: "可以，提供 7-11 取貨付款、信用卡刷卡、開立電子發票。",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const agg = getAggregateRating();
const reviewJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: SITE.name,
  url: SITE.url,
  telephone: SITE.phone,
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: agg.ratingValue,
    reviewCount: agg.reviewCount,
    bestRating: agg.bestRating,
    worstRating: agg.worstRating,
  },
  review: TESTIMONIALS.slice(0, 5).map(t => ({
    "@type": "Review",
    reviewRating: { "@type": "Rating", ratingValue: t.rating, bestRating: 5 },
    author: { "@type": "Person", name: t.name },
    datePublished: t.date,
    reviewBody: t.comment,
  })),
};

async function getStats() {
  // 從 DB 抓真實統計，給 hero 用
  try {
    const [brandCount, modelCount, priceCount] = await Promise.all([
      prisma.brand.count({ where: { isActive: true } }),
      prisma.deviceModel.count({ where: { isActive: true } }),
      prisma.repairPrice.count({ where: { isAvailable: true } }),
    ]);
    return { brandCount, modelCount, priceCount };
  } catch {
    return { brandCount: 10, modelCount: 520, priceCount: 3970 };
  }
}

export default async function HomePage() {
  const stats = await getStats();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewJsonLd) }}
      />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0a0a0a] via-[#101010] to-[#0a0a0a]">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-16 text-center md:py-28">
          <Image
            src="/logo.png"
            alt="i時代 手機維修專家 Logo"
            width={540}
            height={482}
            className="mb-6 h-auto w-56 md:w-72"
            priority
          />
          <h1 className="font-serif text-3xl font-bold leading-tight text-[var(--gold)] md:text-5xl">
            {SITE.name} — {SITE.tagline}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-[var(--fg)] md:text-lg">
            板橋・江子翠｜iPhone・iPad・MacBook・Switch・Dyson 全方位維修
          </p>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">
            {SITE.experienceYears()} 年技術經驗．累積維修超過 {SITE.repairsCount} 台．透明報價．當日完工
          </p>

          {/* Hero 即時搜尋報價 — 降低 LINE 詢問負擔，3,970 筆即時可查 */}
          <div className="mt-8 flex w-full justify-center px-2">
            <HeroSearch />
          </div>
          <p className="mt-3 text-xs text-[var(--fg-muted)]">
            收錄 {stats.brandCount} 品牌．{stats.modelCount}+ 機型．{stats.priceCount.toLocaleString()} 筆透明報價
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/recycle"
              className="btn-gold-outline rounded-full px-6 py-3 text-sm"
            >
              二手機回收估價
            </Link>
            <Link
              href="/booking"
              className="btn-gold-outline rounded-full px-6 py-3 text-sm"
            >
              線上預約來店
            </Link>
          </div>

          {/* 信任徽章 */}
          <div className="mt-8 flex flex-wrap justify-center gap-2 text-xs">
            <Badge>★ 14 年技術經驗</Badge>
            <Badge>★ 累積維修 10,000+ 台</Badge>
            <Badge>★ 現場 30 分鐘完工</Badge>
            <Badge>★ 保固 6 個月</Badge>
            <Badge>★ 透明價目</Badge>
          </div>

          {/* Trust signals */}
          <div className="mt-12 grid w-full max-w-3xl grid-cols-3 gap-4 text-center">
            <Stat label="支援品牌" value={`${stats.brandCount}+`} />
            <Stat label="收錄機型" value={`${stats.modelCount}+`} />
            <Stat label="維修項目報價" value={`${stats.priceCount.toLocaleString()}`} />
          </div>
        </div>
      </section>

      {/* 服務項目 */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center font-serif text-2xl text-[var(--fg-strong)] md:text-3xl">
          <span className="gold-underline">主要服務</span>
        </h2>
        <p className="mt-3 text-center text-sm text-[var(--fg-muted)]">
          14 年職人技術．從更換螢幕到主機板維修．資料保密處理
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <ServiceCard key={s.title} {...s} />
          ))}
        </div>
      </section>

      {/* 維修案例 — 增加說服力 */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center font-serif text-2xl text-[var(--fg-strong)] md:text-3xl">
            <span className="gold-underline">真實維修案例</span>
          </h2>
          <p className="mt-3 text-center text-sm text-[var(--fg-muted)]">
            上萬台維修經驗．每一台都用心對待
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CASES.slice(0, 6).map(c => (
              <CaseCard key={c.slug} c={c} compact />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/services" className="text-sm text-[var(--gold)] hover:text-[var(--gold-bright)]">
              看更多服務項目 →
            </Link>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="border-y border-[var(--border)] bg-[var(--bg)] px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-serif text-2xl text-[var(--gold)] md:text-3xl">
            <span className="gold-underline">關於 i時代</span>
          </h2>
          <p className="mt-6 text-[var(--fg)] leading-relaxed">
            <strong className="text-[var(--gold)]">i時代</strong>（i-style）
            是 <strong>2011 年</strong>成立於新北市板橋區的手機維修專門店，
            累積維修超過 <strong>{SITE.repairsCount} 台</strong>各品牌行動裝置。
          </p>
          <p className="mt-4 text-sm text-[var(--fg-muted)] leading-relaxed">
            從 iPhone、iPad、MacBook 到 Samsung、Switch、Dyson，從基礎換螢幕、換電池，
            到複雜的主機板維修，我們以職人精神對待每一台機器。
            提供完全透明的線上報價，所有零件成本與工資公開列示，
            讓您在維修前就清楚知道每一分錢花在哪裡。
          </p>
          <Link
            href="/about"
            className="mt-6 inline-block text-sm text-[var(--gold)] hover:text-[var(--gold-bright)]"
          >
            了解更多 →
          </Link>
        </div>
      </section>

      {/* FAQ — GEO 友善 */}
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-center font-serif text-2xl text-[var(--fg-strong)] md:text-3xl">
          <span className="gold-underline">常見問題</span>
        </h2>
        <div className="mt-10 divide-y divide-[var(--border)]">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group py-4 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer items-center justify-between text-left">
                <span className="font-medium text-[var(--fg)]">{f.q}</span>
                <span className="ml-4 text-[var(--gold)] transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-[var(--fg-muted)] leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 客戶評價 */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center font-serif text-2xl text-[var(--fg-strong)] md:text-3xl">
            <span className="gold-underline">客戶真實評價</span>
          </h2>
          <p className="mt-3 text-center text-sm text-[var(--fg-muted)]">
            <span className="text-[var(--gold)] text-lg">★ {agg.ratingValue}</span> /5．{agg.reviewCount} 則客戶留言
          </p>
          <div className="mt-10">
            <TestimonialsGrid limit={6} />
          </div>
        </div>
      </section>

      {/* 門市位置 */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center font-serif text-2xl text-[var(--fg-strong)] md:text-3xl">
          <span className="gold-underline">門市位置</span>
        </h2>
        <p className="mt-3 text-center text-sm text-[var(--fg-muted)]">
          板橋・江子翠商圈．近捷運站．每日 11:00–20:00
        </p>
        <div className="mt-8">
          <GoogleMap height={360} />
        </div>
      </section>

      {/* CTA 區塊 */}
      <section className="border-t border-[var(--border)] px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-serif text-2xl text-[var(--gold)] md:text-3xl">
            手機壞了？立刻聯絡我們
          </h2>
          <p className="mt-3 text-sm text-[var(--fg-muted)]">
            {SITE.shortSlogan}．每日 11:00–20:00 服務
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href={`tel:${SITE.phoneRaw}`} className="btn-gold rounded-full px-6 py-3 text-sm">
              來電 {SITE.phone}
            </a>
            <a href={SITE.lineAddUrl} className="btn-gold-outline rounded-full px-6 py-3 text-sm">
              LINE 加入 {SITE.lineId}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[var(--gold-soft)]/40 bg-[var(--bg-elevated)] px-3 py-1 text-[var(--gold-soft)]">
      {children}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] py-4">
      <div className="font-serif text-2xl text-[var(--gold)] md:text-3xl">{value}</div>
      <div className="mt-1 text-xs text-[var(--fg-muted)]">{label}</div>
    </div>
  );
}

const SERVICES = [
  { title: "iPhone 維修", desc: "螢幕、電池、鏡頭、Face ID、充電孔，全系列支援", href: "/quote/apple" },
  { title: "iPad 維修", desc: "玻璃、液晶、電池、HOME 鍵、容量擴充", href: "/quote/apple" },
  { title: "MacBook 維修", desc: "螢幕、鍵盤、電池、Touch Bar、系統重灌", href: "/quote/apple" },
  { title: "Android 維修", desc: "Samsung、Sony、Google、ASUS、OPPO、Xiaomi", href: "/quote" },
  { title: "Switch 維修", desc: "螢幕、電池、磨菇頭、卡槽，OLED 版亦可", href: "/quote/nintendo" },
  { title: "二手機回收", desc: "iPhone、iPad、MacBook 高價收購，現場估價", href: "/recycle" },
];

function ServiceCard({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-6 transition hover:border-[var(--gold)] hover:bg-[var(--bg-soft)]"
    >
      <h3 className="font-serif text-lg text-[var(--gold)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--fg-muted)] leading-relaxed">{desc}</p>
      <span className="mt-3 inline-block text-xs text-[var(--gold-soft)]">查詢報價 →</span>
    </Link>
  );
}

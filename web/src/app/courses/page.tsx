import Link from "next/link";
import { COURSES } from "@/lib/courses-catalog";
import { SITE } from "@/lib/site-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "手機維修課程 — 1-2 級實作班 / 全套職業養成",
  description: "板橋 i時代手機維修教學．14 年實戰經驗導師．iPhone / iPad / Switch 拆裝、換螢幕、換電池．結業送進貨折扣．不教主機板 BGA",
  keywords: [
    "手機維修課程", "板橋手機維修教學", "iPhone 維修教學",
    "換螢幕教學", "換電池教學", "iPad 拆機教學",
    "Switch 維修教學", "手機維修班", "手機修理學徒",
  ],
  alternates: { canonical: `${SITE.url}/courses` },
  openGraph: {
    title: "手機維修課程 — i時代實戰班",
    description: "從零到開店，14 年師傅手把手教學",
    url: `${SITE.url}/courses`,
    type: "website",
  },
};

export default function CoursesPage() {
  // FAQ JSON-LD（被 Google rich snippet + ChatGPT 引用）
  const faqs = [
    { q: "完全沒基礎可以上嗎？", a: "L1 基礎班從零開始，工具認識到拆機 SOP 都會教。9 成學員之前沒拆過手機。" },
    { q: "課程會教主機板維修嗎？", a: "不會。i時代 1-2 級課程不教 BGA / IC 焊接。原因：主機板維修需 200+ 小時練習，短期班不可能上手，反而誤導學員。我們專注實用度最高、能立刻接案的部分。" },
    { q: "會包含實機練習嗎？", a: "全部包含。L1 送 1 組螢幕 + 1 組電池練習；L2 送 1 台練習機 + 多組零件；全套班送 2 台練習機。" },
    { q: "結業有證書嗎？", a: "有 i時代官方結業證書。L2 + 全套班含『i時代官方認證師資』授權，可掛在自己店。" },
    { q: "可以分期付款嗎？", a: "L2 + 全套班可分 2-3 期。早鳥價需一次付清，否則為定價。LINE 詢問細節。" },
    { q: "幾人開課？", a: "3 人成班，最多 6 人/班。確保每位學員都能親手拆 6+ 次。" },
    { q: "上完真的能開店嗎？", a: "全套班的學員有 70% 在 6 個月內開了實體店或副業接案。我們提供供應商清單、定價公式、客戶導流 SOP，但不保證收入。" },
  ];
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  // Course JSON-LD per course
  const courseJsonLd = COURSES.map(c => ({
    "@context": "https://schema.org",
    "@type": "Course",
    name: c.title,
    description: c.subtitle,
    provider: {
      "@type": "Organization",
      name: SITE.name,
      sameAs: SITE.url,
    },
    offers: {
      "@type": "Offer",
      price: (c.earlyBirdPrice ?? c.price).toString(),
      priceCurrency: "TWD",
    },
  }));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }} />

      <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        {/* Hero */}
        <header className="text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-4 py-1.5 text-xs text-[var(--gold-bright)]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--gold)]" />
            限時早鳥報名中
          </div>
          <h1 className="mt-4 font-serif text-4xl text-[var(--gold)] md:text-5xl">
            i時代 手機維修課程
          </h1>
          <p className="mt-3 text-base text-[var(--fg-muted)] md:text-lg">
            14 年現役維修師親授．實機練習．結業送進貨折扣
          </p>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">
            分 iPhone 班 / Android 班 / 全系列班<br />
            主力 1-2 級實作（換螢幕 / 電池 / 充電孔 / 周邊模組）<br />
            <span className="text-[10px]">⚠️ 不教主機板 BGA — 短期班學不會，我們不騙你</span>
          </p>
        </header>

        {/* 信任條 */}
        <section className="mt-8 grid grid-cols-3 gap-3">
          <Stat label="技術經驗" value={`${SITE.experienceYears()} 年`} />
          <Stat label="累計修機" value={SITE.repairsCount} />
          <Stat label="開課班數" value="50+" />
        </section>

        {/* 為什麼選 i時代 */}
        <section className="mt-12">
          <h2 className="font-serif text-2xl text-[var(--gold)]">為什麼選 i時代？</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              { icon: "🛠️", title: "現場實戰導師", desc: "不是補習班老師，是天天接客的維修師傅" },
              { icon: "📦", title: "送練習機 + 零件", desc: "不是給你看影片，是手把手實機操作" },
              { icon: "🎓", title: "結業送進貨折扣", desc: "上完課直接八折跟我們批貨，創業成本立刻砍" },
              { icon: "👥", title: "3 人成班，6 人滿班", desc: "每人保證 6+ 次親手拆裝經驗" },
              { icon: "💬", title: "終身技術 LINE 群", desc: "結業後遇到難題，師傅還在線" },
              { icon: "🏪", title: "開店 SOP 全給你", desc: "供應商 / 定價 / 客戶心理 / Google Reviews 一次教" },
            ].map(f => (
              <div key={f.title} className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
                <div className="text-2xl">{f.icon}</div>
                <div className="mt-2 text-sm font-medium text-[var(--gold)]">{f.title}</div>
                <p className="mt-1 text-xs text-[var(--fg-muted)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 三階段課程卡片 */}
        <section className="mt-12">
          <h2 className="font-serif text-2xl text-[var(--gold)]">課程方案</h2>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">早鳥優惠至本月底，名額有限</p>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {COURSES.map(c => <CourseCard key={c.slug} c={c} />)}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="font-serif text-2xl text-[var(--gold)]">常見問題</h2>
          <div className="mt-4 space-y-2">
            {faqs.map((f, i) => (
              <details key={i} className="group rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] open:border-[var(--gold)]/40">
                <summary className="cursor-pointer list-none p-4 text-sm font-medium hover:text-[var(--gold)]">
                  <span className="mr-2 text-[var(--gold)] group-open:rotate-90 inline-block transition">▶</span>
                  {f.q}
                </summary>
                <p className="border-t border-[var(--border)] p-4 text-sm text-[var(--fg-muted)] leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA bar */}
        <section className="mt-12 rounded-2xl border-2 border-[var(--gold)]/40 bg-gradient-to-br from-[var(--bg-elevated)] to-black p-6 text-center md:p-8">
          <h2 className="font-serif text-2xl text-[var(--gold)]">想了解詳細排課時間？</h2>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">直接 LINE 詢問，師傅 24 小時內回覆</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a href={SITE.lineAddUrl} className="btn-gold rounded-full px-6 py-3 text-sm font-semibold">
              💬 LINE 詢問課程
            </a>
            <a href={`tel:${SITE.phoneRaw}`} className="rounded-full border border-[var(--gold)]/40 px-6 py-3 text-sm text-[var(--gold)]">
              📞 {SITE.phone}
            </a>
          </div>
        </section>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-center">
      <div className="font-serif text-2xl text-[var(--gold)] md:text-3xl">{value}</div>
      <div className="mt-1 text-[10px] text-[var(--fg-muted)]">{label}</div>
    </div>
  );
}

const BRAND_BADGES: Record<string, { icon: string; label: string; color: string }> = {
  apple: { icon: "🍎", label: "Apple", color: "from-zinc-600 to-zinc-700" },
  android: { icon: "🤖", label: "Android", color: "from-emerald-600 to-emerald-700" },
  all: { icon: "🌟", label: "全系列", color: "from-[var(--gold)] to-amber-600" },
};

function CourseCard({ c }: { c: typeof COURSES[number] }) {
  const isPopular = c.popular;
  const badge = BRAND_BADGES[c.brandFocus];
  const lineMsg = encodeURIComponent(`你好！想了解「${c.title}」課程的排課時間 + 報名方式`);
  const lineUrl = `${SITE.lineAddUrl}?text=${lineMsg}`;
  return (
    <div className={`relative flex flex-col overflow-hidden rounded-2xl border-2 ${isPopular ? "border-[var(--gold)] shadow-lg shadow-[var(--gold)]/20" : "border-[var(--border)]"} bg-[var(--bg-elevated)] p-5`}>
      {isPopular && (
        <div className="absolute -right-8 top-3 rotate-45 bg-[var(--gold)] px-10 py-1 text-[10px] font-bold text-black">
          熱門
        </div>
      )}
      <div className="mb-3">
        <div className={`mb-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${badge.color} px-2.5 py-0.5 text-[10px] font-medium text-white`}>
          <span>{badge.icon}</span>
          <span>{badge.label}</span>
        </div>
        <div className="text-xs text-[var(--fg-muted)]">{c.durationLabel}</div>
        <h3 className="mt-1 font-serif text-xl text-[var(--gold)]">{c.title}</h3>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">{c.subtitle}</p>
      </div>

      {/* 價格 */}
      <div className="my-3 flex items-baseline gap-2">
        {c.earlyBirdPrice ? (
          <>
            <span className="font-serif text-3xl font-bold text-[var(--gold-bright)]">${c.earlyBirdPrice.toLocaleString()}</span>
            <span className="text-xs text-[var(--fg-muted)] line-through">${c.price.toLocaleString()}</span>
            <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-400">早鳥</span>
          </>
        ) : (
          <span className="font-serif text-3xl font-bold text-[var(--gold-bright)]">${c.price.toLocaleString()}</span>
        )}
      </div>

      {/* highlights */}
      <ul className="space-y-1.5 text-xs text-[var(--fg)]">
        {c.highlights.map(h => (
          <li key={h} className="flex items-start gap-2">
            <span className="mt-0.5 text-[var(--gold)]">✓</span>
            <span>{h}</span>
          </li>
        ))}
      </ul>

      {/* 課綱（折疊） */}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-[var(--gold-soft)] hover:text-[var(--gold)]">📚 完整課綱（{c.curriculum.length} 章）</summary>
        <ul className="mt-2 space-y-1 pl-4 text-[11px] text-[var(--fg-muted)]">
          {c.curriculum.map(item => <li key={item} className="list-disc">{item}</li>)}
        </ul>
      </details>

      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-[var(--gold-soft)] hover:text-[var(--gold)]">📦 包含內容</summary>
        <ul className="mt-2 space-y-1 pl-4 text-[11px] text-[var(--fg-muted)]">
          {c.includes.map(item => <li key={item} className="list-disc">{item}</li>)}
        </ul>
      </details>

      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-[var(--gold-soft)] hover:text-[var(--gold)]">👤 適合誰</summary>
        <ul className="mt-2 space-y-1 pl-4 text-[11px] text-[var(--fg-muted)]">
          {c.recommended.map(item => <li key={item} className="list-disc">{item}</li>)}
        </ul>
      </details>

      <a
        href={lineUrl}
        className={`mt-5 block w-full rounded-full py-3 text-center text-sm font-semibold transition ${isPopular ? "btn-gold" : "border border-[var(--gold)]/40 text-[var(--gold)] hover:bg-[var(--gold)]/10"}`}
      >
        💬 LINE 報名 / 詢問
      </a>
    </div>
  );
}

import Link from "next/link";
import { SITE } from "@/lib/site-config";
import { SERVICES } from "@/lib/services-catalog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "服務項目總覽 — 手機 / 平板 / 筆電 / 主機 / 家電維修",
  description: `${SITE.name}提供完整 3C 維修服務：iPhone、iPad、MacBook、Switch、Dyson 等，板橋現場專業維修，14 年技術經驗。`,
};

const CATEGORY_LABELS: Record<string, string> = {
  phone: "手機維修",
  tablet: "平板維修",
  laptop: "筆電維修",
  console: "遊戲主機維修",
  appliance: "家電維修",
};

export default function ServicesIndexPage() {
  const grouped = new Map<string, typeof SERVICES>();
  for (const s of SERVICES) {
    if (!grouped.has(s.category)) grouped.set(s.category, []);
    grouped.get(s.category)!.push(s);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="text-center">
        <h1 className="font-serif text-3xl text-[var(--gold)] md:text-4xl">
          <span className="gold-underline">服務項目</span>
        </h1>
        <p className="mt-4 text-sm text-[var(--fg-muted)]">
          14 年技術經驗．累積維修超過 10,000 台．保固 3 個月
        </p>
      </div>

      <div className="mt-10 space-y-12">
        {Array.from(grouped.entries()).map(([cat, services]) => (
          <section key={cat}>
            <h2 className="border-l-4 border-[var(--gold)] pl-3 font-serif text-xl text-[var(--fg-strong)]">
              {CATEGORY_LABELS[cat]}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map(s => (
                <Link
                  key={s.slug}
                  href={`/services/${s.slug}`}
                  className="group block rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-5 transition hover:border-[var(--gold)]"
                >
                  <h3 className="font-serif text-lg text-[var(--gold)] group-hover:text-[var(--gold-bright)]">
                    {s.shortTitle}
                  </h3>
                  <p className="mt-2 text-xs text-[var(--fg-muted)] line-clamp-3">
                    {s.intro}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="font-mono text-[var(--gold-soft)]">
                      NT${s.priceRange.min.toLocaleString()} 起
                    </span>
                    <span className="text-[var(--fg-muted)]">{s.estimatedTime}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

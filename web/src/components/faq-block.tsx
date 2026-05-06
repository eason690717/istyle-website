// 通用 FAQ 區塊 — 渲染 UI + 同步 inject FAQPage JSON-LD（給 Google rich snippet + GPT 引用）
// 用法：
//   <FaqBlock faqs={[{q: "...", a: "..."}]} />

interface Faq { q: string; a: string; }

export function FaqBlock({ faqs, title = "常見問題" }: { faqs: Faq[]; title?: string }) {
  if (faqs.length === 0) return null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="mt-10">
        <h2 className="font-serif text-xl text-[var(--gold)] md:text-2xl">{title}</h2>
        <div className="mt-4 space-y-2">
          {faqs.map((f, i) => (
            <details
              key={i}
              className="group rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] open:border-[var(--gold)]/40"
            >
              <summary className="cursor-pointer list-none p-4 text-sm font-medium hover:text-[var(--gold)]">
                <span className="mr-2 inline-block text-[var(--gold)] transition group-open:rotate-90">▶</span>
                {f.q}
              </summary>
              <p className="border-t border-[var(--border)] p-4 text-sm leading-relaxed text-[var(--fg-muted)]">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

import { TESTIMONIALS } from "@/lib/testimonials";

const SOURCE_LABEL: Record<string, string> = {
  google: "Google 評論",
  line: "LINE 客戶",
  fb: "Facebook",
};

export function TestimonialsGrid({ limit = 6 }: { limit?: number }) {
  const items = TESTIMONIALS.slice(0, limit);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(t => (
        <div
          key={`${t.name}-${t.date}`}
          className="refined-card p-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--gold-bright)] to-[var(--gold-soft)] font-serif text-lg text-black shadow-[0_4px_12px_rgba(201,169,110,0.3)]">
              {t.initial}
            </div>
            <div className="flex-1">
              <div className="font-medium text-[var(--fg)]">{t.name}</div>
              <div className="text-xs text-[var(--fg-muted)]">{t.device}．{t.service}</div>
            </div>
            <div className="text-[var(--gold)] text-sm">{"★".repeat(t.rating)}</div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[var(--fg)]">"{t.comment}"</p>
          {t.source && (
            <div className="mt-3 text-[10px] uppercase tracking-wider text-[var(--gold-soft)]">
              {SOURCE_LABEL[t.source]}．{t.date}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

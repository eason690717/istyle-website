import Image from "next/image";
import type { CaseStudy } from "@/lib/case-studies";

export function CaseCard({ c, compact = false }: { c: CaseStudy; compact?: boolean }) {
  return (
    <article className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] transition hover:border-[var(--gold)]">
      {/* Before/After image side-by-side */}
      <div className="relative grid grid-cols-2 gap-px bg-[var(--border)]">
        {[c.beforeImage, c.afterImage].map((src, idx) => (
          <div key={idx} className="relative aspect-[4/3] bg-[var(--bg-soft)]">
            {src && (
              <Image src={src} alt={idx === 0 ? "維修前" : "維修後"} fill className="object-cover" sizes="200px" />
            )}
            <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[10px] text-[var(--gold)]">
              {idx === 0 ? "維修前" : "維修後"}
            </span>
          </div>
        ))}
      </div>

      <div className="p-4">
        <h3 className="font-serif text-base text-[var(--gold)]">{c.title}</h3>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">{c.device}．{c.customerName}</p>
        {!compact && (
          <>
            <p className="mt-3 text-xs leading-relaxed text-[var(--fg)]">
              <span className="text-[var(--gold-soft)]">問題：</span>{c.problem}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--fg)]">
              <span className="text-[var(--gold-soft)]">解法：</span>{c.solution}
            </p>
          </>
        )}
        <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--fg-muted)]">
          <span>⏱ {c.duration}</span>
          <span>{"★".repeat(c.rating)}</span>
        </div>
      </div>
    </article>
  );
}

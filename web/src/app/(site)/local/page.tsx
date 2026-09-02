import Link from "next/link";
import { LOCAL_AREAS } from "@/lib/local-areas";
import { SITE } from "@/lib/site-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "服務範圍 — 雙北手機維修",
  description: "i時代服務雙北全區．板橋／中和／永和／三重／樹林／新莊／土城／蘆洲．14 年技術經驗．現場維修．當日完工",
  alternates: { canonical: `${SITE.url}/local` },
};

export default function LocalIndexPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-serif text-3xl text-[var(--gold)]">服務範圍</h1>
      <p className="mt-2 text-sm text-[var(--fg-muted)]">
        i時代位於板橋江子翠，服務雙北全區。下方點選您所在區域看在地優惠：
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {LOCAL_AREAS.map(a => (
          <Link
            key={a.slug}
            href={`/local/${a.slug}`}
            className="group rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-5 transition hover:border-[var(--gold)]"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl text-[var(--gold)] group-hover:text-[var(--gold-bright)]">
                {a.zhName}
              </h2>
              <span className="text-xs text-[var(--fg-muted)]">
                {a.distanceMin === 0 ? "在地" : `${a.distanceMin} 分鐘`}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--fg-muted)]">{a.fullName}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {a.popularServices.slice(0, 3).map(s => (
                <span key={s} className="rounded bg-[var(--gold)]/10 px-2 py-0.5 text-[10px] text-[var(--gold-bright)]">
                  {s}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10 rounded-lg border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-4 text-center text-xs text-[var(--fg-muted)]">
        其他地區也歡迎詢問：
        <a href={SITE.lineAddUrl} className="ml-2 text-[var(--gold)] hover:underline">LINE 客服</a>
      </div>
    </div>
  );
}

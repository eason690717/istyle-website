import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site-config";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "真實維修案例",
  description: "i時代板橋手機維修真實案例集．iPhone / iPad / MacBook / Switch 修前修後對比．附耗時與費用",
  alternates: { canonical: `${SITE.url}/cases` },
};

export default async function CasesPage() {
  const cases = await prisma.caseStudy.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
    take: 60,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8">
        <h1 className="font-serif text-3xl text-[var(--gold)] md:text-4xl">📋 真實維修案例</h1>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          每一台都是親手修，附前後對比照、耗時、費用，讓你知道我們做了什麼
        </p>
      </header>

      {cases.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-12 text-center text-sm text-[var(--fg-muted)]">
          案例累積中，敬請期待
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {cases.map(c => {
            const after = JSON.parse(c.afterPhotos || "[]") as string[];
            const before = JSON.parse(c.beforePhotos || "[]") as string[];
            const cover = after[0] || before[0];
            return (
              <Link
                key={c.id}
                href={`/cases/${c.slug}`}
                className="group overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] transition hover:border-[var(--gold)]"
              >
                {cover && (
                  <div className="aspect-video overflow-hidden bg-black">
                    <img
                      src={cover}
                      alt={c.title}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    <span className="rounded bg-[var(--gold)]/10 px-2 py-0.5 text-[var(--gold-bright)]">{c.brand}</span>
                    <span className="rounded bg-[var(--border)] px-2 py-0.5 text-[var(--fg-muted)]">{c.issueType}</span>
                  </div>
                  <h3 className="mt-2 font-serif text-base text-[var(--fg)] group-hover:text-[var(--gold)]">{c.title}</h3>
                  <p className="mt-1 text-xs text-[var(--fg-muted)]">{c.deviceModel}</p>
                  <div className="mt-3 flex justify-between text-[10px] text-[var(--fg-muted)]">
                    {c.repairMinutes && <span>⏱ {c.repairMinutes} 分鐘</span>}
                    {c.cost != null && <span>💰 NT$ {c.cost.toLocaleString()}</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

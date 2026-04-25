import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPricesPage() {
  const brands = await prisma.brand.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { models: true } },
      models: { select: { _count: { select: { prices: true } } } },
    },
  }).catch(() => []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-[var(--gold)]">維修報價管理</h1>
        <div className="text-sm text-[var(--fg-muted)]">
          {brands.reduce((sum, b) => sum + b.models.reduce((s, m) => s + m._count.prices, 0), 0).toLocaleString()} 筆報價
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map(b => {
          const priceCount = b.models.reduce((s, m) => s + m._count.prices, 0);
          return (
            <Link
              key={b.id}
              href={`/quote/${b.slug}`}
              target="_blank"
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-5 transition hover:border-[var(--gold)]"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-serif text-lg text-[var(--gold)]">{b.name}</span>
                <span className="text-xs text-[var(--fg-muted)]">{b.nameZh}</span>
              </div>
              <div className="mt-3 text-xs text-[var(--fg-muted)]">
                {b._count.models} 個機型 · {priceCount} 筆報價
              </div>
              <div className="mt-2 text-[10px] text-[var(--gold-soft)]">前台預覽 →</div>
            </Link>
          );
        })}
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-5 text-sm">
        <p className="text-[var(--fg)]">
          目前所有報價套用公式：<span className="font-mono text-[var(--gold)]">⌈ cerphone × 1.15 ⌉ 進位百</span>
        </p>
        <p className="mt-2 text-xs text-[var(--fg-muted)]">
          後續單筆覆寫功能開發中。如需臨時調整某機型某項目，請聯絡開發者。
        </p>
      </div>
    </div>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPricesPage() {
  const [brands, recentOverrides] = await Promise.all([
    prisma.brand.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { models: true } },
        models: { select: { _count: { select: { prices: true } } } },
      },
    }).catch(() => []),
    prisma.repairPrice.findMany({
      where: { manualOverride: { not: null } },
      orderBy: { overriddenAt: "desc" },
      take: 20,
      include: {
        model: { select: { name: true, slug: true, brand: { select: { slug: true, nameZh: true } } } },
        item: { select: { name: true } },
      },
    }).catch(() => []),
  ]);

  const totalPrices = brands.reduce((sum, b) => sum + b.models.reduce((s, m) => s + m._count.prices, 0), 0);
  const totalOverrides = await prisma.repairPrice.count({ where: { manualOverride: { not: null } } }).catch(() => 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-[var(--gold)]">維修報價管理</h1>
        <div className="text-right text-xs text-[var(--fg-muted)]">
          <div>{totalPrices.toLocaleString()} 筆報價</div>
          {totalOverrides > 0 && <div className="mt-0.5 text-[var(--gold-bright)]">🏷 {totalOverrides} 筆已異動</div>}
        </div>
      </div>

      {/* 品牌列表 */}
      <div>
        <h2 className="mb-3 font-serif text-base text-[var(--gold)]">點品牌進入管理</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map(b => {
            const priceCount = b.models.reduce((s, m) => s + m._count.prices, 0);
            return (
              <Link
                key={b.id}
                href={`/admin/prices/${b.slug}`}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-5 transition hover:border-[var(--gold)]"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-serif text-lg text-[var(--gold)]">{b.name}</span>
                  <span className="text-xs text-[var(--fg-muted)]">{b.nameZh}</span>
                </div>
                <div className="mt-3 text-xs text-[var(--fg-muted)]">
                  {b._count.models} 個機型 · {priceCount} 筆報價
                </div>
                <div className="mt-2 text-[10px] text-[var(--gold-soft)]">→ 編輯報價</div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 最近異動 */}
      {recentOverrides.length > 0 && (
        <div>
          <h2 className="mb-3 font-serif text-base text-[var(--gold)]">🏷 最近異動價格</h2>
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-elevated)] text-xs text-[var(--fg-muted)]">
                <tr>
                  <th className="p-3 text-left font-normal">機型</th>
                  <th className="p-3 text-left font-normal">項目</th>
                  <th className="p-3 text-left font-normal">層級</th>
                  <th className="p-3 text-right font-normal">原價</th>
                  <th className="p-3 text-right font-normal">異動價</th>
                  <th className="p-3 text-left font-normal">原因</th>
                  <th className="p-3 text-left font-normal">時間</th>
                </tr>
              </thead>
              <tbody>
                {recentOverrides.map(o => (
                  <tr key={o.id} className="border-t border-[var(--border)]">
                    <td className="p-3">
                      <Link href={`/admin/prices/${o.model.brand.slug}#m${o.modelId}`} className="text-[var(--gold)] hover:underline">
                        {o.model.brand.nameZh} · {o.model.name}
                      </Link>
                    </td>
                    <td className="p-3">{o.item.name}</td>
                    <td className="p-3 text-xs">{o.tier}</td>
                    <td className="p-3 text-right text-xs text-[var(--fg-muted)] line-through">
                      {o.calculatedPrice ? `NT$ ${o.calculatedPrice.toLocaleString()}` : "—"}
                    </td>
                    <td className="p-3 text-right font-semibold text-[var(--gold-bright)]">
                      NT$ {o.manualOverride!.toLocaleString()}
                    </td>
                    <td className="p-3 text-xs text-[var(--fg-muted)] max-w-xs truncate">{o.overrideReason || "—"}</td>
                    <td className="p-3 text-xs text-[var(--fg-muted)]">
                      {o.overriddenAt ? new Date(o.overriddenAt).toLocaleString("zh-TW", { hour12: false, dateStyle: "short", timeStyle: "short" }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-5 text-sm">
        <p className="text-[var(--fg)]">
          公式：<span className="font-mono text-[var(--gold)]">⌈ cerphone × 1.15 ⌉ 進位百</span>（標準）或 <span className="font-mono text-[var(--gold)]">×1.5</span>（原廠）
        </p>
        <p className="mt-2 text-xs text-[var(--fg-muted)]">
          想單獨改某筆價格？點品牌進入，每筆都可手動覆寫。覆寫的會顯示 🏷 標記。
        </p>
      </div>
    </div>
  );
}

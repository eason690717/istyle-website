import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PriceRow } from "./price-row";

export const dynamic = "force-dynamic";

export default async function BrandPricesPage({ params }: { params: Promise<{ brand: string }> }) {
  const { brand: brandSlug } = await params;
  const brand = await prisma.brand.findUnique({
    where: { slug: brandSlug },
  });
  if (!brand) return notFound();

  const models = await prisma.deviceModel.findMany({
    where: { brandId: brand.id, isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      prices: {
        include: { item: { select: { id: true, name: true } } },
        orderBy: [{ tier: "asc" }, { itemId: "asc" }],
      },
    },
  });

  const totalOverrides = models.reduce((sum, m) =>
    sum + m.prices.filter(p => p.manualOverride !== null).length, 0
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/prices" className="text-xs text-[var(--fg-muted)] hover:text-[var(--gold)]">← 回品牌列表</Link>
        <h1 className="mt-2 font-serif text-2xl text-[var(--gold)]">
          {brand.nameZh || brand.name} · 維修報價
        </h1>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">
          {models.length} 個機型 · 共 {models.reduce((s, m) => s + m.prices.length, 0)} 筆報價
          {totalOverrides > 0 && <span className="ml-2 text-[var(--gold-bright)]">🏷 {totalOverrides} 筆已異動</span>}
        </p>
      </div>

      <div className="space-y-6">
        {models.map(m => (
          <section key={m.id} id={`m${m.id}`} className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
            <h2 className="font-serif text-lg text-[var(--gold)]">{m.name}</h2>
            {m.prices.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--fg-muted)]">尚無報價</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-[var(--fg-muted)]">
                    <tr className="border-b border-[var(--border)]">
                      <th className="py-2 text-left font-normal">項目</th>
                      <th className="py-2 text-left font-normal">層級</th>
                      <th className="py-2 text-right font-normal">公式價</th>
                      <th className="py-2 text-right font-normal">最終售價</th>
                      <th className="py-2 text-left font-normal">異動原因</th>
                      <th className="py-2 text-right font-normal">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.prices.map(p => (
                      <PriceRow
                        key={p.id}
                        price={{
                          id: p.id,
                          itemName: p.item.name,
                          tier: p.tier,
                          calculatedPrice: p.calculatedPrice,
                          manualOverride: p.manualOverride,
                          overrideReason: p.overrideReason,
                          overriddenAt: p.overriddenAt?.toISOString() || null,
                          overriddenBy: p.overriddenBy,
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

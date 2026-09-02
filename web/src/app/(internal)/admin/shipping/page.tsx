// 出貨管理 — 已付款待出貨的訂單清單
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ShippingRow } from "./shipping-row";

export const dynamic = "force-dynamic";

export default async function ShippingPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: "pending" | "shipped" | "all" }>;
}) {
  const sp = await searchParams;
  const filter = sp.filter || "pending";

  const where: Record<string, unknown> = { status: "PAID" };
  if (filter === "pending") where.shippedAt = null;
  if (filter === "shipped") where.shippedAt = { not: null };

  const links = await prisma.paymentLink.findMany({
    where,
    orderBy: filter === "shipped" ? { shippedAt: "desc" } : { paidAt: "desc" },
    take: 100,
  });

  const [pendingCount, shippedCount] = await Promise.all([
    prisma.paymentLink.count({ where: { status: "PAID", shippedAt: null } }),
    prisma.paymentLink.count({ where: { status: "PAID", shippedAt: { not: null } } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-[var(--gold)]">📦 出貨管理</h1>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">已付款線上訂單，輸入單號標記寄出</p>
      </div>

      {/* 過濾 tabs */}
      <div className="flex gap-2 text-sm">
        <Link href="?filter=pending" className={`rounded-full px-4 py-2 ${filter === "pending" ? "bg-[var(--gold)] text-black" : "border border-[var(--border)] text-[var(--fg-muted)]"}`}>
          待出貨 ({pendingCount})
        </Link>
        <Link href="?filter=shipped" className={`rounded-full px-4 py-2 ${filter === "shipped" ? "bg-[var(--gold)] text-black" : "border border-[var(--border)] text-[var(--fg-muted)]"}`}>
          已出貨 ({shippedCount})
        </Link>
        <Link href="?filter=all" className={`rounded-full px-4 py-2 ${filter === "all" ? "bg-[var(--gold)] text-black" : "border border-[var(--border)] text-[var(--fg-muted)]"}`}>
          全部
        </Link>
      </div>

      {links.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-12 text-center text-sm text-[var(--fg-muted)]">
          {filter === "pending" ? "🎉 沒有待出貨訂單" : filter === "shipped" ? "尚無已出貨訂單" : "尚無訂單"}
        </div>
      ) : (
        <div className="space-y-3">
          {links.map(l => (
            <ShippingRow
              key={l.id}
              link={{
                id: l.id,
                token: l.token,
                amount: l.amount,
                itemName: l.itemName,
                description: l.description,
                customerName: l.customerName,
                customerPhone: l.customerPhone,
                customerEmail: l.customerEmail,
                paidAt: l.paidAt?.toISOString() || null,
                paymentMethod: l.paymentMethod,
                invoiceNumber: l.invoiceNumber,
                shippingProvider: l.shippingProvider,
                trackingNumber: l.trackingNumber,
                shippingNote: l.shippingNote,
                shippedAt: l.shippedAt?.toISOString() || null,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

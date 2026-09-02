// 序號 / IMEI 查詢頁 — 輸入序號查商品 + 銷售紀錄（保固對照）
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  IN_STOCK: "bg-green-500/20 text-green-400",
  SOLD: "bg-blue-500/20 text-blue-400",
  RESERVED: "bg-orange-500/20 text-orange-400",
  DAMAGED: "bg-red-500/20 text-red-400",
  RETURNED: "bg-purple-500/20 text-purple-400",
};

export default async function SerialsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim();
  const status = sp.status;

  const where: Record<string, unknown> = {};
  if (q) where.serial = { contains: q };
  if (status) where.status = status;

  const serials = await prisma.productSerial.findMany({
    where,
    orderBy: { receivedAt: "desc" },
    take: 200,
  });

  const productIds = [...new Set(serials.map(s => s.productId))];
  const saleIds = serials.map(s => s.saleId).filter((x): x is number => !!x);
  const [products, sales] = await Promise.all([
    productIds.length ? prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, slug: true } }) : Promise.resolve([]),
    saleIds.length ? prisma.sale.findMany({ where: { id: { in: saleIds } }, select: { id: true, saleNumber: true, customerName: true, customerPhone: true, total: true, createdAt: true } }) : Promise.resolve([]),
  ]);
  const pMap = new Map(products.map(p => [p.id, p]));
  const sMap = new Map(sales.map(s => [s.id, s]));

  const counts = await prisma.productSerial.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const statusCounts = Object.fromEntries(counts.map(c => [c.status, c._count._all]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-[var(--gold)]">📱 序號 / IMEI 查詢</h1>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">3C 商品序號管理 — 進貨自動入庫，銷售自動標記，保固對應原始售出紀錄</p>
      </div>

      {/* 狀態 KPI */}
      <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
        {Object.entries({ IN_STOCK: "在庫", SOLD: "已售", RESERVED: "保留", DAMAGED: "損壞", RETURNED: "退回" }).map(([k, label]) => (
          <Link
            key={k}
            href={`?status=${k}`}
            className={`rounded-lg border p-3 text-center transition ${status === k ? "border-[var(--gold)] bg-[var(--gold)]/10" : "border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--gold-soft)]"}`}
          >
            <div className="font-serif text-2xl text-[var(--gold)]">{statusCounts[k] || 0}</div>
            <div className="mt-1 text-[10px] text-[var(--fg-muted)]">{label}</div>
          </Link>
        ))}
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q || ""}
          placeholder="搜尋 IMEI / 序號（部分比對）"
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-mono"
        />
        <button className="btn-gold rounded-full px-4 py-2 text-sm">搜尋</button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-elevated)] text-xs text-[var(--fg-muted)]">
            <tr>
              <th className="p-3 text-left font-normal">序號 / IMEI</th>
              <th className="p-3 text-left font-normal">商品</th>
              <th className="p-3 text-left font-normal">狀態</th>
              <th className="p-3 text-right font-normal">成本</th>
              <th className="p-3 text-left font-normal">進貨</th>
              <th className="p-3 text-left font-normal">售出</th>
            </tr>
          </thead>
          <tbody>
            {serials.map(s => {
              const p = pMap.get(s.productId);
              const sale = s.saleId ? sMap.get(s.saleId) : null;
              return (
                <tr key={s.id} className="border-t border-[var(--border)]">
                  <td className="p-3 font-mono text-xs">{s.serial}</td>
                  <td className="p-3 text-xs">{p?.name || `#${s.productId}`}</td>
                  <td className="p-3">
                    <span className={`rounded px-2 py-0.5 text-xs ${STATUS_COLOR[s.status] || ""}`}>{s.status}</span>
                  </td>
                  <td className="p-3 text-right text-xs text-[var(--fg-muted)]">{s.cost ? `$${s.cost.toLocaleString()}` : "—"}</td>
                  <td className="p-3 text-xs text-[var(--fg-muted)]">
                    {new Date(s.receivedAt).toLocaleString("zh-TW", { hour12: false, dateStyle: "short" })}
                    {s.receivedBy && <div className="text-[10px]">{s.receivedBy}</div>}
                  </td>
                  <td className="p-3 text-xs">
                    {sale ? (
                      <Link href={`/pos/sales/${sale.id}`} target="_blank" className="text-[var(--gold)] hover:underline">
                        <div>{sale.saleNumber}</div>
                        <div className="text-[10px] text-[var(--fg-muted)]">{sale.customerName} {sale.customerPhone}</div>
                      </Link>
                    ) : (
                      <span className="text-[var(--fg-muted)]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {serials.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-sm text-[var(--fg-muted)]">{q ? "沒找到符合的序號" : "尚無序號紀錄。在商品設定中勾選「追蹤序號」並進貨後會出現"}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

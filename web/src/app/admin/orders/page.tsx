import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    take: 200,
    orderBy: { createdAt: "desc" },
    include: { items: true },
  }).catch(() => []);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-[var(--gold)]">訂單管理</h1>
      {orders.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-12 text-center text-sm text-[var(--fg-muted)]">
          尚無訂單（電商功能開發中）
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--bg-soft)] text-left text-xs text-[var(--gold)]">
              <tr>
                <th className="px-3 py-2">訂單編號</th>
                <th className="px-3 py-2">客戶</th>
                <th className="px-3 py-2">電話</th>
                <th className="px-3 py-2 text-right">金額</th>
                <th className="px-3 py-2">付款</th>
                <th className="px-3 py-2">狀態</th>
                <th className="px-3 py-2">建立時間</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {orders.map((o, i) => (
                <tr key={o.id} className={i % 2 === 0 ? "bg-[#141414]" : "bg-[#181818]"}>
                  <td className="px-3 py-2 font-mono text-xs">{o.orderNumber}</td>
                  <td className="px-3 py-2">{o.contactName}</td>
                  <td className="px-3 py-2 font-mono text-xs">{o.contactPhone}</td>
                  <td className="px-3 py-2 text-right font-mono">NT${o.total.toLocaleString()}</td>
                  <td className="px-3 py-2 text-xs">{o.paymentStatus}</td>
                  <td className="px-3 py-2 text-xs">{o.status}</td>
                  <td className="px-3 py-2 text-xs text-[var(--fg-muted)]">
                    {new Date(o.createdAt).toLocaleString("zh-TW")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

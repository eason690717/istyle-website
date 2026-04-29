// 統一銷售視圖 — 線上訂單 (Order) + 店內 POS (Sale) 整合在一個列表
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Channel = "POS" | "ONLINE";

interface UnifiedRow {
  channel: Channel;
  id: number;
  number: string;          // saleNumber or orderNumber
  customerName: string;
  customerPhone: string;
  itemCount: number;
  total: number;
  paymentMethod: string;
  status: string;
  detailHref: string;
  createdAt: Date;
}

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "💰 現金", JKOPAY: "🟢 街口", LINEPAY: "💚 LINE Pay",
  CARD: "💳 信用卡", TRANSFER: "🏦 轉帳",
  // PaymentLink methods
  Credit: "💳 信用卡", ATM: "🏦 ATM", CVS: "🏪 超商",
};

export default async function AllSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; channel?: Channel }>;
}) {
  const sp = await searchParams;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const fromDate = sp.from ? new Date(sp.from) : new Date(Date.now() - 7 * 24 * 3600_000);
  const toDate = sp.to ? new Date(sp.to) : new Date();

  const includePos = !sp.channel || sp.channel === "POS";
  const includeOnline = !sp.channel || sp.channel === "ONLINE";

  const [posSales, onlineLinks] = await Promise.all([
    includePos ? prisma.sale.findMany({
      where: { createdAt: { gte: fromDate, lte: toDate }, paymentStatus: "PAID" },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { staff: true, _count: { select: { items: true } } },
    }) : Promise.resolve([]),
    includeOnline ? prisma.paymentLink.findMany({
      where: { createdAt: { gte: fromDate, lte: toDate }, status: "PAID" },
      orderBy: { createdAt: "desc" },
      take: 200,
    }) : Promise.resolve([]),
  ]);

  const rows: UnifiedRow[] = [
    ...posSales.map(s => ({
      channel: "POS" as Channel,
      id: s.id,
      number: s.saleNumber,
      customerName: s.customerName || "—",
      customerPhone: s.customerPhone || "",
      itemCount: s._count.items,
      total: s.total,
      paymentMethod: s.paymentMethod,
      status: s.paymentStatus,
      detailHref: `/pos/sales/${s.id}`,
      createdAt: s.createdAt,
    })),
    ...onlineLinks.map(l => ({
      channel: "ONLINE" as Channel,
      id: l.id,
      number: l.token.slice(0, 12).toUpperCase(),
      customerName: l.customerName || "—",
      customerPhone: l.customerPhone || "",
      itemCount: 1,
      total: l.amount,
      paymentMethod: l.paymentMethod || "—",
      status: l.status,
      detailHref: `/admin/orders`,
      createdAt: l.createdAt,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const totalRevenue = rows.reduce((s, r) => s + r.total, 0);
  const posCount = posSales.length;
  const onlineCount = onlineLinks.length;
  const posRevenue = posSales.reduce((s, r) => s + r.total, 0);
  const onlineRevenue = onlineLinks.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-[var(--gold)]">📊 統一銷售視圖</h1>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">店內 POS + 線上訂單一起看</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="總收入" value={`$${totalRevenue.toLocaleString()}`} highlight />
        <Card label="總筆數" value={(posCount + onlineCount).toString()} />
        <Card label="店內 POS" value={`${posCount} 筆 / $${posRevenue.toLocaleString()}`} />
        <Card label="線上" value={`${onlineCount} 筆 / $${onlineRevenue.toLocaleString()}`} />
      </div>

      {/* 過濾 */}
      <form className="flex flex-wrap gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-xs">
        <input type="date" name="from" defaultValue={fromDate.toISOString().slice(0, 10)} className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5" />
        <span className="self-center">~</span>
        <input type="date" name="to" defaultValue={toDate.toISOString().slice(0, 10)} className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5" />
        <select name="channel" defaultValue={sp.channel || ""} className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5">
          <option value="">店內 + 線上</option>
          <option value="POS">僅店內 POS</option>
          <option value="ONLINE">僅線上</option>
        </select>
        <button className="btn-gold rounded-full px-3 py-1.5 text-xs">套用</button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-elevated)] text-xs text-[var(--fg-muted)]">
            <tr>
              <th className="p-3 text-left font-normal">時間</th>
              <th className="p-3 text-left font-normal">通路</th>
              <th className="p-3 text-left font-normal">單號</th>
              <th className="p-3 text-left font-normal">客戶</th>
              <th className="p-3 text-right font-normal">品項</th>
              <th className="p-3 text-right font-normal">金額</th>
              <th className="p-3 text-left font-normal">付款</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.channel}-${r.id}`} className="border-t border-[var(--border)]">
                <td className="p-3 text-xs text-[var(--fg-muted)]">{r.createdAt.toLocaleString("zh-TW", { hour12: false, dateStyle: "short", timeStyle: "short" })}</td>
                <td className="p-3 text-xs">
                  <span className={`rounded px-2 py-0.5 ${r.channel === "POS" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}`}>
                    {r.channel === "POS" ? "🏬 店內" : "🌐 線上"}
                  </span>
                </td>
                <td className="p-3 font-mono text-[var(--gold)]">{r.number}</td>
                <td className="p-3">{r.customerName}<br /><span className="text-[10px] text-[var(--fg-muted)]">{r.customerPhone}</span></td>
                <td className="p-3 text-right text-xs">{r.itemCount}</td>
                <td className="p-3 text-right font-mono">${r.total.toLocaleString()}</td>
                <td className="p-3 text-xs">{PAYMENT_LABEL[r.paymentMethod] || r.paymentMethod}</td>
                <td className="p-3"><Link href={r.detailHref} target="_blank" className="text-xs text-[var(--gold)] hover:underline">→</Link></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="p-12 text-center text-sm text-[var(--fg-muted)]">此區間無交易</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? "border-[var(--gold)]/40 bg-[var(--gold)]/10" : "border-[var(--border)] bg-[var(--bg-elevated)]"}`}>
      <div className="text-xs text-[var(--fg-muted)]">{label}</div>
      <div className="mt-1 font-serif text-2xl text-[var(--gold)]">{value}</div>
    </div>
  );
}

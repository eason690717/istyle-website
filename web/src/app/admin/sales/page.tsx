import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "💰 現金", JKOPAY: "🟢 街口", LINEPAY: "💚 LINE Pay", CARD: "💳 信用卡", TRANSFER: "🏦 轉帳",
};

export default async function AdminSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; staff?: string; method?: string }>;
}) {
  const sp = await searchParams;

  // 預設今日
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const fromDate = sp.from ? new Date(sp.from) : today;
  const toDate = sp.to ? new Date(sp.to) : new Date();

  const where = {
    createdAt: { gte: fromDate, lte: toDate },
    ...(sp.staff ? { staffId: Number(sp.staff) } : {}),
    ...(sp.method ? { paymentMethod: sp.method } : {}),
  };

  const [sales, totalRevenue, paidCount, voidCount, byMethod, staffMembers] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { staff: true, _count: { select: { items: true } } },
    }),
    prisma.sale.aggregate({
      where: { ...where, paymentStatus: "PAID" },
      _sum: { total: true },
    }),
    prisma.sale.count({ where: { ...where, paymentStatus: "PAID" } }),
    prisma.sale.count({ where: { ...where, paymentStatus: "VOID" } }),
    prisma.sale.groupBy({
      by: ["paymentMethod"],
      where: { ...where, paymentStatus: "PAID" },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.staffMember.findMany({ orderBy: { code: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-[var(--gold)]">💰 交易紀錄</h1>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">POS 結帳台 + 線上訂單統一檢視</p>
        </div>
        <Link href="/pos" target="_blank" className="btn-gold rounded-full px-4 py-2 text-sm">→ 開 POS</Link>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="總收入" value={`$${(totalRevenue._sum.total || 0).toLocaleString()}`} highlight />
        <Card label="完成交易" value={paidCount.toString()} />
        <Card label="作廢交易" value={voidCount.toString()} />
        <Card label="平均客單" value={paidCount > 0 ? `$${Math.round((totalRevenue._sum.total || 0) / paidCount).toLocaleString()}` : "—"} />
      </div>

      {/* 付款方式分析 */}
      {byMethod.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
          <h3 className="mb-2 font-serif text-sm text-[var(--gold)]">付款方式</h3>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {byMethod.map(m => (
              <div key={m.paymentMethod} className="rounded border border-[var(--border)] p-2 text-center">
                <div className="text-xs">{PAYMENT_LABEL[m.paymentMethod] || m.paymentMethod}</div>
                <div className="mt-1 font-mono text-sm text-[var(--gold)]">${(m._sum.total || 0).toLocaleString()}</div>
                <div className="text-[10px] text-[var(--fg-muted)]">{m._count._all} 筆</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 過濾器 */}
      <form className="flex flex-wrap gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-xs">
        <input type="date" name="from" defaultValue={fromDate.toISOString().slice(0, 10)} className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5" />
        <span className="self-center text-[var(--fg-muted)]">~</span>
        <input type="date" name="to" defaultValue={toDate.toISOString().slice(0, 10)} className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5" />
        <select name="staff" defaultValue={sp.staff || ""} className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5">
          <option value="">全部店員</option>
          {staffMembers.map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
        </select>
        <select name="method" defaultValue={sp.method || ""} className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5">
          <option value="">全部付款</option>
          <option value="CASH">現金</option>
          <option value="JKOPAY">街口</option>
          <option value="LINEPAY">LINE Pay</option>
          <option value="CARD">信用卡</option>
          <option value="TRANSFER">轉帳</option>
        </select>
        <button type="submit" className="btn-gold rounded-full px-3 py-1.5 text-xs">套用</button>
      </form>

      {/* 列表 */}
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-elevated)] text-xs text-[var(--fg-muted)]">
            <tr>
              <th className="p-3 text-left font-normal">時間</th>
              <th className="p-3 text-left font-normal">單號</th>
              <th className="p-3 text-left font-normal">店員</th>
              <th className="p-3 text-right font-normal">品項</th>
              <th className="p-3 text-right font-normal">金額</th>
              <th className="p-3 text-left font-normal">付款</th>
              <th className="p-3 text-left font-normal">狀態</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {sales.map(s => (
              <tr key={s.id} className={`border-t border-[var(--border)] ${s.paymentStatus === "VOID" ? "opacity-50" : ""}`}>
                <td className="p-3 text-xs text-[var(--fg-muted)]">{new Date(s.createdAt).toLocaleString("zh-TW", { hour12: false, dateStyle: "short", timeStyle: "short" })}</td>
                <td className="p-3 font-mono text-[var(--gold)]">{s.saleNumber}</td>
                <td className="p-3">{s.staff.name}<span className="ml-1 text-[10px] text-[var(--fg-muted)]">({s.staff.code})</span></td>
                <td className="p-3 text-right text-xs text-[var(--fg-muted)]">{s._count.items}</td>
                <td className="p-3 text-right font-mono">${s.total.toLocaleString()}</td>
                <td className="p-3 text-xs">{PAYMENT_LABEL[s.paymentMethod] || s.paymentMethod}</td>
                <td className="p-3 text-xs">
                  {s.paymentStatus === "VOID" ? <span className="text-red-400">已作廢</span> : <span className="text-green-400">已付款</span>}
                </td>
                <td className="p-3">
                  <Link href={`/pos/sales/${s.id}`} target="_blank" className="text-xs text-[var(--gold)] hover:underline">收據</Link>
                </td>
              </tr>
            ))}
            {sales.length === 0 && <tr><td colSpan={8} className="p-12 text-center text-sm text-[var(--fg-muted)]">此區間無交易</td></tr>}
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

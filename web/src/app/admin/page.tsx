import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  // 平行抓統計
  const [
    pendingBookings, allBookings,
    pendingPayments, paidPayments, paidAmount,
    brandCount, modelCount, priceCount,
    recycleCount, lastRecycleLog,
  ] = await Promise.all([
    prisma.booking.count({ where: { status: "PENDING" } }).catch(() => 0),
    prisma.booking.count().catch(() => 0),
    prisma.paymentLink.count({ where: { status: "PENDING" } }).catch(() => 0),
    prisma.paymentLink.count({ where: { status: "PAID" } }).catch(() => 0),
    prisma.paymentLink.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }).then(r => r._sum.amount || 0).catch(() => 0),
    prisma.brand.count().catch(() => 0),
    prisma.deviceModel.count().catch(() => 0),
    prisma.repairPrice.count().catch(() => 0),
    prisma.recyclePrice.count().catch(() => 0),
    prisma.recycleScrapeLog.findFirst({ orderBy: { finishedAt: "desc" } }).catch(() => null),
  ]);

  const recentBookings = await prisma.booking.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
  }).catch(() => []);

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-2xl text-[var(--gold)]">儀表板</h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="待處理預約" value={pendingBookings} hint={`累計 ${allBookings}`} accent />
        <StatCard label="待付款連結" value={pendingPayments} hint={`已收款 ${paidPayments} 筆`} accent />
        <StatCard label="累計收款" value={`NT$ ${paidAmount.toLocaleString()}`} hint="所有付款連結" accent />
        <StatCard
          label="二手回收機型"
          value={recycleCount}
          hint={lastRecycleLog ? `更新 ${new Date(lastRecycleLog.finishedAt).toLocaleString("zh-TW")}` : "未抓取"}
        />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-lg text-[var(--gold)]">最近預約</h2>
          <Link href="/admin/bookings" className="text-xs text-[var(--gold-soft)] hover:text-[var(--gold)]">查看全部 →</Link>
        </div>
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          {recentBookings.length === 0 ? (
            <div className="bg-[var(--bg-elevated)] p-8 text-center text-sm text-[var(--fg-muted)]">尚無預約</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-soft)] text-left text-xs text-[var(--gold)]">
                <tr>
                  <th className="px-3 py-2">編號</th>
                  <th className="px-3 py-2">服務</th>
                  <th className="px-3 py-2">客戶</th>
                  <th className="px-3 py-2">電話</th>
                  <th className="px-3 py-2">時間</th>
                  <th className="px-3 py-2">狀態</th>
                  <th className="px-3 py-2">建立時間</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {recentBookings.map((b, i) => (
                  <tr key={b.id} className={i % 2 === 0 ? "bg-[#141414]" : "bg-[#181818]"}>
                    <td className="px-3 py-2 font-mono text-xs">{b.bookingNumber}</td>
                    <td className="px-3 py-2">{SERVICE_LABEL[b.serviceType] || b.serviceType}</td>
                    <td className="px-3 py-2">{b.contactName}</td>
                    <td className="px-3 py-2 font-mono text-xs">{b.contactPhone}</td>
                    <td className="px-3 py-2 text-xs">
                      {new Date(b.scheduledDate).toLocaleDateString("zh-TW")} {b.scheduledTime}
                    </td>
                    <td className="px-3 py-2"><StatusBadge status={b.status} /></td>
                    <td className="px-3 py-2 text-xs text-[var(--fg-muted)]">
                      {new Date(b.createdAt).toLocaleString("zh-TW")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

const SERVICE_LABEL: Record<string, string> = {
  REPAIR: "維修",
  RECYCLE: "回收估價",
  DIAGNOSTIC: "檢測",
  COURSE_INQUIRY: "課程",
  GENERAL: "諮詢",
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "待處理", cls: "bg-yellow-500/20 text-yellow-300" },
  CONFIRMED: { label: "已確認", cls: "bg-blue-500/20 text-blue-300" },
  COMPLETED: { label: "完成", cls: "bg-green-500/20 text-green-300" },
  CANCELLED: { label: "取消", cls: "bg-zinc-500/20 text-zinc-300" },
  NO_SHOW: { label: "未到", cls: "bg-red-500/20 text-red-300" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABEL[status] || { label: status, cls: "bg-zinc-500/20 text-zinc-300" };
  return <span className={`rounded px-2 py-0.5 text-xs ${s.cls}`}>{s.label}</span>;
}

function StatCard({ label, value, hint, accent }: { label: string; value: number | string; hint?: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${accent ? "border-[var(--gold)] bg-[#1a1410]" : "border-[var(--border)] bg-[var(--bg-elevated)]"}`}>
      <div className="text-xs text-[var(--fg-muted)]">{label}</div>
      <div className="mt-2 font-serif text-2xl text-[var(--gold)]">{value}</div>
      {hint && <div className="mt-1 text-[10px] text-[var(--fg-muted)]">{hint}</div>}
    </div>
  );
}

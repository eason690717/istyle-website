import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  RECEIVED: "📦 已收件",
  DIAGNOSING: "🔍 檢測中",
  AWAITING_PARTS: "📥 等候零件",
  REPAIRING: "🔧 維修中",
  DONE: "✅ 已完工",
  PICKED_UP: "🎉 已取件",
  CANCELLED: "❌ 取消",
};

export default async function AdminRepairsPage() {
  const tickets = await prisma.repairTicket.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const counts = await prisma.repairTicket.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const countMap = Object.fromEntries(counts.map(c => [c.status, c._count._all]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-[var(--gold)]">🔧 維修單</h1>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">客戶可在 /repair/lookup 查詢進度</p>
        </div>
        <Link
          href="/admin/repairs/new"
          className="btn-gold rounded-full px-4 py-2 text-sm"
        >
          + 新增維修單
        </Link>
      </div>

      {/* 狀態 KPI */}
      <div className="grid grid-cols-3 gap-2 md:grid-cols-7">
        {Object.entries(STATUS_LABEL).map(([s, label]) => (
          <div key={s} className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-center">
            <div className="text-2xl font-serif text-[var(--gold)]">{countMap[s] || 0}</div>
            <div className="mt-1 text-[10px] text-[var(--fg-muted)]">{label}</div>
          </div>
        ))}
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-12 text-center text-sm text-[var(--fg-muted)]">
          尚無維修單，按右上「+ 新增維修單」建立第一筆
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-elevated)] text-xs text-[var(--fg-muted)]">
              <tr>
                <th className="p-3 text-left font-normal">單號</th>
                <th className="p-3 text-left font-normal">客戶</th>
                <th className="p-3 text-left font-normal">裝置</th>
                <th className="p-3 text-left font-normal">問題</th>
                <th className="p-3 text-left font-normal">狀態</th>
                <th className="p-3 text-left font-normal">收件</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.id} className="border-t border-[var(--border)] hover:bg-[var(--bg-elevated)]/50">
                  <td className="p-3 font-mono text-[var(--gold)]">{t.ticketNumber}</td>
                  <td className="p-3">{t.customerName}<br /><span className="text-[10px] text-[var(--fg-muted)]">末 4: {t.phoneLast4}</span></td>
                  <td className="p-3">{t.deviceModel}</td>
                  <td className="p-3 max-w-[200px] truncate text-xs text-[var(--fg-muted)]">{t.issueDescription}</td>
                  <td className="p-3 text-xs">{STATUS_LABEL[t.status] || t.status}</td>
                  <td className="p-3 text-xs text-[var(--fg-muted)]">{new Date(t.createdAt).toLocaleString("zh-TW", { hour12: false, dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="p-3"><Link href={`/admin/repairs/${t.id}`} className="text-xs text-[var(--gold)] hover:underline">編輯</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// 訂單管理 — 顯示 PaymentLink（線上訂單真正的存放點）
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_INFO: Record<string, { label: string; bg: string; text: string }> = {
  PENDING: { label: "待付款", bg: "bg-yellow-500/20", text: "text-yellow-300" },
  PAID: { label: "已付款", bg: "bg-green-500/20", text: "text-green-300" },
  EXPIRED: { label: "已過期", bg: "bg-zinc-500/20", text: "text-zinc-400" },
  CANCELLED: { label: "已取消", bg: "bg-red-500/20", text: "text-red-400" },
};

const PAYMENT_LABEL: Record<string, string> = {
  Credit: "信用卡", ATM: "ATM", CVS: "超商代碼", BARCODE: "超商條碼",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const filter = sp.status;

  const where = filter ? { status: filter } : {};

  const [links, counts] = await Promise.all([
    prisma.paymentLink.findMany({
      where,
      take: 100,
      orderBy: { createdAt: "desc" },
    }).catch(() => []),
    prisma.paymentLink.groupBy({
      by: ["status"],
      _count: { _all: true },
    }).catch(() => []),
  ]);

  const cm: Record<string, number> = {};
  let totalCount = 0;
  for (const c of counts) {
    cm[c.status] = c._count._all;
    totalCount += c._count._all;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-[var(--gold)]">📦 線上訂單</h1>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">付款連結（綠界）— 線上下單統一在這裡</p>
      </div>

      {/* 狀態 tabs */}
      <div className="flex flex-wrap gap-2">
        <FilterTab href="/admin/orders" label="全部" count={totalCount} active={!filter} />
        <FilterTab href="/admin/orders?status=PENDING" label="待付款" count={cm.PENDING || 0} active={filter === "PENDING"} />
        <FilterTab href="/admin/orders?status=PAID" label="已付款" count={cm.PAID || 0} active={filter === "PAID"} />
        <FilterTab href="/admin/orders?status=EXPIRED" label="已過期" count={cm.EXPIRED || 0} active={filter === "EXPIRED"} />
        <FilterTab href="/admin/orders?status=CANCELLED" label="已取消" count={cm.CANCELLED || 0} active={filter === "CANCELLED"} />
      </div>

      {links.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[var(--border)] p-12 text-center">
          <div className="text-5xl">📭</div>
          <p className="mt-3 text-sm text-[var(--fg-muted)]">{filter ? "此狀態無訂單" : "尚無線上訂單"}</p>
          <p className="mt-1 text-[10px] text-[var(--fg-muted)]">線上下單會自動列在這裡，店內結帳請看「💰 POS 交易」</p>
        </div>
      ) : (
        <div className="space-y-2">
          {links.map(l => {
            const s = STATUS_INFO[l.status] || STATUS_INFO.PENDING;
            return (
              <Link
                key={l.id}
                href={`/pay/${l.token}`}
                target="_blank"
                className="block rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4 hover:border-[var(--gold)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${s.bg} ${s.text}`}>{s.label}</span>
                      <span className="font-mono text-xs text-[var(--gold)]">{l.token.slice(0, 12).toUpperCase()}</span>
                      {l.invoiceNumber && <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] text-purple-300">📄 {l.invoiceNumber}</span>}
                      {l.shippedAt && <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-300">📦 已寄出</span>}
                    </div>
                    <div className="mt-1.5 truncate text-sm">{l.itemName}</div>
                    {l.description && <div className="mt-0.5 truncate text-xs text-[var(--fg-muted)]">{l.description}</div>}
                    <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-[var(--fg-muted)]">
                      {l.customerName && <span>👤 {l.customerName}</span>}
                      {l.customerPhone && <span className="font-mono">{l.customerPhone}</span>}
                      {l.paymentMethod && <span>💳 {PAYMENT_LABEL[l.paymentMethod] || l.paymentMethod}</span>}
                      <span className="ml-auto">{new Date(l.createdAt).toLocaleString("zh-TW", { hour12: false, dateStyle: "short", timeStyle: "short" })}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-serif text-xl text-[var(--gold)]">${l.amount.toLocaleString()}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterTab({ href, label, count, active }: { href: string; label: string; count: number; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs transition ${active ? "bg-[var(--gold)] text-black" : "border border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--gold)]"}`}
    >
      <span>{label}</span>
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-black/20" : "bg-[var(--bg)]"}`}>{count}</span>
    </Link>
  );
}

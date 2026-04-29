import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const [
    pendingBookings, allBookings,
    pendingPayments, paidPayments, paidAmount,
    recycleCount, lastRecycleLog,
    todaySalesCount, todayRevenue,
    pendingShipping, lowStockCount,
    pendingRepairs, totalRepairs,
    productCount, customerCount,
    recentBookings, recentSales,
  ] = await Promise.all([
    prisma.booking.count({ where: { status: "PENDING" } }).catch(() => 0),
    prisma.booking.count().catch(() => 0),
    prisma.paymentLink.count({ where: { status: "PENDING" } }).catch(() => 0),
    prisma.paymentLink.count({ where: { status: "PAID" } }).catch(() => 0),
    prisma.paymentLink.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }).then(r => r._sum.amount || 0).catch(() => 0),
    prisma.recyclePrice.count().catch(() => 0),
    prisma.recycleScrapeLog.findFirst({ orderBy: { finishedAt: "desc" } }).catch(() => null),
    prisma.sale.count({ where: { createdAt: { gte: today }, paymentStatus: "PAID" } }).catch(() => 0),
    prisma.sale.aggregate({ where: { createdAt: { gte: today }, paymentStatus: "PAID" }, _sum: { total: true } }).then(r => r._sum.total || 0).catch(() => 0),
    prisma.paymentLink.count({ where: { status: "PAID", shippedAt: null } }).catch(() => 0),
    prisma.product.count({ where: { isActive: true, stock: { lte: 3 } } }).catch(() => 0),
    prisma.repairTicket.count({ where: { status: { notIn: ["PICKED_UP", "CANCELLED"] } } }).catch(() => 0),
    prisma.repairTicket.count().catch(() => 0),
    prisma.product.count({ where: { isActive: true } }).catch(() => 0),
    prisma.sale.findMany({ select: { customerPhone: true }, where: { customerPhone: { not: null } }, distinct: ["customerPhone"] }).then(rs => rs.length).catch(() => 0),
    prisma.booking.findMany({ take: 5, orderBy: { createdAt: "desc" } }).catch(() => []),
    prisma.sale.findMany({ take: 5, orderBy: { createdAt: "desc" }, where: { paymentStatus: "PAID" }, include: { staff: true, _count: { select: { items: true } } } }).catch(() => []),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-2xl text-[var(--gold)]">儀表板</h1>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">{new Date().toLocaleString("zh-TW", { dateStyle: "long", timeStyle: "short", hour12: false })}</p>
        </div>
        <Link href="/pos" target="_blank" className="hidden md:inline-block btn-gold rounded-full px-4 py-2 text-sm">→ 開 POS 結帳台</Link>
      </div>

      {/* 今日 KPI（最重要） */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-400">📅 今日</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="今日業績" value={`$${todayRevenue.toLocaleString()}`} hint={`${todaySalesCount} 筆交易`} color="emerald" href="/admin/sales/report" />
          <KpiCard label="待處理預約" value={pendingBookings.toString()} hint={`累計 ${allBookings}`} color="amber" href="/admin/bookings" />
          <KpiCard label="待付款連結" value={pendingPayments.toString()} hint={`已收款 ${paidPayments} 筆`} color="purple" href="/admin/payment-links" />
          <KpiCard label="待出貨訂單" value={pendingShipping.toString()} hint="點擊處理" color="blue" href="/admin/shipping" warn={pendingShipping > 0} />
        </div>
      </section>

      {/* 警示區（有事才顯示） */}
      {(lowStockCount > 0 || pendingShipping > 0 || pendingRepairs > 5) && (
        <section className="rounded-lg border border-orange-500/40 bg-orange-500/5 p-4">
          <h3 className="mb-2 text-sm font-medium text-orange-400">⚠️ 待處理</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            {lowStockCount > 0 && (
              <Link href="/admin/inventory" className="rounded-full bg-orange-500/20 px-3 py-1.5 text-orange-300 hover:bg-orange-500/30">
                {lowStockCount} 個商品低庫存（≤3）→ 進貨
              </Link>
            )}
            {pendingShipping > 0 && (
              <Link href="/admin/shipping" className="rounded-full bg-blue-500/20 px-3 py-1.5 text-blue-300 hover:bg-blue-500/30">
                {pendingShipping} 張線上訂單待出貨
              </Link>
            )}
            {pendingRepairs > 5 && (
              <Link href="/admin/repairs" className="rounded-full bg-purple-500/20 px-3 py-1.5 text-purple-300 hover:bg-purple-500/30">
                {pendingRepairs} 張維修進行中
              </Link>
            )}
          </div>
        </section>
      )}

      {/* 全域 KPI */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-400">📊 全店概況</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <SmallStat label="商品數" value={productCount.toString()} icon="📦" />
          <SmallStat label="維修進行中" value={pendingRepairs.toString()} icon="🔧" />
          <SmallStat label="維修總計" value={totalRepairs.toString()} icon="📋" />
          <SmallStat label="客戶數" value={customerCount.toString()} icon="👤" />
          <SmallStat label="累計收款" value={`$${paidAmount.toLocaleString()}`} icon="💰" />
          <SmallStat label="二手機型" value={recycleCount.toString()} icon="♻️" />
        </div>
      </section>

      {/* 兩欄並排：最近預約 + 最近銷售 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-lg text-[var(--gold)]">📅 最近預約</h2>
            <Link href="/admin/bookings" className="text-xs text-[var(--gold-soft)] hover:text-[var(--gold)]">全部 →</Link>
          </div>
          {recentBookings.length === 0 ? (
            <EmptyState message="尚無預約" />
          ) : (
            <div className="overflow-hidden rounded-lg border border-[var(--border)]">
              {recentBookings.map(b => (
                <Link
                  key={b.id}
                  href="/admin/bookings"
                  className="flex items-center justify-between border-b border-[var(--border)] p-3 last:border-0 hover:bg-[var(--bg-elevated)]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{b.contactName}</span>
                      <span className="text-xs text-[var(--fg-muted)]">{b.contactPhone}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--fg-muted)]">
                      {SERVICE_LABEL[b.serviceType] || b.serviceType} · {new Date(b.scheduledDate).toLocaleDateString("zh-TW")} {b.scheduledTime}
                    </div>
                  </div>
                  <StatusBadge status={b.status} />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-lg text-[var(--gold)]">💰 最近 POS 交易</h2>
            <Link href="/admin/sales" className="text-xs text-[var(--gold-soft)] hover:text-[var(--gold)]">全部 →</Link>
          </div>
          {recentSales.length === 0 ? (
            <EmptyState message="今日尚無 POS 交易" cta={{ href: "/pos", label: "→ 開 POS 結帳台", external: true }} />
          ) : (
            <div className="overflow-hidden rounded-lg border border-[var(--border)]">
              {recentSales.map(s => (
                <Link
                  key={s.id}
                  href={`/pos/sales/${s.id}`}
                  target="_blank"
                  className="flex items-center justify-between border-b border-[var(--border)] p-3 last:border-0 hover:bg-[var(--bg-elevated)]"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-mono text-[var(--gold)]">{s.saleNumber}</div>
                    <div className="mt-0.5 text-xs text-[var(--fg-muted)]">
                      {s.staff.name} · {s._count.items} 件 · {new Date(s.createdAt).toLocaleString("zh-TW", { hour12: false, dateStyle: "short", timeStyle: "short" })}
                    </div>
                  </div>
                  <span className="ml-2 shrink-0 font-mono text-base text-[var(--gold-bright)]">${s.total.toLocaleString()}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 維修系統最後更新 */}
      {lastRecycleLog && (
        <p className="text-center text-[10px] text-[var(--fg-muted)]">
          二手回收價最後更新：{new Date(lastRecycleLog.finishedAt).toLocaleString("zh-TW", { hour12: false })}
        </p>
      )}
    </div>
  );
}

const SERVICE_LABEL: Record<string, string> = {
  REPAIR: "維修", RECYCLE: "回收估價", DIAGNOSTIC: "檢測", COURSE_INQUIRY: "課程", GENERAL: "諮詢",
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
  return <span className={`shrink-0 rounded px-2 py-0.5 text-xs ${s.cls}`}>{s.label}</span>;
}

const COLOR_MAP: Record<string, string> = {
  emerald: "from-emerald-500/20 to-emerald-700/10 border-emerald-500/40 text-emerald-300",
  amber: "from-amber-500/20 to-amber-700/10 border-amber-500/40 text-amber-300",
  purple: "from-purple-500/20 to-purple-700/10 border-purple-500/40 text-purple-300",
  blue: "from-blue-500/20 to-blue-700/10 border-blue-500/40 text-blue-300",
};

function KpiCard({ label, value, hint, color, href, warn }: { label: string; value: string; hint: string; color: string; href: string; warn?: boolean }) {
  const c = COLOR_MAP[color] || COLOR_MAP.emerald;
  return (
    <Link href={href} className={`block rounded-2xl border bg-gradient-to-br ${c} p-4 transition hover:shadow-lg ${warn ? "ring-2 ring-orange-500/40 ring-offset-2 ring-offset-[var(--bg)]" : ""}`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="mt-1 font-serif text-2xl font-bold">{value}</div>
      <div className="mt-1 text-[10px] opacity-70">{hint}</div>
    </Link>
  );
}

function SmallStat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
      <div className="text-2xl">{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] text-[var(--fg-muted)]">{label}</div>
        <div className="font-serif text-base text-[var(--gold)] truncate">{value}</div>
      </div>
    </div>
  );
}

function EmptyState({ message, cta }: { message: string; cta?: { href: string; label: string; external?: boolean } }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-8 text-center">
      <p className="text-sm text-[var(--fg-muted)]">{message}</p>
      {cta && (
        cta.external ? (
          <a href={cta.href} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block rounded-full border border-[var(--gold)]/40 px-4 py-2 text-xs text-[var(--gold)] hover:bg-[var(--gold)]/10">
            {cta.label}
          </a>
        ) : (
          <Link href={cta.href} className="mt-3 inline-block rounded-full border border-[var(--gold)]/40 px-4 py-2 text-xs text-[var(--gold)] hover:bg-[var(--gold)]/10">
            {cta.label}
          </Link>
        )
      )}
    </div>
  );
}

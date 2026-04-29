// 手機快速操作主頁 — 大按鈕觸控優先，給老闆/店員打開就上手
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { COOKIE_NAME, verifySession } from "@/lib/admin-auth";
import { POS_COOKIE, verifyStaffSession } from "@/lib/pos-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "i時代 行動操作", robots: { index: false, follow: false } };

export default async function MobileHomePage() {
  const cs = await cookies();
  const adminTok = cs.get(COOKIE_NAME)?.value;
  const staffTok = cs.get(POS_COOKIE)?.value;
  const [adminOk, staff] = await Promise.all([
    adminTok ? verifySession(adminTok) : Promise.resolve(false),
    verifyStaffSession(staffTok),
  ]);

  if (!adminOk && !staff) redirect("/admin/login");

  // 今日 KPI
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [todaySales, todayRevenue, lowStock, pendingShipping] = await Promise.all([
    prisma.sale.count({ where: { createdAt: { gte: today }, paymentStatus: "PAID" } }),
    prisma.sale.aggregate({ where: { createdAt: { gte: today }, paymentStatus: "PAID" }, _sum: { total: true } }),
    prisma.product.count({ where: { isActive: true, stock: { lte: 3 } } }),
    prisma.paymentLink.count({ where: { status: "PAID", shippedAt: null } }),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d0908] via-[#1a1410] to-[#0d0908] p-4 pb-12">
      <div className="mx-auto max-w-md space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-xl text-[var(--gold)]">i時代 行動工作站</h1>
            <p className="text-[10px] text-[var(--fg-muted)]">
              {staff ? `店員：${staff.name}` : adminOk ? "後台管理員" : ""}
            </p>
          </div>
          <Link href="/admin" className="rounded-full border border-[var(--border)] px-3 py-1 text-[10px] text-[var(--fg-muted)]">
            完整後台
          </Link>
        </div>

        {/* 今日 KPI 小卡 */}
        <div className="grid grid-cols-2 gap-2">
          <Mini label="今日業績" value={`$${(todayRevenue._sum.total || 0).toLocaleString()}`} sub={`${todaySales} 筆`} />
          <Mini label="今日交易" value={todaySales.toString()} sub="筆數" />
        </div>

        {/* 主要操作 — 兩欄大按鈕 */}
        <div className="grid grid-cols-2 gap-3">
          <BigButton href="/pos" emoji="🛒" label="結帳" desc="POS 收銀" color="from-[var(--gold)] to-[var(--gold-bright)] text-black" />
          <BigButton href="/admin/inventory/receive" emoji="📥" label="進貨" desc="掃條碼 / 語音" color="from-green-600 to-green-700 text-white" />
          <BigButton href="/admin/inventory/count" emoji="📊" label="盤點" desc="搜貨 / 改數" color="from-blue-600 to-blue-700 text-white" />
          <BigButton href="/admin/serials" emoji="📱" label="查 IMEI" desc="保固對照" color="from-purple-600 to-purple-700 text-white" />
        </div>

        {/* 次要 */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <SmallBtn href="/admin/repairs" emoji="🔧" label="維修單" />
          <SmallBtn href="/admin/customers" emoji="👤" label="客戶" />
          <SmallBtn href="/admin/sales/report" emoji="📅" label="日結報表" />
        </div>

        {/* 警示 */}
        {(lowStock > 0 || pendingShipping > 0) && (
          <div className="space-y-2">
            {lowStock > 0 && (
              <Link href="/admin/inventory" className="flex items-center justify-between rounded-lg border border-orange-500/40 bg-orange-500/10 p-3">
                <span className="text-sm text-orange-400">⚠️ {lowStock} 個商品庫存 ≤ 3</span>
                <span className="text-xs">→</span>
              </Link>
            )}
            {pendingShipping > 0 && (
              <Link href="/admin/shipping" className="flex items-center justify-between rounded-lg border border-blue-500/40 bg-blue-500/10 p-3">
                <span className="text-sm text-blue-400">📦 {pendingShipping} 張線上訂單待出貨</span>
                <span className="text-xs">→</span>
              </Link>
            )}
          </div>
        )}

        <div className="pt-4 text-center text-[10px] text-[var(--fg-muted)]">
          將此頁加到主畫面（瀏覽器選單→加到主畫面）就像 App 一樣用
        </div>
      </div>
    </div>
  );
}

function BigButton({ href, emoji, label, desc, color }: { href: string; emoji: string; label: string; desc: string; color: string }) {
  return (
    <Link href={href} className={`flex aspect-square flex-col items-center justify-center rounded-2xl bg-gradient-to-br ${color} p-4 shadow-lg active:scale-95 transition`}>
      <div className="text-4xl">{emoji}</div>
      <div className="mt-2 font-serif text-lg font-bold">{label}</div>
      <div className="mt-0.5 text-[10px] opacity-80">{desc}</div>
    </Link>
  );
}

function SmallBtn({ href, emoji, label }: { href: string; emoji: string; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 active:scale-95 transition">
      <div className="text-2xl">{emoji}</div>
      <div className="mt-1 text-[10px] text-[var(--fg-muted)]">{label}</div>
    </Link>
  );
}

function Mini({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
      <div className="text-[10px] text-[var(--fg-muted)]">{label}</div>
      <div className="mt-0.5 font-serif text-xl text-[var(--gold)]">{value}</div>
      <div className="text-[10px] text-[var(--fg-muted)]">{sub}</div>
    </div>
  );
}

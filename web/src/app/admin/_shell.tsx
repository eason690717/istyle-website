"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Admin nav 分組（最重要的擺最上、依工作流分類）
const NAV_GROUPS = [
  {
    title: "🏠 主畫面",
    items: [
      { href: "/admin", label: "儀表板" },
      { href: "/m", label: "📱 行動工作站" },
      { href: "/", label: "↗ 看前台", external: true },
    ],
  },
  {
    title: "🛒 銷售",
    items: [
      { href: "/pos", label: "💰 開 POS 結帳台", external: true },
      { href: "/admin/sales", label: "POS 交易" },
      { href: "/admin/sales/report", label: "📅 日結報表" },
      { href: "/admin/all-sales", label: "📊 全銷售（含線上）" },
      { href: "/admin/payment-links", label: "付款連結" },
      { href: "/admin/orders", label: "線上訂單" },
      { href: "/admin/shipping", label: "📦 出貨" },
    ],
  },
  {
    title: "📦 商品庫存",
    items: [
      { href: "/admin/products", label: "商品管理" },
      { href: "/admin/inventory", label: "庫存儀表板" },
      { href: "/admin/inventory/receive", label: "📥 進貨" },
      { href: "/admin/inventory/count", label: "📊 盤點" },
      { href: "/admin/inventory/import", label: "📑 CSV 批次" },
      { href: "/admin/inventory/movements", label: "異動紀錄" },
      { href: "/admin/serials", label: "📱 IMEI 序號" },
    ],
  },
  {
    title: "🔧 維修",
    items: [
      { href: "/admin/repairs", label: "維修單" },
      { href: "/admin/cases", label: "📋 案例集" },
      { href: "/admin/prices", label: "維修報價" },
      { href: "/admin/recycle", label: "二手回收價" },
    ],
  },
  {
    title: "👤 客戶 / 預約",
    items: [
      { href: "/admin/customers", label: "客戶資料庫" },
      { href: "/admin/bookings", label: "預約" },
    ],
  },
  {
    title: "⚙️ 系統",
    items: [
      { href: "/admin/staff", label: "👥 店員" },
      { href: "/admin/analytics", label: "📊 流量分析" },
      { href: "/admin/cron", label: "自動排程" },
      { href: "/admin/settings", label: "設定" },
      { href: "/admin/settings/printer", label: "🖨 印表機" },
    ],
  },
];

export function AdminShell({ children, logoutAction }: { children: React.ReactNode; logoutAction: () => Promise<void> }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function isActive(href: string): boolean {
    if (href === "/admin") return pathname === "/admin";
    if (href === "/" || href === "/pos" || href === "/m") return false;
    return pathname?.startsWith(href) || false;
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      {/* === 桌機側邊欄 === */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-elevated)]">
        <Link href="/admin" className="border-b border-[var(--border)] p-4 font-serif text-lg text-[var(--gold)]">
          i時代 後台
        </Link>
        <SidebarContent isActive={isActive} />
        <div className="border-t border-[var(--border)] p-3">
          <form action={logoutAction}>
            <button className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--fg-muted)] hover:border-red-500/50 hover:text-red-400" type="submit">
              登出
            </button>
          </form>
        </div>
      </aside>

      {/* === 主內容區 === */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 手機頂欄（漢堡） */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-elevated)] p-3 md:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] text-xl"
            aria-label="選單"
          >☰</button>
          <Link href="/admin" className="font-serif text-base text-[var(--gold)]">i時代 後台</Link>
          <Link href="/" className="text-xs text-[var(--fg-muted)]">↗ 前台</Link>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>

      {/* === 手機側拉抽屜 === */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setDrawerOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[var(--bg-elevated)] shadow-xl md:hidden">
            <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
              <span className="font-serif text-lg text-[var(--gold)]">i時代 後台</span>
              <button onClick={() => setDrawerOpen(false)} className="text-xl text-[var(--fg-muted)]">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto" onClick={(e) => {
              // 點到連結就收抽屜
              const t = e.target as HTMLElement;
              if (t.tagName === "A") setDrawerOpen(false);
            }}>
              <SidebarContent isActive={isActive} />
            </div>
            <div className="border-t border-[var(--border)] p-3">
              <form action={logoutAction}>
                <button className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--fg-muted)] hover:border-red-500/50 hover:text-red-400" type="submit">
                  登出
                </button>
              </form>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function SidebarContent({ isActive }: { isActive: (href: string) => boolean }) {
  return (
    <nav className="flex-1 overflow-y-auto p-3 text-sm">
      {NAV_GROUPS.map(group => (
        <div key={group.title} className="mb-4">
          <div className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-[var(--fg-muted)]">
            {group.title}
          </div>
          <div className="space-y-0.5">
            {group.items.map(item => {
              const active = isActive(item.href);
              const cls = `block rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-[var(--gold)]/15 font-medium text-[var(--gold)]"
                  : "text-[var(--fg)] hover:bg-[var(--bg)] hover:text-[var(--gold-bright)]"
              }`;
              if (item.external) {
                return <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" className={cls}>{item.label}</a>;
              }
              return <Link key={item.href} href={item.href} className={cls}>{item.label}</Link>;
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

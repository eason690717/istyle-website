"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// 每組有自己的色系（accent + 標題顏色 + active 背景）+ 每個 item 都配 icon 統一風格
type NavItem = { href: string; icon: string; label: string; external?: boolean };
type NavGroup = { title: string; icon: string; color: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    title: "主畫面",
    icon: "🏠",
    color: "amber",
    items: [
      { href: "/admin", icon: "📊", label: "儀表板" },
      { href: "/m", icon: "📱", label: "行動工作站", external: true },
      { href: "/", icon: "🌐", label: "看前台", external: true },
    ],
  },
  {
    title: "銷售",
    icon: "🛒",
    color: "emerald",
    items: [
      { href: "/pos", icon: "🏪", label: "開 POS 結帳台", external: true },
      { href: "/admin/sales", icon: "🧾", label: "POS 交易紀錄" },
      { href: "/admin/sales/report", icon: "📅", label: "日結報表" },
      { href: "/admin/all-sales", icon: "📈", label: "全銷售（含線上）" },
      { href: "/admin/payment-links", icon: "🔗", label: "付款連結" },
      { href: "/admin/orders", icon: "💳", label: "線上訂單" },
      { href: "/admin/shipping", icon: "🚚", label: "出貨" },
    ],
  },
  {
    title: "商品庫存",
    icon: "📦",
    color: "blue",
    items: [
      { href: "/admin/products", icon: "🛍️", label: "商品管理" },
      { href: "/admin/inventory", icon: "📊", label: "庫存儀表板" },
      { href: "/admin/inventory/receive", icon: "📥", label: "進貨" },
      { href: "/admin/inventory/count", icon: "🔢", label: "盤點" },
      { href: "/admin/inventory/import", icon: "📑", label: "CSV 批次匯入" },
      { href: "/admin/inventory/movements", icon: "📜", label: "異動紀錄" },
      { href: "/admin/serials", icon: "🏷️", label: "IMEI / 序號" },
    ],
  },
  {
    title: "維修",
    icon: "🔧",
    color: "orange",
    items: [
      { href: "/admin/repairs", icon: "🛠️", label: "維修單" },
      { href: "/admin/cases", icon: "📚", label: "案例集" },
      { href: "/admin/prices", icon: "💵", label: "維修報價" },
      { href: "/admin/recycle", icon: "♻️", label: "二手回收價" },
    ],
  },
  {
    title: "客戶 / 預約",
    icon: "👤",
    color: "purple",
    items: [
      { href: "/admin/customers", icon: "👥", label: "客戶資料庫" },
      { href: "/admin/bookings", icon: "📆", label: "預約" },
    ],
  },
  {
    title: "系統",
    icon: "⚙️",
    color: "slate",
    items: [
      { href: "/admin/staff", icon: "🧑", label: "店員" },
      { href: "/admin/analytics", icon: "📈", label: "流量分析" },
      { href: "/admin/cron", icon: "⏰", label: "自動排程" },
      { href: "/admin/settings", icon: "⚙️", label: "全站設定" },
      { href: "/admin/settings/printer", icon: "🖨️", label: "印表機" },
    ],
  },
];

// 色系對應（每組獨立風格）
const COLOR_STYLES: Record<string, { titleText: string; titleBg: string; accentBar: string; activeBg: string; activeText: string; hoverText: string }> = {
  amber: {
    titleText: "text-amber-400",
    titleBg: "bg-amber-500/10",
    accentBar: "bg-amber-500",
    activeBg: "bg-amber-500/20 border-amber-500/40",
    activeText: "text-amber-300",
    hoverText: "hover:text-amber-300",
  },
  emerald: {
    titleText: "text-emerald-400",
    titleBg: "bg-emerald-500/10",
    accentBar: "bg-emerald-500",
    activeBg: "bg-emerald-500/20 border-emerald-500/40",
    activeText: "text-emerald-300",
    hoverText: "hover:text-emerald-300",
  },
  blue: {
    titleText: "text-blue-400",
    titleBg: "bg-blue-500/10",
    accentBar: "bg-blue-500",
    activeBg: "bg-blue-500/20 border-blue-500/40",
    activeText: "text-blue-300",
    hoverText: "hover:text-blue-300",
  },
  orange: {
    titleText: "text-orange-400",
    titleBg: "bg-orange-500/10",
    accentBar: "bg-orange-500",
    activeBg: "bg-orange-500/20 border-orange-500/40",
    activeText: "text-orange-300",
    hoverText: "hover:text-orange-300",
  },
  purple: {
    titleText: "text-purple-400",
    titleBg: "bg-purple-500/10",
    accentBar: "bg-purple-500",
    activeBg: "bg-purple-500/20 border-purple-500/40",
    activeText: "text-purple-300",
    hoverText: "hover:text-purple-300",
  },
  slate: {
    titleText: "text-slate-400",
    titleBg: "bg-slate-500/10",
    accentBar: "bg-slate-500",
    activeBg: "bg-slate-500/20 border-slate-500/40",
    activeText: "text-slate-300",
    hoverText: "hover:text-slate-300",
  },
};

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
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[#0d0908]">
        <Link href="/admin" className="flex items-center gap-2 border-b border-[var(--border)] p-4">
          <span className="font-serif text-lg text-[var(--gold)]">i時代</span>
          <span className="text-xs text-[var(--fg-muted)]">後台</span>
        </Link>
        <SidebarContent isActive={isActive} />
        <div className="border-t border-[var(--border)] p-3">
          <form action={logoutAction}>
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] py-2 text-xs text-[var(--fg-muted)] hover:border-red-500/50 hover:text-red-400">
              <span>🚪</span> 登出
            </button>
          </form>
        </div>
      </aside>

      {/* === 主內容區 === */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 手機頂欄（漢堡） */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--border)] bg-[#0d0908] p-3 md:hidden" style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}>
          <button onClick={() => setDrawerOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] text-xl" aria-label="選單">☰</button>
          <Link href="/admin" className="font-serif text-base text-[var(--gold)]">i時代 後台</Link>
          <Link href="/" className="text-xs text-[var(--fg-muted)]">↗</Link>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>

      {/* === 手機側拉抽屜 === */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden" onClick={() => setDrawerOpen(false)} />
          <aside
            className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-[#0d0908] shadow-2xl md:hidden"
            style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg text-[var(--gold)]">i時代</span>
                <span className="text-xs text-[var(--fg-muted)]">後台</span>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-base text-[var(--fg-muted)]">✕</button>
            </div>
            <div
              className="flex-1 overflow-y-auto"
              onClick={(e) => {
                const t = e.target as HTMLElement;
                if (t.tagName === "A") setDrawerOpen(false);
              }}
            >
              <SidebarContent isActive={isActive} />
            </div>
            <div className="border-t border-[var(--border)] p-3">
              <form action={logoutAction}>
                <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] py-2 text-xs text-[var(--fg-muted)] hover:border-red-500/50 hover:text-red-400">
                  <span>🚪</span> 登出
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
    <nav className="flex-1 overflow-y-auto py-1">
      {NAV_GROUPS.map((group, gi) => {
        const c = COLOR_STYLES[group.color];
        // 群組之間用一條淡分隔線（不是邊框，是輕薄的分隔）
        return (
          <div key={group.title} className={gi === 0 ? "" : "mt-1 border-t border-white/[0.04]"}>
            {/* 分組標題：左側彩色直條 + icon + 文字（沒有方框） */}
            <div className="flex items-center gap-2 px-3 py-2.5 pl-4">
              <span className={`h-3.5 w-1 rounded-full ${c.accentBar}`} />
              <span className="text-base">{group.icon}</span>
              <span className={`text-[11px] font-bold uppercase tracking-[0.1em] ${c.titleText}`}>{group.title}</span>
            </div>

            {/* 該組 items（純列表，無框） */}
            <div className="pb-1">
              {group.items.map(item => {
                const active = isActive(item.href);
                // 純列表設計：無框、無 padding 邊距凹陷、active 整列彩色背景
                const cls = `relative flex items-center gap-2.5 px-4 py-2 text-sm transition ${
                  active
                    ? `${c.activeBg.split(" ")[0]} ${c.activeText} font-medium`  // 只用第一個 class（背景），不用 border
                    : `text-[var(--fg)] hover:bg-white/5 ${c.hoverText}`
                }`;
                const content = (
                  <>
                    {/* 左側 active 標示條（更明顯） */}
                    {active && <span className={`absolute left-0 top-0 h-full w-[3px] ${c.accentBar}`} />}
                    <span className="text-base shrink-0 w-5 text-center opacity-90">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                    {item.external && <span className="ml-auto text-[10px] opacity-50">↗</span>}
                  </>
                );
                if (item.external) {
                  return <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" className={cls}>{content}</a>;
                }
                return <Link key={item.href} href={item.href} className={cls}>{content}</Link>;
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "i時代 後台",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "儀表板" },
  { href: "/admin/products", label: "📦 商品" },
  { href: "/admin/bookings", label: "預約" },
  { href: "/admin/payment-links", label: "付款連結" },
  { href: "/admin/orders", label: "訂單" },
  { href: "/admin/prices", label: "維修報價" },
  { href: "/admin/recycle", label: "回收價" },
  { href: "/admin/cron", label: "自動排程" },
  { href: "/admin/settings", label: "設定" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="font-serif text-lg text-[var(--gold)]">
            i時代 後台
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm">
            {NAV.map(item => (
              <Link key={item.href} href={item.href} className="text-[var(--fg)] transition hover:text-[var(--gold)]">
                {item.label}
              </Link>
            ))}
            <Link href="/" className="text-xs text-[var(--fg-muted)]">↗ 看前台</Link>
          </nav>
        </div>
      </div>
      <main className="mx-auto max-w-7xl p-4 md:p-6">{children}</main>
    </div>
  );
}

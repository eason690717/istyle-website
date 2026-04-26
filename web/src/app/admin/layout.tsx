import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, verifySession } from "@/lib/admin-auth";
import { logoutAction } from "./login/actions";
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

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // 注意：layout 也包到 /admin/login，所以「沒 token」時不能 redirect（會無限循環）
  // middleware 已經幫 /admin/* (除 login 外) 沒 token 時 redirect 到 login
  // 這裡只處理「token 存在但無效」（例如已登出/過期）→ 清除 + 跳 login
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    const ok = await verifySession(token);
    if (!ok) {
      cookieStore.delete(COOKIE_NAME);
      redirect("/admin/login");
    }
  } else {
    // 沒 token → 應該是 /admin/login 頁（middleware 已過濾其他路徑）→ 不顯示 admin nav
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="font-serif text-lg text-[var(--gold)]">
            i時代 後台
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            {NAV.map(item => (
              <Link key={item.href} href={item.href} className="text-[var(--fg)] transition hover:text-[var(--gold)]">
                {item.label}
              </Link>
            ))}
            <Link href="/" className="text-xs text-[var(--fg-muted)]">↗ 看前台</Link>
            <form action={logoutAction}>
              <button className="rounded border border-[var(--border)] px-2 py-1 text-xs text-[var(--fg-muted)] hover:border-red-500/50 hover:text-red-400" type="submit">
                登出
              </button>
            </form>
          </nav>
        </div>
      </div>
      <main className="mx-auto max-w-7xl p-4 md:p-6">{children}</main>
    </div>
  );
}

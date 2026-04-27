import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "後台登入",
  robots: { index: false, follow: false },
};

const ERROR_MAP: Record<string, string> = {
  missing_state: "登入流程被中斷，請重試",
  bad_state: "登入狀態異常，請重試",
  state_mismatch: "安全驗證失敗（CSRF），請重試",
  no_profile: "Google 帳號驗證失敗",
  not_allowed: "此 Google 帳號沒有後台存取權限",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string; email?: string }>;
}) {
  const sp = await searchParams;
  const errorMsg = sp.error ? ERROR_MAP[sp.error] || "登入失敗" : null;
  const loginHref = `/api/auth/google${sp.from ? `?from=${encodeURIComponent(sp.from)}` : ""}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-4">
      <div className="glass-card w-full max-w-sm rounded-2xl p-8">
        <div className="text-center">
          <Image src="/logo.png" alt="i時代" width={80} height={80} className="mx-auto h-20 w-20 object-contain" />
          <h1 className="mt-4 font-serif text-2xl text-[var(--gold)]">i時代 後台</h1>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">店家管理系統</p>
        </div>

        {errorMsg && (
          <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
            {errorMsg}
            {sp.email && (
              <div className="mt-1 text-[10px] text-red-400/80">
                嘗試的帳號：{sp.email}
              </div>
            )}
          </div>
        )}

        <Link
          href={loginHref}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>
          使用 Google 登入
        </Link>

        <p className="mt-6 text-center text-[10px] text-[var(--fg-muted)]">
          僅限 admin@i-style.store 帳號
        </p>
      </div>
    </div>
  );
}

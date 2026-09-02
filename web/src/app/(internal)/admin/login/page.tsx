import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { SITE } from "@/lib/site-config";

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#0d0908] via-[#1a1410] to-[#0d0908] p-4">
      {/* 裝飾性光暈 */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[var(--gold)]/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-[var(--gold)]/15 blur-[120px]" />

      <div className="relative w-full max-w-sm">
        {/* 主卡片 */}
        <div className="rounded-3xl border border-[var(--gold)]/20 bg-[#0d0908]/80 p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center">
            <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--gold)]/30 bg-[var(--bg-elevated)] shadow-lg">
              <Image src="/logo.png" alt="i時代" width={64} height={64} className="h-16 w-16 object-contain" />
            </div>
            <h1 className="mt-5 font-serif text-3xl text-[var(--gold)]">i時代 後台</h1>
            <p className="mt-1.5 text-xs text-[var(--fg-muted)]">{SITE.legalName}</p>
          </div>

          {errorMsg && (
            <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 p-3.5 text-xs text-red-300" style={{ animation: "shake 0.4s" }}>
              <div className="flex items-start gap-2">
                <span className="text-base">⚠️</span>
                <div className="flex-1">
                  <div>{errorMsg}</div>
                  {sp.email && <div className="mt-1 text-[10px] text-red-400/80">嘗試的帳號：{sp.email}</div>}
                </div>
              </div>
            </div>
          )}

          <Link
            href={loginHref}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-full bg-white px-4 py-3.5 text-sm font-semibold text-gray-800 shadow-lg transition hover:shadow-xl active:scale-95"
          >
            <svg className="h-5 w-5" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
            </svg>
            使用 Google 登入
          </Link>

          {/* 分隔線 */}
          <div className="my-5 flex items-center gap-3 text-[10px] text-[var(--fg-muted)]">
            <div className="h-px flex-1 bg-[var(--border)]" />
            <span>店員請走另一邊</span>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <Link
            href="/pos/login"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-[var(--gold)]/30 bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--gold)] hover:bg-[var(--gold)]/10"
          >
            🛒 店員 PIN 登入 POS
          </Link>

          <p className="mt-6 text-center text-[10px] text-[var(--fg-muted)]">
            管理員 Google 帳號 · 店員 PIN 登入
          </p>
        </div>

        {/* footer 說明 */}
        <p className="mt-4 text-center text-[10px] text-[var(--fg-muted)]/60">
          © {new Date().getFullYear()} {SITE.name}．{SITE.tagline}
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}

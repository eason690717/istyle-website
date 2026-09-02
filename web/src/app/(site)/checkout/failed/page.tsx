import Link from "next/link";
import { SITE } from "@/lib/site-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `付款失敗 — ${SITE.name}`,
  robots: { index: false, follow: false },
};

export default function CheckoutFailedPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4 py-12">
      <div className="w-full rounded-2xl border border-red-500/50 bg-[var(--bg-elevated)] p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-3xl text-red-400">
          ✕
        </div>
        <h1 className="mt-5 font-serif text-2xl text-[var(--gold)]">付款未完成</h1>
        <p className="mt-3 text-sm text-[var(--fg)]">
          交易未成功。可能是付款被取消、卡片驗證失敗或網路中斷。
        </p>
        <div className="mt-6 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 text-left text-xs text-[var(--fg-muted)]">
          <p>💳 請檢查信用卡資料是否正確</p>
          <p>🔁 可重新嘗試付款（您的購物車仍保留）</p>
          <p>📞 持續失敗請來電 02-2257-7155 或加 LINE 詢問</p>
        </div>
        <div className="mt-6 flex gap-3">
          <Link href="/checkout" className="btn-gold flex-1 rounded-full py-2.5 text-sm font-semibold">
            重新結帳
          </Link>
          <Link href="/" className="flex-1 rounded-full border border-[var(--border)] py-2.5 text-sm text-[var(--fg-muted)] hover:text-[var(--gold)]">
            回首頁
          </Link>
        </div>
      </div>
    </div>
  );
}

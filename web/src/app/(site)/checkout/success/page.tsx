import Link from "next/link";
import { SITE } from "@/lib/site-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `付款成功 — ${SITE.name}`,
  robots: { index: false, follow: false },
};

export default function CheckoutSuccessPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4 py-12">
      <div className="w-full rounded-2xl border border-[var(--gold)] bg-[var(--bg-elevated)] p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-3xl text-green-400">
          ✓
        </div>
        <h1 className="mt-5 font-serif text-2xl text-[var(--gold)]">付款成功</h1>
        <p className="mt-3 text-sm text-[var(--fg)]">
          感謝您的支付！系統已自動通知 i時代，並會盡快聯絡您安排服務／出貨。
        </p>
        <div className="mt-6 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 text-left text-xs text-[var(--fg-muted)]">
          <p>📄 電子發票將自動開立並寄至您填寫的 Email</p>
          <p>📦 出貨資訊會透過 LINE / Email 通知</p>
          <p>📞 如有疑問請來電 02-2257-7155 或加 LINE</p>
        </div>
        <div className="mt-6 flex gap-3">
          <Link href="/shop" className="btn-gold flex-1 rounded-full py-2.5 text-sm font-semibold">
            繼續購物
          </Link>
          <Link href="/" className="flex-1 rounded-full border border-[var(--border)] py-2.5 text-sm text-[var(--fg-muted)] hover:text-[var(--gold)]">
            回首頁
          </Link>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { CheckoutForm } from "./checkout-form";
import { SITE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "結帳",
  description: `${SITE.name}．填寫聯絡與配送資料，安全的綠界金流付款`,
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-serif text-3xl text-[var(--gold)] md:text-4xl">
        <span className="gold-underline">結帳</span>
      </h1>
      <p className="mt-4 text-sm text-[var(--fg-muted)]">
        填寫聯絡資料與配送方式 → 確認金額 → 跳到綠界安全付款
      </p>
      <div className="mt-8">
        <CheckoutForm />
      </div>
      <p className="mt-6 text-center text-[10px] text-[var(--fg-muted)]">
        🔒 採用 SSL 加密與綠界 ECPay 安全金流．資料僅用於本次訂單
      </p>
    </div>
  );
}

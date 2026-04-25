"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { initiatePayment } from "./actions";

export function CheckoutForm({ token, defaultEmail }: { token: string; defaultEmail?: string }) {
  const [email, setEmail] = useState(defaultEmail || "");
  const [paymentType, setPaymentType] = useState<"Credit" | "ATM" | "CVS" | "ALL">("ALL");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await initiatePayment({ token, email, paymentType });
      if (!result?.ok || !result.formAction || !result.formFields) {
        alert(result?.error || "建立付款失敗，請稍後再試");
        setSubmitting(false);
        return;
      }
      // 動態建立隱藏 form 並 submit 到 ECPay
      const form = document.createElement("form");
      form.method = "POST";
      form.action = result.formAction;
      form.style.display = "none";
      Object.entries(result.formFields).forEach(([k, v]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = String(v);
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch (e) {
      alert("發生錯誤：" + String(e));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--fg)]">Email（接收電子發票）</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--fg)] focus:border-[var(--gold)] focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--fg)]">付款方式</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { v: "ALL", l: "綠界全部" },
            { v: "Credit", l: "信用卡" },
            { v: "ATM", l: "ATM 轉帳" },
            { v: "CVS", l: "超商代碼" },
          ].map(opt => (
            <label
              key={opt.v}
              className={`cursor-pointer rounded border p-2 text-center text-xs transition ${
                paymentType === opt.v
                  ? "border-[var(--gold)] bg-[var(--gold)] text-black"
                  : "border-[var(--border)] text-[var(--fg)] hover:border-[var(--gold-soft)]"
              }`}
            >
              <input
                type="radio"
                name="paymentType"
                value={opt.v}
                checked={paymentType === opt.v}
                onChange={() => setPaymentType(opt.v as typeof paymentType)}
                className="sr-only"
              />
              {opt.l}
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="btn-gold w-full rounded-full py-3 text-sm font-semibold disabled:opacity-50"
      >
        {submitting ? "前往付款頁..." : "前往綠界安全付款"}
      </button>
    </form>
  );
}

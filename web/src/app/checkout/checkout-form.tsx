"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { formatTwd } from "@/lib/pricing";
import { SITE } from "@/lib/site-config";
import { createCheckoutPaymentLink } from "./actions";

type ShippingOpt = "IN_STORE" | "CVS_711" | "HOME";
const SHIPPING_OPTIONS: { value: ShippingOpt; label: string; fee: number; hint: string }[] = [
  { value: "IN_STORE", label: "門市自取（板橋江子翠）", fee: 0, hint: "最快、零運費" },
  { value: "CVS_711", label: "7-11 取貨", fee: 60, hint: "綠界 7-11 取貨．3-5 工作日" },
  { value: "HOME", label: "宅配到府", fee: 100, hint: "順豐／黑貓．1-2 工作日" },
];

export function CheckoutForm() {
  const router = useRouter();
  const { items, count, subtotal, clear } = useCart();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [shipping, setShipping] = useState<"IN_STORE" | "CVS_711" | "HOME">("IN_STORE");
  const [note, setNote] = useState("");

  const shippingFee = SHIPPING_OPTIONS.find(s => s.value === shipping)?.fee || 0;
  const total = subtotal + shippingFee;

  if (count === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-8 text-center">
        <p className="text-sm text-[var(--fg-muted)]">送修清單是空的</p>
        <Link href="/quote" className="btn-gold mt-4 inline-block rounded-full px-5 py-2 text-sm">
          先選擇維修項目
        </Link>
      </div>
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      try {
        const res = await createCheckoutPaymentLink({
          name, phone, email,
          shipping,
          shippingFee,
          note,
          items: items.map(it => ({
            modelName: it.modelName,
            itemName: it.itemName,
            tierLabel: it.tierLabel,
            unitPrice: it.unitPrice,
            qty: it.qty,
          })),
          subtotal,
          total,
        });
        if (!res.ok) {
          setError(res.error || "建立付款失敗");
          return;
        }
        clear();
        router.push(res.payUrl!);
      } catch (e) {
        setError(String(e));
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* 訂單摘要 */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        <div className="bg-[var(--bg-soft)] px-4 py-2 text-xs uppercase tracking-wider text-[var(--gold-soft)]">訂單摘要</div>
        <ul className="divide-y divide-[var(--border-soft)]">
          {items.map(it => (
            <li key={it.key} className="flex items-center justify-between gap-3 bg-[#141414] px-4 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[var(--fg)]">{it.modelName} · {it.itemName}</div>
                <div className="text-[10px] text-[var(--fg-muted)]">{it.tierLabel} × {it.qty}</div>
              </div>
              <div className="font-mono text-[var(--gold)]">{formatTwd(it.unitPrice * it.qty)}</div>
            </li>
          ))}
        </ul>
      </div>

      {/* 聯絡資料 */}
      <div className="space-y-3">
        <h2 className="text-xs uppercase tracking-wider text-[var(--gold-soft)]">聯絡資料</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="姓名" required>
            <input value={name} onChange={e => setName(e.target.value)} required className={inputCls} placeholder="王小明" />
          </Field>
          <Field label="電話" required>
            <input value={phone} onChange={e => setPhone(e.target.value)} required type="tel" inputMode="tel" pattern="0\d{8,9}" className={inputCls} placeholder="0912345678" />
          </Field>
        </div>
        <Field label="Email（用於收電子發票，選填）">
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" className={inputCls} placeholder="you@example.com" />
        </Field>
      </div>

      {/* 配送方式 */}
      <div className="space-y-3">
        <h2 className="text-xs uppercase tracking-wider text-[var(--gold-soft)]">配送方式</h2>
        <div className="space-y-2">
          {SHIPPING_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition ${
                shipping === opt.value
                  ? "border-[var(--gold)] bg-[var(--gold)]/10"
                  : "border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--gold-soft)]"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="shipping"
                  value={opt.value}
                  checked={shipping === opt.value}
                  onChange={() => setShipping(opt.value)}
                  className="accent-[var(--gold)]"
                />
                <div>
                  <div className="text-sm font-medium text-[var(--fg)]">{opt.label}</div>
                  <div className="text-[10px] text-[var(--fg-muted)]">{opt.hint}</div>
                </div>
              </div>
              <div className="font-mono text-sm text-[var(--gold)]">
                {opt.fee === 0 ? "免運" : formatTwd(opt.fee)}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 備註 */}
      <Field label="備註（選填）">
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className={inputCls + " resize-y"} placeholder="特殊需求、機況補充..." />
      </Field>

      {/* 金額總計 */}
      <div className="rounded-xl border border-[var(--gold)] bg-[var(--bg-elevated)] p-4">
        <div className="space-y-1.5 text-sm">
          <Row label="小計" value={formatTwd(subtotal)} />
          <Row label="配送" value={shippingFee === 0 ? "免運" : formatTwd(shippingFee)} />
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
          <span className="text-sm text-[var(--fg)]">應付總額</span>
          <span className="font-serif text-2xl font-bold text-[var(--gold)]">{formatTwd(total)}</span>
        </div>
      </div>

      {error && (
        <p className="rounded border border-red-500/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">{error}</p>
      )}

      {/* CTA */}
      <button
        type="submit"
        disabled={pending}
        className="btn-gold w-full rounded-full py-4 text-base font-semibold disabled:opacity-50"
      >
        {pending ? "建立付款中..." : `前往綠界付款 ${formatTwd(total)} →`}
      </button>

      <p className="text-center text-[10px] text-[var(--fg-muted)]">
        點擊後將跳轉到綠界 ECPay 安全付款頁面．支援信用卡 / ATM / 7-11 代碼
      </p>
    </form>
  );
}

const inputCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--fg)] outline-none transition placeholder:text-[var(--fg-muted)] focus:border-[var(--gold)]";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--fg)]">
        {label}{required && <span className="ml-1 text-[var(--gold)]">*</span>}
      </label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[var(--fg-muted)]">
      <span>{label}</span>
      <span className="font-mono text-[var(--fg)]">{value}</span>
    </div>
  );
}

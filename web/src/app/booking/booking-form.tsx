"use client";
import { useActionState, useState } from "react";
import { submitBooking, type BookingFormState } from "./actions";
import { SITE } from "@/lib/site-config";

const SERVICE_OPTIONS = [
  { value: "REPAIR", label: "維修" },
  { value: "RECYCLE", label: "二手回收估價" },
  { value: "DIAGNOSTIC", label: "手機檢測" },
  { value: "COURSE_INQUIRY", label: "維修課程" },
  { value: "GENERAL", label: "其他諮詢" },
];

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const initial: BookingFormState = { ok: false };

export function BookingForm() {
  const [state, action, pending] = useActionState(submitBooking, initial);
  const [serviceType, setServiceType] = useState("REPAIR");

  if (state.ok) {
    return (
      <div className="rounded-xl border border-[var(--gold)] bg-[var(--bg-elevated)] p-8 text-center">
        <p className="font-serif text-2xl text-[var(--gold)]">✓ 預約成功</p>
        <p className="mt-3 text-sm text-[var(--fg)]">
          編號：<span className="font-mono text-[var(--gold)]">{state.bookingNumber}</span>
        </p>
        <p className="mt-2 text-xs text-[var(--fg-muted)]">
          我們將盡快聯絡確認
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <a href={SITE.lineAddUrl} className="btn-gold rounded-full px-5 py-2 text-sm">LINE</a>
          <a href={`tel:${SITE.phoneRaw}`} className="btn-gold-outline rounded-full px-5 py-2 text-sm">來電</a>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      {/* 服務類型 — pill 樣式精簡 */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--fg)]">想預約什麼服務？</label>
        <div className="flex flex-wrap gap-2">
          {SERVICE_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`cursor-pointer rounded-full border px-4 py-1.5 text-xs transition ${
                serviceType === opt.value
                  ? "border-[var(--gold)] bg-[var(--gold)] text-black font-medium"
                  : "border-[var(--border)] text-[var(--fg)] hover:border-[var(--gold-soft)]"
              }`}
            >
              <input
                type="radio"
                name="serviceType"
                value={opt.value}
                checked={serviceType === opt.value}
                onChange={() => setServiceType(opt.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* 姓名 / 電話 — 同一行 */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="姓名" required error={state.errors?.contactName}>
          <input name="contactName" required className={inputCls} placeholder="王小明" />
        </Field>
        <Field label="電話" required error={state.errors?.contactPhone}>
          <input name="contactPhone" required type="tel" className={inputCls} placeholder="0912345678" inputMode="tel" />
        </Field>
      </div>

      {/* 描述 — 大欄位 */}
      <Field
        label="想預約的內容"
        required
        error={state.errors?.description}
        hint="例：iPhone 15 Pro 256GB 換螢幕．或您想諮詢的問題"
      >
        <textarea
          name="description"
          required
          rows={3}
          className={inputCls + " resize-y"}
          placeholder="請簡單描述機型、狀況、希望的服務..."
        />
      </Field>

      {/* 預約日期 / 時段 — 折疊（多數客戶到時 LINE 確認）*/}
      <details className="rounded-lg border border-[var(--border-soft)] p-3 [&_summary::-webkit-details-marker]:hidden">
        <summary className="cursor-pointer text-xs text-[var(--fg-muted)]">
          ✚ 指定預約日期 / 時段（選填，未填我們會主動聯絡）
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="日期">
            <input
              name="scheduledDate"
              type="date"
              min={todayPlus(0)}
              max={todayPlus(60)}
              defaultValue={todayPlus(1)}
              className={inputCls}
            />
          </Field>
          <Field label="時段">
            <select name="scheduledTime" defaultValue="14:00" className={inputCls}>
              {["11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>
      </details>

      {state.message && !state.ok && (
        <p className="rounded border border-red-500/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {state.message}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[10px] text-[var(--fg-muted)]">
          資料僅用於預約聯絡
        </p>
        <button
          type="submit"
          disabled={pending}
          className="btn-gold rounded-full px-8 py-3 text-sm font-semibold disabled:opacity-50"
        >
          {pending ? "送出中..." : "送出預約"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--fg)] outline-none transition placeholder:text-[var(--fg-muted)] focus:border-[var(--gold)]";

function Field({
  label, required, error, hint, children,
}: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--fg)]">
        {label}{required && <span className="ml-1 text-[var(--gold)]">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-[var(--fg-muted)]">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

import { LookupForm } from "./lookup-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "維修進度查詢",
  description: "輸入取件單號 + 手機末 4 碼，即時查詢您送修裝置的進度與照片紀錄",
};

export default function RepairLookupPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="text-center">
        <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--gold)] text-2xl">
          🔧
        </div>
        <h1 className="mt-4 font-serif text-3xl text-[var(--gold)]">維修進度查詢</h1>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          輸入取件單號 + 手機末 4 碼<br />
          即時看到目前進度與內部照片
        </p>
      </div>
      <LookupForm />
      <div className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-xs text-[var(--fg-muted)]">
        <p className="mb-2 font-medium text-[var(--fg)]">📋 取件單號在哪？</p>
        <p>送修時店家會給您一張取件單，上面有 <code className="rounded bg-black/40 px-1">R26XXXXXX</code> 開頭的單號。</p>
        <p className="mt-2">查不到？請 LINE 客服或電話 02-XXXX-XXXX。</p>
      </div>
    </div>
  );
}

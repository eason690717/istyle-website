"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function LookupForm() {
  const [ticketNumber, setTicketNumber] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!ticketNumber.trim() || !phoneLast4.trim()) {
      setError("請完整填寫單號 + 手機末 4 碼");
      return;
    }
    setSubmitting(true);
    const sanitized = ticketNumber.trim().toUpperCase();
    router.push(`/repair/${encodeURIComponent(sanitized)}?p=${encodeURIComponent(phoneLast4.trim())}`);
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--fg)]">取件單號</label>
        <input
          type="text"
          value={ticketNumber}
          onChange={(e) => setTicketNumber(e.target.value)}
          required
          autoComplete="off"
          placeholder="例如 R26042701"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-3 text-sm uppercase text-[var(--fg)] focus:border-[var(--gold)] focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--fg)]">手機末 4 碼</label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          value={phoneLast4}
          onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, ""))}
          required
          autoComplete="off"
          placeholder="例如 5337"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-3 text-sm tracking-widest text-[var(--fg)] focus:border-[var(--gold)] focus:outline-none"
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="btn-gold w-full rounded-full py-3 text-sm font-semibold disabled:opacity-50"
      >
        {submitting ? "查詢中..." : "查詢進度"}
      </button>
    </form>
  );
}

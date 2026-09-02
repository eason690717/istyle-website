"use client";
import { useState, useTransition } from "react";
import { loginAction } from "./actions";

export function LoginForm() {
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("code", code);
    fd.set("pin", pin);
    startTransition(async () => {
      const r = await loginAction(fd);
      if (r && "error" in r) setError(r.error);
    });
  }

  function appendPin(d: string) { if (pin.length < 6) setPin(pin + d); }
  function backspace() { setPin(pin.slice(0, -1)); }
  function clearPin() { setPin(""); }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium">店員代號</label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          autoFocus
          autoComplete="off"
          placeholder="例 01 或 Eason"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm focus:border-[var(--gold)] focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">PIN（4-6 位數字）</label>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          required
          inputMode="numeric"
          pattern="[0-9]{4,6}"
          autoComplete="off"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-center text-2xl tracking-widest focus:border-[var(--gold)] focus:outline-none"
        />
      </div>

      {/* 數字鍵盤 — 觸控結帳台用 */}
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(d => (
          <button
            key={d}
            type="button"
            onClick={() => appendPin(d)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] py-3 text-lg hover:border-[var(--gold)] active:bg-[var(--gold)]/20"
          >
            {d}
          </button>
        ))}
        <button type="button" onClick={clearPin} className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] py-3 text-xs">清除</button>
        <button type="button" onClick={() => appendPin("0")} className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] py-3 text-lg hover:border-[var(--gold)] active:bg-[var(--gold)]/20">0</button>
        <button type="button" onClick={backspace} className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] py-3 text-xs">⌫</button>
      </div>

      {error && <p className="rounded bg-red-500/10 p-2 text-center text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={isPending || !code || pin.length < 4}
        className="btn-gold w-full rounded-full py-3 text-sm font-semibold disabled:opacity-50"
      >
        {isPending ? "登入中..." : "登入"}
      </button>
    </form>
  );
}

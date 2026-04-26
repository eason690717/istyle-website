"use client";
import { useState, useTransition } from "react";
import { loginAction } from "./actions";

export function LoginForm({ from, initialError }: { from?: string; initialError?: string }) {
  const [error, setError] = useState(initialError || "");
  const [pending, start] = useTransition();
  const [user, setUser] = useState("");
  const [pwd, setPwd] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const res = await loginAction({ user, pwd, hp, from });
      if (res?.error) setError(res.error);
      // 成功會自動 redirect (server action)
    });
  }

  // 蜜罐：機器人通常會自動填所有欄位
  const [hp, setHp] = useState("");

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label className="mb-1 block text-xs text-[var(--fg-muted)]">帳號</label>
        <input
          value={user}
          onChange={e => setUser(e.target.value)}
          required
          autoFocus
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--fg)] outline-none transition focus:border-[var(--gold)]"
          placeholder=""
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-[var(--fg-muted)]">密碼</label>
        <input
          value={pwd}
          onChange={e => setPwd(e.target.value)}
          type="password"
          required
          autoComplete="off"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--fg)] outline-none transition focus:border-[var(--gold)]"
          placeholder=""
        />
      </div>

      {/* 蜜罐欄位（隱藏；正常使用者看不到，機器人會填） */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} tabIndex={-1}>
        <label>請勿填寫</label>
        <input
          name="contact_email"
          value={hp}
          onChange={e => setHp(e.target.value)}
          autoComplete="off"
          tabIndex={-1}
        />
      </div>

      {error && (
        <div className="rounded border border-red-500/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn-gold w-full rounded-full py-3 text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "驗證中..." : "登入"}
      </button>
      <p className="text-center text-[10px] text-[var(--fg-muted)]">
        🔒 後台僅供授權管理員使用．所有登入記錄保留 30 天
      </p>
    </form>
  );
}

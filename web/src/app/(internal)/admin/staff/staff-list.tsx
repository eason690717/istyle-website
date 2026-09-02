"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createStaff, updateStaff, deleteStaff } from "./actions";

interface StaffRow {
  id: number;
  code: string;
  name: string;
  role: string;
  isActive: boolean;
  salesCount: number;
}

export function StaffList({ initial }: { initial: StaffRow[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(!showAdd)} className="btn-gold rounded-full px-4 py-2 text-sm">
          {showAdd ? "取消" : "+ 新增店員"}
        </button>
      </div>

      {showAdd && <AddForm onDone={() => { setShowAdd(false); router.refresh(); }} />}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-elevated)] text-xs text-[var(--fg-muted)]">
            <tr>
              <th className="p-3 text-left font-normal">代號</th>
              <th className="p-3 text-left font-normal">姓名</th>
              <th className="p-3 text-left font-normal">職位</th>
              <th className="p-3 text-right font-normal">結帳次數</th>
              <th className="p-3 text-left font-normal">狀態</th>
              <th className="p-3 text-right font-normal">操作</th>
            </tr>
          </thead>
          <tbody>
            {initial.map(s => (
              <tr key={s.id} className="border-t border-[var(--border)]">
                <td className="p-3 font-mono">{s.code}</td>
                <td className="p-3">{s.name}</td>
                <td className="p-3">
                  <span className={`rounded px-2 py-0.5 text-xs ${s.role === "MANAGER" ? "bg-[var(--gold)]/20 text-[var(--gold)]" : "bg-[var(--border)] text-[var(--fg-muted)]"}`}>
                    {s.role === "MANAGER" ? "店長" : "店員"}
                  </span>
                </td>
                <td className="p-3 text-right font-mono text-[var(--fg-muted)]">{s.salesCount}</td>
                <td className="p-3">
                  <span className={`rounded px-2 py-0.5 text-xs ${s.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                    {s.isActive ? "啟用" : "停用"}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => setEditing(editing === s.id ? null : s.id)} className="text-xs text-[var(--gold)] hover:underline">編輯</button>
                </td>
              </tr>
            ))}
            {initial.length === 0 && (
              <tr><td colSpan={6} className="p-12 text-center text-sm text-[var(--fg-muted)]">尚無店員，點上方「+ 新增店員」開始</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (() => {
        const s = initial.find(x => x.id === editing);
        if (!s) return null;
        return <EditForm staff={s} onDone={() => { setEditing(null); router.refresh(); }} />;
      })()}
    </div>
  );
}

function AddForm({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<"CASHIER" | "MANAGER">("CASHIER");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await createStaff({ code, name, pin, role });
      if (r.ok) onDone();
      else alert(r.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-[var(--gold)]/40 bg-[var(--bg-elevated)] p-4">
      <h3 className="font-serif text-base text-[var(--gold)]">新增店員</h3>
      <div className="grid gap-2 md:grid-cols-2">
        <input value={code} onChange={(e) => setCode(e.target.value)} required placeholder="代號（如 01 或 Eason）" className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
        <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="姓名" className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} required maxLength={6} placeholder="PIN 4-6 位數字" inputMode="numeric" className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
        <select value={role} onChange={(e) => setRole(e.target.value as "CASHIER" | "MANAGER")} className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm">
          <option value="CASHIER">店員 (CASHIER)</option>
          <option value="MANAGER">店長 (MANAGER) — 可作廢交易</option>
        </select>
      </div>
      <button type="submit" disabled={pending} className="btn-gold rounded-full px-4 py-2 text-sm disabled:opacity-50">
        {pending ? "新增中..." : "建立"}
      </button>
    </form>
  );
}

function EditForm({ staff, onDone }: { staff: StaffRow; onDone: () => void }) {
  const [name, setName] = useState(staff.name);
  const [role, setRole] = useState<"CASHIER" | "MANAGER">(staff.role as "CASHIER" | "MANAGER");
  const [isActive, setIsActive] = useState(staff.isActive);
  const [newPin, setNewPin] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await updateStaff({ id: staff.id, name, role, isActive, newPin: newPin || undefined });
      if (r.ok) onDone();
      else alert(r.error);
    });
  }

  function remove() {
    if (!confirm(`確定停用 ${staff.name}？歷史銷售記錄會保留，但無法再登入 POS。`)) return;
    startTransition(async () => {
      await deleteStaff(staff.id);
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-[var(--gold)]/40 bg-[var(--bg-elevated)] p-4">
      <h3 className="font-serif text-base text-[var(--gold)]">編輯：{staff.code}</h3>
      <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
      <div className="grid gap-2 md:grid-cols-2">
        <select value={role} onChange={(e) => setRole(e.target.value as "CASHIER" | "MANAGER")} className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm">
          <option value="CASHIER">店員</option>
          <option value="MANAGER">店長</option>
        </select>
        <input value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} maxLength={6} placeholder="重設 PIN（留空不改）" inputMode="numeric" className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        啟用
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-gold flex-1 rounded-full py-2 text-sm">{pending ? "..." : "儲存"}</button>
        <button type="button" onClick={remove} disabled={pending} className="rounded-full border border-red-500/40 px-4 py-2 text-xs text-red-400">停用</button>
      </div>
    </form>
  );
}

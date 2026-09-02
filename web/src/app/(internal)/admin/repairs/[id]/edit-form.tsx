"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTicketStatus, deleteTicket } from "../actions";

const STATUS_OPTIONS = [
  { value: "RECEIVED", label: "📦 已收件" },
  { value: "DIAGNOSING", label: "🔍 檢測中" },
  { value: "AWAITING_PARTS", label: "📥 等候零件" },
  { value: "REPAIRING", label: "🔧 維修中" },
  { value: "DONE", label: "✅ 已完工" },
  { value: "PICKED_UP", label: "🎉 已取件" },
  { value: "CANCELLED", label: "❌ 取消" },
];

export function EditTicketForm({
  id, currentStatus, estimatedCost, finalCost, internalNotes,
}: {
  id: number;
  currentStatus: string;
  estimatedCost: number | null;
  finalCost: number | null;
  internalNotes: string | null;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [estCost, setEstCost] = useState(estimatedCost?.toString() || "");
  const [finCost, setFinCost] = useState(finalCost?.toString() || "");
  const [intNotes, setIntNotes] = useState(internalNotes || "");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (data.url) setPhotos(prev => [...prev, data.url]);
        else alert(data.error || "上傳失敗");
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await updateTicketStatus({
      id, status, note: note.trim() || undefined, photos,
      estimatedCost: estCost === "" ? null : Number(estCost),
      finalCost: finCost === "" ? null : Number(finCost),
      internalNotes: intNotes,
    });
    setNote(""); setPhotos([]); setSubmitting(false);
    router.refresh();
  }

  async function onDelete() {
    if (!confirm("確定刪除此維修單？此動作無法復原。")) return;
    await deleteTicket(id);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
      <div>
        <label className="mb-1 block text-xs font-medium">狀態</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none"
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">這次更新備註（會顯示給客戶看）</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="例如：螢幕已換新，正在做防水測試"
          className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">這次更新照片（可多張）</label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
          className="block w-full text-xs file:mr-3 file:rounded-full file:border-0 file:bg-[var(--gold)] file:px-3 file:py-1.5 file:text-xs file:text-black"
        />
        {uploading && <p className="mt-1 text-xs text-[var(--fg-muted)]">上傳中...</p>}
        {photos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {photos.map((url, i) => (
              <div key={i} className="relative">
                <img src={url} alt="" className="h-16 w-16 rounded border border-[var(--border)] object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white"
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium">預估費用 NT$</label>
          <input
            type="number"
            value={estCost}
            onChange={(e) => setEstCost(e.target.value)}
            min="0"
            className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">實際費用 NT$</label>
          <input
            type="number"
            value={finCost}
            onChange={(e) => setFinCost(e.target.value)}
            min="0"
            className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">內部備註（不對客戶顯示）</label>
        <textarea
          value={intNotes}
          onChange={(e) => setIntNotes(e.target.value)}
          rows={2}
          placeholder="零件成本、技師備忘..."
          className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="btn-gold flex-1 rounded-full py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {submitting ? "儲存中..." : "更新進度"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-full border border-red-500/40 px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10"
        >
          刪除
        </button>
      </div>
    </form>
  );
}

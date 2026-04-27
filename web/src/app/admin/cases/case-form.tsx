"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCase, updateCase, deleteCase } from "./actions";

const BRANDS = ["Apple", "Samsung", "Google", "Sony", "ASUS", "OPPO", "Xiaomi", "Switch", "iPad", "MacBook", "Dyson", "其他"];
const ISSUES = ["螢幕破裂", "電池更換", "進水救援", "充電孔故障", "鏡頭損壞", "主機板維修", "資料救援", "搖桿漂移", "其他"];

export interface CaseFormInitial {
  id?: number;
  title: string;
  brand: string;
  deviceModel: string;
  issueType: string;
  description: string;
  beforePhotos: string[];
  afterPhotos: string[];
  repairMinutes: number | null;
  cost: number | null;
  customerInitial: string | null;
  isPublished: boolean;
}

const EMPTY: CaseFormInitial = {
  title: "",
  brand: "Apple",
  deviceModel: "",
  issueType: "螢幕破裂",
  description: "",
  beforePhotos: [],
  afterPhotos: [],
  repairMinutes: null,
  cost: null,
  customerInitial: null,
  isPublished: true,
};

export function CaseForm({ initial }: { initial?: CaseFormInitial }) {
  const router = useRouter();
  const [data, setData] = useState<CaseFormInitial>(initial || EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!initial?.id;

  function set<K extends keyof CaseFormInitial>(k: K, v: CaseFormInitial[K]) {
    setData(prev => ({ ...prev, [k]: v }));
  }

  async function uploadFiles(e: React.ChangeEvent<HTMLInputElement>, target: "beforePhotos" | "afterPhotos") {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const r = await res.json();
      if (r.url) setData(prev => ({ ...prev, [target]: [...prev[target], r.url] }));
      else alert(r.error || "上傳失敗");
    }
    e.target.value = "";
  }

  function removePhoto(target: "beforePhotos" | "afterPhotos", index: number) {
    setData(prev => ({ ...prev, [target]: prev[target].filter((_, i) => i !== index) }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data.title || !data.deviceModel || !data.description) {
      alert("請填寫標題、機型、描述");
      return;
    }
    setSubmitting(true);
    try {
      if (isEdit && initial?.id) {
        await updateCase({
          id: initial.id,
          title: data.title,
          brand: data.brand,
          deviceModel: data.deviceModel,
          issueType: data.issueType,
          description: data.description,
          beforePhotos: data.beforePhotos,
          afterPhotos: data.afterPhotos,
          repairMinutes: data.repairMinutes,
          cost: data.cost,
          customerInitial: data.customerInitial,
          isPublished: data.isPublished,
        });
        router.refresh();
        alert("已儲存");
      } else {
        await createCase({
          title: data.title,
          brand: data.brand,
          deviceModel: data.deviceModel,
          issueType: data.issueType,
          description: data.description,
          beforePhotos: data.beforePhotos,
          afterPhotos: data.afterPhotos,
          repairMinutes: data.repairMinutes ?? undefined,
          cost: data.cost ?? undefined,
          customerInitial: data.customerInitial ?? undefined,
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (!isEdit || !initial?.id) return;
    if (!confirm("確定刪除？")) return;
    await deleteCase(initial.id);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
      <div>
        <label className="mb-1 block text-xs font-medium">標題（會顯示在 SEO title）</label>
        <input
          value={data.title}
          onChange={(e) => set("title", e.target.value)}
          required
          placeholder="例：iPhone 15 Pro Max 摔到外玻璃碎裂 35 分鐘修好"
          className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium">品牌</label>
          <select value={data.brand} onChange={(e) => set("brand", e.target.value)} className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm">
            {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">問題類型</label>
          <select value={data.issueType} onChange={(e) => set("issueType", e.target.value)} className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm">
            {ISSUES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">機型（精確型號）</label>
        <input
          value={data.deviceModel}
          onChange={(e) => set("deviceModel", e.target.value)}
          required
          placeholder="iPhone 15 Pro Max 256GB"
          className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none"
        />
      </div>

      <PhotoUploader label="📷 修前照片" photos={data.beforePhotos} onUpload={(e) => uploadFiles(e, "beforePhotos")} onRemove={(i) => removePhoto("beforePhotos", i)} />
      <PhotoUploader label="✅ 修後照片" photos={data.afterPhotos} onUpload={(e) => uploadFiles(e, "afterPhotos")} onRemove={(i) => removePhoto("afterPhotos", i)} />

      <div>
        <label className="mb-1 block text-xs font-medium">內文描述（會顯示在頁面）</label>
        <textarea
          value={data.description}
          onChange={(e) => set("description", e.target.value)}
          required
          rows={6}
          placeholder="客戶從口袋掏出時不小心滑落，外玻璃整片碎裂...&#10;檢測螢幕觸控與顯示功能正常..."
          className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium">耗時（分）</label>
          <input
            type="number"
            value={data.repairMinutes ?? ""}
            onChange={(e) => set("repairMinutes", e.target.value === "" ? null : Number(e.target.value))}
            min="0"
            className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">費用 NT$</label>
          <input
            type="number"
            value={data.cost ?? ""}
            onChange={(e) => set("cost", e.target.value === "" ? null : Number(e.target.value))}
            min="0"
            className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">客戶（暱稱）</label>
          <input
            value={data.customerInitial ?? ""}
            onChange={(e) => set("customerInitial", e.target.value)}
            placeholder="謝先生"
            className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          />
        </div>
      </div>

      {isEdit && (
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={data.isPublished} onChange={(e) => set("isPublished", e.target.checked)} />
          已上架（不勾就只在後台看得到）
        </label>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="btn-gold flex-1 rounded-full py-2.5 text-sm font-semibold disabled:opacity-50">
          {submitting ? "儲存中..." : isEdit ? "儲存" : "建立案例"}
        </button>
        {isEdit && (
          <button type="button" onClick={onDelete} className="rounded-full border border-red-500/40 px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10">
            刪除
          </button>
        )}
      </div>
    </form>
  );
}

function PhotoUploader({ label, photos, onUpload, onRemove }: {
  label: string;
  photos: string[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium">{label}</label>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={onUpload}
        className="block w-full text-xs file:mr-3 file:rounded-full file:border-0 file:bg-[var(--gold)] file:px-3 file:py-1.5 file:text-xs file:text-black"
      />
      {photos.length > 0 && (
        <div className="mt-2 grid grid-cols-4 gap-2">
          {photos.map((url, i) => (
            <div key={i} className="relative">
              <img src={url} alt="" className="aspect-square w-full rounded border border-[var(--border)] object-cover" />
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white"
              >×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

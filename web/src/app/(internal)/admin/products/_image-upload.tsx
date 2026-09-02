"use client";
import { useState, useRef } from "react";

export function ImageUpload({ name, defaultValue }: { name: string; defaultValue?: string }) {
  const [url, setUrl] = useState(defaultValue || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "上傳失敗");
      } else {
        setUrl(j.url);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* 圖片預覽 + 上傳區 */}
      <div className="relative overflow-hidden rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--bg-elevated)] transition hover:border-[var(--gold-soft)]">
        {url ? (
          <div className="relative aspect-video">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="預覽" className="h-full w-full object-contain" />
            <button
              type="button"
              onClick={() => { setUrl(""); if (fileRef.current) fileRef.current.value = ""; }}
              className="absolute right-2 top-2 rounded-full bg-black/70 px-3 py-1 text-xs text-red-400 hover:bg-red-950"
            >
              ✕ 移除
            </button>
          </div>
        ) : (
          <label className="flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 text-center">
            <div className="text-4xl">📷</div>
            <div className="text-sm text-[var(--gold)]">{uploading ? "上傳中..." : "點擊或拖放上傳圖片"}</div>
            <div className="text-[10px] text-[var(--fg-muted)]">JPG / PNG / WebP．最大 5MB</div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={uploading}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </label>
        )}
      </div>

      {/* 隱藏的 input 給 form 提交用 */}
      <input type="hidden" name={name} value={url} />

      {/* 也可貼網址 */}
      <details className="rounded-lg border border-[var(--border-soft)] p-2">
        <summary className="cursor-pointer text-xs text-[var(--fg-muted)]">▾ 或貼圖片網址（advanced）</summary>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          className="mt-2 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--gold)]"
          placeholder="https://images.pexels.com/..."
        />
      </details>

      {error && (
        <p className="rounded border border-red-500/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{error}</p>
      )}
      <p className="text-[10px] text-[var(--fg-muted)]">💡 圖片儲存於 Vercel Blob CDN，全球加速載入</p>
    </div>
  );
}

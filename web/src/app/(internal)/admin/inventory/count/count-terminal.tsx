"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { VoiceInputButton } from "@/components/voice-input-button";
import { searchProduct, adjustStock } from "../actions";
import { toast } from "@/components/toast";

interface FoundItem {
  kind: "PRODUCT" | "VARIANT";
  productId: number;
  variantId: number | null;
  name: string;
  sku: string | null;
  stock: number;
  imageUrl: string | null;
}

interface CountedLine {
  key: string;
  found: FoundItem;
  actualStock: number;
  diff: number;
}

export function CountTerminal() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState<FoundItem | null>(null);
  const [actualStock, setActualStock] = useState("");
  const [showScan, setShowScan] = useState(false);
  const [searching, setSearching] = useState(false);
  const [pending, startTransition] = useTransition();
  const [history, setHistory] = useState<CountedLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function lookup(q: string) {
    if (!q.trim()) return;
    setError(null);
    setSearching(true);
    const r = await searchProduct(q.trim());
    setSearching(false);
    if (!r) {
      setError(`找不到「${q}」`);
      return;
    }
    setCurrent(r);
    setActualStock(r.stock.toString());  // 預設等於系統數，使用者再改
    setQuery("");
    if ("vibrate" in navigator) (navigator as Navigator).vibrate(30);
  }

  function quickAdjust(delta: number) {
    const cur = Number(actualStock) || 0;
    setActualStock(Math.max(0, cur + delta).toString());
  }

  async function save() {
    if (!current) return;
    const n = Number(actualStock);
    if (isNaN(n) || n < 0) { toast.error("請輸入合法庫存數"); return; }
    startTransition(async () => {
      const r = await adjustStock({
        productId: current.kind === "PRODUCT" ? current.productId : undefined,
        productVariantId: current.kind === "VARIANT" ? current.variantId! : undefined,
        actualStock: n,
        reason: "盤點",
      });
      if (r.ok) {
        if ("vibrate" in navigator) (navigator as Navigator).vibrate([50, 50, 100]);
        const diff = r.diff ?? 0;
        toast.success(`已更新庫存（${diff > 0 ? "+" : ""}${diff}）`);
        setHistory(h => [{
          key: `${current.kind}-${current.productId}-${current.variantId}-${Date.now()}`,
          found: current,
          actualStock: n,
          diff,
        }, ...h].slice(0, 30));
        setCurrent(null);
        setActualStock("");
        router.refresh();
      } else {
        toast.error(r.error || "盤點失敗");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/inventory" className="text-xs text-[var(--fg-muted)] hover:text-[var(--gold)]">← 回庫存</Link>
        <h1 className="mt-1 font-serif text-2xl text-[var(--gold)]">📊 盤點</h1>
      </div>

      {/* 找商品 */}
      {!current && (
        <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lookup(query); } }}
              placeholder="輸入 SKU / 商品名稱"
              inputMode="search"
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-3 text-base focus:border-[var(--gold)] focus:outline-none"
              autoFocus
            />
            <VoiceInputButton onResult={(t) => { setQuery(t); lookup(t); }} className="rounded-lg border border-[var(--gold)]/40 px-3 text-sm text-[var(--gold)]" label="🎤" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => lookup(query)} disabled={!query.trim() || searching} className="rounded-lg border border-[var(--gold)]/40 py-2.5 text-sm text-[var(--gold)] disabled:opacity-50">{searching ? "..." : "🔍 搜尋"}</button>
            <button onClick={() => setShowScan(true)} className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 py-2.5 text-sm font-semibold text-white">📷 掃條碼</button>
          </div>
          {error && <p className="text-center text-xs text-red-400">{error}</p>}
        </div>
      )}

      {/* 盤點介面 */}
      {current && (
        <div className="space-y-3 rounded-2xl border-2 border-blue-500/40 bg-[var(--bg-elevated)] p-4">
          <div className="flex items-start gap-3">
            {current.imageUrl ? <img src={current.imageUrl} className="h-16 w-16 shrink-0 rounded object-cover" /> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-[var(--bg)] text-3xl">📦</div>}
            <div className="min-w-0 flex-1">
              <div className="text-base font-medium">{current.name}</div>
              <div className="mt-0.5 text-xs text-[var(--fg-muted)]">SKU: {current.sku}</div>
            </div>
          </div>

          <div className="rounded-lg bg-[var(--bg)] p-4">
            <div className="grid grid-cols-3 items-center gap-2 text-center">
              <div>
                <div className="text-[10px] text-[var(--fg-muted)]">系統數</div>
                <div className="mt-1 font-mono text-3xl text-[var(--fg)]">{current.stock}</div>
              </div>
              <div className="text-3xl text-[var(--fg-muted)]">→</div>
              <div>
                <div className="text-[10px] text-[var(--fg-muted)]">實際數</div>
                <div className="mt-1 font-mono text-3xl text-[var(--gold-bright)]">{actualStock || "?"}</div>
              </div>
            </div>
            {actualStock && Number(actualStock) !== current.stock && (
              <div className="mt-3 text-center text-xs">
                差異：<span className={Number(actualStock) > current.stock ? "text-green-400" : "text-red-400"}>{Number(actualStock) > current.stock ? "+" : ""}{Number(actualStock) - current.stock}</span>
              </div>
            )}
          </div>

          {/* 數量輸入 */}
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => quickAdjust(-10)} className="rounded-lg border border-[var(--border)] py-3 text-base hover:border-red-500">−10</button>
            <button onClick={() => quickAdjust(-1)} className="rounded-lg border border-[var(--border)] py-3 text-base hover:border-red-500">−1</button>
            <button onClick={() => quickAdjust(1)} className="rounded-lg border border-[var(--border)] py-3 text-base hover:border-green-500">+1</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => quickAdjust(10)} className="rounded-lg border border-[var(--border)] py-3 text-base hover:border-green-500">+10</button>
            <input
              value={actualStock}
              onChange={(e) => setActualStock(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="直接輸入"
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] py-3 text-center text-lg font-mono"
            />
            <button onClick={() => setActualStock("0")} className="rounded-lg border border-[var(--border)] py-3 text-base hover:border-orange-500">歸零</button>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => { setCurrent(null); setActualStock(""); }} className="flex-1 rounded-full border border-[var(--border)] py-3 text-sm">取消</button>
            <button onClick={save} disabled={pending} className="btn-gold flex-2 flex-grow rounded-full py-3 text-base font-bold disabled:opacity-50">
              {pending ? "儲存中..." : "✅ 儲存盤點"}
            </button>
          </div>
        </div>
      )}

      {/* 已盤點紀錄 */}
      {history.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
          <h2 className="mb-2 text-xs text-[var(--fg-muted)]">本次盤點 {history.length} 筆</h2>
          <div className="space-y-1.5">
            {history.map(h => (
              <div key={h.key} className="flex items-center justify-between rounded-lg bg-[var(--bg)] px-3 py-2 text-xs">
                <span className="truncate">{h.found.name}</span>
                <span className={`ml-2 shrink-0 font-mono ${h.diff === 0 ? "text-[var(--fg-muted)]" : h.diff > 0 ? "text-green-400" : "text-red-400"}`}>
                  {h.diff > 0 ? "+" : ""}{h.diff} → {h.actualStock}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showScan && (
        <BarcodeScanner
          onDetected={(code) => { setShowScan(false); lookup(code); }}
          onClose={() => setShowScan(false)}
        />
      )}
    </div>
  );
}

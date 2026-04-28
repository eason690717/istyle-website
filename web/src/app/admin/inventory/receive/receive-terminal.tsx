"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { VoiceInputButton } from "@/components/voice-input-button";
import { searchProduct, receiveStock } from "../actions";

interface FoundItem {
  kind: "PRODUCT" | "VARIANT";
  productId: number;
  variantId: number | null;
  name: string;
  sku: string | null;
  stock: number;
  price: number;
  imageUrl: string | null;
}

interface ReceiveLine {
  key: string;
  found: FoundItem;
  qty: number;
  unitCost?: number;
}

export function ReceiveTerminal() {
  const sp = useSearchParams();
  const router = useRouter();
  const initialSku = sp?.get("sku") || "";
  const [query, setQuery] = useState(initialSku);
  const [lines, setLines] = useState<ReceiveLine[]>([]);
  const [showScan, setShowScan] = useState(false);
  const [searching, setSearching] = useState(false);
  const [poNumber, setPoNumber] = useState("");
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [searchError, setSearchError] = useState<string | null>(null);

  async function lookup(q: string) {
    if (!q.trim()) return;
    setSearchError(null);
    setSearching(true);
    const r = await searchProduct(q.trim());
    setSearching(false);
    if (!r) {
      setSearchError(`找不到「${q}」— 請先去 /admin/products 建立商品`);
      return;
    }
    addLine(r);
    setQuery("");
  }

  function addLine(found: FoundItem) {
    const key = found.variantId ? `v${found.variantId}` : `p${found.productId}`;
    const existing = lines.find(l => l.key === key);
    if (existing) {
      setLines(lines.map(l => l.key === key ? { ...l, qty: l.qty + 1 } : l));
    } else {
      setLines([...lines, { key, found, qty: 1 }]);
    }
    if ("vibrate" in navigator) (navigator as Navigator).vibrate(30);
  }

  function setQty(key: string, qty: number) {
    setLines(lines.flatMap(l => l.key === key ? (qty > 0 ? [{ ...l, qty }] : []) : [l]));
  }
  function setCost(key: string, cost: number) {
    setLines(lines.map(l => l.key === key ? { ...l, unitCost: cost > 0 ? cost : undefined } : l));
  }

  async function submit() {
    if (lines.length === 0) return;
    startTransition(async () => {
      const r = await receiveStock({
        items: lines.map(l => ({
          productId: l.found.kind === "PRODUCT" ? l.found.productId : undefined,
          productVariantId: l.found.kind === "VARIANT" ? l.found.variantId! : undefined,
          qty: l.qty,
          unitCost: l.unitCost,
        })),
        poNumber: poNumber.trim() || undefined,
        supplier: supplier.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      if (r.ok) {
        if ("vibrate" in navigator) (navigator as Navigator).vibrate([50, 50, 100]);
        alert(`✅ 進貨完成 ${r.count} 項`);
        setLines([]); setPoNumber(""); setSupplier(""); setNotes("");
        router.refresh();
      } else {
        alert("❌ " + (r.error || "失敗"));
      }
    });
  }

  // 自動載入初始 sku
  if (initialSku && lines.length === 0 && !searching) {
    lookup(initialSku);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/inventory" className="text-xs text-[var(--fg-muted)] hover:text-[var(--gold)]">← 回庫存</Link>
          <h1 className="mt-1 font-serif text-2xl text-[var(--gold)]">📥 進貨</h1>
        </div>
      </div>

      {/* 大搜尋列 — 手機友善 */}
      <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lookup(query); } }}
            placeholder="輸入 SKU / 商品名稱"
            inputMode="search"
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-3 text-base focus:border-[var(--gold)] focus:outline-none"
            autoFocus
          />
          <VoiceInputButton
            onResult={(t) => { setQuery(t); lookup(t); }}
            className="rounded-lg border border-[var(--gold)]/40 bg-[var(--bg-elevated)] px-3 text-sm text-[var(--gold)]"
            label="🎤"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => lookup(query)}
            disabled={!query.trim() || searching}
            className="rounded-lg border border-[var(--gold)]/40 py-2.5 text-sm font-medium text-[var(--gold)] disabled:opacity-50"
          >
            {searching ? "搜尋..." : "🔍 搜尋"}
          </button>
          <button
            onClick={() => setShowScan(true)}
            className="rounded-lg bg-gradient-to-r from-green-600 to-green-700 py-2.5 text-sm font-semibold text-white"
          >
            📷 掃條碼
          </button>
        </div>
        {searchError && <p className="text-center text-xs text-red-400">{searchError}</p>}
      </div>

      {/* 進貨明細 */}
      {lines.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--fg-muted)]">
          掃條碼 / 搜尋商品 → 加入清單<br />
          <span className="text-[10px]">每掃到一次自動 +1，可多筆批次進貨</span>
        </div>
      ) : (
        <div className="space-y-2">
          {lines.map(l => (
            <div key={l.key} className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
              <div className="flex items-start gap-3">
                {l.found.imageUrl ? (
                  <img src={l.found.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-[var(--bg)] text-2xl text-[var(--fg-muted)]">📦</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-snug">{l.found.name}</div>
                  <div className="mt-0.5 text-xs text-[var(--fg-muted)]">
                    SKU: {l.found.sku} · 現有 {l.found.stock} → <span className="text-[var(--gold-bright)]">{l.found.stock + l.qty}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button onClick={() => setQty(l.key, l.qty - 1)} className="h-10 w-10 shrink-0 rounded-full border border-[var(--border)] text-xl hover:border-[var(--gold)]">−</button>
                <input
                  type="number"
                  value={l.qty}
                  onChange={(e) => setQty(l.key, Number(e.target.value) || 0)}
                  className="w-20 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-center text-xl font-mono"
                  min="1"
                  inputMode="numeric"
                />
                <button onClick={() => setQty(l.key, l.qty + 1)} className="h-10 w-10 shrink-0 rounded-full border border-[var(--border)] text-xl hover:border-[var(--gold)]">＋</button>
                <input
                  type="number"
                  value={l.unitCost || ""}
                  onChange={(e) => setCost(l.key, Number(e.target.value) || 0)}
                  placeholder="進貨成本（選填）"
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-sm"
                  inputMode="numeric"
                />
              </div>
            </div>
          ))}

          {/* 進貨單資訊 */}
          <details className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-sm">
            <summary className="cursor-pointer text-[var(--fg-muted)]">＋ 進貨單號 / 供應商 / 備註（可選）</summary>
            <div className="mt-3 space-y-2">
              <input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="進貨單號" className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
              <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="供應商" className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="備註" className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
            </div>
          </details>

          {/* sticky 底部結算 */}
          <div className="sticky bottom-0 -mx-4 mt-4 border-t border-[var(--gold)]/30 bg-[var(--bg)]/95 p-3 backdrop-blur md:mx-0 md:rounded-b-xl">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--fg-muted)]">{lines.length} 種商品 · 共 {lines.reduce((s, l) => s + l.qty, 0)} 件</span>
            </div>
            <button
              onClick={submit}
              disabled={pending || lines.length === 0}
              className="btn-gold mt-2 w-full rounded-full py-3.5 text-base font-bold disabled:opacity-50"
            >
              {pending ? "進貨中..." : "✅ 確認進貨"}
            </button>
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

"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { VoiceInputButton } from "@/components/voice-input-button";
import { searchProduct, receiveStock, receiveSerial, quickCreateProduct, quickReceiveUsedDevice } from "../actions";

interface FoundItem {
  kind: "PRODUCT" | "VARIANT";
  productId: number;
  variantId: number | null;
  name: string;
  sku: string | null;
  stock: number;
  price: number;
  imageUrl: string | null;
  tracksSerial?: boolean;
}

interface ReceiveLine {
  key: string;
  found: FoundItem;
  qty: number;
  unitCost?: number;
}

interface SerialEntry {
  found: FoundItem;
  serial: string;
  cost?: number;
  status: "pending" | "ok" | "error";
  message?: string;
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
  const [searchedQuery, setSearchedQuery] = useState("");  // 上次搜的字（給「+ 建立 X」按鈕用）
  // === 序號商品專屬狀態 ===
  const [serialMode, setSerialMode] = useState<FoundItem | null>(null);  // 進入序號掃描模式
  const [serialInput, setSerialInput] = useState("");
  const [serialCost, setSerialCost] = useState("");
  const [serialEntries, setSerialEntries] = useState<SerialEntry[]>([]);
  const [serialBusy, setSerialBusy] = useState(false);
  const [serialScan, setSerialScan] = useState(false);
  // === 模式切換 + inline 建立商品 ===
  const [mode, setMode] = useState<"normal" | "used">("normal");  // normal=一般進貨、used=二手機進貨
  const [createOpen, setCreateOpen] = useState(false);
  const [usedForm, setUsedForm] = useState({ name: "", imei: "", price: "", cost: "", notes: "" });
  const [usedScan, setUsedScan] = useState(false);
  const [usedBusy, setUsedBusy] = useState(false);
  const [usedHistory, setUsedHistory] = useState<Array<{ ok: boolean; productName: string; imei: string; message?: string }>>([]);

  async function lookup(q: string) {
    if (!q.trim()) return;
    setSearchError(null);
    setSearchedQuery(q.trim());
    setSearching(true);
    const r = await searchProduct(q.trim());
    setSearching(false);
    if (!r) {
      setSearchError(`找不到「${q}」`);
      // 自動展開 inline 建立 form
      setCreateOpen(true);
      return;
    }
    // 序號商品 → 進入序號模式（不加到批次清單）
    if (r.tracksSerial) {
      setSerialMode(r);
      setQuery("");
      return;
    }
    addLine(r);
    setQuery("");
  }

  async function submitSerial() {
    if (!serialMode || !serialInput.trim()) return;
    setSerialBusy(true);
    const cost = serialCost ? Number(serialCost) : undefined;
    const r = await receiveSerial({
      productId: serialMode.productId,
      productVariantId: serialMode.variantId ?? undefined,
      serial: serialInput.trim(),
      cost,
    });
    setSerialBusy(false);
    if (r.ok) {
      setSerialEntries(es => [{ found: serialMode, serial: serialInput.trim(), cost, status: "ok" }, ...es]);
      setSerialInput("");
      if ("vibrate" in navigator) (navigator as Navigator).vibrate(50);
    } else {
      setSerialEntries(es => [{ found: serialMode, serial: serialInput.trim(), status: "error", message: r.error }, ...es]);
      if ("vibrate" in navigator) (navigator as Navigator).vibrate([100, 50, 100]);
    }
  }

  function exitSerialMode() {
    setSerialMode(null);
    setSerialInput("");
    setSerialCost("");
    setSerialEntries([]);
    router.refresh();
  }

  // === inline 建立商品 + 進貨（搜不到時自動展開）===
  async function submitCreate(form: { name: string; price: string; cost: string; qty: string; tracksSerial: boolean }) {
    if (!form.name.trim() || !form.price) { alert("名稱、售價必填"); return; }
    const r = await quickCreateProduct({
      name: form.name,
      price: Number(form.price),
      cost: form.cost ? Number(form.cost) : undefined,
      tracksSerial: form.tracksSerial,
      initialStock: form.tracksSerial ? 0 : Math.max(1, Number(form.qty) || 1),
    });
    if (!r.ok) { alert(r.error); return; }
    setCreateOpen(false); setSearchError(null); setQuery("");
    if (r.product.tracksSerial) {
      // 序號商品 → 進入序號模式逐筆掃 IMEI
      setSerialMode({
        kind: "PRODUCT",
        productId: r.product.id,
        variantId: null,
        name: r.product.name,
        sku: r.product.slug,
        stock: 0,
        price: r.product.price,
        imageUrl: r.product.imageUrl,
        tracksSerial: true,
      });
    } else {
      router.refresh();
      alert(`✅ 已建立並入庫 ${r.product.name}（${r.product.stock} 件）`);
    }
  }

  // === 二手機快速進貨 ===
  async function submitUsed() {
    if (!usedForm.name.trim() || !usedForm.imei.trim()) { alert("機型 + IMEI 必填"); return; }
    if (!usedForm.price || !usedForm.cost) { alert("售價 + 成本必填"); return; }
    setUsedBusy(true);
    const r = await quickReceiveUsedDevice({
      productName: usedForm.name,
      imei: usedForm.imei,
      price: Number(usedForm.price),
      cost: Number(usedForm.cost),
      notes: usedForm.notes || undefined,
    });
    setUsedBusy(false);
    if (r.ok) {
      setUsedHistory(h => [{ ok: true, productName: r.productName, imei: usedForm.imei }, ...h].slice(0, 20));
      // 保留 name/price/cost（同型號連收多支不用重填），只清 IMEI + notes
      setUsedForm({ ...usedForm, imei: "", notes: "" });
      if ("vibrate" in navigator) (navigator as Navigator).vibrate(60);
    } else {
      setUsedHistory(h => [{ ok: false, productName: usedForm.name, imei: usedForm.imei, message: r.error }, ...h].slice(0, 20));
      if ("vibrate" in navigator) (navigator as Navigator).vibrate([100, 50, 100]);
    }
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

      {/* === 模式切換：一般進貨 / 二手機 === */}
      <div className="flex gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-1">
        <button
          onClick={() => setMode("normal")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${mode === "normal" ? "bg-green-500/20 text-green-300" : "text-[var(--fg-muted)]"}`}
        >📥 一般進貨</button>
        <button
          onClick={() => setMode("used")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${mode === "used" ? "bg-purple-500/20 text-purple-300" : "text-[var(--fg-muted)]"}`}
        >📱 二手機收進</button>
      </div>

      {/* === 一般進貨模式 === */}
      {mode === "normal" && (
        <>
          {/* 大搜尋列 */}
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
            {searchError && (
              <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-3 text-center text-xs">
                <p className="text-orange-300">{searchError}</p>
                <button
                  onClick={() => setCreateOpen(true)}
                  className="mt-2 rounded-full bg-[var(--gold)] px-4 py-1.5 text-xs font-semibold text-black"
                >
                  ➕ 建立「{searchedQuery}」並進貨
                </button>
              </div>
            )}
          </div>

          {createOpen && <InlineCreateForm initialName={searchedQuery} onCancel={() => setCreateOpen(false)} onSubmit={submitCreate} />}
        </>
      )}

      {/* === 二手機收進模式 === */}
      {mode === "used" && (
        <UsedReceivePanel
          form={usedForm}
          setForm={setUsedForm}
          busy={usedBusy}
          history={usedHistory}
          onScan={() => setUsedScan(true)}
          onSubmit={submitUsed}
        />
      )}

      {/* 進貨明細 */}
      {mode === "normal" && (lines.length === 0 ? (
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
      ))}

      {usedScan && (
        <BarcodeScanner
          onDetected={(code) => { setUsedScan(false); setUsedForm({ ...usedForm, imei: code }); }}
          onClose={() => setUsedScan(false)}
        />
      )}

      {showScan && (
        <BarcodeScanner
          onDetected={(code) => { setShowScan(false); lookup(code); }}
          onClose={() => setShowScan(false)}
        />
      )}

      {serialScan && (
        <BarcodeScanner
          onDetected={(code) => { setSerialScan(false); setSerialInput(code); }}
          onClose={() => setSerialScan(false)}
        />
      )}

      {/* === 序號（IMEI）進貨模式 === */}
      {serialMode && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0706]">
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-elevated)] p-3">
            <div>
              <div className="text-xs text-[var(--fg-muted)]">📱 序號進貨模式</div>
              <div className="text-sm">{serialMode.name}</div>
            </div>
            <button onClick={exitSerialMode} className="rounded-full border border-[var(--border)] px-3 py-1 text-xs">完成</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div className="rounded-lg border-2 border-[var(--gold)]/40 bg-[var(--bg-elevated)] p-3">
              <div className="flex gap-2">
                <input
                  value={serialInput}
                  onChange={(e) => setSerialInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitSerial(); } }}
                  placeholder="輸入或掃 IMEI / 序號"
                  autoFocus
                  inputMode="text"
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-3 text-base font-mono focus:border-[var(--gold)] focus:outline-none"
                />
                <button
                  onClick={() => setSerialScan(true)}
                  className="rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-3 text-sm font-semibold text-white"
                >
                  📷
                </button>
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  value={serialCost}
                  onChange={(e) => setSerialCost(e.target.value)}
                  placeholder="進貨成本（選填，套用所有後續序號）"
                  inputMode="numeric"
                  className="flex-1 rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                />
                <button onClick={submitSerial} disabled={serialBusy || !serialInput.trim()} className="btn-gold rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50">
                  {serialBusy ? "..." : "+ 加入"}
                </button>
              </div>
              <p className="mt-2 text-[10px] text-[var(--fg-muted)]">小技巧：按 Enter 直接送出，掃完一支立刻可掃下一支</p>
            </div>

            <div>
              <h3 className="mb-2 text-xs text-[var(--fg-muted)]">本次進貨 {serialEntries.filter(e => e.status === "ok").length} 件成功 / {serialEntries.filter(e => e.status === "error").length} 件失敗</h3>
              <div className="space-y-1">
                {serialEntries.map((e, i) => (
                  <div key={i} className={`flex items-center justify-between rounded border px-3 py-2 text-xs ${e.status === "ok" ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                    <div className="font-mono">{e.serial}</div>
                    <div className={e.status === "ok" ? "text-green-400" : "text-red-400"}>
                      {e.status === "ok" ? "✓ 已加入" : `✗ ${e.message || "失敗"}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === Inline 建立商品 + 進貨表單（搜不到時 auto-show）===
function InlineCreateForm({ initialName, onCancel, onSubmit }: {
  initialName: string;
  onCancel: () => void;
  onSubmit: (form: { name: string; price: string; cost: string; qty: string; tracksSerial: boolean }) => void;
}) {
  const [name, setName] = useState(initialName);
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [qty, setQty] = useState("1");
  const [tracksSerial, setTracksSerial] = useState(false);

  return (
    <div className="space-y-3 rounded-2xl border-2 border-[var(--gold)]/40 bg-[var(--bg-elevated)] p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-base text-[var(--gold)]">➕ 新建商品 + 進貨</h3>
        <button onClick={onCancel} className="text-xs text-[var(--fg-muted)]">✕</button>
      </div>
      <Field label="商品名稱 *">
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-base" autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="售價 (NT$) *">
          <input type="number" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="500" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-base" />
        </Field>
        <Field label="成本 (NT$)">
          <input type="number" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="300" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-base" />
        </Field>
      </div>
      <label className="flex items-center gap-2 rounded-lg bg-black/30 p-2.5 text-xs">
        <input type="checkbox" checked={tracksSerial} onChange={(e) => setTracksSerial(e.target.checked)} className="h-4 w-4 accent-[var(--gold)]" />
        <span>📱 追蹤序號 / IMEI（3C / 二手機）— 之後逐筆掃序號</span>
      </label>
      {!tracksSerial && (
        <Field label="初始進貨數量">
          <input type="number" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-base" />
        </Field>
      )}
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 rounded-full border border-[var(--border)] py-2 text-sm">取消</button>
        <button onClick={() => onSubmit({ name, price, cost, qty, tracksSerial })} className="btn-gold flex-1 rounded-full py-2 text-sm font-semibold">建立 + 進貨</button>
      </div>
    </div>
  );
}

// === 二手機收進 panel ===
function UsedReceivePanel({ form, setForm, busy, history, onScan, onSubmit }: {
  form: { name: string; imei: string; price: string; cost: string; notes: string };
  setForm: (f: { name: string; imei: string; price: string; cost: string; notes: string }) => void;
  busy: boolean;
  history: Array<{ ok: boolean; productName: string; imei: string; message?: string }>;
  onScan: () => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <div className="space-y-3 rounded-2xl border-2 border-purple-500/40 bg-[var(--bg-elevated)] p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-base text-purple-300">📱 二手機快速收進</h3>
          <span className="text-[10px] text-[var(--fg-muted)]">機型相同會自動歸到同商品</span>
        </div>
        <Field label="機型 *（同型號連續收會自動沿用）">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="iPhone 14 Pro 黑 256GB" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-base" />
        </Field>
        <Field label="IMEI *">
          <div className="flex gap-2">
            <input value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value })} placeholder="掃條碼或手打 15 碼" inputMode="numeric" className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-base font-mono" />
            <button onClick={onScan} className="rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-3 text-sm font-semibold text-white">📷</button>
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="售價 (NT$) *">
            <input type="number" inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="22000" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-base" />
          </Field>
          <Field label="成本 (NT$) *">
            <input type="number" inputMode="numeric" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="18000" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-base" />
          </Field>
        </div>
        <Field label="備註（選填，例：原機主姓名 / 收件特徵）">
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
        </Field>
        <button onClick={onSubmit} disabled={busy || !form.name || !form.imei || !form.price || !form.cost} className="w-full rounded-full bg-gradient-to-r from-purple-600 to-purple-700 py-3 text-base font-bold text-white disabled:opacity-50">
          {busy ? "處理中..." : "✅ 收進此台 + 自動入庫"}
        </button>
      </div>

      {history.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
          <h4 className="mb-2 text-xs text-[var(--fg-muted)]">本次收進 {history.filter(h => h.ok).length} 台 ✓ / {history.filter(h => !h.ok).length} 失敗</h4>
          <div className="space-y-1">
            {history.map((h, i) => (
              <div key={i} className={`flex items-center justify-between rounded px-3 py-1.5 text-xs ${h.ok ? "bg-green-500/10" : "bg-red-500/10"}`}>
                <div>
                  <div className={h.ok ? "text-green-400" : "text-red-400"}>{h.productName}</div>
                  <div className="font-mono text-[10px] text-[var(--fg-muted)]">{h.imei}</div>
                </div>
                <div className="text-right text-[10px]">
                  {h.ok ? "✓ 已入庫" : `✗ ${h.message}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-[var(--fg)]">{label}</label>
      {children}
    </div>
  );
}

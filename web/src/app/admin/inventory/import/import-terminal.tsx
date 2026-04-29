"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { searchProduct, receiveStock } from "../actions";

interface ParsedRow {
  rowIndex: number;
  raw: string;
  sku?: string;
  qty?: number;
  unitCost?: number;
  status: "pending" | "found" | "not-found" | "error" | "ok";
  message?: string;
  productId?: number;
  productVariantId?: number;
  productName?: string;
}

export function ImportTerminal() {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [poNumber, setPoNumber] = useState("");
  const [supplier, setSupplier] = useState("");
  const [pending, startTransition] = useTransition();
  const [resolving, setResolving] = useState(false);

  function parse() {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const parsed: ParsedRow[] = lines.map((l, i) => {
      // 支援 CSV / TSV / 空白分隔。三欄: SKU,QTY,COST(可選)
      const cells = l.split(/[,\t]+|\s{2,}/).map(c => c.trim()).filter(Boolean);
      if (cells.length < 2) {
        return { rowIndex: i + 1, raw: l, status: "error", message: "格式錯，需至少 SKU + 數量" };
      }
      const sku = cells[0];
      const qty = Number(cells[1]);
      const cost = cells[2] ? Number(cells[2]) : undefined;
      if (!sku || isNaN(qty) || qty <= 0) {
        return { rowIndex: i + 1, raw: l, status: "error", message: "SKU 或數量無效" };
      }
      return { rowIndex: i + 1, raw: l, sku, qty, unitCost: cost, status: "pending" };
    });
    setRows(parsed);
  }

  async function resolveAll() {
    setResolving(true);
    const updated: ParsedRow[] = [];
    for (const r of rows) {
      if (r.status === "error" || !r.sku) { updated.push(r); continue; }
      const found = await searchProduct(r.sku);
      if (!found) {
        updated.push({ ...r, status: "not-found", message: `查無 ${r.sku}` });
      } else {
        updated.push({
          ...r,
          status: "found",
          productId: found.kind === "PRODUCT" ? found.productId : undefined,
          productVariantId: found.kind === "VARIANT" ? found.variantId! : undefined,
          productName: found.name,
        });
      }
    }
    setRows(updated);
    setResolving(false);
  }

  async function execute() {
    const valid = rows.filter(r => r.status === "found");
    if (valid.length === 0) { alert("沒有可匯入的有效資料"); return; }
    if (!confirm(`確定匯入 ${valid.length} 筆？\n進貨單號：${poNumber || "（無）"}\n供應商：${supplier || "（無）"}`)) return;
    startTransition(async () => {
      const r = await receiveStock({
        items: valid.map(v => ({
          productId: v.productId,
          productVariantId: v.productVariantId,
          qty: v.qty!,
          unitCost: v.unitCost,
        })),
        poNumber: poNumber || undefined,
        supplier: supplier || undefined,
      });
      if (r.ok) {
        alert(`✅ 匯入完成 ${r.count} 筆`);
        setText(""); setRows([]); setPoNumber(""); setSupplier("");
      } else {
        alert("❌ " + (r.error || ""));
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/inventory" className="text-xs text-[var(--fg-muted)] hover:text-[var(--gold)]">← 回庫存</Link>
        <h1 className="mt-1 font-serif text-2xl text-[var(--gold)]">📑 CSV 批次進貨</h1>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">貼上供應商出貨清單，三欄：<span className="font-mono">SKU,數量,單位成本(可選)</span></p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder={`iphone-15-pro-clear-case,5,200\nfast-charger-20w,10,150\ntype-c-cable-1m,20`}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3 font-mono text-sm focus:border-[var(--gold)] focus:outline-none"
      />

      <div className="flex flex-wrap gap-2">
        <button onClick={parse} disabled={!text.trim()} className="rounded-full border border-[var(--gold)]/40 px-4 py-2 text-sm text-[var(--gold)] disabled:opacity-50">
          1. 解析
        </button>
        <button onClick={resolveAll} disabled={rows.length === 0 || resolving} className="rounded-full border border-[var(--gold)]/40 px-4 py-2 text-sm text-[var(--gold)] disabled:opacity-50">
          {resolving ? "對應中..." : "2. 對應商品"}
        </button>
        <input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="進貨單號" className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
        <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="供應商" className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
        <button onClick={execute} disabled={pending || !rows.some(r => r.status === "found")} className="btn-gold rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50">
          {pending ? "匯入中..." : "3. 確認匯入"}
        </button>
      </div>

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-elevated)] text-xs text-[var(--fg-muted)]">
              <tr>
                <th className="p-2 text-left font-normal">#</th>
                <th className="p-2 text-left font-normal">SKU</th>
                <th className="p-2 text-right font-normal">數量</th>
                <th className="p-2 text-right font-normal">成本</th>
                <th className="p-2 text-left font-normal">對應商品</th>
                <th className="p-2 text-left font-normal">狀態</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.rowIndex} className={`border-t border-[var(--border)] ${r.status === "error" || r.status === "not-found" ? "bg-red-500/5" : r.status === "found" ? "bg-green-500/5" : ""}`}>
                  <td className="p-2 text-[var(--fg-muted)]">{r.rowIndex}</td>
                  <td className="p-2 font-mono text-xs">{r.sku || r.raw}</td>
                  <td className="p-2 text-right font-mono">{r.qty || "—"}</td>
                  <td className="p-2 text-right font-mono text-xs">{r.unitCost ?? "—"}</td>
                  <td className="p-2 text-xs">{r.productName || "—"}</td>
                  <td className="p-2 text-xs">
                    {r.status === "pending" && <span className="text-[var(--fg-muted)]">⏳ 待對應</span>}
                    {r.status === "found" && <span className="text-green-400">✓ 已對應</span>}
                    {r.status === "not-found" && <span className="text-red-400">✗ 查無</span>}
                    {r.status === "error" && <span className="text-red-400">⚠️ {r.message}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

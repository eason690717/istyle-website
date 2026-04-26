"use client";
import { useMemo, useState, useTransition } from "react";
import { createVariant, updateVariant, deleteVariant } from "./actions";

interface Variant {
  id: number;
  name: string;
  optionValues?: string | null;
  price: number;
  comparePrice?: number | null;
  stock: number;
  sku?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
}

export function VariantManager({
  productId, productPrice, variants,
}: {
  productId: number;
  productPrice: number;
  variants: Variant[];
}) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-6">
      {/* ⭐ 通用 3 層組合產生器（任意維度自由組合）*/}
      <MatrixBuilder productId={productId} basePrice={productPrice} hasVariants={variants.length > 0} />

      {/* 範本快速建立（顏色/容量等常見組合）*/}
      {variants.length === 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
          <h3 className="font-medium text-[var(--gold)]">⚡ 或用內建範本（一鍵建立）</h3>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">點按鈕一次建立多個規格（建立後可個別編輯價格庫存）</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <QuickTemplate productId={productId} basePrice={productPrice} template="colors-3" label="3 色（黑/白/透明）" />
            <QuickTemplate productId={productId} basePrice={productPrice} template="colors-5" label="5 色（黑/白/紅/藍/綠）" />
            <QuickTemplate productId={productId} basePrice={productPrice} template="iphone-storage" label="iPhone 4 容量" />
            <QuickTemplate productId={productId} basePrice={productPrice} template="sizes-3" label="3 尺寸（S/M/L）" />
            <QuickTemplate productId={productId} basePrice={productPrice} template="sizes-5" label="5 尺寸（XS-XL）" />
            <QuickTemplate productId={productId} basePrice={productPrice} template="clothes-color-size" label="衣服（色×尺寸）" />
            <QuickTemplate productId={productId} basePrice={productPrice} template="ipad-storage-net" label="iPad 容量×WiFi" />
          </div>
        </div>
      )}

      {/* 變體列表 */}
      {variants.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--bg-soft)] text-left text-xs text-[var(--gold)]">
              <tr>
                <th className="px-3 py-2.5">規格名稱</th>
                <th className="px-3 py-2.5 text-right">售價</th>
                <th className="px-3 py-2.5 text-right">原價</th>
                <th className="px-3 py-2.5 text-right">庫存</th>
                <th className="px-3 py-2.5">SKU</th>
                <th className="px-3 py-2.5 text-center">狀態</th>
                <th className="px-3 py-2.5 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {variants.map((v, i) => (
                <VariantRow key={v.id} variant={v} bgIdx={i % 2} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 手動新增 */}
      {!showAdd ? (
        <button
          onClick={() => setShowAdd(true)}
          className="btn-gold-outline w-full rounded-full py-3 text-sm"
        >
          + 手動新增規格
        </button>
      ) : (
        <NewVariantForm
          productId={productId}
          basePrice={productPrice}
          onCancel={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

function VariantRow({ variant, bgIdx }: { variant: Variant; bgIdx: number }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [confirmDel, setConfirmDel] = useState(false);

  if (editing) {
    return (
      <tr className={bgIdx === 0 ? "bg-[#141414]" : "bg-[#181818]"}>
        <td colSpan={7} className="px-3 py-3">
          <form
            action={(fd) => start(async () => { await updateVariant(variant.id, fd); setEditing(false); })}
            className="grid gap-2 sm:grid-cols-6"
          >
            <input name="name" defaultValue={variant.name} required className={inputCls + " sm:col-span-2"} placeholder="規格名稱" />
            <input name="price" type="number" defaultValue={variant.price} required className={inputCls + " font-mono"} placeholder="售價" />
            <input name="comparePrice" type="number" defaultValue={variant.comparePrice ?? ""} className={inputCls + " font-mono"} placeholder="原價" />
            <input name="stock" type="number" defaultValue={variant.stock} className={inputCls + " font-mono"} placeholder="庫存" />
            <input name="sku" defaultValue={variant.sku ?? ""} className={inputCls + " font-mono text-xs"} placeholder="SKU" />
            <label className="flex items-center gap-1 text-xs text-[var(--fg)] sm:col-span-2">
              <input name="isActive" type="checkbox" defaultChecked={variant.isActive} className="h-4 w-4 accent-[var(--gold)]" />
              上架
            </label>
            <div className="flex gap-2 sm:col-span-4">
              <button type="submit" disabled={pending} className="btn-gold rounded-full px-4 py-1.5 text-xs">儲存</button>
              <button type="button" onClick={() => setEditing(false)} className="rounded-full border border-[var(--border)] px-4 py-1.5 text-xs text-[var(--fg-muted)]">取消</button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className={bgIdx === 0 ? "bg-[#141414]" : "bg-[#181818]"}>
      <td className="px-3 py-2.5 font-medium text-[var(--fg)]">
        {variant.name}
        {variant.optionValues && (
          <div className="text-[10px] text-[var(--fg-muted)]">{variant.optionValues}</div>
        )}
      </td>
      <td className="px-3 py-2.5 text-right font-mono text-[var(--gold)]">NT$ {variant.price.toLocaleString()}</td>
      <td className="px-3 py-2.5 text-right font-mono text-xs text-[var(--fg-muted)] line-through">
        {variant.comparePrice ? `NT$ ${variant.comparePrice.toLocaleString()}` : "—"}
      </td>
      <td className="px-3 py-2.5 text-right font-mono">
        <span className={variant.stock === 0 ? "text-red-400" : variant.stock < 5 ? "text-yellow-400" : "text-[var(--fg)]"}>
          {variant.stock}
        </span>
      </td>
      <td className="px-3 py-2.5 font-mono text-xs text-[var(--fg-muted)]">{variant.sku || "—"}</td>
      <td className="px-3 py-2.5 text-center">
        <span className={`rounded px-2 py-0.5 text-[10px] ${variant.isActive ? "bg-green-500/20 text-green-300" : "bg-zinc-500/20 text-zinc-400"}`}>
          {variant.isActive ? "上架" : "下架"}
        </span>
      </td>
      <td className="px-3 py-2.5 text-center">
        {confirmDel ? (
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-red-400">刪除？</span>
            <div className="flex gap-1">
              <button onClick={() => start(async () => { await deleteVariant(variant.id); })} disabled={pending} className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] text-red-300">{pending ? "..." : "✓"}</button>
              <button onClick={() => setConfirmDel(false)} className="rounded bg-zinc-700/40 px-2 py-0.5 text-[10px] text-zinc-300">×</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <button onClick={() => setEditing(true)} className="text-[10px] text-[var(--gold)]">編輯</button>
            <button onClick={() => setConfirmDel(true)} className="text-[10px] text-red-400">刪除</button>
          </div>
        )}
      </td>
    </tr>
  );
}

function NewVariantForm({ productId, basePrice, onCancel }: {
  productId: number; basePrice: number; onCancel: () => void;
}) {
  const [pending, start] = useTransition();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="rounded-xl border border-[var(--gold)] bg-[var(--bg-elevated)] p-5">
      <h3 className="font-medium text-[var(--gold)]">新增規格</h3>
      <p className="mt-1 text-xs text-[var(--fg-muted)]">最少只需填名稱 + 價格 + 庫存</p>
      <form
        action={(fd) => start(async () => { await createVariant(productId, fd); onCancel(); })}
        className="mt-3 space-y-3"
      >
        {/* 主要欄位：名稱 + 價格 + 庫存（一排） */}
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <Field label="規格名稱" required hint="例：黑色 / M 號 / 128GB / 330g">
            <input name="name" required autoFocus className={inputCls} placeholder="例：黑色 M" />
          </Field>
          <Field label="售價（NTD）" required>
            <input name="price" type="number" required defaultValue={basePrice} className={inputCls + " font-mono"} />
          </Field>
          <Field label="庫存">
            <input name="stock" type="number" defaultValue={10} className={inputCls + " font-mono"} />
          </Field>
        </div>

        {/* 進階：摺疊的選項 */}
        <div className="rounded-lg border border-[var(--border-soft)]">
          <button
            type="button"
            onClick={() => setShowAdvanced(s => !s)}
            className="flex w-full items-center justify-between px-3 py-2 text-xs text-[var(--fg-muted)] hover:text-[var(--gold)]"
          >
            <span>{showAdvanced ? "▾" : "▸"} 進階選項（原價、成本、SKU、圖片、JSON 選項值）</span>
            <span className="text-[10px]">{showAdvanced ? "收合" : "通常不必填"}</span>
          </button>
          {showAdvanced && (
            <div className="space-y-3 border-t border-[var(--border-soft)] p-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="原價（劃掉顯示）">
                  <input name="comparePrice" type="number" className={inputCls + " font-mono"} />
                </Field>
                <Field label="成本（內部）">
                  <input name="cost" type="number" className={inputCls + " font-mono"} />
                </Field>
                <Field label="SKU">
                  <input name="sku" className={inputCls + " font-mono text-xs"} placeholder="ABC-001" />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="排序（小→大）">
                  <input name="sortOrder" type="number" defaultValue={0} className={inputCls + " font-mono"} />
                </Field>
                <Field label="變體圖片網址">
                  <input name="imageUrl" type="url" className={inputCls} placeholder="https://..." />
                </Field>
              </div>
              <Field label="選項值 JSON" hint='例: {"顏色":"黑","容量":"128GB"} — 用「⭐ 通用組合產生器」會自動填，手動加可留空'>
                <input name="optionValues" className={inputCls + " font-mono text-xs"} placeholder='{"顏色":"黑","容量":"128GB"}' />
              </Field>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={pending} className="btn-gold flex-1 rounded-full py-2 text-sm font-semibold disabled:opacity-50">
            {pending ? "建立中..." : "建立規格"}
          </button>
          <button type="button" onClick={onCancel} className="rounded-full border border-[var(--border)] px-6 py-2 text-sm text-[var(--fg-muted)]">取消</button>
        </div>
      </form>
    </div>
  );
}

// 快速範本
function QuickTemplate({ productId, basePrice, template, label }: {
  productId: number; basePrice: number; template: string; label: string;
}) {
  const [pending, start] = useTransition();
  function build() {
    let variants: Array<{ name: string; opts: Record<string, string>; priceDelta: number; stock: number }> = [];
    if (template === "colors-3") {
      variants = [
        { name: "黑色", opts: { 顏色: "黑色" }, priceDelta: 0, stock: 30 },
        { name: "白色", opts: { 顏色: "白色" }, priceDelta: 0, stock: 30 },
        { name: "透明", opts: { 顏色: "透明" }, priceDelta: 0, stock: 30 },
      ];
    } else if (template === "colors-5") {
      variants = [
        { name: "黑色", opts: { 顏色: "黑色" }, priceDelta: 0, stock: 20 },
        { name: "白色", opts: { 顏色: "白色" }, priceDelta: 0, stock: 20 },
        { name: "紅色", opts: { 顏色: "紅色" }, priceDelta: 0, stock: 20 },
        { name: "藍色", opts: { 顏色: "藍色" }, priceDelta: 0, stock: 20 },
        { name: "綠色", opts: { 顏色: "綠色" }, priceDelta: 0, stock: 20 },
      ];
    } else if (template === "sizes-5") {
      for (const s of ["XS","S","M","L","XL"]) {
        variants.push({ name: s, opts: { 尺寸: s }, priceDelta: 0, stock: 20 });
      }
    } else if (template === "clothes-color-size") {
      const colors = ["黑色","白色","灰色"];
      const sizes = ["S","M","L","XL"];
      for (const c of colors) for (const s of sizes) {
        variants.push({
          name: `${c} / ${s}`,
          opts: { 顏色: c, 尺寸: s },
          priceDelta: 0,
          stock: 5,
        });
      }
    } else if (template === "iphone-storage") {
      variants = [
        { name: "128GB", opts: { 容量: "128GB" }, priceDelta: 0, stock: 10 },
        { name: "256GB", opts: { 容量: "256GB" }, priceDelta: 2000, stock: 8 },
        { name: "512GB", opts: { 容量: "512GB" }, priceDelta: 5000, stock: 5 },
        { name: "1TB",   opts: { 容量: "1TB" },   priceDelta: 9000, stock: 3 },
      ];
    } else if (template === "sizes-3") {
      variants = [
        { name: "S", opts: { 尺寸: "S" }, priceDelta: 0, stock: 20 },
        { name: "M", opts: { 尺寸: "M" }, priceDelta: 0, stock: 30 },
        { name: "L", opts: { 尺寸: "L" }, priceDelta: 0, stock: 25 },
      ];
    } else if (template === "ipad-storage-net") {
      const storages = [
        { gb: "64GB", delta: 0 },
        { gb: "256GB", delta: 3000 },
        { gb: "512GB", delta: 6000 },
      ];
      const nets = [
        { net: "WiFi", delta: 0 },
        { net: "WiFi+5G", delta: 4000 },
      ];
      for (const s of storages) for (const n of nets) {
        variants.push({
          name: `${s.gb} ${n.net}`,
          opts: { 容量: s.gb, 網路: n.net },
          priceDelta: s.delta + n.delta,
          stock: 5,
        });
      }
    }

    start(async () => {
      for (const v of variants) {
        const fd = new FormData();
        fd.set("name", v.name);
        fd.set("optionValues", JSON.stringify(v.opts));
        fd.set("price", String(basePrice + v.priceDelta));
        fd.set("stock", String(v.stock));
        fd.set("sortOrder", "0");
        await createVariant(productId, fd);
      }
    });
  }
  return (
    <button
      onClick={build}
      disabled={pending}
      className="rounded-full border border-[var(--gold-soft)] bg-[var(--gold)]/5 px-3 py-1.5 text-xs text-[var(--gold)] hover:bg-[var(--gold)]/15 disabled:opacity-50"
    >
      {pending ? "建立中..." : `+ ${label}`}
    </button>
  );
}

// ─── 通用 3 層組合產生器 ────────────────────────────────────
const MAX_PER_LAYER = 10;

interface Layer {
  name: string;        // 維度名稱，例如「磅數」「顏色」「尺寸」
  values: string[];    // 該維度的值，例如 ["330g","280g","240g"]
}

function MatrixBuilder({ productId, basePrice, hasVariants }: {
  productId: number; basePrice: number; hasVariants: boolean;
}) {
  const [open, setOpen] = useState(!hasVariants);
  const [layers, setLayers] = useState<Layer[]>([
    { name: "", values: [] },
    { name: "", values: [] },
    { name: "", values: [] },
  ]);
  const [previewing, setPreviewing] = useState(false);
  const [pending, start] = useTransition();

  // 計算組合（只用有名稱+至少一個值的層）
  const activeLayers = layers.filter(l => l.name.trim() && l.values.length > 0);
  const combos = useMemo<Array<Record<string, string>>>(() => {
    if (activeLayers.length === 0) return [];
    let result: Array<Record<string, string>> = [{}];
    for (const layer of activeLayers) {
      const next: Array<Record<string, string>> = [];
      for (const r of result) {
        for (const v of layer.values) {
          next.push({ ...r, [layer.name.trim()]: v });
        }
      }
      result = next;
    }
    return result;
  }, [activeLayers]);

  // 每組的 price/stock state
  const [overrides, setOverrides] = useState<Record<string, { price: number; stock: number }>>({});
  function getKey(c: Record<string, string>) { return Object.entries(c).map(([k,v]) => `${k}=${v}`).join("|"); }
  function getRow(c: Record<string, string>) {
    const k = getKey(c);
    return overrides[k] ?? { price: basePrice, stock: 5 };
  }
  function setRow(c: Record<string, string>, patch: Partial<{ price: number; stock: number }>) {
    const k = getKey(c);
    setOverrides(prev => ({ ...prev, [k]: { ...getRow(c), ...patch } }));
  }
  function setAllPrice(p: number) {
    const next: typeof overrides = {};
    for (const c of combos) next[getKey(c)] = { ...getRow(c), price: p };
    setOverrides(next);
  }
  function setAllStock(s: number) {
    const next: typeof overrides = {};
    for (const c of combos) next[getKey(c)] = { ...getRow(c), stock: s };
    setOverrides(next);
  }

  function bulkCreate() {
    if (combos.length === 0) return;
    if (!confirm(`確定建立 ${combos.length} 個規格？`)) return;
    start(async () => {
      let i = 0;
      for (const c of combos) {
        const row = getRow(c);
        const name = Object.values(c).join(" / ");
        const fd = new FormData();
        fd.set("name", name);
        fd.set("optionValues", JSON.stringify(c));
        fd.set("price", String(row.price));
        fd.set("stock", String(row.stock));
        fd.set("sortOrder", String(i++));
        await createVariant(productId, fd);
      }
      setPreviewing(false);
      setLayers([{ name: "", values: [] }, { name: "", values: [] }, { name: "", values: [] }]);
      setOverrides({});
    });
  }

  return (
    <div className="rounded-xl border border-[var(--gold)] bg-[var(--gold)]/5 p-5">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <h3 className="font-medium text-[var(--gold)]">⭐ 通用組合產生器（最多 3 層）</h3>
          <p className="mt-0.5 text-xs text-[var(--fg-muted)]">自由命名每層維度（磅數／款式／尺寸…）→ 一鍵建出全部組合</p>
        </div>
        <span className="text-[var(--gold)]">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {!previewing ? (
            <>
              {layers.map((layer, idx) => (
                <LayerEditor
                  key={idx}
                  index={idx}
                  layer={layer}
                  onChange={(next) => {
                    const copy = [...layers];
                    copy[idx] = next;
                    setLayers(copy);
                  }}
                />
              ))}
              <p className="text-[10px] text-[var(--fg-muted)]">提示：用不到的層留白即可（清掉維度名稱該層就會跳過）</p>

              <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
                <div className="text-sm">
                  {combos.length === 0
                    ? <span className="text-[var(--fg-muted)]">填好維度＋值後可預覽</span>
                    : <span className="text-[var(--fg)]">將產生 <strong className="text-[var(--gold)]">{combos.length}</strong> 個規格組合</span>
                  }
                </div>
                <button
                  type="button"
                  disabled={combos.length === 0}
                  onClick={() => setPreviewing(true)}
                  className="btn-gold rounded-full px-5 py-1.5 text-sm font-semibold disabled:opacity-40"
                >
                  預覽 →
                </button>
              </div>
            </>
          ) : (
            // 預覽 + 編輯每組價格/庫存
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-xs">
                <span className="text-[var(--fg-muted)]">批次套用：</span>
                <label className="flex items-center gap-1">
                  全部售價
                  <input type="number" defaultValue={basePrice} onBlur={(e) => setAllPrice(parseInt(e.target.value || "0"))} className={inputCls + " w-20 px-2 py-1 text-xs"} />
                </label>
                <label className="flex items-center gap-1">
                  全部庫存
                  <input type="number" defaultValue={5} onBlur={(e) => setAllStock(parseInt(e.target.value || "0"))} className={inputCls + " w-16 px-2 py-1 text-xs"} />
                </label>
                <span className="ml-auto text-[var(--fg-muted)]">{combos.length} 組合</span>
              </div>

              <div className="max-h-96 overflow-auto rounded-lg border border-[var(--border)]">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-[var(--bg-soft)] text-left text-xs text-[var(--gold)]">
                    <tr>
                      <th className="px-3 py-2">組合</th>
                      <th className="px-3 py-2 w-32">售價</th>
                      <th className="px-3 py-2 w-24">庫存</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-soft)]">
                    {combos.map((c) => {
                      const row = getRow(c);
                      const key = getKey(c);
                      return (
                        <tr key={key} className="bg-[#141414]">
                          <td className="px-3 py-1.5 font-medium text-[var(--fg)]">
                            {Object.entries(c).map(([k,v]) => <span key={k} className="mr-2"><span className="text-[10px] text-[var(--fg-muted)]">{k}:</span> {v}</span>)}
                          </td>
                          <td className="px-3 py-1.5">
                            <input type="number" value={row.price} onChange={(e) => setRow(c, { price: parseInt(e.target.value || "0") })} className={inputCls + " px-2 py-1 font-mono text-xs"} />
                          </td>
                          <td className="px-3 py-1.5">
                            <input type="number" value={row.stock} onChange={(e) => setRow(c, { stock: parseInt(e.target.value || "0") })} className={inputCls + " px-2 py-1 font-mono text-xs"} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3">
                <button type="button" disabled={pending} onClick={bulkCreate} className="btn-gold flex-1 rounded-full py-2.5 text-sm font-semibold disabled:opacity-50">
                  {pending ? `建立中... (${combos.length} 個)` : `✓ 一鍵建立 ${combos.length} 個規格`}
                </button>
                <button type="button" onClick={() => setPreviewing(false)} className="rounded-full border border-[var(--border)] px-6 py-2 text-sm text-[var(--fg-muted)]">← 回去改</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LayerEditor({ index, layer, onChange }: {
  index: number; layer: Layer; onChange: (next: Layer) => void;
}) {
  const [draft, setDraft] = useState("");
  function addValue() {
    const v = draft.trim();
    if (!v) return;
    if (layer.values.includes(v)) { setDraft(""); return; }
    if (layer.values.length >= MAX_PER_LAYER) { alert(`每層最多 ${MAX_PER_LAYER} 個值`); return; }
    onChange({ ...layer, values: [...layer.values, v] });
    setDraft("");
  }
  function removeValue(v: string) {
    onChange({ ...layer, values: layer.values.filter(x => x !== v) });
  }

  return (
    <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--bg-elevated)] p-3">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-[var(--gold)]/15 px-2 py-0.5 text-[10px] text-[var(--gold)]">層 {index + 1}</span>
        <input
          value={layer.name}
          onChange={(e) => onChange({ ...layer, name: e.target.value })}
          placeholder={["維度名稱（例：磅數）", "維度名稱（例：款式）", "維度名稱（例：尺寸）"][index]}
          className={inputCls + " flex-1 max-w-xs"}
          maxLength={20}
        />
      </div>
      {layer.name.trim() && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {layer.values.map(v => (
            <span key={v} className="inline-flex items-center gap-1 rounded-full border border-[var(--gold-soft)] bg-[var(--gold)]/10 px-2.5 py-1 text-xs text-[var(--gold)]">
              {v}
              <button type="button" onClick={() => removeValue(v)} className="text-[var(--fg-muted)] hover:text-red-400">×</button>
            </span>
          ))}
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addValue(); } }}
            placeholder={layer.values.length === 0 ? `輸入${layer.name.trim()}的值，按 Enter 加` : "+ 再加一個"}
            className="rounded border border-dashed border-[var(--border)] bg-transparent px-2 py-1 text-xs text-[var(--fg)] outline-none focus:border-[var(--gold)]"
          />
          {draft && <button type="button" onClick={addValue} className="text-xs text-[var(--gold)] hover:underline">加入</button>}
          <span className="ml-1 text-[10px] text-[var(--fg-muted)]">{layer.values.length}/{MAX_PER_LAYER}</span>
        </div>
      )}
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--fg)] outline-none transition placeholder:text-[var(--fg-muted)] focus:border-[var(--gold)]";

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-[var(--fg-muted)]">
        {label}{required && <span className="ml-1 text-[var(--gold)]">*</span>}
      </label>
      {children}
      {hint && <p className="mt-0.5 text-[10px] text-[var(--fg-muted)]">{hint}</p>}
    </div>
  );
}

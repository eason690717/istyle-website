"use client";
import { useState, useTransition } from "react";
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
      {/* 範本快速建立（顏色/容量等常見組合）*/}
      {variants.length === 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
          <h3 className="font-medium text-[var(--gold)]">⚡ 快速建立常見規格</h3>
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
  return (
    <div className="rounded-xl border border-[var(--gold)] bg-[var(--bg-elevated)] p-5">
      <h3 className="font-medium text-[var(--gold)]">新增規格</h3>
      <form
        action={(fd) => start(async () => { await createVariant(productId, fd); onCancel(); })}
        className="mt-3 space-y-3"
      >
        <Field label="規格名稱" required hint="例：黑色 128GB / L 號 紅色 / 16吋 M3 Max">
          <input name="name" required className={inputCls} placeholder="例：黑色 128GB" />
        </Field>
        <Field label="選項值（選填，JSON 格式）" hint='例: {"顏色":"黑","容量":"128GB"}'>
          <input name="optionValues" className={inputCls + " font-mono text-xs"} placeholder='{"顏色":"黑","容量":"128GB"}' />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="售價（NTD）" required>
            <input name="price" type="number" required defaultValue={basePrice} className={inputCls + " font-mono"} />
          </Field>
          <Field label="原價（劃掉顯示）">
            <input name="comparePrice" type="number" className={inputCls + " font-mono"} />
          </Field>
          <Field label="成本（內部）">
            <input name="cost" type="number" className={inputCls + " font-mono"} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="庫存">
            <input name="stock" type="number" defaultValue={10} className={inputCls + " font-mono"} />
          </Field>
          <Field label="SKU">
            <input name="sku" className={inputCls + " font-mono text-xs"} placeholder="ABC-001" />
          </Field>
          <Field label="排序">
            <input name="sortOrder" type="number" defaultValue={0} className={inputCls + " font-mono"} />
          </Field>
        </div>
        <Field label="變體圖片網址（選填）">
          <input name="imageUrl" type="url" className={inputCls} placeholder="https://..." />
        </Field>
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

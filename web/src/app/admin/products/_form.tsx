"use client";
import { useActionState } from "react";
import { ImageUpload } from "./_image-upload";
import type { ProductFormState } from "./actions";

const CATEGORIES = [
  { value: "case", label: "手機殼" },
  { value: "screen-protector", label: "螢幕保護貼" },
  { value: "charger", label: "充電配件" },
  { value: "cable", label: "傳輸線" },
  { value: "power", label: "行動電源" },
  { value: "audio", label: "音訊配件" },
  { value: "accessory", label: "其他配件" },
  { value: "used-phone", label: "二手機" },
  { value: "tool", label: "維修工具" },
  { value: "other", label: "其他" },
];

interface Defaults {
  name?: string; slug?: string; category?: string; brand?: string;
  description?: string; imageUrl?: string;
  price?: number; comparePrice?: number | null; cost?: number | null;
  stock?: number; isActive?: boolean; isFeatured?: boolean; sortOrder?: number;
}

export function ProductForm({ defaults = {}, action, submitLabel = "儲存" }: {
  defaults?: Defaults;
  action: (prev: ProductFormState, fd: FormData) => Promise<ProductFormState>;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(
    action,
    { ok: true }
  );

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div className="rounded-lg border border-red-500/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          <strong className="mr-2">儲存失敗：</strong>{state.error}
        </div>
      )}
      {state.ok && state.savedAt && !pending && (
        <div className="rounded-lg border border-green-500/40 bg-green-950/30 px-4 py-2 text-sm text-green-300">
          ✓ 已儲存
        </div>
      )}

      <Field label="商品名稱" required>
        <input name="name" required defaultValue={defaults.name} className={inputCls} placeholder="例：iPhone 16 Pro Max 防摔保護殼" />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="網址 slug（自動產生，可改）">
          <input name="slug" defaultValue={defaults.slug} className={inputCls + " font-mono"} placeholder="iphone-16-case" />
        </Field>
        <Field label="分類" required>
          <select name="category" required defaultValue={defaults.category || "case"} className={inputCls}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
      </div>

      <Field label="品牌（選填）">
        <input name="brand" defaultValue={defaults.brand} className={inputCls} placeholder="例：Apple、Samsung、第三方品牌" />
      </Field>

      <Field label="商品圖片">
        <ImageUpload name="imageUrl" defaultValue={defaults.imageUrl} />
      </Field>

      <Field label="商品描述" hint="支援 Markdown，描述商品特色、規格、保固">
        <textarea name="description" defaultValue={defaults.description} rows={5} className={inputCls + " resize-y"} placeholder="高品質 TPU 材質，四角強化防摔設計..." />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="售價（NTD）" required>
          <input name="price" required type="number" min="0" defaultValue={defaults.price} className={inputCls + " font-mono"} placeholder="690" />
        </Field>
        <Field label="原價（劃掉顯示）" hint="選填，> 售價時顯示折扣">
          <input name="comparePrice" type="number" min="0" defaultValue={defaults.comparePrice ?? ""} className={inputCls + " font-mono"} placeholder="990" />
        </Field>
        <Field label="成本（內部）" hint="僅後台可見，計算獲利用">
          <input name="cost" type="number" min="0" defaultValue={defaults.cost ?? ""} className={inputCls + " font-mono"} placeholder="200" />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="庫存">
          <input name="stock" type="number" min="0" defaultValue={defaults.stock ?? 10} className={inputCls + " font-mono"} placeholder="10" />
        </Field>
        <Field label="排序（小→大）">
          <input name="sortOrder" type="number" defaultValue={defaults.sortOrder ?? 0} className={inputCls + " font-mono"} placeholder="0" />
        </Field>
        <div className="flex items-end gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--fg)]">
            <input name="isActive" type="checkbox" defaultChecked={defaults.isActive ?? true} className="h-4 w-4 accent-[var(--gold)]" />
            上架中
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--fg)]">
            <input name="isFeatured" type="checkbox" defaultChecked={defaults.isFeatured ?? false} className="h-4 w-4 accent-[var(--gold)]" />
            ★ 精選
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-gold w-full rounded-full py-3 text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "儲存中..." : submitLabel}
      </button>
    </form>
  );
}

const inputCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--fg)] outline-none transition placeholder:text-[var(--fg-muted)] focus:border-[var(--gold)]";

function Field({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--fg)]">
        {label}{required && <span className="ml-1 text-[var(--gold)]">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-[var(--fg-muted)]">{hint}</p>}
    </div>
  );
}

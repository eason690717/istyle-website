import Link from "next/link";
import { ProductForm } from "../_form";
import { createProduct } from "../actions";

export default function NewProductPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl text-[var(--gold)]">新增商品</h1>
        <Link href="/admin/products" className="text-sm text-[var(--fg-muted)] hover:text-[var(--gold)]">← 返回列表</Link>
      </div>

      {/* 流程提示 */}
      <div className="mb-5 rounded-xl border border-[var(--gold-soft)]/40 bg-[var(--gold)]/5 p-4">
        <div className="flex items-start gap-3 text-sm text-[var(--fg)]">
          <span className="text-xl">💡</span>
          <div>
            <p className="font-medium text-[var(--gold)]">建立後直接進入規格設定</p>
            <p className="mt-1 text-xs text-[var(--fg-muted)]">
              填好基本資料按下方按鈕 → 自動跳到「規格管理」頁，可用「⭐ 通用組合產生器」一鍵建立顏色／尺寸／容量等所有變體。
            </p>
            <p className="mt-1 text-[10px] text-[var(--fg-muted)]">
              沒有變體的商品：跳過規格頁，直接用此頁的「售價」欄位即可
            </p>
          </div>
        </div>
      </div>

      <ProductForm action={createProduct} submitLabel="建立商品 → 下一步設定規格" />
    </div>
  );
}

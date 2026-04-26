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
            <p className="font-medium text-[var(--gold)]">需要設定多種規格（顏色 / 尺寸 / 容量）？</p>
            <p className="mt-1 text-xs text-[var(--fg-muted)]">
              先填基本資料 → 點下方「建立商品」 → 跳到編輯頁後 → 點右上角
              <span className="mx-1 rounded border border-[var(--gold)] px-1.5 py-0.5 text-[var(--gold)]">⚙ 規格管理</span>
              即可使用「⭐ 通用組合產生器」一鍵建立所有變體。
            </p>
            <p className="mt-1 text-[10px] text-[var(--fg-muted)]">
              沒有變體的商品：售價直接用此頁的「售價」欄位
            </p>
          </div>
        </div>
      </div>

      <ProductForm action={createProduct} submitLabel="建立商品 → 下一步設定規格" />
    </div>
  );
}

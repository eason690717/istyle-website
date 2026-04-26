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
      <ProductForm action={createProduct} submitLabel="建立商品" />
    </div>
  );
}

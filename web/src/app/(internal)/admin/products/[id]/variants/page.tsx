import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VariantManager } from "./variant-manager";

export default async function ProductVariantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = parseInt(id);
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } },
  });
  if (!product) notFound();

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin/products" className="text-xs text-[var(--fg-muted)] hover:text-[var(--gold)]">← 商品列表</Link>
          <h1 className="mt-1 font-serif text-2xl text-[var(--gold)]">{product.name} — 規格管理</h1>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">
            為此商品建立多種「顏色／容量／尺寸」規格，每個規格獨立價格與庫存。
          </p>
        </div>
        <Link href={`/admin/products/${product.id}`} className="text-sm text-[var(--gold)] hover:text-[var(--gold-bright)]">
          ← 編輯商品基本資料
        </Link>
      </div>

      <VariantManager
        productId={product.id}
        productPrice={product.price}
        variants={product.variants.map(v => ({
          id: v.id,
          name: v.name,
          optionValues: v.optionValues,
          price: v.price,
          comparePrice: v.comparePrice,
          stock: v.stock,
          sku: v.sku,
          imageUrl: v.imageUrl,
          isActive: v.isActive,
        }))}
      />
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "../_form";
import { updateProduct } from "../actions";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id: parseInt(id) } });
  if (!product) notFound();

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl text-[var(--gold)]">編輯商品</h1>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/products/${product.id}/variants`}
            className="rounded-full border border-[var(--gold)] bg-[var(--gold)]/10 px-4 py-1.5 text-sm font-medium text-[var(--gold)] hover:bg-[var(--gold)]/20"
          >
            ⚙ 規格管理（顏色／尺寸／容量）
          </Link>
          <Link href={`/shop/${product.slug}?preview=admin`} target="_blank" className="text-sm text-[var(--fg-muted)] hover:text-[var(--gold)]">
            前台預覽 →
          </Link>
          <Link href="/admin/products" className="text-sm text-[var(--fg-muted)] hover:text-[var(--gold)]">← 返回列表</Link>
        </div>
      </div>
      <ProductForm
        defaults={{
          name: product.name,
          slug: product.slug,
          category: product.category,
          brand: product.brand || undefined,
          description: product.description || undefined,
          imageUrl: product.imageUrl || undefined,
          price: product.price,
          comparePrice: product.comparePrice,
          cost: product.cost,
          stock: product.stock,
          isActive: product.isActive,
          isFeatured: product.isFeatured,
          sortOrder: product.sortOrder,
        }}
        action={updateProduct.bind(null, product.id)}
        submitLabel="儲存變更"
      />
    </div>
  );
}

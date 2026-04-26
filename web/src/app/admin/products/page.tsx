import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteProduct, toggleProductActive, toggleProductFeatured } from "./actions";
import { DeleteProductButton } from "./_delete-button";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  accessory: "配件",
  case: "手機殼",
  "screen-protector": "螢幕保護貼",
  "used-phone": "二手機",
  charger: "充電配件",
  cable: "傳輸線",
  power: "行動電源",
  audio: "音訊配件",
  tool: "維修工具",
  other: "其他",
};

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  }).catch(() => []);

  const stats = {
    total: products.length,
    active: products.filter(p => p.isActive).length,
    featured: products.filter(p => p.isFeatured).length,
    outOfStock: products.filter(p => p.stock === 0).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-[var(--gold)]">商品管理</h1>
        <Link href="/admin/products/new" className="btn-gold rounded-full px-5 py-2 text-sm">
          + 新增商品
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="商品總數" value={stats.total} />
        <Stat label="上架中" value={stats.active} accent />
        <Stat label="精選商品" value={stats.featured} />
        <Stat label="缺貨" value={stats.outOfStock} />
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-12 text-center">
          <p className="font-serif text-lg text-[var(--gold)]">尚未新增商品</p>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">點擊右上「新增商品」開始上架第一個商品</p>
          <Link href="/admin/products/new" className="btn-gold mt-4 inline-block rounded-full px-6 py-2 text-sm">
            新增第一個商品
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--bg-soft)] text-left text-xs text-[var(--gold)]">
              <tr>
                <th className="px-3 py-2.5">圖</th>
                <th className="px-3 py-2.5">商品名稱</th>
                <th className="px-3 py-2.5">分類</th>
                <th className="px-3 py-2.5 text-right">售價</th>
                <th className="px-3 py-2.5 text-right">庫存</th>
                <th className="px-3 py-2.5 text-center">狀態</th>
                <th className="px-3 py-2.5 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {products.map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? "bg-[#141414]" : "bg-[#181818]"}>
                  <td className="px-3 py-2.5">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="h-12 w-12 rounded object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded bg-[var(--bg-soft)] text-[var(--fg-muted)] text-[10px]">無圖</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link href={`/admin/products/${p.id}`} className="font-medium text-[var(--fg)] hover:text-[var(--gold)]">
                      {p.name}
                    </Link>
                    <div className="text-[10px] text-[var(--fg-muted)]">/{p.slug}</div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-[var(--fg-muted)]">{CATEGORY_LABELS[p.category] || p.category}</td>
                  <td className="px-3 py-2.5 text-right font-mono">
                    <div className="text-[var(--gold)]">NT$ {p.price.toLocaleString()}</div>
                    {p.comparePrice && p.comparePrice > p.price && (
                      <div className="text-[10px] text-[var(--fg-muted)] line-through">NT$ {p.comparePrice.toLocaleString()}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">
                    <span className={p.stock === 0 ? "text-red-400" : p.stock < 5 ? "text-yellow-400" : "text-[var(--fg)]"}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <form action={toggleProductActive.bind(null, p.id)}>
                        <button className={`rounded px-2 py-0.5 text-[10px] ${p.isActive ? "bg-green-500/20 text-green-300" : "bg-zinc-500/20 text-zinc-400"}`}>
                          {p.isActive ? "✓ 上架" : "下架"}
                        </button>
                      </form>
                      <form action={toggleProductFeatured.bind(null, p.id)}>
                        <button className={`rounded px-2 py-0.5 text-[10px] ${p.isFeatured ? "bg-[var(--gold)] text-black" : "border border-[var(--border)] text-[var(--fg-muted)]"}`}>
                          {p.isFeatured ? "★ 精選" : "☆ 一般"}
                        </button>
                      </form>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Link href={`/admin/products/${p.id}`} className="text-[10px] text-[var(--gold)] hover:text-[var(--gold-bright)]">
                        編輯
                      </Link>
                      <Link href={`/shop/${p.slug}`} target="_blank" className="text-[10px] text-[var(--fg-muted)] hover:text-[var(--gold)]">
                        前台預覽
                      </Link>
                      <DeleteProductButton productId={p.id} productName={p.name} action={deleteProduct} />
                    </div>
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

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${accent ? "border-[var(--gold)] bg-[#1a1410]" : "border-[var(--border)] bg-[var(--bg-elevated)]"}`}>
      <div className="text-xs text-[var(--fg-muted)]">{label}</div>
      <div className="mt-1 font-serif text-2xl text-[var(--gold)]">{value}</div>
    </div>
  );
}

"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveBundle, deleteBundle, type BundleItem } from "./actions";
import { toast } from "@/components/toast";

interface ProductMini { id: number; name: string; slug: string; price: number; imageUrl: string | null; }

interface BundleData {
  id?: number;
  name: string;
  description: string | null;
  price: number;
  items: BundleItem[];
  imageUrl: string | null;
  category: string | null;
  isActive: boolean;
}

export function BundlesManager({ initial, products }: { initial: BundleData[]; products: ProductMini[] }) {
  const [editing, setEditing] = useState<BundleData | null>(null);
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setEditing({ name: "", description: null, price: 0, items: [], imageUrl: null, category: null, isActive: true })}
          className="btn-gold rounded-full px-4 py-2 text-sm"
        >+ 新增套餐</button>
      </div>

      {initial.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[var(--border)] p-12 text-center text-sm text-[var(--fg-muted)]">
          <div className="text-5xl">🎁</div>
          <p className="mt-3">尚無套餐</p>
          <p className="text-[10px]">提示：新機開箱組（保護貼+殼+充電線）、急救組（電池+保護貼）等高重複組合可預存</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {initial.map(b => {
            const itemCount = b.items.reduce((s, i) => s + (i.qty || 1), 0);
            const itemsTotal = b.items.reduce((s, i) => {
              const p = products.find(p => p.id === i.productId);
              return s + (p ? p.price * (i.qty || 1) : 0);
            }, 0);
            const savings = itemsTotal - b.price;
            return (
              <button
                key={b.id}
                onClick={() => setEditing(b)}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-left hover:border-[var(--gold)]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{b.name}</div>
                    {b.description && <div className="mt-1 text-xs text-[var(--fg-muted)]">{b.description}</div>}
                  </div>
                  {!b.isActive && <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] text-red-400">下架</span>}
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-serif text-xl text-[var(--gold)]">${b.price.toLocaleString()}</span>
                  {savings > 0 && (
                    <>
                      <span className="text-xs text-[var(--fg-muted)] line-through">${itemsTotal.toLocaleString()}</span>
                      <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-300">省 ${savings.toLocaleString()}</span>
                    </>
                  )}
                </div>
                <div className="mt-2 text-xs text-[var(--fg-muted)]">{b.items.length} 種商品 · 共 {itemCount} 件</div>
              </button>
            );
          })}
        </div>
      )}

      {editing && (
        <BundleEditor
          bundle={editing}
          products={products}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

function BundleEditor({ bundle, products, onClose, onSaved }: {
  bundle: BundleData;
  products: ProductMini[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [data, setData] = useState(bundle);
  const [productSearch, setProductSearch] = useState("");
  const [pending, startTransition] = useTransition();

  const filteredProducts = productSearch
    ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.slug.includes(productSearch))
    : products.slice(0, 20);

  const itemsTotal = data.items.reduce((s, i) => {
    const p = products.find(p => p.id === i.productId);
    return s + (p ? p.price * i.qty : 0);
  }, 0);

  function addItem(p: ProductMini) {
    if (data.items.some(i => i.productId === p.id)) {
      setData({ ...data, items: data.items.map(i => i.productId === p.id ? { ...i, qty: i.qty + 1 } : i) });
    } else {
      setData({ ...data, items: [...data.items, { productId: p.id, qty: 1, label: p.name }] });
    }
    setProductSearch("");
  }

  function updateItem(productId: number, qty: number) {
    setData({
      ...data,
      items: qty <= 0
        ? data.items.filter(i => i.productId !== productId)
        : data.items.map(i => i.productId === productId ? { ...i, qty } : i),
    });
  }

  function submit() {
    startTransition(async () => {
      const r = await saveBundle({
        id: data.id,
        name: data.name,
        description: data.description || undefined,
        price: data.price,
        items: data.items,
        imageUrl: data.imageUrl || undefined,
        category: data.category || undefined,
        isActive: data.isActive,
      });
      if (r.ok) { toast.success(data.id ? "套餐已更新" : "套餐已建立"); onSaved(); }
      else toast.error(r.error || "儲存失敗");
    });
  }

  function remove() {
    if (!data.id) return;
    if (!confirm(`確定刪除套餐「${data.name}」？`)) return;
    startTransition(async () => {
      await deleteBundle(data.id!);
      toast.success("已刪除");
      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-12 backdrop-blur" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl border border-[var(--gold)]/40 bg-[var(--bg-elevated)] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-serif text-lg text-[var(--gold)]">{data.id ? "編輯套餐" : "新增套餐"}</h3>
          <button onClick={onClose} className="text-[var(--fg-muted)]">✕</button>
        </div>

        <div className="space-y-3">
          <input
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            placeholder="套餐名稱（如：iPhone 開箱套組）"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm"
          />
          <input
            value={data.description || ""}
            onChange={(e) => setData({ ...data, description: e.target.value })}
            placeholder="描述（選填）"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-[var(--fg-muted)]">套餐售價</label>
              <input
                type="number"
                value={data.price || ""}
                onChange={(e) => setData({ ...data, price: Number(e.target.value) || 0 })}
                placeholder="售價"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-base font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--fg-muted)]">分類（選填）</label>
              <input
                value={data.category || ""}
                onChange={(e) => setData({ ...data, category: e.target.value })}
                placeholder="如：iPhone / 配件"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* 套餐內容 */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
            <div className="mb-2 text-xs text-[var(--fg-muted)]">套餐內容（{data.items.length} 項，原價 ${itemsTotal.toLocaleString()}）</div>
            {data.items.length === 0 ? (
              <p className="py-2 text-center text-xs text-[var(--fg-muted)]">下方搜尋商品加入</p>
            ) : (
              <div className="space-y-1.5">
                {data.items.map(it => {
                  const p = products.find(p => p.id === it.productId);
                  if (!p) return null;
                  return (
                    <div key={it.productId} className="flex items-center gap-2 rounded bg-[var(--bg-elevated)] p-2 text-sm">
                      <span className="flex-1 truncate">{p.name}</span>
                      <span className="font-mono text-xs text-[var(--gold-soft)]">${p.price}</span>
                      <button onClick={() => updateItem(it.productId!, it.qty - 1)} className="h-7 w-7 rounded border border-[var(--border)]">−</button>
                      <span className="w-8 text-center font-mono">{it.qty}</span>
                      <button onClick={() => updateItem(it.productId!, it.qty + 1)} className="h-7 w-7 rounded border border-[var(--border)]">+</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 商品搜尋 */}
          <div>
            <input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="🔍 搜尋商品加入套餐..."
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            />
            {productSearch && (
              <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                {filteredProducts.slice(0, 10).map(p => (
                  <button
                    key={p.id}
                    onClick={() => addItem(p)}
                    className="flex w-full items-center justify-between border-b border-[var(--border)] p-2 text-left text-sm last:border-0 hover:bg-[var(--gold)]/10"
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="ml-2 shrink-0 font-mono text-xs text-[var(--gold-soft)]">${p.price}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={data.isActive} onChange={(e) => setData({ ...data, isActive: e.target.checked })} />
            上架（POS 才會顯示）
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="rounded-full border border-[var(--border)] px-4 py-2 text-sm">取消</button>
          {data.id && <button onClick={remove} disabled={pending} className="rounded-full border border-red-500/40 px-4 py-2 text-xs text-red-400">刪除</button>}
          <button onClick={submit} disabled={pending} className="btn-gold flex-1 rounded-full py-2 text-sm font-semibold">
            {pending ? "儲存中..." : "儲存"}
          </button>
        </div>
      </div>
    </div>
  );
}

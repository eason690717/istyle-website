"use client";
import { useState, useMemo } from "react";
import { useCart } from "@/lib/cart";
import { formatTwd } from "@/lib/pricing";

interface Variant {
  id: number;
  name: string;
  optionValues?: string | null; // JSON string
  price: number;
  comparePrice?: number | null;
  stock: number;
  imageUrl?: string | null;
}

interface ProductInfo {
  id: number;
  slug: string;
  name: string;
  imageUrl?: string | null;
  price: number;
  stock: number;
}

export function ProductPurchase({ product, variants }: { product: ProductInfo; variants: Variant[] }) {
  const hasVariants = variants.length > 0;

  // 解析所有 variants 的 optionValues 拼出 axes
  // axes = [{ label, values: [{value, count}] }]
  const axes = useMemo(() => {
    if (!hasVariants) return [];
    const map = new Map<string, Map<string, number>>();
    for (const v of variants) {
      if (!v.optionValues) continue;
      try {
        const obj = JSON.parse(v.optionValues) as Record<string, string>;
        for (const [key, val] of Object.entries(obj)) {
          if (!map.has(key)) map.set(key, new Map());
          const valMap = map.get(key)!;
          valMap.set(val, (valMap.get(val) || 0) + 1);
        }
      } catch {}
    }
    return Array.from(map.entries()).map(([label, valMap]) => ({
      label,
      values: Array.from(valMap.keys()),
    }));
  }, [variants, hasVariants]);

  // 已選的選項
  const [selected, setSelected] = useState<Record<string, string>>({});

  // 找配對的 variant
  const matchedVariant = useMemo(() => {
    if (!hasVariants) return null;
    if (axes.length === 0) return null;
    // 必須所有 axes 都選了
    if (!axes.every(a => selected[a.label])) return null;
    // 找符合所有 selected 的 variant
    return variants.find(v => {
      if (!v.optionValues) return false;
      try {
        const obj = JSON.parse(v.optionValues) as Record<string, string>;
        return Object.entries(selected).every(([k, val]) => obj[k] === val);
      } catch {
        return false;
      }
    }) || null;
  }, [hasVariants, axes, selected, variants]);

  // 沒選任何規格時，預設用第一個 in-stock variant
  const fallbackVariant = useMemo(() => {
    if (!hasVariants) return null;
    return variants.find(v => v.stock > 0) || variants[0];
  }, [hasVariants, variants]);

  const activeVariant = matchedVariant || fallbackVariant;
  const canAdd = hasVariants
    ? !!matchedVariant && matchedVariant.stock > 0
    : product.stock > 0;
  const displayPrice = activeVariant?.price ?? product.price;

  const { add, items } = useCart();
  const cartKey = matchedVariant ? `prod-${product.id}-v${matchedVariant.id}` : `prod-${product.id}`;
  const inCart = items.find(x => x.key === cartKey);

  function addToCart() {
    if (!canAdd) return;
    if (matchedVariant) {
      add({
        kind: "product",
        key: cartKey,
        title: `${product.name}（${matchedVariant.name}）`,
        subtitle: matchedVariant.name,
        unitPrice: matchedVariant.price,
        productId: product.id,
        productSlug: product.slug,
        imageUrl: matchedVariant.imageUrl || product.imageUrl || undefined,
      });
    } else {
      add({
        kind: "product",
        title: product.name,
        unitPrice: product.price,
        productId: product.id,
        productSlug: product.slug,
        imageUrl: product.imageUrl || undefined,
      });
    }
  }

  return (
    <div>
      {/* 規格選擇器 */}
      {hasVariants && axes.length > 0 && (
        <div className="mt-6 space-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
          {axes.map(axis => (
            <div key={axis.label}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--fg)]">
                  {axis.label}
                  {selected[axis.label] && (
                    <span className="ml-2 text-xs text-[var(--gold-soft)]">：{selected[axis.label]}</span>
                  )}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {axis.values.map(val => {
                  const isSel = selected[axis.label] === val;
                  // 檢查此選項是否會導致缺貨
                  const candidateVariants = variants.filter(v => {
                    if (!v.optionValues) return false;
                    try {
                      const obj = JSON.parse(v.optionValues) as Record<string, string>;
                      return obj[axis.label] === val;
                    } catch { return false; }
                  });
                  const allOOS = candidateVariants.length > 0 && candidateVariants.every(v => v.stock === 0);
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSelected(s => ({ ...s, [axis.label]: val }))}
                      className={`rounded-full border px-4 py-1.5 text-sm transition ${
                        isSel
                          ? "border-[var(--gold)] bg-[var(--gold)] text-black font-semibold"
                          : allOOS
                            ? "border-[var(--border)] bg-[var(--bg)] text-[var(--fg-muted)] line-through"
                            : "border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] hover:border-[var(--gold)]"
                      }`}
                      disabled={allOOS}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* 已選變體狀態 */}
          {matchedVariant ? (
            <div className="border-t border-[var(--border-soft)] pt-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--fg)]">
                  已選：<span className="text-[var(--gold)]">{matchedVariant.name}</span>
                </span>
                <span className="font-mono text-[var(--gold)]">{formatTwd(matchedVariant.price)}</span>
              </div>
              <div className="mt-1 text-xs">
                {matchedVariant.stock > 0 ? (
                  <span className="text-[var(--success)]">✓ 現貨 {matchedVariant.stock} 件</span>
                ) : (
                  <span className="text-red-400">✗ 此規格缺貨</span>
                )}
              </div>
            </div>
          ) : (
            <div className="border-t border-[var(--border-soft)] pt-3 text-xs text-[var(--fg-muted)]">
              請選擇 {axes.map(a => a.label).join(" / ")}
            </div>
          )}
        </div>
      )}

      {/* 加入購物車 */}
      <div className="mt-6">
        <button
          onClick={addToCart}
          disabled={!canAdd}
          className={`w-full rounded-full py-3 text-base font-semibold transition ${
            canAdd
              ? inCart
                ? "border border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold)]"
                : "btn-gold"
              : "border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--fg-muted)] cursor-not-allowed"
          }`}
        >
          {!canAdd ? (hasVariants && !matchedVariant ? "請先選規格" : "缺貨") :
           inCart ? `✓ 已加入 ×${inCart.qty}（再點 +1）` :
           `加入購物車（${formatTwd(displayPrice)}）`}
        </button>
        {inCart && (
          <p className="mt-2 text-center text-xs text-[var(--gold-soft)]">
            ✓ 已加入購物車．<a href="/cart" className="underline">查看購物車</a>
          </p>
        )}
      </div>
    </div>
  );
}

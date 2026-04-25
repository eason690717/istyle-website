"use client";
import Link from "next/link";
import { useCart } from "@/lib/cart";

export function CartButton() {
  const { count } = useCart();
  return (
    <Link
      href="/cart"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] transition hover:border-[var(--gold)] hover:bg-[var(--bg-soft)]"
      aria-label={`購物車（${count} 項）`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--gold)]" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293A1 1 0 005.414 17H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--gold)] px-1 text-[10px] font-bold text-black">
          {count}
        </span>
      )}
    </Link>
  );
}

// 加入購物車按鈕（用在 quote/[brand]/[model] 頁）
export function AddToCartButton({
  modelId, modelSlug, modelName, brandSlug, brandName,
  itemId, itemName, tier, tierLabel, unitPrice,
  size = "sm",
}: {
  modelId: number; modelSlug: string; modelName: string;
  brandSlug: string; brandName: string;
  itemId: number; itemName: string;
  tier: "STANDARD" | "OEM"; tierLabel: string;
  unitPrice: number;
  size?: "sm" | "md";
}) {
  const { add, items } = useCart();
  const key = `${modelId}-${itemId}-${tier}`;
  const inCart = items.find(x => x.key === key);

  const cls = size === "md"
    ? "rounded-full px-4 py-2 text-sm"
    : "rounded-full px-3 py-1 text-xs";

  return (
    <button
      onClick={() => add({ modelId, modelSlug, modelName, brandSlug, brandName, itemId, itemName, tier, tierLabel, unitPrice })}
      className={`${cls} ${
        inCart
          ? "border border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold)]"
          : "btn-gold"
      } transition`}
      type="button"
    >
      {inCart ? `✓ 已加入 ×${inCart.qty}` : "加入訂單"}
    </button>
  );
}

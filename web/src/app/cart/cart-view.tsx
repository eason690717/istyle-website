"use client";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatTwd } from "@/lib/pricing";
import { SITE } from "@/lib/site-config";

export function CartView() {
  const { items, count, subtotal, setQty, remove, clear } = useCart();

  if (count === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-10 text-center">
        <div className="text-5xl">🛒</div>
        <p className="mt-4 font-serif text-lg text-[var(--gold)]">送修清單還是空的</p>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          先去 <Link href="/quote" className="text-[var(--gold)] underline">維修報價</Link> 選擇您要修的項目
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/quote" className="btn-gold rounded-full px-6 py-3 text-sm">查詢維修報價</Link>
          <a href={SITE.lineAddUrl} className="btn-gold-outline rounded-full px-6 py-3 text-sm">LINE 詢問</a>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 項目列表 */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        <ul className="divide-y divide-[var(--border-soft)]">
          {items.map((it, idx) => (
            <li
              key={it.key}
              className={`flex items-start gap-3 p-4 ${
                idx % 2 === 0 ? "bg-[#141414]" : "bg-[#181818]"
              }`}
            >
              <div className="min-w-0 flex-1">
                {it.kind === "repair" && it.brandSlug && it.modelSlug ? (
                  <Link
                    href={`/quote/${it.brandSlug}/${it.modelSlug}`}
                    className="text-sm font-medium text-[var(--fg-strong)] hover:text-[var(--gold)]"
                  >
                    {it.title}
                  </Link>
                ) : it.kind === "product" && it.productSlug ? (
                  <Link
                    href={`/shop/${it.productSlug}`}
                    className="text-sm font-medium text-[var(--fg-strong)] hover:text-[var(--gold)]"
                  >
                    {it.title}
                  </Link>
                ) : (
                  <span className="text-sm font-medium text-[var(--fg-strong)]">{it.title}</span>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded px-2 py-0.5 text-[10px] ${
                    it.kind === "product"
                      ? "bg-[var(--accent-cool)]/20 text-[var(--accent-cool)]"
                      : "bg-[var(--gold)]/15 text-[var(--gold)]"
                  }`}>
                    {it.kind === "product" ? "商品" : "維修"}
                  </span>
                  {it.subtitle && <span className="text-[var(--fg-muted)]">{it.subtitle}</span>}
                </div>
                <div className="mt-2 text-xs text-[var(--fg-muted)]">
                  單價 {formatTwd(it.unitPrice)}
                </div>
              </div>

              <div className="flex flex-shrink-0 flex-col items-end gap-2">
                <div className="font-mono text-base font-semibold text-[var(--gold)]">
                  {formatTwd(it.unitPrice * it.qty)}
                </div>
                <div className="flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--bg)]">
                  <button
                    onClick={() => setQty(it.key, it.qty - 1)}
                    className="px-2 py-0.5 text-[var(--fg)] hover:text-[var(--gold)]"
                    aria-label="減少"
                  >−</button>
                  <span className="min-w-6 text-center text-xs">{it.qty}</span>
                  <button
                    onClick={() => setQty(it.key, it.qty + 1)}
                    className="px-2 py-0.5 text-[var(--fg)] hover:text-[var(--gold)]"
                    aria-label="增加"
                  >+</button>
                </div>
                <button
                  onClick={() => remove(it.key)}
                  className="text-[10px] text-[var(--fg-muted)] underline hover:text-red-400"
                >
                  移除
                </button>
              </div>
            </li>
          ))}
        </ul>

        {/* 小計 */}
        <div className="border-t border-[var(--border)] bg-[var(--bg-soft)] p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--fg-muted)]">小計（{count} 項）</span>
            <span className="font-serif text-2xl font-semibold text-[var(--gold)]">
              {formatTwd(subtotal)}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-[var(--fg-muted)]">
            ＊ 配送費 / 急件費等下一步計算
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/checkout"
          className="btn-gold flex-1 rounded-full py-4 text-center text-base font-semibold"
        >
          下一步：填寫資料結帳 →
        </Link>
        <button
          onClick={() => { if (confirm("確定清空送修清單？")) clear(); }}
          className="rounded-full border border-[var(--border)] px-6 py-4 text-sm text-[var(--fg-muted)] hover:border-red-500/50 hover:text-red-400"
        >
          清空
        </button>
      </div>

      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-center text-xs text-[var(--fg-muted)]">
        💡 偏好 LINE 預約折 $100？
        <a href={SITE.lineAddUrl} className="ml-1 text-[#06C755] underline">直接 LINE 詢問</a>
      </div>
    </>
  );
}

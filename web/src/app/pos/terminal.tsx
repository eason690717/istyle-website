"use client";
import { useState, useMemo, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { logoutAction } from "./login/actions";
import { createSale } from "./actions";

// 客戶搜尋小元件 — 輸入電話/姓名 autocomplete 帶入歷史客戶
function CustomerSearchInput({ value, name, onChange }: {
  value: string; name: string;
  onChange: (name: string, phone: string) => void;
}) {
  const [results, setResults] = useState<Array<{ name: string; phone: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/pos/customer-search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.results || []);
      } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className="space-y-1.5">
      <input value={name} onChange={(e) => onChange(e.target.value, value)} placeholder="客戶姓名" className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5" />
      <input value={value} onChange={(e) => onChange(name, e.target.value.replace(/\D/g, ""))} placeholder="客戶電話 (autocomplete)" inputMode="numeric" className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5" />
      {results.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded border border-[var(--gold)]/30 bg-[var(--bg-elevated)]">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { onChange(r.name, r.phone); setResults([]); }}
              className="block w-full border-b border-[var(--border)] px-2 py-1.5 text-left text-xs last:border-0 hover:bg-[var(--gold)]/10"
            >
              <div>{r.name || "—"}</div>
              <div className="font-mono text-[10px] text-[var(--fg-muted)]">{r.phone}</div>
            </button>
          ))}
        </div>
      )}
      {loading && <div className="text-[10px] text-[var(--fg-muted)]">查詢中...</div>}
    </div>
  );
}

interface ProductOption {
  id: string;
  productId: number;
  variantId: number | null;
  name: string;
  sku: string | null;
  price: number;
  stock: number;
  imageUrl: string | null;
}

interface RepairOption {
  id: number;
  name: string;
  price: number;
  isOverridden: boolean;
  brand: string;
  model: string;
  tier: string;
}

interface CartLine {
  key: string;
  itemType: "PRODUCT" | "VARIANT" | "REPAIR" | "CUSTOM";
  productId?: number;
  productVariantId?: number;
  repairPriceId?: number;
  name: string;
  sku?: string | null;
  unitPrice: number;
  qty: number;
  stock?: number;
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "💰 現金", color: "from-green-600 to-green-700" },
  { value: "JKOPAY", label: "🟢 街口支付", color: "from-emerald-500 to-green-600" },
  { value: "LINEPAY", label: "💚 LINE Pay", color: "from-[#06C755] to-[#00B900]" },
  { value: "CARD", label: "💳 信用卡（外接機）", color: "from-blue-600 to-blue-700" },
  { value: "TRANSFER", label: "🏦 轉帳", color: "from-gray-600 to-gray-700" },
];

export function PosTerminal({
  staff, products, repairs,
}: {
  staff: { staffId: number; name: string; role: string; code: string };
  products: ProductOption[];
  repairs: RepairOption[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [tab, setTab] = useState<"products" | "repairs">("products");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState(sp?.get("customer") || "");
  const [customerPhone, setCustomerPhone] = useState(sp?.get("phone") || "");
  const [notes, setNotes] = useState(sp?.get("repair") ? `維修單 #${sp.get("repair")}` : "");

  // 從 URL query 自動帶入維修單資料（從 /admin/repairs/[id] 跳過來）
  useEffect(() => {
    const label = sp?.get("label");
    const amount = sp?.get("amount");
    const repairId = sp?.get("repair");
    if (label && amount && cart.length === 0 && repairId) {
      const price = Number(amount);
      if (!isNaN(price) && price > 0) {
        setCart([{
          key: `r-quick-${repairId}`,
          itemType: "CUSTOM",
          name: decodeURIComponent(label),
          unitPrice: price,
          qty: 1,
        }]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [pending, startTransition] = useTransition();
  const [showCheckout, setShowCheckout] = useState(false);
  const [customDialog, setCustomDialog] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products.slice(0, 60);
    const q = search.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q)).slice(0, 60);
  }, [search, products]);

  const filteredRepairs = useMemo(() => {
    if (!search.trim()) return repairs.slice(0, 60);
    const q = search.toLowerCase();
    return repairs.filter(r => r.name.toLowerCase().includes(q)).slice(0, 60);
  }, [search, repairs]);

  function addProduct(p: ProductOption) {
    const key = `p${p.id}`;
    const existing = cart.find(c => c.key === key);
    if (existing) {
      if (p.stock > 0 && existing.qty >= p.stock) { alert("庫存不足"); return; }
      setCart(cart.map(c => c.key === key ? { ...c, qty: c.qty + 1 } : c));
    } else {
      if (p.stock <= 0) { alert("庫存為 0"); return; }
      setCart([...cart, {
        key,
        itemType: p.variantId ? "VARIANT" : "PRODUCT",
        productId: p.productId,
        productVariantId: p.variantId ?? undefined,
        name: p.name,
        sku: p.sku,
        unitPrice: p.price,
        qty: 1,
        stock: p.stock,
      }]);
    }
  }

  function addRepair(r: RepairOption) {
    const key = `r${r.id}`;
    const existing = cart.find(c => c.key === key);
    if (existing) {
      setCart(cart.map(c => c.key === key ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, {
        key, itemType: "REPAIR",
        repairPriceId: r.id,
        name: r.name,
        unitPrice: r.price,
        qty: 1,
      }]);
    }
  }

  function addCustom() {
    if (!customLabel || !customPrice) return;
    const price = Number(customPrice);
    if (isNaN(price) || price < 0) return;
    setCart([...cart, {
      key: `c${Date.now()}`,
      itemType: "CUSTOM",
      name: customLabel,
      unitPrice: price,
      qty: 1,
    }]);
    setCustomLabel(""); setCustomPrice(""); setCustomDialog(false);
  }

  function updateQty(key: string, delta: number) {
    setCart(cart.flatMap(c => {
      if (c.key !== key) return [c];
      const newQty = c.qty + delta;
      if (newQty <= 0) return [];
      if (c.stock !== undefined && newQty > c.stock) { alert("庫存不足"); return [c]; }
      return [{ ...c, qty: newQty }];
    }));
  }
  function removeLine(key: string) { setCart(cart.filter(c => c.key !== key)); }
  function clearCart() {
    if (cart.length > 0 && !confirm("清空購物車？")) return;
    setCart([]); setDiscount(0); setCustomerName(""); setCustomerPhone(""); setNotes("");
  }

  const subtotal = cart.reduce((s, c) => s + c.unitPrice * c.qty, 0);
  const total = Math.max(0, subtotal - discount);

  function checkout(paymentMethod: string) {
    if (cart.length === 0) return;
    startTransition(async () => {
      const r = await createSale({
        items: cart.map(c => ({
          itemType: c.itemType,
          productId: c.productId,
          productVariantId: c.productVariantId,
          repairPriceId: c.repairPriceId,
          name: c.name,
          sku: c.sku ?? undefined,
          qty: c.qty,
          unitPrice: c.unitPrice,
        })),
        subtotal,
        discount,
        total,
        paymentMethod,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      if (r.ok && r.saleId) {
        router.push(`/pos/sales/${r.saleId}`);
      } else {
        alert("結帳失敗：" + (r.error || "未知錯誤"));
      }
    });
  }

  return (
    <div className="flex h-screen flex-col bg-[#0a0706] text-[var(--fg)]">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="font-serif text-lg text-[var(--gold)]">🛒 POS</span>
          <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs">
            {staff.name} <span className="text-[var(--fg-muted)]">({staff.code})</span>
          </span>
        </div>
        <div className="flex gap-2 text-xs">
          <Link href="/admin/sales" className="rounded-full border border-[var(--border)] px-3 py-1 text-[var(--fg-muted)] hover:text-[var(--gold)]">交易紀錄</Link>
          <form action={logoutAction}><button className="rounded-full border border-red-500/40 px-3 py-1 text-red-400 hover:bg-red-500/10">登出</button></form>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* 左：商品 / 維修選單 */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Tabs + 搜尋 */}
          <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] p-3">
            <div className="flex gap-2">
              <button
                onClick={() => setTab("products")}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${tab === "products" ? "bg-[var(--gold)] text-black" : "border border-[var(--border)] text-[var(--fg-muted)]"}`}
              >📦 商品（{products.length}）</button>
              <button
                onClick={() => setTab("repairs")}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${tab === "repairs" ? "bg-[var(--gold)] text-black" : "border border-[var(--border)] text-[var(--fg-muted)]"}`}
              >🔧 維修（{repairs.length}）</button>
              <button
                onClick={() => setCustomDialog(true)}
                className="rounded-lg border border-[var(--gold)]/40 px-3 py-2 text-sm text-[var(--gold)] hover:bg-[var(--gold)]/10"
              >＋ 客製</button>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === "products" ? "搜尋商品名稱或 SKU" : "搜尋機型或維修項目（如 iPhone 15、螢幕）"}
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none"
            />
          </div>

          {/* 商品 grid / 維修列表 */}
          <div className="flex-1 overflow-y-auto p-3">
            {tab === "products" ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {filteredProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p)}
                    disabled={p.stock <= 0}
                    className="group overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-left transition hover:border-[var(--gold)] disabled:opacity-40"
                  >
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt="" className="aspect-square w-full object-cover" />
                    ) : (
                      <div className="aspect-square w-full bg-[var(--bg)] flex items-center justify-center text-3xl text-[var(--fg-muted)]">📦</div>
                    )}
                    <div className="p-2">
                      <div className="line-clamp-2 text-xs">{p.name}</div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="font-mono text-sm text-[var(--gold)]">${p.price.toLocaleString()}</span>
                        <span className={`text-[10px] ${p.stock > 0 ? "text-green-400" : "text-red-400"}`}>庫存 {p.stock}</span>
                      </div>
                    </div>
                  </button>
                ))}
                {filteredProducts.length === 0 && <div className="col-span-full py-12 text-center text-sm text-[var(--fg-muted)]">沒有符合的商品</div>}
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredRepairs.map(r => (
                  <button
                    key={r.id}
                    onClick={() => addRepair(r)}
                    className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-left transition hover:border-[var(--gold)]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm">{r.name} {r.isOverridden && <span className="text-xs">🏷</span>}</div>
                    </div>
                    <span className="ml-3 shrink-0 font-mono text-sm text-[var(--gold)]">${r.price.toLocaleString()}</span>
                  </button>
                ))}
                {filteredRepairs.length === 0 && <div className="py-12 text-center text-sm text-[var(--fg-muted)]">沒有符合的維修項目</div>}
              </div>
            )}
          </div>
        </main>

        {/* 右：購物車（手機上是底部 / 桌機是右側） */}
        <aside className="flex shrink-0 flex-col border-t border-[var(--border)] bg-[var(--bg-elevated)] md:max-h-screen md:w-[380px] md:border-l md:border-t-0">
          <div className="flex items-center justify-between border-b border-[var(--border)] p-3">
            <span className="font-serif text-base text-[var(--gold)]">🛒 購物車（{cart.reduce((s, c) => s + c.qty, 0)} 件）</span>
            {cart.length > 0 && <button onClick={clearCart} className="text-xs text-red-400 hover:underline">清空</button>}
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-xs text-[var(--fg-muted)]">點左邊商品/維修加入</div>
            ) : (
              <div className="space-y-1.5">
                {cart.map(c => (
                  <div key={c.key} className="rounded border border-[var(--border)] bg-[var(--bg)] p-2 text-xs">
                    <div className="line-clamp-2 text-[var(--fg)]">{c.name}</div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(c.key, -1)} className="h-6 w-6 rounded border border-[var(--border)] hover:border-[var(--gold)]">−</button>
                        <span className="w-8 text-center font-mono">{c.qty}</span>
                        <button onClick={() => updateQty(c.key, 1)} className="h-6 w-6 rounded border border-[var(--border)] hover:border-[var(--gold)]">＋</button>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-[var(--gold)]">${(c.unitPrice * c.qty).toLocaleString()}</div>
                        <div className="text-[10px] text-[var(--fg-muted)]">${c.unitPrice} × {c.qty}</div>
                      </div>
                      <button onClick={() => removeLine(c.key)} className="text-red-400 hover:text-red-300">🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 折扣 + 客戶資料 */}
          <div className="border-t border-[var(--border)] p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-12 shrink-0 text-[var(--fg-muted)]">折扣</span>
              <input
                type="number"
                value={discount || ""}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0"
                className="flex-1 rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5"
              />
              <span className="text-[var(--fg-muted)]">元</span>
            </div>
            <details className="text-xs">
              <summary className="cursor-pointer text-[var(--fg-muted)]">＋ 客戶 / 備註（可選）</summary>
              <div className="mt-2 space-y-1.5">
                <CustomerSearchInput
                  value={customerPhone}
                  name={customerName}
                  onChange={(name, phone) => { setCustomerName(name); setCustomerPhone(phone); }}
                />
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="備註" className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5" />
              </div>
            </details>
          </div>

          {/* 總計 + 結帳 */}
          <div className="border-t-2 border-[var(--gold)]/30 bg-black p-3 space-y-2">
            <div className="flex justify-between text-xs text-[var(--fg-muted)]">
              <span>小計</span><span className="font-mono">${subtotal.toLocaleString()}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-xs text-red-400">
                <span>折扣</span><span className="font-mono">-${discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-2xl">
              <span className="text-[var(--fg)]">總計</span>
              <span className="font-serif font-bold text-[var(--gold)]">${total.toLocaleString()}</span>
            </div>

            {!showCheckout ? (
              <button
                onClick={() => setShowCheckout(true)}
                disabled={cart.length === 0}
                className="btn-gold w-full rounded-full py-3 text-sm font-bold disabled:opacity-40"
              >
                結帳
              </button>
            ) : (
              <div className="space-y-1.5">
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => checkout(m.value)}
                    disabled={pending}
                    className={`w-full rounded-lg bg-gradient-to-r ${m.color} py-2.5 text-sm font-semibold text-white shadow disabled:opacity-50`}
                  >
                    {m.label}
                  </button>
                ))}
                <button onClick={() => setShowCheckout(false)} className="w-full text-xs text-[var(--fg-muted)] hover:text-[var(--fg)]">
                  ← 返回
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* 客製品項 dialog */}
      {customDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setCustomDialog(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-[var(--gold)]/40 bg-[var(--bg-elevated)] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-lg text-[var(--gold)]">＋ 加入客製品項</h3>
            <p className="mt-1 text-xs text-[var(--fg-muted)]">不在系統內的商品 / 服務</p>
            <input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="名稱" className="mt-3 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" autoFocus />
            <input type="number" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} placeholder="金額 NT$" className="mt-2 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
            <div className="mt-4 flex gap-2">
              <button onClick={() => setCustomDialog(false)} className="flex-1 rounded-full border border-[var(--border)] py-2 text-sm">取消</button>
              <button onClick={addCustom} disabled={!customLabel || !customPrice} className="btn-gold flex-1 rounded-full py-2 text-sm font-semibold disabled:opacity-50">加入</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

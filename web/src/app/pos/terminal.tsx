"use client";
import { useState, useMemo, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { logoutAction } from "./login/actions";
import { createSale } from "./actions";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { toast } from "@/components/toast";

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
  tracksSerial: boolean;
  availableSerials?: Array<{ id: number; serial: string }>;
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
  serial?: string;          // 序號（IMEI），tracksSerial 商品必填
  productSerialId?: number;
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
  const [serialPicker, setSerialPicker] = useState<ProductOption | null>(null);
  const [serialFilter, setSerialFilter] = useState("");
  // 手機購物車抽屜（行動裝置上預設收起）
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  // POS 條碼掃描
  const [posScan, setPosScan] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  // 結帳成功動畫
  const [successAnim, setSuccessAnim] = useState<{ total: number; method: string } | null>(null);

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
    // 序號商品：必須開選 IMEI 對話框
    if (p.tracksSerial) {
      if (!p.availableSerials || p.availableSerials.length === 0) {
        toast.error("此商品已無庫存（無可用序號）");
        return;
      }
      setSerialPicker(p);
      return;
    }
    const key = `p${p.id}`;
    const existing = cart.find(c => c.key === key);
    if (existing) {
      if (p.stock > 0 && existing.qty >= p.stock) { toast.error("庫存不足"); return; }
      setCart(cart.map(c => c.key === key ? { ...c, qty: c.qty + 1 } : c));
    } else {
      if (p.stock <= 0) { toast.error("庫存為 0"); return; }
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

  function addProductSerial(p: ProductOption, picked: { id: number; serial: string }) {
    // 已加入過同 serial → 不重複
    if (cart.some(c => c.productSerialId === picked.id)) {
      toast.warning("此序號已在購物車");
      return;
    }
    setCart([...cart, {
      key: `psrl${picked.id}`,
      itemType: p.variantId ? "VARIANT" : "PRODUCT",
      productId: p.productId,
      productVariantId: p.variantId ?? undefined,
      name: `${p.name} [${picked.serial}]`,
      sku: p.sku,
      unitPrice: p.price,
      qty: 1,
      serial: picked.serial,
      productSerialId: picked.id,
    }]);
    setSerialPicker(null);
    if ("vibrate" in navigator) (navigator as Navigator).vibrate(30);
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
      if (c.stock !== undefined && newQty > c.stock) { toast.error("庫存不足"); return [c]; }
      return [{ ...c, qty: newQty }];
    }));
  }
  function removeLine(key: string) { setCart(cart.filter(c => c.key !== key)); }

  // 條碼掃描處理：先試對 IMEI（序號商品的某筆 in-stock），再對 SKU（一般商品）
  function handleScan(code: string) {
    setScanError(null);
    const trimmed = code.trim();

    // 1. 試找序號（IMEI / serial）
    for (const p of products) {
      if (!p.tracksSerial || !p.availableSerials) continue;
      const found = p.availableSerials.find(s => s.serial === trimmed);
      if (found) {
        addProductSerial(p, found);
        return;
      }
    }
    // 2. 試找 SKU 完全比對
    const exact = products.find(p => p.sku === trimmed);
    if (exact) { addProduct(exact); return; }
    // 3. 模糊找 SKU contains
    const partial = products.find(p => (p.sku || "").includes(trimmed));
    if (partial) { addProduct(partial); return; }
    // 4. 都找不到
    setScanError(`找不到條碼「${trimmed}」— 請確認商品已建立 / IMEI 已進貨`);
    if ("vibrate" in navigator) (navigator as Navigator).vibrate([100, 50, 100]);
  }

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
          serial: c.serial,
          productSerialId: c.productSerialId,
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
        // 顯示成功動畫 → 1.5 秒後跳收據
        setSuccessAnim({ total, method: paymentMethod });
        if ("vibrate" in navigator) (navigator as Navigator).vibrate([60, 30, 80]);
        setTimeout(() => router.push(`/pos/sales/${r.saleId}`), 1500);
      } else {
        toast.error("結帳失敗：" + (r.error || "未知錯誤"));
      }
    });
  }

  return (
    <div className="flex h-screen flex-col bg-[#0a0706] text-[var(--fg)]">
      {/* === 結帳成功全螢幕動畫 === */}
      {successAnim && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur" style={{ animation: "fadeIn 0.2s" }}>
          <div className="text-center" style={{ animation: "successPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
            <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-green-500 text-7xl text-white shadow-[0_0_60px_rgba(34,197,94,0.6)]">
              ✓
            </div>
            <div className="mt-6 font-serif text-3xl text-[var(--gold)]">結帳成功</div>
            <div className="mt-2 font-mono text-5xl font-bold text-white">${successAnim.total.toLocaleString()}</div>
            <div className="mt-3 text-sm text-[var(--fg-muted)]">{PAYMENT_METHODS.find(m => m.value === successAnim.method)?.label}</div>
            <div className="mt-6 text-xs text-[var(--fg-muted)]">收據準備中...</div>
          </div>
          <style jsx>{`
            @keyframes successPop {
              0% { transform: scale(0.6); opacity: 0; }
              60% { transform: scale(1.1); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          `}</style>
        </div>
      )}

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
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tab === "products" ? "搜尋商品名稱 / SKU / IMEI" : "搜尋機型或維修項目（如 iPhone 15、螢幕）"}
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none"
              />
              {tab === "products" && (
                <button
                  onClick={() => setPosScan(true)}
                  className="rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-3 text-sm font-semibold text-white"
                  title="掃條碼 / IMEI"
                >📷</button>
              )}
            </div>
            {scanError && <p className="mt-2 text-center text-xs text-red-400">{scanError}</p>}
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

        {/* 手機底部購物車按鈕（fixed，常駐） */}
        <button
          onClick={() => setMobileCartOpen(true)}
          className="fixed right-4 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)] px-5 py-3 text-sm font-bold text-black shadow-lg shadow-[var(--gold)]/40 md:hidden"
          style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        >
          🛒 {cart.reduce((s, c) => s + c.qty, 0)} 件 · ${total.toLocaleString()}
        </button>

        {/* Mobile 購物車 backdrop */}
        {mobileCartOpen && (
          <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setMobileCartOpen(false)} />
        )}

        {/* 右：購物車 — 桌機 sidebar / 手機 bottom drawer */}
        <aside className={`fixed bottom-0 left-0 right-0 z-50 flex max-h-[85vh] flex-col rounded-t-3xl border-t-2 border-[var(--gold)]/40 bg-[var(--bg-elevated)] transition-transform md:static md:max-h-screen md:w-[380px] md:rounded-none md:border-l md:border-t-0 md:border-l-[var(--border)] ${mobileCartOpen ? "translate-y-0" : "translate-y-full md:translate-y-0"}`}>
          <div className="flex items-center justify-between border-b border-[var(--border)] p-3">
            <span className="font-serif text-base text-[var(--gold)]">🛒 購物車（{cart.reduce((s, c) => s + c.qty, 0)} 件）</span>
            <div className="flex items-center gap-2">
              {cart.length > 0 && <button onClick={clearCart} className="text-xs text-red-400 hover:underline">清空</button>}
              <button onClick={() => setMobileCartOpen(false)} className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs md:hidden">✕ 收起</button>
            </div>
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

      {/* POS 條碼掃描 — 自動找 SKU 或 IMEI 加入購物車 */}
      {posScan && (
        <BarcodeScanner
          onDetected={(code) => { setPosScan(false); handleScan(code); }}
          onClose={() => setPosScan(false)}
        />
      )}

      {/* 序號選擇 dialog（IMEI / serial 商品專用）*/}
      {serialPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => { setSerialPicker(null); setSerialFilter(""); }}>
          <div className="w-full max-w-md rounded-2xl border border-[var(--gold)]/40 bg-[var(--bg-elevated)] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-lg text-[var(--gold)]">📱 選擇 IMEI / 序號</h3>
            <p className="mt-1 text-xs text-[var(--fg-muted)]">{serialPicker.name} · 庫存 {serialPicker.availableSerials?.length || 0} 件</p>
            <input
              value={serialFilter}
              onChange={(e) => setSerialFilter(e.target.value)}
              placeholder="搜尋 IMEI 末幾碼"
              autoFocus
              className="mt-3 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm font-mono"
            />
            <div className="mt-3 max-h-72 overflow-y-auto space-y-1">
              {(serialPicker.availableSerials || []).filter(s => !serialFilter || s.serial.includes(serialFilter)).map(s => (
                <button
                  key={s.id}
                  onClick={() => addProductSerial(serialPicker, s)}
                  className="block w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-left font-mono text-sm hover:border-[var(--gold)] hover:bg-[var(--gold)]/10"
                >
                  {s.serial}
                </button>
              ))}
              {(serialPicker.availableSerials || []).filter(s => !serialFilter || s.serial.includes(serialFilter)).length === 0 && (
                <div className="py-4 text-center text-xs text-[var(--fg-muted)]">沒有符合的序號</div>
              )}
            </div>
            <button onClick={() => { setSerialPicker(null); setSerialFilter(""); }} className="mt-4 w-full rounded-full border border-[var(--border)] py-2 text-sm">取消</button>
          </div>
        </div>
      )}

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

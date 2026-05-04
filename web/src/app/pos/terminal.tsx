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

// 歷史交易快查 dialog
function LookupDialog({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<{
    id: number; saleNumber: string; total: number; paymentStatus: string;
    customerName: string | null; customerPhone: string | null; createdAt: string;
    staffName: string; itemCount: number; firstItemName: string; serials: string[];
  }>>([]);
  const [loading, setLoading] = useState(false);

  // debounce search
  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/pos/lookup?q=${encodeURIComponent(q.trim())}`);
        const data = await r.json();
        setResults(data.results || []);
      } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-16 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-2xl border border-[var(--gold)]/40 bg-[var(--bg-elevated)] p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "popIn 0.2s ease" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-base text-[var(--gold)]">🔍 查歷史交易</h3>
          <button onClick={onClose} className="text-[var(--fg-muted)] hover:text-[var(--fg)]">✕</button>
        </div>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="銷售單號 / IMEI / 客戶姓名 / 電話末 4 碼"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm focus:border-[var(--gold)] focus:outline-none"
        />
        <p className="mt-1 text-[10px] text-[var(--fg-muted)]">提示：保固查詢用 IMEI；客人說「上週謝先生那單」用姓名搜</p>

        <div className="mt-3 max-h-96 overflow-y-auto space-y-2">
          {loading && <div className="text-center text-xs text-[var(--fg-muted)] py-4">查詢中...</div>}
          {!loading && q.trim() && results.length === 0 && <div className="text-center text-xs text-[var(--fg-muted)] py-8">沒找到符合的交易</div>}
          {results.map(s => {
            const d = new Date(s.createdAt);
            const daysAgo = Math.floor((Date.now() - d.getTime()) / 86400_000);
            const inWarranty = daysAgo <= 90;  // 預設 3 個月保固
            return (
              <a
                key={s.id}
                href={`/pos/sales/${s.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 hover:border-[var(--gold)]"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-[var(--gold)]">{s.saleNumber}</span>
                      {s.paymentStatus === "VOID" && <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-400">已作廢</span>}
                      {s.paymentStatus === "PAID" && (
                        <span className={`rounded px-1.5 py-0.5 text-[10px] ${inWarranty ? "bg-green-500/20 text-green-400" : "bg-[var(--border)] text-[var(--fg-muted)]"}`}>
                          {inWarranty ? `保固中 (剩 ${90 - daysAgo} 天)` : `保固已過`}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 truncate text-sm">{s.firstItemName}{s.itemCount > 1 ? ` 等 ${s.itemCount} 項` : ""}</div>
                    <div className="mt-0.5 flex flex-wrap gap-2 text-[10px] text-[var(--fg-muted)]">
                      {s.customerName && <span>👤 {s.customerName}</span>}
                      {s.customerPhone && <span className="font-mono">{s.customerPhone}</span>}
                      <span>{d.toLocaleString("zh-TW", { hour12: false, dateStyle: "short", timeStyle: "short" })}（{daysAgo} 天前）</span>
                      <span>👤 {s.staffName}</span>
                    </div>
                    {s.serials.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {s.serials.map(sn => <span key={sn} className="rounded bg-purple-500/20 px-1.5 py-0.5 font-mono text-[10px] text-purple-300">{sn}</span>)}
                      </div>
                    )}
                  </div>
                  <span className="ml-3 shrink-0 font-mono text-base text-[var(--gold)]">${s.total.toLocaleString()}</span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
      <style>{`@keyframes popIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}

// 商品 tile（被多處複用：熱賣 + 全部商品）
function ProductTile({ p, onAdd, hot }: { p: ProductOption; onAdd: (p: ProductOption) => void; hot?: boolean }) {
  return (
    <button
      onClick={() => onAdd(p)}
      disabled={p.stock <= 0}
      className={`group relative overflow-hidden rounded-lg border bg-[var(--bg-elevated)] text-left transition active:scale-95 disabled:opacity-40 ${hot ? "border-orange-500/40 hover:border-orange-400" : "border-[var(--border)] hover:border-[var(--gold)]"}`}
    >
      {hot && <span className="absolute right-1 top-1 z-10 rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">HOT</span>}
      {p.imageUrl ? (
        <img src={p.imageUrl} alt="" className="aspect-square w-full object-cover" />
      ) : (
        <div className="aspect-square w-full bg-[var(--bg)] flex items-center justify-center text-3xl text-[var(--fg-muted)]">📦</div>
      )}
      <div className="p-2">
        <div className="line-clamp-2 text-xs leading-tight min-h-[28px]">{p.name}</div>
        <div className="mt-1 flex items-center justify-between">
          <span className="font-mono text-sm font-bold text-[var(--gold)]">${p.price.toLocaleString()}</span>
          <span className={`text-[10px] ${p.stock > 0 ? "text-green-400" : "text-red-400"}`}>{p.stock > 0 ? `${p.stock}` : "缺"}</span>
        </div>
      </div>
    </button>
  );
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

interface BundleOption {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  items: Array<{ productId?: number; productVariantId?: number; qty: number; name: string; unitPrice: number }>;
}

export function PosTerminal({
  staff, products, repairs, favorites = [], repairBrands = [], todayKpi, bundles = [],
}: {
  staff: { staffId: number; name: string; role: string; code: string };
  products: ProductOption[];
  repairs: RepairOption[];
  favorites?: ProductOption[];
  repairBrands?: string[];
  todayKpi?: { count: number; revenue: number; myCount: number; myRevenue: number };
  bundles?: BundleOption[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [tab, setTab] = useState<"products" | "repairs">("products");
  const [search, setSearch] = useState("");
  const [repairBrand, setRepairBrand] = useState<string>("");  // 維修品牌過濾
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
  // 歷史交易快查
  const [lookupOpen, setLookupOpen] = useState(false);

  // ⌨️ 鍵盤熱鍵（桌機老手用）— 必須在所有 state 宣告後
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (e.key === "Escape") {
        if (showCheckout) { setShowCheckout(false); e.preventDefault(); return; }
        if (lookupOpen) { setLookupOpen(false); e.preventDefault(); return; }
        if (customDialog) { setCustomDialog(false); e.preventDefault(); return; }
        if (posScan) { setPosScan(false); e.preventDefault(); return; }
        if (mobileCartOpen) { setMobileCartOpen(false); e.preventDefault(); return; }
      }
      if (inField) return;
      // F2 / Ctrl+Enter → 結帳
      if ((e.key === "F2" || (e.key === "Enter" && e.ctrlKey)) && cart.length > 0) {
        setShowCheckout(true); e.preventDefault();
      }
      // F3 → 查歷史
      if (e.key === "F3") { setLookupOpen(true); e.preventDefault(); }
      // F4 → 客製品項
      if (e.key === "F4") { setCustomDialog(true); e.preventDefault(); }
      // / → 聚焦搜尋
      if (e.key === "/") {
        const input = document.querySelector<HTMLInputElement>('input[placeholder*="搜尋"]');
        input?.focus(); e.preventDefault();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cart.length, showCheckout, lookupOpen, customDialog, posScan, mobileCartOpen]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products.slice(0, 60);
    const q = search.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q)).slice(0, 60);
  }, [search, products]);

  const filteredRepairs = useMemo(() => {
    let list = repairs;
    if (repairBrand) list = list.filter(r => r.brand === repairBrand);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(q));
    }
    return list.slice(0, 80);
  }, [search, repairs, repairBrand]);

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

  function addBundle(b: BundleOption) {
    // 套餐：以 CUSTOM 一筆加入購物車（保留套餐名 + 套餐價，不分拆扣庫存）
    // 庫存扣減的精確版本將來可改成自動分拆 itemType=PRODUCT/VARIANT 各加一行
    setCart([...cart, {
      key: `bundle-${b.id}-${Date.now()}`,
      itemType: "CUSTOM",
      name: `🎁 ${b.name}（${b.items.length} 項）`,
      unitPrice: b.price,
      qty: 1,
    }]);
    if ("vibrate" in navigator) (navigator as Navigator).vibrate(40);
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

      {/* Top bar — 精簡版 + 今日 KPI */}
      <header
        className="flex items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5 md:px-4"
        style={{ paddingTop: "calc(0.625rem + env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-serif text-base text-[var(--gold)]">🛒</span>
          <span className="text-sm font-medium">{staff.name}</span>
          <span className="hidden sm:inline text-[10px] text-[var(--fg-muted)]">{staff.code}</span>
        </div>
        {todayKpi && (
          <div className="flex flex-1 items-center justify-center gap-3 text-[11px] sm:text-xs">
            <div className="text-center">
              <div className="text-[9px] text-[var(--fg-muted)]">今日</div>
              <div className="font-mono text-[var(--gold-bright)]">${todayKpi.revenue.toLocaleString()} <span className="opacity-60">×{todayKpi.count}</span></div>
            </div>
            <div className="hidden sm:block w-px h-6 bg-[var(--border)]" />
            <div className="hidden sm:block text-center">
              <div className="text-[9px] text-[var(--fg-muted)]">我的</div>
              <div className="font-mono text-emerald-400">${todayKpi.myRevenue.toLocaleString()} <span className="opacity-60">×{todayKpi.myCount}</span></div>
            </div>
          </div>
        )}
        <div className="flex gap-1.5 text-xs shrink-0">
          <button onClick={() => setLookupOpen(true)} className="rounded-full px-2 py-1 text-[var(--fg-muted)] hover:text-[var(--gold)]" title="查歷史交易">🔍</button>
          <Link href="/admin/sales" target="_blank" className="rounded-full px-2 py-1 text-[var(--fg-muted)] hover:text-[var(--gold)]" title="交易紀錄">📊</Link>
          <form action={logoutAction}><button className="rounded-full px-2 py-1 text-[var(--fg-muted)] hover:text-red-400" title="登出">⏏</button></form>
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
              <>
                {/* 🎁 套餐快選 */}
                {bundles.length > 0 && !search.trim() && (
                  <section className="mb-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-base">🎁</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-400">套餐組合</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                      {bundles.map(b => {
                        const itemsTotal = b.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
                        const savings = itemsTotal - b.price;
                        return (
                          <button
                            key={b.id}
                            onClick={() => addBundle(b)}
                            className="group relative overflow-hidden rounded-lg border-2 border-purple-500/40 bg-gradient-to-br from-purple-900/30 to-[var(--bg-elevated)] p-3 text-left transition active:scale-95 hover:border-purple-400"
                          >
                            <div className="text-xs font-medium line-clamp-2 min-h-[28px]">{b.name}</div>
                            <div className="mt-1 text-[10px] text-[var(--fg-muted)]">{b.items.length} 項</div>
                            <div className="mt-2 flex items-baseline gap-1">
                              <span className="font-mono text-base font-bold text-purple-300">${b.price.toLocaleString()}</span>
                              {savings > 0 && <span className="rounded bg-red-500/30 px-1 text-[9px] text-red-300">省 {savings}</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* 🔥 最近熱賣（30 天 top 8）*/}
                {favorites.length > 0 && !search.trim() && (
                  <section className="mb-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-base">🔥</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-orange-400">近 30 天熱賣</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                      {favorites.map(p => (
                        <ProductTile key={`fav-${p.id}`} p={p} onAdd={addProduct} hot />
                      ))}
                    </div>
                  </section>
                )}

                {/* 全部商品 */}
                {favorites.length > 0 && !search.trim() && (
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">全部商品</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {filteredProducts.map(p => <ProductTile key={p.id} p={p} onAdd={addProduct} />)}
                  {filteredProducts.length === 0 && <div className="col-span-full py-12 text-center text-sm text-[var(--fg-muted)]">沒有符合的商品</div>}
                </div>
              </>
            ) : (
              <>
                {/* 維修品牌過濾 chips */}
                {repairBrands.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setRepairBrand("")}
                      className={`rounded-full px-3 py-1 text-xs transition ${repairBrand === "" ? "bg-[var(--gold)] text-black font-medium" : "border border-[var(--border)] text-[var(--fg-muted)]"}`}
                    >全部 ({repairs.length})</button>
                    {repairBrands.map(b => {
                      const c = repairs.filter(r => r.brand === b).length;
                      return (
                        <button
                          key={b}
                          onClick={() => setRepairBrand(b)}
                          className={`rounded-full px-3 py-1 text-xs transition ${repairBrand === b ? "bg-[var(--gold)] text-black font-medium" : "border border-[var(--border)] text-[var(--fg-muted)]"}`}
                        >{b} ({c})</button>
                      );
                    })}
                  </div>
                )}
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
              </>
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
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-5xl opacity-60">🛒</div>
                <div className="mt-3 text-sm font-medium text-[var(--fg)]">購物車空空的</div>
                <div className="mt-1 text-xs text-[var(--fg-muted)]">點左邊商品 / 維修</div>
                <div className="text-xs text-[var(--fg-muted)]">或按 📷 掃條碼加入</div>
              </div>
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

      {/* 歷史交易查詢 dialog（保固查詢用）*/}
      {lookupOpen && <LookupDialog onClose={() => setLookupOpen(false)} />}

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

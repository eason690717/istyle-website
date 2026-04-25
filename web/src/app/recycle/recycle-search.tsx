"use client";
import { useMemo, useState } from "react";
import { SITE } from "@/lib/site-config";
import { formatTwd } from "@/lib/pricing";

interface PriceItem {
  id: number;
  category: string;
  categoryLabel: string;
  brand: string;
  modelName: string;
  storage: string;
  variant: string;
  minPrice: number;
}

type SortKey = "price_desc" | "price_asc" | "name_asc";

const STORAGE_BUCKETS = ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "2TB"];

export function RecycleSearch({
  prices,
  categories,
  brands,
}: {
  prices: PriceItem[];
  categories: Record<string, string>;
  brands: string[];
}) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeBrand, setActiveBrand] = useState<string>("all");
  const [activeStorages, setActiveStorages] = useState<Set<string>>(new Set());
  const [activeVariant, setActiveVariant] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("price_desc");
  const [view, setView] = useState<"card" | "table">("table");

  // 計數（依「搜尋結果」動態縮減 — 搜 Air 4 時，類別 chip 只顯示有 Air 4 的類別）
  // 注意：這些 useMemo 會在下面 searchOnly 定義後使用


  // 共用排序：搜尋字存在時 → 相關度優先；否則使用者指定排序
  function sortList<T extends PriceItem>(list: T[]): T[] {
    const hasQuery = query.trim().length > 0;
    return [...list].sort((a, b) => {
      if (hasQuery) {
        const sa = matchScore(a);
        const sb = matchScore(b);
        if (sa !== sb) return sb - sa; // 高分在前
      }
      if (sortKey === "price_desc") return b.minPrice - a.minPrice;
      if (sortKey === "price_asc") return a.minPrice - b.minPrice;
      return a.modelName.localeCompare(b.modelName, "zh-TW");
    });
  }

  // 智慧搜尋：將機型名稱拆成 token，計算「相鄰相關度分數」
  // 「Air 4」應優先匹配「iPad Air 4」(相鄰)，而非「iPad Air 13 M4」(分離)
  function tokenize(s: string): string[] {
    return s.toLowerCase().match(/[a-z]+|\d+/g) || [];
  }

  // 取得匹配分數：0=不符、1=token 都在但分離、2=token 相鄰、3=完整短語匹配
  function matchScore(p: PriceItem): number {
    const q = query.trim().toLowerCase();
    if (!q) return 1; // 沒搜尋字，全部當匹配
    const qTokens = tokenize(q);
    if (qTokens.length === 0) return 0;

    const haystackText = `${p.modelName} ${p.storage} ${p.variant} ${p.brand}`.toLowerCase();
    const haystackTokens = tokenize(haystackText);

    // 數字 token 強制邊界匹配
    for (const qt of qTokens) {
      if (/^\d+$/.test(qt)) {
        const re = new RegExp(`(?:^|[^\\d])${qt}(?:[^\\d]|$)`);
        if (!re.test(haystackText)) return 0;
      } else {
        if (!haystackTokens.some(ht => ht.includes(qt))) return 0;
      }
    }

    // 完整短語匹配（「Air 4」整段出現）— 最高分
    const phraseRe = new RegExp(`(?:^|[^a-z\\d])${qTokens.join("\\s*")}(?:[^a-z\\d]|$)`);
    if (phraseRe.test(haystackText)) return 3;

    // 連續 token 相鄰匹配
    if (qTokens.length >= 2) {
      for (let i = 0; i <= haystackTokens.length - qTokens.length; i++) {
        const slice = haystackTokens.slice(i, i + qTokens.length);
        const allMatch = qTokens.every((qt, j) => {
          if (/^\d+$/.test(qt)) return slice[j] === qt;
          return slice[j].includes(qt);
        });
        if (allMatch) return 2;
      }
    }

    return 1;
  }

  function matchQuery(p: PriceItem): boolean {
    return matchScore(p) > 0;
  }

  // 「先套用搜尋字」的子集：用來計算各篩選 chip 的動態計數
  // → 搜尋 "Air 4" 時，品牌只顯示有 Air 4 機型的品牌（其他品牌自動隱藏）
  const searchOnly = useMemo(() => {
    if (!query.trim()) return prices;
    return prices.filter(matchQuery);
  }, [prices, query]);

  const filtered = useMemo(() => {
    let list = searchOnly;
    if (activeCategory !== "all") {
      list = list.filter(p => p.category === activeCategory);
    }
    if (activeBrand !== "all") {
      list = list.filter(p => p.brand === activeBrand);
    }
    if (activeStorages.size > 0) {
      list = list.filter(p => activeStorages.has(p.storage));
    }
    if (activeVariant !== "all") {
      list = list.filter(p => p.variant === activeVariant);
    }
    return sortList(list);
  }, [searchOnly, activeCategory, activeBrand, activeStorages, activeVariant, sortKey]);

  // 「擴展到全部類別」的搜尋備援：當有搜尋字但本類別 0 結果，提供跨類別結果
  const crossCategoryResults = useMemo(() => {
    if (!query.trim() || filtered.length > 0 || activeCategory === "all") return [];
    return sortList(prices.filter(matchQuery));
  }, [query, filtered.length, activeCategory, prices, sortKey]);

  function toggleStorage(s: string) {
    const next = new Set(activeStorages);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setActiveStorages(next);
  }

  function clearAll() {
    setActiveCategory("all");
    setActiveBrand("all");
    setActiveStorages(new Set());
    setActiveVariant("all");
    setQuery("");
  }

  const hasFilter = activeCategory !== "all" || activeBrand !== "all" || activeStorages.size > 0 || activeVariant !== "all" || query.trim() !== "";

  // 動態計數：依「搜尋字 + 已選類別」過濾後計算各 chip 數字
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    counts.set("all", searchOnly.length);
    for (const p of searchOnly) {
      counts.set(p.category, (counts.get(p.category) || 0) + 1);
    }
    return counts;
  }, [searchOnly]);

  const brandCounts = useMemo(() => {
    const base = activeCategory === "all" ? searchOnly : searchOnly.filter(p => p.category === activeCategory);
    const counts = new Map<string, number>();
    counts.set("all", base.length);
    for (const p of base) counts.set(p.brand, (counts.get(p.brand) || 0) + 1);
    return counts;
  }, [searchOnly, activeCategory]);

  const availableStorages = useMemo(() => {
    const base = searchOnly.filter(p =>
      (activeCategory === "all" || p.category === activeCategory) &&
      (activeBrand === "all" || p.brand === activeBrand)
    );
    const set = new Set<string>();
    for (const p of base) if (p.storage) set.add(p.storage);
    return STORAGE_BUCKETS.filter(s => set.has(s));
  }, [searchOnly, activeCategory, activeBrand]);

  const hasVariantFilter = useMemo(() => {
    const base = searchOnly.filter(p =>
      (activeCategory === "all" || p.category === activeCategory) &&
      (activeBrand === "all" || p.brand === activeBrand)
    );
    return base.some(p => p.variant);
  }, [searchOnly, activeCategory, activeBrand]);

  // 動態品牌列表：搜尋後只顯示有結果的品牌（避免雜訊）
  const visibleBrands = useMemo(() => {
    const set = new Set<string>();
    const base = activeCategory === "all" ? searchOnly : searchOnly.filter(p => p.category === activeCategory);
    for (const p of base) set.add(p.brand);
    return brands.filter(b => set.has(b));
  }, [brands, searchOnly, activeCategory]);

  return (
    <div className="mt-8">
      {/* 搜尋框 — 高質感、發光焦點 */}
      <div className="refined-search relative flex items-center px-5 py-4">
        <svg className="mr-3 h-5 w-5 flex-shrink-0 text-[var(--gold)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋機型（如：Air 4、iPhone 15 Pro 256）"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="ml-2 flex h-6 w-6 items-center justify-center rounded-full text-[var(--fg-muted)] transition hover:bg-[var(--bg-soft)] hover:text-[var(--gold)]"
            aria-label="清除"
          >
            ✕
          </button>
        )}
      </div>

      {/* 類別 Tabs */}
      <div className="mt-4">
        <div className="text-xs uppercase tracking-wider text-[var(--gold-soft)]">類別</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip
            active={activeCategory === "all"}
            onClick={() => { setActiveCategory("all"); setActiveStorages(new Set()); }}
            label="全部"
            count={categoryCounts.get("all") || 0}
          />
          {Object.entries(categories).map(([key, label]) => {
            const count = categoryCounts.get(key) || 0;
            if (count === 0) return null;
            return (
              <Chip
                key={key}
                active={activeCategory === key}
                onClick={() => { setActiveCategory(key); setActiveStorages(new Set()); }}
                label={label}
                count={count}
              />
            );
          })}
        </div>
      </div>

      {/* 品牌篩選 — 動態縮減（搜尋 "Air 4" 時只顯示 Apple） */}
      {visibleBrands.length > 1 && (
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wider text-[var(--gold-soft)]">品牌</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip
              active={activeBrand === "all"}
              onClick={() => setActiveBrand("all")}
              label="不限"
            />
            {visibleBrands.map(b => (
              <Chip
                key={b}
                active={activeBrand === b}
                onClick={() => setActiveBrand(b)}
                label={b}
                count={brandCounts.get(b) || 0}
              />
            ))}
          </div>
        </div>
      )}

      {/* 容量篩選 */}
      {availableStorages.length > 0 && (
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wider text-[var(--gold-soft)]">容量</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {availableStorages.map(s => (
              <Chip
                key={s}
                active={activeStorages.has(s)}
                onClick={() => toggleStorage(s)}
                label={s}
              />
            ))}
          </div>
        </div>
      )}

      {/* 規格 (iPad 專用) */}
      {hasVariantFilter && (activeCategory === "tablet" || activeCategory === "all") && (
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wider text-[var(--gold-soft)]">網路</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip active={activeVariant === "all"} onClick={() => setActiveVariant("all")} label="不限" />
            <Chip active={activeVariant === "WiFi"} onClick={() => setActiveVariant("WiFi")} label="WiFi" />
            <Chip active={activeVariant === "WiFi+5G"} onClick={() => setActiveVariant("WiFi+5G")} label="WiFi + 5G" />
          </div>
        </div>
      )}

      {/* 排序 + 顯示模式 */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-soft)] pt-4">
        <div className="text-sm text-[var(--fg)]">
          找到 <span className="font-serif text-lg text-[var(--gold)]">{filtered.length}</span> 個機型
          {hasFilter && (
            <button
              onClick={clearAll}
              className="ml-3 text-xs text-[var(--fg-muted)] underline hover:text-[var(--gold)]"
            >
              清除篩選
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs text-[var(--fg)] focus:border-[var(--gold)] focus:outline-none"
          >
            <option value="price_desc">價格高到低</option>
            <option value="price_asc">價格低到高</option>
            <option value="name_asc">機型名稱</option>
          </select>
          <div className="hidden gap-1 rounded border border-[var(--border)] bg-[var(--bg-elevated)] p-0.5 sm:flex">
            <button
              onClick={() => setView("card")}
              className={`px-2 py-1 text-xs ${view === "card" ? "bg-[var(--gold)] text-black" : "text-[var(--fg)]"}`}
            >卡片</button>
            <button
              onClick={() => setView("table")}
              className={`px-2 py-1 text-xs ${view === "table" ? "bg-[var(--gold)] text-black" : "text-[var(--fg)]"}`}
            >表格</button>
          </div>
        </div>
      </div>

      {/* 結果 */}
      {filtered.length === 0 ? (
        <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-8 text-center">
          <p className="text-sm text-[var(--fg)]">在「{categories[activeCategory] || "目前篩選"}」中沒有結果</p>
          {crossCategoryResults.length > 0 ? (
            <>
              <p className="mt-3 text-xs text-[var(--gold-soft)]">
                但在其他類別找到 {crossCategoryResults.length} 筆相關機型
              </p>
              <button
                onClick={() => { setActiveCategory("all"); setActiveStorages(new Set()); setActiveVariant("all"); }}
                className="btn-gold mt-4 rounded-full px-5 py-2 text-sm"
              >
                查看全部類別結果
              </button>
            </>
          ) : (
            <>
              <p className="mt-3 text-xs text-[var(--fg-muted)]">
                試試其他關鍵字，或直接 LINE 詢問
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {hasFilter && (
                  <button onClick={clearAll} className="btn-gold-outline rounded-full px-4 py-2 text-sm">
                    清除所有篩選
                  </button>
                )}
                <a href={SITE.lineAddUrl} className="btn-gold rounded-full px-5 py-2 text-sm">
                  LINE 詢問
                </a>
              </div>
            </>
          )}
        </div>
      ) : view === "table" ? (
        <ResultTable items={filtered.slice(0, 200)} />
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.slice(0, 60).map((p) => (
            <PriceCard key={p.id} item={p} />
          ))}
        </div>
      )}

      {filtered.length > (view === "table" ? 200 : 60) && (
        <p className="mt-4 text-center text-xs text-[var(--fg-muted)]">
          顯示前 {view === "table" ? 200 : 60} 筆．請用篩選縮小範圍
        </p>
      )}
    </div>
  );
}

function Chip({
  active, onClick, label, count,
}: {
  active: boolean; onClick: () => void; label: string; count?: number;
}) {
  return (
    <button onClick={onClick} className={`chip-refined ${active ? "active" : ""}`} type="button">
      {label}
      {count !== undefined && <span className="count">({count})</span>}
    </button>
  );
}

function PriceCard({ item }: { item: PriceItem }) {
  return (
    <div className="refined-card p-5">
      <div className="flex items-center gap-2 text-xs">
        <span className="rounded-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-soft)] px-2.5 py-0.5 font-medium text-black">{item.brand}</span>
        <span className="text-[var(--fg-muted)]">{item.categoryLabel}</span>
      </div>
      <div className="mt-3 text-sm font-medium leading-snug text-[var(--fg-strong)]">{item.modelName}</div>
      {(item.storage || item.variant) && (
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          {item.storage && <span className="rounded-md border border-[var(--border)] bg-[var(--bg-soft)] px-2 py-0.5 text-[var(--fg-muted)]">{item.storage}</span>}
          {item.variant && <span className="rounded-md border border-[var(--border)] bg-[var(--bg-soft)] px-2 py-0.5 text-[var(--fg-muted)]">{item.variant}</span>}
        </div>
      )}
      <hr className="divider-gold my-4" />
      <div className="text-[10px] uppercase tracking-widest text-[var(--gold-soft)]">回收價（起）</div>
      <div className="text-gold-gradient font-serif text-3xl font-semibold leading-tight">
        {formatTwd(item.minPrice)}
      </div>
      <a href={SITE.lineAddUrl} className="btn-gold-outline mt-4 block rounded-full py-2 text-center text-xs">
        LINE 預約回收 →
      </a>
    </div>
  );
}

// 緊湊列表：手機版單頁不滾動 + 桌面版完整表格
function ResultTable({ items }: { items: PriceItem[] }) {
  return (
    <div className="mt-4 rounded-xl border border-[var(--border)] overflow-hidden">
      {/* === 手機版（< md）：緊湊卡片列，不滾動 === */}
      <ul className="md:hidden divide-y divide-[var(--border-soft)]">
        {items.map((p, idx) => (
          <li
            key={p.id}
            className={`flex items-center gap-3 px-3 py-3 transition ${
              idx % 2 === 0 ? "bg-[#141414]" : "bg-[#181818]"
            } hover:bg-[#241c12]`}
          >
            {/* 左：機型名稱（兩行） + 規格徽章 */}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium leading-tight text-[var(--fg-strong)]">
                {p.modelName}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                <span className="rounded bg-[var(--gold)]/15 px-1.5 py-0.5 text-[var(--gold)]">{p.categoryLabel}</span>
                {p.storage && (
                  <span className="rounded bg-[var(--bg-soft)] px-1.5 py-0.5 text-[var(--fg-muted)]">{p.storage}</span>
                )}
                {p.variant && (
                  <span className="rounded bg-[var(--bg-soft)] px-1.5 py-0.5 text-[var(--fg-muted)]">{p.variant}</span>
                )}
              </div>
            </div>

            {/* 右：價格 + 預約鈕 */}
            <div className="flex flex-shrink-0 flex-col items-end gap-1">
              <div className="font-mono text-base font-semibold text-[var(--gold)] leading-none">
                {p.minPrice.toLocaleString()}
              </div>
              <a
                href={SITE.lineAddUrl}
                className="rounded-full bg-[var(--gold)]/15 px-2.5 py-0.5 text-[10px] text-[var(--gold)] hover:bg-[var(--gold)] hover:text-black transition"
              >
                預約 →
              </a>
            </div>
          </li>
        ))}
      </ul>

      {/* === 桌面版（>= md）：完整表格 === */}
      <table className="hidden min-w-full text-sm md:table">
        <thead>
          <tr className="bg-[#1f1810] text-[var(--gold)]">
            <th className="px-3 py-2.5 text-left font-medium">機型</th>
            <th className="px-3 py-2.5 text-left font-medium">類別</th>
            <th className="px-3 py-2.5 text-left font-medium">容量</th>
            <th className="px-3 py-2.5 text-left font-medium">規格</th>
            <th className="px-3 py-2.5 text-right font-medium">回收價</th>
            <th className="px-3 py-2.5 text-right font-medium w-16"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((p, idx) => (
            <tr
              key={p.id}
              className={`group border-t border-[var(--border-soft)] transition ${
                idx % 2 === 0 ? "bg-[#141414]" : "bg-[#181818]"
              } hover:bg-[#241c12]`}
            >
              <td className="px-3 py-2.5 font-medium text-[var(--fg)]">{p.modelName}</td>
              <td className="px-3 py-2.5 text-xs text-[var(--fg-muted)]">{p.categoryLabel}</td>
              <td className="px-3 py-2.5 text-xs">{p.storage || "—"}</td>
              <td className="px-3 py-2.5 text-xs">{p.variant || "—"}</td>
              <td className="px-3 py-2.5 text-right font-mono font-medium text-[var(--gold)]">{p.minPrice.toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right">
                <a
                  href={SITE.lineAddUrl}
                  className="rounded border border-[var(--gold-soft)] px-2 py-1 text-[10px] text-[var(--gold-soft)] hover:bg-[var(--gold)] hover:text-black"
                >
                  預約
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

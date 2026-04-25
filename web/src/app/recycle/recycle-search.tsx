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

  // 計數
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    counts.set("all", prices.length);
    for (const p of prices) {
      counts.set(p.category, (counts.get(p.category) || 0) + 1);
    }
    return counts;
  }, [prices]);

  // 可用容量（依當前類別動態計算）
  const availableStorages = useMemo(() => {
    const set = new Set<string>();
    for (const p of prices) {
      if (activeCategory !== "all" && p.category !== activeCategory) continue;
      if (p.storage) set.add(p.storage);
    }
    return STORAGE_BUCKETS.filter(s => set.has(s));
  }, [prices, activeCategory]);

  const hasVariantFilter = useMemo(() =>
    prices.some(p => p.variant && (p.category === "tablet" || activeCategory === "tablet"))
  , [prices, activeCategory]);

  // 共用排序
  function sortList<T extends PriceItem>(list: T[]): T[] {
    return [...list].sort((a, b) => {
      if (sortKey === "price_desc") return b.minPrice - a.minPrice;
      if (sortKey === "price_asc") return a.minPrice - b.minPrice;
      return a.modelName.localeCompare(b.modelName, "zh-TW");
    });
  }

  // 套用文字搜尋（共用）
  function matchQuery(p: PriceItem): boolean {
    const tokens = query.toLowerCase().trim().split(/\s+/);
    const haystack = `${p.modelName} ${p.storage} ${p.variant}`.toLowerCase();
    return tokens.every(t => haystack.includes(t));
  }

  const filtered = useMemo(() => {
    let list = prices;
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
    if (query.trim()) {
      list = list.filter(matchQuery);
    }
    return sortList(list);
  }, [prices, activeCategory, activeBrand, activeStorages, activeVariant, query, sortKey]);

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

  const brandCounts = useMemo(() => {
    const counts = new Map<string, number>();
    counts.set("all", prices.length);
    for (const p of prices) {
      if (activeCategory !== "all" && p.category !== activeCategory) continue;
      counts.set(p.brand, (counts.get(p.brand) || 0) + 1);
    }
    return counts;
  }, [prices, activeCategory]);

  return (
    <div className="mt-8">
      {/* 搜尋框 — 大尺寸、置中 */}
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋機型（可組合：iPhone 15 Pro 256）"
          className="w-full rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-3 text-base text-[var(--fg)] outline-none transition placeholder:text-[var(--fg-muted)] focus:border-[var(--gold)]"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] hover:text-[var(--gold)]"
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

      {/* 品牌篩選 */}
      {brands.length > 1 && (
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wider text-[var(--gold-soft)]">品牌</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip
              active={activeBrand === "all"}
              onClick={() => setActiveBrand("all")}
              label="不限"
            />
            {brands.map(b => {
              const count = brandCounts.get(b) || 0;
              if (count === 0) return null;
              return (
                <Chip
                  key={b}
                  active={activeBrand === b}
                  onClick={() => setActiveBrand(b)}
                  label={b}
                  count={count}
                />
              );
            })}
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
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs transition ${
        active
          ? "border-[var(--gold)] bg-[var(--gold)] text-black font-medium"
          : "border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--fg)] hover:border-[var(--gold-soft)] hover:text-[var(--gold)]"
      }`}
    >
      {label}
      {count !== undefined && (
        <span className={`ml-1 ${active ? "" : "text-[var(--fg-muted)]"}`}>({count})</span>
      )}
    </button>
  );
}

function PriceCard({ item }: { item: PriceItem }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4 transition hover:border-[var(--gold)]">
      <div className="flex items-center gap-2 text-xs">
        <span className="rounded bg-[var(--gold)]/15 px-2 py-0.5 text-[var(--gold)]">{item.brand}</span>
        <span className="text-[var(--fg-muted)]">{item.categoryLabel}</span>
      </div>
      <div className="mt-2 text-sm font-medium text-[var(--fg)]">{item.modelName}</div>
      {(item.storage || item.variant) && (
        <div className="mt-1 flex flex-wrap gap-2 text-xs">
          {item.storage && <span className="rounded bg-[var(--bg-soft)] px-2 py-0.5 text-[var(--fg-muted)]">{item.storage}</span>}
          {item.variant && <span className="rounded bg-[var(--bg-soft)] px-2 py-0.5 text-[var(--fg-muted)]">{item.variant}</span>}
        </div>
      )}
      <div className="mt-3 border-t border-[var(--border)] pt-3">
        <div className="text-xs text-[var(--fg-muted)]">回收價（起）</div>
        <div className="font-serif text-2xl text-[var(--gold)]">{formatTwd(item.minPrice)}</div>
      </div>
      <a
        href={SITE.lineAddUrl}
        className="btn-gold-outline mt-3 block rounded-full py-2 text-center text-xs"
      >
        LINE 預約回收
      </a>
    </div>
  );
}

function ResultTable({ items }: { items: PriceItem[] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--border)]">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-[#1f1810] text-[var(--gold)]">
            <th className="sticky left-0 z-10 bg-[#1f1810] px-3 py-2.5 text-left font-medium">機型</th>
            <th className="px-3 py-2.5 text-left font-medium">品牌</th>
            <th className="px-3 py-2.5 text-left font-medium">類別</th>
            <th className="px-3 py-2.5 text-left font-medium">容量</th>
            <th className="px-3 py-2.5 text-left font-medium">規格</th>
            <th className="px-3 py-2.5 text-right font-medium">回收價</th>
            <th className="px-3 py-2.5 text-right font-medium"></th>
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
              <td
                className={`sticky left-0 z-10 px-3 py-2.5 font-medium text-[var(--fg)] ${
                  idx % 2 === 0 ? "bg-[#141414]" : "bg-[#181818]"
                } group-hover:bg-[#241c12]`}
              >
                {p.modelName}
              </td>
              <td className="px-3 py-2.5 text-xs">
                <span className="rounded bg-[var(--gold)]/15 px-2 py-0.5 text-[var(--gold)]">{p.brand}</span>
              </td>
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

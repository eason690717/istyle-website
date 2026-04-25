"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface QuoteResult {
  modelId: number;
  brandSlug: string;
  brandName: string;
  modelSlug: string;
  modelName: string;
  section: string | null;
  topItems: Array<{ name: string; price: number }>;
}

export function HeroSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QuoteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search-quote?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("search failed");
        const data = await res.json();
        if (!cancelled) {
          setResults(data.results || []);
          setOpen(true);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  // 點擊外部關閉
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="輸入您的機型立刻看報價（例：iPhone 15 Pro）"
          className="w-full rounded-full border-2 border-[var(--gold)] bg-[var(--bg-elevated)] px-6 py-4 text-base text-[var(--fg)] outline-none placeholder:text-[var(--fg-muted)] focus:border-[var(--gold-bright)]"
          autoComplete="off"
        />
        <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[var(--gold)]">
          {loading ? (
            <span className="text-xs">查詢中…</span>
          ) : (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          )}
        </div>
      </div>

      {/* 結果下拉 */}
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-2 max-h-[60vh] overflow-y-auto rounded-xl border border-[var(--gold)] bg-[var(--bg-elevated)] shadow-2xl text-left">
          {results.length === 0 && !loading ? (
            <div className="p-6 text-center text-sm text-[var(--fg-muted)]">
              找不到「{query}」相關機型．試試其他關鍵字
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {results.map((r) => (
                <Link
                  key={r.modelId}
                  href={`/quote/${r.brandSlug}/${r.modelSlug}`}
                  className="flex items-center justify-between gap-4 p-4 transition hover:bg-[var(--bg-soft)]"
                  onClick={() => setOpen(false)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[var(--gold)]/15 px-2 py-0.5 text-xs text-[var(--gold)]">
                        {r.brandName}
                      </span>
                      <span className="font-medium text-[var(--fg)]">{r.modelName}</span>
                    </div>
                    {r.topItems.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--fg-muted)]">
                        {r.topItems.map((it, i) => (
                          <span key={i}>
                            {it.name} <span className="font-mono text-[var(--gold-soft)]">${it.price.toLocaleString()}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-[var(--gold)]">看完整報價 →</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

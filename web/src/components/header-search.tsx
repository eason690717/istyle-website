"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface QuoteResult {
  modelId: number;
  brandSlug: string;
  brandName: string;
  modelSlug: string;
  modelName: string;
  topItems: Array<{ name: string; price: number }>;
}

// Header 內的精簡搜尋欄
export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QuoteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search-quote?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (!cancelled) setResults(data.results || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

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
    <div ref={containerRef} className="relative">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          aria-label="搜尋"
          className="rounded-full border border-[var(--gold-soft)]/40 p-2 text-[var(--fg-muted)] hover:border-[var(--gold)] hover:text-[var(--gold)]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      ) : (
        <div className="hero-search-glow w-56">
          <div className="hero-search-inner !py-1.5 !px-3">
            <svg viewBox="0 0 24 24" className="mr-2 h-3.5 w-3.5 flex-shrink-0 text-[var(--gold)]" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜尋機型..."
              className="!text-sm"
            />
            <button
              onClick={() => { setOpen(false); setQuery(""); }}
              className="ml-2 flex-shrink-0 text-xs text-[var(--fg-muted)] hover:text-[var(--gold)]"
              aria-label="關閉"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {open && query.length >= 2 && (
        <div className="absolute right-0 z-30 mt-2 w-80 max-h-[60vh] overflow-y-auto rounded-lg border border-[var(--gold)] bg-[var(--bg-elevated)] shadow-2xl">
          {loading ? (
            <div className="p-4 text-center text-xs text-[var(--fg-muted)]">查詢中...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--fg-muted)]">找不到「{query}」</div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {results.map(r => (
                <Link
                  key={r.modelId}
                  href={`/quote/${r.brandSlug}/${r.modelSlug}`}
                  onClick={() => { setOpen(false); setQuery(""); }}
                  className="block p-3 transition hover:bg-[var(--bg-soft)]"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[var(--gold)]/15 px-2 py-0.5 text-[10px] text-[var(--gold)]">{r.brandName}</span>
                    <span className="text-sm font-medium text-[var(--fg)]">{r.modelName}</span>
                  </div>
                  {r.topItems.length > 0 && (
                    <div className="mt-1 text-[10px] text-[var(--fg-muted)]">
                      {r.topItems.slice(0, 2).map(it => `${it.name} $${it.price.toLocaleString()}`).join("．")}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

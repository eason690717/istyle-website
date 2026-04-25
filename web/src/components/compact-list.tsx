// 共用緊湊列表元件 — 手機版單頁不滾動 + 桌面版完整表格
// 使用情境：recycle 結果、quote 機型列表、admin 訂單等
import Link from "next/link";

export interface CompactListColumn<T> {
  key: string;
  label: string;
  // 桌面版顯示
  cell: (item: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  // 手機版隱藏（合併到 mobileSubLine）
  hideOnMobile?: boolean;
}

export interface CompactListProps<T> {
  items: T[];
  columns: CompactListColumn<T>[];
  // 手機版每行的標題、副標、價格、CTA
  mobileTitle: (item: T) => React.ReactNode;
  mobileSubLine?: (item: T) => React.ReactNode;
  mobilePrice?: (item: T) => React.ReactNode;
  mobileCta?: (item: T) => { href: string; label: string; external?: boolean };
  keyFn: (item: T) => string | number;
  emptyMessage?: React.ReactNode;
}

export function CompactList<T>({
  items,
  columns,
  mobileTitle,
  mobileSubLine,
  mobilePrice,
  mobileCta,
  keyFn,
  emptyMessage,
}: CompactListProps<T>) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-8 text-center text-sm text-[var(--fg-muted)]">
        {emptyMessage || "尚無資料"}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
      {/* === 手機版（< md）：緊湊行 === */}
      <ul className="divide-y divide-[var(--border-soft)] md:hidden">
        {items.map((item, idx) => {
          const cta = mobileCta?.(item);
          return (
            <li
              key={keyFn(item)}
              className={`flex items-center gap-3 px-3 py-3 transition ${
                idx % 2 === 0 ? "bg-[#141414]" : "bg-[#181818]"
              } hover:bg-[#241c12]`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium leading-tight text-[var(--fg-strong)]">
                  {mobileTitle(item)}
                </div>
                {mobileSubLine && (
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                    {mobileSubLine(item)}
                  </div>
                )}
              </div>
              <div className="flex flex-shrink-0 flex-col items-end gap-1">
                {mobilePrice && (
                  <div className="font-mono text-base font-semibold leading-none text-[var(--gold)]">
                    {mobilePrice(item)}
                  </div>
                )}
                {cta && (
                  cta.external ? (
                    <a
                      href={cta.href}
                      className="rounded-full bg-[var(--gold)]/15 px-2.5 py-0.5 text-[10px] text-[var(--gold)] transition hover:bg-[var(--gold)] hover:text-black"
                    >
                      {cta.label}
                    </a>
                  ) : (
                    <Link
                      href={cta.href}
                      className="rounded-full bg-[var(--gold)]/15 px-2.5 py-0.5 text-[10px] text-[var(--gold)] transition hover:bg-[var(--gold)] hover:text-black"
                    >
                      {cta.label}
                    </Link>
                  )
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* === 桌面版（>= md）：完整表格 === */}
      <table className="hidden min-w-full text-sm md:table">
        <thead>
          <tr className="bg-[#1f1810] text-[var(--gold)]">
            {columns.map(c => (
              <th
                key={c.key}
                className={`px-3 py-2.5 font-medium ${
                  c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"
                } ${c.className || ""}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr
              key={keyFn(item)}
              className={`group border-t border-[var(--border-soft)] transition ${
                idx % 2 === 0 ? "bg-[#141414]" : "bg-[#181818]"
              } hover:bg-[#241c12]`}
            >
              {columns.map(c => (
                <td
                  key={c.key}
                  className={`px-3 py-2.5 ${
                    c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"
                  } ${c.className || ""}`}
                >
                  {c.cell(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

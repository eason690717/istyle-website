"use client";
export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded-full border border-[var(--gold)]/40 px-4 py-2 text-sm text-[var(--gold)]">
      🖨 列印
    </button>
  );
}

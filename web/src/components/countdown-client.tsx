"use client";
import { useEffect, useState } from "react";

export function CountdownClient({ targetIso }: { targetIso: string }) {
  const [remain, setRemain] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    const target = new Date(targetIso).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setRemain({ d: 0, h: 0, m: 0, s: 0 }); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemain({ d, h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  if (!remain) return null;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    <span className="rounded-full border border-[var(--gold)]/30 bg-black/40 px-2 py-0.5 font-mono text-[10px] text-[var(--gold-bright)]">
      限時 {remain.d > 0 ? `${remain.d} 天 ` : ""}{pad(remain.h)}:{pad(remain.m)}:{pad(remain.s)}
    </span>
  );
}

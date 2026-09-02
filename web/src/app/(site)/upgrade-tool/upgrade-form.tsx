"use client";
import { useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/components/tracker";

interface ModelLite { id: number; slug: string; name: string; }
interface BrandLite { id: number; slug: string; name: string; models: ModelLite[]; }

const ISSUES = [
  { key: "screen", label: "螢幕破裂", costEstimate: 4500 },
  { key: "battery", label: "電池老化", costEstimate: 1500 },
  { key: "water", label: "進水", costEstimate: 6000 },
  { key: "charging", label: "充電孔故障", costEstimate: 1500 },
  { key: "camera", label: "鏡頭壞掉", costEstimate: 3500 },
  { key: "back", label: "背蓋玻璃裂", costEstimate: 3000 },
  { key: "none", label: "沒壞，只是想換新", costEstimate: 0 },
];

interface DecisionResult {
  recycleEstimate: number | null;
  repairEstimate: number;
  netCostIfRepair: number;        // 修了之後 0 開銷
  netCostIfTradeAndUpgrade: number; // 賣掉換新後實付
  recommendation: "REPAIR" | "TRADE_UPGRADE" | "NEUTRAL";
  reasonText: string;
}

export function UpgradeForm({ brands }: { brands: BrandLite[] }) {
  const [brandId, setBrandId] = useState<number | "">("");
  const [modelId, setModelId] = useState<number | "">("");
  const [issue, setIssue] = useState(ISSUES[0].key);
  const [budget, setBudget] = useState("25000");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DecisionResult | null>(null);

  const selectedBrand = brands.find(b => b.id === brandId);
  const selectedIssue = ISSUES.find(i => i.key === issue) || ISSUES[0];

  async function calculate(e: React.FormEvent) {
    e.preventDefault();
    if (!modelId) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/upgrade-tool/decide?modelId=${modelId}&issue=${issue}&budget=${budget}`);
      const data = await res.json();
      setResult(data);
      trackEvent("upgrade_tool_calculated", { modelId, issue, budget });
    } catch {
      alert("計算失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={calculate} className="mt-6 space-y-4 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
      <div>
        <label className="mb-1 block text-xs font-medium">您現在的手機品牌</label>
        <select
          value={brandId}
          onChange={(e) => { setBrandId(Number(e.target.value)); setModelId(""); }}
          required
          className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
        >
          <option value="">— 請選擇 —</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {selectedBrand && (
        <div>
          <label className="mb-1 block text-xs font-medium">機型</label>
          <select
            value={modelId}
            onChange={(e) => setModelId(Number(e.target.value))}
            required
            className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          >
            <option value="">— 請選擇 —</option>
            {selectedBrand.models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium">目前狀況</label>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {ISSUES.map(i => (
            <label
              key={i.key}
              className={`cursor-pointer rounded border p-2 text-center text-xs transition ${
                issue === i.key
                  ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]"
                  : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--gold-soft)]"
              }`}
            >
              <input type="radio" value={i.key} checked={issue === i.key} onChange={() => setIssue(i.key)} className="sr-only" />
              {i.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">換新預算 NT$</label>
        <input
          type="number"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          min="5000"
          step="1000"
          className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !modelId}
        className="btn-gold w-full rounded-full py-3 text-sm font-semibold disabled:opacity-50"
      >
        {loading ? "計算中..." : "🧠 幫我決定"}
      </button>

      {result && <ResultPanel result={result} issue={selectedIssue.label} budget={Number(budget)} />}
    </form>
  );
}

function ResultPanel({ result, issue, budget }: { result: DecisionResult; issue: string; budget: number }) {
  const fmt = (n: number) => `NT$ ${n.toLocaleString()}`;

  return (
    <div className="mt-6 space-y-3 rounded-xl border-2 border-[var(--gold)]/40 bg-black/30 p-5">
      <div className="text-center">
        <div className="text-xs text-[var(--fg-muted)]">建議</div>
        <div className="mt-1 font-serif text-2xl text-[var(--gold)]">
          {result.recommendation === "REPAIR" && "🔧 建議維修"}
          {result.recommendation === "TRADE_UPGRADE" && "🔄 建議換新"}
          {result.recommendation === "NEUTRAL" && "⚖️ 都可以，看你需求"}
        </div>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">{result.reasonText}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Card label="🔧 維修方案" cost={result.repairEstimate} sub="繼續用現在這支" highlight={result.recommendation === "REPAIR"} />
        <Card label="🔄 換新方案" cost={result.netCostIfTradeAndUpgrade} sub={`回收 ${result.recycleEstimate ? fmt(result.recycleEstimate) : "未知"} + 預算 ${fmt(budget)}`} highlight={result.recommendation === "TRADE_UPGRADE"} />
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Link href="/quote" className="flex-1 rounded-full bg-[var(--gold)] py-2.5 text-center text-xs font-semibold text-black">
          🔧 查精準維修報價
        </Link>
        <Link href="/recycle" className="flex-1 rounded-full border border-[var(--gold)]/40 py-2.5 text-center text-xs text-[var(--gold)]">
          📤 回收估價
        </Link>
      </div>
    </div>
  );
}

function Card({ label, cost, sub, highlight }: { label: string; cost: number; sub: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 text-center ${highlight ? "border-[var(--gold)] bg-[var(--gold)]/10" : "border-[var(--border)] bg-[var(--bg-elevated)]"}`}>
      <div className="text-[10px] text-[var(--fg-muted)]">{label}</div>
      <div className="mt-1 font-serif text-xl text-[var(--gold)]">NT$ {cost.toLocaleString()}</div>
      <div className="mt-1 text-[10px] text-[var(--fg-muted)]">{sub}</div>
    </div>
  );
}

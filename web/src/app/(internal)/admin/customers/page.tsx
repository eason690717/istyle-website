// CRM lite — 從 Sale + PaymentLink + RepairTicket 聚合客戶資料（用 phone 當 key）
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface CustomerAggregated {
  phone: string;
  name: string;
  posCount: number;
  posSpend: number;
  onlineCount: number;
  onlineSpend: number;
  repairCount: number;
  totalSpend: number;
  lastSeen: Date;
  email?: string;
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || "";

  const [sales, payLinks, repairs] = await Promise.all([
    prisma.sale.findMany({
      where: { paymentStatus: "PAID", customerPhone: { not: null } },
      select: { customerPhone: true, customerName: true, total: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.paymentLink.findMany({
      where: { status: "PAID", customerPhone: { not: null } },
      select: { customerPhone: true, customerName: true, customerEmail: true, amount: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.repairTicket.findMany({
      where: { status: { not: "CANCELLED" } },
      select: { phoneLast4: true, customerName: true, finalCost: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // 聚合（phone 當 key）
  const map = new Map<string, CustomerAggregated>();
  function upsert(phone: string, name: string, opts: { spend?: number; channel?: "POS" | "ONLINE" | "REPAIR"; createdAt: Date; email?: string }) {
    const key = phone.replace(/\D/g, "");
    if (!key) return;
    let r = map.get(key);
    if (!r) {
      r = { phone: key, name: name || "—", posCount: 0, posSpend: 0, onlineCount: 0, onlineSpend: 0, repairCount: 0, totalSpend: 0, lastSeen: opts.createdAt };
      map.set(key, r);
    }
    if (opts.channel === "POS") { r.posCount += 1; r.posSpend += opts.spend || 0; }
    if (opts.channel === "ONLINE") { r.onlineCount += 1; r.onlineSpend += opts.spend || 0; }
    if (opts.channel === "REPAIR") { r.repairCount += 1; r.totalSpend += opts.spend || 0; }
    r.totalSpend = r.posSpend + r.onlineSpend + (r.repairCount > 0 ? (r.totalSpend - r.posSpend - r.onlineSpend) : 0);
    if (opts.createdAt > r.lastSeen) { r.lastSeen = opts.createdAt; r.name = name || r.name; }
    if (opts.email) r.email = opts.email;
  }

  sales.forEach(s => upsert(s.customerPhone!, s.customerName || "", { spend: s.total, channel: "POS", createdAt: s.createdAt }));
  payLinks.forEach(p => upsert(p.customerPhone!, p.customerName || "", { spend: p.amount, channel: "ONLINE", createdAt: p.createdAt, email: p.customerEmail || undefined }));
  // RepairTicket only has last 4 — skip aggregation but include in count
  repairs.forEach(r => {
    // 找已有的 customer 包含此末 4 碼
    for (const [k, v] of map.entries()) {
      if (k.endsWith(r.phoneLast4)) {
        v.repairCount += 1;
        if (r.finalCost) v.totalSpend += r.finalCost;
        break;
      }
    }
  });

  // 過濾 + 排序
  let list = Array.from(map.values());
  if (q) {
    const ql = q.toLowerCase();
    list = list.filter(c => c.phone.includes(q) || c.name.toLowerCase().includes(ql) || (c.email || "").toLowerCase().includes(ql));
  }
  list.sort((a, b) => b.totalSpend - a.totalSpend);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-[var(--gold)]">👤 客戶資料庫</h1>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">從 POS + 線上 + 維修單聚合，用手機號碼為唯一 key</p>
      </div>

      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="搜尋姓名 / 電話 / email" className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm" />
        <button className="btn-gold rounded-full px-4 py-2 text-sm">搜尋</button>
      </form>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Card label="總客戶數" value={list.length.toString()} />
        <Card label="總消費" value={`$${list.reduce((s, c) => s + c.totalSpend, 0).toLocaleString()}`} />
        <Card label="平均客單" value={list.length > 0 ? `$${Math.round(list.reduce((s, c) => s + c.totalSpend, 0) / list.length).toLocaleString()}` : "—"} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-elevated)] text-xs text-[var(--fg-muted)]">
            <tr>
              <th className="p-3 text-left font-normal">客戶</th>
              <th className="p-3 text-left font-normal">電話</th>
              <th className="p-3 text-right font-normal">店內</th>
              <th className="p-3 text-right font-normal">線上</th>
              <th className="p-3 text-right font-normal">維修</th>
              <th className="p-3 text-right font-normal">總消費</th>
              <th className="p-3 text-left font-normal">最後光顧</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, 200).map(c => (
              <tr key={c.phone} className="border-t border-[var(--border)]">
                <td className="p-3">
                  {c.name}
                  {c.email && <div className="text-[10px] text-[var(--fg-muted)]">{c.email}</div>}
                </td>
                <td className="p-3 font-mono text-xs">{c.phone}</td>
                <td className="p-3 text-right text-xs">{c.posCount > 0 ? `${c.posCount} / $${c.posSpend.toLocaleString()}` : "—"}</td>
                <td className="p-3 text-right text-xs">{c.onlineCount > 0 ? `${c.onlineCount} / $${c.onlineSpend.toLocaleString()}` : "—"}</td>
                <td className="p-3 text-right text-xs">{c.repairCount}</td>
                <td className="p-3 text-right font-mono">${c.totalSpend.toLocaleString()}</td>
                <td className="p-3 text-xs text-[var(--fg-muted)]">{c.lastSeen.toLocaleString("zh-TW", { hour12: false, dateStyle: "short" })}</td>
                <td className="p-3"><a href={`tel:${c.phone}`} className="text-xs text-[var(--gold)] hover:underline">📞</a></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={8} className="p-12 text-center text-sm text-[var(--fg-muted)]">{q ? "找不到符合的客戶" : "還沒有客戶資料"}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
      <div className="text-xs text-[var(--fg-muted)]">{label}</div>
      <div className="mt-1 font-serif text-2xl text-[var(--gold)]">{value}</div>
    </div>
  );
}

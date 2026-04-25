import { prisma } from "@/lib/prisma";
import { createPaymentLink } from "./actions";
import { SITE } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export default async function AdminPaymentLinksPage() {
  const links = await prisma.paymentLink.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
  }).catch(() => []);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-[var(--gold)]">付款連結產生器</h1>
      <p className="text-sm text-[var(--fg-muted)]">
        為客戶產生一次性付款連結，傳到 LINE 給客戶完成線上付款。付款後自動開立電子發票。
      </p>

      <form
        action={createPaymentLink}
        className="rounded-lg border border-[var(--gold)] bg-[var(--bg-elevated)] p-5 space-y-4"
      >
        <h2 className="font-serif text-lg text-[var(--gold)]">建立新付款連結</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="商品 / 服務名稱" name="itemName" required placeholder="例：iPhone 15 Pro 螢幕維修" />
          <Field label="金額 (NT$)" name="amount" type="number" required min="1" max="200000" placeholder="9300" />
          <Field label="客戶姓名" name="customerName" placeholder="王先生" />
          <Field label="客戶電話" name="customerPhone" placeholder="0912345678" />
          <Field label="Email（自動寄發票）" name="customerEmail" type="email" placeholder="customer@example.com" />
          <Field label="連結有效（小時）" name="expiresHours" type="number" defaultValue="48" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--fg)]">備註</label>
          <textarea name="description" rows={2} className={inputCls + " resize-y"} placeholder="維修內容、保固說明等" />
        </div>
        <button type="submit" className="btn-gold rounded-full px-6 py-2 text-sm">
          產生付款連結
        </button>
      </form>

      <section>
        <h2 className="mb-3 font-serif text-lg text-[var(--gold)]">最近付款連結</h2>
        {links.length === 0 ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-8 text-center text-sm text-[var(--fg-muted)]">
            尚無付款連結
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--bg-soft)] text-left text-xs text-[var(--gold)]">
                <tr>
                  <th className="px-3 py-2">時間</th>
                  <th className="px-3 py-2">客戶</th>
                  <th className="px-3 py-2">商品</th>
                  <th className="px-3 py-2 text-right">金額</th>
                  <th className="px-3 py-2">狀態</th>
                  <th className="px-3 py-2">連結</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {links.map((l, i) => {
                  const url = `${SITE.url}/pay/${l.token}`;
                  return (
                    <tr key={l.id} className={i % 2 === 0 ? "bg-[#141414]" : "bg-[#181818]"}>
                      <td className="px-3 py-2 text-xs">{new Date(l.createdAt).toLocaleString("zh-TW")}</td>
                      <td className="px-3 py-2 text-sm">{l.customerName || "—"}<br /><span className="text-xs text-[var(--fg-muted)]">{l.customerPhone || ""}</span></td>
                      <td className="px-3 py-2 text-sm max-w-xs">{l.itemName}</td>
                      <td className="px-3 py-2 text-right font-mono text-[var(--gold)]">NT$ {l.amount.toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={l.status} />
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {l.status === "PENDING" ? (
                          <CopyLink url={url} />
                        ) : l.status === "PAID" ? (
                          <span className="text-green-400 text-xs">{l.invoiceNumber || "已付款"}</span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const inputCls = "w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--fg)] focus:border-[var(--gold)] focus:outline-none";

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-[var(--fg)]">{label}{props.required && <span className="text-[var(--gold)]">*</span>}</label>
      <input {...rest} className={inputCls} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING: { label: "待付款", cls: "bg-yellow-500/20 text-yellow-300" },
    PAID: { label: "已付款", cls: "bg-green-500/20 text-green-300" },
    EXPIRED: { label: "已過期", cls: "bg-zinc-500/20 text-zinc-300" },
    CANCELLED: { label: "取消", cls: "bg-red-500/20 text-red-300" },
  };
  const s = map[status] || { label: status, cls: "" };
  return <span className={`rounded px-2 py-0.5 text-xs ${s.cls}`}>{s.label}</span>;
}

function CopyLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[var(--gold)] hover:text-[var(--gold-bright)] text-xs underline"
    >
      開啟付款頁
    </a>
  );
}

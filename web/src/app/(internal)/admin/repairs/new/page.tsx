import Link from "next/link";
import { createTicket } from "../actions";

export default function NewRepairPage() {
  async function action(formData: FormData) {
    "use server";
    await createTicket({
      customerName: String(formData.get("customerName") || ""),
      phoneLast4: String(formData.get("phoneLast4") || ""),
      deviceModel: String(formData.get("deviceModel") || ""),
      issueDescription: String(formData.get("issueDescription") || ""),
      estimatedCost: formData.get("estimatedCost") ? Number(formData.get("estimatedCost")) : undefined,
    });
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/repairs" className="text-xs text-[var(--fg-muted)] hover:text-[var(--gold)]">← 回維修單列表</Link>
        <h1 className="mt-2 font-serif text-2xl text-[var(--gold)]">新增維修單</h1>
      </div>
      <form action={action} className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
        <Field label="客戶姓名" name="customerName" required />
        <Field label="手機末 4 碼" name="phoneLast4" required pattern="[0-9]{4}" maxLength={4} placeholder="5337" hint="客戶查詢時的密碼，只存末 4 碼保護隱私" />
        <Field label="裝置型號" name="deviceModel" required placeholder="iPhone 15 Pro" />
        <div>
          <label className="mb-1 block text-xs font-medium">問題陳述</label>
          <textarea
            name="issueDescription"
            required
            rows={3}
            placeholder="客人陳述：螢幕摔到碎裂、觸控還能用..."
            className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none"
          />
        </div>
        <Field label="預估費用 NT$（可空）" name="estimatedCost" type="number" min="0" placeholder="3500" />
        <button type="submit" className="btn-gold w-full rounded-full py-3 text-sm font-semibold">建立維修單</button>
      </form>
    </div>
  );
}

function Field({ label, name, hint, ...rest }: {
  label: string; name: string; hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium">{label}</label>
      <input
        name={name}
        {...rest}
        className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none"
      />
      {hint && <p className="mt-1 text-[10px] text-[var(--fg-muted)]">{hint}</p>}
    </div>
  );
}

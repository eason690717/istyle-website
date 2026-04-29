import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const setting = await prisma.siteSetting.findUnique({ where: { id: 1 } }).catch(() => null);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-[var(--gold)]">站台設定</h1>

      {/* 子設定入口 */}
      <div className="grid gap-3 md:grid-cols-2">
        <Link href="/admin/settings/printer" className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4 hover:border-[var(--gold)]">
          <div className="font-serif text-base text-[var(--gold)]">🖨 收據印表機</div>
          <div className="mt-1 text-xs text-[var(--fg-muted)]">推薦機型 + 設定步驟 + 紙本發票流程</div>
        </Link>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-5 text-sm">
        <h2 className="font-serif text-lg text-[var(--gold)]">公司資訊</h2>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <DT label="名稱" value={setting?.companyName || SITE.name} />
          <DT label="法人" value={setting?.legalName || SITE.legalName} />
          <DT label="統編" value={setting?.taxId || ""} />
          <DT label="電話" value={setting?.phone || SITE.phone} />
          <DT label="LINE" value={setting?.lineId || SITE.lineId} />
          <DT label="Email" value={setting?.email || SITE.email} />
          <DT label="地址" value={`${setting?.city || SITE.address.city} ${setting?.district || SITE.address.district}`} />
        </dl>
        <p className="mt-4 text-xs text-[var(--fg-muted)]">
          編輯介面開發中。目前如需修改，請改 <code>src/lib/site-config.ts</code> 並重新部署。
        </p>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-5 text-sm">
        <h2 className="font-serif text-lg text-[var(--gold)]">售價公式</h2>
        <p className="mt-2 text-[var(--fg)]">
          標準版加成倍率：<span className="font-mono text-[var(--gold)]">{setting?.cerphoneMarkupRate ?? 1.15}</span>
        </p>
        <p className="mt-1 text-[var(--fg)]">
          原廠版加成倍率：<span className="font-mono text-[var(--gold)]">{setting?.oemMarkupRate ?? 1.5}</span>
        </p>
        <p className="mt-1 text-[var(--fg)]">
          進位單位：<span className="font-mono text-[var(--gold)]">{setting?.priceRoundingUnit ?? 100}</span>
        </p>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-5 text-sm">
        <h2 className="font-serif text-lg text-[var(--gold)]">環境變數</h2>
        <p className="mt-2 text-xs text-[var(--fg-muted)]">這些設定在 Vercel 環境變數中設定，後台僅顯示是否已設置。</p>
        <ul className="mt-3 space-y-1 text-xs">
          <Var name="LINE_CHANNEL_ACCESS_TOKEN" set={!!process.env.LINE_CHANNEL_ACCESS_TOKEN} desc="LINE 通知（Messaging API Channel Token）" />
          <Var name="LINE_OWNER_USER_ID" set={!!process.env.LINE_OWNER_USER_ID} desc="老闆的 LINE User ID" />
          <Var name="CRON_SECRET" set={!!process.env.CRON_SECRET} desc="保護 cron API 端點" />
          <Var name="ECPAY_MERCHANT_ID" set={!!process.env.ECPAY_MERCHANT_ID} desc="綠界商店代號" />
          <Var name="ECPAY_HASH_KEY" set={!!process.env.ECPAY_HASH_KEY} desc="綠界 HashKey" />
          <Var name="ECPAY_HASH_IV" set={!!process.env.ECPAY_HASH_IV} desc="綠界 HashIV" />
          <Var name="ADMIN_USER" set={!!process.env.ADMIN_USER} desc="後台帳號（預設 admin@i-style.store）" />
          <Var name="ADMIN_PASSWORD" set={!!process.env.ADMIN_PASSWORD} desc="後台密碼（預設 istyle2026）" />
        </ul>
      </div>
    </div>
  );
}

function DT({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--fg-muted)]">{label}</dt>
      <dd className="text-[var(--fg)]">{value}</dd>
    </div>
  );
}

function Var({ name, set, desc }: { name: string; set: boolean; desc: string }) {
  return (
    <li className="flex items-start justify-between gap-3">
      <div>
        <code className="font-mono text-[var(--fg)]">{name}</code>
        <div className="text-[10px] text-[var(--fg-muted)]">{desc}</div>
      </div>
      <span className={set ? "text-green-400" : "text-[var(--fg-muted)]"}>
        {set ? "✓ 已設定" : "未設定"}
      </span>
    </li>
  );
}

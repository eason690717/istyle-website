import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site-config";
import { CheckoutForm } from "./checkout-form";
import type { Metadata } from "next";

type Params = { token: string };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `付款 — ${SITE.name}`,
  robots: { index: false, follow: false },
};

export default async function PayPage({ params }: { params: Promise<Params> }) {
  const { token } = await params;
  const link = await prisma.paymentLink.findUnique({ where: { token } }).catch(() => null);
  if (!link) notFound();

  if (link.status === "PAID") {
    return (
      <PaidView link={link} />
    );
  }

  if (link.status === "EXPIRED" || (link.expiresAt && link.expiresAt < new Date())) {
    return (
      <CenteredCard title="連結已過期" tone="muted">
        <p>此付款連結已過期，請聯絡 i時代 重新產生。</p>
        <a href={SITE.lineAddUrl} className="btn-gold mt-5 inline-block rounded-full px-5 py-2 text-sm">LINE 聯絡</a>
      </CenteredCard>
    );
  }

  if (link.status === "CANCELLED") {
    return (
      <CenteredCard title="連結已取消" tone="muted">
        <p>此付款連結已被取消。如有疑問請聯絡 i時代。</p>
      </CenteredCard>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="text-center">
        <h1 className="font-serif text-2xl text-[var(--gold)] md:text-3xl">付款</h1>
        <p className="mt-2 text-xs text-[var(--fg-muted)]">{SITE.name}．安全 SSL 加密</p>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-[var(--gold)] bg-[var(--bg-elevated)]">
        <div className="bg-gradient-to-r from-[#1a1410] to-[#241b13] px-5 py-4">
          <div className="text-xs text-[var(--gold-soft)]">應付金額</div>
          <div className="font-serif text-3xl text-[var(--gold)]">NT$ {link.amount.toLocaleString()}</div>
        </div>
        <div className="space-y-3 px-5 py-4 text-sm">
          <Row label="商品 / 服務" value={link.itemName} />
          {link.customerName && <Row label="收款對象" value={link.customerName} />}
          {link.description && <Row label="說明" value={link.description} multiline />}
        </div>
      </div>

      <div className="mt-6">
        <CheckoutForm token={link.token} defaultEmail={link.customerEmail || ""} />
      </div>

      <p className="mt-6 text-center text-xs text-[var(--fg-muted)]">
        付款由綠界 ECPay 處理．付款成功後系統自動寄送電子發票
      </p>
    </div>
  );
}

function PaidView({ link }: { link: { itemName: string; amount: number; invoiceNumber: string | null } }) {
  return (
    <CenteredCard title="✓ 付款已完成" tone="success">
      <p className="text-sm text-[var(--fg)]">{link.itemName}</p>
      <p className="mt-2 font-serif text-2xl text-[var(--gold)]">NT$ {link.amount.toLocaleString()}</p>
      {link.invoiceNumber && (
        <p className="mt-3 text-xs text-[var(--fg-muted)]">電子發票：{link.invoiceNumber}</p>
      )}
      <p className="mt-5 text-xs text-[var(--fg-muted)]">感謝您的支付，i時代將盡快聯絡您安排服務。</p>
    </CenteredCard>
  );
}

function Row({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-[var(--fg-muted)]">{label}</span>
      <span className={`text-right text-[var(--fg)] ${multiline ? "whitespace-pre-line" : ""}`}>{value}</span>
    </div>
  );
}

function CenteredCard({
  title, tone, children,
}: {
  title: string; tone: "success" | "muted"; children: React.ReactNode;
}) {
  const border = tone === "success" ? "border-[var(--gold)]" : "border-[var(--border)]";
  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <div className={`rounded-xl border ${border} bg-[var(--bg-elevated)] p-8 text-center`}>
        <h1 className="font-serif text-2xl text-[var(--gold)]">{title}</h1>
        <div className="mt-4 text-sm text-[var(--fg)]">{children}</div>
      </div>
    </div>
  );
}

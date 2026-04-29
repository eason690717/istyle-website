import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { POS_COOKIE, verifyStaffSession } from "@/lib/pos-auth";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site-config";
import { ReceiptActions } from "./actions-client";

export const dynamic = "force-dynamic";

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "現金", JKOPAY: "街口支付", LINEPAY: "LINE Pay", CARD: "信用卡", TRANSFER: "轉帳",
};

export default async function SaleReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cs = await cookies();
  const staff = await verifyStaffSession(cs.get(POS_COOKIE)?.value);
  if (!staff) redirect("/pos/login");

  const sale = await prisma.sale.findUnique({
    where: { id: Number(id) },
    include: { items: true, staff: true },
  });
  if (!sale) return notFound();

  const fmt = (n: number) => n.toLocaleString();
  const date = new Date(sale.createdAt).toLocaleString("zh-TW", { hour12: false });

  return (
    <div className="min-h-screen bg-[#0a0706] py-8 print:bg-white">
      {/* 操作列（列印時隱藏） */}
      <div className="mx-auto mb-4 flex max-w-md justify-between print:hidden">
        <Link href="/pos" className="rounded-full border border-[var(--border)] px-4 py-2 text-xs">← 回 POS</Link>
        <ReceiptActions saleId={sale.id} canVoid={staff.role === "MANAGER" && sale.paymentStatus !== "VOID"} />
      </div>

      {/* 收據主體 — 模擬 80mm 熱感紙寬度 */}
      <div id="receipt" className="mx-auto max-w-md rounded-lg bg-white p-6 text-black shadow-xl print:max-w-none print:rounded-none print:shadow-none">
        <div className="text-center">
          <div className="font-serif text-xl font-bold">{SITE.name}</div>
          <div className="text-xs text-gray-600">{SITE.legalName}</div>
          <div className="text-xs text-gray-600">{SITE.address.street}</div>
          <div className="text-xs text-gray-600">電話 {SITE.phone}</div>
        </div>

        <div className="mt-3 border-t border-dashed border-gray-400 pt-3">
          {sale.paymentStatus === "VOID" && (
            <div className="mb-2 rounded border-2 border-red-500 bg-red-50 p-2 text-center text-sm font-bold text-red-600">
              ⚠️ 已作廢
              {sale.voidReason && <div className="mt-0.5 text-xs font-normal">原因：{sale.voidReason}</div>}
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span>單號</span><span className="font-mono">{sale.saleNumber}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>時間</span><span>{date}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>店員</span><span>{sale.staff.name}（{sale.staff.code}）</span>
          </div>
          {sale.customerName && (
            <div className="flex justify-between text-xs text-gray-600">
              <span>客戶</span><span>{sale.customerName} {sale.customerPhone}</span>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="mt-3 border-t border-dashed border-gray-400 pt-3">
          {sale.items.map(i => (
            <div key={i.id} className="mb-2 text-sm">
              <div className="text-gray-900">{i.name}</div>
              {i.serial && <div className="text-[10px] text-gray-600">IMEI: <span className="font-mono">{i.serial}</span></div>}
              <div className="flex justify-between text-xs text-gray-600">
                <span>${fmt(i.unitPrice)} × {i.qty}</span>
                <span className="font-mono">${fmt(i.lineTotal)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-3 border-t border-dashed border-gray-400 pt-3 text-sm">
          <div className="flex justify-between">
            <span>小計</span><span className="font-mono">${fmt(sale.subtotal)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>折扣</span><span className="font-mono">-${fmt(sale.discount)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-gray-300 pt-1 text-lg font-bold">
            <span>總計</span><span className="font-mono">${fmt(sale.total)}</span>
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-600">
            <span>付款方式</span><span>{PAYMENT_LABEL[sale.paymentMethod] || sale.paymentMethod}</span>
          </div>
          {sale.invoiceNumber && (
            <>
              <div className="mt-1 flex justify-between text-xs text-gray-600">
                <span>電子發票</span><span className="font-mono">{sale.invoiceNumber}</span>
              </div>
              {sale.invoiceIssuedAt && (
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>開立時間</span><span>{new Date(sale.invoiceIssuedAt).toLocaleString("zh-TW", { hour12: false })}</span>
                </div>
              )}
              <div className="mt-2 print:hidden">
                <a
                  href={`https://www.einvoice.nat.gov.tw/portal/btc/qry/InvNoQry?Apo=${sale.invoiceNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[10px] text-blue-600 underline"
                >
                  → 至財政部電子發票整合平台查驗
                </a>
              </div>
            </>
          )}
        </div>

        {sale.notes && (
          <div className="mt-3 border-t border-dashed border-gray-400 pt-2 text-xs text-gray-600">
            備註：{sale.notes}
          </div>
        )}

        <div className="mt-4 border-t border-dashed border-gray-400 pt-3 text-center text-[10px] text-gray-500">
          <p>謝謝光臨！</p>
          <p>14 年技術經驗・透明報價・當日完工</p>
          <p className="mt-2">{SITE.url}</p>
        </div>
      </div>
    </div>
  );
}

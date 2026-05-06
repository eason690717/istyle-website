// 診斷 ECPay 設定 — 確認 runtime 真的讀到 prod env
// 用 ?key=... 簡單保護，避免曝露 hash key tail
import { NextRequest, NextResponse } from "next/server";
import { ECPAY, getEcpayAioUrl, getEcpayInvoiceUrl } from "@/lib/ecpay";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (url.searchParams.get("key") !== "diag-istyle-2026") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    rawEnv: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      ECPAY_PROD: process.env.ECPAY_PROD,
      ECPAY_INVOICE_PROD: process.env.ECPAY_INVOICE_PROD,
      ECPAY_FORCE_TEST: process.env.ECPAY_FORCE_TEST,
      ECPAY_MERCHANT_ID: process.env.ECPAY_MERCHANT_ID,
      ECPAY_HASH_KEY_tail: (process.env.ECPAY_HASH_KEY || "").slice(-4),
    },
    resolved: {
      merchantId: ECPAY.merchantId,
      hashKeyTail: ECPAY.hashKey.slice(-4),
      hashIvTail: ECPAY.hashIv.slice(-3),
      aioUrl: getEcpayAioUrl(),
      invoiceUrl: getEcpayInvoiceUrl(),
      isUsingTestMerchant: ECPAY.merchantId === "3002607",
    },
    ts: new Date().toISOString(),
  });
}

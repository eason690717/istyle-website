// 綠界 AIO 付款 server callback
// ECPay POST URL-encoded form data；驗證 CheckMacValue → 更新 PaymentLink → 開立發票
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ECPAY, verifyCheckMacValue } from "@/lib/ecpay";
import { notifyOwner } from "@/lib/notify";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const text = await req.text();
  const params = Object.fromEntries(new URLSearchParams(text)) as Record<string, string>;

  // 1. 驗證 CheckMacValue（防偽造）
  if (!verifyCheckMacValue(params, ECPAY.hashKey, ECPAY.hashIv)) {
    console.error("[ecpay/notify] CheckMacValue 驗證失敗", params);
    return new Response("0|CheckMacValue Invalid", { status: 200 });
  }

  // 2. 取得交易資訊
  const merchantTradeNo = params.MerchantTradeNo;
  const rtnCode = params.RtnCode;
  const tradeNo = params.TradeNo;
  const paymentType = params.PaymentType;
  const tradeAmt = parseInt(params.TradeAmt || "0");
  const customField1 = params.CustomField1; // 我們塞的 link token

  if (rtnCode !== "1") {
    console.warn(`[ecpay/notify] 付款未成功 RtnCode=${rtnCode}, MerchantTradeNo=${merchantTradeNo}`);
    return new Response("1|OK", { status: 200 });
  }

  // 3. 更新 PaymentLink
  const link = await prisma.paymentLink.findFirst({
    where: { ecpayMerchantTradeNo: merchantTradeNo },
  }).catch(() => null);

  if (!link) {
    console.error(`[ecpay/notify] 找不到 PaymentLink for ${merchantTradeNo}`);
    return new Response("1|OK", { status: 200 });
  }

  if (link.status === "PAID") {
    return new Response("1|OK", { status: 200 });  // idempotent
  }

  await prisma.paymentLink.update({
    where: { id: link.id },
    data: {
      status: "PAID",
      ecpayTradeNo: tradeNo,
      paymentMethod: paymentType,
      paidAt: new Date(),
    },
  });

  // 4. 通知老闆
  await notifyOwner([
    "💰 收到付款",
    `項目：${link.itemName}`,
    `金額：NT$ ${tradeAmt.toLocaleString()}`,
    `客戶：${link.customerName || "—"} ${link.customerPhone || ""}`,
    `付款方式：${paymentType}`,
    `綠界交易號：${tradeNo}`,
  ].join("\n")).catch(console.error);

  // 5. TODO：呼叫綠界發票 API 開立電子發票
  // (需要綠界 invoice merchant 認證才能開，先記錄狀態)

  return new Response("1|OK", { status: 200 });
}

export async function GET() {
  return new Response("ECPay notify endpoint (POST only)", { status: 200 });
}

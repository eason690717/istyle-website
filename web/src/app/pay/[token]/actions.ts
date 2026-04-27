"use server";
import { prisma } from "@/lib/prisma";
import { ECPAY_AIO_URL, buildAioPaymentForm, generateMerchantTradeNo } from "@/lib/ecpay";
import { SITE } from "@/lib/site-config";

interface InitiatePaymentArgs {
  token: string;
  email: string;
  paymentType: "Credit" | "ATM" | "CVS" | "ALL";
}

export async function initiatePayment(args: InitiatePaymentArgs) {
  const link = await prisma.paymentLink.findUnique({ where: { token: args.token } }).catch(() => null);
  if (!link) return { ok: false, error: "找不到付款連結" };
  if (link.status === "PAID") return { ok: false, error: "已完成付款" };
  if (link.status === "EXPIRED" || (link.expiresAt && link.expiresAt < new Date())) {
    return { ok: false, error: "連結已過期" };
  }

  const merchantTradeNo = generateMerchantTradeNo("IS");

  // 更新 link：記錄 email + ecpay tradeno
  await prisma.paymentLink.update({
    where: { id: link.id },
    data: {
      customerEmail: args.email || link.customerEmail,
      ecpayMerchantTradeNo: merchantTradeNo,
    },
  });

  // 🔬 ECPAY_TEST_SIMPLE=1 時用純 ASCII，隔離特殊字元問題（測試完拔掉）
  const useSimple = process.env.ECPAY_TEST_SIMPLE?.trim() === "1";
  const formFields = buildAioPaymentForm({
    merchantTradeNo,
    totalAmount: link.amount,
    tradeDesc: useSimple ? "TestPayment" : `i時代 - ${link.itemName}`.slice(0, 200),
    itemName: useSimple ? "TestItem" : link.itemName,
    returnUrl: `${SITE.url}/api/ecpay/notify`,
    clientBackUrl: `${SITE.url}/pay/${link.token}`,
    paymentType: args.paymentType,
    customField1: link.token,
  });

  return {
    ok: true,
    formAction: ECPAY_AIO_URL,
    formFields,
  };
}

"use server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyOwner } from "@/lib/notify";
import crypto from "node:crypto";

const Schema = z.object({
  name: z.string().min(1).max(50),
  phone: z.string().regex(/^0\d{8,9}$/),
  email: z.string().email().or(z.literal("")).optional(),
  shipping: z.enum(["IN_STORE", "CVS_711", "CVS_FAMI", "CVS_HILIFE", "SF", "LALA"]),
  shippingFee: z.number().int().min(0).max(500),
  note: z.string().max(500).optional(),
  items: z.array(z.object({
    modelName: z.string(),
    itemName: z.string(),
    tierLabel: z.string(),
    unitPrice: z.number().int().positive(),
    qty: z.number().int().positive().max(99),
  })).min(1).max(50),
  subtotal: z.number().int().positive(),
  total: z.number().int().positive(),
});

const SHIPPING_LABEL: Record<string, string> = {
  IN_STORE: "門市自取（板橋江子翠）",
  CVS_711: "7-11 賣貨便取貨付款",
  CVS_FAMI: "全家 賣貨便取貨付款",
  CVS_HILIFE: "萊爾富 取貨付款",
  SF: "順豐速運（手動處理）",
  LALA: "拉拉快遞（手動處理）",
};

function genToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

export async function createCheckoutPaymentLink(input: z.infer<typeof Schema>) {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "表單驗證失敗：" + parsed.error.issues[0]?.message };
  }
  const data = parsed.data;

  // 驗算金額（防竄改）
  const expectedSubtotal = data.items.reduce((s, x) => s + x.unitPrice * x.qty, 0);
  if (expectedSubtotal !== data.subtotal) {
    return { ok: false, error: "金額驗證失敗" };
  }
  if (data.subtotal + data.shippingFee !== data.total) {
    return { ok: false, error: "總額驗算失敗" };
  }

  // 組合 itemName（綠界限長度，超過截斷）
  const itemName = data.items
    .map(it => `${it.modelName} ${it.itemName}(${it.tierLabel}) x${it.qty}`)
    .join("#")
    .slice(0, 380);

  const description = [
    `客戶：${data.name} ${data.phone}`,
    `配送：${SHIPPING_LABEL[data.shipping]}`,
    data.note ? `備註：${data.note}` : "",
  ].filter(Boolean).join(" / ");

  try {
    const token = genToken();
    const link = await prisma.paymentLink.create({
      data: {
        token,
        amount: data.total,
        itemName: itemName || "i時代維修服務",
        description,
        customerName: data.name,
        customerPhone: data.phone,
        customerEmail: data.email || null,
        status: "PENDING",
      },
    });

    notifyOwner([
      "🛒 新訂單建立",
      `客戶：${data.name} ${data.phone}`,
      `配送：${SHIPPING_LABEL[data.shipping]}`,
      `金額：NT$ ${data.total.toLocaleString()}`,
      `項目：${data.items.length} 項`,
      `付款連結：https://www.i-style.store/pay/${token}`,
    ].join("\n")).catch(console.error);

    return { ok: true, payUrl: `/pay/${link.token}` };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "系統忙碌中，請改用 LINE 詢問" };
  }
}

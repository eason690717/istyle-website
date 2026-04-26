// 綠界 ECPay 整合
// 文件：https://developers.ecpay.com.tw/
// 三大模組：AIO（金流）、E-Invoice（發票）、Logistics（物流）
import { createHash } from "node:crypto";

// 金流與發票獨立切換（金流先正式上線，發票等申請通過再切）
const IS_PROD_PAYMENT = process.env.NODE_ENV === "production" && !!process.env.ECPAY_PROD;
const IS_PROD_INVOICE = process.env.NODE_ENV === "production" && !!process.env.ECPAY_INVOICE_PROD;

// 測試帳號（綠界提供）— 可直接用做 sandbox
const TEST_PAYMENT = {
  merchantId: "3002607",
  hashKey: "pwFHCqoQZGmho4w6",
  hashIv: "EkRm7iFT261dpevs",
};
const TEST_INVOICE = {
  invoiceMerchantId: "2000132",
  invoiceHashKey: "ejCk326UnaZWKisg",
  invoiceHashIv: "q9jcZX8Ib9LM8wYk",
};

const PROD_PAYMENT = {
  merchantId: process.env.ECPAY_MERCHANT_ID || "",
  hashKey: process.env.ECPAY_HASH_KEY || "",
  hashIv: process.env.ECPAY_HASH_IV || "",
};
const PROD_INVOICE = {
  invoiceMerchantId: process.env.ECPAY_INVOICE_MERCHANT_ID || "",
  invoiceHashKey: process.env.ECPAY_INVOICE_HASH_KEY || "",
  invoiceHashIv: process.env.ECPAY_INVOICE_HASH_IV || "",
};

export const ECPAY = {
  ...(IS_PROD_PAYMENT ? PROD_PAYMENT : TEST_PAYMENT),
  ...(IS_PROD_INVOICE ? PROD_INVOICE : TEST_INVOICE),
};

export const ECPAY_AIO_URL = IS_PROD_PAYMENT
  ? "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5"
  : "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5";

export const ECPAY_INVOICE_URL = IS_PROD_INVOICE
  ? "https://einvoice.ecpay.com.tw/B2CInvoice/Issue"
  : "https://einvoice-stage.ecpay.com.tw/B2CInvoice/Issue";

// CheckMacValue：依官方規格做 URL encode + SHA-256（V2 算法）
export function buildCheckMacValue(params: Record<string, string>, hashKey: string, hashIv: string): string {
  const sortedKeys = Object.keys(params).filter(k => k !== "CheckMacValue").sort();
  const raw = `HashKey=${hashKey}&${sortedKeys.map(k => `${k}=${params[k]}`).join("&")}&HashIV=${hashIv}`;
  // 綠界 .NET URL encoder 的特殊處理
  const encoded = encodeURIComponent(raw)
    .toLowerCase()
    .replace(/%20/g, "+")
    .replace(/%2d/g, "-")
    .replace(/%5f/g, "_")
    .replace(/%2e/g, ".")
    .replace(/%21/g, "!")
    .replace(/%2a/g, "*")
    .replace(/%28/g, "(")
    .replace(/%29/g, ")");
  return createHash("sha256").update(encoded).digest("hex").toUpperCase();
}

export function verifyCheckMacValue(params: Record<string, string>, hashKey: string, hashIv: string): boolean {
  const received = params.CheckMacValue;
  if (!received) return false;
  const expected = buildCheckMacValue(params, hashKey, hashIv);
  return received.toUpperCase() === expected;
}

// 產生 ECPay AIO 付款表單欄位
export function buildAioPaymentForm(args: {
  merchantTradeNo: string;       // 唯一交易號（≤ 20 字）
  totalAmount: number;
  tradeDesc: string;             // 交易描述
  itemName: string;              // 商品名稱（多項用 # 分隔）
  returnUrl: string;             // server callback (POST)
  clientBackUrl?: string;        // 付款後返回網址
  paymentType?: "Credit" | "ATM" | "CVS" | "ALL";  // 預設 ALL
  customField1?: string;         // 自訂欄位 1
}): Record<string, string> {
  const now = new Date();
  const taipei = new Date(now.getTime() + 8 * 3600_000);
  const ts = taipei.toISOString().slice(0, 19).replace("T", " ").replace(/-/g, "/");

  const params: Record<string, string> = {
    MerchantID: ECPAY.merchantId,
    MerchantTradeNo: args.merchantTradeNo.replace(/[^A-Za-z0-9]/g, "").slice(0, 20),
    MerchantTradeDate: ts,
    PaymentType: "aio",
    TotalAmount: String(args.totalAmount),
    TradeDesc: args.tradeDesc.slice(0, 200),
    ItemName: args.itemName.slice(0, 400),
    ReturnURL: args.returnUrl,
    ChoosePayment: args.paymentType || "ALL",
    EncryptType: "1",
  };
  if (args.clientBackUrl) params.ClientBackURL = args.clientBackUrl;
  if (args.customField1) params.CustomField1 = args.customField1;

  params.CheckMacValue = buildCheckMacValue(params, ECPAY.hashKey, ECPAY.hashIv);
  return params;
}

export function generateMerchantTradeNo(prefix = "I"): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}${t}${r}`.slice(0, 20);
}

// E-Invoice：金流成功後自動開立 B2C 發票
// 簡化版本，先支援基本欄位（雙北手機載具）
export interface InvoiceArgs {
  relateNumber: string;          // 對應交易單號
  customerName?: string;
  customerEmail?: string;
  itemName: string;
  itemCount: number;
  itemPrice: number;             // 單價（含稅）
  itemAmount: number;            // 總金額（單價 × 數量）
}

export function buildInvoicePayload(args: InvoiceArgs): Record<string, unknown> {
  return {
    MerchantID: ECPAY.invoiceMerchantId,
    RelateNumber: args.relateNumber,
    CustomerName: args.customerName?.slice(0, 60) || "",
    CustomerEmail: args.customerEmail || "",
    Print: "0",
    Donation: "0",
    TaxType: "1",
    SalesAmount: args.itemAmount,
    InvType: "07",
    Items: [{
      ItemName: args.itemName,
      ItemCount: args.itemCount,
      ItemWord: "件",
      ItemPrice: args.itemPrice,
      ItemAmount: args.itemAmount,
      ItemTaxType: "1",
    }],
  };
}

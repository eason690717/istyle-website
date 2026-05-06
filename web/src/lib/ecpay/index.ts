// 綠界 ECPay 整合
// 文件：https://developers.ecpay.com.tw/
// 三大模組：AIO（金流）、E-Invoice（發票）、Logistics（物流）
import { createHash } from "node:crypto";

// 防禦性：Vercel 後台貼值常常帶到尾端換行，會讓 CheckMacValue 永遠算錯
const env = (k: string) => (process.env[k] || "").trim();

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

// ⚠️ 改成 getter — 每次呼叫即時讀 env，不依賴 module-level cache
// 原因：Vercel serverless 暖機 instance 可能 cache 老的 env 計算結果，導致明明 ECPAY_PROD 已設仍走測試
function isProdPayment(): boolean {
  if (env("ECPAY_FORCE_TEST") === "1") return false;
  return !!env("ECPAY_PROD");
}
function isProdInvoice(): boolean {
  if (env("ECPAY_FORCE_TEST") === "1") return false;
  return !!env("ECPAY_INVOICE_PROD");
}

// 改成 getter object：每次存取屬性才讀 env
export const ECPAY = {
  get merchantId() { return isProdPayment() ? env("ECPAY_MERCHANT_ID") : TEST_PAYMENT.merchantId; },
  get hashKey() { return isProdPayment() ? env("ECPAY_HASH_KEY") : TEST_PAYMENT.hashKey; },
  get hashIv() { return isProdPayment() ? env("ECPAY_HASH_IV") : TEST_PAYMENT.hashIv; },
  get invoiceMerchantId() { return isProdInvoice() ? env("ECPAY_INVOICE_MERCHANT_ID") : TEST_INVOICE.invoiceMerchantId; },
  get invoiceHashKey() { return isProdInvoice() ? env("ECPAY_INVOICE_HASH_KEY") : TEST_INVOICE.invoiceHashKey; },
  get invoiceHashIv() { return isProdInvoice() ? env("ECPAY_INVOICE_HASH_IV") : TEST_INVOICE.invoiceHashIv; },
};

// URL 改成 getter（被 destructure import 時會失效，請用 getEcpayAioUrl()）
export function getEcpayAioUrl(): string {
  return isProdPayment()
    ? "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5"
    : "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5";
}
export function getEcpayInvoiceUrl(): string {
  return isProdInvoice()
    ? "https://einvoice.ecpay.com.tw/B2CInvoice/Issue"
    : "https://einvoice-stage.ecpay.com.tw/B2CInvoice/Issue";
}
// Back-compat const exports (computed at module load — 舊 code 用)
// 但這仍會被 cache，新 code 應改用 getEcpayAioUrl() function
export const ECPAY_AIO_URL = getEcpayAioUrl();
export const ECPAY_INVOICE_URL = getEcpayInvoiceUrl();

// CheckMacValue：完全對齊綠界官方 npm SDK ecpay_aio_nodejs (urlencode_dot_net)
// 來源: /tmp/ecpay-test/node_modules/ecpay_aio_nodejs/lib/ecpay_payment/helper.js
// 關鍵：encodeURIComponent → toLowerCase → 只 replace ' ~ %20，**不要**動 ! ( ) *
//   - encodeURIComponent 本來就不會 encode ! ' ( ) * ~（unreserved chars）
//   - 我們之前手動把 ( ) encode 成 %28 %29 是錯的（綠界要保留原字元）
//   - 之前這個 bug 隱藏，因為 Renting 的 ItemName 沒含 ( )，沒觸發
export function buildCheckMacValue(params: Record<string, string>, hashKey: string, hashIv: string): string {
  const sortedKeys = Object.keys(params)
    .filter(k => k !== "CheckMacValue")
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const raw = `HashKey=${hashKey}&${sortedKeys.map(k => `${k}=${params[k]}`).join("&")}&HashIV=${hashIv}`;
  const encoded = encodeURIComponent(raw)
    .toLowerCase()
    .replace(/'/g, "%27")
    .replace(/~/g, "%7e")
    .replace(/%20/g, "+");
  const mac = createHash("sha256").update(encoded).digest("hex").toUpperCase();

  if (env("ECPAY_DEBUG") === "1") {
    // 一次印一行 JSON，Vercel 才不會吞掉多 line 的 console.log
    console.log("ECPAY_DBG " + JSON.stringify({
      keys: sortedKeys,
      hashKeyLen: hashKey.length,
      hashIvLen: hashIv.length,
      hashKeyTail: hashKey.slice(-3),  // 確認沒帶垃圾字元
      hashIvTail: hashIv.slice(-3),
      rawLen: raw.length,
      rawFirst200: raw.slice(0, 200),
      rawLast100: raw.slice(-100),
      encodedFirst300: encoded.slice(0, 300),
      mac,
    }));
  }
  return mac;
}

export function verifyCheckMacValue(params: Record<string, string>, hashKey: string, hashIv: string): boolean {
  const received = params.CheckMacValue;
  if (!received) return false;
  const expected = buildCheckMacValue(params, hashKey, hashIv);
  return received.toUpperCase() === expected;
}

// 對齊 Renting 的 sanitize：把容易讓綠界解析錯的字元換掉
// 特別處理：& = # 影響 form-encoded parsing；全形括號 ／ 中文標點符號據實測會讓綠界算錯 MAC
function sanitizeForECPay(s: string): string {
  return s
    .replace(/[&=#]/g, "_")          // form parser killers
    .replace(/[（）]/g, "")           // 全形括號去掉
    .replace(/\s+/g, " ")            // 多重空白合併
    .trim();
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
  customField1?: string;         // 自訂欄位 1（注意：留空才不影響 MAC）
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
    TradeDesc: sanitizeForECPay(args.tradeDesc).slice(0, 200),
    ItemName: sanitizeForECPay(args.itemName).slice(0, 400),
    ReturnURL: args.returnUrl,
    ChoosePayment: args.paymentType || "ALL",
    EncryptType: "1",
  };
  if (args.clientBackUrl) params.ClientBackURL = args.clientBackUrl;
  // 注意：不送 PlatformID/InvoiceMark/IgnorePayment/DeviceSource —
  // Renting 沒送也能用，加了反而可能讓綠界 routing 看不到付款方式 → 10300023

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

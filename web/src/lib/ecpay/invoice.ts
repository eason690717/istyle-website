// 綠界電子發票 API（B2C 三聯式）
// 文件：https://www.ecpay.com.tw/CascadeFile/InvoiceFile
// 與金流共用 MerchantID / HashKey / HashIV
import crypto from "node:crypto";

import { ECPAY, ECPAY_INVOICE_URL } from "./index";

const MERCHANT_ID = ECPAY.invoiceMerchantId || ECPAY.merchantId;
const HASH_KEY = ECPAY.invoiceHashKey || ECPAY.hashKey;
const HASH_IV = ECPAY.invoiceHashIv || ECPAY.hashIv;
const ENDPOINT = ECPAY_INVOICE_URL;

// AES-128-CBC 加密（綠界發票 v3 格式）
function aesEncrypt(data: string): string {
  const cipher = crypto.createCipheriv("aes-128-cbc", HASH_KEY, HASH_IV);
  const encoded = encodeURIComponent(data)
    .replace(/!/g, "%21").replace(/'/g, "%27")
    .replace(/\(/g, "%28").replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
  let enc = cipher.update(encoded, "utf8", "base64");
  enc += cipher.final("base64");
  return enc;
}

function aesDecrypt(encrypted: string): string {
  const decipher = crypto.createDecipheriv("aes-128-cbc", HASH_KEY, HASH_IV);
  let dec = decipher.update(encrypted, "base64", "utf8");
  dec += decipher.final("utf8");
  return decodeURIComponent(dec);
}

export interface InvoiceItem {
  ItemName: string;
  ItemCount: number;
  ItemWord: string;     // 單位 "件" / "個"
  ItemPrice: number;    // 單價
  ItemTaxType?: 1 | 2 | 3;  // 1=應稅 2=零稅率 3=免稅
  ItemAmount: number;   // 小計
}

export interface IssueInvoiceArgs {
  relateNumber: string;     // 我方訂單編號（unique）
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerIdentifier?: string;  // 統編（B2B）
  items: InvoiceItem[];
  totalAmount: number;
  taxType?: "1" | "2" | "3" | "9";  // 1=應稅 9=零稅率混合
  invType?: "07" | "08";    // 07=一般稅率 08=特種稅額
  carrierType?: "" | "1" | "2" | "3";  // 空=紙本 1=綠界手機條碼 2=自然人憑證 3=會員載具
  carrierNum?: string;      // 載具號碼（手機條碼 /XXX12AB）
  donation?: "0" | "1";     // 1=捐贈
  loveCode?: string;        // 捐贈碼
}

// 開立發票
export async function issueInvoice(args: IssueInvoiceArgs): Promise<{ ok: boolean; invoiceNumber?: string; error?: string; raw?: unknown }> {
  if (!MERCHANT_ID || !HASH_KEY || !HASH_IV) {
    return { ok: false, error: "ECPay env not configured" };
  }

  // 預設：紙本發票，無捐贈
  const data = {
    MerchantID: MERCHANT_ID,
    RelateNumber: args.relateNumber.slice(0, 30),
    CustomerName: (args.customerName || "").slice(0, 60),
    CustomerEmail: args.customerEmail || "",
    CustomerPhone: args.customerPhone || "",
    CustomerIdentifier: args.customerIdentifier || "",  // 統編 8 碼
    Print: args.customerIdentifier ? "1" : "0",          // 有統編必開立紙本
    Donation: args.donation || "0",
    LoveCode: args.loveCode || "",
    CarrierType: args.carrierType || "",
    CarrierNum: args.carrierNum || "",
    TaxType: args.taxType || "1",
    SalesAmount: args.totalAmount,
    InvType: args.invType || "07",
    Items: args.items.map((it, i) => ({
      ItemSeq: i + 1,
      ItemName: it.ItemName.slice(0, 100),
      ItemCount: it.ItemCount,
      ItemWord: it.ItemWord || "件",
      ItemPrice: it.ItemPrice,
      ItemTaxType: it.ItemTaxType || 1,
      ItemAmount: it.ItemAmount,
    })),
  };

  const json = JSON.stringify(data);
  const encrypted = aesEncrypt(json);

  const payload = {
    MerchantID: MERCHANT_ID,
    RqHeader: { Timestamp: Math.floor(Date.now() / 1000) },
    Data: encrypted,
  };

  try {
    const r = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      return { ok: false, error: `HTTP ${r.status}` };
    }
    const result = await r.json();
    if (result.TransCode !== 1) {
      return { ok: false, error: `綠界錯誤: ${result.TransMsg}`, raw: result };
    }
    // Decrypt response data
    const decrypted = aesDecrypt(result.Data);
    const parsed = JSON.parse(decrypted);
    if (parsed.RtnCode !== 1) {
      return { ok: false, error: parsed.RtnMsg, raw: parsed };
    }
    return {
      ok: true,
      invoiceNumber: parsed.InvoiceNo,
      raw: parsed,
    };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

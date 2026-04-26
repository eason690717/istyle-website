// 本地驗 CheckMacValue 算法
// 用法: node scripts/test-ecpay-mac.mjs
import { createHash } from "node:crypto";

function buildCheckMacValue(params, hashKey, hashIv) {
  const sortedKeys = Object.keys(params)
    .filter(k => k !== "CheckMacValue")
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const raw = `HashKey=${hashKey}&${sortedKeys.map(k => `${k}=${params[k]}`).join("&")}&HashIV=${hashIv}`;
  const encoded = encodeURIComponent(raw)
    .replace(/'/g, "%27")
    .replace(/!/g, "%21")
    .replace(/\*/g, "%2A")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .toLowerCase();
  return { raw, encoded, mac: createHash("sha256").update(encoded).digest("hex").toUpperCase() };
}

// === Case 1: ECPay 官方文件範例 V2 SHA256 ===
// 來源: https://developers.ecpay.com.tw → AIO 全方位金流 → CheckMacValue 範例
const docExample = {
  params: {
    MerchantID: "2000132",
    MerchantTradeNo: "MS453050270",
    MerchantTradeDate: "2015/03/31 14:32:21",
    PaymentType: "aio",
    TotalAmount: "150",
    TradeDesc: "促銷方案",
    ItemName: "Apple iphone 15",
    ReturnURL: "https://www.ecpay.com.tw/receive.php",
    ChoosePayment: "ALL",
    EncryptType: "1",
  },
  hashKey: "5294y06JbISpM5x9",
  hashIv: "v77hoKGq4kWxNNIS",
  expected: "6F6FB78D3144B5B7AAA10F30D0FFB6BD46AABB0DBA4DFF6E1A37F818885B5763", // 文件範例值（如不準確下面 case 2 才是真關鍵）
};

const r1 = buildCheckMacValue(docExample.params, docExample.hashKey, docExample.hashIv);
console.log("=== Case 1: ECPay 文件範例 ===");
console.log("Raw:", r1.raw);
console.log("Encoded:", r1.encoded);
console.log("Computed MAC:", r1.mac);
console.log("Expected   :", docExample.expected);
console.log("Match:", r1.mac === docExample.expected ? "✅" : "❌");

// === Case 2: 模擬 i-style 實際送出的參數 ===
// 用正式 creds，模擬一筆 itemName 含中文/空白/dash 的訂單
const istyleParams = {
  MerchantID: "3383324",
  MerchantTradeNo: "ISMC9XYZAB",
  MerchantTradeDate: "2026/04/26 21:48:00",
  PaymentType: "aio",
  TotalAmount: "1",
  TradeDesc: "i時代 - 測試付款",
  ItemName: "iPhone 維修報價 - 換螢幕",
  ReturnURL: "https://www.i-style.store/api/ecpay/notify",
  ChoosePayment: "ALL",
  EncryptType: "1",
  ClientBackURL: "https://www.i-style.store/pay/abc123",
  CustomField1: "abc123",
};

const r2 = buildCheckMacValue(istyleParams, "b6KZYy8VggwfnsNG", "s3S7kbze3rmOnwYR");
console.log("\n=== Case 2: i-style 模擬參數 ===");
console.log("Raw len:", r2.raw.length);
console.log("Encoded:", r2.encoded);
console.log("MAC:", r2.mac);
console.log("\n👉 把這組參數+MAC 丟到綠界線上驗證工具:");
console.log("https://payment-stage.ecpay.com.tw/AioHelloWorld/AioCheckMacValue");

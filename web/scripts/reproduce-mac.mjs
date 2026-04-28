// 用 production debug log 抓到的實際 raw string，跑多種演算法變體比對
import { createHash } from "node:crypto";

// 從實際 debug log 抓的真實 params（全部）
const params = {
  ChoosePayment: "ATM",
  ClientBackURL: "https://www.i-style.store/pay/e45679c9cf719bca293cebd6e6870081",
  CustomField1: "e45679c9cf719bca293cebd6e6870081",
  EncryptType: "1",
  ItemName: "GD團服客製（240g / 黑舞 / S） () x1",
  MerchantID: "3383324",
  // MerchantTradeDate, MerchantTradeNo 從 debug 拼湊
  MerchantTradeDate: "2026/04/27 03:27:50",
  MerchantTradeNo: "ISMC9XXXX",  // 不影響演算法測試
  PaymentType: "aio",
  ReturnURL: "https://www.i-style.store/api/ecpay/notify",
  TotalAmount: "61",
  TradeDesc: "i時代 - GD團服客製（240g / 黑舞 / S） () x1",
};

const HK = "b6KZYy8VggwfnsNG";
const IV = "s3S7kbze3rmOnwYR";

function variant(name, encodeFn, sortFn) {
  const sortedKeys = Object.keys(params).sort(sortFn);
  const raw = `HashKey=${HK}&${sortedKeys.map(k => `${k}=${params[k]}`).join("&")}&HashIV=${IV}`;
  const encoded = encodeFn(raw).toLowerCase();
  const mac = createHash("sha256").update(encoded).digest("hex").toUpperCase();
  console.log(`\n=== ${name} ===\nMAC: ${mac}`);
  return mac;
}

// V1 (current — Renting style)
variant("V1 Renting", s =>
  encodeURIComponent(s)
    .replace(/%20/g, "+")
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2a"),
  (a, b) => a.toLowerCase().localeCompare(b.toLowerCase())
);

// V2: Renting + 用 default sort (case-sensitive)
variant("V2 case-sensitive sort", s =>
  encodeURIComponent(s)
    .replace(/%20/g, "+")
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2a"),
);

// V3: %20 保留 (我之前的「修錯」版)
variant("V3 keep %20", s =>
  encodeURIComponent(s)
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2a"),
  (a, b) => a.toLowerCase().localeCompare(b.toLowerCase())
);

// V4: 完全 default encodeURIComponent（不做任何 replace）
variant("V4 no extra encoding", s => encodeURIComponent(s),
  (a, b) => a.toLowerCase().localeCompare(b.toLowerCase())
);

// V5: encode 全部小寫包含 hex 字元 (e.g. %2f → %2f, %2F → %2f)
//    這在 Node 已經是小寫，無差別

// V6: 不做最後 toLowerCase（保留 hex 大寫）— 實驗
{
  const sorted = Object.keys(params).sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()));
  const raw = `HashKey=${HK}&${sorted.map(k=>`${k}=${params[k]}`).join("&")}&HashIV=${IV}`;
  const encoded = encodeURIComponent(raw)
    .replace(/%20/g, "+")
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2a");
  const mac = createHash("sha256").update(encoded).digest("hex").toUpperCase();
  console.log(`\n=== V6 no toLowerCase ===\nMAC: ${mac}`);
}

console.log("\n👉 production 算出的: 50075B98603EEB3B98021EA04D59F2EFD4947BBE4606648ABF98741369B4AFD4");
console.log("👉 拿 V1 那個 MAC 去這個工具驗:");
console.log("https://payment-stage.ecpay.com.tw/AioHelloWorld/AioCheckMacValue");

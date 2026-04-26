// 綠界物流 API
// 支援：7-11 / 全家 / 萊爾富 / OK 取貨付款（C2C 賣貨便）+ 一般取貨 + 黑貓宅配
// 文件：https://www.ecpay.com.tw/Service/API_Dwnld
import { ECPAY, buildCheckMacValue } from "./index";

const MERCHANT_ID = ECPAY.merchantId;
const IS_STAGE = !MERCHANT_ID || MERCHANT_ID.length < 7 || MERCHANT_ID === "3002607" || MERCHANT_ID === "2000132";

const ENDPOINTS = {
  // 超商選店地圖（瀏覽器跳轉）
  cvsMap: IS_STAGE
    ? "https://logistics-stage.ecpay.com.tw/Express/map"
    : "https://logistics.ecpay.com.tw/Express/map",
  // 建立物流訂單
  create: IS_STAGE
    ? "https://logistics-stage.ecpay.com.tw/Express/Create"
    : "https://logistics.ecpay.com.tw/Express/Create",
  // 列印託運單
  printLabel: IS_STAGE
    ? "https://logistics-stage.ecpay.com.tw/helper/printTradeDocument"
    : "https://logistics.ecpay.com.tw/helper/printTradeDocument",
};

// 物流類型
export type LogisticsType = "CVS" | "Home";
// 子類型（CVS 取貨付款 / 一般取貨 / 宅配）
export type LogisticsSubType =
  | "UNIMARTC2C"   // 7-11 賣貨便
  | "UNIMART"      // 7-11 一般取貨
  | "FAMIC2C"      // 全家 賣貨便
  | "FAMI"         // 全家
  | "HILIFEC2C"    // 萊爾富 賣貨便
  | "HILIFE"       // 萊爾富
  | "OKMARTC2C"    // OK 賣貨便
  | "OKMART"       // OK
  | "TCAT"         // 黑貓宅配
  | "ECAN";        // 宅配通

export interface CvsMapArgs {
  merchantTradeNo: string;          // 我方訂單號
  logisticsSubType: LogisticsSubType;  // 哪家超商
  isCollection?: "Y" | "N";          // 是否取貨付款（C2C 必填 Y）
  serverReplyURL: string;             // 客戶選完店家後綠界 POST 回我方的 URL
  extraData?: string;                 // 帶回我方的自訂參數
}

// 產生「客戶選店家」的 HTML 表單（自動 submit）
export function buildCvsMapForm(args: CvsMapArgs): string {
  const params: Record<string, string> = {
    MerchantID: MERCHANT_ID,
    MerchantTradeNo: args.merchantTradeNo,
    LogisticsType: "CVS",
    LogisticsSubType: args.logisticsSubType,
    IsCollection: args.isCollection || "Y",
    ServerReplyURL: args.serverReplyURL,
  };
  if (args.extraData) params.ExtraData = args.extraData;
  // CVS map 不需 CheckMacValue

  const inputs = Object.entries(params)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${escapeHtml(v)}">`)
    .join("\n");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>選擇取貨門市</title>
<style>body{background:#060606;color:#c9a96e;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh}
.s{width:40px;height:40px;border:3px solid rgba(201,169,110,.2);border-top-color:#c9a96e;border-radius:50%;margin:0 auto 20px;animation:sp .8s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}</style></head>
<body><div style="text-align:center"><div class="s"></div><p>正在開啟超商門市地圖...</p>
<form id="f" method="POST" action="${ENDPOINTS.cvsMap}">${inputs}</form>
<script>document.getElementById("f").submit()</script></div></body></html>`;
}

export interface CreateLogisticsArgs {
  merchantTradeNo: string;
  logisticsType: LogisticsType;
  logisticsSubType: LogisticsSubType;
  goodsAmount: number;          // 商品總額（取貨付款金額）
  collectionAmount?: number;    // 代收金額（C2C 必填，通常 = goodsAmount）
  isCollection?: "Y" | "N";
  goodsName: string;
  // 寄件人
  senderName: string;
  senderPhone?: string;
  senderCellPhone?: string;     // 手機（C2C 必填）
  senderZipCode?: string;
  senderAddress?: string;
  // 收件人
  receiverName: string;
  receiverPhone?: string;
  receiverCellPhone?: string;
  receiverEmail?: string;
  receiverZipCode?: string;
  receiverAddress?: string;
  // 超商門市（C2C 用，從 cvsMap 回呼取得）
  receiverStoreID?: string;
  // 回呼
  serverReplyURL: string;
  // 託運單列印備註
  remark?: string;
}

// 建立物流訂單（取得綠界貨運單號）
export async function createLogistics(args: CreateLogisticsArgs): Promise<{ ok: boolean; ecpayLogisticsId?: string; cvsPaymentNo?: string; cvsValidationNo?: string; error?: string; raw?: Record<string, string> }> {
  if (!MERCHANT_ID || !ECPAY.hashKey || !ECPAY.hashIv) {
    return { ok: false, error: "ECPay env not configured" };
  }

  const params: Record<string, string> = {
    MerchantID: MERCHANT_ID,
    MerchantTradeNo: args.merchantTradeNo,
    MerchantTradeDate: ecpayDate(),
    LogisticsType: args.logisticsType,
    LogisticsSubType: args.logisticsSubType,
    GoodsAmount: String(args.goodsAmount),
    CollectionAmount: String(args.collectionAmount ?? args.goodsAmount),
    IsCollection: args.isCollection || "Y",
    GoodsName: args.goodsName.slice(0, 50),
    SenderName: args.senderName.slice(0, 10),
    SenderCellPhone: args.senderCellPhone || "",
    ReceiverName: args.receiverName.slice(0, 10),
    ReceiverCellPhone: args.receiverCellPhone || "",
    ReceiverEmail: args.receiverEmail || "",
    ServerReplyURL: args.serverReplyURL,
  };
  if (args.senderPhone) params.SenderPhone = args.senderPhone;
  if (args.senderZipCode) params.SenderZipCode = args.senderZipCode;
  if (args.senderAddress) params.SenderAddress = args.senderAddress;
  if (args.receiverPhone) params.ReceiverPhone = args.receiverPhone;
  if (args.receiverZipCode) params.ReceiverZipCode = args.receiverZipCode;
  if (args.receiverAddress) params.ReceiverAddress = args.receiverAddress;
  if (args.receiverStoreID) params.ReceiverStoreID = args.receiverStoreID;
  if (args.remark) params.Remark = args.remark.slice(0, 40);

  params.CheckMacValue = buildCheckMacValue(params, ECPAY.hashKey, ECPAY.hashIv);

  try {
    const body = new URLSearchParams(params).toString();
    const r = await fetch(ENDPOINTS.create, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
    const text = await r.text();
    // 回傳是 url-encoded form
    const result: Record<string, string> = {};
    for (const pair of text.split("&")) {
      const [k, v] = pair.split("=");
      result[decodeURIComponent(k)] = decodeURIComponent((v || "").replace(/\+/g, " "));
    }
    if (result.RtnCode !== "300") {
      return { ok: false, error: `綠界: ${result.RtnMsg}`, raw: result };
    }
    return {
      ok: true,
      ecpayLogisticsId: result.AllPayLogisticsID,
      cvsPaymentNo: result.CVSPaymentNo,
      cvsValidationNo: result.CVSValidationNo,
      raw: result,
    };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function ecpayDate(d = new Date()): string {
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${z(d.getMonth() + 1)}/${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
}

// 物流選項供 UI 使用
export const SHIPPING_METHODS = [
  { value: "PICKUP", label: "門市自取（板橋江子翠）", fee: 0, type: "PICKUP", subType: null, hint: "最快、零運費" },
  { value: "UNIMARTC2C", label: "7-11 賣貨便取貨付款", fee: 60, type: "CVS", subType: "UNIMARTC2C", hint: "ECPay 自動寄件．3-5 工作日" },
  { value: "FAMIC2C", label: "全家 賣貨便取貨付款", fee: 60, type: "CVS", subType: "FAMIC2C", hint: "ECPay 自動寄件．3-5 工作日" },
  { value: "HILIFEC2C", label: "萊爾富 取貨付款", fee: 60, type: "CVS", subType: "HILIFEC2C", hint: "3-5 工作日" },
  { value: "TCAT", label: "黑貓宅配（台灣本島）", fee: 120, type: "Home", subType: "TCAT", hint: "1-2 工作日" },
  { value: "SF", label: "順豐快遞（外島/急件）", fee: 200, type: "MANUAL", subType: null, hint: "客服協助下單，運費另計" },
  { value: "LALA", label: "拉拉快遞（台北市內）", fee: 150, type: "MANUAL", subType: null, hint: "當日達，客服協助下單" },
] as const;

export type ShippingMethodValue = typeof SHIPPING_METHODS[number]["value"];

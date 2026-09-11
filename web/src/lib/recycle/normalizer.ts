// 把不同站的機型名稱標準化成 canonical key
export type Category = "phone" | "tablet" | "laptop_pro" | "laptop_air" | "desktop" | "console" | "dyson" | "earphone";

export interface ParsedModel {
  modelKey: string;
  category: Category;
  brand: string;
  modelName: string;
  storage?: string;
  variant?: string;
}

// 容量解析統一走 normalize-model（全站唯一來源），本檔不再自己實作一套。
// 該版本含白名單，會擋掉「小米 15T」這類把機型代號誤判成容量的情況。
import { normalizeStorage as normalizeStorageCanonical } from "@/lib/normalize-model";

function normalizeStorage(raw: string): string | undefined {
  return normalizeStorageCanonical(raw) ?? undefined;
}

// 只有在真的解析出容量時，才把容量從機型名稱剝掉，而且是「從字尾逐個 token 剝、只剝合法容量」。
//   ✗ 從第一個「數字+G」切到底：「小米 15T Pro 256G」會被切成「小米」
//   ✗ 字尾整串一起剝：「realme GT Neo 3T 256G」會連 3T 一起剝成「realme GT Neo」
//   ✓ 逐個剝：256G 合法 → 剝；3T 不在白名單 → 屬於機型名稱，停
// 另外順手剝掉「12G/512G」裡的記憶體前綴「12G/」。
function stripStorageSuffix(cleaned: string, storage: string | undefined): string {
  if (!storage) return cleaned;
  let s = cleaned;
  for (;;) {
    const m = s.match(/\s*(\d+(?:\.\d+)?\s*(?:TB|T|GB|G))\s*$/i);
    if (!m || m.index === undefined) break;
    if (!normalizeStorage(m[1])) break;
    s = s.slice(0, m.index).replace(/\s*\d+(?:\.\d+)?\s*G\s*\/\s*$/i, "").trim();
  }
  return s || cleaned;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[（）()]/g, "")
    .replace(/[\s_/\\.,'"`]+/g, "-")
    .replace(/[^a-z0-9-\u4e00-\u9fff]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// iPhone
export function parseIphone(raw: string): ParsedModel | null {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (!/iphone/i.test(cleaned)) return null;
  const storage = normalizeStorage(cleaned);
  const baseName = stripStorageSuffix(cleaned, storage);
  const modelKey = slugify(`${baseName}${storage ? "-" + storage : ""}`);
  return { modelKey, category: "phone", brand: "Apple", modelName: baseName, storage };
}

// iPad
export function parseIpad(raw: string): ParsedModel | null {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (!/ipad/i.test(cleaned)) return null;
  const storage = normalizeStorage(cleaned);
  let variant: string | undefined;
  if (/5G|LTE|cellular|蜂窩|行動網路/i.test(cleaned)) variant = "WiFi+5G";
  else if (/wi-?fi/i.test(cleaned)) variant = "WiFi";   // jyes 寫 Wi-Fi，us3c 寫 WiFi
  let baseName = cleaned
    .replace(/\s*\d+\s*(?:TB|T|GB|G)\b/gi, "")
    .replace(/wi-?fi\s*\+?\s*(?:5G|LTE|cellular|蜂窩|行動網路)/gi, "")
    .replace(/\b(?:wi-?fi|5G|LTE|cellular|蜂窩|行動網路)\b/gi, "")
    .replace(/[+,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const modelKey = slugify(`${baseName}${storage ? "-" + storage : ""}${variant ? "-" + variant : ""}`);
  return { modelKey, category: "tablet", brand: "Apple", modelName: baseName, storage, variant };
}

// us3c 格式："Macbook Pro 16吋 M4 Max / 16C40G / 64G / 1TB SSD｜2024年"
//   16C40G = 16 核 CPU / 40 核 GPU、64G = 記憶體、1TB SSD = 儲存
// 舊版把所有「數字+G」都當容量剝掉，導致 CPU/GPU/RAM 規格全部消失，
// 不同記憶體配置（64G vs 48G，差價 $2,700）會塌縮成同一筆互相覆蓋。
// 現在只取 SSD 容量當 storage，其餘規格保留在名稱中以維持可讀與可區分。
export function parseMacBook(raw: string, kind: "pro" | "air"): ParsedModel | null {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (!/macbook/i.test(cleaned)) return null;

  let storage: string | undefined;
  const ssdMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:TB|T|GB|G)\s*SSD/i);
  if (ssdMatch) storage = normalizeStorage(ssdMatch[0]);
  if (!storage) {
    // 沒標 SSD 時退而取最後一個合法容量（RAM 通常寫在前面）
    const all = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:TB|T|GB|G)\b/gi) || [];
    for (let i = all.length - 1; i >= 0 && !storage; i--) storage = normalizeStorage(all[i]);
  }

  const baseName = cleaned
    .replace(/(\d+(?:\.\d+)?)\s*(?:TB|T|GB|G)\s*SSD/gi, "")   // 只拿掉 SSD 容量段
    .replace(/[／/｜|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const modelKey = slugify(`macbook-${kind}-${baseName.replace(/macbook|pro|air/gi, "").trim()}${storage ? "-" + storage : ""}`);
  return {
    modelKey,
    category: kind === "pro" ? "laptop_pro" : "laptop_air",
    brand: "Apple",
    modelName: baseName,
    storage,
  };
}

// 通用 Android / Samsung / OPPO 等手機解析（非 iPhone/iPad）
// raw 可能含「舊機高額回收價」「高價回收」等後綴，先去掉
export function parseGenericModel(raw: string, brand: string, category: Category = "phone"): ParsedModel | null {
  let cleaned = raw.replace(/\s+/g, " ").trim();
  // 去掉雜訊後綴
  cleaned = cleaned
    .replace(/舊機高額回收價/g, "")
    .replace(/高價回收/g, "")
    .replace(/高額回收/g, "")
    .replace(/回收價/g, "")
    .trim();
  if (!cleaned) return null;
  const storage = normalizeStorage(cleaned);
  const baseName = stripStorageSuffix(cleaned, storage);
  const modelKey = slugify(`${brand}-${baseName}${storage ? "-" + storage : ""}`);
  return { modelKey, category, brand, modelName: baseName, storage };
}

// us3c Android 格式："Samsung Galaxy S26 Ultra 5G 12G/512G SM-S9480"
//                    "Google Pixel 10 Pro Fold 5G 16G/1TB"、"Xiaomi 小米 15T Pro 12G/1T"
// 規格一律寫成「記憶體 + 容量」（12G/512G、16G 1TB），在第一個這種組合前切開，
// 其後的型號代碼（SM-S9480）也一併去掉。
// 名稱要與 jyes 對齊才能合併比價：jyes 寫「SAMSUNG S26 Ultra」不寫 Galaxy，所以 Galaxy 要拿掉。
export function parseUs3cAndroid(raw: string): ParsedModel | null {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const storage = normalizeStorage(cleaned);
  if (!storage) return null;
  const brand = cleaned.split(" ")[0];
  const cut = cleaned.search(/\b\d+G(?:\/|\s+)\d+(?:\.\d+)?\s*(?:TB|T|GB|G)\b/i);
  let modelName = (cut > 0 ? cleaned.slice(0, cut) : cleaned)
    .replace(/\s+[45]G\s*$/i, "")                          // 行動網路世代不是機型的一部分
    .trim();
  // 用 startsWith 而非 new RegExp(`^${brand}\s+`)：樣板字串裡的 \s 會被當成未知跳脫而吞掉反斜線，
  // 實際變成 /^Samsungs+/，永遠比對不到
  if (modelName.toLowerCase().startsWith(brand.toLowerCase() + " ")) modelName = modelName.slice(brand.length + 1);
  modelName = modelName.replace(/^Galaxy\s+/i, "").trim();
  if (!modelName) return null;
  const modelKey = slugify(`${brand}-${modelName}-${storage}`);
  return { modelKey, category: "phone", brand, modelName, storage };
}

// 移除字串中「合法容量」的 token（不論位置），其餘數字（型號、代數）保留
function removeStorageTokens(s: string): string {
  return s.replace(/\s*(\d+(?:\.\d+)?\s*(?:TB|T|GB|G))\b/gi, (m, tok) => (normalizeStorage(tok) ? "" : m))
    .replace(/\s+/g, " ").trim();
}

// us3c 遊戲主機："Sony PS5 光碟版 CFI-1218A"、"Nintendo Switch 2 BEE-001 紅藍 + 瑪利歐賽車世界 同捆組"、
//              "Microsoft Xbox Series X 1T 光碟版"
// 同名不同版本價差大（PS5 光碟版 CFI-1018A $5,900 / CFI-1218A $7,200），
// 型號代碼若剝掉會塌成同一筆互相覆蓋 → 代碼與後面的版本說明一律放進 variant。
export function parseUs3cConsole(raw: string): ParsedModel | null {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const brand = cleaned.split(" ")[0];
  let rest = cleaned.slice(brand.length).trim();
  const storage = normalizeStorage(rest);
  let variant: string | undefined;
  const codeAt = rest.search(/\b[A-Z]{3}-[A-Z0-9]+/);
  if (codeAt > 0) {
    variant = rest.slice(codeAt).trim();
    rest = rest.slice(0, codeAt).trim();
  }
  if (storage) rest = removeStorageTokens(rest);
  if (!rest) return null;
  const modelKey = slugify(`${brand}-${rest}${storage ? "-" + storage : ""}${variant ? "-" + variant : ""}`);
  return { modelKey, category: "console", brand, modelName: rest, storage, variant };
}

// us3c Dyson："Dyson Supersonic HD01"，capacity 欄位其實是出廠年份（2016）
// 產品線（Supersonic / Airwrap…）當機型、型號＋年份當規格 → 同產品線各代排在一起，客人也比較認得年份
export function parseUs3cDyson(raw: string, year?: string): ParsedModel | null {
  const cleaned = raw.replace(/\s+/g, " ").trim().replace(/^Dyson\s+/i, "");
  const m = cleaned.match(/^(.*?)\s+([A-Z]{2}\d{2})\b(.*)$/);
  const modelName = (m ? m[1] : cleaned).trim();
  if (!modelName) return null;
  const code = m ? (m[2] + m[3]).trim() : "";
  const y = year && /^\d{4}$/.test(year.trim()) ? `${year.trim()}年` : "";
  const variant = [code, y].filter(Boolean).join(" · ") || undefined;
  const modelKey = slugify(`dyson-${modelName}${variant ? "-" + variant : ""}`);
  return { modelKey, category: "dyson", brand: "Dyson", modelName, variant };
}

// AirPods：us3c 格式 "Apple AirPods Pro 2 MagSafe Lightning A2931 A2699 A2698"
// 1) 去掉 Apple 前綴
// 2) 去掉行末 "AXXXX" 型號代碼（多個 model number 用空白分隔）
// 3) 用剩下的字段當 modelName，例如 "AirPods Pro 2 MagSafe Lightning"
export function parseAirPods(raw: string): ParsedModel | null {
  let cleaned = raw.replace(/\s+/g, " ").trim();
  if (!/airpod/i.test(cleaned)) return null;
  cleaned = cleaned.replace(/^Apple\s+/i, "");
  // 去掉 A 開頭 4-5 碼的 model number（可能多個）
  cleaned = cleaned.replace(/\bA\d{4,5}(?:\s+A\d{4,5})*\s*$/g, "").trim();
  // 去尾巴雜訊
  cleaned = cleaned.replace(/[（(].*[）)]/g, "").trim();
  if (!/airpod/i.test(cleaned)) return null;
  const modelKey = slugify(`apple-${cleaned}`);
  return { modelKey, category: "earphone", brand: "Apple", modelName: cleaned };
}

export function parseModelByCategory(raw: string, hint: Category): ParsedModel | null {
  switch (hint) {
    case "phone": return parseIphone(raw);
    case "tablet": return parseIpad(raw);
    case "laptop_pro": return parseMacBook(raw, "pro");
    case "laptop_air": return parseMacBook(raw, "air");
    case "earphone": return parseAirPods(raw);
    default: return null;
  }
}

export function parsePriceText(s: string): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[NT$,，元\s]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "—") return null;
  const m = cleaned.match(/(\d+)/);
  if (!m) return null;
  const n = parseInt(m[1]);
  return n > 100 && n < 10000000 ? n : null;
}

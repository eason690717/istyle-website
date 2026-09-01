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

// 只有在真的解析出容量時，才把「數字+容量單位」後綴從機型名稱切掉。
// 否則「小米 15T Pro」會被切成「小米」，機型名稱整個消失。
function stripStorageSuffix(cleaned: string, storage: string | undefined): string {
  if (!storage) return cleaned;
  return cleaned.replace(/\s*\d+\s*(?:TB|T|GB|G)\b.*$/i, "").trim() || cleaned;
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
  else if (/wifi/i.test(cleaned)) variant = "WiFi";
  let baseName = cleaned
    .replace(/\s*\d+\s*(?:TB|T|GB|G)\b/gi, "")
    .replace(/wifi\s*\+?\s*(?:5G|LTE|cellular|蜂窩|行動網路)/gi, "")
    .replace(/\b(?:wifi|5G|LTE|cellular|蜂窩|行動網路)\b/gi, "")
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

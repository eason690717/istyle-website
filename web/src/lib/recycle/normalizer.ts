// 把不同站的機型名稱標準化成 canonical key
export type Category = "phone" | "tablet" | "laptop_pro" | "laptop_air" | "desktop" | "console" | "dyson";

export interface ParsedModel {
  modelKey: string;
  category: Category;
  brand: string;
  modelName: string;
  storage?: string;
  variant?: string;
}

const STORAGE_NORM: Record<string, string> = {
  T: "TB", t: "TB", TB: "TB", tb: "TB",
  GB: "GB", G: "GB", g: "GB", gb: "GB",
};

function normalizeStorage(raw: string): string | undefined {
  const m = raw.match(/(\d+(?:\.\d+)?)\s*(TB|T|GB|G)\b/i);
  if (!m) return undefined;
  const num = m[1];
  const unit = STORAGE_NORM[m[2]] || "GB";
  return `${num}${unit}`;
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
  const baseName = cleaned.replace(/\s*\d+\s*(?:TB|T|GB|G)\b.*$/i, "").trim();
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

export function parseMacBook(raw: string, kind: "pro" | "air"): ParsedModel | null {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (!/macbook/i.test(cleaned)) return null;
  const storageMatches = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:TB|T|GB|G)\b/gi);
  const storage = storageMatches ? normalizeStorage(storageMatches[storageMatches.length - 1]) : undefined;
  const baseName = cleaned
    .replace(/\d+\s*(?:TB|T|GB|G)\b/gi, "")
    .replace(/[／\/]+/g, " ")
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
  const baseName = cleaned.replace(/\s*\d+\s*(?:TB|T|GB|G)\b.*$/i, "").trim() || cleaned;
  const modelKey = slugify(`${brand}-${baseName}${storage ? "-" + storage : ""}`);
  return { modelKey, category, brand, modelName: baseName, storage };
}

export function parseModelByCategory(raw: string, hint: Category): ParsedModel | null {
  switch (hint) {
    case "phone": return parseIphone(raw);
    case "tablet": return parseIpad(raw);
    case "laptop_pro": return parseMacBook(raw, "pro");
    case "laptop_air": return parseMacBook(raw, "air");
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

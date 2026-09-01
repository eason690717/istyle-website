// 機型/品牌正規化 — 全站唯一來源
// 所有 scraper / sync 寫入 RecyclePrice 前必須呼叫 normalize()
// 確保資料源頭一致，無需事後修補

const BRAND_NORM: Record<string, string> = {
  "SAMSUNG": "Samsung", "三星": "Samsung", "Samsung": "Samsung",
  "APPLE": "Apple", "蘋果": "Apple", "Apple": "Apple",
  "XIAOMI": "Xiaomi", "小米": "Xiaomi", "MI": "Xiaomi", "Xiaomi": "Xiaomi",
  "SONY": "Sony", "Sony": "Sony",
  "GOOGLE": "Google", "Google": "Google",
  "ASUS": "ASUS", "華碩": "ASUS",
  "OPPO": "OPPO",
  "VIVO": "vivo", "vivo": "vivo",
  "REDMI": "Redmi", "紅米": "Redmi", "Redmi": "Redmi",
  "POCO": "POCO",
  "REALME": "realme", "realme": "realme",
  "HUAWEI": "Huawei", "華為": "Huawei", "Huawei": "Huawei",
  "HTC": "HTC",
  "MOTOROLA": "motorola", "motorola": "motorola",
  "LENOVO": "Lenovo", "Lenovo": "Lenovo",
  "SHARP": "SHARP",
  "NOTHING": "Nothing", "Nothing": "Nothing",
  "HONOR": "HONOR",
  "BLACKSHARK": "黑鯊", "黑鯊": "黑鯊",
};

export function normalizeBrand(raw: string | null | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  return BRAND_NORM[trimmed.toUpperCase()] || BRAND_NORM[trimmed] || trimmed;
}

// 移除冗詞 / 行銷詞
const NOISE_PATTERNS = [
  /(舊機高額回收價|高額回收價|高價回收|回收價|現金回收價)/g,
  /(全新|二手|拆封|未拆封)/g,
];

// 模型代碼括號（如 "(S9380)"、"(SM-G990)"、"(A3084)"）
const MODEL_CODE_REGEX = /\s*[（(]\s*[A-Z][A-Z0-9-]*\s*[）)]\s*/g;

export function normalizeModelName(raw: string | null | undefined, _brandHint?: string): string {
  if (!raw) return "";
  let n = raw;

  // 1. 移除類別前綴（jyes：平板/手機/筆電…）
  n = n.replace(/^(平板|手機|筆電|筆記型電腦|遊戲主機|主機)\s+/i, "");

  // 2. 移除品牌前綴（中英文不分大小寫）
  const brandKeys = Object.keys(BRAND_NORM)
    .map(b => b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  n = n.replace(new RegExp(`^(${brandKeys})\\s+`, "i"), "");

  // 3. 再次移除類別前綴（品牌後可能還有）
  n = n.replace(/^(平板|手機|筆電|筆記型電腦)\s+/i, "");

  // 4. 移除括號內的型號代碼
  n = n.replace(MODEL_CODE_REGEX, " ");

  // 5. 移除行銷冗詞
  for (const re of NOISE_PATTERNS) n = n.replace(re, "");

  // 6. 統一「N 代」→「N」（避免 "iPad Air 4 代" vs "iPad Air 4" 不同）
  n = n.replace(/(\d+)\s*代/g, "$1");

  // 7. 統一空白
  n = n.replace(/\s+/g, " ").trim();

  return n;
}

// 真實存在的儲存容量。用白名單擋掉把「機型代號」或「行動網路世代」誤判成容量的情況：
//   「小米 15T」→ 15T 是機型不是容量（曾造成 modelName 被吃成「小米」、storage="15TB"）
//   「Redmi Pad 2 4G」→ 4G 是行動網路
//   「realme GT Neo 3T」→ 3T 是機型
const VALID_GB = new Set([8, 16, 32, 64, 128, 256, 512]);
const VALID_TB = new Set([1, 2, 4, 8]);

// 容量正規化：256G/256g/256GB → "256GB"，1T/1TB → "1TB"，1024GB → "1TB"
// 非白名單值一律回 null（寧可沒有容量，也不要錯的容量）
export function normalizeStorage(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.toString().match(/(\d+(?:\.\d+)?)\s*(TB|T|GB|G)\b/i);
  if (!m) return null;
  const num = parseFloat(m[1]);
  if (!Number.isFinite(num)) return null;
  const isTB = /^T/i.test(m[2]);
  if (!isTB && num === 1024) return "1TB";   // 1024GB 統一寫成 1TB
  if (isTB) return VALID_TB.has(num) ? `${num}TB` : null;
  return VALID_GB.has(num) ? `${num}GB` : null;
}

// 規格正規化：WiFi+5G / WiFi + 5G / Wi-Fi+LTE → "WiFi+5G" 或 "WiFi"
export function normalizeVariant(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.toString().trim();
  if (!s) return null;
  if (/wifi.*[+5g\sLTE行動]/i.test(s)) return "WiFi+5G";
  if (/wifi/i.test(s)) return "WiFi";
  return s;
}

// 產生 stable modelKey（用於 unique constraint）
// 同一機型不論來源，都得出相同的 key
export function buildModelKey(opts: {
  brand: string;
  modelName: string;
  storage?: string | null;
  variant?: string | null;
}): string {
  const slug = (s: string) =>
    s.toLowerCase()
      .replace(/[（）()]/g, "")
      .replace(/[\s_/\\.,'"`]+/g, "-")
      .replace(/[^a-z0-9一-鿿-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  const parts = [opts.brand, opts.modelName, opts.storage, opts.variant]
    .filter(Boolean)
    .map(p => slug(p as string));
  return parts.join("-");
}

// 一次正規化所有欄位（scraper 寫入前統一呼叫）
export function normalizeRecycleRow(input: {
  brand?: string | null;
  modelName: string;
  storage?: string | null;
  variant?: string | null;
}) {
  const brand = normalizeBrand(input.brand);
  const modelName = normalizeModelName(input.modelName, brand);
  const storage = normalizeStorage(input.storage);
  const variant = normalizeVariant(input.variant);
  const modelKey = buildModelKey({ brand, modelName, storage, variant });
  return { brand, modelName, storage, variant, modelKey };
}

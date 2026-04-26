// 共用正規化（與 src/lib/normalize-model.ts 同步）
// 給 .mjs scripts 用（aggregate.ts 用 TS 版）
const BRAND_NORM = {
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

export function normalizeBrand(raw) {
  if (!raw) return "";
  const t = raw.trim();
  return BRAND_NORM[t.toUpperCase()] || BRAND_NORM[t] || t;
}

export function normalizeModelName(raw) {
  if (!raw) return "";
  let n = raw;
  // 移除類別前綴（jyes 會加「平板」「手機」「筆電」）
  n = n.replace(/^(平板|手機|筆電|筆記型電腦|遊戲主機|主機)\s+/i, "");
  const brandKeys = Object.keys(BRAND_NORM)
    .map(b => b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  n = n.replace(new RegExp(`^(${brandKeys})\\s+`, "i"), "");
  // 再次移除類別前綴（品牌後可能還有）
  n = n.replace(/^(平板|手機|筆電|筆記型電腦)\s+/i, "");
  n = n.replace(/\s*[（(]\s*[A-Z][A-Z0-9-]*\s*[）)]\s*/g, " ");
  n = n.replace(/(舊機高額回收價|高額回收價|高價回收|回收價|現金回收價)/g, "");
  n = n.replace(/(全新|二手|拆封|未拆封)/g, "");
  // 統一「N 代」「N代」→ 移除「代」（容易重複）
  n = n.replace(/(\d+)\s*代/g, "$1");
  return n.replace(/\s+/g, " ").trim();
}

export function normalizeStorage(raw) {
  if (!raw) return null;
  const m = String(raw).match(/(\d+(?:\.\d+)?)\s*(TB|T|GB|G)\b/i);
  if (!m) return null;
  return `${m[1]}${/T/i.test(m[2]) ? "TB" : "GB"}`;
}

export function normalizeVariant(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/wifi.*[+5g\sLTE行動]/i.test(s)) return "WiFi+5G";
  if (/wifi/i.test(s)) return "WiFi";
  return s;
}

export function buildModelKey({ brand, modelName, storage, variant }) {
  const slug = (s) =>
    s.toLowerCase()
      .replace(/[（）()]/g, "")
      .replace(/[\s_/\\.,'"`]+/g, "-")
      .replace(/[^a-z0-9一-鿿-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  return [brand, modelName, storage, variant].filter(Boolean).map(slug).join("-");
}

export function normalizeRecycleRow(input) {
  const brand = normalizeBrand(input.brand);
  const modelName = normalizeModelName(input.modelName);
  const storage = normalizeStorage(input.storage);
  const variant = normalizeVariant(input.variant);
  const modelKey = buildModelKey({ brand, modelName, storage, variant });
  return { brand, modelName, storage, variant, modelKey };
}

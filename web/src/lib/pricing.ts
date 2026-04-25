// 售價計算工具（與 cerphone 公式一致）
// 公式：⌈ cerphone × 1.15 ⌉ 進位百
// 原廠版： ⌈ 標準 × 1.5 ⌉ 進位百

export const TIER_LABELS: Record<string, string> = {
  STANDARD: "標準版",
  OEM: "原廠版",
};

export const TIER_DESCRIPTIONS: Record<string, string> = {
  STANDARD: "副廠 OLED 螢幕／高品質副廠零件．保固 3 個月",
  OEM: "原廠拆機螢幕／APPLE 原廠零件．保固 3 個月",
};

export function ceilToHundred(n: number): number {
  return Math.ceil(n / 100) * 100;
}

export function formatTwd(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `NT$ ${n.toLocaleString("zh-TW")}`;
}

// 顯示售價：manualOverride 優先，否則 calculatedPrice
export function displayPrice(p: {
  manualOverride?: number | null;
  calculatedPrice?: number | null;
}): number | null {
  if (p.manualOverride != null) return p.manualOverride;
  if (p.calculatedPrice != null) return p.calculatedPrice;
  return null;
}

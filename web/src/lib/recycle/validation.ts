// 二手回收價合理性檢查 — 偵測異常值，避免 parser bug
import type { Category } from "./normalizer";

interface PriceRange {
  min: number;
  max: number;
}

// 各類別合理回收價範圍（NTD）
const PRICE_RANGES: Record<Category, PriceRange> = {
  phone:      { min: 200,   max: 80000 },
  tablet:     { min: 300,   max: 80000 },
  laptop_pro: { min: 1000,  max: 150000 },
  laptop_air: { min: 800,   max: 80000 },
  desktop:    { min: 1000,  max: 100000 },
  console:    { min: 200,   max: 30000 },
  dyson:      { min: 100,   max: 20000 },
};

export function isReasonablePrice(price: number, category: Category): boolean {
  const range = PRICE_RANGES[category];
  if (!range) return price > 100 && price < 100000;
  return price >= range.min && price <= range.max;
}

// strict 價格解析：必須是 $X,XXX 或 NT$X,XXX 或純數字（含逗號），其他一律 reject
export function strictParsePrice(s: string): number | null {
  if (!s) return null;
  const trimmed = s.trim();
  // 必須以 $ / NT$ / 數字開頭
  if (!/^(?:NT)?\$?\s?[\d,]+(?:\s|$)/.test(trimmed)) return null;
  const cleaned = trimmed.replace(/[NT$,，元\s]/g, "");
  const m = cleaned.match(/^(\d+)/);
  if (!m) return null;
  const n = parseInt(m[1]);
  return n > 0 ? n : null;
}

export interface PriceAnomaly {
  modelKey: string;
  modelName: string;
  source: "source1" | "source2" | "source3";
  price: number;
  category: Category;
  reason: string;
}

export function detectAnomaly(
  modelKey: string,
  modelName: string,
  source: "source1" | "source2" | "source3",
  price: number,
  category: Category,
  comparePrices?: { source1?: number | null; source2?: number | null; source3?: number | null },
): PriceAnomaly | null {
  if (!isReasonablePrice(price, category)) {
    return {
      modelKey, modelName, source, price, category,
      reason: `超出 ${category} 合理範圍 ${PRICE_RANGES[category]?.min}-${PRICE_RANGES[category]?.max}`,
    };
  }
  // 跨來源差異 > 5x → 警示
  if (comparePrices) {
    const others = [comparePrices.source1, comparePrices.source2, comparePrices.source3]
      .filter((p): p is number => typeof p === "number" && p > 0);
    if (others.length > 0) {
      const min = Math.min(...others);
      const max = Math.max(...others);
      const ratio = max / min;
      if (ratio > 5) {
        return {
          modelKey, modelName, source, price, category,
          reason: `來源價差過大 ${min}-${max}（${ratio.toFixed(1)}x）`,
        };
      }
    }
  }
  return null;
}

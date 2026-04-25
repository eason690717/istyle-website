// 機型相關 helper：從 slug 找到 RecyclePrice 配對
import { prisma } from "@/lib/prisma";

// 從機型名稱找到對應的二手回收價（fuzzy match）
export async function findRecyclePricesForModel(modelName: string) {
  // 把機型名稱拆 token，找回收表中所有 token 都包含的機型
  const tokens = modelName
    .toLowerCase()
    .replace(/[（）()]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 1);

  if (tokens.length === 0) return [];

  // 抓所有可能候選（先用第一個 token 過濾減量）
  const candidates = await prisma.recyclePrice.findMany({
    where: {
      isAvailable: true,
      minPrice: { not: null },
    },
    take: 200,
  }).catch(() => []);

  // 全部 token 都要 match
  const matched = candidates.filter(c => {
    const haystack = `${c.brand} ${c.modelName}`.toLowerCase();
    return tokens.every(t => haystack.includes(t));
  });

  // 按容量排序
  return matched.sort((a, b) => (b.minPrice || 0) - (a.minPrice || 0));
}

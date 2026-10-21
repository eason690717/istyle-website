// 自動文章類型 → 列表與內頁顯示的標籤（兩處共用，避免各寫一套）
const LABELS: Record<string, string> = {
  knowledge: "知識",
  trouble_article: "維修指南",
  weekly_recycle: "週報",
  brand_guide: "品牌指南",
  care_tips: "保養",
  monthly_summary: "月報",
};
export const articleKindLabel = (kind: string) => LABELS[kind] ?? "文章";

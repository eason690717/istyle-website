// 維修課程資料（1-2 級維修，不教主機板 BGA）
// 業界市場行情參考: 私立培訓 NT$8K-45K、線上 NT$3K-8K、家教時計 NT$1.5K-3K/hr
// i時代定位：實作密集、贈練習機、結業送進貨折扣，鎖定想開店或副業者
export interface Course {
  slug: string;
  level: 1 | 2 | 3;        // 1=基礎 / 2=進階 / 3=職業全套
  title: string;
  subtitle: string;
  hours: number;
  durationLabel: string;   // "半天" / "兩天" / "兩週"
  price: number;
  earlyBirdPrice?: number; // 早鳥價
  highlights: string[];
  curriculum: string[];    // 課綱
  includes: string[];      // 包含
  recommended: string[];   // 適合誰
  popular?: boolean;
}

export const COURSES: Course[] = [
  {
    slug: "level-1-basic",
    level: 1,
    title: "L1 基礎實作班",
    subtitle: "半天搞懂 iPhone 換螢幕 + 換電池",
    hours: 4,
    durationLabel: "半天 4 小時",
    price: 3800,
    earlyBirdPrice: 3200,
    highlights: [
      "親手拆裝 iPhone 螢幕＋貼防水膠",
      "電池健康度判讀＋安全更換",
      "結業送 NT$300 維修代金券",
    ],
    curriculum: [
      "工具認識：拆機刀、吸盤、撥棒、防靜電墊",
      "iPhone 螢幕拆解 SOP（含 Face ID 排線保護）",
      "螢幕組合 + 防水膠重貼",
      "電池拆裝 + 健康度認證",
      "螢幕測試（觸控、3D Touch、TrueTone）",
      "常見錯誤排除：螢幕綠線、觸控失靈、電池循環過高",
    ],
    includes: [
      "教材講義（電子版 + 影片回看 30 天）",
      "練習用 iPhone 螢幕 + 電池各 1 組",
      "結業證書",
      "i時代 LINE 群終身技術 Q&A",
    ],
    recommended: [
      "想自己動手修家人手機的人",
      "副業／斜槓開始",
      "電商賣家想學售後維修",
    ],
  },
  {
    slug: "level-2-advanced",
    level: 2,
    title: "L2 進階實作班",
    subtitle: "覆蓋 iPhone / iPad / Switch 全方位 1-2 級維修",
    hours: 12,
    durationLabel: "兩天 12 小時",
    price: 13800,
    earlyBirdPrice: 11800,
    popular: true,
    highlights: [
      "L1 全部內容 + 充電孔更換（不含主機板）",
      "iPad 拆機 + Switch 搖桿維修",
      "面框翻新 + 邊框拋光技術",
      "結業送 NT$1,000 維修代金券",
    ],
    curriculum: [
      "L1 全部課綱（複習 + 加深）",
      "充電孔模組更換（Type-C / Lightning，免動主機板）",
      "鏡頭模組 / 聽筒 / 震動馬達 / 喇叭",
      "iPad 螢幕 + 電池拆裝（背膠處理）",
      "Switch 搖桿漂移修復（蘑菇頭更換）",
      "iPhone 面框校正 + 邊框拋光（讓二手機售價提升 NT$2,000+）",
      "客戶溝通：報價話術、不修不收費 SOP",
    ],
    includes: [
      "L1 全部教材",
      "練習用零件包：3 組螢幕 + 3 組電池 + 1 組充電孔模組",
      "1 台練習機（學員可帶回，含主機板 + 外殼）",
      "面框拋光工具組",
      "結業證書 + i時代官方認證",
      "i時代 LINE 群終身技術 Q&A",
    ],
    recommended: [
      "計畫開實體維修店",
      "想轉行成全職維修師",
      "已有 L1 基礎想升級",
    ],
  },
  {
    slug: "pro-career",
    level: 3,
    title: "全套職業養成班",
    subtitle: "從零到開店，一次學完所有 1-2 級技術 + 經營 SOP",
    hours: 40,
    durationLabel: "兩週 40 小時",
    price: 32800,
    earlyBirdPrice: 28800,
    highlights: [
      "L1 + L2 全部內容",
      "額外加碼：進水救援 / 資料備份",
      "開店 SOP：耗材清單 / 供應商 / 客戶管理",
      "結業送 i時代進貨 8 折，終身有效",
    ],
    curriculum: [
      "L1 + L2 全部課綱",
      "進水救援 SOP（不拆 BGA）：超音波清洗、防鏽塗層",
      "資料備份 / 救援基礎",
      "MacBook 鍵盤 / 電池更換（A1990 後機型）",
      "Dyson 馬達 / 電池更換",
      "客戶心理學：如何處理「老闆是不是你 ㄍㄠ 我」",
      "成本計算 + 透明報價公式（i時代實戰版）",
      "供應商清單與議價（業界內幕）",
      "店面選址 + 月成本估算",
      "Google Reviews 經營 + LINE 客戶導流",
    ],
    includes: [
      "L1 + L2 全部教材",
      "10 組練習零件 + 2 台練習機",
      "經營手冊（紙本 + Notion 樣版）",
      "i時代 POS / 庫存系統 6 個月免費試用",
      "結業 i時代官方師資認證",
      "終身 i時代進貨 8 折",
    ],
    recommended: [
      "認真要開店做生意",
      "想完整投入手機維修產業",
      "離職轉行、退休再職",
    ],
  },
];

export function getCourseBySlug(slug: string): Course | undefined {
  return COURSES.find(c => c.slug === slug);
}

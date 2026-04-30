// 維修課程資料（1-2 級維修，不教主機板 BGA）
// 業界市場行情參考: 私立培訓 NT$8K-45K、線上 NT$3K-8K、家教時計 NT$1.5K-3K/hr
// i時代定位：實作密集、贈練習機、結業送進貨折扣，鎖定想開店或副業者
//
// 2026-04-29 改版：拿掉 Switch，分 iPhone 班 / Android 班 / 全系列班
export interface Course {
  slug: string;
  brandFocus: "apple" | "android" | "all";  // 品牌焦點，影響卡片配色
  title: string;
  subtitle: string;
  hours: number;
  durationLabel: string;   // "兩天" / "四天"
  price: number;
  earlyBirdPrice?: number;
  highlights: string[];
  curriculum: string[];
  includes: string[];
  recommended: string[];
  popular?: boolean;
}

export const COURSES: Course[] = [
  {
    slug: "iphone-class",
    brandFocus: "apple",
    title: "iPhone 維修班",
    subtitle: "從拆機到組裝，iPhone 1-2 級維修一次學會",
    hours: 12,
    durationLabel: "兩天 12 小時",
    price: 13800,
    earlyBirdPrice: 11800,
    popular: true,
    highlights: [
      "iPhone 全系列拆機 SOP（含 iPhone 16 Pro Max 最新機型）",
      "螢幕＋防水膠＋Face ID 排線完整流程",
      "電池 + 充電孔 + 鏡頭 + 周邊模組",
      "送 1 台 iPhone 練習機（含主機板可拆）",
    ],
    curriculum: [
      "工具認識：拆機刀、吸盤、撥棒、防靜電墊、熱風槍",
      "iPhone 各代差異與拆解 SOP（iPhone 11 ~ iPhone 16 系列）",
      "螢幕模組更換：含 Face ID 排線保護、True Tone 校正",
      "電池更換：健康度判讀、循環次數、安全處理（防爆）",
      "充電孔模組更換（不動主機板，免焊接）",
      "後鏡頭 / 聽筒 / 震動馬達 / 喇叭",
      "防水膠重貼 + 面框翻新（讓二手機售價提升 NT$2,000+）",
      "螢幕測試：觸控、3D Touch、TrueTone、感應器校正",
      "常見錯誤排除：綠線、觸控失靈、無服務、電池循環過高",
      "客戶溝通：報價話術、不修不收費 SOP",
    ],
    includes: [
      "教材講義（電子版 + 影片回看 30 天）",
      "練習零件：3 組 iPhone 螢幕 + 3 組電池 + 1 組充電孔模組",
      "1 台 iPhone 練習機（學員可帶回，含主機板 + 外殼）",
      "面框拋光工具組",
      "結業證書 + i時代官方認證",
      "i時代 LINE 群終身技術 Q&A",
    ],
    recommended: [
      "想學最熱門機型，立刻接案",
      "iPhone 用戶想自己修家人手機",
      "計畫開店主打 iPhone 維修",
    ],
  },
  {
    slug: "android-class",
    brandFocus: "android",
    title: "Android 維修班",
    subtitle: "Samsung / Pixel / Xiaomi / OPPO / Sony / ASUS 全方位",
    hours: 12,
    durationLabel: "兩天 12 小時",
    price: 12800,
    earlyBirdPrice: 10800,
    highlights: [
      "Samsung OLED 螢幕拆解（黏框最難拆）",
      "Pixel / Xiaomi / OPPO 等 6 大品牌差異",
      "背蓋玻璃 + 電池更換 SOP",
      "送 1 台 Android 練習機（含主機板可拆）",
    ],
    curriculum: [
      "Android 維修生態與 6 大品牌差異",
      "Samsung 系列：S20-S25、Note、Z Fold/Flip 拆解",
      "Samsung OLED 螢幕黏框處理（最難的部分）",
      "Pixel 系列：6/7/8/9 螢幕＋電池",
      "小米 / OPPO / vivo 拆機 SOP",
      "Sony Xperia / ASUS ROG 拆解差異",
      "背蓋玻璃更換（含黏膠處理）",
      "Type-C 充電孔模組更換",
      "鏡頭 / 聽筒 / 震動馬達 / 喇叭",
      "顯示測試 + 觸控 + 指紋識別校正",
      "常見故障：綠屏、烙印、無充電、無訊號",
      "客戶溝通與報價話術",
    ],
    includes: [
      "教材講義（電子版 + 影片回看 30 天）",
      "練習零件：2 組 Samsung 螢幕 + 1 組 Pixel + 2 組電池 + 1 組充電孔",
      "1 台 Android 練習機（學員可帶回，含主機板 + 外殼）",
      "黏框工具組（給力膠刮刀、加熱墊）",
      "結業證書 + i時代官方認證",
      "i時代 LINE 群終身技術 Q&A",
    ],
    recommended: [
      "Android 市場份額仍高，避開 iPhone 紅海",
      "客戶以 Samsung / Pixel / 小米為主",
      "想接案多品牌維修",
    ],
  },
  {
    slug: "full-pro-class",
    brandFocus: "all",
    title: "全系列職業養成班",
    subtitle: "iPhone + Android + iPad 三大主力，從零到開店一次到位",
    hours: 40,
    durationLabel: "四天 40 小時",
    price: 32800,
    earlyBirdPrice: 28800,
    highlights: [
      "iPhone 班 + Android 班 全部內容",
      "額外加 iPad 拆機（背膠處理 + 大螢幕）",
      "進水救援 SOP（不拆 BGA）",
      "完整開店 SOP：供應商 / 定價 / 客戶心理",
      "結業送 i時代進貨 8 折，終身有效",
    ],
    curriculum: [
      "【iPhone 模組】iPhone 班全部內容（12 小時）",
      "【Android 模組】Android 班全部內容（12 小時）",
      "【iPad 模組】iPad Pro / Air / mini 拆機 SOP（背膠 + 大螢幕翻轉）",
      "【iPad 模組】iPad 螢幕 + 電池更換（與 iPhone 差異）",
      "【iPad 模組】Apple Pencil 配對與校正",
      "【經營模組】進水救援 SOP（超音波清洗、防鏽塗層）",
      "【經營模組】資料備份 / 救援基礎",
      "【經營模組】成本計算 + 透明報價公式（i時代實戰版）",
      "【經營模組】供應商清單與議價（業界內幕）",
      "【經營模組】客戶心理學：「老闆是不是 ㄍㄠ 我」處理",
      "【經營模組】店面選址 + 月成本估算",
      "【經營模組】Google Reviews 經營 + LINE 客戶導流",
    ],
    includes: [
      "iPhone 班 + Android 班 全部教材",
      "iPad 拆機教材（含背膠工具）",
      "10 組練習零件（含 iPad 螢幕 1 組）",
      "2 台練習機（iPhone + Android 各 1）",
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

// 全站固定設定（可從 SiteSetting 表覆寫，但這裡是預設）
export const SITE = {
  name: "i時代",
  legalName: "愛時代國際股份有限公司",
  tagline: "手機維修專家",
  description:
    "板橋・江子翠｜iPhone・iPad・MacBook・Switch・Dyson 全方位維修．14 年技術經驗．透明報價．當日完工",
  shortSlogan: "板橋維修．找 i時代",
  url: "https://www.i-style.store",
  ogImage: "/logo.png",
  // 聯絡資訊
  phone: "02-8252-7208",
  phoneRaw: "0282527208",
  lineId: "@563amdnh",
  lineAddUrl: "https://line.me/R/ti/p/@563amdnh",
  email: "admin@i-style.store",
  // 地點
  address: {
    street: "新北市板橋區",
    city: "新北市",
    district: "板橋區",
    zipcode: "220",
    country: "台灣",
  },
  googleMapsUrl: "https://maps.google.com/?q=i時代+手機維修+板橋",
  // 營業時間（24h 制；Open Mon-Sun）
  businessHours: [
    { days: "Mon-Sun", open: "11:00", close: "20:00" },
  ],
  // SEO 關鍵字
  keywords: [
    "板橋手機維修", "江子翠手機維修", "新北手機維修",
    "iPhone維修", "iPad維修", "MacBook維修",
    "Switch維修", "Dyson維修", "板橋換螢幕",
    "板橋換電池", "手機急救", "現場維修",
    "二手機回收", "iPhone回收",
  ],
  // 信任訊號
  founded: 2011,
  experienceYears: () => new Date().getFullYear() - 2011,
  repairsCount: "10,000+",
  // 主品牌支援（用於 hero 顯示）
  supportedBrands: ["Apple", "Samsung", "Google", "Sony", "ASUS", "OPPO", "Xiaomi", "Switch", "Dyson"],
} as const;

export type Site = typeof SITE;

// SEO 長尾流量殺手 — 每個服務頁面對應一組高流量關鍵字
// 例：「iPhone 螢幕破裂維修費用」「板橋換 iPhone 電池」
// 每頁完整解答常見問題、含價位範圍、CTA、相關內部連結

export interface ServiceLandingPage {
  slug: string;
  title: string;             // <h1> & meta title
  shortTitle: string;        // 卡片用
  category: "phone" | "tablet" | "laptop" | "console" | "appliance";
  brand?: string;
  intro: string;             // <p> 開頭，含關鍵字
  description: string;       // meta description
  keywords: string[];
  priceRange: { min: number; max: number };
  estimatedTime: string;
  warranty: string;
  whatWeReplace: string[];
  whyChooseUs: string[];
  faqs: Array<{ q: string; a: string }>;
  relatedSlugs?: string[];
}

export const SERVICES: ServiceLandingPage[] = [
  {
    slug: "iphone-screen-repair",
    title: "iPhone 螢幕維修｜板橋手機螢幕破裂、玻璃換修",
    shortTitle: "iPhone 螢幕維修",
    category: "phone",
    brand: "Apple",
    intro: "iPhone 螢幕破裂、觸控失靈、顯示異常？i時代提供 iPhone 6 到最新機型全系列螢幕維修，副廠 OLED 與 APPLE 原廠拆機螢幕雙選擇，板橋現場 30 分鐘交件。",
    description: "i時代 iPhone 螢幕維修專門店，板橋江子翠 14 年技術經驗。副廠 OLED $1,800 起，APPLE 原廠拆機螢幕透明報價，當日完工，保固 3 個月。",
    keywords: ["iPhone螢幕維修", "iPhone換螢幕", "iPhone玻璃破裂", "板橋換iPhone螢幕", "iPhone OLED 維修"],
    priceRange: { min: 1800, max: 14200 },
    estimatedTime: "30 分鐘 – 1 小時",
    warranty: "3 個月",
    whatWeReplace: [
      "外玻璃破裂（玻璃換修）",
      "完整螢幕總成更換（含 OLED）",
      "APPLE 原廠拆機螢幕（含 True Tone 校色）",
      "Face ID 排線維修",
    ],
    whyChooseUs: [
      "14 年實戰經驗，累積維修超過 10,000 台 iPhone",
      "提供副廠 OLED 與 APPLE 原廠雙選擇，價差透明",
      "現場 30 分鐘 – 1 小時完工，當日取件",
      "保固 3 個月，同部位故障免費再修",
    ],
    faqs: [
      { q: "iPhone 螢幕破裂維修要多少錢？", a: "副廠 OLED 螢幕從 $1,800 起，APPLE 原廠拆機螢幕視機型 $4,500 – $14,200。詳細價目請見維修報價頁。" },
      { q: "螢幕破裂可以只換玻璃嗎？", a: "外玻璃破裂但顯示正常，可只換外玻璃，價格較低。若顯示異常或觸控失靈，需更換完整螢幕總成。" },
      { q: "副廠 OLED 跟原廠螢幕差在哪？", a: "副廠 OLED 顯示效果接近原廠且價格便宜；APPLE 原廠拆機螢幕保留 True Tone、Face ID 校準完整，但價格較高。" },
      { q: "螢幕維修要多久時間？", a: "通常 30 分鐘 – 1 小時。複雜機型或排線異常可能需 2 小時以上。" },
      { q: "維修後資料會不見嗎？", a: "螢幕維修不需動到主機板與儲存空間，資料完全保留。仍建議事先備份以策安全。" },
    ],
    relatedSlugs: ["iphone-battery-replacement", "ipad-screen-repair"],
  },
  {
    slug: "iphone-battery-replacement",
    title: "iPhone 換電池｜認證電池高 CP 值首選｜板橋現場 30 分鐘",
    shortTitle: "iPhone 換電池",
    category: "phone",
    brand: "Apple",
    intro: "iPhone 電池健康度過低、自動關機、電池膨脹頂起螢幕？i時代強力推薦【認證電池】— 容量、性能、循環次數與原廠相同，價格僅原廠 1/2，板橋現場 30 分鐘完工，保固 6 個月。",
    description: "iPhone 換電池推薦認證電池！容量足、性能等同原廠、保固 6 個月，板橋江子翠 14 年技術，現場 30 分鐘完工。",
    keywords: ["iPhone 認證電池", "iPhone 換電池", "iPhone 電池膨脹", "iPhone 電池維修", "板橋換 iPhone 電池"],
    priceRange: { min: 1500, max: 4100 },
    estimatedTime: "30 分鐘",
    warranty: "認證電池 6 個月、原廠 3 個月",
    whatWeReplace: [
      "★【推薦】認證電池：容量等同原廠、循環次數新、保固 6 個月、價格僅原廠 1/2",
      "APPLE 原廠電池：可顯示電池健康度，價格較高（建議資產車或極度敏感用戶）",
      "電池膨脹處理（含螢幕重新貼合）",
    ],
    whyChooseUs: [
      "認證電池 = 原廠晶片 + 同等級電芯 + KC/CE/BSMI 認證",
      "保固期更長（6 個月，原廠僅 3 個月）",
      "性能與原廠完全一致：續航、充電速度、最大瞬間放電",
      "現場 30 分鐘完工，免留機",
      "電池膨脹處理含螢幕重新貼合，外觀復原",
    ],
    faqs: [
      { q: "為什麼推薦認證電池而不是原廠？", a: "認證電池採用與原廠相同等級的電芯與保護晶片，通過 KC/CE/BSMI 國際認證。實際使用容量、續航、充電速度與原廠無感差異，但價格僅約原廠 1/2，加上保固延長到 6 個月，CP 值最高。原廠電池僅在「資產列管」「極度敏感」「需顯示電池健康度」時才推薦。" },
      { q: "認證電池會顯示「無法驗證」嗎？", a: "iOS 14 之後第三方電池會顯示「無法驗證此 iPhone 電池」訊息，但不影響使用、續航、安全性。如非常在意此訊息，可選擇原廠電池（價格高約一倍）。" },
      { q: "認證電池容量會比較少嗎？", a: "不會。認證電池採用 100% 原廠相同 mAh 規格，部分高階版甚至加大 5-10% 容量。" },
      { q: "換電池要多少錢？", a: "★ 認證電池 $1,500 起（推薦）；APPLE 原廠電池視機型 $2,800–$4,100。" },
      { q: "電池膨脹該怎麼辦？", a: "電池膨脹會持續頂壓螢幕、可能造成短路或起火，建議立即停用並送修。i時代可現場處理含螢幕重新貼合，外觀復原。" },
      { q: "電池維修保固多久？", a: "認證電池保固 6 個月，APPLE 原廠保固 3 個月。期間非人為損壞免費再修。" },
    ],
    relatedSlugs: ["iphone-screen-repair", "macbook-battery-replacement"],
  },
  {
    slug: "ipad-screen-repair",
    title: "iPad 螢幕維修｜玻璃破裂、液晶換修｜板橋現場維修",
    shortTitle: "iPad 螢幕維修",
    category: "tablet",
    brand: "Apple",
    intro: "iPad 玻璃破裂、液晶損壞？i時代提供 iPad 全系列螢幕維修，含 iPad mini、iPad Air、iPad Pro，板橋現場專業維修，當日完工。",
    description: "i時代 iPad 螢幕維修：iPad / iPad mini / iPad Air / iPad Pro 全系列玻璃換修、液晶更換，板橋江子翠現場維修，保固 3 個月。",
    keywords: ["iPad 螢幕維修", "iPad 玻璃破裂", "iPad 液晶維修", "板橋換 iPad 螢幕"],
    priceRange: { min: 1500, max: 8500 },
    estimatedTime: "1 – 3 小時",
    warranty: "3 個月",
    whatWeReplace: ["外玻璃破裂", "液晶顯示異常", "觸控失靈", "Apple Pencil 觸控故障"],
    whyChooseUs: [
      "全系列 iPad 支援，含最新 iPad Pro M4",
      "玻璃 / 液晶分開報價，依實際狀況收費",
      "現場拆機，避免運送二次損傷",
      "原廠 / 副廠雙選擇",
    ],
    faqs: [
      { q: "iPad 螢幕維修要多久？", a: "一般 1 – 3 小時，視機型與膠合難度。" },
      { q: "iPad 玻璃跟液晶可以分開換嗎？", a: "舊機型可分開（單純玻璃破裂），新機型多採全貼合，需整片更換。會在現場確認後報價。" },
    ],
    relatedSlugs: ["iphone-screen-repair", "macbook-screen-repair"],
  },
  {
    slug: "macbook-battery-replacement",
    title: "MacBook 換電池｜MacBook Air / Pro 電池膨脹處理",
    shortTitle: "MacBook 換電池",
    category: "laptop",
    brand: "Apple",
    intro: "MacBook 電池循環次數過高、續航力大幅下降、電池膨脹頂起鍵盤？i時代提供 MacBook Air / MacBook Pro 全系列電池更換，含 M1 / M2 / M3 / M4 機型。",
    description: "i時代 MacBook 換電池：Air / Pro 全系列含 M1–M4，板橋專業維修，避免電池膨脹造成更大損害。",
    keywords: ["MacBook 換電池", "MacBook 電池膨脹", "MacBook Pro 電池維修", "MacBook Air 換電池"],
    priceRange: { min: 4000, max: 12000 },
    estimatedTime: "2 – 4 小時",
    warranty: "3 個月",
    whatWeReplace: ["MacBook Air 電池", "MacBook Pro 電池", "電池膨脹處理", "充電模組維修"],
    whyChooseUs: ["熟悉 M1/M2/M3/M4 各代差異", "現場拆機、不寄送", "保留資料"],
    faqs: [
      { q: "MacBook 電池循環幾次該換？", a: "原廠標準是 1000 次循環內保持 80% 容量。實際使用感降低、突然關機就建議更換。" },
      { q: "M 系列 MacBook 換電池會影響保固嗎？", a: "如果還在 AppleCare 保固期，建議先送 Apple。過保後可由我們維修，提供 3 個月保固。" },
    ],
    relatedSlugs: ["iphone-battery-replacement", "macbook-screen-repair"],
  },
  {
    slug: "macbook-screen-repair",
    title: "MacBook 螢幕維修｜液晶破裂、Touch Bar 維修",
    shortTitle: "MacBook 螢幕維修",
    category: "laptop",
    brand: "Apple",
    intro: "MacBook 螢幕破裂、出現亮線、Touch Bar 失靈？i時代提供 MacBook Air / Pro 全系列螢幕與 Touch Bar 維修，副廠液晶或原廠螢幕雙選擇。",
    description: "i時代 MacBook 螢幕維修：Air / Pro 副廠液晶 $7,500 起、原廠螢幕透明報價，含 Touch Bar、鍵盤、觸控板等。",
    keywords: ["MacBook 螢幕維修", "MacBook 液晶破裂", "MacBook Touch Bar 維修", "MacBook Pro 換螢幕"],
    priceRange: { min: 7500, max: 22000 },
    estimatedTime: "1 – 3 天",
    warranty: "3 個月",
    whatWeReplace: ["副廠液晶總成", "原廠螢幕（含 ProMotion）", "Touch Bar", "鍵盤"],
    whyChooseUs: ["副廠液晶價格僅原廠 1/2", "Touch Bar 也可單獨維修", "現場估價"],
    faqs: [
      { q: "副廠液晶跟原廠螢幕差在哪？", a: "色彩、亮度、ProMotion 高刷略有差異，副廠價格約原廠 1/2。一般文書用幾乎無感差異。" },
    ],
    relatedSlugs: ["macbook-battery-replacement"],
  },
  {
    slug: "switch-screen-repair",
    title: "Nintendo Switch 維修｜螢幕、磨菇頭、卡槽故障",
    shortTitle: "Switch 維修",
    category: "console",
    brand: "Nintendo",
    intro: "Switch 螢幕破裂、搖桿磨菇頭飄移、卡槽讀不到、無法充電？i時代提供 Switch 全系列維修，含一般版、Lite、OLED 版。",
    description: "i時代 Nintendo Switch 維修：螢幕、磨菇頭、卡槽、充電孔、電池等，含 OLED 版，板橋現場維修。",
    keywords: ["Switch 維修", "Switch 磨菇頭", "Switch 螢幕維修", "Switch 卡槽故障", "Switch OLED 維修"],
    priceRange: { min: 800, max: 5800 },
    estimatedTime: "1 – 3 天",
    warranty: "3 個月",
    whatWeReplace: ["螢幕總成", "磨菇頭（搖桿飄移）", "卡槽", "充電孔", "電池", "風扇"],
    whyChooseUs: ["熟悉一般版 / Lite / OLED", "磨菇頭單支可換", "卡槽異物清理"],
    faqs: [
      { q: "Switch 磨菇頭飄移要換多少錢？", a: "副廠磨菇頭單支 $800 起，含工資。" },
      { q: "Switch OLED 螢幕破裂可以修嗎？", a: "可以，OLED 版螢幕維修較複雜，價格約 $5,800。" },
    ],
  },
  {
    slug: "dyson-battery-replacement",
    title: "Dyson 吸塵器電池更換｜V8/V10/V11/V15 維修",
    shortTitle: "Dyson 換電池",
    category: "appliance",
    brand: "Dyson",
    intro: "Dyson 吸塵器續航時間大幅縮短、無法開機？i時代提供 Dyson V6/V7/V8/V10/V11/V15 全系列電池更換與料件維修。",
    description: "i時代 Dyson 維修：V 系列吸塵器電池更換、馬達維修、濾網更換，板橋專業處理。",
    keywords: ["Dyson 維修", "Dyson 電池更換", "Dyson 吸塵器維修", "V8 V10 V11 電池"],
    priceRange: { min: 1500, max: 5000 },
    estimatedTime: "現場 30 分鐘",
    warranty: "3 個月",
    whatWeReplace: ["V6/V7/V8 電池", "V10/V11/V15 電池", "馬達", "濾網", "卡扣"],
    whyChooseUs: ["副廠電池高容量、續航更長", "現場 30 分鐘", "保固 3 個月"],
    faqs: [
      { q: "Dyson 換電池要多久？", a: "現場約 30 分鐘可完成。" },
    ],
  },
];

export function getService(slug: string) {
  return SERVICES.find(s => s.slug === slug);
}

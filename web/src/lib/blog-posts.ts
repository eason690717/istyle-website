// Blog 內容庫 — SEO 長尾流量主力
// 每篇文章精心設計 H1 / meta / FAQ，含 Article + FAQPage Schema
// 目標關鍵字為 Google / AI 搜尋常見查詢

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  metaDescription: string;
  keywords: string[];
  coverImage: string;
  category: "tips" | "pricing" | "comparison" | "guide" | "trouble";
  author: string;
  publishedAt: string;  // YYYY-MM-DD
  readingMinutes: number;
  body: string;  // Markdown-ish，用 H2/H3 分段
  faqs?: Array<{ q: string; a: string }>;
  relatedSlugs?: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "iphone-screen-repair-cost-2026",
    title: "2026 iPhone 螢幕破裂維修費用完整指南｜副廠 vs 原廠怎麼選",
    excerpt: "iPhone 螢幕破裂維修費用從 $1,800 到 $14,000 不等，差在哪裡？本文完整解析副廠 OLED、原廠拆機、全新原廠三種選擇，讓您花對錢。",
    metaDescription: "2026 最新 iPhone 螢幕維修費用表，副廠 OLED 從 $1,800 起，原廠拆機從 $4,500 起。板橋 i時代 14 年技術經驗，30 分鐘完工。",
    keywords: ["iPhone 螢幕維修費用", "iPhone 螢幕破裂 多少錢", "iPhone 螢幕副廠 原廠 差異", "iPhone 換螢幕 2026", "板橋 iPhone 螢幕維修"],
    coverImage: "/cases/iphone-broken-screen.jpg",
    category: "pricing",
    author: "i時代團隊",
    publishedAt: "2026-04-20",
    readingMinutes: 6,
    body: `## iPhone 螢幕維修費用為什麼差這麼多？

很多客戶第一次送修時會疑惑：為什麼同樣是 iPhone 15 Pro Max 的螢幕，有人報價 $5,200，有人報價 $14,200？差在哪？

答案在「**螢幕來源等級**」。iPhone 螢幕從便宜到貴大致分三種：

### 1. 副廠 OLED 螢幕（$1,800 起）

由第三方廠商生產的 OLED 面板，**色彩、亮度、觸控反應與原廠接近**，差異主要在：
- 無法顯示「原廠螢幕」驗證
- 極限亮度略低（一般使用無感）
- 價格僅原廠 1/3

**適合客群**：機型 3 年以上、預算緊、實用為主。

### 2. APPLE 原廠拆機螢幕（$4,500 起）

從原廠完整機拆下來的螢幕，**True Tone、Face ID 校準全保留**，所有功能與新機一樣。
- 需關閉「尋找 iPhone」功能才能進行
- 價格約為全新原廠的 6 成

**適合客群**：機型 2 年內、追求接近原廠體驗。

### 3. 全新原廠螢幕（$12,000 起）

透過 Apple 原廠供應鏈取得的全新螢幕，**等同新機出廠規格**。
- 含新的保護貼、觸控層
- 最貴但最完整

**適合客群**：iPhone 16 / 17 Pro 等高階新機、對品質零妥協。

## 2026 各機型螢幕維修價格一覽

| 機型 | 副廠 OLED | 原廠拆機 | 全新原廠 |
|---|---:|---:|---:|
| iPhone 17 Pro Max | $6,000 | $13,300 | $14,200 |
| iPhone 17 Pro | $6,000 | $12,000 | $12,500 |
| iPhone 16 Pro Max | $5,800 | $10,500 | $14,200 |
| iPhone 15 Pro Max | $5,200 | $9,600 | $14,200 |
| iPhone 14 Pro | $3,000 | $5,500 | $10,800 |
| iPhone 13 | $4,100 | — | $9,000 |

## 我該選哪一種？

**用「**2 年法則**」判斷**：
- 買了不到 2 年 → 選原廠拆機
- 2 年以上 → 選副廠 OLED
- 當作工作備用機 → 副廠 OLED 就夠

## 修螢幕後我的資料會不見嗎？

**不會**。螢幕維修不動儲存晶片與主機板，資料完全保留。但仍建議事先備份。

## 維修需要多久？

**副廠 OLED** 平均 30 分鐘。**原廠拆機** 約 1 小時（需重新校準）。現場等候即可取件。

## i時代為什麼推薦我們？

- **14 年技術經驗**：累積維修超過 10,000 台 iPhone
- **透明價目**：線上即可查詢，無隱藏費用
- **保固 3 個月**：同部位故障免費再修
- **板橋現場維修**：江子翠商圈，近捷運
`,
    faqs: [
      { q: "iPhone 螢幕維修保固多久？", a: "i時代維修保固 3 個月，期間非人為損壞同部位故障可免費再修。" },
      { q: "副廠 OLED 會顯示「無法驗證」嗎？", a: "iOS 15.2 之後第三方螢幕會顯示「無法驗證此 iPhone 螢幕」訊息，但不影響使用。若極度在意可選原廠拆機。" },
      { q: "維修後 Face ID 還能用嗎？", a: "原廠拆機螢幕保留 Face ID 校準；副廠 OLED 通常也保留，但少數機型需重新設定。" },
    ],
    relatedSlugs: ["iphone-battery-should-replace", "sell-old-iphone-tips"],
  },
  {
    slug: "iphone-battery-should-replace",
    title: "iPhone 電池健康度低於 80% 該換嗎？省錢換電池完整攻略",
    excerpt: "iPhone 電池健康度降到 80% 以下突然關機？本文告訴您什麼時候該換電池、認證電池 vs 原廠電池差在哪、怎麼省最多錢。",
    metaDescription: "iPhone 電池健康度 80% 以下自動關機、續航大減？i時代認證電池從 $1,500 起，原廠從 $2,800 起，板橋 30 分鐘完工。",
    keywords: ["iPhone 電池健康度 80", "iPhone 換電池 時機", "iPhone 認證電池", "iPhone 電池膨脹", "iPhone 電池維修"],
    coverImage: "/cases/iphone-battery.jpg",
    category: "tips",
    author: "i時代團隊",
    publishedAt: "2026-04-18",
    readingMinutes: 5,
    body: `## 電池健康度多少該換？

Apple 官方標準是**電池健康度降到 80% 以下**，代表電池已歷經約 500 次完整充放電循環。此時您會遇到：

- 續航明顯縮短（從原本一整天撐 6-8 小時）
- 低溫下突然關機
- 充電速度變慢
- 應用程式閃退頻繁

### 強烈建議立即更換的警訊

以下情況**請立即停用並送修**，避免電池膨脹造成螢幕爆裂或起火：
1. 機身邊緣縫隙變大
2. 螢幕被頂起、下方有空隙
3. 背蓋明顯凸起
4. 充電時機身異常發燙

## 認證電池 vs 原廠電池怎麼選？

| 比較項目 | ★ 認證電池 | APPLE 原廠 |
|---|---|---|
| 價格 | $1,500 起 | $2,800 起 |
| 容量 mAh | 相同甚至加大 5% | 相同 |
| 續航 | 與原廠無感差異 | 標準 |
| 電池健康度顯示 | 顯示「無法驗證」 | 正常顯示 |
| 保固 | **6 個月** | 3 個月 |
| 認證 | KC / CE / BSMI | Apple 原廠 |

**i時代推薦認證電池**：相同規格但更省錢，保固還更長。

## 2026 iPhone 換電池價格一覽

| 機型 | 認證電池 | APPLE 原廠 |
|---|---:|---:|
| iPhone 17 Pro Max | — | $4,100 |
| iPhone 16 Pro | — | $4,100 |
| iPhone 15 Pro | $1,900 | $3,300 |
| iPhone 14 Pro | $1,500 | $2,800 |
| iPhone 13 | $1,300 | $2,500 |
| iPhone 12 | $1,200 | $2,300 |
| iPhone 11 | $1,000 | $2,000 |

## 自己換電池可以嗎？

**不建議**。iPhone 電池有膠條固定，拆不好可能：
- 刺破電池起火
- 拉斷螢幕排線
- 破壞防水密封

$1,500 換新電池 + 保固 vs 自行冒險，算算就知道值不值得。

## 換電池流程

1. LINE 或電話預約（當日可排）
2. 帶 iPhone 到店（板橋江子翠）
3. 現場確認電池健康度
4. 30 分鐘完成更換
5. 開機確認後取件

保固 6 個月內非人為損壞免費再修。
`,
    faqs: [
      { q: "iPhone 電池膨脹很危險嗎？", a: "非常危險。鋰電池膨脹代表內部氣體累積，可能短路起火。請立即停用並送修。" },
      { q: "換電池後需要重新設定嗎？", a: "不需要。電池更換不影響 iOS 設定、App 資料、照片等。開機即可繼續使用。" },
      { q: "認證電池會爆炸嗎？", a: "認證電池通過 KC / CE / BSMI 安全認證，與原廠採用相同等級的保護晶片，在正常使用下不會爆炸。" },
    ],
    relatedSlugs: ["iphone-screen-repair-cost-2026", "macbook-battery-bulge"],
  },
  {
    slug: "sell-old-iphone-tips",
    title: "舊 iPhone 怎麼賣最划算？2026 回收價格行情與避坑指南",
    excerpt: "舊 iPhone 放著越來越不值錢。本文教您 2026 年怎麼賣 iPhone、哪裡回收最划算、怎麼避免被低估價、資料怎麼安全清除。",
    metaDescription: "2026 年二手 iPhone 回收行情：iPhone 15 Pro Max 可回收 $34,000、iPhone 14 Pro $15,000。i時代板橋江子翠現場估價。",
    keywords: ["iPhone 回收", "二手 iPhone 賣", "iPhone 回收價格 2026", "iPhone 高價回收", "板橋 iPhone 回收"],
    coverImage: "/cases/phone-repair-bench.jpg",
    category: "guide",
    author: "i時代團隊",
    publishedAt: "2026-04-15",
    readingMinutes: 5,
    body: `## 為什麼舊 iPhone 要早點賣？

iPhone 的二手價格遵循「**折舊曲線**」：
- **第 1 年**：折舊 15-20%
- **第 2 年**：累計折舊 35-40%
- **第 3 年**：累計折舊 55-60%
- **第 4 年起**：急速下滑，維修零件也越來越貴

**結論**：如果您已經換新機，舊機**越早賣越值錢**。放抽屜裡一年可能貶值 $5,000 以上。

## 2026 年 iPhone 回收價格行情

以下為 i時代 2026 年 4 月基準回收價（機況完好）：

| 機型 | 256GB 回收價 |
|---|---:|
| iPhone 16 Pro Max | $21,500 |
| iPhone 15 Pro Max | $26,500 |
| iPhone 14 Pro Max | $16,000 |
| iPhone 13 Pro | $10,500 |
| iPhone 12 Pro | $7,500 |
| iPhone 11 Pro | $4,000 |

實際價格依機況、配件完整度會有 10-20% 浮動。

## 哪些因素影響回收價？

**加分項**：
- 外觀九成新、無明顯刮痕
- 原廠盒裝、線材、說明書齊全
- 電池健康度 90% 以上
- 無維修紀錄（未拆過機）
- 已過 Apple 保固但未過功能

**扣分項**：
- 螢幕有刮痕或破裂
- 電池健康度 < 85%
- 曾泡水（即使能正常開機）
- 拆過機（Face ID 排線動過）
- 有任何「無法驗證零件」提示

## 怎麼避免被低估價？

1. **不要只問一家**：多比幾家，i時代每日抓 3 家市場行情，保證高於平均
2. **親自到店比寄送划算**：避免運送爭議
3. **不要先恢復原廠設定**：讓店家先看過功能再清
4. **留著原廠配件**：完整盒裝可多 $500-1,500

## 資料安全怎麼辦？

**建議流程**：
1. **iCloud 備份**：設定 → iCloud → 備份
2. **登出 Apple ID**：設定 → [名字] → 登出（必做！）
3. **取消配對**（Watch / AirPods）
4. **回復原廠設定**：設定 → 一般 → 重置 → 清除所有內容及設定
5. 取出 SIM 卡

這樣舊機到下家完全無您的資料。

## i時代回收流程

1. [線上查回收價](/recycle)，或 LINE 傳照片
2. 現場或寄送估價
3. 當場現金 / 匯款（無手續費）
4. 可直接抵下次維修費用

板橋江子翠現場估價，最快 10 分鐘拿錢。
`,
    faqs: [
      { q: "iPhone 要不要開卡才能賣？", a: "已開卡的機型回收價較高（可確認狀態）；若為原封全新機則保留盒裝更有價值。" },
      { q: "螢幕破掉還有回收價嗎？", a: "有。以 iPhone 14 Pro 為例，螢幕破裂但能開機約可回收 $4,000-6,000（無損機為 $13,000）。" },
      { q: "幾天內可以現金拿到錢？", a: "i時代現場驗機、現金當場給付。或指定匯款即日到帳。" },
    ],
    relatedSlugs: ["iphone-screen-repair-cost-2026", "macbook-battery-bulge"],
  },
  {
    slug: "macbook-battery-bulge",
    title: "MacBook 電池膨脹頂起鍵盤怎麼辦？2026 完整處理指南",
    excerpt: "MacBook 用了 3-4 年後電池膨脹頂起鍵盤？本文教您如何判斷電池膨脹、風險、維修費用與 DIY 可行性。",
    metaDescription: "MacBook 電池膨脹處理：Air / Pro 全系列含 M1-M4，板橋專業維修，副廠認證電池 $4,000 起，當日完工，保固 6 個月。",
    keywords: ["MacBook 電池膨脹", "MacBook 換電池", "MacBook Pro 電池維修", "MacBook Air 電池膨脹", "Touch Bar 凸起"],
    coverImage: "/cases/macbook-repair.jpg",
    category: "tips",
    author: "i時代團隊",
    publishedAt: "2026-04-12",
    readingMinutes: 4,
    body: `## 怎麼判斷 MacBook 電池膨脹？

MacBook 鋰電池老化後會逐漸產生氣體，頂壓上方的鍵盤與觸控板。典型徵兆：

1. **鍵盤平面不平整**，有些鍵凸起
2. **觸控板按壓無回饋**（因為下方被電池頂住）
3. **合蓋後有縫隙**，不像新機那樣平整
4. **桌面放置時搖晃**（底蓋被頂彎）

發現上述狀況**請立即停用並送修**，避免電池破裂起火。

## 電池膨脹有多危險？

**極度危險**。膨脹代表電池內部鋰離子重組、氣體累積，可能：
- 刺破包裝層導致**短路起火**
- 遇水遇熱加速反應
- 損壞主機板讓維修成本翻倍

**請勿**：繼續使用、自行戳刺、加熱「試試看」。

## 各機型電池更換價格 2026

| 機型 | 認證電池 | 原廠電池 |
|---|---:|---:|
| MacBook Air 15" M3 | $4,500 | — |
| MacBook Air 13" M2 | $4,000 | — |
| MacBook Pro 16" M4 Pro | $5,500 | — |
| MacBook Pro 14" M3 | $5,000 | — |
| MacBook Pro 13" M1 | $4,000 | — |

**全部含**：拆機、更換、重新貼合、測試、保固 6 個月。

## DIY 換電池可行嗎？

**極度不建議**。M 系列 MacBook 電池用**強力膠**黏在下殼，要：
- 小心拆底殼螺絲（不同長度混用會爛螺牙）
- 移除電池膠的專用溶劑
- 高溫加熱鬆解
- 接觸主機板排線（錯位燒板）

在 YouTube 教學影片下方看到的「10 分鐘搞定」，實際上修壞一堆。

## i時代為什麼推薦？

1. **熟悉 M1 / M2 / M3 / M4 各代差異**
2. **現場拆機**，不寄送避免運送損傷
3. **副廠認證電池**容量、循環次數等同原廠
4. **保固 6 個月**（原廠僅 3 個月）
5. **資料保留**，不動硬碟

## 預防電池膨脹的 5 個習慣

1. **不要長期插電使用**（建議 20-80% 循環）
2. **避免高溫環境**（車內、陽光直射）
3. **定期讓電池放電到 20%** 再充
4. **使用原廠或認證充電器**
5. **電池健康度 < 80% 就該換**

更多 MacBook 維修項目請見 [MacBook 維修](/quote/apple)。
`,
    faqs: [
      { q: "MacBook 電池膨脹可以繼續用嗎？", a: "請立即停用！膨脹電池隨時可能起火，資料遺失事小、造成火災事大。" },
      { q: "保固過了怎麼辦？", a: "過保後 Apple 官方維修約 $12,000-15,000。i時代副廠認證電池 $4,000 起，價格僅 1/3。" },
      { q: "換電池會影響 MacBook 效能嗎？", a: "不會。電池僅負責供電，不影響 CPU / GPU / RAM 等核心效能。" },
    ],
    relatedSlugs: ["iphone-battery-should-replace"],
  },
  {
    slug: "banqiao-phone-repair-recommendation",
    title: "板橋手機維修推薦｜江子翠、新埔、府中三大商圈維修店比較",
    excerpt: "板橋手機維修哪家好？本文比較江子翠、新埔、府中三大商圈的維修店選擇，教您怎麼避開地雷店，找到專業可靠的維修師傅。",
    metaDescription: "板橋手機維修推薦 i時代！江子翠商圈 14 年技術經驗，iPhone / Android / MacBook / Switch / Dyson 全品牌維修，透明報價。",
    keywords: ["板橋手機維修推薦", "江子翠手機維修", "新埔手機維修", "府中手機維修", "新北手機維修", "板橋換螢幕"],
    coverImage: "/cases/tech-shop.jpg",
    category: "comparison",
    author: "i時代團隊",
    publishedAt: "2026-04-10",
    readingMinutes: 5,
    body: `## 板橋手機維修店分布

板橋面積大，主要手機維修店聚集在三個商圈：

### 江子翠商圈（i時代所在）
- **優點**：近江子翠捷運、停車方便、店面多樣
- **缺點**：夜間較安靜
- **推薦店**：i時代（2011 年成立、14 年技術）

### 新埔、板橋火車站商圈
- **優點**：人流大、店家多
- **缺點**：觀光客多、比價風險大
- **建議**：選有 Google 5 星評價 + 實體發票的

### 府中、捷運府中站商圈
- **優點**：路街較寬、通達三重新北
- **缺點**：店家品質差異大
- **建議**：先 LINE 詢問價格再到店

## 怎麼避開地雷店？

**5 個紅旗警訊**：

1. ❌ **報價反覆變動**：「拆開看看再報」= 下階段敲詐
2. ❌ **不給實體發票**：無法保固，也可能是非法進零件
3. ❌ **不讓看拆機過程**：怕您發現偷換零件
4. ❌ **保固低於 1 個月**：品質不敢保證
5. ❌ **Google 評分 < 4.5**：網路風評可信度較高

## i時代為什麼值得推薦？

### 1. 透明價目
[線上即可查詢](/quote) 所有機型維修費用，**無隱藏費用**。

### 2. 14 年技術沉澱
2011 年成立於板橋江子翠，累積維修 **超過 10,000 台**各品牌行動裝置。

### 3. 全品牌支援
- Apple（iPhone / iPad / MacBook / Mac mini / Watch）
- Android（Samsung / Google / Sony / ASUS / OPPO / Xiaomi / HUAWEI）
- 遊戲主機（Switch / PS5）
- Dyson 家電

### 4. 保固承諾
維修後 **3 個月保固**，認證零件 **6 個月**。

### 5. 現場維修
板橋江子翠實體門市，**現場拆機不寄送**，避免運送損傷。

## 板橋各大店家維修比較

以 iPhone 15 Pro 螢幕破裂為例：

| 維修管道 | 副廠 OLED | 原廠拆機 | 保固 | 等候時間 |
|---|---:|---:|---|---|
| **i時代** | **$4,100** | **$6,700** | 3-6 月 | 30-60 分鐘 |
| Apple 原廠 | — | $13,200 | 1 年 | 需預約 |
| 夜市維修店 | $2,500-3,500 | $5,000-7,000 | 7-30 天 | 20 分鐘 |
| 網路寄送 | $2,000-3,000 | $4,000-6,000 | 視店家 | 2-7 天 |

**i時代的定位**：介於 Apple 原廠與夜市店之間，品質接近原廠、價格更親民、保固足夠。

## 來 i時代之前可以做什麼？

1. [查詢您的機型報價](/quote)
2. LINE 預約時段（@563amdnh）
3. 帶齊配件（盒裝可多抵點價）
4. 重要資料記得備份

## 營業資訊

- **地址**：新北市板橋區（江子翠商圈）
- **電話**：[02-8252-7208](tel:0282527208)
- **LINE**：[@563amdnh](https://line.me/R/ti/p/@563amdnh)
- **營業時間**：每日 11:00 - 21:00
- [Google 地圖位置](/about)
`,
    faqs: [
      { q: "i時代離江子翠捷運多遠？", a: "步行約 5 分鐘。詳細路線請見「關於」頁 Google 地圖。" },
      { q: "假日也有營業嗎？", a: "有，週六日照常 11:00-21:00 營業。建議先 LINE 預約避免久等。" },
      { q: "可以現場等候嗎？", a: "可以。常見維修（螢幕、電池）30-60 分鐘完成，店面有座位區。" },
    ],
    relatedSlugs: ["iphone-screen-repair-cost-2026", "iphone-battery-should-replace"],
  },
];

// === iPhone/Android 通病百科（SEO 大流量入口）===
const TROUBLE_POSTS: BlogPost[] = [
  {
    slug: "iphone-13-pro-green-screen",
    title: "iPhone 13 Pro 綠屏問題完整解決指南｜韌體 vs 硬體判斷",
    excerpt: "iPhone 13 Pro 螢幕變綠、出現綠色色塊、低光環境變綠？本文解析綠屏 3 種常見原因、自我檢測方法、維修費用。",
    metaDescription: "iPhone 13 Pro 綠屏問題完整解決：低光綠屏、邊緣綠塊、開機綠屏 3 種狀況的判斷與維修方法。i時代板橋現場檢測。",
    keywords: ["iPhone 13 Pro 綠屏", "iPhone 13 螢幕變綠", "iPhone 13 Pro 綠色色塊", "iPhone 綠屏怎麼辦", "iPhone 13 Pro 螢幕問題"],
    coverImage: "/cases/iphone-broken-screen.jpg",
    category: "trouble",
    author: "i時代團隊",
    publishedAt: "2026-04-22",
    readingMinutes: 6,
    body: `## iPhone 13 Pro 綠屏的 3 種常見狀況

iPhone 13 / 13 Pro 系列推出後就有一定比例反映「**綠屏問題**」，主要分三種：

### 狀況 1：低光環境下螢幕變綠

**症狀**：暗環境（夜晚、被窩裡）開螢幕後出現整片綠色或淡綠色霧。
**原因**：iOS 韌體與 OLED 面板色彩管理 bug。
**解法**：
1. 升級到 iOS 16.5 以上（Apple 已修正）
2. 設定 → 顯示與亮度 → 關閉「True Tone」測試
3. 仍有問題 → 螢幕本身 OLED 色衰，需更換

### 狀況 2：螢幕邊緣綠色色塊

**症狀**：螢幕周邊（尤其下半部）有不規則綠色色塊，重啟不消失。
**原因**：螢幕排線受潮 / 摔機後 OLED panel 部分像素故障。
**解法**：**必須換螢幕**，韌體無法修復。

### 狀況 3：開機後整片綠屏

**症狀**：iPhone 開機 Apple Logo 後整片綠屏，無法正常顯示。
**原因**：螢幕 IC 故障，可能是泡水後遺症或排線斷。
**解法**：拆機檢查排線、換螢幕總成。

## 自我判斷流程

1. **先升級 iOS** 到最新版 → 重開機
2. 拍照記錄綠屏狀態
3. 進「設定 → 通用 → 關於本機」確認 iOS 版本與機型
4. **韌體已最新仍綠屏** → 99% 是螢幕硬體問題

## 維修費用

| 螢幕等級 | iPhone 13 | iPhone 13 Pro | iPhone 13 Pro Max |
|---|---:|---:|---:|
| 副廠 OLED | $4,100 | $4,100 | $5,200 |
| 拆機原廠 | $9,000 | $7,400 | $8,300 |
| 全新原廠 | $9,000 | $10,800 | $12,300 |

## 為什麼 iPhone 13 Pro 容易綠屏？

iPhone 13 Pro 採用 **LTPO OLED 面板**（首次導入 ProMotion 120Hz），製程相對複雜，部分早期批次有色彩管理瑕疵。Apple 在 iOS 15.4 / 15.5 / 16 連續釋出修正，但**部分機台（尤其長時間高亮度使用）OLED 已實體色衰**，韌體無法救。

## i時代怎麼修？

1. **現場檢測**：先確認軟硬體問題
2. 軟體可解 → 免費協助處理
3. 硬體故障 → 透明報價、現場 30 分鐘換完
4. 保固 3-6 個月

## 預防與保養

- 不長時間滿亮度（會加速 OLED 老化）
- 避免高溫環境（太陽直射、車內）
- 開啟「自動鎖定」減少螢幕常亮時間
`,
    faqs: [
      { q: "iPhone 13 Pro 綠屏 Apple 會免費修嗎？", a: "如在 1 年保固內 + 確認是 Apple 已知 bug，可送原廠免費更換。過保需自費。" },
      { q: "綠屏不修會變嚴重嗎？", a: "OLED 色衰是不可逆的，會逐漸擴大。建議盡早處理避免影響日常使用。" },
      { q: "副廠螢幕也會綠屏嗎？", a: "副廠 OLED 採用同等級面板，理論上不會有相同 bug，但壽命略短於原廠。" },
    ],
    relatedSlugs: ["iphone-screen-repair-cost-2026", "iphone-12-touch-screen-issue"],
  },
  {
    slug: "iphone-12-touch-screen-issue",
    title: "iPhone 12 觸控失靈、綠色波紋怎麼辦？常見故障 5 大解法",
    excerpt: "iPhone 12 / 12 Pro 螢幕出現綠色波紋、觸控失靈、無法滑動？本文解析 5 大常見故障原因與維修方法。",
    metaDescription: "iPhone 12 觸控失靈、綠色波紋、螢幕變黑？常見故障與維修費用解析，i時代板橋現場 30 分鐘修復。",
    keywords: ["iPhone 12 觸控失靈", "iPhone 12 綠色波紋", "iPhone 12 螢幕問題", "iPhone 12 故障", "iPhone 12 Pro 維修"],
    coverImage: "/cases/screen-replacement.jpg",
    category: "trouble",
    author: "i時代團隊",
    publishedAt: "2026-04-21",
    readingMinutes: 5,
    body: `## iPhone 12 系列常見 5 大故障

iPhone 12 / 12 Pro / 12 mini / 12 Pro Max 推出至今，i時代維修統計最常見：

### 1. 觸控失靈（最常見）

**症狀**：螢幕能顯示但無法觸控、部分區域無反應。
**原因**：觸控 IC 故障 / 排線氧化 / 螢幕受過撞擊
**維修費用**：副廠 OLED 螢幕 **$3,200 起**，含工資。

### 2. 綠色波紋 / 綠線

**症狀**：螢幕顯示綠色波紋、橫線、不規則色塊。
**原因**：OLED panel 故障，多為摔機、過熱所致。
**解法**：**換螢幕，韌體無法修**。

### 3. 無法充電 / 充電緩慢

**症狀**：插上充電線無反應、進度條不動、邊充邊降電。
**可能原因**：
- 充電孔氧化（**$1,000 換尾插**）
- Lightning 排線故障（**$1,500**）
- 主機板電源 IC 損壞（**$3,000–5,000**）

### 4. Face ID 失效

**症狀**：「無法啟用 Face ID」訊息、無法解鎖。
**原因**：Face ID 排線受損（多因螢幕維修不當）。
**解法**：i時代有專業 Face ID 排線維修，**$3,500 起**。

### 5. 自動關機 / 重開機

**症狀**：在低溫或電量 30% 以下自動關機。
**原因**：電池老化（健康度 < 80%）。
**解法**：換電池，**$1,200 起**。

## 自我檢測流程

1. **重開機**（按住電源 + 音量鍵 10 秒）
2. **更新 iOS** 到最新版
3. **設定 → 電池 → 電池健康度** 確認百分比
4. **設定 → 顯示與亮度 → 黑模式** 測試是否仍有色塊
5. 仍有問題 → 帶到 i時代 **免費檢測**

## 為什麼選 i時代？

- iPhone 12 系列維修經驗 5 年以上
- 副廠 OLED + APPLE 原廠雙選擇，價差透明
- 保固 3-6 個月
- 板橋江子翠 30 分鐘現場完工
`,
    faqs: [
      { q: "iPhone 12 觸控失靈是不是螢幕壞掉？", a: "多數情況是觸控 IC 或螢幕本體故障，需更換完整螢幕總成。少數是排線鬆脫，僅需重接。" },
      { q: "iPhone 12 綠色波紋會自己好嗎？", a: "不會。OLED panel 損壞是不可逆的，建議盡早更換避免擴大。" },
    ],
    relatedSlugs: ["iphone-13-pro-green-screen", "iphone-screen-repair-cost-2026"],
  },
  {
    slug: "iphone-14-pro-overheating",
    title: "iPhone 14 Pro / 15 Pro 過熱降頻問題完整解析",
    excerpt: "iPhone 14 Pro / 15 Pro 拍照、玩遊戲、充電時機身發燙、亮度自動降低？本文解析過熱原因與處理方法。",
    metaDescription: "iPhone 14 Pro / 15 Pro 過熱降頻、發燙處理：原因解析、自我檢測、維修建議。i時代板橋專業檢測。",
    keywords: ["iPhone 14 Pro 過熱", "iPhone 15 Pro 發燙", "iPhone 過熱降頻", "iPhone 14 Pro 充電發燙", "iPhone 15 Pro Max 過熱"],
    coverImage: "/cases/iphone-disassembly.jpg",
    category: "trouble",
    author: "i時代團隊",
    publishedAt: "2026-04-19",
    readingMinutes: 5,
    body: `## iPhone 14 Pro / 15 Pro 為什麼會過熱？

Apple A16 / A17 Pro 晶片性能大幅提升，但散熱設計**沒有同步加強**，加上 Pro 系列鈦金屬機身導熱效果反而較差，造成：

### 常見過熱情境

1. **拍 4K 影片 5 分鐘以上** → 機身發燙、自動降低錄影品質
2. **遊戲（原神、PUBG）超過 15 分鐘** → 螢幕亮度降低、幀率下降
3. **無線充電** → 機身比有線充電熱 2-3 倍
4. **車充 + 導航 + 烈日** → 高機率觸發保護機制

## iOS 17 / 18 改善了嗎？

Apple 在 iOS 16.5 → 17.x → 18.x 連續優化散熱演算法，**輕度使用已經改善**。但重度玩家仍會遇到。

## 自我處理 5 步驟

1. **更新到最新 iOS**
2. 移除手機殼測試（厚殼會擋熱）
3. 開飛航模式時短暫關閉以散熱
4. **設定 → 一般 → iPhone 儲存空間** 清理超過 80% 容量會加重 CPU 負擔
5. 重置「設定 → 一般 → 重置 → 重置所有設定」

## 真的硬體問題嗎？

**檢測 4 招**：
- ✅ 不充電不玩遊戲就發燙 → 主機板電源管理 IC 故障
- ✅ 充電速度突然變慢 → 電池或充電 IC 故障
- ✅ 發燙伴隨自動關機 → 電池老化嚴重
- ✅ 完全冷卻仍螢幕變色 → 散熱片可能脫落

## 維修費用

| 故障 | 估價 |
|---|---:|
| 電池更換 | $2,500 |
| 充電 IC | $3,500 |
| 主機板電源 IC | $5,000 |
| 散熱片重貼 | $2,500 |

## 預防保養

- **避免邊充邊玩**（最傷主機板）
- 高負載遊戲建議 30 分鐘休息一次
- 不要長期插電掛機
- 散熱手機殼比一般殼好
`,
    faqs: [
      { q: "iPhone 過熱會不會爆炸？", a: "不會直接爆炸。iPhone 有溫度保護，超過 50°C 就會強制降頻或關機。但長期過熱會加速電池老化。" },
      { q: "充電發燙正常嗎？", a: "輕微溫熱（35-40°C）正常，但燙到無法觸碰就需要送修檢查。" },
    ],
    relatedSlugs: ["iphone-battery-should-replace", "iphone-screen-repair-cost-2026"],
  },
  {
    slug: "iphone-x-face-id-failure",
    title: "iPhone X / XS / 11 Face ID 失效原因與維修費用",
    excerpt: "iPhone X / XS / 11 / 12 系列 Face ID 顯示「無法啟用」、無法設定？本文解析 Face ID 故障 5 大原因。",
    metaDescription: "iPhone Face ID 失效原因、維修費用 $3,500 起。i時代板橋專業 Face ID 排線維修，當日完工。",
    keywords: ["iPhone Face ID 失效", "iPhone X Face ID 維修", "Face ID 無法啟用", "iPhone Face ID 修理", "Face ID 排線"],
    coverImage: "/cases/iphone-disassembly.jpg",
    category: "trouble",
    author: "i時代團隊",
    publishedAt: "2026-04-17",
    readingMinutes: 4,
    body: `## Face ID 失效的 5 大原因

iPhone X 起的 TrueDepth 模組由 8 個元件組成，任一損壞 Face ID 就失效：

1. **泛光感測器** 故障（夜間無法解鎖）
2. **點陣投射器** 損壞（最常見，高溫造成）
3. **紅外線相機** 排線斷裂
4. **前置相機** 失效（連帶 Face ID 失效）
5. **主機板 Face ID IC** 損壞（多為非正規維修導致）

## 螢幕維修後 Face ID 不能用？

**99% 是螢幕維修不當**：
- Face ID 排線藏在螢幕上方
- 拆螢幕時若鬆脫或扯到 → Face ID 直接失效
- 換非原廠螢幕**未保留 Face ID 排線校準**

i時代螢幕維修**保證保留 Face ID 功能**，這是基本要求。

## 維修費用

| 故障點 | 維修費 |
|---|---:|
| Face ID 排線（保留指紋） | $3,500 |
| 點陣投射器 | $4,500 |
| 主機板 Face ID IC | $6,000 起 |
| **完全失效（更換 TrueDepth 模組）** | $4,500–6,000 |

## 自我檢測

1. **設定 → Face ID 與密碼**
2. 點「設定 Face ID」
3. 顯示「**移動 iPhone 完成 Face ID 設定**」→ 模組正常但需重設
4. 顯示「**無法啟用 Face ID**」→ 硬體故障
5. 「**Face ID 暫時無法使用**」→ 韌體問題，重開機可解
`,
    faqs: [
      { q: "Face ID 修了會跟新的一樣靈敏嗎？", a: "i時代用同等級零件，重新校準後與原廠靈敏度幾乎相同。" },
      { q: "Apple 修 Face ID 多少錢？", a: "Apple 通常直接換整機，費用 $15,000+。i時代僅維修故障部位 $3,500 起。" },
    ],
    relatedSlugs: ["iphone-screen-repair-cost-2026"],
  },
  {
    slug: "switch-joycon-drift",
    title: "Switch 搖桿飄移（磨菇頭）終極解決方案",
    excerpt: "Switch / Switch OLED 搖桿飄移、角色亂跑？本文解析磨菇頭故障原因、自修風險、專業維修費用。",
    metaDescription: "Switch 搖桿飄移專業維修，副廠磨菇頭 $800 起，板橋現場 30 分鐘完工，保固 3 個月。",
    keywords: ["Switch 搖桿飄移", "Switch 磨菇頭", "Switch Joy-Con 飄移", "Switch OLED 搖桿維修", "Switch 維修費用"],
    coverImage: "/cases/switch-controller.jpg",
    category: "trouble",
    author: "i時代團隊",
    publishedAt: "2026-04-16",
    readingMinutes: 4,
    body: `## 為什麼 Switch 磨菇頭一定會壞？

Joy-Con 內部用的是**碳膜接觸式類比搖桿**，碳膜會隨使用磨損產生粉塵，造成電阻誤判 → 角色「自己跑」。

**統計**：平均使用 1-2 年（中度玩家）就會出現飄移。重度玩家 6 個月就壞。

## 飄移的 4 個階段

1. **間歇性**：偶爾角色慢慢飄一下
2. **方向偏移**：永遠往某方向跑
3. **完全失控**：完全無法控制
4. **無反應**：搖桿完全不動

階段 1-2 可繼續用但體驗差，階段 3 必修。

## 自修可行嗎？

YouTube 上很多「DIY 換磨菇頭」教學，但：
- ❌ 螺絲超細，需專用工具
- ❌ 排線脆弱，拉斷整個 Joy-Con 報廢
- ❌ 不會清潔粉塵，修完很快又壞
- ❌ 沒保固

**自修風險 > $1,000，省的錢得不償失**。

## 維修費用

| 機型 | 副廠磨菇頭 | 原廠磨菇頭 |
|---|---:|---:|
| Switch（紅藍版） | $800 | $1,200 |
| Switch Lite | $1,000 | $1,400 |
| Switch OLED 版 | $800 | $1,200 |

含工資、保固 3 個月。

## 為什麼 i時代修磨菇頭便宜？

- **單支零件成本** + 工資合理利潤
- 5 分鐘拆裝，30 分鐘完工
- 順便檢查內部清潔
- 大量維修經驗，不會把 Joy-Con 弄壞

## 預防與保養

- **避免重壓搖桿**（按到底）
- 不玩時放原廠盒避免灰塵
- 定期用「**設定 → 控制器與感測器 → 校準控制桿**」校正
- **磨菇頭套**可延緩磨損
`,
    faqs: [
      { q: "Switch OLED 的磨菇頭跟一般版一樣嗎？", a: "完全相同零件規格，維修方式和費用也相同。" },
      { q: "Joy-Con 飄移送任天堂可以免費修嗎？", a: "保固內可，但需寄送台灣總代理，等 1-2 個月。i時代當日完工。" },
    ],
    relatedSlugs: ["switch-screen-repair"],
  },
  {
    slug: "macbook-butterfly-keyboard",
    title: "MacBook Pro / Air 鍵盤故障（卡鍵、自動重複、失靈）解析",
    excerpt: "MacBook Pro 2016-2019 蝴蝶鍵盤卡鍵？M 系列鍵盤失靈？本文解析鍵盤故障原因與維修方法。",
    metaDescription: "MacBook Pro / Air 鍵盤故障維修：蝴蝶鍵盤、剪刀腳鍵盤、Touch Bar，i時代板橋專業維修。",
    keywords: ["MacBook 鍵盤故障", "MacBook Pro 蝴蝶鍵盤", "MacBook Air 鍵盤", "MacBook 鍵盤失靈", "MacBook 鍵盤維修"],
    coverImage: "/cases/macbook-repair.jpg",
    category: "trouble",
    author: "i時代團隊",
    publishedAt: "2026-04-14",
    readingMinutes: 5,
    body: `## MacBook 鍵盤故障常見類型

### 1. 蝴蝶鍵盤卡鍵（2015-2019）

Apple 為了輕薄推出蝴蝶鍵盤，但**結構脆弱**：
- 一粒灰塵就卡鍵
- 按鍵不彈起
- 同一鍵打出兩個字（自動重複）

**Apple 已承認設計缺陷**，2015-2019 機型可送原廠免費維修（已過期需自費）。

### 2. 剪刀腳鍵盤故障（2020+）

從 MacBook Pro 16" (2019) 起恢復剪刀腳鍵盤，**故障率大幅降低**。常見問題：
- 進液體（咖啡、水）後失靈
- 長期使用按鍵亮燈失效
- 個別按鍵失靈

### 3. Touch Bar 失靈

Touch Bar (2016-2019 Pro) 容易故障：
- 全黑無顯示
- 觸控不靈
- 自動亮起隨即熄滅

## 維修費用

| 機型 | 鍵盤更換 | Touch Bar |
|---|---:|---:|
| MacBook Pro 13" 蝴蝶鍵盤 | $5,500 | $3,000 |
| MacBook Pro 15"/16" 蝴蝶鍵盤 | $6,500 | $3,500 |
| MacBook Pro 14"/16" M 系列 | $5,000 | — |
| MacBook Air M1/M2/M3 | $4,500 | — |

## 自助處理（蝴蝶鍵盤）

1. **倒置 MacBook 45 度**，用壓縮空氣噴卡鍵周邊
2. **沿一個方向掃**，把灰塵推出
3. **每個壞鍵噴 3 秒**
4. 仍故障 → 送修

## 進液體應急處理

1. **立即關機**（按住電源 5 秒強制）
2. **倒置擺乾**至少 24 小時（不要開機！）
3. **拆下電池接頭**（懂電子可自行）
4. **盡快送修拆解清潔**，否則氧化會擴散到主機板

## 預防保養

- 不在鍵盤上放物品
- 飲料離鍵盤 30 cm 以上
- 定期用乾布輕擦鍵盤
- 用矽膠鍵盤膜（會略影響手感）
`,
    faqs: [
      { q: "蝴蝶鍵盤一個鍵壞要換整片嗎？", a: "蝴蝶鍵盤無法單獨換鍵帽，必須換整片鍵盤總成。" },
      { q: "鍵盤進咖啡會壞嗎？", a: "幾乎一定會。糖分會結晶氧化主機板。立即送修可救，拖延 1 週主機板就掛了。" },
    ],
    relatedSlugs: ["macbook-battery-bulge", "macbook-screen-repair"],
  },
  {
    slug: "samsung-screen-burn-in",
    title: "Samsung 三星 OLED 螢幕烙印怎麼處理？",
    excerpt: "Samsung Galaxy S / Note / Z Fold OLED 螢幕烙印（殘影）原因與處理方法。",
    metaDescription: "三星 Samsung OLED 螢幕烙印處理：原因、預防、維修費用。i時代板橋三星螢幕維修。",
    keywords: ["Samsung 螢幕烙印", "三星 OLED 殘影", "Galaxy 螢幕問題", "三星螢幕維修"],
    coverImage: "/cases/screen-replacement.jpg",
    category: "trouble",
    author: "i時代團隊",
    publishedAt: "2026-04-13",
    readingMinutes: 4,
    body: `## OLED 螢幕為什麼會烙印？

OLED 螢幕由有機發光二極體組成，**長期顯示同一畫面會造成像素老化不均勻**，產生「**殘影**」（如導覽列、時鐘位置永久痕跡）。

## 烙印高風險族群

- **遊戲玩家**（HUD 介面長期固定）
- **導航重度使用**
- **長時間保持滿亮度**
- **長期顯示「永遠開啟顯示」(AOD)**

## 怎麼判斷自己有烙印？

1. 顯示**全白底色**畫面（搜「pure white」）
2. 觀察是否有淡灰色區塊或顏色不均
3. 顯示**全灰底**也測一次
4. 有殘影 = 烙印確認

## 改善方法

### 輕度（剛開始發現）
- **減低螢幕亮度**至 50% 以下
- **關閉永遠開啟顯示**（AOD）
- **設定深色模式** + 背景換成黑色
- **用「螢幕保護」App 反向重燒像素**（部分有效）

### 中重度（明顯影響使用）
**只能換螢幕**。OLED 烙印是物理性損傷不可逆。

## 維修費用（i時代 2026 行情）

| 機型 | 副廠 OLED | 原廠拆機 |
|---|---:|---:|
| Galaxy S25 Ultra | $7,500 | $9,200 |
| Galaxy S24 Ultra | $6,900 | $8,100 |
| Galaxy Z Fold6 | $14,000 | $18,000 |
| Galaxy Note 20 Ultra | $5,800 | $7,500 |

## 預防保養（重點）

1. **亮度不要常開到滿**
2. **AOD 關掉**（電也省）
3. **深色模式** 24 小時開
4. **桌布用深色**
5. 遊戲不要連玩超過 1 小時
`,
    faqs: [
      { q: "OLED 烙印保固內 Samsung 會免費換嗎？", a: "通常認定為使用者疏忽（亮度過高），多數需自費。i時代修費用約原廠 1/2。" },
      { q: "iPhone OLED 也會烙印嗎？", a: "會，但 Apple 像素位移演算法較積極，烙印機率較低。" },
    ],
    relatedSlugs: ["iphone-13-pro-green-screen"],
  },
  {
    slug: "ipad-touch-not-working",
    title: "iPad 螢幕觸控失靈、邊緣不靈敏完整解決指南",
    excerpt: "iPad / iPad Pro / iPad Air 觸控失靈、邊緣無反應？原因解析與維修方法。",
    metaDescription: "iPad 觸控失靈維修：iPad Pro / Air / mini 全系列，i時代板橋專業維修。",
    keywords: ["iPad 觸控失靈", "iPad Pro 觸控失靈", "iPad 邊緣不靈敏", "iPad 螢幕無反應", "iPad 維修"],
    coverImage: "/cases/ipad-repair.jpg",
    category: "trouble",
    author: "i時代團隊",
    publishedAt: "2026-04-11",
    readingMinutes: 4,
    body: `## iPad 觸控失靈 5 大原因

### 1. 螢幕外玻璃破裂

最常見。即使外觀只裂一條線，**內部觸控層可能已經斷路**。

### 2. 螢幕排線氧化

iPad 體積大，排線經常因為機殼變形（坐到、壓到）而氧化、斷裂。

### 3. 主機板觸控 IC 故障

iPad Pro 系列特別多。常見於 iPad Pro 11" / 12.9" 第 1-3 代。

**「觸控門」事件**：iPad Pro 2018 大量觸控失靈，Apple 已展開**免費維修計畫**（已停止）。

### 4. iOS 韌體問題

部分版本有觸控延遲問題，**升級可解**。

### 5. 受潮 / 進水

iPad 防水較差，桌面飲料倒翻就 GG。

## 自我檢測

1. **完全關機重啟**（按音量鍵 + 電源 10 秒）
2. **重置所有設定**（不會刪資料）
3. **設定 → 一般 → iPad 儲存空間**確認 < 80%
4. 仍失靈 → 硬體問題

## 維修費用 2026

| 機型 | 玻璃破裂 | 螢幕破裂 | 主機板觸控 IC |
|---|---:|---:|---:|
| iPad Pro 13" M4 | $8,500 | $8,500 | $4,000 |
| iPad Pro 11" M4 | $7,500 | $7,500 | $4,000 |
| iPad Air 11" M3 | $5,500 | $5,500 | $3,500 |
| iPad 11 (2025) | $2,800 | $4,000 | $3,000 |
| iPad mini 7 | $8,000 | $8,000 | $3,500 |

## 為什麼 iPad 螢幕這麼貴？

- iPad 螢幕是**全貼合**設計，無法單獨換玻璃
- 必須整片換螢幕總成
- iPad Pro 是 ProMotion + Mini-LED，零件貴
`,
    faqs: [
      { q: "iPad 觸控失靈一定要換螢幕嗎？", a: "不一定。先測軟體 → 排線 → 主機板 IC，最後才是換螢幕。i時代逐步檢查。" },
      { q: "iPad Pro 2018-2020 觸控門 Apple 還免費修嗎？", a: "原廠維修計畫已截止。i時代提供主機板觸控 IC 維修約 $4,000，比換新便宜。" },
    ],
    relatedSlugs: ["ipad-screen-repair"],
  },
];

// 合併到主清單
BLOG_POSTS.push(...TROUBLE_POSTS);

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find(p => p.slug === slug);
}

export const CATEGORY_LABEL: Record<BlogPost["category"], string> = {
  tips: "實用技巧",
  pricing: "價格行情",
  comparison: "比較攻略",
  guide: "完整指南",
  trouble: "通病解析",
};

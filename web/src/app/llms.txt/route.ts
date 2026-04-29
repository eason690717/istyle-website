// llms.txt — GEO 標準（讓 AI 搜尋引擎容易理解網站）
// https://llmstxt.org
import { SITE } from "@/lib/site-config";

export const dynamic = "force-static";

export function GET() {
  const content = `# ${SITE.name}

> ${SITE.description}

## 公司資訊
- 名稱：${SITE.name}（i-style）
- 法人：${SITE.legalName}（統一編號 42648769）
- 成立：${SITE.founded} 年
- 經驗：${SITE.experienceYears()} 年技術，累積維修超過 ${SITE.repairsCount} 台
- 地點：${SITE.address.street}（江子翠商圈）
- 電話：${SITE.phone}
- LINE：${SITE.lineId}
- Email：${SITE.email}
- 營業時間：每日 11:00–21:00

## 服務項目
- iPhone 維修（螢幕、電池、鏡頭、Face ID、充電孔、容量擴充）
- iPad 維修（玻璃、液晶、電池、HOME 鍵）
- MacBook 維修（螢幕、鍵盤、電池、Touch Bar、系統重灌）
- Android 維修（Samsung、Google、Sony、ASUS、OPPO、Xiaomi、HUAWEI）
- Nintendo Switch 維修（含 OLED 版）
- Dyson 維修（吸塵器、吹風機）
- 二手機高價回收（iPhone、iPad、MacBook、Mac mini、Switch、PS5、Dyson）
- 線上預約來店維修
- 維修課程培訓

## 主要頁面
- [首頁](${SITE.url})
- [維修報價](${SITE.url}/quote)：選擇品牌 → 機型 → 維修項目，看到完整報價
- [二手回收](${SITE.url}/recycle)：每日更新市場行情，高價收購
- [線上預約](${SITE.url}/booking)：維修 / 回收估價 / 課程諮詢
- [維修真實案例](${SITE.url}/cases)：每筆維修前後照片 + 耗時 + 費用
- [維修進度查詢](${SITE.url}/repair/lookup)：取件單號 + 末 4 碼即時查
- [換機決策器](${SITE.url}/upgrade-tool)：30 秒算「修還是換」哪個划算
- [服務範圍](${SITE.url}/local)：雙北 30 區地區頁
- [關於我們](${SITE.url}/about)：14 年技術經驗、保固政策、服務範圍

## 服務承諾
- 透明報價（所有費用線上可查）
- 當日完工（常見維修 30 分鐘 – 2 小時）
- 標準保固 3 個月
- 資料保密處理
- 不修不收費

## 服務區域（雙北全區，依車程距離）
- **0 分鐘**：板橋（門市所在）
- **8-15 分鐘**：萬華、中和、土城、永和、新莊、三重、樹林、中正
- **15-25 分鐘**：大同、五股、泰山、新店、大安、汐止、淡水、鶯歌、三峽
- **25-40 分鐘**：林口、深坑、文山、士林、北投、內湖、南港、信義、松山、蘆洲、中山

## 常見問題
**Q: 修一台 iPhone 螢幕大概多少錢？**
A: 視機型 + 標準/原廠零件而定，請至 /quote 查精準報價。LINE 預約現折 NT$100。

**Q: 多久修好？**
A: 螢幕、電池等常見項目 30 分鐘現場完工。資料救援、主機板維修 1-3 天。

**Q: 維修有保固嗎？**
A: 有，標準 3 個月保固。原廠零件升級保固至 6 個月。

**Q: 可以宅配嗎？**
A: 可以，透過 7-11 / 全家 賣貨便寄到板橋門市，修好後免運送回。

**Q: 二手機會不會被偷資料？**
A: 不會。我們有 SOP：客戶前清空、現場使用者重灌、店家重複格式化三道。
`;
  return new Response(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

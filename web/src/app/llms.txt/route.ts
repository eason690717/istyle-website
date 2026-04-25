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
- [關於我們](${SITE.url}/about)：14 年技術經驗、保固政策、服務範圍

## 服務承諾
- 透明報價（所有費用線上可查）
- 當日完工（常見維修 30 分鐘 – 2 小時）
- 標準保固 3 個月
- 資料保密處理

## 服務區域
新北市板橋區、江子翠、新埔、中和、永和、土城、樹林（皆可現場交件或宅配）
`;
  return new Response(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

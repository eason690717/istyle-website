// 板橋週邊地區 SEO 落地頁資料
// 每個區生成一個 /[area]-repair 頁面，吃地區搜尋流量

export interface LocalArea {
  slug: string;        // URL 用，全英文 lowercase
  city: string;        // "新北市"
  district: string;    // "板橋區"
  zhName: string;      // "板橋"（簡稱）
  fullName: string;    // "新北市板橋區"
  description: string; // SEO meta description
  // 距離店家（板橋江子翠）
  distanceMin: number;
  // 在地特色／話題
  highlights: string[];
  // 鄰近的學區／商圈／知名地標
  landmarks: string[];
  // 此區常見送修裝置／需求（hand-tuned for relevance）
  popularServices: string[];
}

export const LOCAL_AREAS: LocalArea[] = [
  {
    slug: "banqiao",
    city: "新北市",
    district: "板橋區",
    zhName: "板橋",
    fullName: "新北市板橋區",
    description: "板橋手機維修首選 i時代．14 年技術．iPhone / iPad / MacBook / Switch 全方位維修．現場 30 分鐘完工",
    distanceMin: 0,
    highlights: ["門市所在地", "捷運江子翠站旁", "免運費送回"],
    landmarks: ["江子翠捷運站", "府中站", "大遠百", "板橋車站", "亞東醫院"],
    popularServices: ["iPhone 換螢幕", "電池更換", "進水救援", "MacBook 維修", "Switch 搖桿"],
  },
  {
    slug: "zhonghe",
    city: "新北市",
    district: "中和區",
    zhName: "中和",
    fullName: "新北市中和區",
    description: "中和手機維修推薦 i時代．距中和僅 10 分鐘．iPhone 換螢幕電池．Switch / iPad / MacBook 維修",
    distanceMin: 10,
    highlights: ["10 分鐘車程", "可搭捷運直達江子翠", "免運送回到府"],
    landmarks: ["環球購物中心", "南勢角站", "永安市場站", "華新街"],
    popularServices: ["iPhone 螢幕", "電池更換", "Android 維修", "iPad 螢幕"],
  },
  {
    slug: "yonghe",
    city: "新北市",
    district: "永和區",
    zhName: "永和",
    fullName: "新北市永和區",
    description: "永和手機維修選 i時代．15 分鐘到板橋門市．iPhone / Samsung / Google Pixel 全方位維修",
    distanceMin: 15,
    highlights: ["15 分鐘車程", "Pixel / Samsung 認證零件", "免費檢測"],
    landmarks: ["頂溪站", "樂華夜市", "Costco 中和店", "永和豆漿總店"],
    popularServices: ["iPhone 維修", "Samsung 換螢幕", "電池更換", "資料救援"],
  },
  {
    slug: "sanchong",
    city: "新北市",
    district: "三重區",
    zhName: "三重",
    fullName: "新北市三重區",
    description: "三重手機維修．i時代板橋門市 12 分鐘車程．iPhone / iPad / MacBook 認證零件．當日完工",
    distanceMin: 12,
    highlights: ["12 分鐘車程", "可搭捷運直達", "急件 30 分鐘修好"],
    landmarks: ["菜寮站", "三重站", "台北橋", "三和夜市"],
    popularServices: ["iPhone 螢幕", "電池", "進水救援", "MacBook 維修"],
  },
  {
    slug: "shulin",
    city: "新北市",
    district: "樹林區",
    zhName: "樹林",
    fullName: "新北市樹林區",
    description: "樹林手機維修 i時代．樹林到板橋僅 10 分鐘．iPhone / Android 換螢幕電池．現場完工",
    distanceMin: 10,
    highlights: ["10 分鐘車程", "捷運直達板橋", "現場維修"],
    landmarks: ["樹林車站", "樹林夜市", "大同山"],
    popularServices: ["iPhone 螢幕", "電池更換", "Android 維修", "Switch"],
  },
  {
    slug: "xinzhuang",
    city: "新北市",
    district: "新莊區",
    zhName: "新莊",
    fullName: "新北市新莊區",
    description: "新莊手機維修．i時代板橋門市 15 分鐘車程．iPhone / Samsung / Pixel 認證維修．Dyson 也修",
    distanceMin: 15,
    highlights: ["15 分鐘車程", "捷運中和新蘆線直達", "Dyson / Switch 也修"],
    landmarks: ["新莊站", "輔大站", "新莊夜市", "幸福水漾公園"],
    popularServices: ["iPhone 螢幕", "電池", "Dyson 維修", "Switch"],
  },
  {
    slug: "tucheng",
    city: "新北市",
    district: "土城區",
    zhName: "土城",
    fullName: "新北市土城區",
    description: "土城手機維修 i時代．8 分鐘車程到板橋．iPhone / iPad 換螢幕電池．認證電池更耐用",
    distanceMin: 8,
    highlights: ["8 分鐘車程", "可搭捷運", "急件當日完工"],
    landmarks: ["海山站", "土城站", "永寧站", "清水祖師廟"],
    popularServices: ["iPhone 維修", "iPad 螢幕", "電池更換"],
  },
  {
    slug: "luzhou",
    city: "新北市",
    district: "蘆洲區",
    zhName: "蘆洲",
    fullName: "新北市蘆洲區",
    description: "蘆洲手機維修．i時代 18 分鐘車程．iPhone / Samsung / Pixel 換螢幕．免運送回",
    distanceMin: 18,
    highlights: ["18 分鐘車程", "捷運蘆洲線直達", "免運送回"],
    landmarks: ["蘆洲站", "三民高中站", "湧蓮寺", "蘆洲夜市"],
    popularServices: ["iPhone 螢幕", "電池", "Samsung 維修"],
  },
];

export function getAreaBySlug(slug: string): LocalArea | undefined {
  return LOCAL_AREAS.find(a => a.slug === slug);
}

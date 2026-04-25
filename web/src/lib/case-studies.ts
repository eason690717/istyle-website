// 維修案例庫
// 圖片來源：Unsplash 公開 CC0 照片，老闆可後台上傳真實案例覆蓋

export interface CaseStudy {
  slug: string;
  title: string;
  customerName: string;
  device: string;
  serviceTags: string[];
  problem: string;
  solution: string;
  result: string;
  duration: string;
  beforeImage?: string;
  afterImage?: string;
  videoUrl?: string;
  rating: number;
  publishedAt: string;
}

export const CASES: CaseStudy[] = [
  {
    slug: "iphone-15-pro-max-screen-broken",
    title: "iPhone 15 Pro Max 螢幕摔破，半小時換好",
    customerName: "板橋 林先生",
    device: "iPhone 15 Pro Max 256GB",
    serviceTags: ["iphone-screen-repair"],
    problem: "從口袋掉出來，正面玻璃整片爆裂，下半部觸控失靈",
    solution: "現場確認 OLED 顯示正常，更換完整螢幕總成（副廠 OLED 高階版）",
    result: "螢幕色彩、觸控、Face ID 全恢復正常，當日取件",
    duration: "30 分鐘",
    beforeImage: "/cases/iphone-broken-screen.jpg",
    afterImage: "/cases/screen-replacement.jpg",
    rating: 5,
    publishedAt: "2026-04-15",
  },
  {
    slug: "iphone-13-battery-bulge",
    title: "iPhone 13 電池膨脹頂起螢幕，緊急處理",
    customerName: "江子翠 陳小姐",
    device: "iPhone 13 128GB",
    serviceTags: ["iphone-battery-replacement"],
    problem: "電池健康度 76%，最近發現螢幕被頂起、邊緣縫隙變大",
    solution: "立即送修避免短路風險，更換 APPLE 原廠電池並重新貼合螢幕",
    result: "外觀復原，電池健康度恢復 100%",
    duration: "30 分鐘",
    beforeImage: "/cases/iphone-battery.jpg",
    afterImage: "/cases/iphone-disassembly.jpg",
    rating: 5,
    publishedAt: "2026-04-10",
  },
  {
    slug: "ipad-pro-screen-replacement",
    title: "iPad Pro 11 吋玻璃破裂，原廠級換修",
    customerName: "新埔 王先生",
    device: "iPad Pro 11 吋（M2）256GB WiFi",
    serviceTags: ["ipad-screen-repair"],
    problem: "車內被重物壓到，玻璃外層整片裂開但顯示正常",
    solution: "全貼合螢幕總成更換，原廠級 ProMotion 規格",
    result: "外觀如新，Apple Pencil 觸控反應正常",
    duration: "2 小時",
    beforeImage: "/cases/ipad-repair.jpg",
    afterImage: "/cases/phone-repair-bench.jpg",
    rating: 5,
    publishedAt: "2026-04-08",
  },
  {
    slug: "macbook-air-m2-battery-bulge",
    title: "MacBook Air M2 電池膨脹頂起鍵盤",
    customerName: "土城 黃先生",
    device: "MacBook Air 13.6 吋 M2",
    serviceTags: ["macbook-battery-replacement"],
    problem: "電池循環 800 次，鍵盤明顯凸起，觸控板按下卡卡的",
    solution: "拆解外殼，更換副廠認證電池，重新貼合外殼",
    result: "鍵盤觸控板恢復正常，續航時間明顯提升",
    duration: "3 小時",
    beforeImage: "/cases/macbook-repair.jpg",
    afterImage: "/cases/soldering.jpg",
    rating: 5,
    publishedAt: "2026-04-02",
  },
  {
    slug: "switch-oled-stick-drift",
    title: "Switch OLED 搖桿飄移，當天解決",
    customerName: "中和 李小姐",
    device: "Nintendo Switch OLED",
    serviceTags: ["switch-screen-repair"],
    problem: "玩遊戲時角色亂動，左 Joy-Con 磨菇頭飄移嚴重",
    solution: "更換左 Joy-Con 磨菇頭組件",
    result: "搖桿恢復正常，玩寶可夢沒問題了",
    duration: "30 分鐘",
    beforeImage: "/cases/switch-controller.jpg",
    afterImage: "/cases/tech-shop.jpg",
    rating: 5,
    publishedAt: "2026-03-28",
  },
  {
    slug: "dyson-v11-battery",
    title: "Dyson V11 續航變短，電池更換",
    customerName: "永和 蔡太太",
    device: "Dyson V11 Absolute",
    serviceTags: ["dyson-battery-replacement"],
    problem: "原本可吸 60 分鐘，現在不到 10 分鐘就沒電",
    solution: "更換高容量副廠電池（容量比原廠高 30%）",
    result: "續航恢復至 70 分鐘以上",
    duration: "30 分鐘",
    beforeImage: "/cases/dyson-vacuum.jpg",
    afterImage: "/cases/phone-repair-bench.jpg",
    rating: 5,
    publishedAt: "2026-03-20",
  },
];

export function getCasesByService(serviceSlug: string): CaseStudy[] {
  return CASES.filter(c => c.serviceTags.includes(serviceSlug));
}

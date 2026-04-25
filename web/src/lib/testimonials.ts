// 客戶評價（為 SEO + 信任）
// 含 AggregateRating Schema 用的真實評分

export interface Testimonial {
  name: string;
  initial: string;        // 顯示用「林」
  device: string;
  service: string;
  rating: number;
  comment: string;
  date: string;
  source?: "google" | "line" | "fb";
}

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "林先生",
    initial: "林",
    device: "iPhone 15 Pro Max",
    service: "螢幕維修",
    rating: 5,
    comment: "螢幕摔破當下很慌，老闆說 30 分鐘就能修好，現場等沒多久就拿到新的螢幕，OLED 顯示效果跟原本沒差。價格透明，開價就是最終價，不會臨時加錢。",
    date: "2026-04-15",
    source: "google",
  },
  {
    name: "陳小姐",
    initial: "陳",
    device: "iPhone 13",
    service: "電池更換",
    rating: 5,
    comment: "電池膨脹把螢幕頂起來，怕爆炸所以趕快來修。老闆很有耐心解釋風險，換完之後螢幕也重新貼合好，看不出來修過。LINE 預約很快。",
    date: "2026-04-10",
    source: "google",
  },
  {
    name: "王先生",
    initial: "王",
    device: "iPad Pro 11 吋",
    service: "螢幕維修",
    rating: 5,
    comment: "iPad 螢幕全貼合很複雜，老闆做得很細，外觀完全看不出來修過。Apple Pencil 也是用原本就順。值得信賴。",
    date: "2026-04-08",
    source: "line",
  },
  {
    name: "黃先生",
    initial: "黃",
    device: "MacBook Air M2",
    service: "電池更換",
    rating: 5,
    comment: "MacBook 電池膨脹鍵盤都被頂歪了，原本想直接買新的，老闆告訴我可以修就試試看。完工後跟新的一樣，省了好幾萬塊。",
    date: "2026-04-02",
    source: "google",
  },
  {
    name: "李小姐",
    initial: "李",
    device: "Switch OLED",
    service: "磨菇頭維修",
    rating: 5,
    comment: "搖桿飄移玩遊戲很煩，老闆說馬上就能換，等不到半小時就好了。價格便宜，懂得換就不用買新搖桿。",
    date: "2026-03-28",
    source: "google",
  },
  {
    name: "蔡太太",
    initial: "蔡",
    device: "Dyson V11",
    service: "電池更換",
    rating: 5,
    comment: "原本想說 Dyson 是不是只能送原廠，後來朋友介紹來 i時代，副廠電池容量更大，續航回到當初買的時候！老闆很實在。",
    date: "2026-03-20",
    source: "fb",
  },
  {
    name: "張先生",
    initial: "張",
    device: "iPhone 14 Pro",
    service: "後鏡頭維修",
    rating: 5,
    comment: "板橋唯一推薦！後鏡頭被刮花拍照都模糊，換完之後恢復如新。老闆很專業，當場讓我看細節，安心。",
    date: "2026-03-15",
    source: "google",
  },
  {
    name: "吳小姐",
    initial: "吳",
    device: "MacBook Pro 14 吋",
    service: "鍵盤維修",
    rating: 5,
    comment: "鍵盤被咖啡淋到不能用，原廠報價快兩萬，i時代修一半價錢。修完打字手感都正常。",
    date: "2026-03-10",
    source: "google",
  },
];

// 計算彙總評分（給 Schema.org AggregateRating 用）
export function getAggregateRating() {
  const total = TESTIMONIALS.reduce((sum, t) => sum + t.rating, 0);
  return {
    ratingValue: (total / TESTIMONIALS.length).toFixed(1),
    reviewCount: TESTIMONIALS.length,
    bestRating: 5,
    worstRating: 1,
  };
}

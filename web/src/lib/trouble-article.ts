// 機型故障文章 —— 每個機型一輩子只寫一篇，內文由該機型的真實資料組成
//
// 舊版只換機型名套同一套 5 題樣板，179 篇扣掉機型名只有 7 種內文。
// 現在讓內文本質上不同：
//   - 依機型特性（摺疊機、Face ID 世代、USB-C、Galaxy Ultra、ROG、iPad、MacBook…）取不同的問題庫
//   - 列出這台在站上真正提供的維修項目（各機型不同）
//   - 列出同系列的鄰近機型（各機型不同）
//   - 開頭、結尾、標題各有多種寫法，依機型固定挑選
// 不寫任何金額（站內規定：維修知識一律導到 /quote），也不提同行名稱。
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site-config";

interface Issue { t: string; cause: string; judge: string; act: string }

const COMMON: Issue[] = [
  { t: "螢幕破裂或觸控失靈", cause: "摔落、重壓、放在後口袋被擠壓", judge: "只碎外玻璃但顯示與觸控正常，或已出現黑斑、亮線、觸控斷點", act: "裂痕會隨時間擴大，觸控異常更要早處理，也避免碎玻璃割手、灰塵進入" },
  { t: "電池老化、續航變短", cause: "充放電循環累積、長期在高溫下使用或充電", judge: "電量掉得很快、天冷時突然關機、充電時機身異常發燙", act: "若螢幕或背蓋被頂起代表電池膨脹，請立即停用不要再充電" },
  { t: "充電孔接觸不良", cause: "口袋棉絮與灰塵堆積、插頭反覆拔插磨損、受潮氧化", judge: "要固定某個角度才充得進、充電斷斷續續、換了線材仍一樣", act: "很多情況只是髒污，清潔就能解決，不一定要更換零件" },
  { t: "鏡頭模糊或無法對焦", cause: "鏡頭外玻璃刮傷、摔落導致對焦或防手震模組損壞", judge: "畫面有霧狀或白點，或開相機時鏡頭發出咔咔聲、畫面抖動", act: "只有外層玻璃破可以單獨處理，模組損壞才需要更換整顆鏡頭" },
  { t: "喇叭或聽筒聲音小、破音", cause: "網孔被灰塵與油污堵住、進水", judge: "通話聽不清楚、外放有沙沙聲或音量明顯變小", act: "先清潔網孔再測試，仍異常才需要檢查零件" },
  { t: "進水或受潮", cause: "落水、雨天、浴室蒸氣", judge: "鏡頭內起霧、畫面出現水痕、功能時好時壞", act: "立即關機、不要充電也不要用吹風機，越早處理越有機會救回" },
  { t: "無法開機或反覆重開", cause: "電池耗盡、系統錯誤、主機板元件故障", judge: "充電半小時仍無反應，或一直卡在開機畫面", act: "先排除充電與電池問題，再判斷是否為主機板；裡面資料重要請先告知，我們會以保資料為優先" },
  { t: "訊號不穩、常顯示無服務", cause: "天線排線鬆脫、摔落、主機板射頻元件異常", judge: "同一個地點別人有訊號你沒有，或頻繁斷線", act: "先換 SIM 卡、重設網路設定測試，仍異常再做硬體檢測" },
];

const POOLS: Record<string, Issue[]> = {
  faceid: [
    { t: "Face ID 無法使用", cause: "摔落撞擊，或前次維修拆裝時傷到點陣投射器、排線", judge: "設定時顯示無法啟用 Face ID，或解鎖完全沒有反應", act: "Face ID 元件與主機板配對，必須保留原元件維修，換新零件無法恢復功能" },
    { t: "換螢幕後原彩顯示消失", cause: "更換螢幕時沒有轉移原本的螢幕資料", judge: "設定的螢幕顯示與亮度裡，原彩顯示選項不見了", act: "維修時應一併轉移螢幕資料，送修前可以先詢問店家是否有做" },
    { t: "出現「無法驗證零件」提示", cause: "更換過未配對或非原廠的零件", judge: "設定的「關於本機」出現零件與維修記錄", act: "通常不影響使用，若在意可選擇原廠零件方案" },
    { t: "背蓋玻璃破裂", cause: "背面朝下摔落", judge: "背面碎裂、無線充電不穩、鏡頭周圍出現裂痕", act: "背玻璃碎片可能刮傷手和鏡頭，建議不要拖太久" },
  ],
  usbc: [
    { t: "USB-C 充電孔鬆動", cause: "插著線時側向受力、拔插角度不正", judge: "線材插著稍微晃動就斷電，或要壓著才充得進", act: "先確認是否只是異物卡住，孔位本身變形才需要更換" },
    { t: "MagSafe 無線充電斷斷續續", cause: "背殼受損、磁吸元件位移，或保護殼太厚", judge: "拿掉保護殼後仍然不穩，才是機身本身的問題", act: "先排除配件因素，再檢查背殼與無線充電線圈" },
  ],
  touchid: [
    { t: "Home 鍵失靈或按壓沒反應", cause: "長期按壓疲勞、進水", judge: "按下去沒有回饋，或要很用力才有反應", act: "Home 鍵的指紋與主機板綁定，換新鍵會失去指紋功能，可先評估只修按壓結構" },
    { t: "指紋辨識失效", cause: "排線受損，常見於更換螢幕時拆裝不當", judge: "設定裡無法新增指紋，或一直辨識失敗", act: "原 Home 鍵還在的話保留原件維修，才有機會保住指紋" },
  ],
  foldable: [
    { t: "內螢幕摺痕處出現亮線或壞點", cause: "反覆開闔造成面板疲勞、異物夾在摺痕處", judge: "打開時中央出現直線、亮點，或摺痕附近觸控失靈", act: "發現異常就避免再用力按壓摺痕，內螢幕結構精密，越早處理越好" },
    { t: "轉軸鬆動或開闔有異音", cause: "轉軸磨損、沙塵卡入轉軸", judge: "無法停在半開角度、開闔時有喀喀聲", act: "轉軸問題會連帶拉扯內螢幕排線，建議不要硬撐" },
    { t: "內螢幕原廠保護膜起泡、翹起", cause: "保護膜老化、邊緣進灰", judge: "膜的邊緣翹起或中間出現氣泡", act: "原廠膜是螢幕結構的一部分，請勿自行撕除" },
    { t: "外螢幕破裂", cause: "闔起時外螢幕朝下摔落", judge: "外螢幕碎裂但內螢幕正常", act: "外螢幕可單獨處理，不需要連內螢幕一起換" },
  ],
  spen: [
    { t: "S Pen 感應不到或書寫斷線", cause: "筆尖磨損、筆身受潮，或螢幕下方感應層受損", judge: "拔出筆沒有跳出選單、書寫時斷斷續續", act: "先更換筆尖測試，仍沒反應再檢查感應層" },
    { t: "螢幕出現綠線或閃爍", cause: "OLED 面板老化、摔落撞擊", judge: "固定位置出現一條綠色或粉紅色直線", act: "硬體線條通常無法靠系統更新解決，需要檢測面板" },
    { t: "曲面邊緣誤觸", cause: "保護貼翹起、握持方式", judge: "手掌握著時畫面自己被點擊", act: "先換合適的保護貼，排除後仍誤觸才檢查觸控層" },
  ],
  pixel: [
    { t: "螢幕綠線或低亮度閃爍", cause: "面板老化、摔落", judge: "低亮度時畫面閃爍，或出現固定的綠色直線", act: "若更新系統後仍存在，多半是面板硬體問題" },
    { t: "處理器發熱、使用卡頓", cause: "長時間拍照、玩遊戲、5G 連線", judge: "機身燙手、畫面卡頓、相機自動關閉", act: "平常輕度使用也發燙的話，可能是電池或主機板問題" },
    { t: "指紋辨識變慢或失敗", cause: "保護貼太厚，或換螢幕後沒有重新校正", judge: "換保護貼前正常、換了之後變慢", act: "先換回較薄的保護貼並重新錄指紋測試" },
  ],
  gaming: [
    { t: "散熱風扇異音或不轉", cause: "灰塵堆積、外接散熱器受撞擊", judge: "運轉時有摩擦聲，或玩遊戲時溫度明顯偏高", act: "長時間過熱會影響電池與主機板，建議定期清潔" },
    { t: "側邊充電孔損壞", cause: "橫握玩遊戲時插著線受力", judge: "側邊孔鬆動，只剩底部孔能充電", act: "可只處理損壞的那個孔位" },
    { t: "肩鍵觸控失靈", cause: "邊框受撞擊、感應元件受潮", judge: "遊戲中肩鍵沒有反應或誤觸", act: "先在設定中重新校正，仍異常再做硬體檢測" },
  ],
  xperia: [
    { t: "防水膠條老化導致進水", cause: "拆過機沒有重新上膠、膠條老化", judge: "碰到水後出現異常，或鏡頭內起霧", act: "維修後應重新上防水膠，送修時可以先確認" },
    { t: "側邊指紋電源鍵失靈", cause: "長期按壓、進水", judge: "按下沒反應或指紋辨識失敗", act: "指紋與電源鍵是同一個元件，需整組檢測" },
    { t: "記憶卡槽讀不到卡", cause: "卡槽彈片變形、記憶卡本身損壞", judge: "換一張記憶卡仍讀不到", act: "先排除記憶卡問題，再檢查卡槽" },
  ],
  android: [
    { t: "快充失效，只剩一般充電", cause: "充電孔或線材損壞、充電晶片故障", judge: "用原廠線與充電器仍不顯示快充", act: "先換原廠線材測試，排除配件後再檢測機身" },
    { t: "充電時機身異常發燙", cause: "電池老化、充電孔接觸不良產生高阻抗", judge: "充電時燙到不敢拿，或充電速度明顯變慢", act: "持續高溫會加速電池膨脹，建議盡早檢查" },
    { t: "OLED 螢幕烙印、殘影", cause: "長時間顯示固定畫面，例如導航列、遊戲介面", judge: "切到灰色畫面時能看到淡淡的殘影", act: "烙印是面板物理老化，只能更換螢幕" },
    { t: "系統更新後耗電變快", cause: "背景程式重新整理、電池老化剛好被放大", judge: "更新後一兩天仍明顯比以前耗電", act: "先檢查耗電排行，排除軟體後再看電池健康" },
  ],
  ipad: [
    { t: "觸控飄移或局部沒反應", cause: "摔落、螢幕下方受壓、觸控 IC 故障", judge: "畫面自己亂點，或某一區塊點不到", act: "先重開機與取下保護貼測試，仍異常再檢測" },
    { t: "Apple Pencil 無法配對或斷線", cause: "筆或機身的藍牙、感應元件異常", judge: "換一支筆測試仍無法配對", act: "先確認系統版本與筆的型號相容，再做硬體檢測" },
    { t: "電池膨脹、螢幕被頂起", cause: "電池老化、長時間邊充邊用", judge: "螢幕邊緣浮起、機身變厚", act: "請立即停用，膨脹電池有起火風險" },
    { t: "機身彎曲", cause: "放在背包裡受壓、單手握持施力", judge: "放在桌上會搖晃、螢幕邊緣出現縫隙", act: "彎曲可能拉扯內部排線，有異常前就該檢查" },
    { t: "充電孔接觸不良", cause: "灰塵堆積、插頭受力", judge: "要固定角度才能充電", act: "先清潔孔位，多數情況可以改善" },
  ],
  mac: [
    { t: "鍵盤按鍵失靈或重複輸入", cause: "灰塵卡入、飲料潑灑", judge: "某幾顆鍵按了沒反應，或一按出現兩個字", act: "先用壓縮空氣清潔，進液的話請立即關機" },
    { t: "電池膨脹、觸控板被頂起", cause: "電池老化、長期插電使用", judge: "觸控板按不下去、底殼鼓起", act: "請立即停用，膨脹電池有安全風險" },
    { t: "螢幕下緣亮暗不均或黑屏", cause: "螢幕排線隨開闔磨損", judge: "螢幕開到某個角度就黑屏，或下緣出現光暈", act: "排線問題會越來越嚴重，建議及早檢查" },
    { t: "進液後無法開機", cause: "飲料、雨水", judge: "進液後無法開機或鍵盤異常", act: "立即關機、拔電，不要嘗試開機測試" },
  ],
  dyson: [
    { t: "吸力變弱", cause: "濾網、氣旋與管路堵塞", judge: "清潔濾網後吸力仍然不足", act: "先徹底清潔濾網與管路，再檢查馬達與電池" },
    { t: "運轉時斷斷續續停機", cause: "電池老化或過熱保護", judge: "使用一下就自動停止，或一頓一頓地運轉", act: "多半與電池有關，堵塞造成的過熱也會觸發" },
    { t: "馬達異音", cause: "軸承磨損、異物吸入", judge: "運轉時聲音明顯變大或有摩擦聲", act: "持續使用可能讓馬達損壞，建議停用檢查" },
    { t: "吹風機過熱自動斷電", cause: "進風口濾網堵塞", judge: "吹一下就自動關機", act: "先清潔進風口濾網，仍異常再送修" },
  ],
  switch: [
    { t: "Joy-Con 搖桿飄移", cause: "搖桿內部磨損、灰塵進入", judge: "沒有碰搖桿時角色自己移動", act: "校正無效時需要更換搖桿模組" },
    { t: "卡匣讀不到", cause: "卡匣槽針腳變形、卡匣髒污", judge: "換一片卡匣仍讀不到", act: "先清潔卡匣接點，再檢查卡匣槽" },
    { t: "風扇異音、機身過熱", cause: "灰塵堆積", judge: "遊戲中風扇聲很大、機身燙", act: "定期清潔散熱，避免長時間在底座內高負載運轉" },
    { t: "接底座無法輸出到電視", cause: "充電孔或影像晶片異常", judge: "掌機模式正常，接底座沒有畫面", act: "先換底座與線材測試，排除後再檢測主機" },
  ],
};

export interface ModelCtx {
  id: number;
  name: string;
  slug: string;
  section: string | null;
  brand: { slug: string; name: string; nameZh: string };
  items: string[];
  siblings: Array<{ name: string; slug: string }>;
}

function fnv(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let x = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    x = Math.imul(x ^ (x >>> 15), 2246822507) >>> 0;
    const j = x % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function profileOf(m: ModelCtx): { label: string; special: Issue[]; common: Issue[] } {
  const n = m.name, b = m.brand.slug, sec = m.section || "";
  const foldable = /fold|flip|trifold|find\s*n|razr|pocket/i.test(n);
  if (b === "dyson") return { label: "家電", special: POOLS.dyson, common: [] };
  if (b === "nintendo") return { label: "遊戲主機", special: POOLS.switch, common: [] };
  if (b === "apple" && /ipad/i.test(sec)) return { label: "平板", special: POOLS.ipad, common: [] };
  if (b === "apple" && /mac/i.test(sec)) return { label: "筆電", special: POOLS.mac, common: [] };
  if (b === "apple" && /touch/i.test(sec)) return { label: "手機", special: POOLS.touchid, common: COMMON };
  if (b === "apple") {
    const usbc = /iphone\s*(1[5-9]|air)|16e/i.test(n);
    return { label: "手機", special: [...POOLS.faceid, ...(usbc ? POOLS.usbc : [])], common: COMMON };
  }
  if (foldable) return { label: "摺疊手機", special: POOLS.foldable, common: COMMON };
  if (b === "samsung" && /ultra|note/i.test(n)) return { label: "手機", special: POOLS.spen, common: COMMON };
  if (b === "google") return { label: "手機", special: POOLS.pixel, common: COMMON };
  if (b === "asus" && /rog/i.test(n)) return { label: "電競手機", special: POOLS.gaming, common: COMMON };
  if (b === "sony") return { label: "手機", special: POOLS.xperia, common: COMMON };
  return { label: "手機", special: POOLS.android, common: COMMON };
}

interface ModelRow {
  id: number; name: string; slug: string; section: string | null; sortOrder: number; brandId: number;
  brand: { slug: string; name: string; nameZh: string };
}

async function loadModelRows(): Promise<ModelRow[]> {
  return prisma.deviceModel.findMany({
    where: { isActive: true, prices: { some: { isAvailable: true } } },
    select: {
      id: true, name: true, slug: true, section: true, sortOrder: true, brandId: true,
      brand: { select: { slug: true, name: true, nameZh: true } },
    },
  });
}

async function toCtx(m: ModelRow, all: ModelRow[]): Promise<ModelCtx> {
  const prices = await prisma.repairPrice.findMany({
    where: { modelId: m.id, isAvailable: true },
    select: { item: { select: { name: true } } },
  });
  const items = [...new Set(prices.map(p => p.item.name.replace(/[／/]/g, "／").trim()))];
  const siblings = all
    .filter(s => s.id !== m.id && s.brandId === m.brandId && s.section === m.section)
    .sort((a, b) => Math.abs(a.sortOrder - m.sortOrder) - Math.abs(b.sortOrder - m.sortOrder))
    .slice(0, 4)
    .map(s => ({ name: s.name, slug: s.slug }));
  return { id: m.id, name: m.name, slug: m.slug, section: m.section, brand: m.brand, items, siblings };
}

// 依 90 天實際瀏覽量排序：客人最常查的機型先寫，SEO 價值最高
export async function pickModelsWithoutArticle(limit: number): Promise<ModelCtx[]> {
  const all = await loadModelRows();
  const done = new Set((await prisma.autoArticle.findMany({
    where: { kind: "trouble_article" }, select: { slug: true },
  })).map(a => a.slug));
  const since = new Date(Date.now() - 90 * 86400_000);
  const pv = await prisma.pageView.groupBy({
    by: ["path"],
    where: { path: { startsWith: "/quote/" }, createdAt: { gte: since } },
    _count: { _all: true },
  }).catch(() => [] as Array<{ path: string; _count: { _all: number } }>);
  const views = new Map<string, number>();
  for (const r of pv) {
    let p = r.path;
    try { p = decodeURIComponent(p); } catch { /* 保留原樣 */ }
    views.set(p, (views.get(p) || 0) + r._count._all);
  }
  const picked = all
    .filter(m => !done.has(`trouble-${m.slug}`))
    .map(m => ({ m, v: views.get(`/quote/${m.brand.slug}/${m.slug}`) || 0 }))
    .sort((a, b) => b.v - a.v || a.m.brandId - b.m.brandId || a.m.sortOrder - b.m.sortOrder)
    .slice(0, limit);
  const out: ModelCtx[] = [];
  for (const { m } of picked) out.push(await toCtx(m, all));
  return out;
}

// 依品牌 + 機型名找機型（清理舊文章時用）
export async function findModelCtx(brandName: string, modelName: string): Promise<ModelCtx | null> {
  const all = await loadModelRows();
  const norm = (s: string) => s.toLowerCase().replace(/^galaxy\s+/, "").replace(/\s+/g, " ").trim();
  const target = norm(modelName);
  const hit = all.find(m => m.brand.name.toLowerCase() === brandName.toLowerCase() && norm(m.name) === target)
    ?? all.find(m => norm(m.name) === target);
  return hit ? toCtx(hit, all) : null;
}

export function buildTroubleArticle(m: ModelCtx) {
  const seed = fnv(m.slug);
  const prof = profileOf(m);
  const n = 4 + (seed % 2);                                       // 4 或 5 題
  const specialCount = prof.common.length ? Math.min(prof.special.length, 2 + (seed % 2)) : Math.min(prof.special.length, n);
  const special = seededShuffle(prof.special, seed).slice(0, specialCount);
  const common = seededShuffle(prof.common, seed >>> 3).filter(c => !special.some(s => s.t === c.t));
  const issues = [...special, ...common].slice(0, n);
  const M = m.name;
  // 題目嵌進句子或標題時拿掉本身的「」，避免「出現「無法驗證零件」提示」這種引號疊引號
  const [i1, i2, i3] = issues.map(i => i.t.replace(/[「」]/g, ""));
  const brandName = m.brand.nameZh && m.brand.nameZh !== m.brand.name ? `${m.brand.name}（${m.brand.nameZh}）` : m.brand.name;
  const quoteUrl = `/quote/${m.brand.slug}/${encodeURIComponent(m.slug)}`;
  const pick = <T,>(arr: T[], shift: number): T => arr[(seed >>> shift) % arr.length];

  const intros = [
    `${M} 是 ${brandName} 的${prof.label}機型。以下整理 i時代 處理 ${M} 時最常遇到的 ${issues.length} 種狀況，送修前可以先對照判斷。`,
    `${M} 出問題時，最常見的是「${i1}」與「${i2}」。這篇把成因、判斷方式和處理建議一次說清楚。`,
    `如果你的 ${M} 出現異常，先別急著換新機。多數問題可以單獨處理，以下是 ${issues.length} 個常見狀況的判斷方式。`,
    `${M} 目前在 i時代 可處理 ${m.items.length} 種維修項目。這篇挑出最常遇到的 ${issues.length} 個問題，說明原因與怎麼判斷要不要修。`,
    `${M} 常見的問題多半集中在${i1}、${i2}這幾類。先了解成因，比較能判斷是小問題還是需要送修。`,
  ];
  const introHeads = [`${M} 常見問題整理`, `${M} 壞了先看這裡`, `${M} 送修前的判斷方式`, `關於 ${M} 的常見故障`];
  const titles = [
    `${M} 常見故障與判斷方式｜${issues.length} 個問題一次看懂`,
    `${M} 壞了怎麼辦？${i1}、${i2}等常見狀況整理`,
    `${M} 維修指南：${i1}怎麼判斷、要不要修`,
    `${M} 送修前必看：${issues.length} 種常見問題與處理建議`,
  ];
  const closings: Array<[string, string]> = [
    ["送修前的小提醒", "能開機的話請先備份資料；有設定螢幕密碼也請告知，方便維修後完整測試。"],
    ["怎麼預約", "可以先在線上查報價，或直接用 LINE 傳照片給我們初步判斷。"],
    ["不確定是哪裡壞？", "可以先用免費自助診斷，或 LINE 描述狀況，我們會先說明可能原因與處理方式。"],
  ];
  const [closingHead, closingBody] = closings[seed % closings.length];

  const itemsLine = m.items.length
    ? `目前提供：${m.items.slice(0, 12).join("、")}${m.items.length > 12 ? ` 等 ${m.items.length} 項` : ""}。`
    : "";
  const siblingBlock = m.siblings.length
    ? `\n## 同系列其他機型\n\n${m.siblings.map(s => `- [${s.name} 維修報價](/quote/${m.brand.slug}/${encodeURIComponent(s.slug)})`).join("\n")}\n`
    : "";
  const resale = prof.label.includes("手機") || prof.label === "平板"
    ? `\n若評估後覺得維修不划算，${M} 也可以直接折現：[查詢二手回收價](/recycle)。\n`
    : "";

  const body = [
    `## ${pick(introHeads, 5)}`,
    "",
    pick(intros, 9),
    "",
    issues.map((it, k) => [
      `### ${k + 1}. ${it.t}`, "",
      `**常見原因**：${it.cause}`, "",
      `**怎麼判斷**：${it.judge}`, "",
      `**建議**：${it.act}`, "",
    ].join("\n")).join("\n"),
    `## ${M} 可以處理的維修項目`,
    "",
    `${itemsLine}各項費用會隨零件行情調整，站上每日更新：[👉 ${M} 即時維修報價](${quoteUrl})`,
    resale + siblingBlock,
    `## ${closingHead}`,
    "",
    closingBody,
    "",
    `- **LINE 預約折 $100**：[加入 ${SITE.lineId}](${SITE.lineAddUrl})`,
    `- **免費自助診斷**：[開始診斷](/diagnose)`,
    `- **來電**：${SITE.phone}`,
    "",
  ].join("\n");

  return {
    slug: `trouble-${m.slug}`,
    kind: "trouble_article",
    subject: M,
    // 同一個機型名可能出現在兩個品牌底下（例如「紅米 14C」），標題會撞；
    // 回傳依機型輪替的候選清單，存檔時撞到就換下一個
    title: titles[(seed >>> 13) % titles.length],
    titleCandidates: titles.map((_, k) => titles[((seed >>> 13) + k) % titles.length]),
    excerpt: `${M} 常見的${issues.slice(0, 3).map(i => i.t).join("、")}，成因與判斷方式整理，維修報價可線上即時查詢。`,
    body,
    metaDescription: `${M} 常見故障：${[i1, i2, i3].filter(Boolean).join("、")}的成因與判斷方式。i時代板橋江子翠，透明報價，現場維修。`,
    keywords: [M, `${M} 維修`, ...issues.map(i => `${M} ${i.t.split(/[、，或]/)[0]}`), "板橋手機維修"].join(","),
    coverContext: [m.slug, M, m.brand.name, prof.label, i1],
  };
}

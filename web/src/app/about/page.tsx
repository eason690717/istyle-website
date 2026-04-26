import { SITE } from "@/lib/site-config";
import { GoogleMap } from "@/components/google-map";
import { TestimonialsGrid } from "@/components/testimonials";
import { getAggregateRating } from "@/lib/testimonials";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `關於 ${SITE.name} — 板橋手機維修專門店`,
  description: `${SITE.name}（${SITE.legalName}）2011 年成立於新北市板橋區，14 年技術經驗，累積維修超過 ${SITE.repairsCount} 台手機平板筆電。`,
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-serif text-3xl text-[var(--gold)] md:text-4xl">
        關於 {SITE.name}
      </h1>

      <p className="mt-6 text-base leading-relaxed text-[var(--fg)]">
        <strong className="text-[var(--gold)]">{SITE.name}</strong>（i-style）
        是 <strong>2011 年</strong>成立於 <strong>新北市板橋區</strong>（江子翠商圈）
        的手機維修專門店，由 <strong>{SITE.legalName}</strong>（統一編號 42648769）經營。
      </p>

      <p className="mt-4 text-base leading-relaxed text-[var(--fg)]">
        14 年來，我們累積維修超過 <strong>{SITE.repairsCount} 台</strong>
        各品牌行動裝置。從基礎的換螢幕、換電池，到專業的主機板維修、容量擴充，
        我們以職人精神對待每一次拆機。
      </p>

      <h2 className="mt-10 font-serif text-2xl text-[var(--gold)]">服務範圍</h2>
      <ul className="mt-4 space-y-2 text-[var(--fg)]">
        <li>• <strong>Apple 系列</strong>：iPhone、iPad、MacBook Air、MacBook Pro、Mac mini、iMac、Apple Watch、AirPods</li>
        <li>• <strong>Android 系列</strong>：Samsung、Google Pixel、Sony、ASUS、OPPO、Xiaomi、HUAWEI</li>
        <li>• <strong>遊戲主機</strong>：Nintendo Switch、PS5、PS4</li>
        <li>• <strong>家電維修</strong>：Dyson 吸塵器、吹風機、空清</li>
        <li>• <strong>二手機回收</strong>：高價現金收購、現場估價</li>
        <li>• <strong>維修課程</strong>：iPhone / Android 基礎與進階拆機培訓</li>
      </ul>

      <h2 className="mt-10 font-serif text-2xl text-[var(--gold)]">我們的承諾</h2>
      <ul className="mt-4 space-y-3 text-[var(--fg)]">
        <li>
          <strong className="text-[var(--gold)]">透明報價</strong>：
          所有機型維修費用線上即可查詢，無隱藏費用。
        </li>
        <li>
          <strong className="text-[var(--gold)]">當日完工</strong>：
          常見維修 30 分鐘 – 2 小時內完成。
        </li>
        <li>
          <strong className="text-[var(--gold)]">保固承諾</strong>：
          標準維修保固 3 個月。
        </li>
        <li>
          <strong className="text-[var(--gold)]">資料保密</strong>：
          維修過程不查看客戶資料，建議客戶事先自行備份。
        </li>
      </ul>

      <h2 className="mt-10 font-serif text-2xl text-[var(--gold)]">門市位置</h2>
      <div className="mt-4">
        <GoogleMap height={400} />
      </div>

      <div className="refined-card mt-6 p-6">
        <p className="text-[var(--fg)]"><strong>地址</strong>：{SITE.address.street}</p>
        <p className="mt-2 text-[var(--fg)]"><strong>電話</strong>：<a href={`tel:${SITE.phoneRaw}`} className="text-[var(--gold)]">{SITE.phone}</a></p>
        <p className="mt-2 text-[var(--fg)]"><strong>LINE</strong>：<a href={SITE.lineAddUrl} className="text-[var(--gold)]">{SITE.lineId}</a></p>
        <p className="mt-2 text-[var(--fg)]"><strong>Email</strong>：<a href={`mailto:${SITE.email}`} className="text-[var(--gold)]">{SITE.email}</a></p>
        <p className="mt-2 text-[var(--fg)]"><strong>營業時間</strong>：每日 11:00–21:00</p>
      </div>

      <h2 className="mt-12 font-serif text-2xl text-[var(--gold)]">客戶見證</h2>
      <p className="mt-2 text-sm text-[var(--fg-muted)]">
        ★ {getAggregateRating().ratingValue}/5 ({getAggregateRating().reviewCount} 則評價)
      </p>
      <div className="mt-6">
        <TestimonialsGrid limit={4} />
      </div>
    </article>
  );
}

"use client";
import { useState } from "react";
import Link from "next/link";
import { SITE } from "@/lib/site-config";

interface Symptom {
  id: string;
  label: string;
  category: string;
  causes: Array<{
    name: string;
    description: string;
    estimatedCost: string;
    urgency: "low" | "medium" | "high";
    relatedSlug?: string;
  }>;
}

const SYMPTOMS: Symptom[] = [
  {
    id: "screen-broken",
    label: "螢幕破裂 / 玻璃裂",
    category: "螢幕",
    causes: [
      { name: "外玻璃破裂", description: "顯示與觸控正常，僅外層玻璃碎", estimatedCost: "$1,800–6,000", urgency: "medium", relatedSlug: "iphone-screen-repair-cost-2026" },
      { name: "整片螢幕破裂", description: "顯示異常或觸控失靈", estimatedCost: "$3,200–14,200", urgency: "high", relatedSlug: "iphone-screen-repair-cost-2026" },
    ],
  },
  {
    id: "touch-not-working",
    label: "觸控失靈 / 部分區域無反應",
    category: "螢幕",
    causes: [
      { name: "觸控 IC 故障", description: "螢幕能顯示但觸控部分或全失靈", estimatedCost: "$3,200–6,000", urgency: "high", relatedSlug: "iphone-12-touch-screen-issue" },
      { name: "螢幕排線鬆脫", description: "拆機後重接可解，無需換螢幕", estimatedCost: "$500–1,500", urgency: "medium" },
    ],
  },
  {
    id: "green-screen",
    label: "螢幕變綠 / 出現綠色色塊",
    category: "螢幕",
    causes: [
      { name: "OLED 色衰", description: "面板物理性損傷，需換螢幕", estimatedCost: "$3,200–14,200", urgency: "medium", relatedSlug: "iphone-13-pro-green-screen" },
      { name: "iOS 韌體 bug", description: "升級到最新版可能解決", estimatedCost: "免費", urgency: "low", relatedSlug: "iphone-13-pro-green-screen" },
    ],
  },
  {
    id: "battery-drain",
    label: "電池續航變短 / 自動關機",
    category: "電池",
    causes: [
      { name: "電池老化", description: "健康度低於 80% 建議更換", estimatedCost: "認證電池 $1,500 起 ★ 推薦", urgency: "medium", relatedSlug: "iphone-battery-should-replace" },
    ],
  },
  {
    id: "battery-bulge",
    label: "電池膨脹 / 螢幕被頂起",
    category: "電池",
    causes: [
      { name: "電池膨脹", description: "⚠️ 立即停用，可能短路起火", estimatedCost: "$1,500–4,100", urgency: "high", relatedSlug: "iphone-battery-should-replace" },
    ],
  },
  {
    id: "no-charging",
    label: "無法充電 / 充電緩慢",
    category: "充電",
    causes: [
      { name: "充電孔氧化", description: "棉花棒清潔可能可解，否則換尾插", estimatedCost: "$1,000–1,500", urgency: "medium" },
      { name: "Lightning 排線故障", description: "需更換充電排線", estimatedCost: "$1,500", urgency: "medium" },
      { name: "電池或主機板 IC", description: "電池太老或電源 IC 故障", estimatedCost: "$2,500–5,000", urgency: "high" },
    ],
  },
  {
    id: "face-id-fail",
    label: "Face ID 失效 / 無法解鎖",
    category: "Face ID",
    causes: [
      { name: "Face ID 排線損壞", description: "通常因螢幕維修不當", estimatedCost: "$3,500", urgency: "medium", relatedSlug: "iphone-x-face-id-failure" },
      { name: "點陣投射器故障", description: "高溫或撞擊造成", estimatedCost: "$4,500", urgency: "medium", relatedSlug: "iphone-x-face-id-failure" },
    ],
  },
  {
    id: "overheating",
    label: "機身過熱 / 自動降頻",
    category: "效能",
    causes: [
      { name: "iOS 韌體問題", description: "升級到最新版可能改善", estimatedCost: "免費", urgency: "low", relatedSlug: "iphone-14-pro-overheating" },
      { name: "電池或散熱片故障", description: "需現場檢測", estimatedCost: "$2,500–5,000", urgency: "medium", relatedSlug: "iphone-14-pro-overheating" },
    ],
  },
  {
    id: "water-damage",
    label: "進水 / 受潮",
    category: "意外",
    causes: [
      { name: "立即送修", description: "⚠️ 不要開機！氧化會擴散到主機板", estimatedCost: "$2,000–10,000+", urgency: "high" },
    ],
  },
  {
    id: "camera-blur",
    label: "相機模糊 / 對焦異常",
    category: "鏡頭",
    causes: [
      { name: "鏡頭髒污", description: "用拭鏡布擦拭可能可解", estimatedCost: "免費", urgency: "low" },
      { name: "對焦馬達故障", description: "需更換鏡頭模組", estimatedCost: "$1,300–3,500", urgency: "medium" },
    ],
  },
  {
    id: "camera-shake",
    label: "相機震動 / 嗡嗡聲",
    category: "鏡頭",
    causes: [
      { name: "OIS 防手震晶片故障", description: "iPhone 7+ 起常見", estimatedCost: "$2,500–4,500", urgency: "medium" },
    ],
  },
  {
    id: "speaker-bad",
    label: "聽筒 / 喇叭沒聲音",
    category: "音訊",
    causes: [
      { name: "聽筒網孔阻塞", description: "用軟刷清潔可能可解", estimatedCost: "免費", urgency: "low" },
      { name: "聽筒模組故障", description: "需更換聽筒總成", estimatedCost: "$1,000–1,800", urgency: "medium" },
    ],
  },
];

const URGENCY_COLOR = {
  low: "bg-green-500/20 text-green-300",
  medium: "bg-yellow-500/20 text-yellow-300",
  high: "bg-red-500/20 text-red-300",
};
const URGENCY_LABEL = { low: "輕微", medium: "中度", high: "緊急" };

export function DiagnoseTool() {
  const [selected, setSelected] = useState<string | null>(null);
  const symptom = SYMPTOMS.find(s => s.id === selected);

  return (
    <div>
      {/* 症狀選擇格 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SYMPTOMS.map(s => (
          <button
            key={s.id}
            onClick={() => setSelected(s.id)}
            className={`rounded-lg border p-4 text-left transition ${
              selected === s.id
                ? "border-[var(--gold)] bg-[var(--bg-soft)]"
                : "border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--gold-soft)]"
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider text-[var(--gold-soft)]">{s.category}</div>
            <div className="mt-1 text-sm font-medium text-[var(--fg)]">{s.label}</div>
          </button>
        ))}
      </div>

      {/* 結果顯示 */}
      {symptom && (
        <div className="mt-8 rounded-xl border border-[var(--gold)] bg-[var(--bg-elevated)] p-6">
          <h2 className="font-serif text-xl text-[var(--gold)]">
            可能原因：{symptom.label}
          </h2>
          <p className="mt-2 text-xs text-[var(--fg-muted)]">以下為 i時代 14 年維修經驗整理的可能原因，實際以現場檢測為準</p>

          <div className="mt-5 space-y-3">
            {symptom.causes.map((cause, i) => (
              <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[var(--gold)]">{cause.name}</h3>
                      <span className={`rounded px-2 py-0.5 text-[10px] ${URGENCY_COLOR[cause.urgency]}`}>
                        {URGENCY_LABEL[cause.urgency]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--fg)]">{cause.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-[var(--fg-muted)]">預估</div>
                    <div className="font-mono text-sm text-[var(--gold)]">{cause.estimatedCost}</div>
                  </div>
                </div>
                {cause.relatedSlug && (
                  <Link
                    href={`/blog/${cause.relatedSlug}`}
                    className="mt-2 inline-block text-[10px] text-[var(--gold-soft)] underline hover:text-[var(--gold)]"
                  >
                    深入了解 →
                  </Link>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3 border-t border-[var(--border-soft)] pt-5">
            <a href={SITE.lineAddUrl} className="btn-gold rounded-full px-6 py-2 text-sm">
              LINE 詢問（折 $100）
            </a>
            <a href={`tel:${SITE.phoneRaw}`} className="btn-gold-outline rounded-full px-6 py-2 text-sm">
              來電 {SITE.phone}
            </a>
            <Link href="/quote" className="btn-gold-outline rounded-full px-6 py-2 text-sm">
              查機型報價
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

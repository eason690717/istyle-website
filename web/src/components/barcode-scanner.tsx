"use client";
// 條碼掃描器 — 用瀏覽器原生 BarcodeDetector API（Chrome / Edge 支援）
// 沒支援的瀏覽器會看到「不支援」提示，但仍可以手動輸入
import { useEffect, useRef, useState } from "react";

interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    let detector: { detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>> } | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function start() {
      // 偵測支援
      const win = window as unknown as { BarcodeDetector?: typeof Object };
      if (!win.BarcodeDetector) {
        setSupported(false);
        setError("此瀏覽器不支援條碼掃描，請手動輸入或改用 Chrome");
        return;
      }
      setSupported(true);

      // 後鏡頭優先
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        setError(`無法存取相機：${e instanceof Error ? e.message : "權限被拒？"}`);
        return;
      }

      // 建立偵測器
      try {
        // @ts-expect-error 瀏覽器新 API，TS lib 預設沒列
        detector = new window.BarcodeDetector({
          formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code", "upc_a", "upc_e"],
        });
      } catch {
        setError("無法初始化條碼偵測器");
        return;
      }

      // 每 200ms 偵測一次
      interval = setInterval(async () => {
        if (!videoRef.current || !detector) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) {
            const code = codes[0].rawValue;
            if (code) {
              if ("vibrate" in navigator) (navigator as Navigator).vibrate(50);
              onDetected(code);
              if (interval) clearInterval(interval);
              streamRef.current?.getTracks().forEach(t => t.stop());
            }
          }
        } catch { /* swallow per-frame errors */ }
      }, 200);
    }

    start();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <div className="flex items-center justify-between border-b border-white/10 bg-black/80 p-3 text-white">
        <div className="text-sm">📷 條碼掃描中</div>
        <button onClick={onClose} className="rounded-full border border-white/30 px-3 py-1 text-xs">取消</button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted />
        {/* 對齊框 */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-32 w-72 rounded-lg border-4 border-[var(--gold)]/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
            <div className="absolute inset-x-0 top-1/2 h-px bg-red-500/80" />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/60 p-3 text-center text-sm text-white">{error}</div>
      )}
      {supported === null && (
        <div className="bg-black/80 p-3 text-center text-xs text-white/60">啟動相機中...</div>
      )}
    </div>
  );
}

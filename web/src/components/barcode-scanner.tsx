"use client";
// 條碼掃描 — 跨瀏覽器版（用 @zxing/browser，iOS Safari / LINE 內建 / Chrome 都支援）
// 之前用 BarcodeDetector API 只支援 Chrome / Edge，iOS Safari / LINE 看不到
import { useEffect, useRef, useState } from "react";

interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("初始化中...");

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("此瀏覽器不支援相機。請手動輸入條碼，或改用 Chrome / Safari");
        return;
      }

      setStatus("請允許相機權限...");
      try {
        const mod = await import("@zxing/browser");
        const reader = new mod.BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result) => {
            if (cancelled) return;
            if (result) {
              const code = result.getText();
              if (code) {
                if ("vibrate" in navigator) (navigator as Navigator).vibrate(60);
                onDetected(code);
                controls.stop();
              }
            }
          }
        );
        controlsRef.current = controls;
        setStatus("");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/permission|denied|NotAllowed/i.test(msg)) {
          setError("相機權限被拒。請去手機 設定 → Safari/Chrome → 相機 → 允許");
        } else if (/NotFound/i.test(msg)) {
          setError("找不到相機");
        } else {
          setError(`相機啟動失敗：${msg}`);
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      try { controlsRef.current?.stop(); } catch { /* swallow */ }
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <div className="flex items-center justify-between border-b border-white/10 bg-black/80 p-3 text-white" style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}>
        <div className="text-sm">📷 條碼掃描中</div>
        <button onClick={onClose} className="rounded-full border border-white/30 px-3 py-1 text-xs">取消</button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />
        {/* 對齊框 */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-32 w-72 rounded-lg border-4 border-[var(--gold)]/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
            <div className="absolute inset-x-0 top-1/2 h-px bg-red-500/80" />
          </div>
        </div>
        {status && (
          <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-white/80">
            {status}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-900/70 p-3 text-center text-sm text-white" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
          {error}
        </div>
      )}
    </div>
  );
}

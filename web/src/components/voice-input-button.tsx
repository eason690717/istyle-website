"use client";
// 語音輸入按鈕 — 用 Web Speech API（Chrome / Edge / Safari iOS 15+ 支援）
import { useEffect, useRef, useState } from "react";

interface Props {
  lang?: string;          // 預設 zh-TW
  onResult: (text: string) => void;
  className?: string;
  label?: string;         // 沒支援時顯示，有支援時不顯示按鈕文字（純圖示）
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

export function VoiceInputButton({ lang = "zh-TW", onResult, className = "", label = "🎤 語音" }: Props) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const win = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  function start() {
    if (listening) { recRef.current?.stop(); return; }
    const win = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SR) { alert("此瀏覽器不支援語音輸入"); return; }

    const r = new SR();
    r.lang = lang;
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript;
      if (transcript) onResult(transcript.trim());
    };
    r.onerror = (e) => {
      console.error("voice error", e.error);
      setListening(false);
    };
    r.onend = () => setListening(false);
    r.start();
    recRef.current = r;
    setListening(true);
  }

  if (supported === false) return null;  // 不支援就直接不顯示按鈕（避免 UI 噪音）

  return (
    <button
      type="button"
      onClick={start}
      className={`${className} ${listening ? "bg-red-500 text-white animate-pulse" : ""}`}
      aria-label="語音輸入"
    >
      {listening ? "🎙 聆聽中..." : label}
    </button>
  );
}

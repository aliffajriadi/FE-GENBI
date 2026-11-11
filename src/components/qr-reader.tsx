"use client";
import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";

// Kamera membaca QR; onResult dipanggil sekali per kode yang berbeda (jeda 3 dtk untuk kode sama).
export function QrReader({ onResult, paused }: { onResult: (text: string) => void; paused?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const cb = useRef(onResult);
  cb.current = onResult;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!video.current) return;
    let last = { text: "", at: 0 };
    const s = new QrScanner(
      video.current,
      (r) => {
        if (pausedRef.current) return;
        const now = Date.now();
        if (r.data === last.text && now - last.at < 3000) return;
        last = { text: r.data, at: now };
        cb.current(r.data);
      },
      { preferredCamera: "environment", highlightScanRegion: true, maxScansPerSecond: 5 },
    );
    s.start().catch(() => setError("Kamera tidak bisa dibuka. Izinkan akses kamera di browser."));
    return () => s.destroy();
  }, []);

  return (
    <div className="overflow-hidden rounded-lg bg-slate-900">
      <video ref={video} className="aspect-square w-full object-cover" muted playsInline />
      {error && <p className="bg-red-50 p-3 text-[13px] text-red-700">{error}</p>}
    </div>
  );
}

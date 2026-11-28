"use client";
import { useEffect, useRef, useState } from "react";
import { Download, Share2, X } from "lucide-react";

type Props = { src: string; kind: "image" | "video"; onClose: () => void; onDownload: () => void; onShare: () => void };

// Pratinjau 3D: kartu foto miring mengikuti kursor/jari, dengan kilau seperti kertas foto.
export function Preview3D({ src, kind, onClose, onDownload, onShare }: Props) {
  const [tilt, setTilt] = useState<{ x: number; y: number } | null>(null);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { removeEventListener("keydown", onKey); document.body.style.overflow = overflow; };
  }, [onClose]);

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTilt({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 });
  };
  const media = "block max-h-[68dvh] w-auto max-w-[80vw] rounded-md select-none";
  const btn = "inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-medium";

  return (
    <div role="dialog" aria-modal="true" aria-label="Pratinjau 3D" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-slate-950/85 p-4 backdrop-blur-sm" onClick={onClose}>
      <style>{`@keyframes pb-sway{0%,100%{transform:rotateY(-14deg) rotateX(6deg)}50%{transform:rotateY(14deg) rotateX(-4deg)}}
        @media (prefers-reduced-motion:reduce){.pb-card{animation:none!important}}`}</style>
      <div className="[perspective:1200px]" onClick={(e) => e.stopPropagation()}>
        <div onPointerMove={move} onPointerLeave={() => setTilt(null)} onPointerDown={move}
          className="pb-card relative touch-none rounded-lg bg-white p-2 shadow-[0_40px_80px_-20px_rgba(0,0,0,.7)] transition-transform duration-150 ease-out [transform-style:preserve-3d]"
          style={tilt ? { transform: `rotateY(${tilt.x * 30}deg) rotateX(${-tilt.y * 24}deg) translateZ(20px)` } : { animation: "pb-sway 6s ease-in-out infinite" }}>
          {kind === "image" ? <img src={src} alt="Hasil photobooth" className={media} draggable={false} />
            : <video src={src} autoPlay loop muted playsInline className={media} />}
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-lg mix-blend-soft-light"
            style={{ background: `radial-gradient(circle at ${((tilt?.x ?? 0) + 0.5) * 100}% ${((tilt?.y ?? -0.2) + 0.5) * 100}%, rgba(255,255,255,.55), transparent 55%)` }} />
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2" onClick={(e) => e.stopPropagation()}>
        <button className={`${btn} bg-white text-slate-900 hover:bg-slate-100`} onClick={onDownload}><Download size={17} aria-hidden /> Unduh</button>
        <button className={`${btn} bg-white/10 text-white ring-1 ring-white/30 hover:bg-white/20`} onClick={onShare}><Share2 size={16} aria-hidden /> Bagikan</button>
        <button ref={close} className={`${btn} text-white/80 hover:text-white`} onClick={onClose}><X size={16} aria-hidden /> Tutup</button>
      </div>
      <p className="text-xs text-white/50">Gerakkan kursor atau geser jari di atas foto</p>
    </div>
  );
}

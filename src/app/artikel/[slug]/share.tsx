"use client";
import { useState } from "react";
import { Check, Link2 } from "lucide-react";

// Ikon brand digambar sebagai teks singkat, bukan logo resmi.
export function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const share = (base: string) => () => window.open(base + encodeURIComponent(`${title} ${window.location.href}`), "_blank", "noopener,noreferrer");
  const btn = "grid size-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900";
  return (
    <div className="flex items-center gap-1">
      <button onClick={share("https://wa.me/?text=")} className={`${btn} text-[11px] font-bold`} aria-label="Bagikan ke WhatsApp">WA</button>
      <button onClick={share("https://twitter.com/intent/tweet?text=")} className={`${btn} text-[11px] font-bold`} aria-label="Bagikan ke X">X</button>
      <button onClick={() => navigator.clipboard.writeText(window.location.href).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })} className={btn} aria-label="Salin tautan">
        {copied ? <Check size={17} /> : <Link2 size={17} />}
      </button>
    </div>
  );
}

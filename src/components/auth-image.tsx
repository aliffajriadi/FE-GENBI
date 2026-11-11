"use client";
import { useEffect, useState } from "react";
import { fileBlobUrl } from "@/lib/api";
import { Skeleton } from "./ui";

// <img> untuk file privat (butuh token).
export function AuthImage({ url, alt, className }: { url: string; alt: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let blob = "";
    fileBlobUrl(url).then((b) => setSrc((blob = b))).catch(() => setErr(true));
    return () => { if (blob) URL.revokeObjectURL(blob); };
  }, [url]);
  if (err) return <div className={`grid place-items-center bg-slate-50 text-xs text-slate-400 ${className}`}>Tidak bisa dimuat</div>;
  if (!src) return <Skeleton className={className} />;
  return <img src={src} alt={alt} className={className} />;
}

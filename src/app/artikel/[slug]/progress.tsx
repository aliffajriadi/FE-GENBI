"use client";
import { useEffect, useState } from "react";

// Bilah progres baca tipis di atas halaman.
export function ReadingProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => {
      const h = document.documentElement;
      setP(h.scrollHeight <= h.clientHeight ? 0 : (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return <div className="fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent" aria-hidden><div className="h-full bg-primary transition-[width] duration-75" style={{ width: `${p}%` }} /></div>;
}

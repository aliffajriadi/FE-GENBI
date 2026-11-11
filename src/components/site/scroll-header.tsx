"use client";
import { useEffect, useState } from "react";

// Header beranda: transparan + konten putih di atas foto hero, jadi putih solid setelah di-scroll.
// Anak elemen membaca status lewat varian `group-data-[scrolled=true]/h:`.
export function ScrollHeader({ className, children }: { className: string; children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <header data-scrolled={scrolled} className={`group/h ${className}`}>{children}</header>;
}

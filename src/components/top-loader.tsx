"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

// Bilah loading tipis di atas saat pindah halaman (App Router tidak punya event router, jadi dengarkan klik tautan internal).
function Bar() {
  const path = usePathname();
  const search = useSearchParams();
  const [w, setW] = useState(0);
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    const start = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      clearInterval(timer.current);
      setShow(true);
      setW(12);
      // Merayap mendekati 90% sampai halaman baru selesai dirender.
      timer.current = setInterval(() => setW((x) => x + (90 - x) * 0.08), 120);
    };
    document.addEventListener("click", start, true);
    return () => document.removeEventListener("click", start, true);
  }, []);

  useEffect(() => {
    if (!show) return;
    clearInterval(timer.current);
    setW(100);
    const t = setTimeout(() => { setShow(false); setW(0); }, 250);
    return () => clearTimeout(t);
  }, [path, search]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[3px]" style={{ opacity: show ? 1 : 0, transition: "opacity 250ms" }}>
      <div className="h-full bg-primary shadow-[0_0_8px_var(--primary)]" style={{ width: `${w}%`, transition: "width 200ms ease-out" }} />
    </div>
  );
}

export function TopLoader() {
  return <Suspense><Bar /></Suspense>;
}

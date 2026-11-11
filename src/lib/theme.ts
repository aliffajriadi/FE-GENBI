"use client";
import { useEffect, useState } from "react";

// Tema: "light" (bawaan) | "dark" | "system" (ikut perangkat). Disimpan per browser; kelas .dark dipasang di <html>.
export type Theme = "system" | "light" | "dark";
const KEY = "theme";

// Dijalankan inline di <head> sebelum halaman tampil supaya tidak ada kedip putih.
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

const apply = (t: Theme) =>
  document.documentElement.classList.toggle("dark", t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches));

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    let saved: Theme = "light";
    try { saved = (localStorage.getItem(KEY) as Theme) || "light"; } catch {}
    setTheme(saved);
    // Mode "system": ikut berubah saat perangkat ganti terang/gelap.
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => { try { if (localStorage.getItem(KEY) === "system") apply("system"); } catch {} };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const set = (t: Theme) => {
    setTheme(t);
    try { localStorage.setItem(KEY, t); } catch {}
    apply(t);
  };
  return [theme, set] as const;
}

"use client";
import { useEffect } from "react";

// Jeda = durasi progress bar di page.tsx (1,2 dtk); replace = tombol Back tidak kembali ke halaman ini.
export function Redirect({ to }: { to: string }) {
  useEffect(() => {
    const t = setTimeout(() => location.replace(to), 1200);
    return () => clearTimeout(t);
  }, [to]);
  return null;
}

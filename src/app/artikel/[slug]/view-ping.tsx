"use client";
import { useEffect } from "react";

// Hitung view dari browser (bukan saat SSR/cache) supaya angka tidak ikut revalidate.
export function ViewPing({ slug }: { slug: string }) {
  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
    fetch(`${api}/public/articles/${encodeURIComponent(slug)}?view=1`).catch(() => {});
  }, [slug]);
  return null;
}

// Fetch data publik dari server Next (SSR + cache). API mati → fallback supaya halaman tetap tampil.
// Server Next memanggil backend langsung; gambar /storage untuk browser tetap relatif (lewat proxy) kecuali NEXT_PUBLIC_API_URL diisi.
const PUB = process.env.NEXT_PUBLIC_API_URL;
const API = process.env.API_URL_INTERNAL || PUB || `${process.env.BACKEND_URL || "http://localhost:4000"}/api/v1`;
export const API_ORIGIN = PUB ? new URL(PUB).origin : "";
export const publicImg = (url: string | null) => (url ? (url.startsWith("/storage/") ? API_ORIGIN + url : url) : null);

export async function getPublic<T>(path: string, fallback: T, revalidate = 300): Promise<T> {
  try {
    const r = await fetch(`${API}${path}`, { next: { revalidate } });
    return r.ok ? ((await r.json()).data as T) : fallback;
  } catch {
    return fallback;
  }
}

export type ArticleKind = "NEWS" | "PERSONAL";
export type PublicArticle = {
  id: string; title: string; slug: string; kind: ArticleKind; excerpt: string | null; coverUrl: string | null; coverAlt: string | null; publishedAt: string;
  readMinutes?: number; author: { id?: string; name: string; avatarUrl?: string | null; profilePublic?: boolean }; division: { name: string } | null; tags: { name: string; slug: string }[];
};

export const KIND = {
  NEWS: { label: "Kabar GenBI", href: "/kabar" },
  PERSONAL: { label: "Artikel Anggota", href: "/artikel" },
} as const;

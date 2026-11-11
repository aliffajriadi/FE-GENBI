import { redirect } from "next/navigation";

// Tautan lama /tulisan → /artikel (nama menu diganti jadi "Artikel").
export default async function Page({ searchParams }: { searchParams: Promise<{ tag?: string; q?: string }> }) {
  const { tag, q } = await searchParams;
  const qs = new URLSearchParams({ ...(tag && { tag }), ...(q && { q }) }).toString();
  redirect(`/artikel${qs ? `?${qs}` : ""}`);
}

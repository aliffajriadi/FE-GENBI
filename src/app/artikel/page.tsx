import type { Metadata } from "next";
import { ArticleIndex } from "@/components/site/article-index";

export const metadata: Metadata = { title: "Artikel Anggota · MyGenBI", description: "Cerita, opini, dan catatan pribadi anggota GenBI." };

export default async function Page({ searchParams }: { searchParams: Promise<{ tag?: string; q?: string; sort?: string; page?: string }> }) {
  return <ArticleIndex kind="PERSONAL" {...await searchParams} />;
}

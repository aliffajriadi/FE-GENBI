import type { Metadata } from "next";
import { ArticleIndex } from "@/components/site/article-index";

export const metadata: Metadata = { title: "Kabar GenBI · MyGenBI", description: "Liputan kegiatan dan kabar resmi dari pengurus GenBI." };

export default async function Page({ searchParams }: { searchParams: Promise<{ tag?: string; q?: string }> }) {
  return <ArticleIndex kind="NEWS" {...await searchParams} />;
}

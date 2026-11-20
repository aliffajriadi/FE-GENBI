"use client";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ErrorText, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { type Article } from "./_lib";
import { Studio } from "./_components/studio";

export default function ArticleEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const q = useQuery({ queryKey: ["article", id], queryFn: () => api<Article>(`/articles/${id}`), refetchOnWindowFocus: false });
  if (q.isLoading) return <div className="mx-auto max-w-[720px] space-y-6 px-5 pt-32"><Skeleton className="h-12" /><Skeleton className="h-6 w-2/3" /><Skeleton className="h-80" /></div>;
  if (!q.data) return <div className="p-10"><ErrorText error={q.error} /></div>;
  return <Studio key={q.data.id} a={q.data} />;
}

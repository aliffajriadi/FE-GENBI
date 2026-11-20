
export type Article = {
  id: string; title: string; slug: string; excerpt: string | null; body: string; coverUrl: string | null; coverAlt: string | null; seoTitle: string | null; seoDesc: string | null;
  status: string; kind: "NEWS" | "PERSONAL"; tags: string[]; scheduledAt: string | null; publishedAt: string | null; updatedAt: string;
  author: { id: string; name: string }; division: { name: string } | null;
  canEdit: boolean; canModerate: boolean; canWriteNews: boolean;
};
export type Draft = Pick<Article, "title" | "slug" | "excerpt" | "body" | "coverUrl" | "coverAlt" | "seoTitle" | "seoDesc" | "kind"> & { tags: string };

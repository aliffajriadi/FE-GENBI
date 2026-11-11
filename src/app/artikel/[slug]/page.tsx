import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/site/article-card";
import { ArticleView } from "@/components/site/article-view";
import { getPublic, KIND, publicImg, type PublicArticle } from "@/components/site/public-api";
import { Initials, SiteFooter, SiteHeader } from "@/components/site/site-shell";
import Link from "next/link";
import { ReadingProgress } from "./progress";
import { ShareButtons } from "./share";
import { ViewPing } from "./view-ping";

type Full = PublicArticle & { body: string; seoTitle: string | null; seoDesc: string | null };
const get = (slug: string) => getPublic<Full | null>(`/public/articles/${encodeURIComponent(slug)}`, null, 60);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = await get((await params).slug);
  if (!a) return { title: "Artikel tidak ditemukan · MyGenBI" };
  const img = publicImg(a.coverUrl);
  return {
    title: `${a.seoTitle || a.title} · MyGenBI`,
    description: a.seoDesc || a.excerpt || undefined,
    openGraph: { title: a.seoTitle || a.title, description: a.seoDesc || a.excerpt || undefined, type: "article", publishedTime: a.publishedAt, authors: [a.author.name], images: img ? [img] : undefined },
    twitter: { card: img ? "summary_large_image" : "summary" },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const a = await get((await params).slug);
  if (!a) notFound();
  // Bacaan lanjutan: artikel lain dengan tag yang sama, kalau kurang diisi artikel terbaru.
  const pool = await getPublic<PublicArticle[]>(`/public/articles?kind=${a.kind}&limit=4${a.tags[0] ? `&tag=${a.tags[0].slug}` : ""}`, [], 300);
  const more = pool.filter((x) => x.id !== a.id).length >= 2 ? pool : await getPublic<PublicArticle[]>(`/public/articles?kind=${a.kind}&limit=4`, [], 300);
  const related = more.filter((x) => x.id !== a.id).slice(0, 3);
  const profileHref = a.author.profilePublic && a.author.id ? `/anggota/${a.author.id}` : null;

  return (
    <div className="theme-light bg-white text-slate-900">
      <ReadingProgress />
      <SiteHeader active={KIND[a.kind].href} />
      <main className="py-12 sm:py-16">
        <div className="mx-auto mb-6 max-w-[680px] px-5"><Link href={KIND[a.kind].href} className="text-[14px] text-slate-500 hover:text-slate-900">← {KIND[a.kind].label}</Link></div>
        <ArticleView
          tagHref={(t) => `${KIND[a.kind].href}?tag=${t}`}
          a={{ ...a, coverUrl: publicImg(a.coverUrl), authorName: a.author.name, authorAvatar: a.author.avatarUrl, authorHref: profileHref, date: a.publishedAt }}
          actions={<><span className="text-[13px] text-slate-500">Bagikan artikel ini</span><ShareButtons title={a.title} /></>}
        />
        <div className="mx-auto mt-16 max-w-[680px] border-t border-slate-200 px-5 pt-10">
          <div className="flex items-center gap-4">
            <Initials name={a.author.name} src={a.author.avatarUrl} size={56} />
            <div>
              <p className="text-[13px] text-slate-500">Ditulis oleh</p>
              <p className="text-lg font-semibold">{profileHref ? <Link href={profileHref} className="hover:text-primary hover:underline">{a.author.name}</Link> : a.author.name}</p>
              <p className="text-[14px] text-slate-500">{a.division ? `Divisi ${a.division.name}` : "Anggota GenBI"}</p>
            </div>
          </div>
        </div>
        <ViewPing slug={a.slug} />
      </main>
      {related.length > 0 && (
        <section className="border-t border-slate-200 bg-slate-50/70">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="font-serif text-[28px] font-medium tracking-[-0.01em]">Baca juga di {KIND[a.kind].label}</h2>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{related.map((r) => <ArticleCard key={r.id} a={r} />)}</div>
          </div>
        </section>
      )}
      <SiteFooter />
    </div>
  );
}

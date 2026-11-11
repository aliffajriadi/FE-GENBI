import Link from "next/link";
import { Search } from "lucide-react";
import { ArticleCard, ArticleRow } from "./article-card";
import { getPublic, KIND, publicImg, type ArticleKind, type PublicArticle } from "./public-api";
import { fmtDay, SiteFooter, SiteHeader } from "./site-shell";

const COPY: Record<ArticleKind, { title: string; desc: string }> = {
  NEWS: { title: "Kabar GenBI", desc: "Liputan kegiatan dan kabar resmi dari pengurus." },
  PERSONAL: { title: "Artikel Anggota", desc: "Cerita, opini, dan catatan pribadi para penerima beasiswa." },
};

// Halaman daftar: Kabar = majalah ala Ghost, Artikel Anggota = feed ala Medium.
export async function ArticleIndex({ kind, tag, q }: { kind: ArticleKind; tag?: string; q?: string }) {
  const qs = new URLSearchParams({ kind, limit: "24", ...(tag && { tag }), ...(q && { q }) });
  const base = KIND[kind].href;
  const [articles, tags] = await Promise.all([
    getPublic<PublicArticle[]>(`/public/articles?${qs}`, [], 60),
    getPublic<{ name: string; slug: string }[]>(`/public/tags?kind=${kind}`, [], 300),
  ]);
  const filtered = !!(tag || q);
  const chip = (on: boolean) => `shrink-0 rounded-full px-3.5 py-1.5 text-[14px] transition-colors ${on ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`;

  return (
    <div className="bg-white">
      <SiteHeader active={base} />
      <main className="mx-auto max-w-6xl px-5 pt-14 pb-20 sm:px-6 sm:pt-20">
        <h1 className="font-serif text-[44px] leading-none font-medium tracking-[-0.02em] sm:text-[56px]">{COPY[kind].title}</h1>
        <p className="mt-4 max-w-xl text-[17px] text-slate-500">{COPY[kind].desc}</p>

        <div className="mt-10 flex flex-wrap items-center gap-3 border-b border-slate-200 pb-6">
          <form action={base} className="relative w-full sm:w-64">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
            <input name="q" defaultValue={q} placeholder="Cari…" aria-label="Cari artikel" className="h-10 w-full rounded-full border border-slate-200 bg-white pr-4 pl-10 text-[14px] outline-none focus:border-slate-400" />
          </form>
          <div className="flex gap-2 overflow-x-auto">
            <Link href={base} className={chip(!tag)}>Semua</Link>
            {tags.map((t) => <Link key={t.slug} href={`${base}?tag=${t.slug}`} className={chip(tag === t.slug)}>{t.name}</Link>)}
          </div>
        </div>

        {articles.length === 0 ? (
          <p className="mt-16 text-center font-serif text-xl text-slate-400">{filtered ? "Tidak ada artikel yang cocok." : "Belum ada artikel di sini."}</p>
        ) : kind === "NEWS" ? (
          <>
            {!filtered && <div className="mt-10 border-b border-slate-200 pb-12"><Featured a={articles[0]} /></div>}
            <div className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">{(filtered ? articles : articles.slice(1)).map((a) => <ArticleCard key={a.id} a={a} />)}</div>
          </>
        ) : (
          <div className="mx-auto max-w-[720px] divide-y divide-slate-100">{articles.map((a) => <ArticleRow key={a.id} a={a} />)}</div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Featured({ a }: { a: PublicArticle }) {
  return (
    <div className="grid items-center gap-8 md:grid-cols-[1.35fr_1fr]">
      <ArticleCardImageOnly a={a} />
      <div>
        <ArticleCardText a={a} />
      </div>
    </div>
  );
}

function ArticleCardImageOnly({ a }: { a: PublicArticle }) {
  const img = publicImg(a.coverUrl);
  return (
    <Link href={`/artikel/${a.slug}`} className="group block overflow-hidden rounded-xl bg-slate-100">
      {img ? <img src={img} alt={a.coverAlt ?? ""} className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.02]" /> : <span className="block aspect-[16/10]" />}
    </Link>
  );
}

function ArticleCardText({ a }: { a: PublicArticle }) {
  return (
    <Link href={`/artikel/${a.slug}`} className="group block">
      {a.tags[0] && <span className="text-[12px] font-semibold tracking-[0.08em] text-primary uppercase">{a.tags[0].name}</span>}
      <h2 className="mt-3 font-serif text-[32px] leading-[1.15] font-medium tracking-[-0.015em] group-hover:text-primary sm:text-[38px]">{a.title}</h2>
      {a.excerpt && <p className="mt-4 line-clamp-3 text-[17px] leading-relaxed text-slate-600">{a.excerpt}</p>}
      <p className="mt-6 text-[14px] text-slate-500"><span className="font-medium text-slate-900">{a.author.name}</span> · {fmtDay(a.publishedAt)}</p>
    </Link>
  );
}

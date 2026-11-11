import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Initials } from "./site-shell";

// Tampilan baca artikel (dipakai halaman publik & pratinjau editor). Aman di server component.
export type ArticleViewData = {
  title: string;
  excerpt?: string | null;
  coverUrl?: string | null;
  coverAlt?: string | null;
  body: string;
  authorName: string;
  authorHref?: string | null;
  authorAvatar?: string | null;
  date?: string | null;
  tags?: { name: string; slug: string }[];
};

export const readingMinutes = (body: string) => Math.max(1, Math.round(body.trim().split(/\s+/).filter(Boolean).length / 200));

const dateFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });


export function ArticleView({ a, actions, tagHref = (s) => `/kabar?tag=${s}` }: { a: ArticleViewData; actions?: React.ReactNode; tagHref?: (slug: string) => string }) {
  return (
    <article>
      <header className="mx-auto max-w-[680px] px-5">
        {a.tags?.[0] && <a href={tagHref(a.tags[0].slug)} className="text-[13px] font-semibold tracking-wide text-primary uppercase">{a.tags[0].name}</a>}
        <h1 className="mt-3 font-serif text-[36px] leading-[1.12] font-medium tracking-[-0.015em] text-slate-900 sm:text-[46px]">{a.title}</h1>
        {a.excerpt && <p className="mt-4 font-serif text-[21px] leading-snug text-slate-500 sm:text-[22px]">{a.excerpt}</p>}
        <div className="mt-8 flex items-center gap-3">
          <Initials name={a.authorName} src={a.authorAvatar} size={44} />
          <div className="text-[14px] leading-tight">
            <p className="font-medium text-slate-900">{a.authorHref ? <a href={a.authorHref} className="hover:text-primary hover:underline">{a.authorName}</a> : a.authorName}</p>
            <p className="mt-1 text-slate-500">{readingMinutes(a.body)} menit baca{a.date ? ` · ${dateFmt.format(new Date(a.date))}` : ""}</p>
          </div>
        </div>
        {actions && <div className="mt-8 flex items-center justify-between border-y border-slate-100 py-2.5">{actions}</div>}
      </header>

      {a.coverUrl && (
        <figure className="mx-auto mt-10 max-w-[1000px] sm:px-5">
          <img src={a.coverUrl} alt={a.coverAlt ?? ""} className="w-full object-cover sm:rounded-sm" />
          {a.coverAlt && <figcaption className="mt-3 px-5 text-center text-[13px] text-slate-500">{a.coverAlt}</figcaption>}
        </figure>
      )}

      <div className="story mx-auto mt-10 max-w-[680px] px-5">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ node: _n, ...p }) => <a {...p} target="_blank" rel="noopener noreferrer" /> }}>
          {a.body}
        </ReactMarkdown>
      </div>

      {!!a.tags?.length && (
        <div className="mx-auto mt-12 flex max-w-[680px] flex-wrap gap-2 px-5">
          {a.tags.map((t) => <a key={t.slug} href={tagHref(t.slug)} className="rounded-full bg-slate-100 px-4 py-1.5 text-[14px] text-slate-700 hover:bg-slate-200">{t.name}</a>)}
        </div>
      )}
    </article>
  );
}

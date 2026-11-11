import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock, Newspaper, PenLine, Search, X } from "lucide-react";
import { ArticleCard, ArticleRow } from "./article-card";
import { getPublic, KIND, publicImg, type ArticleKind, type PublicArticle } from "./public-api";
import { fmtDay, Initials, SiteFooter, SiteHeader } from "./site-shell";

const COPY: Record<ArticleKind, { eyebrow: string; title: string; desc: string }> = {
  NEWS: { eyebrow: "Dari pengurus", title: "Kabar GenBI", desc: "Liputan kegiatan dan kabar resmi dari pengurus." },
  PERSONAL: { eyebrow: "Ruang tulis anggota", title: "Artikel Anggota", desc: "Cerita, opini, dan catatan pribadi para penerima beasiswa Bank Indonesia." },
};
const LIMIT = 20;

type Params = { kind: ArticleKind; tag?: string; q?: string; sort?: string; page?: string };

// Kabar = majalah ala Ghost; Artikel Anggota = sorotan + feed ala Medium dengan sidebar topik & penulis.
export async function ArticleIndex({ kind, tag, q, sort, page }: Params) {
  const popular = sort === "popular";
  const pageNo = Math.max(1, Number(page) || 1);
  const qs = new URLSearchParams({ kind, limit: String(LIMIT), page: String(pageNo), ...(tag && { tag }), ...(q && { q }), ...(popular && { sort: "popular" }) });
  const base = KIND[kind].href;
  const [articles, tags] = await Promise.all([
    getPublic<PublicArticle[]>(`/public/articles?${qs}`, [], 60),
    getPublic<{ name: string; slug: string }[]>(`/public/tags?kind=${kind}`, [], 300),
  ]);
  const filtered = !!(tag || q);
  const showHighlight = !filtered && !popular && pageNo === 1;
  // Tautan yang mempertahankan filter lain.
  const href = (p: Partial<Record<"tag" | "q" | "sort" | "page", string | undefined>>) => {
    const s = new URLSearchParams(Object.entries({ tag, q, sort, ...p }).filter(([, v]) => v) as [string, string][]);
    return s.size ? `${base}?${s}` : base;
  };
  const activeTag = tags.find((t) => t.slug === tag);

  return (
    <div className="theme-light bg-white text-slate-900">
      <SiteHeader active={base} />

      {/* ───── Kepala halaman: judul, pencarian, urutan ───── */}
      <section className="border-b border-slate-200/70 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-6xl px-5 pt-14 pb-8 sm:px-6 sm:pt-20">
          <p className="flex items-center gap-3 text-[13px] font-medium text-slate-500"><span className="h-0.5 w-6 rounded-full bg-brand-red" aria-hidden />{COPY[kind].eyebrow}</p>
          <h1 className="mt-4 font-serif text-[44px] leading-none font-medium tracking-[-0.02em] sm:text-[60px]">{COPY[kind].title}</h1>
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-slate-500">{COPY[kind].desc}</p>

          <form action={base} className="relative mt-8 max-w-xl">
            {tag && <input type="hidden" name="tag" value={tag} />}
            <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              name="q"
              defaultValue={q}
              placeholder={kind === "NEWS" ? "Cari kabar…" : "Cari judul atau topik artikel…"}
              aria-label="Cari artikel"
              className="h-12 w-full rounded-full border border-slate-200 bg-white pr-28 pl-11 text-[15px] shadow-xs outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
            <button className="absolute top-1.5 right-1.5 h-9 rounded-full bg-primary px-4 text-[14px] font-medium text-white transition-colors hover:bg-primary-hover">Cari</button>
          </form>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <nav className="flex gap-5 text-[14px]" aria-label="Urutkan">
              {[{ v: undefined, l: "Terbaru" }, { v: "popular", l: "Paling banyak dibaca" }].map((o) => {
                const on = (o.v === "popular") === popular;
                return (
                  <Link key={o.l} href={href({ sort: o.v, page: undefined })} aria-current={on ? "page" : undefined}
                    className={`-mb-px border-b-2 pb-2 transition-colors ${on ? "border-slate-900 font-medium text-slate-900" : "border-transparent text-slate-500 hover:text-slate-900"}`}>
                    {o.l}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="mx-auto max-w-6xl px-5 pb-5 sm:px-6">
            <div className="flex gap-2 overflow-x-auto pb-1 [mask-image:linear-gradient(to_right,black_92%,transparent)]">
              <Chip href={href({ tag: undefined, page: undefined })} on={!tag}>Semua topik</Chip>
              {tags.map((t) => <Chip key={t.slug} href={href({ tag: t.slug, page: undefined })} on={tag === t.slug}>#{t.name}</Chip>)}
            </div>
          </div>
        )}
      </section>

      <main className="mx-auto max-w-6xl px-5 pt-10 pb-20 sm:px-6">
        {filtered && (
          <div className="mb-8 flex flex-wrap items-center gap-2 text-[14px] text-slate-600">
            <span>{articles.length} hasil{q ? <> untuk “<b className="text-slate-900">{q}</b>”</> : null}{activeTag ? <> di topik <b className="text-slate-900">#{activeTag.name}</b></> : null}</span>
            <Link href={base} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[13px] hover:bg-slate-200"><X size={13} aria-hidden /> Hapus filter</Link>
          </div>
        )}

        {articles.length === 0 ? (
          <Empty kind={kind} filtered={filtered} />
        ) : kind === "NEWS" ? (
          <>
            {showHighlight && <div className="border-b border-slate-200 pb-12"><Featured a={articles[0]} /></div>}
            <div className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">{(showHighlight ? articles.slice(1) : articles).map((a) => <ArticleCard key={a.id} a={a} />)}</div>
          </>
        ) : (
          <>
            {showHighlight && articles.length >= 3 && <Highlights items={articles.slice(0, 3)} />}
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
              <section aria-label="Daftar artikel">
                {showHighlight && articles.length >= 3 && <h2 className="mb-2 text-[13px] font-semibold tracking-[0.08em] text-slate-500 uppercase">Semua artikel</h2>}
                <div className="divide-y divide-slate-100">
                  {(showHighlight && articles.length >= 3 ? articles.slice(3) : articles).map((a) => <ArticleRow key={a.id} a={a} />)}
                </div>
              </section>
              <Sidebar articles={articles} tags={tags} href={href} activeTag={tag} />
            </div>
          </>
        )}

        {(pageNo > 1 || articles.length === LIMIT) && (
          <nav className="mt-14 flex items-center justify-between border-t border-slate-200 pt-6 text-[14px]" aria-label="Halaman">
            {pageNo > 1 ? <Link href={href({ page: pageNo > 2 ? String(pageNo - 1) : undefined })} className="inline-flex items-center gap-1.5 font-medium hover:text-primary"><ArrowLeft size={15} aria-hidden /> Lebih baru</Link> : <span />}
            <span className="text-slate-400">Halaman {pageNo}</span>
            {articles.length === LIMIT ? <Link href={href({ page: String(pageNo + 1) })} className="inline-flex items-center gap-1.5 font-medium hover:text-primary">Lebih lama <ArrowRight size={15} aria-hidden /></Link> : <span />}
          </nav>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Chip({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={on ? "page" : undefined}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13.5px] transition-colors ${on ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"}`}>
      {children}
    </Link>
  );
}

// Sorotan: 1 artikel besar + 2 artikel kecil di atas feed.
function Highlights({ items: [main, ...rest] }: { items: PublicArticle[] }) {
  const img = publicImg(main.coverUrl);
  return (
    <section aria-label="Sorotan" className="mb-14 grid gap-6 border-b border-slate-200 pb-12 lg:grid-cols-[1.5fr_1fr]">
      <Link href={`/artikel/${main.slug}`} className="group relative isolate flex min-h-[340px] flex-col justify-end overflow-hidden rounded-2xl bg-slate-900 p-6 sm:min-h-[420px] sm:p-8">
        {img ? (
          <img src={img} alt={main.coverAlt ?? ""} className="absolute inset-0 -z-10 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
        ) : (
          <span className="absolute inset-0 -z-10 bg-gradient-to-br from-primary to-slate-900" aria-hidden />
        )}
        <span className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" aria-hidden />
        <span className="w-fit rounded-full bg-white/15 px-3 py-1 text-[12px] font-medium text-white backdrop-blur-sm">Terbaru</span>
        <h2 className="mt-4 max-w-2xl font-serif text-[28px] leading-[1.15] font-medium tracking-[-0.015em] text-white sm:text-[36px]">{main.title}</h2>
        {main.excerpt && <p className="mt-3 line-clamp-2 max-w-xl text-[15px] leading-relaxed text-white/80">{main.excerpt}</p>}
        <Byline a={main} light />
      </Link>
      <div className="grid gap-6">
        {rest.map((a) => {
          const im = publicImg(a.coverUrl);
          return (
            <Link key={a.id} href={`/artikel/${a.slug}`} className="group flex gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm sm:flex-col lg:flex-row xl:flex-col">
              <div className="w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:w-full lg:w-28 xl:w-full">
                {im ? <img src={im} alt="" className="aspect-[4/3] h-full w-full object-cover transition duration-500 group-hover:scale-[1.04] sm:aspect-[16/7] lg:aspect-[4/3] xl:aspect-[16/7]" loading="lazy" /> : <span className="grid aspect-[4/3] place-items-center text-slate-300 sm:aspect-[16/7] lg:aspect-[4/3] xl:aspect-[16/7]"><Newspaper size={22} aria-hidden /></span>}
              </div>
              <div className="min-w-0">
                {a.tags[0] && <span className="text-[11px] font-semibold tracking-[0.08em] text-primary uppercase">{a.tags[0].name}</span>}
                <h3 className="mt-1 line-clamp-2 font-serif text-[19px] leading-snug font-medium text-slate-900 group-hover:text-primary">{a.title}</h3>
                <Byline a={a} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function Byline({ a, light }: { a: PublicArticle; light?: boolean }) {
  return (
    <p className={`mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] ${light ? "text-white/80" : "text-slate-500"}`}>
      <Initials name={a.author.name} src={a.author.avatarUrl} size={22} />
      <span className={`font-medium ${light ? "text-white" : "text-slate-800"}`}>{a.author.name}</span>
      <span aria-hidden>·</span>
      <span>{fmtDay(a.publishedAt)}</span>
      {a.readMinutes ? <span className="inline-flex items-center gap-1"><Clock size={12} aria-hidden /> {a.readMinutes} mnt</span> : null}
    </p>
  );
}

// Sidebar: topik & penulis (dari artikel di halaman ini), plus ajakan menulis.
function Sidebar({ articles, tags, href, activeTag }: { articles: PublicArticle[]; tags: { name: string; slug: string }[]; href: (p: { tag?: string; page?: string }) => string; activeTag?: string }) {
  const authors = [...articles.reduce((m, a) => {
    const k = a.author.id ?? a.author.name;
    const cur = m.get(k) ?? { ...a.author, count: 0 };
    return m.set(k, { ...cur, count: cur.count + 1 });
  }, new Map<string, PublicArticle["author"] & { count: number }>()).values()].sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-28 space-y-10">
        {tags.length > 0 && (
          <div>
            <h2 className="text-[13px] font-semibold text-slate-900">Jelajahi topik</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.slice(0, 14).map((t) => (
                <Link key={t.slug} href={href({ tag: t.slug, page: undefined })}
                  className={`rounded-full px-3 py-1 text-[13px] transition-colors ${activeTag === t.slug ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"}`}>
                  {t.name}
                </Link>
              ))}
            </div>
          </div>
        )}
        {authors.length > 0 && (
          <div>
            <h2 className="text-[13px] font-semibold text-slate-900">Penulis</h2>
            <ul className="mt-3 space-y-3">
              {authors.map((a) => {
                const inner = (
                  <>
                    <Initials name={a.name} src={a.avatarUrl} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-slate-900">{a.name}</span>
                      <span className="text-[12px] text-slate-500">{a.count} artikel</span>
                    </span>
                  </>
                );
                return (
                  <li key={a.id ?? a.name}>
                    {a.id && a.profilePublic !== false ? (
                      <Link href={`/anggota/${a.id}`} className="flex items-center gap-3 rounded-lg hover:text-primary">{inner}</Link>
                    ) : (
                      <div className="flex items-center gap-3">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200/70">
          <PenLine size={20} className="text-primary" aria-hidden />
          <p className="mt-3 font-serif text-[18px] leading-snug font-medium">Punya cerita untuk dibagikan?</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">Anggota GenBI bisa menulis dan langsung terbit tanpa antre persetujuan.</p>
          <Link href="/dashboard/articles" className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-full bg-slate-900 px-4 text-[13px] font-medium text-white hover:bg-slate-700">
            Mulai menulis <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </div>
    </aside>
  );
}

function Empty({ kind, filtered }: { kind: ArticleKind; filtered: boolean }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Newspaper size={24} aria-hidden /></span>
      <p className="mt-5 font-serif text-[24px] font-medium text-slate-900">{filtered ? "Tidak ada yang cocok" : "Belum ada artikel"}</p>
      <p className="mt-2 text-[15px] text-slate-500">{filtered ? "Coba kata kunci lain atau pilih topik berbeda." : kind === "PERSONAL" ? "Jadilah anggota pertama yang membagikan tulisan." : "Kabar dari pengurus akan tampil di sini."}</p>
      {filtered && <Link href={KIND[kind].href} className="mt-6 inline-flex h-10 items-center rounded-full border border-slate-200 px-5 text-[14px] font-medium hover:bg-slate-50">Lihat semua</Link>}
    </div>
  );
}

function Featured({ a }: { a: PublicArticle }) {
  const img = publicImg(a.coverUrl);
  return (
    <div className="grid items-center gap-8 md:grid-cols-[1.35fr_1fr]">
      <Link href={`/artikel/${a.slug}`} className="group block overflow-hidden rounded-xl bg-slate-100">
        {img ? <img src={img} alt={a.coverAlt ?? ""} className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.02]" /> : <span className="block aspect-[16/10]" />}
      </Link>
      <Link href={`/artikel/${a.slug}`} className="group block">
        {a.tags[0] && <span className="text-[12px] font-semibold tracking-[0.08em] text-primary uppercase">{a.tags[0].name}</span>}
        <h2 className="mt-3 font-serif text-[32px] leading-[1.15] font-medium tracking-[-0.015em] group-hover:text-primary sm:text-[38px]">{a.title}</h2>
        {a.excerpt && <p className="mt-4 line-clamp-3 text-[17px] leading-relaxed text-slate-600">{a.excerpt}</p>}
        <p className="mt-6 text-[14px] text-slate-500"><span className="font-medium text-slate-900">{a.author.name}</span> · {fmtDay(a.publishedAt)}</p>
      </Link>
    </div>
  );
}

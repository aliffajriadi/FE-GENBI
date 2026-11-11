import Link from "next/link";
import { Newspaper } from "lucide-react";
import { fmtDay, fmtShort, Initials } from "./site-shell";
import { publicImg, type PublicArticle } from "./public-api";

// Kartu majalah (Kabar GenBI), ala Ghost.
export function ArticleCard({ a, size = "md" }: { a: PublicArticle; size?: "md" | "lg" }) {
  const img = publicImg(a.coverUrl);
  return (
    <Link href={`/artikel/${a.slug}`} className="group flex flex-col">
      <div className="overflow-hidden rounded-xl bg-slate-100">
        {img ? (
          <img src={img} alt={a.coverAlt ?? ""} className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" />
        ) : (
          <span className="grid aspect-[16/10] place-items-center text-slate-300"><Newspaper size={28} aria-hidden /></span>
        )}
      </div>
      <div className="flex flex-1 flex-col pt-4">
        {a.tags[0] && <span className="text-[12px] font-semibold tracking-[0.08em] text-primary uppercase">{a.tags[0].name}</span>}
        <h3 className={`mt-2 font-serif leading-snug font-medium tracking-[-0.01em] text-slate-900 group-hover:text-primary ${size === "lg" ? "text-[28px]" : "text-[22px]"}`}>{a.title}</h3>
        {a.excerpt && <p className={`mt-2 text-slate-500 ${size === "lg" ? "line-clamp-3 text-[16px] leading-relaxed" : "line-clamp-2 text-[15px] leading-relaxed"}`}>{a.excerpt}</p>}
        <p className="mt-auto pt-4 text-[13px] text-slate-500"><span className="font-medium text-slate-800">{a.author.name}</span> · {fmtDay(a.publishedAt)}</p>
      </div>
    </Link>
  );
}

// Baris feed (Artikel Anggota), ala Medium.
export function ArticleRow({ a }: { a: PublicArticle }) {
  const img = publicImg(a.coverUrl);
  return (
    <Link href={`/artikel/${a.slug}`} className="group -mx-4 flex items-center gap-5 rounded-2xl px-4 py-6 transition-colors hover:bg-slate-50 sm:gap-8">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[13px] text-slate-600">
          <Initials name={a.author.name} src={a.author.avatarUrl} size={22} />
          <span className="font-medium text-slate-800">{a.author.name}</span>
          {a.division && <span className="truncate text-slate-400">· {a.division.name}</span>}
        </div>
        <h3 className="mt-2.5 font-serif text-[22px] leading-snug font-semibold tracking-[-0.01em] text-slate-900 group-hover:text-primary sm:text-[24px]">{a.title}</h3>
        {a.excerpt && <p className="mt-1.5 line-clamp-2 text-[15px] leading-relaxed text-slate-500">{a.excerpt}</p>}
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-slate-400">
          {a.tags[0] && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[12px] text-slate-600 transition-colors group-hover:bg-white">{a.tags[0].name}</span>}
          <span>{fmtShort(a.publishedAt)}</span>
          {a.readMinutes ? <span>· {a.readMinutes} menit baca</span> : null}
        </p>
      </div>
      {img && (
        <div className="w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:w-44">
          <img src={img} alt="" className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.04]" loading="lazy" />
        </div>
      )}
    </Link>
  );
}

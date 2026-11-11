import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AtSign, Briefcase, Globe } from "lucide-react";
import { getPublic, KIND, publicImg } from "@/components/site/public-api";
import { fmtDay, Initials, SiteFooter, SiteHeader } from "@/components/site/site-shell";
import { socialLinks } from "@/lib/social";

type Profile = {
  id: string; name: string; avatarUrl: string | null; coverUrl: string | null; bio: string | null; instagram: string | null; tiktok: string | null; linkedin: string | null; website: string | null;
  memberships: { position: string | null; role: { key: string; name: string }; division: { name: string } | null; period: { name: string; isActive: boolean } }[];
  articles: { id: string; title: string; slug: string; kind: "NEWS" | "PERSONAL"; excerpt: string | null; coverUrl: string | null; coverAlt: string | null; publishedAt: string }[];
};
const get = (id: string) => getPublic<Profile | null>(`/public/members/${encodeURIComponent(id)}`, null, 120);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await get((await params).id);
  if (!p) return { title: "Profil tidak ditemukan · MyGenBI" };
  const img = publicImg(p.avatarUrl);
  return { title: `${p.name} · MyGenBI`, description: p.bio ?? undefined, openGraph: { title: p.name, description: p.bio ?? undefined, type: "profile", images: img ? [img] : undefined } };
}

export default async function PublicProfile({ params }: { params: Promise<{ id: string }> }) {
  const p = await get((await params).id);
  if (!p) notFound();
  const now = p.memberships.find((m) => m.period.isActive);
  const past = p.memberships.filter((m) => !m.period.isActive);
  const cover = publicImg(p.coverUrl);
  const links = socialLinks(p);

  return (
    <div className="theme-light bg-white text-slate-900">
      <SiteHeader active="/anggota" />
      <main className="pb-20">
        <div className="mx-auto max-w-5xl sm:px-6 sm:pt-6">
          <div className="h-40 overflow-hidden bg-[#f3f1ec] sm:h-64 sm:rounded-2xl">{cover && <img src={cover} alt="" className="h-full w-full object-cover" />}</div>
        </div>
        <div className="mx-auto max-w-3xl px-5">
          <div className="-mt-16 sm:-mt-20"><span className="inline-block rounded-full ring-4 ring-white"><Initials name={p.name} src={p.avatarUrl} size={136} /></span></div>
          <h1 className="mt-5 font-serif text-[40px] leading-tight font-medium tracking-[-0.02em]">{p.name}</h1>
          {now && <p className="mt-1 text-[17px] text-slate-600">{now.position ?? now.role.name}{now.division ? ` · Divisi ${now.division.name}` : ""}</p>}
          {p.bio && <p className="mt-6 font-serif text-[21px] leading-relaxed whitespace-pre-line text-slate-700">{p.bio}</p>}
          {links.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2">
              {links.map((l) => (
                <li key={l.kind}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 px-4 text-[14px] text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900">
                    {l.kind === "Website" ? <Globe size={15} aria-hidden /> : l.kind === "LinkedIn" ? <Briefcase size={15} aria-hidden /> : <AtSign size={15} aria-hidden />} <span className="text-slate-400">{l.kind}</span> {l.label}
                  </a>
                </li>
              ))}
            </ul>
          )}

          <section className="mt-14">
            <h2 className="border-b border-slate-200 pb-4 font-serif text-[26px] font-medium">Artikel</h2>
            {p.articles.length === 0 ? (
              <p className="mt-8 text-slate-400">Belum ada artikel yang terbit.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {p.articles.map((a) => {
                  const img = publicImg(a.coverUrl);
                  return (
                    <li key={a.id}>
                      <Link href={`/artikel/${a.slug}`} className="group flex gap-6 py-7">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] text-slate-500">{KIND[a.kind].label} · {fmtDay(a.publishedAt)}</p>
                          <h3 className="mt-2 font-serif text-[22px] leading-snug font-semibold group-hover:text-primary">{a.title}</h3>
                          {a.excerpt && <p className="mt-1.5 line-clamp-2 text-[15px] text-slate-500">{a.excerpt}</p>}
                        </div>
                        {img && <img src={img} alt="" className="mt-6 aspect-[4/3] w-24 shrink-0 rounded-md object-cover sm:w-36" loading="lazy" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {past.length > 0 && (
            <section className="mt-14">
              <h2 className="border-b border-slate-200 pb-4 font-serif text-[26px] font-medium">Riwayat kepengurusan</h2>
              <ul className="mt-4 divide-y divide-slate-100">
                {past.map((m, i) => (
                  <li key={i} className="flex justify-between gap-4 py-3 text-[15px]">
                    <span>{m.position ?? m.role.name}{m.division ? ` · ${m.division.name}` : ""}</span>
                    <span className="text-slate-500">{m.period.name}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <Link href="/anggota" className="mt-14 inline-flex items-center gap-1.5 text-[14px] text-slate-500 hover:text-slate-900"><ArrowLeft size={15} aria-hidden /> Semua anggota</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

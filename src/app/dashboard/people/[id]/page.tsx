"use client";
import Link from "next/link";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AtSign, Briefcase, CalendarCheck, Globe, GraduationCap, Newspaper, PenLine, Pencil, Trophy } from "lucide-react";
import { socialLinks } from "@/lib/social";
import { Avatar, Button, Card, CardHeader, EmptyState, ErrorText, Skeleton, StatCard } from "@/components/ui";
import { api, publicFile } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { useMe } from "@/lib/use-me";

type Profile = {
  id: string; name: string; avatarUrl: string | null; coverUrl: string | null; bio: string | null; instagram: string | null; tiktok: string | null; linkedin: string | null; website: string | null; campus: string | null; major: string | null; batch: string | null; createdAt: string;
  position: string | null; division: string | null;
  memberships: { position: string | null; role: { name: string }; division: { name: string } | null; period: { name: string; isActive: boolean } }[];
  stats: { points: number; rank: number | null; of: number; attendance: number | null; events: number; articles: number };
  articles: { id: string; title: string; slug: string; kind: "NEWS" | "PERSONAL"; excerpt: string | null; coverUrl: string | null; publishedAt: string }[];
};

// Profil anggota yang bisa dilihat semua anggota.
export default function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { me, can } = useMe();
  const q = useQuery({ queryKey: ["person", id], queryFn: () => api<Profile>(`/members/${id}`) });
  if (q.isLoading) return <div className="space-y-4"><Skeleton className="h-48 rounded-xl" /><Skeleton className="h-28" /><Skeleton className="h-64" /></div>;
  if (!q.data) return <ErrorText error={q.error} />;
  const p = q.data;
  const isMe = me?.id === p.id;
  const study = [p.major, p.campus].filter(Boolean).join(", ");
  const past = p.memberships.filter((m) => !m.period.isActive);
  const links = socialLinks(p);

  return (
    <>
      <Link href="/dashboard/members" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-900"><ArrowLeft size={15} aria-hidden /> Anggota</Link>

      <Card className="mb-6 overflow-hidden">
        <div className="h-32 bg-[#f3f1ec] sm:h-48" aria-hidden>
          {p.coverUrl && <img src={publicFile(p.coverUrl)} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="px-6 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 sm:-mt-14">
            <Avatar name={p.name} src={p.avatarUrl} size={112} className="ring-4 ring-white" />
            <div className="flex gap-2">
              {isMe && <Link href="/dashboard/profile"><Button variant="outline" size="sm"><Pencil size={14} aria-hidden /> Edit profil</Button></Link>}
              {!isMe && can("user.read") && <Link href={`/dashboard/members/${p.id}`}><Button variant="outline" size="sm">Data pengurus</Button></Link>}
            </div>
          </div>
          <h1 className="mt-4 font-serif text-[32px] leading-tight font-medium tracking-[-0.01em]">{p.name}</h1>
          <p className="mt-1 text-[15px] text-slate-600">{p.position ?? "Anggota"}{p.division ? ` · ${p.division}` : ""}</p>
          {p.bio && <p className="mt-4 max-w-2xl text-[15px] leading-relaxed whitespace-pre-line text-slate-700">{p.bio}</p>}
          {(study || p.batch) && (
            <p className="mt-3 flex items-center gap-2 text-[14px] text-slate-500"><GraduationCap size={16} aria-hidden /> {[study, p.batch && `Angkatan ${p.batch}`].filter(Boolean).join(" · ")}</p>
          )}
          {links.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {links.map((l) => (
                <li key={l.kind}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 px-3 text-[13px] text-slate-700 hover:border-slate-300 hover:text-slate-900">
                    {l.kind === "Website" ? <Globe size={14} aria-hidden /> : l.kind === "LinkedIn" ? <Briefcase size={14} aria-hidden /> : <AtSign size={14} aria-hidden />}
                    <span className="text-slate-400">{l.kind}</span> {l.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Poin periode ini" value={p.stats.points} icon={Trophy} hint={p.stats.rank ? `Peringkat #${p.stats.rank} dari ${p.stats.of}` : "Belum ada poin"} />
        <StatCard label="Kehadiran" value={p.stats.attendance == null ? "–" : `${p.stats.attendance}%`} icon={CalendarCheck} tone="green" hint={`${p.stats.events} kegiatan`} />
        <StatCard label="Artikel terbit" value={p.stats.articles} icon={PenLine} tone="slate" />
        <StatCard label="Bergabung" value={new Date(p.createdAt).toLocaleDateString("id-ID", { month: "short", year: "numeric" })} icon={GraduationCap} tone="slate" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader title="Artikel" desc={isMe ? "Artikel kamu yang sudah terbit" : `Artikel ${p.name.split(" ")[0]} yang sudah terbit`} />
          {p.articles.length === 0 ? (
            <EmptyState icon={Newspaper} title="Belum ada artikel" action={isMe && <Link href="/dashboard/articles"><Button variant="outline" size="sm"><PenLine size={14} aria-hidden /> Mulai menulis</Button></Link>} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {p.articles.map((a) => (
                <li key={a.id}>
                  <a href={`/artikel/${a.slug}`} target="_blank" rel="noopener noreferrer" className="flex gap-4 px-5 py-4 hover:bg-slate-50/80">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500">{a.kind === "NEWS" ? "Kabar GenBI" : "Artikel pribadi"} · {fmtDate(a.publishedAt).split(",")[0]}</p>
                      <p className="mt-1 font-serif text-[19px] leading-snug font-medium text-slate-900">{a.title}</p>
                      {a.excerpt && <p className="mt-1 line-clamp-2 text-[13px] text-slate-500">{a.excerpt}</p>}
                    </div>
                    {a.coverUrl && <img src={publicFile(a.coverUrl)} alt="" className="h-16 w-24 shrink-0 rounded-md object-cover" />}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {past.length > 0 && (
          <Card className="self-start">
            <CardHeader title="Riwayat jabatan" />
            <ul className="divide-y divide-slate-100">
              {past.map((m, i) => (
                <li key={i} className="px-5 py-3 text-[13px]">
                  <span className="block font-medium">{m.position ?? m.role.name}{m.division ? ` · ${m.division.name}` : ""}</span>
                  <span className="text-slate-500">Periode {m.period.name}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}

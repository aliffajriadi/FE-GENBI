import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { getPublic } from "@/components/site/public-api";
import { Initials, SiteFooter, SiteHeader } from "@/components/site/site-shell";

export const metadata: Metadata = { title: "Anggota · MyGenBI", description: "Pengurus dan anggota GenBI kepengurusan berjalan." };

type Member = { id: string; name: string; avatarUrl: string | null; role: string; position: string; division: { id: string; name: string } | null; fields: string[]; skills: string[] };
const CORE = ["KETUM", "WAKETUM", "SEKRETARIS", "BENDAHARA"];

// Direktori publik: pengurus inti dulu, lalu per divisi (Kadiv di depan).
export default async function MembersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const [q, field, skill] = [sp.q, sp.field, sp.skill].map((v) => (typeof v === "string" ? v : ""));
  const filtered = !!(q || field || skill);
  const query = new URLSearchParams({ ...(q && { q }), ...(field && { field }), ...(skill && { skill }) });
  const [members, tags] = await Promise.all([
    getPublic<Member[]>(`/public/members?${query}`, [], 120),
    getPublic<{ kind: "FIELD" | "SKILL"; name: string }[]>("/public/profile-tags", [], 120),
  ]);
  const options = (kind: "FIELD" | "SKILL", current: string) => [...new Set([...tags.filter((t) => t.kind === kind).map((t) => t.name), ...(current ? [current] : [])])];
  const select = "h-10 w-full rounded-full border border-slate-200 bg-white px-4 text-[14px] outline-none focus:border-slate-400 sm:w-44";
  const core = members.filter((m) => CORE.includes(m.role)).sort((a, b) => CORE.indexOf(a.role) - CORE.indexOf(b.role));
  const divisions = new Map<string, Member[]>();
  for (const m of members.filter((x) => !CORE.includes(x.role))) {
    const key = m.division?.name ?? "Anggota";
    divisions.set(key, [...(divisions.get(key) ?? []), m]);
  }
  const groups = [...divisions.entries()]
    .sort(([a], [b]) => (a === "Anggota" ? 1 : b === "Anggota" ? -1 : a.localeCompare(b)))
    .map(([name, list]) => [name, list.sort((a, b) => Number(b.role === "KADIV") - Number(a.role === "KADIV"))] as const);

  return (
    <div className="theme-light bg-white text-slate-900">
      <SiteHeader active="/anggota" />
      <main className="mx-auto max-w-6xl px-5 pt-14 pb-20 sm:px-6 sm:pt-20">
        <h1 className="font-serif text-[44px] leading-none font-medium tracking-[-0.02em] sm:text-[56px]">Anggota</h1>
        <p className="mt-4 max-w-xl text-[17px] text-slate-500">{members.length} orang {filtered ? "cocok dengan pencarian" : "di kepengurusan berjalan"}. Klik untuk melihat profil dan artikelnya.</p>
        <form action="/anggota" className="mt-8 flex flex-wrap items-center gap-2">
          <span className="relative w-full sm:w-72">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
          <input name="q" defaultValue={q} placeholder="Cari nama, bidang, atau skill…" aria-label="Cari anggota" className="h-10 w-full rounded-full border border-slate-200 pr-4 pl-10 text-[14px] outline-none focus:border-slate-400" />
          </span>
          <select key={`field-${field}`} name="field" defaultValue={field} aria-label="Filter bidang" className={select}>
            <option value="">Semua bidang</option>
            {options("FIELD", field).map((t) => <option key={t}>{t}</option>)}
          </select>
          <select key={`skill-${skill}`} name="skill" defaultValue={skill} aria-label="Filter skill" className={select}>
            <option value="">Semua skill</option>
            {options("SKILL", skill).map((t) => <option key={t}>{t}</option>)}
          </select>
          <button type="submit" className="h-10 rounded-full bg-primary px-5 text-[14px] font-medium text-white hover:bg-primary-hover">Cari</button>
          {filtered && <Link href="/anggota" className="px-2 text-[14px] text-slate-500 hover:text-slate-900">Reset</Link>}
        </form>

        {members.length === 0 && <p className="mt-16 text-center font-serif text-xl text-slate-400">{filtered ? "Tidak ada yang cocok." : "Belum ada anggota yang ditampilkan."}</p>}

        {core.length > 0 && (
          <section className="mt-14">
            <h2 className="border-b border-slate-200 pb-4 font-serif text-[28px] font-medium">Pengurus inti</h2>
            <ul className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-3">
              {core.map((m) => <Person key={m.id} m={m} big />)}
            </ul>
          </section>
        )}
        {groups.map(([name, list]) => (
          <section key={name} className="mt-14">
            <h2 className="flex items-baseline justify-between border-b border-slate-200 pb-4 font-serif text-[28px] font-medium">
              {name === "Anggota" ? "Anggota" : `Divisi ${name}`} <span className="font-sans text-[14px] font-normal text-slate-400">{list.length} orang</span>
            </h2>
            <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:grid-cols-5">
              {list.map((m) => <Person key={m.id} m={m} />)}
            </ul>
          </section>
        ))}
      </main>
      <SiteFooter />
    </div>
  );
}

function Person({ m, big }: { m: Member; big?: boolean }) {
  return (
    <li>
      <Link href={`/anggota/${m.id}`} className="group flex flex-col items-center text-center">
        <span className="rounded-full ring-1 ring-slate-200 transition group-hover:ring-4 group-hover:ring-blue-100">
          <Initials name={m.name} src={m.avatarUrl} size={big ? 128 : 96} />
        </span>
        <span className={`mt-4 font-medium text-slate-900 group-hover:text-primary ${big ? "font-serif text-[22px]" : "text-[15px]"}`}>{m.name}</span>
        <span className="mt-0.5 text-[13px] text-slate-500">{m.position}</span>
        {m.fields?.length > 0 && <span className="mt-1 text-[13px] text-slate-700">{m.fields.join(" · ")}</span>}
        {m.skills?.length > 0 && <span className="mt-0.5 line-clamp-2 text-xs text-slate-400">{m.skills.slice(0, 4).join(", ")}{m.skills.length > 4 ? ` +${m.skills.length - 4}` : ""}</span>}
      </Link>
    </li>
  );
}

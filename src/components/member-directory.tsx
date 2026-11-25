"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Tags, Users, X } from "lucide-react";
import { FieldManager } from "@/components/field-manager";
import { Avatar, Button, Card, EmptyState, Input, PageHeader, Select, Skeleton } from "@/components/ui";
import { api, apiPage } from "@/lib/api";
import type { Division, ProfileTag } from "@/lib/types";
import { useMe } from "@/lib/use-me";

type Person = { id: string; name: string; avatarUrl: string | null; position: string | null; division: { id: string; name: string } | null; campus: string | null; batch: string | null; fields: string[]; skills: string[] };
const CORE = ["SYS_ADMIN", "KETUM", "WAKETUM", "SEKRETARIS", "BENDAHARA"]; // pengelola kategori bidang (dicek lagi di backend)

// Direktori anggota untuk semua orang: kartu bergambar, klik untuk lihat profil.
export function MemberDirectory() {
  const [q, setQ] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [field, setField] = useState("");
  const [skill, setSkill] = useState("");
  const [managing, setManaging] = useState(false);
  const { me } = useMe();
  // Dari profil: ?field=… / ?skill=… langsung memfilter.
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setField(p.get("field") ?? "");
    setSkill(p.get("skill") ?? "");
  }, []);
  const tags = useQuery({ queryKey: ["profile-tags"], queryFn: () => api<ProfileTag[]>("/profile-tags") });
  // Nilai dari URL tetap muncul di pilihan walau tag-nya sudah tidak dipakai.
  const options = (kind: ProfileTag["kind"], current: string) => [...new Set([...(tags.data ?? []).filter((t) => t.kind === kind).map((t) => t.name), ...(current ? [current] : [])])];
  const filtered = !!(q || divisionId || field || skill);
  const params = new URLSearchParams({ limit: "96", ...(q && { q }), ...(divisionId && { divisionId }), ...(field && { field }), ...(skill && { skill }) });
  const list = useQuery({ queryKey: ["members", params.toString()], queryFn: () => apiPage<Person[]>(`/members?${params}`), placeholderData: (p) => p });
  const divisions = useQuery({ queryKey: ["divisions"], queryFn: () => api<Division[]>("/divisions") });
  const rows = list.data?.data ?? [];

  return (
    <>
      <PageHeader title="Anggota" desc={list.data ? `${list.data.meta.total} anggota ${filtered ? "cocok" : "aktif"}` : "Kenali sesama anggota GenBI."}
        actions={me && CORE.includes(me.role) && <Button variant="outline" onClick={() => setManaging(true)}><Tags size={15} aria-hidden /> Kelola bidang</Button>} />
      <div className="mb-6 flex flex-wrap gap-2">
        <Input icon={Search} placeholder="Cari nama, bidang, atau skill…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-72" aria-label="Cari anggota" />
        <Select value={divisionId} onChange={(e) => setDivisionId(e.target.value)} className="w-full sm:w-52" aria-label="Filter divisi">
          <option value="">Semua divisi</option>
          {divisions.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
        <Select value={field} onChange={(e) => setField(e.target.value)} className="w-full sm:w-44" aria-label="Filter bidang">
          <option value="">Semua bidang</option>
          {options("FIELD", field).map((t) => <option key={t}>{t}</option>)}
        </Select>
        <Select value={skill} onChange={(e) => setSkill(e.target.value)} className="w-full sm:w-44" aria-label="Filter skill">
          <option value="">Semua skill</option>
          {options("SKILL", skill).map((t) => <option key={t}>{t}</option>)}
        </Select>
        {filtered && <Button variant="ghost" onClick={() => { setQ(""); setDivisionId(""); setField(""); setSkill(""); }}><X size={14} aria-hidden /> Reset</Button>}
      </div>
      <FieldManager open={managing} onClose={() => setManaging(false)} />
      {list.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <Card><EmptyState icon={Users} title="Tidak ada yang cocok" /></Card>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((p) => (
            <li key={p.id}>
              <Link href={`/dashboard/people/${p.id}`} className="group flex h-full flex-col items-center rounded-xl border border-slate-200/80 bg-white p-6 text-center shadow-xs transition hover:border-slate-300 hover:shadow-sm">
                <Avatar name={p.name} src={p.avatarUrl} size={72} />
                <p className="mt-4 font-medium text-slate-900 group-hover:text-primary">{p.name}</p>
                <p className="mt-0.5 text-[13px] text-slate-500">{p.position}{p.division ? ` · ${p.division.name}` : ""}</p>
                {(p.campus || p.batch) && <p className="mt-2 text-xs text-slate-400">{[p.campus, p.batch && `Angkatan ${p.batch}`].filter(Boolean).join(" · ")}</p>}
                {p.fields?.length > 0 && <p className="mt-3 text-[13px] font-medium text-slate-700">{p.fields.join(" · ")}</p>}
                {p.skills?.length > 0 && (
                  <span className="mt-2 flex flex-wrap justify-center gap-1">
                    {p.skills.slice(0, 4).map((s) => <span key={s} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{s}</span>)}
                    {p.skills.length > 4 && <span className="px-1 py-0.5 text-xs text-slate-400">+{p.skills.length - 4}</span>}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

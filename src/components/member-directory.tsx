"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { Avatar, Card, EmptyState, Input, PageHeader, Select, Skeleton } from "@/components/ui";
import { api, apiPage } from "@/lib/api";
import type { Division } from "@/lib/types";

type Person = { id: string; name: string; avatarUrl: string | null; position: string | null; division: { id: string; name: string } | null; campus: string | null; batch: string | null };

// Direktori anggota untuk semua orang: kartu bergambar, klik untuk lihat profil.
export function MemberDirectory() {
  const [q, setQ] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const params = new URLSearchParams({ limit: "96", ...(q && { q }), ...(divisionId && { divisionId }) });
  const list = useQuery({ queryKey: ["members", params.toString()], queryFn: () => apiPage<Person[]>(`/members?${params}`), placeholderData: (p) => p });
  const divisions = useQuery({ queryKey: ["divisions"], queryFn: () => api<Division[]>("/divisions") });
  const rows = list.data?.data ?? [];

  return (
    <>
      <PageHeader title="Anggota" desc={list.data ? `${list.data.meta.total} anggota aktif` : "Kenali sesama anggota GenBI."} />
      <div className="mb-6 flex flex-wrap gap-2">
        <Input icon={Search} placeholder="Cari nama…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-72" aria-label="Cari anggota" />
        <Select value={divisionId} onChange={(e) => setDivisionId(e.target.value)} className="w-full sm:w-52" aria-label="Filter divisi">
          <option value="">Semua divisi</option>
          {divisions.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
      </div>
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
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

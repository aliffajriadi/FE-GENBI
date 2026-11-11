"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Search, Smartphone, UserPlus, Users } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { MemberForm, ROLE_OPTIONS } from "@/components/member-form";
import { Avatar, Badge, Button, EmptyState, Input, PageHeader, Select, Table, Td } from "@/components/ui";
import { apiPage, api } from "@/lib/api";
import type { Division } from "@/lib/types";
import { useMe } from "@/lib/use-me";
import { MemberDirectory } from "@/components/member-directory";

type Member = {
  id: string; name: string; email: string; avatarUrl: string | null; nim: string | null; status: string; deviceId: string | null;
  role: string; roleName: string; position: string | null; division: { id: string; name: string } | null;
};
const LIMIT = 25;

// Pengurus (user.read) melihat tabel data anggota; anggota biasa melihat direktori kartu.
export default function MembersPage() {
  const { can, isLoading } = useMe();
  if (isLoading) return null;
  return can("user.read") ? <MembersAdmin /> : <MemberDirectory />;
}

function MembersAdmin() {
  const qc = useQueryClient();
  const { me, can } = useMe();
  const [q, setQ] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);

  const params = new URLSearchParams({ page: String(page), limit: String(LIMIT), ...(q && { q }), ...(divisionId && { divisionId }), ...(role && { role }) });
  const list = useQuery({ queryKey: ["users", "list", params.toString()], queryFn: () => apiPage<Member[]>(`/users?${params}`), placeholderData: (p) => p });
  const divisions = useQuery({ queryKey: ["divisions"], queryFn: () => api<Division[]>("/divisions") });
  const rows = list.data?.data ?? [];
  const total = list.data?.meta.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <>
      <PageHeader
        title="Anggota"
        desc={me?.role === "KADIV" ? `Anggota divisi ${me.division?.name ?? ""}, periode ${me.period?.name ?? ""}.` : `Pengurus dan anggota periode ${me?.period?.name ?? ""}.`}
        actions={can("user.manage") && <Button onClick={() => setAdding(true)}><UserPlus size={16} aria-hidden /> Tambah anggota</Button>}
      />
      <Table
        loading={list.isLoading}
        toolbar={
          <>
            <Input icon={Search} placeholder="Cari nama, email, NIM…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="w-full sm:w-72" aria-label="Cari anggota" />
            {me?.role !== "KADIV" && (
              <Select value={divisionId} onChange={(e) => { setDivisionId(e.target.value); setPage(1); }} className="w-full sm:w-44" aria-label="Filter divisi">
                <option value="">Semua divisi</option>
                {divisions.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            )}
            <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="w-full sm:w-44" aria-label="Filter role">
              <option value="">Semua role</option>
              {ROLE_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </>
        }
        hideOnMobile={[2, 4]} head={["Anggota", "Jabatan", "Divisi", "Status", "Perangkat"]}
        empty={rows.length === 0 && (
          <EmptyState
            icon={Users}
            title={q ? "Tidak ada yang cocok" : "Belum ada anggota"}
            action={!q && can("user.manage") && <Button variant="outline" onClick={() => setAdding(true)}><Plus size={16} aria-hidden /> Tambah anggota</Button>}
          />
        )}
        footer={
          total > 0 && (
            <div className="flex items-center justify-between">
              <span>{total} anggota</span>
              {pages > 1 && (
                <span className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="size-7" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Halaman sebelumnya"><ChevronLeft size={14} /></Button>
                  <span className="tabular-nums">{page} / {pages}</span>
                  <Button variant="outline" size="icon" className="size-7" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Halaman berikutnya"><ChevronRight size={14} /></Button>
                </span>
              )}
            </div>
          )
        }
      >
        {rows.map((m) => (
          <tr key={m.id} className="hover:bg-slate-50/60">
            <Td>
              <Link href={`/dashboard/members/${m.id}`} className="flex items-center gap-3">
                <Avatar name={m.name} src={m.avatarUrl} size={34} />
                <span className="min-w-0">
                  <span className="block font-medium text-slate-900 hover:text-primary">{m.name}</span>
                  <span className="block truncate text-xs text-slate-500">{m.email}</span>
                </span>
              </Link>
            </Td>
            <Td>
              <span className="block">{m.position ?? m.roleName}</span>
              {m.position && m.position !== m.roleName && <span className="text-xs text-slate-500">{m.roleName}</span>}
            </Td>
            <Td className="text-slate-600">{m.division?.name ?? "–"}</Td>
            <Td><Badge status={m.status} /></Td>
            <Td>{m.deviceId ? <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-600"><Smartphone size={14} aria-hidden /> Terikat</span> : <span className="text-[13px] text-slate-400">Belum</span>}</Td>
          </tr>
        ))}
      </Table>

      <Dialog open={adding} onClose={() => setAdding(false)} variant="sheet" title="Tambah anggota" desc="Akun langsung aktif di periode berjalan.">
        <MemberForm isAdmin={me?.role === "SYS_ADMIN"} onCancel={() => setAdding(false)} onDone={() => { setAdding(false); qc.invalidateQueries({ queryKey: ["users"] }); }} />
      </Dialog>
    </>
  );
}

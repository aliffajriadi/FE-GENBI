"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Avatar, Input } from "@/components/ui";
import { api } from "@/lib/api";

type UserRow = { id: string; name: string; avatarUrl: string | null; division: { name: string } | null };

// divisionId diisi → hanya anggota divisi itu (Kadiv & anggota yang diberi akses). Server tetap memvalidasi.

export function ParticipantPicker({ picked, onChange, divisionId }: { picked: string[]; onChange: (ids: string[]) => void; divisionId?: string | null }) {
  const [q, setQ] = useState("");
  const users = useQuery({ queryKey: ["members", "picker", divisionId ?? ""], queryFn: () => api<UserRow[]>(`/members?limit=100${divisionId ? `&divisionId=${divisionId}` : ""}`) });
  const shown = users.data?.filter((u) => u.name.toLowerCase().includes(q.toLowerCase())) ?? [];
  return (
    <div className="rounded-lg border border-slate-200">
      <div className="flex items-center gap-2 border-b border-slate-100 p-2">
        <Input icon={Search} placeholder="Cari nama…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari peserta" className="flex-1" />
        {shown.length > 0 && (
          <button type="button" className="shrink-0 px-2 text-xs font-medium text-primary hover:underline" onClick={() => onChange([...new Set([...picked, ...shown.map((u) => u.id)])])}>
            Pilih semua
          </button>
        )}
      </div>
      <div className="max-h-64 overflow-y-auto p-1">
        {users.isLoading && <p className="px-3 py-6 text-center text-[13px] text-slate-400">Memuat…</p>}
        {shown.map((u) => (
          <label key={u.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-slate-50">
            <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={picked.includes(u.id)} onChange={(e) => onChange(e.target.checked ? [...picked, u.id] : picked.filter((x) => x !== u.id))} />
            <Avatar name={u.name} src={u.avatarUrl} size={26} />
            <span className="flex-1 text-[13px]">{u.name}</span>
            <span className="text-xs text-slate-400">{u.division?.name}</span>
          </label>
        ))}
      </div>
      <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">{picked.length} peserta dipilih</p>
    </div>
  );
}

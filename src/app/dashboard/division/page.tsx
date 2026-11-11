"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, ShieldCheck, UserCog } from "lucide-react";
import { useToast } from "@/components/toast";
import { Avatar, Badge, Card, CardHeader, EmptyState, ErrorText, Field, PageHeader, Select, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import type { Division } from "@/lib/types";
import { useMe } from "@/lib/use-me";

type Access = {
  division: { id: string; name: string };
  areas: { key: string; label: string; desc: string }[];
  members: { id: string; name: string; avatarUrl: string | null; position: string; isHead: boolean; areas: string[] }[];
};

// Kelola divisi: Kadiv membagi wewenangnya ke anggota divisinya sendiri. Server tetap membatasi ke divisi itu.
export default function DivisionPage() {
  const { data: me, can } = useMe();
  const isAdmin = can("user.manage");
  const [divisionId, setDivisionId] = useState("");
  const divisions = useQuery({ queryKey: ["divisions"], queryFn: () => api<Division[]>("/divisions"), enabled: isAdmin });
  useEffect(() => {
    if (!divisionId) setDivisionId(me?.role === "KADIV" ? me.division?.id ?? "" : divisions.data?.[0]?.id ?? "");
  }, [divisionId, me, divisions.data]);

  const access = useQuery({ queryKey: ["division-access", divisionId], queryFn: () => api<Access>(`/divisions/${divisionId}/access`), enabled: !!divisionId });
  const qc = useQueryClient();
  const toast = useToast();
  const save = useMutation({
    mutationFn: ({ userId, areas }: { userId: string; areas: string[] }) => api(`/divisions/${divisionId}/access/${userId}`, { method: "PUT", body: { areas } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["division-access", divisionId] });
      toast("Akses diperbarui, langsung berlaku.");
    },
  });

  if (me && !isAdmin && me.role !== "KADIV") return <EmptyState icon={UserCog} title="Khusus kepala divisi" desc="Halaman ini untuk kepala divisi mengatur akses anggotanya." />;

  const a = access.data;
  return (
    <>
      <PageHeader
        eyebrow="Organisasi"
        title={a ? `Kelola divisi ${a.division.name}` : "Kelola divisi"}
        desc="Beri anggota divisi akses untuk membantu kepala divisi. Akses hanya berlaku di dalam divisi ini."
        actions={isAdmin && (
          <Field label="Divisi" className="w-56">
            <Select value={divisionId} onChange={(e) => setDivisionId(e.target.value)}>
              {divisions.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
        )}
      />

      {a && (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {a.areas.map((ar) => (
            <Card key={ar.key} className="p-4">
              <p className="text-sm font-medium">{ar.label}</p>
              <p className="mt-1 text-xs text-slate-500">{ar.desc}</p>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader title="Anggota divisi" desc="Centang akses yang ingin diberikan. Anggota mendapat notifikasi." icon={ShieldCheck} />
        <ErrorText error={access.error ?? save.error} />
        {access.isLoading && <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>}
        {a && !a.members.length && <EmptyState icon={UserCog} title="Belum ada anggota" desc="Divisi ini belum punya anggota aktif." />}
        <ul className="divide-y divide-slate-100">
          {a?.members.map((m) => (
            <li key={m.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={m.name} src={m.avatarUrl} size={34} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  <p className="truncate text-xs text-slate-500">{m.position}</p>
                </div>
              </div>
              {m.isHead ? (
                <Badge tone="blue"><Crown size={12} aria-hidden /> Kepala divisi · semua akses</Badge>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {a.areas.map((ar) => {
                    const on = m.areas.includes(ar.key);
                    return (
                      <label key={ar.key} className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                        <input
                          type="checkbox"
                          className="size-3.5 accent-[var(--primary)]"
                          checked={on}
                          disabled={save.isPending}
                          onChange={() => save.mutate({ userId: m.id, areas: on ? m.areas.filter((x) => x !== ar.key) : [...m.areas, ar.key] })}
                        />
                        {ar.label}
                      </label>
                    );
                  })}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

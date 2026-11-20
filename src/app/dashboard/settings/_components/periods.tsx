"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, Plus } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { Badge, Button, EmptyState, ErrorText, Field, Input, Table, Td } from "@/components/ui";
import { api } from "@/lib/api";
import { fmtDate, toLocalInput } from "@/lib/format";
import { type Period } from "../_lib";

export function Periods() {
  const qc = useQueryClient();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [activate, setActivate] = useState<Period | null>(null);
  const { data = [], isLoading } = useQuery({ queryKey: ["periods"], queryFn: () => api<Period[]>("/periods") });
  const create = useMutation({
    mutationFn: (body: unknown) => api("/periods", { method: "POST", body }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["periods"] }); setAdding(false); toast("Periode dibuat"); },
  });
  const act = useMutation({
    mutationFn: (id: string) => api(`/periods/${id}/activate`, { method: "POST" }),
    onSuccess: () => { toast("Periode diaktifkan. Silakan login ulang."); setTimeout(() => location.assign("/login"), 1200); },
    onError: (e) => toast(e.message, { error: true }),
  });
  const y = new Date().getFullYear();
  return (
    <>
      <Table
        loading={isLoading}
        toolbar={<><p className="mr-auto text-[15px] font-semibold">Periode kepengurusan</p><Button size="sm" onClick={() => setAdding(true)}><Plus size={14} aria-hidden /> Periode baru</Button></>}
        hideOnMobile={[1, 2]} head={["Periode", "Mulai", "Selesai", "Status", ""]}
        empty={data.length === 0 && <EmptyState icon={CalendarRange} title="Belum ada periode" />}
      >
        {data.map((p) => (
          <tr key={p.id}>
            <Td className="font-medium">{p.name}</Td>
            <Td className="text-slate-600">{fmtDate(p.startDate)}</Td>
            <Td className="text-slate-600">{fmtDate(p.endDate)}</Td>
            <Td>{p.isActive ? <Badge status="ACTIVE">Aktif</Badge> : <Badge tone="outline">Arsip</Badge>}</Td>
            <Td className="text-right">{!p.isActive && <Button variant="outline" size="sm" onClick={() => setActivate(p)}>Aktifkan</Button>}</Td>
          </tr>
        ))}
      </Table>
      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Periode baru"
        size="sm"
        footer={<><Button variant="ghost" onClick={() => setAdding(false)}>Batal</Button><Button type="submit" form="period-form" loading={create.isPending}>Buat</Button></>}
      >
        <form
          id="period-form"
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
            create.mutate({ name: f.name, startDate: new Date(f.startDate).toISOString(), endDate: new Date(f.endDate).toISOString() });
          }}
        >
          <Field label="Nama"><Input name="name" required defaultValue={`${y + 1}/${y + 2}`} /></Field>
          <Field label="Mulai"><Input type="datetime-local" name="startDate" required defaultValue={toLocalInput(new Date(y + 1, 0, 1))} /></Field>
          <Field label="Selesai"><Input type="datetime-local" name="endDate" required defaultValue={toLocalInput(new Date(y + 2, 0, 1))} /></Field>
          <ErrorText error={create.error} />
        </form>
      </Dialog>
      <Dialog
        open={!!activate}
        onClose={() => setActivate(null)}
        title={`Aktifkan periode ${activate?.name}?`}
        size="sm"
        footer={<><Button variant="ghost" onClick={() => setActivate(null)}>Batal</Button><Button variant="danger" loading={act.isPending} onClick={() => activate && act.mutate(activate.id)}>Aktifkan</Button></>}
      >
        <p className="text-slate-600">Periode lain menjadi arsip. Anggota tanpa jabatan di periode ini tidak bisa login sampai Sekretaris mengisi jabatannya. Data periode lama tetap tersimpan.</p>
      </Dialog>
    </>
  );
}

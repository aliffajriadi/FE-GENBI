"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderTree, Pencil, Plus } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { Button, EmptyState, ErrorText, Field, Input, Table, Td, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import type { Division } from "@/lib/types";

export function Divisions() {
  const qc = useQueryClient();
  const toast = useToast();
  const [edit, setEdit] = useState<Division | "new" | null>(null);
  const { data = [], isLoading } = useQuery({ queryKey: ["divisions"], queryFn: () => api<Division[]>("/divisions") });
  const d = edit && edit !== "new" ? edit : null;
  const save = useMutation({
    mutationFn: (f: { name: string; description: string }) =>
      d
        ? api(`/divisions/${d.id}`, { method: "PATCH", body: { name: f.name, description: f.description || null } })
        : api("/divisions", { method: "POST", body: { name: f.name, description: f.description || undefined, slug: f.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["divisions"] }); setEdit(null); toast("Divisi tersimpan"); },
  });
  return (
    <>
      <Table
        loading={isLoading}
        toolbar={<><p className="mr-auto text-[15px] font-semibold">Divisi periode aktif</p><Button size="sm" onClick={() => setEdit("new")}><Plus size={14} aria-hidden /> Divisi baru</Button></>}
        head={["Divisi", "Anggota", ""]}
        empty={data.length === 0 && <EmptyState icon={FolderTree} title="Belum ada divisi" desc="Tambahkan divisi agar anggota bisa dikelompokkan." />}
      >
        {data.map((x) => (
          <tr key={x.id} className="hover:bg-slate-50/60">
            <Td><span className="block font-medium">{x.name}</span><span className="text-xs text-slate-500">{x.description ?? "Belum ada deskripsi"}</span></Td>
            <Td className="tabular-nums">{x._count?.memberships ?? 0}</Td>
            <Td className="text-right"><Button variant="ghost" size="sm" onClick={() => setEdit(x)}><Pencil size={13} aria-hidden /> Ubah</Button></Td>
          </tr>
        ))}
      </Table>
      <Dialog
        open={!!edit}
        onClose={() => setEdit(null)}
        title={d ? "Ubah divisi" : "Divisi baru"}
        desc="Deskripsi tampil di halaman publik."
        footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Batal</Button><Button type="submit" form="div-form" loading={save.isPending}>Simpan</Button></>}
      >
        <form id="div-form" key={d?.id ?? "new"} className="grid gap-4" onSubmit={(e) => { e.preventDefault(); save.mutate(Object.fromEntries(new FormData(e.currentTarget)) as { name: string; description: string }); }}>
          <Field label="Nama divisi"><Input name="name" required minLength={2} defaultValue={d?.name} placeholder="Media & Komunikasi" /></Field>
          <Field label="Deskripsi"><Textarea name="description" defaultValue={d?.description ?? ""} placeholder="Mengelola publikasi, dokumentasi, dan media sosial GenBI." /></Field>
          <ErrorText error={save.error} />
        </form>
      </Dialog>
    </>
  );
}

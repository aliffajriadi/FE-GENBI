"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "@/components/dialog";
import { Button, ErrorText, Field, Input } from "@/components/ui";
import { api } from "@/lib/api";
import { type Column } from "../_lib";

export function ColumnDialog({ target, divisionId, onClose }: { target: Column | "new" | null; divisionId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const col = target && target !== "new" ? target : null;
  const save = useMutation({
    mutationFn: (name: string) => (col ? api(`/board-columns/${col.id}`, { method: "PATCH", body: { name } }) : api(`/boards/${divisionId}/columns`, { method: "POST", body: { name } })),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["board", divisionId] }); onClose(); },
  });
  return (
    <Dialog open={!!target} onClose={onClose} title={col ? "Ganti nama kolom" : "Kolom baru"} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button type="submit" form="col-form" loading={save.isPending}>Simpan</Button></>}>
      <form id="col-form" key={col?.id ?? "new"} className="grid gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate(String(new FormData(e.currentTarget).get("name"))); }}>
        <Field label="Nama kolom" hint="Contoh: Ide, To do, Proses, Menunggu acc, Selesai"><Input name="name" required maxLength={40} defaultValue={col?.name} autoFocus /></Field>
        <ErrorText error={save.error} />
      </form>
    </Dialog>
  );
}

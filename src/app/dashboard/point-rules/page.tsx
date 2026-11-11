"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Zap } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { Badge, Button, ErrorText, Field, Input, PageHeader, Table, Td } from "@/components/ui";
import { api } from "@/lib/api";
import { useMe } from "@/lib/use-me";

type Rule = { id: string; key: string; label: string; points: number; trigger: "AUTO" | "MANUAL"; isActive: boolean };

export default function PointRulesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = useMe();
  const editable = can("points.rules");
  const { data = [], isLoading } = useQuery({ queryKey: ["point-rules"], queryFn: () => api<Rule[]>("/point-rules") });
  const [edit, setEdit] = useState<Rule | "new" | null>(null);
  const done = () => qc.invalidateQueries({ queryKey: ["point-rules"] });

  const toggle = useMutation({
    mutationFn: (r: Rule) => api(`/point-rules/${r.id}`, { method: "PATCH", body: { isActive: !r.isActive } }),
    onSuccess: (_, r) => { done(); toast(r.isActive ? "Aturan dinonaktifkan" : "Aturan diaktifkan"); },
  });

  return (
    <>
      <PageHeader
        title="Aturan poin"
        desc="Perubahan nilai hanya berlaku untuk kejadian berikutnya. Poin yang sudah tercatat tidak ikut berubah."
        actions={editable && <Button onClick={() => setEdit("new")}><Plus size={16} aria-hidden /> Aturan baru</Button>}
      />
      <Table loading={isLoading} hideOnMobile={[2, 3]} head={["Aturan", "Poin", "Pemicu", "Status", ""]}>
        {data.map((r) => (
          <tr key={r.id} className="group hover:bg-slate-50/60">
            <Td>
              <span className="block font-medium">{r.label}</span>
              <span className="font-mono text-[11px] text-slate-400">{r.key}</span>
            </Td>
            <Td>
              <span className={`inline-flex min-w-12 justify-center rounded-md px-2 py-0.5 text-[13px] font-semibold tabular-nums ${r.points < 0 ? "bg-red-50 text-red-700" : r.points > 0 ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                {r.points > 0 ? `+${r.points}` : r.points}
              </span>
            </Td>
            <Td>
              {r.trigger === "AUTO" ? (
                <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-700"><Zap size={13} className="text-primary" aria-hidden /> Otomatis</span>
              ) : (
                <span className="text-[13px] text-slate-500">Manual</span>
              )}
            </Td>
            <Td><Badge status={r.isActive ? "ACTIVE" : "INACTIVE"} /></Td>
            <Td className="text-right whitespace-nowrap">
              {editable && (
                <span className="inline-flex flex-col-reverse items-end gap-1 sm:flex-row sm:items-center">
                  <Button variant="ghost" size="sm" onClick={() => toggle.mutate(r)}>{r.isActive ? "Nonaktifkan" : "Aktifkan"}</Button>
                  <Button variant="outline" size="sm" onClick={() => setEdit(r)} aria-label={`Ubah ${r.label}`}><Pencil size={13} aria-hidden /><span className="hidden sm:inline">Ubah</span></Button>
                </span>
              )}
            </Td>
          </tr>
        ))}
      </Table>
      {!editable && <p className="mt-3 text-[13px] text-slate-500">Hanya Sekretaris yang bisa mengubah aturan poin.</p>}
      <RuleDialog target={edit} onClose={() => setEdit(null)} onDone={done} />
    </>
  );
}

function RuleDialog({ target, onClose, onDone }: { target: Rule | "new" | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const rule = target && target !== "new" ? target : null;
  const save = useMutation({
    mutationFn: (f: Record<string, string>) =>
      rule
        ? api(`/point-rules/${rule.id}`, { method: "PATCH", body: { label: f.label, points: Number(f.points) } })
        : api("/point-rules", { method: "POST", body: { key: f.key.toUpperCase(), label: f.label, points: Number(f.points), trigger: "MANUAL", isActive: true } }),
    onSuccess: () => { onDone(); onClose(); toast("Aturan poin tersimpan"); },
  });
  return (
    <Dialog
      open={!!target}
      onClose={onClose}
      title={rule ? "Ubah aturan" : "Aturan poin baru"}
      desc={rule ? "Nilai baru berlaku untuk kejadian berikutnya." : "Aturan baru dipakai saat pengurus memberi poin manual."}
      size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button type="submit" form="rule-form" loading={save.isPending}>Simpan</Button></>}
    >
      <form id="rule-form" key={rule?.id ?? "new"} className="grid gap-4" onSubmit={(ev) => { ev.preventDefault(); save.mutate(Object.fromEntries(new FormData(ev.currentTarget)) as Record<string, string>); }}>
        {!rule && <Field label="Kode" hint="Huruf besar, angka, garis bawah"><Input name="key" required pattern="[A-Za-z0-9_]+" placeholder="DESAIN_PUBLIKASI" /></Field>}
        <Field label="Nama aturan"><Input name="label" required minLength={2} defaultValue={rule?.label} placeholder="Bantu desain publikasi" /></Field>
        <Field label="Poin" hint="Boleh negatif"><Input name="points" type="number" required defaultValue={rule?.points} /></Field>
        <ErrorText error={save.error} />
      </form>
    </Dialog>
  );
}

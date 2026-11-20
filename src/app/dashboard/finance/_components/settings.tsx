"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Check, Landmark,
    Plus, Receipt
} from "lucide-react";
import { FilePick } from "@/components/file-pick";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, CardHeader, cx, EmptyState, ErrorText, Field, Input, Select, Switch, Tabs } from "@/components/ui";
import { api, uploadFile } from "@/lib/api";
import { rupiah } from "@/lib/format";
import type { BankAccount, Division } from "@/lib/types";
import { FREQ, type Plan, withKas } from "../_lib";

export function Settings({ kas, label }: { kas: string; label: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const plans = useQuery({ queryKey: ["dues-plans", kas], queryFn: () => api<Plan[]>(withKas("/dues-plans", kas)) });
  const accounts = useQuery({ queryKey: ["bank-accounts", kas], queryFn: () => api<BankAccount[]>(withKas("/bank-accounts", kas)) });
  const [newPlan, setNewPlan] = useState(false);
  const [account, setAccount] = useState<BankAccount | "new" | null>(null);
  const patchPlan = useMutation({
    mutationFn: ({ id, ...body }: { id: string; isActive: boolean }) => api(`/dues-plans/${id}`, { method: "PATCH", body }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dues-plans"] }); toast("Rencana iuran diperbarui"); },
  });
  const patchAcc = useMutation({
    mutationFn: ({ id, ...body }: { id: string; isActive: boolean }) => api(`/bank-accounts/${id}`, { method: "PATCH", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bank-accounts"] }),
  });

  const noAccount = accounts.data?.length === 0;
  const noPlan = plans.data?.length === 0;
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      {(noAccount || noPlan) && (
        <Card className="border-blue-200 bg-blue-50/40 p-5 xl:col-span-2">
          <p className="font-semibold">Mulai pakai {label} dalam 2 langkah</p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              { done: !noAccount, title: "Tambah rekening tujuan", desc: "Nomor rekening/e-wallet yang menerima transfer anggota.", action: () => setAccount("new") },
              { done: !noPlan, title: "Buat iuran", desc: "Tagihan langsung terkirim ke anggota beserta notifikasinya.", action: () => setNewPlan(true) },
            ].map((st, i) => (
              <li key={st.title} className="flex items-start gap-3 rounded-lg bg-white p-3 ring-1 ring-slate-200">
                <span className={cx("grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold", st.done ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600")}>{st.done ? <Check size={13} aria-hidden /> : i + 1}</span>
                <span className="min-w-0 flex-1"><span className={cx("block text-[13.5px] font-medium", st.done && "text-slate-400 line-through")}>{st.title}</span><span className="text-xs text-slate-500">{st.desc}</span></span>
                {!st.done && <Button size="sm" variant="outline" onClick={st.action}>Mulai</Button>}
              </li>
            ))}
          </ol>
        </Card>
      )}
      <Card>
        <CardHeader title={`Rencana iuran · ${label}`} desc={kas === "org" ? "Tagihan dibuat otomatis tiap periode untuk peserta." : "Hanya untuk anggota divisi ini. Uangnya masuk ke rekening kas divisi."} action={<Button size="sm" onClick={() => setNewPlan(true)}><Plus size={14} aria-hidden /> Iuran baru</Button>} />
        <ul className="divide-y divide-slate-100">
          {plans.data?.length === 0 && <li><EmptyState icon={Receipt} title="Belum ada iuran" desc="Buat iuran kas bulanan atau iuran insidental (kaos, acara)." /></li>}
          {plans.data?.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{p.name} <span className="ml-1 text-[13px] font-normal text-slate-500">{rupiah(p.amount)} · {FREQ[p.frequency]}</span></p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {p.division ? `Divisi ${p.division.name}` : "Semua anggota"} · {p.bills.total} tagihan · {p.bills.paid} lunas · {p.bills.pending} menunggu{p.bills.overdue ? ` · ${p.bills.overdue} menunggak` : ""}
                </p>
              </div>
              <Badge status={p.isActive ? "ACTIVE" : "INACTIVE"} />
              <Button variant="ghost" size="sm" onClick={() => patchPlan.mutate({ id: p.id, isActive: !p.isActive })}>{p.isActive ? "Hentikan" : "Aktifkan"}</Button>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="self-start">
        <CardHeader title="Rekening tujuan" desc={`Tampil ke anggota saat membayar tagihan ${label}.`} action={<Button size="sm" variant="outline" onClick={() => setAccount("new")}><Plus size={14} aria-hidden /> Tambah</Button>} />
        <ul className="divide-y divide-slate-100">
          {accounts.data?.length === 0 && <li className="px-5 py-8 text-center text-[13px] text-slate-500">Belum ada rekening.</li>}
          {accounts.data?.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-5 py-3">
              <span className="grid size-9 place-items-center rounded-lg bg-slate-100 text-slate-600"><Landmark size={16} aria-hidden /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium">{a.bankName} · <span className="font-mono">{a.accountNumber}</span></span>
                <span className="text-xs text-slate-500">a.n. {a.accountName}{a.qrisImageUrl ? " · ada QRIS" : ""}</span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => setAccount(a)}>Ubah</Button>
              <Button variant="ghost" size="sm" onClick={() => patchAcc.mutate({ id: a.id, isActive: !a.isActive })}>{a.isActive ? "Nonaktifkan" : "Aktifkan"}</Button>
            </li>
          ))}
        </ul>
      </Card>
      <PlanDialog kas={kas} open={newPlan} onClose={() => setNewPlan(false)} />
      <AccountDialog kas={kas} target={account} onClose={() => setAccount(null)} />
    </div>
  );
}

function PlanDialog({ kas, open, onClose }: { kas: string; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [freq, setFreq] = useState<"MONTHLY" | "SEMESTER" | "ONCE">("MONTHLY");
  const [scope, setScope] = useState<"ALL" | "DIVISION">("ALL");
  const divisions = useQuery({ queryKey: ["divisions"], queryFn: () => api<Division[]>("/divisions"), enabled: open && kas === "org" });
  const save = useMutation({
    mutationFn: (f: Record<string, string>) =>
      api<{ generated: number }>(withKas("/dues-plans", kas), {
        method: "POST",
        body: {
          name: f.name, amount: Number(f.amount), frequency: freq, scope, divisionId: scope === "DIVISION" ? f.divisionId : undefined,
          ...(freq === "ONCE" ? { dueDate: new Date(f.dueDate).toISOString() } : { dueDay: Number(f.dueDay) }),
        },
      }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["dues-plans"] }); onClose(); toast(`Iuran dibuat, ${r.generated} tagihan dikirim ke anggota`); },
  });
  return (
    <Dialog open={open} onClose={onClose} title="Iuran baru" desc="Tagihan periode berjalan langsung dibuat setelah disimpan."
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button type="submit" form="plan-form" loading={save.isPending}>Buat & kirim tagihan</Button></>}>
      <form id="plan-form" className="grid gap-4" onSubmit={(e) => { e.preventDefault(); save.mutate(Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>); }}>
        <Field label="Nama iuran"><Input name="name" required minLength={2} placeholder="Kas bulanan" autoFocus /></Field>
        <Field label="Nominal per anggota (Rp)"><Input name="amount" type="number" required min={1000} step={500} placeholder="20000" /></Field>
        <div><Tabs value={freq} onChange={setFreq} items={[{ value: "MONTHLY", label: "Bulanan" }, { value: "SEMESTER", label: "Semester" }, { value: "ONCE", label: "Sekali bayar" }]} /></div>
        {freq === "ONCE"
          ? <Field label="Jatuh tempo"><Input name="dueDate" type="datetime-local" required /></Field>
          : <Field label="Tanggal jatuh tempo" hint={freq === "MONTHLY" ? "Tiap bulan" : "Di bulan pertama semester (Jan/Jul)"}><Input name="dueDay" type="number" min={1} max={28} required defaultValue={10} /></Field>}
        {/* Kas divisi selalu menagih anggota divisinya sendiri (dipaksa juga di server). */}
        {kas === "org" && <div><Tabs value={scope} onChange={setScope} items={[{ value: "ALL", label: "Semua anggota" }, { value: "DIVISION", label: "Satu divisi" }]} /></div>}
        {kas === "org" && scope === "DIVISION" && (
          <Field label="Divisi"><Select name="divisionId" required><option value="">Pilih divisi</option>{divisions.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
        )}
        <ErrorText error={save.error} />
      </form>
    </Dialog>
  );
}

function AccountDialog({ kas, target, onClose }: { kas: string; target: BankAccount | "new" | null; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const a = target && target !== "new" ? target : null;
  const [qris, setQris] = useState<File | null>(null);
  const [active, setActive] = useState(true);
  useEffect(() => { setQris(null); setActive(a?.isActive ?? true); }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = useMutation({
    mutationFn: async (f: Record<string, string>) => {
      const qrisImageUrl = qris ? (await uploadFile(qris)).url : undefined;
      const body = { bankName: f.bankName, accountNumber: f.accountNumber, accountName: f.accountName, isActive: active, ...(qrisImageUrl ? { qrisImageUrl } : {}) };
      return a ? api(`/bank-accounts/${a.id}`, { method: "PATCH", body }) : api(withKas("/bank-accounts", kas), { method: "POST", body });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bank-accounts"] }); onClose(); toast("Rekening tersimpan"); },
  });
  return (
    <Dialog open={!!target} onClose={onClose} title={a ? "Ubah rekening" : "Rekening baru"}
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button type="submit" form="acc-form" loading={save.isPending}>Simpan</Button></>}>
      <form id="acc-form" key={a?.id ?? "new"} className="grid gap-4" onSubmit={(e) => { e.preventDefault(); save.mutate(Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>); }}>
        <Field label="Bank / e-wallet"><Input name="bankName" required defaultValue={a?.bankName} placeholder="BSI, BRI, DANA…" /></Field>
        <Field label="Nomor rekening"><Input name="accountNumber" required inputMode="numeric" defaultValue={a?.accountNumber} /></Field>
        <Field label="Atas nama"><Input name="accountName" required defaultValue={a?.accountName} /></Field>
        <FilePick file={qris} onChange={setQris} accept="image/jpeg,image/png,image/webp" label={a?.qrisImageUrl ? "QRIS sudah ada; pilih untuk mengganti" : "Gambar QRIS (opsional)"} />
        <Switch checked={active} onChange={setActive} label="Aktif" description="Rekening nonaktif tidak tampil ke anggota." />
        <ErrorText error={save.error} />
      </form>
    </Dialog>
  );
}

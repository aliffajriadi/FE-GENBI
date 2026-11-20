"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Check, Clock, Copy, FileText, Landmark, Receipt, Users, Wallet } from "lucide-react";
import { AuthImage } from "@/components/auth-image";
import { FilePick } from "@/components/file-pick";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, CardHeader, cx, EmptyState, ErrorText, Field, Input, Skeleton, Table, Td } from "@/components/ui";
import { api, apiPage, uploadFile } from "@/lib/api";
import { fmtDate, rupiah, toLocalInput } from "@/lib/format";
import type { BankAccount, Bill, Payment } from "@/lib/types";
import { OPEN_STATUS, useKasLabel, withKas } from "../_lib";

export function MyBills() {
  const kasLabel = useKasLabel();
  const bills = useQuery({ queryKey: ["bills-me"], queryFn: () => api<Bill[]>("/bills/me") });
  const payments = useQuery({ queryKey: ["payments", "mine"], queryFn: () => apiPage<Payment[]>("/payments?mine=1&limit=20") });
  const [paying, setPaying] = useState<string | null>(null); // kas yang sedang dibayar ("org" | id divisi)
  const all = bills.data ?? [];
  const open = all.filter((b) => OPEN_STATUS.includes(b.status));
  const waiting = all.filter((b) => b.status === "PENDING");
  const due = open.reduce((s, b) => s + b.amount, 0);
  const overdue = open.filter((b) => b.status === "OVERDUE").length;
  const nextDue = [...open].sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))[0];
  // Satu bukti transfer per kas, karena rekening tujuannya berbeda.
  const groups = [...new Set(open.map((b) => b.plan.treasuryDivisionId ?? "org"))].map((k) => {
    const list = open.filter((b) => (b.plan.treasuryDivisionId ?? "org") === k);
    return { kas: k, bills: list, total: list.reduce((s, b) => s + b.amount, 0) };
  });

  if (bills.isLoading) return <div className="grid gap-4"><Skeleton className="h-28 rounded-xl" /><Skeleton className="h-48 rounded-xl" /></div>;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid min-w-0 grid-cols-1 content-start gap-6">
        {/* Status besar: apa yang harus dilakukan sekarang */}
        <Card className={cx("p-5 sm:p-6", open.length ? (overdue ? "border-red-200 bg-red-50/30" : "border-amber-200 bg-amber-50/30") : "border-green-200 bg-green-50/30")}>
          <div className="flex items-start gap-4">
            <span className={cx("grid size-12 shrink-0 place-items-center rounded-xl", open.length ? (overdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700") : "bg-green-100 text-green-700")}>
              {open.length ? <Wallet size={22} aria-hidden /> : <Check size={22} aria-hidden />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-slate-600">{open.length ? `${open.length} tagihan perlu dibayar${overdue ? ` · ${overdue} menunggak` : ""}` : waiting.length ? "Tidak ada yang perlu dibayar" : "Semua tagihan lunas"}</p>
              <p className="text-[28px] leading-tight font-semibold tracking-tight tabular-nums">{open.length ? rupiah(due) : "Rp0"}</p>
              <p className="mt-1 text-[13px] text-slate-500">
                {open.length && nextDue ? `Jatuh tempo terdekat ${fmtDate(nextDue.dueDate).split(",")[0]}` : waiting.length ? `${waiting.length} pembayaran sedang menunggu verifikasi` : "Terima kasih sudah tertib membayar kas 🙌"}
              </p>
            </div>
          </div>
          {open.length > 0 && (
            <ol className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-200/70 pt-4 text-[12px] text-slate-600">
              {["Pilih tagihan", "Transfer ke rekening", "Upload bukti"].map((s, i) => (
                <li key={s} className="flex items-center gap-2"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-white text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">{i + 1}</span>{s}</li>
              ))}
            </ol>
          )}
        </Card>

        {/* Perlu dibayar, dikelompokkan per kas (beda rekening = beda pembayaran) */}
        {groups.map((g) => (
          <Card key={g.kas}>
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
              <span className={cx("grid size-9 shrink-0 place-items-center rounded-lg", g.kas === "org" ? "bg-accent text-primary" : "bg-amber-50 text-amber-700")}>
                {g.kas === "org" ? <Landmark size={17} aria-hidden /> : <Users size={17} aria-hidden />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{kasLabel(g.kas === "org" ? null : g.kas)}</p>
                <p className="text-xs text-slate-500">Diverifikasi {g.kas === "org" ? "Bendahara" : "Kepala Divisi"} · {g.bills.length} tagihan</p>
              </div>
              <Button className="w-full sm:w-auto" onClick={() => setPaying(g.kas)}><Banknote size={15} aria-hidden /> Bayar {rupiah(g.total)}</Button>
            </div>
            <ul className="divide-y divide-slate-100">
              {g.bills.map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium">{b.plan.name}</span>
                    <span className={cx("text-xs", b.status === "OVERDUE" ? "font-medium text-red-600" : "text-slate-500")}>
                      {b.periodName} · {b.status === "OVERDUE" ? "lewat jatuh tempo" : "jatuh tempo"} {fmtDate(b.dueDate).split(",")[0]}
                    </span>
                  </span>
                  {b.status !== "UNPAID" && <Badge status={b.status} />}
                  <span className="text-[13.5px] font-semibold tabular-nums">{rupiah(b.amount)}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}

        {waiting.length > 0 && (
          <Card>
            <CardHeader title="Menunggu verifikasi" desc="Bukti sudah dikirim, tinggal dicek pengelola kas." icon={Clock} />
            <ul className="divide-y divide-slate-100">
              {waiting.map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium">{b.plan.name}</span><span className="text-xs text-slate-500">{b.periodName} · {kasLabel(b.plan.treasuryDivisionId)}</span></span>
                  <span className="text-[13.5px] font-medium tabular-nums">{rupiah(b.amount)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Table
          hideOnMobile={[1]}
          toolbar={<p className="text-[15px] font-semibold">Semua tagihan</p>}
          head={["Tagihan", "Jatuh tempo", "Nominal", "Status"]}
          empty={all.length === 0 && <EmptyState icon={Receipt} title="Belum ada tagihan" desc="Tagihan kas muncul otomatis saat pengelola kas membuat iuran." />}
        >
          {all.map((b) => (
            <tr key={b.id}>
              <Td><span className="block font-medium">{b.plan.name}</span><span className="text-xs text-slate-500">{b.periodName} · {kasLabel(b.plan.treasuryDivisionId)}</span></Td>
              <Td className={cx("whitespace-nowrap", b.status === "OVERDUE" && "font-medium text-red-600")}>{fmtDate(b.dueDate).split(",")[0]}</Td>
              <Td className="font-medium tabular-nums">{rupiah(b.amount)}</Td>
              <Td><Badge status={b.status} /></Td>
            </tr>
          ))}
        </Table>
      </div>

      <Card className="self-start">
        <CardHeader title="Riwayat pembayaran" desc="Kwitansi tersedia setelah diverifikasi." />
        <ul className="divide-y divide-slate-100">
          {payments.data?.data.length === 0 && <li className="px-5 py-8 text-center text-[13px] text-slate-500">Belum ada pembayaran.</li>}
          {payments.data?.data.map((p) => (
            <li key={p.id} className="px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium tabular-nums">{rupiah(p.amount)}</span>
                <Badge status={p.status} />
              </div>
              <p className="mt-0.5 text-xs text-slate-500">{kasLabel(p.treasuryDivisionId)} · {p.bills.map((b) => b.periodName).join(", ")} · {fmtDate(p.createdAt)}</p>
              {p.status === "REJECTED" && <p className="mt-1 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">Ditolak: {p.rejectReason}</p>}
              {p.status === "VERIFIED" && <Link href={`/dashboard/finance/receipt/${p.id}`} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><FileText size={12} aria-hidden /> Kwitansi</Link>}
            </li>
          ))}
        </ul>
      </Card>

      <PayDialog
        open={!!paying}
        onClose={() => setPaying(null)}
        kas={paying ?? "org"}
        label={kasLabel(paying && paying !== "org" ? paying : null)}
        bills={open.filter((b) => (b.plan.treasuryDivisionId ?? "org") === paying)}
      />
    </div>
  );
}

function PayDialog({ open, onClose, bills, kas, label }: { open: boolean; onClose: () => void; bills: Bill[]; kas: string; label: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const verifier = kas === "org" ? "Bendahara" : "Kepala divisi";
  const accounts = useQuery({ queryKey: ["bank-accounts", kas], queryFn: () => api<BankAccount[]>(withKas("/bank-accounts", kas)), enabled: open });
  const [picked, setPicked] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => { if (open) { setPicked(bills.map((b) => b.id)); setFile(null); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = bills.filter((b) => picked.includes(b.id)).reduce((s, b) => s + b.amount, 0);

  const pay = useMutation({
    mutationFn: async (f: { amount: string; transferDate: string }) => {
      if (!file) throw new Error("Pilih foto/PDF bukti transfer");
      const up = await uploadFile(file);
      return api("/payments", { method: "POST", body: { billIds: picked, amount: Number(f.amount), transferDate: new Date(f.transferDate).toISOString(), proofId: up.id } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => ["bills-me", "payments", "dashboard"].includes(q.queryKey[0] as string) });
      toast(`Bukti terkirim. ${verifier} akan memverifikasi.`);
      onClose();
    },
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="sheet"
      title={`Bayar ${label}`}
      desc={`Transfer ke rekening ${label} di bawah, lalu upload buktinya. Diverifikasi oleh ${verifier}.`}
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button type="submit" form="pay-form" loading={pay.isPending} disabled={!picked.length}>Kirim bukti · {rupiah(total)}</Button></>}
    >
      <form
        id="pay-form"
        key={String(open)}
        className="grid gap-6"
        onSubmit={(e) => { e.preventDefault(); pay.mutate(Object.fromEntries(new FormData(e.currentTarget)) as { amount: string; transferDate: string }); }}
      >
        <section className="grid gap-2">
          <p className="text-[13px] font-semibold">1. Pilih tagihan</p>
          {bills.map((b) => (
            <label key={b.id} className={cx("flex cursor-pointer items-center gap-3 rounded-lg border p-3", picked.includes(b.id) ? "border-blue-300 bg-blue-50/40" : "border-slate-200")}>
              <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={picked.includes(b.id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, b.id] : p.filter((x) => x !== b.id)))} />
              <span className="flex-1"><span className="block text-[13px] font-medium">{b.plan.name} · {b.periodName}</span><span className="text-xs text-slate-500">Jatuh tempo {fmtDate(b.dueDate).split(",")[0]}</span></span>
              <span className="text-[13px] font-semibold tabular-nums">{rupiah(b.amount)}</span>
            </label>
          ))}
        </section>

        <section className="grid gap-2">
          <p className="text-[13px] font-semibold">2. Transfer ke</p>
          {accounts.data?.length === 0 && <p className="rounded-lg bg-amber-50 p-3 text-[13px] text-amber-800">{verifier} belum mengisi rekening tujuan {label}. Hubungi {verifier.toLowerCase()} sebelum transfer.</p>}
          {accounts.data?.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <span className="grid size-9 place-items-center rounded-lg bg-slate-100 text-slate-600"><Landmark size={17} aria-hidden /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-slate-500">{a.bankName} · a.n. {a.accountName}</span>
                <span className="block font-mono text-[15px] font-semibold tracking-wide">{a.accountNumber}</span>
              </span>
              <Button type="button" variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(a.accountNumber).then(() => toast("Nomor rekening disalin"))}><Copy size={13} aria-hidden /> Salin</Button>
            </div>
          ))}
          {accounts.data?.filter((a) => a.qrisImageUrl).map((a) => <AuthImage key={a.id} url={a.qrisImageUrl!} alt={`QRIS ${a.bankName}`} className="mx-auto aspect-square w-56 rounded-lg border border-slate-200 object-contain" />)}
        </section>

        <section className="grid gap-4">
          <p className="text-[13px] font-semibold">3. Upload bukti</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nominal ditransfer"><Input name="amount" type="number" required min={total} key={total} defaultValue={total} /></Field>
            <Field label="Tanggal transfer"><Input name="transferDate" type="datetime-local" required defaultValue={toLocalInput(new Date())} /></Field>
          </div>
          <FilePick file={file} onChange={setFile} accept="image/jpeg,image/png,image/webp,application/pdf" label="Foto atau PDF bukti transfer · maks 2 MB (foto otomatis dikecilkan)" />
        </section>
        <ErrorText error={pay.error} />
      </form>
    </Dialog>
  );
}

"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, FileCheck2, Receipt, Search, X } from "lucide-react";
import { AuthImage } from "@/components/auth-image";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import {
    Avatar, Badge, Button, Card, cx, EmptyState, ErrorText, Field, Input, Select, Skeleton, Table, Td
} from "@/components/ui";
import { api, apiPage, download, openFile } from "@/lib/api";
import { fmtDate, rupiah } from "@/lib/format";
import type { Bill, Payment } from "@/lib/types";
import { withKas } from "../_lib";

export function VerifyQueue({ kas }: { kas: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ["payments", "PENDING", kas], queryFn: () => apiPage<Payment[]>(withKas("/payments?status=PENDING&limit=50", kas)) });
  const [rejecting, setRejecting] = useState<Payment | null>(null);
  const refresh = () => qc.invalidateQueries({ predicate: (x) => ["payments", "finance-summary", "bills"].includes(x.queryKey[0] as string) });
  const verify = useMutation({
    mutationFn: (id: string) => api(`/payments/${id}/verify`, { method: "POST" }),
    onSuccess: () => { refresh(); toast("Pembayaran diverifikasi, tercatat di buku kas"); },
    onError: (e) => toast(e.message, { error: true }),
  });
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api(`/payments/${id}/reject`, { method: "POST", body: { reason } }),
    onSuccess: () => { refresh(); setRejecting(null); toast("Bukti ditolak, anggota diminta upload ulang"); },
  });

  if (q.isLoading) return <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-72 rounded-xl" />)}</div>;
  if (!q.data?.data.length) return <Card><EmptyState icon={FileCheck2} title="Antrean kosong" desc="Semua bukti bayar sudah diproses." /></Card>;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {q.data.data.map((p) => {
          const total = p.bills.reduce((s, b) => s + b.amount, 0);
          return (
            <Card key={p.id} className="flex flex-col overflow-hidden">
              <button onClick={() => openFile(p.proofUrl).catch((e) => toast(e.message, { error: true }))} className="block bg-slate-50" aria-label="Buka bukti ukuran penuh">
                <AuthImage url={p.proofUrl} alt={`Bukti transfer ${p.user.name}`} className="h-48 w-full object-contain" />
              </button>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={p.user.name} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.user.name}</p>
                    <p className="text-xs text-slate-500">Transfer {fmtDate(p.transferDate)}</p>
                  </div>
                </div>
                <dl className="grid gap-1 rounded-lg bg-slate-50 p-3 text-[13px]">
                  {p.bills.map((b) => (
                    <div key={b.id} className="flex justify-between"><dt className="text-slate-600">{b.plan.name} · {b.periodName}</dt><dd className="tabular-nums">{rupiah(b.amount)}</dd></div>
                  ))}
                  <div className="mt-1 flex justify-between border-t border-slate-200 pt-1.5 font-semibold">
                    <dt>Ditransfer</dt>
                    <dd className={cx("tabular-nums", p.amount !== total && "text-amber-700")}>{rupiah(p.amount)}</dd>
                  </div>
                </dl>
                <div className="mt-auto flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setRejecting(p)}><X size={15} aria-hidden /> Tolak</Button>
                  <Button className="flex-1" loading={verify.isPending && verify.variables === p.id} onClick={() => verify.mutate(p.id)}><Check size={15} aria-hidden /> Verifikasi</Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <Dialog
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title={`Tolak bukti ${rejecting?.user.name ?? ""}`}
        size="sm"
        footer={<><Button variant="ghost" onClick={() => setRejecting(null)}>Batal</Button><Button variant="danger" type="submit" form="reject-form" loading={reject.isPending}>Tolak</Button></>}
      >
        <form id="reject-form" className="grid gap-3" onSubmit={(e) => { e.preventDefault(); reject.mutate({ id: rejecting!.id, reason: String(new FormData(e.currentTarget).get("reason")) }); }}>
          <Field label="Alasan" hint="Dikirim ke anggota agar bisa memperbaiki."><Input name="reason" required minLength={3} placeholder="Nominal di bukti tidak sesuai" autoFocus /></Field>
          <ErrorText error={reject.error} />
        </form>
      </Dialog>
    </>
  );
}

export function BillsTable({ kas }: { kas: string }) {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), limit: "25", ...(status && { status }), ...(q && { q }), ...(kas !== "org" && { kas }) });
  const bills = useQuery({ queryKey: ["bills", params.toString()], queryFn: () => apiPage<Bill[]>(`/bills?${params}`), placeholderData: (p) => p });
  const pages = Math.max(1, Math.ceil((bills.data?.meta.total ?? 0) / 25));
  return (
    <Table
      loading={bills.isLoading}
      toolbar={
        <>
          <Input icon={Search} placeholder="Cari anggota…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="w-full sm:w-60" aria-label="Cari anggota" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-full sm:w-44" aria-label="Filter status">
            <option value="">Semua status</option>
            <option value="UNPAID">Belum bayar</option>
            <option value="PENDING">Menunggu</option>
            <option value="OVERDUE">Menunggak</option>
            <option value="REJECTED">Ditolak</option>
            <option value="PAID">Lunas</option>
          </Select>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => download(withKas("/finance/report/export", kas), "laporan-keuangan.xlsx")}><Download size={14} aria-hidden /> Laporan Excel</Button>
        </>
      }
      hideOnMobile={[2]} head={["Anggota", "Tagihan", "Jatuh tempo", "Nominal", "Status"]}
      empty={bills.data?.data.length === 0 && <EmptyState icon={Receipt} title="Tidak ada tagihan" />}
      footer={pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button>
          <span className="tabular-nums">{page} / {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Berikutnya</Button>
        </div>
      )}
    >
      {bills.data?.data.map((b) => (
        <tr key={b.id} className="hover:bg-slate-50/60">
          <Td><span className="flex items-center gap-3"><Avatar name={b.user?.name} size={28} /><span className="font-medium">{b.user?.name}</span></span></Td>
          <Td><span className="block">{b.plan.name}</span><span className="text-xs text-slate-500">{b.periodName}</span></Td>
          <Td className="whitespace-nowrap">{fmtDate(b.dueDate).split(",")[0]}</Td>
          <Td className="tabular-nums">{rupiah(b.amount)}</Td>
          <Td><Badge status={b.status} /></Td>
        </tr>
      ))}
    </Table>
  );
}

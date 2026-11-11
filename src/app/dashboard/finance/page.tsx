"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, ArrowDownLeft, ArrowUpRight, Banknote, Check, CircleDollarSign, Copy, Download, FileCheck2, FileText, Inbox, Landmark,
  Plus, Receipt, Search, Wallet, X,
} from "lucide-react";
import { AuthImage } from "@/components/auth-image";
import { FilePick } from "@/components/file-pick";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import {
  Avatar, Badge, Button, Card, CardHeader, cx, EmptyState, ErrorText, Field, Input, PageHeader, Select, Skeleton, StatCard, Switch, Table, Tabs, Td,
} from "@/components/ui";
import { api, apiPage, download, openFile, uploadFile } from "@/lib/api";
import { fmtDate, initialTab, rupiah, toLocalInput } from "@/lib/format";
import type { BankAccount, Bill, Division, Payment } from "@/lib/types";
import { useMe } from "@/lib/use-me";

const TABS = ["mine", "summary", "verify", "bills", "cash", "settings"] as const;
type Tab = (typeof TABS)[number];

export default function FinancePage() {
  const { can } = useMe();
  const read = can("finance.read");
  const manage = can("finance.manage");
  const [tab, setTab] = useState<Tab>("mine");
  useEffect(() => setTab(initialTab(TABS, read ? "summary" : "mine")), [read]);
  const pending = useQuery({ queryKey: ["payments", "PENDING"], queryFn: () => apiPage<Payment[]>("/payments?status=PENDING&limit=50"), enabled: manage });

  const items: { value: Tab; label: string; count?: number }[] = [
    ...(read ? [{ value: "summary" as const, label: "Ringkasan" }] : []),
    ...(manage ? [{ value: "verify" as const, label: "Verifikasi", count: pending.data?.meta.total || undefined }] : []),
    ...(read ? [{ value: "bills" as const, label: "Tagihan anggota" }, { value: "cash" as const, label: "Buku kas" }] : []),
    { value: "mine", label: "Tagihan saya" },
    ...(manage ? [{ value: "settings" as const, label: "Pengaturan" }] : []),
  ];

  return (
    <>
      <PageHeader title="Uang kas" desc={read ? "Iuran anggota, verifikasi bukti bayar, dan buku kas organisasi." : "Tagihan kas Anda dan cara membayarnya."} />
      {items.length > 1 && <div className="mb-6 overflow-x-auto"><Tabs value={tab} onChange={setTab} items={items} /></div>}
      {tab === "mine" && <MyBills />}
      {tab === "summary" && read && <Summary onGo={setTab} />}
      {tab === "verify" && manage && <VerifyQueue />}
      {tab === "bills" && read && <BillsTable />}
      {tab === "cash" && read && <CashBook manage={manage} />}
      {tab === "settings" && manage && <Settings />}
    </>
  );
}

// ───────────── Anggota: tagihan & bayar ─────────────

function MyBills() {
  const bills = useQuery({ queryKey: ["bills-me"], queryFn: () => api<Bill[]>("/bills/me") });
  const payments = useQuery({ queryKey: ["payments", "mine"], queryFn: () => apiPage<Payment[]>("/payments?mine=1&limit=20") });
  const [paying, setPaying] = useState(false);
  const open = bills.data?.filter((b) => ["UNPAID", "REJECTED", "OVERDUE"].includes(b.status)) ?? [];
  const due = open.reduce((s, b) => s + b.amount, 0);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid min-w-0 grid-cols-1 content-start gap-6">
        <Card className={cx("flex flex-wrap items-center gap-5 p-5", open.length ? "border-amber-200" : "")}>
          <span className={cx("grid size-12 place-items-center rounded-xl", open.length ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700")}>
            {open.length ? <Wallet size={22} aria-hidden /> : <Check size={22} aria-hidden />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-slate-500">{open.length ? `${open.length} tagihan belum dibayar` : "Semua tagihan lunas"}</p>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{rupiah(due)}</p>
          </div>
          {open.length > 0 && <Button size="lg" onClick={() => setPaying(true)}><Banknote size={16} aria-hidden /> Bayar sekarang</Button>}
        </Card>

        <Table
          loading={bills.isLoading}
          head={["Tagihan", "Jatuh tempo", "Nominal", "Status"]}
          empty={bills.data?.length === 0 && <EmptyState icon={Receipt} title="Belum ada tagihan" desc="Tagihan kas muncul otomatis setiap periode." />}
        >
          {bills.data?.map((b) => (
            <tr key={b.id}>
              <Td><span className="block font-medium">{b.plan.name}</span><span className="text-xs text-slate-500">{b.periodName}</span></Td>
              <Td className={cx("whitespace-nowrap", b.status === "OVERDUE" && "font-medium text-red-600")}>{fmtDate(b.dueDate).split(",")[0]}</Td>
              <Td className="font-medium tabular-nums">{rupiah(b.amount)}</Td>
              <Td><Badge status={b.status} /></Td>
            </tr>
          ))}
        </Table>
      </div>

      <Card className="self-start">
        <CardHeader title="Riwayat pembayaran" />
        <ul className="divide-y divide-slate-100">
          {payments.data?.data.length === 0 && <li className="px-5 py-8 text-center text-[13px] text-slate-500">Belum ada pembayaran.</li>}
          {payments.data?.data.map((p) => (
            <li key={p.id} className="px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium tabular-nums">{rupiah(p.amount)}</span>
                <Badge status={p.status} />
              </div>
              <p className="mt-0.5 text-xs text-slate-500">{p.bills.map((b) => b.periodName).join(", ")} · {fmtDate(p.createdAt)}</p>
              {p.status === "REJECTED" && <p className="mt-1 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">Ditolak: {p.rejectReason}</p>}
              {p.status === "VERIFIED" && <Link href={`/dashboard/finance/receipt/${p.id}`} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><FileText size={12} aria-hidden /> Kwitansi</Link>}
            </li>
          ))}
        </ul>
      </Card>

      <PayDialog open={paying} onClose={() => setPaying(false)} bills={open} />
    </div>
  );
}

function PayDialog({ open, onClose, bills }: { open: boolean; onClose: () => void; bills: Bill[] }) {
  const qc = useQueryClient();
  const toast = useToast();
  const accounts = useQuery({ queryKey: ["bank-accounts"], queryFn: () => api<BankAccount[]>("/bank-accounts"), enabled: open });
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
      toast("Bukti terkirim. Bendahara akan memverifikasi.");
      onClose();
    },
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="sheet"
      title="Bayar kas"
      desc="Transfer ke rekening di bawah, lalu upload buktinya."
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
          {accounts.data?.length === 0 && <p className="text-[13px] text-slate-500">Bendahara belum mengisi rekening tujuan.</p>}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nominal ditransfer"><Input name="amount" type="number" required min={total} key={total} defaultValue={total} /></Field>
            <Field label="Tanggal transfer"><Input name="transferDate" type="datetime-local" required defaultValue={toLocalInput(new Date())} /></Field>
          </div>
          <FilePick file={file} onChange={setFile} accept="image/jpeg,image/png,image/webp,application/pdf" label="Foto atau PDF bukti transfer (maks 5 MB)" />
        </section>
        <ErrorText error={pay.error} />
      </form>
    </Dialog>
  );
}

// ───────────── Bendahara ─────────────

type Summary = { balance: number; monthIn: number; monthOut: number; pendingPayments: number; overdue: { count: number; amount: number }; outstanding: number; months: { month: string; in: number; out: number }[] };

function Summary({ onGo }: { onGo: (t: Tab) => void }) {
  const q = useQuery({ queryKey: ["finance-summary"], queryFn: () => api<Summary>("/finance/summary") });
  const s = q.data;
  const max = Math.max(1, ...(s?.months.flatMap((m) => [m.in, m.out]) ?? [1]));
  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Saldo kas" value={s ? rupiah(s.balance) : "–"} icon={Wallet} loading={q.isLoading} />
        <StatCard label="Masuk bulan ini" value={s ? rupiah(s.monthIn) : "–"} icon={ArrowDownLeft} tone="green" loading={q.isLoading} hint={s ? `Keluar ${rupiah(s.monthOut)}` : undefined} />
        <StatCard label="Menunggu verifikasi" value={s?.pendingPayments ?? 0} icon={Inbox} tone="amber" loading={q.isLoading} hint={<button className="text-primary hover:underline" onClick={() => onGo("verify")}>Buka antrean</button>} />
        <StatCard label="Menunggak" value={s?.overdue.count ?? 0} icon={AlertTriangle} tone={s?.overdue.count ? "red" : "slate"} loading={q.isLoading} hint={s ? `${rupiah(s.overdue.amount)} · total belum lunas ${rupiah(s.outstanding)}` : undefined} />
      </div>
      <Card>
        <CardHeader title="Arus kas 6 bulan" desc="Pemasukan dan pengeluaran per bulan" action={
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" /> Masuk</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-slate-300" /> Keluar</span>
          </div>
        } />
        <div className="flex h-56 items-end gap-3 px-5 pt-6 pb-4 sm:gap-6">
          {s?.months.map((m) => (
            <div key={m.month} className="flex h-full flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end justify-center gap-1">
                <div className="w-full max-w-6 rounded-t-md bg-primary transition-all" style={{ height: `${(m.in / max) * 100}%` }} title={`Masuk ${rupiah(m.in)}`} />
                <div className="w-full max-w-6 rounded-t-md bg-slate-300 transition-all" style={{ height: `${(m.out / max) * 100}%` }} title={`Keluar ${rupiah(m.out)}`} />
              </div>
              <span className="text-xs text-slate-500">{m.month}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function VerifyQueue() {
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ["payments", "PENDING"], queryFn: () => apiPage<Payment[]>("/payments?status=PENDING&limit=50") });
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

  if (q.isLoading) return <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-72 rounded-xl" />)}</div>;
  if (!q.data?.data.length) return <Card><EmptyState icon={FileCheck2} title="Antrean kosong" desc="Semua bukti bayar sudah diproses." /></Card>;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
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

function BillsTable() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), limit: "25", ...(status && { status }), ...(q && { q }) });
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
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => download("/finance/report/export", "laporan-keuangan.xlsx")}><Download size={14} aria-hidden /> Laporan Excel</Button>
        </>
      }
      head={["Anggota", "Tagihan", "Jatuh tempo", "Nominal", "Status"]}
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

type Cash = { id: string; type: "IN" | "OUT"; category: string; amount: number; date: string; description: string | null; attachmentUrl: string | null; refType: string | null };

function CashBook({ manage }: { manage: boolean }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [type, setType] = useState("");
  const [adding, setAdding] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const q = useQuery({ queryKey: ["cash", type], queryFn: () => apiPage<Cash[]>(`/cash-transactions?limit=100${type ? `&type=${type}` : ""}`) });
  const refresh = () => qc.invalidateQueries({ predicate: (x) => ["cash", "finance-summary"].includes(x.queryKey[0] as string) });
  const add = useMutation({
    mutationFn: async (f: Record<string, string>) => {
      const attachmentId = file ? (await uploadFile(file)).id : undefined;
      return api("/cash-transactions", { method: "POST", body: { type: f.type, category: f.category, amount: Number(f.amount), date: new Date(f.date).toISOString(), description: f.description || undefined, attachmentId } });
    },
    onSuccess: () => { refresh(); setAdding(false); setFile(null); toast("Transaksi dicatat"); },
  });
  const del = useMutation({
    mutationFn: (id: string) => api(`/cash-transactions/${id}`, { method: "DELETE" }),
    onSuccess: () => { refresh(); toast("Transaksi dihapus"); },
    onError: (e) => toast(e.message, { error: true }),
  });

  return (
    <>
      <Table
        loading={q.isLoading}
        toolbar={
          <>
            <Select value={type} onChange={(e) => setType(e.target.value)} className="w-full sm:w-40" aria-label="Jenis transaksi">
              <option value="">Semua</option>
              <option value="IN">Pemasukan</option>
              <option value="OUT">Pengeluaran</option>
            </Select>
            {manage && <Button size="sm" className="ml-auto" onClick={() => setAdding(true)}><Plus size={14} aria-hidden /> Catat transaksi</Button>}
          </>
        }
        head={["Tanggal", "Keterangan", "Kategori", "Nominal", ""]}
        empty={q.data?.data.length === 0 && <EmptyState icon={CircleDollarSign} title="Buku kas masih kosong" desc="Pemasukan dari kas anggota tercatat otomatis saat diverifikasi." />}
      >
        {q.data?.data.map((t) => (
          <tr key={t.id} className="group hover:bg-slate-50/60">
            <Td className="whitespace-nowrap text-slate-600">{fmtDate(t.date).split(",")[0]}</Td>
            <Td className="max-w-md">
              <span className="flex items-center gap-2">
                <span className={cx("grid size-7 shrink-0 place-items-center rounded-full", t.type === "IN" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600")}>
                  {t.type === "IN" ? <ArrowDownLeft size={14} aria-hidden /> : <ArrowUpRight size={14} aria-hidden />}
                </span>
                <span className="truncate">{t.description ?? "–"}</span>
              </span>
            </Td>
            <Td className="text-slate-600">{t.category}</Td>
            <Td className={cx("font-medium whitespace-nowrap tabular-nums", t.type === "IN" ? "text-green-700" : "text-slate-900")}>{t.type === "IN" ? "+" : "−"}{rupiah(t.amount)}</Td>
            <Td className="text-right whitespace-nowrap">
              {t.attachmentUrl && <Button variant="ghost" size="sm" onClick={() => openFile(t.attachmentUrl!)}>Nota</Button>}
              {manage && t.refType !== "Payment" && <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => confirm("Hapus transaksi ini?") && del.mutate(t.id)}>Hapus</Button>}
            </Td>
          </tr>
        ))}
      </Table>
      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Catat transaksi"
        desc="Donasi, sponsor, konsumsi, sewa, dan lainnya."
        footer={<><Button variant="ghost" onClick={() => setAdding(false)}>Batal</Button><Button type="submit" form="cash-form" loading={add.isPending}>Simpan</Button></>}
      >
        <form id="cash-form" className="grid gap-4" onSubmit={(e) => { e.preventDefault(); add.mutate(Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jenis"><Select name="type" defaultValue="OUT"><option value="OUT">Pengeluaran</option><option value="IN">Pemasukan</option></Select></Field>
            <Field label="Kategori"><Input name="category" required list="cash-cats" placeholder="Konsumsi" /></Field>
            <datalist id="cash-cats">{["Konsumsi", "Transportasi", "Perlengkapan", "Sewa", "Donasi", "Sponsor", "Lainnya"].map((c) => <option key={c} value={c} />)}</datalist>
            <Field label="Nominal (Rp)"><Input name="amount" type="number" required min={1} /></Field>
            <Field label="Tanggal"><Input name="date" type="datetime-local" required defaultValue={toLocalInput(new Date())} /></Field>
          </div>
          <Field label="Keterangan"><Input name="description" placeholder="Snack rapat pleno November" /></Field>
          <FilePick file={file} onChange={setFile} accept="image/jpeg,image/png,image/webp,application/pdf" label="Nota / kuitansi (opsional)" />
          <ErrorText error={add.error} />
        </form>
      </Dialog>
    </>
  );
}

type Plan = { id: string; name: string; amount: number; frequency: "MONTHLY" | "SEMESTER" | "ONCE"; dueDay: number | null; dueDate: string | null; scope: string; isActive: boolean; division: { name: string } | null; bills: { total: number; paid: number; pending: number; overdue: number } };
const FREQ = { MONTHLY: "Bulanan", SEMESTER: "Per semester", ONCE: "Sekali bayar" };

function Settings() {
  const qc = useQueryClient();
  const toast = useToast();
  const plans = useQuery({ queryKey: ["dues-plans"], queryFn: () => api<Plan[]>("/dues-plans") });
  const accounts = useQuery({ queryKey: ["bank-accounts"], queryFn: () => api<BankAccount[]>("/bank-accounts") });
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

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <Card>
        <CardHeader title="Rencana iuran" desc="Tagihan dibuat otomatis tiap periode untuk peserta." action={<Button size="sm" onClick={() => setNewPlan(true)}><Plus size={14} aria-hidden /> Iuran baru</Button>} />
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
        <CardHeader title="Rekening tujuan" desc="Tampil ke anggota saat membayar." action={<Button size="sm" variant="outline" onClick={() => setAccount("new")}><Plus size={14} aria-hidden /> Tambah</Button>} />
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
      <PlanDialog open={newPlan} onClose={() => setNewPlan(false)} />
      <AccountDialog target={account} onClose={() => setAccount(null)} />
    </div>
  );
}

function PlanDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [freq, setFreq] = useState<"MONTHLY" | "SEMESTER" | "ONCE">("MONTHLY");
  const [scope, setScope] = useState<"ALL" | "DIVISION">("ALL");
  const divisions = useQuery({ queryKey: ["divisions"], queryFn: () => api<Division[]>("/divisions"), enabled: open });
  const save = useMutation({
    mutationFn: (f: Record<string, string>) =>
      api<{ generated: number }>("/dues-plans", {
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
        <div><Tabs value={scope} onChange={setScope} items={[{ value: "ALL", label: "Semua anggota" }, { value: "DIVISION", label: "Satu divisi" }]} /></div>
        {scope === "DIVISION" && (
          <Field label="Divisi"><Select name="divisionId" required><option value="">Pilih divisi</option>{divisions.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
        )}
        <ErrorText error={save.error} />
      </form>
    </Dialog>
  );
}

function AccountDialog({ target, onClose }: { target: BankAccount | "new" | null; onClose: () => void }) {
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
      return a ? api(`/bank-accounts/${a.id}`, { method: "PATCH", body }) : api("/bank-accounts", { method: "POST", body });
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

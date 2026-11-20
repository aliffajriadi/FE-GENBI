"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, Plus } from "lucide-react";
import { FilePick } from "@/components/file-pick";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { Button, cx, EmptyState, ErrorText, Field, Input, Select, Table, Td } from "@/components/ui";
import { api, apiPage, openFile, uploadFile } from "@/lib/api";
import { fmtDate, rupiah, toLocalInput } from "@/lib/format";
import { type Cash, withKas } from "../_lib";

export function CashBook({ kas, manage }: { kas: string; manage: boolean }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [type, setType] = useState("");
  const [adding, setAdding] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const q = useQuery({ queryKey: ["cash", kas, type], queryFn: () => apiPage<Cash[]>(withKas(`/cash-transactions?limit=100${type ? `&type=${type}` : ""}`, kas)) });
  const refresh = () => qc.invalidateQueries({ predicate: (x) => ["cash", "finance-summary"].includes(x.queryKey[0] as string) });
  const add = useMutation({
    mutationFn: async (f: Record<string, string>) => {
      const attachmentId = file ? (await uploadFile(file)).id : undefined;
      return api(withKas("/cash-transactions", kas), { method: "POST", body: { type: f.type, category: f.category, amount: Number(f.amount), date: new Date(f.date).toISOString(), description: f.description || undefined, attachmentId } });
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
        hideOnMobile={[2]} head={["Tanggal", "Keterangan", "Kategori", "Nominal", ""]}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

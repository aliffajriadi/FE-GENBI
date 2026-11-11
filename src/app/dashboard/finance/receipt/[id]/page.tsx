"use client";
import Link from "next/link";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { Button, Card, ErrorText, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { fmtDate, rupiah } from "@/lib/format";
import type { Payment } from "@/lib/types";
import { useMe } from "@/lib/use-me";

// Kwitansi digital; "Cetak" → simpan sebagai PDF dari dialog print browser.
export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: me } = useMe();
  const q = useQuery({ queryKey: ["payment", id], queryFn: () => api<Payment>(`/payments/${id}`) });
  if (q.isLoading) return <Skeleton className="mx-auto h-96 max-w-xl" />;
  if (!q.data) return <ErrorText error={q.error} />;
  const p = q.data;
  if (p.status !== "VERIFIED") return <ErrorText error="Kwitansi tersedia setelah pembayaran diverifikasi." />;
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/dashboard/finance" className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-900"><ArrowLeft size={15} aria-hidden /> Uang kas</Link>
        <Button variant="outline" onClick={() => window.print()}><Printer size={15} aria-hidden /> Cetak / PDF</Button>
      </div>
      <Card className="p-8 print:border-0 print:shadow-none">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="" width={40} height={40} className="size-10" />
            <div><p className="font-semibold">GenBI</p><p className="text-xs text-slate-500">{p.treasuryDivisionId ? `Kwitansi kas divisi${me?.division?.id === p.treasuryDivisionId ? ` ${me.division.name}` : ""}` : "Kwitansi uang kas"}</p></div>
          </div>
          <p className="text-right text-xs text-slate-500">No. {p.id.slice(-8).toUpperCase()}<br />{fmtDate(p.updatedAt)}</p>
        </div>
        <dl className="mt-8 grid gap-3 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Diterima dari</dt><dd className="font-medium">{p.user.name}{p.user.nim ? ` (${p.user.nim})` : ""}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Tanggal transfer</dt><dd>{fmtDate(p.transferDate)}</dd></div>
        </dl>
        <table className="mt-6 w-full text-sm">
          <thead><tr className="border-b border-slate-200 text-left text-xs text-slate-500"><th className="py-2 font-medium">Untuk pembayaran</th><th className="py-2 text-right font-medium">Nominal</th></tr></thead>
          <tbody>
            {p.bills.map((b) => <tr key={b.id} className="border-b border-slate-100"><td className="py-2.5">{b.plan.name} · {b.periodName}</td><td className="py-2.5 text-right tabular-nums">{rupiah(b.amount)}</td></tr>)}
          </tbody>
          <tfoot><tr><td className="pt-3 font-semibold">Total dibayar</td><td className="pt-3 text-right text-lg font-semibold tabular-nums">{rupiah(p.amount)}</td></tr></tfoot>
        </table>
        <div className="mt-10 flex items-end justify-between text-sm">
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-600/15">LUNAS</span>
          <div className="text-right"><p className="text-xs text-slate-500">Diverifikasi oleh</p><p className="mt-6 font-medium">{p.verifiedBy?.name}</p><p className="text-xs text-slate-500">Bendahara</p></div>
        </div>
      </Card>
    </div>
  );
}

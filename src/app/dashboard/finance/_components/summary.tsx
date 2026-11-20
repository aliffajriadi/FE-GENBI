"use client";
import { useQuery } from "@tanstack/react-query";
import {
    AlertTriangle, ArrowDownLeft, Inbox, Wallet
} from "lucide-react";
import { Card, CardHeader, StatCard } from "@/components/ui";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/format";
import { type Tab, withKas } from "../_lib";

// ───────────── Bendahara ─────────────

export type Summary = { balance: number; monthIn: number; monthOut: number; pendingPayments: number; overdue: { count: number; amount: number }; outstanding: number; months: { month: string; in: number; out: number }[] };

export function Summary({ kas, onGo }: { kas: string; onGo: (t: Tab) => void }) {
  const q = useQuery({ queryKey: ["finance-summary", kas], queryFn: () => api<Summary>(withKas("/finance/summary", kas)) });
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

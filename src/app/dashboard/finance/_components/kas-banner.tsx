"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Inbox, Landmark, UserCog, Users } from "lucide-react";
import { Button, Card, cx, Select, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/format";
import { useMe } from "@/lib/use-me";
import { type KasOption, type Tab, withKas } from "../_lib";
import { type Summary } from "./summary";

// Kepala bagian "Kelola kas": kas mana yang sedang dibuka, saldo, siapa pengelolanya, dan pindah kas.
export function KasBanner({ kas, option, options, onChange, onGo }: { kas: string; option: KasOption; options: KasOption[]; onChange: (v: string) => void; onGo: (t: Tab) => void }) {
  const { data: me } = useMe();
  const s = useQuery({ queryKey: ["finance-summary", kas], queryFn: () => api<Summary>(withKas("/finance/summary", kas)) });
  const isDivision = kas !== "org";
  return (
    <Card className="mb-5 overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 p-5">
        <span className={cx("grid size-12 shrink-0 place-items-center rounded-xl", isDivision ? "bg-amber-50 text-amber-700" : "bg-accent text-primary")}>
          {isDivision ? <Users size={22} aria-hidden /> : <Landmark size={22} aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-slate-500">{option.label}</p>
          <div className="text-2xl font-semibold tracking-tight tabular-nums">{s.data ? rupiah(s.data.balance) : <Skeleton className="h-8 w-32" />}</div>
          <p className="mt-0.5 text-xs text-slate-500">
            Saldo saat ini · {isDivision ? "dikelola Kepala Divisi & anggota yang diberi akses" : "dikelola Bendahara"}
            {!option.manage && " · Anda hanya bisa melihat"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {options.length > 1 && (
            <Select value={kas} onChange={(e) => onChange(e.target.value)} aria-label="Pilih kas" className="w-auto">
              {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          )}
          {!!s.data?.pendingPayments && option.manage && (
            <Button size="sm" onClick={() => onGo("verify")}><Inbox size={14} aria-hidden /> {s.data.pendingPayments} bukti menunggu</Button>
          )}
        </div>
      </div>
      {isDivision && me?.role === "KADIV" && (
        <Link href="/dashboard/division" className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-2.5 text-[13px] text-slate-600 hover:text-primary">
          <UserCog size={15} aria-hidden /> Tunjuk anggota sebagai bendahara divisi (akses <b className="font-medium">Kas divisi</b>) di Kelola divisi
          <ArrowRight size={14} className="ml-auto" aria-hidden />
        </Link>
      )}
    </Card>
  );
}

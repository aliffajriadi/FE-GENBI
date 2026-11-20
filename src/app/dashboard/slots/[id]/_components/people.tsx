"use client";
import { useMemo, useState } from "react";
import { Download, Search, X } from "lucide-react";
import { Avatar, Button, Card, cx, EmptyState, Input } from "@/components/ui";
import { answerText } from "@/lib/forms";
import { GROUP_TONES } from "@/lib/slots";
import { type Entry, type List, timeFmt } from "../_lib";

// Tab Peserta: filter per pilihan, cari nama, jawaban per orang.
export function People({ list, onKick, onExport }: { list: List; onKick: (e: Entry) => void; onExport: () => void }) {
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const qs = list.questions ?? [];
  const rows = useMemo(
    () => list.groups.flatMap((g, gi) => g.entries.map((e) => ({ e, g, gi })))
      .filter((r) => (filter === "all" || r.g.id === filter) && (!q || r.e.user.name.toLowerCase().includes(q.toLowerCase())))
      .sort((a, b) => b.e.createdAt.localeCompare(a.e.createdAt)),
    [list, filter, q],
  );
  const total = list.groups.reduce((n, g) => n + g.entries.length, 0);
  if (!total) return <EmptyState icon={Search} title="Belum ada peserta" desc="Bagikan link halaman; yang memilih akan muncul di sini." />;
  const chip = (on: boolean) => cx("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-medium transition", on ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300");

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setFilter("all")} className={chip(filter === "all")}>Semua <span className="tabular-nums opacity-80">{total}</span></button>
        {list.groups.map((g, gi) => (
          <button key={g.id} onClick={() => setFilter(g.id)} className={chip(filter === g.id)}>
            <span className={cx("size-2 rounded-full", filter === g.id ? "bg-white" : GROUP_TONES[gi % GROUP_TONES.length].bar)} aria-hidden />{g.name} <span className="tabular-nums opacity-80">{g.entries.length}</span>
          </button>
        ))}
        <span className="ml-auto flex gap-2">
          <Input icon={Search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama…" aria-label="Cari peserta" className="w-44" />
          <Button variant="outline" onClick={onExport}><Download size={14} aria-hidden /> CSV</Button>
        </span>
      </div>
      <Card className="divide-y divide-slate-100 p-0">
        {rows.map(({ e, g, gi }) => (
          <div key={e.id} className="group flex gap-3 px-4 py-3">
            <Avatar name={e.user.name} src={e.user.avatarUrl} size={36} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 text-[14px]">
                <b className="font-medium text-slate-900">{e.user.name}</b>
                <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", GROUP_TONES[gi % GROUP_TONES.length].soft)}>{g.name}</span>
                <span className="text-xs text-slate-400">{timeFmt.format(new Date(e.createdAt))}</span>
              </p>
              {qs.length > 0 && (
                <dl className="mt-1.5 grid gap-x-4 gap-y-1 text-[13px] sm:grid-cols-[auto_minmax(0,1fr)]">
                  {qs.map((x) => (
                    <div key={x.id} className="contents">
                      <dt className="text-slate-400">{x.label}</dt>
                      <dd className="break-words whitespace-pre-wrap text-slate-700">{answerText(e.answers?.[x.id]) || <span className="text-slate-300">–</span>}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
            <button onClick={() => onKick(e)} className="h-fit rounded-md p-1.5 text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-slate-100 hover:text-red-600 focus:opacity-100" aria-label={`Keluarkan ${e.user.name}`}><X size={15} /></button>
          </div>
        ))}
        {!rows.length && <p className="px-4 py-6 text-center text-[13px] text-slate-400">Tidak ada yang cocok.</p>}
      </Card>
    </div>
  );
}

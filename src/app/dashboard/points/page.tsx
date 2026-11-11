"use client";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, CalendarCheck, Crown, Newspaper, PenLine, Plus, Sparkles, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { Avatar, Button, Card, CardHeader, cx, EmptyState, ErrorText, Field, Input, PageHeader, Select, Skeleton, Tabs, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import type { Division, Ledger } from "@/lib/types";
import { useMe } from "@/lib/use-me";

type Board = { rank: number; userId: string; name: string; avatarUrl: string | null; division: string | null; points: number }[];
type Rule = { key: string; label: string; points: number; trigger: string; isActive: boolean };

const RANGES: Record<string, () => string> = {
  periode: () => "",
  semester: () => {
    const d = new Date();
    return `from=${new Date(d.getFullYear(), d.getMonth() < 6 ? 0 : 6, 1).toISOString()}`;
  },
  bulan: () => {
    const d = new Date();
    return `from=${new Date(d.getFullYear(), d.getMonth(), 1).toISOString()}`;
  },
};
// Asal poin: label, ikon, dan warna (dipakai di rincian & riwayat).
const SOURCE: Record<string, { label: string; icon: LucideIcon; bar: string; chip: string }> = {
  ATTENDANCE: { label: "Absensi", icon: CalendarCheck, bar: "bg-blue-500", chip: "bg-blue-50 text-blue-700" },
  ARTICLE: { label: "Artikel", icon: Newspaper, bar: "bg-violet-500", chip: "bg-violet-50 text-violet-700" },
  KAS: { label: "Kas", icon: Wallet, bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700" },
  MANUAL: { label: "Kontribusi", icon: PenLine, bar: "bg-amber-500", chip: "bg-amber-50 text-amber-700" },
};
// Warna podium: emas, perak, perunggu.
const PODIUM = [
  { ring: "ring-amber-400", badge: "bg-amber-400 text-white", block: "h-28 bg-gradient-to-b from-amber-100 to-amber-50", label: "1" },
  { ring: "ring-slate-300", badge: "bg-slate-400 text-white", block: "h-20 bg-gradient-to-b from-slate-100 to-slate-50", label: "2" },
  { ring: "ring-orange-300", badge: "bg-orange-400 text-white", block: "h-14 bg-gradient-to-b from-orange-100 to-orange-50", label: "3" },
];

export default function PointsPage() {
  const { me, can } = useMe();
  const [range, setRange] = useState("periode");
  const [divisionId, setDivisionId] = useState("");
  const [adjust, setAdjust] = useState(false);
  const qs = [RANGES[range](), divisionId && `divisionId=${divisionId}`].filter(Boolean).join("&");
  const board = useQuery({ queryKey: ["leaderboard", qs], queryFn: () => api<Board>(`/points/leaderboard${qs ? `?${qs}` : ""}`) });
  const mine = useQuery({ queryKey: ["points-me"], queryFn: () => api<{ total: number; history: Ledger[] }>("/points/me") });
  const divisions = useQuery({ queryKey: ["divisions"], queryFn: () => api<Division[]>("/divisions") });
  const rules = useQuery({ queryKey: ["point-rules"], queryFn: () => api<Rule[]>("/point-rules") });
  const rows = board.data ?? [];
  const top = rows.slice(0, 3);
  const myRow = rows.find((r) => r.userId === me?.id);
  const above = myRow && myRow.rank > 1 ? rows[myRow.rank - 2] : null;
  const maxPts = Math.max(1, ...rows.map((r) => r.points));

  // Rincian poin saya per asal (periode berjalan).
  const history = mine.data?.history ?? [];
  const bySource = Object.keys(SOURCE).map((k) => ({ k, pts: history.filter((h) => h.sourceType === k).reduce((a, h) => a + h.points, 0) })).filter((x) => x.pts > 0);
  const positive = bySource.reduce((a, x) => a + x.pts, 0);

  return (
    <>
      <PageHeader
        title="Poin keaktifan"
        desc="Poin didapat dari hadir rapat, menulis artikel, bayar kas tepat waktu, dan kontribusi lain. Semua tercatat beserta asalnya."
        actions={can("points.adjust") && <Button onClick={() => setAdjust(true)}><Plus size={16} aria-hidden /> Beri poin</Button>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
        {/* Poin saya */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary to-[#0b2c63] p-5 text-white sm:p-6">
          <Sparkles size={90} className="absolute -top-4 -right-4 text-white/10" aria-hidden />
          <p className="text-[13px] text-white/80">Poin saya · kepengurusan ini</p>
          {mine.isLoading ? <Skeleton className="mt-2 h-12 w-28 bg-white/10" /> : <p className="mt-1 text-5xl font-semibold tracking-tight tabular-nums">{mine.data?.total ?? 0}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 font-medium"><Award size={14} aria-hidden />{myRow ? `Peringkat #${myRow.rank} dari ${rows.length}` : "Belum masuk peringkat"}</span>
            {above && myRow && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-white/80"><TrendingUp size={14} aria-hidden />{above.points - myRow.points + 1} poin lagi ke #{above.rank}</span>}
          </div>
          {positive > 0 && (
            <div className="mt-5">
              <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-white/10">
                {bySource.map((x) => <div key={x.k} className={SOURCE[x.k].bar} style={{ width: `${(x.pts / positive) * 100}%` }} title={`${SOURCE[x.k].label}: ${x.pts}`} />)}
              </div>
              <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/80">
                {bySource.map((x) => <li key={x.k} className="flex items-center gap-1.5"><span className={cx("size-2 rounded-full", SOURCE[x.k].bar)} />{SOURCE[x.k].label} <b className="text-white tabular-nums">{x.pts}</b></li>)}
              </ul>
            </div>
          )}
        </Card>

        {/* Podium 3 besar */}
        <Card className="p-4 sm:p-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[15px] font-semibold">3 besar</p>
            <Tabs value={range} onChange={setRange} items={[{ value: "periode", label: "Kepengurusan" }, { value: "semester", label: "Semester" }, { value: "bulan", label: "Bulan ini" }]} />
          </div>
          {board.isLoading ? <Skeleton className="h-48" /> : top.length === 0 ? (
            <EmptyState icon={Award} title="Belum ada poin" desc="Poin muncul setelah absensi ditutup atau pengurus memberi poin." />
          ) : (
            <div className="grid grid-cols-3 items-end gap-2 pt-7 sm:gap-4">
              {[1, 0, 2].map((i) => {
                const r = top[i];
                if (!r) return <div key={i} />;
                const st = PODIUM[i];
                return (
                  <div key={r.userId} className="flex min-w-0 flex-col items-center text-center">
                    <div className="relative">
                      {i === 0 && <Crown size={22} className="absolute -top-6 left-1/2 -translate-x-1/2 text-amber-400" aria-hidden />}
                      <span className={cx("block rounded-full ring-4", st.ring)}><Avatar name={r.name} src={r.avatarUrl} size={i === 0 ? 64 : 52} /></span>
                      <span className={cx("absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-full text-xs font-bold ring-2 ring-white", st.badge)}>{st.label}</span>
                    </div>
                    <Link href={`/dashboard/people/${r.userId}`} className="mt-3 block max-w-full truncate text-[13px] font-semibold hover:text-primary sm:text-sm">{r.name}</Link>
                    <p className="max-w-full truncate text-xs text-slate-500">{r.division ?? "–"}</p>
                    <div className={cx("mt-2 flex w-full flex-col items-center justify-start rounded-t-xl pt-2", st.block)}>
                      <span className="text-lg font-bold text-slate-900 tabular-nums sm:text-xl">{r.points}</span>
                      <span className="text-[11px] text-slate-500">poin</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Peringkat lengkap */}
        <Card className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-4">
            <div className="mr-auto">
              <h2 className="text-[15px] font-semibold">Peringkat lengkap</h2>
              <p className="text-xs text-slate-500">{rows.length} anggota punya poin · {range === "periode" ? "kepengurusan ini" : range === "semester" ? "semester ini" : "bulan ini"}</p>
            </div>
            <Select value={divisionId} onChange={(e) => setDivisionId(e.target.value)} aria-label="Divisi" className="w-full sm:w-48">
              <option value="">Semua divisi</option>
              {divisions.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </div>
          {board.isLoading ? <div className="space-y-2 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div> : rows.length === 0 ? (
            <EmptyState icon={Award} title="Belum ada poin" desc="Coba ganti rentang waktu atau divisi." />
          ) : (
            <ol className="divide-y divide-slate-100">
              {rows.map((r) => {
                const isMe = r.userId === me?.id;
                return (
                  <li key={r.userId} className={cx("flex items-center gap-3 px-4 py-3 sm:px-5", isMe && "bg-accent/60")}>
                    <span className={cx("w-7 shrink-0 text-center text-[13px] font-bold tabular-nums", r.rank === 1 ? "text-amber-500" : r.rank === 2 ? "text-slate-400" : r.rank === 3 ? "text-orange-400" : "text-slate-400")}>{r.rank}</span>
                    <Avatar name={r.name} src={r.avatarUrl} size={34} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/dashboard/people/${r.userId}`} className="block truncate text-[13.5px] font-medium hover:text-primary">
                        {r.name}{isMe && <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">Anda</span>}
                      </Link>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={cx("h-full rounded-full", r.points < 0 ? "bg-red-400" : "bg-primary/70")} style={{ width: `${Math.max(0, (r.points / maxPts) * 100)}%` }} /></div>
                        <span className="hidden max-w-32 truncate text-xs text-slate-500 sm:inline">{r.division ?? "–"}</span>
                      </div>
                    </div>
                    <span className={cx("w-12 shrink-0 text-right text-[15px] font-semibold tabular-nums", r.points < 0 && "text-red-600")}>{r.points}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>

        <div className="grid min-w-0 grid-cols-1 content-start gap-6">
          {/* Riwayat poin saya */}
          <Card>
            <CardHeader title="Riwayat poin saya" desc="Dari mana saja poin Anda berasal" />
            <ul className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
              {history.length === 0 && <li className="px-5 py-8 text-center text-[13px] text-slate-500">Belum ada riwayat poin.</li>}
              {history.map((h) => {
                const src = SOURCE[h.sourceType] ?? SOURCE.MANUAL;
                return (
                  <li key={h.id} className="flex items-center gap-3 px-5 py-3">
                    <span className={cx("grid size-8 shrink-0 place-items-center rounded-lg", src.chip)}><src.icon size={15} aria-hidden /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{h.note}</span>
                      <span className="text-xs text-slate-500">{src.label} · {fmtDate(h.createdAt).split(",")[0]}</span>
                    </span>
                    <span className={cx("rounded-md px-2 py-0.5 text-[13px] font-semibold tabular-nums", h.points < 0 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700")}>{h.points > 0 ? `+${h.points}` : h.points}</span>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Cara mendapat poin */}
          {!!rules.data?.length && (
            <Card>
              <CardHeader title="Cara mendapat poin" desc="Aturan yang berlaku saat ini" action={can("points.rules") && <Link href="/dashboard/point-rules" className="text-[13px] font-medium text-primary hover:underline">Atur</Link>} />
              <ul className="divide-y divide-slate-100">
                {rules.data.filter((r) => r.isActive && r.points !== 0).sort((a, b) => b.points - a.points).map((r) => (
                  <li key={r.key} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[13px]">
                    <span className="text-slate-700">{r.label}</span>
                    <span className={cx("font-semibold tabular-nums", r.points < 0 ? "text-red-600" : "text-green-700")}>{r.points > 0 ? `+${r.points}` : r.points}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <AdjustDialog open={adjust} onClose={() => setAdjust(false)} divisionId={me && !["SYS_ADMIN", "KETUM", "SEKRETARIS"].includes(me.role) ? me.division?.id ?? null : null} />
    </>
  );
}

function AdjustDialog({ open, onClose, divisionId }: { open: boolean; onClose: () => void; divisionId: string | null }) {
  const divisionOnly = !!divisionId;
  const qc = useQueryClient();
  const toast = useToast();
  const users = useQuery({ queryKey: ["members", "picker", divisionId ?? ""], queryFn: () => api<{ id: string; name: string }[]>(`/members?limit=100${divisionId ? `&divisionId=${divisionId}` : ""}`), enabled: open });
  const rules = useQuery({ queryKey: ["point-rules"], queryFn: () => api<Rule[]>("/point-rules"), enabled: open });
  const [points, setPoints] = useState("");
  const save = useMutation({
    mutationFn: (body: unknown) => api("/points/adjust", { method: "POST", body }),
    onSuccess: () => {
      onClose();
      setPoints("");
      qc.invalidateQueries({ predicate: (q) => ["leaderboard", "points-me"].includes(q.queryKey[0] as string) });
      toast("Poin tersimpan dan tercatat di audit log.");
    },
  });
  const manual = rules.data?.filter((r) => r.trigger === "MANUAL" && r.isActive) ?? [];
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Beri atau koreksi poin"
      desc={divisionOnly ? "Hanya untuk anggota divisi Anda." : "Poin negatif untuk koreksi."}
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button type="submit" form="adjust-form" loading={save.isPending}>Simpan</Button></>}
    >
      <form
        id="adjust-form"
        className="grid gap-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          const f = Object.fromEntries(new FormData(ev.currentTarget)) as Record<string, string>;
          save.mutate({ userId: f.userId, ruleKey: f.ruleKey || undefined, points: Number(points), note: f.note });
        }}
      >
        <Field label="Anggota">
          <Select name="userId" required defaultValue="">
            <option value="">Pilih anggota</option>
            {users.data?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <Field label="Aturan">
            <Select name="ruleKey" onChange={(e) => { const r = manual.find((x) => x.key === e.target.value); if (r?.points) setPoints(String(r.points)); }}>
              <option value="">Koreksi bebas</option>
              {manual.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </Select>
          </Field>
          <Field label="Poin"><Input type="number" required value={points} onChange={(e) => setPoints(e.target.value)} /></Field>
        </div>
        <Field label="Alasan" hint="Wajib; terlihat di riwayat poin anggota."><Textarea name="note" required minLength={3} placeholder="Contoh: Panitia seminar literasi keuangan" /></Field>
        <ErrorText error={save.error} />
      </form>
    </Dialog>
  );
}

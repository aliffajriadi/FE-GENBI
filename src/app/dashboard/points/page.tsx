"use client";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Medal, Plus, Trophy } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { Avatar, Button, Card, CardHeader, cx, EmptyState, ErrorText, Field, Input, PageHeader, Select, Skeleton, Table, Td, Textarea } from "@/components/ui";
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
const SOURCE: Record<string, string> = { ATTENDANCE: "Absensi", ARTICLE: "Artikel", KAS: "Kas", MANUAL: "Manual" };

export default function PointsPage() {
  const { me, can } = useMe();
  const [range, setRange] = useState("periode");
  const [divisionId, setDivisionId] = useState("");
  const [adjust, setAdjust] = useState(false);
  const qs = [RANGES[range](), divisionId && `divisionId=${divisionId}`].filter(Boolean).join("&");
  const board = useQuery({ queryKey: ["leaderboard", qs], queryFn: () => api<Board>(`/points/leaderboard${qs ? `?${qs}` : ""}`) });
  const mine = useQuery({ queryKey: ["points-me"], queryFn: () => api<{ total: number; history: Ledger[] }>("/points/me") });
  const divisions = useQuery({ queryKey: ["divisions"], queryFn: () => api<Division[]>("/divisions") });
  const top = board.data?.slice(0, 3) ?? [];
  const myRank = board.data?.find((r) => r.userId === me?.id);

  return (
    <>
      <PageHeader
        title="Poin keaktifan"
        desc="Setiap poin tercatat beserta asalnya, jadi selalu bisa ditelusuri dan dikoreksi."
        actions={can("points.adjust") && <Button onClick={() => setAdjust(true)}><Plus size={16} aria-hidden /> Beri poin</Button>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
        <Card className="bg-primary p-5 text-white">
          <p className="text-[13px] text-blue-200">Poin saya</p>
          {mine.isLoading ? <Skeleton className="mt-2 h-10 w-24 bg-white/10" /> : <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">{mine.data?.total ?? 0}</p>}
          <p className="mt-3 text-[13px] text-blue-200 sm:mt-6">{myRank ? `Peringkat #${myRank.rank} dari ${board.data?.length}` : "Belum masuk leaderboard"}</p>
        </Card>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {board.isLoading
            ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
            : top.map((r, i) => (
                <Card key={r.userId} className={cx("min-w-0 p-3 sm:p-5", i === 0 && "ring-1 ring-blue-200")}>
                  <div className="flex items-center justify-between">
                    <Avatar name={r.name} src={r.avatarUrl} size={36} />
                    {i === 0 ? <Trophy size={20} className="text-primary" aria-label="Peringkat 1" /> : <Medal size={20} className="text-slate-400" aria-label={`Peringkat ${i + 1}`} />}
                  </div>
                  <Link href={`/dashboard/people/${r.userId}`} className="mt-3 block truncate text-[13px] font-medium hover:text-primary sm:mt-4 sm:text-sm">{r.name}</Link>
                  <p className="truncate text-xs text-slate-500">{r.division ?? "–"}</p>
                  <p className="mt-2 text-lg font-semibold tabular-nums sm:text-xl">{r.points} <span className="text-xs font-normal text-slate-500">poin</span></p>
                </Card>
              ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Table
          loading={board.isLoading}
          toolbar={
            <>
              <p className="mr-auto text-[15px] font-semibold">Leaderboard</p>
              <Select value={range} onChange={(e) => setRange(e.target.value)} aria-label="Rentang waktu" className="w-full sm:w-40">
                <option value="periode">Kepengurusan</option>
                <option value="semester">Semester ini</option>
                <option value="bulan">Bulan ini</option>
              </Select>
              <Select value={divisionId} onChange={(e) => setDivisionId(e.target.value)} aria-label="Divisi" className="w-full sm:w-44">
                <option value="">Semua divisi</option>
                {divisions.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </>
          }
          hideOnMobile={[2]} head={["#", "Anggota", "Divisi", "Poin"]}
          empty={board.data?.length === 0 && <EmptyState icon={Award} title="Belum ada poin" desc="Poin muncul setelah absensi ditutup atau pengurus memberi poin." />}
        >
          {board.data?.map((r) => (
            <tr key={r.userId} className={r.userId === me?.id ? "bg-accent/60" : "hover:bg-slate-50/60"}>
              <Td className="w-12 font-semibold text-slate-400 tabular-nums">{r.rank}</Td>
              <Td><span className="flex items-center gap-3"><Avatar name={r.name} src={r.avatarUrl} size={28} /><Link href={`/dashboard/people/${r.userId}`} className="font-medium hover:text-primary">{r.name}{r.userId === me?.id && <span className="ml-2 text-xs font-normal text-primary">Anda</span>}</Link></span></Td>
              <Td className="text-slate-600">{r.division ?? "–"}</Td>
              <Td className="font-semibold tabular-nums">{r.points}</Td>
            </tr>
          ))}
        </Table>

        <Card className="self-start">
          <CardHeader title="Riwayat poin saya" desc="Periode berjalan" />
          <ul className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto">
            {mine.data?.history.length === 0 && <li className="px-5 py-8 text-center text-[13px] text-slate-500">Belum ada riwayat poin.</li>}
            {mine.data?.history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium">{h.note}</span>
                  <span className="text-xs text-slate-500">{SOURCE[h.sourceType]} · {fmtDate(h.createdAt)}</span>
                </span>
                <span className={cx("rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums", h.points < 0 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700")}>{h.points > 0 ? `+${h.points}` : h.points}</span>
              </li>
            ))}
          </ul>
        </Card>
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
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
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

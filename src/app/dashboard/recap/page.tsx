"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpDown, CalendarCheck, CircleAlert, ClipboardList, Search, Users } from "lucide-react";
import { Avatar, Button, EmptyState, Input, PageHeader, Progress, Select, StatCard, Table, Td } from "@/components/ui";
import { api } from "@/lib/api";
import type { Division } from "@/lib/types";
import { useMe } from "@/lib/use-me";

type Row = { userId: string; name: string; nim: string | null; division: string | null; HADIR: number; TELAT: number; IZIN: number; SAKIT: number; ALPA: number; total: number; percent: number | null };

export default function RecapPage() {
  const { me, can } = useMe();
  const [divisionId, setDivisionId] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"name" | "percent">("name");
  const divisions = useQuery({ queryKey: ["divisions"], queryFn: () => api<Division[]>("/divisions"), enabled: can("attendance.read_all") });
  const { data = [], isLoading } = useQuery({
    queryKey: ["recap", divisionId],
    queryFn: () => api<Row[]>(`/attendance/recap${divisionId ? `?divisionId=${divisionId}` : ""}`),
  });

  const withData = data.filter((r) => r.percent != null);
  const avg = withData.length ? Math.round(withData.reduce((s, r) => s + r.percent!, 0) / withData.length) : null;
  const low = withData.filter((r) => r.percent! < 60).length;
  const rows = data
    .filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : (b.percent ?? -1) - (a.percent ?? -1)));

  return (
    <>
      <PageHeader
        title="Rekap absensi"
        desc={`Dari kegiatan yang absensinya sudah ditutup, periode ${me?.period?.name ?? "aktif"}.${me?.role === "KADIV" ? ` Divisi ${me.division?.name}.` : ""}`}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Rata-rata kehadiran" value={avg == null ? "–" : `${avg}%`} icon={CalendarCheck} tone="green" loading={isLoading} />
        <StatCard label="Anggota" value={data.length} icon={Users} tone="slate" loading={isLoading} />
        <StatCard label="Kehadiran di bawah 60%" value={low} icon={CircleAlert} tone={low ? "red" : "slate"} loading={isLoading} hint="Perlu perhatian pengurus" />
      </div>
      <Table
        loading={isLoading}
        toolbar={
          <>
            <Input icon={Search} placeholder="Cari anggota…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-60" aria-label="Cari anggota" />
            {can("attendance.read_all") && (
              <Select value={divisionId} onChange={(e) => setDivisionId(e.target.value)} aria-label="Filter divisi" className="w-full sm:w-48">
                <option value="">Semua divisi</option>
                {divisions.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            )}
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSort((s) => (s === "name" ? "percent" : "name"))}>
              <ArrowUpDown size={14} aria-hidden /> Urut: {sort === "name" ? "nama" : "kehadiran"}
            </Button>
          </>
        }
        head={["Anggota", "Divisi", "Hadir", "Telat", "Izin/Sakit", "Alpa", "Kehadiran"]}
        empty={rows.length === 0 && <EmptyState icon={ClipboardList} title="Belum ada data rekap" desc="Rekap terisi setelah absensi kegiatan ditutup." />}
      >
        {rows.map((r) => (
          <tr key={r.userId} className="hover:bg-slate-50/60">
            <Td>
              <span className="flex items-center gap-3">
                <Avatar name={r.name} size={30} />
                <span><span className="block font-medium">{r.name}</span>{r.nim && <span className="text-xs text-slate-500">{r.nim}</span>}</span>
              </span>
            </Td>
            <Td className="text-slate-600">{r.division ?? "–"}</Td>
            <Td className="tabular-nums">{r.HADIR}</Td>
            <Td className="tabular-nums">{r.TELAT}</Td>
            <Td className="tabular-nums">{r.IZIN + r.SAKIT}</Td>
            <Td className={`tabular-nums ${r.ALPA ? "font-medium text-red-600" : ""}`}>{r.ALPA}</Td>
            <Td className="w-full sm:w-48">
              {r.percent == null ? <span className="text-slate-400">–</span> : (
                <span className="flex items-center gap-3">
                  <Progress value={r.percent} tone={r.percent >= 80 ? "green" : r.percent >= 60 ? "amber" : "red"} className="w-24" />
                  <span className="text-[13px] font-medium tabular-nums">{r.percent}%</span>
                </span>
              )}
            </Td>
          </tr>
        ))}
      </Table>
    </>
  );
}

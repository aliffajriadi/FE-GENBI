"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ArrowUpRight, CalendarCheck, CalendarX2, CheckSquare, Clock, Inbox, Landmark, MapPin, Radio, ScanLine, Trophy, Users, Wallet } from "lucide-react";
import { AttendanceMix, AttendanceTrend, PointsGrowth, type TrendPoint } from "@/components/dashboard-charts";
import { Avatar, Badge, Button, Card, CardHeader, DateTile, EmptyState, PageHeader, Skeleton, StatCard } from "@/components/ui";
import { api } from "@/lib/api";
import { EVENT_TYPE_LABEL, fmtTime, greeting, rupiah } from "@/lib/format";
import type { EventItem, Ledger } from "@/lib/types";
import { useMe } from "@/lib/use-me";

type Dash = {
  upcomingEvents: EventItem[];
  points: { total: number; rank: number | null; of: number };
  openEvents: { id: string; title: string }[];
  pendingLeaves: number;
  activeUsers: number | null;
  bills: { count: number; amount: number };
  tasks: { id: string; title: string; dueDate: string | null; minute: { event: { title: string } } }[];
  pendingPayments: number | null;
  attendanceTrend?: TrendPoint[]; // opsional: backend versi lama belum mengirimnya
};
type Indicators = { updatedAt: string; source: string; items: { key: string; label: string; value: string; period: string | null }[] };
type Board = { rank: number; userId: string; name: string; avatarUrl: string | null; division: string | null; points: number }[];
type AttMe = { id: string; status: string }[];

export default function DashboardPage() {
  const { me, can } = useMe();
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => api<Dash>("/dashboard") });
  const board = useQuery({ queryKey: ["leaderboard", ""], queryFn: () => api<Board>("/points/leaderboard") });
  const mine = useQuery({ queryKey: ["points-me"], queryFn: () => api<{ total: number; history: Ledger[] }>("/points/me") });
  const att = useQuery({ queryKey: ["attendance-me"], queryFn: () => api<AttMe>("/attendance/me") });
  const bi = useQuery({ queryKey: ["bi-indicators"], queryFn: () => api<Indicators>("/public/bi-indicators"), staleTime: 30 * 60_000 });
  const d = dash.data;

  const attended = att.data?.filter((a) => a.status === "HADIR" || a.status === "TELAT").length ?? 0;
  const mix = { hadir: 0, telat: 0, izin: 0, alpa: 0 };
  for (const a of att.data ?? []) {
    if (a.status === "HADIR") mix.hadir++;
    else if (a.status === "TELAT") mix.telat++;
    else if (a.status === "ALPA") mix.alpa++;
    else mix.izin++;
  }
  const rate = att.data?.length ? Math.round((attended / att.data.length) * 100) : null;
  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta" });

  return (
    <>
      <PageHeader
        eyebrow={today}
        title={me ? `${greeting()}, ${me.name.split(" ")[0]}` : <Skeleton className="h-8 w-56" />}
        desc={me ? `${me.position ?? me.roleName}${me.division ? ` · ${me.division.name}` : ""}` : undefined}
        actions={<Link href="/dashboard/scan" className="hidden lg:block"><Button><ScanLine size={16} aria-hidden /> Scan absensi</Button></Link>}
      />

      {!!d?.openEvents.length && (
        <Card className="mb-6 flex flex-wrap items-center gap-4 border-green-200 bg-green-50/60 px-5 py-4">
          <span className="relative grid size-9 place-items-center rounded-full bg-green-100 text-green-700">
            <Radio size={18} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-green-900">Absensi sedang dibuka</p>
            <p className="truncate text-[13px] text-green-800/80">{d.openEvents.map((e) => e.title).join(" · ")}</p>
          </div>
          <Link href={`/dashboard/events/${d.openEvents[0].id}`}>
            <Button variant="outline" size="sm">Kelola <ArrowRight size={14} aria-hidden /></Button>
          </Link>
        </Card>
      )}

      {(!!d?.bills.count || !!d?.pendingPayments) && (
        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          {!!d?.bills.count && (
            <Card className="flex items-center gap-4 border-amber-200 bg-amber-50/50 px-5 py-4">
              <span className="grid size-9 place-items-center rounded-full bg-amber-100 text-amber-700"><Wallet size={18} aria-hidden /></span>
              <div className="min-w-0 flex-1"><p className="font-medium text-amber-900">{d.bills.count} tagihan kas belum dibayar</p><p className="text-[13px] text-amber-800/80">Total {rupiah(d.bills.amount)}</p></div>
              <Link href="/dashboard/finance"><Button size="sm">Bayar</Button></Link>
            </Card>
          )}
          {!!d?.pendingPayments && (
            <Card className="flex items-center gap-4 px-5 py-4">
              <span className="grid size-9 place-items-center rounded-full bg-blue-50 text-blue-800"><Inbox size={18} aria-hidden /></span>
              <div className="min-w-0 flex-1"><p className="font-medium">{d.pendingPayments} bukti bayar menunggu verifikasi</p><p className="text-[13px] text-slate-500">Antrean bendahara</p></div>
              <Link href="/dashboard/finance?tab=verify"><Button size="sm" variant="outline">Verifikasi</Button></Link>
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Poin periode ini" value={d?.points.total ?? 0} icon={Trophy} loading={dash.isLoading} hint="Dari absensi, kepanitiaan & kontribusi" />
        <StatCard label="Peringkat" value={d?.points.rank ? `#${d.points.rank}` : "–"} icon={Users} tone="slate" loading={dash.isLoading} hint={d?.points.of ? `dari ${d.points.of} anggota` : "Belum ada poin"} />
        <StatCard label="Tingkat kehadiran" value={rate == null ? "–" : `${rate}%`} icon={CalendarCheck} tone="green" loading={att.isLoading} hint={att.data?.length ? `${attended} dari ${att.data.length} kegiatan` : "Belum ada riwayat"} />
        {d?.activeUsers != null ? (
          <StatCard label="User aktif" value={d.activeUsers} icon={Users} tone="slate" hint="Semua akun berstatus aktif" />
        ) : (
          <StatCard label={can("leave.decide") ? "Izin menunggu" : "Kegiatan mendatang"} value={can("leave.decide") ? d?.pendingLeaves ?? 0 : d?.upcomingEvents.length ?? 0} icon={Inbox} tone="amber" loading={dash.isLoading} hint={can("leave.decide") ? "Perlu keputusan Anda" : "Yang relevan untuk Anda"} />
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="min-w-0 pb-4">
          <CardHeader title="Tren kehadiran" desc="Persentase hadir di 8 kegiatan terakhir" icon={CalendarCheck} />
          <div className="pt-4">
            {dash.isLoading ? <Skeleton className="mx-5 h-52" /> : d?.attendanceTrend?.length ? <AttendanceTrend data={d.attendanceTrend} /> : <EmptyState icon={CalendarCheck} title="Belum ada data" desc="Muncul setelah ada kegiatan yang absensinya ditutup." />}
          </div>
        </Card>
        <Card className="min-w-0 pb-4">
          <CardHeader title="Pertumbuhan poin" desc="Akumulasi poin Anda periode ini" icon={Trophy} />
          <div className="pt-4">{mine.isLoading ? <Skeleton className="mx-5 h-52" /> : <PointsGrowth history={mine.data?.history ?? []} />}</div>
        </Card>
      </div>

      {!!bi.data?.items.length && (
        <Card className="mt-6">
          <CardHeader
            title="Indikator Bank Indonesia"
            desc={`Diperbarui ${new Date(bi.data.updatedAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
            icon={Landmark}
            action={<a href={bi.data.source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">bi.go.id <ArrowUpRight size={13} aria-hidden /></a>}
          />
          <dl className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
            {bi.data.items.map((i) => (
              <div key={i.key} className="border-b border-slate-100 px-5 py-4 sm:border-r">
                <dt className="text-xs text-slate-500">{i.label}</dt>
                <dd className="mt-1 font-serif text-[22px] leading-tight font-medium text-slate-900 tabular-nums">{i.value}</dd>
                {i.period && <dd className="mt-0.5 text-[11px] text-slate-400">{i.period}</dd>}
              </div>
            ))}
          </dl>
        </Card>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="self-start">
          <CardHeader title="Kegiatan terdekat" desc="Rapat & kegiatan yang perlu Anda hadiri" action={<Link href="/dashboard/events" className="text-[13px] font-medium text-primary hover:underline">Lihat semua</Link>} />
          {dash.isLoading ? (
            <div className="space-y-3 p-5">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : d?.upcomingEvents.length ? (
            <ul className="divide-y divide-slate-100">
              {d.upcomingEvents.map((e) => (
                <li key={e.id}>
                  <Link href={`/dashboard/events/${e.id}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50/80">
                    <DateTile date={e.startAt} active={e.attendanceStatus === "OPEN"} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{e.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-slate-500">
                        <span>{EVENT_TYPE_LABEL[e.type]}</span>
                        <span className="flex items-center gap-1"><Clock size={13} aria-hidden /> {fmtTime(e.startAt)}</span>
                        {e.location && <span className="flex items-center gap-1 truncate"><MapPin size={13} aria-hidden /> {e.location}</span>}
                      </p>
                    </div>
                    <Badge status={e.attendanceStatus} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={CalendarX2} title="Tidak ada kegiatan terjadwal" desc="Kegiatan baru akan muncul di sini begitu dibuat pengurus." />
          )}
        </Card>

        <div className="grid min-w-0 grid-cols-1 content-start gap-6">
          {!!d?.tasks.length && (
            <Card>
              <CardHeader title="Tugas saya" desc="Dari notulen rapat" action={<Link href="/dashboard/admin?tab=tasks" className="text-[13px] font-medium text-primary hover:underline">Semua</Link>} />
              <ul className="divide-y divide-slate-100">
                {d.tasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 px-5 py-3">
                    <CheckSquare size={16} className="mt-0.5 shrink-0 text-slate-300" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{t.title}</span>
                      <span className="block truncate text-xs text-slate-500">{t.minute.event.title}</span>
                    </span>
                    {t.dueDate && <span className={`shrink-0 text-xs ${new Date(t.dueDate) < new Date() ? "font-medium text-red-600" : "text-slate-500"}`}>{new Date(t.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card>
            <CardHeader title="Kehadiran saya" desc={att.data?.length ? `${att.data.length} kegiatan tercatat` : undefined} />
            <div className="pt-4">{att.isLoading ? <Skeleton className="mx-5 mb-5 h-16" /> : <AttendanceMix counts={mix} />}</div>
          </Card>
          <Card>
            <CardHeader title="Leaderboard" desc="Top 5 kepengurusan ini" action={<Link href="/dashboard/points" className="text-[13px] font-medium text-primary hover:underline">Detail</Link>} />
            <ol className="p-2">
              {board.isLoading && <div className="space-y-2 p-3">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-8" />)}</div>}
              {board.data?.length === 0 && <p className="px-3 py-6 text-center text-[13px] text-slate-500">Belum ada poin tercatat.</p>}
              {board.data?.slice(0, 5).map((r) => (
                <li key={r.userId} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${r.userId === me?.id ? "bg-accent" : ""}`}>
                  <span className={`w-5 text-center text-[13px] font-semibold tabular-nums ${r.rank <= 3 ? "text-primary" : "text-slate-400"}`}>{r.rank}</span>
                  <Avatar name={r.name} src={r.avatarUrl} size={28} />
                  <span className="min-w-0 flex-1">
                    <Link href={`/dashboard/people/${r.userId}`} className="block truncate text-[13px] font-medium hover:text-primary">{r.name}</Link>
                    {r.division && <span className="block truncate text-xs text-slate-500">{r.division}</span>}
                  </span>
                  <span className="text-[13px] font-semibold tabular-nums">{r.points}</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <CardHeader title="Aktivitas poin" desc="Perubahan poin terakhir Anda" />
            <ul className="divide-y divide-slate-100">
              {mine.data?.history.length === 0 && <li className="px-5 py-6 text-center text-[13px] text-slate-500">Belum ada aktivitas.</li>}
              {mine.data?.history.slice(0, 5).map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px]">{h.note}</span>
                    <span className="text-xs text-slate-500">{new Date(h.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                  </span>
                  <span className={`rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ${h.points < 0 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                    {h.points > 0 ? `+${h.points}` : h.points}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, CalendarX2, ChevronRight, Clock, Lock, MapPin, Play, Plus, QrCode, Radio, ScanLine, Search, Users, X } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { EventForm } from "@/components/event-form";
import { Badge, Button, Card, cx, DateTile, EmptyState, Input, PageHeader, Skeleton, Tabs } from "@/components/ui";
import { api } from "@/lib/api";
import { EVENT_TYPE_LABEL, fmtTime } from "@/lib/format";
import type { EventItem } from "@/lib/types";
import { useMe } from "@/lib/use-me";

type Tab = "upcoming" | "live" | "done";

const HELP_KEY = "events-help-hidden";
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
// Kelompok tanggal untuk daftar mendatang.
function bucket(iso: string) {
  const days = Math.round((dayStart(new Date(iso)) - dayStart(new Date())) / 864e5);
  if (days <= 0) return "Hari ini";
  if (days === 1) return "Besok";
  if (days <= 7) return "7 hari ke depan";
  return "Nanti";
}
function whenText(e: EventItem) {
  const ms = new Date(e.startAt).getTime() - Date.now();
  if (e.attendanceStatus === "OPEN") return "Absensi sedang dibuka";
  if (ms > 0 && ms < 864e5) return ms < 36e5 ? `Mulai ${Math.max(1, Math.round(ms / 6e4))} menit lagi` : `Mulai ${Math.round(ms / 36e5)} jam lagi`;
  return null;
}

export default function EventsPage() {
  const router = useRouter();
  const { can } = useMe();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [help, setHelp] = useState(false);
  const { data = [], isLoading } = useQuery({ queryKey: ["events"], queryFn: () => api<EventItem[]>("/events") });
  const creator = can("event.create");

  useEffect(() => {
    try { setHelp(localStorage.getItem(HELP_KEY) !== "1"); } catch { setHelp(true); }
  }, []);

  const groups = useMemo(() => {
    const live = data.filter((e) => e.attendanceStatus === "OPEN");
    const done = data.filter((e) => e.attendanceStatus === "DONE");
    const upcoming = data.filter((e) => e.attendanceStatus === "CLOSED").sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
    return { upcoming, live, done };
  }, [data]);
  // Ada absensi yang sedang dibuka → langsung tampilkan supaya tidak terlewat.
  useEffect(() => { if (groups.live.length) setTab("live"); }, [groups.live.length]);

  const list = groups[tab].filter((e) => e.title.toLowerCase().includes(q.toLowerCase()));
  const sections = tab === "upcoming"
    ? ["Hari ini", "Besok", "7 hari ke depan", "Nanti"].map((t) => ({ title: t, items: list.filter((e) => bucket(e.startAt) === t) })).filter((s) => s.items.length)
    : [{ title: "", items: list }];
  const hideHelp = () => { setHelp(false); try { localStorage.setItem(HELP_KEY, "1"); } catch {} };

  return (
    <>
      <PageHeader
        title="Kegiatan & rapat"
        desc={creator ? "Jadwalkan rapat atau kegiatan, lalu buka absensi QR saat acara dimulai." : "Jadwal rapat & kegiatan Anda. Saat acara dimulai, scan QR dari panitia untuk absen."}
        actions={
          <>
            <Link href="/dashboard/scan"><Button variant="outline"><ScanLine size={16} aria-hidden /> Scan absensi</Button></Link>
            {creator && <Button onClick={() => setCreating(true)}><Plus size={16} aria-hidden /> Buat kegiatan</Button>}
          </>
        }
      />

      {/* Cara kerja absensi, bisa disembunyikan */}
      {help && (
        <Card className="relative mb-5 p-4 sm:p-5">
          <button onClick={hideHelp} className="absolute top-3 right-3 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Sembunyikan panduan"><X size={16} /></button>
          <p className="text-[13px] font-semibold text-slate-900">Cara kerja absensi</p>
          <ol className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {(creator
              ? [
                  { icon: CalendarPlus, t: "Buat kegiatan", d: "Isi jadwal, lokasi, dan peserta." },
                  { icon: Play, t: "Buka absensi", d: "Saat acara mulai, tekan Buka absensi." },
                  { icon: QrCode, t: "Tampilkan QR", d: "Peserta scan QR yang berganti tiap 20 detik." },
                  { icon: Lock, t: "Tutup absensi", d: "Yang belum absen tercatat Alpa, poin dihitung." },
                ]
              : [
                  { icon: CalendarPlus, t: "Cek jadwal", d: "Kegiatan untuk Anda muncul di sini." },
                  { icon: Radio, t: "Tunggu dibuka", d: "Panitia membuka absensi saat acara mulai." },
                  { icon: ScanLine, t: "Scan QR", d: "Buka Scan absensi, arahkan ke QR panitia." },
                  { icon: Clock, t: "Tidak bisa hadir?", d: "Ajukan izin dari halaman kegiatan." },
                ]
            ).map((s, i) => (
              <li key={s.t} className="flex items-start gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-primary"><s.icon size={16} aria-hidden /></span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-slate-900">{i + 1}. {s.t}</span>
                  <span className="block text-xs leading-snug text-slate-500">{s.d}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "live", label: "Berlangsung", count: groups.live.length },
            { value: "upcoming", label: "Mendatang", count: groups.upcoming.length },
            { value: "done", label: "Selesai", count: groups.done.length },
          ]}
        />
        <Input icon={Search} placeholder="Cari kegiatan…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-64" aria-label="Cari kegiatan" />
      </div>

      {isLoading ? (
        <Card className="space-y-3 p-5">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16" />)}</Card>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={tab === "upcoming" ? CalendarPlus : CalendarX2}
            title={q ? "Tidak ada yang cocok" : tab === "live" ? "Tidak ada absensi yang sedang dibuka" : tab === "done" ? "Belum ada kegiatan selesai" : "Belum ada kegiatan terjadwal"}
            desc={q ? "Coba kata kunci lain." : tab === "live" ? "Absensi muncul di sini saat panitia membukanya." : tab === "upcoming" && creator ? "Buat rapat atau kegiatan, lalu buka absensi saat acara dimulai." : undefined}
            action={tab === "upcoming" && creator && !q && <Button variant="outline" onClick={() => setCreating(true)}><Plus size={16} aria-hidden /> Buat kegiatan</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-5">
          {sections.map((s) => (
            <section key={s.title || tab}>
              {s.title && <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">{s.title} · {s.items.length}</h2>}
              <Card className={cx(tab === "live" && "border-green-200")}>
                <ul className="divide-y divide-slate-100">
                  {s.items.map((e) => <EventRow key={e.id} e={e} />)}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}

      <Dialog open={creating} onClose={() => setCreating(false)} size="lg" title="Buat kegiatan" desc="Absensi bisa dibuka kapan saja setelah kegiatan dibuat.">
        <EventForm onCancel={() => setCreating(false)} onCreated={(id) => router.push(`/dashboard/events/${id}`)} />
      </Dialog>
    </>
  );
}

function EventRow({ e }: { e: EventItem }) {
  const live = e.attendanceStatus === "OPEN";
  const when = whenText(e);
  const mine = e.myAttendance
    ? <Badge status={e.myAttendance}>Saya: {e.myAttendance.toLowerCase()}</Badge>
    : e.myLeave ? <Badge status={e.myLeave.status}>Izin {e.myLeave.status === "PENDING" ? "diproses" : e.myLeave.status === "APPROVED" ? "disetujui" : "ditolak"}</Badge> : null;
  return (
    <li>
      <Link href={`/dashboard/events/${e.id}`} className={cx("group flex items-center gap-4 px-4 py-4 transition-colors sm:px-5", live ? "hover:bg-green-50/50" : "hover:bg-slate-50/80")}>
        <DateTile date={e.startAt} active={live} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium text-slate-900 group-hover:text-primary">{e.title}</p>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">{EVENT_TYPE_LABEL[e.type]}</span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[13px] text-slate-500">
            <span className="flex items-center gap-1"><Clock size={13} aria-hidden /> {fmtTime(e.startAt)} – {fmtTime(e.endAt)}</span>
            {e.location && <span className="flex items-center gap-1"><MapPin size={13} aria-hidden /> {e.location}</span>}
            <span className="flex items-center gap-1"><Users size={13} aria-hidden /> {e.division?.name ?? (e.scope === "MANUAL" ? "Peserta pilihan" : "Semua anggota")}</span>
          </p>
          {(when || mine) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {when && <span className={cx("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium", live ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700")}>{live && <span className="size-1.5 animate-pulse rounded-full bg-green-500" />}{when}</span>}
              <span className="sm:hidden">{mine}</span>
            </div>
          )}
        </div>
        <div className="hidden flex-col items-end gap-1.5 sm:flex">
          {live && !e.canManage && !e.myAttendance
            ? <span className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white"><ScanLine size={13} aria-hidden /> Absen sekarang</span>
            : <Badge status={e.attendanceStatus} />}
          {mine}
        </div>
        <ChevronRight size={16} className="shrink-0 text-slate-300 group-hover:text-slate-500" aria-hidden />
      </Link>
    </li>
  );
}

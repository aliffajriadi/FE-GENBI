"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, CalendarX2, ChevronLeft, ChevronRight, Clock, Lock, MapPin, Play, Plus, QrCode, Radio, ScanLine, Search, Users, X } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { EventForm } from "@/components/event-form";
import { Badge, Button, Card, cx, DateTile, EmptyState, Input, PageHeader, Skeleton, Tabs } from "@/components/ui";
import { api } from "@/lib/api";
import { EVENT_TYPE_LABEL, fmtTime } from "@/lib/format";
import type { EventItem } from "@/lib/types";
import { useMe } from "@/lib/use-me";

type Tab = "upcoming" | "live" | "done" | "calendar";

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

  const list = (tab === "calendar" ? [] : groups[tab]).filter((e) => e.title.toLowerCase().includes(q.toLowerCase()));
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
            { value: "calendar", label: "Kalender" },
          ]}
        />
        {tab !== "calendar" && <Input icon={Search} placeholder="Cari kegiatan…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-64" aria-label="Cari kegiatan" />}
      </div>

      {tab === "calendar" ? (
        <EventCalendar />
      ) : isLoading ? (
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

const TYPE_DOT: Record<string, string> = { RAPAT_PLENO: "bg-blue-500", RAPAT_DIVISI: "bg-violet-500", KEGIATAN: "bg-emerald-500", KEPANITIAAN: "bg-amber-500" };
const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

// Grid 6 minggu (Senin pertama) yang memuat bulan `m`.
function monthGrid(m: Date) {
  const first = new Date(m.getFullYear(), m.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

function EventCalendar() {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [picked, setPicked] = useState(() => dayStart(new Date()));
  const days = useMemo(() => monthGrid(month), [month]);
  const from = days[0], to = new Date(days[41].getFullYear(), days[41].getMonth(), days[41].getDate() + 1);
  const { data = [], isLoading } = useQuery({
    queryKey: ["events", "calendar", from.toISOString()],
    queryFn: () => api<EventItem[]>(`/events?from=${from.toISOString()}&to=${to.toISOString()}`),
  });
  // Kegiatan multi-hari tampil di setiap hari yang dilewatinya.
  const on = (d: Date) => data.filter((e) => dayStart(new Date(e.startAt)) <= +d && dayStart(new Date(e.endAt)) >= +d).sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const today = dayStart(new Date());
  const pickedList = on(new Date(picked));

  return (
    <div className="grid gap-5">
      <Card className="p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="font-semibold text-slate-900 capitalize">{month.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</p>
          <div className="flex items-center gap-1">
            <Button variant="outline" onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setPicked(today); }}>Hari ini</Button>
            <Button variant="outline" onClick={() => shift(-1)} aria-label="Bulan sebelumnya"><ChevronLeft size={16} aria-hidden /></Button>
            <Button variant="outline" onClick={() => shift(1)} aria-label="Bulan berikutnya"><ChevronRight size={16} aria-hidden /></Button>
          </div>
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
          {WEEKDAYS.map((w) => <div key={w} className="py-1.5">{w}</div>)}
        </div>
        <div className={cx("grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200", isLoading && "opacity-60")}>
          {days.map((d) => {
            const items = on(d);
            const out = d.getMonth() !== month.getMonth();
            return (
              <button
                key={+d}
                type="button"
                onClick={() => setPicked(+d)}
                aria-label={`${d.toLocaleDateString("id-ID", { day: "numeric", month: "long" })}, ${items.length} kegiatan`}
                aria-pressed={picked === +d}
                className={cx("flex min-h-16 flex-col items-stretch gap-1 bg-white p-1 text-left transition-colors hover:bg-slate-50 sm:min-h-24 sm:p-1.5", out && "bg-slate-50/70", picked === +d && "ring-2 ring-primary ring-inset")}
              >
                <span className={cx("grid size-6 place-items-center rounded-full text-xs tabular-nums", +d === today ? "bg-primary font-semibold text-white" : out ? "text-slate-400" : "text-slate-700")}>{d.getDate()}</span>
                {/* HP: titik saja; layar lebar: judul singkat */}
                <span className="flex flex-wrap gap-0.5 sm:hidden">{items.slice(0, 4).map((e) => <span key={e.id} className={cx("size-1.5 rounded-full", TYPE_DOT[e.type])} />)}</span>
                <span className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                  {items.slice(0, 2).map((e) => (
                    <span key={e.id} className="flex min-w-0 items-center gap-1 text-[11px] leading-tight text-slate-700">
                      <span className={cx("size-1.5 shrink-0 rounded-full", TYPE_DOT[e.type])} />
                      <span className="truncate">{e.title}</span>
                    </span>
                  ))}
                  {items.length > 2 && <span className="text-[11px] text-slate-500">+{items.length - 2} lagi</span>}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          {Object.entries(TYPE_DOT).map(([t, c]) => <span key={t} className="flex items-center gap-1.5"><span className={cx("size-2 rounded-full", c)} />{EVENT_TYPE_LABEL[t]}</span>)}
        </div>
      </Card>

      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          {new Date(picked).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })} · {pickedList.length}
        </h2>
        <Card>
          {pickedList.length ? (
            <ul className="divide-y divide-slate-100">{pickedList.map((e) => <EventRow key={e.id} e={e} />)}</ul>
          ) : (
            <EmptyState icon={CalendarX2} title="Tidak ada kegiatan" desc="Pilih tanggal lain di kalender." />
          )}
        </Card>
      </section>
    </div>
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

"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarX2, ChevronLeft, ChevronRight, Clock, MapPin, ScanLine, Users } from "lucide-react";
import { Badge, Button, Card, cx, DateTile, EmptyState, Select } from "@/components/ui";
import { api } from "@/lib/api";
import { EVENT_TYPE_LABEL, fmtTime } from "@/lib/format";
import type { EventItem } from "@/lib/types";

export const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
function whenText(e: EventItem) {
  const ms = new Date(e.startAt).getTime() - Date.now();
  if (e.attendanceStatus === "OPEN") return "Absensi sedang dibuka";
  if (ms > 0 && ms < 864e5) return ms < 36e5 ? `Mulai ${Math.max(1, Math.round(ms / 6e4))} menit lagi` : `Mulai ${Math.round(ms / 36e5)} jam lagi`;
  return null;
}

const TYPE_DOT: Record<string, string> = { RAPAT: "bg-blue-500", KEGIATAN: "bg-emerald-500", KEPANITIAAN: "bg-amber-500" };
const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

// Grid 6 minggu (Senin pertama) yang memuat bulan `m`.
function monthGrid(m: Date) {
  const first = new Date(m.getFullYear(), m.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

// Kartu planning (subset dari respons GET /boards/:divisionId).
type BoardData = {
  division: { id: string; name: string };
  columns: { id: string; name: string; isDone: boolean }[];
  cards: { id: string; title: string; columnId: string; dueDate: string | null; assignee: { name: string } | null }[];
};
// Satu item kalender: kegiatan (punya rentang) atau tenggat kartu planning (satu hari).
type CalItem = { id: string; title: string; dot: string; start: Date; end: Date; sub: string; event?: EventItem; href?: string; done?: boolean };
const CARD_DOT = { todo: "bg-violet-500", late: "bg-red-500", done: "bg-green-500" };
const CARD_LEGEND: [string, string][] = [[CARD_DOT.todo, "Belum selesai"], [CARD_DOT.late, "Terlambat"], [CARD_DOT.done, "Selesai"]];

export function EventCalendar() {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [picked, setPicked] = useState(() => dayStart(new Date()));
  const [source, setSource] = useState("events"); // "events" atau id divisi (papan planning)
  const days = useMemo(() => monthGrid(month), [month]);
  const from = days[0], to = new Date(days[41].getFullYear(), days[41].getMonth(), days[41].getDate() + 1);
  const planning = source !== "events";
  // Daftar papan yang boleh dilihat: anggota = divisinya, pengurus inti = semua divisi.
  const boards = useQuery({ queryKey: ["boards"], queryFn: () => api<{ id: string; name: string }[]>("/boards") });
  const events = useQuery({
    queryKey: ["events", "calendar", from.toISOString()],
    queryFn: () => api<EventItem[]>(`/events?from=${from.toISOString()}&to=${to.toISOString()}`),
    enabled: !planning,
  });
  const board = useQuery({ queryKey: ["board", source], queryFn: () => api<BoardData>(`/boards/${source}`), enabled: planning });
  const isLoading = planning ? board.isLoading : events.isLoading;

  const items = useMemo<CalItem[]>(() => {
    if (!planning) {
      return (events.data ?? []).map((e) => ({
        id: e.id, title: e.title, dot: TYPE_DOT[e.type], start: new Date(e.startAt), end: new Date(e.endAt), event: e,
        sub: `${fmtTime(e.startAt)} – ${fmtTime(e.endAt)}${e.location ? ` · ${e.location}` : ""}`,
      }));
    }
    const b = board.data;
    if (!b) return [];
    const cols = new Map(b.columns.map((c) => [c.id, c]));
    const todayMs = dayStart(new Date());
    return b.cards.filter((c) => c.dueDate).map((c) => {
      const due = new Date(c.dueDate!), col = cols.get(c.columnId), done = !!col?.isDone;
      return {
        id: c.id, title: c.title, start: due, end: due, done,
        dot: done ? CARD_DOT.done : dayStart(due) < todayMs ? CARD_DOT.late : CARD_DOT.todo,
        sub: `${col?.name ?? ""} · ${c.assignee?.name ?? "Belum ada PIC"}`,
        href: `/dashboard/planning?division=${b.division.id}&card=${c.id}`,
      };
    });
  }, [planning, events.data, board.data]);

  // Kegiatan multi-hari tampil di setiap hari yang dilewatinya.
  const on = (d: Date) => items.filter((e) => dayStart(e.start) <= +d && dayStart(e.end) >= +d).sort((a, b) => +a.start - +b.start);
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const today = dayStart(new Date());
  const pickedList = on(new Date(picked));
  const noun = planning ? "tugas" : "kegiatan";
  const legend: [string, string][] = planning ? CARD_LEGEND : Object.entries(TYPE_DOT).map(([t, c]) => [c, EVENT_TYPE_LABEL[t]]);

  return (
    <div className="grid gap-5">
      <Card className="p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900 capitalize">{month.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</p>
            {!!boards.data?.length && (
              <Select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Isi kalender" className="w-auto">
                <option value="events">Kegiatan</option>
                {boards.data.map((d) => <option key={d.id} value={d.id}>Planning · {d.name}</option>)}
              </Select>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setPicked(today); }}>Hari ini</Button>
            <Button variant="outline" onClick={() => shift(-1)} aria-label="Bulan sebelumnya"><ChevronLeft size={16} aria-hidden /></Button>
            <Button variant="outline" onClick={() => shift(1)} aria-label="Bulan berikutnya"><ChevronRight size={16} aria-hidden /></Button>
          </div>
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
          {WEEKDAYS.map((w) => <div key={w} className="py-1.5">{w}</div>)}
        </div>
        {/* Tanpa overflow-hidden supaya popover tidak terpotong; sudut sel dibulatkan manual. */}
        <div className={cx("grid grid-cols-7 gap-px rounded-lg border border-slate-200 bg-slate-200 [&>:nth-child(1)]:rounded-tl-lg [&>:nth-child(7)]:rounded-tr-lg [&>:nth-child(36)]:rounded-bl-lg [&>:nth-child(42)]:rounded-br-lg", isLoading && "opacity-60")}>
          {days.map((d, i) => {
            const list = on(d);
            const out = d.getMonth() !== month.getMonth();
            const col = i % 7, row = Math.floor(i / 7);
            return (
              <button
                key={+d}
                type="button"
                onClick={() => setPicked(+d)}
                aria-label={`${d.toLocaleDateString("id-ID", { day: "numeric", month: "long" })}, ${list.length} ${noun}`}
                aria-pressed={picked === +d}
                className={cx("group relative flex min-h-16 flex-col items-stretch gap-1 bg-white p-1 text-left transition-colors hover:z-20 hover:bg-slate-50 focus-visible:z-20 sm:min-h-24 sm:p-1.5", out && "bg-slate-50/70", picked === +d && "ring-2 ring-primary ring-inset")}
              >
                <span className={cx("grid size-6 place-items-center rounded-full text-xs tabular-nums", +d === today ? "bg-primary font-semibold text-white" : out ? "text-slate-400" : "text-slate-700")}>{d.getDate()}</span>
                {/* HP: titik saja; layar lebar: judul singkat */}
                <span className="flex flex-wrap gap-0.5 sm:hidden">{list.slice(0, 4).map((e) => <span key={e.id} className={cx("size-1.5 rounded-full", e.dot)} />)}</span>
                <span className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                  {list.slice(0, 2).map((e) => (
                    <span key={e.id} className={cx("flex min-w-0 items-center gap-1 text-[11px] leading-tight text-slate-700", e.done && "text-slate-400 line-through")}>
                      <span className={cx("size-1.5 shrink-0 rounded-full", e.dot)} />
                      <span className="truncate">{e.title}</span>
                    </span>
                  ))}
                  {list.length > 2 && <span className="text-[11px] text-slate-500">+{list.length - 2} lagi</span>}
                </span>
                {/* Pratinjau saat hover (hanya perangkat dengan mouse). Kolom kanan buka ke kiri, baris bawah buka ke atas. */}
                {list.length > 0 && (
                  <span
                    aria-hidden
                    className={cx(
                      "pointer-events-none absolute z-30 hidden w-64 origin-top scale-95 rounded-xl border border-slate-200 bg-white p-3 text-left opacity-0 shadow-lg transition duration-150 ease-out pointer-fine:block",
                      "group-hover:scale-100 group-hover:opacity-100 group-hover:delay-150 group-focus-visible:scale-100 group-focus-visible:opacity-100",
                      col < 4 ? "left-0" : "right-0",
                      row < 3 ? "top-full mt-1 translate-y-1 group-hover:translate-y-0" : "bottom-full mb-1 origin-bottom -translate-y-1 group-hover:translate-y-0",
                    )}
                  >
                    <span className="mb-2 block text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}</span>
                    <span className="flex flex-col gap-2">
                      {list.slice(0, 4).map((e) => (
                        <span key={e.id} className="flex min-w-0 items-start gap-2">
                          <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", e.dot)} />
                          <span className="min-w-0">
                            <span className={cx("block truncate text-[13px] font-medium text-slate-900", e.done && "text-slate-400 line-through")}>{e.title}</span>
                            <span className="block truncate text-xs text-slate-500">{e.sub}</span>
                          </span>
                        </span>
                      ))}
                      {list.length > 4 && <span className="text-xs text-slate-500">+{list.length - 4} {noun} lagi, klik untuk lihat</span>}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          {legend.map(([c, label]) => <span key={label} className="flex items-center gap-1.5"><span className={cx("size-2 rounded-full", c)} />{label}</span>)}
        </div>
      </Card>

      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          {new Date(picked).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })} · {pickedList.length}
        </h2>
        <Card>
          {pickedList.length ? (
            <ul className="divide-y divide-slate-100">
              {pickedList.map((e) => e.event ? <EventRow key={e.id} e={e.event} /> : (
                <li key={e.id}>
                  <Link href={e.href!} className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50/80 sm:px-5">
                    <span className={cx("size-2.5 shrink-0 rounded-full", e.dot)} />
                    <div className="min-w-0 flex-1">
                      <p className={cx("truncate font-medium text-slate-900 group-hover:text-primary", e.done && "text-slate-400 line-through")}>{e.title}</p>
                      <p className="mt-0.5 truncate text-[13px] text-slate-500">{e.sub}</p>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-slate-300 group-hover:text-slate-500" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={CalendarX2} title={planning ? "Tidak ada tenggat tugas" : "Tidak ada kegiatan"} desc="Pilih tanggal lain di kalender." />
          )}
        </Card>
      </section>
    </div>
  );
}

export function EventRow({ e }: { e: EventItem }) {
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

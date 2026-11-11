"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, CalendarX2, Clock, MapPin, Plus, Search, Users } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { EventForm } from "@/components/event-form";
import { Badge, Button, Card, DateTile, EmptyState, Input, PageHeader, Skeleton, Tabs } from "@/components/ui";
import { api } from "@/lib/api";
import { EVENT_TYPE_LABEL, fmtTime } from "@/lib/format";
import type { EventItem } from "@/lib/types";
import { useMe } from "@/lib/use-me";

type Tab = "upcoming" | "live" | "done";

export default function EventsPage() {
  const router = useRouter();
  const { can } = useMe();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const { data = [], isLoading } = useQuery({ queryKey: ["events"], queryFn: () => api<EventItem[]>("/events") });

  const groups = useMemo(() => {
    const live = data.filter((e) => e.attendanceStatus === "OPEN");
    const done = data.filter((e) => e.attendanceStatus === "DONE");
    const upcoming = data.filter((e) => e.attendanceStatus === "CLOSED").sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
    return { upcoming, live, done };
  }, [data]);
  const list = groups[tab].filter((e) => e.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader
        title="Kegiatan & rapat"
        desc="Buka absensi QR saat acara mulai. Peserta yang belum absen otomatis Alpa saat absensi ditutup."
        actions={can("event.create") && <Button onClick={() => setCreating(true)}><Plus size={16} aria-hidden /> Buat kegiatan</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "upcoming", label: "Mendatang", count: groups.upcoming.length },
            { value: "live", label: "Berlangsung", count: groups.live.length },
            { value: "done", label: "Selesai", count: groups.done.length },
          ]}
        />
        <Input icon={Search} placeholder="Cari kegiatan…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-64" aria-label="Cari kegiatan" />
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={tab === "upcoming" ? CalendarPlus : CalendarX2}
            title={q ? "Tidak ada yang cocok" : tab === "live" ? "Tidak ada absensi yang sedang dibuka" : tab === "done" ? "Belum ada kegiatan selesai" : "Belum ada kegiatan terjadwal"}
            desc={tab === "upcoming" && can("event.create") && !q ? "Buat rapat atau kegiatan, lalu buka absensi saat acara dimulai." : undefined}
            action={tab === "upcoming" && can("event.create") && !q && <Button variant="outline" onClick={() => setCreating(true)}><Plus size={16} aria-hidden /> Buat kegiatan</Button>}
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.map((e) => (
              <li key={e.id}>
                <Link href={`/dashboard/events/${e.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/80">
                  <DateTile date={e.startAt} active={e.attendanceStatus === "OPEN"} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-slate-900">{e.title}</p>
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">{EVENT_TYPE_LABEL[e.type]}</span>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[13px] text-slate-500">
                      <span className="flex items-center gap-1"><Clock size={13} aria-hidden /> {fmtTime(e.startAt)} – {fmtTime(e.endAt)}</span>
                      {e.location && <span className="flex items-center gap-1"><MapPin size={13} aria-hidden /> {e.location}</span>}
                      <span className="flex items-center gap-1"><Users size={13} aria-hidden /> {e.division?.name ?? (e.scope === "MANUAL" ? "Peserta pilihan" : "Semua anggota")}</span>
                    </p>
                  </div>
                  <div className="hidden flex-col items-end gap-1.5 sm:flex">
                    <Badge status={e.attendanceStatus} />
                    {e.myAttendance ? <Badge status={e.myAttendance}>Saya: {e.myAttendance.toLowerCase()}</Badge> : e.myLeave && <Badge status={e.myLeave.status}>Izin {e.myLeave.status === "PENDING" ? "diproses" : e.myLeave.status === "APPROVED" ? "disetujui" : "ditolak"}</Badge>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog open={creating} onClose={() => setCreating(false)} variant="sheet" title="Buat kegiatan" desc="Absensi bisa dibuka kapan saja setelah kegiatan dibuat.">
        <EventForm onCancel={() => setCreating(false)} onCreated={(id) => router.push(`/dashboard/events/${id}`)} />
      </Dialog>
    </>
  );
}

"use client";
import Link from "next/link";
import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, Clock, Lock, MapPin, MonitorUp, Pencil, Play, ScanLine, ShieldCheck, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { EventForm } from "@/components/event-form";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, cx, DateTile, ErrorText, PageHeader, Skeleton, Tabs } from "@/components/ui";
import { api } from "@/lib/api";
import { EVENT_TYPE_LABEL, fmtLongDate, fmtTime } from "@/lib/format";
import type { AttendanceRow, Counts, EventItem } from "@/lib/types";
import { useMe } from "@/lib/use-me";
import { type Leave } from "./_lib";
import { MyStatus, ScanMember } from "./_components/my-status";
import { AttendanceSummary, AttendanceTable } from "./_components/attendance";
import { LeaveList, ParticipantsDialog } from "./_components/participants";

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = useMe();
  const [tab, setTab] = useState<"attendance" | "leaves">("attendance");
  const [confirmClose, setConfirmClose] = useState(false);
  const [scanMember, setScanMember] = useState(false);
  const [editParticipants, setEditParticipants] = useState(false);
  const [editing, setEditing] = useState(false);
  const router = useRouter();

  const event = useQuery({ queryKey: ["event", id], queryFn: () => api<EventItem>(`/events/${id}`) });
  const e = event.data;
  const canSeeAttendance = !!e && (e.canManage || can("attendance.read_all"));
  const att = useQuery({
    queryKey: ["attendance", id],
    queryFn: () => api<{ counts: Counts; list: AttendanceRow[] }>(`/events/${id}/attendance`),
    enabled: canSeeAttendance,
    refetchInterval: e?.attendanceStatus === "OPEN" ? 5000 : false,
  });
  const leaves = useQuery({ queryKey: ["leaves", id], queryFn: () => api<Leave[]>(`/events/${id}/leave-requests`), enabled: !!e?.canManage });

  const refresh = () => qc.invalidateQueries({ predicate: (q) => ["event", "attendance", "leaves", "events", "dashboard"].includes(q.queryKey[0] as string) });
  const remove = useMutation({
    mutationFn: () => api(`/events/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); toast("Kegiatan dihapus"); router.push("/dashboard/events"); },
    onError: (err) => toast(err.message, { error: true }),
  });
  const action = useMutation({
    mutationFn: (a: "open" | "close") => api(`/events/${id}/${a}`, { method: "POST" }),
    onSuccess: (_, a) => {
      refresh();
      setConfirmClose(false);
      toast(a === "open" ? "Absensi dibuka. Tampilkan QR ke peserta." : "Absensi ditutup dan poin sudah dihitung.");
    },
    onError: (err) => toast(err.message, { error: true }),
  });

  if (event.isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-80" /><Skeleton className="h-32" /><Skeleton className="h-64" /></div>;
  if (!e) return <ErrorText error={event.error ?? "Kegiatan tidak ditemukan"} />;

  const c = att.data?.counts;
  const pendingLeaves = leaves.data?.filter((l) => l.status === "PENDING").length ?? 0;

  return (
    <>
      <nav className="mb-4 flex items-center gap-1 text-[13px] text-slate-500" aria-label="Breadcrumb">
        <Link href="/dashboard/events" className="hover:text-slate-900">Kegiatan</Link>
        <ChevronRight size={14} aria-hidden />
        <span className="truncate text-slate-900">{e.title}</span>
      </nav>

      <PageHeader
        title={
          <span className="flex items-center gap-4">
            <DateTile date={e.startAt} active={e.attendanceStatus === "OPEN"} />
            <span>{e.title}</span>
          </span>
        }
        actions={
          e.canManage && (
            <>
              {e.attendanceStatus !== "DONE" && <Button variant="outline" onClick={() => setEditing(true)}><Pencil size={15} aria-hidden /> Ubah</Button>}
              {e.attendanceStatus === "CLOSED" && e.scope === "MANUAL" && <Button variant="outline" onClick={() => setEditParticipants(true)}><Users size={15} aria-hidden /> Atur peserta</Button>}
              {e.attendanceStatus === "CLOSED" && <Button onClick={() => action.mutate("open")} loading={action.isPending}><Play size={15} aria-hidden /> Buka absensi</Button>}
              {e.attendanceStatus === "OPEN" && (
                <>
                  <Button variant="outline" onClick={() => setScanMember(true)}><ScanLine size={15} aria-hidden /> Scan anggota</Button>
                  <Link href={`/dashboard/events/${id}/qr`} target="_blank"><Button><MonitorUp size={15} aria-hidden /> Tampilkan QR</Button></Link>
                  <Button variant="outline" onClick={() => setConfirmClose(true)}><Lock size={15} aria-hidden /> Tutup</Button>
                </>
              )}
            </>
          )
        }
      />

      <div className="-mt-2 mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-slate-600">
        <Badge status={e.attendanceStatus} />
        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium">{EVENT_TYPE_LABEL[e.type]}</span>
        <span className="flex items-center gap-1.5"><Clock size={14} className="text-slate-400" aria-hidden /> {fmtLongDate(e.startAt)}, {fmtTime(e.startAt)}–{fmtTime(e.endAt)} · telat setelah {fmtTime(e.lateAfter)}</span>
        {e.location && <span className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" aria-hidden /> {e.location}</span>}
        <span className="flex items-center gap-1.5"><Users size={14} className="text-slate-400" aria-hidden /> {e.scope === "ALL" ? "Semua anggota" : e.scope === "DIVISION" ? `Divisi ${e.division?.name}` : "Peserta pilihan"}</span>
        {e.geofenceOn && <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-slate-400" aria-hidden /> Geofence aktif</span>}
      </div>

      {/* Alur absensi untuk penyelenggara: posisi sekarang + langkah berikutnya */}
      {e.canManage && (
        <Card className="mb-6 p-4 sm:p-5">
          <ol className="grid grid-cols-3 gap-2">
            {[
              { k: "CLOSED", t: "Dijadwalkan", d: "Atur detail & peserta" },
              { k: "OPEN", t: "Absensi dibuka", d: "Tampilkan QR ke peserta" },
              { k: "DONE", t: "Selesai", d: "Alpa & poin sudah dihitung" },
            ].map((st, i, arr) => {
              const cur = arr.findIndex((x) => x.k === e.attendanceStatus);
              const state = i < cur ? "done" : i === cur ? "now" : "next";
              return (
                <li key={st.k} className="flex min-w-0 items-start gap-2.5">
                  <span className={cx("grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold", state === "done" ? "bg-green-600 text-white" : state === "now" ? "bg-primary text-white ring-4 ring-primary/15" : "bg-slate-100 text-slate-400")}>
                    {state === "done" ? <Check size={14} aria-hidden /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={cx("block truncate text-[13px] font-medium", state === "next" ? "text-slate-400" : "text-slate-900")}>{st.t}</span>
                    <span className="hidden text-xs text-slate-500 sm:block">{st.d}</span>
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-slate-600">
            {e.attendanceStatus === "CLOSED" && "Langkah berikutnya: saat acara dimulai, tekan Buka absensi lalu Tampilkan QR di layar/proyektor."}
            {e.attendanceStatus === "OPEN" && "Peserta sedang bisa scan. Setelah acara selesai, tekan Tutup: yang belum absen tercatat Alpa dan poin dihitung."}
            {e.attendanceStatus === "DONE" && "Absensi sudah ditutup. Koreksi status peserta lewat tombol Ubah di daftar hadir (input manual)."}
          </p>
        </Card>
      )}

      {!e.canManage && <MyStatus event={e} onDone={refresh} />}

      {canSeeAttendance && (
        <Card className="mb-6 p-5">
          {c ? <AttendanceSummary counts={c} live={e.attendanceStatus === "OPEN"} /> : <Skeleton className="h-16" />}
        </Card>
      )}

      {canSeeAttendance && (
        <>
          {e.canManage && (
            <div className="mb-4">
              <Tabs value={tab} onChange={setTab} items={[{ value: "attendance", label: "Daftar hadir", count: c?.total }, { value: "leaves", label: "Pengajuan izin", count: pendingLeaves || undefined }]} />
            </div>
          )}
          {tab === "attendance" ? (
            <AttendanceTable eventId={id} title={e.title} rows={att.data?.list} loading={att.isLoading} canManual={can("attendance.manual")} onDone={refresh} />
          ) : (
            <LeaveList leaves={leaves.data ?? []} loading={leaves.isLoading} disabled={e.attendanceStatus === "DONE"} onDone={refresh} />
          )}
        </>
      )}

      <Dialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        title="Tutup absensi?"
        size="sm"
        footer={<><Button variant="ghost" onClick={() => setConfirmClose(false)}>Batal</Button><Button variant="danger" loading={action.isPending} onClick={() => action.mutate("close")}>Tutup absensi</Button></>}
      >
        <p className="text-slate-600">Peserta yang belum absen dan tidak punya izin disetujui akan tercatat <b>Alpa</b>, lalu poin dihitung. Tindakan ini tidak bisa dibatalkan; koreksi setelahnya lewat input manual.</p>
        {c && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">{c.BELUM} peserta belum absen.</p>}
      </Dialog>

      <Dialog open={editing} onClose={() => setEditing(false)} size="lg" title="Ubah kegiatan" desc={e.attendanceStatus === "OPEN" ? "Absensi sedang dibuka; perubahan jam berlaku untuk scan berikutnya." : "Perubahan langsung terlihat oleh peserta."}>
        {editing && (
          <>
            <EventForm
              event={e}
              onCancel={() => setEditing(false)}
              onCreated={() => { setEditing(false); refresh(); toast("Kegiatan diperbarui"); }}
              extra={e.attendanceStatus === "CLOSED" && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50/40 p-3">
                  <p className="text-[13px] text-red-800">Hapus kegiatan ini? Peserta tidak akan melihatnya lagi.</p>
                  <Button type="button" variant="danger" size="sm" loading={remove.isPending} onClick={() => confirm(`Hapus "${e.title}"?`) && remove.mutate()}><Trash2 size={14} aria-hidden /> Hapus</Button>
                </div>
              )}
            />
          </>
        )}
      </Dialog>

      <ParticipantsDialog eventId={id} divisionId={e.divisionId ?? null} open={editParticipants} onClose={() => setEditParticipants(false)} onSaved={refresh} />

      <Dialog open={scanMember} onClose={() => setScanMember(false)} title="Scan QR anggota" desc="Untuk anggota yang HP-nya bermasalah: scan QR personal di profil mereka.">
        {scanMember && <ScanMember eventId={id} onDone={refresh} />}
      </Dialog>
    </>
  );
}

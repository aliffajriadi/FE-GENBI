"use client";
import Link from "next/link";
import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, Clock, Download, FilePenLine, Inbox, Lock, MapPin, MonitorUp, Pencil, Play, ScanLine, Search, ShieldCheck, Trash2, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { EventForm } from "@/components/event-form";
import { Dialog } from "@/components/dialog";
import { ParticipantPicker } from "@/components/participant-picker";
import { QrReader } from "@/components/qr-reader";
import { useToast } from "@/components/toast";
import { Avatar, Badge, Button, Card, CardHeader, cx, DateTile, EmptyState, ErrorText, Field, Input, PageHeader, Select, Skeleton, Table, Tabs, Td, Textarea } from "@/components/ui";
import { api, download } from "@/lib/api";
import { EVENT_TYPE_LABEL, fmtLongDate, fmtTime } from "@/lib/format";
import type { AttendanceRow, Counts, EventItem } from "@/lib/types";
import { useMe } from "@/lib/use-me";

type Leave = { id: string; kind: string; reason: string; status: string; createdAt: string; user: { name: string } };

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

function AttendanceSummary({ counts: c, live }: { counts: Counts; live: boolean }) {
  const parts = [
    { k: "HADIR", label: "Hadir", v: c.HADIR, bar: "bg-green-500" },
    { k: "TELAT", label: "Telat", v: c.TELAT, bar: "bg-amber-400" },
    { k: "IZIN", label: "Izin/sakit", v: c.IZIN + c.SAKIT, bar: "bg-slate-400" },
    { k: "ALPA", label: "Alpa", v: c.ALPA, bar: "bg-red-500" },
    { k: "BELUM", label: "Belum", v: c.BELUM, bar: "bg-slate-200" },
  ];
  const pct = c.total ? Math.round(((c.HADIR + c.TELAT) / c.total) * 100) : 0;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[13px] text-slate-500">Kehadiran {live && <span className="inline-flex items-center gap-1 text-xs text-green-700"><span className="size-1.5 animate-pulse rounded-full bg-green-500" /> live</span>}</p>
          <p className="mt-0.5 text-3xl font-semibold tracking-tight tabular-nums">{pct}%<span className="ml-2 text-sm font-normal text-slate-500">{c.HADIR + c.TELAT} dari {c.total} peserta</span></p>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-2">
          {parts.map((p) => (
            <div key={p.k} className="flex items-center gap-2">
              <span className={cx("size-2 rounded-full", p.bar)} aria-hidden />
              <dt className="text-[13px] text-slate-500">{p.label}</dt>
              <dd className="text-[13px] font-semibold tabular-nums">{p.v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
        {parts.map((p) => c.total > 0 && p.v > 0 && <div key={p.k} className={cx(p.bar, "transition-all")} style={{ width: `${(p.v / c.total) * 100}%` }} />)}
      </div>
    </div>
  );
}

function AttendanceTable({ eventId, title, rows, loading, canManual, onDone }: { eventId: string; title: string; rows?: AttendanceRow[]; loading: boolean; canManual: boolean; onDone: () => void }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [manual, setManual] = useState<AttendanceRow | null | "new">(null);
  const shown = (rows ?? []).filter((r) => r.name.toLowerCase().includes(q.toLowerCase()) && (!status || (r.status ?? "BELUM") === status));
  return (
    <>
      <Table
        loading={loading}
        toolbar={
          <>
            <Input icon={Search} placeholder="Cari nama…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-60" aria-label="Cari peserta" />
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full sm:w-40" aria-label="Filter status">
              <option value="">Semua status</option>
              {["HADIR", "TELAT", "IZIN", "SAKIT", "ALPA", "BELUM"].map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
            </Select>
            <div className="ml-auto flex gap-2">
              {canManual && <Button variant="outline" size="sm" onClick={() => setManual("new")}><FilePenLine size={14} aria-hidden /> Input manual</Button>}
              <Button variant="outline" size="sm" onClick={() => download(`/events/${eventId}/attendance/export`, `absensi-${title}.xlsx`)}><Download size={14} aria-hidden /> Excel</Button>
            </div>
          </>
        }
        hideOnMobile={[2]} head={["Peserta", "Status", "Metode", "Waktu scan", ...(canManual ? [""] : [])]}
        empty={shown.length === 0 && <EmptyState icon={Users} title={rows?.length ? "Tidak ada yang cocok" : "Peserta belum ditentukan"} desc={rows?.length ? undefined : "Daftar peserta terisi saat absensi dibuka."} />}
        footer={rows && `${shown.length} dari ${rows.length} peserta`}
      >
        {shown.map((r) => (
          <tr key={r.userId} className="group hover:bg-slate-50/60">
            <Td>
              <span className="flex items-center gap-3">
                <Avatar name={r.name} size={30} />
                <span>
                  <span className="block font-medium">{r.name}</span>
                  {r.nim && <span className="text-xs text-slate-500">{r.nim}</span>}
                </span>
              </span>
            </Td>
            <Td><Badge status={r.status} /></Td>
            <Td className="text-slate-500">{{ QR: "Scan QR", SCAN_BALIK: "Scan balik", MANUAL: "Manual", AUTO: "Otomatis" }[r.method ?? ""] ?? "–"}</Td>
            <Td className="text-slate-500 tabular-nums">{r.scannedAt && r.method !== "AUTO" ? fmtTime(r.scannedAt) : "–"}</Td>
            {canManual && (
              <Td className="text-right">
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => setManual(r)}>Ubah</Button>
              </Td>
            )}
          </tr>
        ))}
      </Table>
      <ManualDialog eventId={eventId} rows={rows ?? []} target={manual} onClose={() => setManual(null)} onDone={onDone} />
    </>
  );
}

function ManualDialog({ eventId, rows, target, onClose, onDone }: { eventId: string; rows: AttendanceRow[]; target: AttendanceRow | null | "new"; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const save = useMutation({
    mutationFn: (body: unknown) => api("/attendance/manual", { method: "POST", body }),
    onSuccess: () => { onDone(); onClose(); toast("Absensi diperbarui dan tercatat di audit log."); },
  });
  const row = target && target !== "new" ? target : null;
  return (
    <Dialog
      open={!!target}
      onClose={onClose}
      title={row ? `Ubah absensi ${row.name}` : "Input absensi manual"}
      desc="Poin lama dibalik otomatis, lalu poin status baru ditambahkan."
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button type="submit" form="manual-form" loading={save.isPending}>Simpan</Button></>}
    >
      <form
        id="manual-form"
        key={row?.userId ?? "new"}
        className="grid gap-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          save.mutate({ ...Object.fromEntries(new FormData(ev.currentTarget)), eventId });
        }}
      >
        <Field label="Anggota">
          <Select name="userId" required defaultValue={row?.userId ?? ""}>
            <option value="">Pilih anggota</option>
            {rows.map((r) => <option key={r.userId} value={r.userId}>{r.name}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={row?.status ?? "HADIR"}>{["HADIR", "TELAT", "IZIN", "SAKIT", "ALPA"].map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}</Select>
        </Field>
        <Field label="Alasan" hint="Wajib; tersimpan di audit log."><Textarea name="reason" required minLength={3} placeholder="Contoh: HP mati, hadir dicek dari notulen" /></Field>
        <ErrorText error={save.error} />
      </form>
    </Dialog>
  );
}

function MyStatus({ event: e, onDone }: { event: EventItem; onDone: () => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const my = useQuery({ queryKey: ["events"], queryFn: () => api<EventItem[]>("/events") });
  const mine = my.data?.find((x) => x.id === e.id);
  const leave = useMutation({
    mutationFn: (body: { kind: string; reason: string }) => api(`/events/${e.id}/leave-requests`, { method: "POST", body }),
    onSuccess: () => { setOpen(false); onDone(); toast("Pengajuan izin terkirim ke pembuat kegiatan."); },
  });

  return (
    <Card className="mb-6">
      <CardHeader title="Status kehadiran saya" />
      <div className="flex flex-wrap items-center gap-3 px-5 py-4">
        {my.isLoading ? <Skeleton className="h-6 w-32" /> : mine?.myAttendance ? <Badge status={mine.myAttendance} /> : <Badge status={null} />}
        {mine?.myLeave && <Badge status={mine.myLeave.status}>Izin {mine.myLeave.kind.toLowerCase()}: {mine.myLeave.status === "PENDING" ? "menunggu" : mine.myLeave.status === "APPROVED" ? "disetujui" : "ditolak"}</Badge>}
        <div className="ml-auto flex gap-2">
          {e.attendanceStatus !== "DONE" && !mine?.myAttendance && !mine?.myLeave && <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Ajukan izin</Button>}
          {e.attendanceStatus === "OPEN" && !mine?.myAttendance && <Link href="/dashboard/scan"><Button size="sm"><ScanLine size={14} aria-hidden /> Scan sekarang</Button></Link>}
        </div>
      </div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Ajukan izin"
        desc={e.title}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button><Button type="submit" form="leave-form" loading={leave.isPending}>Kirim pengajuan</Button></>}
      >
        <form
          id="leave-form"
          className="grid gap-4"
          onSubmit={(ev) => {
            ev.preventDefault();
            const f = new FormData(ev.currentTarget);
            leave.mutate({ kind: String(f.get("kind")), reason: String(f.get("reason")) });
          }}
        >
          <Field label="Jenis"><Select name="kind"><option value="IZIN">Izin</option><option value="SAKIT">Sakit</option></Select></Field>
          <Field label="Alasan"><Textarea name="reason" required minLength={3} placeholder="Jelaskan singkat alasannya" /></Field>
          <ErrorText error={leave.error} />
        </form>
      </Dialog>
    </Card>
  );
}

function ScanMember({ eventId, onDone }: { eventId: string; onDone: () => void }) {
  const [log, setLog] = useState<{ ok: boolean; text: string; at: number }[]>([]);
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid gap-4">
      <QrReader
        paused={busy}
        onResult={async (memberToken) => {
          setBusy(true);
          try {
            const r = await api<{ status: string; name: string }>("/attendance/scan-member", { method: "POST", body: { eventId, memberToken } });
            setLog((l) => [{ ok: true, text: `${r.name} · ${r.status.toLowerCase()}`, at: Date.now() }, ...l]);
            onDone();
          } catch (e) {
            setLog((l) => [{ ok: false, text: e instanceof Error ? e.message : "Gagal", at: Date.now() }, ...l]);
          } finally {
            setBusy(false);
          }
        }}
      />
      <ul className="grid gap-1.5" aria-live="polite">
        {log.slice(0, 5).map((l) => (
          <li key={l.at} className={cx("rounded-lg px-3 py-2 text-[13px]", l.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700")}>{l.text}</li>
        ))}
      </ul>
    </div>
  );
}

function LeaveList({ leaves, loading, disabled, onDone }: { leaves: Leave[]; loading: boolean; disabled: boolean; onDone: () => void }) {
  const toast = useToast();
  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api(`/leave-requests/${id}`, { method: "PATCH", body: { status } }),
    onSuccess: (_, v) => { onDone(); toast(v.status === "APPROVED" ? "Izin disetujui" : "Izin ditolak"); },
    onError: (e) => toast(e.message, { error: true }),
  });
  return (
    <Table loading={loading} hideOnMobile={[1]} head={["Anggota", "Jenis", "Alasan", "Status", ""]} empty={leaves.length === 0 && <EmptyState icon={Inbox} title="Belum ada pengajuan izin" />}>
      {leaves.map((l) => (
        <tr key={l.id}>
          <Td><span className="flex items-center gap-3"><Avatar name={l.user.name} size={28} /><span className="font-medium">{l.user.name}</span></span></Td>
          <Td>{l.kind === "SAKIT" ? "Sakit" : "Izin"}</Td>
          <Td className="max-w-sm text-slate-600">{l.reason}</Td>
          <Td><Badge status={l.status} /></Td>
          <Td className="text-right whitespace-nowrap">
            {l.status === "PENDING" && !disabled && (
              <span className="inline-flex gap-2">
                <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: l.id, status: "REJECTED" })}><X size={13} aria-hidden /> Tolak</Button>
                <Button size="sm" onClick={() => decide.mutate({ id: l.id, status: "APPROVED" })}>Setujui</Button>
              </span>
            )}
          </Td>
        </tr>
      ))}
    </Table>
  );
}

// Atur peserta kegiatan "pilih anggota" sebelum absensi dibuka. Kadiv hanya bisa memilih anggota divisinya.
function ParticipantsDialog({ eventId, divisionId, open, onClose, onSaved }: { eventId: string; divisionId: string | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const current = useQuery({ queryKey: ["participants", eventId], queryFn: () => api<{ id: string }[]>(`/events/${eventId}/participants`), enabled: open });
  const [picked, setPicked] = useState<string[] | null>(null);
  const ids = picked ?? current.data?.map((p) => p.id) ?? [];
  const save = useMutation({
    mutationFn: () => api(`/events/${eventId}/participants`, { method: "PUT", body: { participantIds: ids } }),
    onSuccess: () => { toast("Peserta diperbarui; yang baru ditambahkan mendapat undangan"); onSaved(); setPicked(null); onClose(); },
  });
  return (
    <Dialog open={open} onClose={() => { setPicked(null); onClose(); }} title="Atur peserta" desc="Hanya peserta terpilih yang melihat kegiatan ini dan dihitung absensinya." variant="sheet"
      footer={<><Button variant="ghost" onClick={() => { setPicked(null); onClose(); }}>Batal</Button><Button loading={save.isPending} disabled={!ids.length} onClick={() => save.mutate()}>Simpan peserta</Button></>}>
      <div className="grid gap-4">
        {current.isLoading ? <Skeleton className="h-64" /> : <ParticipantPicker picked={ids} onChange={setPicked} divisionId={divisionId} />}
        <ErrorText error={save.error} />
      </div>
    </Dialog>
  );
}

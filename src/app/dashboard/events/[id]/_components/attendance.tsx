"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download, FilePenLine, Search, Users } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { Avatar, Badge, Button, cx, EmptyState, ErrorText, Field, Input, Select, Table, Td, Textarea } from "@/components/ui";
import { api, download } from "@/lib/api";
import { fmtTime } from "@/lib/format";
import type { AttendanceRow, Counts } from "@/lib/types";

export function AttendanceSummary({ counts: c, live }: { counts: Counts; live: boolean }) {
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

export function AttendanceTable({ eventId, title, rows, loading, canManual, onDone }: { eventId: string; title: string; rows?: AttendanceRow[]; loading: boolean; canManual: boolean; onDone: () => void }) {
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

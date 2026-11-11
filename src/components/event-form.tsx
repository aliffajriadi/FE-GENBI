"use client";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LocateFixed } from "lucide-react";
import { ParticipantPicker } from "@/components/participant-picker";
import { Button, ErrorText, Field, Input, Select, Switch, Tabs } from "@/components/ui";
import { api } from "@/lib/api";
import { EVENT_TYPE_LABEL, toLocalInput } from "@/lib/format";
import type { Division, EventItem } from "@/lib/types";
import { useMe } from "@/lib/use-me";


// Form buat & ubah kegiatan. Mode ubah (event diisi): peserta diatur terpisah lewat "Atur peserta".
export function EventForm({ event, onCreated, onCancel, extra }: { event?: EventItem; onCreated: (id: string) => void; onCancel: () => void; extra?: React.ReactNode }) {
  const { me, can } = useMe();
  const manageAll = can("event.manage_all");
  const editing = !!event;
  const [scope, setScope] = useState<"ALL" | "DIVISION" | "MANUAL">(manageAll ? "ALL" : "DIVISION");
  const [geo, setGeo] = useState(event?.geofenceOn ?? false);
  const [coords, setCoords] = useState({ lat: event?.lat != null ? String(event.lat) : "", lng: event?.lng != null ? String(event.lng) : "" });
  const [picked, setPicked] = useState<string[]>([]);

  const start = event ? new Date(event.startAt) : new Date(Math.ceil(Date.now() / 3_600_000) * 3_600_000);
  const lateAt = event ? new Date(event.lateAfter) : new Date(start.getTime() + 15 * 60_000);
  const endAt = event ? new Date(event.endAt) : new Date(start.getTime() + 2 * 3_600_000);
  const divisions = useQuery({ queryKey: ["divisions"], queryFn: () => api<Division[]>("/divisions"), enabled: manageAll && !editing });

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      editing ? api<{ id: string }>(`/events/${event.id}`, { method: "PATCH", body }) : api<{ id: string }>("/events", { method: "POST", body }),
    onSuccess: (e) => onCreated(e.id),
  });

  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const f = Object.fromEntries(new FormData(ev.currentTarget)) as Record<string, string>;
    const num = (v?: string) => (v ? Number(v) : null);
    const common = {
      title: f.title,
      type: f.type,
      startAt: new Date(f.startAt).toISOString(),
      endAt: new Date(f.endAt).toISOString(),
      lateAfter: new Date(f.lateAfter).toISOString(),
      location: f.location || undefined,
      pointHadir: num(f.pointHadir),
      pointTelat: num(f.pointTelat),
      geofenceOn: geo,
      ...(geo ? { lat: Number(coords.lat), lng: Number(coords.lng), radiusM: Number(f.radiusM) } : {}),
    };
    if (editing) return create.mutate(common);
    create.mutate({
      ...common,
      scope,
      // Kadiv: kegiatan selalu milik divisinya (server juga memaksa).
      divisionId: manageAll ? (scope === "DIVISION" ? f.divisionId : undefined) : me?.division?.id,
      participantIds: scope === "MANUAL" ? picked : undefined,
    });
  }

  return (
    <form id="event-form" onSubmit={onSubmit} className="grid gap-6">
      <section className="grid gap-4">
        <Field label="Judul kegiatan"><Input name="title" required minLength={3} placeholder="Rapat pleno November" autoFocus defaultValue={event?.title} /></Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Jenis">
            <Select name="type" defaultValue={event?.type ?? (manageAll ? "RAPAT_PLENO" : "RAPAT_DIVISI")}>
              {Object.entries(EVENT_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Lokasi"><Input name="location" placeholder="Ruang rapat KPw BI" defaultValue={event?.location ?? ""} /></Field>
        </div>
      </section>

      <section className="grid gap-4 border-t border-slate-100 pt-6">
        <p className="text-[13px] font-semibold text-slate-900">Waktu</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Mulai" className="sm:col-span-2"><Input type="datetime-local" name="startAt" required defaultValue={toLocalInput(start)} /></Field>
          <Field label="Batas telat"><Input type="datetime-local" name="lateAfter" required defaultValue={toLocalInput(lateAt)} /></Field>
          <Field label="Selesai"><Input type="datetime-local" name="endAt" required defaultValue={toLocalInput(endAt)} /></Field>
        </div>
        <p className="-mt-1 text-xs text-slate-500">Scan setelah batas telat tercatat Telat. Absensi tertutup otomatis saat kegiatan selesai.</p>
      </section>

      <section className="grid gap-4 border-t border-slate-100 pt-6">
        <p className="text-[13px] font-semibold text-slate-900">Peserta</p>
        {editing ? (
          <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-[13px] text-slate-600">
            {event.scope === "ALL" ? "Semua anggota" : event.scope === "DIVISION" ? `Seluruh divisi ${event.division?.name ?? ""}` : "Peserta pilihan"}.
            {event.scope === "MANUAL" ? " Ubah daftar peserta lewat tombol \"Atur peserta\" di halaman kegiatan." : " Cakupan peserta tidak bisa diubah setelah kegiatan dibuat."}
          </p>
        ) : manageAll ? (
          <>
            <div><Tabs value={scope} onChange={setScope} items={[{ value: "ALL", label: "Semua anggota" }, { value: "DIVISION", label: "Satu divisi" }, { value: "MANUAL", label: "Pilih manual" }]} /></div>
            {scope === "DIVISION" && (
              <Field label="Divisi">
                <Select name="divisionId" required>
                  <option value="">Pilih divisi</option>
                  {divisions.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </Select>
              </Field>
            )}
            {scope === "MANUAL" && <ParticipantPicker picked={picked} onChange={setPicked} />}
          </>
        ) : (
          <>
            <div><Tabs value={scope} onChange={setScope} items={[{ value: "DIVISION", label: `Seluruh divisi ${me?.division?.name ?? ""}`.trim() }, { value: "MANUAL", label: "Pilih anggota" }]} /></div>
            {scope === "MANUAL" ? <ParticipantPicker picked={picked} onChange={setPicked} divisionId={me?.division?.id} /> : <p className="text-[13px] text-slate-500">Semua anggota divisi otomatis jadi peserta.</p>}
          </>
        )}
      </section>

      <section className="grid gap-4 border-t border-slate-100 pt-6">
        <p className="text-[13px] font-semibold text-slate-900">Poin & keamanan</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Poin hadir" hint="Kosongkan untuk ikut aturan poin"><Input type="number" name="pointHadir" placeholder="Default" defaultValue={event?.pointHadir ?? ""} /></Field>
          <Field label="Poin telat" hint="Kosongkan untuk ikut aturan poin"><Input type="number" name="pointTelat" placeholder="Default" defaultValue={event?.pointTelat ?? ""} /></Field>
        </div>
        <Switch checked={geo} onChange={setGeo} label="Geofence lokasi" description="HP anggota harus berada di sekitar lokasi acara saat scan." />
        {geo && (
          <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_110px]">
            <Field label="Latitude"><Input required inputMode="decimal" value={coords.lat} onChange={(e) => setCoords({ ...coords, lat: e.target.value })} /></Field>
            <Field label="Longitude"><Input required inputMode="decimal" value={coords.lng} onChange={(e) => setCoords({ ...coords, lng: e.target.value })} /></Field>
            <Field label="Radius (m)"><Input type="number" name="radiusM" defaultValue={event?.radiusM ?? 100} required min={10} /></Field>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="sm:col-span-3 sm:justify-self-start"
              onClick={() => navigator.geolocation.getCurrentPosition((p) => setCoords({ lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) }))}
            >
              <LocateFixed size={14} aria-hidden /> Pakai lokasi saya sekarang
            </Button>
          </div>
        )}
      </section>

      {extra}
      <ErrorText error={create.error} />
      {/* -bottom-5 = padding isi dialog, supaya tombol benar-benar menempel di tepi bawah tanpa isi form terlihat di bawahnya */}
      <div className="sticky -bottom-5 z-10 -mx-5 -mb-5 flex justify-end gap-2 border-t border-slate-100 bg-white px-5 py-3">
        <Button type="button" variant="ghost" onClick={onCancel}>Batal</Button>
        <Button type="submit" loading={create.isPending}>{editing ? "Simpan perubahan" : "Buat kegiatan"}</Button>
      </div>
    </form>
  );
}

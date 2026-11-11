"use client";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LocateFixed } from "lucide-react";
import { ParticipantPicker } from "@/components/participant-picker";
import { Button, ErrorText, Field, Input, Select, Switch, Tabs } from "@/components/ui";
import { api } from "@/lib/api";
import { EVENT_TYPE_LABEL, toLocalInput } from "@/lib/format";
import type { Division } from "@/lib/types";
import { useMe } from "@/lib/use-me";


// Form buat kegiatan, dipakai di sheet halaman Kegiatan.
export function EventForm({ onCreated, onCancel }: { onCreated: (id: string) => void; onCancel: () => void }) {
  const { me, can } = useMe();
  const manageAll = can("event.manage_all");
  const [scope, setScope] = useState<"ALL" | "DIVISION" | "MANUAL">(manageAll ? "ALL" : "DIVISION");
  const [geo, setGeo] = useState(false);
  const [coords, setCoords] = useState({ lat: "", lng: "" });
  const [picked, setPicked] = useState<string[]>([]);

  const start = new Date(Math.ceil(Date.now() / 3_600_000) * 3_600_000);
  const divisions = useQuery({ queryKey: ["divisions"], queryFn: () => api<Division[]>("/divisions"), enabled: manageAll });

  const create = useMutation({
    mutationFn: (body: unknown) => api<{ id: string }>("/events", { method: "POST", body }),
    onSuccess: (e) => onCreated(e.id),
  });

  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const f = Object.fromEntries(new FormData(ev.currentTarget)) as Record<string, string>;
    const num = (v?: string) => (v ? Number(v) : null);
    create.mutate({
      title: f.title,
      type: f.type,
      startAt: new Date(f.startAt).toISOString(),
      endAt: new Date(f.endAt).toISOString(),
      lateAfter: new Date(f.lateAfter).toISOString(),
      location: f.location || undefined,
      scope,
      // Kadiv: kegiatan selalu milik divisinya (server juga memaksa).
      divisionId: manageAll ? (scope === "DIVISION" ? f.divisionId : undefined) : me?.division?.id,
      participantIds: scope === "MANUAL" ? picked : undefined,
      pointHadir: num(f.pointHadir),
      pointTelat: num(f.pointTelat),
      geofenceOn: geo,
      ...(geo ? { lat: Number(coords.lat), lng: Number(coords.lng), radiusM: Number(f.radiusM) } : {}),
    });
  }

  return (
    <form id="event-form" onSubmit={onSubmit} className="grid gap-6">
      <section className="grid gap-4">
        <Field label="Judul kegiatan"><Input name="title" required minLength={3} placeholder="Rapat pleno November" autoFocus /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Jenis">
            <Select name="type" defaultValue={manageAll ? "RAPAT_PLENO" : "RAPAT_DIVISI"}>
              {Object.entries(EVENT_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Lokasi"><Input name="location" placeholder="Ruang rapat KPw BI" /></Field>
        </div>
      </section>

      <section className="grid gap-4 border-t border-slate-100 pt-6">
        <p className="text-[13px] font-semibold text-slate-900">Waktu</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mulai" className="sm:col-span-2"><Input type="datetime-local" name="startAt" required defaultValue={toLocalInput(start)} /></Field>
          <Field label="Batas telat"><Input type="datetime-local" name="lateAfter" required defaultValue={toLocalInput(new Date(start.getTime() + 15 * 60_000))} /></Field>
          <Field label="Selesai"><Input type="datetime-local" name="endAt" required defaultValue={toLocalInput(new Date(start.getTime() + 2 * 3_600_000))} /></Field>
        </div>
        <p className="-mt-1 text-xs text-slate-500">Scan setelah batas telat tercatat Telat. Absensi tertutup otomatis saat kegiatan selesai.</p>
      </section>

      <section className="grid gap-4 border-t border-slate-100 pt-6">
        <p className="text-[13px] font-semibold text-slate-900">Peserta</p>
        {manageAll ? (
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Poin hadir" hint="Kosongkan untuk ikut aturan poin"><Input type="number" name="pointHadir" placeholder="Default" /></Field>
          <Field label="Poin telat" hint="Kosongkan untuk ikut aturan poin"><Input type="number" name="pointTelat" placeholder="Default" /></Field>
        </div>
        <Switch checked={geo} onChange={setGeo} label="Geofence lokasi" description="HP anggota harus berada di sekitar lokasi acara saat scan." />
        {geo && (
          <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_110px]">
            <Field label="Latitude"><Input required inputMode="decimal" value={coords.lat} onChange={(e) => setCoords({ ...coords, lat: e.target.value })} /></Field>
            <Field label="Longitude"><Input required inputMode="decimal" value={coords.lng} onChange={(e) => setCoords({ ...coords, lng: e.target.value })} /></Field>
            <Field label="Radius (m)"><Input type="number" name="radiusM" defaultValue={100} required min={10} /></Field>
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

      <ErrorText error={create.error} />
      <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-2 border-t border-slate-100 bg-white px-5 py-3">
        <Button type="button" variant="ghost" onClick={onCancel}>Batal</Button>
        <Button type="submit" loading={create.isPending}>Buat kegiatan</Button>
      </div>
    </form>
  );
}

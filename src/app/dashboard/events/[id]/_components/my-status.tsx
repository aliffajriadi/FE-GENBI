"use client";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ScanLine } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { QrReader } from "@/components/qr-reader";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, CardHeader, cx, ErrorText, Field, Select, Skeleton, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import type { EventItem } from "@/lib/types";

export function MyStatus({ event: e, onDone }: { event: EventItem; onDone: () => void }) {
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

export function ScanMember({ eventId, onDone }: { eventId: string; onDone: () => void }) {
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

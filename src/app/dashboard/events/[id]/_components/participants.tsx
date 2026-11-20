"use client";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Inbox, X } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { ParticipantPicker } from "@/components/participant-picker";
import { useToast } from "@/components/toast";
import { Avatar, Badge, Button, EmptyState, ErrorText, Skeleton, Table, Td } from "@/components/ui";
import { api } from "@/lib/api";
import { type Leave } from "../_lib";

export function LeaveList({ leaves, loading, disabled, onDone }: { leaves: Leave[]; loading: boolean; disabled: boolean; onDone: () => void }) {
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
export function ParticipantsDialog({ eventId, divisionId, open, onClose, onSaved }: { eventId: string; divisionId: string | null; open: boolean; onClose: () => void; onSaved: () => void }) {
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

"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, QrCode, Search, Signature as SignatureIcon, Trash2 } from "lucide-react";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, EmptyState, ErrorText, Input, PageHeader, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { QrDialog } from "./_components/qr-dialog";
import { SignatureDialog } from "./_components/signature-dialog";
import type { Signature } from "./_lib";

// Tanda tangan elektronik: tiap agenda punya QR sendiri; yang scan diarahkan ke /ttd/<code> untuk verifikasi.
export default function SignaturesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const list = useQuery({ queryKey: ["signatures"], queryFn: () => api<Signature[]>("/signatures") });
  const [editing, setEditing] = useState<Signature | "new" | null>(null);
  const [qr, setQr] = useState<Signature | null>(null);
  const [q, setQ] = useState("");

  const done = { onSuccess: () => qc.invalidateQueries({ queryKey: ["signatures"] }), onError: (e: Error) => toast(e.message, { error: true }) };
  const revoke = useMutation({ mutationFn: (s: Signature) => api(`/signatures/${s.id}`, { method: "PATCH", body: { revoked: !s.revokedAt } }), ...done });
  const del = useMutation({ mutationFn: (id: string) => api(`/signatures/${id}`, { method: "DELETE" }), ...done });

  const rows = (list.data ?? []).filter((s) => !q || `${s.title} ${s.purpose ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader title="Tanda tangan elektronik" desc="Buat QR tanda tangan per agenda. Yang scan akan melihat siapa penanda tangannya dan untuk acara apa."
        actions={<Button onClick={() => setEditing("new")}><Plus size={15} aria-hidden /> Tanda tangan baru</Button>} />
      <ErrorText error={list.error} />
      <Input icon={Search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari agenda…" aria-label="Cari tanda tangan" className="mb-4 sm:w-80" />
      {list.isLoading && <Skeleton className="h-40 rounded-xl" />}
      {list.data?.length === 0 && <EmptyState icon={SignatureIcon} title="Belum ada tanda tangan" desc="Buat satu untuk tiap acara, sertifikat, atau dokumen yang perlu ditandatangani." />}
      <div className="grid gap-2">
        {rows.map((s) => (
          <Card key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[14px] font-medium text-slate-900">
                <span className="truncate">{s.title}</span>
                {s.revokedAt ? <Badge tone="red">Dicabut</Badge> : <Badge tone="green">Berlaku</Badge>}
              </p>
              <p className="mt-0.5 text-[13px] text-slate-600">{s.signerTitle} · {fmtDate(s.signedAt)}</p>
              {s.purpose && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{s.purpose}</p>}
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" onClick={() => setQr(s)}><QrCode size={14} aria-hidden /> QR</Button>
              <Button variant="outline" size="sm" onClick={() => revoke.mutate(s)}>{s.revokedAt ? "Berlakukan" : "Cabut"}</Button>
              <button onClick={() => setEditing(s)} className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={`Ubah ${s.title}`}><Pencil size={15} /></button>
              <button onClick={() => confirm(`Hapus tanda tangan "${s.title}"? QR yang sudah dicetak akan tidak ditemukan. Pilih "Cabut" kalau cukup dinyatakan tidak berlaku.`) && del.mutate(s.id)} className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600" aria-label={`Hapus ${s.title}`}><Trash2 size={15} /></button>
            </div>
          </Card>
        ))}
      </div>
      <SignatureDialog target={editing} onClose={() => setEditing(null)} onCreated={setQr} />
      <QrDialog sig={qr} onClose={() => setQr(null)} />
    </>
  );
}

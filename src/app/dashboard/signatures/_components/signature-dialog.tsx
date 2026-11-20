"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { Button, ErrorText, Field, Input, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { toLocalInput } from "@/lib/format";
import { useMe } from "@/lib/use-me";
import type { Signature } from "../_lib";

// Buat / ubah isi tanda tangan. Kode QR tidak berubah saat diedit, jadi QR yang sudah dicetak tetap menunjuk ke sini.
export function SignatureDialog({ target, onClose, onCreated }: { target: Signature | "new" | null; onClose: () => void; onCreated: (s: Signature) => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: me } = useMe();
  const cur = target && target !== "new" ? target : null;
  const save = useMutation({
    mutationFn: (body: Pick<Signature, "title" | "purpose" | "signerTitle" | "signedAt">) =>
      cur ? api<Signature>(`/signatures/${cur.id}`, { method: "PATCH", body }) : api<Signature>("/signatures", { method: "POST", body }),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ["signatures"] });
      toast(cur ? "Tersimpan" : "Tanda tangan dibuat");
      onClose();
      if (!cur) onCreated(s);
    },
  });
  const defaultTitle = cur?.signerTitle ?? (me ? `${me.position || me.roleName} GenBI` : "");

  return (
    <Dialog open={!!target} onClose={onClose} title={cur ? "Ubah tanda tangan" : "Tanda tangan baru"}
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button type="submit" form="sig-form" loading={save.isPending}>Simpan</Button></>}>
      <form
        id="sig-form"
        key={cur?.id ?? "new"}
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          save.mutate({
            title: String(f.get("title")),
            purpose: String(f.get("purpose")) || null,
            signerTitle: String(f.get("signerTitle")),
            signedAt: new Date(String(f.get("signedAt"))).toISOString(),
          });
        }}
      >
        <Field label="Agenda / acara / dokumen"><Input name="title" required maxLength={150} defaultValue={cur?.title} placeholder="Mis. Sertifikat Seminar Literasi Keuangan 2026" autoFocus /></Field>
        <Field label="Keterangan" hint="Opsional. Dalam rangka apa, nomor surat, dll. Tampil saat QR di-scan.">
          <Textarea name="purpose" rows={3} maxLength={1000} defaultValue={cur?.purpose ?? ""} placeholder="Mis. Penandatanganan sertifikat peserta seminar…" />
        </Field>
        <Field label="Jabatan penanda tangan"><Input name="signerTitle" required maxLength={120} defaultValue={defaultTitle} placeholder="Mis. Ketua Umum GenBI Kepri 2026" /></Field>
        <Field label="Tanggal tanda tangan"><Input name="signedAt" type="datetime-local" required defaultValue={toLocalInput(cur ? new Date(cur.signedAt) : new Date())} /></Field>
        <ErrorText error={save.error} />
      </form>
    </Dialog>
  );
}

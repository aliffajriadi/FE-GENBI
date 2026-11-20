"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Forward, Mail, Paperclip, Search } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { FilePick } from "@/components/file-pick";
import { useToast } from "@/components/toast";
import { Badge, Button, cx, EmptyState, ErrorText, Field, Input, Select, Table, Tabs, Td, Textarea } from "@/components/ui";
import { api, apiPage, openFile, uploadFile } from "@/lib/api";
import { fmtDate, toLocalInput } from "@/lib/format";
import type { Division } from "@/lib/types";
import { type Letter, type UserLite } from "../_lib";

export function Letters({ manage }: { manage: boolean }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [dir, setDir] = useState<"" | "IN" | "OUT">("");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState<"IN" | "OUT" | null>(null);
  const [disp, setDisp] = useState<Letter | null>(null);
  const list = useQuery({ queryKey: ["letters", dir, q], queryFn: () => apiPage<Letter[]>(`/letters?limit=50${dir ? `&direction=${dir}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`), placeholderData: (p) => p });
  const patch = useMutation({
    mutationFn: ({ id, ...body }: { id: string; status: string }) => api(`/letters/${id}`, { method: "PATCH", body }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["letters"] }); toast("Status surat diperbarui"); },
  });
  const rows = list.data?.data ?? [];
  return (
    <>
      <Table
        loading={list.isLoading}
        toolbar={
          <>
            <Tabs value={dir} onChange={setDir} items={[{ value: "", label: "Semua" }, { value: "IN", label: "Masuk" }, { value: "OUT", label: "Keluar" }]} />
            <Input icon={Search} placeholder="Cari perihal, nomor…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-60" aria-label="Cari surat" />
            {manage && (
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setCreating("IN")}><ArrowDownLeft size={14} aria-hidden /> Surat masuk</Button>
                <Button size="sm" onClick={() => setCreating("OUT")}><ArrowUpRight size={14} aria-hidden /> Surat keluar</Button>
              </div>
            )}
          </>
        }
        hideOnMobile={[1, 2]} head={["Surat", "Nomor", "Tanggal", "Status", ""]}
        empty={rows.length === 0 && (
          <EmptyState
            icon={Mail}
            title={q || dir ? "Tidak ada surat yang cocok" : "Belum ada surat"}
            desc="Catat surat masuk (lalu disposisikan ke divisi/orang), atau buat surat keluar. Nomor surat keluar dibuat otomatis, mis. 001/GenBI/XI/2026."
          />
        )}
      >
        {rows.map((l) => (
          <tr key={l.id} className="hover:bg-slate-50/60">
            <Td>
              <span className="flex items-start gap-3">
                <span className={cx("mt-0.5 grid size-7 shrink-0 place-items-center rounded-full", l.direction === "IN" ? "bg-slate-100 text-slate-600" : "bg-blue-50 text-blue-800")}>
                  {l.direction === "IN" ? <ArrowDownLeft size={14} aria-label="Masuk" /> : <ArrowUpRight size={14} aria-label="Keluar" />}
                </span>
                <span>
                  <span className="block font-medium">{l.subject}</span>
                  <span className="text-xs text-slate-500">{l.direction === "IN" ? "Dari" : "Kepada"} {l.counterparty}</span>
                  {l.dispositions.map((d) => <span key={d.id} className="mt-1 block text-xs text-slate-500"><Forward size={11} className="mr-1 inline" aria-hidden />Disposisi ke {d.toUser?.name ?? `Divisi ${d.toDivision?.name}`}{d.note ? `: ${d.note}` : ""}</span>)}
                </span>
              </span>
            </Td>
            <Td className="font-mono text-xs whitespace-nowrap">{l.number ?? "–"}</Td>
            <Td className="whitespace-nowrap text-slate-600">{fmtDate(l.date).split(",")[0]}</Td>
            <Td>
              {manage ? (
                <Select value={l.status} onChange={(e) => patch.mutate({ id: l.id, status: e.target.value })} className="h-8 w-36 text-xs" aria-label="Status surat">
                  {(l.direction === "IN" ? ["RECEIVED", "ARCHIVED"] : ["DRAFT", "SIGNED", "SENT", "ARCHIVED"]).map((s) => <option key={s} value={s}>{{ RECEIVED: "Diterima", ARCHIVED: "Diarsipkan", DRAFT: "Draft", SIGNED: "Ditandatangani", SENT: "Terkirim" }[s]}</option>)}
                </Select>
              ) : <Badge status={l.status} />}
            </Td>
            <Td className="text-right whitespace-nowrap">
              {l.fileUrl && <Button variant="ghost" size="sm" onClick={() => openFile(l.fileUrl!)}><Paperclip size={13} aria-hidden /> File</Button>}
              {manage && l.direction === "IN" && <Button variant="ghost" size="sm" onClick={() => setDisp(l)}><Forward size={13} aria-hidden /> Disposisi</Button>}
            </Td>
          </tr>
        ))}
      </Table>
      <LetterForm direction={creating} onClose={() => setCreating(null)} />
      <DispositionDialog letter={disp} onClose={() => setDisp(null)} />
    </>
  );
}

function LetterForm({ direction, onClose }: { direction: "IN" | "OUT" | null; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => setFile(null), [direction]);
  const save = useMutation({
    mutationFn: async (f: Record<string, string>) => {
      const fileId = file ? (await uploadFile(file)).id : undefined;
      return api<{ number: string }>("/letters", { method: "POST", body: { direction, subject: f.subject, counterparty: f.counterparty, date: new Date(f.date).toISOString(), number: f.number || undefined, fileId } });
    },
    onSuccess: (l) => { qc.invalidateQueries({ queryKey: ["letters"] }); onClose(); toast(direction === "OUT" ? `Surat keluar dibuat: ${l.number}` : "Surat masuk dicatat"); },
  });
  return (
    <Dialog open={!!direction} onClose={onClose} title={direction === "OUT" ? "Surat keluar" : "Catat surat masuk"} desc={direction === "OUT" ? "Nomor surat dibuat otomatis." : undefined}
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button type="submit" form="letter-form" loading={save.isPending}>Simpan</Button></>}>
      <form id="letter-form" key={direction ?? ""} className="grid gap-4" onSubmit={(e) => { e.preventDefault(); save.mutate(Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>); }}>
        <Field label="Perihal"><Input name="subject" required minLength={3} placeholder={direction === "OUT" ? "Undangan seminar literasi keuangan" : "Permohonan narasumber"} autoFocus /></Field>
        <Field label={direction === "OUT" ? "Kepada" : "Pengirim"}><Input name="counterparty" required minLength={2} /></Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tanggal surat"><Input name="date" type="datetime-local" required defaultValue={toLocalInput(new Date())} /></Field>
          {direction === "IN" && <Field label="Nomor surat"><Input name="number" placeholder="Dari pengirim" /></Field>}
        </div>
        <FilePick file={file} onChange={setFile} accept="image/jpeg,image/png,image/webp,application/pdf" label={direction === "OUT" ? "File final (PDF) — opsional" : "Scan surat (PDF/foto)"} />
        <ErrorText error={save.error} />
      </form>
    </Dialog>
  );
}

function DispositionDialog({ letter, onClose }: { letter: Letter | null; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [to, setTo] = useState<"user" | "division">("division");
  const users = useQuery({ queryKey: ["users", "all"], queryFn: () => api<UserLite[]>("/users?limit=100"), enabled: !!letter });
  const divisions = useQuery({ queryKey: ["divisions"], queryFn: () => api<Division[]>("/divisions"), enabled: !!letter });
  const save = useMutation({
    mutationFn: (f: Record<string, string>) => api(`/letters/${letter!.id}/disposition`, { method: "POST", body: { note: f.note || undefined, ...(to === "user" ? { toUserId: f.target } : { toDivisionId: f.target }) } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["letters"] }); onClose(); toast("Disposisi terkirim"); },
  });
  return (
    <Dialog open={!!letter} onClose={onClose} title="Disposisi surat" desc={letter?.subject}
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button type="submit" form="disp-form" loading={save.isPending}>Kirim</Button></>}>
      <form id="disp-form" className="grid gap-4" onSubmit={(e) => { e.preventDefault(); save.mutate(Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>); }}>
        <div><Tabs value={to} onChange={setTo} items={[{ value: "division", label: "Ke divisi" }, { value: "user", label: "Ke orang" }]} /></div>
        <Field label={to === "user" ? "Anggota" : "Divisi"} hint={to === "division" ? "Kepala divisi akan diberi tahu." : undefined}>
          <Select name="target" required key={to} defaultValue="">
            <option value="">Pilih</option>
            {(to === "user" ? users.data : divisions.data)?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </Select>
        </Field>
        <Field label="Instruksi"><Textarea name="note" rows={3} placeholder="Mohon siapkan narasumber dari divisi" /></Field>
        <ErrorText error={save.error} />
      </form>
    </Dialog>
  );
}

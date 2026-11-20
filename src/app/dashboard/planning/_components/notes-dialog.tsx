"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Link2, Pencil, Pin, PinOff, Plus, StickyNote, Trash2 } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { Button, cx, EmptyState, Field, Input, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { useMe } from "@/lib/use-me";
import { type Board, type Note, timeFmt } from "../_lib";

// Catatan & link divisi (mis. link Canva/Drive yang sedang dipakai). Anggota divisi bisa menambah & mengubah; pin = tampil di atas papan.
export function NotesDialog({ open, board, divisionId, onClose }: { open: boolean; board: Board; divisionId: string; onClose: () => void }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<Note | "new" | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["board", divisionId] });
  const save = useMutation({
    mutationFn: (body: Partial<Pick<Note, "title" | "url" | "body" | "pinned">> & { id?: string }) => {
      const { id, ...rest } = body;
      return id ? api(`/board-notes/${id}`, { method: "PATCH", body: rest }) : api(`/boards/${divisionId}/notes`, { method: "POST", body: rest });
    },
    onSuccess: () => { setEditing(null); refresh(); },
    onError: (e) => toast(e.message, { error: true }),
  });
  const del = useMutation({
    mutationFn: (id: string) => api(`/board-notes/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
    onError: (e) => toast(e.message, { error: true }),
  });
  const current = editing && editing !== "new" ? editing : null;
  const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

  return (
    <Dialog open={open} onClose={() => { setEditing(null); onClose(); }} title={`Catatan & link · ${board.division.name}`} size="lg"
      footer={editing
        ? <><Button variant="ghost" onClick={() => setEditing(null)}>Batal</Button><Button type="submit" form="note-form" loading={save.isPending}>Simpan</Button></>
        : board.canEdit ? <Button onClick={() => setEditing("new")}><Plus size={15} aria-hidden /> Tambah</Button> : null}>
      {editing ? (
        <form
          id="note-form"
          key={current?.id ?? "new"}
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            save.mutate({ id: current?.id, title: String(f.get("title")), url: String(f.get("url")), body: String(f.get("body")), pinned: f.get("pinned") === "on" });
          }}
        >
          <Field label="Judul"><Input name="title" required maxLength={120} defaultValue={current?.title} placeholder="Mis. Desain feed Instagram November" autoFocus /></Field>
          <Field label="Link" hint="Opsional. Canva, Google Drive, Docs, Figma, dll."><Input name="url" type="url" maxLength={1000} defaultValue={current?.url ?? ""} placeholder="https://www.canva.com/design/…" /></Field>
          <Field label="Catatan"><Textarea name="body" rows={4} maxLength={2000} defaultValue={current?.body ?? ""} placeholder="Opsional. Mis. siapa yang pegang, ukuran, deadline…" /></Field>
          <label className="flex items-center gap-2 text-[13px] text-slate-700"><input type="checkbox" name="pinned" defaultChecked={current?.pinned ?? true} className="size-4 accent-[var(--primary)]" /> Pin di atas papan</label>
        </form>
      ) : (
        <>
          {!board.notes.length && <EmptyState icon={StickyNote} title="Belum ada catatan" desc="Simpan link Canva, Drive, atau catatan penting divisi di sini." />}
          <ul className="grid gap-2">
            {board.notes.map((n) => (
              <li key={n.id} className={cx("rounded-lg border p-3", n.pinned ? "border-amber-200 bg-amber-50/50" : "border-slate-200")}>
                <div className="flex items-start gap-2">
                  {n.url ? <Link2 size={15} className="mt-0.5 shrink-0 text-slate-400" aria-hidden /> : <StickyNote size={15} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium break-words text-slate-900">{n.title}</p>
                    {n.url && <a href={n.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 text-xs text-primary hover:underline"><span className="truncate">{host(n.url)}</span><ExternalLink size={11} aria-hidden /></a>}
                    {n.body && <p className="mt-1 text-[13px] whitespace-pre-wrap break-words text-slate-600">{n.body}</p>}
                    <p className="mt-1 text-[11px] text-slate-400">{n.createdBy.name} · diperbarui {timeFmt.format(new Date(n.updatedAt))}</p>
                  </div>
                  {board.canEdit && (
                    <span className="flex shrink-0 gap-0.5">
                      <button onClick={() => save.mutate({ id: n.id, pinned: !n.pinned })} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-amber-600" aria-label={n.pinned ? "Lepas pin" : "Pin di atas papan"} title={n.pinned ? "Lepas pin" : "Pin"}>
                        {n.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                      </button>
                      <button onClick={() => setEditing(n)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Ubah catatan"><Pencil size={14} /></button>
                      {(n.createdById === me?.id || board.canManage) && (
                        <button onClick={() => confirm(`Hapus "${n.title}"?`) && del.mutate(n.id)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600" aria-label="Hapus catatan"><Trash2 size={14} /></button>
                      )}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Dialog>
  );
}

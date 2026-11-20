"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Pencil, Send, Trash2 } from "lucide-react";
import { useToast } from "@/components/toast";
import { Avatar, Button, ErrorText, Skeleton, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { useMe } from "@/lib/use-me";
import { type Comment, timeFmt } from "../_lib";

// Diskusi di kartu. Semua yang bisa melihat papan boleh berkomentar; daftar ikut segar lewat event board:changed.
export function Comments({ cardId, divisionId, canModerate }: { cardId: string; divisionId: string; canModerate: boolean }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const toast = useToast();
  const key = ["board", divisionId, "comments", cardId];
  const list = useQuery({ queryKey: key, queryFn: () => api<Comment[]>(`/board-cards/${cardId}/comments`) });
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["board", divisionId] });
  const send = useMutation({
    mutationFn: () => api(`/board-cards/${cardId}/comments`, { method: "POST", body: { body: text } }),
    onSuccess: () => { setText(""); refresh(); },
    onError: (e) => toast(e.message, { error: true }),
  });
  const edit = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => api(`/board-comments/${id}`, { method: "PATCH", body: { body } }),
    onSuccess: () => { setEditing(null); refresh(); },
    onError: (e) => toast(e.message, { error: true }),
  });
  const del = useMutation({
    mutationFn: (id: string) => api(`/board-comments/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
    onError: (e) => toast(e.message, { error: true }),
  });
  const submit = () => text.trim() && !send.isPending && send.mutate();

  return (
    <section className="mt-6 border-t border-slate-100 pt-4" aria-label="Komentar">
      <p className="mb-3 flex items-center gap-1.5 text-[13px] font-medium text-slate-700">
        <MessageSquare size={14} aria-hidden /> Komentar <span className="text-xs font-normal text-slate-500 tabular-nums">{list.data?.length ?? ""}</span>
      </p>
      <ErrorText error={list.error} />
      {list.isLoading && <Skeleton className="h-12 rounded-lg" />}
      <ul className="grid gap-3">
        {list.data?.map((c) => (
          <li key={c.id} className="group flex gap-2.5">
            <Avatar name={c.author.name} src={c.author.avatarUrl} size={28} />
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline gap-2 text-xs">
                <b className="font-medium text-slate-900">{c.author.name}</b>
                <span className="text-slate-400">{timeFmt.format(new Date(c.createdAt))}{c.updatedAt !== c.createdAt && " · diedit"}</span>
                <span className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                  {c.author.id === me?.id && editing !== c.id && <button onClick={() => setEditing(c.id)} className="rounded p-0.5 text-slate-400 hover:text-slate-700" aria-label="Ubah komentar"><Pencil size={12} /></button>}
                  {(c.author.id === me?.id || canModerate) && <button onClick={() => confirm("Hapus komentar ini?") && del.mutate(c.id)} className="rounded p-0.5 text-slate-400 hover:text-red-600" aria-label="Hapus komentar"><Trash2 size={12} /></button>}
                </span>
              </p>
              {editing === c.id ? (
                <Textarea
                  autoFocus
                  rows={2}
                  defaultValue={c.body}
                  maxLength={2000}
                  aria-label="Ubah komentar"
                  className="mt-1 text-[13px]"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") { e.stopPropagation(); setEditing(null); }
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); const v = e.currentTarget.value.trim(); if (v && v !== c.body) edit.mutate({ id: c.id, body: v }); else setEditing(null); }
                  }}
                />
              ) : <p className="mt-0.5 text-[13px] whitespace-pre-wrap break-words text-slate-700">{c.body}</p>}
            </div>
          </li>
        ))}
      </ul>
      {list.data?.length === 0 && <p className="text-xs text-slate-400">Belum ada komentar.</p>}
      <form className="mt-3 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Textarea
          rows={2}
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder="Tulis komentar… (Enter kirim, Shift+Enter baris baru)"
          aria-label="Komentar baru"
          className="flex-1 text-[13px]"
        />
        <Button type="submit" size="sm" loading={send.isPending} disabled={!text.trim()} aria-label="Kirim komentar"><Send size={14} aria-hidden /></Button>
      </form>
    </section>
  );
}

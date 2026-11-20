"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NotebookPen, Plus, Search, X } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { Markdown } from "@/components/markdown";
import { useToast } from "@/components/toast";
import { Avatar, Button, Card, cx, DateTile, EmptyState, ErrorText, Field, Input, Select, Skeleton, Textarea } from "@/components/ui";
import { api, apiPage } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import type { EventItem } from "@/lib/types";
import { useMe } from "@/lib/use-me";
import { type Minute, type UserLite } from "../_lib";

export function Minutes() {
  const { can } = useMe();
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useQuery({ queryKey: ["minutes", q], queryFn: () => apiPage<Minute[]>(`/minutes?limit=50${q ? `&q=${encodeURIComponent(q)}` : ""}`), placeholderData: (p) => p });
  const rows = list.data?.data ?? [];
  const canWrite = can("admin.manage") || can("event.create");
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input icon={Search} placeholder="Cari nama rapat…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-72" aria-label="Cari notulen" />
        {canWrite && <Button className="ml-auto" onClick={() => setCreating(true)}><Plus size={16} aria-hidden /> Tulis notulen</Button>}
      </div>
      {list.isLoading ? <div className="grid gap-3 md:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div> : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={NotebookPen}
            title={q ? "Tidak ada notulen yang cocok" : "Belum ada notulen"}
            desc="Notulen menempel ke kegiatan/rapat. Peserta hadir terisi otomatis dari absensi, dan tugas yang ditulis langsung dikirim ke PIC-nya."
            action={canWrite && !q && <Button variant="outline" onClick={() => setCreating(true)}><Plus size={15} aria-hidden /> Tulis notulen pertama</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {rows.map((m) => {
            const doneN = m.actionItems.filter((a) => a.done).length;
            return (
              <button key={m.id} onClick={() => setOpenId(m.id)} className="group flex gap-4 rounded-xl border border-slate-200/80 bg-white p-4 text-left shadow-xs transition hover:border-slate-300 hover:shadow-sm sm:p-5">
                <div className="self-start"><DateTile date={m.event.startAt} /></div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 group-hover:text-primary">{m.event.title}</p>
                  <p className="text-xs text-slate-500">{m.event.location ?? "Lokasi tidak dicatat"}</p>
                  {m.decisions ? (
                    <p className="mt-2.5 line-clamp-2 rounded-md bg-blue-50/70 px-2.5 py-1.5 text-[13px] text-slate-700"><span className="font-medium text-blue-900">Keputusan: </span>{m.decisions}</p>
                  ) : (
                    <p className="mt-2.5 line-clamp-2 text-[13px] text-slate-600">{m.content.replace(/[#*_>-]/g, "").trim()}</p>
                  )}
                  {m.actionItems.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-green-500" style={{ width: `${(doneN / m.actionItems.length) * 100}%` }} /></div>
                      <span className="text-xs text-slate-500 tabular-nums">{doneN}/{m.actionItems.length} tugas</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
      <MinuteForm open={creating} onClose={() => setCreating(false)} />
      <MinuteDetail id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}

function MinuteForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const events = useQuery({ queryKey: ["events"], queryFn: () => api<EventItem[]>("/events"), enabled: open });
  const users = useQuery({ queryKey: ["members", "picker", ""], queryFn: () => api<UserLite[]>("/members?limit=100"), enabled: open });
  const [items, setItems] = useState<{ title: string; picId: string; dueDate: string }[]>([]);
  useEffect(() => { if (open) setItems([]); }, [open]);
  const save = useMutation({
    mutationFn: (f: Record<string, string>) =>
      api("/minutes", {
        method: "POST",
        body: { eventId: f.eventId, content: f.content, decisions: f.decisions || undefined, actionItems: items.filter((i) => i.title && i.picId).map((i) => ({ ...i, dueDate: i.dueDate ? new Date(i.dueDate).toISOString() : undefined })) },
      }),
    onSuccess: () => { qc.invalidateQueries({ predicate: (x) => ["minutes", "action-items"].includes(x.queryKey[0] as string) }); onClose(); toast("Notulen tersimpan, PIC tugas sudah diberi tahu"); },
  });
  const manageable = events.data?.filter((e) => e.canManage) ?? [];
  return (
    <Dialog open={open} onClose={onClose} variant="sheet" title="Tulis notulen" desc="Peserta hadir diambil otomatis dari absensi kegiatan."
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button type="submit" form="minute-form" loading={save.isPending}>Simpan notulen</Button></>}>
      <form id="minute-form" className="grid gap-5" onSubmit={(e) => { e.preventDefault(); save.mutate(Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>); }}>
        <Field label="Kegiatan / rapat">
          <Select name="eventId" required defaultValue="">
            <option value="">Pilih kegiatan</option>
            {manageable.map((e) => <option key={e.id} value={e.id}>{e.title} · {fmtDate(e.startAt).split(",")[0]}</option>)}
          </Select>
        </Field>
        <Field label="Pembahasan" hint="Mendukung Markdown: ## subjudul, - daftar, **tebal**."><Textarea name="content" required minLength={5} rows={8} placeholder={"## Evaluasi program\n- …"} /></Field>
        <Field label="Keputusan"><Textarea name="decisions" rows={3} placeholder="Seminar literasi keuangan dilaksanakan 20 Desember." /></Field>
        <div className="grid gap-2">
          <div className="flex items-center justify-between"><p className="text-[13px] font-medium text-slate-700">Tugas (action item)</p><Button type="button" size="sm" variant="outline" onClick={() => setItems((x) => [...x, { title: "", picId: "", dueDate: "" }])}><Plus size={13} aria-hidden /> Tugas</Button></div>
          {items.map((it, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_150px_auto]">
              <Input placeholder="Buat poster seminar" value={it.title} onChange={(e) => setItems((x) => x.map((y, j) => (j === i ? { ...y, title: e.target.value } : y)))} aria-label="Judul tugas" className="sm:col-span-3" />
              <Select value={it.picId} onChange={(e) => setItems((x) => x.map((y, j) => (j === i ? { ...y, picId: e.target.value } : y)))} aria-label="PIC">
                <option value="">Pilih PIC</option>
                {users.data?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
              <Input type="datetime-local" value={it.dueDate} onChange={(e) => setItems((x) => x.map((y, j) => (j === i ? { ...y, dueDate: e.target.value } : y)))} aria-label="Tenggat" />
              <Button type="button" variant="ghost" size="icon" onClick={() => setItems((x) => x.filter((_, j) => j !== i))} aria-label="Hapus tugas"><X size={15} /></Button>
            </div>
          ))}
        </div>
        <ErrorText error={save.error} />
      </form>
    </Dialog>
  );
}

export function MinuteDetail({ id, onClose }: { id: string | null; onClose: () => void }) {
  const q = useQuery({ queryKey: ["minute", id], queryFn: () => api<Minute & { present: string[] }>(`/minutes/${id}`), enabled: !!id });
  const m = q.data;
  return (
    <Dialog open={!!id} onClose={onClose} variant="sheet" title={m?.event.title ?? "Notulen"} desc={m ? `${fmtDate(m.event.startAt)}${m.event.location ? ` · ${m.event.location}` : ""}` : undefined}>
      {!m ? <Skeleton className="h-64" /> : (
        <div className="grid gap-6">
          <section><p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Hadir ({m.present.length})</p><p className="text-[13px] text-slate-700">{m.present.join(", ") || "–"}</p></section>
          <section><p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Pembahasan</p><Markdown>{m.content}</Markdown></section>
          {m.decisions && <section className="rounded-lg bg-blue-50/60 p-4"><p className="mb-1 text-xs font-semibold tracking-wide text-blue-900 uppercase">Keputusan</p><p className="text-[14px] whitespace-pre-line text-slate-800">{m.decisions}</p></section>}
          {m.actionItems.length > 0 && (
            <section>
              <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Tugas</p>
              <ul className="grid gap-2">
                {m.actionItems.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-[13px]">
                    <Avatar name={a.pic.name} size={24} />
                    <span className={cx("flex-1", a.done && "text-slate-400 line-through")}>{a.title}</span>
                    <span className="text-xs text-slate-500">{a.pic.name}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Dialog>
  );
}

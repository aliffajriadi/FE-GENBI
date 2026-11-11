"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, CheckSquare, FileText, FolderOpen, Forward, NotebookPen, Paperclip, Plus, Search, Trash2, X } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { FilePick } from "@/components/file-pick";
import { Markdown } from "@/components/markdown";
import { useToast } from "@/components/toast";
import { Avatar, Badge, Button, Card, cx, EmptyState, ErrorText, Field, Input, PageHeader, Select, Skeleton, Table, Tabs, Td, Textarea } from "@/components/ui";
import { api, apiPage, openFile, uploadFile } from "@/lib/api";
import { fmtDate, initialTab, toLocalInput } from "@/lib/format";
import type { Division, EventItem } from "@/lib/types";
import { useMe } from "@/lib/use-me";

const TABS = ["tasks", "minutes", "letters", "docs"] as const;
type Tab = (typeof TABS)[number];
type UserLite = { id: string; name: string };

export default function AdminPage() {
  const { can } = useMe();
  const [tab, setTab] = useState<Tab>("tasks");
  useEffect(() => setTab(initialTab(TABS, "tasks")), []);
  const items = [
    { value: "tasks" as const, label: "Tugas" },
    { value: "minutes" as const, label: "Notulen" },
    ...(can("admin.read") ? [{ value: "letters" as const, label: "Surat" }] : []),
    { value: "docs" as const, label: "Arsip dokumen" },
  ];
  return (
    <>
      <PageHeader title="Administrasi" desc="Tugas hasil rapat, notulen, surat-menyurat, dan arsip dokumen organisasi." />
      <div className="mb-6"><Tabs value={tab} onChange={setTab} items={items} /></div>
      {tab === "tasks" && <Tasks />}
      {tab === "minutes" && <Minutes />}
      {tab === "letters" && can("admin.read") && <Letters manage={can("admin.manage")} />}
      {tab === "docs" && <Docs manage={can("admin.manage")} />}
    </>
  );
}

// ───── Tugas (action item) ─────

type Task = { id: string; title: string; dueDate: string | null; done: boolean; pic: UserLite; minute: { id: string; event: { title: string; startAt: string } } };

function Tasks() {
  const qc = useQueryClient();
  const { can } = useMe();
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const q = useQuery({ queryKey: ["action-items", scope], queryFn: () => api<Task[]>(`/action-items?scope=${scope}`) });
  const toggle = useMutation({
    mutationFn: (t: Task) => api(`/action-items/${t.id}`, { method: "PATCH", body: { done: !t.done } }),
    onSuccess: () => qc.invalidateQueries({ predicate: (x) => ["action-items", "dashboard"].includes(x.queryKey[0] as string) }),
  });
  const open = q.data?.filter((t) => !t.done) ?? [];
  const done = q.data?.filter((t) => t.done) ?? [];
  const canToggle = (t: Task) => scope === "mine" || can("admin.manage");

  const row = (t: Task) => {
    const late = !t.done && t.dueDate && new Date(t.dueDate) < new Date();
    return (
      <li key={t.id} className="flex items-start gap-3 px-5 py-3.5">
        <button
          disabled={!canToggle(t)}
          onClick={() => toggle.mutate(t)}
          aria-pressed={t.done}
          aria-label={t.done ? `Tandai ${t.title} belum selesai` : `Tandai ${t.title} selesai`}
          className={cx("mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition", t.done ? "border-green-600 bg-green-600 text-white" : "border-slate-300 hover:border-slate-400")}
        >
          {t.done && <CheckSquare size={12} />}
        </button>
        <div className="min-w-0 flex-1">
          <p className={cx("text-[14px]", t.done ? "text-slate-400 line-through" : "font-medium text-slate-900")}>{t.title}</p>
          <p className="mt-0.5 text-xs text-slate-500">Dari {t.minute.event.title}{scope === "all" ? ` · PIC ${t.pic.name}` : ""}</p>
        </div>
        {t.dueDate && <span className={cx("shrink-0 text-xs", late ? "font-medium text-red-600" : "text-slate-500")}>{late ? "Lewat " : ""}{fmtDate(t.dueDate).split(",")[0]}</span>}
      </li>
    );
  };

  return (
    <div className="grid gap-4">
      {can("admin.read") && <div><Tabs value={scope} onChange={setScope} items={[{ value: "mine", label: "Tugas saya" }, { value: "all", label: "Semua tugas" }]} /></div>}
      <Card>
        {q.isLoading ? <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div> : !q.data?.length ? (
          <EmptyState icon={CheckSquare} title="Tidak ada tugas" desc="Tugas muncul saat notulen rapat menunjuk Anda sebagai PIC." />
        ) : (
          <>
            <ul className="divide-y divide-slate-100">{open.map(row)}</ul>
            {done.length > 0 && (
              <details className="border-t border-slate-100">
                <summary className="cursor-pointer px-5 py-3 text-[13px] text-slate-500 hover:text-slate-900">{done.length} tugas selesai</summary>
                <ul className="divide-y divide-slate-100">{done.map(row)}</ul>
              </details>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

// ───── Notulen ─────

type Minute = { id: string; content: string; decisions: string | null; createdAt: string; event: { id: string; title: string; startAt: string; location: string | null }; actionItems: { id: string; title: string; done: boolean; dueDate: string | null; pic: UserLite }[] };

function Minutes() {
  const { can } = useMe();
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useQuery({ queryKey: ["minutes", q], queryFn: () => apiPage<Minute[]>(`/minutes?limit=50${q ? `&q=${encodeURIComponent(q)}` : ""}`), placeholderData: (p) => p });
  const rows = list.data?.data ?? [];
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input icon={Search} placeholder="Cari rapat…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-64" aria-label="Cari notulen" />
        {(can("admin.manage") || can("event.create")) && <Button className="ml-auto" onClick={() => setCreating(true)}><Plus size={16} aria-hidden /> Tulis notulen</Button>}
      </div>
      {list.isLoading ? <Skeleton className="h-40 rounded-xl" /> : rows.length === 0 ? (
        <Card><EmptyState icon={NotebookPen} title="Belum ada notulen" desc="Notulen terhubung ke kegiatan; peserta hadir terisi otomatis dari absensi." /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((m) => (
            <Card key={m.id} className="cursor-pointer p-5 transition hover:border-slate-300" onClick={() => setOpenId(m.id)}>
              <p className="text-xs text-slate-500">{fmtDate(m.event.startAt)}</p>
              <p className="mt-1 font-semibold">{m.event.title}</p>
              <p className="mt-2 line-clamp-2 text-[13px] text-slate-600">{m.decisions || m.content}</p>
              {m.actionItems.length > 0 && <p className="mt-3 text-xs text-slate-500">{m.actionItems.filter((a) => a.done).length}/{m.actionItems.length} tugas selesai</p>}
            </Card>
          ))}
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
  const users = useQuery({ queryKey: ["users", "all"], queryFn: () => api<UserLite[]>("/users?limit=100"), enabled: open });
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

function MinuteDetail({ id, onClose }: { id: string | null; onClose: () => void }) {
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

// ───── Surat ─────

type Letter = { id: string; direction: "IN" | "OUT"; number: string | null; subject: string; counterparty: string; date: string; fileUrl: string | null; status: string; dispositions: { id: string; note: string | null; toUser: { name: string } | null; toDivision: { name: string } | null }[] };

function Letters({ manage }: { manage: boolean }) {
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
        head={["Surat", "Nomor", "Tanggal", "Status", ""]}
        empty={rows.length === 0 && <EmptyState icon={FileText} title="Belum ada surat" desc="Nomor surat keluar dibuat otomatis berurutan per tahun." />}
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
        <div className="grid gap-4 sm:grid-cols-2">
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

// ───── Arsip dokumen ─────

type Doc = { id: string; title: string; category: string; fileUrl: string; visibility: "PENGURUS" | "SEMUA"; createdAt: string; period: { name: string } | null };

function Docs({ manage }: { manage: boolean }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const list = useQuery({
    queryKey: ["documents", cat, q],
    queryFn: () => api<{ items: Doc[]; categories: { name: string; count: number }[] }>(`/documents?${new URLSearchParams({ ...(cat && { category: cat }), ...(q && { q }) })}`),
    placeholderData: (p) => p,
  });
  const save = useMutation({
    mutationFn: async (f: Record<string, string>) => {
      if (!file) throw new Error("Pilih file dokumen");
      const up = await uploadFile(file);
      return api("/documents", { method: "POST", body: { title: f.title, category: f.category, visibility: f.visibility, fileId: up.id } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documents"] }); setAdding(false); setFile(null); toast("Dokumen diarsipkan"); },
  });
  const del = useMutation({ mutationFn: (id: string) => api(`/documents/${id}`, { method: "DELETE" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }) });
  const items = list.data?.items ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <Card className="self-start p-2">
        <button onClick={() => setCat("")} className={cx("flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px]", !cat ? "bg-accent font-medium text-accent-foreground" : "hover:bg-slate-50")}>Semua dokumen</button>
        {list.data?.categories.map((c) => (
          <button key={c.name} onClick={() => setCat(c.name)} className={cx("flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px]", cat === c.name ? "bg-accent font-medium text-accent-foreground" : "text-slate-600 hover:bg-slate-50")}>
            <span className="flex items-center gap-2"><FolderOpen size={14} aria-hidden /> {c.name}</span><span className="text-xs text-slate-400">{c.count}</span>
          </button>
        ))}
      </Card>
      <Table
        loading={list.isLoading}
        toolbar={<><Input icon={Search} placeholder="Cari dokumen…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-64" aria-label="Cari dokumen" />{manage && <Button size="sm" className="ml-auto" onClick={() => setAdding(true)}><Plus size={14} aria-hidden /> Upload dokumen</Button>}</>}
        head={["Dokumen", "Kategori", "Akses", ""]}
        empty={items.length === 0 && <EmptyState icon={FolderOpen} title="Belum ada dokumen" desc="Simpan SK, AD/ART, proposal, dan LPJ di sini supaya mudah dicari." />}
      >
        {items.map((d) => (
          <tr key={d.id} className="group hover:bg-slate-50/60">
            <Td><button onClick={() => openFile(d.fileUrl).catch((e) => toast(e.message, { error: true }))} className="flex items-center gap-3 text-left font-medium hover:text-primary"><FileText size={16} className="text-slate-400" aria-hidden />{d.title}</button>{d.period && <span className="ml-7 text-xs text-slate-500">Periode {d.period.name}</span>}</Td>
            <Td className="text-slate-600">{d.category}</Td>
            <Td>{d.visibility === "SEMUA" ? <Badge tone="blue">Semua anggota</Badge> : <Badge tone="slate">Pengurus</Badge>}</Td>
            <Td className="text-right">{manage && <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => confirm(`Hapus ${d.title}?`) && del.mutate(d.id)} aria-label={`Hapus ${d.title}`}><Trash2 size={14} /></Button>}</Td>
          </tr>
        ))}
      </Table>
      <Dialog open={adding} onClose={() => setAdding(false)} title="Upload dokumen"
        footer={<><Button variant="ghost" onClick={() => setAdding(false)}>Batal</Button><Button type="submit" form="doc-form" loading={save.isPending}>Simpan</Button></>}>
        <form id="doc-form" className="grid gap-4" onSubmit={(e) => { e.preventDefault(); save.mutate(Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>); }}>
          <Field label="Judul"><Input name="title" required minLength={2} placeholder="SK Kepengurusan 2026/2027" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kategori"><Input name="category" required list="doc-cats" placeholder="SK" /></Field>
            <datalist id="doc-cats">{["SK", "AD/ART", "Proposal", "LPJ", "Template", "Organisasi"].map((c) => <option key={c} value={c} />)}</datalist>
            <Field label="Bisa dilihat"><Select name="visibility" defaultValue="PENGURUS"><option value="PENGURUS">Pengurus saja</option><option value="SEMUA">Semua anggota</option></Select></Field>
          </div>
          <FilePick file={file} onChange={setFile} accept="application/pdf,image/jpeg,image/png" label="PDF atau gambar, maks 5 MB" />
          <ErrorText error={save.error} />
        </form>
      </Dialog>
    </div>
  );
}

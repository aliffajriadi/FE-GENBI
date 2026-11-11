"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Check, Download, FileImage, FileText, FolderOpen, Forward, ListChecks, Lock, Mail, NotebookPen, Paperclip, Plus, Search, Trash2, Users, X, type LucideIcon } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { FilePick } from "@/components/file-pick";
import { Markdown } from "@/components/markdown";
import { useToast } from "@/components/toast";
import { Avatar, Badge, Button, Card, cx, DateTile, EmptyState, ErrorText, Field, Input, PageHeader, Select, Skeleton, Table, Tabs, Td, Textarea } from "@/components/ui";
import { api, apiPage, openFile, uploadFile } from "@/lib/api";
import { fmtDate, initialTab, toLocalInput } from "@/lib/format";
import type { Division, EventItem } from "@/lib/types";
import { useMe } from "@/lib/use-me";

const TABS = ["tasks", "minutes", "letters", "docs"] as const;
type Tab = (typeof TABS)[number];
type UserLite = { id: string; name: string };

const dayShort = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
// Sisa hari ke tenggat dalam kata-kata.
function dueText(iso: string) {
  const days = Math.round((new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 864e5);
  if (days === 0) return "hari ini";
  if (days === 1) return "besok";
  if (days < 0) return `telat ${-days} hari`;
  return days <= 7 ? `${days} hari lagi` : dayShort(iso);
}

export default function AdminPage() {
  const { can } = useMe();
  const [tab, setTab] = useState<Tab>("tasks");
  useEffect(() => setTab(initialTab(TABS, "tasks")), []);
  // Angka kecil di tiap modul supaya langsung kelihatan mana yang perlu perhatian.
  const tasks = useQuery({ queryKey: ["action-items", "mine"], queryFn: () => api<Task[]>("/action-items?scope=mine") });
  const minutes = useQuery({ queryKey: ["minutes", "count"], queryFn: () => apiPage<Minute[]>("/minutes?limit=1") });
  const letters = useQuery({ queryKey: ["letters", "count"], queryFn: () => apiPage<Letter[]>("/letters?limit=1"), enabled: can("admin.read") });
  const docs = useQuery({ queryKey: ["documents", "count"], queryFn: () => api<{ items: Doc[] }>("/documents") });
  const openTasks = tasks.data?.filter((t) => !t.done) ?? [];
  const lateTasks = openTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date()).length;

  const modules: { value: Tab; label: string; desc: string; icon: LucideIcon; tone: string; stat: string }[] = [
    { value: "tasks", label: "Tugas saya", desc: "Tugas dari hasil rapat", icon: ListChecks, tone: "bg-blue-50 text-blue-700", stat: tasks.data ? (openTasks.length ? `${openTasks.length} aktif${lateTasks ? ` · ${lateTasks} telat` : ""}` : tasks.data.length ? "Semua beres" : "Belum ada tugas") : "…" },
    { value: "minutes", label: "Notulen", desc: "Catatan & keputusan rapat", icon: NotebookPen, tone: "bg-violet-50 text-violet-700", stat: minutes.data ? `${minutes.data.meta.total ?? 0} notulen` : "…" },
    ...(can("admin.read") ? [{ value: "letters" as const, label: "Surat", desc: "Surat masuk & keluar", icon: Mail, tone: "bg-amber-50 text-amber-700", stat: letters.data ? `${letters.data.meta.total ?? 0} surat` : "…" }] : []),
    { value: "docs", label: "Arsip", desc: "Dokumen: SK, AD/ART, proposal, LPJ", icon: FolderOpen, tone: "bg-emerald-50 text-emerald-700", stat: docs.data ? `${docs.data.items.length} dokumen` : "…" },
  ];

  return (
    <>
      <PageHeader title="Administrasi" desc="Semua urusan kesekretariatan di satu tempat: tugas hasil rapat, notulen, surat-menyurat, dan arsip dokumen." />
      <nav className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Modul administrasi">
        {modules.map((m) => {
          const on = tab === m.value;
          return (
            <button
              key={m.value}
              onClick={() => setTab(m.value)}
              aria-current={on ? "page" : undefined}
              className={cx(
                "flex min-w-0 items-start gap-3 rounded-xl border bg-white p-3.5 text-left shadow-xs transition sm:p-4",
                on ? "border-primary ring-1 ring-primary" : "border-slate-200/80 hover:border-slate-300 hover:shadow-sm",
              )}
            >
              <span className={cx("grid size-9 shrink-0 place-items-center rounded-lg sm:size-10", m.tone)}><m.icon size={18} aria-hidden /></span>
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-semibold text-slate-900">{m.label}</span>
                <span className="hidden truncate text-xs text-slate-500 sm:block">{m.desc}</span>
                <span className={cx("mt-1 block truncate text-xs font-medium", m.value === "tasks" && lateTasks ? "text-red-600" : "text-slate-600")}>{m.stat}</span>
              </span>
            </button>
          );
        })}
      </nav>
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
  const [openMinute, setOpenMinute] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["action-items", scope], queryFn: () => api<Task[]>(`/action-items?scope=${scope}`) });
  const toggle = useMutation({
    mutationFn: (t: Task) => api(`/action-items/${t.id}`, { method: "PATCH", body: { done: !t.done } }),
    onSuccess: () => qc.invalidateQueries({ predicate: (x) => ["action-items", "dashboard"].includes(x.queryKey[0] as string) }),
  });
  const all = q.data ?? [];
  const open = all.filter((t) => !t.done);
  const done = all.filter((t) => t.done);
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 864e5);
  // Kelompok berdasarkan urgensi supaya yang mendesak ada di atas.
  const groups = [
    { key: "late", title: "Terlambat", tone: "text-red-600", items: open.filter((t) => t.dueDate && new Date(t.dueDate) < now) },
    { key: "week", title: "7 hari ke depan", tone: "text-amber-700", items: open.filter((t) => t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= weekEnd) },
    { key: "later", title: "Nanti & tanpa tenggat", tone: "text-slate-500", items: open.filter((t) => !t.dueDate || new Date(t.dueDate) > weekEnd) },
  ].filter((g) => g.items.length);
  const canToggle = () => scope === "mine" || can("admin.manage");

  const row = (t: Task) => {
    const late = !t.done && !!t.dueDate && new Date(t.dueDate) < now;
    return (
      <li key={t.id} className="group flex items-center gap-3 px-4 py-3 sm:px-5">
        <button
          disabled={!canToggle()}
          onClick={() => toggle.mutate(t)}
          aria-pressed={t.done}
          aria-label={t.done ? `Tandai ${t.title} belum selesai` : `Tandai ${t.title} selesai`}
          className={cx("grid size-[22px] shrink-0 place-items-center rounded-full border-2 transition", t.done ? "border-green-600 bg-green-600 text-white" : "border-slate-300 text-transparent hover:border-green-500 hover:text-green-500")}
        >
          <Check size={13} strokeWidth={3} />
        </button>
        <div className="min-w-0 flex-1">
          <p className={cx("text-[14px] leading-snug", t.done ? "text-slate-400 line-through" : "font-medium text-slate-900")}>{t.title}</p>
          <button onClick={() => setOpenMinute(t.minute.id)} className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-xs text-slate-500 hover:text-primary">
            <NotebookPen size={11} aria-hidden /> <span className="truncate">{t.minute.event.title}</span>
          </button>
        </div>
        {scope === "all" && <span title={`PIC: ${t.pic.name}`}><Avatar name={t.pic.name} size={26} /></span>}
        {t.dueDate && !t.done && (
          <span className={cx("shrink-0 rounded-md px-2 py-0.5 text-xs font-medium", late ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600")}>{dueText(t.dueDate)}</span>
        )}
      </li>
    );
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {can("admin.read") && <Tabs value={scope} onChange={setScope} items={[{ value: "mine", label: "Tugas saya" }, { value: "all", label: "Semua tugas" }]} />}
        {all.length > 0 && (
          <div className="flex min-w-48 flex-1 items-center gap-3 sm:max-w-xs">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200/70"><div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${(done.length / all.length) * 100}%` }} /></div>
            <span className="shrink-0 text-xs text-slate-600 tabular-nums">{done.length}/{all.length} selesai</span>
          </div>
        )}
      </div>
      {q.isLoading ? <Card className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</Card> : !all.length ? (
        <Card><EmptyState icon={ListChecks} title="Belum ada tugas" desc="Tugas muncul otomatis saat notulen rapat menunjuk Anda sebagai PIC. Centang bulatannya kalau sudah selesai." /></Card>
      ) : (
        <>
          {!open.length && <Card className="flex items-center gap-3 border-green-200 bg-green-50/40 p-4 text-[14px] text-green-800"><Check size={18} aria-hidden /> Semua tugas sudah selesai. Mantap!</Card>}
          {groups.map((g) => (
            <Card key={g.key}>
              <p className={cx("border-b border-slate-100 px-5 py-2.5 text-xs font-semibold tracking-wide uppercase", g.tone)}>{g.title} · {g.items.length}</p>
              <ul className="divide-y divide-slate-100">{g.items.map(row)}</ul>
            </Card>
          ))}
          {done.length > 0 && (
            <Card>
              <details>
                <summary className="cursor-pointer px-5 py-3 text-[13px] text-slate-500 hover:text-slate-900">Lihat {done.length} tugas selesai</summary>
                <ul className="divide-y divide-slate-100 border-t border-slate-100">{done.map(row)}</ul>
              </details>
            </Card>
          )}
        </>
      )}
      <MinuteDetail id={openMinute} onClose={() => setOpenMinute(null)} />
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
  const cats = list.data?.categories ?? [];
  const isImage = (d: Doc) => /\.(png|jpe?g|webp)$/i.test(d.title) || d.category.toLowerCase().includes("foto");

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input icon={Search} placeholder="Cari judul dokumen…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-72" aria-label="Cari dokumen" />
        {manage && <Button className="ml-auto" onClick={() => setAdding(true)}><Plus size={16} aria-hidden /> Upload dokumen</Button>}
      </div>
      {cats.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none]" role="group" aria-label="Kategori">
          {[{ name: "", label: "Semua", count: cats.reduce((a, c) => a + c.count, 0) }, ...cats.map((c) => ({ name: c.name, label: c.name, count: c.count }))].map((c) => (
            <button key={c.label} onClick={() => setCat(c.name)} aria-pressed={cat === c.name}
              className={cx("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] transition", cat === c.name ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900")}>
              {c.name && <FolderOpen size={13} aria-hidden />}{c.label}<span className={cx("text-xs tabular-nums", cat === c.name ? "text-white/80" : "text-slate-400")}>{c.count}</span>
            </button>
          ))}
        </div>
      )}
      {list.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderOpen}
            title={q || cat ? "Tidak ada dokumen yang cocok" : "Arsip masih kosong"}
            desc="Simpan SK, AD/ART, proposal, LPJ, dan template di sini supaya mudah dicari pengurus berikutnya."
            action={manage && !q && !cat && <Button variant="outline" onClick={() => setAdding(true)}><Plus size={15} aria-hidden /> Upload dokumen pertama</Button>}
          />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((d) => (
            <li key={d.id} className="group relative flex gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-slate-300 hover:shadow-sm">
              <span className={cx("grid size-11 shrink-0 place-items-center rounded-lg", isImage(d) ? "bg-sky-50 text-sky-700" : "bg-red-50 text-red-600")}>
                {isImage(d) ? <FileImage size={20} aria-hidden /> : <FileText size={20} aria-hidden />}
              </span>
              <div className="min-w-0 flex-1">
                <button onClick={() => openFile(d.fileUrl).catch((e) => toast(e.message, { error: true }))} className="block text-left text-[14px] leading-snug font-medium text-slate-900 after:absolute after:inset-0 hover:text-primary">
                  {d.title}
                </button>
                <p className="mt-1 text-xs text-slate-500">{d.category}{d.period ? ` · ${d.period.name}` : ""} · {dayShort(d.createdAt)}</p>
                <p className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-medium">
                  {d.visibility === "SEMUA"
                    ? <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-blue-700"><Users size={11} aria-hidden /> Semua anggota</span>
                    : <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-600"><Lock size={11} aria-hidden /> Pengurus saja</span>}
                </p>
              </div>
              <span className="relative z-10 flex flex-col items-end gap-1">
                <button onClick={() => openFile(d.fileUrl).catch((e) => toast(e.message, { error: true }))} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={`Buka ${d.title}`}><Download size={15} /></button>
                {manage && <button onClick={() => confirm(`Hapus ${d.title}?`) && del.mutate(d.id)} className="rounded-md p-1.5 text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 focus:opacity-100" aria-label={`Hapus ${d.title}`}><Trash2 size={15} /></button>}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={adding} onClose={() => setAdding(false)} title="Upload dokumen"
        footer={<><Button variant="ghost" onClick={() => setAdding(false)}>Batal</Button><Button type="submit" form="doc-form" loading={save.isPending}>Simpan</Button></>}>
        <form id="doc-form" className="grid gap-4" onSubmit={(e) => { e.preventDefault(); save.mutate(Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>); }}>
          <Field label="Judul"><Input name="title" required minLength={2} placeholder="SK Kepengurusan 2026/2027" /></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Kategori"><Input name="category" required list="doc-cats" placeholder="SK" /></Field>
            <datalist id="doc-cats">{["SK", "AD/ART", "Proposal", "LPJ", "Template", "Organisasi"].map((c) => <option key={c} value={c} />)}</datalist>
            <Field label="Bisa dilihat"><Select name="visibility" defaultValue="PENGURUS"><option value="PENGURUS">Pengurus saja</option><option value="SEMUA">Semua anggota</option></Select></Field>
          </div>
          <FilePick file={file} onChange={setFile} accept="application/pdf,image/jpeg,image/png" label="PDF atau gambar · maks 2 MB (gambar otomatis dikecilkan)" />
          <ErrorText error={save.error} />
        </form>
      </Dialog>
    </div>
  );
}

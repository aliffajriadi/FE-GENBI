"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowUp, Check, Copy, Download, ExternalLink, Infinity as InfinityIcon, MessageSquareText, MoreHorizontal, Plus, Search, Trash2, X } from "lucide-react";
import { useConfirm } from "@/components/confirm";
import { Menu, MenuItem } from "@/components/menu";
import { QuestionEditor } from "@/components/question-editor";
import { useToast } from "@/components/toast";
import { Avatar, Button, Card, cx, EmptyState, ErrorText, Field, Input, Skeleton, Tabs, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { answerText, download, rid, toCsv, type Answer, type Question } from "@/lib/forms";
import { GROUP_TONES, slotWaText, type SlotPerson } from "@/lib/slots";

type Entry = { id: string; createdAt: string; answers: Record<string, Answer> | null; user: SlotPerson };
type Group = { id: string; name: string; description: string | null; capacity: number | null; entries: Entry[] };
type List = { id: string; slug: string; title: string; description: string | null; optionNoun: string; joinLabel: string; questions: Question[] | null; isOpen: boolean; closesAt: string | null; groups: Group[] };
// Draf pilihan: id kosong = pilihan baru (key lokal untuk React).
type DraftGroup = { id?: string; key: string; name: string; description: string | null; capacity: number | null };
type Draft = Omit<List, "id" | "groups" | "questions"> & { questions: Question[]; groups: DraftGroup[] };
type Tab = "options" | "questions" | "people" | "settings";

const timeFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const toLocal = (iso: string) => { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); };
const pick = (l: List): Draft => ({
  slug: l.slug, title: l.title, description: l.description, optionNoun: l.optionNoun, joinLabel: l.joinLabel, questions: l.questions ?? [], isOpen: l.isOpen, closesAt: l.closesAt,
  groups: l.groups.map((g) => ({ id: g.id, key: g.id, name: g.name, description: g.description, capacity: g.capacity })),
});
// Saran pertanyaan cepat di tab Pertanyaan.
const QUICK_QUESTIONS: Omit<Question, "id">[] = [
  { type: "SHORT", label: "No. WhatsApp", required: true },
  { type: "PARAGRAPH", label: "Alasan ikut", required: true },
  { type: "SHORT", label: "Catatan", required: false },
  { type: "DROPDOWN", label: "Ukuran baju", required: true, options: ["S", "M", "L", "XL"] },
];

export default function SlotEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const list = useQuery({ queryKey: ["slot", id], queryFn: () => api<List>(`/slots/${id}`), refetchInterval: 15_000 });
  const l = list.data;
  const [tab, setTab] = useState<Tab>("options");
  const [draft, setDraft] = useState<Draft | null>(null);
  // Draf diisi saat pertama dimuat / setelah simpan saja, supaya refetch berkala (peserta baru) tidak menimpa ketikan.
  useEffect(() => { if (l && !draft) setDraft(pick(l)); }, [l, draft]);
  const dirty = !!l && !!draft && JSON.stringify(pick(l)) !== JSON.stringify(draft);
  const set = (p: Partial<Draft>) => setDraft((d) => d && { ...d, ...p });
  const setG = (key: string, p: Partial<DraftGroup>) => set({ groups: draft!.groups.map((g) => (g.key === key ? { ...g, ...p } : g)) });
  const swap = <T,>(arr: T[], i: number, d: number) => { const a = [...arr]; [a[i], a[i + d]] = [a[i + d], a[i]]; return a; };

  const save = useMutation({
    mutationFn: () => api(`/slots/${id}`, { method: "PATCH", body: { ...draft!, groups: draft!.groups.map(({ id, name, description, capacity }) => ({ id, name, description, capacity })) } }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["slot", id] }); setDraft(null); qc.invalidateQueries({ queryKey: ["slots"] }); toast("Perubahan disimpan"); },
    onError: (e) => toast(e.message, { error: true }),
  });
  const del = useMutation({
    mutationFn: () => api(`/slots/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["slots"] }); toast("List dihapus"); router.replace("/dashboard/slots"); },
    onError: (e) => toast(e.message, { error: true }),
  });
  const kick = useMutation({
    mutationFn: (entryId: string) => api(`/slot-entries/${entryId}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["slot", id] }); toast("Peserta dikeluarkan"); },
    onError: (e) => toast(e.message, { error: true }),
  });

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  // Ctrl/Cmd+S untuk simpan.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); if (dirty && !save.isPending) save.mutate(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, save]);

  if (list.error) return <ErrorText error={list.error} />;
  if (!l || !draft) return <Skeleton className="h-96 rounded-xl" />;

  const link = `${location.origin}/s/${l.slug}`;
  const people = l.groups.reduce((n, g) => n + g.entries.length, 0);
  const cap = l.groups.every((g) => g.capacity != null) ? l.groups.reduce((n, g) => n + g.capacity!, 0) : null;
  const open = l.isOpen && (!l.closesAt || new Date(l.closesAt) > new Date());
  const views = l.groups.map((g) => ({ ...g, members: g.entries.map((e) => e.user) }));
  const copy = (text: string, msg: string) => navigator.clipboard.writeText(text).then(() => toast(msg));
  const qs = l.questions ?? [];
  const askDelete = async () => {
    if (await confirm({ title: `Hapus "${l.title}"?`, desc: `Semua pilihan dan ${people} peserta ikut terhapus. Link yang sudah disebar tidak berlaku lagi.`, confirmLabel: "Hapus list", danger: true })) del.mutate();
  };
  const askRemoveGroup = async (g: DraftGroup, taken: number) => {
    if (taken && !(await confirm({ title: `Hapus "${g.name}"?`, desc: `Sudah dipilih ${taken} orang. Mereka ikut terhapus setelah kamu menekan Simpan.`, confirmLabel: "Hapus pilihan", danger: true }))) return;
    set({ groups: draft.groups.filter((x) => x.key !== g.key) });
  };
  const askKick = async (e: Entry) => {
    if (await confirm({ title: `Keluarkan ${e.user.name}?`, desc: "Namanya dihapus dari list beserta jawabannya. Dia masih bisa memilih lagi selama list dibuka.", confirmLabel: "Keluarkan", danger: true })) kick.mutate(e.id);
  };
  const exportCsv = () => download(`${l.slug}.csv`, toCsv([
    [l.optionNoun, "Nama", "Waktu", ...qs.map((q) => q.label)],
    ...l.groups.flatMap((g) => g.entries.map((e) => [g.name, e.user.name, timeFmt.format(new Date(e.createdAt)), ...qs.map((q) => answerText(e.answers?.[q.id]))])),
  ]));

  return (
    <div className="mx-auto max-w-5xl">
      {/* Bilah atas lengket: judul, status, aksi utama */}
      <div className="sticky top-14 z-20 -mx-4 mb-4 border-b border-slate-200/70 bg-background/90 px-4 py-2.5 backdrop-blur-sm sm:top-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/slots" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Semua list"><ArrowLeft size={17} /></Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-slate-900">{draft.title || "Tanpa judul"}</p>
            <p className="text-xs text-slate-500">{open ? <span className="text-green-700">● Dibuka</span> : <span>● Ditutup</span>} · {cap != null ? `${people}/${cap} terisi` : `${people} orang`}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => copy(link, "Link disalin")}><Copy size={13} aria-hidden /> <span className="hidden sm:inline">Salin link</span></Button>
          <Button variant="outline" size="sm" onClick={() => copy(slotWaText(l.title, views, link), "Teks disalin, tinggal tempel di WA")}><MessageSquareText size={13} aria-hidden /> <span className="hidden sm:inline">Teks WA</span></Button>
          <a href={`/s/${l.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Buka halaman peserta" title="Buka halaman peserta"><ExternalLink size={15} /></a>
          <Button size="sm" onClick={() => save.mutate()} loading={save.isPending} disabled={!dirty} title="Ctrl+S">{dirty ? "Simpan" : <><Check size={14} aria-hidden /> Tersimpan</>}</Button>
          <Menu trigger={() => <button className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Opsi lain"><MoreHorizontal size={17} /></button>}>
            <MenuItem icon={Download} onClick={exportCsv}>Unduh CSV</MenuItem>
            <MenuItem icon={Trash2} danger onClick={askDelete}>Hapus list</MenuItem>
          </Menu>
        </div>
      </div>

      <div className="mb-4">
        <Tabs value={tab} onChange={setTab} items={[
          { value: "options", label: draft.optionNoun || "Pilihan", count: draft.groups.length },
          { value: "questions", label: "Pertanyaan", count: draft.questions.length },
          { value: "people", label: "Peserta", count: people },
          { value: "settings", label: "Pengaturan" },
        ]} />
      </div>

      {tab === "options" && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="grid content-start gap-3">
            <Card className="p-5">
              <input value={draft.title} onChange={(e) => set({ title: e.target.value })} maxLength={200} aria-label="Judul" placeholder="Judul, mis. Konfirmasi kehadiran buka bersama"
                className="w-full border-b border-transparent bg-transparent pb-1 text-xl font-semibold text-slate-900 outline-none hover:border-slate-200 focus:border-primary sm:text-2xl" />
              <Textarea value={draft.description ?? ""} onChange={(e) => set({ description: e.target.value || null })} rows={2} maxLength={3000} placeholder="Keterangan (opsional): waktu, tempat, syarat, kontak…" aria-label="Keterangan" className="mt-3 text-[14px]" />
            </Card>

            {draft.groups.map((g, i) => {
              const tone = GROUP_TONES[i % GROUP_TONES.length];
              const taken = l.groups.find((x) => x.id === g.id)?.entries.length ?? 0;
              return (
                <Card key={g.key} className="flex overflow-hidden p-0">
                  <span className={cx("w-1.5 shrink-0", tone.bar)} aria-hidden />
                  <div className="grid min-w-0 flex-1 gap-2 p-4">
                    <div className="flex items-center gap-2">
                      <Input value={g.name} onChange={(e) => setG(g.key, { name: e.target.value })} maxLength={80} placeholder={`Nama ${draft.optionNoun.toLowerCase()}`} aria-label={`Nama pilihan ${i + 1}`} className="flex-1 font-medium" />
                      <span className="hidden shrink-0 text-xs text-slate-500 tabular-nums sm:inline">{taken} memilih</span>
                    </div>
                    <Input value={g.description ?? ""} onChange={(e) => setG(g.key, { description: e.target.value || null })} maxLength={200} placeholder="Keterangan singkat (opsional), mis. 09.00–11.00 · Ruang 3" aria-label="Keterangan pilihan" className="h-8 text-[13px]" />
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[12.5px] font-medium" role="group" aria-label="Kuota">
                        <button type="button" onClick={() => setG(g.key, { capacity: null })} aria-pressed={g.capacity == null} className={cx("inline-flex h-7 items-center gap-1 rounded-md px-2.5", g.capacity == null ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}><InfinityIcon size={13} aria-hidden /> Tanpa batas</button>
                        <button type="button" onClick={() => setG(g.key, { capacity: g.capacity ?? Math.max(taken, 5) })} aria-pressed={g.capacity != null} className={cx("h-7 rounded-md px-2.5", g.capacity != null ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>Kuota</button>
                      </div>
                      {g.capacity != null && (
                        <span className="flex items-center gap-1.5">
                          <Input type="number" min={1} max={5000} value={g.capacity} onChange={(e) => setG(g.key, { capacity: Math.min(5000, Math.max(1, Number(e.target.value) || 1)) })} aria-label="Jumlah slot" className="h-8 w-20" />
                          <span className="text-xs text-slate-500">slot</span>
                          {taken > g.capacity && <span className="text-xs text-amber-700">· sudah {taken} orang</span>}
                        </span>
                      )}
                      <span className="ml-auto flex">
                        <button type="button" onClick={() => set({ groups: swap(draft.groups, i, -1) })} disabled={i === 0} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30" aria-label="Naikkan"><ArrowUp size={15} /></button>
                        <button type="button" onClick={() => set({ groups: swap(draft.groups, i, 1) })} disabled={i === draft.groups.length - 1} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30" aria-label="Turunkan"><ArrowDown size={15} /></button>
                        <button type="button" disabled={draft.groups.length <= 1} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-30" aria-label="Hapus pilihan"
                          onClick={() => askRemoveGroup(g, taken)}><Trash2 size={15} /></button>
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
            {draft.groups.length < 50 && (
              <button type="button" onClick={() => set({ groups: [...draft.groups, { key: rid(), name: `${draft.optionNoun} ${draft.groups.length + 1}`, description: null, capacity: null }] })}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-[13px] font-medium text-slate-500 hover:border-slate-300 hover:text-slate-800">
                <Plus size={16} aria-hidden /> Tambah {draft.optionNoun.toLowerCase()}
              </button>
            )}
          </div>

          {/* Label yang tampil di halaman peserta + pratinjau tombol */}
          <Card className="grid h-fit gap-4 p-4 lg:sticky lg:top-20">
            <p className="text-[13px] font-semibold text-slate-900">Kata-kata di halaman</p>
            <Field label="Sebutan pilihan" hint="Mis. Kelompok, Sesi, Kehadiran, Divisi"><Input value={draft.optionNoun} onChange={(e) => set({ optionNoun: e.target.value })} maxLength={30} /></Field>
            <Field label="Teks tombol" hint="Mis. Gabung, Hadir, Daftar, Pilih"><Input value={draft.joinLabel} onChange={(e) => set({ joinLabel: e.target.value })} maxLength={30} /></Field>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="mb-2 text-[11px] font-medium tracking-wide text-slate-400 uppercase">Pratinjau tombol</p>
              <span className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary text-[13px] font-semibold text-white"><Plus size={14} aria-hidden /> {draft.joinLabel || "…"}</span>
            </div>
          </Card>
        </div>
      )}

      {tab === "questions" && (
        <div className="mx-auto grid max-w-3xl gap-3">
          <p className="rounded-lg bg-blue-50 px-3 py-2 text-[13px] text-blue-800">Ditanyakan saat seseorang menekan <b>{draft.joinLabel}</b>. Jawabannya hanya terlihat oleh kamu (tab Peserta & CSV).</p>
          {draft.questions.length === 0 && <EmptyState icon={MessageSquareText} title="Tanpa pertanyaan" desc="Peserta cukup sekali klik. Tambahkan pertanyaan kalau butuh data, mis. No. WA atau alasan ikut." />}
          {draft.questions.map((q, i) => (
            <QuestionEditor key={q.id} q={q} first={i === 0} last={i === draft.questions.length - 1}
              onChange={(p) => set({ questions: draft.questions.map((x) => (x.id === q.id ? { ...x, ...p } : x)) })}
              onMove={(d) => set({ questions: swap(draft.questions, i, d) })}
              onDelete={() => set({ questions: draft.questions.filter((x) => x.id !== q.id) })} />
          ))}
          {draft.questions.length < 20 && (
            <div className="grid gap-2">
              <button type="button" onClick={() => set({ questions: [...draft.questions, { id: rid(), type: "SHORT", label: "", required: true }] })}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-[13px] font-medium text-slate-500 hover:border-slate-300 hover:text-slate-800">
                <Plus size={16} aria-hidden /> Tambah pertanyaan
              </button>
              <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
                <span className="text-slate-400">Cepat:</span>
                {QUICK_QUESTIONS.filter((x) => !draft.questions.some((q) => q.label === x.label)).map((x) => (
                  <button key={x.label} type="button" onClick={() => set({ questions: [...draft.questions, { ...x, id: rid() }] })} className="rounded-full border border-slate-200 px-2.5 py-1 text-slate-600 hover:border-primary hover:text-primary">+ {x.label}</button>
                ))}
              </div>
            </div>
          )}
          {people > 0 && <p className="text-xs text-slate-400">Mengubah atau menghapus pertanyaan tidak menghapus jawaban lama, tapi jawaban untuk pertanyaan yang dihapus tidak tampil lagi.</p>}
        </div>
      )}

      {tab === "people" && <People list={l} onKick={askKick} onExport={exportCsv} />}

      {tab === "settings" && (
        <div className="mx-auto grid max-w-2xl gap-3">
          <Card className="grid gap-4 p-5">
            <Field label="Link halaman" hint={`${location.host}/s/${draft.slug || "…"}`}>
              <div className="flex gap-2">
                <Input value={draft.slug} onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} maxLength={60} className="flex-1" />
                <Button variant="outline" onClick={() => copy(link, "Link disalin")} disabled={draft.slug !== l.slug}><Copy size={14} aria-hidden /></Button>
              </div>
            </Field>
            {draft.slug !== l.slug && <p className="-mt-2 text-xs text-amber-700">Link lama yang sudah disebar tidak berlaku setelah disimpan.</p>}
            <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
              <span><span className="block text-[13.5px] font-medium text-slate-800">Terima pilihan</span><span className="text-xs text-slate-500">Matikan untuk menutup sementara.</span></span>
              <input type="checkbox" checked={draft.isOpen} onChange={(e) => set({ isOpen: e.target.checked })} className="size-5 accent-[var(--primary)]" />
            </label>
            <Field label="Tutup otomatis" hint="Opsional. Setelah waktu ini, peserta tidak bisa memilih/batal lagi.">
              <div className="flex gap-2">
                <Input type="datetime-local" value={draft.closesAt ? toLocal(draft.closesAt) : ""} onChange={(e) => set({ closesAt: e.target.value ? new Date(e.target.value).toISOString() : null })} className="flex-1" />
                {draft.closesAt && <Button variant="ghost" onClick={() => set({ closesAt: null })}>Hapus</Button>}
              </div>
            </Field>
            <p className="text-xs text-slate-500">Khusus anggota yang login. Satu orang hanya satu pilihan, tapi bisa pindah selama masih ada slot.</p>
          </Card>
          <Card className="flex items-center gap-3 border-red-200 p-5">
            <div className="flex-1"><p className="text-[13.5px] font-medium text-slate-900">Hapus list</p><p className="text-xs text-slate-500">Semua pilihan & {people} peserta ikut terhapus.</p></div>
            <Button variant="outline" className="text-red-600" onClick={askDelete}><Trash2 size={14} aria-hidden /> Hapus</Button>
          </Card>
        </div>
      )}
      {confirmDialog}
    </div>
  );
}

// Tab Peserta: filter per pilihan, cari nama, jawaban per orang.
function People({ list, onKick, onExport }: { list: List; onKick: (e: Entry) => void; onExport: () => void }) {
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const qs = list.questions ?? [];
  const rows = useMemo(
    () => list.groups.flatMap((g, gi) => g.entries.map((e) => ({ e, g, gi })))
      .filter((r) => (filter === "all" || r.g.id === filter) && (!q || r.e.user.name.toLowerCase().includes(q.toLowerCase())))
      .sort((a, b) => b.e.createdAt.localeCompare(a.e.createdAt)),
    [list, filter, q],
  );
  const total = list.groups.reduce((n, g) => n + g.entries.length, 0);
  if (!total) return <EmptyState icon={Search} title="Belum ada peserta" desc="Bagikan link halaman; yang memilih akan muncul di sini." />;
  const chip = (on: boolean) => cx("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-medium transition", on ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300");

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setFilter("all")} className={chip(filter === "all")}>Semua <span className="tabular-nums opacity-80">{total}</span></button>
        {list.groups.map((g, gi) => (
          <button key={g.id} onClick={() => setFilter(g.id)} className={chip(filter === g.id)}>
            <span className={cx("size-2 rounded-full", filter === g.id ? "bg-white" : GROUP_TONES[gi % GROUP_TONES.length].bar)} aria-hidden />{g.name} <span className="tabular-nums opacity-80">{g.entries.length}</span>
          </button>
        ))}
        <span className="ml-auto flex gap-2">
          <Input icon={Search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama…" aria-label="Cari peserta" className="w-44" />
          <Button variant="outline" onClick={onExport}><Download size={14} aria-hidden /> CSV</Button>
        </span>
      </div>
      <Card className="divide-y divide-slate-100 p-0">
        {rows.map(({ e, g, gi }) => (
          <div key={e.id} className="group flex gap-3 px-4 py-3">
            <Avatar name={e.user.name} src={e.user.avatarUrl} size={36} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 text-[14px]">
                <b className="font-medium text-slate-900">{e.user.name}</b>
                <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", GROUP_TONES[gi % GROUP_TONES.length].soft)}>{g.name}</span>
                <span className="text-xs text-slate-400">{timeFmt.format(new Date(e.createdAt))}</span>
              </p>
              {qs.length > 0 && (
                <dl className="mt-1.5 grid gap-x-4 gap-y-1 text-[13px] sm:grid-cols-[auto_minmax(0,1fr)]">
                  {qs.map((x) => (
                    <div key={x.id} className="contents">
                      <dt className="text-slate-400">{x.label}</dt>
                      <dd className="break-words whitespace-pre-wrap text-slate-700">{answerText(e.answers?.[x.id]) || <span className="text-slate-300">–</span>}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
            <button onClick={() => onKick(e)} className="h-fit rounded-md p-1.5 text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-slate-100 hover:text-red-600 focus:opacity-100" aria-label={`Keluarkan ${e.user.name}`}><X size={15} /></button>
          </div>
        ))}
        {!rows.length && <p className="px-4 py-6 text-center text-[13px] text-slate-400">Tidak ada yang cocok.</p>}
      </Card>
    </div>
  );
}

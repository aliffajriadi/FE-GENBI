"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Copy, Download, ExternalLink, ImagePlus, Lock, MoreHorizontal, Plus, Trash2, X } from "lucide-react";
import { DEFAULT_THEME, FormShell, PRESETS, QuestionList, type FormTheme } from "@/components/form-view";
import { Menu, MenuItem } from "@/components/menu";
import { QuestionEditor } from "@/components/question-editor";
import { useToast } from "@/components/toast";
import { Button, Card, cx, EmptyState, ErrorText, Field, Input, Select, Skeleton, Tabs, Textarea } from "@/components/ui";
import { api, uploadFile } from "@/lib/api";
import { answerText, download, hasOptions, rid, toCsv, type Answer, type Question } from "@/lib/forms";

type Form = {
  id: string; slug: string; title: string; description: string | null; questions: Question[]; audience: "PUBLIC" | "MEMBERS";
  isOpen: boolean; closesAt: string | null; onePerUser: boolean; theme: FormTheme | null; _count: { responses: number };
};
type Draft = Omit<Form, "id" | "_count">;
type Resp = { id: string; createdAt: string; answers: Record<string, Answer>; user: { name: string; email: string } | null };

const timeFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
// <input type="datetime-local"> butuh waktu lokal tanpa zona.
const toLocal = (iso: string) => { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); };
const pick = (f: Form): Draft => ({ slug: f.slug, title: f.title, description: f.description, questions: f.questions, audience: f.audience, isOpen: f.isOpen, closesAt: f.closesAt, onePerUser: f.onePerUser, theme: f.theme });

export default function FormEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const form = useQuery({ queryKey: ["form", id], queryFn: () => api<Form>(`/forms/${id}`) });
  const [tab, setTab] = useState<"questions" | "design" | "responses" | "settings">("questions");
  const [draft, setDraft] = useState<Draft | null>(null);
  useEffect(() => { if (form.data) setDraft(pick(form.data)); }, [form.data]);

  const f = form.data;
  const locked = (f?._count.responses ?? 0) > 0; // pertanyaan dikunci setelah ada respons (jawaban lama mengacu ke ID pertanyaan)
  const dirty = !!f && !!draft && JSON.stringify(pick(f)) !== JSON.stringify(draft);
  const set = (p: Partial<Draft>) => setDraft((d) => d && { ...d, ...p });
  const setQ = (qid: string, p: Partial<Question>) => set({ questions: draft!.questions.map((q) => (q.id === qid ? { ...q, ...p } : q)) });
  const moveQ = (i: number, d: number) => { const qs = [...draft!.questions]; [qs[i], qs[i + d]] = [qs[i + d], qs[i]]; set({ questions: qs }); };

  const save = useMutation({
    mutationFn: () => { const { questions, ...rest } = draft!; return api<Form>(`/forms/${id}`, { method: "PATCH", body: locked ? rest : { ...rest, questions } }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["form", id] }); qc.invalidateQueries({ queryKey: ["forms"] }); toast("Form disimpan"); },
    onError: (e) => toast(e.message, { error: true }),
  });
  const del = useMutation({
    mutationFn: () => api(`/forms/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["forms"] }); toast("Form dihapus"); router.replace("/dashboard/forms"); },
    onError: (e) => toast(e.message, { error: true }),
  });

  // Peringatan sebelum meninggalkan halaman dengan perubahan yang belum disimpan.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (form.error) return <ErrorText error={form.error} />;
  if (!f || !draft) return <Skeleton className="h-96 rounded-xl" />;
  const link = typeof location === "undefined" ? "" : `${location.origin}/f/${f.slug}`;

  return (
    <div className={cx("mx-auto", tab === "design" ? "max-w-6xl" : "max-w-3xl")}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href="/dashboard/forms" className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[13px] text-slate-500 hover:bg-slate-100 hover:text-slate-800"><ArrowLeft size={15} aria-hidden /> Semua form</Link>
        <span className="ml-auto flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(link).then(() => toast("Link form disalin"))}><Copy size={13} aria-hidden /> Salin link</Button>
          <a href={`/f/${f.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-slate-600 hover:bg-slate-100"><ExternalLink size={13} aria-hidden /> Pratinjau</a>
          <Button size="sm" onClick={() => save.mutate()} loading={save.isPending} disabled={!dirty}>{dirty ? "Simpan" : "Tersimpan"}</Button>
          <Menu trigger={() => <button className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Opsi form"><MoreHorizontal size={17} /></button>}>
            <MenuItem icon={Trash2} danger onClick={() => confirm(`Hapus form "${f.title}" beserta ${f._count.responses} respons?`) && del.mutate()}>Hapus form</MenuItem>
          </Menu>
        </span>
      </div>

      <div className="mb-4">
        <Tabs value={tab} onChange={setTab} items={[{ value: "questions", label: "Pertanyaan" }, { value: "design", label: "Tampilan" }, { value: "responses", label: "Respons", count: f._count.responses }, { value: "settings", label: "Pengaturan" }]} />
      </div>

      {tab === "questions" && (
        <div className="grid gap-3">
          <Card className="border-t-4 border-t-primary p-5">
            <input value={draft.title} onChange={(e) => set({ title: e.target.value })} maxLength={200} aria-label="Judul form" placeholder="Judul form"
              className="w-full border-b border-transparent bg-transparent pb-1 text-2xl font-semibold text-slate-900 outline-none hover:border-slate-200 focus:border-primary" />
            <Textarea value={draft.description ?? ""} onChange={(e) => set({ description: e.target.value || null })} rows={2} maxLength={5000} placeholder="Deskripsi form (opsional)" aria-label="Deskripsi form" className="mt-3 text-[14px]" />
          </Card>
          {locked && (
            <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800"><Lock size={14} aria-hidden /> Pertanyaan terkunci karena sudah ada respons. Judul, deskripsi & pengaturan masih bisa diubah.</p>
          )}
          <fieldset disabled={locked} className="grid gap-3">
            {draft.questions.map((q, i) => (
              <QuestionEditor key={q.id} q={q} first={i === 0} last={i === draft.questions.length - 1} onChange={(p) => setQ(q.id, p)} onMove={(d) => moveQ(i, d)}
                onDelete={() => set({ questions: draft.questions.filter((x) => x.id !== q.id) })} />
            ))}
            {!locked && (
              <button type="button" onClick={() => set({ questions: [...draft.questions, { id: rid(), type: "SHORT", label: "", required: false }] })}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-[13px] font-medium text-slate-500 hover:border-slate-300 hover:text-slate-800">
                <Plus size={16} aria-hidden /> Tambah pertanyaan
              </button>
            )}
          </fieldset>
        </div>
      )}

      {tab === "settings" && (
        <Card className="grid gap-4 p-5">
          <Field label="Link form" hint={link.replace(/^https?:\/\//, "").replace(/[^/]*$/, "") + (draft.slug || "…")}>
            <Input value={draft.slug} onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} maxLength={60} />
          </Field>
          <Field label="Siapa yang bisa mengisi">
            <Select value={draft.audience} onChange={(e) => set({ audience: e.target.value as Draft["audience"] })}>
              <option value="MEMBERS">Khusus anggota (wajib login, nama tercatat otomatis)</option>
              <option value="PUBLIC">Publik (siapa pun yang punya link)</option>
            </Select>
          </Field>
          {draft.audience === "MEMBERS" && (
            <label className="flex items-center gap-2 text-[13.5px] text-slate-700"><input type="checkbox" checked={draft.onePerUser} onChange={(e) => set({ onePerUser: e.target.checked })} className="size-4 accent-[var(--primary)]" /> Satu anggota hanya bisa mengisi sekali</label>
          )}
          <label className="flex items-center gap-2 text-[13.5px] text-slate-700"><input type="checkbox" checked={draft.isOpen} onChange={(e) => set({ isOpen: e.target.checked })} className="size-4 accent-[var(--primary)]" /> Menerima respons</label>
          <Field label="Tutup otomatis pada" hint="Opsional. Kosongkan kalau tidak ada batas waktu.">
            <div className="flex gap-2">
              <Input type="datetime-local" value={draft.closesAt ? toLocal(draft.closesAt) : ""} onChange={(e) => set({ closesAt: e.target.value ? new Date(e.target.value).toISOString() : null })} className="flex-1" />
              {draft.closesAt && <Button variant="ghost" onClick={() => set({ closesAt: null })}>Hapus</Button>}
            </div>
          </Field>
        </Card>
      )}

      {tab === "responses" && <Responses form={f} />}
      {tab === "design" && <Design draft={draft} onTheme={(theme) => set({ theme })} />}
    </div>
  );
}

function Responses({ form }: { form: Form }) {
  const qc = useQueryClient();
  const toast = useToast();
  const list = useQuery({ queryKey: ["form", form.id, "responses"], queryFn: () => api<Resp[]>(`/forms/${form.id}/responses`) });
  const del = useMutation({
    mutationFn: (rid: string) => api(`/form-responses/${rid}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["form", form.id] }); toast("Respons dihapus"); },
    onError: (e) => toast(e.message, { error: true }),
  });
  const rows = list.data ?? [];
  const members = form.audience === "MEMBERS";

  // Hitung jumlah per opsi untuk pertanyaan pilihan.
  const counts = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    for (const q of form.questions) if (hasOptions(q.type)) m.set(q.id, new Map((q.options ?? []).map((o) => [o, 0])));
    for (const r of rows) for (const [qid, c] of m) for (const v of [r.answers[qid] ?? []].flat()) c.set(v, (c.get(v) ?? 0) + 1);
    return m;
  }, [rows, form.questions]);

  const exportCsv = () => {
    const head = ["Waktu", ...(members ? ["Nama", "Email"] : []), ...form.questions.map((q) => q.label)];
    const body = rows.map((r) => [timeFmt.format(new Date(r.createdAt)), ...(members ? [r.user?.name ?? "(akun dihapus)", r.user?.email ?? ""] : []), ...form.questions.map((q) => answerText(r.answers[q.id]))]);
    download(`${form.slug}-respons.csv`, toCsv([head, ...body]));
  };

  if (list.isLoading) return <Skeleton className="h-60 rounded-xl" />;
  if (list.error) return <ErrorText error={list.error} />;
  if (!rows.length) return <EmptyState icon={Download} title="Belum ada respons" desc="Bagikan link form; jawaban akan muncul di sini." />;

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[13.5px] text-slate-600"><b className="text-slate-900 tabular-nums">{rows.length}</b> respons</p>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download size={13} aria-hidden /> Unduh CSV (Excel)</Button>
      </div>

      {/* Ringkasan per pertanyaan */}
      {form.questions.map((q) => {
        const c = counts.get(q.id);
        const texts = c ? [] : rows.map((r) => answerText(r.answers[q.id])).filter(Boolean);
        return (
          <Card key={q.id} className="p-4">
            <p className="text-[14px] font-medium text-slate-900">{q.label}</p>
            {c ? (
              <ul className="mt-3 grid gap-2">
                {[...c].map(([opt, n]) => (
                  <li key={opt} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-[13px]">
                    <span className="truncate text-slate-700">{opt}</span>
                    <span className="text-slate-500 tabular-nums">{n} · {Math.round((n / rows.length) * 100)}%</span>
                    <span className="col-span-2 h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-primary/80" style={{ width: `${(n / rows.length) * 100}%` }} /></span>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <p className="mt-1 text-xs text-slate-500">{texts.length} jawaban</p>
                <ul className="mt-2 grid max-h-60 gap-1 overflow-y-auto">
                  {texts.map((t, i) => <li key={i} className="rounded-md bg-slate-50 px-2.5 py-1.5 text-[13px] whitespace-pre-wrap break-words text-slate-700">{t}</li>)}
                </ul>
              </>
            )}
          </Card>
        );
      })}

      {/* Semua respons */}
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[600px] text-left text-[13px]">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium whitespace-nowrap">Waktu</th>
              {members && <th className="px-3 py-2 font-medium">Nama</th>}
              {form.questions.map((q) => <th key={q.id} className="max-w-48 truncate px-3 py-2 font-medium" title={q.label}>{q.label}</th>)}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className="align-top hover:bg-slate-50/60">
                <td className="px-3 py-2 whitespace-nowrap text-slate-500">{timeFmt.format(new Date(r.createdAt))}</td>
                {members && <td className="px-3 py-2 whitespace-nowrap text-slate-800">{r.user?.name ?? "(akun dihapus)"}</td>}
                {form.questions.map((q) => <td key={q.id} className="max-w-64 px-3 py-2 break-words text-slate-700">{answerText(r.answers[q.id]) || <span className="text-slate-300">–</span>}</td>)}
                <td className="px-2 py-1.5"><button onClick={() => confirm("Hapus respons ini?") && del.mutate(r.id)} className="rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-red-600" aria-label="Hapus respons"><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// Tab Tampilan: preset ala Google Form / Tally, lalu atur warna, font, sudut & gambar header. Pratinjau langsung di kanan.
function Design({ draft, onTheme }: { draft: Draft; onTheme: (t: FormTheme) => void }) {
  const toast = useToast();
  const t = { ...DEFAULT_THEME, ...draft.theme };
  const set = (p: Partial<FormTheme>) => onTheme({ ...t, ...p });
  const [uploading, setUploading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try { set({ coverUrl: (await uploadFile(file, { public: true })).url }); } catch (e) { toast((e as Error).message, { error: true }); } finally { setUploading(false); }
  };
  const seg = (on: boolean) => cx("h-8 flex-1 rounded-md px-2 text-[13px] font-medium transition", on ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900");
  const Seg = <K extends keyof FormTheme>({ k, items }: { k: K; items: [FormTheme[K], string][] }) => (
    <div className="flex rounded-lg bg-slate-100 p-1">{items.map(([v, label]) => <button key={String(v)} type="button" onClick={() => set({ [k]: v } as Partial<FormTheme>)} className={seg(t[k] === v)} aria-pressed={t[k] === v}>{label}</button>)}</div>
  );

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="grid gap-5 p-4 lg:sticky lg:top-4">
        <div>
          <p className="mb-2 text-[13px] font-medium text-slate-700">Tema siap pakai</p>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => {
              const active = p.theme.accent === t.accent && p.theme.background === t.background && p.theme.style === t.style;
              return (
                <button key={p.name} type="button" onClick={() => set(p.theme)} className={cx("relative overflow-hidden rounded-lg border text-left transition", active ? "border-primary ring-2 ring-primary/20" : "border-slate-200 hover:border-slate-300")}>
                  <span className="flex h-12 flex-col justify-end gap-1 p-1.5" style={{ background: p.theme.background }}>
                    <span className="h-1.5 w-8 rounded-full" style={{ background: p.theme.accent }} />
                    <span className={cx("h-3 w-full", p.theme.style === "classic" ? "rounded-sm bg-white" : "rounded-sm border")} style={p.theme.style === "minimal" ? { borderColor: p.theme.accent + "55" } : undefined} />
                  </span>
                  <span className="block px-1.5 py-1 text-[11.5px] font-medium text-slate-700">{p.name}</span>
                  {active && <Check size={12} className="absolute top-1 right-1 rounded-full bg-primary p-0.5 text-white" aria-hidden />}
                </button>
              );
            })}
          </div>
        </div>
        <Field label="Gaya"><Seg k="style" items={[["classic", "Google Form"], ["minimal", "Tally"]]} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <ColorField label="Warna aksen" value={t.accent} onChange={(accent) => set({ accent })} />
          <ColorField label="Latar" value={t.background} onChange={(background) => set({ background })} />
        </div>
        <Field label="Font"><Seg k="font" items={[["sans", "Sans"], ["serif", "Serif"], ["mono", "Mono"]]} /></Field>
        <Field label="Sudut tombol & kotak"><Seg k="radius" items={[["sharp", "Tajam"], ["rounded", "Bulat"], ["pill", "Kapsul"]]} /></Field>
        <Field label="Gambar header" hint="JPG/PNG/WEBP, maks 2 MB. Ideal lebar ±1600px.">
          {t.coverUrl ? (
            <div className="flex items-center gap-2">
              <span className="truncate text-xs text-slate-500">{t.coverUrl.split("/").pop()}</span>
              <Button variant="ghost" size="sm" onClick={() => set({ coverUrl: null })}><X size={13} aria-hidden /> Hapus</Button>
            </div>
          ) : (
            <label className={cx("flex h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-200 text-[13px] text-slate-500 hover:border-slate-300 hover:text-slate-800", uploading && "pointer-events-none opacity-60")}>
              <ImagePlus size={18} aria-hidden />{uploading ? "Mengunggah…" : "Pilih gambar"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
            </label>
          )}
        </Field>
        <label className="flex items-center gap-2 text-[13.5px] text-slate-700"><input type="checkbox" checked={t.showLogo} onChange={(e) => set({ showLogo: e.target.checked })} className="size-4 accent-[var(--primary)]" /> Tampilkan logo MyGenBI</label>
        <p className="text-xs text-slate-400">Klik <b className="font-medium text-slate-600">Simpan</b> di atas untuk menerapkan.</p>
      </Card>

      {/* Pratinjau: komponen yang sama dengan halaman isi, jadi hasilnya persis. */}
      <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-3 py-2">
          {["bg-red-300", "bg-amber-300", "bg-green-300"].map((c) => <span key={c} className={cx("size-2.5 rounded-full", c)} aria-hidden />)}
          <span className="ml-2 truncate text-xs text-slate-400">Pratinjau · /f/{draft.slug}</span>
        </div>
        <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto">
          <FormShell form={{ title: draft.title, description: draft.description, theme: t }} preview>
            <QuestionList questions={draft.questions} answers={answers} onAnswer={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))} minimal={t.style === "minimal"} />
          </FormShell>
        </div>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <Field label={label}>
      <div className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white pr-2 pl-1">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label} (pemilih warna)`} className="size-7 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" />
        <input value={text} maxLength={7} aria-label={`${label} (hex)`} className="w-full min-w-0 font-mono text-xs uppercase outline-none"
          onChange={(e) => { const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`; setText(v); if (/^#[0-9a-f]{6}$/i.test(v)) onChange(v.toLowerCase()); }} />
      </div>
    </Field>
  );
}

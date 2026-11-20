"use client";
import Link from "next/link";
import { toLocalInput } from "@/lib/format";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, ExternalLink, Lock, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { Menu, MenuItem } from "@/components/menu";
import { QuestionEditor } from "@/components/question-editor";
import { useToast } from "@/components/toast";
import { Button, Card, cx, ErrorText, Field, Input, Select, Skeleton, Tabs, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { rid, type Question } from "@/lib/forms";
import { type Draft, type Form, pick } from "./_lib";
import { Responses } from "./_components/responses";
import { Design } from "./_components/design";

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
              <Input type="datetime-local" value={draft.closesAt ? toLocalInput(new Date(draft.closesAt)) : ""} onChange={(e) => set({ closesAt: e.target.value ? new Date(e.target.value).toISOString() : null })} className="flex-1" />
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

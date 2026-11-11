"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import {
  ArrowLeft, Bold, CalendarClock, Check, Code2, Eye, Heading2, Heading3, History, ImagePlus, Italic, Link2, List, ListOrdered, Loader2, Minus, Plus,
  Quote, Send, Settings2, Trash2, X,
} from "lucide-react";
import { Dialog } from "@/components/dialog";
import { ArticleView, readingMinutes } from "@/components/site/article-view";
import { useToast } from "@/components/toast";
import { Badge, Button, cx, ErrorText, Field, Input, Skeleton, Textarea } from "@/components/ui";
import { api, publicFile, uploadFile } from "@/lib/api";
import { fmtDate, fmtRelative, toLocalInput } from "@/lib/format";

type Article = {
  id: string; title: string; slug: string; excerpt: string | null; body: string; coverUrl: string | null; coverAlt: string | null; seoTitle: string | null; seoDesc: string | null;
  status: string; kind: "NEWS" | "PERSONAL"; tags: string[]; scheduledAt: string | null; publishedAt: string | null; updatedAt: string;
  author: { id: string; name: string }; division: { name: string } | null;
  canEdit: boolean; canModerate: boolean; canWriteNews: boolean;
};
type Draft = Pick<Article, "title" | "slug" | "excerpt" | "body" | "coverUrl" | "coverAlt" | "seoTitle" | "seoDesc" | "kind"> & { tags: string };

export default function ArticleEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const q = useQuery({ queryKey: ["article", id], queryFn: () => api<Article>(`/articles/${id}`), refetchOnWindowFocus: false });
  if (q.isLoading) return <div className="mx-auto max-w-[720px] space-y-6 px-5 pt-32"><Skeleton className="h-12" /><Skeleton className="h-6 w-2/3" /><Skeleton className="h-80" /></div>;
  if (!q.data) return <div className="p-10"><ErrorText error={q.error} /></div>;
  return <Studio key={q.data.id} a={q.data} />;
}

// Editor ala Ghost: kanvas bersih, menu muncul saat dibutuhkan, pengaturan di panel samping.
function Studio({ a }: { a: Article }) {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [d, setD] = useState<Draft>({ title: a.title, slug: a.slug, excerpt: a.excerpt, body: a.body, coverUrl: a.coverUrl, coverAlt: a.coverAlt, seoTitle: a.seoTitle, seoDesc: a.seoDesc, kind: a.kind, tags: a.tags.join(", ") });
  const [dirty, setDirty] = useState(false);
  const [panel, setPanel] = useState<"settings" | "publish" | "history" | "preview" | null>(null);
  const [art, setArt] = useState(a);
  const editable = art.canEdit;
  const set = (patch: Partial<Draft>) => { setD((x) => ({ ...x, ...patch })); setDirty(true); };

  const save = useMutation({
    mutationFn: (x: Draft) =>
      api<Article>(`/articles/${a.id}`, {
        method: "PATCH",
        body: { ...x, tags: x.tags.split(",").map((t) => t.trim()).filter(Boolean), excerpt: x.excerpt || null, seoTitle: x.seoTitle || null, seoDesc: x.seoDesc || null, coverAlt: x.coverAlt || null },
      }),
    onSuccess: (r) => { setArt(r); setDirty(false); },
  });

  // Autosave 2 detik setelah berhenti mengetik.
  useEffect(() => {
    if (!dirty || !editable) return;
    const t = setTimeout(() => save.mutate(d), 2000);
    return () => clearTimeout(t);
  }, [d, dirty]); // eslint-disable-line react-hooks/exhaustive-deps

  // Jangan sampai artikel hilang saat tab ditutup sebelum tersimpan.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const flush = async () => { if (dirty) await save.mutateAsync(d); };

  const act = useMutation({
    mutationFn: async ({ path, body }: { path: string; body?: unknown }) => { await flush(); return api(`/articles/${a.id}/${path}`, { method: "POST", body: body ?? {} }); },
    onSuccess: async (_, v) => {
      setArt(await api<Article>(`/articles/${a.id}`));
      qc.invalidateQueries({ queryKey: ["articles"] });
      setPanel(null);
      toast({ publish: "Artikel terbit", archive: "Artikel ditarik dari web" }[v.path] ?? "Tersimpan");
    },
    onError: (e) => toast(e.message, { error: true }),
  });
  const del = useMutation({ mutationFn: () => api(`/articles/${a.id}`, { method: "DELETE" }), onSuccess: () => router.push("/dashboard/articles") });

  const editor = useArticleEditor(d.body, editable, (body) => set({ body }), (msg) => toast(msg, { error: true }));
  const words = d.body.trim().split(/\s+/).filter(Boolean).length;
  const live = art.status === "PUBLISHED";

  return (
    <div className="min-h-dvh bg-white">
      {/* Bilah atas tipis, seperti Ghost */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-white/95 px-4 backdrop-blur-sm sm:px-6">
        <Link href="/dashboard/articles" className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-slate-500 hover:bg-slate-100 hover:text-slate-900"><ArrowLeft size={15} aria-hidden /> Artikel</Link>
        <span className="flex items-center gap-2 text-[13px] text-slate-400" aria-live="polite">
          <Badge status={art.status} />
          <span className="hidden sm:inline">
            {save.isPending ? <span className="inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" aria-hidden /> Menyimpan</span> : save.isError ? <span className="text-red-600">Gagal menyimpan</span> : dirty ? "Belum tersimpan" : `Tersimpan ${fmtRelative(art.updatedAt)}`}
          </span>
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => setPanel("preview")}><Eye size={15} aria-hidden /> <span className="hidden sm:inline">Pratinjau</span></Button>
          {art.status === "PUBLISHED" && <Link href={`/artikel/${art.slug}`} target="_blank"><Button variant="ghost" size="sm">Lihat di web</Button></Link>}
          {!live && <Button size="sm" onClick={() => setPanel("publish")}><Send size={14} aria-hidden /> {art.status === "SCHEDULED" ? "Ubah jadwal" : "Terbitkan"}</Button>}
          <Button variant="ghost" size="icon" onClick={() => setPanel("settings")} aria-label="Pengaturan artikel"><Settings2 size={18} /></Button>
        </div>
      </header>

      {art.status === "SCHEDULED" && art.scheduledAt && (
        <div className="mx-auto mt-2 max-w-[720px] px-5"><div className="rounded-lg bg-blue-50 px-4 py-3 text-[13px] text-blue-900">Terjadwal tayang {fmtDate(art.scheduledAt)}.</div></div>
      )}

      <main className="pb-40">
        {/* Gambar sampul */}
        {d.coverUrl ? (
          <figure className="group relative mx-auto mt-8 max-w-[1000px] sm:px-5">
            <img src={publicFile(d.coverUrl)} alt={d.coverAlt ?? ""} className="max-h-[520px] w-full object-cover sm:rounded-sm" />
            {editable && (
              <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100 sm:right-8">
                <CoverPicker label="Ganti" onPick={(url) => set({ coverUrl: url })} onError={(m) => toast(m, { error: true })} />
                <button onClick={() => set({ coverUrl: null, coverAlt: null })} className="rounded-md bg-white/95 px-2.5 py-1.5 text-[13px] text-slate-700 shadow-sm hover:text-red-600" aria-label="Hapus sampul"><Trash2 size={14} /></button>
              </div>
            )}
            <input
              value={d.coverAlt ?? ""}
              onChange={(e) => set({ coverAlt: e.target.value })}
              readOnly={!editable}
              placeholder="Tulis keterangan gambar (juga dibacakan pembaca layar)"
              aria-label="Keterangan gambar sampul"
              className="mt-3 w-full bg-transparent px-5 text-center text-[13px] text-slate-500 outline-none placeholder:text-slate-300"
            />
          </figure>
        ) : editable ? (
          <div className="mx-auto mt-12 max-w-[720px] px-5"><CoverPicker label="Tambah gambar sampul" ghost onPick={(url) => set({ coverUrl: url })} onError={(m) => toast(m, { error: true })} /></div>
        ) : null}

        <div className="mx-auto mt-6 max-w-[720px] px-5">
          <textarea
            value={d.title}
            onChange={(e) => set({ title: e.target.value.replace(/\n/g, "") })}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); editor?.commands.focus("start"); } }}
            readOnly={!editable}
            rows={1}
            aria-label="Judul"
            placeholder="Judul"
            className="w-full resize-none bg-transparent font-serif text-[38px] leading-[1.12] font-medium tracking-[-0.015em] text-slate-900 outline-none placeholder:text-slate-300 [field-sizing:content] sm:text-[46px]"
          />
          <textarea
            value={d.excerpt ?? ""}
            onChange={(e) => set({ excerpt: e.target.value.replace(/\n/g, "") })}
            readOnly={!editable}
            rows={1}
            maxLength={300}
            aria-label="Subjudul"
            placeholder="Subjudul singkat (opsional)"
            className="mt-2 w-full resize-none bg-transparent font-serif text-[22px] leading-snug text-slate-500 outline-none placeholder:text-slate-300 [field-sizing:content]"
          />
          <div className="relative mt-8">
            {editor && editable && <EditorMenus editor={editor} onError={(m) => toast(m, { error: true })} />}
            <EditorContent editor={editor} />
          </div>
        </div>
      </main>

      <footer className="pointer-events-none fixed bottom-4 left-5 text-xs text-slate-400 print:hidden">{words} kata · {readingMinutes(d.body)} menit baca</footer>

      {/* Pratinjau tampil persis seperti halaman publik */}
      {panel === "preview" && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
          <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-100 bg-white/95 px-4 backdrop-blur-sm sm:px-6">
            <span className="text-[13px] text-slate-500">Pratinjau · tampilan pembaca</span>
            <Button variant="outline" size="sm" onClick={() => setPanel(null)}><X size={14} aria-hidden /> Kembali ke editor</Button>
          </div>
          <div className="py-12">
            <ArticleView a={{ ...d, coverUrl: publicFile(d.coverUrl) || null, authorName: art.author.name, date: art.publishedAt ?? new Date().toISOString(), tags: d.tags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => ({ name: t, slug: t })) }} tagHref={() => "#"} />
          </div>
        </div>
      )}

      <SettingsPanel open={panel === "settings"} onClose={() => setPanel(null)} d={d} set={set} art={art} editable={editable}
        onHistory={() => setPanel("history")} onArchive={() => act.mutate({ path: "archive" })} onDelete={() => confirm("Hapus artikel ini?") && del.mutate()} />
      <PublishDialog open={panel === "publish"} onClose={() => setPanel(null)} loading={act.isPending} onSubmit={(scheduledAt) => act.mutate({ path: "publish", body: scheduledAt ? { scheduledAt } : {} })} />
      <HistoryDialog open={panel === "history"} id={a.id} onClose={() => setPanel(null)}
        onRestore={editable ? (body) => { editor?.commands.setContent(body, { contentType: "markdown" }); set({ body }); setPanel(null); toast("Versi lama dipulihkan"); } : undefined} />
    </div>
  );
}

// ───── Editor Tiptap (isi tetap disimpan sebagai Markdown) ─────

function useArticleEditor(initial: string, editable: boolean, onChange: (md: string) => void, onError: (m: string) => void) {
  const ref = useRef<Editor | null>(null);
  const insertImages = (files: File[]) => {
    for (const f of files.filter((x) => x.type.startsWith("image/"))) {
      uploadFile(f, { public: true })
        .then((up) => ref.current?.chain().focus().setImage({ src: publicFile(up.url), alt: f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") }).run())
        .catch((e) => onError(e.message));
    }
  };
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, underline: false, link: { openOnClick: false, autolink: true, defaultProtocol: "https" } }),
      Image,
      Placeholder.configure({ placeholder: "Ceritakan kisahmu…" }),
      Markdown,
    ],
    content: initial,
    contentType: "markdown",
    editorProps: {
      attributes: { class: "story min-h-[40vh]", "aria-label": "Isi artikel" },
      // Tempel atau seret gambar langsung ke kanvas.
      handlePaste: (_v, e) => { const files = [...(e.clipboardData?.files ?? [])]; if (!files.some((f) => f.type.startsWith("image/"))) return false; insertImages(files); return true; },
      handleDrop: (_v, e) => { const files = [...((e as DragEvent).dataTransfer?.files ?? [])]; if (!files.some((f) => f.type.startsWith("image/"))) return false; e.preventDefault(); insertImages(files); return true; },
    },
    onUpdate: ({ editor: ed }) => onChange(ed.getMarkdown()),
  });
  ref.current = editor;
  return editor;
}

function EditorMenus({ editor, onError }: { editor: Editor; onError: (m: string) => void }) {
  const [linking, setLinking] = useState(false);
  const [href, setHref] = useState("");
  const [plus, setPlus] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const b = "grid size-8 place-items-center rounded-md transition";
  const tool = (active: boolean) => cx(b, active ? "text-white" : "text-slate-300 hover:text-white");

  const addImage = async (f: File) => {
    try {
      const up = await uploadFile(f, { public: true });
      editor.chain().focus().setImage({ src: publicFile(up.url), alt: f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") }).run();
    } catch (e) { onError((e as Error).message); }
  };

  return (
    <>
      {/* Menu saat teks dipilih: gelap & ringkas seperti Medium */}
      <BubbleMenu editor={editor} options={{ placement: "top", offset: 8 }} shouldShow={({ editor: ed, from, to }) => from !== to && !ed.isActive("image")}
        className="flex items-center gap-0.5 rounded-lg bg-slate-900 p-1 shadow-lg">
        {linking ? (
          <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); if (href) editor.chain().focus().extendMarkRange("link").setLink({ href }).run(); else editor.chain().focus().unsetLink().run(); setLinking(false); }}>
            <input autoFocus value={href} onChange={(e) => setHref(e.target.value)} placeholder="Tempel tautan, lalu Enter" aria-label="Alamat tautan"
              className="h-8 w-60 bg-transparent px-2 text-[13px] text-white outline-none placeholder:text-slate-400" onKeyDown={(e) => e.key === "Escape" && setLinking(false)} />
            <button type="button" onClick={() => setLinking(false)} className={tool(false)} aria-label="Batal"><X size={15} /></button>
          </form>
        ) : (
          <>
            <button onClick={() => editor.chain().focus().toggleBold().run()} className={tool(editor.isActive("bold"))} aria-label="Tebal" aria-pressed={editor.isActive("bold")}><Bold size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={tool(editor.isActive("italic"))} aria-label="Miring" aria-pressed={editor.isActive("italic")}><Italic size={16} /></button>
            <button onClick={() => { setHref(editor.getAttributes("link").href ?? ""); setLinking(true); }} className={tool(editor.isActive("link"))} aria-label="Tautan"><Link2 size={16} /></button>
            <span className="mx-1 h-5 w-px bg-slate-700" aria-hidden />
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={tool(editor.isActive("heading", { level: 2 }))} aria-label="Judul besar"><Heading2 size={17} /></button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={tool(editor.isActive("heading", { level: 3 }))} aria-label="Judul kecil"><Heading3 size={17} /></button>
            <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={tool(editor.isActive("blockquote"))} aria-label="Kutipan"><Quote size={16} /></button>
          </>
        )}
      </BubbleMenu>

      {/* Tombol + di baris kosong untuk menyisipkan blok, seperti kartu Ghost */}
      <FloatingMenu editor={editor} options={{ placement: "left", offset: 14 }} className="flex items-center gap-1">
        <button onClick={() => setPlus((p) => !p)} aria-label="Sisipkan blok" aria-expanded={plus}
          className={cx("grid size-8 place-items-center rounded-full border border-slate-300 bg-white text-slate-500 transition hover:border-slate-500 hover:text-slate-900", plus && "rotate-45")}>
          <Plus size={16} />
        </button>
        {plus && (
          <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1 shadow-lg" onClick={() => setPlus(false)}>
            {[
              { icon: ImagePlus, label: "Gambar", fn: () => file.current?.click() },
              { icon: Heading2, label: "Subjudul", fn: () => editor.chain().focus().setHeading({ level: 2 }).run() },
              { icon: Quote, label: "Kutipan", fn: () => editor.chain().focus().setBlockquote().run() },
              { icon: List, label: "Daftar", fn: () => editor.chain().focus().toggleBulletList().run() },
              { icon: ListOrdered, label: "Daftar bernomor", fn: () => editor.chain().focus().toggleOrderedList().run() },
              { icon: Code2, label: "Kode", fn: () => editor.chain().focus().setCodeBlock().run() },
              { icon: Minus, label: "Pembatas", fn: () => editor.chain().focus().setHorizontalRule().run() },
            ].map(({ icon: Icon, label, fn }) => (
              <button key={label} onClick={fn} title={label} aria-label={label} className="grid size-8 place-items-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900"><Icon size={16} /></button>
            ))}
          </div>
        )}
      </FloatingMenu>
      <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) addImage(f); e.target.value = ""; }} />
    </>
  );
}

function CoverPicker({ label, onPick, onError, ghost }: { label: string; onPick: (url: string) => void; onError: (m: string) => void; ghost?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <label className={cx("inline-flex cursor-pointer items-center gap-1.5 text-[13px]", ghost ? "rounded-md px-2 py-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700" : "rounded-md bg-white/95 px-2.5 py-1.5 text-slate-700 shadow-sm")}>
      {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <ImagePlus size={14} aria-hidden />} {label}
      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setBusy(true);
        try { onPick((await uploadFile(f, { public: true })).url); } catch (err) { onError((err as Error).message); } finally { setBusy(false); }
      }} />
    </label>
  );
}

// ───── Panel pengaturan (seperti post settings Ghost) ─────

function SettingsPanel({ open, onClose, d, set, art, editable, onHistory, onArchive, onDelete }: {
  open: boolean; onClose: () => void; d: Draft; set: (p: Partial<Draft>) => void; art: Article; editable: boolean; onHistory: () => void; onArchive: () => void; onDelete: () => void;
}) {
  const url = typeof window === "undefined" ? "" : `${window.location.origin}/artikel/${d.slug}`;
  return (
    <Dialog open={open} onClose={onClose} variant="sheet" title="Pengaturan artikel">
      <div className="grid gap-6">
        <div className="grid gap-2">
          <span className="text-[13px] font-medium text-slate-700">Jenis artikel</span>
          {art.canWriteNews ? (
            <div className="grid grid-cols-2 gap-2">
              {([["PERSONAL", "Artikel pribadi", "Opini & cerita, tampil di Artikel Anggota"], ["NEWS", "Kabar GenBI", "Berita kegiatan resmi organisasi"]] as const).map(([k, t, s]) => (
                <button key={k} type="button" disabled={!editable} onClick={() => set({ kind: k })} aria-pressed={d.kind === k}
                  className={cx("rounded-lg border p-3 text-left transition", d.kind === k ? "border-blue-300 bg-blue-50/50" : "border-slate-200 hover:border-slate-300")}>
                  <span className="block text-[13px] font-medium">{t}</span><span className="mt-0.5 block text-xs text-slate-500">{s}</span>
                </button>
              ))}
            </div>
          ) : <p className="rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-slate-600">Artikel pribadi · tampil di Artikel Anggota</p>}
        </div>
        <Field label="URL" hint={url}><Input value={d.slug} onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} readOnly={!editable} /></Field>
        <Field label="Tag" hint="Pisahkan dengan koma. Tag pertama tampil di atas judul."><Input value={d.tags} onChange={(e) => set({ tags: e.target.value })} readOnly={!editable} placeholder="Kegiatan, Edukasi" /></Field>
        <Field label="Ringkasan" hint="Juga tampil sebagai subjudul."><Textarea value={d.excerpt ?? ""} onChange={(e) => set({ excerpt: e.target.value })} readOnly={!editable} maxLength={300} rows={3} /></Field>

        <section className="grid gap-4 border-t border-slate-100 pt-6">
          <p className="text-[13px] font-semibold">Tampilan di Google</p>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="truncate text-xs text-slate-500">{url}</p>
            <p className="mt-1 line-clamp-1 text-[17px] text-[#1a0dab]">{d.seoTitle || d.title}</p>
            <p className="mt-1 line-clamp-2 text-[13px] text-slate-600">{d.seoDesc || d.excerpt || d.body.slice(0, 160)}</p>
          </div>
          <Field label="Judul SEO" hint={`${(d.seoTitle ?? "").length}/70`}><Input value={d.seoTitle ?? ""} onChange={(e) => set({ seoTitle: e.target.value })} readOnly={!editable} maxLength={70} placeholder={d.title} /></Field>
          <Field label="Deskripsi SEO" hint={`${(d.seoDesc ?? "").length}/160`}><Textarea value={d.seoDesc ?? ""} onChange={(e) => set({ seoDesc: e.target.value })} readOnly={!editable} maxLength={160} rows={3} /></Field>
        </section>

        <section className="grid gap-2 border-t border-slate-100 pt-6 text-[13px] text-slate-600">
          <p>Penulis <b className="font-medium text-slate-900">{art.author.name}</b>{art.division ? ` · ${art.division.name}` : ""}</p>
          {art.publishedAt && <p>Tayang {fmtDate(art.publishedAt)}</p>}
        </section>

        <section className="grid gap-2 border-t border-slate-100 pt-6">
          <Button variant="outline" onClick={onHistory}><History size={15} aria-hidden /> Riwayat versi</Button>
          {art.status === "PUBLISHED" && <Button variant="outline" onClick={onArchive}>Tarik dari web</Button>}
          {editable && <Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={onDelete}><Trash2 size={15} aria-hidden /> Hapus artikel</Button>}
        </section>
      </div>
    </Dialog>
  );
}

function PublishDialog({ open, onClose, onSubmit, loading }: { open: boolean; onClose: () => void; onSubmit: (scheduledAt?: string) => void; loading: boolean }) {
  const [later, setLater] = useState(false);
  const [when, setWhen] = useState(toLocalInput(new Date(Date.now() + 86_400_000)));
  return (
    <Dialog open={open} onClose={onClose} title="Siap terbit?" desc="Langsung tampil di web publik, tanpa menunggu persetujuan." size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button loading={loading} onClick={() => onSubmit(later ? new Date(when).toISOString() : undefined)}>{later ? <><CalendarClock size={15} aria-hidden /> Jadwalkan</> : <><Check size={15} aria-hidden /> Tayangkan sekarang</>}</Button></>}>
      <div className="grid gap-2">
        {[{ v: false, t: "Sekarang", s: "Langsung tampil di blog" }, { v: true, t: "Jadwalkan", s: "Tayang otomatis di waktu tertentu" }].map((o) => (
          <label key={o.t} className={cx("flex cursor-pointer items-start gap-3 rounded-lg border p-3", later === o.v ? "border-blue-300 bg-blue-50/40" : "border-slate-200")}>
            <input type="radio" className="mt-1 accent-[var(--primary)]" checked={later === o.v} onChange={() => setLater(o.v)} />
            <span><span className="block text-[13px] font-medium">{o.t}</span><span className="text-xs text-slate-500">{o.s}</span></span>
          </label>
        ))}
        {later && <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Waktu tayang" />}
        <p className="mt-1 text-xs text-slate-500">Penulis mendapat poin keaktifan saat artikel tayang.</p>
      </div>
    </Dialog>
  );
}

function HistoryDialog({ open, id, onClose, onRestore }: { open: boolean; id: string; onClose: () => void; onRestore?: (body: string) => void }) {
  const q = useQuery({ queryKey: ["article-revisions", id], queryFn: () => api<{ id: string; createdAt: string; editor: string; body: string }[]>(`/articles/${id}/revisions`), enabled: open });
  const [sel, setSel] = useState<string | null>(null);
  const cur = q.data?.find((r) => r.id === sel) ?? q.data?.[0];
  return (
    <Dialog open={open} onClose={onClose} title="Riwayat versi" desc="Versi isi tersimpan otomatis maksimal tiap 5 menit." size="lg"
      footer={onRestore && cur && <Button onClick={() => onRestore(cur.body)}>Pulihkan versi ini</Button>}>
      {q.data?.length === 0 ? <p className="py-8 text-center text-[13px] text-slate-500">Belum ada versi tersimpan.</p> : (
        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <ul className="grid content-start gap-1">
            {q.data?.map((r) => (
              <li key={r.id}><button onClick={() => setSel(r.id)} className={cx("w-full rounded-lg px-3 py-2 text-left text-[13px]", cur?.id === r.id ? "bg-slate-100 font-medium" : "hover:bg-slate-50")}>{fmtDate(r.createdAt)}<span className="block text-xs font-normal text-slate-500">{r.editor}</span></button></li>
            ))}
          </ul>
          <pre className="max-h-96 overflow-auto rounded-lg bg-slate-50 p-3 font-serif text-[13px] whitespace-pre-wrap text-slate-700">{cur?.body}</pre>
        </div>
      )}
    </Dialog>
  );
}

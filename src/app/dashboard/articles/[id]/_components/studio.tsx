"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EditorContent } from "@tiptap/react";
import {
    ArrowLeft, Eye, Loader2, Send, Settings2, Trash2, X
} from "lucide-react";
import { ArticleView, readingMinutes } from "@/components/site/article-view";
import { useToast } from "@/components/toast";
import { Badge, Button } from "@/components/ui";
import { api, publicFile } from "@/lib/api";
import { fmtDate, fmtRelative } from "@/lib/format";
import { type Article, type Draft } from "../_lib";
import { useArticleEditor } from "./use-article-editor";
import { CoverPicker, EditorMenus } from "./editor-menus";
import { HistoryDialog, PublishDialog, SettingsPanel } from "./panels";

// Editor ala Ghost: kanvas bersih, menu muncul saat dibutuhkan, pengaturan di panel samping.
export function Studio({ a }: { a: Article }) {
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

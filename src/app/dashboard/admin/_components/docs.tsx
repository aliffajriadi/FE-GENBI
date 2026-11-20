"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileImage, FileText, FolderOpen, Lock, Plus, Search, Trash2, Users } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { FilePick } from "@/components/file-pick";
import { useToast } from "@/components/toast";
import { Button, Card, cx, EmptyState, ErrorText, Field, Input, Select, Skeleton } from "@/components/ui";
import { api, openFile, uploadFile } from "@/lib/api";
import { type Doc, dayShort } from "../_lib";

export function Docs({ manage }: { manage: boolean }) {
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

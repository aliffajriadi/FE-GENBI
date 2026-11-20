"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Check, History, Trash2 } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { Button, cx, Field, Input, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { fmtDate, toLocalInput } from "@/lib/format";
import { type Article, type Draft } from "../_lib";

// ───── Panel pengaturan (seperti post settings Ghost) ─────

export function SettingsPanel({ open, onClose, d, set, art, editable, onHistory, onArchive, onDelete }: {
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

export function PublishDialog({ open, onClose, onSubmit, loading }: { open: boolean; onClose: () => void; onSubmit: (scheduledAt?: string) => void; loading: boolean }) {
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

export function HistoryDialog({ open, id, onClose, onRestore }: { open: boolean; id: string; onClose: () => void; onRestore?: (body: string) => void }) {
  const q = useQuery({ queryKey: ["article-revisions", id], queryFn: () => api<{ id: string; createdAt: string; editor: string; body: string }[]>(`/articles/${id}/revisions`), enabled: open });
  const [sel, setSel] = useState<string | null>(null);
  const cur = q.data?.find((r) => r.id === sel) ?? q.data?.[0];
  return (
    <Dialog open={open} onClose={onClose} title="Riwayat versi" desc="Versi isi tersimpan otomatis maksimal tiap 5 menit." size="lg"
      footer={onRestore && cur && <Button onClick={() => onRestore(cur.body)}>Pulihkan versi ini</Button>}>
      {q.data?.length === 0 ? <p className="py-8 text-center text-[13px] text-slate-500">Belum ada versi tersimpan.</p> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[180px_1fr]">
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

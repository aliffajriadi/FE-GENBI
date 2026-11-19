"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Link2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, EmptyState, ErrorText, Field, Input, PageHeader, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";

type ShortLink = { id: string; slug: string; url: string; title: string; active: boolean; clicks: number; createdAt: string; createdBy: { id: string; name: string }; canEdit: boolean };

// Shortlink pakai domain sendiri: <domain>/l/<slug> → link panjang (GForm, Canva, Drive, …).
export default function LinksPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const links = useQuery({ queryKey: ["links"], queryFn: () => api<ShortLink[]>("/links") });
  const [editing, setEditing] = useState<ShortLink | "new" | null>(null);
  const [q, setQ] = useState("");
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(location.origin), []);
  const short = (slug: string) => `${origin}/l/${slug}`;
  const copy = (slug: string) => navigator.clipboard.writeText(short(slug)).then(() => toast("Link disalin"));

  const update = useMutation({
    mutationFn: ({ id, ...body }: Partial<ShortLink> & { id: string }) => api(`/links/${id}`, { method: "PATCH", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["links"] }),
    onError: (e) => toast(e.message, { error: true }),
  });
  const del = useMutation({
    mutationFn: (id: string) => api(`/links/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["links"] }); toast("Link dihapus"); },
    onError: (e) => toast(e.message, { error: true }),
  });

  const rows = (links.data ?? []).filter((l) => !q || `${l.title} ${l.slug} ${l.url}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader title="Shortlink" desc="Buat link pendek pakai domain GenBI untuk GForm, Canva, Drive, dan lainnya." actions={<Button onClick={() => setEditing("new")}><Plus size={15} aria-hidden /> Link baru</Button>} />
      <ErrorText error={links.error} />
      <Input icon={Search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul, slug, atau tujuan…" aria-label="Cari link" className="mb-4 sm:w-80" />
      {links.isLoading && <Skeleton className="h-40 rounded-xl" />}
      {links.data?.length === 0 && <EmptyState icon={Link2} title="Belum ada shortlink" desc="Buat link pendek supaya mudah dibagikan dan dihitung kliknya." />}
      <div className="grid gap-2">
        {rows.map((l) => (
          <Card key={l.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[14px] font-medium text-slate-900">
                <span className="truncate">{l.title}</span>
                {!l.active && <Badge tone="slate">Nonaktif</Badge>}
              </p>
              <button onClick={() => copy(l.slug)} className="mt-0.5 inline-flex max-w-full items-center gap-1 font-mono text-[13px] text-primary hover:underline" title="Salin link">
                <span className="truncate">{short(l.slug).replace(/^https?:\/\//, "")}</span><Copy size={12} aria-hidden />
              </button>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex max-w-full items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
                <ExternalLink size={11} className="shrink-0" aria-hidden /><span className="truncate">{l.url}</span>
              </a>
              <p className="mt-1 text-[11px] text-slate-400">{l.createdBy.name}</p>
            </div>
            <p className="text-[13px] text-slate-600 sm:w-20 sm:text-right"><b className="text-slate-900 tabular-nums">{l.clicks}</b> klik</p>
            {l.canEdit && (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => update.mutate({ id: l.id, active: !l.active })}>{l.active ? "Nonaktifkan" : "Aktifkan"}</Button>
                <button onClick={() => setEditing(l)} className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={`Ubah ${l.title}`}><Pencil size={15} /></button>
                <button onClick={() => confirm(`Hapus link /l/${l.slug}? Link yang sudah disebar akan mati.`) && del.mutate(l.id)} className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600" aria-label={`Hapus ${l.title}`}><Trash2 size={15} /></button>
              </div>
            )}
          </Card>
        ))}
      </div>
      <LinkDialog target={editing} origin={origin} onClose={() => setEditing(null)} />
    </>
  );
}

function LinkDialog({ target, origin, onClose }: { target: ShortLink | "new" | null; origin: string; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const cur = target && target !== "new" ? target : null;
  const [slug, setSlug] = useState("");
  useEffect(() => setSlug(cur?.slug ?? ""), [cur?.slug, target]);
  const save = useMutation({
    mutationFn: (body: { title: string; url: string; slug: string }) => (cur ? api(`/links/${cur.id}`, { method: "PATCH", body }) : api("/links", { method: "POST", body })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["links"] });
      if (!cur) navigator.clipboard?.writeText(`${origin}/l/${slug}`).then(() => toast("Link dibuat & disalin"), () => toast("Link dibuat"));
      onClose();
    },
  });
  return (
    <Dialog open={!!target} onClose={onClose} title={cur ? "Ubah shortlink" : "Shortlink baru"}
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button type="submit" form="link-form" loading={save.isPending}>Simpan</Button></>}>
      <form
        id="link-form"
        key={cur?.id ?? "new"}
        className="grid gap-3"
        onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); save.mutate({ title: String(f.get("title")), url: String(f.get("url")), slug }); }}
      >
        <Field label="Judul"><Input name="title" required maxLength={120} defaultValue={cur?.title} placeholder="Mis. Form oprec panitia 2026" autoFocus /></Field>
        <Field label="Link tujuan"><Input name="url" type="url" required maxLength={1000} defaultValue={cur?.url} placeholder="https://docs.google.com/forms/…" /></Field>
        <Field label="Slug" hint={`${origin.replace(/^https?:\/\//, "")}/l/${slug || "…"}`}>
          <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} required maxLength={60} placeholder="oprec-2026" />
        </Field>
        {cur && cur.slug !== slug && <p className="text-xs text-amber-700">Mengganti slug membuat link lama yang sudah disebar tidak berlaku.</p>}
        <ErrorText error={save.error} />
      </form>
    </Dialog>
  );
}

"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ExternalLink, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/confirm";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, EmptyState, ErrorText, Field, Input, PageHeader, Select, Skeleton } from "@/components/ui";
import { PRESETS, type Design } from "@/components/photobooth/design";
import { api } from "@/lib/api";

const DesignStage = dynamic(() => import("@/components/photobooth/stage").then((m) => m.DesignStage), { ssr: false });

type Row = { id: string; name: string; design: Design; published: boolean; updatedAt: string; createdBy: { id: string; name: string }; canEdit: boolean };

export default function PhotoboothListPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const router = useRouter();
  const [confirm, confirmDialog] = useConfirm();
  const [creating, setCreating] = useState(false);
  const q = useQuery({ queryKey: ["photobooth"], queryFn: () => api<{ canPublish: boolean; rows: Row[] }>("/photobooth") });
  const refresh = () => qc.invalidateQueries({ queryKey: ["photobooth"] });

  const create = useMutation({
    mutationFn: (body: { name: string; design: Design }) => api<{ id: string }>("/photobooth", { method: "POST", body }),
    onSuccess: (t) => router.push(`/dashboard/photobooth/${t.id}`),
  });
  const publish = useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) => api(`/photobooth/${id}/publish`, { method: "POST", body: { published } }),
    onSuccess: (_, v) => { refresh(); toast(v.published ? "Template tampil di halaman Photobooth" : "Template disembunyikan"); },
    onError: (e) => toast(e.message, { error: true }),
  });
  const del = useMutation({
    mutationFn: (id: string) => api(`/photobooth/${id}`, { method: "DELETE" }),
    onSuccess: () => { refresh(); toast("Template dihapus"); },
    onError: (e) => toast(e.message, { error: true }),
  });

  const canPublish = q.data?.canPublish;
  const rows = q.data?.rows ?? [];

  return (
    <>
      <PageHeader title="Photobooth" desc={canPublish ? "Template buatan anggota. Tampilkan yang sudah layak ke halaman publik." : "Buat template photobooth. Pengurus akan meninjau sebelum tampil di halaman publik."}
        actions={<>
          <Link href="/photobooth" target="_blank"><Button variant="outline"><ExternalLink size={15} aria-hidden /> Buka photobooth</Button></Link>
          <Button onClick={() => setCreating(true)}><Plus size={15} aria-hidden /> Template baru</Button>
        </>} />

      {q.isLoading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-72" />)}</div>
        : q.error ? <ErrorText error={q.error} />
        : rows.length === 0 ? <Card><EmptyState icon={Camera} title="Belum ada template" desc="Mulai dari strip 4 foto atau 4R, lalu atur sesukamu." action={<Button onClick={() => setCreating(true)}>Buat template</Button>} /></Card>
        : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {rows.map((t) => {
              const scale = Math.min(220 / t.design.width, 260 / t.design.height);
              return (
                <Card key={t.id} className="flex flex-col overflow-hidden">
                  <div className="grid h-[284px] place-items-center bg-slate-50 p-3">
                    <DesignStage design={t.design} scale={scale} />
                  </div>
                  <div className="flex flex-1 flex-col gap-2 border-t border-slate-100 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate font-medium">{t.name}</p>
                      <Badge tone={t.published ? "green" : "slate"}>{t.published ? "Tampil" : "Draft"}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">oleh {t.createdBy.name}</p>
                    <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                      {t.canEdit && <Link href={`/dashboard/photobooth/${t.id}`}><Button size="sm" variant="outline"><Pencil size={13} aria-hidden /> Edit</Button></Link>}
                      {canPublish && (
                        <Button size="sm" variant="outline" loading={publish.isPending && publish.variables?.id === t.id} onClick={() => publish.mutate({ id: t.id, published: !t.published })}>
                          {t.published ? <><EyeOff size={13} aria-hidden /> Sembunyikan</> : <><Eye size={13} aria-hidden /> Tampilkan</>}
                        </Button>
                      )}
                      {t.canEdit && (
                        <Button size="sm" variant="ghost" aria-label={`Hapus ${t.name}`} className="text-red-600 hover:bg-red-50"
                          onClick={async () => { if (await confirm({ title: `Hapus "${t.name}"?`, desc: "Template hilang dari photobooth dan tidak bisa dikembalikan.", confirmLabel: "Hapus", danger: true })) del.mutate(t.id); }}>
                          <Trash2 size={13} aria-hidden />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

      <Dialog open={creating} onClose={() => setCreating(false)} title="Template baru" desc="Pilih ukuran awal. Semua elemen bisa digeser dan diubah setelahnya.">
        <form className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
            create.mutate({ name: f.name.trim(), design: PRESETS.find((p) => p.key === f.preset)!.make() });
          }}>
          <Field label="Nama template"><Input name="name" required minLength={2} maxLength={80} placeholder="mis. Strip Upgrading 2026" autoFocus /></Field>
          <Field label="Ukuran"><Select name="preset" defaultValue="strip">{PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</Select></Field>
          <div className="flex items-center justify-end gap-3">
            <ErrorText error={create.error} />
            <Button type="button" variant="ghost" onClick={() => setCreating(false)}>Batal</Button>
            <Button type="submit" loading={create.isPending}>Buat & buka editor</Button>
          </div>
        </form>
      </Dialog>
      {confirmDialog}
    </>
  );
}

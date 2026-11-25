"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Merge, Pencil, Plus, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/confirm";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { Button, ErrorText, Input, Select } from "@/components/ui";
import { api } from "@/lib/api";
import type { ProfileTag } from "@/lib/types";

// Admin & pengurus inti: buat kategori bidang, jadikan bidang ketikan anggota sebagai kategori, dan bersihkan skill.
export function FieldManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [editing, setEditing] = useState<string | null>(null);
  const [merging, setMerging] = useState<string | null>(null);
  const tags = useQuery({ queryKey: ["profile-tags"], queryFn: () => api<ProfileTag[]>("/profile-tags"), enabled: open });
  const done = (msg: string) => {
    for (const key of ["profile-tags", "members", "me", "person"]) qc.invalidateQueries({ queryKey: [key] });
    setEditing(null);
    setMerging(null);
    toast(msg);
  };
  const fail = (e: Error) => toast(e.message, { error: true });
  const add = useMutation({ mutationFn: (name: string) => api("/profile-tags", { method: "POST", body: { name } }), onSuccess: () => done("Kategori ditambahkan") });
  const edit = useMutation({ mutationFn: ({ id, ...body }: { id: string; name?: string; official?: boolean }) => api(`/profile-tags/${id}`, { method: "PATCH", body }), onSuccess: () => done("Tersimpan"), onError: fail });
  const del = useMutation({ mutationFn: (id: string) => api(`/profile-tags/${id}`, { method: "DELETE" }), onSuccess: () => done("Dihapus"), onError: fail });
  const merge = useMutation({ mutationFn: ({ id, targetId }: { id: string; targetId: string }) => api(`/profile-tags/${id}/merge`, { method: "POST", body: { targetId } }), onSuccess: () => done("Digabungkan"), onError: fail });
  const askMerge = async (t: ProfileTag, targetId: string) => {
    const target = all.find((x) => x.id === targetId);
    if (target && (await confirm({ title: `Gabungkan "${t.name}" ke "${target.name}"?`, desc: `${t.count} anggota dipindah ke "${target.name}", lalu "${t.name}" dihapus. Tidak bisa dibatalkan.`, confirmLabel: "Gabungkan" }))) merge.mutate({ id: t.id, targetId });
  };
  const askDelete = async (t: ProfileTag) => {
    if (await confirm({ title: `Hapus "${t.name}"?`, desc: t.count ? `Ikut terhapus dari profil ${t.count} anggota.` : "Belum dipakai anggota.", confirmLabel: "Hapus", danger: true })) del.mutate(t.id);
  };
  const all = tags.data ?? [];
  const section = (title: string, rows: ProfileTag[], empty: string) => (
    <section>
      <h3 className="mb-1 text-[13px] font-semibold text-slate-900">{title}</h3>
      {!rows.length && <p className="py-2 text-[13px] text-slate-400">{empty}</p>}
      <ul className="divide-y divide-slate-100">
        {rows.map((t) => (
          <li key={t.id} className="flex items-center gap-1 py-1.5">
            {editing === t.id ? (
              <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); edit.mutate({ id: t.id, name: String(new FormData(e.currentTarget).get("name")) }); }}>
                <Input name="name" defaultValue={t.name} required maxLength={40} autoFocus aria-label={`Nama baru untuk ${t.name}`} className="flex-1" />
                <Button size="sm" type="submit" loading={edit.isPending}>Simpan</Button>
                <Button size="sm" type="button" variant="ghost" onClick={() => setEditing(null)}>Batal</Button>
              </form>
            ) : merging === t.id ? (
              <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); askMerge(t, String(new FormData(e.currentTarget).get("target"))); }}>
                <Select name="target" required defaultValue="" aria-label={`Gabungkan ${t.name} ke`} className="flex-1">
                  <option value="" disabled>Gabungkan &quot;{t.name}&quot; ke…</option>
                  {all.filter((x) => x.kind === t.kind && x.id !== t.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </Select>
                <Button size="sm" type="submit" loading={merge.isPending}>Gabung</Button>
                <Button size="sm" type="button" variant="ghost" onClick={() => setMerging(null)}>Batal</Button>
              </form>
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate text-sm">{t.name} <span className="text-xs text-slate-400">{t.count} anggota</span></span>
                {t.kind === "FIELD" && !t.official && <Button size="sm" variant="ghost" onClick={() => edit.mutate({ id: t.id, official: true })}><BadgeCheck size={14} aria-hidden /> Jadikan kategori</Button>}
                {all.some((x) => x.kind === t.kind && x.id !== t.id) && <Button size="sm" variant="ghost" onClick={() => { setEditing(null); setMerging(t.id); }} aria-label={`Gabungkan ${t.name} ke yang lain`} title="Gabungkan ke…"><Merge size={14} aria-hidden /></Button>}
                <Button size="sm" variant="ghost" onClick={() => { setMerging(null); setEditing(t.id); }} aria-label={`Ubah ${t.name}`}><Pencil size={14} aria-hidden /></Button>
                <Button size="sm" variant="ghost" onClick={() => askDelete(t)} aria-label={`Hapus ${t.name}`}><Trash2 size={14} aria-hidden /></Button>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
  return (
    <>
      <Dialog open={open} onClose={onClose} title="Kelola bidang & skill" desc="Kategori bidang muncul sebagai pilihan di profil anggota.">
        <div className="grid gap-5">
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const f = e.currentTarget; add.mutate(String(new FormData(f).get("name")), { onSuccess: () => f.reset() }); }}>
            <Input name="name" required maxLength={40} placeholder="Kategori baru, mis. Desain" aria-label="Kategori bidang baru" className="flex-1" />
            <Button type="submit" loading={add.isPending}><Plus size={15} aria-hidden /> Tambah</Button>
          </form>
          <ErrorText error={add.error ?? tags.error} />
          {section("Kategori bidang", all.filter((t) => t.kind === "FIELD" && t.official), "Belum ada kategori.")}
          {section("Bidang lain yang diketik anggota", all.filter((t) => t.kind === "FIELD" && !t.official), "Belum ada.")}
          {section("Skill", all.filter((t) => t.kind === "SKILL"), "Belum ada.")}
        </div>
      </Dialog>
      {confirmDialog}
    </>
  );
}

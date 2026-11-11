"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, Check, ExternalLink, FolderTree, ImagePlus, Loader2, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, CardHeader, cx, EmptyState, ErrorText, Field, Input, PageHeader, Table, Tabs, Td, Textarea } from "@/components/ui";
import { api, publicFile, uploadFile } from "@/lib/api";
import { resizeJpeg } from "@/lib/image";
import { fmtDate, toLocalInput } from "@/lib/format";
import type { Division } from "@/lib/types";
import { useMe } from "@/lib/use-me";

type Period = { id: string; name: string; startDate: string; endDate: string; isActive: boolean };
type Role = { id: string; key: string; name: string; permissions: string[] };
type Perm = { key: string; label: string };
type TabKey = "site" | "divisions" | "periods" | "roles";

export default function SettingsPage() {
  const { can } = useMe();
  const tabs = [
    ...(can("article.publish") ? [{ value: "site" as const, label: "Tampilan web" }] : []),
    ...(can("division.manage") ? [{ value: "divisions" as const, label: "Divisi" }, { value: "periods" as const, label: "Periode" }] : []),
    ...(can("role.manage") ? [{ value: "roles" as const, label: "Role & akses" }] : []),
  ];
  const [tab, setTab] = useState<TabKey>("site");
  const active = tabs.find((t) => t.value === tab) ? tab : tabs[0]?.value;

  return (
    <>
      <PageHeader title="Pengaturan" desc="Struktur organisasi dan hak akses. Semua perubahan tercatat di audit log." />
      {tabs.length > 1 && <div className="mb-6"><Tabs value={active} onChange={setTab} items={tabs} /></div>}
      {active === "divisions" && <Divisions />}
      {active === "periods" && <Periods />}
      {active === "roles" && <Roles />}
      {active === "site" && <SiteSettings />}
    </>
  );
}

function Divisions() {
  const qc = useQueryClient();
  const toast = useToast();
  const [edit, setEdit] = useState<Division | "new" | null>(null);
  const { data = [], isLoading } = useQuery({ queryKey: ["divisions"], queryFn: () => api<Division[]>("/divisions") });
  const d = edit && edit !== "new" ? edit : null;
  const save = useMutation({
    mutationFn: (f: { name: string; description: string }) =>
      d
        ? api(`/divisions/${d.id}`, { method: "PATCH", body: { name: f.name, description: f.description || null } })
        : api("/divisions", { method: "POST", body: { name: f.name, description: f.description || undefined, slug: f.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["divisions"] }); setEdit(null); toast("Divisi tersimpan"); },
  });
  return (
    <>
      <Table
        loading={isLoading}
        toolbar={<><p className="mr-auto text-[15px] font-semibold">Divisi periode aktif</p><Button size="sm" onClick={() => setEdit("new")}><Plus size={14} aria-hidden /> Divisi baru</Button></>}
        head={["Divisi", "Anggota", ""]}
        empty={data.length === 0 && <EmptyState icon={FolderTree} title="Belum ada divisi" desc="Tambahkan divisi agar anggota bisa dikelompokkan." />}
      >
        {data.map((x) => (
          <tr key={x.id} className="hover:bg-slate-50/60">
            <Td><span className="block font-medium">{x.name}</span><span className="text-xs text-slate-500">{x.description ?? "Belum ada deskripsi"}</span></Td>
            <Td className="tabular-nums">{x._count?.memberships ?? 0}</Td>
            <Td className="text-right"><Button variant="ghost" size="sm" onClick={() => setEdit(x)}><Pencil size={13} aria-hidden /> Ubah</Button></Td>
          </tr>
        ))}
      </Table>
      <Dialog
        open={!!edit}
        onClose={() => setEdit(null)}
        title={d ? "Ubah divisi" : "Divisi baru"}
        desc="Deskripsi tampil di halaman publik."
        footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Batal</Button><Button type="submit" form="div-form" loading={save.isPending}>Simpan</Button></>}
      >
        <form id="div-form" key={d?.id ?? "new"} className="grid gap-4" onSubmit={(e) => { e.preventDefault(); save.mutate(Object.fromEntries(new FormData(e.currentTarget)) as { name: string; description: string }); }}>
          <Field label="Nama divisi"><Input name="name" required minLength={2} defaultValue={d?.name} placeholder="Media & Komunikasi" /></Field>
          <Field label="Deskripsi"><Textarea name="description" defaultValue={d?.description ?? ""} placeholder="Mengelola publikasi, dokumentasi, dan media sosial GenBI." /></Field>
          <ErrorText error={save.error} />
        </form>
      </Dialog>
    </>
  );
}

function Periods() {
  const qc = useQueryClient();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [activate, setActivate] = useState<Period | null>(null);
  const { data = [], isLoading } = useQuery({ queryKey: ["periods"], queryFn: () => api<Period[]>("/periods") });
  const create = useMutation({
    mutationFn: (body: unknown) => api("/periods", { method: "POST", body }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["periods"] }); setAdding(false); toast("Periode dibuat"); },
  });
  const act = useMutation({
    mutationFn: (id: string) => api(`/periods/${id}/activate`, { method: "POST" }),
    onSuccess: () => { toast("Periode diaktifkan. Silakan login ulang."); setTimeout(() => location.assign("/login"), 1200); },
    onError: (e) => toast(e.message, { error: true }),
  });
  const y = new Date().getFullYear();
  return (
    <>
      <Table
        loading={isLoading}
        toolbar={<><p className="mr-auto text-[15px] font-semibold">Periode kepengurusan</p><Button size="sm" onClick={() => setAdding(true)}><Plus size={14} aria-hidden /> Periode baru</Button></>}
        head={["Periode", "Mulai", "Selesai", "Status", ""]}
        empty={data.length === 0 && <EmptyState icon={CalendarRange} title="Belum ada periode" />}
      >
        {data.map((p) => (
          <tr key={p.id}>
            <Td className="font-medium">{p.name}</Td>
            <Td className="text-slate-600">{fmtDate(p.startDate)}</Td>
            <Td className="text-slate-600">{fmtDate(p.endDate)}</Td>
            <Td>{p.isActive ? <Badge status="ACTIVE">Aktif</Badge> : <Badge tone="outline">Arsip</Badge>}</Td>
            <Td className="text-right">{!p.isActive && <Button variant="outline" size="sm" onClick={() => setActivate(p)}>Aktifkan</Button>}</Td>
          </tr>
        ))}
      </Table>
      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Periode baru"
        size="sm"
        footer={<><Button variant="ghost" onClick={() => setAdding(false)}>Batal</Button><Button type="submit" form="period-form" loading={create.isPending}>Buat</Button></>}
      >
        <form
          id="period-form"
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
            create.mutate({ name: f.name, startDate: new Date(f.startDate).toISOString(), endDate: new Date(f.endDate).toISOString() });
          }}
        >
          <Field label="Nama"><Input name="name" required defaultValue={`${y + 1}/${y + 2}`} /></Field>
          <Field label="Mulai"><Input type="datetime-local" name="startDate" required defaultValue={toLocalInput(new Date(y + 1, 0, 1))} /></Field>
          <Field label="Selesai"><Input type="datetime-local" name="endDate" required defaultValue={toLocalInput(new Date(y + 2, 0, 1))} /></Field>
          <ErrorText error={create.error} />
        </form>
      </Dialog>
      <Dialog
        open={!!activate}
        onClose={() => setActivate(null)}
        title={`Aktifkan periode ${activate?.name}?`}
        size="sm"
        footer={<><Button variant="ghost" onClick={() => setActivate(null)}>Batal</Button><Button variant="danger" loading={act.isPending} onClick={() => activate && act.mutate(activate.id)}>Aktifkan</Button></>}
      >
        <p className="text-slate-600">Periode lain menjadi arsip. Anggota tanpa jabatan di periode ini tidak bisa login sampai Sekretaris mengisi jabatannya. Data periode lama tetap tersimpan.</p>
      </Dialog>
    </>
  );
}

function Roles() {
  const qc = useQueryClient();
  const toast = useToast();
  const roles = useQuery({ queryKey: ["roles"], queryFn: () => api<Role[]>("/roles") });
  const perms = useQuery({ queryKey: ["permissions"], queryFn: () => api<Perm[]>("/permissions") });
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const save = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) => api(`/roles/${id}/permissions`, { method: "PATCH", body: { permissions } }),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      setDraft(({ [v.id]: _x, ...rest }) => rest);
      toast("Hak akses role diperbarui");
    },
    onError: (e) => toast(e.message, { error: true }),
  });
  const list = roles.data ?? [];
  const value = (r: Role) => draft[r.id] ?? r.permissions;
  const toggle = (r: Role, k: string) => setDraft((d) => ({ ...d, [r.id]: value(r).includes(k) ? value(r).filter((x) => x !== k) : [...value(r), k] }));

  return (
    <Card className="overflow-hidden">
      <CardHeader title="Matriks hak akses" desc="Centang permission untuk tiap role. Pengecekan juga dilakukan di server, bukan cuma menyembunyikan tombol." />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-slate-50/70 text-xs text-slate-500">
            <tr className="border-b border-slate-100">
              <th scope="col" className="sticky left-0 bg-slate-50 px-5 py-2.5 font-medium">Permission</th>
              {list.map((r) => <th key={r.id} scope="col" className="px-3 py-2.5 text-center font-medium whitespace-nowrap">{r.name}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {perms.data?.map((p) => (
              <tr key={p.key} className="hover:bg-slate-50/60">
                <th scope="row" className="sticky left-0 bg-white px-5 py-2 text-left font-normal">
                  <span className="block text-slate-900">{p.label}</span>
                  <span className="font-mono text-[11px] text-slate-400">{p.key}</span>
                </th>
                {list.map((r) => {
                  const on = value(r).includes(p.key);
                  const locked = r.key === "SYS_ADMIN";
                  return (
                    <td key={r.id} className="px-3 py-2 text-center">
                      <button
                        disabled={locked}
                        onClick={() => toggle(r, p.key)}
                        aria-pressed={on}
                        aria-label={`${p.label} untuk ${r.name}`}
                        className={cx("inline-grid size-6 place-items-center rounded-md border transition", on ? "border-primary bg-primary text-white" : "border-slate-300 bg-white hover:border-slate-400", locked && "opacity-60")}
                      >
                        {on && (locked ? <Lock size={11} /> : <Check size={13} strokeWidth={3} />)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50/60">
              <td className="sticky left-0 bg-slate-50 px-5 py-3 text-xs text-slate-500">Simpan per role</td>
              {list.map((r) => (
                <td key={r.id} className="px-3 py-3 text-center">
                  {draft[r.id] && <Button size="sm" loading={save.isPending && save.variables?.id === r.id} onClick={() => save.mutate({ id: r.id, permissions: draft[r.id] })}>Simpan</Button>}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

type Site = { heroImage: string | null; heroAlt?: string; headline: string; subheadline?: string };

function SiteSettings() {
  const toast = useToast();
  const q = useQuery({ queryKey: ["site"], queryFn: () => api<Site>("/public/site") });
  const [d, setD] = useState<Site | null>(null);
  const [uploading, setUploading] = useState(false);
  useEffect(() => { if (q.data && !d) setD(q.data); }, [q.data, d]);
  const save = useMutation({
    mutationFn: (x: Site) => api("/site", { method: "PATCH", body: { ...x, heroAlt: x.heroAlt ?? "", subheadline: x.subheadline ?? "" } }),
    onSuccess: () => toast("Tampilan beranda disimpan. Perubahan muncul di web dalam ±1 menit."),
    onError: (e) => toast(e.message, { error: true }),
  });
  if (!d) return <Card className="p-6"><Loader2 className="animate-spin text-slate-400" aria-hidden /></Card>;
  const img = publicFile(d.heroImage);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <Card className="overflow-hidden">
        <CardHeader title="Pratinjau hero beranda" desc="Foto memudar ke putih di bagian bawah." action={<a href="/" target="_blank" className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">Buka beranda <ExternalLink size={13} aria-hidden /></a>} />
        <div className="relative isolate aspect-[16/10] overflow-hidden bg-slate-800">
          {img && <img src={img} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />}
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/85 via-slate-950/60 via-55% to-slate-950/10" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-2/5 bg-gradient-to-b from-transparent to-white" />
          <div className="p-6 sm:p-8">
            <p className="max-w-md font-serif text-[30px] leading-tight font-medium text-white sm:text-[38px]">{d.headline || "Judul beranda"}</p>
            {d.subheadline && <p className="mt-3 max-w-md text-[14px] text-white/85">{d.subheadline}</p>}
          </div>
        </div>
      </Card>

      <Card className="self-start">
        <form className="grid gap-5 p-5" onSubmit={(e) => { e.preventDefault(); save.mutate(d); }}>
          <div className="grid gap-2">
            <span className="text-[13px] font-medium text-slate-700">Foto latar</span>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-xs hover:bg-slate-50 focus-within:outline-2 focus-within:outline-ring">
                {uploading ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <ImagePlus size={15} aria-hidden />} {d.heroImage ? "Ganti foto" : "Upload foto"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  setUploading(true);
                  try { const up = await uploadFile(await resizeJpeg(f), { public: true }); setD({ ...d, heroImage: up.url }); } catch (err) { toast((err as Error).message, { error: true }); } finally { setUploading(false); }
                }} />
              </label>
              {d.heroImage && <Button type="button" variant="ghost" onClick={() => setD({ ...d, heroImage: null })}><Trash2 size={15} aria-hidden /> Hapus foto</Button>}
            </div>
            <span className="text-xs text-slate-500">Foto lanskap minimal 1600px, misalnya foto bersama di kegiatan. Diperkecil otomatis.</span>
          </div>
          {d.heroImage && <Field label="Deskripsi foto" hint="Dibacakan pembaca layar."><Input value={d.heroAlt ?? ""} onChange={(e) => setD({ ...d, heroAlt: e.target.value })} maxLength={200} placeholder="Anggota GenBI di Pulau Penyengat, Oktober 2026" /></Field>}
          <Field label="Judul"><Input value={d.headline} onChange={(e) => setD({ ...d, headline: e.target.value })} required minLength={3} maxLength={120} /></Field>
          <Field label="Kalimat pembuka"><Textarea value={d.subheadline ?? ""} onChange={(e) => setD({ ...d, subheadline: e.target.value })} maxLength={300} rows={3} /></Field>
          <div className="flex justify-end"><Button type="submit" loading={save.isPending}>Simpan tampilan</Button></div>
        </form>
      </Card>
    </div>
  );
}

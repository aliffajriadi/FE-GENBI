"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Apple, Download, FileText, Globe, Pencil, Plus, Smartphone, Trash2, type LucideIcon } from "lucide-react";
import QRCode from "qrcode";
import { Dialog } from "@/components/dialog";
import { Markdown } from "@/components/markdown";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, cx, EmptyState, ErrorText, Field, Input, PageHeader, Select, Tabs, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { DEFAULT_GUIDE, PLATFORM_LABEL, type DownloadGuide, type Platform } from "@/lib/app-guide";
import { fmtDate } from "@/lib/format";
import { useMe } from "@/lib/use-me";

const ICON: Record<Platform, LucideIcon> = { ANDROID: Smartphone, IOS: Apple, WEB: Globe, OTHER: FileText };
type Form = Omit<DownloadGuide, "id" | "updatedAt">;
const EMPTY: Form = { title: "", platform: "ANDROID", url: "", buttonLabel: "", body: "", order: 0 };

// Pilihan awal mengikuti perangkat pembaca (HP Android → panduan Android, iPhone → iOS).
function devicePlatform(): Platform | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  return /android/i.test(ua) ? "ANDROID" : /iphone|ipad|ipod/i.test(ua) ? "IOS" : null;
}

export default function DownloadPage() {
  const { can } = useMe();
  const admin = can("settings.manage");
  const qc = useQueryClient();
  const toast = useToast();
  const { data = [], isLoading } = useQuery({ queryKey: ["downloads"], queryFn: () => api<DownloadGuide[]>("/downloads") });
  const [selected, setSelected] = useState<string | null>(null);
  const [edit, setEdit] = useState<DownloadGuide | "new" | null>(null);

  const current = data.find((g) => g.id === selected) ?? data.find((g) => g.platform === devicePlatform()) ?? data[0];

  const del = useMutation({
    mutationFn: (id: string) => api(`/downloads/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["downloads"] }); setSelected(null); toast("Panduan dihapus"); },
    onError: (e) => toast(e.message, { error: true }),
  });

  return (
    <>
      <PageHeader
        title="Unduh aplikasi"
        desc="Pasang MyGenBI di HP untuk scan absensi, bayar kas, diskusi, dan planning divisi. Pilih panduan sesuai perangkat Anda."
        actions={admin && <Button onClick={() => setEdit("new")}><Plus size={16} aria-hidden /> Panduan baru</Button>}
      />

      {isLoading ? (
        <Card className="h-64 animate-pulse" />
      ) : data.length === 0 ? (
        <Card>
          <EmptyState
            icon={Smartphone}
            title="Belum ada panduan unduh"
            desc={admin ? "Buat panduan pertama, misalnya “Download APK Android” lengkap dengan link dan langkah instalasinya." : "Aplikasi segera tersedia. Pantau menu ini lagi nanti."}
            action={admin && <Button onClick={() => setEdit("new")}><Plus size={16} aria-hidden /> Panduan baru</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <nav aria-label="Daftar panduan" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0 [scrollbar-width:none]">
            {data.map((g) => {
              const Icon = ICON[g.platform];
              const on = g.id === current?.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelected(g.id)}
                  aria-current={on ? "true" : undefined}
                  className={cx(
                    "flex shrink-0 items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors lg:w-full",
                    on ? "border-primary/40 bg-accent text-slate-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <span className={cx("grid size-9 shrink-0 place-items-center rounded-lg", on ? "bg-primary text-white" : "bg-slate-100 text-slate-500")}><Icon size={17} aria-hidden /></span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium">{g.title}</span>
                    <span className="text-xs text-slate-500">{PLATFORM_LABEL[g.platform]}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          {current && <GuideView key={current.id} g={current} admin={admin} onEdit={() => setEdit(current)} onDelete={() => confirm(`Hapus panduan "${current.title}"?`) && del.mutate(current.id)} />}
        </div>
      )}

      {admin && <GuideEditor edit={edit} onClose={() => setEdit(null)} onSaved={(id) => { setSelected(id); setEdit(null); }} />}
    </>
  );
}

function GuideView({ g, admin, onEdit, onDelete }: { g: DownloadGuide; admin: boolean; onEdit: () => void; onDelete: () => void }) {
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    if (g.url) QRCode.toDataURL(g.url, { width: 360, margin: 1, color: { dark: "#0f172a" } }).then(setQr);
  }, [g.url]);
  const Icon = ICON[g.platform];

  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-start gap-5 border-b border-slate-100 p-5 sm:p-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="blue"><Icon size={12} aria-hidden /> {PLATFORM_LABEL[g.platform]}</Badge>
            <span className="text-xs text-slate-500">Diperbarui {fmtDate(g.updatedAt).split(",")[0]}</span>
          </div>
          <h2 className="mt-2 font-serif text-[26px] leading-tight font-medium text-slate-900">{g.title}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {g.url && (
              <a href={g.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[14px] font-medium text-white hover:bg-primary-hover">
                <Download size={16} aria-hidden /> {g.buttonLabel?.trim() || "Unduh"}
              </a>
            )}
            {admin && (
              <>
                <Button variant="outline" onClick={onEdit}><Pencil size={14} aria-hidden /> Ubah</Button>
                <Button variant="ghost" onClick={onDelete} aria-label="Hapus panduan"><Trash2 size={15} aria-hidden /></Button>
              </>
            )}
          </div>
        </div>
        {qr && (
          <figure className="hidden shrink-0 text-center sm:block">
            <img src={qr} alt="QR link unduhan" className="size-28 rounded-lg border border-slate-200 p-1.5" />
            <figcaption className="mt-1.5 text-[11px] text-slate-500">Scan dari HP</figcaption>
          </figure>
        )}
      </div>
      <div className="p-5 sm:p-6">{g.body.trim() ? <Markdown>{g.body}</Markdown> : <p className="text-[14px] text-slate-500">Belum ada isi panduan.</p>}</div>
    </Card>
  );
}

function GuideEditor({ edit, onClose, onSaved }: { edit: DownloadGuide | "new" | null; onClose: () => void; onSaved: (id: string) => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [f, setF] = useState<Form>(EMPTY);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const existing = edit && edit !== "new" ? edit : null;

  useEffect(() => {
    if (!edit) return;
    setTab("write");
    setF(existing ? { title: existing.title, platform: existing.platform, url: existing.url, buttonLabel: existing.buttonLabel ?? "", body: existing.body, order: existing.order } : { ...EMPTY, body: DEFAULT_GUIDE });
  }, [edit, existing]);

  const save = useMutation({
    mutationFn: (x: Form) => api<DownloadGuide>(existing ? `/downloads/${existing.id}` : "/downloads", { method: existing ? "PUT" : "POST", body: { ...x, order: Number(x.order) || 0 } }),
    onSuccess: (g) => { qc.invalidateQueries({ queryKey: ["downloads"] }); toast("Panduan tersimpan"); onSaved(g.id); },
  });
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  return (
    <Dialog
      open={!!edit}
      onClose={onClose}
      size="lg"
      title={existing ? "Ubah panduan" : "Panduan baru"}
      desc="Tampil untuk semua anggota yang login di menu Unduh aplikasi."
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button type="submit" form="dl-form" loading={save.isPending}>Simpan</Button></>}
    >
      <form id="dl-form" className="grid gap-4" onSubmit={(e) => { e.preventDefault(); save.mutate(f); }}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_160px]">
          <Field label="Judul"><Input value={f.title} onChange={(e) => set("title", e.target.value)} required minLength={3} maxLength={120} placeholder="Download APK Android" /></Field>
          <Field label="Platform">
            <Select value={f.platform} onChange={(e) => set("platform", e.target.value as Platform)}>
              {(Object.keys(PLATFORM_LABEL) as Platform[]).map((p) => <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_160px_100px]">
          <Field label="Link unduhan (opsional)" hint="APK, Google Drive, App Store, TestFlight…"><Input type="url" value={f.url} onChange={(e) => set("url", e.target.value.trim())} maxLength={500} placeholder="https://..." /></Field>
          <Field label="Teks tombol"><Input value={f.buttonLabel ?? ""} onChange={(e) => set("buttonLabel", e.target.value)} maxLength={40} placeholder="Unduh APK" /></Field>
          <Field label="Urutan" hint="Kecil = atas"><Input type="number" min={0} max={999} value={f.order} onChange={(e) => set("order", Number(e.target.value))} /></Field>
        </div>
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-slate-700">Isi panduan</span>
            <Tabs value={tab} onChange={setTab} items={[{ value: "write", label: "Tulis" }, { value: "preview", label: "Pratinjau" }]} />
          </div>
          {tab === "write" ? (
            <Textarea value={f.body} onChange={(e) => set("body", e.target.value)} maxLength={20000} rows={14} className="font-mono text-[13px]" aria-label="Isi panduan" />
          ) : (
            <div className="max-h-[360px] min-h-40 overflow-y-auto rounded-lg border border-slate-200 p-4">{f.body.trim() ? <Markdown>{f.body}</Markdown> : <p className="text-[13px] text-slate-400">Belum ada isi.</p>}</div>
          )}
          <span className="text-xs text-slate-500">Markdown: <code>## judul</code>, <code>1. langkah</code>, <code>**tebal**</code>, <code>[teks](link)</code>, <code>![gambar](url)</code>.</span>
        </div>
        <ErrorText error={save.error} />
      </form>
    </Dialog>
  );
}

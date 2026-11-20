"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/components/toast";
import { Button, Card, CardHeader, Field, Input, Textarea } from "@/components/ui";
import { api, publicFile, uploadFile } from "@/lib/api";
import { resizeJpeg } from "@/lib/image";
import { LOGIN_SHADE, LoginCaption, type LoginPage } from "@/lib/login-page";

// Foto panel kanan halaman login (hanya tampil di desktop).
export function LoginPageSettings() {
  const toast = useToast();
  const q = useQuery({ queryKey: ["login-page"], queryFn: () => api<LoginPage>("/public/login-page") });
  const [d, setD] = useState<LoginPage | null>(null);
  const [uploading, setUploading] = useState(false);
  useEffect(() => { if (q.data && !d) setD(q.data); }, [q.data, d]);
  const save = useMutation({
    mutationFn: (x: LoginPage) => api("/login-page", { method: "PUT", body: { ...x, alt: x.alt ?? "", title: x.title ?? "", caption: x.caption ?? "" } }),
    onSuccess: () => toast("Halaman login disimpan."),
    onError: (e) => toast(e.message, { error: true }),
  });
  if (!d) return <Card className="p-6"><Loader2 className="animate-spin text-slate-400" aria-hidden /></Card>;
  const img = publicFile(d.image);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <Card className="overflow-hidden">
        <CardHeader title="Pratinjau panel login" desc="Foto digelapkan, makin gelap ke bawah." action={<a href="/login" target="_blank" className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">Buka login <ExternalLink size={13} aria-hidden /></a>} />
        <div className="relative mx-auto aspect-[3/4] max-h-[420px] overflow-hidden bg-primary">
          {img && <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          {img && <div className={LOGIN_SHADE} aria-hidden />}
          <LoginCaption title={d.title} caption={d.caption} small />
        </div>
      </Card>

      <Card className="self-start">
        <form className="grid gap-5 p-5" onSubmit={(e) => { e.preventDefault(); save.mutate(d); }}>
          <div className="grid gap-2">
            <span className="text-[13px] font-medium text-slate-700">Foto</span>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-xs hover:bg-slate-50 focus-within:outline-2 focus-within:outline-ring">
                {uploading ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <ImagePlus size={15} aria-hidden />} {d.image ? "Ganti foto" : "Upload foto"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  setUploading(true);
                  try { const up = await uploadFile(await resizeJpeg(f), { public: true }); setD({ ...d, image: up.url }); } catch (err) { toast((err as Error).message, { error: true }); } finally { setUploading(false); }
                }} />
              </label>
              {d.image && <Button type="button" variant="ghost" onClick={() => setD({ ...d, image: null })}><Trash2 size={15} aria-hidden /> Hapus foto</Button>}
            </div>
            <span className="text-xs text-slate-500">Foto potret atau persegi, minimal 1200px. Tanpa foto, panel tampil biru polos.</span>
          </div>
          {d.image && <Field label="Deskripsi foto" hint="Dibacakan pembaca layar."><Input value={d.alt ?? ""} onChange={(e) => setD({ ...d, alt: e.target.value })} maxLength={200} placeholder="Pengurus GenBI saat rapat kerja 2026" /></Field>}
          <Field label="Judul" hint="Kosongkan bila tidak perlu."><Input value={d.title ?? ""} onChange={(e) => setD({ ...d, title: e.target.value })} maxLength={120} /></Field>
          <Field label="Kalimat pendek"><Textarea value={d.caption ?? ""} onChange={(e) => setD({ ...d, caption: e.target.value })} maxLength={240} rows={2} /></Field>
          <div className="flex justify-end"><Button type="submit" loading={save.isPending}>Simpan</Button></div>
        </form>
      </Card>
    </div>
  );
}

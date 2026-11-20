"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/components/toast";
import { Button, Card, CardHeader, Field, Input, Textarea } from "@/components/ui";
import { api, publicFile, uploadFile } from "@/lib/api";
import { resizeJpeg } from "@/lib/image";
import { type Site } from "../_lib";

export function SiteSettings() {
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
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <Card className="overflow-hidden">
        <CardHeader title="Pratinjau hero beranda" desc="Foto memudar ke putih di bagian bawah." action={<a href="/" target="_blank" className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">Buka beranda <ExternalLink size={13} aria-hidden /></a>} />
        <div className="theme-light relative isolate aspect-[16/10] overflow-hidden bg-slate-800">
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

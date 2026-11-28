"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/components/toast";
import { Button, Card, CardHeader, Field, Input } from "@/components/ui";
import { api, publicFile, uploadFile } from "@/lib/api";

type BoothPage = { image: string | null; alt: string };

// Gambar di samping judul halaman depan /photobooth. Kosong = contoh template pertama.
export function PhotoboothPageSettings() {
  const toast = useToast();
  const q = useQuery({ queryKey: ["photobooth-page"], queryFn: () => api<BoothPage>("/public/photobooth-page") });
  const [d, setD] = useState<BoothPage | null>(null);
  const [uploading, setUploading] = useState(false);
  useEffect(() => { if (q.data && !d) setD(q.data); }, [q.data, d]);
  const save = useMutation({
    mutationFn: (x: BoothPage) => api("/photobooth-page", { method: "PUT", body: x }),
    onSuccess: () => toast("Disimpan. Halaman photobooth berubah dalam ±1 menit."),
    onError: (e) => toast(e.message, { error: true }),
  });
  if (!d) return <Card className="p-6"><Loader2 className="animate-spin text-slate-400" aria-hidden /></Card>;
  const img = publicFile(d.image);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <Card className="overflow-hidden">
        <CardHeader title="Pratinjau" desc="Tampil di samping tombol Mulai (layar tablet & desktop)." action={<a href="/photobooth" target="_blank" className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">Buka photobooth <ExternalLink size={13} aria-hidden /></a>} />
        <div className="grid min-h-64 place-items-center bg-slate-50 p-6">
          {img ? <img src={img} alt="" className="max-h-[420px] w-auto rounded-2xl shadow-xl" /> : <p className="text-center text-[13px] text-slate-500">Belum ada gambar. Halaman memakai contoh dari template pertama.</p>}
        </div>
      </Card>

      <Card className="self-start">
        <form className="grid gap-5 p-5" onSubmit={(e) => { e.preventDefault(); save.mutate(d); }}>
          <div className="grid gap-2">
            <span className="text-[13px] font-medium text-slate-700">Gambar</span>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 shadow-xs hover:bg-slate-50 focus-within:outline-2 focus-within:outline-ring">
                {uploading ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <ImagePlus size={15} aria-hidden />} {d.image ? "Ganti gambar" : "Upload gambar"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  setUploading(true);
                  try { const up = await uploadFile(f, { public: true }); setD({ ...d, image: up.url }); } catch (err) { toast((err as Error).message, { error: true }); } finally { setUploading(false); }
                }} />
              </label>
              {d.image && <Button type="button" variant="ghost" onClick={() => setD({ ...d, image: null })}><Trash2 size={15} aria-hidden /> Hapus gambar</Button>}
            </div>
            <span className="text-xs text-slate-500">Contoh hasil strip, foto acara, atau PNG transparan (maks. 2 MB agar transparansi tetap). Potret lebih pas.</span>
          </div>
          {d.image && <Field label="Deskripsi gambar" hint="Dibacakan pembaca layar."><Input value={d.alt} onChange={(e) => setD({ ...d, alt: e.target.value })} maxLength={200} placeholder="Contoh strip foto photobooth GenBI" /></Field>}
          <div className="flex justify-end"><Button type="submit" loading={save.isPending}>Simpan</Button></div>
        </form>
      </Card>
    </div>
  );
}

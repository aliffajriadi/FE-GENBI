"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink, Loader2, Smartphone } from "lucide-react";
import { useToast } from "@/components/toast";
import { Button, Card, CardHeader, Field, Input, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import type { AppVersion } from "@/lib/app-guide";

// Force update aplikasi mobile. App mengecek GET /public/app-version saat dibuka & kembali ke depan.
export function AppVersionSettings() {
  const toast = useToast();
  const q = useQuery({ queryKey: ["app-version"], queryFn: () => api<AppVersion>("/public/app-version") });
  const [d, setD] = useState<AppVersion | null>(null);
  useEffect(() => { if (q.data && !d) setD(q.data); }, [q.data, d]);
  const save = useMutation({
    mutationFn: (x: AppVersion) => api("/app-version", { method: "PUT", body: { ...x, message: x.message ?? "" } }),
    onSuccess: () => toast("Disimpan. Berlaku saat anggota membuka aplikasi berikutnya."),
    onError: (e) => toast(e.message, { error: true }),
  });
  if (!d) return <Card className="p-6"><Loader2 className="animate-spin text-slate-400" aria-hidden /></Card>;
  const ver = "^\\d+\\.\\d+\\.\\d+$";

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card className="self-start">
        <CardHeader icon={Smartphone} title="Versi aplikasi mobile" desc="Kapan anggota wajib atau disarankan memperbarui aplikasi." />
        <form className="grid gap-5 p-5" onSubmit={(e) => { e.preventDefault(); save.mutate(d); }}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Versi minimal (wajib)" hint="Di bawah ini aplikasi dikunci sampai diperbarui.">
              <Input value={d.minVersion} onChange={(e) => setD({ ...d, minVersion: e.target.value.trim() })} required pattern={ver} placeholder="1.0.0" inputMode="decimal" />
            </Field>
            <Field label="Versi terbaru (disarankan)" hint="Di bawah ini muncul ajakan update yang bisa dilewati.">
              <Input value={d.latestVersion} onChange={(e) => setD({ ...d, latestVersion: e.target.value.trim() })} required pattern={ver} placeholder="1.1.0" inputMode="decimal" />
            </Field>
          </div>
          <Field label="Link unduhan" hint="Dibuka saat anggota menekan “Perbarui” di aplikasi.">
            <Input type="url" value={d.url} onChange={(e) => setD({ ...d, url: e.target.value.trim() })} maxLength={500} placeholder="https://..." />
          </Field>
          <Field label="Pesan untuk anggota (opsional)">
            <Textarea value={d.message ?? ""} onChange={(e) => setD({ ...d, message: e.target.value })} maxLength={300} rows={3} placeholder="Versi baru memperbaiki scan absensi dan menambah halaman anggota." />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <a href="/dashboard/download" className="inline-flex h-9 items-center gap-1 px-1 text-[13px] font-medium text-primary hover:underline">Kelola panduan unduh <ExternalLink size={13} aria-hidden /></a>
            <Button type="submit" loading={save.isPending}>Simpan</Button>
          </div>
        </form>
      </Card>

      <Card className="self-start p-5 text-[13px] text-slate-600">
        <p className="mb-3 text-[15px] font-semibold text-slate-900">Cara kerjanya</p>
        <ol className="grid list-decimal gap-2 pl-4">
          <li>Naikkan <code className="rounded bg-slate-100 px-1">version</code> di <code className="rounded bg-slate-100 px-1">mobile/pubspec.yaml</code> (mis. <b>1.1.0</b>+2), build APK, lalu upload.</li>
          <li>Isi <b>Versi terbaru</b> dengan versi itu dan tempel link unduhannya. Anggota dengan versi lama akan melihat ajakan update.</li>
          <li>Kalau versi lama harus berhenti dipakai (mis. ada bug absensi), naikkan juga <b>Versi minimal</b>. Aplikasi versi lama langsung terkunci dan hanya menampilkan tombol perbarui.</li>
        </ol>
        <p className="mt-3 text-slate-500">Isi <b>0.0.0</b> di kedua kolom untuk mematikan pengecekan.</p>
      </Card>
    </div>
  );
}

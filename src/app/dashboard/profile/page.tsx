"use client";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { AtSign, Briefcase, Camera, Globe, ImagePlus, KeyRound, Loader2, QrCode, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { resizeJpeg } from "@/lib/image";
import { useToast } from "@/components/toast";
import { Avatar, Button, Card, CardHeader, ErrorText, Field, Input, PageHeader, Skeleton, Textarea } from "@/components/ui";
import { api, publicFile, saveTokens, uploadFile } from "@/lib/api";
import { useMe } from "@/lib/use-me";

export default function ProfilePage() {
  const { me } = useMe();
  const qc = useQueryClient();
  const toast = useToast();
  const [qr, setQr] = useState("");

  useEffect(() => {
    if (me?.memberQr) QRCode.toDataURL(me.memberQr, { width: 400, margin: 1, color: { dark: "#0f172a" } }).then(setQr);
  }, [me?.memberQr]);

  const profile = useMutation({
    mutationFn: (body: unknown) => api("/me", { method: "PATCH", body }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["me"] }); toast("Profil disimpan"); },
  });
  const password = useMutation({
    mutationFn: (body: unknown) => api<{ accessToken: string; refreshToken: string }>("/auth/change-password", { method: "POST", body }),
    onSuccess: (t) => { saveTokens(t.accessToken, t.refreshToken); toast("Password diganti. Perangkat lain otomatis keluar."); },
  });

  if (!me) return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-72" /></div>;
  const v = (s: string) => s.trim() || null;

  return (
    <>
      <PageHeader title="Profil saya" desc="Email, NIM, dan jabatan diubah oleh Sekretaris." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid min-w-0 grid-cols-1 content-start gap-6">
          <Card className="overflow-hidden">
            <CoverEditor src={me.coverUrl} />
            <div className="flex flex-wrap items-center justify-between gap-4 p-5">
              <AvatarEditor name={me.name} src={me.avatarUrl}>
                <p className="text-lg font-semibold">{me.name}</p>
                <p className="truncate text-[13px] text-slate-500">{me.email}{me.nim ? ` · NIM ${me.nim}` : ""}</p>
                <p className="mt-0.5 text-[13px] text-slate-600">{me.position ?? me.roleName}{me.division ? ` · ${me.division.name}` : ""}</p>
              </AvatarEditor>
              <Link href={`/dashboard/people/${me.id}`} className="text-[13px] font-medium text-primary hover:underline">Lihat profil publik</Link>
            </div>
          </Card>

          <Card>
            <CardHeader icon={AtSign} title="Bio & media sosial" desc="Tampil di profilmu untuk sesama anggota." />
            <form
              key={`social-${me.id}`}
              className="grid items-start gap-4 p-5 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
                profile.mutate({ bio: v(f.bio), instagram: f.instagram, tiktok: f.tiktok, linkedin: f.linkedin, website: v(f.website), profilePublic: f.profilePublic === "on" });
              }}
            >
              <Field label="Bio" hint="Maksimal 300 karakter." className="sm:col-span-2">
                <Textarea name="bio" defaultValue={me.bio ?? ""} maxLength={300} rows={3} placeholder="Mahasiswa Akuntansi, suka menulis soal literasi keuangan dan kegiatan sosial." />
              </Field>
              <Field label="Instagram"><Input icon={AtSign} name="instagram" defaultValue={me.instagram ?? ""} placeholder="username" maxLength={60} /></Field>
              <Field label="TikTok"><Input icon={AtSign} name="tiktok" defaultValue={me.tiktok ?? ""} placeholder="username" maxLength={60} /></Field>
              <Field label="LinkedIn" hint="Tempel link profil atau username saja"><Input icon={Briefcase} name="linkedin" defaultValue={me.linkedin ?? ""} placeholder="linkedin.com/in/username" maxLength={200} /></Field>
              <Field label="Website"><Input icon={Globe} name="website" type="url" defaultValue={me.website ?? ""} placeholder="https://blogkamu.com" maxLength={200} /></Field>
              <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 sm:col-span-2">
                <input type="checkbox" name="profilePublic" defaultChecked={me.profilePublic} className="mt-0.5 size-4 accent-[var(--primary)]" />
                <span>
                  <span className="block text-sm font-medium">Tampilkan profil di web publik</span>
                  <span className="mt-0.5 block text-xs text-slate-500">Foto, nama, jabatan, bio, medsos, dan artikelmu bisa dilihat siapa saja di halaman Anggota. Kontak, NIM, dan kampus tidak pernah ditampilkan.</span>
                </span>
              </label>
              <div className="flex items-center justify-end gap-3 sm:col-span-2">
                <ErrorText error={profile.error} />
                <Button type="submit" loading={profile.isPending}>Simpan</Button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader icon={UserRound} title="Data diri" desc="Dipakai pengurus untuk menghubungi Anda." />
            <form
              key={me.id}
              className="grid items-start gap-4 p-5 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
                profile.mutate({ name: f.name, phone: v(f.phone), campus: v(f.campus), major: v(f.major), batch: v(f.batch) });
              }}
            >
              <Field label="Nama lengkap" className="sm:col-span-2"><Input name="name" required minLength={2} defaultValue={me.name} /></Field>
              <Field label="No. HP"><Input name="phone" type="tel" defaultValue={me.phone ?? ""} placeholder="08…" /></Field>
              <Field label="Angkatan"><Input name="batch" defaultValue={me.batch ?? ""} placeholder="2023" /></Field>
              <Field label="Kampus"><Input name="campus" defaultValue={me.campus ?? ""} /></Field>
              <Field label="Jurusan"><Input name="major" defaultValue={me.major ?? ""} /></Field>
              <div className="flex items-center justify-end gap-3 sm:col-span-2">
                <ErrorText error={profile.error} />
                <Button type="submit" loading={profile.isPending}>Simpan profil</Button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader icon={KeyRound} title="Ganti password" desc="Semua perangkat lain akan otomatis keluar." />
            <form method="post"
              className="grid items-start gap-4 p-5 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
                if (f.newPassword !== f.confirm) return toast("Konfirmasi password tidak sama", { error: true });
                password.mutate({ currentPassword: f.currentPassword, newPassword: f.newPassword }, { onSuccess: () => form.reset() });
              }}
            >
              <Field label="Password lama" className="sm:col-span-2"><Input name="currentPassword" type="password" autoComplete="current-password" required /></Field>
              <Field label="Password baru" hint="Minimal 8 karakter"><Input name="newPassword" type="password" autoComplete="new-password" required minLength={8} /></Field>
              <Field label="Ulangi password baru"><Input name="confirm" type="password" autoComplete="new-password" required minLength={8} /></Field>
              <div className="flex items-center justify-end gap-3 sm:col-span-2">
                <ErrorText error={password.error} />
                <Button type="submit" variant="outline" loading={password.isPending}>Ganti password</Button>
              </div>
            </form>
          </Card>
        </div>

        <Card className="self-start">
          <CardHeader icon={QrCode} title="QR personal" desc="Tunjukkan ke panitia kalau scan dari HP-mu bermasalah." />
          <div className="p-5">
            {qr ? <img src={qr} alt="QR personal anggota" className="w-full rounded-lg border border-slate-100" /> : <Skeleton className="aspect-square w-full" />}
            <p className="mt-3 text-center text-xs text-slate-500">Jangan bagikan QR ini; siapa pun yang memegangnya bisa diabsenkan panitia atas nama Anda.</p>
          </div>
        </Card>
      </div>
    </>
  );
}

// Potong tengah jadi persegi 512px di browser: file kecil dan metadata (EXIF, lokasi) ikut terbuang.
async function squareJpeg(file: File): Promise<File> {
  const img = await createImageBitmap(file);
  const side = Math.min(img.width, img.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(512, side);
  canvas.getContext("2d")!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("Gagal memproses foto"))), "image/jpeg", 0.88));
  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}

function AvatarEditor({ name, src, children }: { name: string; src: string | null; children: React.ReactNode }) {
  const qc = useQueryClient();
  const toast = useToast();
  const save = useMutation({
    mutationFn: async (file: File | null) => {
      const avatarUrl = file ? (await uploadFile(await squareJpeg(file), { public: true })).url : null;
      return api("/me", { method: "PATCH", body: { avatarUrl } });
    },
    onSuccess: (_, file) => { qc.invalidateQueries({ queryKey: ["me"] }); toast(file ? "Foto profil diperbarui" : "Foto profil dihapus"); },
    onError: (e) => toast(e.message, { error: true }),
  });
  return (
    <div className="flex min-w-0 items-center gap-5">
      <div className="relative">
        <Avatar name={name} src={src} size={72} />
        {save.isPending && <span className="absolute inset-0 grid place-items-center rounded-full bg-white/70"><Loader2 size={18} className="animate-spin text-slate-600" aria-hidden /></span>}
      </div>
      <div className="min-w-0">
      {children}
      <div className="mt-3 flex gap-2">
        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 focus-within:outline-2 focus-within:outline-ring">
          <Camera size={14} aria-hidden /> {src ? "Ganti foto" : "Tambah foto"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={save.isPending}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) save.mutate(f); }} />
        </label>
        {src && <Button variant="ghost" size="sm" disabled={save.isPending} onClick={() => save.mutate(null)}><Trash2 size={14} aria-hidden /> Hapus</Button>}
      </div>
      </div>
    </div>
  );
}

// Latar profil: foto lebar di atas kartu, bisa diganti / dihapus.
function CoverEditor({ src }: { src: string | null }) {
  const qc = useQueryClient();
  const toast = useToast();
  const save = useMutation({
    mutationFn: async (file: File | null) => {
      const coverUrl = file ? (await uploadFile(await resizeJpeg(file, 1600), { public: true })).url : null;
      return api("/me", { method: "PATCH", body: { coverUrl } });
    },
    onSuccess: (_, file) => { qc.invalidateQueries({ queryKey: ["me"] }); toast(file ? "Latar profil diperbarui" : "Latar profil dihapus"); },
    onError: (e) => toast(e.message, { error: true }),
  });
  const img = publicFile(src);
  return (
    <div className="group relative h-36 bg-[#f3f1ec] sm:h-44">
      {img && <img src={img} alt="" className="h-full w-full object-cover" />}
      <div className="absolute right-3 bottom-3 flex gap-2">
        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-white/95 px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-white focus-within:outline-2 focus-within:outline-ring">
          {save.isPending ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <ImagePlus size={14} aria-hidden />} {src ? "Ganti latar" : "Tambah latar"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={save.isPending}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) save.mutate(f); }} />
        </label>
        {src && <button type="button" onClick={() => save.mutate(null)} disabled={save.isPending} className="grid size-8 place-items-center rounded-lg bg-white/95 text-slate-600 shadow-sm hover:text-red-600" aria-label="Hapus latar profil"><Trash2 size={14} /></button>}
      </div>
    </div>
  );
}

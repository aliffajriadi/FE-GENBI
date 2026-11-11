"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarCheck, Eye, EyeOff, Lock, Mail, ScanLine, Trophy } from "lucide-react";
import { Button, ErrorText, Field, Input } from "@/components/ui";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [ready, setReady] = useState(false);

  // Sebelum JS siap, form native bisa terkirim sebagai GET dan password masuk ke URL/riwayat browser.
  // Tombol dikunci sampai hydrate, dan URL yang terlanjur berisi kredensial dibersihkan.
  useEffect(() => {
    setReady(true);
    if (location.search) history.replaceState(null, "", location.pathname);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    try {
      await login(String(f.get("email")), String(f.get("password")));
      router.replace("/dashboard");
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <section className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" className="inline-flex items-center gap-1.5 self-start text-[13px] text-slate-500 hover:text-slate-900">
          <ArrowLeft size={15} aria-hidden /> Kembali ke beranda
        </Link>
        <div className="m-auto w-full max-w-sm py-12">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-base font-bold text-white">G</span>
          <h1 className="mt-6 font-serif text-[32px] font-medium tracking-[-0.01em]">Masuk ke MyGenBI</h1>
          <p className="mt-1.5 text-slate-500">Akun dibuat oleh Sekretaris. Lupa password? Hubungi Sekretaris atau admin.</p>
          <form method="post" onSubmit={onSubmit} className="mt-8 grid gap-4">
            <Field label="Email">
              <Input icon={Mail} name="email" type="email" autoComplete="email" placeholder="nama@email.com" required autoFocus />
            </Field>
            <Field label="Password">
              <div className="relative">
                <Input icon={Lock} name="password" type={show ? "text" : "password"} autoComplete="current-password" placeholder="••••••••" required />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700" aria-label={show ? "Sembunyikan password" : "Tampilkan password"}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            <ErrorText error={error} />
            <Button type="submit" size="lg" loading={loading} disabled={!ready} className="mt-2 w-full">Masuk</Button>
          </form>
        </div>
      </section>

      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-white lg:flex">
        <p className="text-sm font-medium text-blue-200">MyGenBI</p>
        <div>
          <h2 className="max-w-md font-serif text-[38px] leading-[1.15] font-medium">Absensi rapat cukup scan QR. Poin keaktifan terhitung sendiri.</h2>
          <ul className="mt-10 grid gap-5">
            {[
              { icon: ScanLine, t: "QR berganti tiap 20 detik", d: "Tidak bisa difoto lalu dikirim ke grup untuk titip absen." },
              { icon: Trophy, t: "Poin tercatat per kejadian", d: "Hadir, telat, panitia, kontribusi: semua bisa ditelusuri asalnya." },
              { icon: CalendarCheck, t: "Rekap otomatis", d: "Persentase kehadiran per anggota dan divisi, siap export Excel." },
            ].map(({ icon: Icon, t, d }) => (
              <li key={t} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icon size={18} aria-hidden />
                </span>
                <span>
                  <span className="block font-medium">{t}</span>
                  <span className="mt-0.5 block text-[13px] text-blue-200">{d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-blue-300">Generasi Baru Indonesia</p>
      </aside>
    </main>
  );
}

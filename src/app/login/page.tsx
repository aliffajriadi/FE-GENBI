"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, EyeOff, IdCard, Lock } from "lucide-react";
import { Button, ErrorText, Field, Input } from "@/components/ui";
import { api, hasSession, login, publicFile } from "@/lib/api";
import { LOGIN_SHADE, LoginCaption, type LoginPage } from "@/lib/login-page";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [ready, setReady] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const page = useQuery({ queryKey: ["login-page"], queryFn: () => api<LoginPage>("/public/login-page"), staleTime: 5 * 60_000 });
  const img = publicFile(page.data?.image);

  // Sebelum JS siap, form native bisa terkirim sebagai GET dan password masuk ke URL/riwayat browser.
  // Tombol dikunci sampai hydrate, dan URL yang terlanjur berisi kredensial dibersihkan.
  useEffect(() => {
    if (location.search) history.replaceState(null, "", location.pathname);
    // Sudah login: langsung ke dashboard. Sesi yang ternyata kedaluwarsa dibersihkan api() lalu kembali ke sini tanpa loop.
    if (hasSession()) { setRedirecting(true); goNext(); return; }
    setReady(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function goNext() {
    // Dari form anggota (/f/…) atau slot kelompok (/s/…): kembali ke sana setelah login.
    let next: string | null = null;
    try { next = sessionStorage.getItem("next"); sessionStorage.removeItem("next"); } catch {}
    router.replace(next && /^\/(f|s)\//.test(next) ? next : "/dashboard");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    try {
      await login(String(f.get("login")), String(f.get("password")));
      goNext();
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  }

  if (redirecting) return null;

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <section className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" className="inline-flex items-center gap-1.5 self-start text-[13px] text-slate-500 hover:text-slate-900">
          <ArrowLeft size={15} aria-hidden /> Kembali ke beranda
        </Link>
        <div className="m-auto w-full max-w-sm py-12">
          <img src="/logo.png" alt="GenBI" width={48} height={48} className="size-12" />
          <h1 className="mt-6 font-serif text-[32px] font-medium tracking-[-0.01em]">Masuk ke MyGenBI</h1>
          <p className="mt-1.5 text-slate-500">Akun dibuat oleh Sekretaris. Lupa password? Hubungi Sekretaris atau admin.</p>
          <form method="post" onSubmit={onSubmit} className="mt-8 grid gap-4">
            <Field label="NIM atau email">
              <Input icon={IdCard} name="login" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="NIM atau nama@email.com" required autoFocus />
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

      {/* Desktop: foto pilihan admin, digelapkan makin pekat ke bawah. Tanpa foto: panel biru polos. */}
      <aside className="relative hidden overflow-hidden bg-primary lg:block">
        {img && (
          <>
            <img src={img} alt={page.data?.alt ?? ""} className="absolute inset-0 h-full w-full object-cover" />
            <div className={LOGIN_SHADE} aria-hidden />
          </>
        )}
        {page.data && <LoginCaption title={page.data.title} caption={page.data.caption} />}
      </aside>
    </main>
  );
}

import type { Metadata } from "next";
import { API } from "@/components/site/public-api";
import { type Sig, SignatureCard } from "./_components/signature-card";

// Halaman verifikasi tanda tangan elektronik: tujuan QR yang dibuat di /dashboard/signatures.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verifikasi tanda tangan · MyGenBI", robots: { index: false, follow: false } };

// null = kode tidak ada (404); "error" = backend tidak terjangkau.
async function load(code: string): Promise<Sig | null | "error"> {
  const res = await fetch(`${API}/public/signatures/${encodeURIComponent(code)}`, { cache: "no-store" }).catch(() => null);
  if (!res) return "error";
  if (res.status === 404) return null;
  return res.ok ? (await res.json()).data : "error";
}

export default async function SignaturePage({ params }: { params: Promise<{ code: string }> }) {
  const found = await load((await params).code);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[radial-gradient(120%_90%_at_50%_0%,#1d5bb8_0%,#11418b_45%,#081f45_100%)] px-4 py-8 sm:py-14">
      {/* Latar: kisi halus + dua cahaya lembut, sama dengan halaman shortlink */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.05)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)] bg-[size:44px_44px]" aria-hidden />
      <div className="pointer-events-none absolute -top-24 -left-24 size-80 rounded-full bg-sky-400/30 blur-3xl motion-safe:animate-[link-float_9s_ease-in-out_infinite]" aria-hidden />
      <div className="pointer-events-none absolute -right-20 -bottom-28 size-96 rounded-full bg-amber-300/20 blur-3xl motion-safe:animate-[link-float_11s_ease-in-out_infinite_reverse]" aria-hidden />

      <div className="page-in relative mx-auto w-full max-w-md">
        <a href="/" className="mx-auto mb-6 flex w-fit items-center gap-2 text-white">
          <img src="/logo-white.png" alt="" width={28} height={28} className="size-7" />
          <span className="text-[15px] font-semibold">MyGenBI</span>
        </a>

        {found && found !== "error" ? <SignatureCard sig={found} /> : <NotFound failed={found === "error"} />}

        <p className="mt-5 text-center text-[12px] text-white/55">Hanya sah bila dibuka dari domain resmi GenBI.</p>
      </div>
    </main>
  );
}

function NotFound({ failed }: { failed: boolean }) {
  return (
    <div className="rounded-2xl bg-white px-6 py-8 shadow-xl shadow-black/20">
      <h1 className="font-serif text-[24px] leading-tight font-medium text-slate-900">{failed ? "Server sedang bermasalah" : "Tanda tangan tidak ditemukan"}</h1>
      <p className="mt-2 text-[14px] text-slate-600">
        {failed ? "Coba muat ulang halaman ini beberapa saat lagi." : "QR ini tidak terdaftar di sistem GenBI. Bisa jadi palsu, salah ketik, atau sudah dihapus."}
      </p>
    </div>
  );
}

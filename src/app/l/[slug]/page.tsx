import type { Metadata } from "next";
import { ArrowRight, Globe } from "lucide-react";
import { Redirect } from "./redirect";

// Shortlink: /l/<slug> → halaman "sedang mengalihkan" bermerek, lalu pindah ke tujuan. Data & hitung klik di backend.
const BACKEND = process.env.BACKEND_URL || "http://localhost:4000";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mengalihkan… · MyGenBI", robots: { index: false, follow: false } };

async function resolve(slug: string) {
  const res = await fetch(`${BACKEND}/api/v1/public/links/${encodeURIComponent(slug)}`, { cache: "no-store" }).catch(() => null);
  const data: { url?: unknown; title?: unknown } | null = res?.ok ? (await res.json()).data : null;
  // Backend sudah memvalidasi http(s); cek ulang supaya tidak pernah mengalihkan ke skema lain.
  return typeof data?.url === "string" && /^https?:\/\//i.test(data.url) ? { url: data.url, title: String(data.title ?? "") } : null;
}

export default async function ShortLinkPage({ params }: { params: Promise<{ slug: string }> }) {
  const link = await resolve((await params).slug);
  const host = link ? new URL(link.url).hostname.replace(/^www\./, "") : "";
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[radial-gradient(120%_90%_at_50%_0%,#1d5bb8_0%,#11418b_45%,#081f45_100%)] px-4 text-white">
      {/* Latar: kisi halus + dua cahaya lembut yang melayang */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.05)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)] bg-[size:44px_44px]" aria-hidden />
      <div className="pointer-events-none absolute -top-24 -left-24 size-80 rounded-full bg-sky-400/30 blur-3xl motion-safe:animate-[link-float_9s_ease-in-out_infinite]" aria-hidden />
      <div className="pointer-events-none absolute -right-20 -bottom-28 size-96 rounded-full bg-amber-300/20 blur-3xl motion-safe:animate-[link-float_11s_ease-in-out_infinite_reverse]" aria-hidden />

      <div className="page-in relative w-full max-w-sm text-center">
        <div className="relative mx-auto grid size-24 place-items-center">
          {link && <>
            <span className="absolute inset-0 rounded-full border border-white/40 motion-safe:animate-[link-ring_1.8s_ease-out_infinite]" aria-hidden />
            <span className="absolute inset-0 rounded-full border border-white/30 motion-safe:animate-[link-ring_1.8s_ease-out_0.6s_infinite]" aria-hidden />
          </>}
          <span className="grid size-20 place-items-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur-md">
            <img src="/logo-white.png" alt="MyGenBI" width={48} height={48} className="size-12" />
          </span>
        </div>

        {link ? (
          <>
            {/* Cadangan tanpa JavaScript */}
            <meta httpEquiv="refresh" content={`3;url=${link.url}`} />
            <p className="mt-8 text-[13px] font-medium tracking-[0.18em] text-white/60 uppercase" role="status">Sedang mengalihkan</p>
            <div className="mt-4 rounded-2xl bg-white/10 p-4 text-left ring-1 ring-white/15 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-primary"><Globe size={20} aria-hidden /></span>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold">{link.title || host}</p>
                  <p className="truncate text-[12.5px] text-white/65">{host}</p>
                </div>
              </div>
              <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/15">
                <div className="h-full origin-left rounded-full bg-gradient-to-r from-sky-300 via-white to-amber-200 motion-safe:animate-[link-progress_1.2s_cubic-bezier(0.22,1,0.36,1)_forwards] motion-reduce:scale-x-100" />
              </div>
            </div>
            <a href={link.url} rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-white/80 ring-1 ring-white/20 transition hover:bg-white/10 hover:text-white">
              Tidak dialihkan? Buka sekarang <ArrowRight size={14} aria-hidden />
            </a>
            <Redirect to={link.url} />
          </>
        ) : (
          <>
            <h1 className="mt-8 text-xl font-semibold">Link tidak ditemukan</h1>
            <p className="mx-auto mt-2 max-w-xs text-[13.5px] text-white/70">Link ini salah ketik, sudah dihapus, atau sudah dinonaktifkan pengurus.</p>
            <a href="/" className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-primary transition hover:bg-white/90">
              Ke beranda MyGenBI <ArrowRight size={14} aria-hidden />
            </a>
          </>
        )}
      </div>

      <p className="absolute bottom-6 text-[11.5px] tracking-wide text-white/45">MyGenBI · Shortlink resmi GenBI</p>
    </main>
  );
}

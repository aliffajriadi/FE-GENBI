import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { publicImg } from "./public-api";
import { ScrollHeader } from "./scroll-header";

const NAV = [
  { href: "/kabar", label: "Kabar" },
  { href: "/#agenda", label: "Agenda" },
  { href: "/artikel", label: "Artikel" },
  { href: "/anggota", label: "Anggota" },
];

// overlay: logo putih di atas hero, berganti logo berwarna saat header sudah di-scroll.
export function Logo({ overlay }: { overlay?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="MyGenBI, beranda">
      {overlay && <img src="/logo-white.png" alt="" width={36} height={36} className={`size-9 group-data-[scrolled=true]/h:hidden`} />}
      <img src="/logo.png" alt="" width={36} height={36} className={overlay ? `hidden size-9 group-data-[scrolled=true]/h:block` : "size-9"} />
      <span className={`font-serif text-[19px] font-medium tracking-tight transition-colors ${overlay ? `text-white group-data-[scrolled=true]/h:text-slate-900` : "text-slate-900"}`}>MyGenBI</span>
    </Link>
  );
}

// overlay (beranda): transparan dengan teks putih di atas foto hero, lalu ikut turun sebagai header putih saat di-scroll.
export function SiteHeader({ active, overlay }: { active?: string; overlay?: boolean }) {
  const solid = (on: boolean) => (on ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:text-slate-900");
  const link = (on: boolean) =>
    overlay
      ? on ? `bg-white/15 text-white group-data-[scrolled=true]/h:bg-slate-100 group-data-[scrolled=true]/h:text-slate-900` : `text-white/85 hover:text-white group-data-[scrolled=true]/h:text-slate-600 group-data-[scrolled=true]/h:hover:text-slate-900`
      : solid(on);
  const inner = (
    <>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5 sm:h-20 sm:px-6">
        <Logo overlay={overlay} />
        <nav className="hidden gap-1 text-[14px] md:flex" aria-label="Navigasi situs">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={active === n.href ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 transition-colors ${link(active === n.href)}`}>
              {n.label}
            </Link>
          ))}
        </nav>
        <Link href="/login" className={`ml-auto inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium transition-colors ${overlay ? `bg-white text-slate-900 hover:bg-slate-100 group-data-[scrolled=true]/h:bg-primary group-data-[scrolled=true]/h:text-white group-data-[scrolled=true]/h:hover:bg-primary-hover` : "bg-primary text-white hover:bg-primary-hover"}`}>
          Masuk <ArrowRight size={15} aria-hidden />
        </Link>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2.5 text-[14px] md:hidden" aria-label="Navigasi situs">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`shrink-0 rounded-full px-3 py-1 transition-colors ${link(active === n.href)}`}>{n.label}</Link>
        ))}
      </nav>
    </>
  );
  return overlay ? (
    <ScrollHeader className="fixed inset-x-0 top-0 z-30 border-b border-transparent transition-[background-color,border-color,box-shadow] duration-300 data-[scrolled=true]:border-slate-200/70 data-[scrolled=true]:bg-white/90 data-[scrolled=true]:shadow-xs data-[scrolled=true]:backdrop-blur-md">
      {inner}
    </ScrollHeader>
  ) : (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">{inner}</header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/70 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-slate-500">Generasi Baru Indonesia: komunitas mahasiswa penerima beasiswa Bank Indonesia yang bergerak di bidang sosial, edukasi, dan kepemimpinan.</p>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-slate-900">Baca</p>
          <ul className="mt-3 grid gap-2 text-[14px] text-slate-500">
            <li><Link href="/kabar" className="hover:text-slate-900">Kabar GenBI</Link></li>
            <li><Link href="/artikel" className="hover:text-slate-900">Artikel Anggota</Link></li>
            <li><Link href="/#agenda" className="hover:text-slate-900">Agenda</Link></li>
            <li><Link href="/anggota" className="hover:text-slate-900">Anggota</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-slate-900">Anggota</p>
          <ul className="mt-3 grid gap-2 text-[14px] text-slate-500">
            <li><Link href="/login" className="hover:text-slate-900">Masuk ke panel</Link></li>
            <li><Link href="/dashboard/articles" className="hover:text-slate-900">Tulis artikel</Link></li>
            <li><Link href="/dashboard/scan" className="hover:text-slate-900">Scan absensi</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100">
        <p className="mx-auto max-w-6xl px-5 py-6 text-[13px] text-slate-400 sm:px-6">© {new Date().getFullYear()} MyGenBI</p>
      </div>
    </footer>
  );
}

const dateFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
const shortFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" });
export const fmtDay = (s: string) => dateFmt.format(new Date(s));
export const fmtShort = (s: string) => shortFmt.format(new Date(s));

export function Initials({ name, size = 28, src }: { name: string; size?: number; src?: string | null }) {
  if (src) return <img src={publicImg(src)!} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  const tones = ["bg-blue-100 text-blue-900", "bg-amber-100 text-amber-900", "bg-emerald-100 text-emerald-900", "bg-rose-100 text-rose-900", "bg-slate-200 text-slate-700"];
  const tone = tones[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % tones.length];
  return (
    <span className={`inline-grid shrink-0 place-items-center rounded-full font-semibold ${tone}`} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden>
      {name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
    </span>
  );
}

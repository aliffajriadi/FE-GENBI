import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { publicImg } from "./public-api";

const NAV = [
  { href: "/kabar", label: "Kabar" },
  { href: "/#agenda", label: "Agenda" },
  { href: "/artikel", label: "Artikel" },
  { href: "/anggota", label: "Anggota" },
];

export function Logo({ light }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="MyGenBI, beranda">
      <span className={`grid size-8 place-items-center rounded-lg font-serif text-[17px] font-semibold ${light ? "bg-white text-primary" : "bg-primary text-white"}`}>G</span>
      <span className={`font-serif text-[19px] font-medium tracking-tight ${light ? "text-white" : ""}`}>MyGenBI</span>
    </Link>
  );
}

// overlay: header transparan di atas foto hero (beranda).
export function SiteHeader({ active, overlay }: { active?: string; overlay?: boolean }) {
  const link = (on: boolean) => (overlay ? (on ? "bg-white/15 text-white" : "text-white/85 hover:text-white") : on ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:text-slate-900");
  return (
    <header className={overlay ? "absolute inset-x-0 top-0 z-30" : "sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-md"}>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5 sm:h-20 sm:px-6">
        <Logo light={overlay} />
        <nav className="hidden gap-1 text-[14px] md:flex" aria-label="Navigasi situs">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={active === n.href ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 transition-colors ${link(active === n.href)}`}>
              {n.label}
            </Link>
          ))}
        </nav>
        <Link href="/login" className={`ml-auto inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium transition-colors ${overlay ? "bg-white text-slate-900 hover:bg-slate-100" : "bg-slate-900 text-white hover:bg-slate-700"}`}>
          Masuk <ArrowRight size={15} aria-hidden />
        </Link>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2.5 text-[14px] md:hidden" aria-label="Navigasi situs">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`shrink-0 rounded-full px-3 py-1 ${link(active === n.href)}`}>{n.label}</Link>
        ))}
      </nav>
    </header>
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

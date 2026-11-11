import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, MapPin, PenLine, ScanLine, Trophy, Wallet } from "lucide-react";
import { ArticleCard, ArticleRow } from "@/components/site/article-card";
import { getPublic, publicImg, type PublicArticle } from "@/components/site/public-api";
import { fmtDay, SiteFooter, SiteHeader } from "@/components/site/site-shell";
import { EVENT_TYPE_LABEL } from "@/lib/format";

// Landing page publik (SSR + cache 5 menit).
type Stats = { period: string | null; members: number; divisions: number; events: number };
type PublicEvent = { id: string; title: string; type: string; startAt: string; endAt: string; location: string | null };
type Div = { id: string; name: string; description: string | null };
type Site = { heroImage: string | null; heroAlt?: string; headline: string; subheadline?: string };
type Indicators = { updatedAt: string; source: string; items: { key: string; label: string; value: string; period: string | null }[] } | null;

const TZ = "Asia/Jakarta";
const day = (s: string) => new Date(s).toLocaleDateString("id-ID", { day: "numeric", timeZone: TZ });
const mon = (s: string) => new Date(s).toLocaleDateString("id-ID", { month: "short", timeZone: TZ });
const time = (s: string) => new Date(s).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const weekday = (s: string) => new Date(s).toLocaleDateString("id-ID", { weekday: "long", timeZone: TZ });

export default async function Home() {
  const [site, bi, stats, events, divisions, news, personal] = await Promise.all([
    getPublic<Site>("/public/site", { heroImage: null, headline: "Generasi Baru Indonesia" }, 30),
    getPublic<Indicators>("/public/bi-indicators", null, 1800),
    getPublic<Stats>("/public/stats", { period: null, members: 0, divisions: 0, events: 0 }),
    getPublic<PublicEvent[]>("/public/events", []),
    getPublic<Div[]>("/public/divisions", []),
    getPublic<PublicArticle[]>("/public/articles?kind=NEWS&limit=4", []),
    getPublic<PublicArticle[]>("/public/articles?kind=PERSONAL&limit=4", []),
  ]);
  const heroImg = publicImg(site.heroImage);
  const next = events[0];

  return (
    <div className="bg-white">
      <SiteHeader overlay />

      {/* ───── Hero: foto pilihan pengurus, gelap di atas untuk teks, memudar ke putih di bawah ───── */}
      <section className="relative isolate overflow-hidden bg-slate-900">
        {heroImg && <img src={heroImg} alt={site.heroAlt ?? ""} className="absolute inset-0 -z-10 h-full w-full object-cover" fetchPriority="high" />}
        {/* Gelapkan foto di area teks supaya judul tetap terbaca di foto terang sekalipun. */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/85 via-slate-950/60 via-55% to-slate-950/10" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-[46%] bg-gradient-to-b from-transparent via-white/75 to-white" aria-hidden />

        <div className="mx-auto max-w-6xl px-5 pt-36 sm:px-6 sm:pt-44">
          <div className="rise max-w-3xl">
            {stats.period && <p className="flex items-center gap-3 text-[14px] text-white/80"><span className="h-px w-8 bg-white/60" aria-hidden />Kepengurusan {stats.period}</p>}
            <h1 className="mt-5 font-serif text-[48px] leading-[1.02] font-medium tracking-[-0.025em] text-balance text-white [text-shadow:0_2px_24px_rgb(0_0_0/0.35)] sm:text-[76px]">{site.headline}</h1>
            {site.subheadline && <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-white/90 [text-shadow:0_1px_12px_rgb(0_0_0/0.4)]">{site.subheadline}</p>}
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/kabar" className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-medium text-slate-900 transition-colors hover:bg-slate-100">
                Baca kabar terbaru <ArrowRight size={16} aria-hidden />
              </Link>
              <Link href="/#agenda" className="inline-flex h-12 items-center rounded-full border border-white/50 px-6 text-[15px] font-medium text-white transition-colors hover:bg-white/10">
                Lihat agenda
              </Link>
            </div>
          </div>
        </div>

        {/* Ringkasan di area yang sudah memudar putih */}
        <div className="mx-auto mt-28 max-w-6xl px-5 pb-14 sm:mt-40 sm:px-6">
          <div className="grid grid-cols-3 gap-x-6 gap-y-8 border-t border-slate-900/15 pt-8 lg:grid-cols-[repeat(3,auto)_1fr] lg:gap-14">
            {[
              { k: "anggota aktif", v: stats.members },
              { k: "divisi", v: stats.divisions },
              { k: "kegiatan tercatat", v: stats.events },
            ].map((s) => (
              <div key={s.k}>
                <p className="font-serif text-[32px] leading-none font-medium text-slate-900 tabular-nums sm:text-[40px]">{s.v}</p>
                <p className="mt-2 text-[14px] text-slate-600">{s.k}</p>
              </div>
            ))}
            {next ? (
              <Link href="/#agenda" className="group col-span-3 flex items-start gap-4 lg:col-span-1 lg:justify-self-end">
                <CalendarDays size={20} className="mt-1 shrink-0 text-primary" aria-hidden />
                <span>
                  <span className="block text-[13px] text-slate-500">Agenda berikutnya · {weekday(next.startAt)}, {day(next.startAt)} {mon(next.startAt)}</span>
                  <span className="mt-1 block max-w-xs text-[17px] leading-snug font-semibold text-slate-900 group-hover:text-primary">{next.title}</span>
                </span>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* ───── Indikator Bank Indonesia (diambil dari bi.go.id, disegarkan tiap 6 jam) ───── */}
      {bi && bi.items.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pt-16 sm:px-6 sm:pt-20">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-serif text-[30px] leading-tight font-medium tracking-[-0.015em] sm:text-[34px]">Indikator Bank Indonesia</h2>
              <p className="mt-1.5 text-[15px] text-slate-500">Angka kebijakan dan ekonomi terbaru yang dipantau setiap anggota GenBI.</p>
            </div>
            <a href={bi.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] text-slate-500 hover:text-slate-900">
              Sumber: bi.go.id <ArrowUpRight size={14} aria-hidden />
            </a>
          </div>
          <dl className="mt-8 grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 sm:grid-cols-3 lg:grid-cols-5">
            {bi.items.map((it) => (
              <div key={it.key} className="-mt-px -ml-px border-t border-l border-slate-200 p-5 sm:p-6">
                <dt className="text-[13px] text-slate-500">{it.label}</dt>
                <dd className="mt-3 font-serif text-[30px] leading-none font-medium tracking-[-0.01em] text-slate-900 tabular-nums sm:text-[34px]">{it.value}</dd>
                {it.period && <dd className="mt-2.5 text-[12px] text-slate-400">{it.period}</dd>}
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[12px] text-slate-400">Diperbarui {new Date(bi.updatedAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })} WIB</p>
        </section>
      )}

      {/* ───── Kabar GenBI ───── */}
      {news.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
          <SectionHead title="Kabar terbaru" href="/kabar" cta="Semua kabar" />
          <div className="mt-12 grid gap-x-8 gap-y-14 md:grid-cols-[1.4fr_1fr]">
            <ArticleCard a={news[0]} size="lg" />
            <div className="grid content-start gap-10">
              {news.slice(1, 4).map((a) => <SideStory key={a.id} a={a} />)}
            </div>
          </div>
        </section>
      )}

      {/* ───── Agenda ───── */}
      <section id="agenda" className="scroll-mt-20 border-y border-slate-200/70 bg-[#faf9f7]">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <h2 className="font-serif text-[38px] leading-[1.1] font-medium tracking-[-0.02em] sm:text-[44px]">Agenda</h2>
            <p className="mt-4 max-w-sm text-[16px] leading-relaxed text-slate-600">Kegiatan terbuka yang dijadwalkan pengurus. Anggota mendapat pengingat dan absen cukup dengan scan QR.</p>
          </div>
          {events.length === 0 ? (
            <div className="grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="font-serif text-[20px] text-slate-500">Belum ada agenda terbuka dalam waktu dekat.</p>
            </div>
          ) : (
            <ol className="divide-y divide-slate-200/80 rounded-2xl bg-white ring-1 ring-slate-200/80">
              {events.map((e) => (
                <li key={e.id} className="flex items-center gap-5 p-5 sm:p-6">
                  <div className="w-14 shrink-0 text-center">
                    <p className="font-serif text-[34px] leading-none font-medium">{day(e.startAt)}</p>
                    <p className="mt-1 text-[12px] font-medium tracking-wide text-slate-500 uppercase">{mon(e.startAt)}</p>
                  </div>
                  <div className="min-w-0 flex-1 border-l border-slate-200 pl-5">
                    <p className="text-[12px] font-medium text-primary">{EVENT_TYPE_LABEL[e.type]}</p>
                    <p className="mt-0.5 text-[17px] font-semibold text-slate-900">{e.title}</p>
                    <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-slate-500">
                      <span>{weekday(e.startAt)}, {time(e.startAt)} WIB</span>
                      {e.location && <span className="flex items-center gap-1"><MapPin size={13} aria-hidden /> {e.location}</span>}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {/* ───── Artikel anggota ───── */}
      {personal.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
          <SectionHead title="Artikel anggota" desc="Opini dan cerita pribadi, ditulis langsung oleh anggota." href="/artikel" cta="Semua artikel" />
          <div className="mt-6 grid gap-x-14 md:grid-cols-2">
            {personal.map((a) => <div key={a.id} className="border-b border-slate-100"><ArticleRow a={a} /></div>)}
          </div>
        </section>
      )}

      {/* ───── Divisi ───── */}
      {divisions.length > 0 && (
        <section id="divisi" className="scroll-mt-20 border-t border-slate-200/70">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
            <SectionHead title="Divisi" desc={stats.period ? `Kepengurusan ${stats.period}` : undefined} href="/anggota" cta="Kenali anggotanya" />
            <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {divisions.map((d, i) => (
                <li key={d.id} className="rounded-2xl bg-[#faf9f7] p-7 ring-1 ring-slate-200/70">
                  <p className="font-serif text-[15px] text-slate-400 tabular-nums">{String(i + 1).padStart(2, "0")}</p>
                  <p className="mt-3 font-serif text-[23px] leading-snug font-medium">{d.name}</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-500">{d.description ?? "Deskripsi divisi segera hadir."}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ───── Untuk anggota ───── */}
      <section className="px-5 pb-20 sm:px-6">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-slate-900 text-white">
          <div className="grid gap-12 p-8 sm:p-14 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <h2 className="font-serif text-[36px] leading-[1.1] font-medium tracking-[-0.02em] sm:text-[44px]">Satu tempat untuk semua urusan anggota.</h2>
              <p className="mt-5 max-w-md text-[17px] leading-relaxed text-slate-300">Tidak perlu lagi rekap di grup WhatsApp dan spreadsheet. Masuk dengan akun dari Sekretaris.</p>
              <Link href="/login" className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-medium text-slate-900 transition-colors hover:bg-slate-200">
                Masuk ke panel <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
            <ul className="grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2">
              {[
                { icon: ScanLine, t: "Absen sekali scan", d: "QR berganti tiap 20 detik, tidak bisa dititipkan." },
                { icon: Trophy, t: "Poin keaktifan", d: "Hadir, panitia, menulis: semua tercatat otomatis." },
                { icon: Wallet, t: "Bayar kas", d: "Upload bukti transfer, bendahara verifikasi." },
                { icon: PenLine, t: "Menulis", d: "Terbitkan cerita dan opini langsung ke web." },
              ].map(({ icon: Icon, t, d }) => (
                <li key={t} className="bg-slate-900 p-6">
                  <Icon size={20} className="text-blue-300" aria-hidden />
                  <p className="mt-4 font-medium">{t}</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-slate-400">{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function SectionHead({ title, desc, href, cta }: { title: string; desc?: string; href?: string; cta?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
      <div>
        <h2 className="font-serif text-[38px] leading-[1.1] font-medium tracking-[-0.02em] sm:text-[44px]">{title}</h2>
        {desc && <p className="mt-2 text-[16px] text-slate-500">{desc}</p>}
      </div>
      {href && (
        <Link href={href} className="group inline-flex items-center gap-1.5 text-[15px] font-medium text-slate-900">
          {cta} <ArrowUpRight size={17} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}

function SideStory({ a }: { a: PublicArticle }) {
  const img = publicImg(a.coverUrl);
  return (
    <Link href={`/artikel/${a.slug}`} className="group grid grid-cols-[1fr_112px] gap-5">
      <div>
        {a.tags[0] && <span className="text-[12px] font-semibold tracking-[0.08em] text-primary uppercase">{a.tags[0].name}</span>}
        <p className="mt-1.5 font-serif text-[20px] leading-snug font-medium group-hover:text-primary">{a.title}</p>
        <p className="mt-2 text-[13px] text-slate-500">{fmtDay(a.publishedAt)}</p>
      </div>
      {img ? <img src={img} alt="" className="aspect-square w-full rounded-lg object-cover" loading="lazy" /> : <span className="aspect-square rounded-lg bg-slate-100" />}
    </Link>
  );
}

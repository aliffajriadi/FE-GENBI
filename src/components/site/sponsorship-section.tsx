import { ArrowUpRight, CalendarDays, Handshake, Instagram, Linkedin, Mail, MapPin, Megaphone, MessageCircle, Music2, Users, Youtube } from "lucide-react";
import { waLink, type Contacts } from "./public-api";

const MAIL_SUBJECT = encodeURIComponent("Sponsorship / Partnership with GenBI");
const WA_TEXT = "Hi GenBI, I'm interested in a sponsorship / partnership.";

// "@genbi" dari https://instagram.com/genbi/ — lebih enak dibaca daripada URL penuh.
const handle = (url: string) => {
  try {
    const p = new URL(url).pathname.replace(/^\/|\/$/g, "").split("/").pop() ?? "";
    return p ? (p.startsWith("@") ? p : `@${p}`) : new URL(url).host;
  } catch {
    return url;
  }
};

// Ajakan sponsorship (bahasa Inggris untuk calon mitra) + kartu kontak organisasi dari Pengaturan → Kontak.
export function SponsorshipSection({ contacts: c, members, events }: { contacts: Contacts; members: number; events: number }) {
  const cards = [
    c.email && { icon: Mail, label: "Email", value: c.email, href: `mailto:${c.email}?subject=${MAIL_SUBJECT}` },
    c.whatsapp && { icon: MessageCircle, label: "WhatsApp", value: c.whatsapp, href: waLink(c.whatsapp, WA_TEXT) },
    c.instagram && { icon: Instagram, label: "Instagram", value: handle(c.instagram), href: c.instagram },
    c.youtube && { icon: Youtube, label: "YouTube", value: handle(c.youtube), href: c.youtube },
    c.tiktok && { icon: Music2, label: "TikTok", value: handle(c.tiktok), href: c.tiktok },
    c.linkedin && { icon: Linkedin, label: "LinkedIn", value: handle(c.linkedin), href: c.linkedin },
  ].filter((x) => !!x);
  const primary = c.email ? cards[0] : cards.find((x) => x.label === "WhatsApp") ?? cards[0];

  return (
    <section id="kemitraan" className="scroll-mt-20 px-5 pb-20 sm:px-6">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-slate-950 text-white">
        {/* Kisi halus + cahaya biru di atas, khas halaman produk */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.06)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.06)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)] bg-[size:48px_48px]" aria-hidden />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[720px] -translate-x-1/2 rounded-full bg-primary/60 blur-3xl" aria-hidden />

        <div className="relative px-6 pt-16 pb-10 text-center sm:px-14 sm:pt-20">
          <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-[12.5px] font-medium tracking-wide text-blue-200">
            <span className="size-1.5 rounded-full bg-brand-red" aria-hidden /> Sponsorship & Partnership
          </p>
          <h2 className="mx-auto mt-6 max-w-3xl font-serif text-[40px] leading-[1.05] font-medium tracking-[-0.025em] text-balance sm:text-[60px]">
            Calling for sponsors.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-slate-300">
            Partner with Bank Indonesia scholarship awardees to run social, educational, and leadership programs. Put your brand in front of a young, high-achieving audience.
          </p>
          {primary && (
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <a href={primary.href} target={primary.label === "Email" ? undefined : "_blank"} rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-medium text-slate-900 transition-colors hover:bg-slate-200">
                Become a sponsor <ArrowUpRight size={16} aria-hidden />
              </a>
              <a href="#kontak" className="inline-flex h-12 items-center rounded-full border border-white/20 px-6 text-[15px] font-medium text-white transition-colors hover:bg-white/10">
                Contact us
              </a>
            </div>
          )}

          <dl className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10 text-left lg:grid-cols-4">
            {[
              { icon: Users, t: members ? `${members}+` : "—", d: "Scholarship awardees" },
              { icon: CalendarDays, t: events ? `${events}+` : "—", d: "Programs held" },
              { icon: Megaphone, t: "Brand exposure", d: "Events, social media & web" },
              { icon: Handshake, t: "Flexible", d: "Event sponsor, media partner, in-kind" },
            ].map(({ icon: Icon, t, d }) => (
              <div key={d} className="bg-slate-950/80 p-5 sm:p-6">
                <Icon size={18} className="text-blue-300" aria-hidden />
                <dt className="mt-4 font-serif text-[24px] leading-none font-medium tabular-nums">{t}</dt>
                <dd className="mt-2 text-[13px] leading-snug text-slate-400">{d}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Kontak organisasi */}
        {(cards.length > 0 || c.address) && (
          <div id="kontak" className="relative scroll-mt-24 border-t border-white/10 bg-white/[0.03] px-6 py-12 sm:px-14">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="font-serif text-[26px] leading-tight font-medium">Get in touch</h3>
                <p className="mt-1 text-[14px] text-slate-400">Reach our team through any of these channels.</p>
              </div>
              {c.address && <p className="flex max-w-xs items-start gap-2 text-[13px] text-slate-400"><MapPin size={14} className="mt-0.5 shrink-0" aria-hidden /> <span className="whitespace-pre-line">{c.address}</span></p>}
            </div>
            <ul className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map(({ icon: Icon, label, value, href }) => (
                <li key={label}>
                  <a href={href} target={label === "Email" ? undefined : "_blank"} rel="noopener noreferrer"
                    className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-white/25 hover:bg-white/[0.08]">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-blue-200"><Icon size={19} aria-hidden /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] text-slate-400">{label}</span>
                      <span className="block truncate text-[15px] font-medium">{value}</span>
                    </span>
                    <ArrowUpRight size={17} className="shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

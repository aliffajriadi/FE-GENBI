import { publicImg } from "@/components/site/public-api";
import { cx } from "@/components/ui";

export type Sig = { code: string; title: string; purpose: string | null; signerTitle: string; signedAt: string; revokedAt: string | null; signer: { name: string; avatarUrl: string | null } };

const full = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

// Lembar keterangan resmi: status (centang tergambar), penanda tangan, lalu tabel rincian.
export function SignatureCard({ sig }: { sig: Sig }) {
  const valid = !sig.revokedAt;

  return (
    <article className="overflow-hidden rounded-2xl bg-white text-slate-900 shadow-xl shadow-black/20">
      <header className="px-6 pt-8 pb-6 text-center">
        <StatusMark valid={valid} />
        <h1 className="mt-4 font-serif text-[25px] leading-tight font-medium">{valid ? "Tanda tangan sah" : "Tanda tangan dicabut"}</h1>
        <p className="mt-1 text-[13.5px] text-slate-500">
          {valid ? "Tercatat di sistem MyGenBI." : `Tidak berlaku sejak ${full.format(new Date(sig.revokedAt!))} WIB.`}
        </p>
      </header>

      <section className="mx-6 flex items-center gap-4 rounded-xl bg-slate-50 p-4">
        <Photo name={sig.signer.name} src={publicImg(sig.signer.avatarUrl)} />
        <div className="min-w-0">
          <p className="text-[12.5px] text-slate-500">{valid ? "Ditandatangani oleh" : "Sebelumnya ditandatangani oleh"}</p>
          <p className="mt-0.5 truncate font-serif text-[21px] leading-tight font-medium">{sig.signer.name}</p>
          <p className="mt-0.5 text-[13.5px] text-slate-600">{sig.signerTitle}</p>
        </div>
      </section>

      <dl className="mx-6 mt-5 mb-6 divide-y divide-slate-100 text-[14px]">
        <Row label="Agenda">{sig.title}</Row>
        {sig.purpose && <Row label="Keterangan"><span className="font-normal whitespace-pre-wrap text-slate-700">{sig.purpose}</span></Row>}
        <Row label="Waktu">{full.format(new Date(sig.signedAt))} WIB</Row>
        <Row label="Kode"><span className="font-mono text-[13px] font-normal tracking-wide text-slate-700">{sig.code}</span></Row>
      </dl>
    </article>
  );
}

// Lingkaran muncul, lalu centang (sah) atau silang (dicabut) tergambar. Gerak dimatikan bila pengguna memilih reduced motion.
function StatusMark({ valid }: { valid: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={cx("mx-auto size-16 motion-safe:animate-[slot-pop_450ms_var(--ease)_both]", valid ? "text-green-600" : "text-red-600")} role="img" aria-label={valid ? "Sah" : "Dicabut"}>
      <circle cx="32" cy="32" r="32" className="fill-current opacity-10" />
      <circle cx="32" cy="32" r="24" className="fill-current" />
      <path
        d={valid ? "M21.5 32.5 28.5 39.5 43 25" : "M24 24 40 40M40 24 24 40"}
        pathLength={1}
        className="ttd-mark fill-none stroke-white"
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Photo({ name, src }: { name: string; src: string | null }) {
  const cls = "size-16 shrink-0 rounded-full ring-4 ring-white shadow-sm";
  if (src) return <img src={src} alt={`Foto ${name}`} className={cx(cls, "object-cover")} />;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return <span className={cx(cls, "grid place-items-center bg-[#11418b] text-[20px] font-semibold text-white")} aria-hidden>{initials}</span>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 py-3 sm:grid-cols-[100px_1fr] sm:gap-4">
      <dt className="text-[13px] text-slate-500">{label}</dt>
      <dd className="font-medium break-words text-slate-900">{children}</dd>
    </div>
  );
}

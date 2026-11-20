import { useId } from "react";
import { Card, Skeleton } from "./layout";
import { cx } from "./cx";

// ───── Table ─────

export function Table({ head, children, empty, loading, toolbar, footer, hideOnMobile }: { head: React.ReactNode[]; children: React.ReactNode; empty?: React.ReactNode; loading?: boolean; toolbar?: React.ReactNode; footer?: React.ReactNode; hideOnMobile?: number[] }) {
  const id = "t" + useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <Card className={cx("overflow-hidden", id)}>
      {/* Kolom pelengkap disembunyikan di bawah 640px supaya tabel tidak perlu digeser. */}
      {!!hideOnMobile?.length && <style>{`@media (max-width:639px){.${id} tr>:is(${hideOnMobile.map((i) => `:nth-child(${i + 1})`).join(",")}){display:none}}`}</style>}
      {toolbar && <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">{toolbar}</div>}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50/70 text-xs font-medium text-slate-500">
            <tr className="border-b border-slate-100">
              {head.map((h, i) => (
                <th key={i} scope="col" className="px-4 py-2.5 font-medium whitespace-nowrap first:pl-5 last:pr-5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading
              ? Array.from({ length: 4 }, (_, i) => (
                  <tr key={i}>
                    {head.map((_, j) => <td key={j} className="px-4 py-3.5 first:pl-5"><Skeleton className="h-4 w-full max-w-32" /></td>)}
                  </tr>
                ))
              : children}
          </tbody>
        </table>
        {!loading && empty}
      </div>
      {footer && <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">{footer}</div>}
    </Card>
  );
}
export const Td = ({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) => <td className={cx("px-4 py-3 first:pl-5 last:pr-5", className)} {...p} />;

// ───── Badge, Avatar, Progress ─────

const STATUS: Record<string, { label: string; tone: string }> = {
  HADIR: { label: "Hadir", tone: "green" },
  TELAT: { label: "Telat", tone: "amber" },
  IZIN: { label: "Izin", tone: "slate" },
  SAKIT: { label: "Sakit", tone: "slate" },
  ALPA: { label: "Alpa", tone: "red" },
  OPEN: { label: "Absensi dibuka", tone: "green" },
  CLOSED: { label: "Belum dibuka", tone: "slate" },
  DONE: { label: "Selesai", tone: "blue" },
  PENDING: { label: "Menunggu", tone: "amber" },
  APPROVED: { label: "Disetujui", tone: "green" },
  REJECTED: { label: "Ditolak", tone: "red" },
  ACTIVE: { label: "Aktif", tone: "green" },
  INACTIVE: { label: "Nonaktif", tone: "slate" },
  ALUMNI: { label: "Alumni", tone: "blue" },
  BELUM: { label: "Belum absen", tone: "outline" },
  UNPAID: { label: "Belum bayar", tone: "slate" },
  PAID: { label: "Lunas", tone: "green" },
  OVERDUE: { label: "Menunggak", tone: "red" },
  VERIFIED: { label: "Terverifikasi", tone: "green" },
  DRAFT: { label: "Draft", tone: "slate" },
  IN_REVIEW: { label: "Direview", tone: "amber" },
  REVISION: { label: "Perlu revisi", tone: "red" },
  SCHEDULED: { label: "Terjadwal", tone: "blue" },
  PUBLISHED: { label: "Tayang", tone: "green" },
  ARCHIVED: { label: "Diarsipkan", tone: "outline" },
  SIGNED: { label: "Ditandatangani", tone: "blue" },
  SENT: { label: "Terkirim", tone: "green" },
  RECEIVED: { label: "Diterima", tone: "slate" },
};
const TONE: Record<string, string> = {
  green: "bg-green-50 text-green-700 ring-green-600/15",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/15",
  blue: "bg-blue-50 text-blue-800 ring-blue-700/15",
  slate: "bg-slate-100 text-slate-700 ring-slate-500/15",
  outline: "bg-white text-slate-500 ring-slate-200",
};
const DOT: Record<string, string> = { green: "bg-green-500", amber: "bg-amber-500", red: "bg-red-500", blue: "bg-blue-700", slate: "bg-slate-400", outline: "bg-slate-300" };

export function Badge({ status, children, tone }: { status?: string | null; children?: React.ReactNode; tone?: keyof typeof TONE }) {
  const s = STATUS[status ?? "BELUM"];
  const t = tone ?? s?.tone ?? "slate";
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset", TONE[t])}>
      <span className={cx("size-1.5 rounded-full", DOT[t], status === "OPEN" && "animate-pulse")} aria-hidden />
      {children ?? s?.label ?? status}
    </span>
  );
}

const AVATAR_TONES = ["bg-blue-100 text-blue-900", "bg-slate-200 text-slate-700", "bg-sky-100 text-sky-900", "bg-indigo-100 text-indigo-900", "bg-cyan-100 text-cyan-900", "bg-zinc-200 text-zinc-700"];
export function Avatar({ name, src, size = 32, className }: { name?: string | null; src?: string | null; size?: number; className?: string }) {
  const n = name ?? "?";
  if (src) return <img src={src.startsWith("/storage/") ? (process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL).origin : "") + src : src} alt="" width={size} height={size} className={cx("shrink-0 rounded-full object-cover", className)} style={{ width: size, height: size }} />;
  const initials = n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const tone = AVATAR_TONES[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  return (
    <span
      className={cx("inline-grid shrink-0 place-items-center rounded-full font-semibold", tone, className)}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38) }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function Progress({ value, tone = "blue", className }: { value: number; tone?: "blue" | "green" | "amber" | "red"; className?: string }) {
  const bar = { blue: "bg-primary", green: "bg-green-500", amber: "bg-amber-500", red: "bg-red-500" }[tone];
  return (
    <div className={cx("h-1.5 w-full overflow-hidden rounded-full bg-slate-100", className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx("h-full rounded-full transition-all", bar)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

// Kotak tanggal ala kalender untuk daftar kegiatan.
export function DateTile({ date, active }: { date: string | Date; active?: boolean }) {
  const d = new Date(date);
  return (
    <div className={cx("grid w-12 shrink-0 overflow-hidden rounded-lg border text-center", active ? "border-blue-200" : "border-slate-200")}>
      <span className={cx("py-0.5 text-[10px] font-semibold tracking-wide uppercase", active ? "bg-primary text-white" : "bg-slate-50 text-slate-500")}>
        {d.toLocaleDateString("id-ID", { month: "short", timeZone: "Asia/Jakarta" })}
      </span>
      <span className="py-1 text-lg leading-none font-semibold text-slate-900">{d.toLocaleDateString("id-ID", { day: "numeric", timeZone: "Asia/Jakarta" })}</span>
    </div>
  );
}

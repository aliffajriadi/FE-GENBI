// Komponen dasar gaya shadcn/ui. Biru hanya untuk aksi utama, link & status aktif; hijau/kuning/merah khusus status.
import { forwardRef, useId } from "react";
import { Loader2, type LucideIcon } from "lucide-react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// ───── Button ─────

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
};
export const Button = forwardRef<HTMLButtonElement, BtnProps>(({ variant = "primary", size = "md", loading, className, children, disabled, ...p }, ref) => (
  <button
    ref={ref}
    disabled={disabled || loading}
    className={cx(
      "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.97]",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50",
      size === "sm" && "h-8 px-3 text-xs",
      size === "md" && "h-9 px-3.5 text-sm",
      size === "lg" && "h-11 px-5 text-sm",
      size === "icon" && "size-9",
      variant === "primary" && "bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover",
      variant === "secondary" && "bg-slate-100 text-slate-900 hover:bg-slate-200/70",
      variant === "outline" && "border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900",
      variant === "ghost" && "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      variant === "danger" && "bg-red-600 text-white shadow-xs hover:bg-red-700",
      className,
    )}
    {...p}
  >
    {loading && <Loader2 size={14} className="animate-spin" aria-hidden />}
    {children}
  </button>
));
Button.displayName = "Button";

// ───── Form ─────

const field =
  "w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-xs outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-3 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { icon?: LucideIcon };
export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, icon: Icon, ...p }, ref) =>
  Icon ? (
    <div className={cx("relative", className)}>
      <Icon size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" aria-hidden />
      <input ref={ref} className={cx(field, "h-9 pl-9")} {...p} />
    </div>
  ) : (
    <input ref={ref} className={cx(field, "h-9", className)} {...p} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cx(field, "min-h-20 py-2", className)} {...p} />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, ref) => (
  <select ref={ref} className={cx(field, "h-9 appearance-none bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-9", className)} style={{ backgroundImage: CHEVRON }} {...p} />
));
Select.displayName = "Select";
const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

export function Field({ label, children, hint, className }: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <label className={cx("grid gap-1.5", className)}>
      <span className="text-[13px] font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-slate-500">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-5 w-9 rounded-full bg-slate-200 transition peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring" />
        <span className="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

// ───── Layout ─────

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("rounded-xl border border-slate-200/80 bg-white shadow-xs", className)} {...p} />;
}

export function CardHeader({ title, desc, action, icon: Icon }: { title: string; desc?: string; action?: React.ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && <IconChip icon={Icon} />}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
          {desc && <p className="mt-0.5 text-[13px] text-slate-500">{desc}</p>}
        </div>
      </div>
      {action && <div className="shrink-0 whitespace-nowrap">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, desc, actions, eyebrow }: { title: React.ReactNode; desc?: React.ReactNode; actions?: React.ReactNode; eyebrow?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-[13px] text-slate-500">{eyebrow}</div>}
        <h1 className="font-serif text-[26px] leading-tight sm:text-[30px] font-medium tracking-[-0.01em] text-slate-900">{title}</h1>
        {desc && <p className="mt-1 max-w-2xl text-[14px] text-slate-500">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function IconChip({ icon: Icon, tone = "blue" }: { icon: LucideIcon; tone?: "blue" | "green" | "amber" | "red" | "slate" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-800 ring-blue-100",
    green: "bg-green-50 text-green-700 ring-green-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    red: "bg-red-50 text-red-700 ring-red-100",
    slate: "bg-slate-100 text-slate-600 ring-slate-200/60",
  };
  return (
    <span className={cx("grid size-9 shrink-0 place-items-center rounded-lg ring-1 ring-inset", tones[tone])}>
      <Icon size={18} strokeWidth={2} aria-hidden />
    </span>
  );
}

export function StatCard({ label, value, hint, icon, tone, loading, className }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon: LucideIcon; tone?: "blue" | "green" | "amber" | "red" | "slate"; loading?: boolean; className?: string }) {
  return (
    <Card className={cx("min-w-0 p-4 sm:p-5", className)}>
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <p className="min-w-0 text-[12.5px] leading-snug font-medium text-slate-500 sm:text-[13px]">{label}</p>
        <IconChip icon={icon} tone={tone} />
      </div>
      {loading ? <Skeleton className="mt-1 h-8 w-20" /> : <p className="-mt-1 truncate text-2xl font-semibold tracking-tight text-slate-900 tabular-nums sm:text-[28px]">{value}</p>}
      {hint && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-md bg-slate-100", className)} />;
}

export function EmptyState({ icon: Icon, title, desc, action }: { icon: LucideIcon; title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-500">
        <Icon size={22} aria-hidden />
      </span>
      <p className="mt-4 font-medium text-slate-900">{title}</p>
      {desc && <p className="mt-1 max-w-sm text-[13px] text-slate-500">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

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

// ───── Tabs (segmented) ─────

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[] }) {
  return (
    <div role="tablist" className="inline-flex max-w-full overflow-x-auto rounded-lg bg-slate-100 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cx(
            "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium whitespace-nowrap transition",
            value === it.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900",
          )}
        >
          {it.label}
          {it.count != null && <span className={cx("rounded-full px-1.5 text-[11px] tabular-nums", value === it.value ? "bg-slate-100" : "bg-slate-200/70")}>{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700 ring-1 ring-red-600/10 ring-inset">
      {error instanceof Error ? error.message : String(error)}
    </p>
  );
}

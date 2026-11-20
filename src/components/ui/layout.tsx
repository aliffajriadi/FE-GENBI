import { type LucideIcon } from "lucide-react";
import { cx } from "./cx";

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

// ───── Tabs (segmented) ─────

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[] }) {
  return (
    <div role="tablist" className="inline-flex max-w-full overflow-x-auto rounded-lg bg-slate-100 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((it) => (
        <button
          key={it.value}
          type="button" // tanpa ini, tab di dalam <form> ikut mengirim form
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

import { forwardRef } from "react";
import { type LucideIcon } from "lucide-react";
import { cx } from "./cx";

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

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cx } from "./cx";

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

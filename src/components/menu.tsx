"use client";
import { useEffect, useRef, useState } from "react";
import { cx } from "./ui";

// Dropdown sederhana: klik di luar / Esc menutup.
export function Menu({ trigger, children, align = "end", side = "bottom" }: { trigger: (open: boolean) => React.ReactNode; children: React.ReactNode; align?: "start" | "end"; side?: "top" | "bottom" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((o) => !o)}>{trigger(open)}</div>
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className={cx(
            "absolute z-50 min-w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg",
            align === "end" ? "right-0" : "left-0",
            side === "top" ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ icon: Icon, children, danger, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ComponentType<{ size?: number }>; danger?: boolean }) {
  return (
    <button role="menuitem" className={cx("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-slate-100", danger ? "text-red-600" : "text-slate-700")} {...p}>
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

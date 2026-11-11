"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cx } from "./ui";

// Modal & sheet pakai <dialog> native: focus trap, Esc, dan backdrop sudah dari browser.
export function Dialog({
  open,
  onClose,
  title,
  desc,
  children,
  footer,
  variant = "modal",
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  desc?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: "modal" | "sheet";
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const sheet = variant === "sheet";
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="dialog-title"
      className={cx(
        "bg-white p-0 text-slate-900 shadow-lg outline-none",
        sheet
          ? "sheet m-0 ml-auto h-dvh max-h-dvh w-full max-w-lg border-l border-slate-200"
          : cx("m-auto w-[calc(100%-2rem)] rounded-xl border border-slate-200", size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-lg"),
      )}
    >
      {open && (
        <div className={cx("flex flex-col", sheet ? "h-full" : "max-h-[85dvh]")}>
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 id="dialog-title" className="text-base font-semibold">{title}</h2>
              {desc && <p className="mt-0.5 text-[13px] text-slate-500">{desc}</p>}
            </div>
            <button onClick={onClose} className="-m-1 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

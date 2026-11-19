"use client";
import { useRef, useState } from "react";
import { Dialog } from "./dialog";
import { Button } from "./ui";

type ConfirmOptions = { title: string; desc?: React.ReactNode; confirmLabel?: string; cancelLabel?: string; danger?: boolean };

// Pengganti window.confirm() dengan modal aplikasi. Pakai: const [confirm, confirmDialog] = useConfirm();
// if (await confirm({ title: "Hapus?" })) …  dan render {confirmDialog} sekali di komponen.
export function useConfirm() {
  const [open, setOpen] = useState(false);
  const opts = useRef<ConfirmOptions>({ title: "" }); // tetap ada selama animasi tutup
  const resolver = useRef<(v: boolean) => void>(undefined);
  const ask = (o: ConfirmOptions) => new Promise<boolean>((resolve) => { opts.current = o; resolver.current = resolve; setOpen(true); });
  const close = (v: boolean) => { resolver.current?.(v); resolver.current = undefined; setOpen(false); };
  const o = opts.current;
  const dialog = (
    <Dialog open={open} onClose={() => close(false)} title={o.title} size="sm"
      footer={<><Button variant="ghost" onClick={() => close(false)}>{o.cancelLabel ?? "Batal"}</Button><Button variant={o.danger ? "danger" : "primary"} onClick={() => close(true)} autoFocus>{o.confirmLabel ?? "Ya, lanjut"}</Button></>}>
      {o.desc ? <div className="text-[14px] leading-relaxed text-slate-600">{o.desc}</div> : null}
    </Dialog>
  );
  return [ask, dialog] as const;
}

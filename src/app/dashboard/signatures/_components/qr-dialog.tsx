"use client";
import { useEffect, useState } from "react";
import { Copy, Download, ExternalLink } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { Button, Skeleton } from "@/components/ui";
import { type Signature, qrWithLogo, verifyUrl } from "../_lib";

export function QrDialog({ sig, onClose }: { sig: Signature | null; onClose: () => void }) {
  const toast = useToast();
  const [img, setImg] = useState("");
  useEffect(() => {
    setImg("");
    if (sig) qrWithLogo(verifyUrl(sig.code)).then(setImg, (e) => toast(String(e), { error: true }));
  }, [sig?.code]); // eslint-disable-line react-hooks/exhaustive-deps

  const file = sig ? `ttd-${sig.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.png` : "";
  return (
    <Dialog open={!!sig} onClose={onClose} title="QR tanda tangan" desc={sig?.title} size="sm"
      footer={sig && <>
        <Button variant="ghost" onClick={() => navigator.clipboard.writeText(verifyUrl(sig.code)).then(() => toast("Link disalin"))}><Copy size={15} aria-hidden /> Salin link</Button>
        <a href={img || undefined} download={file} aria-disabled={!img}><Button disabled={!img}><Download size={15} aria-hidden /> Unduh PNG</Button></a>
      </>}>
      {sig && (
        <div className="grid justify-items-center gap-3">
          {img ? <img src={img} alt={`QR tanda tangan ${sig.title}`} className="size-64 rounded-lg border border-slate-200" /> : <Skeleton className="size-64 rounded-lg" />}
          {sig.revokedAt && <p className="text-[13px] font-medium text-red-600">Sudah dicabut: yang scan akan melihat status tidak berlaku.</p>}
          <a href={`/ttd/${sig.code}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] text-primary hover:underline">
            Lihat halaman verifikasi <ExternalLink size={12} aria-hidden />
          </a>
        </div>
      )}
    </Dialog>
  );
}

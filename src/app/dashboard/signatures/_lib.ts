import QRCode from "qrcode";

export type Signature = { id: string; code: string; title: string; purpose: string | null; signerTitle: string; signedAt: string; revokedAt: string | null };

export const verifyUrl = (code: string) => `${location.origin}/ttd/${code}`;

// QR dengan logo GenBI di tengah. Koreksi error level H (±30%) menutup area logo (±6% luas QR), jadi tetap terbaca.
export async function qrWithLogo(text: string, size = 1024): Promise<string> {
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, text, { width: size, margin: 2, errorCorrectionLevel: "H", color: { dark: "#0f172a" } });
  const ctx = canvas.getContext("2d")!;
  const logo = new Image();
  logo.src = "/logo.png";
  await logo.decode();
  const w = canvas.width, box = w * 0.24, at = (w - box) / 2, pad = box * 0.1;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(at, at, box, box, box * 0.2);
  ctx.fill();
  ctx.drawImage(logo, at + pad, at + pad, box - pad * 2, box - pad * 2);
  return canvas.toDataURL("image/png");
}

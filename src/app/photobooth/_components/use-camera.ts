"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { videoMime } from "./save";

// Efek foto: kecerahan (-0.3..0.3) + beauty ringan (kulit sedikit lebih halus & cerah, tidak mengubah bentuk wajah).
export type Look = { brightness: number; beauty: boolean };
const BEAUTY = { lift: 0.04, contrast: 0.96, saturate: 1.05, soften: 0.3 } as const;
const tone = (l: Look) => ({ f: 1 + l.brightness + (l.beauty ? BEAUTY.lift : 0), c: l.beauty ? BEAUTY.contrast : 1, s: l.beauty ? BEAUTY.saturate : 1 });

// Filter CSS untuk pratinjau live; urutan & angkanya sama dengan yang diterapkan saat jepret.
export const lookCss = (l: Look) => { const t = tone(l); return `brightness(${t.f}) contrast(${t.c}) saturate(${t.s})`; };
export const SOFTEN = BEAUTY.soften;

// Kamera untuk photobooth. Foto hanya disimpan di memori browser, tidak pernah dikirim ke server.
export function useCamera() {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [state, setState] = useState<"idle" | "starting" | "on" | "error">("idle");
  const [error, setError] = useState("");

  const stop = useCallback(() => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; }, []);

  const start = useCallback(async (mode = facing) => {
    stop();
    setState("starting");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Browser ini tidak mendukung kamera. Buka lewat HTTPS di Chrome/Safari terbaru.");
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      stream.current = s;
      if (video.current) { video.current.srcObject = s; await video.current.play().catch(() => {}); }
      setFacing(mode);
      setState("on");
    } catch (e) {
      const name = (e as Error).name;
      setError(name === "NotAllowedError" ? "Izin kamera ditolak. Izinkan kamera di pengaturan browser lalu coba lagi." : name === "NotFoundError" ? "Kamera tidak ditemukan." : (e as Error).message);
      setState("error");
    }
  }, [facing, stop]);

  useEffect(() => stop, [stop]);

  // Kamera depan dicerminkan seperti di layar (lazim di photobooth), kamera belakang apa adanya.
  const capture = useCallback((look: Look) => {
    const v = video.current;
    return v?.videoWidth ? processFrame(v, v.videoWidth, v.videoHeight, look, facing === "user") : null;
  }, [facing]);

  // Rekam video mentah dari kamera; efek & cermin diterapkan nanti saat video hasil dibuat (supaya jepret tidak tersendat).
  const recordClip = useCallback(() => {
    const mime = videoMime();
    if (!stream.current || !mime) return null;
    const rec = new MediaRecorder(stream.current, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const ended = new Promise<Blob>((ok) => { rec.onstop = () => ok(new Blob(chunks, { type: mime.split(";")[0] })); });
    rec.start();
    return () => { if (rec.state !== "inactive") rec.stop(); return ended; };
  }, []);

  return { video, stream, state, error, facing, start, stop, capture, recordClip, flip: () => start(facing === "user" ? "environment" : "user") };
}

// Satu frame kamera → kanvas dengan efek. `out` dipakai ulang saat memproses video per frame.
export function processFrame(src: CanvasImageSource, sw: number, sh: number, look: Look, mirror: boolean, maxW = Infinity, out?: HTMLCanvasElement) {
  const c = out ?? document.createElement("canvas");
  const z = Math.min(1, maxW / sw);
  const w = Math.round(sw * z), h = Math.round(sh * z);
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (mirror) { ctx.translate(w, 0); ctx.scale(-1, 1); }
  ctx.drawImage(src, 0, 0, w, h);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (look.beauty) {
    // Soft focus: campur salinan buram tipis. Diburamkan lewat perkecil-perbesar karena ctx.filter belum ada di semua Safari.
    const small = document.createElement("canvas");
    small.width = Math.max(1, Math.round(w / 6));
    small.height = Math.max(1, Math.round(h / 6));
    small.getContext("2d")!.drawImage(c, 0, 0, small.width, small.height);
    ctx.globalAlpha = BEAUTY.soften;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(small, 0, 0, w, h);
    ctx.globalAlpha = 1;
  }
  const { f, c: k, s: sat } = tone(look);
  if (f !== 1 || k !== 1 || sat !== 1) {
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      // Sama dengan CSS brightness → contrast → saturate.
      const r = (d[i]! * f - 128) * k + 128, g = (d[i + 1]! * f - 128) * k + 128, b = (d[i + 2]! * f - 128) * k + 128;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      d[i] = lum + (r - lum) * sat; d[i + 1] = lum + (g - lum) * sat; d[i + 2] = lum + (b - lum) * sat; // Uint8ClampedArray membatasi 0..255
    }
    ctx.putImageData(img, 0, 0);
  }
  return c;
}

"use client";
import { useEffect, useRef, useState } from "react";
import { Square, Video } from "lucide-react";
import { Button } from "@/components/ui";

const MAX_SEC = 60;
// Bitrate rendah + 480p = kompresi saat merekam: 60 dtk ≈ 3,5 MB.
const REC_OPTS = { videoBitsPerSecond: 400_000, audioBitsPerSecond: 64_000 };
const pickMime = () => ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp8,opus", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";

// Video note: hanya dari kamera langsung (getUserMedia), tidak bisa pilih file dari galeri.
export function VideoNote({ file, onChange }: { file: File | null; onChange: (f: File | null) => void }) {
  const live = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const [state, setState] = useState<"idle" | "preview" | "recording">("idle");
  const [sec, setSec] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const url = useRef<string | null>(null);
  const [playUrl, setPlayUrl] = useState<string | null>(null);

  const stopCamera = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };
  useEffect(() => () => { stopCamera(); if (url.current) URL.revokeObjectURL(url.current); }, []);

  useEffect(() => {
    if (state !== "recording") return;
    const t = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state]);
  useEffect(() => { if (sec >= MAX_SEC) stop(); }, [sec]);
  useEffect(() => { if (state !== "idle" && live.current) live.current.srcObject = stream.current; }, [state]);

  const stop = () => { if (rec.current?.state === "recording") rec.current.stop(); };

  async function openCamera() {
    setError(null);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: true });
      setState("preview");
    } catch {
      setError("Kamera/mikrofon tidak bisa dibuka. Izinkan akses kamera & mikrofon di browser.");
    }
  }

  function start() {
    if (!stream.current) return;
    const mimeType = pickMime();
    const r = new MediaRecorder(stream.current, { ...REC_OPTS, ...(mimeType && { mimeType }) });
    const chunks: Blob[] = [];
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onstop = () => {
      stopCamera();
      const type = (r.mimeType || "video/webm").split(";")[0];
      const f = new File(chunks, `video-note.${type === "video/mp4" ? "mp4" : "webm"}`, { type });
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = URL.createObjectURL(f);
      setPlayUrl(url.current);
      setState("idle");
      onChange(f);
    };
    rec.current = r;
    r.start(1000);
    setSec(0);
    setState("recording");
  }

  const circle = "mx-auto aspect-square w-48 rounded-full bg-slate-900 object-cover";
  return (
    <div className="grid justify-items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      {state !== "idle" ? (
        <video ref={live} className={`${circle} -scale-x-100`} muted autoPlay playsInline />
      ) : file && playUrl ? (
        <video src={playUrl} className={circle} controls playsInline />
      ) : (
        <div className={`${circle} grid place-items-center text-slate-400`}><Video size={32} aria-hidden /></div>
      )}
      {state === "recording" && <p className="text-[13px] font-medium text-red-600" aria-live="polite">● Merekam {sec}s / {MAX_SEC}s</p>}
      {file && state === "idle" && <p className="text-xs text-slate-500">{(file.size / 1048576).toFixed(1)} MB</p>}
      {state === "idle" && <Button type="button" variant="outline" size="sm" onClick={openCamera}><Video size={14} aria-hidden /> {file ? "Rekam ulang" : "Buka kamera"}</Button>}
      {state === "preview" && <Button type="button" size="sm" onClick={start}>Mulai rekam</Button>}
      {state === "recording" && <Button type="button" size="sm" variant="outline" onClick={stop}><Square size={13} aria-hidden /> Selesai</Button>}
      {error && <p className="text-[13px] text-red-600">{error}</p>}
    </div>
  );
}

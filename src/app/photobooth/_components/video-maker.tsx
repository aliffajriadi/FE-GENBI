"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import type { Design } from "@/components/photobooth/design";
import type { Photos } from "@/components/photobooth/stage";
import { processFrame, type Look } from "./use-camera";
import { videoMime } from "./save";

const DesignStage = dynamic(() => import("@/components/photobooth/stage").then((m) => m.DesignStage), { ssr: false });

export type Clip = { blob: Blob; look: Look; mirror: boolean };
const HOLD_MS = 1000; // diam di foto akhir sebelum video berulang
const MAX_MS = 10_000; // jaga-jaga kalau ada klip yang tidak pernah "ended"

// Video "live": semua slot memutar rekaman 3 detik sebelum jepret secara bersamaan, lalu berhenti di fotonya.
export function VideoMaker({ design, clips, photos, onDone, onError }: { design: Design; clips: Record<string, Clip>; photos: Photos; onDone: (blob: Blob) => void; onError: (msg: string) => void }) {
  const stage = useRef<Konva.Stage>(null);
  const holder = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<Photos | null>(null);
  // Kanvas ±720 px lebar (Konva mengalikan dengan devicePixelRatio).
  const scale = Math.min(720 / design.width, 1280 / design.height) / (typeof window === "undefined" ? 1 : devicePixelRatio || 1);

  useEffect(() => {
    let cancelled = false, raf = 0, timer = 0, stopRec = () => {};
    const urls: string[] = [];
    const mime = videoMime();
    const run = async () => {
      if (!mime) throw new Error("Browser ini belum bisa membuat video. Coba Chrome atau Safari terbaru.");
      await document.fonts.ready;
      // Siapkan satu <video> + satu kanvas olahan per slot yang punya klip.
      const players = await Promise.all(Object.entries(clips).map(async ([id, clip]) => {
        const v = document.createElement("video");
        Object.assign(v, { muted: true, playsInline: true, preload: "auto", src: URL.createObjectURL(clip.blob) });
        urls.push(v.src);
        holder.current?.appendChild(v); // Safari lebih andal memutar video yang ada di DOM
        await new Promise<void>((ok, fail) => { v.onloadeddata = () => ok(); v.onerror = () => fail(new Error("Klip video tidak bisa dibaca")); });
        return { id, v, clip, canvas: processFrame(v, v.videoWidth, v.videoHeight, clip.look, clip.mirror, 640) };
      }));
      if (cancelled) return;
      const live = new Map(players.map((p) => [p.id, p]));
      setShown({ ...photos, ...Object.fromEntries(players.map((p) => [p.id, p.canvas])) });
      // Kanvas Konva dimuat lewat dynamic import: tunggu sampai benar-benar terpasang (bukan jeda tetap).
      let canvas: HTMLCanvasElement | undefined;
      for (let t = 0; t < 100 && !cancelled && !(canvas = stage.current?.getLayers()[0]?.getNativeCanvasElement()); t++) await new Promise((r) => setTimeout(r, 50));
      if (cancelled) return;
      if (!canvas) throw new Error("Kanvas video gagal disiapkan. Coba lagi.");
      if (!canvas.captureStream) throw new Error("Browser ini belum bisa merekam kanvas. Coba Chrome atau Safari terbaru.");
      await new Promise((r) => setTimeout(r, 300)); // biar gambar template (frame, stiker) sempat tergambar

      const rec = new MediaRecorder(canvas.captureStream(30), { mimeType: mime, videoBitsPerSecond: 4_000_000 });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      stopRec = () => { if (rec.state !== "inactive") rec.stop(); };
      rec.onstop = () => { if (!cancelled) onDone(new Blob(chunks, { type: mime.split(";")[0] })); };
      const finish = () => { cancelAnimationFrame(raf); clearTimeout(timer); timer = window.setTimeout(() => rec.state !== "inactive" && rec.stop(), HOLD_MS); };

      for (const p of players) {
        // Klip selesai → slot diganti foto akhirnya (frame yang sama dengan foto yang diunduh).
        p.v.onended = () => {
          live.delete(p.id);
          setShown((s) => ({ ...s, [p.id]: photos[p.id]! }));
          if (!live.size) finish();
        };
      }
      rec.start();
      await Promise.all(players.map((p) => p.v.play()));
      const draw = () => {
        for (const p of live.values()) processFrame(p.v, p.v.videoWidth, p.v.videoHeight, p.clip.look, p.clip.mirror, 640, p.canvas);
        stage.current?.getLayers()[0]?.batchDraw();
        raf = requestAnimationFrame(draw);
      };
      draw();
      if (!players.length) finish();
      timer = window.setTimeout(finish, MAX_MS);
    };
    run().catch((e: Error) => { if (!cancelled) onError(e.message); });
    return () => { cancelled = true; stopRec(); cancelAnimationFrame(raf); clearTimeout(timer); urls.forEach(URL.revokeObjectURL); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Di luar layar (bukan display:none) supaya kanvas tetap digambar.
  return (
    <div aria-hidden className="pointer-events-none fixed top-0 -left-[10000px]">
      <div ref={holder} className="size-px overflow-hidden" />
      {shown && <DesignStage design={design} scale={scale} photos={shown} stageRef={stage} />}
    </div>
  );
}

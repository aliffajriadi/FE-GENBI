"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import { ArrowLeft, Box, Camera, Clapperboard, Images, Wand2, Download, RefreshCw, RotateCcw, Share2, Sparkles, Sun, SwitchCamera, Timer } from "lucide-react";
import { photoSlots, type Template } from "@/components/photobooth/design";
import type { Photos } from "@/components/photobooth/stage";
import { lookCss, SOFTEN, useCamera, type Look } from "./use-camera";
import { Preview3D } from "./preview-3d";
import { download, share, stamp, videoExt, videoMime } from "./save";
import { VideoMaker, type Clip } from "./video-maker";

const DesignStage = dynamic(() => import("@/components/photobooth/stage").then((m) => m.DesignStage), { ssr: false });

const btn = "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-medium transition disabled:opacity-50";
const primary = `${btn} bg-[#11418b] text-white hover:bg-[#0d3470]`;
const ghost = `${btn} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const CLIP_S = 3; // detik video sebelum tiap jepretan

type Hero = { src: string; alt: string } | null;

export function Booth({ templates, hero }: { templates: Template[]; hero: Hero }) {
  const [step, setStep] = useState<"intro" | "pick">("intro");
  const [tpl, setTpl] = useState<Template | null>(null);
  if (tpl) return <Session key={tpl.id} tpl={tpl} onBack={() => { setTpl(null); setStep(templates.length > 1 ? "pick" : "intro"); }} />;
  if (step === "pick") return <Picker templates={templates} onPick={setTpl} />;
  // Satu template saja: langsung ke kamera.
  return <Intro sample={templates[0]} hero={hero} onStart={() => (templates.length === 1 ? setTpl(templates[0]!) : setStep("pick"))} />;
}

const STEPS = [
  { icon: Camera, title: "Ambil foto", desc: "Pilih template, tekan Mulai. Ada 3 detik untuk berpose tiap foto." },
  { icon: Wand2, title: "Atur tampilan", desc: "Kecerahan dan beauty ringan, langsung terlihat di kamera." },
  { icon: Images, title: "Unduh foto & video", desc: "Strip foto plus video 3 detik sebelum tiap jepretan." },
];

function Intro({ sample, hero, onStart }: { sample?: Template; hero: Hero; onStart: () => void }) {
  return (
    <>
      <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <h1 className="font-serif text-[44px] leading-none font-medium tracking-[-0.02em] sm:text-[64px]">Photobooth GenBI</h1>
          <p className="mt-5 max-w-lg text-[17px] text-slate-500">Foto strip bareng frame GenBI langsung dari browser, tanpa aplikasi. Semua diproses di perangkatmu, foto tidak dikirim ke server.</p>
          {sample ? (
            <button onClick={onStart} className="mt-8 inline-flex h-14 items-center gap-3 rounded-full bg-[#11418b] pr-8 pl-6 text-[17px] font-semibold text-white shadow-lg shadow-[#11418b]/25 transition hover:bg-[#0d3470] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#11418b]">
              <Camera size={22} aria-hidden /> Mulai
            </button>
          ) : <p className="mt-8 rounded-2xl border border-dashed border-slate-300 p-6 text-slate-500">Belum ada template photobooth. Nantikan, ya!</p>}
        </div>
        {/* Gambar pilihan admin (Pengaturan > Photobooth); kosong = contoh template pertama. */}
        {hero ? (
          <img src={hero.src} alt={hero.alt} className="hidden max-h-[460px] w-auto max-w-sm justify-self-center rounded-2xl object-contain sm:block" />
        ) : sample && (
          <div aria-hidden className="pointer-events-none hidden rotate-3 justify-self-center rounded-2xl bg-slate-100 p-3 shadow-xl sm:block">
            <DesignStage design={sample.design} scale={Math.min(260 / sample.design.width, 420 / sample.design.height)} />
          </div>
        )}
      </section>
      <section className="mt-16 grid gap-4 sm:grid-cols-3" aria-label="Cara pakai">
        {STEPS.map((s, i) => (
          <div key={s.title} className="rounded-2xl border border-slate-200 p-5">
            <s.icon size={22} className="text-[#11418b]" aria-hidden />
            <p className="mt-3 font-medium">{i + 1}. {s.title}</p>
            <p className="mt-1 text-[14px] text-slate-500">{s.desc}</p>
          </div>
        ))}
      </section>
    </>
  );
}

function Picker({ templates, onPick }: { templates: Template[]; onPick: (t: Template) => void }) {
  return (
    <div>
      <h2 className="font-serif text-[32px] font-medium">Pilih template</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {templates.map((t) => (
          <button key={t.id} onClick={() => onPick(t)} className="group rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-[#11418b] hover:bg-white focus-visible:outline-2 focus-visible:outline-[#11418b]">
            <div className="pointer-events-none grid h-60 place-items-center">
              <DesignStage design={t.design} scale={Math.min(200 / t.design.width, 230 / t.design.height)} />
            </div>
            <p className="mt-2 truncate text-[14px] font-medium">{t.name}</p>
            <p className="text-xs text-slate-500">{photoSlots(t.design).length} foto</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function Session({ tpl, onBack }: { tpl: Template; onBack: () => void }) {
  const cam = useCamera();
  const slots = photoSlots(tpl.design);
  const [photos, setPhotos] = useState<Photos>({});
  const [clips, setClips] = useState<Record<string, Clip>>({});
  const [video, setVideo] = useState<{ blob: Blob; url: string } | null>(null);
  const [making, setMaking] = useState(false);
  const [view, setView] = useState<"photo" | "video">("video");
  const [videoErr, setVideoErr] = useState("");
  const [preview, setPreview] = useState<{ kind: "image" | "video"; src: string } | null>(null);
  const [active, setActive] = useState(slots[0]!.id);
  const [delay, setDelay] = useState(3);
  const [look, setLook] = useState<Look>({ brightness: 0, beauty: true });
  const soft = useRef<HTMLVideoElement>(null);
  const lookNow = useRef(look);
  lookNow.current = look; // dibaca saat jepret, supaya geser kecerahan selama hitung mundur tetap terpakai
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [done, setDone] = useState(false);
  const stage = useRef<Konva.Stage>(null);
  const filled = slots.filter((s) => photos[s.id]).length;
  const [vw, setVw] = useState(1024);
  useEffect(() => { const on = () => setVw(innerWidth); on(); addEventListener("resize", on); return () => removeEventListener("resize", on); }, []);

  useEffect(() => { void cam.start(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Lapisan buram untuk pratinjau beauty memakai stream yang sama.
  useEffect(() => { if (soft.current && cam.state === "on") { soft.current.srcObject = cam.stream.current; void soft.current.play().catch(() => {}); } }, [cam.state, cam.facing, look.beauty]);

  async function shoot(ids: string[]) {
    setBusy(true);
    let shot = { ...photos };
    dropVideo();
    for (const id of ids) {
      setActive(id);
      let stopClip: ReturnType<typeof cam.recordClip> = null;
      for (let i = delay; i > 0; i--) {
        if (i === Math.min(delay, CLIP_S)) stopClip = cam.recordClip(); // rekam 3 detik terakhir untuk versi video
        setCount(i);
        await sleep(1000);
      }
      setCount(0);
      const c = cam.capture(lookNow.current);
      const clip = stopClip?.();
      if (!c) break;
      setFlash(true); setTimeout(() => setFlash(false), 180);
      shot = { ...shot, [id]: c };
      setPhotos(shot);
      const mirror = cam.facing === "user", lookAt = lookNow.current;
      void clip?.then((blob) => setClips((x) => ({ ...x, [id]: { blob, look: lookAt, mirror } })));
      await sleep(700); // jeda supaya sempat ganti gaya
    }
    setBusy(false);
    const next = slots.find((s) => !shot[s.id]);
    if (next) setActive(next.id);
    else { setDone(true); cam.stop(); }
  }

  const exportUrl = () => {
    const s = stage.current!;
    return s.toDataURL({ pixelRatio: tpl.design.width / s.width(), mimeType: "image/jpeg", quality: 0.92 });
  };
  const photo = {
    download: async () => { await document.fonts.ready; download(exportUrl(), `${stamp()}.jpg`); },
    share: async () => { await document.fonts.ready; await share(await (await fetch(exportUrl())).blob(), `${stamp()}.jpg`); },
    preview: async () => { await document.fonts.ready; setPreview({ kind: "image", src: exportUrl() }); },
  };
  const vid = {
    download: () => video && download(video.url, `${stamp()}.${videoExt(video.blob)}`),
    share: () => video && share(video.blob, `${stamp()}.${videoExt(video.blob)}`),
  };
  function dropVideo() { setVideo((v) => { if (v) URL.revokeObjectURL(v.url); return null; }); setVideoErr(""); }
  useEffect(() => () => { if (video) URL.revokeObjectURL(video.url); }, [video]);
  // Video dibuat otomatis begitu semua rekaman siap, lalu langsung diputar di layar.
  const clipsReady = !videoMime() || Object.keys(clips).length >= slots.length;
  useEffect(() => { if (done && clipsReady && !video && !making && !videoErr) { setView("video"); setMaking(true); } }, [done, clipsReady, video, making, videoErr]);

  function retakeAll() { setPhotos({}); setClips({}); dropVideo(); setActive(slots[0]!.id); setDone(false); void cam.start(); }
  function retake(id: string) { if (done) { setDone(false); void cam.start(); } shoot([id]); }

  const previewScale = Math.min(Math.min(360, vw - 64) / tpl.design.width, 560 / tpl.design.height);

  return (
    <div>
      <button onClick={() => { cam.stop(); onBack(); }} className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-900"><ArrowLeft size={15} aria-hidden /> Ganti template</button>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          {!done ? (
            <>
              <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-900">
                <video ref={cam.video} playsInline muted style={{ filter: lookCss(look) }} className={`h-full w-full object-cover ${cam.facing === "user" ? "-scale-x-100" : ""}`} />
                {look.beauty && <video ref={soft} playsInline muted aria-hidden style={{ filter: `${lookCss(look)} blur(3px)`, opacity: SOFTEN }} className={`absolute inset-0 h-full w-full object-cover ${cam.facing === "user" ? "-scale-x-100" : ""}`} />}
                {cam.state !== "on" && (
                  <div className="absolute inset-0 grid place-items-center p-6 text-center text-white/80">
                    {cam.state === "error" ? <div><p>{cam.error}</p><button className={`${ghost} mt-4`} onClick={() => cam.start()}>Coba lagi</button></div> : "Menyalakan kamera…"}
                  </div>
                )}
                {count > 0 && <div key={count} className="absolute inset-0 grid animate-ping place-items-center text-[120px] font-bold text-white [animation-duration:1s] [animation-iteration-count:1]" aria-live="assertive">{count}</div>}
                {flash && <div className="absolute inset-0 bg-white" aria-hidden />}
                <p className="absolute top-3 left-3 rounded-full bg-black/50 px-3 py-1 text-[13px] text-white">Foto {slots.findIndex((s) => s.id === active) + 1} dari {slots.length}</p>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button className={primary} disabled={busy || cam.state !== "on"} onClick={() => shoot(slots.filter((s) => !photos[s.id]).map((s) => s.id))}>
                  <Camera size={17} aria-hidden /> {filled ? `Lanjut (${slots.length - filled} lagi)` : slots.length > 1 ? `Mulai (${slots.length} foto)` : "Jepret"}
                </button>
                <label className={`${ghost} cursor-pointer`}>
                  <Timer size={16} aria-hidden />
                  <select value={delay} onChange={(e) => setDelay(Number(e.target.value))} disabled={busy} className="bg-transparent outline-none" aria-label="Hitung mundur">
                    {[3, 5, 10].map((s) => <option key={s} value={s}>{s} detik</option>)}
                  </select>
                </label>
                <button className={look.beauty ? `${btn} bg-pink-50 text-pink-700 ring-1 ring-pink-200 hover:bg-pink-100` : ghost} aria-pressed={look.beauty} onClick={() => setLook((l) => ({ ...l, beauty: !l.beauty }))}>
                  <Sparkles size={16} aria-hidden /> Beauty {look.beauty ? "nyala" : "mati"}
                </button>
                <button className={ghost} disabled={busy} onClick={cam.flip} aria-label="Ganti kamera depan/belakang"><SwitchCamera size={16} aria-hidden /> Balik kamera</button>
              </div>
              <label className="mt-3 flex max-w-sm items-center gap-3 text-[13px] text-slate-600">
                <Sun size={16} aria-hidden className="shrink-0" />
                <span className="shrink-0">Kecerahan</span>
                <input type="range" min={-30} max={30} step={1} value={Math.round(look.brightness * 100)} onChange={(e) => setLook((l) => ({ ...l, brightness: Number(e.target.value) / 100 }))} className="w-full accent-[#11418b]" aria-valuetext={`${Math.round(look.brightness * 100)}%`} />
                <button type="button" className="shrink-0 text-xs text-slate-400 hover:text-slate-700" onClick={() => setLook((l) => ({ ...l, brightness: 0 }))}>Reset</button>
              </label>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 p-6">
              <h2 className="font-serif text-[28px] font-medium">Fotomu sudah jadi!</h2>
              <p className="mt-1 text-slate-500">Simpan atau bagikan. Foto tidak disimpan di server kami.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button className={primary} onClick={photo.download}><Download size={17} aria-hidden /> Unduh foto</button>
                <button className={ghost} onClick={photo.share}><Share2 size={16} aria-hidden /> Bagikan</button>
                <button className={ghost} onClick={photo.preview}><Box size={16} aria-hidden /> Lihat 3D</button>
              </div>
              <div className="mt-5 border-t border-slate-100 pt-5">
                <p className="text-[14px] font-medium">Versi video</p>
                <p className="mt-0.5 text-[13px] text-slate-500">Rekaman 3 detik sebelum tiap jepretan, diputar bersamaan lalu berhenti di fotonya.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {video ? (
                    <>
                      <button className={primary} onClick={vid.download}><Download size={16} aria-hidden /> Unduh video</button>
                      <button className={ghost} onClick={vid.share}><Share2 size={16} aria-hidden /> Bagikan</button>
                      <button className={ghost} onClick={() => setPreview({ kind: "video", src: video.url })}><Box size={16} aria-hidden /> Lihat 3D</button>
                    </>
                  ) : videoErr ? (
                    <button className={ghost} onClick={() => setVideoErr("")}><Clapperboard size={16} aria-hidden /> Coba buat lagi</button>
                  ) : <p className="text-[13px] text-slate-500" aria-live="polite">Membuat video… (±5 detik)</p>}
                </div>
                {videoErr && <p className="mt-2 text-[13px] text-red-600">{videoErr}</p>}
              </div>
              <button className={`${ghost} mt-5`} onClick={retakeAll}><RefreshCw size={16} aria-hidden /> Foto ulang semua</button>
            </div>
          )}

          {filled > 0 && (
            <div className="mt-5">
              <p className="text-[13px] font-medium text-slate-600">Kurang pas? Ulang satu foto:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {slots.map((s, i) => (
                  <button key={s.id} disabled={busy || !photos[s.id]} onClick={() => retake(s.id)} className={`${ghost} h-9 px-3 text-[13px]`}>
                    <RotateCcw size={14} aria-hidden /> Foto {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="justify-self-center">
          {done && (
            <div className="mb-3 flex justify-center gap-1 rounded-full bg-slate-100 p-1 text-[13px] font-medium" role="tablist" aria-label="Tampilan hasil">
              {(["video", "photo"] as const).map((v) => (
                <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
                  className={`flex-1 rounded-full px-4 py-1.5 ${view === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>
                  {v === "video" ? "Video" : "Foto"}
                </button>
              ))}
            </div>
          )}
          <div className="relative rounded-2xl bg-slate-100 p-3 shadow-inner">
            {done ? (
              <>
                {/* Stage tetap terpasang (dipakai untuk ekspor foto) walau tab Video aktif. */}
                <button onClick={photo.preview} className={`block cursor-zoom-in rounded focus-visible:outline-2 focus-visible:outline-[#11418b] ${view === "video" && video ? "hidden" : ""}`} aria-label="Lihat foto 3D">
                  <DesignStage design={tpl.design} scale={previewScale} photos={photos} stageRef={stage} />
                </button>
                {view === "video" && video && (
                  <button onClick={() => setPreview({ kind: "video", src: video.url })} className="block cursor-zoom-in rounded focus-visible:outline-2 focus-visible:outline-[#11418b]" aria-label="Lihat video 3D">
                    <video src={video.url} autoPlay loop muted playsInline className="block rounded" style={{ width: tpl.design.width * previewScale, height: tpl.design.height * previewScale }} />
                  </button>
                )}
                {view === "video" && making && (
                  <div className="absolute inset-3 grid place-items-center rounded bg-white/70 text-[13px] font-medium text-slate-700" aria-live="polite">Membuat video…</div>
                )}
              </>
            ) : <DesignStage design={tpl.design} scale={previewScale} photos={photos} activeSlot={active} stageRef={stage} />}
          </div>
          {making && <VideoMaker design={tpl.design} clips={clips} photos={photos}
            onDone={(blob) => { setMaking(false); setVideo({ blob, url: URL.createObjectURL(blob) }); }}
            onError={(m) => { setMaking(false); setVideoErr(m); }} />}
          {preview && <Preview3D {...preview} onClose={() => setPreview(null)}
            onDownload={preview.kind === "image" ? photo.download : vid.download} onShare={preview.kind === "image" ? photo.share : vid.share} />}
        </div>
      </div>
    </div>
  );
}

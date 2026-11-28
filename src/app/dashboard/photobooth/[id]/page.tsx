"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, ImagePlus, Maximize, ScanFace, Type, ZoomIn, ZoomOut } from "lucide-react";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, ErrorText, Field, Input, Skeleton } from "@/components/ui";
import { uid, type Design, type El } from "@/components/photobooth/design";
import { api, publicFile, uploadFile } from "@/lib/api";
import { Inspector } from "./_components/inspector";

const DesignStage = dynamic(() => import("@/components/photobooth/stage").then((m) => m.DesignStage), { ssr: false });

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 6;

type Tpl = { id: string; name: string; design: Design; published: boolean; canEdit: boolean };

export default function PhotoboothEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ["photobooth", id], queryFn: () => api<Tpl>(`/photobooth/${id}`) });
  const [name, setName] = useState("");
  const [design, setDesign] = useState<Design | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [boxW, setBoxW] = useState(600);
  const [zoom, setZoom] = useState(1); // relatif terhadap "pas layar"
  const zoomBy = (k: number) => setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * k * 100) / 100)));
  const box = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => { if (q.data && !design) { setDesign(q.data.design); setName(q.data.name); } }, [q.data, design]);
  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setBoxW(e!.contentRect.width));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, [design === null]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = (fn: (d: Design) => Design) => { setDesign((d) => (d ? fn(d) : d)); setDirty(true); };
  const setEl = (el: El) => update((d) => ({ ...d, elements: d.elements.map((e) => (e.id === el.id ? el : e)) }));
  const add = (el: El) => { update((d) => ({ ...d, elements: [...d.elements, el] })); setSelected(el.id); };
  const remove = (elId: string) => { update((d) => ({ ...d, elements: d.elements.filter((e) => e.id !== elId) })); setSelected(null); };
  const move = (elId: string, dir: 1 | -1) => update((d) => {
    const i = d.elements.findIndex((e) => e.id === elId), j = i + dir;
    if (j < 0 || j >= d.elements.length) return d;
    const els = [...d.elements];
    [els[i], els[j]] = [els[j]!, els[i]!];
    return { ...d, elements: els };
  });

  // Ctrl/Cmd + scroll (atau pinch di trackpad) untuk zoom; perlu listener non-passive supaya browser tidak ikut zoom.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1); };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [design === null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Delete/Backspace menghapus elemen terpilih, kecuali sedang mengetik di kolom.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selected || !(e.key === "Delete" || e.key === "Backspace")) return;
      if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      remove(selected);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: () => api(`/photobooth/${id}`, { method: "PUT", body: { name: name.trim(), design } }),
    onSuccess: () => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["photobooth"] });
      toast(q.data?.published ? "Disimpan. Perubahan langsung tampil di Photobooth (±1 menit)." : "Template disimpan");
    },
    onError: (e) => toast(e.message, { error: true }),
  });
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const { url } = await uploadFile(file, { public: true });
      const img = new Image();
      img.src = publicFile(url);
      await img.decode();
      return { url, w: img.naturalWidth, h: img.naturalHeight };
    },
    onSuccess: ({ url, w, h }) => {
      // Ukuran awal: muat di kanvas (frame PNG seukuran kanvas langsung pas).
      const s = Math.min(1, design!.width / w, design!.height / h);
      add({ id: uid(), type: "image", url, x: 0, y: 0, w: Math.round(w * s), h: Math.round(h * s), rotation: 0 });
    },
    onError: (e) => toast(e.message, { error: true }),
  });

  if (q.isLoading || (q.data && !design)) return <Skeleton className="h-[70vh]" />;
  if (!q.data || !design) return <ErrorText error={q.error} />;
  if (!q.data.canEdit) return <ErrorText error={new Error("Kamu tidak bisa mengubah template ini")} />;

  const fit = Math.min((boxW - 32) / design.width, (typeof window === "undefined" ? 800 : window.innerHeight - 260) / design.height);
  const scale = fit * zoom;
  const el = design.elements.find((e) => e.id === selected);
  const center = (w: number, h: number) => ({ x: Math.round((design.width - w) / 2), y: Math.round((design.height - h) / 2) });

  return (
    <>
      <nav className="mb-4 flex items-center gap-1 text-[13px] text-slate-500" aria-label="Breadcrumb">
        <Link href="/dashboard/photobooth" className="hover:text-slate-900">Photobooth</Link>
        <ChevronRight size={14} aria-hidden />
        <span className="truncate text-slate-900">{name || "Template"}</span>
      </nav>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input aria-label="Nama template" value={name} maxLength={80} onChange={(e) => { setName(e.target.value); setDirty(true); }} className="max-w-xs font-medium" />
        <Badge tone={q.data.published ? "green" : "slate"}>{q.data.published ? "Tampil" : "Disembunyikan"}</Badge>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { const w = Math.round(design.width * 0.4), h = Math.round(w * 0.75); add({ id: uid(), type: "photo", ...center(w, h), w, h, rotation: 0, radius: 0 }); }}><ScanFace size={15} aria-hidden /> Slot foto</Button>
          <Button variant="outline" onClick={() => { const fs = Math.round(design.width / 12), w = Math.round(design.width * 0.8); add({ id: uid(), type: "text", text: "Teks baru", ...center(w, fs), w, h: Math.round(fs * 1.3), rotation: 0, fontSize: fs, fontFamily: "Inter", fontStyle: "bold", color: "#0f172a", align: "center" }); }}><Type size={15} aria-hidden /> Teks</Button>
          <Button variant="outline" loading={upload.isPending} onClick={() => fileInput.current?.click()}><ImagePlus size={15} aria-hidden /> Gambar / frame</Button>
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }} />
          <Button loading={save.isPending} disabled={!dirty || name.trim().length < 2} onClick={() => save.mutate()}>{dirty ? "Simpan" : "Tersimpan"}</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-end gap-1 border-b border-slate-100 px-3 py-2">
            <span className="mr-auto text-xs text-slate-500">Ctrl + scroll untuk zoom</span>
            <Button size="icon" variant="ghost" aria-label="Perkecil" title="Perkecil" disabled={zoom <= ZOOM_MIN} onClick={() => zoomBy(1 / 1.25)}><ZoomOut size={16} /></Button>
            <span className="w-12 text-center text-xs font-medium tabular-nums text-slate-600" aria-live="polite">{Math.round(scale * 100)}%</span>
            <Button size="icon" variant="ghost" aria-label="Perbesar" title="Perbesar" disabled={zoom >= ZOOM_MAX} onClick={() => zoomBy(1.25)}><ZoomIn size={16} /></Button>
            <Button size="sm" variant="ghost" title="Pas layar" onClick={() => setZoom(1)}><Maximize size={14} aria-hidden /> Pas</Button>
          </div>
          {/* Area scroll: saat diperbesar, kanvas bisa digeser ke semua sisi (mx-auto jadi 0 saat meluap). */}
          <div ref={box} className="max-h-[calc(100dvh-220px)] overflow-auto bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:20px_20px] p-4">
            <div className="mx-auto w-max">
              <DesignStage design={design} scale={scale} selectedId={selected} onSelect={setSelected} onChange={setEl} />
            </div>
          </div>
        </Card>

        <Card className="self-start p-4">
          {el ? (
            <Inspector el={el} onChange={setEl} onDelete={() => remove(el.id)} onMove={(d) => move(el.id, d)}
              onDuplicate={() => add({ ...el, id: uid(), x: el.x + 30, y: el.y + 30 })} />
          ) : (
            <div className="grid gap-4">
              <p className="text-[13px] font-semibold">Kanvas</p>
              <p className="text-xs text-slate-500">Klik elemen untuk mengubahnya. Geser untuk memindah, tarik sudut untuk mengubah ukuran & memutar.</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Lebar (px)"><Input type="number" min={200} max={3000} value={design.width} onChange={(e) => update((d) => ({ ...d, width: Math.min(3000, Math.max(200, Number(e.target.value) || 200)) }))} /></Field>
                <Field label="Tinggi (px)"><Input type="number" min={200} max={3000} value={design.height} onChange={(e) => update((d) => ({ ...d, height: Math.min(3000, Math.max(200, Number(e.target.value) || 200)) }))} /></Field>
              </div>
              <Field label="Warna latar"><Input type="color" className="h-10 p-1" value={design.background} onChange={(e) => update((d) => ({ ...d, background: e.target.value }))} /></Field>
              <p className="text-xs text-slate-500">Tips: buat frame di Canva, ekspor PNG transparan seukuran kanvas, lalu unggah lewat <b>Gambar / frame</b> dan taruh di atas slot foto.</p>
            </div>
          )}
          <ErrorText error={save.error} />
        </Card>
      </div>
    </>
  );
}

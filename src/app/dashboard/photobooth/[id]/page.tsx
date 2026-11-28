"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, ImagePlus, ScanFace, Type } from "lucide-react";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, ErrorText, Field, Input, Skeleton } from "@/components/ui";
import { uid, type Design, type El } from "@/components/photobooth/design";
import { api, publicFile, uploadFile } from "@/lib/api";
import { Inspector } from "./_components/inspector";

const DesignStage = dynamic(() => import("@/components/photobooth/stage").then((m) => m.DesignStage), { ssr: false });

type Tpl = { id: string; name: string; design: Design; published: boolean; canEdit: boolean; canPublish: boolean };

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
    mutationFn: () => api<{ published: boolean }>(`/photobooth/${id}`, { method: "PUT", body: { name: name.trim(), design } }),
    onSuccess: (t) => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["photobooth"] });
      toast(q.data?.published && !t.published ? "Disimpan. Template disembunyikan sampai ditinjau pengurus lagi." : "Template disimpan");
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

  const scale = Math.min(boxW / design.width, (typeof window === "undefined" ? 800 : window.innerHeight - 220) / design.height);
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
        <Badge tone={q.data.published ? "green" : "slate"}>{q.data.published ? "Tampil" : "Draft"}</Badge>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { const w = Math.round(design.width * 0.4), h = Math.round(w * 0.75); add({ id: uid(), type: "photo", ...center(w, h), w, h, rotation: 0, radius: 0 }); }}><ScanFace size={15} aria-hidden /> Slot foto</Button>
          <Button variant="outline" onClick={() => { const fs = Math.round(design.width / 12), w = Math.round(design.width * 0.8); add({ id: uid(), type: "text", text: "Teks baru", ...center(w, fs), w, h: Math.round(fs * 1.3), rotation: 0, fontSize: fs, fontFamily: "Inter", fontStyle: "bold", color: "#0f172a", align: "center" }); }}><Type size={15} aria-hidden /> Teks</Button>
          <Button variant="outline" loading={upload.isPending} onClick={() => fileInput.current?.click()}><ImagePlus size={15} aria-hidden /> Gambar / frame</Button>
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }} />
          <Button loading={save.isPending} disabled={!dirty || name.trim().length < 2} onClick={() => save.mutate()}>{dirty ? "Simpan" : "Tersimpan"}</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="overflow-hidden bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:20px_20px] p-4">
          <div ref={box} className="flex justify-center">
            <DesignStage design={design} scale={scale} selectedId={selected} onSelect={setSelected} onChange={setEl} />
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

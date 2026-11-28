"use client";
import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import { Group, Image as KImage, Layer, Rect, Stage, Text, Transformer } from "react-konva";
import { publicFile } from "@/lib/api";
import { coverCrop, fontCss, type Design, type El } from "./design";

export type Photos = Record<string, CanvasImageSource & { width: number; height: number }>;

type Props = {
  design: Design;
  scale: number; // ukuran tampil / ukuran asli kanvas
  photos?: Photos; // slot id → foto hasil jepret
  activeSlot?: string; // slot yang sedang diisi (ditandai)
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onChange?: (el: El) => void;
  stageRef?: React.Ref<Konva.Stage>;
};

function useImg(url: string) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const i = new window.Image();
    i.crossOrigin = "anonymous"; // supaya kanvas tetap bisa diekspor
    i.onload = () => setImg(i);
    i.src = publicFile(url);
    return () => { i.onload = null; };
  }, [url]);
  return img;
}

function UrlImage(p: Omit<Konva.ImageConfig, "image"> & { url: string; ref?: React.Ref<Konva.Image> }) {
  const img = useImg(p.url);
  return <KImage {...p} image={img ?? undefined} />;
}

// Satu komponen untuk editor, pratinjau, dan hasil akhir supaya tampilan selalu sama persis.
export function DesignStage({ design, scale, photos, activeSlot, selectedId, onSelect, onChange, stageRef }: Props) {
  const editable = !!onChange;
  const tr = useRef<Konva.Transformer>(null);
  const nodes = useRef(new Map<string, Konva.Node>());
  const layer = useRef<Konva.Layer>(null);
  let slotNo = 0;

  useEffect(() => {
    const n = selectedId ? nodes.current.get(selectedId) : undefined;
    tr.current?.nodes(n ? [n] : []);
    tr.current?.getLayer()?.batchDraw();
  }, [selectedId, design]);

  // Font web bisa selesai dimuat setelah gambar pertama: gambar ulang.
  useEffect(() => { void document.fonts.ready.then(() => layer.current?.batchDraw()); }, []);

  const common = (e: El) => ({
    x: e.x, y: e.y, rotation: e.rotation, draggable: editable,
    ref: (n: Konva.Node | null) => { if (n) nodes.current.set(e.id, n); else nodes.current.delete(e.id); },
    onMouseDown: () => onSelect?.(e.id),
    onTap: () => onSelect?.(e.id),
    onDragEnd: (ev: Konva.KonvaEventObject<DragEvent>) => onChange?.({ ...e, x: Math.round(ev.target.x()), y: Math.round(ev.target.y()) }),
    onTransformEnd: (ev: Konva.KonvaEventObject<Event>) => {
      const n = ev.target, sx = n.scaleX(), sy = n.scaleY();
      n.scale({ x: 1, y: 1 });
      const base = { ...e, x: Math.round(n.x()), y: Math.round(n.y()), rotation: Math.round(n.rotation()), w: Math.max(4, Math.round(e.w * sx)), h: Math.max(4, Math.round(e.h * sy)) };
      // Teks: tarik sudut = perbesar huruf, tarik sisi = lebar kotak.
      onChange?.(e.type === "text" ? { ...base, fontSize: Math.max(6, Math.round(e.fontSize * (Math.abs(sx - sy) < 0.01 ? sy : 1))), h: Math.round(e.h * (Math.abs(sx - sy) < 0.01 ? sy : 1)) } as El : (base as El));
    },
  });

  return (
    <Stage ref={stageRef} width={design.width * scale} height={design.height * scale} scaleX={scale} scaleY={scale}
      onMouseDown={(ev) => { if (ev.target === ev.target.getStage()) onSelect?.(null); }}
      onTouchStart={(ev) => { if (ev.target === ev.target.getStage()) onSelect?.(null); }}>
      <Layer ref={layer}>
        <Rect width={design.width} height={design.height} fill={design.background} listening={false} />
        {design.elements.map((e) => {
          if (e.type === "photo") {
            slotNo++;
            const src = photos?.[e.id];
            return src ? (
              <KImage key={e.id} {...common(e)} image={src} width={e.w} height={e.h} cornerRadius={e.radius} crop={coverCrop(src.width, src.height, e.w, e.h)} />
            ) : (
              <Group key={e.id} {...common(e)}>
                <Rect width={e.w} height={e.h} cornerRadius={e.radius} fill={e.id === activeSlot ? "#dbe7fb" : "#e2e8f0"} stroke={e.id === activeSlot ? "#11418b" : undefined} strokeWidth={6} />
                <Text width={e.w} height={e.h} align="center" verticalAlign="middle" text={`Foto ${slotNo}`} fontSize={Math.max(14, Math.min(e.w, e.h) / 6)} fill="#64748b" fontFamily={fontCss("Inter")} />
              </Group>
            );
          }
          if (e.type === "image") return <UrlImage key={e.id} {...common(e)} url={e.url} width={e.w} height={e.h} />;
          return (
            <Text key={e.id} {...common(e)} text={e.text} width={e.w} fontSize={e.fontSize} fontFamily={fontCss(e.fontFamily)} fontStyle={e.fontStyle} fill={e.color} align={e.align} lineHeight={1.15} />
          );
        })}
        {editable && <Transformer ref={tr} rotationSnaps={[0, 90, 180, 270]} boundBoxFunc={(o, n) => (n.width < 8 || n.height < 8 ? o : n)} />}
      </Layer>
    </Stage>
  );
}

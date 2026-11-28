"use client";
import { ArrowDown, ArrowUp, Copy, Trash2 } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { FONTS, type El, type TextEl } from "@/components/photobooth/design";

type Props = { el: El; onChange: (el: El) => void; onDelete: () => void; onDuplicate: () => void; onMove: (dir: 1 | -1) => void };

const num = (v: string, min = -99999) => Math.max(min, Math.round(Number(v) || 0));

// Panel properti elemen terpilih. Nilai dalam piksel kanvas asli.
export function Inspector({ el, onChange, onDelete, onDuplicate, onMove }: Props) {
  const set = (patch: Partial<El>) => onChange({ ...el, ...patch } as El);
  const setText = (patch: Partial<TextEl>) => onChange({ ...(el as TextEl), ...patch });
  const label = { photo: "Slot foto", image: "Gambar", text: "Teks" }[el.type];

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold">{label}</p>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" aria-label="Bawa ke depan" title="Bawa ke depan" onClick={() => onMove(1)}><ArrowUp size={15} /></Button>
          <Button size="icon" variant="ghost" aria-label="Kirim ke belakang" title="Kirim ke belakang" onClick={() => onMove(-1)}><ArrowDown size={15} /></Button>
          <Button size="icon" variant="ghost" aria-label="Duplikat" title="Duplikat" onClick={onDuplicate}><Copy size={15} /></Button>
          <Button size="icon" variant="ghost" aria-label="Hapus elemen" title="Hapus (Delete)" className="text-red-600 hover:bg-red-50" onClick={onDelete}><Trash2 size={15} /></Button>
        </div>
      </div>

      {el.type === "text" && (
        <>
          <Field label="Isi teks"><Textarea rows={2} maxLength={300} value={el.text} onChange={(e) => setText({ text: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Font">
              <Select value={el.fontFamily} onChange={(e) => setText({ fontFamily: e.target.value as TextEl["fontFamily"] })}>{FONTS.map((f) => <option key={f}>{f}</option>)}</Select>
            </Field>
            <Field label="Ukuran"><Input type="number" min={6} max={600} value={el.fontSize} onChange={(e) => setText({ fontSize: num(e.target.value, 6) })} /></Field>
            <Field label="Gaya">
              <Select value={el.fontStyle} onChange={(e) => setText({ fontStyle: e.target.value as TextEl["fontStyle"] })}>
                <option value="normal">Normal</option><option value="bold">Tebal</option><option value="italic">Miring</option><option value="italic bold">Tebal miring</option>
              </Select>
            </Field>
            <Field label="Rata">
              <Select value={el.align} onChange={(e) => setText({ align: e.target.value as TextEl["align"] })}>
                <option value="left">Kiri</option><option value="center">Tengah</option><option value="right">Kanan</option>
              </Select>
            </Field>
          </div>
          <Field label="Warna"><Input type="color" className="h-10 p-1" value={el.color} onChange={(e) => setText({ color: e.target.value })} /></Field>
        </>
      )}

      {el.type === "photo" && (
        <Field label="Sudut membulat" hint="0 = kotak"><Input type="number" min={0} max={1000} value={el.radius} onChange={(e) => set({ radius: num(e.target.value, 0) })} /></Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="X"><Input type="number" value={el.x} onChange={(e) => set({ x: num(e.target.value) })} /></Field>
        <Field label="Y"><Input type="number" value={el.y} onChange={(e) => set({ y: num(e.target.value) })} /></Field>
        <Field label="Lebar"><Input type="number" min={4} value={el.w} onChange={(e) => set({ w: num(e.target.value, 4) })} /></Field>
        {el.type !== "text" && <Field label="Tinggi"><Input type="number" min={4} value={el.h} onChange={(e) => set({ h: num(e.target.value, 4) })} /></Field>}
        <Field label="Rotasi (°)"><Input type="number" min={-360} max={360} value={el.rotation} onChange={(e) => set({ rotation: num(e.target.value, -360) })} /></Field>
      </div>
    </div>
  );
}

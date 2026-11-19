"use client";
import { ArrowDown, ArrowUp, Trash2, X } from "lucide-react";
import { Card, cx, Input, Select } from "@/components/ui";
import { hasOptions, QTYPES, type Question, type QType } from "@/lib/forms";

// Editor satu pertanyaan (teks, jenis, keterangan, opsi, wajib). Dipakai editor Form dan Slot.
export function QuestionEditor({ q, first, last, onChange, onMove, onDelete }: { q: Question; first: boolean; last: boolean; onChange: (p: Partial<Question>) => void; onMove: (d: number) => void; onDelete: () => void }) {
  const opts = q.options ?? [];
  const setType = (type: QType) => onChange({ type, options: hasOptions(type) ? (opts.length ? opts : ["Opsi 1"]) : undefined });
  const iconBtn = "rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30";
  return (
    <Card className="grid gap-3 p-4 focus-within:border-l-4 focus-within:border-l-primary">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={q.label} onChange={(e) => onChange({ label: e.target.value })} maxLength={300} placeholder="Teks pertanyaan" aria-label="Teks pertanyaan" className="flex-1 font-medium" />
        <Select value={q.type} onChange={(e) => setType(e.target.value as QType)} aria-label="Jenis pertanyaan" className="sm:w-48">
          {QTYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
      </div>
      <Input value={q.help ?? ""} onChange={(e) => onChange({ help: e.target.value || null })} maxLength={500} placeholder="Keterangan tambahan (opsional)" aria-label="Keterangan" className="h-8 text-[13px]" />
      {hasOptions(q.type) && (
        <div className="grid gap-1.5">
          {opts.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={cx("size-4 shrink-0 border border-slate-300", q.type === "CHECKBOX" ? "rounded" : q.type === "CHOICE" ? "rounded-full" : "rounded-sm border-transparent text-center text-xs text-slate-400")} aria-hidden>{q.type === "DROPDOWN" ? i + 1 : ""}</span>
              <Input value={o} onChange={(e) => onChange({ options: opts.map((x, j) => (j === i ? e.target.value : x)) })} maxLength={200} aria-label={`Opsi ${i + 1}`} className="h-8 flex-1 text-[13px]" />
              <button type="button" onClick={() => onChange({ options: opts.filter((_, j) => j !== i) })} disabled={opts.length <= 1} className={iconBtn} aria-label={`Hapus opsi ${i + 1}`}><X size={14} /></button>
            </div>
          ))}
          {opts.length < 50 && <button type="button" onClick={() => onChange({ options: [...opts, `Opsi ${opts.length + 1}`] })} className="justify-self-start rounded-md px-2 py-1 text-[13px] text-primary hover:bg-primary/5">+ Tambah opsi</button>}
        </div>
      )}
      <div className="flex items-center gap-1 border-t border-slate-100 pt-2">
        <button type="button" onClick={() => onMove(-1)} disabled={first} className={iconBtn} aria-label="Naikkan"><ArrowUp size={15} /></button>
        <button type="button" onClick={() => onMove(1)} disabled={last} className={iconBtn} aria-label="Turunkan"><ArrowDown size={15} /></button>
        <button type="button" onClick={onDelete} disabled={first && last} className={cx(iconBtn, "hover:text-red-600")} aria-label="Hapus pertanyaan"><Trash2 size={15} /></button>
        <label className="ml-auto flex items-center gap-2 text-[13px] text-slate-600"><input type="checkbox" checked={q.required} onChange={(e) => onChange({ required: e.target.checked })} className="size-4 accent-[var(--primary)]" /> Wajib</label>
      </div>
    </Card>
  );
}

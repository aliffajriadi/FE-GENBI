"use client";
import { useId, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button, Input } from "@/components/ui";

// Isian tag: Enter, koma, atau tombol untuk menambah. Nama yang sama dengan saran memakai ejaan saran.
export function TagInput({ value, onChange, max, suggestions, placeholder, label }: {
  value: string[]; onChange: (v: string[]) => void; max: number; suggestions: string[]; placeholder: string; label: string;
}) {
  const [text, setText] = useState("");
  const listId = useId();
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  const add = () => {
    const next = [...value];
    for (const raw of text.split(",")) {
      const t = raw.trim().replace(/\s+/g, " ");
      if (t && next.length < max && !next.some((x) => same(x, t))) next.push(suggestions.find((x) => same(x, t)) ?? t);
    }
    setText("");
    if (next.length !== value.length) onChange(next);
  };
  return (
    <div className="grid gap-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((t) => (
            <li key={t} className="inline-flex items-center gap-1 rounded-md bg-slate-100 py-1 pr-1 pl-2.5 text-[13px] text-slate-700">
              {t}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} className="rounded p-0.5 text-slate-400 hover:text-red-600" aria-label={`Hapus ${t}`}><X size={13} /></button>
            </li>
          ))}
        </ul>
      )}
      {value.length < max && (
        <div className="flex gap-2">
          <Input value={text} list={listId} maxLength={40} placeholder={placeholder} aria-label={label} className="flex-1"
            onChange={(e) => setText(e.target.value)} onBlur={add}
            onKeyDown={(e) => { if ((e.key === "Enter" && text.trim()) || e.key === ",") { e.preventDefault(); add(); } }} />
          <Button type="button" variant="outline" onClick={add} aria-label={`Tambah: ${label}`}><Plus size={15} aria-hidden /></Button>
          <datalist id={listId}>{suggestions.filter((s) => !value.some((x) => same(x, s))).map((s) => <option key={s} value={s} />)}</datalist>
        </div>
      )}
    </div>
  );
}

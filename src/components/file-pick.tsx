"use client";
import { Upload } from "lucide-react";

export function FilePick({ file, onChange, accept, label }: { file: File | null; onChange: (f: File | null) => void; accept: string; label: string }) {
  return (
    <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center hover:border-slate-300">
      <input type="file" accept={accept} className="sr-only" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      <Upload size={20} className="text-slate-400" aria-hidden />
      {file ? (
        <span className="text-[13px] font-medium text-slate-900">{file.name} <span className="font-normal text-slate-500">· {(file.size / 1024).toFixed(0)} KB</span></span>
      ) : (
        <span className="text-[13px] text-slate-500">{label}</span>
      )}
      <span className="text-xs font-medium text-primary">{file ? "Ganti file" : "Pilih file"}</span>
    </label>
  );
}

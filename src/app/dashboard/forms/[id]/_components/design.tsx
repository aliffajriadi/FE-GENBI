"use client";
import { useEffect, useState } from "react";
import { Check, ImagePlus, X } from "lucide-react";
import { DEFAULT_THEME, FormShell, PRESETS, QuestionList, type FormTheme } from "@/components/form-view";
import { useToast } from "@/components/toast";
import { Button, Card, cx, Field } from "@/components/ui";
import { uploadFile } from "@/lib/api";
import { type Answer } from "@/lib/forms";
import { type Draft } from "../_lib";

// Tab Tampilan: preset ala Google Form / Tally, lalu atur warna, font, sudut & gambar header. Pratinjau langsung di kanan.
export function Design({ draft, onTheme }: { draft: Draft; onTheme: (t: FormTheme) => void }) {
  const toast = useToast();
  const t = { ...DEFAULT_THEME, ...draft.theme };
  const set = (p: Partial<FormTheme>) => onTheme({ ...t, ...p });
  const [uploading, setUploading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try { set({ coverUrl: (await uploadFile(file, { public: true })).url }); } catch (e) { toast((e as Error).message, { error: true }); } finally { setUploading(false); }
  };
  const seg = (on: boolean) => cx("h-8 flex-1 rounded-md px-2 text-[13px] font-medium transition", on ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900");
  const Seg = <K extends keyof FormTheme>({ k, items }: { k: K; items: [FormTheme[K], string][] }) => (
    <div className="flex rounded-lg bg-slate-100 p-1">{items.map(([v, label]) => <button key={String(v)} type="button" onClick={() => set({ [k]: v } as Partial<FormTheme>)} className={seg(t[k] === v)} aria-pressed={t[k] === v}>{label}</button>)}</div>
  );

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="grid gap-5 p-4 lg:sticky lg:top-4">
        <div>
          <p className="mb-2 text-[13px] font-medium text-slate-700">Tema siap pakai</p>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => {
              const active = p.theme.accent === t.accent && p.theme.background === t.background && p.theme.style === t.style;
              return (
                <button key={p.name} type="button" onClick={() => set(p.theme)} className={cx("relative overflow-hidden rounded-lg border text-left transition", active ? "border-primary ring-2 ring-primary/20" : "border-slate-200 hover:border-slate-300")}>
                  <span className="flex h-12 flex-col justify-end gap-1 p-1.5" style={{ background: p.theme.background }}>
                    <span className="h-1.5 w-8 rounded-full" style={{ background: p.theme.accent }} />
                    <span className={cx("h-3 w-full", p.theme.style === "classic" ? "rounded-sm bg-white" : "rounded-sm border")} style={p.theme.style === "minimal" ? { borderColor: p.theme.accent + "55" } : undefined} />
                  </span>
                  <span className="block px-1.5 py-1 text-[11.5px] font-medium text-slate-700">{p.name}</span>
                  {active && <Check size={12} className="absolute top-1 right-1 rounded-full bg-primary p-0.5 text-white" aria-hidden />}
                </button>
              );
            })}
          </div>
        </div>
        <Field label="Gaya"><Seg k="style" items={[["classic", "Google Form"], ["minimal", "Tally"]]} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <ColorField label="Warna aksen" value={t.accent} onChange={(accent) => set({ accent })} />
          <ColorField label="Latar" value={t.background} onChange={(background) => set({ background })} />
        </div>
        <Field label="Font"><Seg k="font" items={[["sans", "Sans"], ["serif", "Serif"], ["mono", "Mono"]]} /></Field>
        <Field label="Sudut tombol & kotak"><Seg k="radius" items={[["sharp", "Tajam"], ["rounded", "Bulat"], ["pill", "Kapsul"]]} /></Field>
        <Field label="Gambar header" hint="JPG/PNG/WEBP, maks 2 MB. Ideal lebar ±1600px.">
          {t.coverUrl ? (
            <div className="flex items-center gap-2">
              <span className="truncate text-xs text-slate-500">{t.coverUrl.split("/").pop()}</span>
              <Button variant="ghost" size="sm" onClick={() => set({ coverUrl: null })}><X size={13} aria-hidden /> Hapus</Button>
            </div>
          ) : (
            <label className={cx("flex h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-200 text-[13px] text-slate-500 hover:border-slate-300 hover:text-slate-800", uploading && "pointer-events-none opacity-60")}>
              <ImagePlus size={18} aria-hidden />{uploading ? "Mengunggah…" : "Pilih gambar"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
            </label>
          )}
        </Field>
        <label className="flex items-center gap-2 text-[13.5px] text-slate-700"><input type="checkbox" checked={t.showLogo} onChange={(e) => set({ showLogo: e.target.checked })} className="size-4 accent-[var(--primary)]" /> Tampilkan logo MyGenBI</label>
        <p className="text-xs text-slate-400">Klik <b className="font-medium text-slate-600">Simpan</b> di atas untuk menerapkan.</p>
      </Card>

      {/* Pratinjau: komponen yang sama dengan halaman isi, jadi hasilnya persis. */}
      <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-3 py-2">
          {["bg-red-300", "bg-amber-300", "bg-green-300"].map((c) => <span key={c} className={cx("size-2.5 rounded-full", c)} aria-hidden />)}
          <span className="ml-2 truncate text-xs text-slate-400">Pratinjau · /f/{draft.slug}</span>
        </div>
        <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto">
          <FormShell form={{ title: draft.title, description: draft.description, theme: t }} preview>
            <QuestionList questions={draft.questions} answers={answers} onAnswer={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))} minimal={t.style === "minimal"} />
          </FormShell>
        </div>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <Field label={label}>
      <div className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white pr-2 pl-1">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label} (pemilih warna)`} className="size-7 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" />
        <input value={text} maxLength={7} aria-label={`${label} (hex)`} className="w-full min-w-0 font-mono text-xs uppercase outline-none"
          onChange={(e) => { const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`; setText(v); if (/^#[0-9a-f]{6}$/i.test(v)) onChange(v.toLowerCase()); }} />
      </div>
    </Field>
  );
}

"use client";
import { useRef, useState } from "react";
import { type Editor } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import {
    Bold, Code2, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Loader2, Minus, Plus,
    Quote, X
} from "lucide-react";
import { cx } from "@/components/ui";
import { publicFile, uploadFile } from "@/lib/api";

export function EditorMenus({ editor, onError }: { editor: Editor; onError: (m: string) => void }) {
  const [linking, setLinking] = useState(false);
  const [href, setHref] = useState("");
  const [plus, setPlus] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const b = "grid size-8 place-items-center rounded-md transition";
  const tool = (active: boolean) => cx(b, active ? "text-white" : "text-slate-300 hover:text-white");

  const addImage = async (f: File) => {
    try {
      const up = await uploadFile(f, { public: true });
      editor.chain().focus().setImage({ src: publicFile(up.url), alt: f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") }).run();
    } catch (e) { onError((e as Error).message); }
  };

  return (
    <>
      {/* Menu saat teks dipilih: gelap & ringkas seperti Medium */}
      <BubbleMenu editor={editor} options={{ placement: "top", offset: 8 }} shouldShow={({ editor: ed, from, to }) => from !== to && !ed.isActive("image")}
        className="theme-light flex items-center gap-0.5 rounded-lg bg-slate-900 p-1 shadow-lg">
        {linking ? (
          <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); if (href) editor.chain().focus().extendMarkRange("link").setLink({ href }).run(); else editor.chain().focus().unsetLink().run(); setLinking(false); }}>
            <input autoFocus value={href} onChange={(e) => setHref(e.target.value)} placeholder="Tempel tautan, lalu Enter" aria-label="Alamat tautan"
              className="h-8 w-60 bg-transparent px-2 text-[13px] text-white outline-none placeholder:text-slate-400" onKeyDown={(e) => e.key === "Escape" && setLinking(false)} />
            <button type="button" onClick={() => setLinking(false)} className={tool(false)} aria-label="Batal"><X size={15} /></button>
          </form>
        ) : (
          <>
            <button onClick={() => editor.chain().focus().toggleBold().run()} className={tool(editor.isActive("bold"))} aria-label="Tebal" aria-pressed={editor.isActive("bold")}><Bold size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={tool(editor.isActive("italic"))} aria-label="Miring" aria-pressed={editor.isActive("italic")}><Italic size={16} /></button>
            <button onClick={() => { setHref(editor.getAttributes("link").href ?? ""); setLinking(true); }} className={tool(editor.isActive("link"))} aria-label="Tautan"><Link2 size={16} /></button>
            <span className="mx-1 h-5 w-px bg-slate-700" aria-hidden />
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={tool(editor.isActive("heading", { level: 2 }))} aria-label="Judul besar"><Heading2 size={17} /></button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={tool(editor.isActive("heading", { level: 3 }))} aria-label="Judul kecil"><Heading3 size={17} /></button>
            <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={tool(editor.isActive("blockquote"))} aria-label="Kutipan"><Quote size={16} /></button>
          </>
        )}
      </BubbleMenu>

      {/* Tombol + di baris kosong untuk menyisipkan blok, seperti kartu Ghost */}
      <FloatingMenu editor={editor} options={{ placement: "left", offset: 14 }} className="flex items-center gap-1">
        <button onClick={() => setPlus((p) => !p)} aria-label="Sisipkan blok" aria-expanded={plus}
          className={cx("grid size-8 place-items-center rounded-full border border-slate-300 bg-white text-slate-500 transition hover:border-slate-500 hover:text-slate-900", plus && "rotate-45")}>
          <Plus size={16} />
        </button>
        {plus && (
          <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1 shadow-lg" onClick={() => setPlus(false)}>
            {[
              { icon: ImagePlus, label: "Gambar", fn: () => file.current?.click() },
              { icon: Heading2, label: "Subjudul", fn: () => editor.chain().focus().setHeading({ level: 2 }).run() },
              { icon: Quote, label: "Kutipan", fn: () => editor.chain().focus().setBlockquote().run() },
              { icon: List, label: "Daftar", fn: () => editor.chain().focus().toggleBulletList().run() },
              { icon: ListOrdered, label: "Daftar bernomor", fn: () => editor.chain().focus().toggleOrderedList().run() },
              { icon: Code2, label: "Kode", fn: () => editor.chain().focus().setCodeBlock().run() },
              { icon: Minus, label: "Pembatas", fn: () => editor.chain().focus().setHorizontalRule().run() },
            ].map(({ icon: Icon, label, fn }) => (
              <button key={label} onClick={fn} title={label} aria-label={label} className="grid size-8 place-items-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900"><Icon size={16} /></button>
            ))}
          </div>
        )}
      </FloatingMenu>
      <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) addImage(f); e.target.value = ""; }} />
    </>
  );
}

export function CoverPicker({ label, onPick, onError, ghost }: { label: string; onPick: (url: string) => void; onError: (m: string) => void; ghost?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <label className={cx("inline-flex cursor-pointer items-center gap-1.5 text-[13px]", ghost ? "rounded-md px-2 py-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700" : "rounded-md bg-white/95 px-2.5 py-1.5 text-slate-700 shadow-sm")}>
      {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <ImagePlus size={14} aria-hidden />} {label}
      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setBusy(true);
        try { onPick((await uploadFile(f, { public: true })).url); } catch (err) { onError((err as Error).message); } finally { setBusy(false); }
      }} />
    </label>
  );
}

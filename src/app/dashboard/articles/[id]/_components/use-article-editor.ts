import { useRef } from "react";
import { useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { publicFile, uploadFile } from "@/lib/api";

// ───── Editor Tiptap (isi tetap disimpan sebagai Markdown) ─────

export function useArticleEditor(initial: string, editable: boolean, onChange: (md: string) => void, onError: (m: string) => void) {
  const ref = useRef<Editor | null>(null);
  const insertImages = (files: File[]) => {
    for (const f of files.filter((x) => x.type.startsWith("image/"))) {
      uploadFile(f, { public: true })
        .then((up) => ref.current?.chain().focus().setImage({ src: publicFile(up.url), alt: f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") }).run())
        .catch((e) => onError(e.message));
    }
  };
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, underline: false, link: { openOnClick: false, autolink: true, defaultProtocol: "https" } }),
      Image,
      Placeholder.configure({ placeholder: "Ceritakan kisahmu…" }),
      Markdown,
    ],
    content: initial,
    contentType: "markdown",
    editorProps: {
      attributes: { class: "story min-h-[40vh]", "aria-label": "Isi artikel" },
      // Tempel atau seret gambar langsung ke kanvas.
      handlePaste: (_v, e) => { const files = [...(e.clipboardData?.files ?? [])]; if (!files.some((f) => f.type.startsWith("image/"))) return false; insertImages(files); return true; },
      handleDrop: (_v, e) => { const files = [...((e as DragEvent).dataTransfer?.files ?? [])]; if (!files.some((f) => f.type.startsWith("image/"))) return false; e.preventDefault(); insertImages(files); return true; },
    },
    onUpdate: ({ editor: ed }) => onChange(ed.getMarkdown()),
  });
  ref.current = editor;
  return editor;
}

// Tipe & helper desain photobooth (sama dengan backend/src/shared/photobooth.ts).
export type Box = { id: string; x: number; y: number; w: number; h: number; rotation: number };
export type PhotoEl = Box & { type: "photo"; radius: number };
export type ImageEl = Box & { type: "image"; url: string };
export type TextEl = Box & {
  type: "text"; text: string; fontSize: number; fontFamily: Font; fontStyle: "normal" | "bold" | "italic" | "italic bold";
  color: string; align: "left" | "center" | "right";
};
export type El = PhotoEl | ImageEl | TextEl;
export type Design = { width: number; height: number; background: string; elements: El[] };
export type Template = { id: string; name: string; design: Design };

export const FONTS = ["Inter", "Newsreader", "Arial", "Georgia", "Courier New", "Impact"] as const;
export type Font = (typeof FONTS)[number];

// Inter & Newsreader dimuat next/font dengan nama acak; ambil nama aslinya dari variabel CSS.
export function fontCss(f: Font) {
  if (typeof document === "undefined" || (f !== "Inter" && f !== "Newsreader")) return f;
  return getComputedStyle(document.documentElement).getPropertyValue(f === "Inter" ? "--font-ui" : "--font-reading").trim() || f;
}

export const uid = () => Math.random().toString(36).slice(2, 10);

const slot = (x: number, y: number, w: number, h: number): PhotoEl => ({ id: uid(), type: "photo", x, y, w, h, rotation: 0, radius: 0 });
const caption = (y: number, width: number, size: number): TextEl => ({
  id: uid(), type: "text", text: "GenBI", x: 0, y, w: width, h: size * 1.3, rotation: 0, fontSize: size, fontFamily: "Newsreader", fontStyle: "bold", color: "#11418b", align: "center",
});

// Titik awal yang umum di photobooth; semua bisa diubah di editor.
export const PRESETS: { key: string; label: string; make: () => Design }[] = [
  { key: "strip", label: "Strip 4 foto (2×6 in)", make: () => ({ width: 600, height: 1800, background: "#ffffff", elements: [...[0, 1, 2, 3].map((i) => slot(40, 40 + i * 390, 520, 360)), caption(1620, 600, 110)] }) },
  { key: "grid", label: "4R 2×2 foto (4×6 in)", make: () => ({ width: 1200, height: 1800, background: "#ffffff", elements: [...[0, 1, 2, 3].map((i) => slot(50 + (i % 2) * 560, 50 + Math.floor(i / 2) * 700, 540, 680)), caption(1500, 1200, 140)] }) },
  { key: "single", label: "1 foto (4×6 in)", make: () => ({ width: 1200, height: 1800, background: "#ffffff", elements: [slot(60, 60, 1080, 1440), caption(1560, 1200, 150)] }) },
  { key: "square", label: "Persegi (Instagram)", make: () => ({ width: 1080, height: 1080, background: "#ffffff", elements: [slot(60, 60, 960, 820), caption(910, 1080, 110)] }) },
];

export const photoSlots = (d: Design) => d.elements.filter((e): e is PhotoEl => e.type === "photo");

// Potong sumber (foto) seperti object-fit: cover ke ukuran slot.
export function coverCrop(sw: number, sh: number, w: number, h: number) {
  const s = Math.max(w / sw, h / sh);
  const cw = w / s, ch = h / s;
  return { x: (sw - cw) / 2, y: (sh - ch) / 2, width: cw, height: ch };
}

// Tipe & helper form (selaras dengan BE-GENBI/src/shared: FORM_QUESTION_TYPES, formSchema).
export type QType = "SHORT" | "PARAGRAPH" | "CHOICE" | "CHECKBOX" | "DROPDOWN" | "DATE" | "NUMBER";
export type Question = { id: string; type: QType; label: string; help?: string | null; required: boolean; options?: string[] };
export type Answer = string | string[];

export const QTYPES: { value: QType; label: string }[] = [
  { value: "SHORT", label: "Jawaban singkat" },
  { value: "PARAGRAPH", label: "Paragraf" },
  { value: "CHOICE", label: "Pilihan ganda" },
  { value: "CHECKBOX", label: "Kotak centang" },
  { value: "DROPDOWN", label: "Dropdown" },
  { value: "DATE", label: "Tanggal" },
  { value: "NUMBER", label: "Angka" },
];
export const hasOptions = (t: QType) => t === "CHOICE" || t === "CHECKBOX" || t === "DROPDOWN";
export const rid = () => crypto.randomUUID().slice(0, 8);

// CSV untuk Excel: BOM + tanda kutip; awalan ' mencegah formula injection dari jawaban publik (=, +, -, @).
const cell = (v: string) => `"${(/^[=+\-@\t\r]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;
export function toCsv(rows: string[][]) {
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
}
export function download(name: string, text: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
export const answerText = (a: Answer | undefined) => (Array.isArray(a) ? a.join(", ") : (a ?? ""));


export type Column = { id: string; name: string; position: number; isDone: boolean };
export type ChecklistItem = { id: string; text: string; done: boolean };
type Person = { id: string; name: string; avatarUrl: string | null };
export type Card = {
  id: string; columnId: string; title: string; description: string | null; assignees: Person[];
  dueDate: string | null; checklist: ChecklistItem[] | null; priority: Priority; position: number; createdById: string; _count?: { comments: number };
};
export type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type Comment = { id: string; body: string; createdAt: string; updatedAt: string; author: Person };
export type Note = { id: string; title: string; url: string | null; body: string | null; pinned: boolean; createdById: string; updatedAt: string; createdBy: Person };
export type Board = { division: { id: string; name: string }; columns: Column[]; cards: Card[]; members: Person[]; notes: Note[]; canEdit: boolean; canManage: boolean };

export const dayFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });
const monthFmt = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" });
export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
export const shiftMonth = (key: string, n: number) => { const [y, m] = key.split("-").map(Number); return monthKey(new Date(y, m - 1 + n, 1)); };
export const monthLabel = (key: string) => { const [y, m] = key.split("-").map(Number); return monthFmt.format(new Date(y, m - 1, 1)); };
// Aksen warna kolom (berdasarkan urutan); kolom selesai selalu hijau.
const ACCENT = ["bg-slate-400", "bg-blue-500", "bg-amber-500", "bg-violet-500", "bg-sky-500", "bg-rose-400"];
export const accentOf = (col: Column, i: number) => (col.isDone ? "bg-green-500" : ACCENT[i % ACCENT.length]);
// Sisa hari ke tenggat dalam kata-kata.
export function dueText(iso: string) {
  const days = Math.round((new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 864e5);
  if (days === 0) return "hari ini";
  if (days === 1) return "besok";
  if (days < 0) return `telat ${-days} hari`;
  return days <= 7 ? `${days} hari lagi` : dayFmt.format(new Date(iso));
}
export const PRIORITY: Record<Priority, { label: string; cls: string }> = {
  LOW: { label: "Rendah", cls: "bg-slate-100 text-slate-600" },
  NORMAL: { label: "Normal", cls: "bg-slate-100 text-slate-600" },
  HIGH: { label: "Tinggi", cls: "bg-amber-50 text-amber-700" },
  URGENT: { label: "Mendesak", cls: "bg-red-50 text-red-700" },
};
export const timeFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export const isOverdue = (c: Card, done: boolean) => !!c.dueDate && !done && new Date(c.dueDate) < new Date(new Date().toDateString());

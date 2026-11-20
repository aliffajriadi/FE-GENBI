import { type Answer, type Question } from "@/lib/forms";
import { type SlotPerson } from "@/lib/slots";

export type Entry = { id: string; createdAt: string; answers: Record<string, Answer> | null; user: SlotPerson };
type Group = { id: string; name: string; description: string | null; capacity: number | null; entries: Entry[] };
export type List = { id: string; slug: string; title: string; description: string | null; optionNoun: string; joinLabel: string; questions: Question[] | null; isOpen: boolean; closesAt: string | null; groups: Group[] };
// Draf pilihan: id kosong = pilihan baru (key lokal untuk React).
export type DraftGroup = { id?: string; key: string; name: string; description: string | null; capacity: number | null };
export type Draft = Omit<List, "id" | "groups" | "questions"> & { questions: Question[]; groups: DraftGroup[] };

export const timeFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export const pick = (l: List): Draft => ({
  slug: l.slug, title: l.title, description: l.description, optionNoun: l.optionNoun, joinLabel: l.joinLabel, questions: l.questions ?? [], isOpen: l.isOpen, closesAt: l.closesAt,
  groups: l.groups.map((g) => ({ id: g.id, key: g.id, name: g.name, description: g.description, capacity: g.capacity })),
});
// Saran pertanyaan cepat di tab Pertanyaan.
export const QUICK_QUESTIONS: Omit<Question, "id">[] = [
  { type: "SHORT", label: "No. WhatsApp", required: true },
  { type: "PARAGRAPH", label: "Alasan ikut", required: true },
  { type: "SHORT", label: "Catatan", required: false },
  { type: "DROPDOWN", label: "Ukuran baju", required: true, options: ["S", "M", "L", "XL"] },
];

import { type FormTheme } from "@/components/form-view";
import { type Answer, type Question } from "@/lib/forms";

export type Form = {
  id: string; slug: string; title: string; description: string | null; questions: Question[]; audience: "PUBLIC" | "MEMBERS";
  isOpen: boolean; closesAt: string | null; onePerUser: boolean; theme: FormTheme | null; _count: { responses: number };
};
export type Draft = Omit<Form, "id" | "_count">;
export type Resp = { id: string; createdAt: string; answers: Record<string, Answer>; user: { name: string; email: string | null } | null };

export const timeFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
// <input type="datetime-local"> butuh waktu lokal tanpa zona.
export const pick = (f: Form): Draft => ({ slug: f.slug, title: f.title, description: f.description, questions: f.questions, audience: f.audience, isOpen: f.isOpen, closesAt: f.closesAt, onePerUser: f.onePerUser, theme: f.theme });

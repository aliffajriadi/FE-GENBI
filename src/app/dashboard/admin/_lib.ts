
export type UserLite = { id: string; name: string };

export const dayShort = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
// Sisa hari ke tenggat dalam kata-kata.
export function dueText(iso: string) {
  const days = Math.round((new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 864e5);
  if (days === 0) return "hari ini";
  if (days === 1) return "besok";
  if (days < 0) return `telat ${-days} hari`;
  return days <= 7 ? `${days} hari lagi` : dayShort(iso);
}

// ───── Tugas (action item) ─────

export type Task = { id: string; title: string; dueDate: string | null; done: boolean; pic: UserLite; minute: { id: string; event: { title: string; startAt: string } } };

// ───── Notulen ─────

export type Minute = { id: string; content: string; decisions: string | null; createdAt: string; event: { id: string; title: string; startAt: string; location: string | null }; actionItems: { id: string; title: string; done: boolean; dueDate: string | null; pic: UserLite }[] };

// ───── Surat ─────

export type Letter = { id: string; direction: "IN" | "OUT"; number: string | null; subject: string; counterparty: string; date: string; fileUrl: string | null; status: string; dispositions: { id: string; note: string | null; toUser: { name: string } | null; toDivision: { name: string } | null }[] };

// ───── Arsip dokumen ─────

export type Doc = { id: string; title: string; category: string; fileUrl: string; visibility: "PENGURUS" | "SEMUA"; createdAt: string; period: { name: string } | null };

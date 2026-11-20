import { useMe } from "@/lib/use-me";

export const TABS = ["summary", "verify", "bills", "cash", "settings"] as const;
export type Tab = (typeof TABS)[number];

// Kas yang bisa dikelola/dipantau user ini: kas organisasi (Bendahara & pengurus inti) dan/atau kas divisinya (Kadiv & anggota berakses "Kas divisi").
// "org" = kas organisasi; selain itu id divisi. Dikirim ke API sebagai ?kas=.
export type KasOption = { value: string; label: string; manage: boolean };
export const withKas = (path: string, kas: string) => (kas === "org" ? path : `${path}${path.includes("?") ? "&" : "?"}kas=${kas}`);
export const OPEN_STATUS = ["UNPAID", "REJECTED", "OVERDUE"];

// ───────────── Anggota: tagihan & bayar ─────────────

export function useKasLabel() {
  const { data: me } = useMe();
  return (t?: string | null) => (t ? `Kas ${me?.division?.id === t ? me.division.name : "divisi"}` : "Kas organisasi");
}

export type Cash = { id: string; type: "IN" | "OUT"; category: string; amount: number; date: string; description: string | null; attachmentUrl: string | null; refType: string | null };

export type Plan = { id: string; name: string; amount: number; frequency: "MONTHLY" | "SEMESTER" | "ONCE"; dueDay: number | null; dueDate: string | null; scope: string; isActive: boolean; division: { name: string } | null; bills: { total: number; paid: number; pending: number; overdue: number } };
export const FREQ = { MONTHLY: "Bulanan", SEMESTER: "Per semester", ONCE: "Sekali bayar" };

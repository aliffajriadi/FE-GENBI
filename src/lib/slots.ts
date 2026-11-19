import type { Question } from "./forms";

// Tipe & helper Slot (selaras dengan BE-GENBI/src/modules/slots): kelompok, undangan/RSVP, sesi, dll.
export type SlotPerson = { id: string; name: string; avatarUrl: string | null };
export type SlotGroupView = { id: string; name: string; description: string | null; capacity: number | null; members: SlotPerson[] };
type GroupSeed = { name: string; description?: string; capacity: number | null };
export type SlotTemplate = { key: string; name: string; desc: string; emoji: string; title: string; optionNoun: string; joinLabel: string; groups: GroupSeed[]; questions: Question[] };

const qid = () => crypto.randomUUID().slice(0, 8);
// Titik awal saat membuat list; semuanya bisa diubah lagi di editor.
export const SLOT_TEMPLATES: () => SlotTemplate[] = () => [
  { key: "group", emoji: "👥", name: "Pembagian kelompok", desc: "Tim lomba, kelompok diskusi, divisi kepanitiaan", title: "Pembagian kelompok", optionNoun: "Kelompok", joinLabel: "Gabung",
    groups: [{ name: "Kelompok A", capacity: 5 }, { name: "Kelompok B", capacity: 5 }], questions: [] },
  { key: "rsvp", emoji: "💌", name: "Undangan (RSVP)", desc: "Konfirmasi kehadiran acara, rapat, buka bersama", title: "Konfirmasi kehadiran", optionNoun: "Kehadiran", joinLabel: "Pilih",
    groups: [{ name: "Hadir", capacity: null }, { name: "Mungkin", capacity: null }, { name: "Tidak hadir", capacity: null }],
    questions: [{ id: qid(), type: "SHORT", label: "Catatan untuk panitia", required: false }] },
  { key: "session", emoji: "🗓️", name: "Sesi / kuota", desc: "Jadwal piket, sesi workshop, kuota peserta", title: "Pendaftaran sesi", optionNoun: "Sesi", joinLabel: "Daftar",
    groups: [{ name: "Sesi 1", description: "09.00–11.00", capacity: 20 }, { name: "Sesi 2", description: "13.00–15.00", capacity: 20 }],
    questions: [{ id: qid(), type: "SHORT", label: "No. WhatsApp", required: true }] },
  { key: "blank", emoji: "✨", name: "Kosong", desc: "Mulai dari nol dan atur sendiri", title: "List tanpa judul", optionNoun: "Pilihan", joinLabel: "Pilih",
    groups: [{ name: "Pilihan 1", capacity: null }], questions: [] },
];

// Teks siap tempel ke grup WA (hanya di halaman pembuat): per pilihan, nomor terisi (+ kosong bila berkuota), lalu link.
export function slotWaText(title: string, groups: SlotGroupView[], url: string) {
  const parts = groups.map((g) => {
    const n = g.capacity != null ? Math.min(Math.max(g.capacity, g.members.length), 50) : g.members.length;
    const rows = Array.from({ length: n }, (_, i) => `${i + 1}. ${g.members[i]?.name ?? ""}`.trimEnd());
    const head = g.capacity != null ? `*${g.name}* (${g.members.length}/${g.capacity})${g.members.length >= g.capacity ? " PENUH" : ""}` : `*${g.name}* (${g.members.length})`;
    return [head, ...(rows.length ? rows : ["-"])].join("\n");
  });
  return [`*${title}*`, "", parts.join("\n\n"), "", "Isi di sini:", url].join("\n");
}

// Warna aksen bergiliran per pilihan supaya kartu mudah dibedakan.
export const GROUP_TONES = [
  { bar: "bg-blue-500", soft: "bg-blue-50 text-blue-700", ring: "ring-blue-500", hex: "#3b82f6", grad: "from-blue-500/15 via-blue-500/5" },
  { bar: "bg-amber-500", soft: "bg-amber-50 text-amber-700", ring: "ring-amber-500", hex: "#f59e0b", grad: "from-amber-500/15 via-amber-500/5" },
  { bar: "bg-emerald-500", soft: "bg-emerald-50 text-emerald-700", ring: "ring-emerald-500", hex: "#10b981", grad: "from-emerald-500/15 via-emerald-500/5" },
  { bar: "bg-violet-500", soft: "bg-violet-50 text-violet-700", ring: "ring-violet-500", hex: "#8b5cf6", grad: "from-violet-500/15 via-violet-500/5" },
  { bar: "bg-rose-500", soft: "bg-rose-50 text-rose-700", ring: "ring-rose-500", hex: "#f43f5e", grad: "from-rose-500/15 via-rose-500/5" },
  { bar: "bg-sky-500", soft: "bg-sky-50 text-sky-700", ring: "ring-sky-500", hex: "#0ea5e9", grad: "from-sky-500/15 via-sky-500/5" },
];

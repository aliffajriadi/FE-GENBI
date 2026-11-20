import { type ChatChannel } from "@/components/chat-channel-dialog";

export type Channel = ChatChannel & { unread: number; last: { body: string; senderName: string; createdAt: string } | null };
export type ChannelList = { channels: Channel[]; canCreate: boolean; lockedDivisionId: string | null };
export type Msg = {
  id: string; channelId: string; body: string | null; deleted: boolean; pinned: boolean; editedAt: string | null; createdAt: string;
  sender: { id: string; name: string; avatarUrl: string | null };
  replyTo: { id: string; senderName: string; body: string | null } | null;
  sending?: boolean; failed?: boolean;
};
export type Thread = { items: Msg[]; hasMore: boolean; loading: boolean };

const TZ = "Asia/Jakarta";
export const time = (s: string) => new Date(s).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
export const dayKey = (s: string) => new Date(s).toLocaleDateString("en-CA", { timeZone: TZ });
export function dayLabel(s: string) {
  const k = dayKey(s);
  if (k === dayKey(new Date().toISOString())) return "Hari ini";
  if (k === dayKey(new Date(Date.now() - 864e5).toISOString())) return "Kemarin";
  return new Date(s).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
}
export const shortAgo = (s: string) => (dayKey(s) === dayKey(new Date().toISOString()) ? time(s) : new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: TZ }));
export const scopeLabel = (c: Channel) => (c.type === "GENERAL" ? "Semua anggota" : c.type === "CORE" ? "Pengurus inti" : c.type === "DIVISION" ? `Divisi ${c.division}` : `Anggota pilihan${c.division ? ` · ${c.division}` : ""}`);
export const channelDesc = (c: Channel) => c.description || scopeLabel(c);

// Pesan dianggap satu kelompok kalau pengirim sama & jaraknya < 5 menit (avatar & nama tidak diulang).
export const grouped = (a: Msg | undefined, b: Msg) => !!a && a.sender.id === b.sender.id && !a.deleted && dayKey(a.createdAt) === dayKey(b.createdAt) && +new Date(b.createdAt) - +new Date(a.createdAt) < 5 * 60_000 && !b.replyTo;

export const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

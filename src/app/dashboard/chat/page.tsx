"use client";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, Hash, Loader2, Lock, Megaphone, MessagesSquare, Pencil, Pin, Plus, Reply, SendHorizontal, Settings2, ShieldCheck, Trash2, Users, X } from "lucide-react";
import { ChannelDialog, MembersDialog, type ChatChannel } from "@/components/chat-channel-dialog";
import { useToast } from "@/components/toast";
import { Avatar, cx, Skeleton } from "@/components/ui";
import { api, apiPage } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useMe } from "@/lib/use-me";

type Channel = ChatChannel & { unread: number; last: { body: string; senderName: string; createdAt: string } | null };
type ChannelList = { channels: Channel[]; canCreate: boolean; lockedDivisionId: string | null };
type Msg = {
  id: string; channelId: string; body: string | null; deleted: boolean; pinned: boolean; editedAt: string | null; createdAt: string;
  sender: { id: string; name: string; avatarUrl: string | null };
  replyTo: { id: string; senderName: string; body: string | null } | null;
  sending?: boolean; failed?: boolean;
};
type Thread = { items: Msg[]; hasMore: boolean; loading: boolean };

const TZ = "Asia/Jakarta";
const time = (s: string) => new Date(s).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const dayKey = (s: string) => new Date(s).toLocaleDateString("en-CA", { timeZone: TZ });
function dayLabel(s: string) {
  const k = dayKey(s);
  if (k === dayKey(new Date().toISOString())) return "Hari ini";
  if (k === dayKey(new Date(Date.now() - 864e5).toISOString())) return "Kemarin";
  return new Date(s).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
}
const shortAgo = (s: string) => (dayKey(s) === dayKey(new Date().toISOString()) ? time(s) : new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: TZ }));
const scopeLabel = (c: Channel) => (c.type === "GENERAL" ? "Semua anggota" : c.type === "CORE" ? "Pengurus inti" : c.type === "DIVISION" ? `Divisi ${c.division}` : `Anggota pilihan${c.division ? ` · ${c.division}` : ""}`);
const channelDesc = (c: Channel) => c.description || scopeLabel(c);
const ChannelIcon = ({ c, size = 15 }: { c: Channel; size?: number }) =>
  c.type === "CORE" ? <ShieldCheck size={size} aria-hidden /> : c.type === "DIVISION" ? <Users size={size} aria-hidden /> : c.type === "CUSTOM" ? <Lock size={size - 1} aria-hidden /> : <Hash size={size} aria-hidden />;

// Pesan dianggap satu kelompok kalau pengirim sama & jaraknya < 5 menit (avatar & nama tidak diulang).
const grouped = (a: Msg | undefined, b: Msg) => !!a && a.sender.id === b.sender.id && !a.deleted && dayKey(a.createdAt) === dayKey(b.createdAt) && +new Date(b.createdAt) - +new Date(a.createdAt) < 5 * 60_000 && !b.replyTo;

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;
function Body({ text }: { text: string }) {
  const emojiOnly = /^\p{Extended_Pictographic}(‍?\p{Extended_Pictographic}|️)*$/u.test(text.replace(/\s/g, "")) && [...text.replace(/\s/g, "")].length <= 6;
  return (
    <p className={cx("break-words whitespace-pre-wrap text-slate-800", emojiOnly ? "text-[32px] leading-tight" : "text-[14.5px] leading-relaxed")}>
      {text.split(URL_RE).map((part, i) => (i % 2 ? <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline underline-offset-2 hover:no-underline">{part}</a> : part))}
    </p>
  );
}

export default function ChatPage() {
  const { me } = useMe();
  const qc = useQueryClient();
  const toast = useToast();
  const channels = useQuery({ queryKey: ["channels"], queryFn: () => api<ChannelList>("/channels") });
  const [dialog, setDialog] = useState<"create" | "edit" | "members" | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [threads, setThreads] = useState<Record<string, Thread>>({});
  const [typing, setTyping] = useState<Record<string, Record<string, { name: string; until: number }>>>({});
  const activeRef = useRef<string | null>(null);
  activeRef.current = activeId;

  const list = channels.data?.channels ?? [];
  const active = list.find((c) => c.id === activeId) ?? null;
  // Tunggu daftar selesai dimuat ulang dulu, supaya diskusi yang baru dibuat tidak dianggap "hilang".
  useEffect(() => { if (channels.data && !channels.isFetching && (!activeId || !list.some((c) => c.id === activeId))) setActiveId(list[0]?.id ?? null); }, [channels.data, channels.isFetching, list, activeId]);

  const upsert = useCallback((m: Msg) => {
    setThreads((t) => {
      const th = t[m.channelId];
      if (!th) return t;
      const i = th.items.findIndex((x) => x.id === m.id);
      const items = i >= 0 ? th.items.map((x, j) => (j === i ? m : x)) : [...th.items, m];
      return { ...t, [m.channelId]: { ...th, items } };
    });
  }, []);

  const markRead = useCallback((channelId: string) => {
    api(`/channels/${channelId}/read`, { method: "POST" }).catch(() => {});
    qc.setQueryData<ChannelList>(["channels"], (d) => d && { ...d, channels: d.channels.map((c) => (c.id === channelId ? { ...c, unread: 0 } : c)) });
  }, [qc]);

  // Realtime: pesan baru/ubah + indikator mengetik.
  useEffect(() => {
    const s = getSocket();
    const onNew = (m: Msg) => {
      upsert(m);
      const visible = activeRef.current === m.channelId && document.visibilityState === "visible";
      qc.setQueryData<ChannelList>(["channels"], (d) =>
        d && { ...d, channels: d.channels.map((c) => (c.id === m.channelId ? { ...c, last: { body: m.body ?? "", senderName: m.sender.name, createdAt: m.createdAt }, unread: visible || m.sender.id === me?.id ? 0 : c.unread + 1 } : c)) },
      );
      if (visible && m.sender.id !== me?.id) markRead(m.channelId);
      setTyping((t) => { const c = { ...(t[m.channelId] ?? {}) }; delete c[m.sender.id]; return { ...t, [m.channelId]: c }; });
    };
    const onTyping = ({ channelId, user }: { channelId: string; user: { id: string; name: string } }) =>
      setTyping((t) => ({ ...t, [channelId]: { ...(t[channelId] ?? {}), [user.id]: { name: user.name, until: Date.now() + 4000 } } }));
    s.on("message:new", onNew);
    s.on("message:update", upsert);
    s.on("typing", onTyping);
    // Setelah koneksi putus lalu tersambung lagi, muat ulang supaya tidak ada pesan yang terlewat.
    const onReconnect = () => { setThreads({}); qc.invalidateQueries({ queryKey: ["channels"] }); };
    s.io.on("reconnect", onReconnect);
    // Diskusi dibuat/diubah/diarsip atau aksesmu berubah → muat ulang daftar.
    const onChanged = () => qc.invalidateQueries({ queryKey: ["channels"] });
    s.on("channels:changed", onChanged);
    const tick = setInterval(() => setTyping((t) => {
      const now = Date.now();
      let changed = false;
      const next = Object.fromEntries(Object.entries(t).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).filter(([, x]) => { const keep = x.until > now; changed ||= !keep; return keep; }))]));
      return changed ? next : t;
    }), 1000);
    return () => { s.off("message:new", onNew); s.off("message:update", upsert); s.off("typing", onTyping); s.io.off("reconnect", onReconnect); s.off("channels:changed", onChanged); clearInterval(tick); };
  }, [qc, upsert, markRead, me?.id]);

  // Muat pesan saat channel dibuka pertama kali.
  useEffect(() => {
    if (!activeId || threads[activeId]) return;
    setThreads((t) => ({ ...t, [activeId]: { items: [], hasMore: false, loading: true } }));
    apiPage<Msg[]>(`/channels/${activeId}/messages?limit=50`)
      .then((r) => setThreads((t) => ({ ...t, [activeId]: { items: r.data, hasMore: !!(r.meta as unknown as { hasMore: boolean }).hasMore, loading: false } })))
      .catch((e) => { toast(e.message, { error: true }); setThreads((t) => { const n = { ...t }; delete n[activeId]; return n; }); });
    markRead(activeId);
  }, [activeId, threads, markRead, toast]);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible" && activeRef.current) markRead(activeRef.current); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [markRead]);

  const open = (id: string) => { setActiveId(id); setMobileOpen(true); };
  const totalUnread = list.reduce((s, c) => s + c.unread, 0);

  return (
    <div className="flex h-full bg-white">
      {/* Daftar channel */}
      <aside className={cx("w-full shrink-0 flex-col border-r border-slate-200/80 bg-[var(--sidebar)] md:flex md:w-72", mobileOpen ? "hidden" : "flex")}>
        <div className="flex h-16 items-center gap-2 border-b border-slate-200/80 px-5">
          <MessagesSquare size={18} className="text-primary" aria-hidden />
          <h1 className="font-serif text-[22px] font-medium">Diskusi</h1>
          {totalUnread > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">{totalUnread}</span>}
          {channels.data?.canCreate && (
            <button onClick={() => setDialog("create")} className="ml-auto grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Buat diskusi" title="Buat diskusi">
              <Plus size={18} />
            </button>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto p-2" aria-label="Channel">
          {channels.isLoading && <div className="space-y-2 p-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>}
          {list.map((c) => {
            const on = c.id === activeId;
            return (
              <button key={c.id} onClick={() => open(c.id)} aria-current={on ? "true" : undefined}
                className={cx("flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors", on ? "bg-accent" : "hover:bg-slate-100/80")}>
                <span className={cx("mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg", on ? "bg-primary text-white" : "bg-white text-slate-500 ring-1 ring-slate-200")}>
                  <ChannelIcon c={c} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={cx("truncate text-[14px]", c.unread ? "font-semibold text-slate-900" : on ? "font-medium text-accent-foreground" : "text-slate-700")}>{c.name}</span>
                    {c.readOnly && <Megaphone size={12} className="shrink-0 text-slate-400" aria-label="Pengumuman" />}
                    {c.last && <span className="ml-auto shrink-0 text-[11px] text-slate-400">{shortAgo(c.last.createdAt)}</span>}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <span className={cx("truncate text-[12.5px]", c.unread ? "text-slate-700" : "text-slate-500")}>{c.last ? `${c.last.senderName.split(" ")[0]}: ${c.last.body}` : channelDesc(c)}</span>
                    {c.unread > 0 && <span className="ml-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-white">{c.unread > 99 ? "99+" : c.unread}</span>}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Percakapan */}
      <section className={cx("min-w-0 flex-1 flex-col", mobileOpen ? "flex" : "hidden md:flex")}>
        {active && me ? (
          <Conversation
            key={active.id}
            channel={active}
            onSettings={() => setDialog("edit")}
            onMembers={() => setDialog("members")}
            meId={me.id}
            thread={threads[active.id]}
            typing={Object.values(typing[active.id] ?? {}).map((t) => t.name)}
            onBack={() => setMobileOpen(false)}
            onUpsert={upsert}
            onRemove={(id) => setThreads((t) => ({ ...t, [active.id]: { ...t[active.id], items: t[active.id].items.filter((m) => m.id !== id) } }))}
            onOlder={(items, hasMore) => setThreads((t) => ({ ...t, [active.id]: { ...t[active.id], items: [...items, ...t[active.id].items], hasMore } }))}
          />
        ) : (
          <div className="grid flex-1 place-items-center text-slate-400">{channels.isLoading ? <Loader2 className="animate-spin" aria-hidden /> : "Pilih channel"}</div>
        )}
      </section>

      <ChannelDialog
        open={dialog === "create" || dialog === "edit"}
        channel={dialog === "edit" ? active : null}
        lockedDivisionId={channels.data?.lockedDivisionId ?? null}
        onClose={() => setDialog(null)}
        onSaved={(id) => { qc.invalidateQueries({ queryKey: ["channels"] }); if (id) open(id); }}
      />
      <MembersDialog channel={dialog === "members" ? active : null} onClose={() => setDialog(null)} />
    </div>
  );
}

function Conversation({ channel, meId, thread, typing, onBack, onSettings, onMembers, onUpsert, onRemove, onOlder }: {
  channel: Channel; meId: string; thread?: Thread; typing: string[];
  onBack: () => void; onSettings: () => void; onMembers: () => void; onUpsert: (m: Msg) => void; onRemove: (id: string) => void; onOlder: (items: Msg[], hasMore: boolean) => void;
}) {
  const toast = useToast();
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [editing, setEditing] = useState<Msg | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [unseen, setUnseen] = useState(0);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const prevHeight = useRef<number | null>(null);
  const lastCount = useRef(0);
  const lastTyping = useRef(0);
  const items = useMemo(() => thread?.items ?? [], [thread]);
  const pinned = items.filter((m) => m.pinned && !m.deleted);

  // Tetap di bawah saat pesan baru masuk (kalau memang sedang di bawah); kalau tidak, tampilkan tombol "pesan baru".
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (prevHeight.current !== null) {
      el.scrollTop += el.scrollHeight - prevHeight.current; // memuat pesan lama: posisi baca tidak loncat
      prevHeight.current = null;
    } else if (items.length > lastCount.current) {
      const mine = items.at(-1)?.sender.id === meId;
      if (atBottom || mine || lastCount.current === 0) el.scrollTop = el.scrollHeight;
      else setUnseen((n) => n + items.length - lastCount.current);
    }
    lastCount.current = items.length;
  }, [items, atBottom, meId]);

  useEffect(() => { input.current?.focus(); }, [channel.id]);

  const loadOlder = async () => {
    if (!thread?.hasMore || loadingOlder || !items[0]) return;
    setLoadingOlder(true);
    try {
      const r = await apiPage<Msg[]>(`/channels/${channel.id}/messages?limit=50&before=${items[0].id}`);
      prevHeight.current = scroller.current?.scrollHeight ?? null;
      onOlder(r.data, !!(r.meta as unknown as { hasMore: boolean }).hasMore);
    } catch (e) { toast((e as Error).message, { error: true }); } finally { setLoadingOlder(false); }
  };

  const onScroll = () => {
    const el = scroller.current!;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setAtBottom(bottom);
    if (bottom) setUnseen(0);
    if (el.scrollTop < 200) loadOlder();
  };

  const toBottom = () => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); setUnseen(0); };

  const jumpTo = (id: string) => {
    const el = document.getElementById(`m-${id}`);
    if (!el) return toast("Pesan asli ada di riwayat yang lebih lama", { error: true });
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlight(id);
    setTimeout(() => setHighlight(null), 1600);
  };

  const send = async (body: string, reply: Msg | null) => {
    const tmp: Msg = {
      id: `tmp-${Date.now()}`, channelId: channel.id, body, deleted: false, pinned: false, editedAt: null, createdAt: new Date().toISOString(), sending: true,
      sender: { id: meId, name: "", avatarUrl: null }, replyTo: reply && { id: reply.id, senderName: reply.sender.name, body: reply.body },
    };
    onUpsert(tmp);
    try {
      const m = await api<Msg>(`/channels/${channel.id}/messages`, { method: "POST", body: { body, replyToId: reply?.id } });
      onRemove(tmp.id);
      onUpsert(m);
    } catch (e) {
      onUpsert({ ...tmp, sending: false, failed: true });
      toast((e as Error).message, { error: true });
    }
  };

  const submit = async () => {
    const body = text.trim();
    if (!body) return;
    if (editing) {
      try { onUpsert(await api<Msg>(`/messages/${editing.id}`, { method: "PATCH", body: { body } })); } catch (e) { return toast((e as Error).message, { error: true }); }
      setEditing(null);
    } else {
      send(body, replyTo);
      setReplyTo(null);
    }
    setText("");
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
    if (e.key === "Escape") { setReplyTo(null); if (editing) { setEditing(null); setText(""); } }
    // Panah atas di kotak kosong = edit pesan terakhir sendiri (seperti Slack).
    if (e.key === "ArrowUp" && !text) {
      const mine = [...items].reverse().find((m) => m.sender.id === meId && !m.deleted && !m.sending);
      if (mine) { e.preventDefault(); setEditing(mine); setText(mine.body ?? ""); }
    }
  };

  const onType = (v: string) => {
    setText(v);
    if (!editing && Date.now() - lastTyping.current > 2500) { getSocket().emit("typing", channel.id); lastTyping.current = Date.now(); }
  };

  const act = async (m: Msg, kind: "delete" | "pin") => {
    if (kind === "delete" && !confirm("Hapus pesan ini?")) return;
    try { onUpsert(await api<Msg>(kind === "delete" ? `/messages/${m.id}` : `/messages/${m.id}/pin`, { method: kind === "delete" ? "DELETE" : "POST" })); }
    catch (e) { toast((e as Error).message, { error: true }); }
  };

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200/80 px-4 sm:px-6">
        <button onClick={onBack} className="-ml-1 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 md:hidden" aria-label="Kembali ke daftar channel"><ArrowLeft size={18} /></button>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold text-slate-900"><span className="text-slate-400"><ChannelIcon c={channel} size={16} /></span>{channel.name}{channel.readOnly && <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"><Megaphone size={11} aria-hidden /> Pengumuman</span>}</p>
          <p className="truncate text-xs text-slate-500">{channelDesc(channel)}</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
        <button onClick={onMembers} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-slate-600 hover:bg-slate-100" title={scopeLabel(channel)}>
          <Users size={14} aria-hidden /> <span className="hidden sm:inline">Anggota</span>
        </button>
        {pinned.length > 0 && (
          <button onClick={() => setShowPinned((s) => !s)} aria-expanded={showPinned}
            className={cx("inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px]", showPinned ? "bg-amber-50 text-amber-800" : "text-slate-600 hover:bg-slate-100")}>
            <Pin size={14} aria-hidden /> {pinned.length} disematkan
          </button>
        )}
        {channel.canManage && (
          <button onClick={onSettings} className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Atur diskusi" title="Atur diskusi">
            <Settings2 size={17} />
          </button>
        )}
        </div>
      </header>

      {showPinned && (
        <div className="max-h-48 shrink-0 overflow-y-auto border-b border-amber-100 bg-amber-50/60 px-4 py-2 sm:px-6">
          {pinned.map((m) => (
            <button key={m.id} onClick={() => { setShowPinned(false); jumpTo(m.id); }} className="block w-full truncate rounded-md px-2 py-1.5 text-left text-[13px] text-slate-700 hover:bg-amber-100/60">
              <b className="font-medium">{m.sender.name}:</b> {m.body}
            </button>
          ))}
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <div ref={scroller} onScroll={onScroll} className="h-full overflow-y-auto px-2 py-4 sm:px-4" role="log" aria-live="polite" aria-label={`Pesan di ${channel.name}`}>
          {!thread || thread.loading ? (
            <div className="space-y-5 p-4">{[0, 1, 2, 3].map((i) => <div key={i} className="flex gap-3"><Skeleton className="size-9 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-32" /><Skeleton className="h-4 w-2/3" /></div></div>)}</div>
          ) : (
            <>
              {thread.hasMore ? (
                <div className="py-3 text-center text-xs text-slate-400">{loadingOlder ? <Loader2 size={16} className="mx-auto animate-spin" aria-hidden /> : <button onClick={loadOlder} className="hover:text-slate-700">Muat pesan sebelumnya</button>}</div>
              ) : (
                <div className="px-3 pt-6 pb-8">
                  <span className="grid size-12 place-items-center rounded-xl bg-accent text-primary"><Hash size={22} aria-hidden /></span>
                  <p className="mt-3 font-serif text-[24px] font-medium">Selamat datang di #{channel.name}</p>
                  <p className="mt-1 text-[14px] text-slate-500">Awal percakapan {channelDesc(channel).toLowerCase()}. Sapa yang lain dulu!</p>
                </div>
              )}
              {items.map((m, i) => {
                const prev = items[i - 1];
                const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
                const compact = !newDay && grouped(prev, m);
                const mine = m.sender.id === meId;
                return (
                  <Fragment key={m.id}>
                    {newDay && (
                      <div className="my-4 flex items-center gap-3 px-3" role="separator">
                        <span className="h-px flex-1 bg-slate-200" /><span className="text-[12px] font-medium text-slate-500">{dayLabel(m.createdAt)}</span><span className="h-px flex-1 bg-slate-200" />
                      </div>
                    )}
                    <div
                      id={`m-${m.id}`}
                      // Di layar sentuh tidak ada hover: ketuk pesan untuk memunculkan tombol aksi.
                      onClick={(e) => { if (!(e.target as HTMLElement).closest("a,button")) setSelected((s) => (s === m.id ? null : m.id)); }}
                      className={cx("group relative flex gap-3 rounded-lg px-3 transition-colors hover:bg-slate-50", compact ? "py-0.5" : "mt-2 pt-1.5 pb-0.5", (highlight === m.id || selected === m.id) && "bg-slate-50", highlight === m.id && "bg-amber-50", m.pinned && !m.deleted && "bg-amber-50/40")}
                    >
                      <div className="w-9 shrink-0">
                        {compact ? (
                          <span className="invisible block pt-1 text-right text-[10px] text-slate-400 group-hover:visible">{time(m.createdAt)}</span>
                        ) : (
                          <Link href={`/dashboard/people/${m.sender.id}`} aria-label={`Profil ${m.sender.name}`}><Avatar name={m.sender.name || "Saya"} src={m.sender.avatarUrl} size={36} /></Link>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        {!compact && (
                          <p className="flex items-baseline gap-2">
                            <Link href={`/dashboard/people/${m.sender.id}`} className="text-[14px] font-semibold text-slate-900 hover:underline">{mine ? "Kamu" : m.sender.name}</Link>
                            <span className="text-[11.5px] text-slate-400">{time(m.createdAt)}</span>
                            {m.pinned && !m.deleted && <span className="inline-flex items-center gap-0.5 text-[11px] text-amber-700"><Pin size={11} aria-hidden /> disematkan</span>}
                          </p>
                        )}
                        {m.replyTo && (
                          <button onClick={() => jumpTo(m.replyTo!.id)} className="mt-1 mb-1 flex max-w-full items-center gap-2 border-l-2 border-slate-300 pl-2.5 text-left text-[12.5px] text-slate-500 hover:border-primary">
                            <Reply size={12} className="shrink-0 -scale-x-100" aria-hidden />
                            <span className="truncate"><b className="font-medium text-slate-700">{m.replyTo.senderName}</b> {m.replyTo.body ?? <i>pesan dihapus</i>}</span>
                          </button>
                        )}
                        {m.deleted ? (
                          <p className="text-[14px] text-slate-400 italic">Pesan dihapus</p>
                        ) : (
                          <div className={cx(m.sending && "opacity-60", m.failed && "text-red-600")}>
                            <Body text={m.body ?? ""} />
                            {m.editedAt && <span className="text-[11px] text-slate-400">(diedit)</span>}
                            {m.sending && <span className="text-[11px] text-slate-400">mengirim…</span>}
                            {m.failed && <button onClick={() => { onRemove(m.id); send(m.body ?? "", null); }} className="text-[11px] font-medium text-red-600 underline">Gagal terkirim · coba lagi</button>}
                          </div>
                        )}
                      </div>
                      {!m.deleted && !m.sending && !m.failed && (
                        <div onClick={() => setSelected(null)} className={cx("absolute -top-3 right-3 items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm group-hover:flex group-focus-within:flex", selected === m.id ? "flex" : "hidden")}>
                          <IconBtn label="Balas" onClick={() => { setReplyTo(m); setEditing(null); input.current?.focus(); }}><Reply size={15} /></IconBtn>
                          {mine && <IconBtn label="Edit" onClick={() => { setEditing(m); setReplyTo(null); setText(m.body ?? ""); input.current?.focus(); }}><Pencil size={14} /></IconBtn>}
                          {channel.canManage && <IconBtn label={m.pinned ? "Lepas sematan" : "Sematkan"} onClick={() => act(m, "pin")}><Pin size={14} /></IconBtn>}
                          {(mine || channel.canManage) && <IconBtn label="Hapus" onClick={() => act(m, "delete")} danger><Trash2 size={14} /></IconBtn>}
                        </div>
                      )}
                    </div>
                  </Fragment>
                );
              })}
            </>
          )}
        </div>
        {(unseen > 0 || !atBottom) && thread && !thread.loading && (
          <button onClick={toBottom} className="theme-light absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1.5 text-[12.5px] font-medium text-white shadow-lg hover:bg-slate-700">
            <ArrowDown size={14} aria-hidden /> {unseen > 0 ? `${unseen} pesan baru` : "Ke pesan terbaru"}
          </button>
        )}
      </div>

      {/* Kotak tulis */}
      {!channel.canPost ? (
        <div className="shrink-0 px-3 pb-3 sm:px-5 sm:pb-5">
          <p className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-3.5 text-[13px] text-slate-500"><Megaphone size={15} aria-hidden /> Hanya pengelola yang bisa mengirim pesan di diskusi ini.</p>
        </div>
      ) : (
      <div className="shrink-0 px-3 pb-3 sm:px-5 sm:pb-5">
        <p className="h-5 px-1 text-[12px] text-slate-500" aria-live="polite">
          {typing.length > 0 && <><span className="font-medium text-slate-700">{typing.slice(0, 2).join(", ")}{typing.length > 2 ? ` +${typing.length - 2}` : ""}</span> sedang mengetik…</>}
        </p>
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs focus-within:border-slate-400">
          {(replyTo || editing) && (
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-[12.5px] text-slate-600">
              {editing ? <Pencil size={13} aria-hidden /> : <Reply size={13} className="-scale-x-100" aria-hidden />}
              <span className="min-w-0 flex-1 truncate">{editing ? "Mengedit pesan" : <>Membalas <b className="font-medium text-slate-800">{replyTo!.sender.name}</b>: {replyTo!.body}</>}</span>
              <button onClick={() => { setReplyTo(null); if (editing) { setEditing(null); setText(""); } }} className="rounded p-0.5 hover:bg-slate-100" aria-label="Batal"><X size={14} /></button>
            </div>
          )}
          <div className="flex items-end gap-2 p-2">
            <textarea
              ref={input}
              value={text}
              onChange={(e) => onType(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              maxLength={4000}
              placeholder={`Tulis pesan di #${channel.name}`}
              aria-label="Tulis pesan"
              className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-[14.5px] leading-relaxed outline-none placeholder:text-slate-400 [field-sizing:content]"
            />
            <button onClick={submit} disabled={!text.trim()} aria-label={editing ? "Simpan perubahan" : "Kirim"}
              className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-white transition disabled:bg-slate-100 disabled:text-slate-400">
              <SendHorizontal size={17} />
            </button>
          </div>
        </div>
        <p className="mt-1.5 hidden px-1 text-[11px] text-slate-400 sm:block"><b className="font-medium">Enter</b> kirim · <b className="font-medium">Shift+Enter</b> baris baru · <b className="font-medium">↑</b> edit pesan terakhir</p>
      </div>
      )}
    </>
  );
}

function IconBtn({ label, onClick, children, danger }: { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} className={cx("grid size-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100", danger ? "hover:text-red-600" : "hover:text-slate-900")}>
      {children}
    </button>
  );
}

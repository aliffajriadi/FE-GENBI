"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Megaphone, MessagesSquare, Plus } from "lucide-react";
import { ChannelDialog, MembersDialog } from "@/components/chat-channel-dialog";
import { useToast } from "@/components/toast";
import { cx, Skeleton } from "@/components/ui";
import { api, apiPage } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useMe } from "@/lib/use-me";
import { type ChannelList, type Msg, type Thread, channelDesc, shortAgo } from "./_lib";
import { ChannelIcon } from "./_components/chat-ui";
import { Conversation } from "./_components/conversation";

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

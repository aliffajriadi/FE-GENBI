"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { notifIcon, type Notif } from "@/components/notification-bell";
import { Button, Card, cx, EmptyState, ErrorText, PageHeader, Skeleton, Tabs } from "@/components/ui";
import { api } from "@/lib/api";
import { fmtRelative } from "@/lib/format";

type PageData = { items: Notif[]; unread: number; nextCursor: string | null };

function dayLabel(s: string) {
  const d = new Date(s);
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86_400_000);
  if (days === 0) return "Hari ini";
  if (days === 1) return "Kemarin";
  if (days < 7) return "Minggu ini";
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

export default function NotificationsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"all" | "unread">("all");
  const q = useInfiniteQuery({
    queryKey: ["notifications", "page", tab],
    queryFn: ({ pageParam }) => api<PageData>(`/notifications?limit=30${tab === "unread" ? "&unread=1" : ""}${pageParam ? `&cursor=${pageParam}` : ""}`),
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const read = useMutation({
    mutationFn: (ids?: string[]) => api("/notifications/read", { method: "POST", body: ids ? { ids } : {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const unread = q.data?.pages[0]?.unread ?? 0;
  const groups = items.reduce<{ label: string; items: Notif[] }[]>((acc, n) => {
    const label = dayLabel(n.createdAt);
    if (acc.at(-1)?.label === label) acc.at(-1)!.items.push(n);
    else acc.push({ label, items: [n] });
    return acc;
  }, []);

  const open = (n: Notif) => {
    if (!n.readAt) read.mutate([n.id]);
    if (n.data?.link) router.push(n.data.link);
  };

  return (
    <>
      <PageHeader
        title="Notifikasi"
        desc="Kabar terbaru soal kegiatan, kas, artikel, dan divisi kamu."
        actions={unread > 0 && (
          <Button variant="outline" onClick={() => read.mutate(undefined)} loading={read.isPending}>
            <CheckCheck size={16} aria-hidden /> Tandai semua dibaca
          </Button>
        )}
      />
      <div className="mb-4">
        <Tabs value={tab} onChange={setTab} items={[{ value: "all", label: "Semua" }, { value: "unread", label: "Belum dibaca", count: unread }]} />
      </div>
      <ErrorText error={q.error ?? read.error} />

      <Card className="overflow-hidden">
        {q.isLoading && <div className="space-y-3 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>}
        {!q.isLoading && !items.length && (
          <EmptyState icon={Bell} title={tab === "unread" ? "Semua sudah dibaca" : "Belum ada notifikasi"} desc={tab === "unread" ? "Tidak ada notifikasi baru." : "Notifikasi akan muncul di sini."} />
        )}
        {groups.map((g) => (
          <section key={g.label}>
            <h2 className="sticky top-14 z-10 border-b border-slate-100 bg-slate-50/95 px-4 py-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase backdrop-blur-sm lg:top-0">{g.label}</h2>
            <ul className="divide-y divide-slate-100">
              {g.items.map((n) => {
                const { icon: Icon, tone } = notifIcon(n.type);
                return (
                  <li key={n.id}>
                    <button onClick={() => open(n)} className={cx("flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50", !n.readAt && "bg-blue-50/40")}>
                      <span className={cx("grid size-9 shrink-0 place-items-center rounded-full", tone)}><Icon size={17} aria-hidden /></span>
                      <span className="min-w-0 flex-1">
                        <span className={cx("block text-[13.5px] text-slate-900", !n.readAt && "font-semibold")}>{n.title}</span>
                        {n.body && <span className="mt-0.5 block text-[13px] text-slate-500">{n.body}</span>}
                        <span className="mt-1 block text-xs text-slate-400">{fmtRelative(n.createdAt)}</span>
                      </span>
                      {!n.readAt && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label="Belum dibaca" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {q.hasNextPage && (
          <div className="border-t border-slate-100 p-3 text-center">
            <Button variant="ghost" onClick={() => q.fetchNextPage()} loading={q.isFetchingNextPage}>Muat lebih lama</Button>
          </div>
        )}
      </Card>
    </>
  );
}

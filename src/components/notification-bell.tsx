"use client";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { Menu } from "./menu";
import { cx } from "./ui";
import { api } from "@/lib/api";
import { fmtRelative } from "@/lib/format";

type Notif = { id: string; type: string; title: string; body: string | null; data: { link?: string } | null; readAt: string | null; createdAt: string };

export function NotificationBell({ side = "bottom", align = "end" }: { side?: "top" | "bottom"; align?: "start" | "end" }) {
  const router = useRouter();
  const qc = useQueryClient();
  // shortcut: polling 60 dtk; ganti ke Socket.IO saat modul chat dibuat.
  const q = useQuery({ queryKey: ["notifications"], queryFn: () => api<{ items: Notif[]; unread: number }>("/notifications"), refetchInterval: 60_000 });
  const read = useMutation({
    mutationFn: (ids?: string[]) => api("/notifications/read", { method: "POST", body: ids ? { ids } : {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const unread = q.data?.unread ?? 0;

  return (
    <Menu
      side={side}
      align={align}
      trigger={() => (
        <button className="relative grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ""}`}>
          <Bell size={18} />
          {unread > 0 && <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">{unread > 9 ? "9+" : unread}</span>}
        </button>
      )}
    >
      <div className="w-[min(360px,calc(100vw-2rem))]">
        <div className="flex items-center justify-between px-3 py-2">
          <p className="text-[13px] font-semibold">Notifikasi</p>
          {unread > 0 && (
            <button onClick={(e) => { e.stopPropagation(); read.mutate(undefined); }} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <CheckCheck size={13} aria-hidden /> Tandai semua dibaca
            </button>
          )}
        </div>
        <ul className="max-h-[420px] overflow-y-auto border-t border-slate-100">
          {q.data?.items.length === 0 && <li className="px-4 py-10 text-center text-[13px] text-slate-500">Belum ada notifikasi.</li>}
          {q.data?.items.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => {
                  if (!n.readAt) read.mutate([n.id]);
                  if (n.data?.link) router.push(n.data.link);
                }}
                className={cx("flex w-full gap-3 px-3 py-2.5 text-left hover:bg-slate-50", !n.readAt && "bg-blue-50/40")}
              >
                <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-primary")} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-slate-900">{n.title}</span>
                  {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">{n.body}</span>}
                  <span className="mt-1 block text-[11px] text-slate-400">{fmtRelative(n.createdAt)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Menu>
  );
}

"use client";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Bell, CalendarCheck, CheckCheck, FolderOpen, KanbanSquare, Newspaper, UserCog, Wallet, type LucideIcon } from "lucide-react";
import { Menu } from "./menu";
import { cx } from "./ui";
import { api } from "@/lib/api";
import { fmtRelative } from "@/lib/format";

export type Notif = { id: string; type: string; title: string; body: string | null; data: { link?: string } | null; readAt: string | null; createdAt: string };
// Ikon & warna per jenis notifikasi (berdasarkan awalan type dari backend).
export function notifIcon(type: string): { icon: LucideIcon; tone: string } {
  if (/^(EVENT|LEAVE)/.test(type)) return { icon: CalendarCheck, tone: "bg-blue-50 text-blue-700" };
  if (/^(BILL|PAYMENT)/.test(type)) return { icon: Wallet, tone: "bg-emerald-50 text-emerald-700" };
  if (type.startsWith("ARTICLE")) return { icon: Newspaper, tone: "bg-violet-50 text-violet-700" };
  if (type.startsWith("PLANNING")) return { icon: KanbanSquare, tone: "bg-indigo-50 text-indigo-700" };
  if (type.startsWith("DIVISION")) return { icon: UserCog, tone: "bg-amber-50 text-amber-700" };
  if (/^(DISPOSITION|ACTION_ITEM|IN)$/.test(type)) return { icon: FolderOpen, tone: "bg-sky-50 text-sky-700" };
  return { icon: Bell, tone: "bg-slate-100 text-slate-600" };
}


export function NotificationBell({ side = "bottom", align = "end" }: { side?: "top" | "bottom"; align?: "start" | "end" }) {
  const router = useRouter();
  const qc = useQueryClient();
  // shortcut: polling 60 dtk; ganti ke Socket.IO saat modul chat dibuat.
  const q = useQuery({ queryKey: ["notifications"], queryFn: () => api<{ items: Notif[]; unread: number }>("/notifications?limit=8"), refetchInterval: 60_000 });
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
        <ul className="max-h-[400px] overflow-y-auto border-t border-slate-100">
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
                {(() => { const { icon: Icon, tone } = notifIcon(n.type); return <span className={cx("grid size-8 shrink-0 place-items-center rounded-full", tone)}><Icon size={15} aria-hidden /></span>; })()}
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-slate-900">{n.title}</span>
                  {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">{n.body}</span>}
                  <span className="mt-1 block text-[11px] text-slate-400">{fmtRelative(n.createdAt)}</span>
                </span>
                {!n.readAt && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Belum dibaca" />}
              </button>
            </li>
          ))}
        </ul>
        <Link href="/dashboard/notifications" className="block border-t border-slate-100 px-3 py-2.5 text-center text-[13px] font-medium text-primary hover:bg-slate-50">
          Lihat semua notifikasi
        </Link>
      </div>
    </Menu>
  );
}

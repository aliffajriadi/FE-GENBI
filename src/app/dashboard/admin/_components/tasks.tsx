"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ListChecks, NotebookPen } from "lucide-react";
import { Avatar, Card, cx, EmptyState, Skeleton, Tabs } from "@/components/ui";
import { api } from "@/lib/api";
import { useMe } from "@/lib/use-me";
import { type Task, dueText } from "../_lib";
import { MinuteDetail } from "./minutes";

export function Tasks() {
  const qc = useQueryClient();
  const { can } = useMe();
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [openMinute, setOpenMinute] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["action-items", scope], queryFn: () => api<Task[]>(`/action-items?scope=${scope}`) });
  const toggle = useMutation({
    mutationFn: (t: Task) => api(`/action-items/${t.id}`, { method: "PATCH", body: { done: !t.done } }),
    onSuccess: () => qc.invalidateQueries({ predicate: (x) => ["action-items", "dashboard"].includes(x.queryKey[0] as string) }),
  });
  const all = q.data ?? [];
  const open = all.filter((t) => !t.done);
  const done = all.filter((t) => t.done);
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 864e5);
  // Kelompok berdasarkan urgensi supaya yang mendesak ada di atas.
  const groups = [
    { key: "late", title: "Terlambat", tone: "text-red-600", items: open.filter((t) => t.dueDate && new Date(t.dueDate) < now) },
    { key: "week", title: "7 hari ke depan", tone: "text-amber-700", items: open.filter((t) => t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= weekEnd) },
    { key: "later", title: "Nanti & tanpa tenggat", tone: "text-slate-500", items: open.filter((t) => !t.dueDate || new Date(t.dueDate) > weekEnd) },
  ].filter((g) => g.items.length);
  const canToggle = () => scope === "mine" || can("admin.manage");

  const row = (t: Task) => {
    const late = !t.done && !!t.dueDate && new Date(t.dueDate) < now;
    return (
      <li key={t.id} className="group flex items-center gap-3 px-4 py-3 sm:px-5">
        <button
          disabled={!canToggle()}
          onClick={() => toggle.mutate(t)}
          aria-pressed={t.done}
          aria-label={t.done ? `Tandai ${t.title} belum selesai` : `Tandai ${t.title} selesai`}
          className={cx("grid size-[22px] shrink-0 place-items-center rounded-full border-2 transition", t.done ? "border-green-600 bg-green-600 text-white" : "border-slate-300 text-transparent hover:border-green-500 hover:text-green-500")}
        >
          <Check size={13} strokeWidth={3} />
        </button>
        <div className="min-w-0 flex-1">
          <p className={cx("text-[14px] leading-snug", t.done ? "text-slate-400 line-through" : "font-medium text-slate-900")}>{t.title}</p>
          <button onClick={() => setOpenMinute(t.minute.id)} className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-xs text-slate-500 hover:text-primary">
            <NotebookPen size={11} aria-hidden /> <span className="truncate">{t.minute.event.title}</span>
          </button>
        </div>
        {scope === "all" && <span title={`PIC: ${t.pic.name}`}><Avatar name={t.pic.name} size={26} /></span>}
        {t.dueDate && !t.done && (
          <span className={cx("shrink-0 rounded-md px-2 py-0.5 text-xs font-medium", late ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600")}>{dueText(t.dueDate)}</span>
        )}
      </li>
    );
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {can("admin.read") && <Tabs value={scope} onChange={setScope} items={[{ value: "mine", label: "Tugas saya" }, { value: "all", label: "Semua tugas" }]} />}
        {all.length > 0 && (
          <div className="flex min-w-48 flex-1 items-center gap-3 sm:max-w-xs">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200/70"><div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${(done.length / all.length) * 100}%` }} /></div>
            <span className="shrink-0 text-xs text-slate-600 tabular-nums">{done.length}/{all.length} selesai</span>
          </div>
        )}
      </div>
      {q.isLoading ? <Card className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</Card> : !all.length ? (
        <Card><EmptyState icon={ListChecks} title="Belum ada tugas" desc="Tugas muncul otomatis saat notulen rapat menunjuk Anda sebagai PIC. Centang bulatannya kalau sudah selesai." /></Card>
      ) : (
        <>
          {!open.length && <Card className="flex items-center gap-3 border-green-200 bg-green-50/40 p-4 text-[14px] text-green-800"><Check size={18} aria-hidden /> Semua tugas sudah selesai. Mantap!</Card>}
          {groups.map((g) => (
            <Card key={g.key}>
              <p className={cx("border-b border-slate-100 px-5 py-2.5 text-xs font-semibold tracking-wide uppercase", g.tone)}>{g.title} · {g.items.length}</p>
              <ul className="divide-y divide-slate-100">{g.items.map(row)}</ul>
            </Card>
          ))}
          {done.length > 0 && (
            <Card>
              <details>
                <summary className="cursor-pointer px-5 py-3 text-[13px] text-slate-500 hover:text-slate-900">Lihat {done.length} tugas selesai</summary>
                <ul className="divide-y divide-slate-100 border-t border-slate-100">{done.map(row)}</ul>
              </details>
            </Card>
          )}
        </>
      )}
      <MinuteDetail id={openMinute} onClose={() => setOpenMinute(null)} />
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FolderOpen, ListChecks, Mail, NotebookPen, type LucideIcon } from "lucide-react";
import { cx, PageHeader } from "@/components/ui";
import { api, apiPage } from "@/lib/api";
import { initialTab } from "@/lib/format";
import { useMe } from "@/lib/use-me";
import { type Doc, type Letter, type Minute, type Task } from "./_lib";
import { Tasks } from "./_components/tasks";
import { Minutes } from "./_components/minutes";
import { Letters } from "./_components/letters";
import { Docs } from "./_components/docs";

const TABS = ["tasks", "minutes", "letters", "docs"] as const;
type Tab = (typeof TABS)[number];

export default function AdminPage() {
  const { can } = useMe();
  const [tab, setTab] = useState<Tab>("tasks");
  useEffect(() => setTab(initialTab(TABS, "tasks")), []);
  // Angka kecil di tiap modul supaya langsung kelihatan mana yang perlu perhatian.
  const tasks = useQuery({ queryKey: ["action-items", "mine"], queryFn: () => api<Task[]>("/action-items?scope=mine") });
  const minutes = useQuery({ queryKey: ["minutes", "count"], queryFn: () => apiPage<Minute[]>("/minutes?limit=1") });
  const letters = useQuery({ queryKey: ["letters", "count"], queryFn: () => apiPage<Letter[]>("/letters?limit=1"), enabled: can("admin.read") });
  const docs = useQuery({ queryKey: ["documents", "count"], queryFn: () => api<{ items: Doc[] }>("/documents") });
  const openTasks = tasks.data?.filter((t) => !t.done) ?? [];
  const lateTasks = openTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date()).length;

  const modules: { value: Tab; label: string; desc: string; icon: LucideIcon; tone: string; stat: string }[] = [
    { value: "tasks", label: "Tugas saya", desc: "Tugas dari hasil rapat", icon: ListChecks, tone: "bg-blue-50 text-blue-700", stat: tasks.data ? (openTasks.length ? `${openTasks.length} aktif${lateTasks ? ` · ${lateTasks} telat` : ""}` : tasks.data.length ? "Semua beres" : "Belum ada tugas") : "…" },
    { value: "minutes", label: "Notulen", desc: "Catatan & keputusan rapat", icon: NotebookPen, tone: "bg-violet-50 text-violet-700", stat: minutes.data ? `${minutes.data.meta.total ?? 0} notulen` : "…" },
    ...(can("admin.read") ? [{ value: "letters" as const, label: "Surat", desc: "Surat masuk & keluar", icon: Mail, tone: "bg-amber-50 text-amber-700", stat: letters.data ? `${letters.data.meta.total ?? 0} surat` : "…" }] : []),
    { value: "docs", label: "Arsip", desc: "Dokumen: SK, AD/ART, proposal, LPJ", icon: FolderOpen, tone: "bg-emerald-50 text-emerald-700", stat: docs.data ? `${docs.data.items.length} dokumen` : "…" },
  ];

  return (
    <>
      <PageHeader title="Administrasi" desc="Semua urusan kesekretariatan di satu tempat: tugas hasil rapat, notulen, surat-menyurat, dan arsip dokumen." />
      <nav className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Modul administrasi">
        {modules.map((m) => {
          const on = tab === m.value;
          return (
            <button
              key={m.value}
              onClick={() => setTab(m.value)}
              aria-current={on ? "page" : undefined}
              className={cx(
                "flex min-w-0 items-start gap-3 rounded-xl border bg-white p-3.5 text-left shadow-xs transition sm:p-4",
                on ? "border-primary ring-1 ring-primary" : "border-slate-200/80 hover:border-slate-300 hover:shadow-sm",
              )}
            >
              <span className={cx("grid size-9 shrink-0 place-items-center rounded-lg sm:size-10", m.tone)}><m.icon size={18} aria-hidden /></span>
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-semibold text-slate-900">{m.label}</span>
                <span className="hidden truncate text-xs text-slate-500 sm:block">{m.desc}</span>
                <span className={cx("mt-1 block truncate text-xs font-medium", m.value === "tasks" && lateTasks ? "text-red-600" : "text-slate-600")}>{m.stat}</span>
              </span>
            </button>
          );
        })}
      </nav>
      {tab === "tasks" && <Tasks />}
      {tab === "minutes" && <Minutes />}
      {tab === "letters" && can("admin.read") && <Letters manage={can("admin.manage")} />}
      {tab === "docs" && <Docs manage={can("admin.manage")} />}
    </>
  );
}

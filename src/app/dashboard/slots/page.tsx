"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy, LayoutGrid, Plus } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, cx, EmptyState, ErrorText, PageHeader, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { rid } from "@/lib/forms";
import { SLOT_TEMPLATES, type SlotTemplate } from "@/lib/slots";

type Row = { id: string; slug: string; title: string; optionNoun: string; isOpen: boolean; closesAt: string | null; capacity: number | null; groupCount: number; createdBy: { name: string }; _count: { entries: number } };
const open = (l: Row) => l.isOpen && (!l.closesAt || new Date(l.closesAt) > new Date());

export default function SlotsPage() {
  const router = useRouter();
  const toast = useToast();
  const lists = useQuery({ queryKey: ["slots"], queryFn: () => api<Row[]>("/slots") });
  const [picking, setPicking] = useState(false);
  // List baru dibuat dari template, lalu langsung dibuka di editor.
  const create = useMutation({
    mutationFn: (t: SlotTemplate) => api<{ id: string }>("/slots", { method: "POST", body: { slug: `${t.key}-${rid().slice(0, 6)}`, title: t.title, optionNoun: t.optionNoun, joinLabel: t.joinLabel, groups: t.groups, questions: t.questions } }),
    onSuccess: (l) => router.push(`/dashboard/slots/${l.id}`),
    onError: (e) => toast(e.message, { error: true }),
  });
  const copy = (slug: string) => navigator.clipboard.writeText(`${location.origin}/s/${slug}`).then(() => toast("Link disalin"));

  return (
    <>
      <PageHeader title="Slot & pendaftaran" desc="Ganti list “yang mau ikut” di grup WA: kelompok, undangan, sesi. Cukup share satu link." actions={<Button onClick={() => setPicking(true)}><Plus size={15} aria-hidden /> List baru</Button>} />
      <ErrorText error={lists.error} />
      {lists.isLoading && <Skeleton className="h-40 rounded-xl" />}
      {lists.data?.length === 0 && <EmptyState icon={LayoutGrid} title="Belum ada list" desc="Buat list untuk pembagian tim, konfirmasi undangan, atau pendaftaran sesi." action={<Button onClick={() => setPicking(true)}><Plus size={15} aria-hidden /> List baru</Button>} />}
      <div className="grid gap-2">
        {lists.data?.map((l) => {
          const full = l.capacity != null && l._count.entries >= l.capacity;
          return (
            <Card key={l.id} className="flex items-center gap-3 p-4 transition hover:border-slate-300">
              <Link href={`/dashboard/slots/${l.id}`} className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[14px] font-medium text-slate-900">
                  <span className="truncate">{l.title}</span>
                  {full ? <Badge tone="amber">Penuh</Badge> : <Badge tone={open(l) ? "green" : "slate"}>{open(l) ? "Dibuka" : "Ditutup"}</Badge>}
                </p>
                <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500">
                  <span><b className="font-medium text-slate-800 tabular-nums">{l.capacity != null ? `${l._count.entries}/${l.capacity}` : l._count.entries}</b> {l.capacity != null ? "terisi" : "orang"}</span>
                  <span>{l.groupCount} {l.optionNoun.toLowerCase()}</span>
                  <span>{l.createdBy.name}</span>
                </p>
              </Link>
              <Button variant="outline" size="sm" onClick={() => copy(l.slug)}><Copy size={13} aria-hidden /> <span className="hidden sm:inline">Salin link</span></Button>
            </Card>
          );
        })}
      </div>

      <Dialog open={picking} onClose={() => setPicking(false)} title="Mau buat apa?" size="lg">
        <div className="grid gap-2 sm:grid-cols-2">
          {SLOT_TEMPLATES().map((t) => (
            <button key={t.key} onClick={() => create.mutate(t)} disabled={create.isPending}
              className={cx("flex gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-primary hover:bg-primary/[0.03] disabled:opacity-60", create.variables?.key === t.key && create.isPending && "border-primary")}>
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-2xl" aria-hidden>{t.emoji}</span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold text-slate-900">{t.name}</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-slate-500">{t.desc}</span>
                <span className="mt-2 flex flex-wrap gap-1">
                  {t.groups.map((g) => <span key={g.name} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{g.name}{g.capacity ? ` · ${g.capacity}` : ""}</span>)}
                </span>
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">Semua bisa diubah lagi setelah dibuat.</p>
      </Dialog>
    </>
  );
}

"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ClipboardList, Copy, Globe, Lock, Plus } from "lucide-react";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, EmptyState, ErrorText, PageHeader, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { rid } from "@/lib/forms";

type FormRow = { id: string; slug: string; title: string; audience: "PUBLIC" | "MEMBERS"; isOpen: boolean; closesAt: string | null; updatedAt: string; createdBy: { name: string }; _count: { responses: number } };
const open = (f: FormRow) => f.isOpen && (!f.closesAt || new Date(f.closesAt) > new Date());

export default function FormsPage() {
  const router = useRouter();
  const toast = useToast();
  const forms = useQuery({ queryKey: ["forms"], queryFn: () => api<FormRow[]>("/forms") });
  // Form baru langsung dibuat dengan 1 pertanyaan contoh, lalu dibuka di editor.
  const create = useMutation({
    mutationFn: () => api<{ id: string }>("/forms", { method: "POST", body: { slug: `form-${rid().slice(0, 6)}`, title: "Form tanpa judul", audience: "MEMBERS", questions: [{ id: rid(), type: "SHORT", label: "Pertanyaan 1", required: false }] } }),
    onSuccess: (f) => router.push(`/dashboard/forms/${f.id}`),
    onError: (e) => toast(e.message, { error: true }),
  });
  const copy = (slug: string) => navigator.clipboard.writeText(`${location.origin}/f/${slug}`).then(() => toast("Link form disalin"));

  return (
    <>
      <PageHeader title="Form" desc="Buat formulir pendaftaran, survei, atau feedback seperti Google Form." actions={<Button onClick={() => create.mutate()} loading={create.isPending}><Plus size={15} aria-hidden /> Form baru</Button>} />
      <ErrorText error={forms.error} />
      {forms.isLoading && <Skeleton className="h-40 rounded-xl" />}
      {forms.data?.length === 0 && <EmptyState icon={ClipboardList} title="Belum ada form" desc="Buat form pertama untuk oprec, survei, atau feedback kegiatan." />}
      <div className="grid gap-2">
        {forms.data?.map((f) => (
          <Card key={f.id} className="flex items-center gap-3 p-4 transition hover:border-slate-300">
            <Link href={`/dashboard/forms/${f.id}`} className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[14px] font-medium text-slate-900">
                <span className="truncate">{f.title}</span>
                <Badge tone={open(f) ? "green" : "slate"}>{open(f) ? "Dibuka" : "Ditutup"}</Badge>
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">{f.audience === "PUBLIC" ? <Globe size={12} aria-hidden /> : <Lock size={12} aria-hidden />}{f.audience === "PUBLIC" ? "Publik" : "Khusus anggota"}</span>
                <span><b className="font-medium text-slate-800 tabular-nums">{f._count.responses}</b> respons</span>
                <span>{f.createdBy.name}</span>
              </p>
            </Link>
            <Button variant="outline" size="sm" onClick={() => copy(f.slug)}><Copy size={13} aria-hidden /> Salin link</Button>
          </Card>
        ))}
      </div>
    </>
  );
}

"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Eye, Newspaper, Plus } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { Badge, Button, EmptyState, ErrorText, Field, Input, PageHeader, Table, Tabs, Td } from "@/components/ui";
import { api, apiPage, publicFile } from "@/lib/api";
import { fmtRelative } from "@/lib/format";
import { useMe } from "@/lib/use-me";

type Row = { id: string; title: string; slug: string; status: string; kind: "NEWS" | "PERSONAL"; coverUrl: string | null; updatedAt: string; viewCount: number; author: { name: string }; division: { name: string } | null };
type Scope = "mine" | "all";

export default function ArticlesPage() {
  const router = useRouter();
  const { can } = useMe();
  const [scope, setScope] = useState<Scope>("mine");
  const [creating, setCreating] = useState(false);
  const list = useQuery({ queryKey: ["articles", scope], queryFn: () => apiPage<Row[]>(`/articles?scope=${scope}&limit=50`) });
  const canNews = can("article.review") || can("article.publish");
  const [kind, setKind] = useState<"PERSONAL" | "NEWS">("PERSONAL");
  const create = useMutation({
    mutationFn: (title: string) => api<{ id: string }>("/articles", { method: "POST", body: { title, kind } }),
    onSuccess: (a) => router.push(`/dashboard/articles/${a.id}`),
  });

  const tabs = [
    { value: "mine" as const, label: "Artikel saya" },
    ...(can("article.publish") ? [{ value: "all" as const, label: "Semua artikel" }] : []),
  ];
  const rows = list.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Artikel"
        desc="Tulis cerita, opini, atau kabar kegiatan. Langsung terbit ke web tanpa menunggu persetujuan."
        actions={<><Link href="/artikel" target="_blank"><Button variant="outline"><Eye size={15} aria-hidden /> Lihat blog</Button></Link><Button onClick={() => setCreating(true)}><Plus size={16} aria-hidden /> Tulis artikel</Button></>}
      />
      {tabs.length > 1 && <div className="mb-4"><Tabs value={scope} onChange={setScope} items={tabs} /></div>}
      <Table
        loading={list.isLoading}
        head={["Judul", "Jenis", "Penulis", "Status", "Diubah", "Dibaca"]}
        empty={rows.length === 0 && (
          <EmptyState
            icon={Newspaper}
            title="Belum ada artikel"
            desc={scope === "mine" ? "Mulai tulis liputan kegiatan atau opini; simpan sebagai draft dulu juga boleh." : undefined}
            action={scope === "mine" && <Button variant="outline" onClick={() => setCreating(true)}><Plus size={16} aria-hidden /> Tulis artikel</Button>}
          />
        )}
      >
        {rows.map((a) => (
          <tr key={a.id} className="hover:bg-slate-50/60">
            <Td>
              <Link href={`/dashboard/articles/${a.id}`} className="flex items-center gap-3">
                {a.coverUrl ? <img src={publicFile(a.coverUrl)} alt="" className="h-10 w-14 shrink-0 rounded-md object-cover" /> : <span className="grid h-10 w-14 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-400"><Newspaper size={16} aria-hidden /></span>}
                <span className="font-medium text-slate-900 hover:text-primary">{a.title}</span>
              </Link>
            </Td>
            <Td>{a.kind === "NEWS" ? <Badge tone="blue">Kabar GenBI</Badge> : <Badge tone="slate">Pribadi</Badge>}</Td>
            <Td><span className="block">{a.author.name}</span>{a.division && <span className="text-xs text-slate-500">{a.division.name}</span>}</Td>
            <Td><Badge status={a.status} /></Td>
            <Td className="whitespace-nowrap text-slate-500">{fmtRelative(a.updatedAt)}</Td>
            <Td className="text-slate-500 tabular-nums">{a.status === "PUBLISHED" ? a.viewCount : "–"}</Td>
          </tr>
        ))}
      </Table>
      <Dialog open={creating} onClose={() => setCreating(false)} title="Artikel baru" size="sm"
        footer={<><Button variant="ghost" onClick={() => setCreating(false)}>Batal</Button><Button type="submit" form="new-article" loading={create.isPending}>Mulai menulis</Button></>}>
        <form id="new-article" className="grid gap-3" onSubmit={(e) => { e.preventDefault(); create.mutate(String(new FormData(e.currentTarget).get("title"))); }}>
          <Field label="Judul"><Input name="title" required minLength={3} autoFocus placeholder="Seminar literasi keuangan di 3 kampus" /></Field>
          {canNews && (
            <div className="grid grid-cols-2 gap-2">
              {([["PERSONAL", "Artikel pribadi", "Opini & cerita"], ["NEWS", "Kabar GenBI", "Berita kegiatan resmi"]] as const).map(([k, t, d]) => (
                <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k} className={`rounded-lg border p-3 text-left ${kind === k ? "border-blue-300 bg-blue-50/50" : "border-slate-200"}`}>
                  <span className="block text-[13px] font-medium">{t}</span><span className="text-xs text-slate-500">{d}</span>
                </button>
              ))}
            </div>
          )}
          <ErrorText error={create.error} />
        </form>
      </Dialog>
    </>
  );
}

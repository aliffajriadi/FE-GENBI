"use client";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Trash2 } from "lucide-react";
import { useToast } from "@/components/toast";
import { Button, Card, EmptyState, ErrorText, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { answerText, download, hasOptions, toCsv } from "@/lib/forms";
import { type Form, type Resp, timeFmt } from "../_lib";

export function Responses({ form }: { form: Form }) {
  const qc = useQueryClient();
  const toast = useToast();
  const list = useQuery({ queryKey: ["form", form.id, "responses"], queryFn: () => api<Resp[]>(`/forms/${form.id}/responses`) });
  const del = useMutation({
    mutationFn: (rid: string) => api(`/form-responses/${rid}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["form", form.id] }); toast("Respons dihapus"); },
    onError: (e) => toast(e.message, { error: true }),
  });
  const rows = list.data ?? [];
  const members = form.audience === "MEMBERS";

  // Hitung jumlah per opsi untuk pertanyaan pilihan.
  const counts = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    for (const q of form.questions) if (hasOptions(q.type)) m.set(q.id, new Map((q.options ?? []).map((o) => [o, 0])));
    for (const r of rows) for (const [qid, c] of m) for (const v of [r.answers[qid] ?? []].flat()) c.set(v, (c.get(v) ?? 0) + 1);
    return m;
  }, [rows, form.questions]);

  const exportCsv = () => {
    const head = ["Waktu", ...(members ? ["Nama", "Email"] : []), ...form.questions.map((q) => q.label)];
    const body = rows.map((r) => [timeFmt.format(new Date(r.createdAt)), ...(members ? [r.user?.name ?? "(akun dihapus)", r.user?.email ?? ""] : []), ...form.questions.map((q) => answerText(r.answers[q.id]))]);
    download(`${form.slug}-respons.csv`, toCsv([head, ...body]));
  };

  if (list.isLoading) return <Skeleton className="h-60 rounded-xl" />;
  if (list.error) return <ErrorText error={list.error} />;
  if (!rows.length) return <EmptyState icon={Download} title="Belum ada respons" desc="Bagikan link form; jawaban akan muncul di sini." />;

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[13.5px] text-slate-600"><b className="text-slate-900 tabular-nums">{rows.length}</b> respons</p>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download size={13} aria-hidden /> Unduh CSV (Excel)</Button>
      </div>

      {/* Ringkasan per pertanyaan */}
      {form.questions.map((q) => {
        const c = counts.get(q.id);
        const texts = c ? [] : rows.map((r) => answerText(r.answers[q.id])).filter(Boolean);
        return (
          <Card key={q.id} className="p-4">
            <p className="text-[14px] font-medium text-slate-900">{q.label}</p>
            {c ? (
              <ul className="mt-3 grid gap-2">
                {[...c].map(([opt, n]) => (
                  <li key={opt} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-[13px]">
                    <span className="truncate text-slate-700">{opt}</span>
                    <span className="text-slate-500 tabular-nums">{n} · {Math.round((n / rows.length) * 100)}%</span>
                    <span className="col-span-2 h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-primary/80" style={{ width: `${(n / rows.length) * 100}%` }} /></span>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <p className="mt-1 text-xs text-slate-500">{texts.length} jawaban</p>
                <ul className="mt-2 grid max-h-60 gap-1 overflow-y-auto">
                  {texts.map((t, i) => <li key={i} className="rounded-md bg-slate-50 px-2.5 py-1.5 text-[13px] whitespace-pre-wrap break-words text-slate-700">{t}</li>)}
                </ul>
              </>
            )}
          </Card>
        );
      })}

      {/* Semua respons */}
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[600px] text-left text-[13px]">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium whitespace-nowrap">Waktu</th>
              {members && <th className="px-3 py-2 font-medium">Nama</th>}
              {form.questions.map((q) => <th key={q.id} className="max-w-48 truncate px-3 py-2 font-medium" title={q.label}>{q.label}</th>)}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className="align-top hover:bg-slate-50/60">
                <td className="px-3 py-2 whitespace-nowrap text-slate-500">{timeFmt.format(new Date(r.createdAt))}</td>
                {members && <td className="px-3 py-2 whitespace-nowrap text-slate-800">{r.user?.name ?? "(akun dihapus)"}</td>}
                {form.questions.map((q) => <td key={q.id} className="max-w-64 px-3 py-2 break-words text-slate-700">{answerText(r.answers[q.id]) || <span className="text-slate-300">–</span>}</td>)}
                <td className="px-2 py-1.5"><button onClick={() => confirm("Hapus respons ini?") && del.mutate(r.id)} className="rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-red-600" aria-label="Hapus respons"><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

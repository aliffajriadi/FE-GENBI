"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, ShieldOff } from "lucide-react";
import { useConfirm } from "@/components/confirm";
import { useToast } from "@/components/toast";
import { Button, Card, CardHeader, EmptyState, Input } from "@/components/ui";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";

type Blocked = { ip: string; note: string; createdAt: string };

// Dipakai juga oleh tombol "Blokir" di tabel IP teratas.
export const useBlockedIps = () => useQuery({ queryKey: ["blocked-ips"], queryFn: () => api<Blocked[]>("/system/blocked-ips") });

export function useBlockIp() {
  const qc = useQueryClient();
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const block = useMutation({
    mutationFn: (body: { ip: string; note?: string }) => api("/system/blocked-ips", { method: "POST", body }),
    onSuccess: (_, b) => { qc.invalidateQueries({ queryKey: ["blocked-ips"] }); toast(`IP ${b.ip} diblokir`); },
    onError: (e) => toast(e.message, { error: true }),
  });
  const ask = async (ip: string, note = "", onDone?: () => void) => {
    if (await confirm({ title: `Blokir ${ip}?`, desc: "Semua request dari IP ini akan ditolak, termasuk login. Kalau beberapa orang memakai jaringan yang sama (wifi kampus/kos), mereka ikut terblokir.", confirmLabel: "Blokir", danger: true }))
      block.mutate({ ip, note }, { onSuccess: onDone });
  };
  return { ask, block, confirmDialog };
}

export function Blocklist() {
  const qc = useQueryClient();
  const toast = useToast();
  const { ask, block, confirmDialog } = useBlockIp();
  const q = useBlockedIps();
  const unblock = useMutation({
    mutationFn: (ip: string) => api(`/system/blocked-ips/${encodeURIComponent(ip)}`, { method: "DELETE" }),
    onSuccess: (_, ip) => { qc.invalidateQueries({ queryKey: ["blocked-ips"] }); toast(`Blokir ${ip} dibuka`); },
    onError: (e) => toast(e.message, { error: true }),
  });
  const rows = q.data ?? [];

  return (
    <Card>
      <CardHeader icon={Ban} title="IP diblokir" desc="Request dari IP ini langsung ditolak (403)." />
      <form className="flex flex-wrap gap-2 border-b border-slate-100 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
          const form = e.currentTarget;
          void ask(f.ip.trim(), f.note.trim(), () => form.reset());
        }}
      >
        <Input name="ip" placeholder="Alamat IP, mis. 103.10.20.30" aria-label="Alamat IP" required className="min-w-0 flex-1 basis-48 font-mono" />
        <Input name="note" placeholder="Catatan (opsional)" aria-label="Catatan" maxLength={200} className="min-w-0 flex-1 basis-48" />
        <Button type="submit" variant="danger" loading={block.isPending}>Blokir</Button>
      </form>
      {rows.length === 0 && !q.isLoading ? (
        <EmptyState icon={ShieldOff} title="Belum ada IP diblokir" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.ip} className="flex items-center justify-between gap-3 px-5 py-3">
              <span className="min-w-0">
                <span className="block font-mono text-[13px] font-medium">{r.ip}</span>
                <span className="block truncate text-xs text-slate-500">{[r.note, fmtDate(r.createdAt)].filter(Boolean).join(" · ")}</span>
              </span>
              <Button variant="outline" size="sm" loading={unblock.isPending && unblock.variables === r.ip} onClick={() => unblock.mutate(r.ip)}>Buka blokir</Button>
            </li>
          ))}
        </ul>
      )}
      {confirmDialog}
    </Card>
  );
}

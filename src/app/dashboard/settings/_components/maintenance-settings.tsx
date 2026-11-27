"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Wrench } from "lucide-react";
import { useToast } from "@/components/toast";
import { Button, Card, CardHeader, Switch, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { MAINTENANCE_MENUS, menuKey, type Maintenance } from "@/lib/maintenance";
import { NAV } from "@/lib/nav";

const MENUS = NAV.flatMap((s) => s.items).filter((i) => MAINTENANCE_MENUS.includes(menuKey(i.href)));

// System Administrator menandai menu yang sedang maintenance + pesan untuk anggota (web & aplikasi mobile).
export function MaintenanceSettings() {
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["maintenance"], queryFn: () => api<Maintenance>("/public/maintenance") });
  const [d, setD] = useState<Map<string, string> | null>(null);
  useEffect(() => { if (q.data && !d) setD(new Map(q.data.menus.map((m) => [m.key, m.message]))); }, [q.data, d]);
  const save = useMutation({
    mutationFn: (m: Map<string, string>) => api("/maintenance", { method: "PUT", body: { menus: [...m].map(([key, message]) => ({ key, message })) } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["maintenance"] }); toast("Disimpan. Anggota melihat perubahan dalam beberapa menit."); },
    onError: (e) => toast(e.message, { error: true }),
  });
  if (!d) return <Card className="p-6"><Loader2 className="animate-spin text-slate-400" aria-hidden /></Card>;
  const set = (key: string, msg: string | null) => setD((p) => { const n = new Map(p); if (msg === null) n.delete(key); else n.set(key, msg); return n; });

  return (
    <Card className="max-w-3xl">
      <CardHeader icon={Wrench} title="Maintenance menu" desc="Menu yang dinyalakan tidak bisa dibuka anggota di web & aplikasi. Kamu sebagai admin tetap bisa membukanya." />
      <form className="grid gap-3 p-5" onSubmit={(e) => { e.preventDefault(); save.mutate(d); }}>
        {MENUS.map((m) => {
          const key = menuKey(m.href);
          const on = d.has(key);
          return (
            <div key={key} className="grid gap-2">
              <Switch checked={on} onChange={(v) => set(key, v ? "" : null)} label={m.label} description={on ? "Sedang maintenance" : undefined} />
              {on && <Textarea value={d.get(key)} onChange={(e) => set(key, e.target.value)} maxLength={300} rows={2} placeholder="Info untuk anggota, mis. Fitur kas sedang diperbaiki sampai pukul 20.00 WIB." aria-label={`Pesan maintenance ${m.label}`} />}
            </div>
          );
        })}
        <div className="flex justify-end pt-2"><Button type="submit" loading={save.isPending}>Simpan</Button></div>
      </form>
    </Card>
  );
}

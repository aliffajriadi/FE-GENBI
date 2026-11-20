"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Lock } from "lucide-react";
import { useToast } from "@/components/toast";
import { Button, Card, CardHeader, cx } from "@/components/ui";
import { api } from "@/lib/api";
import { type Perm, type Role } from "../_lib";

export function Roles() {
  const qc = useQueryClient();
  const toast = useToast();
  const roles = useQuery({ queryKey: ["roles"], queryFn: () => api<Role[]>("/roles") });
  const perms = useQuery({ queryKey: ["permissions"], queryFn: () => api<Perm[]>("/permissions") });
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const save = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) => api(`/roles/${id}/permissions`, { method: "PATCH", body: { permissions } }),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      setDraft(({ [v.id]: _x, ...rest }) => rest);
      toast("Hak akses role diperbarui");
    },
    onError: (e) => toast(e.message, { error: true }),
  });
  const list = roles.data ?? [];
  const value = (r: Role) => draft[r.id] ?? r.permissions;
  const toggle = (r: Role, k: string) => setDraft((d) => ({ ...d, [r.id]: value(r).includes(k) ? value(r).filter((x) => x !== k) : [...value(r), k] }));

  return (
    <Card className="overflow-hidden">
      <CardHeader title="Matriks hak akses" desc="Centang permission untuk tiap role. Pengecekan juga dilakukan di server, bukan cuma menyembunyikan tombol." />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-slate-50/70 text-xs text-slate-500">
            <tr className="border-b border-slate-100">
              <th scope="col" className="sticky left-0 bg-slate-50 px-5 py-2.5 font-medium">Permission</th>
              {list.map((r) => <th key={r.id} scope="col" className="px-3 py-2.5 text-center font-medium whitespace-nowrap">{r.name}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {perms.data?.map((p) => (
              <tr key={p.key} className="hover:bg-slate-50/60">
                <th scope="row" className="sticky left-0 bg-white px-5 py-2 text-left font-normal">
                  <span className="block text-slate-900">{p.label}</span>
                  <span className="font-mono text-[11px] text-slate-400">{p.key}</span>
                </th>
                {list.map((r) => {
                  const on = value(r).includes(p.key);
                  const locked = r.key === "SYS_ADMIN";
                  return (
                    <td key={r.id} className="px-3 py-2 text-center">
                      <button
                        disabled={locked}
                        onClick={() => toggle(r, p.key)}
                        aria-pressed={on}
                        aria-label={`${p.label} untuk ${r.name}`}
                        className={cx("inline-grid size-6 place-items-center rounded-md border transition", on ? "border-primary bg-primary text-white" : "border-slate-300 bg-white hover:border-slate-400", locked && "opacity-60")}
                      >
                        {on && (locked ? <Lock size={11} /> : <Check size={13} strokeWidth={3} />)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50/60">
              <td className="sticky left-0 bg-slate-50 px-5 py-3 text-xs text-slate-500">Simpan per role</td>
              {list.map((r) => (
                <td key={r.id} className="px-3 py-3 text-center">
                  {draft[r.id] && <Button size="sm" loading={save.isPending && save.variables?.id === r.id} onClick={() => save.mutate({ id: r.id, permissions: draft[r.id] })}>Simpan</Button>}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

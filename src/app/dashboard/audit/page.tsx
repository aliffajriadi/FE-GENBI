"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, History } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { Avatar, Button, EmptyState, PageHeader, Select, Table, Td } from "@/components/ui";
import { apiPage } from "@/lib/api";
import { fmtDate, fmtRelative } from "@/lib/format";

type Log = { id: string; action: string; entity: string; entityId: string | null; before: unknown; after: unknown; ip: string | null; createdAt: string; actor: { name: string } | null };

const ACTION_LABEL: Record<string, string> = {
  "user.create": "Membuat akun",
  "user.update": "Mengubah data anggota",
  "user.role_change": "Mengubah role",
  "user.reset_device": "Reset perangkat",
  "user.delete": "Menghapus akun",
  "user.change_password": "Mengganti password",
  "role.permissions": "Mengubah hak akses role",
  "attendance.manual": "Input absensi manual",
  "attendance.close": "Menutup absensi",
  "points.adjust": "Memberi/koreksi poin",
  "pointRule.create": "Membuat aturan poin",
  "pointRule.update": "Mengubah aturan poin",
  "pointRule.deactivate": "Menonaktifkan aturan poin",
  "leave.decide": "Memutuskan izin",
  "event.create": "Membuat kegiatan",
  "event.update": "Mengubah kegiatan",
  "event.delete": "Menghapus kegiatan",
  "division.create": "Membuat divisi",
  "division.update": "Mengubah divisi",
  "period.create": "Membuat periode",
  "period.activate": "Mengaktifkan periode",
};

export default function AuditPage() {
  const [entity, setEntity] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Log | null>(null);
  const q = useQuery({
    queryKey: ["audit", entity, page],
    queryFn: () => apiPage<Log[]>(`/audit-logs?page=${page}&limit=25${entity ? `&entity=${entity}` : ""}`),
    placeholderData: (p) => p,
  });
  const rows = q.data?.data ?? [];
  const pages = Math.max(1, Math.ceil((q.data?.meta.total ?? 0) / 25));

  return (
    <>
      <PageHeader title="Audit log" desc="Jejak semua aksi sensitif: ubah role, absensi manual, koreksi poin, dan lainnya." />
      <Table
        loading={q.isLoading}
        toolbar={
          <Select value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} className="w-full sm:w-48" aria-label="Filter entitas">
            <option value="">Semua entitas</option>
            {["User", "Role", "Event", "Attendance", "PointLedger", "PointRule", "LeaveRequest", "Division", "Period"].map((e) => <option key={e}>{e}</option>)}
          </Select>
        }
        head={["Aksi", "Oleh", "Entitas", "Waktu", ""]}
        empty={rows.length === 0 && <EmptyState icon={History} title="Belum ada aktivitas" />}
        footer={pages > 1 && (
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="icon" className="size-7" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Sebelumnya"><ChevronLeft size={14} /></Button>
            <span className="tabular-nums">{page} / {pages}</span>
            <Button variant="outline" size="icon" className="size-7" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Berikutnya"><ChevronRight size={14} /></Button>
          </div>
        )}
      >
        {rows.map((l) => (
          <tr key={l.id} className="hover:bg-slate-50/60">
            <Td className="font-medium">{ACTION_LABEL[l.action] ?? l.action}</Td>
            <Td><span className="flex items-center gap-2"><Avatar name={l.actor?.name ?? "Sistem"} size={24} />{l.actor?.name ?? "Sistem"}</span></Td>
            <Td><span className="font-mono text-xs text-slate-500">{l.entity}</span></Td>
            <Td className="text-slate-500" title={fmtDate(l.createdAt)}>{fmtRelative(l.createdAt)}</Td>
            <Td className="text-right">{(l.before != null || l.after != null) && <Button variant="ghost" size="sm" onClick={() => setOpen(l)}>Detail</Button>}</Td>
          </tr>
        ))}
      </Table>
      <Dialog open={!!open} onClose={() => setOpen(null)} title={open ? ACTION_LABEL[open.action] ?? open.action : ""} desc={open ? `${open.actor?.name ?? "Sistem"} · ${fmtDate(open.createdAt)}${open.ip ? ` · IP ${open.ip}` : ""}` : ""} size="lg">
        {open && (
          <div className="grid gap-4 sm:grid-cols-2">
            {(["before", "after"] as const).map((k) => (
              <div key={k}>
                <p className="mb-1.5 text-xs font-medium text-slate-500">{k === "before" ? "Sebelum" : "Sesudah"}</p>
                <pre className="max-h-80 overflow-auto rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-700">{open[k] == null ? "–" : JSON.stringify(open[k], null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </>
  );
}

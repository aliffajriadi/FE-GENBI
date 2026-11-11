"use client";
import Link from "next/link";
import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, ChevronRight, GraduationCap, Mail, MoreHorizontal, Pencil, Phone, Smartphone, Trophy, UserX } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { MemberForm } from "@/components/member-form";
import { Menu, MenuItem } from "@/components/menu";
import { useToast } from "@/components/toast";
import { Avatar, Badge, Button, Card, CardHeader, cx, ErrorText, Skeleton, StatCard } from "@/components/ui";
import { api } from "@/lib/api";
import { EVENT_TYPE_LABEL, fmtDate } from "@/lib/format";
import type { AttStatus, Ledger } from "@/lib/types";
import { useMe } from "@/lib/use-me";

type Detail = {
  id: string; name: string; email: string; avatarUrl: string | null; nim: string | null; phone: string | null; campus: string | null; major: string | null; batch: string | null;
  status: string; deviceId: string | null;
  memberships: { id: string; position: string | null; periodId: string; role: { key: string; name: string }; division: { id: string; name: string } | null; period: { name: string; isActive: boolean } }[];
  points: { total: number; history: Ledger[] };
  attendance: { id: string; status: AttStatus; method: string; scannedAt: string; event: { id: string; title: string; type: string; startAt: string } }[];
};

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const toast = useToast();
  const { me, can } = useMe();
  const [editing, setEditing] = useState(false);
  const q = useQuery({ queryKey: ["user", id], queryFn: () => api<Detail>(`/users/${id}`) });
  const refresh = () => qc.invalidateQueries({ predicate: (x) => x.queryKey[0] === "user" || x.queryKey[0] === "users" });
  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) => api(`/users/${id}`, { method: "PATCH", body }),
    onSuccess: (_, b) => { refresh(); toast(b.resetDevice ? "Perangkat direset. Scan berikutnya mengikat perangkat baru." : "Status anggota diperbarui"); },
    onError: (e) => toast(e.message, { error: true }),
  });

  if (q.isLoading) return <div className="space-y-4"><Skeleton className="h-20" /><Skeleton className="h-28" /><Skeleton className="h-72" /></div>;
  if (!q.data) return <ErrorText error={q.error} />;
  const u = q.data;
  const current = u.memberships.find((m) => m.period.isActive);
  const att = u.attendance;
  const present = att.filter((a) => a.status === "HADIR" || a.status === "TELAT").length;
  const manage = can("user.manage");

  return (
    <>
      <nav className="mb-4 flex items-center gap-1 text-[13px] text-slate-500" aria-label="Breadcrumb">
        <Link href="/dashboard/members" className="hover:text-slate-900">Anggota</Link>
        <ChevronRight size={14} aria-hidden />
        <span className="text-slate-900">{u.name}</span>
      </nav>

      <Card className="mb-6 p-6">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar name={u.name} src={u.avatarUrl} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{u.name}</h1>
              <Badge status={u.status} />
            </div>
            <p className="mt-0.5 text-slate-600">{current ? `${current.position ?? current.role.name}${current.division ? ` · ${current.division.name}` : ""}` : "Tidak menjabat di periode aktif"}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-slate-500">
              <span className="flex items-center gap-1.5"><Mail size={14} aria-hidden /> {u.email}</span>
              {u.phone && <span className="flex items-center gap-1.5"><Phone size={14} aria-hidden /> {u.phone}</span>}
              {(u.campus || u.nim) && <span className="flex items-center gap-1.5"><GraduationCap size={14} aria-hidden /> {[u.nim, u.campus, u.major, u.batch].filter(Boolean).join(" · ")}</span>}
              <span className="flex items-center gap-1.5"><Smartphone size={14} aria-hidden /> {u.deviceId ? "Perangkat terikat" : "Belum ada perangkat"}</span>
            </div>
          </div>
          {manage && (
            <div className="flex gap-2">
              <Link href={`/dashboard/people/${u.id}`}><Button variant="ghost">Lihat profil</Button></Link>
              <Button variant="outline" onClick={() => setEditing(true)}><Pencil size={14} aria-hidden /> Ubah</Button>
              {u.id !== me?.id && (
                <Menu trigger={() => <Button variant="outline" size="icon" aria-label="Aksi lain"><MoreHorizontal size={16} /></Button>}>
                  {u.deviceId && <MenuItem icon={Smartphone} onClick={() => patch.mutate({ resetDevice: true })}>Reset perangkat</MenuItem>}
                  <MenuItem icon={UserX} danger={u.status === "ACTIVE"} onClick={() => patch.mutate({ status: u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })}>
                    {u.status === "ACTIVE" ? "Nonaktifkan akun" : "Aktifkan akun"}
                  </MenuItem>
                </Menu>
              )}
            </div>
          )}
        </div>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Poin periode ini" value={u.points.total} icon={Trophy} />
        <StatCard label="Kehadiran" value={att.length ? `${Math.round((present / att.length) * 100)}%` : "–"} icon={CalendarCheck} tone="green" hint={`${present} dari ${att.length} kegiatan`} />
        <StatCard label="Alpa" value={att.filter((a) => a.status === "ALPA").length} icon={UserX} tone="red" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Riwayat kehadiran" />
          <ul className="max-h-[480px] divide-y divide-slate-100 overflow-y-auto">
            {att.length === 0 && <li className="px-5 py-8 text-center text-[13px] text-slate-500">Belum ada riwayat.</li>}
            {att.map((a) => (
              <li key={a.id}>
                <Link href={`/dashboard/events/${a.event.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50/80">
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">{a.event.title}</span>
                    <span className="text-xs text-slate-500">{EVENT_TYPE_LABEL[a.event.type]} · {fmtDate(a.event.startAt)}</span>
                  </span>
                  <Badge status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Riwayat poin" />
          <ul className="max-h-[480px] divide-y divide-slate-100 overflow-y-auto">
            {u.points.history.length === 0 && <li className="px-5 py-8 text-center text-[13px] text-slate-500">Belum ada poin.</li>}
            {u.points.history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium">{h.note}</span>
                  <span className="text-xs text-slate-500">{fmtDate(h.createdAt)}</span>
                </span>
                <span className={cx("rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums", h.points < 0 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700")}>{h.points > 0 ? `+${h.points}` : h.points}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {u.memberships.length > 1 && (
        <Card className="mt-6">
          <CardHeader title="Riwayat jabatan" />
          <ul className="divide-y divide-slate-100">
            {u.memberships.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-5 py-3 text-[13px]">
                <span>{m.position ?? m.role.name}{m.division ? ` · ${m.division.name}` : ""}</span>
                <span className="text-slate-500">{m.period.name}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Dialog open={editing} onClose={() => setEditing(false)} variant="sheet" title="Ubah data anggota" desc="Perubahan role akan mengeluarkan anggota dari semua sesi login.">
        {editing && (
          <MemberForm
            isAdmin={me?.role === "SYS_ADMIN"}
            member={{ ...u, role: current?.role.key, position: current?.position, division: current?.division }}
            onCancel={() => setEditing(false)}
            onDone={() => { setEditing(false); refresh(); }}
          />
        )}
      </Dialog>
    </>
  );
}

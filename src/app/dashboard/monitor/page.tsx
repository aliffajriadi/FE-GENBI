"use client";
import { useQuery } from "@tanstack/react-query";
import { Activity, Cpu, Database, HardDrive, MemoryStick, Radio } from "lucide-react";
import { Button, Card, CardHeader, EmptyState, ErrorText, PageHeader, Progress, Skeleton, StatCard, Table, Td } from "@/components/ui";
import { api } from "@/lib/api";
import { Blocklist, useBlockedIps, useBlockIp } from "./_components/blocklist";

type Row = { key: string; count: number; bytes: number; avgMs: number; errors: number };
type Monitor = {
  host: { hostname: string; platform: string; node: string; uptime: number; cpus: number; loadavg: number[] };
  cpu: number;
  memory: { total: number; free: number; processRss: number; heapUsed: number };
  disk: { total: number; free: number };
  dbSize: number | null;
  process: { uptime: number };
  online: number;
  traffic: { count: number; bytesIn: number; bytesOut: number; errors: number; status: Record<string, number>; minutes: { t: number; count: number; bytesOut: number; errors: number }[] };
  topUsers: (Row & { user: { name: string; email: string | null; nim: string | null } | null })[];
  topIps: Row[];
  topRoutes: Row[];
};

const bytes = (n: number) => {
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = n > 0 ? Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024))) : 0;
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
};
const duration = (s: number) => {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d ? `${d} hari ${h} jam` : h ? `${h} jam ${m} mnt` : `${m} mnt`;
};
const tone = (pct: number) => (pct >= 90 ? "red" : pct >= 75 ? "amber" : "green");

function Meter({ label, used, total, icon: Icon }: { label: string; used: number; total: number; icon: typeof Cpu }) {
  const pct = total ? (used / total) * 100 : 0;
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between text-[13px]">
        <span className="flex items-center gap-2 font-medium text-slate-600"><Icon size={15} aria-hidden /> {label}</span>
        <span className="font-semibold tabular-nums">{Math.round(pct)}%</span>
      </div>
      <Progress value={pct} tone={tone(pct)} />
      <p className="mt-2 text-xs text-slate-500">{bytes(used)} terpakai · sisa {bytes(total - used)} dari {bytes(total)}</p>
    </Card>
  );
}

function TopTable({ title, rows, label, action }: { title: string; rows: Row[]; label: (r: Row) => React.ReactNode; action?: (r: Row) => React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-[14px] font-semibold">{title}</h2>
      <Table head={["", "Request", "Data keluar", "Rata-rata", "Error", ...(action ? [""] : [])]} hideOnMobile={[2, 3]} empty={rows.length === 0 && <EmptyState icon={Activity} title="Belum ada request" />}>
        {rows.map((r) => (
          <tr key={r.key}>
            <Td className="max-w-[260px] truncate text-[13px]">{label(r)}</Td>
            <Td className="tabular-nums">{r.count.toLocaleString("id-ID")}</Td>
            <Td className="tabular-nums">{bytes(r.bytes)}</Td>
            <Td className="tabular-nums">{r.avgMs} ms</Td>
            <Td className={r.errors ? "font-semibold text-red-600 tabular-nums" : "text-slate-400 tabular-nums"}>{r.errors}</Td>
            {action && <Td className="text-right">{action(r)}</Td>}
          </tr>
        ))}
      </Table>
    </div>
  );
}

export default function MonitorPage() {
  const q = useQuery({ queryKey: ["system-monitor"], queryFn: () => api<Monitor>("/system/monitor"), refetchInterval: 5000 });
  const d = q.data;
  const blocked = new Set(useBlockedIps().data?.map((b) => b.ip));
  const { ask, confirmDialog } = useBlockIp();

  return (
    <>
      <PageHeader title="Monitoring server" desc={d ? `${d.host.hostname} · ${d.host.platform} · Node ${d.host.node} · server nyala ${duration(d.host.uptime)}, aplikasi ${duration(d.process.uptime)}` : "Diperbarui otomatis tiap 5 detik."} />
      {!d ? (
        q.isLoading ? <div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div> : <ErrorText error={q.error} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-2 font-medium text-slate-600"><Cpu size={15} aria-hidden /> CPU ({d.host.cpus} core)</span>
                <span className="font-semibold tabular-nums">{d.cpu}%</span>
              </div>
              <Progress value={d.cpu} tone={tone(d.cpu)} />
              <p className="mt-2 text-xs text-slate-500">Load rata-rata 1/5/15 mnt: {d.host.loadavg.map((l) => l.toFixed(2)).join(" / ")}</p>
            </Card>
            <Meter label="RAM" used={d.memory.total - d.memory.free} total={d.memory.total} icon={MemoryStick} />
            <Meter label="Storage" used={d.disk.total - d.disk.free} total={d.disk.total} icon={HardDrive} />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Total request" value={d.traffic.count.toLocaleString("id-ID")} icon={Activity} hint={`Masuk ${bytes(d.traffic.bytesIn)} · keluar ${bytes(d.traffic.bytesOut)}`} />
            <StatCard label="Error server (5xx)" value={d.traffic.errors} icon={Activity} tone={d.traffic.errors ? "red" : "green"} hint={Object.entries(d.traffic.status).sort().map(([k, v]) => `${k}: ${v}`).join(" · ")} />
            <StatCard label="Online (realtime)" value={d.online} icon={Radio} tone="green" hint="Koneksi socket aktif" />
            <StatCard label="Ukuran database" value={d.dbSize == null ? "–" : bytes(d.dbSize)} icon={Database} tone="slate" hint={`RAM aplikasi ${bytes(d.memory.processRss)}`} />
          </div>

          <Card>
            <CardHeader title="Traffic 60 menit terakhir" desc="Jumlah request per menit." />
            <Traffic minutes={d.traffic.minutes} />
          </Card>

          <TopTable title="Pengguna paling banyak request" rows={d.topUsers} label={(r) => {
            const u = (r as Monitor["topUsers"][number]).user;
            return u ? <><span className="font-medium">{u.name}</span> <span className="text-slate-500">{u.nim ?? u.email}</span></> : <span className="text-slate-500">Akun terhapus</span>;
          }} />
          <TopTable title="IP paling banyak request" rows={d.topIps} label={(r) => <span className="font-mono">{r.key}</span>}
            action={(r) => blocked.has(r.key) ? <span className="text-xs font-medium text-red-600">Diblokir</span> : <Button variant="outline" size="sm" onClick={() => ask(r.key)}>Blokir</Button>} />
          <Blocklist />
          <TopTable title="Endpoint paling sering dipanggil" rows={d.topRoutes} label={(r) => <span className="font-mono text-xs">{r.key}</span>} />
          <p className="text-xs text-slate-500">Statistik request dihitung sejak aplikasi terakhir dinyalakan dan direset saat restart.</p>
        </div>
      )}
      {confirmDialog}
    </>
  );
}

function Traffic({ minutes }: { minutes: Monitor["traffic"]["minutes"] }) {
  // Isi menit kosong supaya sumbu waktu tetap 60 batang.
  const now = Math.floor(Date.now() / 60_000) * 60_000;
  const map = new Map(minutes.map((m) => [m.t, m]));
  const bars = Array.from({ length: 60 }, (_, i) => map.get(now - (59 - i) * 60_000) ?? { t: now - (59 - i) * 60_000, count: 0, bytesOut: 0, errors: 0 });
  const max = Math.max(1, ...bars.map((b) => b.count));
  const hhmm = (t: number) => new Date(t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="p-5">
      <div className="flex h-40 items-end gap-[2px]" role="img" aria-label={`Puncak ${max} request per menit`}>
        {bars.map((b) => (
          <div key={b.t} className="group relative h-full flex-1">
            <div className={b.errors ? "absolute bottom-0 w-full rounded-t-sm bg-red-400" : "absolute bottom-0 w-full rounded-t-sm bg-primary/70 group-hover:bg-primary"} style={{ height: `${(b.count / max) * 100}%`, minHeight: b.count ? 2 : 0 }} />
            <span className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 rounded bg-slate-900 px-1.5 py-0.5 text-[11px] whitespace-nowrap text-white group-hover:block">{hhmm(b.t)} · {b.count} req · {bytes(b.bytesOut)}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-slate-500"><span>{hhmm(bars[0]!.t)}</span><span>Puncak {max}/mnt</span><span>{hhmm(now)}</span></div>
    </div>
  );
}

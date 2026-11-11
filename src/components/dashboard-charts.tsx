"use client";
import { useState } from "react";
import { cx } from "./ui";

// Grafik ringan tanpa library: 1 seri per grafik (judul kartu = nama seri, jadi tanpa legend),
// tooltip saat hover/fokus, dan tabel tersembunyi untuk pembaca layar.

const shortDate = (s: string) => new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short" });

// ───── Tren kehadiran per kegiatan (batang %, 0–100) ─────

export type TrendPoint = { id: string; title: string; startAt: string; hadir: number; telat: number; izin: number; alpa: number };

export function AttendanceTrend({ data }: { data: TrendPoint[] }) {
  const rows = data.map((d) => {
    const total = d.hadir + d.telat + d.izin + d.alpa;
    return { ...d, total, rate: total ? Math.round(((d.hadir + d.telat) / total) * 100) : 0 };
  });
  const avg = rows.length ? Math.round(rows.reduce((a, r) => a + r.rate, 0) / rows.length) : 0;
  return (
    <div>
      <p className="px-5 text-[13px] text-slate-500">
        Rata-rata <span className="font-serif text-2xl font-medium text-slate-900 tabular-nums">{avg}%</span>
      </p>
      <div className="relative mt-3 h-44 px-5">
        {/* Garis bantu tipis di 0/50/100% */}
        {[100, 50, 0].map((g) => (
          <div key={g} className="absolute inset-x-5 flex items-center gap-2" style={{ bottom: `${g}%`, transform: "translateY(50%)" }}>
            <span className="w-8 text-right text-[10px] text-slate-400 tabular-nums">{g}%</span>
            <span className={cx("h-px flex-1", g === 0 ? "bg-slate-300" : "bg-slate-100")} />
          </div>
        ))}
        <div className="absolute inset-y-0 right-5 left-[3.75rem] flex items-end gap-[2px]">
          {rows.map((r) => (
            <div key={r.id} className="group relative flex h-full flex-1 items-end justify-center outline-none" tabIndex={0} aria-label={`${r.title}: ${r.rate}% hadir`}>
              <div className="w-full max-w-9 rounded-t bg-primary/85 transition-colors group-hover:bg-primary group-focus:bg-primary" style={{ height: `${Math.max(r.rate, 1)}%` }} />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-48 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg group-hover:block group-focus:block">
                <p className="truncate font-medium text-slate-900">{r.title}</p>
                <p className="text-slate-500">{shortDate(r.startAt)} · {r.total} peserta</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-slate-600">
                  <dt>Hadir</dt><dd className="text-right tabular-nums">{r.hadir}</dd>
                  <dt>Telat</dt><dd className="text-right tabular-nums">{r.telat}</dd>
                  <dt>Izin/sakit</dt><dd className="text-right tabular-nums">{r.izin}</dd>
                  <dt>Alpa</dt><dd className="text-right tabular-nums">{r.alpa}</dd>
                </dl>
                <p className="mt-2 border-t border-slate-100 pt-1.5 font-semibold text-slate-900">{r.rate}% hadir</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex gap-[2px] pr-5 pl-[3.75rem]">
        {rows.map((r) => <span key={r.id} className="flex-1 truncate text-center text-[10px] text-slate-400">{shortDate(r.startAt)}</span>)}
      </div>
      <table className="sr-only">
        <caption>Persentase kehadiran per kegiatan</caption>
        <tbody>{rows.map((r) => <tr key={r.id}><th>{r.title}</th><td>{r.rate}%</td></tr>)}</tbody>
      </table>
    </div>
  );
}

// ───── Poin saya: akumulasi dari waktu ke waktu (garis + area) ─────

export function PointsGrowth({ history }: { history: { id: string; points: number; note: string | null; createdAt: string }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const asc = [...history].reverse();
  let sum = 0;
  const pts = asc.map((h) => ({ ...h, total: (sum += h.points) }));
  if (pts.length < 2) return <p className="px-5 pb-8 text-center text-[13px] text-slate-500">Grafik muncul setelah ada minimal 2 catatan poin.</p>;

  const W = 100, H = 100;
  const min = Math.min(0, ...pts.map((p) => p.total));
  const max = Math.max(...pts.map((p) => p.total), min + 1);
  const x = (i: number) => (i / (pts.length - 1)) * W;
  const y = (v: number) => H - ((v - min) / (max - min)) * H;
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.total)}`).join(" ");
  const h = hover == null ? null : pts[hover];
  const pick = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHover(Math.min(pts.length - 1, Math.max(0, Math.round(((e.clientX - r.left) / r.width) * (pts.length - 1)))));
  };

  return (
    <div>
      <p className="px-5 text-[13px] text-slate-500">
        Total <span className="font-serif text-2xl font-medium text-slate-900 tabular-nums">{pts.at(-1)!.total}</span> poin
      </p>
      <div
        className="relative mx-5 mt-3 h-44 touch-pan-y"
        // Pointer = mouse & sentuh: di HP ketuk/geser untuk melihat nilai, tooltip tetap tampil setelah jari diangkat.
        onPointerMove={(e) => pick(e)}
        onPointerDown={(e) => pick(e)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <line x1="0" x2={W} y1={y(0)} y2={y(0)} className="stroke-slate-300" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <path d={`${line} L${W},${y(min)} L0,${y(min)} Z`} className="fill-primary/10" />
          <path d={line} fill="none" className="stroke-primary" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {h && <line x1={x(hover!)} x2={x(hover!)} y1="0" y2={H} className="stroke-slate-300" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
        </svg>
        {h && (
          <>
            <span className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-white" style={{ left: `${x(hover!)}%`, top: `${y(h.total)}%` }} />
            <div
              className="pointer-events-none absolute top-0 z-10 w-44 rounded-lg border border-slate-200 bg-white p-2.5 text-xs shadow-lg"
              style={{ left: `${x(hover!)}%`, transform: `translateX(${hover! > pts.length / 2 ? "calc(-100% - 10px)" : "10px"})` }}
            >
              <p className="text-slate-500">{shortDate(h.createdAt)}</p>
              <p className="mt-0.5 truncate text-slate-700">{h.note}</p>
              <p className="mt-1.5 flex justify-between font-semibold text-slate-900">
                <span className="tabular-nums">{h.total} poin</span>
                <span className={cx("tabular-nums", h.points < 0 ? "text-red-600" : "text-green-700")}>{h.points > 0 ? `+${h.points}` : h.points}</span>
              </p>
            </div>
          </>
        )}
      </div>
      <div className="mx-5 mt-2 flex justify-between text-[10px] text-slate-400">
        <span>{shortDate(pts[0].createdAt)}</span>
        <span>{shortDate(pts.at(-1)!.createdAt)}</span>
      </div>
      <table className="sr-only">
        <caption>Akumulasi poin</caption>
        <tbody>{pts.map((p) => <tr key={p.id}><th>{shortDate(p.createdAt)}</th><td>{p.total}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

// ───── Komposisi kehadiran saya (bar tersegmen 100%) — warna status + label, bukan warna saja ─────

const SEG = [
  { key: "hadir", label: "Hadir", cls: "bg-green-600" },
  { key: "telat", label: "Telat", cls: "bg-amber-500" },
  { key: "izin", label: "Izin/sakit", cls: "bg-slate-400" },
  { key: "alpa", label: "Alpa", cls: "bg-red-600" },
] as const;

export function AttendanceMix({ counts }: { counts: Record<(typeof SEG)[number]["key"], number> }) {
  const total = SEG.reduce((a, s) => a + counts[s.key], 0);
  if (!total) return <p className="px-5 pb-6 text-center text-[13px] text-slate-500">Belum ada riwayat absensi.</p>;
  return (
    <div className="px-5 pb-5">
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={SEG.map((s) => `${s.label} ${counts[s.key]}`).join(", ")}>
        {SEG.filter((s) => counts[s.key]).map((s) => (
          <div key={s.key} className={s.cls} style={{ width: `${(counts[s.key] / total) * 100}%` }} title={`${s.label}: ${counts[s.key]}`} />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
        {SEG.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-[13px]">
            <span className={cx("size-2.5 shrink-0 rounded-sm", s.cls)} aria-hidden />
            <span className="flex-1 text-slate-600">{s.label}</span>
            <span className="font-medium text-slate-900 tabular-nums">{counts[s.key]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

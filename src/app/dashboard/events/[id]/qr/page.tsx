"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { ArrowLeft, Maximize } from "lucide-react";
import { api } from "@/lib/api";
import { fmtTime } from "@/lib/format";
import type { Counts } from "@/lib/types";

type Qr = { token: string; expiresAt: number; serverTime: number; counts: Counts };
const ROTATE = 20;

// Layar proyektor: QR berganti tiap 20 detik, jumlah hadir update tiap 3 detik.
export default function QrScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const event = useQuery({ queryKey: ["event", id], queryFn: () => api<{ title: string; location: string | null; lateAfter: string }>(`/events/${id}`) });
  const qr = useQuery({ queryKey: ["qr", id], queryFn: () => api<Qr>(`/events/${id}/qr-token`), refetchInterval: 3000, retry: false });
  const [img, setImg] = useState("");
  const [left, setLeft] = useState(ROTATE);

  useEffect(() => {
    if (qr.data) QRCode.toDataURL(qr.data.token, { width: 720, margin: 1, errorCorrectionLevel: "M", color: { dark: "#0f172a" } }).then(setImg);
  }, [qr.data?.token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!qr.data) return;
    const offset = qr.data.serverTime - Date.now();
    const t = setInterval(() => setLeft(Math.max(0, (qr.data!.expiresAt - (Date.now() + offset)) / 1000)), 100);
    return () => clearInterval(t);
  }, [qr.data]);

  const c = qr.data?.counts;
  const r = 15;
  const circ = 2 * Math.PI * r;
  return (
    <main className="theme-light flex min-h-dvh flex-col bg-white text-slate-900">
      <header className="flex items-center justify-between px-6 py-4">
        <Link href={`/dashboard/events/${id}`} className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-900"><ArrowLeft size={15} aria-hidden /> Kembali</Link>
        <button onClick={() => document.documentElement.requestFullscreen?.()} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] text-slate-500 hover:bg-slate-100 hover:text-slate-900">
          <Maximize size={15} aria-hidden /> Layar penuh
        </button>
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 pb-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="mx-auto w-full max-w-[min(76vh,680px)]">
          <div className="rounded-2xl border border-slate-200 p-4 shadow-sm sm:p-6">
            {qr.error ? (
              <p className="py-24 text-center text-lg text-red-600">{qr.error.message}</p>
            ) : img ? (
              <img src={img} alt="QR absensi. Scan dengan MyGenBI." className="w-full" />
            ) : (
              <div className="aspect-square w-full animate-pulse rounded-lg bg-slate-100" />
            )}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-primary">Absensi dibuka</p>
          <h1 className="mt-2 text-3xl leading-tight font-semibold tracking-tight">{event.data?.title}</h1>
          {event.data && <p className="mt-2 text-slate-500">{event.data.location ? `${event.data.location} · ` : ""}telat setelah {fmtTime(event.data.lateAfter)}</p>}

          <div className="mt-8 flex items-center gap-4 rounded-xl bg-slate-50 p-4">
            <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90" aria-hidden>
              <circle cx="20" cy="20" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
              <circle cx="20" cy="20" r={r} fill="none" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - left / ROTATE)} />
            </svg>
            <p className="text-[15px] text-slate-600">Buka MyGenBI, tekan <b className="text-slate-900">Scan</b>. QR berganti dalam <b className="text-slate-900 tabular-nums">{Math.ceil(left)}</b> detik.</p>
          </div>

          {c && (
            <dl className="mt-8 grid grid-cols-2 gap-3">
              {[
                { k: "Hadir", v: c.HADIR, cls: "text-green-700" },
                { k: "Telat", v: c.TELAT, cls: "text-amber-600" },
                { k: "Belum scan", v: c.BELUM, cls: "text-slate-900" },
                { k: "Total peserta", v: c.total, cls: "text-slate-900" },
              ].map((s) => (
                <div key={s.k} className="rounded-xl border border-slate-200 p-4">
                  <dt className="text-[13px] text-slate-500">{s.k}</dt>
                  <dd className={`mt-1 text-4xl font-semibold tracking-tight tabular-nums ${s.cls}`}>{s.v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </main>
  );
}

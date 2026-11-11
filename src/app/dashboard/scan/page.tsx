"use client";
import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CircleAlert, CircleCheck, Loader2, QrCode } from "lucide-react";
import { QrReader } from "@/components/qr-reader";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { currentPosition, deviceId } from "@/lib/device";

type Result = { ok: true; status: string; title: string } | { ok: false; message: string };
type ScanRes = { status: string; event: { title: string } };

export default function ScanPage() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function onScan(token: string) {
    setBusy(true);
    try {
      let r: ScanRes;
      try {
        r = await api<ScanRes>("/attendance/scan", { method: "POST", body: { token, deviceId: deviceId() } });
      } catch (e) {
        // Kegiatan dengan geofence: ulangi sambil kirim lokasi.
        if (!(e instanceof ApiError && e.code === "LOCATION_REQUIRED")) throw e;
        const pos = await currentPosition();
        if (!pos) throw new Error("Lokasi tidak bisa dibaca. Izinkan akses lokasi di browser.");
        r = await api<ScanRes>("/attendance/scan", { method: "POST", body: { token, deviceId: deviceId(), ...pos } });
      }
      setResult({ ok: true, status: r.status, title: r.event.title });
      qc.invalidateQueries({ predicate: (q) => ["dashboard", "events", "points-me", "attendance-me"].includes(q.queryKey[0] as string) });
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : "Gagal" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Scan absensi" desc="Arahkan kamera ke QR yang ditampilkan panitia. Bisa juga dari HP lewat MyGenBI." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,440px)_1fr]">
        <Card className="overflow-hidden p-3">
          <div className="relative">
            <QrReader onResult={onScan} paused={busy || result?.ok} />
            {busy && (
              <div className="absolute inset-0 grid place-items-center rounded-lg bg-slate-900/50 text-white">
                <span className="flex items-center gap-2 text-sm"><Loader2 size={16} className="animate-spin" aria-hidden /> Memproses…</span>
              </div>
            )}
          </div>
        </Card>

        <div aria-live="polite">
          {!result && (
            <Card className="flex items-start gap-4 p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500"><QrCode size={20} aria-hidden /></span>
              <div>
                <p className="font-medium">Menunggu QR</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] text-slate-500">
                  <li>QR berganti tiap 20 detik; scan yang sedang tampil.</li>
                  <li>Akun terikat ke satu perangkat. Ganti HP? Minta reset ke Sekretaris.</li>
                  <li>Beberapa kegiatan meminta izin lokasi.</li>
                </ul>
              </div>
            </Card>
          )}
          {result?.ok && (
            <Card className="border-green-200 p-6 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-green-50 text-green-600"><CircleCheck size={30} aria-hidden /></span>
              <p className="mt-4 text-lg font-semibold">Absen tercatat</p>
              <p className="mt-1 text-slate-500">{result.title}</p>
              <div className="mt-3"><Badge status={result.status} /></div>
              <div className="mt-6 flex justify-center gap-2">
                <Link href="/dashboard"><Button variant="outline">Ke dashboard</Button></Link>
                <Button onClick={() => setResult(null)}>Scan lagi</Button>
              </div>
            </Card>
          )}
          {result && !result.ok && (
            <Card className="flex items-start gap-4 border-red-200 p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-600"><CircleAlert size={20} aria-hidden /></span>
              <div>
                <p className="font-medium text-red-700">Absen gagal</p>
                <p className="mt-1 text-[13px] text-slate-600">{result.message}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setResult(null)}>Coba lagi</Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

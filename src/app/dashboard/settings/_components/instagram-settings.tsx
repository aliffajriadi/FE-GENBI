"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, Instagram, Loader2 } from "lucide-react";
import { useToast } from "@/components/toast";
import { Button, Card, cx, Field, Input } from "@/components/ui";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { type IgStatus } from "../_lib";

// Instagram di landing page lewat "Instagram API with Unified Login" (Meta). Persiapan di Meta, sisanya di sini.
function Copy({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <span className="mt-1.5 flex items-center gap-2">
      <code className="min-w-0 flex-1 rounded bg-slate-100 px-2 py-1.5 break-all">{value}</code>
      <Button type="button" size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); }}>{done ? "Tersalin" : "Salin"}</Button>
    </span>
  );
}

export function InstagramSettings() {
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ["ig-status"], queryFn: () => api<IgStatus>("/instagram/status") });
  const [form, setForm] = useState<{ appId: string; configId: string } | null>(null);
  const [secret, setSecret] = useState("");
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("ig");
    if (!r) return;
    const msg: Record<string, string> = {
      ok: "Instagram terhubung dan postingan sudah diambil.",
      denied: "Login dibatalkan.",
      invalid: "Sesi login kedaluwarsa, coba lagi.",
      error: "Gagal menghubungkan. Pastikan saat login Anda memilih business portfolio dan akun Instagram GenBI, lalu redirect URL sama persis.",
    };
    toast(msg[r] ?? msg.error, { error: r !== "ok" });
    window.history.replaceState(null, "", "/dashboard/settings");
  }, [toast]);
  const s = q.data;
  const f = form ?? { appId: s?.appId ?? "", configId: s?.configId ?? "" };
  const saveApp = useMutation({
    mutationFn: () => api("/instagram/app", { method: "PUT", body: { appId: f.appId.trim(), configId: f.configId.trim(), appSecret: secret.trim() } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ig-status"] }); setSecret(""); setForm(null); toast("Pengaturan aplikasi Meta tersimpan"); },
    onError: (e) => toast(e.message, { error: true }),
  });
  const connect = useMutation({
    mutationFn: () => api<{ url: string }>("/instagram/connect"),
    onSuccess: ({ url }) => { window.location.href = url; },
    onError: (e) => toast(e.message, { error: true }),
  });
  const refresh = useMutation({
    mutationFn: () => api("/instagram/refresh", { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ig-status"] }); toast("Postingan diperbarui"); },
    onError: (e) => toast(e.message, { error: true }),
  });
  const disconnect = useMutation({
    mutationFn: () => api("/instagram", { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ig-status"] }); toast("Instagram diputus. Bagian Instagram hilang dari landing page."); },
  });
  if (!s) return <Card className="p-6"><Loader2 className="animate-spin text-slate-400" aria-hidden /></Card>;
  const ready = !!s.appId && !!s.configId && s.hasSecret;
  const step = (n: number, done: boolean) => <span className={cx("grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold", done ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600")}>{done ? <Check size={13} aria-hidden /> : n}</span>;

  return (
    <div className="grid max-w-3xl gap-6">
      {/* 1. Persiapan di Meta (tidak bisa dari web ini) */}
      <Card className="p-5">
        <div className="flex gap-3">
          {step(1, ready)}
          <div className="min-w-0 flex-1 text-[13.5px] text-slate-600">
            <p className="text-[15px] font-semibold text-slate-900">Siapkan di Meta</p>
            <p className="mt-1 text-[13px] text-slate-500">Memakai <i>Instagram API with Unified Login</i>. Langkah ini harus dilakukan di Instagram dan Meta.</p>
            <ol className="mt-3 grid list-decimal gap-2.5 pl-4">
              <li>Akun Instagram GenBI harus akun <b>Professional</b> (Bisnis/Kreator) dan masuk ke sebuah <b>business portfolio</b> di <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">business.facebook.com</a>. Aplikasi Meta juga harus dimiliki business portfolio itu.</li>
              <li>Di <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">developers.facebook.com/apps</a>, buka aplikasi GenBI → produk Instagram → tab <b>API setup with Unified login</b>.</li>
              <li>Tambahkan redirect URL (OAuth) ini:<Copy value={s.redirectUri} />
                {s.redirectUri.startsWith("http://") && <span className="mt-1 block text-[12.5px] text-amber-700">Meta mewajibkan https. Pastikan nginx mengirim <code>X-Forwarded-Proto</code>, atau isi <code>API_PUBLIC_URL</code> di .env backend.</span>}
              </li>
              <li>Bila diminta webhook, isi Callback URL dan Verify token ini (kita tidak memakai isinya, hanya untuk syarat setup):<Copy value={s.webhookUrl} /><Copy value={s.webhookVerifyToken} /></li>
              <li>Buat <b>konfigurasi</b> (Facebook Login for Business → Configurations): jenis token <b>System-user access token (SUAT)</b>, masa berlaku token <b>tidak kedaluwarsa</b> bila tersedia, aset <b>akun Instagram</b>, dan izin minimal <code>instagram_basic</code>. Salin <b>Config ID</b>-nya.</li>
              <li>Di <i>App roles → Roles</i>, undang akun GenBI sebagai <b>Instagram Tester</b>, lalu terima di Instagram (Setelan → Izin situs web → Aplikasi dan situs web → Undangan penguji).</li>
            </ol>
          </div>
        </div>
      </Card>

      {/* 2. App ID, App Secret, Config ID */}
      <Card className="p-5">
        <form className="flex gap-3" onSubmit={(e) => { e.preventDefault(); saveApp.mutate(); }}>
          {step(2, ready)}
          <div className="grid min-w-0 flex-1 gap-4">
            <div>
              <p className="text-[15px] font-semibold text-slate-900">Isi data aplikasi Meta</p>
              <p className="mt-1 text-[13px] text-slate-500">App ID & App Secret ada di <i>App settings → Basic</i>. Config ID dari konfigurasi langkah 1. Secret disimpan terenkripsi dan tidak ditampilkan lagi.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="App ID"><Input value={f.appId} onChange={(e) => setForm({ ...f, appId: e.target.value })} required inputMode="numeric" pattern="\d{5,30}" placeholder="1234567890" /></Field>
              <Field label="App Secret" hint={s.hasSecret ? "Kosongkan bila tidak diganti." : undefined}>
                <Input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} required={!s.hasSecret} autoComplete="off" placeholder={s.hasSecret ? "•••••••• (tersimpan)" : "Tempel App Secret"} />
              </Field>
              <Field label="Config ID"><Input value={f.configId} onChange={(e) => setForm({ ...f, configId: e.target.value })} required inputMode="numeric" pattern="\d{5,30}" placeholder="9876543210" /></Field>
            </div>
            <div><Button type="submit" variant={ready ? "outline" : "primary"} loading={saveApp.isPending}>Simpan</Button></div>
          </div>
        </form>
      </Card>

      {/* 3. Login */}
      <Card className="p-5">
        <div className="flex gap-3">
          {step(3, s.connected)}
          <div className="grid min-w-0 flex-1 gap-3">
            <div>
              <p className="flex items-center gap-2 text-[15px] font-semibold text-slate-900"><Instagram size={17} aria-hidden /> Login dan hubungkan akun</p>
              <p className="mt-1 text-[13px] text-slate-500">Login dengan Facebook atau Instagram, pilih business portfolio dan akun Instagram GenBI, lalu setujui izinnya. Postingan diambil ulang otomatis tiap 30 menit.</p>
            </div>
            {s.connected ? (
              <>
                <div className="flex items-center gap-3 rounded-xl bg-green-50 p-4 text-[14px] text-green-800">
                  <Check size={18} aria-hidden />
                  <span>Terhubung sebagai <b>@{s.username}</b>{s.connectedAt && ` sejak ${fmtDate(s.connectedAt).split(",")[0]}`}.</span>
                </div>
                <p className="text-[13px] text-slate-500">
                  {s.feedAt ? `Postingan terakhir diambil ${fmtDate(s.feedAt)}.` : "Postingan belum berhasil diambil."}{" "}
                  {s.expiresAt ? `Token berlaku sampai ${fmtDate(s.expiresAt).split(",")[0]}; login ulang sebelum tanggal itu.` : "Token tidak kedaluwarsa."}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <a href="/" target="_blank" className="inline-flex h-9 items-center gap-1 px-1 text-[13px] font-medium text-primary hover:underline">Lihat beranda <ExternalLink size={13} aria-hidden /></a>
                  <span className="flex-1" />
                  <Button variant="outline" loading={refresh.isPending} onClick={() => refresh.mutate()}>Ambil ulang sekarang</Button>
                  <Button variant="outline" loading={connect.isPending} onClick={() => connect.mutate()}>Login ulang</Button>
                  <Button variant="ghost" loading={disconnect.isPending} onClick={() => confirm("Putuskan Instagram? Bagian Instagram akan hilang dari beranda.") && disconnect.mutate()}>Putuskan</Button>
                </div>
              </>
            ) : (
              <div>
                <Button disabled={!ready} loading={connect.isPending} onClick={() => connect.mutate()}><Instagram size={16} aria-hidden /> Login & hubungkan</Button>
                {!ready && <p className="mt-2 text-[13px] text-slate-500">Selesaikan langkah 2 dulu.</p>}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

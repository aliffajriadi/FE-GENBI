"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Copy, Download, FileSpreadsheet, KeyRound, Upload } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { Badge, Button, cx, ErrorText } from "@/components/ui";
import { apiForm, download } from "@/lib/api";

type Row = { row: number; name: string; email: string; role: string; division: string | null; status: "ok" | "error" | "created"; message?: string; password?: string };
type Result = { summary: { total: number; valid: number; invalid: number; created: number }; rows: Row[] };

// Tambah akun massal: 1) unduh template, 2) unggah → pratinjau & cek error, 3) buat akun, lalu bagikan password.
export function MemberImport({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Result | null>(null);
  const [done, setDone] = useState<Result | null>(null);
  const reset = () => { setFile(null); setPreview(null); setDone(null); };
  const close = () => { reset(); onClose(); };

  const send = (dry: boolean) => {
    const fd = new FormData();
    fd.append("file", file!);
    return apiForm<Result>(`/users/import${dry ? "?dryRun=1" : ""}`, fd);
  };
  const check = useMutation({ mutationFn: () => send(true), onSuccess: setPreview });
  const create = useMutation({
    mutationFn: () => send(false),
    onSuccess: (r) => { setDone(r); onDone(); toast(`${r.summary.created} akun berhasil dibuat`); },
  });

  const generated = done?.rows.filter((r) => r.status === "created" && r.password) ?? [];
  // CSV sederhana untuk dibagikan ke anggota (nama, email, password).
  const csv = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const body = ["Nama,Email,Password", ...generated.map((r) => [r.name, r.email, r.password!].map(esc).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" }));
    Object.assign(document.createElement("a"), { href: url, download: "akun-baru.csv" }).click();
    URL.revokeObjectURL(url);
  };

  const shown = done ?? preview;
  return (
    <Dialog
      open={open}
      onClose={close}
      size="lg"
      title="Import anggota dari Excel"
      desc="Buat banyak akun sekaligus. Akun langsung aktif di periode berjalan."
      footer={
        done ? <Button onClick={close}>Selesai</Button>
        : preview ? (
          <>
            <Button variant="ghost" onClick={reset}>Ganti file</Button>
            <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!preview.summary.valid}>
              Buat {preview.summary.valid} akun{preview.summary.invalid ? ` (lewati ${preview.summary.invalid})` : ""}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={close}>Batal</Button>
            <Button onClick={() => check.mutate()} loading={check.isPending} disabled={!file}>Periksa file</Button>
          </>
        )
      }
    >
      {!shown && (
        <div className="grid gap-4">
          <ol className="grid gap-3">
            <li className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white">1</span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium">Unduh template</p>
                <p className="mt-0.5 text-[13px] text-slate-500">Isi di sheet <b>Anggota</b>. Wajib: Nama & Email. Role & Divisi pilih dari dropdown; Password boleh kosong (dibuat otomatis).</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => download("/users/import/template", "template-import-anggota.xlsx").catch((e) => toast(e.message, { error: true }))}>
                <Download size={14} aria-hidden /> Template
              </Button>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white">2</span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium">Unggah file yang sudah diisi</p>
                <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-4 hover:border-slate-300">
                  <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  {file ? <FileSpreadsheet size={22} className="text-green-600" aria-hidden /> : <Upload size={20} className="text-slate-400" aria-hidden />}
                  <span className="min-w-0 flex-1 truncate text-[13px] text-slate-600">{file ? file.name : "Pilih file .xlsx (maks 500 baris, 2 MB)"}</span>
                  <span className="text-xs font-medium text-primary">{file ? "Ganti" : "Pilih file"}</span>
                </label>
              </div>
            </li>
          </ol>
          <p className="text-xs text-slate-500">Data dicek dulu sebelum dibuat: email ganda, email yang sudah terdaftar, role/divisi yang tidak dikenal akan ditandai.</p>
          <ErrorText error={check.error} />
        </div>
      )}

      {shown && (
        <div className="grid gap-4">
          <div className="grid grid-cols-3 gap-2">
            {(done
              ? [{ k: "Total baris", v: done.summary.total, c: "text-slate-900" }, { k: "Akun dibuat", v: done.summary.created, c: "text-green-700" }, { k: "Dilewati", v: done.summary.total - done.summary.created, c: done.summary.total - done.summary.created ? "text-red-600" : "text-slate-900" }]
              : [{ k: "Total baris", v: shown.summary.total, c: "text-slate-900" }, { k: "Siap dibuat", v: shown.summary.valid, c: "text-green-700" }, { k: "Bermasalah", v: shown.summary.invalid, c: shown.summary.invalid ? "text-red-600" : "text-slate-900" }]
            ).map((x) => (
              <div key={x.k} className="rounded-lg border border-slate-200 px-3 py-2">
                <p className="text-xs text-slate-500">{x.k}</p>
                <p className={cx("text-xl font-semibold tabular-nums", x.c)}>{x.v}</p>
              </div>
            ))}
          </div>

          {done && generated.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-[13px] text-amber-900">
              <KeyRound size={16} aria-hidden />
              <span className="min-w-0 flex-1">{generated.length} akun memakai password otomatis. Unduh dan bagikan ke anggotanya; password ini <b>tidak bisa dilihat lagi</b> setelah jendela ditutup.</span>
              <Button size="sm" variant="outline" onClick={csv}><Download size={14} aria-hidden /> Unduh CSV</Button>
            </div>
          )}

          <div className="max-h-[45dvh] overflow-y-auto rounded-lg border border-slate-200">
            <ul className="divide-y divide-slate-100">
              {[...shown.rows].sort((a, b) => Number(a.status !== "error") - Number(b.status !== "error") || a.row - b.row).map((r) => (
                <li key={r.row} className={cx("flex items-start gap-3 px-3 py-2.5", r.status === "error" && "bg-red-50/40")}>
                  {r.status === "error" ? <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-600" aria-label="Bermasalah" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" aria-label="OK" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{r.name || "(tanpa nama)"} <span className="font-normal text-slate-500">· {r.email || "(tanpa email)"}</span></p>
                    <p className={cx("text-xs", r.status === "error" ? "text-red-700" : "text-slate-500")}>
                      Baris {r.row} · {r.status === "error" ? r.message : `${r.role}${r.division ? ` · ${r.division}` : ""}`}
                    </p>
                  </div>
                  {r.password && (
                    <button onClick={() => navigator.clipboard.writeText(r.password!).then(() => toast("Password disalin"))} className="inline-flex shrink-0 items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700 hover:bg-slate-200" aria-label={`Salin password ${r.name}`}>
                      {r.password} <Copy size={11} aria-hidden />
                    </button>
                  )}
                  {r.status === "created" && !r.password && <Badge tone="green">Dibuat</Badge>}
                </li>
              ))}
            </ul>
          </div>
          {preview && !done && preview.summary.invalid > 0 && <p className="text-xs text-slate-500">Baris bermasalah akan dilewati. Perbaiki di Excel lalu unggah ulang kalau ingin ikut dibuat.</p>}
          <ErrorText error={create.error} />
        </div>
      )}
    </Dialog>
  );
}

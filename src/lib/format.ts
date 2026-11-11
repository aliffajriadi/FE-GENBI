const TZ = "Asia/Jakarta";
const dt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: TZ });
const tm = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const dl = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TZ });

export const fmtDate = (s: string | Date | null | undefined) => (s ? dt.format(new Date(s)) : "–");
export const fmtTime = (s: string | Date) => tm.format(new Date(s));
export const fmtLongDate = (s: string | Date) => dl.format(new Date(s));

export function fmtRelative(s: string | Date) {
  const diff = (new Date(s).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}

export function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: TZ }).format(new Date()));
  return h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 19 ? "Selamat sore" : "Selamat malam";
}

// Untuk <input type="datetime-local"> (waktu lokal browser).
export const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

export const EVENT_TYPE_LABEL: Record<string, string> = {
  RAPAT_PLENO: "Rapat pleno",
  RAPAT_DIVISI: "Rapat divisi",
  KEGIATAN: "Kegiatan",
  KEPANITIAAN: "Kepanitiaan",
};

export const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

// Tab awal dari ?tab= (tautan notifikasi). Dibaca sekali di klien supaya halaman tetap statis.
export const initialTab = <T extends string>(allowed: readonly T[], fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  const t = new URLSearchParams(window.location.search).get("tab") as T | null;
  return t && allowed.includes(t) ? t : fallback;
};

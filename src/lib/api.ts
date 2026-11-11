"use client";
import { fitImage } from "./image";

// Kosong = lewat proxy Next (/api/v1 → BACKEND_URL): satu origin, jadi jalan di HP/LAN/tunnel/HTTPS tanpa atur URL lagi.
const BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

// shortcut: token di localStorage (rentan XSS); pindah ke cookie httpOnly kalau web publik + panel sudah satu domain dengan API.
const store = {
  get access() { return typeof window === "undefined" ? null : localStorage.getItem("access"); },
  get refresh() { return typeof window === "undefined" ? null : localStorage.getItem("refresh"); },
  set(a: string, r: string) { localStorage.setItem("access", a); localStorage.setItem("refresh", r); },
  clear() { localStorage.removeItem("access"); localStorage.removeItem("refresh"); },
};

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message); }
}

export const accessToken = () => store.access;

let refreshing: Promise<boolean> | null = null;
export async function tryRefresh() {
  const rt = store.refresh;
  if (!rt) return false;
  refreshing ??= fetch(`${BASE}/auth/refresh`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken: rt }) })
    .then(async (r) => {
      if (!r.ok) { store.clear(); return false; }
      const { data } = await r.json();
      store.set(data.accessToken, data.refreshToken);
      return true;
    })
    .finally(() => { refreshing = null; });
  return refreshing;
}

async function raw(path: string, init: RequestInit = {}, retried = false): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (store.access) headers.set("Authorization", `Bearer ${store.access}`);
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (res.status === 401 && !retried && (await tryRefresh())) return raw(path, init, true);
  if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/auth/")) {
    store.clear();
    window.location.href = "/login";
  }
  return res;
}

export async function api<T = unknown>(path: string, init?: Omit<RequestInit, "body"> & { body?: unknown }): Promise<T> {
  return (await apiPage<T>(path, init)).data;
}

// Sama seperti api(), plus meta paginasi { page, total }.
export async function apiPage<T = unknown>(path: string, init?: Omit<RequestInit, "body"> & { body?: unknown }): Promise<{ data: T; meta: { page: number; total: number } }> {
  const res = await raw(path, { ...init, body: init?.body === undefined ? undefined : JSON.stringify(init.body) });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    const details = json?.error?.details as { message: string }[] | undefined;
    throw new ApiError(json?.error?.code ?? "ERROR", details?.[0]?.message ?? json?.error?.message ?? "Gagal menghubungi server", res.status);
  }
  return { data: json.data as T, meta: json.meta };
}

// Origin API untuk file publik (/storage/public/...) yang tidak berada di bawah /api/v1.
export const API_ORIGIN = BASE.startsWith("/") ? "" : new URL(BASE).origin;
export const publicFile = (url: string | null | undefined) => (url ? (url.startsWith("/storage/") ? API_ORIGIN + url : url) : "");

// Kirim file (multipart) ke endpoint yang membalas JSON standar { success, data }.
export async function apiForm<T = unknown>(path: string, fd: FormData): Promise<T> {
  const res = await raw(path, { method: "POST", body: fd });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new ApiError(json?.error?.code ?? "ERROR", json?.error?.message ?? "Gagal menghubungi server", res.status);
  return json.data as T;
}

export type Uploaded = { id: string; url: string; mime: string; size: number };

export const MAX_UPLOAD = 2 * 1024 * 1024; // sama dengan batas server

export async function uploadFile(input: File, opts: { public?: boolean } = {}): Promise<Uploaded> {
  const file = await fitImage(input, MAX_UPLOAD);
  if (file.size > MAX_UPLOAD) throw new ApiError("UPLOAD_INVALID", `Ukuran file maksimal 2 MB (file ini ${(file.size / 1048576).toFixed(1)} MB). Kompres PDF-nya dulu, mis. di ilovepdf.com.`, 400);
  const fd = new FormData();
  fd.append("file", file);
  if (opts.public) fd.append("public", "true");
  const res = await raw("/uploads", { method: "POST", body: fd });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new ApiError(json?.error?.code ?? "UPLOAD", json?.error?.message ?? "Upload gagal", res.status);
  return json.data;
}

// File privat butuh header Authorization, jadi diambil sebagai blob lalu dibuka.
export async function fileBlobUrl(url: string) {
  const res = await raw(url);
  if (!res.ok) throw new ApiError("FILE", "File tidak bisa dibuka", res.status);
  return URL.createObjectURL(await res.blob());
}

export async function openFile(url: string) {
  const w = window.open("", "_blank");
  try {
    const blob = await fileBlobUrl(url);
    if (w) w.location.href = blob;
    else window.location.href = blob;
  } catch (e) {
    w?.close();
    throw e;
  }
}

export async function download(path: string, filename: string) {
  const res = await raw(path);
  if (!res.ok) throw new ApiError("DOWNLOAD", "Gagal mengunduh", res.status);
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

export async function login(email: string, password: string) {
  const data = await api<{ accessToken: string; refreshToken: string }>("/auth/login", { method: "POST", body: { email, password, device: "web" } });
  store.set(data.accessToken, data.refreshToken);
}

export async function logout() {
  const rt = store.refresh;
  if (rt) await api("/auth/logout", { method: "POST", body: { refreshToken: rt } }).catch(() => {});
  store.clear();
  window.location.href = "/login";
}

export const hasSession = () => !!store.refresh;
export const saveTokens = (a: string, r: string) => store.set(a, r);

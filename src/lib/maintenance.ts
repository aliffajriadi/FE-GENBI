"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export type Maintenance = { menus: { key: string; message: string }[] };

// Menu yang sedang maintenance: key = segmen URL /dashboard/<key> → pesan untuk anggota.
export function useMaintenance() {
  const q = useQuery({ queryKey: ["maintenance"], queryFn: () => api<Maintenance>("/public/maintenance"), staleTime: 60_000, refetchInterval: 5 * 60_000 });
  return new Map((q.data?.menus ?? []).map((m) => [m.key, m.message]));
}

export const menuKey = (href: string) => href.split("/")[2] ?? "";

// Sama dengan MAINTENANCE_MENUS di backend (src/shared/site.ts).
export const MAINTENANCE_MENUS = ["scan", "events", "recap", "points", "point-rules", "chat", "finance", "articles", "admin", "signatures", "links", "forms", "slots", "members", "planning", "division"];

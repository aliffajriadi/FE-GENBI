"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type { Me } from "./types";

export function useMe() {
  const q = useQuery({ queryKey: ["me"], queryFn: () => api<Me>("/me"), staleTime: 5 * 60_000 });
  const can = (p: string) => !!q.data?.permissions.includes(p);
  return { ...q, me: q.data, can };
}

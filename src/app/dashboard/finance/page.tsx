"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, Tabs } from "@/components/ui";
import { apiPage } from "@/lib/api";
import { initialTab } from "@/lib/format";
import type { Payment } from "@/lib/types";
import { useMe } from "@/lib/use-me";
import { type KasOption, TABS, type Tab, withKas } from "./_lib";
import { MyBills } from "./_components/my-bills";
import { KasBanner } from "./_components/kas-banner";
import { Summary } from "./_components/summary";
import { BillsTable, VerifyQueue } from "./_components/verify-queue";
import { CashBook } from "./_components/cash-book";
import { Settings } from "./_components/settings";

export default function FinancePage() {
  const { data: me, can } = useMe();
  const options: KasOption[] = [
    ...(can("finance.read") ? [{ value: "org", label: "Kas organisasi", manage: can("finance.manage") }] : []),
    ...(me?.division && (me.role === "KADIV" || me.divisionGrants.includes("finance")) ? [{ value: me.division.id, label: `Kas ${me.division.name}`, manage: true }] : []),
  ];
  const [view, setView] = useState<"mine" | "manage">("mine");
  const [kas, setKas] = useState("org");
  const [tab, setTab] = useState<Tab>("summary");
  useEffect(() => {
    if (!me) return;
    const url = new URLSearchParams(window.location.search);
    const fromUrl = url.get("kas");
    // Default: kas yang dikelola user (mis. Kadiv → kas divisinya), bukan yang hanya bisa dipantau.
    setKas(fromUrl && options.some((o) => o.value === fromUrl) ? fromUrl : (options.find((o) => o.manage) ?? options[0])?.value ?? "org");
    const t = url.get("tab");
    if (options.length && t && t !== "mine") { setView("manage"); setTab(initialTab(TABS, "summary")); }
  }, [me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = options.find((o) => o.value === kas);
  const manage = !!current?.manage;
  const pending = useQuery({ queryKey: ["payments", "PENDING", kas], queryFn: () => apiPage<Payment[]>(withKas("/payments?status=PENDING&limit=50", kas)), enabled: manage });
  const items: { value: Tab; label: string; count?: number }[] = [
    { value: "summary", label: "Ringkasan" },
    ...(manage ? [{ value: "verify" as const, label: "Verifikasi", count: pending.data?.meta.total || undefined }] : []),
    { value: "bills", label: "Tagihan anggota" },
    { value: "cash", label: "Buku kas" },
    ...(manage ? [{ value: "settings" as const, label: "Pengaturan" }] : []),
  ];
  const safeTab = items.some((i) => i.value === tab) ? tab : "summary";

  return (
    <>
      <PageHeader title="Uang kas" desc={view === "mine" ? "Lihat tagihan kas Anda dan bayar dengan upload bukti transfer." : "Kelola iuran, verifikasi bukti bayar, dan catat pemasukan & pengeluaran."} />
      {options.length > 0 && (
        <div className="mb-6">
          <Tabs value={view} onChange={setView} items={[{ value: "mine", label: "Tagihan saya" }, { value: "manage", label: "Kelola kas", count: manage ? pending.data?.meta.total || undefined : undefined }]} />
        </div>
      )}
      {view === "mine" || !current ? (
        <MyBills />
      ) : (
        <>
          <KasBanner kas={kas} option={current} options={options} onChange={setKas} onGo={setTab} />
          <div className="mb-5"><Tabs value={safeTab} onChange={setTab} items={items} /></div>
          {safeTab === "summary" && <Summary key={kas} kas={kas} onGo={setTab} />}
          {safeTab === "verify" && <VerifyQueue key={kas} kas={kas} />}
          {safeTab === "bills" && <BillsTable key={kas} kas={kas} />}
          {safeTab === "cash" && <CashBook key={kas} kas={kas} manage={manage} />}
          {safeTab === "settings" && <Settings key={kas} kas={kas} label={current.label} />}
        </>
      )}
    </>
  );
}

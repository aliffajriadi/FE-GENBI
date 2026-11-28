"use client";
import { useEffect, useState } from "react";
import { PageHeader, Tabs } from "@/components/ui";
import { useMe } from "@/lib/use-me";
import { Divisions } from "./_components/divisions";
import { Periods } from "./_components/periods";
import { Roles } from "./_components/roles";
import { SiteSettings } from "./_components/site-settings";
import { AppVersionSettings } from "./_components/app-version-settings";
import { LoginPageSettings } from "./_components/login-page-settings";
import { PhotoboothPageSettings } from "./_components/photobooth-page-settings";
import { ContactsSettings } from "./_components/contacts-settings";
import { InstagramSettings } from "./_components/instagram-settings";
import { MaintenanceSettings } from "./_components/maintenance-settings";

type TabKey = "site" | "contacts" | "divisions" | "periods" | "roles" | "app" | "login" | "photobooth" | "instagram" | "maintenance";

export default function SettingsPage() {
  const { can } = useMe();
  const tabs = [
    ...(can("article.publish") ? [{ value: "site" as const, label: "Tampilan web" }, { value: "contacts" as const, label: "Kontak" }] : []),
    ...(can("division.manage") ? [{ value: "divisions" as const, label: "Divisi" }, { value: "periods" as const, label: "Periode" }] : []),
    ...(can("role.manage") ? [{ value: "roles" as const, label: "Role & akses" }] : []),
    ...(can("settings.manage") ? [{ value: "app" as const, label: "Aplikasi mobile" }, { value: "login" as const, label: "Halaman login" }, { value: "photobooth" as const, label: "Photobooth" }, { value: "instagram" as const, label: "Instagram" }, { value: "maintenance" as const, label: "Maintenance" }] : []),
  ];
  const [tab, setTab] = useState<TabKey>("site");
  // Kembali dari halaman izin Instagram: ?tab=instagram&ig=ok|denied|invalid|error
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "instagram") setTab("instagram");
  }, []);
  const active = tabs.find((t) => t.value === tab) ? tab : tabs[0]?.value;

  return (
    <>
      <PageHeader title="Pengaturan" desc="Struktur organisasi dan hak akses. Semua perubahan tercatat di audit log." />
      {tabs.length > 1 && <div className="mb-6"><Tabs value={active} onChange={setTab} items={tabs} /></div>}
      {active === "divisions" && <Divisions />}
      {active === "periods" && <Periods />}
      {active === "roles" && <Roles />}
      {active === "site" && <SiteSettings />}
      {active === "contacts" && <ContactsSettings />}
      {active === "app" && <AppVersionSettings />}
      {active === "login" && <LoginPageSettings />}
      {active === "photobooth" && <PhotoboothPageSettings />}
      {active === "instagram" && <InstagramSettings />}
      {active === "maintenance" && <MaintenanceSettings />}
    </>
  );
}

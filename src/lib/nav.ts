import {
  Bell,
  CalendarCheck,
  FolderOpen,
  MessagesSquare,
  Newspaper,
  Wallet,
  ClipboardList,
  History,
  KanbanSquare,
  LayoutDashboard,
  ScanLine,
  Settings,
  SlidersHorizontal,
  Trophy,
  UserRound,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Me } from "./types";

export type NavItem = { href: string; label: string; icon: LucideIcon; show?: (me: Me) => boolean };

const has = (me: Me, ...p: string[]) => p.some((x) => me.permissions.includes(x));

export const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Utama",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/scan", label: "Scan absensi", icon: ScanLine },
    ],
  },
  {
    section: "Absensi & Poin",
    items: [
      { href: "/dashboard/events", label: "Kegiatan & rapat", icon: CalendarCheck, show: (m) => has(m, "event.read") },
      { href: "/dashboard/recap", label: "Rekap absensi", icon: ClipboardList, show: (m) => has(m, "attendance.read_all") || m.role === "KADIV" },
      { href: "/dashboard/points", label: "Poin keaktifan", icon: Trophy },
      { href: "/dashboard/point-rules", label: "Aturan poin", icon: SlidersHorizontal, show: (m) => has(m, "points.rules", "points.read_all") },
    ],
  },
  {
    section: "Kas & Konten",
    items: [
      { href: "/dashboard/chat", label: "Diskusi", icon: MessagesSquare },
      { href: "/dashboard/finance", label: "Uang kas", icon: Wallet },
      { href: "/dashboard/articles", label: "Artikel", icon: Newspaper, show: (m) => has(m, "article.write") },
      { href: "/dashboard/admin", label: "Administrasi", icon: FolderOpen },
    ],
  },
  {
    section: "Organisasi",
    items: [
      { href: "/dashboard/members", label: "Anggota", icon: Users },
      { href: "/dashboard/planning", label: "Planning divisi", icon: KanbanSquare, show: (m) => !!m.division || ["SYS_ADMIN", "KETUM", "SEKRETARIS"].includes(m.role) },
      { href: "/dashboard/division", label: "Kelola divisi", icon: UserCog, show: (m) => (m.role === "KADIV" && !!m.division) || has(m, "user.manage") },
      { href: "/dashboard/settings", label: "Pengaturan", icon: Settings, show: (m) => has(m, "division.manage", "role.manage", "article.publish") },
      { href: "/dashboard/audit", label: "Audit log", icon: History, show: (m) => has(m, "audit.read") },
    ],
  },
  {
    section: "Akun",
    items: [
      { href: "/dashboard/notifications", label: "Notifikasi", icon: Bell },
      { href: "/dashboard/profile", label: "Profil saya", icon: UserRound },
    ],
  },
];

export const visibleNav = (me: Me | undefined) =>
  NAV.map((s) => ({ ...s, items: s.items.filter((i) => !i.show || (me && i.show(me))) })).filter((s) => s.items.length);

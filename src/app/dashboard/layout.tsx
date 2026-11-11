"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronsUpDown, CornerDownLeft, LogOut, Menu as MenuIcon, ScanLine, Search, UserRound, X } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { Menu, MenuItem } from "@/components/menu";
import { NotificationBell } from "@/components/notification-bell";
import { Avatar, Button, cx, Skeleton } from "@/components/ui";
import { hasSession, logout } from "@/lib/api";
import { visibleNav } from "@/lib/nav";
import { useMe } from "@/lib/use-me";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const { me } = useMe();
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    if (!hasSession()) router.replace("/login");
  }, [router]);

  useEffect(() => setDrawer(false), [path]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Layar QR (proyektor) dan editor artikel tampil penuh tanpa sidebar.
  if (path.endsWith("/qr") || /^\/dashboard\/articles\/[^/]+$/.test(path)) return <>{children}</>;

  const sections = visibleNav(me);
  const current = sections.flatMap((s) => s.items).filter((i) => (i.href === "/dashboard" ? path === i.href : path.startsWith(i.href))).at(-1);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-bold text-white">G</span>
        <div className="flex-1 leading-tight">
          <p className="text-[15px] font-semibold text-slate-900">MyGenBI</p>
          <p className="text-[11px] text-slate-500">{me?.period ? `Periode ${me.period.name}` : "Platform organisasi"}</p>
        </div>
        <span className="hidden lg:block"><NotificationBell align="start" /></span>
      </div>

      <button
        onClick={() => setPalette(true)}
        className="mx-3 mb-3 flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-400 shadow-xs hover:border-slate-300"
      >
        <Search size={15} aria-hidden /> Cari halaman…
        <kbd className="ml-auto rounded border border-slate-200 bg-slate-50 px-1.5 text-[10px] font-medium text-slate-500">Ctrl K</kbd>
      </button>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4" aria-label="Navigasi utama">
        {!me && <div className="space-y-2 px-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-7" />)}</div>}
        {sections.map((s) => (
          <div key={s.section}>
            <p className="mb-1 px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{s.section}</p>
            <ul className="space-y-0.5">
              {s.items.map(({ href, label, icon: Icon }) => {
                const active = current?.href === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] transition-colors",
                        active ? "bg-accent font-medium text-accent-foreground" : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
                      )}
                    >
                      <Icon size={17} strokeWidth={active ? 2.2 : 1.9} className={active ? "text-primary" : "text-slate-400 group-hover:text-slate-600"} aria-hidden />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200/80 p-3">
        <Menu
          side="top"
          align="start"
          trigger={() => (
            <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-slate-100/80">
              <Avatar name={me?.name} src={me?.avatarUrl} size={34} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-slate-900">{me?.name ?? "…"}</span>
                <span className="block truncate text-xs text-slate-500">{me?.position ?? me?.roleName}</span>
              </span>
              <ChevronsUpDown size={15} className="text-slate-400" aria-hidden />
            </button>
          )}
        >
          <div className="border-b border-slate-100 px-2.5 py-2">
            <p className="truncate text-[13px] font-medium">{me?.name}</p>
            <p className="truncate text-xs text-slate-500">{me?.email}</p>
          </div>
          <div className="pt-1">
            <MenuItem icon={UserRound} onClick={() => router.push("/dashboard/profile")}>Profil saya</MenuItem>
            <MenuItem icon={LogOut} danger onClick={logout}>Keluar</MenuItem>
          </div>
        </Menu>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-slate-200/80 bg-[#fbfbfc] print:hidden lg:sticky lg:top-0 lg:block lg:h-dvh">{sidebar}</aside>

      {/* Drawer mobile */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px] bg-[#fbfbfc] shadow-lg">
            <button onClick={() => setDrawer(false)} className="absolute top-4 right-3 rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Tutup menu">
              <X size={18} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 print:hidden items-center gap-3 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-sm lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setDrawer(true)} aria-label="Buka menu">
            <MenuIcon size={18} />
          </Button>
          <span className="font-semibold">{current?.label ?? "MyGenBI"}</span>
          <span className="ml-auto"><NotificationBell /></span>
          <Link href="/dashboard/scan">
            <Button size="sm"><ScanLine size={14} aria-hidden /> Scan</Button>
          </Link>
        </header>
        {path.startsWith("/dashboard/chat") ? (
          // Diskusi memakai tinggi layar penuh (daftar channel + percakapan), tanpa padding halaman.
          <main className="h-[calc(100dvh-3.5rem)] lg:h-dvh">{children}</main>
        ) : (
          <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
        )}
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { me } = useMe();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const items = useMemo(() => visibleNav(me).flatMap((s) => s.items.map((i) => ({ ...i, section: s.section }))), [me]);
  const filtered = items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()));

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
    }
  }, [open]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <Dialog open={open} onClose={onClose} title="Cari halaman" size="md">
      <div className="-mx-5 -mt-5">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5">
          <Search size={16} className="text-slate-400" aria-hidden />
          <input
            autoFocus
            value={q}
            onChange={(e) => { setQ(e.target.value); setIdx(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, filtered.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
              if (e.key === "Enter" && filtered[idx]) go(filtered[idx].href);
            }}
            placeholder="Ketik nama halaman…"
            aria-label="Cari halaman"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>
        <ul className="max-h-80 overflow-y-auto p-2" role="listbox">
          {filtered.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-slate-500">Tidak ada hasil</li>}
          {filtered.map((i, n) => (
            <li key={i.href} role="option" aria-selected={n === idx}>
              <button
                onMouseEnter={() => setIdx(n)}
                onClick={() => go(i.href)}
                className={cx("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px]", n === idx ? "bg-slate-100 text-slate-900" : "text-slate-600")}
              >
                <i.icon size={16} className="text-slate-400" aria-hidden />
                {i.label}
                <span className="ml-auto text-xs text-slate-400">{i.section}</span>
                {n === idx && <CornerDownLeft size={13} className="text-slate-400" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}

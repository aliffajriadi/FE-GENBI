"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, AlignLeft, SlidersHorizontal, ArrowLeft, ArrowRight, CalendarDays, Check, CheckSquare, ChevronLeft, ChevronRight, Flag, KanbanSquare, Maximize2, MessageSquare, MoreHorizontal, Send, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { Menu, MenuItem } from "@/components/menu";
import { useToast } from "@/components/toast";
import { Avatar, Button, cx, EmptyState, ErrorText, Field, Input, PageHeader, Select, Skeleton, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useMe } from "@/lib/use-me";

type Column = { id: string; name: string; position: number; isDone: boolean };
type ChecklistItem = { id: string; text: string; done: boolean };
type Person = { id: string; name: string; avatarUrl: string | null };
type Card = {
  id: string; columnId: string; title: string; description: string | null; assignees: Person[];
  dueDate: string | null; checklist: ChecklistItem[] | null; priority: Priority; position: number; createdById: string; _count?: { comments: number };
};
type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
type Comment = { id: string; body: string; createdAt: string; updatedAt: string; author: Person };
type Board = { division: { id: string; name: string }; columns: Column[]; cards: Card[]; members: Person[]; canEdit: boolean; canManage: boolean };

const dayFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });
const monthFmt = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" });
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const shiftMonth = (key: string, n: number) => { const [y, m] = key.split("-").map(Number); return monthKey(new Date(y, m - 1 + n, 1)); };
const monthLabel = (key: string) => { const [y, m] = key.split("-").map(Number); return monthFmt.format(new Date(y, m - 1, 1)); };
// Aksen warna kolom (berdasarkan urutan); kolom selesai selalu hijau.
const ACCENT = ["bg-slate-400", "bg-blue-500", "bg-amber-500", "bg-violet-500", "bg-sky-500", "bg-rose-400"];
const accentOf = (col: Column, i: number) => (col.isDone ? "bg-green-500" : ACCENT[i % ACCENT.length]);
// Sisa hari ke tenggat dalam kata-kata.
function dueText(iso: string) {
  const days = Math.round((new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 864e5);
  if (days === 0) return "hari ini";
  if (days === 1) return "besok";
  if (days < 0) return `telat ${-days} hari`;
  return days <= 7 ? `${days} hari lagi` : dayFmt.format(new Date(iso));
}
const PRIORITY: Record<Priority, { label: string; cls: string }> = {
  LOW: { label: "Rendah", cls: "bg-slate-100 text-slate-600" },
  NORMAL: { label: "Normal", cls: "bg-slate-100 text-slate-600" },
  HIGH: { label: "Tinggi", cls: "bg-amber-50 text-amber-700" },
  URGENT: { label: "Mendesak", cls: "bg-red-50 text-red-700" },
};
const timeFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const isOverdue = (c: Card, done: boolean) => !!c.dueDate && !done && new Date(c.dueDate) < new Date(new Date().toDateString());

export default function PlanningPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const toast = useToast();
  const divisions = useQuery({ queryKey: ["boards"], queryFn: () => api<{ id: string; name: string }[]>("/boards") });
  const [divisionId, setDivisionId] = useState("");
  useEffect(() => {
    if (divisionId || !divisions.data?.length) return;
    // Dari kalender: ?division=…&card=… langsung buka papan + kartunya.
    const p = new URLSearchParams(location.search);
    const want = divisions.data.find((d) => d.id === p.get("division")) ?? divisions.data.find((d) => d.id === me?.division?.id) ?? divisions.data[0];
    setDivisionId(want.id);
    if (want.id === p.get("division") && p.get("card")) { setOpenId(p.get("card")); setFullPage(p.get("view") === "page"); }
  }, [divisions.data, divisionId, me?.division?.id]);
  // Halaman detail kartu = mode tampilan di URL (?view=page), jadi tombol Back browser & link bisa dipakai.
  const [fullPage, setFullPage] = useState(false);
  useEffect(() => {
    const onPop = () => { const p = new URLSearchParams(location.search); setOpenId(p.get("card")); setFullPage(p.get("view") === "page"); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const openPage = (id: string) => { history.pushState(null, "", `?division=${divisionId}&card=${id}&view=page`); setFullPage(true); };
  const closePage = () => { history.pushState(null, "", `?division=${divisionId}`); setFullPage(false); setOpenId(null); };

  const key = ["board", divisionId];
  const board = useQuery({ queryKey: key, queryFn: () => api<Board>(`/boards/${divisionId}`), enabled: !!divisionId });
  // Filter: bulan tenggat ("all" | "none" = tanpa tenggat | "YYYY-MM"), PIC ("" | "me" | "none" | id), kata kunci.
  const [month, setMonth] = useState("all");
  const [pic, setPic] = useState("");
  const [q, setQ] = useState("");
  const [showFilters, setShowFilters] = useState(false); // HP: filter disembunyikan supaya papan langsung terlihat
  const boardRef = useRef<HTMLDivElement>(null);
  const [colIdx, setColIdx] = useState(0); // kolom yang sedang terlihat di HP
  const [openId, setOpenId] = useState<string | null>(null); // kartu yang detailnya tampil di panel samping
  const [renaming, setRenaming] = useState<Column | "new" | null>(null);

  // Realtime: ikut room papan ini; perubahan dari orang lain memicu muat ulang.
  useEffect(() => {
    if (!divisionId) return;
    const s = getSocket();
    const watch = () => s.emit("board:watch", divisionId);
    const onChange = (p: { divisionId: string }) => p.divisionId === divisionId && qc.invalidateQueries({ queryKey: ["board", divisionId] });
    watch();
    s.on("connect", watch);
    s.on("board:changed", onChange);
    return () => {
      s.emit("board:unwatch", divisionId);
      s.off("connect", watch);
      s.off("board:changed", onChange);
    };
  }, [divisionId, qc]);

  const fail = (e: Error) => { toast(e.message, { error: true }); qc.invalidateQueries({ queryKey: key }); };
  const move = useMutation({
    mutationFn: ({ id, columnId, index }: { id: string; columnId: string; index: number }) => api(`/board-cards/${id}/move`, { method: "POST", body: { columnId, index } }),
    // Optimistis: kartu langsung pindah di layar, server menyusul.
    onMutate: ({ id, columnId, index }) => {
      qc.setQueryData<Board>(key, (b) => {
        if (!b) return b;
        const card = b.cards.find((c) => c.id === id)!;
        const target = b.cards.filter((c) => c.columnId === columnId && c.id !== id).sort((x, y) => x.position - y.position);
        target.splice(index, 0, { ...card, columnId });
        const pos = new Map(target.map((c, i) => [c.id, i]));
        return { ...b, cards: b.cards.map((c) => (pos.has(c.id) ? { ...c, columnId: c.id === id ? columnId : c.columnId, position: pos.get(c.id)! } : c)) };
      });
    },
    onError: fail,
  });
  const colAction = useMutation({
    mutationFn: ({ col, body, del }: { col: Column; body?: Partial<Column>; del?: boolean }) =>
      del ? api(`/board-columns/${col.id}`, { method: "DELETE" }) : api(`/board-columns/${col.id}`, { method: "PATCH", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: fail,
  });

  const b = board.data;
  const visible = (c: Card) =>
    (month === "all" || (month === "none" ? !c.dueDate : !!c.dueDate && monthKey(new Date(c.dueDate)) === month)) &&
    (!pic || (pic === "none" ? !c.assignees.length : c.assignees.some((a) => a.id === (pic === "me" ? me?.id : pic)))) &&
    (!q || c.title.toLowerCase().includes(q.toLowerCase()));
  const sorted = (colId: string) => (b?.cards ?? []).filter((c) => c.columnId === colId).sort((x, y) => x.position - y.position);
  const cardsOf = (colId: string) => sorted(colId).filter(visible);
  const shown = (b?.cards ?? []).filter(visible);
  const doneCols = new Set(b?.columns.filter((c) => c.isDone).map((c) => c.id));
  const total = shown.length;
  const finished = shown.filter((c) => doneCols.has(c.columnId)).length;
  const late = shown.filter((c) => isOverdue(c, doneCols.has(c.columnId))).length;
  const filtered = month !== "all" || !!pic || !!q;
  // Saat difilter, posisi sisip dihitung dari kartu yang terlihat → terjemahkan ke urutan asli kolom.
  const dropAt = (colId: string, id: string, index: number) => {
    const full = sorted(colId).filter((c) => c.id !== id);
    const vis = full.filter(visible);
    return index < vis.length ? full.indexOf(vis[index]) : vis.length ? full.indexOf(vis[vis.length - 1]) + 1 : full.length;
  };

  const openCard = b?.cards.find((c) => c.id === openId);
  if (fullPage && b && openCard) return <CardPanel key={openCard.id} page card={openCard} board={b} divisionId={divisionId} onClose={closePage} />;

  if (divisions.data?.length === 0) return <EmptyState icon={KanbanSquare} title="Belum masuk divisi" desc="Papan planning tersedia untuk anggota yang sudah punya divisi." />;

  return (
    <>
      <PageHeader
        title="Planning divisi"
        desc={<span className="hidden sm:inline">{b ? `Papan kerja ${b.division.name}. Seret kartu untuk mengubah statusnya.` : "Rencanakan program kerja divisi bersama-sama."}</span>}
        actions={(divisions.data?.length ?? 0) > 1 && (
          <Select value={divisionId} onChange={(e) => setDivisionId(e.target.value)} aria-label="Pilih divisi" className="w-auto">
            {divisions.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        )}
      />
      <ErrorText error={board.error} />

      {b && (
        <>
          {/* Ringkasan progres (mengikuti filter) */}
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-xs sm:hidden">
            <p className="shrink-0 text-[13px] text-slate-600"><b className="text-slate-900 tabular-nums">{total}</b> kartu · <b className="text-green-700 tabular-nums">{finished}</b> selesai{late ? <> · <b className="text-red-600 tabular-nums">{late}</b> telat</> : null}</p>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-green-500" style={{ width: `${total ? (finished / total) * 100 : 0}%` }} /></div>
            <span className="text-xs font-medium text-slate-900 tabular-nums">{total ? Math.round((finished / total) * 100) : 0}%</span>
          </div>
          <div className="mb-4 hidden grid-cols-3 gap-2 sm:grid sm:gap-3 lg:grid-cols-[repeat(3,minmax(0,180px))_1fr]">
            {[
              { k: "Kartu", v: total, cls: "text-slate-900" },
              { k: "Selesai", v: finished, cls: "text-green-700" },
              { k: "Terlambat", v: late, cls: late ? "text-red-600" : "text-slate-900" },
            ].map((x) => (
              <div key={x.k} className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-xs">
                <p className="text-xs text-slate-500">{x.k}</p>
                <p className={cx("text-xl font-semibold tabular-nums", x.cls)}>{x.v}</p>
              </div>
            ))}
            <div className="col-span-3 flex flex-col justify-center rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-xs lg:col-span-1">
              <p className="flex justify-between text-xs text-slate-500"><span>Progres{filtered ? " (sesuai filter)" : ""}</span><span className="font-medium text-slate-900 tabular-nums">{total ? Math.round((finished / total) * 100) : 0}%</span></p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-green-500 transition-all duration-500" style={{ width: `${total ? (finished / total) * 100 : 0}%` }} /></div>
            </div>
          </div>

          {/* Filter: di HP cukup kotak cari + tombol Filter (berisi bulan & PIC) */}
          <div className="mb-3 flex items-center gap-2 sm:hidden">
            <Input icon={Search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kartu…" aria-label="Cari kartu" className="flex-1" />
            <Button variant={showFilters || month !== "all" || pic ? "primary" : "outline"} onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
              <SlidersHorizontal size={15} aria-hidden /> Filter{(month !== "all" ? 1 : 0) + (pic ? 1 : 0) ? ` (${(month !== "all" ? 1 : 0) + (pic ? 1 : 0)})` : ""}
            </Button>
          </div>
          <div className={cx("mb-4 flex-wrap items-center gap-2 sm:mb-5 sm:flex", showFilters ? "flex" : "hidden")}>
            <div className="inline-flex max-w-full items-center overflow-x-auto rounded-lg bg-slate-100 p-1 [scrollbar-width:none]" role="group" aria-label="Filter bulan tenggat">
              <FilterChip on={month === "all"} onClick={() => setMonth("all")}>Semua</FilterChip>
              <span className={cx("inline-flex shrink-0 items-center rounded-md", month !== "all" && month !== "none" && "bg-white shadow-sm")}>
                <button className="rounded-md p-1.5 text-slate-500 hover:text-slate-900" onClick={() => setMonth((m) => shiftMonth(m === "all" || m === "none" ? monthKey(new Date()) : m, -1))} aria-label="Bulan sebelumnya"><ChevronLeft size={15} /></button>
                <button className={cx("h-7 px-1 text-[13px] font-medium whitespace-nowrap", month !== "all" && month !== "none" ? "text-slate-900" : "text-slate-500")} onClick={() => setMonth(monthKey(new Date()))}>
                  {month !== "all" && month !== "none" ? monthLabel(month) : "Bulan ini"}
                </button>
                <button className="rounded-md p-1.5 text-slate-500 hover:text-slate-900" onClick={() => setMonth((m) => shiftMonth(m === "all" || m === "none" ? monthKey(new Date()) : m, 1))} aria-label="Bulan berikutnya"><ChevronRight size={15} /></button>
              </span>
              <FilterChip on={month === "none"} onClick={() => setMonth("none")}>Tanpa tenggat</FilterChip>
            </div>
            <Select value={pic} onChange={(e) => setPic(e.target.value)} aria-label="Filter PIC" className="w-full sm:w-44">
              <option value="">Semua PIC</option>
              <option value="me">Kartu saya</option>
              <option value="none">Belum ada PIC</option>
              {b.members.filter((m) => m.id !== me?.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
            <Input icon={Search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kartu…" aria-label="Cari kartu" className="hidden sm:block sm:w-52" />
            {filtered && <Button variant="ghost" size="sm" onClick={() => { setMonth("all"); setPic(""); setQ(""); }}><X size={14} aria-hidden /> Reset</Button>}
          </div>
        </>
      )}
      {board.isLoading && <div className="flex gap-4 overflow-hidden">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-96 w-72 shrink-0 rounded-xl" />)}</div>}

      {b && (
        <div className="sticky top-14 z-20 -mx-4 mb-2 flex gap-1.5 overflow-x-auto border-b border-slate-200/70 bg-background/95 px-4 py-2 backdrop-blur-sm [scrollbar-width:none] sm:hidden" role="tablist" aria-label="Pilih kolom">
          {b.columns.map((col, ci) => (
            <button
              key={col.id}
              role="tab"
              aria-selected={colIdx === ci}
              onClick={() => (boardRef.current?.children[ci] as HTMLElement | undefined)?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" })}
              className={cx("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-medium transition", colIdx === ci ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-600")}
            >
              <span className={cx("size-2 rounded-full", colIdx === ci ? "bg-white" : accentOf(col, ci))} aria-hidden />
              {col.name}<span className={cx("tabular-nums", colIdx === ci ? "text-white/80" : "text-slate-400")}>{cardsOf(col.id).length}</span>
            </button>
          ))}
        </div>
      )}

      {b && (
      <div className="flex items-start gap-4">
        <div
          ref={boardRef}
          onScroll={(e) => { const el = e.currentTarget; const w = (el.children[0] as HTMLElement | undefined)?.offsetWidth ?? 1; setColIdx(Math.round(el.scrollLeft / (w + 12))); }}
          className={cx("-mx-4 flex min-w-0 flex-1 snap-x scroll-px-4 gap-3 overflow-x-auto lg:gap-2 px-4 pb-6 sm:mx-0 sm:scroll-px-0 sm:px-0 [scrollbar-width:thin]", openId && "lg:pr-[440px]")}>
          {b.columns.map((col, ci) => (
            <ColumnView
              key={col.id}
              col={col}
              cards={cardsOf(col.id)}
              board={b}
              isFirst={ci === 0}
              isLast={ci === b.columns.length - 1}
              onOpen={(c) => setOpenId((id) => (id === c.id ? null : c.id))}
              selectedId={openId}
              onDrop={(id, index) => move.mutate({ id, columnId: col.id, index: dropAt(col.id, id, index) })}
              accent={accentOf(col, ci)}
              filtered={filtered}
              onRename={() => setRenaming(col)}
              onToggleDone={() => colAction.mutate({ col, body: { isDone: !col.isDone } })}
              onShift={(d) => colAction.mutate({ col, body: { position: ci + d } })}
              onDelete={() => confirm(`Hapus kolom "${col.name}"?`) && colAction.mutate({ col, del: true })}
              divisionId={divisionId}
            />
          ))}
          {b.canManage && (
            <button onClick={() => setRenaming("new")} aria-label="Tambah kolom" title="Tambah kolom" className="flex h-12 w-72 shrink-0 snap-start items-center justify-center gap-2 rounded-xl border-2 border-dashed lg:w-11 border-slate-200 text-[13px] font-medium text-slate-500 hover:border-slate-300 hover:text-slate-800">
              <Plus size={16} aria-hidden /> <span className="lg:hidden">Tambah kolom</span>
            </button>
          )}
        </div>
        {/* Detail kartu ala Jira: panel di samping papan (bukan modal); di HP tampil layar penuh. */}
        {openId && b.cards.some((c) => c.id === openId) && (
          <CardPanel key={openId} card={b.cards.find((c) => c.id === openId)!} board={b} divisionId={divisionId} onClose={() => setOpenId(null)} onExpand={() => openPage(openId)} />
        )}
      </div>
      )}
      <ColumnDialog target={renaming} divisionId={divisionId} onClose={() => setRenaming(null)} />
    </>
  );
}

function FilterChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={on} className={cx("h-7 shrink-0 rounded-md px-3 text-[13px] font-medium whitespace-nowrap transition", on ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900")}>
      {children}
    </button>
  );
}

function ColumnView({ col, cards, board, isFirst, isLast, onOpen, onDrop, onRename, onToggleDone, onShift, onDelete, divisionId, accent, filtered, selectedId }: {
  col: Column; cards: Card[]; board: Board; isFirst: boolean; isLast: boolean; divisionId: string; accent: string; filtered: boolean; selectedId: string | null;
  onOpen: (c: Card) => void; onDrop: (id: string, index: number) => void; onRename: () => void; onToggleDone: () => void; onShift: (d: number) => void; onDelete: () => void;
}) {
  const [over, setOver] = useState<number | null>(null); // posisi sisip saat drag
  const [adding, setAdding] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Hitung posisi sisip dari letak kursor terhadap kartu-kartu di kolom.
  const indexAt = (y: number) => {
    const els = [...(listRef.current?.querySelectorAll<HTMLElement>("[data-card]") ?? [])];
    const i = els.findIndex((el) => { const r = el.getBoundingClientRect(); return y < r.top + r.height / 2; });
    return i === -1 ? els.length : i;
  };

  return (
    <section
      className={cx("flex max-h-[calc(100dvh-14rem)] w-[min(18rem,82vw)] shrink-0 snap-start flex-col rounded-xl lg:w-auto lg:min-w-[150px] lg:flex-1 lg:basis-0 bg-slate-100/80 transition-colors", over != null && "bg-blue-50 ring-2 ring-blue-200")}
      onDragOver={(e) => { if (!board.canEdit) return; e.preventDefault(); setOver(indexAt(e.clientY)); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null); }}
      onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/card"); const at = indexAt(e.clientY); setOver(null); if (id) onDrop(id, at); }}
      aria-label={`Kolom ${col.name}`}
    >
      <header className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className={cx("size-2.5 shrink-0 rounded-full", accent)} aria-hidden />
        <h2 className="truncate text-[13.5px] font-semibold text-slate-800">{col.name}</h2>
        {col.isDone && <Check size={14} className="shrink-0 text-green-600" aria-label="Kolom selesai" />}
        <span className="rounded-full bg-white px-2 text-[11px] font-medium text-slate-500 tabular-nums">{cards.length}</span>
        {board.canManage && (
          <span className="ml-auto">
            <Menu trigger={() => <button className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700" aria-label={`Atur kolom ${col.name}`}><MoreHorizontal size={16} /></button>}>
              <MenuItem icon={Pencil} onClick={onRename}>Ganti nama</MenuItem>
              <MenuItem icon={Check} onClick={onToggleDone}>{col.isDone ? "Bukan kolom selesai" : "Jadikan kolom selesai"}</MenuItem>
              {!isFirst && <MenuItem icon={ArrowLeft} onClick={() => onShift(-1)}>Geser ke kiri</MenuItem>}
              {!isLast && <MenuItem icon={ArrowRight} onClick={() => onShift(1)}>Geser ke kanan</MenuItem>}
              <MenuItem icon={Trash2} danger onClick={onDelete}>Hapus kolom</MenuItem>
            </Menu>
          </span>
        )}
      </header>

      <div ref={listRef} className="flex min-h-12 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {cards.map((c, i) => (
          <div key={c.id}>
            {over === i && <div className="mb-2 h-1 rounded-full bg-primary/60" />}
            <CardTile card={c} done={col.isDone} draggable={board.canEdit} selected={selectedId === c.id} onOpen={() => onOpen(c)} />
          </div>
        ))}
        {over === cards.length && <div className="h-1 rounded-full bg-primary/60" />}
        {!cards.length && over == null && !adding && (
          <p className="rounded-lg border border-dashed border-slate-300/80 px-2 py-6 text-center text-xs text-slate-400">{filtered ? "Tidak ada kartu yang cocok" : board.canEdit ? "Seret kartu ke sini" : "Kosong"}</p>
        )}
      </div>

      {board.canEdit && (
        <div className="px-2 pb-2">
          {adding ? <QuickAdd columnId={col.id} divisionId={divisionId} onDone={() => setAdding(false)} /> : (
            <button onClick={() => setAdding(true)} className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-slate-500 hover:bg-white hover:text-slate-800">
              <Plus size={15} aria-hidden /> Tambah kartu
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function CardTile({ card, done, draggable, selected, onOpen }: { card: Card; done: boolean; draggable: boolean; selected: boolean; onOpen: () => void }) {
  const list = card.checklist ?? [];
  const checked = list.filter((x) => x.done).length;
  const late = isOverdue(card, done);
  const soon = !!card.dueDate && !done && !late && new Date(card.dueDate).getTime() - Date.now() < 3 * 864e5;
  return (
    <button
      data-card
      draggable={draggable}
      onDragStart={(e) => { e.dataTransfer.setData("text/card", card.id); e.dataTransfer.effectAllowed = "move"; }}
      onClick={onOpen}
      className={cx(
        "group w-full cursor-pointer rounded-lg border bg-white p-2.5 text-left shadow-xs transition hover:-translate-y-px hover:shadow-md active:cursor-grabbing",
        late ? "border-red-200 border-l-[3px] border-l-red-500" : "border-slate-200/80 hover:border-slate-300",
        done && "bg-slate-50/80",
        selected && "ring-2 ring-primary ring-offset-1",
      )}
      aria-pressed={selected}
    >
      {(card.priority === "HIGH" || card.priority === "URGENT") && (
        <span className={cx("mb-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-semibold", PRIORITY[card.priority].cls)}><Flag size={10} aria-hidden />{PRIORITY[card.priority].label}</span>
      )}
      <div className="flex items-start gap-1.5">
        <p className={cx("line-clamp-3 min-w-0 flex-1 text-[13px] leading-snug font-medium break-words text-slate-900", done && "text-slate-500 line-through decoration-slate-300")} title={card.title}>{card.title}</p>
        {card.assignees.length
          ? <span className="flex shrink-0 -space-x-1.5" title={`PIC: ${card.assignees.map((a) => a.name).join(", ")}`}>
              {card.assignees.slice(0, 2).map((a) => <Avatar key={a.id} name={a.name} src={a.avatarUrl} size={20} className="ring-2 ring-white" />)}
              {card.assignees.length > 2 && <span className="grid size-5 place-items-center rounded-full bg-slate-200 text-[9.5px] font-medium text-slate-600 ring-2 ring-white">+{card.assignees.length - 2}</span>}
            </span>
          : <span className="grid size-5 shrink-0 place-items-center rounded-full border border-dashed border-slate-300 text-[10px] text-slate-400" title="Belum ada PIC">?</span>}
      </div>
      {list.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={cx("h-full rounded-full", checked === list.length ? "bg-green-500" : "bg-primary/70")} style={{ width: `${(checked / list.length) * 100}%` }} /></div>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 tabular-nums"><CheckSquare size={11} aria-hidden />{checked}/{list.length}</span>
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
        {card.dueDate ? (
          <span className={cx("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium",
            late ? "bg-red-50 text-red-700" : soon ? "bg-amber-50 text-amber-700" : done ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600")}>
            {late ? <AlertTriangle size={11} aria-hidden /> : <CalendarDays size={11} aria-hidden />} {done ? dayFmt.format(new Date(card.dueDate)) : dueText(card.dueDate)}
          </span>
        ) : <span className="text-slate-400">–</span>}
        {card.description && <AlignLeft size={13} className="text-slate-400" aria-label="Ada deskripsi" />}
        {!!card._count?.comments && <span className="inline-flex items-center gap-0.5 text-slate-400" aria-label={`${card._count.comments} komentar`}><MessageSquare size={12} aria-hidden />{card._count.comments}</span>}
      </div>
    </button>
  );
}

function QuickAdd({ columnId, divisionId, onDone }: { columnId: string; divisionId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const add = useMutation({
    mutationFn: () => api(`/boards/${divisionId}/cards`, { method: "POST", body: { columnId, title } }),
    onSuccess: () => { setTitle(""); qc.invalidateQueries({ queryKey: ["board", divisionId] }); },
  });
  return (
    <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); if (title.trim()) add.mutate(); }}>
      <Textarea
        autoFocus
        rows={2}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (title.trim()) add.mutate(); } if (e.key === "Escape") onDone(); }}
        placeholder="Judul kartu… (Enter untuk simpan)"
        aria-label="Judul kartu baru"
        className="text-[13px]"
      />
      <ErrorText error={add.error} />
      <div className="flex gap-2">
        <Button size="sm" type="submit" loading={add.isPending}>Tambah</Button>
        <Button size="sm" variant="ghost" type="button" onClick={onDone}>Batal</Button>
      </div>
    </form>
  );
}

// page = tampil sebagai halaman penuh (lebih lebar, komentar di kolom kanan); tanpa page = panel samping.
function CardPanel({ card, board, divisionId, onClose, onExpand, page }: { card: Card; board: Board; divisionId: string; onClose: () => void; onExpand?: () => void; page?: boolean }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const toast = useToast();
  const key = ["board", divisionId];
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const [newItem, setNewItem] = useState("");
  const [editDesc, setEditDesc] = useState(false);
  const ro = !board.canEdit;
  const col = board.columns.find((c) => c.id === card.columnId);
  const colIndex = board.columns.findIndex((c) => c.id === card.columnId);
  const list = card.checklist ?? [];
  const done = list.filter((x) => x.done).length;

  // Esc: keluar dari input dulu, Esc berikutnya menutup panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector("dialog[open]")) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) el.blur();
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Simpan otomatis per kolom isian; tampilan diperbarui duluan (optimistis).
  const patch = useMutation({
    mutationFn: (body: Partial<Pick<Card, "title" | "description" | "dueDate" | "checklist" | "priority">> & { assigneeIds?: string[] }) => api(`/board-cards/${card.id}`, { method: "PATCH", body }),
    onMutate: (body) => {
      setSaved("saving");
      qc.setQueryData<Board>(key, (b) => b && {
        ...b,
        cards: b.cards.map((c) => (c.id === card.id ? { ...c, ...body, ...(body.assigneeIds ? { assignees: b.members.filter((m) => body.assigneeIds!.includes(m.id)) } : {}) } : c)),
      });
    },
    onSuccess: () => setSaved("saved"),
    onError: (e) => { setSaved("idle"); toast(e.message, { error: true }); qc.invalidateQueries({ queryKey: key }); },
  });
  const move = useMutation({
    mutationFn: (columnId: string) => api(`/board-cards/${card.id}/move`, { method: "POST", body: { columnId, index: 9999 } }),
    onMutate: (columnId) => qc.setQueryData<Board>(key, (b) => b && { ...b, cards: b.cards.map((c) => (c.id === card.id ? { ...c, columnId, position: 9999 } : c)) }),
    onSuccess: () => { setSaved("saved"); qc.invalidateQueries({ queryKey: key }); },
    onError: (e) => { toast(e.message, { error: true }); qc.invalidateQueries({ queryKey: key }); },
  });
  const del = useMutation({
    mutationFn: () => api(`/board-cards/${card.id}`, { method: "DELETE" }),
    onSuccess: () => { onClose(); qc.invalidateQueries({ queryKey: key }); toast("Kartu dihapus"); },
    onError: (e) => toast(e.message, { error: true }),
  });
  const setList = (next: ChecklistItem[]) => patch.mutate({ checklist: next });
  const canDelete = card.createdById === me?.id || board.canManage;
  const late = isOverdue(card, !!col?.isDone);

  // Detail (status, PIC, prioritas, tenggat): di panel ikut alur, di halaman jadi kolom kanan ala Jira.
  const meta = (
    <dl className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5 text-[13px]">
      <dt className="text-slate-500">Status</dt>
      <dd>
        <Select value={card.columnId} onChange={(e) => move.mutate(e.target.value)} aria-label="Pindah ke kolom" className="h-8">
          {board.columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </dd>
      <dt className="text-slate-500">PIC</dt>
      <dd className="flex flex-wrap gap-1.5" role="group" aria-label="PIC (bisa lebih dari satu)">
        {/* Klik untuk menambah/melepas PIC; yang terpilih ditandai warna. */}
        {board.members.map((m) => {
          const on = card.assignees.some((a) => a.id === m.id);
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={on}
              onClick={() => patch.mutate({ assigneeIds: on ? card.assignees.filter((a) => a.id !== m.id).map((a) => a.id) : [...card.assignees.map((a) => a.id), m.id] })}
              className={cx("inline-flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-0.5 text-xs transition disabled:opacity-60",
                on ? "border-primary bg-primary/10 font-medium text-slate-900" : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800")}
            >
              <Avatar name={m.name} src={m.avatarUrl} size={20} />{m.name}{m.id === me?.id ? " (saya)" : ""}
            </button>
          );
        })}
        {!board.members.length && <span className="text-xs text-slate-400">Belum ada anggota</span>}
      </dd>
      <dt className="text-slate-500">Prioritas</dt>
      <dd>
        <Select value={card.priority} onChange={(e) => patch.mutate({ priority: e.target.value as Priority })} aria-label="Prioritas" className="h-8">
          {(Object.keys(PRIORITY) as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY[p].label}</option>)}
        </Select>
      </dd>
      <dt className="text-slate-500">Tenggat</dt>
      <dd className="flex items-center gap-2">
        <Input
          type="date"
          aria-label="Tenggat"
          className="h-8 flex-1"
          defaultValue={card.dueDate ? card.dueDate.slice(0, 10) : ""}
          onChange={(e) => patch.mutate({ dueDate: e.target.value ? new Date(`${e.target.value}T23:59:00`).toISOString() : null })}
        />
        {card.dueDate && <span className={cx("shrink-0 text-xs", late ? "font-medium text-red-600" : "text-slate-500")}>{col?.isDone ? "selesai" : dueText(card.dueDate)}</span>}
      </dd>
    </dl>
  );

  return (
    <aside
      className={page
        ? "mx-auto flex max-w-6xl flex-col rounded-xl border border-slate-200/80 bg-white shadow-xs"
        : "fixed inset-0 z-40 flex animate-[panel-in_220ms_var(--ease)] flex-col bg-white lg:left-auto lg:w-[420px] lg:border-l lg:border-slate-200 lg:shadow-[-12px_0_32px_-12px_rgb(15_23_42/0.18)]"}
      aria-label={`Detail kartu ${card.title}`}
    >
      <header className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        {page && (
          <button onClick={onClose} className="-ml-1 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[13px] text-slate-500 hover:bg-slate-100 hover:text-slate-800">
            <ArrowLeft size={15} aria-hidden /> {board.division.name}
          </button>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
          <span className={cx("size-2 rounded-full", col ? accentOf(col, colIndex) : "bg-slate-400")} aria-hidden />{col?.name}
        </span>
        <span className="text-xs text-slate-400" aria-live="polite">{saved === "saving" ? "Menyimpan…" : saved === "saved" ? "Tersimpan" : ""}</span>
        <span className="ml-auto flex items-center gap-1">
          {!ro && canDelete && (
            <Menu trigger={() => <button className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Opsi kartu"><MoreHorizontal size={17} /></button>}>
              <MenuItem icon={Trash2} danger onClick={() => confirm("Hapus kartu ini?") && del.mutate()}>Hapus kartu</MenuItem>
            </Menu>
          )}
          {onExpand && <button onClick={onExpand} className="hidden rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:block" aria-label="Buka sebagai halaman" title="Buka sebagai halaman"><Maximize2 size={16} /></button>}
          {!page && <button onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup detail"><X size={18} /></button>}
        </span>
      </header>

      <div className={page ? "grid gap-8 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]" : "flex-1 overflow-y-auto px-4 py-4"}>
        {page && (
          <fieldset disabled={ro} className="h-fit rounded-lg border border-slate-200 p-4 lg:sticky lg:top-4 lg:order-last">
            <p className="mb-3 text-[13px] font-medium text-slate-700">Detail</p>
            {meta}
          </fieldset>
        )}
        <div>
        <fieldset disabled={ro} className="grid content-start gap-5">
          <textarea
            defaultValue={card.title}
            rows={1}
            maxLength={200}
            aria-label="Judul kartu"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), e.currentTarget.blur())}
            onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== card.title) patch.mutate({ title: v }); else e.target.value = card.title; }}
            className="field-sizing-content -mx-1 w-full resize-none rounded-md border border-transparent px-1 py-0.5 text-lg leading-snug font-semibold text-slate-900 outline-none hover:border-slate-200 focus:border-primary"
          />

          {!page && meta}

          <div>
            <p className="mb-1.5 text-[13px] font-medium text-slate-700">Deskripsi</p>
            {page && !editDesc ? (
              // Halaman: deskripsi tampil utuh tanpa kotak; klik untuk mengedit.
              <div
                role={ro ? undefined : "button"}
                tabIndex={ro ? undefined : 0}
                onClick={() => !ro && setEditDesc(true)}
                onKeyDown={(e) => !ro && e.key === "Enter" && (e.preventDefault(), setEditDesc(true))}
                className={cx("-mx-2 rounded-md px-2 py-1.5 text-[14px] leading-relaxed whitespace-pre-wrap break-words", !ro && "cursor-text hover:bg-slate-50", !card.description && "text-slate-400")}
              >
                {card.description || (ro ? "Tidak ada deskripsi" : "Klik untuk menambahkan deskripsi…")}
              </div>
            ) : (
              <Textarea
                defaultValue={card.description ?? ""}
                rows={5}
                autoFocus={page}
                placeholder="Tambahkan detail, link referensi, catatan…"
                onBlur={(e) => { const v = e.target.value; if (v !== (card.description ?? "")) patch.mutate({ description: v || null }); setEditDesc(false); }}
                className={cx("text-[13.5px]", page && "field-sizing-content min-h-40 text-[14px] leading-relaxed")}
              />
            )}
          </div>

          <div>
            <p className="mb-2 flex items-center justify-between text-[13px] font-medium text-slate-700">
              Checklist <span className="text-xs font-normal text-slate-500 tabular-nums">{done}/{list.length}</span>
            </p>
            {list.length > 0 && <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${(done / list.length) * 100}%` }} /></div>}
            <ul className="grid gap-0.5">
              {list.map((it) => (
                <li key={it.id} className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-slate-50">
                  <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={it.done} onChange={(e) => setList(list.map((x) => (x.id === it.id ? { ...x, done: e.target.checked } : x)))} aria-label={it.text} />
                  <span className={cx("flex-1 text-[13px]", it.done && "text-slate-400 line-through")}>{it.text}</span>
                  {!ro && <button type="button" onClick={() => setList(list.filter((x) => x.id !== it.id))} className="rounded p-0.5 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-600 focus:opacity-100" aria-label={`Hapus ${it.text}`}><X size={14} /></button>}
                </li>
              ))}
            </ul>
            {!ro && (
              <Input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newItem.trim()) { e.preventDefault(); setList([...list, { id: crypto.randomUUID().slice(0, 8), text: newItem.trim(), done: false }]); setNewItem(""); }
                }}
                placeholder="+ Tambah item, tekan Enter"
                aria-label="Item checklist baru"
                className="mt-1.5 h-8"
              />
            )}
          </div>
        </fieldset>
        <Comments cardId={card.id} divisionId={divisionId} canModerate={board.canManage} />
        </div>
      </div>
      <footer className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400">
        {ro ? "Hanya bisa dilihat" : "Perubahan tersimpan otomatis"}<span className="hidden lg:inline"> · Esc untuk {page ? "kembali ke papan" : "menutup"}</span>
      </footer>
    </aside>
  );
}

function ColumnDialog({ target, divisionId, onClose }: { target: Column | "new" | null; divisionId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const col = target && target !== "new" ? target : null;
  const save = useMutation({
    mutationFn: (name: string) => (col ? api(`/board-columns/${col.id}`, { method: "PATCH", body: { name } }) : api(`/boards/${divisionId}/columns`, { method: "POST", body: { name } })),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["board", divisionId] }); onClose(); },
  });
  return (
    <Dialog open={!!target} onClose={onClose} title={col ? "Ganti nama kolom" : "Kolom baru"} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button type="submit" form="col-form" loading={save.isPending}>Simpan</Button></>}>
      <form id="col-form" key={col?.id ?? "new"} className="grid gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate(String(new FormData(e.currentTarget).get("name"))); }}>
        <Field label="Nama kolom" hint="Contoh: Ide, To do, Proses, Menunggu acc, Selesai"><Input name="name" required maxLength={40} defaultValue={col?.name} autoFocus /></Field>
        <ErrorText error={save.error} />
      </form>
    </Dialog>
  );
}

// Diskusi di kartu. Semua yang bisa melihat papan boleh berkomentar; daftar ikut segar lewat event board:changed.
function Comments({ cardId, divisionId, canModerate }: { cardId: string; divisionId: string; canModerate: boolean }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const toast = useToast();
  const key = ["board", divisionId, "comments", cardId];
  const list = useQuery({ queryKey: key, queryFn: () => api<Comment[]>(`/board-cards/${cardId}/comments`) });
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["board", divisionId] });
  const send = useMutation({
    mutationFn: () => api(`/board-cards/${cardId}/comments`, { method: "POST", body: { body: text } }),
    onSuccess: () => { setText(""); refresh(); },
    onError: (e) => toast(e.message, { error: true }),
  });
  const edit = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => api(`/board-comments/${id}`, { method: "PATCH", body: { body } }),
    onSuccess: () => { setEditing(null); refresh(); },
    onError: (e) => toast(e.message, { error: true }),
  });
  const del = useMutation({
    mutationFn: (id: string) => api(`/board-comments/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
    onError: (e) => toast(e.message, { error: true }),
  });
  const submit = () => text.trim() && !send.isPending && send.mutate();

  return (
    <section className="mt-6 border-t border-slate-100 pt-4" aria-label="Komentar">
      <p className="mb-3 flex items-center gap-1.5 text-[13px] font-medium text-slate-700">
        <MessageSquare size={14} aria-hidden /> Komentar <span className="text-xs font-normal text-slate-500 tabular-nums">{list.data?.length ?? ""}</span>
      </p>
      <ErrorText error={list.error} />
      {list.isLoading && <Skeleton className="h-12 rounded-lg" />}
      <ul className="grid gap-3">
        {list.data?.map((c) => (
          <li key={c.id} className="group flex gap-2.5">
            <Avatar name={c.author.name} src={c.author.avatarUrl} size={28} />
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline gap-2 text-xs">
                <b className="font-medium text-slate-900">{c.author.name}</b>
                <span className="text-slate-400">{timeFmt.format(new Date(c.createdAt))}{c.updatedAt !== c.createdAt && " · diedit"}</span>
                <span className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                  {c.author.id === me?.id && editing !== c.id && <button onClick={() => setEditing(c.id)} className="rounded p-0.5 text-slate-400 hover:text-slate-700" aria-label="Ubah komentar"><Pencil size={12} /></button>}
                  {(c.author.id === me?.id || canModerate) && <button onClick={() => confirm("Hapus komentar ini?") && del.mutate(c.id)} className="rounded p-0.5 text-slate-400 hover:text-red-600" aria-label="Hapus komentar"><Trash2 size={12} /></button>}
                </span>
              </p>
              {editing === c.id ? (
                <Textarea
                  autoFocus
                  rows={2}
                  defaultValue={c.body}
                  maxLength={2000}
                  aria-label="Ubah komentar"
                  className="mt-1 text-[13px]"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") { e.stopPropagation(); setEditing(null); }
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); const v = e.currentTarget.value.trim(); if (v && v !== c.body) edit.mutate({ id: c.id, body: v }); else setEditing(null); }
                  }}
                />
              ) : <p className="mt-0.5 text-[13px] whitespace-pre-wrap break-words text-slate-700">{c.body}</p>}
            </div>
          </li>
        ))}
      </ul>
      {list.data?.length === 0 && <p className="text-xs text-slate-400">Belum ada komentar.</p>}
      <form className="mt-3 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Textarea
          rows={2}
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder="Tulis komentar… (Enter kirim, Shift+Enter baris baru)"
          aria-label="Komentar baru"
          className="flex-1 text-[13px]"
        />
        <Button type="submit" size="sm" loading={send.isPending} disabled={!text.trim()} aria-label="Kirim komentar"><Send size={14} aria-hidden /></Button>
      </form>
    </section>
  );
}

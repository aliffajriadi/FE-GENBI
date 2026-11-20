"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ExternalLink, KanbanSquare, Pin, Plus, StickyNote, Search, SlidersHorizontal, X } from "lucide-react";
import { useToast } from "@/components/toast";
import { Button, cx, EmptyState, ErrorText, Input, PageHeader, Select, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useMe } from "@/lib/use-me";
import { type Board, type Card, type Column, accentOf, isOverdue, monthKey, monthLabel, shiftMonth } from "./_lib";
import { CardPanel } from "./_components/card-panel";
import { ColumnView } from "./_components/column-view";
import { ColumnDialog } from "./_components/column-dialog";
import { NotesDialog } from "./_components/notes-dialog";

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
  const [notesOpen, setNotesOpen] = useState(false);

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

          {/* Catatan & link divisi: yang di-pin langsung bisa dibuka dari atas papan. */}
          {(b.canEdit || b.notes.length > 0) && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              {b.notes.filter((n) => n.pinned).map((n) => {
                const inner = <><Pin size={12} className="shrink-0 text-amber-600" aria-hidden /><span className="truncate">{n.title}</span>{n.url && <ExternalLink size={11} className="shrink-0 text-slate-400" aria-hidden />}</>;
                const cls = "inline-flex max-w-60 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[12.5px] font-medium text-slate-800 hover:border-amber-300 hover:bg-amber-100";
                return n.url
                  ? <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" className={cls} title={n.body ?? n.url}>{inner}</a>
                  : <button key={n.id} onClick={() => setNotesOpen(true)} className={cls} title={n.body ?? undefined}>{inner}</button>;
              })}
              <Button variant="ghost" size="sm" onClick={() => setNotesOpen(true)}>
                <StickyNote size={14} aria-hidden /> Catatan & link{b.notes.length ? ` (${b.notes.length})` : ""}
              </Button>
            </div>
          )}

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
      {b && <NotesDialog open={notesOpen} board={b} divisionId={divisionId} onClose={() => setNotesOpen(false)} />}
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

"use client";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, AlignLeft, ArrowLeft, ArrowRight, CalendarDays, Check, CheckSquare, Flag, MessageSquare, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Menu, MenuItem } from "@/components/menu";
import { Avatar, Button, cx, ErrorText, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { type Board, type Card, type Column, PRIORITY, dayFmt, dueText, isOverdue } from "../_lib";

export function ColumnView({ col, cards, board, isFirst, isLast, onOpen, onDrop, onRename, onToggleDone, onShift, onDelete, divisionId, accent, filtered, selectedId }: {
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

"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlignLeft, ArrowLeft, CheckSquare, Info, Maximize2, MessageSquare, MoreHorizontal, Trash2, X } from "lucide-react";
import { Menu, MenuItem } from "@/components/menu";
import { useToast } from "@/components/toast";
import { Avatar, cx, Input, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { useMe } from "@/lib/use-me";
import { type Board, type Card, type ChecklistItem, PRIORITY, type Priority, accentOf, dueText, isOverdue } from "../_lib";
import { Comments } from "./card-comments";

// page = tampil sebagai halaman penuh (lebih lebar, komentar di kolom kanan); tanpa page = panel samping.
export function CardPanel({ card, board, divisionId, onClose, onExpand, page }: { card: Card; board: Board; divisionId: string; onClose: () => void; onExpand?: () => void; page?: boolean }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const toast = useToast();
  const key = ["board", divisionId];
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const [newItem, setNewItem] = useState("");
  const [editDesc, setEditDesc] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState("detail"); // bagian yang sedang terlihat (rail kiri ala Jira)
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

  // Rail ikon di sisi kiri panel: klik untuk lompat ke bagian, ikon aktif mengikuti posisi scroll.
  const sections = [
    { id: "detail", icon: Info, label: "Detail" },
    { id: "desc", icon: AlignLeft, label: "Deskripsi" },
    { id: "checklist", icon: CheckSquare, label: "Checklist", count: list.length },
    { id: "comments", icon: MessageSquare, label: "Komentar", count: card._count?.comments ?? 0 },
  ];
  const goTo = (id: string) => {
    setActive(id);
    bodyRef.current?.querySelector(`[data-sec="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const onBodyScroll = () => {
    const body = bodyRef.current;
    if (!body) return;
    const els = [...body.querySelectorAll<HTMLElement>("[data-sec]")];
    const top = body.getBoundingClientRect().top;
    const atBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 4;
    const cur = atBottom ? els.at(-1) : els.filter((el) => el.getBoundingClientRect().top - top <= 32).at(-1);
    setActive(cur?.dataset.sec ?? "detail");
  };

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

      <div className={page ? "contents" : "flex min-h-0 flex-1"}>
      {!page && (
        <nav aria-label="Bagian kartu" className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-slate-100 bg-slate-50 py-2">
          {sections.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => goTo(x.id)}
              aria-current={active === x.id ? "true" : undefined}
              title={x.label}
              aria-label={x.count != null ? `${x.label} (${x.count})` : x.label}
              className={cx("flex w-10 flex-col items-center gap-0.5 rounded-md py-2 transition", active === x.id ? "bg-slate-200/80 text-slate-900" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800")}
            >
              <x.icon size={17} aria-hidden />
              {x.count != null && <span className="min-w-4 rounded-full bg-slate-200 px-1 text-[10px] leading-4 font-medium text-slate-600 tabular-nums">{x.count}</span>}
            </button>
          ))}
        </nav>
      )}
      <div ref={bodyRef} onScroll={page ? undefined : onBodyScroll} className={page ? "grid gap-8 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]" : "min-w-0 flex-1 overflow-y-auto px-4 py-4"}>
        {page && (
          <fieldset disabled={ro} className="h-fit rounded-lg border border-slate-200 p-4 lg:sticky lg:top-4 lg:order-last">
            <p className="mb-3 text-[13px] font-medium text-slate-700">Detail</p>
            {meta}
          </fieldset>
        )}
        <div>
        <fieldset disabled={ro} className="grid content-start gap-5">
          <textarea
            data-sec="detail"
            defaultValue={card.title}
            rows={1}
            maxLength={200}
            aria-label="Judul kartu"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), e.currentTarget.blur())}
            onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== card.title) patch.mutate({ title: v }); else e.target.value = card.title; }}
            className="field-sizing-content -mx-1 w-full resize-none rounded-md border border-transparent px-1 py-0.5 text-lg leading-snug font-semibold text-slate-900 outline-none hover:border-slate-200 focus:border-primary"
          />

          {!page && meta}

          <div data-sec="desc" className="scroll-mt-2">
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

          <div data-sec="checklist" className="scroll-mt-2">
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
        <div data-sec="comments" className="scroll-mt-2"><Comments cardId={card.id} divisionId={divisionId} canModerate={board.canManage} /></div>
        </div>
      </div>
      </div>
      <footer className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400">
        {ro ? "Hanya bisa dilihat" : "Perubahan tersimpan otomatis"}<span className="hidden lg:inline"> · Esc untuk {page ? "kembali ke papan" : "menutup"}</span>
      </footer>
    </aside>
  );
}

"use client";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Archive, Lock, Megaphone, MessageSquare, Search, Users, UsersRound } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { Avatar, Button, cx, ErrorText, Field, Input, Select, Textarea } from "@/components/ui";
import { api, apiPage } from "@/lib/api";
import type { Division } from "@/lib/types";

export type ChatChannel = {
  id: string; name: string; description: string | null; type: "GENERAL" | "CORE" | "DIVISION" | "CUSTOM"; readOnly: boolean; system: boolean;
  division: string | null; divisionId: string | null; canManage: boolean; canPost: boolean;
};
type Person = { id: string; name: string; avatarUrl: string | null; position: string | null; division: { id: string; name: string } | null };
type Scope = "ALL" | "DIVISION" | "MEMBERS";

// Buat / atur diskusi. Kadiv (lockedDivisionId terisi) hanya bisa memilih divisinya & anggota divisinya — server juga memaksa aturan ini.
export function ChannelDialog({ open, onClose, channel, lockedDivisionId, onSaved }: {
  open: boolean; onClose: () => void; channel?: ChatChannel | null; lockedDivisionId: string | null; onSaved: (id: string | null) => void;
}) {
  const toast = useToast();
  const editing = !!channel;
  const isGlobal = lockedDivisionId === null;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<Scope>("MEMBERS");
  const [divisionId, setDivisionId] = useState("");
  const [readOnly, setReadOnly] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");

  const current = useQuery({
    queryKey: ["channel-members", channel?.id],
    queryFn: () => api<{ id: string }[]>(`/channels/${channel!.id}/members`),
    enabled: open && channel?.type === "CUSTOM",
  });

  useEffect(() => {
    if (!open) return;
    setName(channel?.name ?? "");
    setDescription(channel?.description ?? "");
    setReadOnly(channel?.readOnly ?? false);
    setScope(channel ? (channel.type === "GENERAL" ? "ALL" : channel.type === "CUSTOM" ? "MEMBERS" : "DIVISION") : isGlobal ? "ALL" : "MEMBERS");
    setDivisionId(channel?.divisionId ?? lockedDivisionId ?? "");
    setPicked(new Set());
    setQ("");
  }, [open, channel, isGlobal, lockedDivisionId]);
  useEffect(() => { if (current.data) setPicked(new Set(current.data.map((u) => u.id))); }, [current.data]);

  const divisions = useQuery({ queryKey: ["divisions"], queryFn: () => api<Division[]>("/divisions"), enabled: open && isGlobal });
  const showPicker = scope === "MEMBERS" && (!editing || channel?.type === "CUSTOM");
  // Kandidat anggota: Kadiv terkunci ke divisinya; pengurus inti bisa lintas divisi.
  const candidateDivision = lockedDivisionId ?? (divisionId || "");
  const candidates = useQuery({
    queryKey: ["members", "picker", candidateDivision],
    queryFn: () => apiPage<Person[]>(`/members?limit=100${candidateDivision ? `&divisionId=${candidateDivision}` : ""}`),
    enabled: open && showPicker,
  });
  const people = useMemo(() => (candidates.data?.data ?? []).filter((p) => p.name.toLowerCase().includes(q.toLowerCase())), [candidates.data, q]);

  const save = useMutation({
    mutationFn: () => {
      const memberIds = [...picked];
      if (editing) return api<ChatChannel>(`/channels/${channel!.id}`, { method: "PATCH", body: { ...(channel!.system ? {} : { name }), description, readOnly, ...(channel!.type === "CUSTOM" ? { memberIds } : {}) } });
      return api<ChatChannel>("/channels", { method: "POST", body: { name, description, scope, divisionId: scope === "ALL" ? null : divisionId || null, memberIds, readOnly } });
    },
    onSuccess: (c) => { toast(editing ? "Pengaturan diskusi disimpan" : `Diskusi #${c.name} dibuat`); onSaved(c.id); onClose(); },
  });
  const archive = useMutation({
    mutationFn: () => api(`/channels/${channel!.id}`, { method: "DELETE" }),
    onSuccess: () => { toast("Diskusi diarsipkan"); onSaved(null); onClose(); },
    onError: (e) => toast(e.message, { error: true }),
  });

  const scopes: { v: Scope; t: string; d: string; icon: typeof Users; show: boolean }[] = [
    { v: "ALL", t: "Semua anggota", d: "Seluruh anggota periode ini", icon: UsersRound, show: isGlobal },
    { v: "DIVISION", t: isGlobal ? "Satu divisi" : "Seluruh divisiku", d: "Otomatis semua anggota divisi", icon: Users, show: true },
    { v: "MEMBERS", t: "Anggota pilihan", d: isGlobal ? "Pilih orang tertentu" : "Pilih dari anggota divisimu", icon: Lock, show: true },
  ];

  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="sheet"
      title={editing ? `Atur #${channel!.name}` : "Buat diskusi"}
      desc={editing ? undefined : isGlobal ? "Tentukan siapa yang bisa melihat dan mengirim pesan." : "Diskusi ini khusus untuk divisimu."}
      footer={
        <div className="flex w-full items-center gap-2">
          {editing && !channel!.system && (
            <Button variant="ghost" className="mr-auto text-red-600 hover:bg-red-50 hover:text-red-700" loading={archive.isPending} onClick={() => confirm(`Arsipkan #${channel!.name}? Diskusi hilang dari daftar, riwayat tetap tersimpan.`) && archive.mutate()}>
              <Archive size={15} aria-hidden /> Arsipkan
            </Button>
          )}
          <Button variant="ghost" className={editing && !channel!.system ? "" : "ml-auto"} onClick={onClose}>Batal</Button>
          <Button loading={save.isPending} disabled={name.trim().length < 2 || (scope === "DIVISION" && !divisionId && isGlobal && !editing)} onClick={() => save.mutate()}>
            {editing ? "Simpan" : "Buat diskusi"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-6">
        <Field label="Nama diskusi" hint={channel?.system ? "Nama channel bawaan tidak bisa diubah." : undefined}>
          <Input icon={MessageSquare} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="persiapan seminar" disabled={channel?.system} autoFocus={!editing} />
        </Field>
        <Field label="Deskripsi" hint="Opsional, tampil di bawah nama diskusi.">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} rows={2} placeholder="Koordinasi panitia seminar literasi keuangan 20 Des" />
        </Field>

        {!editing && (
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-[13px] font-medium text-slate-700">Siapa yang bisa melihat</legend>
            {scopes.filter((s) => s.show).map(({ v, t, d, icon: Icon }) => (
              <label key={v} className={cx("flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition", scope === v ? "border-blue-300 bg-blue-50/40" : "border-slate-200 hover:border-slate-300")}>
                <input type="radio" name="scope" className="mt-1 accent-[var(--primary)]" checked={scope === v} onChange={() => setScope(v)} />
                <Icon size={18} className="mt-0.5 text-slate-500" aria-hidden />
                <span><span className="block text-[13.5px] font-medium">{t}</span><span className="text-xs text-slate-500">{d}</span></span>
              </label>
            ))}
            {isGlobal && scope !== "ALL" && (
              <Field label={scope === "DIVISION" ? "Divisi" : "Batasi ke divisi (opsional)"} className="mt-2">
                <Select value={divisionId} onChange={(e) => { setDivisionId(e.target.value); setPicked(new Set()); }}>
                  <option value="">{scope === "DIVISION" ? "Pilih divisi" : "Lintas divisi"}</option>
                  {divisions.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </Select>
              </Field>
            )}
          </fieldset>
        )}
        {editing && (
          <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-[13px] text-slate-600">
            Dilihat oleh: <b className="font-medium">{channel!.type === "GENERAL" ? "semua anggota" : channel!.type === "CORE" ? "pengurus inti" : channel!.type === "DIVISION" ? `seluruh divisi ${channel!.division ?? ""}` : "anggota pilihan di bawah"}</b>
          </p>
        )}

        {showPicker && (
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-slate-700">Anggota ({picked.size} dipilih)</span>
              {people.length > 0 && <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setPicked(new Set([...picked, ...people.map((p) => p.id)]))}>Pilih semua</button>}
            </div>
            <div className="rounded-lg border border-slate-200">
              <div className="border-b border-slate-100 p-2"><Input icon={Search} placeholder="Cari nama…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari anggota" /></div>
              <ul className="max-h-72 overflow-y-auto p-1">
                {candidates.isLoading && <li className="px-3 py-6 text-center text-[13px] text-slate-400">Memuat…</li>}
                {people.map((p) => (
                  <li key={p.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-slate-50">
                      <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={picked.has(p.id)} onChange={() => toggle(p.id)} />
                      <Avatar name={p.name} src={p.avatarUrl} size={28} />
                      <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px]">{p.name}</span><span className="block truncate text-xs text-slate-400">{p.position}{p.division ? ` · ${p.division.name}` : ""}</span></span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-slate-500">Kamu otomatis ikut sebagai anggota.</p>
          </div>
        )}

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-[13px] font-medium text-slate-700">Siapa yang bisa mengirim pesan</legend>
          {[{ v: false, t: "Semua yang bisa melihat", d: "Diskusi biasa", icon: MessageSquare }, { v: true, t: "Hanya pengelola", d: "Mode pengumuman, anggota lain hanya membaca", icon: Megaphone }].map(({ v, t, d, icon: Icon }) => (
            <label key={t} className={cx("flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition", readOnly === v ? "border-blue-300 bg-blue-50/40" : "border-slate-200 hover:border-slate-300")}>
              <input type="radio" name="post" className="mt-1 accent-[var(--primary)]" checked={readOnly === v} onChange={() => setReadOnly(v)} />
              <Icon size={18} className="mt-0.5 text-slate-500" aria-hidden />
              <span><span className="block text-[13.5px] font-medium">{t}</span><span className="text-xs text-slate-500">{d}</span></span>
            </label>
          ))}
        </fieldset>
        <ErrorText error={save.error} />
      </div>
    </Dialog>
  );
}

// Daftar siapa saja yang bisa melihat sebuah diskusi.
export function MembersDialog({ channel, onClose }: { channel: ChatChannel | null; onClose: () => void }) {
  const q = useQuery({ queryKey: ["channel-members", channel?.id], queryFn: () => api<{ id: string; name: string; avatarUrl: string | null }[]>(`/channels/${channel!.id}/members`), enabled: !!channel });
  return (
    <Dialog open={!!channel} onClose={onClose} title={`Anggota #${channel?.name ?? ""}`} desc={q.data ? `${q.data.length} orang bisa melihat diskusi ini` : undefined} size="sm">
      <ul className="-mx-2 grid gap-0.5">
        {q.data?.map((u) => (
          <li key={u.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5">
            <Avatar name={u.name} src={u.avatarUrl} size={30} /><span className="text-[14px]">{u.name}</span>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

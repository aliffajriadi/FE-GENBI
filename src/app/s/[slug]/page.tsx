"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, CalendarClock, Check, Lock, LogIn, PenLine, Plus, Sparkles, Users, X } from "lucide-react";
import { useConfirm } from "@/components/confirm";
import { Dialog } from "@/components/dialog";
import { DEFAULT_THEME, QuestionList, themeVars } from "@/components/form-view";
import { useToast } from "@/components/toast";
import { Avatar, cx, ErrorText, Skeleton } from "@/components/ui";
import { accessToken, api } from "@/lib/api";
import type { Answer, Question } from "@/lib/forms";
import { GROUP_TONES, type SlotGroupView } from "@/lib/slots";

type View = {
  title: string; description: string | null; closesAt: string | null; open: boolean; createdBy: string; optionNoun: string; joinLabel: string;
  questions: Question[]; mineGroupId: string | null; myAnswers: Record<string, Answer> | null; meId: string; groups: SlotGroupView[];
};
const dateFmt = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
const MAX_EMPTY = 24; // slot kosong yang digambar per pilihan; sisanya jadi "+N"
const MAX_FACES = 40; // foto yang digambar untuk pilihan tanpa batas; sisanya jadi "+N"
const DIALOG_THEME = themeVars({ ...DEFAULT_THEME, style: "minimal", background: "#ffffff", radius: "sharp" }); // kotak isian di modal
const first = (name: string) => name.split(" ")[0];

// Halaman slot (/s/<slug>): semua pilihan tampil sekaligus dengan foto anggota yang sudah memilih.
// Gaya: sudut tegas (rounded-md) untuk kartu, tombol & chip; foto profil tetap bulat.
export default function SlotPage() {
  const { slug } = useParams<{ slug: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [authed, setAuthed] = useState<boolean | null>(null);
  // Kalau token kedaluwarsa, api() melempar ke /login; "next" membuat login kembali ke halaman ini.
  useEffect(() => { const t = !!accessToken(); setAuthed(t); if (t) try { sessionStorage.setItem("next", location.pathname); } catch {} }, []);
  const key = ["slot-view", slug];
  const view = useQuery({ queryKey: key, queryFn: () => api<View>(`/slot-view/${slug}`), enabled: !!authed, retry: false, refetchInterval: 10_000 });
  const v = view.data;
  useEffect(() => { if (v) try { sessionStorage.removeItem("next"); } catch {} }, [v]);

  const [asking, setAsking] = useState<SlotGroupView | null>(null); // modal jawaban
  const [joined, setJoined] = useState<SlotGroupView | null>(null); // modal sukses
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [missing, setMissing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const refresh = () => { setBusy(null); qc.invalidateQueries({ queryKey: key }); };
  const join = useMutation({
    mutationFn: ({ group, answers }: { group: SlotGroupView; answers: Record<string, Answer> }) => { setBusy(group.id); return api(`/slot-view/${slug}/join`, { method: "POST", body: { groupId: group.id, answers } }); },
    onSuccess: (_, { group }) => {
      if (group.id === v?.mineGroupId) toast("Jawaban diperbarui"); else setJoined(group);
      setAsking(null); refresh();
    },
    onError: (e) => { if (!asking) toast(e.message, { error: true }); refresh(); },
  });
  const leave = useMutation({
    mutationFn: (groupId: string) => { setBusy(groupId); return api(`/slot-view/${slug}/leave`, { method: "POST" }); },
    onSuccess: () => { toast("Pilihanmu dibatalkan"); refresh(); },
    onError: (e) => { toast(e.message, { error: true }); refresh(); },
  });

  if (authed === false || (view.error as { status?: number } | null)?.status === 401) {
    return <Gate icon={<Lock size={22} />} title="Khusus anggota GenBI" desc="Masuk dulu untuk melihat siapa saja yang sudah ikut dan memilih." action={<button onClick={login} className="inline-flex h-11 items-center gap-2 rounded-md bg-white px-6 text-[14px] font-semibold text-primary shadow-lg transition hover:bg-white/90"><LogIn size={16} aria-hidden /> Masuk</button>} />;
  }
  if (view.error) return <Gate icon={<X size={22} />} title="List tidak ditemukan" desc="Link salah ketik atau list sudah dihapus pembuatnya." />;

  const mine = v?.groups.find((g) => g.id === v.mineGroupId) ?? null;
  const everyone = v?.groups.flatMap((g) => g.members) ?? [];
  const limited = !!v && v.groups.every((g) => g.capacity != null);
  const cap = limited ? v!.groups.reduce((n, g) => n + g.capacity!, 0) : null;
  const noun = v?.optionNoun.toLowerCase() ?? "pilihan";

  async function pick(g: SlotGroupView) {
    if (!v) return;
    if (mine && mine.id !== g.id && !(await confirm({ title: `Pindah ke ${g.name}?`, desc: <>Kamu akan keluar dari <b>{mine.name}</b> dan slotmu di sana dilepas untuk orang lain.</>, confirmLabel: "Pindah" }))) return;
    if (!v.questions.length) return join.mutate({ group: g, answers: {} });
    join.reset(); setMissing(null); setAnswers(v.myAnswers ?? {}); setAsking(g);
  }
  async function cancel(g: SlotGroupView) {
    if (await confirm({ title: "Batalkan pilihan?", desc: <>Namamu akan dihapus dari <b>{g.name}</b>{g.capacity != null ? " dan slotnya terbuka untuk orang lain" : ""}.</>, confirmLabel: "Ya, batalkan", danger: true })) leave.mutate(g.id);
  }
  function submitAnswers() {
    const empty = v!.questions.find((q) => q.required && ![answers[q.id] ?? ""].flat().some((x) => x.trim()));
    if (empty) return setMissing(empty.id);
    join.mutate({ group: asking!, answers });
  }

  return (
    <main className="min-h-dvh bg-[#f4f6fb]">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[radial-gradient(120%_100%_at_10%_0%,#2563c9_0%,#11418b_45%,#081f45_100%)] px-4 pt-6 pb-28 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.06)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.06)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)] bg-[size:40px_40px]" aria-hidden />
        <div className="pointer-events-none absolute -top-24 -right-20 size-96 rounded-full bg-sky-400/25 blur-3xl motion-safe:animate-[link-float_12s_ease-in-out_infinite]" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 left-0 size-80 rounded-full bg-amber-300/15 blur-3xl motion-safe:animate-[link-float_14s_ease-in-out_infinite_reverse]" aria-hidden />
        <div className="relative mx-auto max-w-6xl">
          <div className="flex items-center justify-between gap-3 text-white/85">
            <span className="flex items-center gap-2"><img src="/logo-white.png" alt="" width={26} height={26} className="size-[26px]" /><span className="font-serif text-[16px]">MyGenBI</span></span>
            {v && (v.open
              ? <span className="inline-flex items-center gap-2 rounded-md bg-emerald-400/15 px-2.5 py-1 text-[12.5px] font-medium text-emerald-200 ring-1 ring-emerald-300/30"><span className="relative flex size-2"><span className="absolute inset-0 rounded-full bg-emerald-300 motion-safe:animate-[slot-ping_1.6s_ease-out_infinite]" /><span className="relative size-2 rounded-full bg-emerald-300" /></span>Masih dibuka</span>
              : <span className="rounded-md bg-white/10 px-2.5 py-1 text-[12.5px] font-medium text-white/70 ring-1 ring-white/15">Sudah ditutup</span>)}
          </div>
          {v ? (
            <div className="page-in">
              <p className="mt-10 text-[13px] font-medium tracking-[0.14em] text-sky-200/80 uppercase">{v.optionNoun} · oleh {v.createdBy}</p>
              <h1 className="mt-2 max-w-3xl text-[32px] leading-[1.1] font-bold tracking-tight sm:text-5xl">{v.title}</h1>
              {v.description && <p className="mt-4 max-w-2xl text-[15px] leading-relaxed whitespace-pre-wrap text-white/75">{v.description}</p>}
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {everyone.length > 0 && (
                  <span className="flex items-center gap-3 rounded-md bg-white/10 py-1 pr-3 pl-1.5 ring-1 ring-white/15 backdrop-blur-sm">
                    <span className="flex -space-x-2.5">{everyone.slice(-5).reverse().map((m) => <Avatar key={m.id} name={m.name} src={m.avatarUrl} size={28} className="ring-2 ring-[#11418b]" />)}</span>
                    <span className="text-[13px] text-white/85"><b className="text-white">{everyone.length}</b> orang sudah memilih</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-[13px] text-white/85 ring-1 ring-white/15"><Users size={14} aria-hidden /> {v.groups.length} {noun}{cap != null && <> · <b className="text-white tabular-nums">{cap - everyone.length}</b> slot tersisa</>}</span>
                {v.closesAt && <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-[13px] text-white/85 ring-1 ring-white/15"><CalendarClock size={14} aria-hidden /> Tutup {dateFmt.format(new Date(v.closesAt))}</span>}
              </div>
            </div>
          ) : <div className="mt-10 grid gap-3"><div className="h-4 w-40 rounded bg-white/15" /><div className="h-10 w-2/3 rounded bg-white/15" /></div>}
        </div>
      </section>

      <div className="relative mx-auto -mt-20 max-w-6xl px-4 pb-16">
        {/* ── Status kamu ── */}
        {v && (
          <div className="page-in mb-5 flex flex-wrap items-center gap-3 rounded-lg bg-white p-4 shadow-[0_10px_40px_-12px_rgb(15_23_42/0.25)] ring-1 ring-slate-200/70 sm:p-5">
            {mine ? (
              <>
                <span className="grid size-11 shrink-0 place-items-center rounded-md bg-emerald-500 text-white"><Check size={22} strokeWidth={3} aria-hidden /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-slate-500">Pilihanmu</p>
                  <p className="truncate text-[17px] font-semibold text-slate-900">{mine.name}</p>
                </div>
                {v.open && (
                  <span className="flex gap-2">
                    {v.questions.length > 0 && <button onClick={() => pick(mine)} className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><PenLine size={14} aria-hidden /> Ubah jawaban</button>}
                    <button onClick={() => cancel(mine)} className="inline-flex h-9 items-center rounded-md px-3 text-[13px] font-medium text-red-600 ring-1 ring-red-200 hover:bg-red-50">Batal</button>
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="grid size-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><Sparkles size={20} aria-hidden /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-slate-900">{v.open ? `Pilih salah satu ${noun} di bawah` : "Pendaftaran sudah ditutup"}</p>
                  <p className="text-[13px] text-slate-500">{v.open ? `Tekan “${v.joinLabel}”${v.questions.length ? ", lalu isi jawaban singkat" : ""}. Kamu masih bisa pindah atau batal nanti.` : "Hubungi pembuatnya kalau ada perubahan."}</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Kartu pilihan ── */}
        {!v ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-80 rounded-lg" />)}</div>
        ) : (
          <div className={cx("grid gap-4 sm:grid-cols-2", v.groups.length >= 3 && "lg:grid-cols-3")}>
            {v.groups.map((g, gi) => {
              const tone = GROUP_TONES[gi % GROUP_TONES.length];
              const isMine = mine?.id === g.id;
              const full = g.capacity != null && g.members.length >= g.capacity;
              const empty = g.capacity != null ? Math.max(g.capacity - g.members.length, 0) : 0;
              const faces = g.capacity != null ? g.members : g.members.slice(0, MAX_FACES);
              const pending = busy === g.id && (join.isPending || leave.isPending);
              const pct = g.capacity ? Math.min(g.members.length / g.capacity, 1) : 0;
              return (
                <article key={g.id} style={{ animationDelay: `${gi * 60}ms` }}
                  className={cx("page-in group/card relative flex flex-col overflow-hidden rounded-lg bg-white shadow-sm ring-1 transition duration-300",
                    isMine ? cx("ring-2 shadow-lg", tone.ring) : "ring-slate-200/80 hover:-translate-y-0.5 hover:shadow-xl", full && !isMine && "opacity-80")}>
                  <div className={cx("h-1", tone.bar)} aria-hidden />
                  <header className={cx("relative bg-gradient-to-br to-transparent px-5 pt-4 pb-4", tone.grad)}>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-[18px] font-semibold text-slate-900">{g.name}</h2>
                        {g.description && <p className="mt-1 text-[13px] text-slate-600">{g.description}</p>}
                        {isMine && <span className={cx("mt-2 inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[11.5px] font-semibold", tone.soft)}><Check size={12} aria-hidden /> Pilihanmu</span>}
                        {full && !isMine && <span className="mt-2 inline-flex rounded-sm bg-slate-900 px-2 py-0.5 text-[11px] font-bold tracking-wide text-white">PENUH</span>}
                      </div>
                      {/* Angka + cincin progres (berkuota) atau angka saja (tanpa batas) */}
                      {g.capacity != null ? (
                        <span className="relative grid size-14 shrink-0 place-items-center" aria-label={`${g.members.length} dari ${g.capacity}`}>
                          <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden>
                            <circle cx="22" cy="22" r="19" fill="none" stroke="rgb(15 23 42 / 0.08)" strokeWidth="4" />
                            <circle cx="22" cy="22" r="19" fill="none" stroke={tone.hex} strokeWidth="4" strokeDasharray={`${pct * 119.4} 119.4`} className="transition-[stroke-dasharray] duration-700" />
                          </svg>
                          <span className="text-[13px] leading-none font-bold text-slate-900 tabular-nums">{g.members.length}<span className="text-[10px] font-medium text-slate-400">/{g.capacity}</span></span>
                        </span>
                      ) : (
                        <span className="shrink-0 text-right"><span className="block text-2xl leading-none font-bold text-slate-900 tabular-nums">{g.members.length}</span><span className="text-[11px] text-slate-500">orang</span></span>
                      )}
                    </div>
                  </header>

                  <ul className="grid flex-1 grid-cols-4 content-start gap-x-2 gap-y-4 px-5 py-5" aria-label={`Yang memilih ${g.name}`}>
                    {faces.map((m) => {
                      const me = m.id === v.meId;
                      return (
                        <li key={m.id} className="flex min-w-0 flex-col items-center gap-1.5 text-center motion-safe:animate-[slot-pop_420ms_cubic-bezier(0.22,1,0.36,1)_backwards]" title={m.name}>
                          <span className="relative">
                            <Avatar name={m.name} src={m.avatarUrl} size={52} className={cx("shadow-md ring-[3px]", me ? tone.ring : "ring-white")} />
                            {me && <span className={cx("absolute -right-0.5 -bottom-0.5 grid size-5 place-items-center rounded-full text-white ring-2 ring-white", tone.bar)}><Check size={11} strokeWidth={3} aria-hidden /></span>}
                          </span>
                          <span className={cx("w-full truncate text-[12px] leading-tight", me ? "font-semibold text-slate-900" : "text-slate-600")}>{me ? "Kamu" : first(m.name)}</span>
                        </li>
                      );
                    })}
                    {g.members.length > faces.length && <li className="col-span-4 text-center text-xs text-slate-400">+{g.members.length - faces.length} orang lagi</li>}
                    {Array.from({ length: Math.min(empty, MAX_EMPTY) }, (_, i) => (
                      <li key={`e${i}`} className="flex flex-col items-center gap-1.5" aria-hidden>
                        <span className="grid size-[52px] place-items-center rounded-full border-2 border-dashed border-slate-200 text-slate-300 transition group-hover/card:border-slate-300"><Plus size={18} /></span>
                        <span className="text-[11.5px] text-slate-300">kosong</span>
                      </li>
                    ))}
                    {empty > MAX_EMPTY && <li className="col-span-4 text-center text-xs text-slate-400">+{empty - MAX_EMPTY} slot kosong lagi</li>}
                    {!g.members.length && g.capacity == null && <li className="col-span-4 py-6 text-center text-[13px] text-slate-400">Belum ada yang memilih. Jadilah yang pertama!</li>}
                  </ul>

                  <footer className="px-4 pb-4">
                    {isMine ? (
                      <div className={cx("flex h-11 items-center justify-center gap-2 rounded-md text-[14px] font-semibold", tone.soft)}><Check size={16} aria-hidden /> Kamu di sini</div>
                    ) : (
                      <button onClick={() => pick(g)} disabled={!v.open || full || pending}
                        className={cx("flex h-11 w-full items-center justify-center gap-2 rounded-md text-[14px] font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed",
                          full || !v.open ? "bg-slate-100 text-slate-400" : "bg-primary text-white shadow-md shadow-primary/25 hover:bg-primary-hover hover:shadow-lg")}>
                        {pending ? "Memproses…" : !v.open ? "Ditutup" : full ? "Penuh" : mine ? <><ArrowRightLeft size={15} aria-hidden /> Pindah ke sini</> : <><Plus size={16} aria-hidden /> {v.joinLabel}</>}
                      </button>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>
        )}
        {v && <p className="mt-8 text-center text-xs text-slate-400">Diperbarui otomatis · MyGenBI</p>}
      </div>

      {/* Modal jawaban */}
      {v && (
        <Dialog open={!!asking} onClose={() => setAsking(null)} title={asking ? (mine?.id === asking.id ? "Ubah jawaban" : `${v.joinLabel} · ${asking.name}`) : ""}
          desc={asking && mine?.id !== asking.id ? "Jawabanmu hanya bisa dilihat oleh pembuat." : undefined}>
          <div style={DIALOG_THEME}>
            <QuestionList questions={v.questions} answers={answers} minimal missing={missing} pending={join.isPending}
              onAnswer={(id, x) => { setAnswers((a) => ({ ...a, [id]: x })); if (missing === id) setMissing(null); }}
              onSubmit={submitAnswers} error={<ErrorText error={join.error} />} submitLabel={asking && mine?.id === asking.id ? "Simpan jawaban" : v.joinLabel} />
          </div>
        </Dialog>
      )}

      {/* Modal sukses */}
      <Dialog open={!!joined} onClose={() => setJoined(null)} title="Berhasil!" size="sm">
        <div className="flex flex-col items-center py-2 text-center">
          <span className="relative grid size-20 place-items-center">
            <span className="absolute inset-0 rounded-md bg-emerald-400/30 motion-safe:animate-[slot-ping_1.2s_ease-out_2]" aria-hidden />
            <span className="grid size-20 place-items-center rounded-md bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 motion-safe:animate-[slot-pop_500ms_cubic-bezier(0.22,1,0.36,1)]"><Check size={40} strokeWidth={3} aria-hidden /></span>
          </span>
          <p className="mt-5 text-[15px] text-slate-600">Namamu sudah masuk</p>
          <p className="text-xl font-bold text-slate-900">{joined?.name}</p>
          <button onClick={() => setJoined(null)} className="mt-6 h-10 w-full rounded-md bg-primary text-[14px] font-semibold text-white hover:bg-primary-hover" autoFocus>Oke</button>
        </div>
      </Dialog>
      {confirmDialog}
    </main>
  );
}

function login() { try { sessionStorage.setItem("next", location.pathname); } catch {} location.href = "/login"; }

// Layar penuh untuk belum login / tidak ditemukan, senada dengan hero.
function Gate({ icon, title, desc, action }: { icon: React.ReactNode; title: string; desc: string; action?: React.ReactNode }) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[radial-gradient(120%_100%_at_50%_0%,#2563c9_0%,#11418b_45%,#081f45_100%)] px-4 text-white">
      <div className="pointer-events-none absolute -top-24 -left-24 size-80 rounded-full bg-sky-400/25 blur-3xl" aria-hidden />
      <div className="page-in relative w-full max-w-sm text-center">
        <img src="/logo-white.png" alt="MyGenBI" width={48} height={48} className="mx-auto size-12" />
        <span className="mx-auto mt-8 grid size-12 place-items-center rounded-md bg-white/10 ring-1 ring-white/20">{icon}</span>
        <h1 className="mt-4 text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-[14px] text-white/70">{desc}</p>
        {action && <div className="mt-7 flex justify-center">{action}</div>}
      </div>
    </main>
  );
}

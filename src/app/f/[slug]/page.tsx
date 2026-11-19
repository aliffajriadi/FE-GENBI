"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Lock, LogIn } from "lucide-react";
import { DEFAULT_THEME, FormNotice, FormShell, QuestionList, type FormTheme } from "@/components/form-view";
import { ErrorText, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import type { Answer, Question } from "@/lib/forms";

type PublicForm = {
  title: string; description: string | null; questions: Question[]; audience: "PUBLIC" | "MEMBERS"; closesAt: string | null;
  theme: FormTheme | null; open: boolean; loggedIn: boolean; submitted: boolean;
};
const dateFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

// Halaman isi form (/f/<slug>). Form publik tanpa login; form anggota wajib login dan nama tercatat otomatis.
export default function FillFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const form = useQuery({ queryKey: ["fill", slug], queryFn: () => api<PublicForm>(`/public/forms/${slug}`), retry: false });
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [honeypot, setHoneypot] = useState("");
  const [missing, setMissing] = useState<string | null>(null);
  const send = useMutation({ mutationFn: () => api(`/public/forms/${slug}/responses`, { method: "POST", body: { answers, website: honeypot } }) });
  const f = form.data;

  if (form.isLoading) return <main className="mx-auto max-w-2xl px-4 pt-10"><Skeleton className="h-64 rounded-xl" /></main>;
  if (!f) {
    return (
      <FormShell form={{ title: "Form tidak ditemukan", description: "Link salah ketik atau form sudah dihapus.", theme: null }}><span /></FormShell>
    );
  }
  const minimal = (f.theme ?? DEFAULT_THEME).style === "minimal";
  const answer = (id: string, v: Answer) => { setAnswers((a) => ({ ...a, [id]: v })); if (missing === id) setMissing(null); };
  const submit = () => {
    // Cek wajib di klien supaya bisa langsung lompat ke pertanyaan yang kosong; server tetap memvalidasi ulang.
    const empty = f.questions.find((q) => q.required && ![answers[q.id] ?? ""].flat().some((v) => v.trim()));
    if (empty) { setMissing(empty.id); document.getElementById(`q-${empty.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    send.mutate();
  };
  const login = () => { try { sessionStorage.setItem("next", location.pathname); } catch {} location.href = "/login"; };
  const btn = "inline-flex h-10 items-center gap-2 rounded-[var(--f-r)] bg-[var(--f-accent)] px-5 text-[14px] font-semibold text-[var(--f-on-accent)]";
  const done = <CheckCircle2 size={40} className="text-green-500" />;

  const meta = (
    <span className="flex flex-wrap gap-x-4 gap-y-1">
      {f.audience === "MEMBERS" ? <span className="inline-flex items-center gap-1"><Lock size={12} aria-hidden /> Nama kamu tercatat otomatis</span> : <span>Tidak perlu login</span>}
      {f.closesAt && <span>Ditutup {dateFmt.format(new Date(f.closesAt))}</span>}
      {f.questions.some((q) => q.required) && <span><span className="text-red-500">*</span> wajib diisi</span>}
    </span>
  );

  let body: React.ReactNode;
  if (send.isSuccess) body = <FormNotice minimal={minimal} icon={done} title="Jawaban terkirim" desc="Terima kasih sudah mengisi form ini." />;
  else if (!f.open) body = <FormNotice minimal={minimal} title="Form sudah ditutup" desc="Form ini tidak menerima jawaban lagi." />;
  else if (f.audience === "MEMBERS" && !f.loggedIn) body = <FormNotice minimal={minimal} icon={<Lock size={34} className="text-[var(--f-accent)]" />} title="Khusus anggota GenBI" desc="Masuk dulu untuk mengisi form ini." action={<button onClick={login} className={btn}><LogIn size={15} aria-hidden /> Masuk</button>} />;
  else if (f.submitted) body = <FormNotice minimal={minimal} icon={done} title="Kamu sudah mengisi form ini" desc="Setiap anggota hanya bisa mengisi sekali." />;
  else body = (
    <>
      <QuestionList questions={f.questions} answers={answers} onAnswer={answer} missing={missing} onSubmit={submit} onReset={() => setAnswers({})}
        pending={send.isPending} error={<ErrorText error={send.error} />} minimal={minimal} />
      {/* Honeypot anti-bot: tersembunyi dari manusia & pembaca layar */}
      <input type="text" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] size-px opacity-0" />
    </>
  );

  return <FormShell form={f} meta={meta}>{body}</FormShell>;
}

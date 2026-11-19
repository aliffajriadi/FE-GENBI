"use client";
import { publicImg } from "@/components/site/public-api";
import { cx } from "@/components/ui";
import type { Answer, Question } from "@/lib/forms";

// Tampilan form yang bisa ditema. Dipakai halaman isi (/f/<slug>) dan pratinjau di editor.
// classic = ala Google Form (kartu putih, garis aksen), minimal = ala Tally (polos, judul besar, tanpa kartu).
export type FormTheme = {
  style: "classic" | "minimal"; accent: string; background: string; font: "sans" | "serif" | "mono";
  radius: "sharp" | "rounded" | "pill"; coverUrl?: string | null; showLogo: boolean;
};
export const DEFAULT_THEME: FormTheme = { style: "classic", accent: "#11418b", background: "#f1f5f9", font: "sans", radius: "rounded", coverUrl: null, showLogo: true };
export const PRESETS: { name: string; theme: Omit<FormTheme, "coverUrl" | "showLogo"> }[] = [
  { name: "GenBI", theme: { style: "classic", accent: "#11418b", background: "#e8eef8", font: "sans", radius: "rounded" } },
  { name: "Google Form", theme: { style: "classic", accent: "#673ab7", background: "#f0ebf8", font: "sans", radius: "rounded" } },
  { name: "Tally", theme: { style: "minimal", accent: "#111827", background: "#ffffff", font: "sans", radius: "rounded" } },
  { name: "Malam", theme: { style: "minimal", accent: "#60a5fa", background: "#0f172a", font: "sans", radius: "pill" } },
  { name: "Senja", theme: { style: "minimal", accent: "#ea580c", background: "#fff7ed", font: "serif", radius: "rounded" } },
  { name: "Hutan", theme: { style: "classic", accent: "#15803d", background: "#ecfdf5", font: "sans", radius: "sharp" } },
];

// Kecerahan relatif (WCAG) untuk memilih teks gelap/terang di atas warna pilihan pengguna.
function lum(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const on = (hex: string) => (lum(hex) > 0.45 ? "#0f172a" : "#ffffff");
const FONT = { sans: "var(--font-ui), system-ui, sans-serif", serif: "var(--font-reading), Georgia, serif", mono: "ui-monospace, SFMono-Regular, Menlo, monospace" };
const RADIUS = { sharp: ["0px", "0px"], rounded: ["10px", "14px"], pill: ["9999px", "20px"] } as const;

export function themeVars(t: FormTheme): React.CSSProperties {
  const minimal = t.style === "minimal";
  const fg = on(t.background);
  const cardFg = minimal ? fg : "#0f172a";
  return {
    "--f-accent": t.accent, "--f-on-accent": on(t.accent), "--f-bg": t.background, "--f-fg": fg,
    "--f-card": minimal ? "transparent" : "#ffffff", "--f-card-fg": cardFg,
    "--f-muted": `color-mix(in srgb, ${cardFg} 62%, transparent)`, "--f-line": `color-mix(in srgb, ${cardFg} 16%, transparent)`,
    "--f-r": RADIUS[t.radius][0], "--f-r-box": RADIUS[t.radius][1], fontFamily: FONT[t.font],
  } as React.CSSProperties;
}

type ShellForm = { title: string; description: string | null; theme: FormTheme | null };

export function FormShell({ form, meta, children, preview }: { form: ShellForm; meta?: React.ReactNode; children: React.ReactNode; preview?: boolean }) {
  const t = { ...DEFAULT_THEME, ...form.theme };
  const minimal = t.style === "minimal";
  const cover = publicImg(t.coverUrl ?? null);
  const logo = t.showLogo && (
    <div className={cx("flex items-center gap-2", minimal ? "mb-6" : "mb-3")} style={{ color: "var(--f-fg)" }}>
      <img src={on(t.background) === "#ffffff" ? "/logo-white.png" : "/logo.png"} alt="" width={26} height={26} className="size-[26px]" />
      <span className="font-serif text-[16px] opacity-90">MyGenBI</span>
    </div>
  );
  return (
    <main style={themeVars(t)} className={cx("bg-[var(--f-bg)] text-[var(--f-card-fg)]", preview ? "min-h-full" : "min-h-dvh", minimal ? "pb-20" : "px-4 pt-8 pb-16")}>
      {minimal ? (
        <>
          {cover ? <img src={cover} alt="" className="h-44 w-full object-cover sm:h-60" /> : <div className="h-10 sm:h-16" />}
          <div className="mx-auto max-w-xl px-5 pt-10">
            {logo}
            <h1 className="text-3xl leading-tight font-bold tracking-tight sm:text-4xl">{form.title}</h1>
            {form.description && <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-wrap text-[var(--f-muted)]">{form.description}</p>}
            {meta && <div className="mt-4 text-xs text-[var(--f-muted)]">{meta}</div>}
            <div className="mt-10">{children}</div>
          </div>
        </>
      ) : (
        <div className="mx-auto grid max-w-2xl gap-3">
          {logo}
          {cover && <img src={cover} alt="" className="h-36 w-full rounded-[var(--f-r-box)] object-cover sm:h-44" />}
          <header className="rounded-[var(--f-r-box)] border border-[var(--f-line)] border-t-[10px] border-t-[var(--f-accent)] bg-white p-6 shadow-sm">
            <h1 className="text-[28px] leading-tight font-normal">{form.title}</h1>
            {form.description && <p className="mt-2 text-[14px] leading-relaxed whitespace-pre-wrap text-[var(--f-muted)]">{form.description}</p>}
            {meta && <div className="mt-4 border-t border-[var(--f-line)] pt-3 text-xs text-[var(--f-muted)]">{meta}</div>}
          </header>
          {children}
        </div>
      )}
    </main>
  );
}

// Daftar pertanyaan + tombol kirim. Tanpa onSubmit = mode pratinjau (tidak mengirim apa pun).
export function QuestionList({ questions, answers, onAnswer, missing, onSubmit, onReset, pending, error, minimal }: {
  questions: Question[]; answers: Record<string, Answer>; onAnswer: (id: string, v: Answer) => void; missing?: string | null;
  onSubmit?: (e: React.FormEvent) => void; onReset?: () => void; pending?: boolean; error?: React.ReactNode; minimal: boolean;
}) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit?.(e); }} className={cx("grid", minimal ? "gap-9" : "gap-3")} noValidate>
      {questions.map((q) => (
        <fieldset key={q.id} id={`q-${q.id}`}
          className={cx("scroll-mt-6 transition-colors", !minimal && "rounded-[var(--f-r-box)] border bg-[var(--f-card)] p-6 shadow-xs",
            missing === q.id ? "border-red-400" : "border-[var(--f-line)]", minimal && missing === q.id && "border-l-2 pl-4")}>
          <legend className="contents">
            <span className={cx("block", minimal ? "text-[17px] font-semibold" : "text-[16px]")}>{q.label || "Pertanyaan tanpa judul"}{q.required && <span className="text-red-500" aria-label="wajib"> *</span>}</span>
          </legend>
          {q.help && <p className="mt-1 text-[13.5px] text-[var(--f-muted)]">{q.help}</p>}
          <div className="mt-3"><ThemedField q={q} value={answers[q.id]} onChange={(v) => onAnswer(q.id, v)} minimal={minimal} /></div>
          {missing === q.id && <p className="mt-2 text-[13px] text-red-500">Pertanyaan ini wajib diisi</p>}
        </fieldset>
      ))}
      {error}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button type="submit" disabled={pending}
          className="inline-flex h-11 items-center gap-2 rounded-[var(--f-r)] bg-[var(--f-accent)] px-7 text-[15px] font-semibold text-[var(--f-on-accent)] shadow-sm transition hover:brightness-110 disabled:opacity-60">
          {pending ? "Mengirim…" : "Kirim"}
        </button>
        {onReset && <button type="button" onClick={onReset} className="text-[13px] text-[var(--f-muted)] hover:text-[var(--f-card-fg)]">Kosongkan form</button>}
      </div>
    </form>
  );
}

function ThemedField({ q, value, onChange, minimal }: { q: Question; value: Answer | undefined; onChange: (v: Answer) => void; minimal: boolean }) {
  const str = typeof value === "string" ? value : "";
  const opts = q.options ?? [];
  // classic: garis bawah ala Google Form; minimal: kotak bergaris ala Tally.
  const box = cx("w-full bg-transparent text-[15px] text-[var(--f-card-fg)] outline-none transition placeholder:text-[var(--f-muted)] placeholder:opacity-70",
    minimal ? "rounded-[var(--f-r-box)] border border-[var(--f-line)] px-3.5 py-2.5 focus:border-[var(--f-accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--f-accent)_25%,transparent)]"
      : "border-b border-[var(--f-line)] py-2 focus:border-b-2 focus:border-[var(--f-accent)]");
  switch (q.type) {
    case "PARAGRAPH": return <textarea value={str} onChange={(e) => onChange(e.target.value)} rows={minimal ? 4 : 2} maxLength={5000} placeholder="Jawaban kamu" aria-label={q.label} className={cx(box, "field-sizing-content min-h-12 resize-none")} />;
    case "NUMBER": return <input type="number" inputMode="decimal" value={str} onChange={(e) => onChange(e.target.value)} placeholder="0" aria-label={q.label} className={cx(box, "sm:w-60")} />;
    case "DATE": return <input type="date" value={str} onChange={(e) => onChange(e.target.value)} aria-label={q.label} className={cx(box, "sm:w-60 [color-scheme:light_dark]")} />;
    case "DROPDOWN": return (
      <select value={str} onChange={(e) => onChange(e.target.value)} aria-label={q.label} className={cx(box, "sm:w-80 [&>option]:text-slate-900")}>
        <option value="">Pilih…</option>
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
    case "CHOICE":
    case "CHECKBOX": {
      const multi = q.type === "CHECKBOX";
      const picked = [value ?? []].flat();
      return (
        <div className={cx("grid", minimal ? "gap-2" : "gap-0.5")}>
          {opts.map((o) => {
            const sel = picked.includes(o);
            return (
              <label key={o} className={cx("flex cursor-pointer items-center gap-3 text-[15px] transition",
                minimal ? cx("rounded-[var(--f-r-box)] border px-3.5 py-2.5", sel ? "border-[var(--f-accent)] bg-[color-mix(in_srgb,var(--f-accent)_10%,transparent)]" : "border-[var(--f-line)] hover:border-[var(--f-muted)]")
                  : "rounded-md px-1 py-2")}>
                <input type={multi ? "checkbox" : "radio"} name={q.id} checked={sel}
                  onChange={(e) => onChange(multi ? (e.target.checked ? [...picked, o] : picked.filter((x) => x !== o)) : o)}
                  className="size-[18px] shrink-0 accent-[var(--f-accent)]" />
                {o}
              </label>
            );
          })}
          {!multi && str && <button type="button" onClick={() => onChange("")} className="justify-self-end text-xs text-[var(--f-muted)] hover:text-[var(--f-card-fg)]">Hapus pilihan</button>}
        </div>
      );
    }
    default: return <input value={str} onChange={(e) => onChange(e.target.value)} maxLength={500} placeholder="Jawaban kamu" aria-label={q.label} className={cx(box, !minimal && "sm:w-2/3")} />;
  }
}

export function FormNotice({ icon, title, desc, action, minimal }: { icon?: React.ReactNode; title: string; desc: string; action?: React.ReactNode; minimal: boolean }) {
  return (
    <div className={cx(minimal ? "py-6" : "rounded-[var(--f-r-box)] border border-[var(--f-line)] bg-[var(--f-card)] px-6 py-10 text-center shadow-sm")}>
      {icon && <div className={cx("mb-3 flex", !minimal && "justify-center")}>{icon}</div>}
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-[14px] text-[var(--f-muted)]">{desc}</p>
      {action && <div className={cx("mt-5 flex", !minimal && "justify-center")}>{action}</div>}
    </div>
  );
}

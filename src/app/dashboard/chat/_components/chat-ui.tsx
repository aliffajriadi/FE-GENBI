"use client";
import { Hash, Lock, ShieldCheck, Users } from "lucide-react";
import { cx } from "@/components/ui";
import { type Channel, URL_RE } from "../_lib";

export const ChannelIcon = ({ c, size = 15 }: { c: Channel; size?: number }) =>
  c.type === "CORE" ? <ShieldCheck size={size} aria-hidden /> : c.type === "DIVISION" ? <Users size={size} aria-hidden /> : c.type === "CUSTOM" ? <Lock size={size - 1} aria-hidden /> : <Hash size={size} aria-hidden />;
export function Body({ text }: { text: string }) {
  const emojiOnly = /^\p{Extended_Pictographic}(‍?\p{Extended_Pictographic}|️)*$/u.test(text.replace(/\s/g, "")) && [...text.replace(/\s/g, "")].length <= 6;
  return (
    <p className={cx("break-words whitespace-pre-wrap text-slate-800", emojiOnly ? "text-[32px] leading-tight" : "text-[14.5px] leading-relaxed")}>
      {text.split(URL_RE).map((part, i) => (i % 2 ? <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline underline-offset-2 hover:no-underline">{part}</a> : part))}
    </p>
  );
}

export function IconBtn({ label, onClick, children, danger }: { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} className={cx("grid size-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100", danger ? "hover:text-red-600" : "hover:text-slate-900")}>
      {children}
    </button>
  );
}

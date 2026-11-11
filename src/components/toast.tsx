"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

type Toast = { id: number; text: string; error?: boolean };
const Ctx = createContext<(text: string, opts?: { error?: boolean }) => void>(() => {});

export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, opts?: { error?: boolean }) => {
    const id = Date.now() + Math.random();
    setItems((t) => [...t, { id, text, error: opts?.error }]);
    setTimeout(() => setItems((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[100] grid w-[min(360px,calc(100%-2rem))] gap-2">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-lg" style={{ animation: "toast-in 260ms var(--ease)" }}>
            {t.error ? <CircleAlert size={18} className="mt-px shrink-0 text-red-600" aria-hidden /> : <CircleCheck size={18} className="mt-px shrink-0 text-green-600" aria-hidden />}
            <span className="text-slate-700">{t.text}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

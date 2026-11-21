"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/components/toast";
import { Button, Card, CardHeader, ErrorText, Field, Input, Textarea } from "@/components/ui";
import { type Contacts } from "@/components/site/public-api";
import { api } from "@/lib/api";

const LINKS: { key: keyof Contacts; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/genbi..." },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@genbi..." },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@genbi..." },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/..." },
];

// Kontak organisasi: tampil di footer web publik dan tombol ajakan sponsorship di beranda.
export function ContactsSettings() {
  const toast = useToast();
  const q = useQuery({ queryKey: ["contacts"], queryFn: () => api<Contacts>("/public/contacts") });
  const [d, setD] = useState<Contacts | null>(null);
  useEffect(() => { if (q.data && !d) setD(q.data); }, [q.data, d]);
  const save = useMutation({
    mutationFn: (x: Contacts) => api("/contacts", { method: "PUT", body: x }),
    onSuccess: () => toast("Kontak disimpan. Muncul di web dalam ±5 menit."),
  });
  if (!d) return <Card className="p-6"><Loader2 className="animate-spin text-slate-400" aria-hidden /></Card>;
  const set = (k: keyof Contacts) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setD({ ...d, [k]: e.target.value });

  return (
    <Card className="max-w-2xl">
      <CardHeader title="Kontak organisasi" desc="Tampil di footer web dan tombol “Ajukan kerja sama” di beranda. Kosongkan yang tidak dipakai."
        action={<a href="/#kemitraan" target="_blank" className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">Lihat di web <ExternalLink size={13} aria-hidden /></a>} />
      <form className="grid gap-4 p-5" onSubmit={(e) => { e.preventDefault(); save.mutate(d); }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email"><Input type="email" value={d.email} onChange={set("email")} maxLength={120} placeholder="genbi@email.com" /></Field>
          <Field label="WhatsApp" hint="Untuk tombol chat sponsor."><Input type="tel" value={d.whatsapp} onChange={set("whatsapp")} maxLength={20} placeholder="0812 3456 7890" /></Field>
          {LINKS.map((l) => (
            <Field key={l.key} label={l.label}><Input type="url" value={d[l.key]} onChange={set(l.key)} maxLength={300} placeholder={l.placeholder} /></Field>
          ))}
        </div>
        <Field label="Alamat / sekretariat"><Textarea value={d.address} onChange={set("address")} maxLength={300} rows={2} /></Field>
        <ErrorText error={save.error} />
        <div className="flex justify-end"><Button type="submit" loading={save.isPending}>Simpan kontak</Button></div>
      </form>
    </Card>
  );
}

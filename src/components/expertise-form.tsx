"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { TagInput } from "@/components/tag-input";
import { useToast } from "@/components/toast";
import { Button, Card, CardHeader, cx, ErrorText } from "@/components/ui";
import { api } from "@/lib/api";
import type { Me, ProfileTag } from "@/lib/types";

const MAX_FIELDS = 3;
const MAX_SKILLS = 15;

// Bidang (kategori dari pengurus inti + "lainnya" ketik sendiri) dan skill di profil.
export function ExpertiseForm({ me }: { me: Me }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [fields, setFields] = useState(me.fields ?? []);
  const [skills, setSkills] = useState(me.skills ?? []);
  // Kartu baru ada setelah data dimuat, jadi #keahlian dari dashboard digulir manual.
  useEffect(() => { if (location.hash === "#keahlian") document.getElementById("keahlian")?.scrollIntoView(); }, []);
  const tags = useQuery({ queryKey: ["profile-tags"], queryFn: () => api<ProfileTag[]>("/profile-tags") });
  const all = tags.data ?? [];
  const official = all.filter((t) => t.kind === "FIELD" && t.official).map((t) => t.name);
  const custom = fields.filter((f) => !official.includes(f));
  const save = useMutation({
    mutationFn: () => api<Me>("/me", { method: "PATCH", body: { fields, skills } }),
    onSuccess: (u) => {
      setFields(u.fields);
      setSkills(u.skills);
      for (const key of ["me", "profile-tags", "members", "person"]) qc.invalidateQueries({ queryKey: [key] });
      toast("Bidang & skill disimpan");
    },
  });

  return (
    <Card id="keahlian" className="scroll-mt-20">
      <CardHeader icon={Sparkles} title="Bidang & skill" desc="Supaya mudah ditemukan saat dicari di halaman Anggota." />
      <form className="grid gap-5 p-5" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="grid gap-2">
          <p className="text-sm font-medium">Bidang <span className="font-normal text-slate-500">({fields.length}/{MAX_FIELDS})</span></p>
          {official.length > 0 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Kategori bidang">
              {official.map((f) => {
                const on = fields.includes(f);
                return (
                  <button key={f} type="button" aria-pressed={on} disabled={!on && fields.length >= MAX_FIELDS}
                    onClick={() => setFields(on ? fields.filter((x) => x !== f) : [...fields, f])}
                    className={cx("rounded-md border px-2.5 py-1 text-[13px] disabled:opacity-40", on ? "border-primary bg-primary/10 font-medium text-primary" : "border-slate-200 text-slate-600 hover:border-slate-300")}>
                    {f}
                  </button>
                );
              })}
            </div>
          )}
          <TagInput label="Bidang lainnya" placeholder="Bidang lainnya, ketik sendiri…" value={custom} max={MAX_FIELDS - (fields.length - custom.length)}
            suggestions={all.filter((t) => t.kind === "FIELD").map((t) => t.name)}
            onChange={(v) => setFields([...new Set([...fields.filter((f) => official.includes(f)), ...v])])} />
        </div>
        <div className="grid gap-2">
          <p className="text-sm font-medium">Skill <span className="font-normal text-slate-500">({skills.length}/{MAX_SKILLS})</span></p>
          <TagInput label="Skill" placeholder="Mis. Canva, Public speaking, Excel" value={skills} max={MAX_SKILLS}
            suggestions={all.filter((t) => t.kind === "SKILL").map((t) => t.name)} onChange={setSkills} />
        </div>
        <div className="flex items-center justify-end gap-3">
          <ErrorText error={save.error} />
          <Button type="submit" loading={save.isPending}>Simpan</Button>
        </div>
      </form>
    </Card>
  );
}

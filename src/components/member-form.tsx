"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/toast";
import { Button, ErrorText, Field, Input, Select } from "@/components/ui";
import { api } from "@/lib/api";
import type { Division } from "@/lib/types";

export const ROLE_OPTIONS: [string, string][] = [
  ["ANGGOTA", "Anggota"],
  ["KADIV", "Kepala Divisi"],
  ["SEKRETARIS", "Sekretaris"],
  ["BENDAHARA", "Bendahara"],
  ["KETUM", "Ketua Umum"],
  ["SYS_ADMIN", "System Administrator"],
];

export type MemberInput = {
  id?: string; name?: string; email?: string; nim?: string | null; phone?: string | null; campus?: string | null; major?: string | null; batch?: string | null;
  role?: string; position?: string | null; division?: { id: string } | null;
};

// Tambah / ubah anggota (Sekretaris & admin).
export function MemberForm({ member, isAdmin, onDone, onCancel }: { member?: MemberInput; isAdmin: boolean; onDone: () => void; onCancel: () => void }) {
  const toast = useToast();
  const editing = !!member?.id;
  const divisions = useQuery({ queryKey: ["divisions"], queryFn: () => api<Division[]>("/divisions") });
  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => (editing ? api(`/users/${member!.id}`, { method: "PATCH", body }) : api("/users", { method: "POST", body })),
    onSuccess: () => { toast(editing ? "Data anggota diperbarui" : "Anggota ditambahkan"); onDone(); },
  });
  const opt = (v: string) => v || (editing ? null : undefined);

  return (
    <form
      className="grid gap-6"
      onSubmit={(ev) => {
        ev.preventDefault();
        const f = Object.fromEntries(new FormData(ev.currentTarget)) as Record<string, string>;
        save.mutate({
          name: f.name, email: f.email, divisionId: f.divisionId || null,
          // Kirim role hanya kalau berubah: ganti role mencabut semua sesi anggota.
          roleKey: editing && f.roleKey === member?.role ? undefined : f.roleKey,
          nim: opt(f.nim), phone: opt(f.phone), campus: opt(f.campus), major: opt(f.major), batch: opt(f.batch), position: f.position || undefined,
          ...(editing ? {} : { password: f.password }),
        });
      }}
    >
      <section className="grid gap-4">
        <p className="text-[13px] font-semibold">Akun</p>
        <Field label="Nama lengkap"><Input name="name" required minLength={2} defaultValue={member?.name} autoFocus /></Field>
        <Field label="Email"><Input name="email" type="email" required defaultValue={member?.email} /></Field>
        {!editing && <Field label="Password awal" hint="Minimal 8 karakter. Minta anggota menggantinya di halaman Profil."><Input name="password" required minLength={8} /></Field>}
      </section>
      <section className="grid gap-4 border-t border-slate-100 pt-6">
        <p className="text-[13px] font-semibold">Jabatan periode ini</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Role">
            <Select name="roleKey" defaultValue={member?.role ?? "ANGGOTA"}>
              {ROLE_OPTIONS.filter(([k]) => isAdmin || k !== "SYS_ADMIN").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Divisi">
            <Select name="divisionId" defaultValue={member?.division?.id ?? ""}>
              <option value="">Tanpa divisi</option>
              {divisions.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Nama jabatan" hint="Opsional, contoh: Staf Divisi Media"><Input name="position" defaultValue={member?.position ?? ""} /></Field>
      </section>
      <section className="grid gap-4 border-t border-slate-100 pt-6">
        <p className="text-[13px] font-semibold">Data diri</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="NIM"><Input name="nim" defaultValue={member?.nim ?? ""} /></Field>
          <Field label="No. HP"><Input name="phone" type="tel" defaultValue={member?.phone ?? ""} /></Field>
          <Field label="Kampus"><Input name="campus" defaultValue={member?.campus ?? ""} /></Field>
          <Field label="Jurusan"><Input name="major" defaultValue={member?.major ?? ""} /></Field>
          <Field label="Angkatan"><Input name="batch" defaultValue={member?.batch ?? ""} placeholder="2023" /></Field>
        </div>
      </section>
      <ErrorText error={save.error} />
      <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-2 border-t border-slate-100 bg-white px-5 py-3">
        <Button type="button" variant="ghost" onClick={onCancel}>Batal</Button>
        <Button type="submit" loading={save.isPending}>{editing ? "Simpan perubahan" : "Tambah anggota"}</Button>
      </div>
    </form>
  );
}

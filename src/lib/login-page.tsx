// Foto panel kanan halaman login (diatur System Administrator di Pengaturan → Halaman login).
export type LoginPage = { image: string | null; alt?: string; title?: string; caption?: string };

// Lapisan gelap di atas foto: rata sedikit, lalu makin pekat ke bawah. Dipakai halaman login & pratinjaunya.
export const LOGIN_SHADE = "absolute inset-0 bg-gradient-to-b from-slate-950/35 via-slate-950/50 to-slate-950/90";

// Teks di atas foto. Dipakai halaman login & pratinjaunya supaya tampilannya sama.
export function LoginCaption({ title, caption, small }: { title?: string; caption?: string; small?: boolean }) {
  return (
    <div className={small ? "absolute inset-x-0 bottom-0 p-6 text-white" : "absolute inset-x-0 bottom-0 p-12 text-white"}>
      <p className="flex items-center gap-2.5 text-[13px] font-medium text-white/75">
        <img src="/logo-white.png" alt="" width={22} height={22} className="size-5.5" /> Generasi Baru Indonesia
      </p>
      {title && <p className={`mt-4 max-w-md font-serif leading-[1.12] font-medium tracking-[-0.015em] text-balance ${small ? "text-[24px]" : "text-[40px]"}`}>{title}</p>}
      {caption && <p className={`mt-3 max-w-sm leading-relaxed text-white/75 ${small ? "text-[13px]" : "text-[15px]"}`}>{caption}</p>}
    </div>
  );
}

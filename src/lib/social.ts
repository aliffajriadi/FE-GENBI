// Tautan medsos dibangun dari username (bukan URL bebas dari user) supaya selalu ke domain resmi.
export type Socials = { instagram?: string | null; tiktok?: string | null; website?: string | null };

export function socialLinks(u: Socials) {
  return [
    u.instagram && { kind: "Instagram", label: `@${u.instagram}`, href: `https://www.instagram.com/${u.instagram}/` },
    u.tiktok && { kind: "TikTok", label: `@${u.tiktok}`, href: `https://www.tiktok.com/@${u.tiktok}` },
    u.website && { kind: "Website", label: u.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""), href: u.website },
  ].filter((x): x is { kind: string; label: string; href: string } => !!x);
}

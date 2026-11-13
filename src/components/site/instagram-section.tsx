import { Heart, Instagram, MessageCircle, Play } from "lucide-react";

// Data dari GET /public/instagram (backend memakai token akun yang dihubungkan System Administrator).
export type InstagramFeed = {
  profile: { username: string; name?: string; biography?: string; profilePicture?: string; followers: number; following: number; posts: number; url: string };
  media: { id: string; type: string; image: string; caption?: string; permalink: string; timestamp: string; likes?: number; comments?: number }[];
};

const num = (n: number) => new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export function InstagramSection({ feed }: { feed: InstagramFeed }) {
  const p = feed.profile;
  return (
    <section className="border-t border-slate-200/70">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
        <div className="flex flex-col gap-6 border-b border-slate-200 pb-8 sm:flex-row sm:items-center">
          {p.profilePicture ? (
            <img src={p.profilePicture} alt="" className="size-20 shrink-0 rounded-full object-cover ring-1 ring-slate-200 sm:size-24" />
          ) : (
            <span className="grid size-20 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 sm:size-24"><Instagram size={30} aria-hidden /></span>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-[32px] leading-tight font-medium tracking-[-0.02em] sm:text-[38px]">@{p.username}</h2>
            {p.biography && <p className="mt-1 line-clamp-2 max-w-xl text-[15px] text-slate-500">{p.biography}</p>}
            <dl className="mt-4 flex gap-8 text-[14px]">
              {[["Postingan", p.posts], ["Pengikut", p.followers], ["Mengikuti", p.following]].map(([label, v]) => (
                <div key={label}>
                  <dd className="text-[20px] font-semibold tabular-nums">{num(v as number)}</dd>
                  <dt className="text-slate-500">{label}</dt>
                </div>
              ))}
            </dl>
          </div>
          <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 shrink-0 items-center gap-2 self-start rounded-full bg-slate-900 px-5 text-[15px] font-medium text-white transition-colors hover:bg-slate-700 sm:self-center">
            <Instagram size={17} aria-hidden /> Ikuti di Instagram
          </a>
        </div>

        {feed.media.length > 0 && (
          <ul className="mt-8 grid grid-cols-3 gap-1.5 sm:gap-3 lg:grid-cols-4">
            {feed.media.slice(0, 12).map((m) => (
              <li key={m.id}>
                <a href={m.permalink} target="_blank" rel="noopener noreferrer" className="group relative block aspect-square overflow-hidden rounded-md bg-slate-100 sm:rounded-xl">
                  <img src={m.image} alt={m.caption?.slice(0, 120) ?? "Postingan Instagram"} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  {m.type === "VIDEO" && <Play size={18} className="absolute top-2 right-2 fill-white text-white drop-shadow" aria-hidden />}
                  {/* Suka & komentar muncul saat diarahkan (desktop) */}
                  <span className="absolute inset-0 hidden items-center justify-center gap-5 bg-slate-950/45 text-[15px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
                    {m.likes != null && <span className="flex items-center gap-1.5"><Heart size={17} className="fill-white" aria-hidden />{num(m.likes)}</span>}
                    {m.comments != null && <span className="flex items-center gap-1.5"><MessageCircle size={17} className="fill-white" aria-hidden />{num(m.comments)}</span>}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

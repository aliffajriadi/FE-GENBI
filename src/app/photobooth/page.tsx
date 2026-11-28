import type { Metadata } from "next";
import { getPublic, publicImg } from "@/components/site/public-api";
import { SiteFooter, SiteHeader } from "@/components/site/site-shell";
import type { Template } from "@/components/photobooth/design";
import { Booth } from "./_components/booth";

export const metadata: Metadata = { title: "Photobooth · MyGenBI", description: "Foto bareng frame GenBI langsung dari browser, tanpa aplikasi." };

export default async function PhotoboothPage() {
  const [templates, hero] = await Promise.all([
    getPublic<Template[]>("/public/photobooth", [], 60),
    getPublic<{ image: string | null; alt: string }>("/public/photobooth-page", { image: null, alt: "" }, 60),
  ]);
  return (
    <div className="theme-light bg-white text-slate-900">
      <SiteHeader active="/photobooth" />
      <main className="mx-auto max-w-6xl px-5 pt-14 pb-20 sm:px-6 sm:pt-20">
        <Booth templates={templates} hero={hero.image ? { src: publicImg(hero.image)!, alt: hero.alt } : null} />
      </main>
      <SiteFooter />
    </div>
  );
}

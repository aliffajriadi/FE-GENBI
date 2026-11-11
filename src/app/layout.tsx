import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import { TopLoader } from "@/components/top-loader";
import { Providers } from "./providers";
import "./globals.css";

// Sans netral ala Medium/Claude untuk UI, serif hangat ala Claude untuk judul & bacaan.
const sans = Inter({ subsets: ["latin"], variable: "--font-ui" });
const serif = Newsreader({ subsets: ["latin"], variable: "--font-reading", style: ["normal", "italic"], axes: ["opsz"] });

export const metadata: Metadata = { title: "MyGenBI", description: "Kabar, kegiatan, dan artikel anggota GenBI" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${sans.variable} ${serif.variable}`}>
      <body className="font-sans">
        <TopLoader />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

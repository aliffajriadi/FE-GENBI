// Animasi masuk halaman publik (beranda, artikel, anggota). Di dalam /dashboard hanya jalan sekali saat masuk.
export default function RootTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}

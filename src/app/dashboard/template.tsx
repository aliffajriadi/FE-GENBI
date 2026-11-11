// template.tsx di-mount ulang tiap pindah halaman dashboard → animasi masuk per halaman, sidebar tetap diam.
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-in h-full">{children}</div>;
}

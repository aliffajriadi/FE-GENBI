// Versi aplikasi mobile (force update), diatur System Administrator di Pengaturan → Aplikasi mobile.
export type AppVersion = { minVersion: string; latestVersion: string; url: string; message?: string };

// Panduan di menu Unduh aplikasi ("artikel mini"), dikelola System Administrator.
export type Platform = "ANDROID" | "IOS" | "WEB" | "OTHER";
export type DownloadGuide = { id: string; title: string; platform: Platform; url: string; buttonLabel?: string; body: string; order: number; updatedAt: string };
export const PLATFORM_LABEL: Record<Platform, string> = { ANDROID: "Android", IOS: "iOS", WEB: "Web", OTHER: "Lainnya" };

// Templat awal saat admin membuat panduan baru.
export const DEFAULT_GUIDE = `## Cara memasang

1. Buka menu ini dari HP Android Anda, lalu ketuk **Unduh APK**.
2. Setelah selesai, buka file **MyGenBI.apk** dari notifikasi atau folder *Download*.
3. Jika muncul peringatan *"Instal aplikasi tidak dikenal"*, ketuk **Setelan**, aktifkan **Izinkan dari sumber ini**, lalu kembali.
4. Ketuk **Instal** dan tunggu sampai selesai.

## Masuk pertama kali

- Gunakan **email dan password** yang sama dengan panel web.
- Izinkan akses **kamera** (untuk scan absensi) dan **lokasi** (untuk kegiatan yang memakai titik lokasi).

## Memperbarui aplikasi

Saat ada versi baru, aplikasi akan memberi tahu Anda. Unduh lagi dari menu ini lalu pasang seperti biasa; data dan login Anda tetap tersimpan.

## Butuh bantuan?

Hubungi Sekretaris atau admin divisi Anda.
`;

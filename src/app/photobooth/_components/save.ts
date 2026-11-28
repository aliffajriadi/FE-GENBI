// Simpan hasil ke perangkat: share sheet kalau didukung (HP), selain itu unduh.
export const stamp = () => `photobooth-genbi-${new Date().toISOString().slice(0, 16).replace(/[:T-]/g, "")}`;

// MP4 dulu (bisa diputar di galeri iPhone/Android & WhatsApp), WebM untuk Firefox.
const MIME = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
export const videoMime = () => (typeof MediaRecorder === "undefined" ? undefined : MIME.find((m) => MediaRecorder.isTypeSupported(m)));
export const videoExt = (blob: Blob) => (blob.type.includes("mp4") ? "mp4" : "webm");

export function download(url: string, name: string) {
  Object.assign(document.createElement("a"), { href: url, download: name }).click();
}

export async function share(blob: Blob, name: string) {
  const file = new File([blob], name, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) return navigator.share({ files: [file], title: "Photobooth GenBI" }).catch(() => {});
  const url = URL.createObjectURL(blob);
  download(url, name);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

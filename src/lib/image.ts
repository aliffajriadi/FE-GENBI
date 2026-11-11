// Perkecil foto di browser sebelum upload: file jauh lebih kecil, dan metadata kamera (EXIF, lokasi) ikut terbuang.
export async function resizeJpeg(file: File, maxW = 2400, quality = 0.85): Promise<File> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, maxW / img.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("Gagal memproses foto"))), "image/jpeg", quality));
  return new File([blob], "foto.jpg", { type: "image/jpeg" });
}

// Foto di atas batas upload dikecilkan bertahap sampai muat (foto HP sering 3–8 MB). File lain dikembalikan apa adanya.
export async function fitImage(file: File, max: number): Promise<File> {
  if (file.size <= max || !/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  for (const [w, q] of [[2400, 0.85], [2000, 0.8], [1600, 0.75], [1280, 0.7]] as const) {
    const out = await resizeJpeg(file, w, q);
    if (out.size <= max) return out;
  }
  return resizeJpeg(file, 1024, 0.65);
}

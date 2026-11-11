// Perkecil foto di browser sebelum upload: file jauh lebih kecil, dan metadata kamera (EXIF, lokasi) ikut terbuang.
export async function resizeJpeg(file: File, maxW = 2400): Promise<File> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, maxW / img.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("Gagal memproses foto"))), "image/jpeg", 0.85));
  return new File([blob], "foto.jpg", { type: "image/jpeg" });
}

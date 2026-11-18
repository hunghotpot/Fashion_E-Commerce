/*
 * Thu nhỏ và nén ảnh ngay trong trình duyệt trước khi tải lên (chỉ chạy ở client): cạnh dài tối đa MAX_DIMENSION,
 * ưu tiên WebP, giảm chất lượng dần cho tới khi vừa `maxBytes`. Server vẫn kiểm lại mọi thứ, đây chỉ để khách không phải
 * chờ tải ảnh điện thoại vài MB và để file nhỏ. Xoay ảnh theo EXIF (from-image) để ảnh chụp dọc không bị nằm ngang.
 */
export const MAX_DIMENSION = 1280
/** Ảnh gốc quá lớn thì không giải mã trong trình duyệt. */
export const MAX_SOURCE_BYTES = 15 * 1024 * 1024

const QUALITIES = [0.85, 0.75, 0.65, 0.5]

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))

/** Trả Blob đã nén, hoặc ném Error("too-big" | "decode") để chỗ gọi hiện thông báo phù hợp. */
export async function compressImage(file: File, maxBytes: number): Promise<Blob> {
  if (file.size > MAX_SOURCE_BYTES) throw new Error("too-big")
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  } catch {
    throw new Error("decode")
  }
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("decode")
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    let last: Blob | null = null
    for (const type of ["image/webp", "image/jpeg"]) {
      for (const q of QUALITIES) {
        const blob = await toBlob(canvas, type, q)
        if (!blob || blob.type !== type) break // trình duyệt không hỗ trợ định dạng này: thử định dạng kế
        last = blob
        if (blob.size <= maxBytes) return blob
      }
    }
    if (last) throw new Error("too-big")
    throw new Error("decode")
  } finally {
    bitmap.close()
  }
}

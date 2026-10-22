/**
 * Helper utilitas untuk kompresi foto profil dan dokumen santri
 * agar muat dan cepat di localStorage serta sinkronisasi Google Sheet.
 */

export async function compressImageToDataUrl(
  file: File,
  maxWidth = 360,
  maxHeight = 360,
  quality = 0.82,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Gagal membaca file gambar"))
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => reject(new Error("Gagal memuat gambar"))
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(String(e.target?.result))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL("image/jpeg", quality)
        resolve(dataUrl)
      }
      img.src = String(e.target?.result)
    }
    reader.readAsDataURL(file)
  })
}

export async function readDocumentFileToDataUrl(file: File): Promise<{
  name: string
  size: string
  url: string
  uploadedAt: string
}> {
  return new Promise((resolve, reject) => {
    // Jika gambar dokumen, kompres agar hemat memori
    if (file.type.startsWith("image/")) {
      compressImageToDataUrl(file, 900, 900, 0.8)
        .then((url) => {
          resolve({
            name: file.name,
            size: `${Math.round((url.length * 0.75) / 1024)} KB`,
            url,
            uploadedAt: new Date().toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          })
        })
        .catch(reject)
      return
    }

    // Jika PDF atau lainnya, batasi 2MB
    if (file.size > 2 * 1024 * 1024) {
      reject(new Error("Ukuran berkas maksimal 2MB untuk penyimpanan internal."))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Gagal membaca file dokumen"))
    reader.onload = () => {
      resolve({
        name: file.name,
        size: `${Math.round(file.size / 1024)} KB`,
        url: String(reader.result),
        uploadedAt: new Date().toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      })
    }
    reader.readAsDataURL(file)
  })
}

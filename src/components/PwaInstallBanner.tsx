import React, { useEffect, useState } from "react"
import { Download, Smartphone, X, Share } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

export const PwaInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState<boolean>(false)
  const [isIos, setIsIos] = useState<boolean>(false)
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false)

  useEffect(() => {
    // 1. Cek apakah sudah berjalan di mode standalone (sudah terinstal)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true

    if (isStandalone) {
      return
    }

    // 2. Cek apakah pengguna sudah menutup banner di sesi ini
    const dismissed = sessionStorage.getItem("pwa_prompt_dismissed")
    if (dismissed) {
      return
    }

    // 3. Deteksi iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent)

    if (isIosDevice && isSafari) {
      setIsIos(true)
      // Tampilkan banner setelah delay 3 detik agar ramah pengguna
      const timer = setTimeout(() => setShowBanner(true), 3000)
      return () => clearTimeout(timer)
    }

    // 4. Tangani event standar PWA (Android / Chrome / Edge Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true)
      return
    }

    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      setShowBanner(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    sessionStorage.setItem("pwa_prompt_dismissed", "true")
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md border border-red-500/30 text-white p-4 rounded-2xl shadow-2xl shadow-red-950/40 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3.5 pr-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shrink-0 shadow-md shadow-red-600/30 border border-red-400/30">
            <Smartphone className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1">
            <h4 className="font-semibold text-sm text-slate-100 flex items-center gap-1.5">
              Pasang Aplikasi Mandiri
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                PWA
              </span>
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              Jalankan BACAPASMUIN lebih cepat langsung dari layar utama tanpa bilah browser.
            </p>

            {showIosGuide ? (
              <div className="mt-3 p-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-slate-200 space-y-1.5 animate-in fade-in duration-200">
                <p className="font-medium text-amber-400 flex items-center gap-1">
                  <Share className="w-3.5 h-3.5" /> Cara pasang di iPhone/iPad:
                </p>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-300">
                  <li>Ketuk tombol <strong>Bagikan (Share)</strong> di Safari</li>
                  <li>Gulir ke bawah, pilih <strong>&apos;Tambah ke Layar Utama&apos;</strong></li>
                </ol>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleInstallClick}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-red-600/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isIos ? "Petunjuk Pasang" : "Pasang Sekarang"}
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Nanti Saja
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PwaInstallBanner

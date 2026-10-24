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
    <div className="fixed bottom-3 right-3 left-3 sm:left-auto sm:max-w-sm z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-white p-3 sm:p-3.5 rounded-xl shadow-xl relative">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-800 cursor-pointer"
          aria-label="Tutup"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-start gap-2.5 pr-5">
          <div className="size-8 rounded-lg bg-red-600/90 flex items-center justify-center shrink-0 border border-red-500/30">
            <Smartphone className="w-4 h-4 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-xs text-slate-100 truncate">
                Pasang Aplikasi Mandiri
              </h4>
              <span className="text-3xs uppercase font-extrabold px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">
                PWA
              </span>
            </div>
            <p className="text-2xs text-slate-300 mt-0.5 leading-snug">
              Buka BACAPASMUIN langsung dari layar utama tanpa bilah browser.
            </p>

            {showIosGuide ? (
              <div className="mt-2 p-2 rounded-lg bg-slate-800/90 border border-slate-700 text-2xs text-slate-200 space-y-1 animate-in fade-in duration-200">
                <p className="font-semibold text-amber-400 flex items-center gap-1">
                  <Share className="w-3 h-3" /> Cara pasang di iPhone/iPad:
                </p>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-300">
                  <li>Ketuk tombol <strong>Bagikan (Share)</strong> di Safari</li>
                  <li>Pilih <strong>&apos;Tambah ke Layar Utama&apos;</strong></li>
                </ol>
                <button
                  onClick={handleDismiss}
                  className="mt-1 text-3xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Tutup Panduan
                </button>
              </div>
            ) : (
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  onClick={handleInstallClick}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-500 active:scale-95 text-white text-2xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer shadow-xs"
                >
                  <Download className="w-3 h-3" />
                  <span>{isIos ? "Petunjuk Pasang" : "Pasang Sekarang"}</span>
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-2.5 py-1 text-2xs font-medium text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap cursor-pointer"
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

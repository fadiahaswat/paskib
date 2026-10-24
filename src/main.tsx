import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Register Service Worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // If an update is found
        reg.onupdatefound = () => {
          const installingWorker = reg.installing
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.log("[PWA] Versi baru tersedia! Muat ulang untuk memperbarui.")
              }
            }
          }
        }
      })
      .catch((err) => {
        console.warn("[PWA] Gagal mendaftarkan Service Worker:", err)
      })
  })
}

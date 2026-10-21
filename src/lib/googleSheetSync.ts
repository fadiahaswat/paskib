import type {
  AuditLogEntry,
  Candidate,
  CatQuestion,
  SelectionCycle,
  SelectionSchedule,
  StandardRuleItem,
  SupportingDoc,
  UserProfile,
} from "../domain/selection"

export type AppDatabaseState = {
  candidates: Candidate[]
  cycles?: SelectionCycle[]
  activeCycleId?: string
  sessions?: any[]
  records?: Record<string, any>
  schedules?: SelectionSchedule[]
  questions?: CatQuestion[]
  supportingDocs?: SupportingDoc[]
  standardRules?: StandardRuleItem[]
  stageChecklists?: Record<number, boolean[]>
  users?: UserProfile[]
  auditLogs?: AuditLogEntry[]
  rankingPublished?: boolean
  updatedAt?: string
}

const STORAGE_KEY_GAS_URL = "paska-gas-url"
const STORAGE_KEY_AUTO_SYNC = "paska-gas-auto-sync"
const STORAGE_KEY_LAST_SYNC = "paska-gas-last-sync"

export const DEFAULT_GAS_URL =
  "https://script.google.com/macros/s/AKfycbz3NJT8_IoNFKQnGdh0T7xeaaOVo-RXygIj-meSUkpEqMVT1Cq14utlHWmJYEPJQs8y/exec"

export function getSavedGasUrl(): string {
  try {
    return (
      localStorage.getItem(STORAGE_KEY_GAS_URL) ||
      (import.meta.env.VITE_GOOGLE_SCRIPT_URL as string) ||
      DEFAULT_GAS_URL
    )
  } catch {
    return DEFAULT_GAS_URL
  }
}

export function saveGasUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_GAS_URL, url.trim())
  } catch {
    // Ignore storage errors
  }
}

export function getAutoSyncEnabled(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEY_AUTO_SYNC)
    if (val === null) return true // Default selalu aktif seperti aplikasi sungguhan!
    return val === "true"
  } catch {
    return true
  }
}

export function setAutoSyncEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_AUTO_SYNC, enabled ? "true" : "false")
  } catch {
    // Ignore storage errors
  }
}

export function getLastSyncTime(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_LAST_SYNC)
  } catch {
    return null
  }
}

export function saveLastSyncTime(time: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_LAST_SYNC, time)
  } catch {
    // Ignore storage errors
  }
}

export function formatLastSync(timestamp: string | null): string {
  if (!timestamp) return "Belum pernah"
  try {
    const d = new Date(timestamp)
    if (isNaN(d.getTime())) return "Belum pernah"
    return `${d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
  } catch {
    return "Belum pernah"
  }
}

/**
 * Uji konektivitas dengan Google Apps Script Web App
 */
export async function testGasConnection(
  customUrl?: string,
): Promise<{ ok: boolean, message: string, timestamp?: string }> {
  const url = customUrl?.trim() || getSavedGasUrl()
  if (!url) {
    return {
      ok: false,
      message: "URL Google Apps Script belum diisi.",
    }
  }

  try {
    const targetUrl = url.includes("?")
      ? `${url}&action=ping&_t=${Date.now()}`
      : `${url}?action=ping&_t=${Date.now()}`

    const response = await fetch(targetUrl, {
      method: "GET",
      mode: "cors",
      redirect: "follow",
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const json = await response.json()
    if (json.ok) {
      return {
        ok: true,
        message: "Koneksi ke Google Sheet berhasil! API aktif.",
        timestamp: json.timestamp || new Date().toISOString(),
      }
    }
    return {
      ok: false,
      message: json.error || "Gagal memverifikasi respon dari Google Apps Script.",
    }
  } catch (error) {
    return {
      ok: false,
      message: `Gagal menghubungi Google Apps Script: ${error instanceof Error ? error.message : String(error)}. Pastikan izin Web App diatur ke 'Anyone' (Siapa saja).`,
    }
  }
}

/**
 * Kirim seluruh database lokal ke Google Sheet (Push / Upload)
 */
export async function pushStateToGoogleSheet(
  state: AppDatabaseState,
  customUrl?: string,
): Promise<{ ok: boolean, message: string, stats?: any }> {
  const url = customUrl?.trim() || getSavedGasUrl()
  if (!url) {
    return {
      ok: false,
      message: "URL Google Apps Script belum dikonfigurasi.",
    }
  }

  try {
    const payload = {
      action: "sync",
      data: {
        ...state,
        updatedAt: new Date().toISOString(),
      },
    }

    // Menggunakan text/plain untuk melewati CORS preflight pada Google Apps Script
    const response = await fetch(url, {
      method: "POST",
      mode: "cors",
      redirect: "follow",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const json = await response.json()
    if (json.ok) {
      const now = new Date().toISOString()
      saveLastSyncTime(now)
      return {
        ok: true,
        message: "Data sukses disinkronkan ke Google Sheet!",
        stats: json.stats,
      }
    }

    return {
      ok: false,
      message: json.error || "Gagal menyimpan data ke Google Sheet.",
    }
  } catch (error) {
    return {
      ok: false,
      message: `Error sinkronisasi: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Ambil seluruh database terbaru dari Google Sheet (Pull / Download)
 */
export async function pullStateFromGoogleSheet(
  customUrl?: string,
): Promise<{ ok: boolean, data?: AppDatabaseState, message: string }> {
  const url = customUrl?.trim() || getSavedGasUrl()
  if (!url) {
    return {
      ok: false,
      message: "URL Google Apps Script belum dikonfigurasi.",
    }
  }

  try {
    const targetUrl = url.includes("?")
      ? `${url}&action=load&_t=${Date.now()}`
      : `${url}?action=load&_t=${Date.now()}`

    const response = await fetch(targetUrl, {
      method: "GET",
      mode: "cors",
      redirect: "follow",
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const json = await response.json()
    if (json.ok && json.data) {
      const now = new Date().toISOString()
      saveLastSyncTime(now)
      return {
        ok: true,
        data: json.data,
        message: "Data terbaru berhasil ditarik dari Google Sheet!",
      }
    }

    if (json.ok && !json.data) {
      return {
        ok: true,
        data: undefined,
        message: "Google Sheet terhubung, namun belum ada data cadangan tersimpan.",
      }
    }

    return {
      ok: false,
      message: json.error || "Gagal menarik data dari Google Sheet.",
    }
  } catch (error) {
    return {
      ok: false,
      message: `Gagal membaca Google Sheet: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

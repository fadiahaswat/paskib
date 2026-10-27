import { fitnessScore } from "@/data/selectionGuide"
import type { IntervalTrainingLog } from "./selection"

export type PaceConsistencyLevel =
  | "Sangat Konsisten"
  | "Negatif Split (Kuat)"
  | "Cukup Stabil"
  | "Penurunan Drastis"
  | "Data Belum Lengkap"

export interface IntervalAnalysisResult {
  score: number
  avgSplitSec: number
  totalDistanceM: number
  projected12MinDistanceM: number
  projected12MinScore: number
  projectedPaceKm: string
  paceConsistency: PaceConsistencyLevel
  fatigueIndexPercent: number
  coachRecommendation: string
  lapSplitsSec: number[]
}

/**
 * Menghitung skor latihan interval (0 - 100).
 */
export function calculateIntervalScore(
  targetSets: number,
  completedSets: number,
  targetPace: number,
  avgSplit: number,
  isDnf: boolean,
): number {
  if (isDnf) return 0
  if (completedSets === 0) return 0

  const completionRatio = Math.min(1, completedSets / Math.max(1, targetSets))
  let score = completionRatio * 85

  if (targetPace > 0 && avgSplit > 0) {
    if (avgSplit <= targetPace) {
      score += 15
    } else if (avgSplit <= targetPace * 1.05) {
      score += 10
    } else if (avgSplit <= targetPace * 1.15) {
      score += 5
    }
  } else {
    score += 10
  }

  return Math.min(100, Math.max(10, Math.round(score)))
}

/**
 * Menganalisis konsistensi waktu lap antar-set.
 */
export function analyzePaceConsistency(lapSplits: number[]): {
  level: PaceConsistencyLevel
  fatigueIndexPercent: number
  description: string
} {
  const validSplits = lapSplits.filter((s) => s > 0 && !isNaN(s))
  if (validSplits.length < 2) {
    return {
      level: "Data Belum Lengkap",
      fatigueIndexPercent: 0,
      description: "Data split set belum cukup untuk analisis tren konsistensi.",
    }
  }

  const mid = Math.ceil(validSplits.length / 2)
  const firstHalf = validSplits.slice(0, mid)
  const secondHalf = validSplits.slice(mid)

  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

  const diffSec = avgSecond - avgFirst
  const fatigueIndexPercent = Math.round(((avgSecond - avgFirst) / avgFirst) * 100)

  if (diffSec < -2.5) {
    return {
      level: "Negatif Split (Kuat)",
      fatigueIndexPercent,
      description: "Luar biasa! Santri semakin cepat di set-set akhir (negatif split). Manajemen stamina sangat prima.",
    }
  } else if (Math.abs(diffSec) <= 3) {
    return {
      level: "Sangat Konsisten",
      fatigueIndexPercent: Math.max(0, fatigueIndexPercent),
      description: "Pacing terkontrol rapi dari awal hingga akhir set. Ritme lari sangat stabil.",
    }
  } else if (diffSec <= 7.5) {
    return {
      level: "Cukup Stabil",
      fatigueIndexPercent,
      description: "Terdapat sedikit perlambatan wajar akibat akumulasi beban aerobik.",
    }
  } else {
    return {
      level: "Penurunan Drastis",
      fatigueIndexPercent,
      description: "Pace menurun signifikan di lap akhir. Indikasi santri terlalu cepat di awal atau daya tahan belum optimal.",
    }
  }
}

/**
 * Menghitung estimasi proyeksi hasil Lari 12 Menit berdasarkan rata-rata pace interval.
 */
export function project12MinuteRun(
  avgSplitSec: number,
  completedSets: number,
  targetSets: number,
  distPerSetM = 400,
): {
  projectedDistanceM: number
  projectedScore: number
  projectedPaceKm: string
} {
  if (avgSplitSec <= 0 || isNaN(avgSplitSec)) {
    return {
      projectedDistanceM: 0,
      projectedScore: 0,
      projectedPaceKm: "--:-- /km",
    }
  }

  // Pace dalam detik per meter
  const secPerMeter = avgSplitSec / distPerSetM
  const paceSecPerKm = Math.round(secPerMeter * 1000)
  const paceMinutes = Math.floor(paceSecPerKm / 60)
  const paceSecs = paceSecPerKm % 60
  const formattedPace = `${paceMinutes}:${String(paceSecs).padStart(2, "0")} /km`

  // Faktor kelelahan lari terus-menerus 12 menit vs interval berselang istirahat
  const volumeBonus = Math.min(1, completedSets / Math.max(1, targetSets))
  const enduranceFactor = 0.94 * (0.9 + 0.1 * volumeBonus)

  // Dalam 12 menit = 720 detik
  const rawProjectedM = (720 / avgSplitSec) * distPerSetM * enduranceFactor
  const projectedDistanceM = Math.min(3400, Math.max(1200, Math.round(rawProjectedM / 10) * 10))
  const projectedScore = fitnessScore("run", projectedDistanceM)

  return {
    projectedDistanceM,
    projectedScore,
    projectedPaceKm: formattedPace,
  }
}

/**
 * Analisis lengkap performa interval & rekomendasi terpadu.
 */
export function analyzeIntervalPerformance({
  targetSets,
  completedSets,
  targetPaceSec,
  avgSplitSec,
  lapSplits,
  isDnf = false,
  distPerSetM = 400,
}: {
  targetSets: number
  completedSets: number
  targetPaceSec: number
  avgSplitSec: number
  lapSplits: number[]
  isDnf?: boolean
  distPerSetM?: number
}): IntervalAnalysisResult {
  const score = calculateIntervalScore(targetSets, completedSets, targetPaceSec, avgSplitSec, isDnf)
  const consistency = analyzePaceConsistency(lapSplits)
  const projection = project12MinuteRun(avgSplitSec, completedSets, targetSets, distPerSetM)
  const totalDistanceM = completedSets * distPerSetM

  let recommendation = ""
  if (isDnf) {
    recommendation = "Sesi dihentikan (DNF). Evaluasi kondisi hidrasi, pemanasan, dan riwayat kesehatan santri sebelum latihan lanjutan."
  } else if (projection.projectedDistanceM >= 3000) {
    recommendation = `Performa prima! Proyeksi tembus ${projection.projectedDistanceM.toLocaleString("id-ID")}m (Skor 100). Pertahankan ritme split ${Math.round(avgSplitSec)}s dan fokus jaga kondisi jelang simulasi.`
  } else if (projection.projectedDistanceM >= 2700) {
    recommendation = `Kondisi sangat baik (Proyeksi ${projection.projectedDistanceM.toLocaleString("id-ID")}m, Skor ${projection.projectedScore}). Tingkatkan toleransi laktat di 2 set terakhir agar tembus 3.000m.`
  } else if (projection.projectedDistanceM >= 2400) {
    recommendation = `Batas aman kompetisi (Proyeksi ${projection.projectedDistanceM.toLocaleString("id-ID")}m). Perlu tambahan variasi latihan tempo run 20 menit dan interval bertahap.`
  } else {
    recommendation = `Masih di bawah target aman (Proyeksi ${projection.projectedDistanceM.toLocaleString("id-ID")}m). Disarankan latihan kardio dasar 3x seminggu dan latihan pernapasan diafragma.`
  }

  if (consistency.level === "Penurunan Drastis") {
    recommendation += " Catatan: Atur ritme lap awal agar santri tidak mengalami exhaustion di pertengahan sesi."
  }

  return {
    score,
    avgSplitSec,
    totalDistanceM,
    projected12MinDistanceM: projection.projectedDistanceM,
    projected12MinScore: projection.projectedScore,
    projectedPaceKm: projection.projectedPaceKm,
    paceConsistency: consistency.level,
    fatigueIndexPercent: consistency.fatigueIndexPercent,
    coachRecommendation: recommendation,
    lapSplitsSec: lapSplits,
  }
}

/**
 * Membuat entri log interval baru untuk profil kandidat.
 */
export function createIntervalLogEntry({
  sessionId,
  sessionTitle,
  date,
  targetSets,
  completedSets,
  targetPaceSec,
  avgSplitSec,
  lapSplits,
  isDnf = false,
  distPerSetM = 400,
  note = "",
}: {
  sessionId?: string
  sessionTitle?: string
  date: string
  targetSets: number
  completedSets: number
  targetPaceSec: number
  avgSplitSec: number
  lapSplits: number[]
  isDnf?: boolean
  distPerSetM?: number
  note?: string
}): IntervalTrainingLog {
  const analysis = analyzeIntervalPerformance({
    targetSets,
    completedSets,
    targetPaceSec,
    avgSplitSec,
    lapSplits,
    isDnf,
    distPerSetM,
  })

  return {
    id: `interval-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    sessionId,
    sessionTitle: sessionTitle || "Latihan Lari Interval",
    date,
    targetSets,
    completedSets,
    distancePerSet: distPerSetM,
    totalDistance: analysis.totalDistanceM,
    targetPaceSec,
    avgSplitSec: Number(avgSplitSec.toFixed(1)),
    lapSplitsSec: lapSplits,
    score: analysis.score,
    projected12MinDistanceM: analysis.projected12MinDistanceM,
    projected12MinScore: analysis.projected12MinScore,
    paceConsistency: analysis.paceConsistency as any,
    coachRecommendation: analysis.coachRecommendation,
    note,
  }
}

/**
 * Ekstraksi otomatis seluruh rekam jejak interval kandidat dari catatan sesi (termasuk sesi kemarin).
 */
export function extractCandidateIntervalLogs(
  candidateId: string,
  sessions: { id: string; title: string; type: string; date: string; trackLength?: number }[],
  records: Record<string, { savedAt?: string; metrics?: Record<string, string>; note?: string }>,
  directHistory: IntervalTrainingLog[] = [],
): IntervalTrainingLog[] {
  const extracted: IntervalTrainingLog[] = []

  for (const session of sessions) {
    const rec = records[`${session.id}:${candidateId}`]
    if (!rec || !rec.savedAt) continue
    const m = rec.metrics ?? {}
    const isInterval =
      m.runMode === "interval" ||
      session.title.toLowerCase().includes("interval") ||
      Boolean(m.intervalLap1) ||
      Boolean(m.intervalTargetSets) ||
      Boolean(m.intervalDist) ||
      Boolean(m.intervalAvg)

    if (isInterval) {
      const targetSets = parseInt(m.intervalTargetSets || "4", 10) || 4
      const targetPace = parseFloat(m.intervalTargetPace || "90") || 90
      const distPerSet = parseFloat(m.intervalDist || String(session.trackLength || 400)) || 400
      const isDnf = m.runDnf === "yes"

      let laps = Array.from({ length: 12 }, (_, i) => i + 1)
        .map((i) => parseFloat(m[`intervalLap${i}`] || ""))
        .filter((v) => !isNaN(v) && v > 0)

      if (laps.length === 0) {
        const directAvg = parseFloat(m.intervalAvg || "")
        if (!isNaN(directAvg) && directAvg > 0) {
          laps = Array.from({ length: Math.max(1, targetSets) }, () => directAvg)
        }
      }

      // Santri memiliki data interval jika ada split lap riil atau rata-rata waktu per set (intervalAvg) yang dicatat
      if (laps.length === 0) continue

      const completedSets = laps.length
      const avgSplit = laps.reduce((a, b) => a + b, 0) / laps.length
      const dateStr = rec.savedAt ? rec.savedAt.slice(0, 10) : session.date

      const log = createIntervalLogEntry({
        sessionId: session.id,
        sessionTitle: session.title || "Latihan Lari Interval",
        date: dateStr,
        targetSets,
        completedSets,
        targetPaceSec: targetPace,
        avgSplitSec: avgSplit,
        lapSplits: laps,
        isDnf,
        distPerSetM: distPerSet,
        note: rec.note || undefined,
      })
      extracted.push(log)
    }
  }

  // Gabungkan dengan catatan manual yang sah (hanya yang memiliki split lap riil)
  const validDirect = directHistory.filter(
    (l) => Array.isArray(l.lapSplitsSec) && l.lapSplitsSec.length > 0,
  )
  const sessionIds = new Set(extracted.map((l) => l.sessionId).filter(Boolean))
  const nonDuplicatedDirect = validDirect.filter((l) => !l.sessionId || !sessionIds.has(l.sessionId))
  return [...extracted, ...nonDuplicatedDirect].sort((a, b) => b.date.localeCompare(a.date))
}

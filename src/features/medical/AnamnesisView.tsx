import { useState, useEffect, useMemo, useCallback } from "react"
import {
  HeartPulse,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ShieldAlert,
  UserCheck,
  Stethoscope,
  FileCheck2,
  Award,
  History,
  Calendar,
  Clock,
  Eye,
  Lock,
  PlusCircle,
  X,
  AlertCircle,
} from "lucide-react"
import { Badge, Button, Card } from "../../components/ui"
import { useApp } from "../../context/AppContext"
import { anamnesisItems, criticalAnamnesis } from "../../data/selectionGuide"
import type { Session, SessionRecord } from "../../domain/selection"
import type { View } from "../../App"

export interface ScreeningHistoryEntry {
  id: string
  candidateId: string
  timestamp: string
  monthKey: string // "YYYY-MM"
  monthLabel: string // "Oktober 2026"
  attemptInMonth: number // 1 or 2
  score: number // 0-100
  yesCount: number
  criticalCount: number
  status: "passed" | "review" | "failed"
  answers: Record<string, "yes" | "no">
}

const anamnesisQuestions = [
  "Apakah Anda sering mengalami ISPA atau batuk/pilek lebih dari 4 kali dalam setahun?",
  "Apakah telinga Anda sering berdenging atau pernah mengeluarkan cairan?",
  "Apakah Anda memiliki riwayat asma yang sering kambuh atau riwayat sakit TBC?",
  "Apakah Anda sering mengalami insomnia atau gangguan tidur yang parah?",
  "Apakah terdapat pembuluh darah varises yang menonjol di bagian kaki Anda?",
  "Apakah Anda memiliki gangguan bicara seperti gagap atau kesulitan artikulasi berat?",
  "Apakah Anda pernah mengalami ambeien/wasir atau perdarahan saluran cerna?",
  "Apakah Anda sering merasakan nyeri tulang belakang atau kelainan bentuk rangka/tulang punggung?",
  "Apakah Anda memiliki riwayat sakit maag kronis atau asam lambung (GERD)?",
  "Apakah Anda pernah mengalami patah tulang atau masih terpasang pen/implan ortopedi?",
  "Apakah Anda pernah merasakan nyeri dada atau detak jantung tidak beraturan (aritmia)?",
  "Apakah saat ini Anda sedang mengonsumsi obat rutin tertentu selain vitamin/suplemen?",
  "Apakah Anda memiliki riwayat penyakit ginjal atau gangguan saluran kemih?",
  "Apakah Anda pernah menjalani tindakan operasi besar dengan pembiusan umum (total)?",
  "Apakah Anda sering mengalami migrain atau sakit kepala lebih dari 1 kali dalam seminggu?",
  "Apakah Anda pernah pingsan dalam kurun waktu 3 bulan terakhir?",
  "Apakah Anda memiliki kebiasaan merokok atau menggunakan rokok elektrik (vape)?",
  "Apakah Anda memiliki riwayat kejang atau penyakit epilepsi?",
  "Apakah Anda pernah atau sedang mengonsumsi minuman beralkohol atau zat terlarang (narkoba)?",
  "Apakah Anda memiliki gigi berlubang (karies aktif) lebih dari 5 gigi?",
  "Apakah Anda memiliki riwayat alergi berat terhadap makanan atau obat-obatan tertentu?",
]

function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return isoString
  }
}

interface AnamnesisViewProps {
  onNavigate?: (view: View) => void
}

export default function AnamnesisView({ onNavigate }: AnamnesisViewProps) {
  const {
    currentUser,
    candidates,
    records,
    setRecords,
    sessions,
    setSessions,
    updateCandidate,
    updateCandidateStage,
    showToast,
    logAudit,
  } = useApp()

  const isCandidate = currentUser?.role === "candidate"
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(() => {
    if (isCandidate && currentUser?.candidateId) {
      return currentUser.candidateId
    }
    return candidates[0]?.id || ""
  })

  // Sync candidate if candidate user logs in
  useEffect(() => {
    if (isCandidate && currentUser?.candidateId) {
      setSelectedCandidateId(currentUser.candidateId)
    } else if (!selectedCandidateId && candidates.length > 0) {
      setSelectedCandidateId(candidates[0].id)
    }
  }, [isCandidate, currentUser?.candidateId, candidates, selectedCandidateId])

  const targetCandidate = candidates.find((c) => c.id === selectedCandidateId)

  // Find existing medical session or prepare one
  const medicalSession = sessions.find((s) => s.type === "medical")
  const sessionKey = medicalSession && targetCandidate ? `${medicalSession.id}:${targetCandidate.id}` : ""

  // History & Session state
  const [history, setHistory] = useState<ScreeningHistoryEntry[]>([])
  const [isFillingSecondAttempt, setIsFillingSecondAttempt] = useState(false)
  const [selectedHistoryForModal, setSelectedHistoryForModal] = useState<ScreeningHistoryEntry | null>(null)

  // Local state for 21 anamnesis responses: key "0".."20" -> "yes" | "no"
  const [answers, setAnswers] = useState<Record<string, "yes" | "no">>({})
  const [savedScore, setSavedScore] = useState<number | null>(null)
  const [autoSavePulse, setAutoSavePulse] = useState(false)

  // Monthly Calculations
  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const currentMonthLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date())
    } catch {
      return "Bulan Ini"
    }
  }, [])

  // Load history & current active answers for target candidate
  useEffect(() => {
    if (!targetCandidate) return

    // 1. Load history
    let candidateHistory: ScreeningHistoryEntry[] = []
    try {
      const storedHistory = localStorage.getItem(`paska-anamnesis-history-${targetCandidate.id}`)
      if (storedHistory) {
        candidateHistory = JSON.parse(storedHistory)
      }
    } catch {
      candidateHistory = []
    }

    // Fallback: If history empty, check if existing record exists to seed initial history #1
    if (candidateHistory.length === 0) {
      let existingScore: number | null = null
      let existingAnswers: Record<string, "yes" | "no"> = {}
      let existingStatus: "passed" | "review" | "failed" = "passed"
      let existingTimestamp = new Date().toISOString()

      // Check session record
      if (sessionKey && records[sessionKey]?.metrics) {
        const rec = records[sessionKey].metrics
        if (rec.anamnesisScore) existingScore = Number(rec.anamnesisScore)
        if (rec.anamnesisStatus) existingStatus = rec.anamnesisStatus as "passed" | "review" | "failed"
        if (rec.anamnesisCompletedAt) existingTimestamp = rec.anamnesisCompletedAt
        anamnesisItems.forEach((_, i) => {
          const val = rec[`anamnesis-${i}`]
          if (val === "yes" || val === "no") existingAnswers[String(i)] = val
        })
      }

      // Check legacy local storage
      if (Object.keys(existingAnswers).length === 0) {
        try {
          const legacy = localStorage.getItem(`paska-anamnesis-${targetCandidate.id}`)
          if (legacy) {
            const parsed = JSON.parse(legacy)
            if (parsed.answers) existingAnswers = parsed.answers
            if (parsed.score !== undefined) existingScore = Number(parsed.score)
            if (parsed.status) existingStatus = parsed.status
            if (parsed.savedAt) existingTimestamp = parsed.savedAt
          }
        } catch {
          // Ignore
        }
      }

      if (Object.keys(existingAnswers).length > 0) {
        const seedEntry: ScreeningHistoryEntry = {
          id: `screening-initial-${targetCandidate.id}`,
          candidateId: targetCandidate.id,
          timestamp: existingTimestamp,
          monthKey: currentMonthKey,
          monthLabel: currentMonthLabel,
          attemptInMonth: 1,
          score: existingScore ?? 100,
          yesCount: Object.values(existingAnswers).filter((v) => v === "yes").length,
          criticalCount: 0,
          status: existingStatus,
          answers: existingAnswers,
        }
        candidateHistory = [seedEntry]
        try {
          localStorage.setItem(`paska-anamnesis-history-${targetCandidate.id}`, JSON.stringify(candidateHistory))
        } catch {
          // Ignore
        }
      }
    }

    setHistory(candidateHistory)

    // Calculate this month's attempts
    const thisMonth = candidateHistory.filter((h) => h.monthKey === currentMonthKey)
    const attemptsThisMonth = thisMonth.length

    // 2. Set current answers & score
    if (attemptsThisMonth === 0) {
      // First attempt of this month: check draft or start fresh
      try {
        const draft = localStorage.getItem(`paska-anamnesis-draft-${targetCandidate.id}`)
        if (draft) {
          const parsedDraft = JSON.parse(draft)
          setAnswers(parsedDraft.answers || {})
          setSavedScore(parsedDraft.score ?? null)
          return
        }
      } catch {
        // Ignore
      }
      setAnswers({})
      setSavedScore(null)
    } else {
      // Has attempt(s) this month: display the latest attempt by default
      const latest = candidateHistory[0]
      if (latest) {
        setAnswers(latest.answers)
        setSavedScore(latest.score)
      }
    }
  }, [targetCandidate?.id, sessionKey, records, currentMonthKey, currentMonthLabel])

  // Filter history for current candidate
  const candidateHistory = useMemo(() => {
    if (!targetCandidate) return []
    return history.filter((h) => h.candidateId === targetCandidate.id)
  }, [history, targetCandidate])

  const thisMonthHistory = useMemo(() => {
    return candidateHistory.filter((h) => h.monthKey === currentMonthKey)
  }, [candidateHistory, currentMonthKey])

  const monthlyAttemptsCount = thisMonthHistory.length
  const isMaxMonthlyReached = monthlyAttemptsCount >= 2
  const isMinQuotaMet = monthlyAttemptsCount >= 1

  // Screening pertama bulan ini untuk validasi jeda 2 minggu
  const firstAttemptThisMonth = useMemo(() => {
    return thisMonthHistory.find((h) => h.attemptInMonth === 1) || thisMonthHistory[thisMonthHistory.length - 1]
  }, [thisMonthHistory])

  // Jarak antar 2 tes minimal 2 minggu (14 hari)
  const twoWeekIntervalInfo = useMemo(() => {
    if (!firstAttemptThisMonth) {
      return { isEligible: true, daysRemaining: 0, nextEligibleDate: null }
    }

    const firstTime = new Date(firstAttemptThisMonth.timestamp).getTime()
    const nowTime = Date.now()
    const msInDay = 24 * 60 * 60 * 1000
    const diffDays = Math.floor((nowTime - firstTime) / msInDay)
    const requiredDays = 14
    const isEligible = diffDays >= requiredDays
    const daysRemaining = Math.max(1, requiredDays - diffDays)
    const nextDate = new Date(firstTime + requiredDays * msInDay)

    return {
      isEligible,
      daysRemaining,
      nextEligibleDate: nextDate,
      diffDays,
    }
  }, [firstAttemptThisMonth])

  const formattedNextEligibleDate = useMemo(() => {
    if (!twoWeekIntervalInfo.nextEligibleDate) return ""
    try {
      return twoWeekIntervalInfo.nextEligibleDate.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    } catch {
      return ""
    }
  }, [twoWeekIntervalInfo.nextEligibleDate])

  // Determine if in active filling mode
  const isFillingMode = monthlyAttemptsCount === 0 || (monthlyAttemptsCount === 1 && isFillingSecondAttempt)
  const currentAttemptNumber = monthlyAttemptsCount === 0 ? 1 : 2

  const yesCount = useMemo(() => {
    return anamnesisItems.filter((_, i) => answers[String(i)] === "yes").length
  }, [answers])

  const criticalTriggered = useMemo(() => {
    return anamnesisItems
      .map((item, index) => ({ item, index }))
      .filter(({ index }) => criticalAnamnesis.has(index) && answers[String(index)] === "yes")
  }, [answers])

  const answeredCount = Object.keys(answers).length

  // Calculate score (0-100)
  const calculatedScore = useMemo(() => {
    if (answeredCount === 0) return 0
    if (criticalTriggered.length > 0) return 0
    if (yesCount === 0) return 100
    if (yesCount <= 5) {
      return Math.max(60, 100 - yesCount * 8)
    }
    return Math.max(20, 60 - (yesCount - 5) * 8)
  }, [answeredCount, criticalTriggered.length, yesCount])

  // Function to persist score & status to Tahap 4 Rikkes
  const syncScoreToRikkes = useCallback(
    (
      currentAnswers: Record<string, "yes" | "no">,
      score: number,
      status: "passed" | "review" | "failed",
      totalYes: number,
      criticalList: { item: readonly [string, string]; index: number }[],
    ) => {
      if (!targetCandidate) return

      // 1. Ensure or create medical Rikkes session
      let activeMedicalSession = medicalSession
      if (!activeMedicalSession) {
        activeMedicalSession = {
          id: "session-rikkes-tahap4",
          type: "medical",
          title: "Pemeriksaan Kesehatan (Rikkes Tahap 4)",
          date: new Date().toISOString().slice(0, 10),
          time: "08:00",
          location: "Klinik / Posko Medis Rikkes",
          coach: "TIM MEDIS",
          participantIds: candidates.map((c) => c.id),
          status: "ongoing",
        }
        setSessions((prev) => [activeMedicalSession!, ...prev])
      }

      const currentKey = `${activeMedicalSession.id}:${targetCandidate.id}`
      const existingRec = records[currentKey] || {
        sessionId: activeMedicalSession.id,
        candidateId: targetCandidate.id,
        attendance: "hadir" as const,
        metrics: {},
        updatedAt: new Date().toISOString(),
      }

      const patchedMetrics: Record<string, string> = {
        ...existingRec.metrics,
        anamnesis: String(totalYes),
        anamnesisScore: String(score),
        anamnesisStatus: status,
        anamnesisCritical: criticalList.length > 0 ? "yes" : "no",
        anamnesisCompleted: "true",
        anamnesisCompletedAt: new Date().toISOString(),
      }

      anamnesisItems.forEach((_, i) => {
        patchedMetrics[`anamnesis-${i}`] = currentAnswers[String(i)] || "no"
      })

      const updatedRecord: SessionRecord = {
        ...existingRec,
        metrics: patchedMetrics,
        result: status === "failed" ? "failed" : status === "review" ? "review" : "passed",
        savedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setRecords((prev) => ({
        ...prev,
        [currentKey]: updatedRecord,
      }))

      // 2. Sync to Stage 4 Status
      const stageStatus = status === "failed" ? "failed" : status === "review" ? "review" : "passed"
      const statusNote =
        status === "failed"
          ? `Screening Kesehatan: Gagal Kritis (${criticalList.map((c) => c.item[0].split("/")[0]).join(", ")})`
          : status === "review"
            ? `Screening Kesehatan: Perlu Tinjau (${totalYes} YA > ambang 5)`
            : `Screening Kesehatan: Laik (${totalYes} YA · Skor ${score}/100)`

      updateCandidateStage(targetCandidate.id, 3, stageStatus, statusNote)

      // 3. Sync to candidate physicalMetrics
      const existingMetrics = targetCandidate.physicalMetrics ?? []
      const updatedPhysicalMetrics = [
        ...existingMetrics.filter((m) => !m.label.toLowerCase().includes("anamnesis")),
        {
          label: "Anamnesis Rikkes",
          current: `${score}/100 (${totalYes} YA)`,
          target: "≥70 (Maks 5 YA)",
          percent: score,
        },
      ]

      updateCandidate(targetCandidate.id, {
        physicalMetrics: updatedPhysicalMetrics,
      })

      // 4. Update latest anamnesis in localStorage for App.tsx summary cards
      try {
        localStorage.setItem(
          `paska-anamnesis-${targetCandidate.id}`,
          JSON.stringify({
            answers: currentAnswers,
            score,
            yesCount: totalYes,
            criticalCount: criticalList.length,
            status,
            savedAt: new Date().toISOString(),
          }),
        )
      } catch (e) {
        console.error(e)
      }
    },
    [targetCandidate, medicalSession, candidates, records, setSessions, setRecords, updateCandidateStage, updateCandidate],
  )

  // Handle setting individual answer with full autosave directly to Rikkes & History
  const handleSetAnswer = (index: number, val: "yes" | "no") => {
    if (!isFillingMode || !targetCandidate) return

    const updated = {
      ...answers,
      [String(index)]: val,
    }
    setAnswers(updated)

    const answered = Object.keys(updated).length
    const nextYesCount = anamnesisItems.filter((_, i) => updated[String(i)] === "yes").length
    const nextCritical = anamnesisItems
      .map((item, i) => ({ item, index: i }))
      .filter(({ index: i }) => criticalAnamnesis.has(i) && updated[String(i)] === "yes")

    let nextScore = 0
    if (answered > 0) {
      if (nextCritical.length > 0) {
        nextScore = 0
      } else if (nextYesCount === 0) {
        nextScore = 100
      } else if (nextYesCount <= 5) {
        nextScore = Math.max(60, 100 - nextYesCount * 8)
      } else {
        nextScore = Math.max(20, 60 - (nextYesCount - 5) * 8)
      }
    }

    const nextStatus: "passed" | "review" | "failed" =
      answered === 0
        ? "passed"
        : nextCritical.length > 0
          ? "failed"
          : nextYesCount > 5
            ? "review"
            : "passed"

    setSavedScore(nextScore)

    // 1. Sync immediately to Sub-Nilai Rikkes Tahap 4
    syncScoreToRikkes(updated, nextScore, nextStatus, nextYesCount, nextCritical)

    // 2. Automatically save / update History
    setHistory((prev) => {
      const existingAttemptIndex = prev.findIndex(
        (h) => h.candidateId === targetCandidate.id && h.monthKey === currentMonthKey && h.attemptInMonth === currentAttemptNumber,
      )

      const historyEntry: ScreeningHistoryEntry = {
        id: existingAttemptIndex >= 0 ? prev[existingAttemptIndex].id : `screening-${Date.now()}`,
        candidateId: targetCandidate.id,
        timestamp: new Date().toISOString(),
        monthKey: currentMonthKey,
        monthLabel: currentMonthLabel,
        attemptInMonth: currentAttemptNumber,
        score: nextScore,
        yesCount: nextYesCount,
        criticalCount: nextCritical.length,
        status: nextStatus,
        answers: updated,
      }

      let updatedHistory: ScreeningHistoryEntry[]
      if (existingAttemptIndex >= 0) {
        updatedHistory = [...prev]
        updatedHistory[existingAttemptIndex] = historyEntry
      } else {
        updatedHistory = [historyEntry, ...prev]
      }

      try {
        localStorage.setItem(`paska-anamnesis-history-${targetCandidate.id}`, JSON.stringify(updatedHistory))
      } catch (e) {
        console.error(e)
      }

      return updatedHistory
    })

    setAutoSavePulse(true)
    setTimeout(() => setAutoSavePulse(false), 1200)
  }

  // Mulai pengisian screening ke-2 (jika baru 1x bulan ini dan jeda minimal 2 minggu terpenuhi)
  const handleStartSecondAttempt = () => {
    if (!twoWeekIntervalInfo.isEligible) {
      showToast(
        `Screening ke-2 belum dapat dimulai. Jarak antar 2 tes minimal 2 minggu (tersisa ${twoWeekIntervalInfo.daysRemaining} hari lagi, tersedia mulai ${formattedNextEligibleDate}).`,
        "warning",
      )
      return
    }
    setIsFillingSecondAttempt(true)
    setAnswers({})
    setSavedScore(null)
    showToast(`Memulai screening ke-2 untuk ${currentMonthLabel}. Silakan jawab 21 pertanyaan.`, "info")
  }

  // Batal pengisian ke-2 dan kembali ke hasil ke-1
  const handleCancelSecondAttempt = () => {
    setIsFillingSecondAttempt(false)
    const latest = candidateHistory[0]
    if (latest) {
      setAnswers(latest.answers)
      setSavedScore(latest.score)
    }
  }

  return (
    <div className="grid gap-4 print:p-0">
      {/* Header Banner - Ringkas & Padat */}
      <Card className="border-slate-200/90 p-3 sm:p-4 shadow-2xs print:border-none print:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-950">
              Screening Kesehatan
            </h1>
            <span className="inline-flex items-center gap-1 rounded-md border border-red-200/80 bg-red-50 px-2 py-0.5 text-2xs font-semibold text-red-700">
              <HeartPulse className="size-3 text-red-600" />
              Tahap 4 Rikkes
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-blue-200/80 bg-blue-50 px-2 py-0.5 text-2xs font-semibold text-blue-700">
              <Calendar className="size-3 text-blue-600" />
              Bulan Ini: {monthlyAttemptsCount}/2 kali
            </span>
            {isFillingMode ? (
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-2xs font-medium transition-colors ${
                  autoSavePulse
                    ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                <CheckCircle2 className="size-3 text-emerald-600" />
                Draft autosave aktif
              </span>
            ) : null}
          </div>

          {targetCandidate ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">
                Terjawab: <strong className="text-slate-900">{answeredCount}/21</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="font-semibold text-slate-800 truncate max-w-[180px] sm:max-w-xs">
                {targetCandidate.name} ({targetCandidate.number})
              </span>
            </div>
          ) : null}
        </div>

        {/* Candidate Selector for Staff/Coach */}
        {!isCandidate && candidates.length > 0 ? (
          <div className="mt-2.5 flex items-center gap-2 border-t border-slate-100 pt-2 text-xs print:hidden">
            <span className="flex items-center gap-1 text-2xs font-semibold text-slate-500 uppercase tracking-wide">
              <UserCheck className="size-3.5 text-slate-400" /> Kandidat:
            </span>
            <select
              value={selectedCandidateId}
              onChange={(e) => {
                setSelectedCandidateId(e.target.value)
                setIsFillingSecondAttempt(false)
              }}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 shadow-2xs focus:border-red-500 focus:outline-none"
            >
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.number} - {c.name} ({c.gender}, {c.school})
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </Card>

      {/* Banner Notifikasi Ketentuan Pengisian Bulanan (Min 1x, Maks 2x, Jeda Min 2 Minggu) */}
      {monthlyAttemptsCount === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200/90 bg-amber-50/70 p-3 sm:p-3.5 text-xs text-amber-900">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <AlertCircle className="size-4 shrink-0 text-amber-600" />
            <p className="leading-snug">
              <strong>Kewajiban Bulanan ({currentMonthLabel}):</strong> Anda belum mengisi screening bulan ini (<strong>0/2 kali</strong>). Calon wajib mengisi <strong>minimal 1 kali</strong> dan maksimal 2 kali setiap bulan, dengan <strong>jeda minimal 2 minggu</strong> antar tes. Hasil otomatis tersimpan ke sub-nilai Rikkes.
            </p>
          </div>
        </div>
      ) : isMaxMonthlyReached ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-100/90 p-3 sm:p-3.5 text-xs text-slate-700">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Lock className="size-4 shrink-0 text-slate-500" />
            <p className="leading-snug">
              <strong>Batas Maksimal Tercapai ({currentMonthLabel}):</strong> Anda telah mengisi <strong>2 dari maksimal 2 kali</strong> screening kesehatan bulan ini. Nilai dari screening terbaru telah tersimpan secara resmi di Sub-Nilai Rikkes Tahap 4. Anda dapat mengisi kembali pada bulan berikutnya.
            </p>
          </div>
          <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-2xs font-bold text-slate-700">
            Kuesioner Terkunci (2/2)
          </span>
        </div>
      ) : isFillingSecondAttempt ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50/80 p-3 sm:p-3.5 text-xs text-blue-900">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <HeartPulse className="size-4 shrink-0 text-blue-600" />
            <p className="leading-snug">
              <strong>Sedang Mengisi Screening ke-2 ({currentMonthLabel}):</strong> Silakan perbarui jawaban 21 butir sesuai kondisi medis terkini. Setiap pilihan otomatis tersimpan ke sub-nilai Rikkes.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancelSecondAttempt}
            className="rounded-lg border border-blue-300 bg-white px-2.5 py-1 text-2xs font-semibold text-blue-700 hover:bg-blue-50 transition"
          >
            Batal (Kembali ke Hasil ke-1)
          </button>
        </div>
      ) : !twoWeekIntervalInfo.isEligible ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200/80 bg-blue-50/80 p-3 sm:p-3.5 text-xs text-blue-950">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Clock className="size-4 shrink-0 text-blue-600" />
            <p className="leading-snug">
              <strong>Target Bulanan Terpenuhi (1/2 kali):</strong> Sub-nilai Rikkes aktif tersimpan. Sesuai ketentuan, tes ke-2 baru dapat diisi setelah <strong>jeda minimal 2 minggu</strong> (tersisa <strong>{twoWeekIntervalInfo.daysRemaining} hari</strong> lagi, tersedia mulai <strong>{formattedNextEligibleDate}</strong>).
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-2.5 py-1 text-2xs font-bold text-blue-800 shrink-0">
            <Lock className="size-3 text-blue-500" />
            Jeda 2 Minggu ({twoWeekIntervalInfo.daysRemaining} Hari Lagi)
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 sm:p-3.5 text-xs text-emerald-950">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <p className="leading-snug">
              <strong>Target Bulanan Terpenuhi (1/2 kali):</strong> Jeda minimal 2 minggu telah terpenuhi. Anda dapat melakukan screening ke-2 bulan ini jika ingin memperbarui catatan kondisi kesehatan.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleStartSecondAttempt}
            className="border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50 text-2xs font-bold shrink-0"
          >
            <PlusCircle className="size-3 text-emerald-600" /> Mulai Screening ke-2
          </Button>
        </div>
      )}

      {/* 1 Baris 3 Ringkas: Sub-Score, YA Count, Kuota Bulanan */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Card 1: Sub-Nilai Rikkes */}
        <div
          className={`rounded-2xl border p-2.5 sm:p-3.5 shadow-2xs transition-all ${
            criticalTriggered.length > 0
              ? "border-red-300 bg-red-50/60"
              : (savedScore ?? calculatedScore) >= 70
                ? "border-emerald-200 bg-emerald-50/40"
                : answeredCount > 0
                  ? "border-amber-200 bg-amber-50/40"
                  : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-3xs sm:text-2xs font-bold uppercase tracking-wider text-slate-500 truncate">
              Sub-Nilai Rikkes
            </span>
            <Badge
              tone={
                criticalTriggered.length > 0
                  ? "danger"
                  : (savedScore ?? calculatedScore) >= 70
                    ? "success"
                    : answeredCount > 0
                      ? "warning"
                      : "neutral"
              }
              className="scale-90 origin-right px-1.5 py-0"
            >
              {criticalTriggered.length > 0
                ? "TMS"
                : (savedScore ?? calculatedScore) >= 70
                  ? "MS"
                  : answeredCount > 0
                    ? "Tinjau"
                    : "—"}
            </Badge>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className={`font-display text-xl sm:text-2xl font-black tabular-nums ${
                criticalTriggered.length > 0
                  ? "text-red-600"
                  : (savedScore ?? calculatedScore) >= 70
                    ? "text-emerald-700"
                    : answeredCount > 0
                      ? "text-amber-700"
                      : "text-slate-400"
              }`}
            >
              {savedScore !== null ? savedScore : answeredCount > 0 ? calculatedScore : "—"}
            </span>
            <span className="text-3xs sm:text-2xs font-semibold text-slate-400">/ 100</span>
          </div>
          <p className="mt-0.5 text-3xs text-slate-500 truncate">
            Target kelulusan: ≥ 70
          </p>
        </div>

        {/* Card 2: Jumlah Jawaban YA */}
        <div className="rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-3.5 shadow-2xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-3xs sm:text-2xs font-bold uppercase tracking-wider text-slate-500 truncate">
              Jawaban YA
            </span>
            <Badge
              tone={yesCount > 5 ? "danger" : yesCount > 0 ? "warning" : "success"}
              className="scale-90 origin-right px-1.5 py-0"
            >
              Maks 5
            </Badge>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className={`font-display text-xl sm:text-2xl font-black tabular-nums ${
                yesCount > 5 ? "text-red-600" : "text-slate-900"
              }`}
            >
              {yesCount}
            </span>
            <span className="text-3xs sm:text-2xs text-slate-500">/ 21 butir</span>
          </div>
          <p className="mt-0.5 text-3xs text-slate-500 truncate">
            {yesCount > 5 ? "Melebihi batas aman" : "Dalam batas aman"}
          </p>
        </div>

        {/* Card 3: Frekuensi Bulan Ini */}
        <div className="rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-3.5 shadow-2xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-3xs sm:text-2xs font-bold uppercase tracking-wider text-slate-500 truncate">
              Kuota Bulan Ini
            </span>
            <Badge
              tone={isMaxMonthlyReached ? "neutral" : isMinQuotaMet ? "success" : "warning"}
              className="scale-90 origin-right px-1.5 py-0"
            >
              {isMaxMonthlyReached ? "Maksimal" : isMinQuotaMet ? "Min. Terpenuhi" : "Wajib Min. 1x"}
            </Badge>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-display text-xl sm:text-2xl font-black tabular-nums text-slate-900">
              {monthlyAttemptsCount}
            </span>
            <span className="text-3xs sm:text-2xs text-slate-500">/ 2 kali</span>
          </div>
          <p className="mt-0.5 text-3xs text-slate-500 truncate">
            {isMaxMonthlyReached
              ? "Bulan ini lengkap"
              : monthlyAttemptsCount === 1 && !twoWeekIntervalInfo.isEligible
                ? `Jeda 2 mgg: ${twoWeekIntervalInfo.daysRemaining} hari lagi`
                : isMinQuotaMet
                  ? "Sisa 1x (Jeda terpenuhi)"
                  : "Minimal 1x sebulan"}
          </p>
        </div>
      </div>

      {/* 21 Questions List */}
      <Card className="overflow-hidden border-slate-200/90 shadow-2xs">
        <div className="border-b border-slate-100 bg-slate-50/70 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm sm:text-base font-bold text-slate-950">
                21 Pertanyaan Screening Kesehatan
              </h2>
              {!isFillingMode ? (
                <span className="inline-flex items-center gap-1 rounded bg-slate-200 px-1.5 py-0.5 text-3xs font-semibold text-slate-700">
                  <Lock className="size-2.5 text-slate-500" /> Mode Preview
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-3xs font-semibold text-red-700">
                  Pengisian #{currentAttemptNumber}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {isFillingMode
                ? "Jawab pertanyaan di bawah secara jujur. Klik tombol Selesaikan di bawah untuk menyimpan."
                : "Menampilkan jawaban hasil screening kesehatan terakhir yang tersimpan di sub-nilai Rikkes."}
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {anamnesisQuestions.map((questionText, index) => {
            const answer = answers[String(index)]
            const isYes = answer === "yes"
            const isNo = answer === "no"

            return (
              <div
                key={index}
                className={`flex flex-col gap-3 p-3.5 sm:p-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                  isYes ? "bg-emerald-50/25" : isNo ? "bg-red-50/20" : "hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                    {index + 1}
                  </span>
                  <p className="text-sm font-semibold text-slate-900 leading-snug">
                    {questionText}
                  </p>
                </div>

                {/* Options TIDAK (X merah) & YA (Centang ijo) */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    disabled={!isFillingMode}
                    onClick={() => handleSetAnswer(index, "no")}
                    className={`flex h-9 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold transition-all ${
                      isFillingMode ? "active:scale-95 cursor-pointer" : "cursor-default"
                    } ${
                      isNo
                        ? "border-red-600 bg-red-600 text-white shadow-2xs"
                        : isFillingMode
                          ? "border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50/50"
                          : "border-slate-200 bg-slate-50 text-slate-400 opacity-60"
                    }`}
                  >
                    <XCircle className={`size-3.5 ${isNo ? "text-white" : isFillingMode ? "text-red-500" : "text-slate-400"}`} />
                    TIDAK
                  </button>
                  <button
                    type="button"
                    disabled={!isFillingMode}
                    onClick={() => handleSetAnswer(index, "yes")}
                    className={`flex h-9 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold transition-all ${
                      isFillingMode ? "active:scale-95 cursor-pointer" : "cursor-default"
                    } ${
                      isYes
                        ? "border-emerald-600 bg-emerald-600 text-white shadow-2xs"
                        : isFillingMode
                          ? "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/50"
                          : "border-slate-200 bg-slate-50 text-slate-400 opacity-60"
                    }`}
                  >
                    <CheckCircle2 className={`size-3.5 ${isYes ? "text-white" : isFillingMode ? "text-emerald-600" : "text-slate-400"}`} />
                    YA
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Riwayat Screening Kesehatan Card */}
      <Card className="overflow-hidden border-slate-200/90 shadow-2xs">
        <div className="border-b border-slate-100 bg-white px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-red-50 text-red-600">
              <History className="size-4" />
            </div>
            <div>
              <h2 className="font-display text-sm sm:text-base font-bold text-slate-950">
                Riwayat Screening Kesehatan
              </h2>
              <p className="text-xs text-slate-500">
                Daftar rekaman screening medis mandiri yang tersimpan ke sub-nilai Rikkes
              </p>
            </div>
          </div>
          <Badge tone="info" className="text-2xs font-bold">
            {candidateHistory.length} Riwayat Tersimpan
          </Badge>
        </div>

        {candidateHistory.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Belum ada riwayat screening kesehatan yang terselesaikan.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-2xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 sm:px-6 py-2.5">Waktu Pelaksanaan</th>
                  <th className="px-3 py-2.5">Periode / Sesi</th>
                  <th className="px-3 py-2.5">Sub-Nilai Rikkes</th>
                  <th className="px-3 py-2.5">Keluhan YA</th>
                  <th className="px-3 py-2.5">Status Rikkes</th>
                  <th className="px-4 sm:px-6 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidateHistory.map((item, idx) => {
                  const isLatest = idx === 0
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 sm:px-6 py-3 font-medium text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3.5 text-slate-400" />
                          <span>{formatDateTime(item.timestamp)}</span>
                          {isLatest ? (
                            <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.2 text-3xs font-bold text-emerald-800">
                              Aktif di Rikkes
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">{item.monthLabel}</span>
                        <span className="text-slate-400 ml-1">(Ke-{item.attemptInMonth})</span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <strong className="font-display font-bold text-slate-900">
                          {item.score}
                        </strong>
                        <span className="text-slate-400 text-3xs">/100</span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`font-semibold ${item.yesCount > 5 ? "text-red-600" : "text-slate-700"}`}>
                          {item.yesCount} YA
                        </span>
                        {item.criticalCount > 0 ? (
                          <span className="ml-1 text-3xs font-bold text-red-600">(⚠️ Kritis)</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Badge
                          tone={
                            item.status === "passed"
                              ? "success"
                              : item.status === "failed"
                                ? "danger"
                                : "warning"
                          }
                          className="text-3xs px-2 py-0.5"
                        >
                          {item.status === "passed"
                            ? "Memenuhi Syarat (MS)"
                            : item.status === "failed"
                              ? "TMS (Kritis)"
                              : "Perlu Tinjau"}
                        </Badge>
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedHistoryForModal(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-2xs font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-95"
                        >
                          <Eye className="size-3 text-slate-500" />
                          Lihat Jawaban
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Detail Jawaban Riwayat */}
      {selectedHistoryForModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 sm:px-6 py-4">
              <div>
                <h3 className="font-display text-base font-bold text-slate-950">
                  Detail Jawaban Screening Kesehatan
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedHistoryForModal.monthLabel} · Pengisian ke-{selectedHistoryForModal.attemptInMonth} ({formatDateTime(selectedHistoryForModal.timestamp)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHistoryForModal(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                aria-label="Tutup"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Candidate & Metric Pills */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">{targetCandidate?.name}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600">{targetCandidate?.number}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  tone={
                    selectedHistoryForModal.status === "passed"
                      ? "success"
                      : selectedHistoryForModal.status === "failed"
                        ? "danger"
                        : "warning"
                  }
                >
                  Sub-Nilai: {selectedHistoryForModal.score}/100
                </Badge>
                <span className="text-slate-600 font-medium">
                  Total YA: {selectedHistoryForModal.yesCount} butir
                </span>
              </div>
            </div>

            {/* List 21 Questions with Answers */}
            <div className="divide-y divide-slate-100 px-4 sm:px-6 py-2 max-h-[50vh] overflow-y-auto">
              {anamnesisQuestions.map((q, idx) => {
                const ans = selectedHistoryForModal.answers[String(idx)]
                const isYes = ans === "yes"
                return (
                  <div key={idx} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-3xs font-bold text-slate-600">
                        {idx + 1}
                      </span>
                      <span className="text-slate-800 font-medium leading-snug">{q}</span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 shrink-0 rounded-md px-2 py-0.5 text-2xs font-bold ${
                        isYes
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-red-100 text-red-800 border border-red-200"
                      }`}
                    >
                      {isYes ? (
                        <>
                          <CheckCircle2 className="size-3 text-emerald-600" /> YA
                        </>
                      ) : (
                        <>
                          <XCircle className="size-3 text-red-600" /> TIDAK
                        </>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 bg-slate-50 px-5 sm:px-6 py-3 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedHistoryForModal(null)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* BPIP Reference & Medical Standard Card */}
      <Card className="p-4 sm:p-5 bg-gradient-to-br from-slate-900 to-slate-950 text-white border-none shadow-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Stethoscope className="size-4 text-red-400" />
              <p className="text-xs font-bold uppercase tracking-wider text-red-400">
                Ketentuan Rikkes BPIP (Peraturan BPIP No. 3/2022)
              </p>
            </div>
            <h3 className="font-display text-base font-bold text-white">
              Mengapa 21 Anamnesis Ini Sangat Menentukan?
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Latihan formasi Paskibraka menuntut ketahanan kardiorespirasi ekstrem saat upacara di bawah terik matahari. Kejujuran pengisian screening kesehatan melindungi calon dari risiko fatal sinkop jantung, kejang epilepsi kambuhan, maupun kolaps pernapasan di lapangan.
            </p>
          </div>
          {onNavigate ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate("guide")}
              className="shrink-0 bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs font-bold"
            >
              <FileCheck2 className="size-3.5" /> Panduan Rikkes &amp; Parade
            </Button>
          ) : null}
        </div>
      </Card>
    </div>
  )
}

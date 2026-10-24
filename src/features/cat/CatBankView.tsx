import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Calculator,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Download,
  Edit3,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  Flag,
  GraduationCap,
  HelpCircle,
  History,
  Info,
  Layers,
  Lock,
  Maximize2,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Upload,
  UserCheck,
  UserRoundCheck,
  UsersRound,
  X,
  Zap,
} from "lucide-react"
import {
  Badge,
  Button,
  CandidateAvatar,
  Card,
  Input,
} from "../../components/ui"
import { useApp } from "../../context/AppContext"
import { standardCatQuestions } from "../../data/catQuestions"
import type {
  Candidate,
  CatQuestion,
  CatTryoutAttempt,
} from "../../domain/selection"

// ============================================================================
// CATEGORY DEFINITIONS
// ============================================================================
const pipCategories = [
  "Sejarah & Filosofi Pancasila",
  "Nilai & Pengamalan Sila",
  "UUD NRI 1945 & Konstitusi",
  "NKRI, Wasantara & Moderasi",
]

const tiuCategories = [
  "Sinonim & Antonim",
  "Analogi Kata",
  "Pemahaman Bacaan",
  "Aritmatika & Hitung Cepat",
  "Perbandingan Nilai",
  "Kecepatan, Jarak & Waktu",
  "Aritmatika Sosial",
  "Deret Angka & Huruf",
  "Silogisme",
  "Penalaran Analitis",
  "Sejarah & Kepaskibrakaan",
  "Geografi & Pemerintahan",
  "Wawasan Global & Kerja Sama Internasional",
  "Penemu & Tokoh Dunia",
  "Ibu Kota Negara",
  "Organisasi & Kerja Sama Dunia",
  "Flora, Fauna & Simbol Nasional",
  "Geografi RPUL",
  "Sejarah Indonesia & Dunia",
  "Ilmu Pengetahuan Alam",
  "Matematika & Pengukuran",
  "Organisasi Internasional",
  "Seni, Budaya & Bahasa",
  "Olahraga & Pengetahuan Umum",
]

// ============================================================================
// PRD DATA TYPES
// ============================================================================
type MainTab = "tryout" | "pip-bank" | "tiu-bank" | "rekap" | "history" | "settings"
type SessionPhase = "idle" | "pip" | "pip-final" | "tiu" | "completed"

export default function CatBankView() {
  const {
    questions,
    candidates,
    sessions,
    records,
    currentUser,
    setSessions,
    catTryoutAttempts: attempts,
    saveCatTryoutAttempt,
    deleteCatTryoutAttempt,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    restoreStandardQuestions,
    updateCandidate,
    updateCandidateStage,
    logAudit,
    showToast,
  } = useApp()

  // --------------------------------------------------------------------------
  // NAVIGATION & TAB STATE
  // --------------------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<MainTab>("tryout")
  const [editingAttempt, setEditingAttempt] = useState<CatTryoutAttempt | null>(
    null,
  )
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [bankPage, setBankPage] = useState<number>(1)
  const bankPageSize = 30

  // Reset pagination when filter or tab changes
  useEffect(() => {
    setBankPage(1)
  }, [activeTab, categoryFilter, search])

  // Auto-populate questions if empty
  useEffect(() => {
    if (questions.length === 0 && standardCatQuestions.length > 0) {
      restoreStandardQuestions()
    }
  }, [questions.length, restoreStandardQuestions])

  // --------------------------------------------------------------------------
  // PACKAGE CONFIGURATION (PRD Section 4)
  // --------------------------------------------------------------------------
  const DEFAULT_PACKAGE_CONFIG = {
    packageName: "Paket Tryout CAT BPIP (PIP & TIU) 2026",
    pipQuestionCount: 50,
    pipDurationSec: 45 * 60, // 45 minutes = 2700s
    pipPassingGrade: 70, // /100
    tiuQuestionCount: 50,
    tiuDurationSec: 30 * 60, // 30 minutes = 1800s
    tiuPassingGrade: 70, // /100 (raw >= 35)
    shuffleQuestions: true,
    maxAttempts: 0, // 0 = Bebas / Tanpa Batas (Unlimited)
    examBrowserLock: true,
    maxViolations: 3,
  }

  const [packageConfig, setPackageConfig] = useState(() => {
    try {
      const saved = localStorage.getItem("paska-cat-package-config")
      if (saved) {
        const parsed = JSON.parse(saved)
        // Migrasi jika sebelumnya tersimpan angka 3 bawaan lama menjadi 0 (Unlimited)
        if (parsed.maxAttempts === 3) {
          parsed.maxAttempts = 0
        }
        return { ...DEFAULT_PACKAGE_CONFIG, ...parsed }
      }
    } catch {}
    return DEFAULT_PACKAGE_CONFIG
  })

  useEffect(() => {
    try {
      localStorage.setItem("paska-cat-package-config", JSON.stringify(packageConfig))
    } catch {}
  }, [packageConfig])

  // --------------------------------------------------------------------------
  // TRYOUT SESSION STATE (Two sequential sessions)
  // --------------------------------------------------------------------------
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>("idle")
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    currentUser.candidateId || "",
  )

  const isCoachOrAdmin = currentUser.role !== "candidate"
  const isCoachSelfTest =
    isCoachOrAdmin &&
    (!selectedCandidateId || selectedCandidateId === "coach-self")

  // Profil simulasi mandiri pelatih (agar tidak mencemari data santri asli)
  const coachSelfCandidate: Candidate = useMemo(() => {
    const isUrl = Boolean(
      currentUser.avatar &&
        (currentUser.avatar.startsWith("http://") ||
          currentUser.avatar.startsWith("https://") ||
          currentUser.avatar.startsWith("data:") ||
          currentUser.avatar.startsWith("/")),
    )
    const initials = currentUser.name
      ? currentUser.name
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => p[0])
          .join("")
          .toUpperCase()
      : "CA"

    return {
      id: currentUser.id || "coach-self",
      number: "PELATIH",
      name: `${currentUser.name} (Pelatih)`,
      school: currentUser.title || "Tim Pelatih / Pembina",
      gender: "Putra",
      birthDate: "1990-01-01",
      avatar: isUrl ? initials : currentUser.avatar || initials,
      photoUrl: isUrl ? currentUser.avatar : undefined,
      status: "verified",
      currentStage: 1,
      stage1Status: "passed",
      stage2Status: "passed",
      stage3Status: "passed",
      stage4Status: "passed",
      stage5Status: "passed",
      stage6Status: "passed",
      stage7Status: "passed",
      stages: [],
      pip: null,
      tiu: null,
      notes: "Mode Uji Coba Mandiri Pelatih",
      registeredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }, [currentUser])

  // Automatically bind to candidate's own profile when logged in as candidate
  useEffect(() => {
    if (currentUser.role === "candidate" && currentUser.candidateId) {
      setSelectedCandidateId(currentUser.candidateId)
    }
  }, [currentUser])
  const selectedCandidate = useMemo(() => {
    if (currentUser.role === "candidate") {
      return candidates.find((c) => c.id === currentUser.candidateId) ?? null
    }
    if (isCoachSelfTest) {
      return coachSelfCandidate
    }
    return candidates.find((c) => c.id === selectedCandidateId) ?? null
  }, [
    candidates,
    currentUser.role,
    currentUser.candidateId,
    isCoachSelfTest,
    coachSelfCandidate,
    selectedCandidateId,
  ])

  // Question orders per attempt (maintains shuffle stability across session recovery)
  const [pipExamQuestions, setPipExamQuestions] = useState<CatQuestion[]>([])
  const [tiuExamQuestions, setTiuExamQuestions] = useState<CatQuestion[]>([])

  // Question Index & Storage
  const [pipCurrentIdx, setPipCurrentIdx] = useState(0)
  const [tiuCurrentIdx, setTiuCurrentIdx] = useState(0)
  const [pipAnswers, setPipAnswers] = useState<Record<string, number>>({})
  const [tiuAnswers, setTiuAnswers] = useState<Record<string, number>>({})
  const [pipFlagged, setPipFlagged] = useState<Record<string, boolean>>({})
  const [tiuFlagged, setTiuFlagged] = useState<Record<string, boolean>>({})

  // Timers
  const [secondsLeft, setSecondsLeft] = useState<number>(2700)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [isSavingAnswer, setIsSavingAnswer] = useState(false)
  const [showConfirmSubmitModal, setShowConfirmSubmitModal] = useState(false)
  const [showPipResultModal, setShowPipResultModal] = useState(false)
  const [showTiuResultModal, setShowTiuResultModal] = useState(false)
  const currentAttemptIdRef = useRef<string>("")
  const [tryoutStartTime, setTryoutStartTime] = useState<string>("")
  const [, refreshScheduleClock] = useState(0)

  // EXAM BROWSER LOCKDOWN & INTEGRITY TRACKER
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [violationCount, setViolationCount] = useState(0)
  const [showViolationModal, setShowViolationModal] = useState(false)
  const [violationReason, setViolationReason] = useState("")

  const enterFullscreen = useCallback(() => {
    try {
      const el = document.documentElement
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        if (el.requestFullscreen) {
          el.requestFullscreen().catch(() => {})
        } else if ((el as any).webkitRequestFullscreen) {
          (el as any).webkitRequestFullscreen()
        }
      }
    } catch {}
  }, [])

  const exitFullscreen = useCallback(() => {
    try {
      if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {})
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen()
        }
      }
    } catch {}
  }, [])

  // --------------------------------------------------------------------------
  // ACTIVE TRYOUT SESSION PERSISTENCE & BACK-BUTTON PROTECTION
  // --------------------------------------------------------------------------
  const ACTIVE_SESSION_STORAGE_KEY = useMemo(() => {
    const candidatePart =
      currentUser.role === "candidate"
        ? currentUser.candidateId || "cand"
        : isCoachSelfTest
          ? "coach"
          : selectedCandidateId || "cand"
    return `paska-cat-active-session-${candidatePart}`
  }, [currentUser.role, currentUser.candidateId, isCoachSelfTest, selectedCandidateId])

  const [hasPendingSession, setHasPendingSession] = useState(false)
  const [pendingSessionSummary, setPendingSessionSummary] = useState("")

  // Continuously autosave active exam session to localStorage
  useEffect(() => {
    if (
      sessionPhase === "pip" ||
      sessionPhase === "pip-final" ||
      sessionPhase === "tiu"
    ) {
      try {
        const payload = {
          sessionPhase,
          selectedCandidateId,
          pipExamQuestions,
          tiuExamQuestions,
          pipCurrentIdx,
          tiuCurrentIdx,
          pipAnswers,
          tiuAnswers,
          pipFlagged,
          tiuFlagged,
          secondsLeft,
          tryoutStartTime,
          violationCount,
          isTimerRunning,
          currentAttemptId: currentAttemptIdRef.current,
          updatedAt: Date.now(),
        }
        localStorage.setItem(
          ACTIVE_SESSION_STORAGE_KEY,
          JSON.stringify(payload),
        )
      } catch {}
    } else if (sessionPhase === "completed") {
      localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY)
      setHasPendingSession(false)
    }
  }, [
    sessionPhase,
    ACTIVE_SESSION_STORAGE_KEY,
    selectedCandidateId,
    pipExamQuestions,
    tiuExamQuestions,
    pipCurrentIdx,
    tiuCurrentIdx,
    pipAnswers,
    tiuAnswers,
    pipFlagged,
    tiuFlagged,
    secondsLeft,
    tryoutStartTime,
    violationCount,
    isTimerRunning,
  ])

  // Restore saved active session
  const restoreActiveSession = useCallback(
    (rawSession?: any) => {
      try {
        const sessionData =
          rawSession ||
          JSON.parse(
            localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY) || "null",
          )
        if (!sessionData) return

        if (sessionData.selectedCandidateId)
          setSelectedCandidateId(sessionData.selectedCandidateId)
        if (sessionData.pipExamQuestions)
          setPipExamQuestions(sessionData.pipExamQuestions)
        if (sessionData.tiuExamQuestions)
          setTiuExamQuestions(sessionData.tiuExamQuestions)
        if (sessionData.pipAnswers) setPipAnswers(sessionData.pipAnswers)
        if (sessionData.tiuAnswers) setTiuAnswers(sessionData.tiuAnswers)
        if (sessionData.pipFlagged) setPipFlagged(sessionData.pipFlagged)
        if (sessionData.tiuFlagged) setTiuFlagged(sessionData.tiuFlagged)
        if (typeof sessionData.pipCurrentIdx === "number")
          setPipCurrentIdx(sessionData.pipCurrentIdx)
        if (typeof sessionData.tiuCurrentIdx === "number")
          setTiuCurrentIdx(sessionData.tiuCurrentIdx)
        if (sessionData.tryoutStartTime)
          setTryoutStartTime(sessionData.tryoutStartTime)
        if (typeof sessionData.violationCount === "number")
          setViolationCount(sessionData.violationCount)
        if (sessionData.currentAttemptId)
          currentAttemptIdRef.current = sessionData.currentAttemptId

        // Elapsed time calculation if restoring during active timer
        if (
          sessionData.sessionPhase === "pip" ||
          sessionData.sessionPhase === "tiu"
        ) {
          const elapsedSec = Math.floor(
            (Date.now() - (sessionData.updatedAt || Date.now())) / 1000,
          )
          const remSec = Math.max(
            0,
            (sessionData.secondsLeft || 0) - elapsedSec,
          )
          setSecondsLeft(remSec)
          setIsTimerRunning(remSec > 0)
        }

        setSessionPhase(sessionData.sessionPhase)
        setHasPendingSession(false)
        showToast(
          sessionData.sessionPhase === "pip-final"
            ? "Sesi PIP dipulihkan. Nilai Anda aman dan dapat ditinjau kembali."
            : "Sesi Ujian CAT berhasil dipulihkan otomatis.",
          "info",
        )
      } catch {}
    },
    [ACTIVE_SESSION_STORAGE_KEY, showToast],
  )

  const discardPendingSession = useCallback(() => {
    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY)
    setHasPendingSession(false)
    setPendingSessionSummary("")
    showToast("Sesi tryout yang tertunda telah dibersihkan.", "neutral")
  }, [ACTIVE_SESSION_STORAGE_KEY, showToast])

  // Check saved session on mount or candidate change
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY)
      if (!raw) {
        setHasPendingSession(false)
        return
      }
      const saved = JSON.parse(raw)
      if (
        !saved ||
        !saved.sessionPhase ||
        saved.sessionPhase === "completed" ||
        saved.sessionPhase === "idle"
      ) {
        localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY)
        setHasPendingSession(false)
        return
      }

      // 24 hours expiry
      const ageHours = (Date.now() - (saved.updatedAt || 0)) / (1000 * 60 * 60)
      if (ageHours > 24) {
        localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY)
        setHasPendingSession(false)
        return
      }

      // If on idle, auto-restore pip-final or prompt for active exam
      if (sessionPhase === "idle") {
        if (saved.sessionPhase === "pip-final") {
          restoreActiveSession(saved)
        } else {
          setHasPendingSession(true)
          setPendingSessionSummary(
            saved.sessionPhase === "pip"
              ? "Sesi 1 (PIP) sedang berlangsung"
              : saved.sessionPhase === "tiu"
                ? "Sesi 2 (TIU) sedang berlangsung"
                : "Sesi menunggu kelanjutan",
          )
        }
      }
    } catch {}
  }, [ACTIVE_SESSION_STORAGE_KEY, sessionPhase, restoreActiveSession])

  // Prevent accidental Browser Back navigation during active tryout or PIP review
  useEffect(() => {
    if (sessionPhase === "idle" || sessionPhase === "completed") return

    // Push dummy history entry
    window.history.pushState({ catSessionActive: sessionPhase }, "")

    const handlePopState = () => {
      // Re-push immediately so repeated back button clicks are trapped
      window.history.pushState({ catSessionActive: sessionPhase }, "")
      showToast(
        "Sesi ujian/rekap sedang aktif. Gunakan tombol di dalam aplikasi, jangan tekan tombol Back pada browser.",
        "warning",
      )
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }

    window.addEventListener("popstate", handlePopState)
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("popstate", handlePopState)
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [sessionPhase, showToast])

  useEffect(() => {
    const timer = window.setInterval(
      () => refreshScheduleClock((value) => value + 1),
      30_000,
    )
    return () => window.clearInterval(timer)
  }, [])

  const visibleCatSchedules = sessions.filter(
    (session) =>
      session.type === "cat" &&
      session.participantIds.includes(
        currentUser.role === "candidate"
          ? currentUser.candidateId || ""
          : isCoachSelfTest
            ? ""
            : selectedCandidateId,
      ),
  )
  const now = Date.now()
  const activeCatSchedule = visibleCatSchedules.find((schedule) => {
    if (schedule.status === "completed") return false
    const dateStr = schedule.date
    if (!dateStr) return false
    const startOfScheduleDay = new Date(`${dateStr}T00:00:00`).getTime()
    const endOfScheduleDay = new Date(`${dateStr}T23:59:59.999`).getTime()
    // Sesi aktif dan dapat dimulai sepanjang hari pelaksanaan (sampai 23:59:59)
    return now >= startOfScheduleDay && now <= endOfScheduleDay
  })
  const displayedCatSchedule =
    activeCatSchedule ??
    [...visibleCatSchedules]
      .filter((schedule) => {
        if (schedule.status === "completed") return false
        const endOfScheduleDay = new Date(`${schedule.date}T23:59:59.999`).getTime()
        return endOfScheduleDay > now
      })
      .sort(
        (a, b) =>
          new Date(`${a.date}T${a.time || "00:00"}`).getTime() -
          new Date(`${b.date}T${b.time || "00:00"}`).getTime(),
      )[0]

  // Review & Explanation Modal / Tab
  const [reviewTab, setReviewTab] = useState<"pip" | "tiu">("pip")

  // --------------------------------------------------------------------------
  // Riwayat CAT dikelola AppContext agar tersimpan di profil lokal dan Google Sheet.
  const latestAttemptByCandidate = useMemo(() => {
    const latest = new Map<string, CatTryoutAttempt>()
    for (const attempt of attempts) {
      const candidate =
        candidates.find((item) => item.id === attempt.candidateId) ??
        candidates.find(
          (item) =>
            item.name.trim().toLocaleLowerCase() ===
            attempt.candidateName.trim().toLocaleLowerCase(),
        )
      const targetId = candidate ? candidate.id : attempt.candidateId
      const current = latest.get(targetId)
      if (!current || attempt.finalizedAt > current.finalizedAt) {
        latest.set(targetId, attempt)
      }
    }
    return latest
  }, [attempts, candidates])

  const recapCandidates = useMemo(() => {
    const visibleCandidates =
      currentUser.role === "candidate" && currentUser.candidateId
        ? candidates.filter(
            (candidate) => candidate.id === currentUser.candidateId,
          )
        : candidates
    return [...visibleCandidates].sort((a, b) => {
      const attemptA = latestAttemptByCandidate.get(a.id)
      const attemptB = latestAttemptByCandidate.get(b.id)
      const pipA = attemptA?.pipScore ?? a.pip ?? -1
      const tiuA = attemptA?.tiuScoreScaled ?? a.tiu ?? -1
      const pipB = attemptB?.pipScore ?? b.pip ?? -1
      const tiuB = attemptB?.tiuScoreScaled ?? b.tiu ?? -1

      const bothPassedA = pipA >= 70 && tiuA >= 70
      const bothPassedB = pipB >= 70 && tiuB >= 70
      if (bothPassedA !== bothPassedB) return bothPassedB ? 1 : -1

      // Urutkan prioritas Tahap 2 (PIP), lalu Tahap 3 (TIU)
      if (pipB !== pipA) return pipB - pipA
      if (tiuB !== tiuA) return tiuB - tiuA
      return a.name.localeCompare(b.name)
    })
  }, [
    candidates,
    currentUser.role,
    currentUser.candidateId,
    latestAttemptByCandidate,
  ])

  const getLatestSessionScore = (type: "pip" | "tiu") => {
    if (!selectedCandidate || isCoachSelfTest) return null
    return sessions
      .filter((session) => session.type === type)
      .map((session) => {
        const record = records[`${session.id}:${selectedCandidate.id}`]
        if (!record?.savedAt) return null
        const score =
          record.metrics.score !== undefined && record.metrics.score !== ""
            ? Number(record.metrics.score)
            : record.metrics.correct !== undefined &&
                record.metrics.correct !== ""
              ? Number(record.metrics.correct) * 2
              : null
        return score !== null && Number.isFinite(score)
          ? { score, time: Date.parse(record.savedAt) || 0 }
          : null
      })
      .filter(
        (entry): entry is { score: number; time: number } => entry !== null,
      )
      .sort((a, b) => b.time - a.time)[0]?.score
  }

  const latestSelectedAttempt = selectedCandidate
    ? latestAttemptByCandidate.get(selectedCandidate.id)
    : null
  const currentPipScore = selectedCandidate
    ? (latestSelectedAttempt?.pipScore ??
      selectedCandidate.pip ??
      getLatestSessionScore("pip"))
    : null
  const currentTiuScore = selectedCandidate
    ? (latestSelectedAttempt?.tiuScoreScaled ??
      selectedCandidate.tiu ??
      getLatestSessionScore("tiu"))
    : null

  // --------------------------------------------------------------------------
  // TIMER TICK ENGINE
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!isTimerRunning) return
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval)
          setIsTimerRunning(false)
          // Timeout automatic submit
          handleTimeExpired()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [isTimerRunning, sessionPhase])

  // Auto submit when time expires
  const handleTimeExpired = useCallback(() => {
    if (sessionPhase === "pip") {
      finalizePipSession()
      showToast(
        "Waktu Sesi 1 (PIP) habis. Sesi otomatis diselesaikan.",
        "warning",
      )
    } else if (sessionPhase === "tiu") {
      finalizeTiuSession()
      showToast(
        "Waktu Sesi 2 (TIU) habis. Sesi otomatis diselesaikan.",
        "warning",
      )
    }
  }, [sessionPhase])

  // --------------------------------------------------------------------------
  // PREPARE QUESTIONS HELPER (FISHER-YATES SHUFFLE)
  // --------------------------------------------------------------------------
  function prepareExamQuestions(type: "pip" | "tiu", targetCount: number) {
    const seenQuestions = new Set<string>()
    const pool = questions.filter((q) => {
      if (q.type !== type || q.status !== "active") return false
      const canonicalQuestion = q.question
        .replace(
          /^(Pilih jawaban yang tepat\. |Cermati pertanyaan berikut\. |Manakah jawaban yang benar\? |Jawablah pertanyaan ini\. |Dalam pengetahuan umum, |Informasi yang tepat untuk pertanyaan berikut adalah: |Tentukan jawaban yang sesuai\. |Pertanyaan: |Pilih satu jawaban paling tepat\. )/i,
          "",
        )
        .toLocaleLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim()
      if (seenQuestions.has(canonicalQuestion)) return false
      seenQuestions.add(canonicalQuestion)
      return true
    })
    const selected = [...pool]
    if (packageConfig.shuffleQuestions) {
      for (let i = selected.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const temp = selected[i]
        selected[i] = selected[j]
        selected[j] = temp
      }
    }
    return selected.slice(0, targetCount)
  }

  // --------------------------------------------------------------------------
  // START SESSION 1: PIP
  // --------------------------------------------------------------------------
  function startPipSession(targetCandidateId?: string) {
    const effectiveCandidateId = targetCandidateId ?? selectedCandidateId
    const effectiveIsCoachSelf =
      isCoachOrAdmin &&
      (!effectiveCandidateId || effectiveCandidateId === "coach-self")
    const effectiveCandidate = effectiveIsCoachSelf
      ? coachSelfCandidate
      : currentUser.role === "candidate"
        ? (candidates.find((c) => c.id === currentUser.candidateId) ?? null)
        : (candidates.find((c) => c.id === effectiveCandidateId) ?? null)

    if (!effectiveCandidate) {
      showToast("Silakan pilih santri / peserta terlebih dahulu.", "warning")
      return
    }
    const qs = prepareExamQuestions("pip", packageConfig.pipQuestionCount)
    if (qs.length === 0) {
      showToast("Tidak ada butir soal PIP aktif untuk memulai ujian.", "danger")
      return
    }
    if (targetCandidateId && targetCandidateId !== selectedCandidateId) {
      setSelectedCandidateId(targetCandidateId)
    }
    setPipExamQuestions(qs)
    setPipCurrentIdx(0)
    setPipAnswers({})
    setPipFlagged({})
    setSecondsLeft(packageConfig.pipDurationSec)
    setIsTimerRunning(true)
    setSessionPhase("pip")
    setViolationCount(0)
    setShowViolationModal(false)
    if (packageConfig.examBrowserLock) {
      enterFullscreen()
    }
    if (!effectiveIsCoachSelf && activeCatSchedule) {
      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeCatSchedule.id
            ? { ...session, status: "active" }
            : session,
        ),
      )
    }
    setTryoutStartTime(
      new Date().toISOString().replace("T", " ").substring(0, 19),
    )
    currentAttemptIdRef.current = `att-${Date.now()}`
    showToast(
      effectiveIsCoachSelf
        ? "Sesi 1: CAT PIP dimulai (Mode Pelatih)."
        : "Sesi 1: CAT PIP dimulai. Mode Exam Browser aktif.",
      "info",
    )
  }

  // --------------------------------------------------------------------------
  // FINALIZE SESSION 1: PIP -> SHOW PIP SCORECARD
  // --------------------------------------------------------------------------
  function finalizePipSession() {
    setIsTimerRunning(false)
    setShowConfirmSubmitModal(false)
    setShowViolationModal(false)
    setSessionPhase("pip-final")
    exitFullscreen()

    // Hitung dan simpan nilai PIP secara instan agar tidak hilang jika kandidat ke-back/refresh
    const pipCorrect = pipExamQuestions.filter(
      (q) => pipAnswers[q.id] === q.correctIndex,
    ).length
    const pipScore = pipCorrect * 2
    const pipPassed = pipScore >= packageConfig.pipPassingGrade

    const isCoachTest =
      isCoachSelfTest || !candidates.some((c) => c.id === selectedCandidate?.id)
    const targetCandidateId = isCoachTest
      ? currentUser.id || "coach-self"
      : (selectedCandidate?.id ?? "cand-001")
    const prevAttempts = attempts.filter(
      (a) => a.candidateId === targetCandidateId,
    )
    const attemptNumber = prevAttempts.length + 1
    const attemptId = currentAttemptIdRef.current || `att-${Date.now()}`
    currentAttemptIdRef.current = attemptId
    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19)

    // Simpan data tryout PIP ke catatan riwayat secara instan
    const pipAttempt: CatTryoutAttempt = {
      id: attemptId,
      candidateId: targetCandidateId,
      candidateName: isCoachTest
        ? `${currentUser.name} (Simulasi Pelatih)`
        : (selectedCandidate?.name ?? "Peserta Tryout"),
      candidateGroup: isCoachTest
        ? currentUser.title || "Tim Pelatih / Pembina"
        : (selectedCandidate?.school ?? "Grup Mandiri"),
      packageName: packageConfig.packageName,
      attemptNumber,
      pipAnswers,
      tiuAnswers: {},
      pipCorrect,
      pipScore,
      pipStatus: pipPassed ? "passed" : "failed",
      tiuCorrect: 0,
      tiuScoreRaw: 0,
      tiuScoreScaled: 0,
      tiuStatus: "failed",
      combinedScore: pipScore,
      startedAt: tryoutStartTime || nowStr,
      finalizedAt: nowStr,
    }
    saveCatTryoutAttempt(pipAttempt)

    if (!isCoachTest && selectedCandidate) {
      updateCandidate(selectedCandidate.id, {
        pip: pipScore,
      })
      updateCandidateStage(
        selectedCandidate.id,
        1,
        pipPassed ? "passed" : "review",
        pipPassed
          ? `Lolos Tryout CAT PIP (${pipScore}/100) melampaui PG ${packageConfig.pipPassingGrade}`
          : `Nilai CAT PIP (${pipScore}/100) di bawah PG ${packageConfig.pipPassingGrade}`,
      )
    }

    logAudit(
      isCoachTest ? "Simulasi PIP Pelatih" : "Tryout CAT Sesi 1 (PIP) Selesai",
      isCoachTest ? currentUser.name : (selectedCandidate?.name ?? "Peserta"),
      `Skor PIP: ${pipScore}/100 (${pipPassed ? "Lolos PG" : "Remedial"}). Menunggu pengerjaan TIU.`,
    )

    // Tampilkan modal hasil skor PIP langsung ke kandidat
    setShowPipResultModal(true)

    showToast(
      `Sesi 1 (PIP) selesai! Nilai: ${pipScore}/100 (${pipPassed ? "Lolos" : "Remedial"}).`,
      "success",
    )
  }

  // --------------------------------------------------------------------------
  // START SESSION 2: TIU
  // --------------------------------------------------------------------------
  function startTiuSession() {
    const qs = prepareExamQuestions("tiu", packageConfig.tiuQuestionCount)
    if (qs.length === 0) {
      showToast("Tidak ada butir soal TIU aktif untuk memulai ujian.", "danger")
      return
    }
    setTiuExamQuestions(qs)
    setTiuCurrentIdx(0)
    setTiuAnswers({})
    setTiuFlagged({})
    setSecondsLeft(packageConfig.tiuDurationSec)
    setIsTimerRunning(true)
    setSessionPhase("tiu")
    setShowViolationModal(false)
    if (packageConfig.examBrowserLock) {
      enterFullscreen()
    }
    showToast("Sesi 2: CAT TIU dimulai. Mode Exam Browser aktif.", "info")
  }

  // --------------------------------------------------------------------------
  // FINALIZE SESSION 2: TIU -> COMPLETE TRYOUT
  // --------------------------------------------------------------------------
  function finalizeTiuSession() {
    setIsTimerRunning(false)
    setShowConfirmSubmitModal(false)
    setShowViolationModal(false)
    setSessionPhase("completed")
    exitFullscreen()

    const isCoachTest =
      isCoachSelfTest || !candidates.some((c) => c.id === selectedCandidate?.id)
    if (!isCoachTest && activeCatSchedule) {
      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeCatSchedule.id
            ? { ...session, status: "completed" }
            : session,
        ),
      )
    }

    // Calculate final scores according to PRD 4.3 formulas:
    // PIP: S_pip = 2 * C_pip (Max 100)
    const pipCorrect = pipExamQuestions.filter(
      (q) => pipAnswers[q.id] === q.correctIndex,
    ).length
    const pipScore = pipCorrect * 2 // Formula PRD: +2 each
    const pipPassed = pipScore >= packageConfig.pipPassingGrade

    // TIU: S_tiu = C_tiu (Raw max 50). Scaled 100: N_tiu = S_tiu * 2 (or /50 * 100)
    const tiuCorrect = tiuExamQuestions.filter(
      (q) => tiuAnswers[q.id] === q.correctIndex,
    ).length
    const tiuScoreRaw = tiuCorrect // Formula PRD: +1 each
    const tiuScoreScaled = tiuCorrect * 2 // Scaled 0-100
    const tiuPassed = tiuScoreScaled >= packageConfig.tiuPassingGrade

    const combined = Math.round((pipScore + tiuScoreScaled) / 2)
    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19)

    // Count attempts for this candidate
    const targetCandidateId = isCoachTest
      ? currentUser.id || "coach-self"
      : (selectedCandidate?.id ?? "cand-001")
    const prevAttempts = attempts.filter(
      (a) => a.candidateId === targetCandidateId,
    )
    const attemptNumber = prevAttempts.length + 1

    const newAttempt: CatTryoutAttempt = {
      id: currentAttemptIdRef.current || `att-${Date.now()}`,
      candidateId: targetCandidateId,
      candidateName: isCoachTest
        ? `${currentUser.name} (Simulasi Pelatih)`
        : (selectedCandidate?.name ?? "Peserta Tryout"),
      candidateGroup: isCoachTest
        ? currentUser.title || "Tim Pelatih / Pembina"
        : (selectedCandidate?.school ?? "Grup Mandiri"),
      packageName: packageConfig.packageName,
      attemptNumber,
      pipAnswers,
      tiuAnswers,
      pipCorrect,
      pipScore,
      pipStatus: pipPassed ? "passed" : "failed",
      tiuCorrect,
      tiuScoreRaw,
      tiuScoreScaled,
      tiuStatus: tiuPassed ? "passed" : "failed",
      combinedScore: combined,
      startedAt: tryoutStartTime || nowStr,
      finalizedAt: nowStr,
    }

    saveCatTryoutAttempt(newAttempt)
    setShowTiuResultModal(true)

    // Auto-sync ke profil kandidat (Hanya jika peserta riil, bukan simulasi pelatih)
    if (!isCoachTest && selectedCandidate) {
      updateCandidate(selectedCandidate.id, {
        pip: pipScore,
        tiu: tiuScoreScaled,
      })
      updateCandidateStage(
        selectedCandidate.id,
        1,
        pipPassed ? "passed" : "review",
        pipPassed
          ? `Lolos Tryout CAT PIP (${pipScore}/100) melampaui PG ${packageConfig.pipPassingGrade}`
          : `Nilai CAT PIP (${pipScore}/100) di bawah PG ${packageConfig.pipPassingGrade}`,
      )
      updateCandidateStage(
        selectedCandidate.id,
        2,
        tiuPassed ? "passed" : "review",
        tiuPassed
          ? `Lolos Tryout CAT TIU (${tiuScoreScaled}/100) melampaui PG ${packageConfig.tiuPassingGrade}`
          : `Nilai CAT TIU (${tiuScoreScaled}/100) di bawah PG ${packageConfig.tiuPassingGrade}`,
      )
    }
    logAudit(
      isCoachTest ? "Simulasi Tryout CAT Pelatih" : "Tryout CAT Selesai",
      isCoachTest ? currentUser.name : (selectedCandidate?.name ?? "Peserta"),
      `PIP: ${pipScore}/100 (${
        pipPassed ? "Lolos" : "Remedial"
      }), TIU: ${tiuScoreScaled}/100 (${tiuPassed ? "Lolos" : "Remedial"})`,
    )
    showToast(
      isCoachTest
        ? "Simulasi CAT Pelatih selesai! Skor Anda telah dievaluasi."
        : "Seluruh paket Tryout CAT selesai dievaluasi!",
      "success",
    )
  }

  // --------------------------------------------------------------------------
  // ANTI-CHEAT & EXAM BROWSER PROTOCOL
  // --------------------------------------------------------------------------
  const lastViolationTimeRef = useRef(0)
  const isSubmittingViolationsRef = useRef(false)

  // Reset violation submission lock when exam is not in active session
  useEffect(() => {
    if (sessionPhase !== "pip" && sessionPhase !== "tiu") {
      isSubmittingViolationsRef.current = false
    }
  }, [sessionPhase])

  const recordViolation = useCallback(
    (reason: string) => {
      if (sessionPhase !== "pip" && sessionPhase !== "tiu") return
      if (!packageConfig.examBrowserLock) return
      if (isSubmittingViolationsRef.current) return

      const nowTime = Date.now()
      // Debounce rapid sequential triggers within 1.5s (e.g. blur followed immediately by visibilitychange)
      if (nowTime - lastViolationTimeRef.current < 1500) {
        return
      }
      lastViolationTimeRef.current = nowTime

      setViolationCount((prev) => {
        const nextCount = prev + 1
        setViolationReason(reason)
        setShowViolationModal(true)

        const maxViolations = packageConfig.maxViolations || 3
        if (nextCount >= maxViolations) {
          isSubmittingViolationsRef.current = true
          showToast(
            `Ujian dihentikan otomatis: batas ${maxViolations} kali pelanggaran tercapai.`,
            "danger",
          )
          logAudit(
            "Diskualifikasi Exam Browser",
            selectedCandidate?.name || currentUser.name,
            `Terdeteksi ${nextCount} kali pelanggaran integritas. Alasan: ${reason}`,
          )
          setTimeout(() => {
            if (sessionPhase === "pip") finalizePipSession()
            else if (sessionPhase === "tiu") finalizeTiuSession()
          }, 2000)
        } else {
          showToast(
            `Peringatan Pelanggaran (${nextCount}/${maxViolations}): ${reason}`,
            "warning",
          )
        }
        return nextCount
      })
    },
    [
      sessionPhase,
      packageConfig.examBrowserLock,
      packageConfig.maxViolations,
      selectedCandidate?.name,
      currentUser.name,
      showToast,
      logAudit,
    ],
  )

  // Anti-cheat event listeners for Fullscreen, Tab Switch, DevTools & Shortcuts
  useEffect(() => {
    if (sessionPhase !== "pip" && sessionPhase !== "tiu") return
    if (!packageConfig.examBrowserLock) return

    // 1. Fullscreen departure detection
    const handleFullscreenChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
          (document as any).webkitFullscreenElement,
      )
      setIsFullscreen(isFs)
      if (!isFs) {
        recordViolation("Meninggalkan mode Layar Penuh (Fullscreen)")
      }
    }

    // 2. Tab switching or window minimize
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation("Berpindah tab atau meminimalkan jendela ujian")
      }
    }

    // 3. Focus blur (Alt+Tab or clicking outside window)
    const handleWindowBlur = () => {
      recordViolation("Fokus layar terputus (Alt+Tab atau beralih aplikasi)")
    }

    // 4. Disable context menu (Right-click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    // 5. Disable copy, cut, paste
    const handleClipboard = (e: ClipboardEvent) => {
      e.preventDefault()
      showToast("Fungsi salin/tempel dinonaktifkan selama ujian.", "warning")
    }

    // 6. Keyboard Shortcuts lockdown (DevTools, Refresh, Print, Nav)
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 or DevTools inspect
      if (
        e.key === "F12" ||
        (e.ctrlKey &&
          e.shiftKey &&
          ["I", "i", "J", "j", "C", "c"].includes(e.key)) ||
        (e.ctrlKey && (e.key === "u" || e.key === "U"))
      ) {
        e.preventDefault()
        recordViolation("Membuka alat inspeksi pengembang (DevTools)")
        return
      }

      // Reload shortcuts
      if (e.key === "F5" || (e.ctrlKey && (e.key === "r" || e.key === "R"))) {
        e.preventDefault()
        showToast(
          "Muat ulang halaman dinonaktifkan selama ujian berlangsung.",
          "warning",
        )
        return
      }

      // Print or Save
      if (e.ctrlKey && ["p", "P", "s", "S"].includes(e.key)) {
        e.preventDefault()
        return
      }

      // Browser navigation
      if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault()
        return
      }
    }

    // 7. Warn before leaving or closing tab
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("blur", handleWindowBlur)
    window.addEventListener("contextmenu", handleContextMenu)
    window.addEventListener("copy", handleClipboard)
    window.addEventListener("cut", handleClipboard)
    window.addEventListener("paste", handleClipboard)
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("blur", handleWindowBlur)
      window.removeEventListener("contextmenu", handleContextMenu)
      window.removeEventListener("copy", handleClipboard)
      window.removeEventListener("cut", handleClipboard)
      window.removeEventListener("paste", handleClipboard)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [sessionPhase, packageConfig.examBrowserLock, recordViolation, showToast])
  const currentPipResults = useMemo(() => {
    if (pipExamQuestions.length === 0)
      return { correct: 0, total: 50, score: 0, passed: false }
    const correct = pipExamQuestions.filter(
      (q) => pipAnswers[q.id] === q.correctIndex,
    ).length
    const score = correct * 2
    return {
      correct,
      total: pipExamQuestions.length,
      score,
      passed: score >= packageConfig.pipPassingGrade,
    }
  }, [pipExamQuestions, pipAnswers, packageConfig.pipPassingGrade])

  const currentTiuResults = useMemo(() => {
    if (tiuExamQuestions.length === 0)
      return { correct: 0, total: 50, raw: 0, scaled: 0, passed: false }
    const correct = tiuExamQuestions.filter(
      (q) => tiuAnswers[q.id] === q.correctIndex,
    ).length
    const raw = correct
    const scaled = correct * 2
    return {
      correct,
      total: tiuExamQuestions.length,
      raw,
      scaled,
      passed: scaled >= packageConfig.tiuPassingGrade,
    }
  }, [tiuExamQuestions, tiuAnswers, packageConfig.tiuPassingGrade])

  const combinedTryoutScore = useMemo(() => {
    return Math.round((currentPipResults.score + currentTiuResults.scaled) / 2)
  }, [currentPipResults.score, currentTiuResults.scaled])

  // --------------------------------------------------------------------------
  // SYNC SCORE TO CANDIDATE PROFILE (Stages 2 & 3)
  // --------------------------------------------------------------------------
  function handleSyncToCandidateProfile() {
    if (
      isCoachSelfTest ||
      !selectedCandidate ||
      !candidates.some((c) => c.id === selectedCandidate.id)
    ) {
      showToast(
        "Mode Uji Coba Mandiri: Data simulasi pelatih tidak dapat disinkronkan ke profil santri.",
        "info",
      )
      return
    }
    const pipPass = currentPipResults.passed
    const tiuPass = currentTiuResults.passed

    // Update PIP score & stage 2
    updateCandidate(selectedCandidate.id, {
      pip: currentPipResults.score,
      tiu: currentTiuResults.scaled,
    })

    updateCandidateStage(
      selectedCandidate.id,
      1,
      pipPass ? "passed" : "review",
      pipPass
        ? `Lolos Tryout CAT PIP (${currentPipResults.score}/100) melampaui PG ${packageConfig.pipPassingGrade}`
        : `Nilai CAT PIP (${currentPipResults.score}/100) di bawah PG ${packageConfig.pipPassingGrade}`,
    )

    updateCandidateStage(
      selectedCandidate.id,
      2,
      tiuPass ? "passed" : "review",
      tiuPass
        ? `Lolos Tryout CAT TIU (${currentTiuResults.scaled}/100) melampaui PG ${packageConfig.tiuPassingGrade}`
        : `Nilai CAT TIU (${currentTiuResults.scaled}/100) di bawah PG ${packageConfig.tiuPassingGrade}`,
    )

    logAudit(
      "Sinkronisasi Nilai CAT",
      selectedCandidate.name,
      `PIP: ${currentPipResults.score}, TIU: ${currentTiuResults.scaled}`,
    )
    showToast(
      `Nilai Tryout CAT berhasil disinkronkan ke profil ${selectedCandidate.name}!`,
      "success",
    )
  }

  // --------------------------------------------------------------------------
  // CSV EXPORT ACCORDING TO PRD SECTION 13.3
  // Columns:
  // participant_id,participant_name,group_name,package_name,attempt_number,pip_score,tiu_score_raw,tiu_score_scaled,pip_status,tiu_status,started_at,finalized_at
  // --------------------------------------------------------------------------
  function handleExportCsv() {
    if (attempts.length === 0) {
      showToast("Belum ada riwayat hasil tryout untuk diekspor.", "info")
      return
    }

    const headers = [
      "participant_id",
      "participant_name",
      "group_name",
      "package_name",
      "attempt_number",
      "pip_score",
      "tiu_score_raw",
      "tiu_score_scaled",
      "pip_status",
      "tiu_status",
      "started_at",
      "finalized_at",
    ]

    const rows = attempts.map((att) => [
      `"${att.candidateId}"`,
      `"${att.candidateName.replace(/"/g, '""')}"`,
      `"${att.candidateGroup.replace(/"/g, '""')}"`,
      `"${att.packageName.replace(/"/g, '""')}"`,
      att.attemptNumber,
      att.pipScore,
      att.tiuScoreRaw,
      att.tiuScoreScaled,
      `"${att.pipStatus}"`,
      `"${att.tiuStatus}"`,
      `"${att.startedAt}"`,
      `"${att.finalizedAt}"`,
    ])

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute(
      "download",
      `rekap_cat_pip_tiu_${new Date().toISOString().slice(0, 10)}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    showToast("File CSV rekap nilai CAT berhasil diunduh.", "success")
  }

  // --------------------------------------------------------------------------
  // QUESTION ANSWER SELECTION HANDLER (WITH AUTOSAVE VISUAL)
  // --------------------------------------------------------------------------
  function handleSelectOption(
    qId: string,
    optIdx: number,
    session: "pip" | "tiu",
  ) {
    setIsSavingAnswer(true)
    if (session === "pip") {
      setPipAnswers((prev) => ({ ...prev, [qId]: optIdx }))
    } else {
      setTiuAnswers((prev) => ({ ...prev, [qId]: optIdx }))
    }
    window.setTimeout(() => {
      setIsSavingAnswer(false)
    }, 280)
  }

  // --------------------------------------------------------------------------
  // QUESTION FORM MODAL (ADD / EDIT)
  // --------------------------------------------------------------------------
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null,
  )
  const [qForm, setQForm] = useState({
    type: "pip" as "pip" | "tiu",
    category: pipCategories[0],
    question: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    optionE: "",
    correctIndex: 0,
    explanation: "",
    status: "active" as "active" | "draft",
  })

  function openCreateQuestion(type: "pip" | "tiu") {
    setEditingQuestionId(null)
    setQForm({
      type,
      category: type === "tiu" ? tiuCategories[0] : pipCategories[0],
      question: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      optionE: "",
      correctIndex: 0,
      explanation: "",
      status: "active",
    })
    setShowQuestionModal(true)
  }

  function openEditQuestion(q: CatQuestion) {
    setEditingQuestionId(q.id)
    setQForm({
      type: q.type,
      category: q.category,
      question: q.question,
      optionA: q.options[0] ?? "",
      optionB: q.options[1] ?? "",
      optionC: q.options[2] ?? "",
      optionD: q.options[3] ?? "",
      optionE: q.options[4] ?? "",
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      status: q.status,
    })
    setShowQuestionModal(true)
  }

  function handleSaveQuestionForm(e: React.FormEvent) {
    e.preventDefault()
    if (!qForm.question.trim()) {
      showToast("Teks soal tidak boleh kosong.", "warning")
      return
    }
    const payload: Omit<CatQuestion, "id"> = {
      type: qForm.type,
      category: qForm.category,
      question: qForm.question.trim(),
      options: [
        qForm.optionA.trim(),
        qForm.optionB.trim(),
        qForm.optionC.trim(),
        qForm.optionD.trim(),
        qForm.optionE.trim(),
      ],
      correctIndex: qForm.correctIndex,
      explanation: qForm.explanation.trim(),
      status: qForm.status,
    }

    if (editingQuestionId) {
      updateQuestion(editingQuestionId, payload)
      showToast("Butir soal berhasil diperbarui.", "success")
    } else {
      addQuestion(payload)
      showToast("Butir soal baru berhasil ditambahkan ke bank soal.", "success")
    }
    setShowQuestionModal(false)
  }

  function handleRestoreStandardQuestions() {
    const standardPipCount = standardCatQuestions.filter(
      (question) => question.type === "pip",
    ).length
    const standardTiuCount = standardCatQuestions.filter(
      (question) => question.type === "tiu",
    ).length
    if (
      confirm(
        `Terapkan bank standar terbaru: ${standardPipCount} PIP dan ${standardTiuCount} TIU? Soal standar lama yang berulang akan dibersihkan; soal buatan sendiri tetap dipertahankan.`,
      )
    ) {
      const changed = restoreStandardQuestions()
      showToast(
        changed > 0
          ? `Bank standar diperbarui. Soal standar lama yang berulang dibersihkan; ${standardPipCount} PIP dan ${standardTiuCount} TIU tersedia.`
          : `Bank standar sudah terbaru (${standardPipCount} PIP dan ${standardTiuCount} TIU).`,
        changed > 0 ? "success" : "info",
      )
    }
  }

  function handleSaveAttemptEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingAttempt) return
    const pipScore = Math.max(0, Math.min(100, Number(editingAttempt.pipScore)))
    const tiuScoreScaled = Math.max(
      0,
      Math.min(100, Number(editingAttempt.tiuScoreScaled)),
    )
    if (!Number.isFinite(pipScore) || !Number.isFinite(tiuScoreScaled)) {
      showToast("Nilai PIP dan TIU harus berupa angka 0–100.", "warning")
      return
    }

    const updatedAttempt: CatTryoutAttempt = {
      ...editingAttempt,
      pipCorrect: Math.round(pipScore / 2),
      pipScore,
      pipStatus:
        pipScore >= packageConfig.pipPassingGrade ? "passed" : "failed",
      tiuCorrect: Math.round(tiuScoreScaled / 2),
      tiuScoreRaw: Math.round(tiuScoreScaled / 2),
      tiuScoreScaled,
      tiuStatus:
        tiuScoreScaled >= packageConfig.tiuPassingGrade ? "passed" : "failed",
      combinedScore: Number(((pipScore + tiuScoreScaled) / 2).toFixed(1)),
    }
    saveCatTryoutAttempt(updatedAttempt)

    const candidate =
      candidates.find((item) => item.id === updatedAttempt.candidateId) ??
      candidates.find(
        (item) =>
          item.name.trim().toLocaleLowerCase() ===
          updatedAttempt.candidateName.trim().toLocaleLowerCase(),
      )
    if (
      candidate &&
      latestAttemptByCandidate.get(candidate.id)?.id === updatedAttempt.id
    ) {
      updateCandidate(candidate.id, { pip: pipScore, tiu: tiuScoreScaled })
      updateCandidateStage(
        candidate.id,
        1,
        updatedAttempt.pipStatus,
        `Nilai CAT PIP diperbarui menjadi ${pipScore}/100`,
      )
      updateCandidateStage(
        candidate.id,
        2,
        updatedAttempt.tiuStatus,
        `Nilai CAT TIU diperbarui menjadi ${tiuScoreScaled}/100`,
      )
    }
    logAudit(
      "Perbarui Hasil CAT",
      updatedAttempt.candidateName,
      `PIP ${pipScore}, TIU ${tiuScoreScaled}, percobaan ${updatedAttempt.attemptNumber}`,
    )
    showToast("Hasil CAT berhasil diperbarui.", "success")
    setEditingAttempt(null)
  }

  // --------------------------------------------------------------------------
  // FILTERED QUESTIONS FOR BANK TABS
  // --------------------------------------------------------------------------
  const pipQuestionsList = useMemo(() => {
    return questions.filter((q) => {
      if (q.type !== "pip") return false
      if (categoryFilter !== "all" && q.category !== categoryFilter)
        return false
      if (search.trim()) {
        const term = search.toLowerCase()
        return (
          q.question.toLowerCase().includes(term) ||
          q.category.toLowerCase().includes(term) ||
          q.explanation.toLowerCase().includes(term) ||
          q.options.some((o) => o.toLowerCase().includes(term))
        )
      }
      return true
    })
  }, [questions, categoryFilter, search])

  const tiuQuestionsList = useMemo(() => {
    return questions.filter((q) => {
      if (q.type !== "tiu") return false
      if (categoryFilter !== "all" && q.category !== categoryFilter)
        return false
      if (search.trim()) {
        const term = search.toLowerCase()
        return (
          q.question.toLowerCase().includes(term) ||
          q.category.toLowerCase().includes(term) ||
          q.explanation.toLowerCase().includes(term) ||
          q.options.some((o) => o.toLowerCase().includes(term))
        )
      }
      return true
    })
  }, [questions, categoryFilter, search])

  const pipTotalPages = Math.max(
    1,
    Math.ceil(pipQuestionsList.length / bankPageSize),
  )
  const pipPagedList = useMemo(() => {
    const start = (bankPage - 1) * bankPageSize
    return pipQuestionsList.slice(start, start + bankPageSize)
  }, [pipQuestionsList, bankPage, bankPageSize])

  const tiuTotalPages = Math.max(
    1,
    Math.ceil(tiuQuestionsList.length / bankPageSize),
  )
  const tiuPagedList = useMemo(() => {
    const start = (bankPage - 1) * bankPageSize
    return tiuQuestionsList.slice(start, start + bankPageSize)
  }, [tiuQuestionsList, bankPage, bankPageSize])

  const pipActiveCount = questions.filter(
    (q) => q.type === "pip" && q.status === "active",
  ).length
  const tiuActiveCount = questions.filter(
    (q) => q.type === "tiu" && q.status === "active",
  ).length

  // Helper formatting for timer mm:ss
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  // Active question references during exam
  const currentExamQuestion =
    sessionPhase === "pip"
      ? pipExamQuestions[pipCurrentIdx]
      : sessionPhase === "tiu"
        ? tiuExamQuestions[tiuCurrentIdx]
        : null

  const currentAnswersMap = sessionPhase === "pip" ? pipAnswers : tiuAnswers
  const currentFlaggedMap = sessionPhase === "pip" ? pipFlagged : tiuFlagged
  const currentExamQuestionsList =
    sessionPhase === "pip" ? pipExamQuestions : tiuExamQuestions
  const currentExamIdx = sessionPhase === "pip" ? pipCurrentIdx : tiuCurrentIdx

  // Total answers & flags count
  const answeredCount = Object.keys(currentAnswersMap).length
  const flaggedCount = Object.values(currentFlaggedMap).filter(Boolean).length
  const totalCount = currentExamQuestionsList.length
  const unansweredCount = Math.max(0, totalCount - answeredCount)

  // --------------------------------------------------------------------------
  // RENDER INTERACTION
  // --------------------------------------------------------------------------
  return (
    <div className="grid gap-4 sm:gap-5">
      {/* ======================= TOP NAVIGATION & BANNER ======================= */}
      <Card className="p-4 sm:p-6 border-slate-200/90 shadow-sm">
        <div className="flex items-start gap-3.5 sm:gap-4">
          <div className="grid size-10 sm:size-12 shrink-0 place-items-center rounded-xl sm:rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-600/15">
            <GraduationCap className="size-5 sm:size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-slate-950">
                CAT Tryout PIP &amp; TIU
              </h1>
              <span className="hidden sm:inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                Tryout Sekuensial (PIP 45m &rarr; TIU 30m)
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">
              {currentUser.role === "candidate"
                ? "Kerjakan ujian Anda dengan tenang. Jawaban tersimpan otomatis dan hasil dapat dilihat setelah sesi selesai."
                : "Pilih peserta, jalankan PIP lalu TIU, kemudian tinjau hasil dan riwayat percobaan."}
            </p>
          </div>
        </div>

        {/* NAVIGATION GROUPED BY USER FLOW */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <nav
            aria-label="Navigasi CAT"
            className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6"
          >
            <div className="min-w-0">
              <span className="mb-1.5 block text-2xs font-bold uppercase tracking-wider text-slate-400">
                Alur Ujian
              </span>
              <div
                className={`grid gap-1 sm:gap-1.5 rounded-xl bg-slate-100/90 p-1 sm:p-1.5 ${
                  currentUser.role === "candidate"
                    ? "grid-cols-2 max-w-sm"
                    : "grid-cols-3"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab("tryout")}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold transition text-center ${
                    activeTab === "tryout"
                      ? "bg-white text-slate-950 shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  <Play className="size-3.5 shrink-0 text-red-600" />
                  <span className="whitespace-nowrap">
                    Simulasi<span className="hidden sm:inline"> Ujian</span>
                  </span>
                  {sessionPhase !== "idle" && (
                    <span className="size-2 shrink-0 rounded-full bg-red-600 animate-pulse" />
                  )}
                </button>

                {currentUser.role !== "candidate" && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("rekap")}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition text-center ${
                      activeTab === "rekap"
                        ? "bg-white text-slate-950 shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    }`}
                  >
                    <UsersRound className="size-3.5 shrink-0 text-emerald-600" />
                    <span className="whitespace-nowrap">
                      Rekap
                      <span className="hidden sm:inline">
                        {" "}
                        Santri ({attempts.length})
                      </span>
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold transition text-center ${
                    activeTab === "history"
                      ? "bg-white text-slate-950 shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  <History className="size-3.5 shrink-0 text-indigo-600" />
                  <span className="whitespace-nowrap">
                    {currentUser.role === "candidate" ? "Riwayat Saya" : "Riwayat Sesi"}
                  </span>
                </button>
              </div>
            </div>

            {currentUser.role !== "candidate" && (
              <div className="min-w-0">
                <span className="mb-1.5 block text-2xs font-bold uppercase tracking-wider text-slate-400">
                  Perangkat Pelatih
                </span>
                <div className="grid grid-cols-3 gap-1 sm:gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/70 p-1 sm:p-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("pip-bank")
                      setCategoryFilter("all")
                      setSearch("")
                    }}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition text-center ${
                      activeTab === "pip-bank"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-700 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    <BookOpenCheck
                      className={`size-3.5 shrink-0 ${
                        activeTab === "pip-bank"
                          ? "text-white"
                          : "text-blue-600"
                      }`}
                    />
                    <span className="whitespace-nowrap">
                      <span className="hidden sm:inline">Bank </span>PIP
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("tiu-bank")
                      setCategoryFilter("all")
                      setSearch("")
                    }}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition text-center ${
                      activeTab === "tiu-bank"
                        ? "bg-purple-600 text-white shadow-xs"
                        : "text-slate-700 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    <Calculator
                      className={`size-3.5 shrink-0 ${
                        activeTab === "tiu-bank"
                          ? "text-white"
                          : "text-purple-600"
                      }`}
                    />
                    <span className="whitespace-nowrap">
                      <span className="hidden sm:inline">Bank </span>TIU
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("settings")}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition text-center ${
                      activeTab === "settings"
                        ? "bg-slate-800 text-white shadow-xs"
                        : "text-slate-700 hover:bg-white hover:text-slate-900"
                    }`}
                    title="Konfigurasi paket dan formula"
                  >
                    <Settings2
                      className={`size-3.5 shrink-0 ${
                        activeTab === "settings"
                          ? "text-white"
                          : "text-slate-500"
                      }`}
                    />
                    <span className="whitespace-nowrap">
                      <span className="hidden sm:inline">Pengaturan </span>Paket
                    </span>
                  </button>
                </div>
              </div>
            )}
          </nav>
        </div>
      </Card>

      {/* ===================================================================== */}
      {/* TAB 1: TRYOUT ENGINE (IDLE LOBBY, PIP EXAM, INTER-SESSION, TIU, RESULT) */}
      {/* ===================================================================== */}
      {activeTab === "tryout" && (
        <div className="grid gap-6">
          {/* BANNER RECOVERY: UNFINISHED SESSION DETECTED */}
          {hasPendingSession && sessionPhase === "idle" && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-200 text-amber-900">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-950">
                    Ditemukan Sesi Tryout Belum Selesai ({pendingSessionSummary})
                  </h4>
                  <p className="text-xs text-amber-800">
                    Data lembar ujian Anda tersimpan aman di perangkat ini. Ingin melanjutkan sekarang?
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => restoreActiveSession()}
                  className="!text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                >
                  <RotateCcw className="size-3.5" /> Lanjutkan Sesi
                </Button>
                <Button
                  variant="ghost"
                  onClick={discardPendingSession}
                  className="!text-xs text-amber-900 hover:bg-amber-100 cursor-pointer"
                >
                  Hapus Sesi
                </Button>
              </div>
            </div>
          )}

          {/* -------------------- 1. IDLE LOBBY -------------------- */}
          {sessionPhase === "idle" && (
            <div className="grid gap-5 lg:grid-cols-3">
              <Card className="p-5 sm:p-6 border-slate-200 lg:col-span-2">
                <div className="flex items-center gap-3">
                  <div className="grid size-12 place-items-center rounded-2xl bg-red-100 text-red-600">
                    <GraduationCap className="size-6" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-slate-950">
                      Siapkan paket tryout CAT
                    </h2>
                    <p className="text-xs text-slate-500">
                      Pastikan peserta dan alur ujian sudah benar sebelum
                      memulai.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2">
                  {currentUser.role === "candidate" ? (
                    <div className="flex min-h-16 items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                      <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                      <div>
                        <p className="text-xs font-bold text-emerald-900">
                          Identitas terverifikasi
                        </p>
                        <p className="mt-0.5 text-2xs text-emerald-800">
                          Hasil ujian akan tersimpan di akun Anda.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <label className="grid min-w-0 gap-1.5 text-xs font-bold text-slate-700">
                      Peserta
                      <select
                        id="cat-candidate-select"
                        value={selectedCandidateId}
                        onChange={(e) => setSelectedCandidateId(e.target.value)}
                        className="min-h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 cursor-pointer"
                      >
                        <option value="">
                          Saya sendiri (Uji coba pelatih)
                        </option>
                        {candidates.length > 0 && (
                          <optgroup label="Pilih Santri / Siswa">
                            {candidates.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.number}) · {c.school}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </label>
                  )}

                  <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                    <p className="text-2xs font-bold uppercase tracking-wider text-slate-500">
                      Paket CAT aktif
                    </p>
                    <p className="mt-1 text-sm font-bold leading-snug text-slate-900">
                      {packageConfig.packageName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {packageConfig.maxAttempts === 0
                        ? "Latihan Bebas (Tanpa Batas Percobaan) · Acak butir aktif"
                        : `Maks. ${packageConfig.maxAttempts} kali percobaan · Acak butir aktif`}
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-slate-600 ring-1 ring-slate-200">
                      <CalendarDays className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-slate-900">
                          Jadwal CAT
                        </h3>
                        <Badge tone={activeCatSchedule ? "success" : "neutral"}>
                          {isCoachSelfTest
                            ? "Bebas jadwal"
                            : activeCatSchedule
                              ? "Tersedia Hari Ini"
                              : displayedCatSchedule
                                ? "Terjadwal"
                                : "Belum terjadwal"}
                        </Badge>
                      </div>
                      {isCoachSelfTest ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Uji coba mandiri pelatih. Ujian dapat dimulai kapan saja.
                        </p>
                      ) : displayedCatSchedule ? (
                        <>
                          <p className="mt-1 text-xs font-semibold text-slate-700">
                            {displayedCatSchedule.title}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {displayedCatSchedule.date} · {displayedCatSchedule.time} · {displayedCatSchedule.location}
                          </p>
                          {activeCatSchedule && currentUser.role === "candidate" && (
                            <p className="mt-1 text-[0.68rem] font-medium text-emerald-700">
                              ℹ Sesi aktif sepanjang hari ini (sampai 23:59). Waktu 75 menit (45m PIP + 30m TIU) baru akan berjalan setelah Anda menekan tombol mulai.
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                          {isCoachOrAdmin
                            ? "Pelatih dapat langsung memulai ujian tanpa menunggu jadwal."
                            : "Belum ada jadwal untuk akun Anda."}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* TWO SEQUENTIAL SESSIONS TIMELINE */}
                <details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <summary className="cursor-pointer list-none text-xs font-bold uppercase tracking-wider text-slate-700 marker:hidden">
                    Ketentuan ujian · 75 menit total
                    <span className="ml-2 text-3xs font-medium normal-case tracking-normal text-slate-500">
                      PIP 45 menit → TIU 30 menit · Lihat rincian
                    </span>
                  </summary>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {/* SESI 1 CARD */}
                    <div className="relative rounded-xl border border-red-200 bg-white p-4 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <Badge tone="danger">Sesi 1 (Wajib Awal)</Badge>
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                          <Clock className="size-3.5 text-red-500" /> 45 Menit
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm font-bold text-slate-900">
                        CAT PIP (Pancasila &amp; TWK)
                      </h4>
                      <ul className="mt-2 space-y-1 text-xs text-slate-600">
                        <li>&bull; 50 Butir Soal Pilihan Ganda (A–E)</li>
                        <li>&bull; Benar +2, Salah/Kosong 0 (Maks 100)</li>
                        <li>&bull; Passing Grade: &ge; 70.0</li>
                      </ul>
                      <div className="mt-3 border-t border-slate-100 pt-2 text-2xs font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="size-3 text-emerald-600" />{" "}
                        Nilai langsung keluar saat selesai
                      </div>
                    </div>

                    {/* SESI 2 CARD */}
                    <div className="relative rounded-xl border border-purple-200 bg-white p-4 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <Badge tone="neutral">Sesi 2 (Lanjutan)</Badge>
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                          <Clock className="size-3.5 text-purple-500" /> 30
                          Menit
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm font-bold text-slate-900">
                        CAT TIU (Intelegensia Umum)
                      </h4>
                      <ul className="mt-2 space-y-1 text-xs text-slate-600">
                        <li>&bull; 50 Butir Soal (Verbal, Numerik, Logika)</li>
                        <li>&bull; Benar +1, Salah 0 (Maks Mentah 50)</li>
                        <li>
                          &bull; Nilai Skala 100: Skor Mentah &times; 2 (PG: 70)
                        </li>
                      </ul>
                      <div className="mt-3 border-t border-slate-100 pt-2 text-2xs text-slate-500 flex items-center gap-1">
                        <ShieldCheck className="size-3 text-purple-600" />{" "}
                        Terkunci sampai Sesi 1 PIP selesai
                      </div>
                    </div>
                  </div>
                </details>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Info className="size-4 text-blue-500 shrink-0" />
                    <span>Jawaban tersimpan otomatis saat memilih opsi.</span>
                  </div>

                  <Button
                    onClick={() => startPipSession()}
                    disabled={!selectedCandidate}
                    className="!px-6 !py-2.5 !text-sm !font-bold shadow-md bg-red-600 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Play className="size-4" /> Mulai sesi 1 · PIP
                  </Button>
                </div>
              </Card>

              {/* PARTICIPANT OVERVIEW & ATTEMPTS CARD */}
              <div className="grid gap-6">
                <Card className="p-5 border-slate-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {currentUser.role === "candidate"
                      ? "Hasil CAT terakhir"
                      : "Ringkasan peserta terpilih"}
                  </h3>
                  {currentUser.role !== "candidate" &&
                    (selectedCandidate ? (
                      <div className="mt-3 flex items-center gap-3">
                        <CandidateAvatar
                          name={selectedCandidate.name}
                          avatar={selectedCandidate.avatar}
                          photoUrl={selectedCandidate.photoUrl}
                          className="size-12 text-sm shrink-0"
                        />
                        <div>
                          <h4 className="font-bold text-slate-900 leading-tight">
                            {selectedCandidate.name}
                          </h4>
                          <p className="text-xs text-slate-500">
                            {selectedCandidate.school}
                          </p>
                          <p className="text-2xs font-semibold text-slate-400">
                            {isCoachSelfTest
                              ? "Peran: Pelatih / Pembina"
                              : `Nomor: ${selectedCandidate.number}`}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-400">
                        Belum ada peserta yang dipilih
                      </div>
                    ))}

                  <div
                    className={`${
                      currentUser.role === "candidate"
                        ? "mt-3"
                        : "mt-4 border-t border-slate-100 pt-3"
                    } grid grid-cols-2 gap-2`}
                  >
                    <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                      <span className="text-3xs font-bold uppercase text-slate-500">
                        {currentUser.role === "candidate"
                          ? "Nilai PIP terakhir"
                          : "Nilai PIP saat ini"}
                      </span>
                      <p className="mt-0.5 text-lg font-black text-slate-900">
                        {currentPipScore !== null &&
                        currentPipScore !== undefined
                          ? currentPipScore.toFixed(0)
                          : "Belum ada"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                      <span className="text-3xs font-bold uppercase text-slate-500">
                        {currentUser.role === "candidate"
                          ? "Nilai TIU terakhir"
                          : "Nilai TIU saat ini"}
                      </span>
                      <p className="mt-0.5 text-lg font-black text-slate-900">
                        {currentTiuScore !== null &&
                        currentTiuScore !== undefined
                          ? currentTiuScore.toFixed(0)
                          : "Belum ada"}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* PRD SPECIFICATION MINI CARD */}
                <Card className="p-5 border-slate-200 bg-slate-50/60">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                    <Sparkles className="size-3.5 text-amber-500" />
                    <span>Ketentuan Ujian</span>
                    <span className="ml-auto text-3xs font-semibold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                      Standar BPIP
                    </span>
                  </div>
                  <div className="mt-3.5 space-y-2.5 text-xs text-slate-600">
                    <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span>Model Ujian</span>
                      <span className="font-bold text-slate-900">
                        1 Paket, 2 Sesi
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span>Durasi Total</span>
                      <span className="font-bold text-slate-900">
                        75 Menit (45m + 30m)
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span>Jumlah Soal</span>
                      <span className="font-bold text-slate-900">
                        100 Soal (50 + 50)
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span>Passing Grade PIP</span>
                      <span className="font-bold text-emerald-700">
                        &ge; 70.0 (35 Benar)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Passing Grade TIU</span>
                      <span className="font-bold text-emerald-700">
                        &ge; 70.0 (35 Benar)
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* -------------------- 2. ACTIVE EXAM SCREEN (PIP or TIU) -------------------- */}
          {(sessionPhase === "pip" || sessionPhase === "tiu") &&
            currentExamQuestion && (
              <div
                className={
                  packageConfig.examBrowserLock
                    ? "fixed inset-0 z-50 flex flex-col bg-slate-900 select-none overflow-hidden"
                    : "grid gap-6"
                }
              >
                {/* EXAM TOP BAR (PRD Section 6.2 & Exam Browser Cockpit) */}
                <div
                  className={
                    packageConfig.examBrowserLock
                      ? "shrink-0 flex items-center justify-between gap-2 bg-slate-950 px-3 py-2 sm:px-5 sm:py-2.5 text-white border-b border-slate-800 shadow-md select-none"
                      : "flex items-center justify-between gap-2 rounded-2xl bg-slate-900 p-3 sm:p-4 text-white shadow-lg"
                  }
                >
                  {/* LEFT: CANDIDATE INFO & SESSION BADGE */}
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <Badge
                      tone={sessionPhase === "pip" ? "danger" : "info"}
                      className="text-2xs font-extrabold px-2 py-0.5 whitespace-nowrap shrink-0"
                    >
                      <span className="sm:hidden">{sessionPhase === "pip" ? "PIP" : "TIU"}</span>
                      <span className="hidden sm:inline">
                        {sessionPhase === "pip" ? "SESI 1: PIP" : "SESI 2: TIU"}
                      </span>
                    </Badge>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
                          {selectedCandidate?.name ?? "Peserta"}
                        </h3>
                        <span className="hidden md:inline text-slate-400 font-normal text-2xs truncate">
                          ({selectedCandidate?.number ?? "—"})
                        </span>
                        {packageConfig.examBrowserLock && (
                          <span className="hidden sm:inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-3xs font-bold text-emerald-400 border border-emerald-500/20 whitespace-nowrap shrink-0">
                            <Lock className="size-2.5" />
                            Exam Browser
                          </span>
                        )}
                      </div>
                      <p className="hidden sm:block text-3xs text-slate-400 truncate leading-tight mt-0.5">
                        {packageConfig.packageName}
                      </p>
                    </div>
                  </div>

                  {/* RIGHT: VIOLATION PILL, TIMER & ACTIONS */}
                  <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                    {/* VIOLATION COUNTER PILL */}
                    {packageConfig.examBrowserLock && (
                      <div
                        className={`flex items-center gap-1 rounded-lg px-2 py-1 text-2xs font-bold border transition whitespace-nowrap shrink-0 ${
                          violationCount > 0
                            ? "bg-red-500/20 text-red-300 border-red-500/40 animate-pulse"
                            : "bg-slate-800/90 text-slate-300 border-slate-700"
                        }`}
                        title="Batas Pelanggaran Integritas"
                      >
                        <ShieldAlert
                          className={`size-3 shrink-0 ${violationCount > 0 ? "text-red-400" : "text-slate-400"}`}
                        />
                        <span>
                          <span className="hidden md:inline">Pelanggaran: </span>
                          {violationCount}/{packageConfig.maxViolations || 3}
                        </span>
                      </div>
                    )}

                    {/* FULLSCREEN RE-ENTRY BUTTON IF EXITED */}
                    {packageConfig.examBrowserLock && !isFullscreen && (
                      <button
                        type="button"
                        onClick={enterFullscreen}
                        className="flex items-center gap-1 rounded-lg bg-amber-500/20 px-2 py-1 text-2xs font-bold text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition cursor-pointer whitespace-nowrap shrink-0"
                        title="Masuk kembali ke mode Layar Penuh"
                      >
                        <Maximize2 className="size-3 shrink-0" />
                        <span className="hidden sm:inline">Layar Penuh</span>
                      </button>
                    )}

                    {/* AUTOSAVE PILL */}
                    <div className="hidden lg:flex items-center gap-1 text-3xs text-slate-300 whitespace-nowrap shrink-0">
                      {isSavingAnswer ? (
                        <RefreshCw className="size-3 animate-spin text-amber-400" />
                      ) : (
                        <Check className="size-3 text-emerald-400" />
                      )}
                      <span className={isSavingAnswer ? "text-amber-300" : "text-emerald-300"}>
                        {isSavingAnswer ? "Simpan..." : "Tersimpan"}
                      </span>
                    </div>

                    {/* TIMER COUNTDOWN */}
                    <div
                      className={`flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 py-1 sm:px-2.5 sm:py-1 font-display text-xs sm:text-sm font-black tracking-wider transition whitespace-nowrap shrink-0 ${
                        secondsLeft <= 60
                          ? "bg-red-600 text-white animate-pulse"
                          : secondsLeft <= 300
                            ? "bg-amber-500 text-slate-950 font-extrabold"
                            : "bg-slate-800 text-amber-400 border border-slate-700"
                      }`}
                    >
                      <Clock className="size-3 sm:size-3.5 shrink-0" />
                      <span>{formatTimer(secondsLeft)}</span>
                    </div>

                    {/* SUBMIT BUTTON */}
                    <Button
                      variant="danger"
                      onClick={() => setShowConfirmSubmitModal(true)}
                      className="!px-2.5 !py-1 sm:!px-3 sm:!py-1 !text-2xs sm:!text-xs font-bold whitespace-nowrap shrink-0"
                    >
                      <span className="sm:hidden">Selesai</span>
                      <span className="hidden sm:inline">Selesaikan Sesi</span>
                    </Button>
                  </div>
                </div>

                {/* MAIN QUESTION WORKSPACE & 50-MATRIX */}
                <div
                  className={
                    packageConfig.examBrowserLock
                      ? "flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-6"
                      : ""
                  }
                >
                  <div
                    className={
                      packageConfig.examBrowserLock
                        ? "mx-auto max-w-7xl grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]"
                        : "grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]"
                    }
                  >
                  {/* QUESTION AREA */}
                  <Card className="p-6 border-slate-200 flex flex-col justify-between min-h-[28rem]">
                    <div>
                      {/* QUESTION HEADER */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-extrabold text-white">
                            Soal Nomor {currentExamIdx + 1}
                          </span>
                          <Badge tone="neutral" className="text-xs">
                            {currentExamQuestion.category}
                          </Badge>
                        </div>

                        {/* RAGU-RAGU CHECKBOX */}
                        <label className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50/80 px-3 py-1.5 text-xs font-bold text-amber-900 cursor-pointer select-none hover:bg-amber-100 transition">
                          <input
                            type="checkbox"
                            checked={Boolean(
                              currentFlaggedMap[currentExamQuestion.id],
                            )}
                            onChange={(e) => {
                              const val = e.target.checked
                              if (sessionPhase === "pip") {
                                setPipFlagged((prev) => ({
                                  ...prev,
                                  [currentExamQuestion.id]: val,
                                }))
                              } else {
                                setTiuFlagged((prev) => ({
                                  ...prev,
                                  [currentExamQuestion.id]: val,
                                }))
                              }
                            }}
                            className="size-4 accent-amber-600 rounded cursor-pointer"
                          />
                          <Flag className="size-3.5 text-amber-600" />
                          <span>Ragu-ragu</span>
                        </label>
                      </div>

                      {/* QUESTION TEXT */}
                      <div className="mt-5 text-sm sm:text-base font-semibold text-slate-900 leading-relaxed whitespace-pre-line">
                        {currentExamQuestion.question}
                      </div>

                      {/* 5 MULTIPLE CHOICE OPTIONS (A-E) */}
                      <div className="mt-6 grid gap-2.5">
                        {currentExamQuestion.options.map((optText, optIdx) => {
                          const isSelected =
                            currentAnswersMap[currentExamQuestion.id] === optIdx
                          const letter = ["A", "B", "C", "D", "E"][optIdx]

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() =>
                                handleSelectOption(
                                  currentExamQuestion.id,
                                  optIdx,
                                  sessionPhase === "pip" ? "pip" : "tiu",
                                )
                              }
                              className={`group flex items-start gap-3.5 rounded-xl border p-3.5 text-left text-xs sm:text-sm transition ${
                                isSelected
                                  ? "border-red-500 bg-red-50/90 text-red-950 font-bold ring-2 ring-red-200 shadow-2xs"
                                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 text-slate-800"
                              }`}
                            >
                              <span
                                className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-black transition ${
                                  isSelected
                                    ? "bg-red-600 text-white"
                                    : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                                }`}
                              >
                                {letter}
                              </span>
                              <span className="pt-0.5 leading-relaxed">
                                {optText}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* BOTTOM ACTION BUTTONS */}
                    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                      <Button
                        variant="secondary"
                        disabled={currentExamIdx === 0}
                        onClick={() => {
                          if (sessionPhase === "pip") {
                            setPipCurrentIdx((i) => Math.max(0, i - 1))
                          } else {
                            setTiuCurrentIdx((i) => Math.max(0, i - 1))
                          }
                        }}
                        className="!text-xs"
                      >
                        <ArrowLeft className="size-3.5" /> Soal Sebelumnya
                      </Button>

                      <div className="flex items-center gap-2">
                        {currentExamIdx < totalCount - 1 ? (
                          <Button
                            onClick={() => {
                              if (sessionPhase === "pip") {
                                setPipCurrentIdx((i) =>
                                  Math.min(totalCount - 1, i + 1),
                                )
                              } else {
                                setTiuCurrentIdx((i) =>
                                  Math.min(totalCount - 1, i + 1),
                                )
                              }
                            }}
                            className="!text-xs bg-slate-900 text-white hover:bg-slate-800"
                          >
                            Soal Berikutnya <ArrowRight className="size-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="danger"
                            onClick={() => setShowConfirmSubmitModal(true)}
                            className="!text-xs !font-bold"
                          >
                            Selesaikan &amp; Kumpulkan
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* 50-GRID QUESTION NAVIGATOR MATRIX (PRD Section 6.2) */}
                  <Card className="p-4 border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                          Matriks 50 Soal
                        </h4>
                        <Badge tone="info" className="text-2xs font-bold">
                          {answeredCount} / {totalCount} Dijawab
                        </Badge>
                      </div>

                      {/* 50 NUMBER GRID */}
                      <div className="mt-3 grid grid-cols-5 gap-1.5 max-h-[22rem] overflow-y-auto pr-1">
                        {currentExamQuestionsList.map((q, idx) => {
                          const isAnswered =
                            currentAnswersMap[q.id] !== undefined
                          const isFlagged = Boolean(currentFlaggedMap[q.id])
                          const isCurrent = idx === currentExamIdx

                          return (
                            <button
                              key={q.id}
                              type="button"
                              onClick={() => {
                                if (sessionPhase === "pip")
                                  setPipCurrentIdx(idx)
                                else setTiuCurrentIdx(idx)
                              }}
                              className={`grid h-8 place-items-center rounded-lg text-xs font-bold transition ${
                                isCurrent
                                  ? "bg-slate-950 text-white ring-2 ring-slate-900 ring-offset-1"
                                  : isFlagged
                                    ? "bg-amber-300 text-amber-950 font-black border border-amber-400"
                                    : isAnswered
                                      ? "bg-emerald-600 text-white"
                                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              {idx + 1}
                            </button>
                          )
                        })}
                      </div>

                      {/* LEGEND INDICATOR */}
                      <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-2xs text-slate-600">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="size-3 rounded-md bg-emerald-600" />
                            <span>Sudah Dijawab</span>
                          </div>
                          <span className="font-bold text-slate-800">
                            {answeredCount}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="size-3 rounded-md bg-amber-300 border border-amber-400" />
                            <span>Ragu-ragu</span>
                          </div>
                          <span className="font-bold text-slate-800">
                            {flaggedCount}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="size-3 rounded-md bg-slate-100 border border-slate-200" />
                            <span>Belum Dijawab</span>
                          </div>
                          <span className="font-bold text-slate-800">
                            {unansweredCount}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <Button
                        variant="danger"
                        onClick={() => setShowConfirmSubmitModal(true)}
                        className="w-full !text-xs font-bold"
                      >
                        Selesaikan{" "}
                        {sessionPhase === "pip" ? "Sesi PIP" : "Sesi TIU"}
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* -------------------- 3. INTER-SESSION GATE: PIP FINALIZED -------------------- */}
          {sessionPhase === "pip-final" && (
            <Card className="overflow-hidden border-slate-200">
              <div className="bg-slate-950 p-4 sm:p-5 text-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge
                        tone={currentPipResults.passed ? "success" : "danger"}
                        className="text-2xs font-extrabold uppercase px-2 py-0.5 whitespace-nowrap"
                      >
                        {currentPipResults.passed
                          ? "LOLOS PASSING GRADE PIP (≥ 70)"
                          : "BELUM MEMENUHI PASSING GRADE (< 70)"}
                      </Badge>
                      <span className="text-2xs text-slate-400">·</span>
                      <span className="text-2xs text-slate-300 truncate">
                        {selectedCandidate?.name ?? "Peserta"}
                      </span>
                    </div>
                    <h2 className="mt-1.5 font-display text-lg sm:text-xl font-extrabold text-white">
                      Hasil Sesi 1: CAT PIP Selesai
                    </h2>
                  </div>

                  {/* COMPACT PIP SCORE PILL */}
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-center sm:text-right flex items-center gap-3">
                    <div>
                      <p className="text-3xs font-bold uppercase tracking-wider text-slate-400">
                        Skor PIP
                      </p>
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-2xl sm:text-3xl font-black text-amber-400">
                          {currentPipResults.score}
                        </span>
                        <span className="text-xs text-slate-400">/ 100</span>
                      </div>
                    </div>
                    <div className="border-l border-white/10 pl-3 text-left">
                      <p className="text-2xs font-bold text-white">
                        {currentPipResults.correct} / 50 Benar
                      </p>
                      <p className="text-3xs text-slate-400">&times; 2 poin per butir</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-lg bg-emerald-950/40 border border-emerald-800/40 p-2.5 text-xs text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                  <p className="text-2xs leading-tight">
                    <strong className="text-emerald-300">Skor PIP tersimpan aman:</strong> Anda dapat langsung melanjutkan ke Sesi TIU atau menandai buku materi di bawah ini.
                  </p>
                </div>

                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <Button
                    onClick={startTiuSession}
                    className="!px-4 !py-2 !text-xs font-bold bg-purple-600 hover:bg-purple-700 shadow-md cursor-pointer"
                  >
                    <Play className="size-3.5" /> Lanjut ke Sesi 2: CAT TIU (30 Menit)
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Nilai PIP Anda sudah tersimpan permanen di profil. Anda dapat kembali ke menu utama dan melanjutkan Sesi TIU kapan saja. Keluar ke menu utama sekarang?",
                        )
                      ) {
                        setSessionPhase("idle")
                        showToast(
                          "Sesi disimpan. Anda dapat melanjutkan Sesi TIU kapan saja dari beranda Tryout.",
                          "info",
                        )
                      }
                    }}
                    className="bg-white/10 text-white hover:bg-white/20 !text-xs !py-2 cursor-pointer"
                  >
                    Simpan &amp; Lanjutkan TIU Nanti
                  </Button>
                </div>
              </div>

              {/* REVIEW ACCORDION FOR PIP */}
              <div className="p-4 sm:p-5 divide-y divide-slate-100 max-h-80 overflow-y-auto">
                <h4 className="pb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Ringkasan Jawaban Butir Soal Sesi 1 (PIP)
                </h4>
                {pipExamQuestions.map((q, idx) => {
                  const userAns = pipAnswers[q.id]
                  const isCorrect = userAns === q.correctIndex
                  return (
                    <div key={q.id} className="py-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">
                          Nomor {idx + 1} · {q.category}
                        </span>
                        <Badge tone={isCorrect ? "success" : "danger"}>
                          {isCorrect ? "Benar (+2)" : "Salah / Kosong (0)"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-slate-700 font-medium">
                        {q.question}
                      </p>
                      <p className="mt-1 text-2xs text-slate-500">
                        Kunci: {["A", "B", "C", "D", "E"][q.correctIndex]}.{" "}
                        {q.options[q.correctIndex]}
                      </p>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* -------------------- 4. TRYOUT COMPLETED SCREEN (COMBINED REPORT) -------------------- */}
          {sessionPhase === "completed" && (
            <div className="grid gap-4">
              {/* TOP HEADER RESULTS CARD */}
              <Card className="overflow-hidden border-slate-200">
                <div className="bg-slate-950 p-4 sm:p-5 text-white">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          tone={
                            currentPipResults.passed && currentTiuResults.passed
                              ? "success"
                              : !currentPipResults.passed && !currentTiuResults.passed
                                ? "danger"
                                : "warning"
                          }
                          className="text-2xs font-bold px-2 py-0.5 whitespace-nowrap"
                        >
                          {currentPipResults.passed && currentTiuResults.passed
                            ? "LOLOS KEDUA TAHAP (TAHAP 2 & 3)"
                            : !currentPipResults.passed && !currentTiuResults.passed
                              ? "REMEDIAL TAHAP 2 & 3"
                              : !currentPipResults.passed
                                ? "REMEDIAL TAHAP 2 (PIP)"
                                : "REMEDIAL TAHAP 3 (TIU)"}
                        </Badge>
                        <span className="text-2xs text-slate-400">·</span>
                        <span className="text-2xs text-slate-300 whitespace-nowrap">
                          2 Tahapan CAT Selesai
                        </span>
                      </div>

                      <h2 className="mt-1.5 font-display text-lg sm:text-xl font-bold text-white">
                        Laporan Evaluasi Lengkap CAT BPIP
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-300">
                        Santri / Peserta:{" "}
                        <strong>{selectedCandidate?.name ?? "Peserta"}</strong>{" "}
                        <span className="text-slate-400">
                          ({selectedCandidate?.school ?? "—"})
                        </span>
                      </p>
                    </div>

                    {/* ACTION BUTTONS (IN HEADER) */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {isCoachSelfTest ? (
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 border border-amber-400/30 px-2.5 py-1 text-2xs text-amber-200 font-medium">
                          <ShieldCheck className="size-3.5 text-amber-400 shrink-0" />
                          <span>Uji Coba Pelatih — Tersimpan di Riwayat</span>
                        </div>
                      ) : (
                        <Button
                          onClick={handleSyncToCandidateProfile}
                          className="!px-3 !py-1.5 !text-xs font-bold shadow-sm bg-emerald-600 hover:bg-emerald-700 whitespace-nowrap"
                        >
                          <Save className="size-3.5" /> Sinkronkan ke Profil
                        </Button>
                      )}

                      <Button
                        variant="secondary"
                        onClick={() => setSessionPhase("idle")}
                        className="bg-white/10 text-white hover:bg-white/20 !px-3 !py-1.5 !text-xs whitespace-nowrap"
                      >
                        <RotateCcw className="size-3.5" /> Mulai Baru
                      </Button>
                    </div>
                  </div>

                  {/* TWO INDEPENDENT STAGES METRICS (TAHAP 2 PIP & TAHAP 3 TIU) */}
                  <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* TAHAP 2: PIP */}
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">
                          Tahap 2: Pancasila &amp; Wawasan (PIP)
                        </span>
                        <Badge
                          tone={currentPipResults.passed ? "success" : "danger"}
                          className="text-3xs px-2 py-0.5 font-bold"
                        >
                          {currentPipResults.passed ? "Lolos (≥70)" : "Remedial"}
                        </Badge>
                      </div>
                      <div className="my-2 flex items-baseline justify-between">
                        <div className="flex items-baseline gap-1">
                          <span className="font-display text-3xl font-black text-white">
                            {currentPipResults.score}
                          </span>
                          <span className="text-xs font-normal text-slate-400">
                            / 100
                          </span>
                        </div>
                        <span className="text-xs text-slate-300 font-medium">
                          {currentPipResults.correct} / 50 Butir Benar (&times;2)
                        </span>
                      </div>
                      <p className="text-3xs text-slate-400 border-t border-white/10 pt-1.5">
                        Passing Grade Mandiri: &ge; {packageConfig.pipPassingGrade} · Materi: Sejarah, Sila, UUD, NKRI
                      </p>
                    </div>

                    {/* TAHAP 3: TIU */}
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">
                          Tahap 3: Intelegensia Umum (TIU)
                        </span>
                        <Badge
                          tone={currentTiuResults.passed ? "success" : "danger"}
                          className="text-3xs px-2 py-0.5 font-bold"
                        >
                          {currentTiuResults.passed ? "Lolos (≥70)" : "Remedial"}
                        </Badge>
                      </div>
                      <div className="my-2 flex items-baseline justify-between">
                        <div className="flex items-baseline gap-1">
                          <span className="font-display text-3xl font-black text-white">
                            {currentTiuResults.scaled}
                          </span>
                          <span className="text-xs font-normal text-slate-400">
                            / 100
                          </span>
                        </div>
                        <span className="text-xs text-slate-300 font-medium">
                          Mentah: {currentTiuResults.raw} / 50 (&times;2)
                        </span>
                      </div>
                      <p className="text-3xs text-slate-400 border-t border-white/10 pt-1.5">
                        Passing Grade Mandiri: &ge; {packageConfig.tiuPassingGrade} · Materi: Verbal, Numerik, Logika
                      </p>
                    </div>
                  </div>
                </div>

                {/* DETAILED QUESTIONS REVIEW & EXPLANATIONS */}
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-display text-sm sm:text-base font-bold text-slate-900">
                        Tinjauan Pembahasan &amp; Kunci Jawaban Lengkap
                      </h3>
                      <p className="text-xs text-slate-500">
                        Pelajari butir soal dan rasionalisasi pembahasan untuk evaluasi pembinaan.
                      </p>
                    </div>

                    <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 w-full sm:w-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => setReviewTab("pip")}
                        className={`flex-1 sm:flex-initial text-center whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          reviewTab === "pip"
                            ? "bg-white text-slate-900 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Pembahasan PIP (50)
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewTab("tiu")}
                        className={`flex-1 sm:flex-initial text-center whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          reviewTab === "tiu"
                            ? "bg-white text-slate-900 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Pembahasan TIU (50)
                      </button>
                    </div>
                  </div>

                  {/* QUESTIONS LIST ACCORDING TO ACTIVE REVIEW TAB */}
                  <div className="mt-3 divide-y divide-slate-100 max-h-[32rem] overflow-y-auto pr-2">
                    {(reviewTab === "pip"
                      ? pipExamQuestions
                      : tiuExamQuestions
                    ).map((q, idx) => {
                      const userAns =
                        reviewTab === "pip"
                          ? pipAnswers[q.id]
                          : tiuAnswers[q.id]
                      const isCorrect = userAns === q.correctIndex

                      return (
                        <div key={q.id} className="py-3">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-xs font-bold text-slate-900">
                              Nomor {idx + 1} · {q.category}
                            </span>
                            <Badge tone={isCorrect ? "success" : "danger"} className="text-3xs px-2 py-0.5">
                              {isCorrect ? "Jawaban Benar" : "Salah / Kosong"}
                            </Badge>
                          </div>

                          <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed">
                            {q.question}
                          </p>

                          <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700">
                              Pilihan Peserta:{" "}
                              <strong>
                                {userAns !== undefined
                                  ? `${["A", "B", "C", "D", "E"][userAns]}. ${q.options[userAns]}`
                                  : "Tidak Dijawab"}
                              </strong>
                            </span>
                            <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-emerald-800">
                              Kunci Benar:{" "}
                              <strong>
                                {["A", "B", "C", "D", "E"][q.correctIndex]}.{" "}
                                {q.options[q.correctIndex]}
                              </strong>
                            </span>
                          </div>

                          <div className="mt-2 rounded-xl bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-700">
                            <strong className="text-slate-900">
                              Pembahasan:
                            </strong>{" "}
                            {q.explanation}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: BANK SOAL PIP (50 BUTIR) */}
      {/* ===================================================================== */}
      {activeTab === "pip-bank" && (
        <div className="grid gap-5">
          {/* OVERVIEW CARDS: 1 BARIS (3 KOLOM) RINGKAS & SEDERHANA */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
            <Card className="p-3 sm:p-4 text-center border-slate-200/90 shadow-2xs">
              <span className="text-3xs sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Soal
              </span>
              <p className="mt-1 font-display text-lg sm:text-2xl font-black text-slate-950">
                {pipActiveCount}
              </p>
              <p className="mt-0.5 text-3xs sm:text-xs text-slate-500 font-medium">
                50 per paket
              </p>
            </Card>

            <Card className="p-3 sm:p-4 text-center border-slate-200/90 shadow-2xs">
              <span className="text-3xs sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                Passing Grade
              </span>
              <p className="mt-1 font-display text-lg sm:text-2xl font-black text-emerald-600">
                &ge; 70
              </p>
              <p className="mt-0.5 text-3xs sm:text-xs text-slate-500 font-medium">
                Min. 35 benar
              </p>
            </Card>

            <Card className="p-3 sm:p-4 text-center border-slate-200/90 shadow-2xs">
              <span className="text-3xs sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                Durasi Ujian
              </span>
              <p className="mt-1 font-display text-lg sm:text-2xl font-black text-slate-950">
                45 Menit
              </p>
              <p className="mt-0.5 text-3xs sm:text-xs text-slate-500 font-medium">
                Timer otomatis
              </p>
            </Card>
          </div>

          {/* DOMAIN FILTER PILLS IN CONTAINER */}
          <Card className="p-3 sm:p-4 border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-1.5 mb-2.5 px-0.5">
              <Filter className="size-3.5 text-slate-400" />
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">
                Filter Domain Materi PIP
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                  categoryFilter === "all"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                }`}
              >
                <span>Semua Domain</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-3xs font-bold ${
                    categoryFilter === "all"
                      ? "bg-white/20 text-white"
                      : "bg-slate-200/80 text-slate-600"
                  }`}
                >
                  {questions.filter((q) => q.type === "pip").length}
                </span>
              </button>

              {pipCategories.map((cat) => {
                const count = questions.filter(
                  (q) => q.type === "pip" && q.category === cat,
                ).length
                const isActive = categoryFilter === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                      isActive
                        ? "bg-red-600 text-white shadow-xs ring-2 ring-red-600/20"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                    }`}
                  >
                    <span>{cat}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-3xs font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-200/80 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* SEARCH & QUESTIONS LIST */}
          <Card className="overflow-hidden border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari butir soal PIP, opsi, pasal, atau materi..."
                  className="!pl-9 !text-xs"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => openCreateQuestion("pip")}
                  className="!px-3 !py-1.5 !text-xs font-bold"
                >
                  <Plus className="size-3.5" /> Tambah Soal
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleRestoreStandardQuestions}
                  className="!px-2.5 !py-1.5 !text-xs text-slate-600"
                  title="Sinkronkan seluruh soal standar PIP dan TIU"
                >
                  <RefreshCw className="size-3.5" /> Standar
                </Button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {pipPagedList.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Tidak ada butir soal PIP yang cocok dengan kriteria pencarian.
                </div>
              ) : (
                pipPagedList.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-5 hover:bg-slate-50/60 transition"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-slate-900 px-2 py-0.5 text-2xs font-bold text-white">
                          #{(bankPage - 1) * bankPageSize + idx + 1}
                        </span>
                        <Badge tone="info">{q.category}</Badge>
                        <Badge
                          tone={q.status === "active" ? "success" : "neutral"}
                        >
                          {q.status === "active" ? "Aktif" : "Draft"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="secondary"
                          onClick={() => openEditQuestion(q)}
                          className="!px-2.5 !py-1 !text-xs"
                        >
                          <Edit3 className="size-3 text-slate-500" /> Edit
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            if (
                              confirm("Hapus butir soal ini dari bank soal?")
                            ) {
                              deleteQuestion(q.id)
                              showToast("Soal berhasil dihapus.", "info")
                            }
                          }}
                          className="!px-2 !py-1 !text-xs text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>

                    <p className="mt-2.5 text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed">
                      {q.question}
                    </p>

                    <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`rounded-lg px-2.5 py-1.5 text-xs transition ${
                            oIdx === q.correctIndex
                              ? "bg-emerald-50 border border-emerald-300 font-bold text-emerald-950"
                              : "bg-slate-50 text-slate-700"
                          }`}
                        >
                          <span className="font-bold mr-1.5">
                            {["A", "B", "C", "D", "E"][oIdx]}.
                          </span>
                          {opt}
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <p className="mt-2.5 rounded-lg bg-slate-50/80 p-2 text-2xs text-slate-600 leading-relaxed">
                        <strong className="text-slate-800">Pembahasan:</strong>{" "}
                        {q.explanation}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {pipTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-600">
                <span>
                  Halaman <strong>{bankPage}</strong> dari{" "}
                  <strong>{pipTotalPages}</strong> ({pipQuestionsList.length}{" "}
                  butir soal)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    disabled={bankPage <= 1}
                    onClick={() => setBankPage((p) => Math.max(1, p - 1))}
                    className="!px-3 !py-1 !text-xs"
                  >
                    <ArrowLeft className="size-3.5" /> Sebelumnya
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={bankPage >= pipTotalPages}
                    onClick={() =>
                      setBankPage((p) => Math.min(pipTotalPages, p + 1))
                    }
                    className="!px-3 !py-1 !text-xs"
                  >
                    Berikutnya <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: BANK SOAL TIU (50 BUTIR) */}
      {/* ===================================================================== */}
      {activeTab === "tiu-bank" && (
        <div className="grid gap-5">
          {/* OVERVIEW CARDS: 1 BARIS (3 KOLOM) RINGKAS & SEDERHANA */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
            <Card className="p-3 sm:p-4 text-center border-slate-200/90 shadow-2xs">
              <span className="text-3xs sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Soal
              </span>
              <p className="mt-1 font-display text-lg sm:text-2xl font-black text-slate-950">
                {tiuActiveCount}
              </p>
              <p className="mt-0.5 text-3xs sm:text-xs text-slate-500 font-medium">
                50 per paket
              </p>
            </Card>

            <Card className="p-3 sm:p-4 text-center border-slate-200/90 shadow-2xs">
              <span className="text-3xs sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                Passing Grade
              </span>
              <p className="mt-1 font-display text-lg sm:text-2xl font-black text-emerald-600">
                &ge; 70
              </p>
              <p className="mt-0.5 text-3xs sm:text-xs text-slate-500 font-medium">
                Min. 35 benar
              </p>
            </Card>

            <Card className="p-3 sm:p-4 text-center border-slate-200/90 shadow-2xs">
              <span className="text-3xs sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                Durasi Ujian
              </span>
              <p className="mt-1 font-display text-lg sm:text-2xl font-black text-slate-950">
                30 Menit
              </p>
              <p className="mt-0.5 text-3xs sm:text-xs text-slate-500 font-medium">
                Timer otomatis
              </p>
            </Card>
          </div>

          {/* SUBMATERI FILTER PILLS IN CONTAINER */}
          <Card className="p-3 sm:p-4 border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-1.5 mb-2.5 px-0.5">
              <Filter className="size-3.5 text-slate-400" />
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">
                Filter Submateri Soal TIU
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                  categoryFilter === "all"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                }`}
              >
                <span>Semua Submateri</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-3xs font-bold ${
                    categoryFilter === "all"
                      ? "bg-white/20 text-white"
                      : "bg-slate-200/80 text-slate-600"
                  }`}
                >
                  {questions.filter((q) => q.type === "tiu").length}
                </span>
              </button>

              {tiuCategories.map((cat) => {
                const count = questions.filter(
                  (q) => q.type === "tiu" && q.category === cat,
                ).length
                const isActive = categoryFilter === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                      isActive
                        ? "bg-purple-600 text-white shadow-xs ring-2 ring-purple-600/20"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                    }`}
                  >
                    <span>{cat}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-3xs font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-200/80 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* SEARCH & QUESTIONS LIST */}
          <Card className="overflow-hidden border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari butir soal TIU, opsi, rumus, atau logika..."
                  className="!pl-9 !text-xs"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => openCreateQuestion("tiu")}
                  className="!px-3 !py-1.5 !text-xs font-bold"
                >
                  <Plus className="size-3.5" /> Tambah Soal
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleRestoreStandardQuestions}
                  className="!px-2.5 !py-1.5 !text-xs text-slate-600"
                  title="Sinkronkan butir soal standar BPIP"
                >
                  <RefreshCw className="size-3.5" /> Standar
                </Button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {tiuPagedList.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Tidak ada butir soal TIU yang cocok dengan kriteria pencarian.
                </div>
              ) : (
                tiuPagedList.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-5 hover:bg-slate-50/60 transition"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-purple-900 px-2 py-0.5 text-2xs font-bold text-white">
                          #{(bankPage - 1) * bankPageSize + idx + 1}
                        </span>
                        <Badge tone="warning">{q.category}</Badge>
                        <Badge
                          tone={q.status === "active" ? "success" : "neutral"}
                        >
                          {q.status === "active" ? "Aktif" : "Draft"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="secondary"
                          onClick={() => openEditQuestion(q)}
                          className="!px-2.5 !py-1 !text-xs"
                        >
                          <Edit3 className="size-3 text-slate-500" /> Edit
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            if (
                              confirm("Hapus butir soal ini dari bank soal?")
                            ) {
                              deleteQuestion(q.id)
                              showToast("Soal berhasil dihapus.", "info")
                            }
                          }}
                          className="!px-2 !py-1 !text-xs text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>

                    <p className="mt-2.5 text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed">
                      {q.question}
                    </p>

                    <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`rounded-lg px-2.5 py-1.5 text-xs transition ${
                            oIdx === q.correctIndex
                              ? "bg-purple-50 border border-purple-300 font-bold text-purple-950"
                              : "bg-slate-50 text-slate-700"
                          }`}
                        >
                          <span className="font-bold mr-1.5">
                            {["A", "B", "C", "D", "E"][oIdx]}.
                          </span>
                          {opt}
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <p className="mt-2.5 rounded-lg bg-slate-50/80 p-2 text-2xs text-slate-600 leading-relaxed">
                        <strong className="text-slate-800">Pembahasan:</strong>{" "}
                        {q.explanation}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {tiuTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-600">
                <span>
                  Halaman <strong>{bankPage}</strong> dari{" "}
                  <strong>{tiuTotalPages}</strong> ({tiuQuestionsList.length}{" "}
                  butir soal)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    disabled={bankPage <= 1}
                    onClick={() => setBankPage((p) => Math.max(1, p - 1))}
                    className="!px-3 !py-1 !text-xs"
                  >
                    <ArrowLeft className="size-3.5" /> Sebelumnya
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={bankPage >= tiuTotalPages}
                    onClick={() =>
                      setBankPage((p) => Math.min(tiuTotalPages, p + 1))
                    }
                    className="!px-3 !py-1 !text-xs"
                  >
                    Berikutnya <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: REKAPITULASI NILAI SANTRI & EKSPOR CSV (PRD Section 13.3) */}
      {/* ===================================================================== */}
      {activeTab === "rekap" && (
        <Card className="overflow-hidden border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
            <div>
              <h3 className="font-display text-base font-bold text-slate-950">
                {currentUser.role === "candidate"
                  ? "Hasil Evaluasi Tryout CAT Saya"
                  : "Rekapitulasi Hasil Tryout CAT Santri (PRD 1.1)"}
              </h3>
              <p className="text-xs text-slate-500">
                {currentUser.role === "candidate"
                  ? "Ringkasan perolehan skor PIP dan TIU yang telah tersimpan di akun Anda."
                  : "Menampilkan perolehan nilai PIP, TIU skor mentah & skala 100, serta status kelulusan."}
              </p>
            </div>

            {currentUser.role !== "candidate" && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleExportCsv}
                  className="!px-3.5 !py-2 !text-xs font-bold"
                >
                  <FileSpreadsheet className="size-4" /> Unduh Format PRD (CSV)
                </Button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-xs">
              <thead className="bg-slate-50 text-2xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Santri / Peserta</th>
                  <th className="px-4 py-3.5">Asal Sekolah</th>
                  <th className="px-4 py-3.5">Skor PIP (PG 70)</th>
                  <th className="px-4 py-3.5">Status PIP</th>
                  <th className="px-4 py-3.5">TIU Mentah</th>
                  <th className="px-4 py-3.5">TIU Skala 100</th>
                  <th className="px-4 py-3.5">Status TIU</th>
                  <th className="px-4 py-3.5">Kualifikasi CAT</th>
                  {currentUser.role !== "candidate" && (
                    <th className="px-5 py-3.5 text-right">Uji Cepat</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recapCandidates.map((cand) => {
                  const latestAttempt = latestAttemptByCandidate.get(cand.id)
                  const pipScore = latestAttempt?.pipScore ?? cand.pip
                  const tiuScore = latestAttempt?.tiuScoreScaled ?? cand.tiu
                  const pipPass = pipScore !== null && pipScore >= 70
                  const tiuPass = tiuScore !== null && tiuScore >= 70
                  const combined =
                    pipScore !== null && tiuScore !== null
                      ? Math.round((pipScore + tiuScore) / 2)
                      : null

                  return (
                    <tr
                      key={cand.id}
                      className="hover:bg-slate-50/70 transition"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <CandidateAvatar
                            name={cand.name}
                            avatar={cand.avatar}
                            photoUrl={cand.photoUrl}
                            className="size-8 text-xs shrink-0"
                          />
                          <div>
                            <p className="font-bold text-slate-900">
                              {cand.name}
                            </p>
                            <p className="text-2xs text-slate-400">
                              {cand.number}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 font-medium">
                        {cand.school}
                      </td>

                      <td className="px-4 py-3.5 font-bold tabular-nums">
                        {pipScore !== null ? (
                          <span
                            className={
                              pipPass
                                ? "text-emerald-700 font-extrabold"
                                : "text-amber-700"
                            }
                          >
                            {pipScore.toFixed(0)}{" "}
                            <span className="text-2xs text-slate-400">
                              / 100
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">
                            Belum Ujian
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge
                          tone={
                            pipPass
                              ? "success"
                              : pipScore !== null
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {pipPass
                            ? "Lolos (≥70)"
                            : pipScore !== null
                              ? "Remedial"
                              : "—"}
                        </Badge>
                      </td>

                      <td className="px-4 py-3.5 font-semibold text-slate-700 tabular-nums">
                        {tiuScore !== null ? (
                          <span>{(tiuScore / 2).toFixed(0)} / 50</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 font-bold tabular-nums">
                        {tiuScore !== null ? (
                          <span
                            className={
                              tiuPass
                                ? "text-emerald-700 font-extrabold"
                                : "text-amber-700"
                            }
                          >
                            {tiuScore.toFixed(0)}{" "}
                            <span className="text-2xs text-slate-400">
                              / 100
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">
                            Belum Ujian
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge
                          tone={
                            tiuPass
                              ? "success"
                              : tiuScore !== null
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {tiuPass
                            ? "Lolos (≥70)"
                            : tiuScore !== null
                              ? "Remedial"
                              : "—"}
                        </Badge>
                      </td>

                      <td className="px-4 py-3.5">
                        {pipScore !== null && tiuScore !== null ? (
                          pipPass && tiuPass ? (
                            <Badge tone="success" className="whitespace-nowrap font-bold">
                              Lolos Tahap 2 &amp; 3
                            </Badge>
                          ) : !pipPass && !tiuPass ? (
                            <Badge tone="danger" className="whitespace-nowrap font-bold">
                              Remedial Tahap 2 &amp; 3
                            </Badge>
                          ) : !pipPass ? (
                            <Badge tone="warning" className="whitespace-nowrap font-bold">
                              Remedial Tahap 2 (PIP)
                            </Badge>
                          ) : (
                            <Badge tone="warning" className="whitespace-nowrap font-bold">
                              Remedial Tahap 3 (TIU)
                            </Badge>
                          )
                        ) : pipScore !== null ? (
                          <span className="inline-flex items-center gap-1 text-2xs text-slate-500 font-medium whitespace-nowrap">
                            <span className="size-1.5 rounded-full bg-amber-400 shrink-0" />
                            TIU Belum Ujian
                          </span>
                        ) : tiuScore !== null ? (
                          <span className="inline-flex items-center gap-1 text-2xs text-slate-500 font-medium whitespace-nowrap">
                            <span className="size-1.5 rounded-full bg-amber-400 shrink-0" />
                            PIP Belum Ujian
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>

                      {currentUser.role !== "candidate" && (
                        <td className="px-5 py-3.5 text-right">
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setSelectedCandidateId(cand.id)
                              setActiveTab("tryout")
                              setSessionPhase("idle")
                            }}
                            className="!px-2.5 !py-1 !text-2xs font-bold text-red-600 hover:bg-red-50"
                          >
                            <Play className="size-3" /> Tes Santri
                          </Button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === "history" && (
        <Card className="overflow-hidden border-slate-200">
          <div className="border-b border-slate-100 p-5">
            <h3 className="font-display text-base font-bold text-slate-950">
              Riwayat percobaan CAT
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Daftar hasil tryout yang tersimpan, diurutkan dari aktivitas
              terbaru.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[54rem] text-left text-xs">
              <thead className="bg-slate-50 text-2xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Santri</th>
                  <th className="px-4 py-3.5">Paket</th>
                  <th className="px-4 py-3.5">Percobaan</th>
                  <th className="px-4 py-3.5">Tahap 2: PIP</th>
                  <th className="px-4 py-3.5">Tahap 3: TIU</th>
                  <th className="px-4 py-3.5">Kualifikasi</th>
                  <th className="px-5 py-3.5 text-right">Waktu selesai</th>
                  {(currentUser.role === "admin" ||
                    currentUser.role === "coach") && (
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attempts
                  .filter(
                    (attempt) =>
                      currentUser.role !== "candidate" ||
                      attempt.candidateId === currentUser.candidateId,
                  )
                  .slice()
                  .sort((a, b) => b.finalizedAt.localeCompare(a.finalizedAt))
                  .map((attempt) => {
                    const candidate =
                      candidates.find(
                        (item) => item.id === attempt.candidateId,
                      ) ??
                      candidates.find(
                        (item) =>
                          item.name.trim().toLocaleLowerCase() ===
                          attempt.candidateName.trim().toLocaleLowerCase(),
                      )
                    return (
                      <tr key={attempt.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <CandidateAvatar
                              name={candidate?.name ?? attempt.candidateName}
                              avatar={candidate?.avatar}
                              photoUrl={candidate?.photoUrl}
                              className="size-8 shrink-0 text-xs"
                            />
                            <div>
                              <p className="font-bold text-slate-900">
                                {candidate?.name ?? attempt.candidateName}
                              </p>
                              <p className="text-2xs text-slate-400">
                                {candidate?.number ?? attempt.candidateGroup}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          {attempt.packageName}
                        </td>
                        <td className="px-4 py-3.5 font-semibold">
                          #{attempt.attemptNumber}
                        </td>
                        <td className="px-4 py-3.5 font-bold tabular-nums">
                          {attempt.pipScore.toFixed(0)}
                        </td>
                        <td className="px-4 py-3.5 font-bold tabular-nums">
                          {attempt.tiuScoreScaled.toFixed(0)}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge
                            tone={
                              attempt.pipStatus === "passed" && attempt.tiuStatus === "passed"
                                ? "success"
                                : attempt.pipStatus !== "passed" && attempt.tiuStatus !== "passed"
                                  ? "danger"
                                  : "warning"
                            }
                            className="font-bold whitespace-nowrap"
                          >
                            {attempt.pipStatus === "passed" && attempt.tiuStatus === "passed"
                              ? "Lolos Tahap 2 & 3"
                              : attempt.pipStatus !== "passed" && attempt.tiuStatus !== "passed"
                                ? "Remedial Tahap 2 & 3"
                                : attempt.pipStatus !== "passed"
                                  ? "Remedial Tahap 2 (PIP)"
                                  : "Remedial Tahap 3 (TIU)"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right text-slate-500">
                          {new Date(
                            attempt.finalizedAt.replace(" ", "T"),
                          ).toLocaleString("id-ID")}
                        </td>
                        {(currentUser.role === "admin" ||
                          currentUser.role === "coach") && (
                          <td className="px-5 py-3.5">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingAttempt(attempt)}
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
                                title="Perbarui nilai CAT"
                                aria-label={`Perbarui hasil CAT ${attempt.candidateName}`}
                              >
                                <Edit3 className="size-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Hapus riwayat CAT percobaan #${attempt.attemptNumber} milik ${attempt.candidateName}?`,
                                    )
                                  ) {
                                    deleteCatTryoutAttempt(attempt.id)
                                  }
                                }}
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                                title="Hapus riwayat CAT"
                                aria-label={`Hapus riwayat CAT ${attempt.candidateName}`}
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                {attempts.filter(
                  (attempt) =>
                    currentUser.role !== "candidate" ||
                    attempt.candidateId === currentUser.candidateId,
                ).length === 0 && (
                  <tr>
                    <td
                      colSpan={currentUser.role === "candidate" ? 7 : 8}
                      className="py-12 text-center text-sm text-slate-500"
                    >
                      Belum ada riwayat CAT yang tersimpan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {editingAttempt &&
        (currentUser.role === "admin" || currentUser.role === "coach") && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setEditingAttempt(null)
            }}
          >
            <form
              onSubmit={handleSaveAttemptEdit}
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            >
              <div className="mb-5">
                <h3 className="font-display text-lg font-bold text-slate-950">
                  Perbarui hasil CAT
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {editingAttempt.candidateName} · Percobaan #
                  {editingAttempt.attemptNumber}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Nilai PIP (0–100)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    required
                    value={editingAttempt.pipScore}
                    onChange={(event) =>
                      setEditingAttempt({
                        ...editingAttempt,
                        pipScore: Number(event.target.value),
                      })
                    }
                    className="h-10 rounded-xl border border-slate-200 px-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Nilai TIU (0–100)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    required
                    value={editingAttempt.tiuScoreScaled}
                    onChange={(event) =>
                      setEditingAttempt({
                        ...editingAttempt,
                        tiuScoreScaled: Number(event.target.value),
                      })
                    }
                    className="h-10 rounded-xl border border-slate-200 px-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingAttempt(null)}
                >
                  Batal
                </Button>
                <Button type="submit">
                  <Check className="size-4" /> Simpan perubahan
                </Button>
              </div>
            </form>
          </div>
        )}

      {/* ===================================================================== */}
      {/* TAB 5: PENGATURAN PAKET & KEBIJAKAN ADMINISTRATOR (PRD Section 4 & 5) */}
      {/* ===================================================================== */}
      {activeTab === "settings" && (
        <Card className="p-6 border-slate-200">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-800">
              <Settings2 className="size-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-slate-950">
                Konfigurasi Paket Tryout CAT (PRD 1.1)
              </h3>
              <p className="text-xs text-slate-500">
                Sesuaikan durasi timer, bobot passing grade, dan kebijakan
                pengacakan butir soal.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="grid gap-4">
              <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                Nama Paket Tryout
                <Input
                  value={packageConfig.packageName}
                  onChange={(e) =>
                    setPackageConfig((p) => ({
                      ...p,
                      packageName: e.target.value,
                    }))
                  }
                  className="!text-xs"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                  Durasi Sesi 1 (PIP)
                  <select
                    value={packageConfig.pipDurationSec / 60}
                    onChange={(e) =>
                      setPackageConfig((p) => ({
                        ...p,
                        pipDurationSec: Number(e.target.value) * 60,
                      }))
                    }
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-red-500"
                  >
                    <option value={15}>15 Menit (Kilat)</option>
                    <option value={30}>30 Menit</option>
                    <option value={45}>45 Menit (Standar BPIP)</option>
                    <option value={60}>60 Menit</option>
                    <option value={75}>75 Menit</option>
                    <option value={90}>90 Menit</option>
                  </select>
                </label>

                <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                  Passing Grade PIP
                  <Input
                    type="number"
                    value={packageConfig.pipPassingGrade}
                    onChange={(e) =>
                      setPackageConfig((p) => ({
                        ...p,
                        pipPassingGrade: Number(e.target.value),
                      }))
                    }
                    className="!text-xs"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                  Durasi Sesi 2 (TIU)
                  <select
                    value={packageConfig.tiuDurationSec / 60}
                    onChange={(e) =>
                      setPackageConfig((p) => ({
                        ...p,
                        tiuDurationSec: Number(e.target.value) * 60,
                      }))
                    }
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-purple-500"
                  >
                    <option value={15}>15 Menit (Kilat)</option>
                    <option value={20}>20 Menit</option>
                    <option value={30}>30 Menit (Standar BPIP)</option>
                    <option value={45}>45 Menit</option>
                    <option value={60}>60 Menit</option>
                  </select>
                </label>

                <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                  Passing Grade TIU
                  <Input
                    type="number"
                    value={packageConfig.tiuPassingGrade}
                    onChange={(e) =>
                      setPackageConfig((p) => ({
                        ...p,
                        tiuPassingGrade: Number(e.target.value),
                      }))
                    }
                    className="!text-xs"
                  />
                </label>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Kebijakan Ujian &amp; Pengacakan
                </h4>

                <label className="flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer">
                  <span>Acak Urutan Soal per Percobaan</span>
                  <input
                    type="checkbox"
                    checked={packageConfig.shuffleQuestions}
                    onChange={(e) =>
                      setPackageConfig((p) => ({
                        ...p,
                        shuffleQuestions: e.target.checked,
                      }))
                    }
                    className="size-4 accent-red-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <div>
                    <span>Batas Maksimum Percobaan Santri</span>
                    <p className="text-2xs font-normal text-slate-500">
                      Setel 0 untuk mode Bebas / Tanpa Batas (Unlimited)
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={packageConfig.maxAttempts}
                      onChange={(e) =>
                        setPackageConfig((p) => ({
                          ...p,
                          maxAttempts: Math.max(0, Number(e.target.value)),
                        }))
                      }
                      className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs text-right font-bold"
                    />
                    <span className="text-2xs font-semibold text-slate-500">
                      {packageConfig.maxAttempts === 0 ? "Bebas" : "kali"}
                    </span>
                  </div>
                </label>

                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                    <Lock className="size-3.5 text-slate-500" />
                    <span>Exam Browser &amp; Anti-Kecurangan</span>
                  </div>

                  <label className="flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer">
                    <div>
                      <span>Kunci Layar Penuh (Exam Browser Mode)</span>
                      <p className="text-2xs font-normal text-slate-500">
                        Isolasi layar ujian, sembunyikan navigasi luar &amp; cegah pindah tab
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(packageConfig.examBrowserLock)}
                      onChange={(e) =>
                        setPackageConfig((p) => ({
                          ...p,
                          examBrowserLock: e.target.checked,
                        }))
                      }
                      className="size-4 accent-red-600 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <div>
                      <span>Toleransi Pelanggaran Maksimal</span>
                      <p className="text-2xs font-normal text-slate-500">
                        Otomatis kumpulkan ujian jika keluar fullscreen / ganti tab
                      </p>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={packageConfig.maxViolations || 3}
                      onChange={(e) =>
                        setPackageConfig((p) => ({
                          ...p,
                          maxViolations: Math.max(1, Number(e.target.value)),
                        }))
                      }
                      className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs text-right font-bold"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-600 leading-relaxed space-y-1.5">
                <p className="font-bold text-slate-900">
                  Ketentuan Rumus Penilaian (PRD 4.3):
                </p>
                <p>
                  &bull; Sesi PIP: 50 soal, Benar +2, Salah/Kosong 0 &rarr; Maks
                  100.
                </p>
                <p>
                  &bull; Sesi TIU: 50 soal, Benar +1, Salah/Kosong 0 &rarr;
                  Mentah Maks 50 &rarr; Skala 100: Skor Mentah &times; 2.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* MODAL: PIP IMMEDIATE RESULT SCORECARD */}
      {/* ===================================================================== */}
      {showPipResultModal && (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6 sm:p-7 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`grid size-12 place-items-center rounded-2xl ${
                    currentPipResults.passed
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  <GraduationCap className="size-6" />
                </div>
                <div>
                  <Badge
                    tone={currentPipResults.passed ? "success" : "danger"}
                    className="text-2xs font-extrabold uppercase tracking-wider"
                  >
                    {currentPipResults.passed
                      ? "Lolos Passing Grade"
                      : "Di Bawah Passing Grade"}
                  </Badge>
                  <h3 className="font-display text-lg font-black text-white mt-0.5">
                    Hasil Sesi 1: CAT PIP
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPipResultModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* BIG SCORE DISPLAY */}
            <div className="my-6 rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center">
              <p className="text-2xs font-bold uppercase tracking-wider text-slate-400">
                Nilai Sesi PIP (Pancasila &amp; Wawasan Kebangsaan)
              </p>
              <div className="mt-2 flex items-baseline justify-center gap-2">
                <span className="font-display text-5xl sm:text-6xl font-black text-amber-400">
                  {currentPipResults.score}
                </span>
                <span className="text-xl font-bold text-slate-500">/ 100</span>
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-300">
                Passing Grade Minimal: {packageConfig.pipPassingGrade} / 100
              </p>
            </div>

            {/* BREAKDOWN METRICS */}
            <div className="grid grid-cols-2 gap-3 text-center text-xs">
              <div className="rounded-xl bg-slate-800/80 p-3.5 border border-slate-700/60">
                <p className="text-2xs font-bold uppercase text-slate-400">
                  Jawaban Benar
                </p>
                <p className="mt-1 text-2xl font-black text-emerald-400">
                  {currentPipResults.correct}{" "}
                  <span className="text-xs font-normal text-slate-400">
                    / 50
                  </span>
                </p>
                <p className="mt-0.5 text-3xs text-emerald-300 font-semibold">
                  &times; 2 poin per butir
                </p>
              </div>
              <div className="rounded-xl bg-slate-800/80 p-3.5 border border-slate-700/60">
                <p className="text-2xs font-bold uppercase text-slate-400">
                  Salah / Kosong
                </p>
                <p className="mt-1 text-2xl font-black text-slate-300">
                  {50 - currentPipResults.correct}{" "}
                  <span className="text-xs font-normal text-slate-400">
                    / 50
                  </span>
                </p>
                <p className="mt-0.5 text-3xs text-slate-400 font-semibold">
                  0 poin
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 p-3.5 text-xs text-emerald-200 leading-relaxed">
              <p className="font-bold flex items-center gap-1.5 text-emerald-300">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                Nilai PIP Sudah Tersimpan Permanen
              </p>
              <p className="mt-0.5 text-2xs text-emerald-300/80">
                Nilai ini telah tersimpan di profil Anda. Anda dapat melanjutkan
                sekarang ke Sesi 2 (TIU) atau menandai pembahasan butir soal.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowPipResultModal(false)}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-bold transition cursor-pointer"
              >
                <BookOpenCheck className="size-4 shrink-0" />
                <span>Tinjau Pembahasan Soal</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPipResultModal(false)
                  startTiuSession()
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition cursor-pointer"
              >
                <Play className="size-4 shrink-0 fill-current" />
                <span>Lanjut ke Sesi 2 (TIU)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: TIU & FINAL TRYOUT RESULT SCORECARD */}
      {/* ===================================================================== */}
      {showTiuResultModal && (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6 sm:p-7 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`grid size-12 place-items-center rounded-2xl ${
                    currentPipResults.passed && currentTiuResults.passed
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  <Target className="size-6" />
                </div>
                <div>
                  <Badge
                    tone={
                      currentPipResults.passed && currentTiuResults.passed
                        ? "success"
                        : "warning"
                    }
                    className="text-2xs font-extrabold uppercase tracking-wider"
                  >
                    {currentPipResults.passed && currentTiuResults.passed
                      ? "Lolos Kedua Sesi BPIP"
                      : "Tryout Selesai"}
                  </Badge>
                  <h3 className="font-display text-lg font-black text-white mt-0.5">
                    Hasil Lengkap Tryout CAT
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTiuResultModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* QUALIFICATION STATUS BANNER */}
            <div
              className={`my-4 rounded-xl border p-4 text-center ${
                currentPipResults.passed && currentTiuResults.passed
                  ? "border-emerald-500/30 bg-emerald-950/40"
                  : !currentPipResults.passed && !currentTiuResults.passed
                    ? "border-rose-500/30 bg-rose-950/40"
                    : "border-amber-500/30 bg-amber-950/40"
              }`}
            >
              <Badge
                tone={
                  currentPipResults.passed && currentTiuResults.passed
                    ? "success"
                    : !currentPipResults.passed && !currentTiuResults.passed
                      ? "danger"
                      : "warning"
                }
                className="text-xs font-bold px-3 py-1"
              >
                {currentPipResults.passed && currentTiuResults.passed
                  ? "LOLOS KEDUA TAHAP (TAHAP 2 & 3)"
                  : !currentPipResults.passed && !currentTiuResults.passed
                    ? "REMEDIAL TAHAP 2 & 3"
                    : !currentPipResults.passed
                      ? "REMEDIAL TAHAP 2 (PIP)"
                      : "REMEDIAL TAHAP 3 (TIU)"}
              </Badge>
              <p className="mt-2 text-xs font-medium text-slate-300">
                {currentPipResults.passed && currentTiuResults.passed
                  ? "Selamat! Nilai Anda memenuhi Passing Grade pada Tahap 2 (PIP) dan Tahap 3 (TIU)."
                  : "Masing-masing tahapan dievaluasi secara mandiri sesuai Passing Grade BPIP (≥ 70)."}
              </p>
            </div>

            {/* TWO SESSIONS BREAKDOWN */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-slate-800/80 p-3.5 border border-slate-700/60">
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-bold text-slate-300">
                    TAHAP 2: PIP
                  </span>
                  <Badge tone={currentPipResults.passed ? "success" : "danger"}>
                    {currentPipResults.passed ? "Lolos (≥70)" : "Remedial"}
                  </Badge>
                </div>
                <p className="mt-2 text-2xl font-black text-white">
                  {currentPipResults.score}{" "}
                  <span className="text-xs font-normal text-slate-400">
                    / 100
                  </span>
                </p>
                <p className="mt-1 text-3xs text-slate-400">
                  {currentPipResults.correct} / 50 Benar (PG:{" "}
                  {packageConfig.pipPassingGrade})
                </p>
              </div>

              <div className="rounded-xl bg-slate-800/80 p-3.5 border border-slate-700/60">
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-bold text-slate-400">
                    TAHAP 3: TIU
                  </span>
                  <Badge tone={currentTiuResults.passed ? "success" : "danger"}>
                    {currentTiuResults.passed ? "Lolos (≥70)" : "Remedial"}
                  </Badge>
                </div>
                <p className="mt-2 text-2xl font-black text-white">
                  {currentTiuResults.scaled}{" "}
                  <span className="text-xs font-normal text-slate-400">
                    / 100
                  </span>
                </p>
                <p className="mt-1 text-3xs text-slate-400">
                  Skor Mentah: {currentTiuResults.raw} / 50 (PG:{" "}
                  {packageConfig.tiuPassingGrade})
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 p-3.5 text-xs text-emerald-200 leading-relaxed">
              <p className="font-bold flex items-center gap-1.5 text-emerald-300">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                Seluruh Nilai Tersimpan di Profil Siswa
              </p>
              <p className="mt-0.5 text-2xs text-emerald-300/80">
                Data tryout telah tersinkron ke daftar kandidat, grafik
                perkembangan, dan riwayat seleksi.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowTiuResultModal(false)}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-bold transition cursor-pointer"
              >
                <BookOpenCheck className="size-4 shrink-0" />
                <span>Lihat Laporan Evaluasi &amp; Pembahasan Lengkap</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 0: EXAM BROWSER VIOLATION DIALOG */}
      {/* ===================================================================== */}
      {showViolationModal && (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border-2 border-red-500/40 bg-slate-900 p-6 text-white shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30">
                <ShieldAlert className="size-6" />
              </div>
              <div>
                <span className="rounded-md bg-red-500/20 px-2 py-0.5 text-2xs font-bold uppercase tracking-wider text-red-400 border border-red-500/30">
                  Protokol Integritas CAT
                </span>
                <h3 className="font-display text-base font-bold text-white mt-0.5">
                  Peringatan Exam Browser!
                </h3>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-slate-800/80 p-3.5 border border-slate-700/80">
              <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400">
                Aktivitas Terdeteksi:
              </p>
              <p className="mt-1 text-xs font-bold text-red-300">
                {violationReason || "Keluar dari lingkungan ujian terisolasi"}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-red-950/40 p-3 border border-red-900/50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-red-400" />
                <span className="text-xs text-red-200">
                  Total Pelanggaran:
                </span>
              </div>
              <span className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-black text-white">
                {violationCount} / {packageConfig.maxViolations || 3}
              </span>
            </div>

            <p className="mt-4 text-xs text-slate-400 leading-relaxed">
              {violationCount >= (packageConfig.maxViolations || 3) ? (
                <span className="text-red-400 font-semibold">
                  Batas toleransi pelanggaran telah habis! Sistem secara otomatis menyelesaikan dan merekam hasil ujian Anda sekarang...
                </span>
              ) : (
                <span>
                  Anda harus tetap berada dalam mode <strong>Layar Penuh</strong> dan tidak diperkenankan membuka tab lain, aplikasi lain, atau beralih jendela. Pelanggaran berulang akan mengakibatkan ujian dihentikan otomatis.
                </span>
              )}
            </p>

            <div className="mt-6 flex items-center justify-end">
              {violationCount < (packageConfig.maxViolations || 3) ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowViolationModal(false)
                    enterFullscreen()
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition cursor-pointer"
                >
                  <Maximize2 className="size-4 shrink-0" />
                  <span>Kembali ke Ujian &amp; Layar Penuh</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                  <RefreshCw className="size-4 animate-spin" />
                  <span>Memproses finalisasi otomatis...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: SUBMIT CONFIRMATION (PRD Section 6.2) */}
      {/* ===================================================================== */}
      {showConfirmSubmitModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
                <AlertCircle className="size-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-slate-950">
                  Konfirmasi Selesaikan{" "}
                  {sessionPhase === "pip" ? "Sesi 1 (PIP)" : "Sesi 2 (TIU)"}
                </h3>
                <p className="text-xs text-slate-500">
                  Periksa kembali rekapitulasi jawaban sebelum memfinalisasi
                  sesi ini.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-100">
                <p className="text-2xs font-bold uppercase text-emerald-800">
                  Dijawab
                </p>
                <p className="mt-1 text-xl font-black text-emerald-700">
                  {answeredCount}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3 border border-amber-100">
                <p className="text-2xs font-bold uppercase text-amber-800">
                  Ragu-ragu
                </p>
                <p className="mt-1 text-xl font-black text-amber-700">
                  {flaggedCount}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <p className="text-2xs font-bold uppercase text-slate-600">
                  Kosong
                </p>
                <p className="mt-1 text-xl font-black text-slate-700">
                  {unansweredCount}
                </p>
              </div>
            </div>

            {unansweredCount > 0 && (
              <p className="mt-4 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 leading-relaxed font-semibold">
                Perhatian: Masih ada {unansweredCount} butir soal yang belum
                Anda jawab. Soal kosong bernilai 0.
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <Button
                variant="secondary"
                onClick={() => setShowConfirmSubmitModal(false)}
                className="!text-xs"
              >
                Kembali ke Ujian
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (sessionPhase === "pip") finalizePipSession()
                  else finalizeTiuSession()
                }}
                className="!text-xs font-bold"
              >
                Ya, Selesaikan &amp; Finalisasi
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: ADD / EDIT QUESTION FORM */}
      {/* ===================================================================== */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-2xs font-bold uppercase tracking-wider text-red-600">
                  Bank Soal CAT BPIP
                </p>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  {editingQuestionId
                    ? "Edit Butir Soal"
                    : "Tambah Butir Soal Baru"}
                </h3>
              </div>
              <Button
                variant="ghost"
                className="!p-1.5"
                onClick={() => setShowQuestionModal(false)}
              >
                <X className="size-5" />
              </Button>
            </div>

            <form onSubmit={handleSaveQuestionForm} className="mt-4 grid gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                  Jenis Tes CAT
                  <select
                    value={qForm.type}
                    onChange={(e) => {
                      const t = e.target.value as "pip" | "tiu"
                      setQForm((prev) => ({
                        ...prev,
                        type: t,
                        category:
                          t === "tiu" ? tiuCategories[0] : pipCategories[0],
                      }))
                    }}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-red-500"
                  >
                    <option value="pip">PIP (Pancasila &amp; TWK)</option>
                    <option value="tiu">TIU (Intelegensia Umum)</option>
                  </select>
                </label>

                <label className="grid gap-1.5 text-xs font-bold text-slate-700 sm:col-span-2">
                  Kategori Domain / Submateri
                  <select
                    value={qForm.category}
                    onChange={(e) =>
                      setQForm((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-red-500"
                  >
                    {(qForm.type === "pip" ? pipCategories : tiuCategories).map(
                      (c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>

              <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                Pertanyaan Soal
                <textarea
                  rows={3}
                  value={qForm.question}
                  onChange={(e) =>
                    setQForm((prev) => ({ ...prev, question: e.target.value }))
                  }
                  placeholder="Ketikkan narasi pertanyaan soal secara lengkap..."
                  className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed outline-none focus:border-red-500"
                />
              </label>

              <div className="grid gap-2">
                <span className="text-xs font-bold text-slate-700">
                  Pilihan Jawaban (A s.d. E) &amp; Kunci Benar:
                </span>
                {([
                  "optionA",
                  "optionB",
                  "optionC",
                  "optionD",
                  "optionE",
                ] as const).map((field, idx) => {
                  const letter = ["A", "B", "C", "D", "E"][idx]
                  const isCorrect = qForm.correctIndex === idx
                  return (
                    <div key={field} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setQForm((prev) => ({ ...prev, correctIndex: idx }))
                        }
                        className={`grid size-8 shrink-0 place-items-center rounded-lg text-xs font-black transition ${
                          isCorrect
                            ? "bg-emerald-600 text-white shadow-2xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                        title={`Jadikan ${letter} sebagai Kunci Jawaban Benar`}
                      >
                        {letter}
                      </button>
                      <Input
                        value={qForm[field]}
                        onChange={(e) =>
                          setQForm((prev) => ({
                            ...prev,
                            [field]: e.target.value,
                          }))
                        }
                        placeholder={`Teks pilihan ${letter}...`}
                        className={`!text-xs flex-1 ${
                          isCorrect
                            ? "!border-emerald-400 !bg-emerald-50/40"
                            : ""
                        }`}
                      />
                    </div>
                  )
                })}
              </div>

              <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                Penjelasan &amp; Pembahasan
                <textarea
                  rows={2}
                  value={qForm.explanation}
                  onChange={(e) =>
                    setQForm((prev) => ({
                      ...prev,
                      explanation: e.target.value,
                    }))
                  }
                  placeholder="Rasionalisasi kunci jawaban dan landasan aturan/perhitungannya..."
                  className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed outline-none focus:border-red-500"
                />
              </label>

              <div className="mt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowQuestionModal(false)}
                  className="!text-xs"
                >
                  Batal
                </Button>
                <Button type="submit" className="!text-xs font-bold">
                  Simpan Butir Soal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

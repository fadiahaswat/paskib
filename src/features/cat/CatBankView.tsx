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
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Flag,
  GraduationCap,
  HeartPulse,
  HelpCircle,
  History,
  Info,
  KeyRound,
  Layers,
  Lock,
  LogOut,
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
  Unlock,
  Upload,
  UserCheck,
  UserRoundCheck,
  UsersRound,
  X,
  XCircle,
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
import { anamnesisItems } from "../../data/selectionGuide"
import { CAT_KIOSK_EXIT_TOKEN_RECORD_KEY } from "../../domain/cloudSyncMerge"
import type {
  Candidate,
  CatQuestion,
  CatTryoutAttempt,
  Session,
  SessionRecord,
} from "../../domain/selection"
import { pullStateFromGoogleSheet } from "../../lib/googleSheetSync"
import {
  OFFICIAL_ISHIHARA_PLATES,
  drawOfficialIshiharaPlate,
  evaluateIshiharaResults,
  type IshiharaPlateAnswerItem,
} from "../ishihara/ishiharaEngine"
import type { IshiharaScreeningResult } from "../ishihara/types"
import {
  ANAMNESIS_QUESTIONS_21,
  evaluateAnamnesisAnswers,
  saveAnamnesisLocalHistory,
} from "../medical/anamnesisUtils"

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
type SessionPhase =
  | "idle"
  | "pip"
  | "pip-anamnesis"
  | "pip-final"
  | "tiu"
  | "tiu-ishihara"
  | "completed"

export default function CatBankView() {
  const {
    questions,
    candidates,
    sessions,
    records,
    currentUser,
    setSessions,
    setRecords,
    saveToCloud,
    saveIshiharaScreeningResult,
    catTryoutAttempts: attempts,
    saveCatTryoutAttempt,
    deleteCatTryoutAttempt,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    restoreStandardQuestions,
    catExitToken,
    updateCatExitToken,
    googleSheetUrl,
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
  // Snapshot terkunci dari profil kandidat yang sedang mengikuti sesi CAT aktif
  // agar sinkronisasi latar belakang dari tab/pengguna lain tidak pernah memutus identitas peserta.
  const lockedCandidateRef = useRef<Candidate | null>(null)

  const selectedCandidate = useMemo(() => {
    const targetId =
      currentUser.role === "candidate"
        ? currentUser.candidateId
        : isCoachSelfTest
          ? "coach-self"
          : selectedCandidateId

    if (isCoachSelfTest) {
      return coachSelfCandidate
    }

    const found = targetId
      ? (candidates.find((c) => c.id === targetId) ?? null)
      : null
    if (found) {
      lockedCandidateRef.current = found
      return found
    }

    if (
      lockedCandidateRef.current &&
      targetId &&
      lockedCandidateRef.current.id === targetId
    ) {
      return lockedCandidateRef.current
    }

    if (targetId && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(`paska-cat-active-session-${targetId}`)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (
            parsed?.candidateSnapshot &&
            parsed.candidateSnapshot.id === targetId
          ) {
            lockedCandidateRef.current = parsed.candidateSnapshot as Candidate
            return lockedCandidateRef.current
          }
        }
      } catch {}
    }

    return null
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

  // EXAM BROWSER LOCKDOWN, CONTINUOUS KIOSK & ADMIN EXIT TOKEN
  const [isFullscreen, setIsFullscreen] = useState(() => {
    if (typeof document === "undefined") return false
    return Boolean(
      document.fullscreenElement || (document as any).webkitFullscreenElement,
    )
  })
  const [violationCount, setViolationCount] = useState(0)
  const [showViolationModal, setShowViolationModal] = useState(false)
  const [violationReason, setViolationReason] = useState("")
  const [showExitTokenModal, setShowExitTokenModal] = useState(false)
  const [exitTokenPurpose, setExitTokenPurpose] = useState<
    "exit" | "discard-pending" | "violation-lock" | "complete-exit"
  >("exit")
  const [exitTokenInput, setExitTokenInput] = useState("")
  const [exitTokenError, setExitTokenError] = useState("")
  const [isVerifyingExitToken, setIsVerifyingExitToken] = useState(false)
  const [draftAdminToken, setDraftAdminToken] = useState(catExitToken)

  useEffect(() => {
    setDraftAdminToken(catExitToken)
  }, [catExitToken])

  // GATE PRA-RILIS NILAI: SURVEY 21 ANAMNESA & TES BUTA WARNA (SELURUH NILAI BARU KELUAR DI AKHIR)
  const [gateAnamnesisAnswers, setGateAnamnesisAnswers] = useState<
    Record<string, "yes" | "no">
  >({})
  const gateAnamnesisEval = useMemo(
    () => evaluateAnamnesisAnswers(gateAnamnesisAnswers),
    [gateAnamnesisAnswers],
  )
  const gateAnamnesisAllAnswered =
    gateAnamnesisEval.answeredCount >= ANAMNESIS_QUESTIONS_21.length

  const [gateIshiharaStarted, setGateIshiharaStarted] = useState(false)
  const [gateIshiharaFinished, setGateIshiharaFinished] = useState(false)
  const [gateIshiharaIndex, setGateIshiharaIndex] = useState(0)
  const [gateIshiharaResults, setGateIshiharaResults] = useState<
    IshiharaPlateAnswerItem[]
  >([])
  const [gateIshiharaInput, setGateIshiharaInput] = useState("")
  const gateIshiharaCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const gateIshiharaPlateStartRef = useRef<number>(Date.now())
  const gateIshiharaStats = useMemo(
    () => evaluateIshiharaResults(gateIshiharaResults),
    [gateIshiharaResults],
  )

  const isKioskSessionActive =
    sessionPhase === "pip" ||
    sessionPhase === "pip-anamnesis" ||
    sessionPhase === "pip-final" ||
    sessionPhase === "tiu" ||
    sessionPhase === "tiu-ishihara" ||
    sessionPhase === "completed"

  // Kandidat selalu terkunci penuh dalam Kiosk dari awal PIP hingga selesai lihat pembahasan & masukkan Token Admin
  const isKioskLocked =
    isKioskSessionActive &&
    (Boolean(packageConfig.examBrowserLock) || currentUser.role === "candidate")

  const maxAllowedViolations = packageConfig.maxViolations || 3
  const isViolationLocked =
    isKioskLocked && violationCount >= maxAllowedViolations

  const supportsFullscreenApi = useMemo(() => {
    if (typeof document === "undefined") return false
    const doc = document as any
    const el = document.documentElement as any
    return Boolean(
      (document.fullscreenEnabled || doc.webkitFullscreenEnabled) &&
        (el?.requestFullscreen || el?.webkitRequestFullscreen),
    )
  }, [])

  const enterFullscreen = useCallback(() => {
    try {
      const el = document.documentElement as any
      if (
        !document.fullscreenElement &&
        !(document as any).webkitFullscreenElement
      ) {
        if (el.requestFullscreen) {
          el.requestFullscreen().catch(() => {})
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen()
        }
      }
    } catch {}
  }, [])

  const exitFullscreen = useCallback(() => {
    try {
      if (
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement
      ) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {})
        } else if ((document as any).webkitExitFullscreen) {
          ;(document as any).webkitExitFullscreen()
        }
      }
    } catch {}
  }, [])

  // Keep fullscreen state synchronized even outside active listeners
  useEffect(() => {
    const syncFs = () => {
      setIsFullscreen(
        Boolean(
          document.fullscreenElement ||
            (document as any).webkitFullscreenElement,
        ),
      )
    }
    document.addEventListener("fullscreenchange", syncFs)
    document.addEventListener("webkitfullscreenchange", syncFs)
    return () => {
      document.removeEventListener("fullscreenchange", syncFs)
      document.removeEventListener("webkitfullscreenchange", syncFs)
    }
  }, [])

  // Screen Wake Lock + Pull-to-Refresh / Overscroll Lockdown while Kiosk is active
  useEffect(() => {
    if (!isKioskLocked) return
    const prevBodyOverflow = document.body.style.overflow
    const prevBodyOverscroll = document.body.style.overscrollBehavior
    const prevHtmlOverscroll =
      document.documentElement.style.overscrollBehavior

    document.body.style.overflow = "hidden"
    document.body.style.overscrollBehavior = "none"
    document.documentElement.style.overscrollBehavior = "none"

    let wakeLockSentinel: any = null
    const requestWakeLock = async () => {
      try {
        if (
          "wakeLock" in navigator &&
          document.visibilityState === "visible"
        ) {
          wakeLockSentinel = await (navigator as any).wakeLock.request("screen")
        }
      } catch {}
    }
    void requestWakeLock()

    const handleVisWake = () => {
      if (document.visibilityState === "visible") {
        void requestWakeLock()
      }
    }
    document.addEventListener("visibilitychange", handleVisWake)

    return () => {
      document.body.style.overflow = prevBodyOverflow
      document.body.style.overscrollBehavior = prevBodyOverscroll
      document.documentElement.style.overscrollBehavior = prevHtmlOverscroll
      document.removeEventListener("visibilitychange", handleVisWake)
      try {
        wakeLockSentinel?.release?.()
      } catch {}
    }
  }, [isKioskLocked])

  const questionsLookup = useMemo(() => {
    const map = new Map<string, CatQuestion>()
    for (const q of questions) map.set(q.id, q)
    return map
  }, [questions])

  const refreshSavedExamQuestions = useCallback(
    (savedQuestions: CatQuestion[] | undefined): CatQuestion[] => {
      if (!Array.isArray(savedQuestions)) return []
      return savedQuestions.map((sq) => {
        const fresh = questionsLookup.get(sq.id)
        if (
          fresh &&
          fresh.correctIndex === sq.correctIndex &&
          fresh.options.length === 5
        ) {
          return {
            ...sq,
            question: fresh.question,
            options: fresh.options,
            explanation: fresh.explanation,
          }
        }
        return sq
      })
    },
    [questionsLookup],
  )

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

  // Continuously autosave active exam session to localStorage (termasuk layar evaluasi & pembahasan hingga Token Admin dimasukkan)
  useEffect(() => {
    if (
      sessionPhase === "pip" ||
      sessionPhase === "pip-anamnesis" ||
      sessionPhase === "pip-final" ||
      sessionPhase === "tiu" ||
      sessionPhase === "tiu-ishihara" ||
      (sessionPhase === "completed" && isKioskLocked)
    ) {
      try {
        const payload = {
          sessionPhase,
          selectedCandidateId,
          candidateSnapshot:
            selectedCandidate && selectedCandidate.id !== "coach-self"
              ? selectedCandidate
              : lockedCandidateRef.current,
          pipExamQuestions,
          tiuExamQuestions,
          pipCurrentIdx,
          tiuCurrentIdx,
          pipAnswers,
          tiuAnswers,
          pipFlagged,
          tiuFlagged,
          gateAnamnesisAnswers,
          gateIshiharaStarted,
          gateIshiharaFinished,
          gateIshiharaIndex,
          gateIshiharaResults,
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
    } else if (sessionPhase === "completed" && !isKioskLocked) {
      localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY)
      setHasPendingSession(false)
    }
  }, [
    sessionPhase,
    isKioskLocked,
    ACTIVE_SESSION_STORAGE_KEY,
    selectedCandidateId,
    selectedCandidate,
    pipExamQuestions,
    tiuExamQuestions,
    pipCurrentIdx,
    tiuCurrentIdx,
    pipAnswers,
    tiuAnswers,
    pipFlagged,
    tiuFlagged,
    gateAnamnesisAnswers,
    gateIshiharaStarted,
    gateIshiharaFinished,
    gateIshiharaIndex,
    gateIshiharaResults,
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

        if (sessionData.candidateSnapshot?.id) {
          lockedCandidateRef.current = sessionData.candidateSnapshot
        }
        if (sessionData.selectedCandidateId)
          setSelectedCandidateId(sessionData.selectedCandidateId)
        if (sessionData.pipExamQuestions) {
          setPipExamQuestions(
            refreshSavedExamQuestions(sessionData.pipExamQuestions),
          )
        }
        if (sessionData.tiuExamQuestions) {
          setTiuExamQuestions(
            refreshSavedExamQuestions(sessionData.tiuExamQuestions),
          )
        }
        if (sessionData.pipAnswers) setPipAnswers(sessionData.pipAnswers)
        if (sessionData.tiuAnswers) setTiuAnswers(sessionData.tiuAnswers)
        if (sessionData.pipFlagged) setPipFlagged(sessionData.pipFlagged)
        if (sessionData.tiuFlagged) setTiuFlagged(sessionData.tiuFlagged)
        if (sessionData.gateAnamnesisAnswers)
          setGateAnamnesisAnswers(sessionData.gateAnamnesisAnswers)
        if (typeof sessionData.gateIshiharaStarted === "boolean")
          setGateIshiharaStarted(sessionData.gateIshiharaStarted)
        if (typeof sessionData.gateIshiharaFinished === "boolean")
          setGateIshiharaFinished(sessionData.gateIshiharaFinished)
        if (typeof sessionData.gateIshiharaIndex === "number")
          setGateIshiharaIndex(sessionData.gateIshiharaIndex)
        if (Array.isArray(sessionData.gateIshiharaResults))
          setGateIshiharaResults(sessionData.gateIshiharaResults)
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
          const violationsCount =
            typeof sessionData.violationCount === "number"
              ? sessionData.violationCount
              : 0
          setIsTimerRunning(
            remSec > 0 && violationsCount < maxAllowedViolations,
          )
        } else {
          setIsTimerRunning(false)
        }

        setSessionPhase(sessionData.sessionPhase)
        setHasPendingSession(false)
        showToast(
          sessionData.sessionPhase === "pip-anamnesis"
            ? "Silakan selesaikan & simpan Survey 21 Anamnesa Kesehatan sebelum lanjut ke Sesi 2 (TIU)."
            : sessionData.sessionPhase === "tiu-ishihara"
              ? "Silakan selesaikan Tes Buta Warna untuk menampilkan seluruh nilai & pembahasan."
              : sessionData.sessionPhase === "pip-final"
                ? "Sesi 1 & Anamnesa tersimpan. Silakan lanjutkan Sesi 2 (TIU)."
                : sessionData.sessionPhase === "completed"
                  ? "Seluruh nilai & pembahasan ditampilkan. Masukkan Token Admin untuk keluar dari Kiosk."
                  : "Sesi Safe Exam Browser CAT berhasil dipulihkan otomatis.",
          "info",
        )
      } catch {}
    },
    [
      ACTIVE_SESSION_STORAGE_KEY,
      maxAllowedViolations,
      refreshSavedExamQuestions,
      showToast,
    ],
  )

  const openAdminTokenModal = useCallback(
    (
      purpose:
        | "exit"
        | "discard-pending"
        | "violation-lock"
        | "complete-exit" = "exit",
    ) => {
      setExitTokenPurpose(purpose)
      setExitTokenInput("")
      setExitTokenError("")
      setShowExitTokenModal(true)
    },
    [],
  )

  const verifyAdminTokenValue = useCallback(
    async (inputRaw: string): Promise<boolean> => {
      const cleaned = inputRaw.trim().toUpperCase()
      if (!cleaned) return false
      if (cleaned === catExitToken.trim().toUpperCase()) {
        return true
      }
      // Jika tidak cocok secara lokal, tarik token terbaru dari Google Sheet secara real-time
      if (googleSheetUrl && navigator.onLine) {
        try {
          const res = await pullStateFromGoogleSheet(googleSheetUrl)
          const cloudToken =
            res.ok
              ? (
                  res.data?.catExitToken ||
                  res.data?.records?.[CAT_KIOSK_EXIT_TOKEN_RECORD_KEY]?.metrics
                    ?.token
                )
                  ?.trim()
                  .toUpperCase()
              : undefined
          if (cloudToken && cleaned === cloudToken) {
            return true
          }
        } catch {}
      }
      return false
    },
    [catExitToken, googleSheetUrl],
  )

  const executeAuthorizedKioskExit = useCallback(
    (detailMessage: string, isCompletedExit = false) => {
      setIsTimerRunning(false)
      localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY)
      setHasPendingSession(false)
      setPendingSessionSummary("")
      setViolationCount(0)
      setShowViolationModal(false)
      setShowPipResultModal(false)
      setShowTiuResultModal(false)
      setShowConfirmSubmitModal(false)
      setShowExitTokenModal(false)
      setGateAnamnesisAnswers({})
      setGateIshiharaStarted(false)
      setGateIshiharaFinished(false)
      setGateIshiharaIndex(0)
      setGateIshiharaResults([])
      setGateIshiharaInput("")
      setExitTokenInput("")
      setExitTokenError("")
      exitFullscreen()
      setSessionPhase("idle")
      logAudit(
        isCompletedExit
          ? "SELESAI_DAN_KELUAR_KIOSK_CAT"
          : "KELUAR_DARURAT_KIOSK_CAT",
        selectedCandidate?.name || currentUser.name,
        detailMessage,
      )
      showToast(
        isCompletedExit
          ? "Token Admin terverifikasi. Mode Safe Exam Browser ditutup — seluruh nilai telah tersimpan."
          : "Keluar dari mode Safe Exam Browser dengan otorisasi Token Admin.",
        isCompletedExit ? "success" : "info",
      )
    },
    [
      ACTIVE_SESSION_STORAGE_KEY,
      exitFullscreen,
      logAudit,
      selectedCandidate?.name,
      currentUser.name,
      showToast,
    ],
  )

  const handleVerifyAdminTokenAction = useCallback(
    async (mode: "exit" | "unlock-continue") => {
      const cleaned = exitTokenInput.trim().toUpperCase()
      if (!cleaned) {
        setExitTokenError("Masukkan Token Admin terlebih dahulu.")
        return
      }
      setIsVerifyingExitToken(true)
      setExitTokenError("")
      try {
        const valid = await verifyAdminTokenValue(cleaned)
        if (!valid) {
          setExitTokenError(
            "Token Admin tidak valid! Hubungi Pengawas / Pelatih.",
          )
          return
        }
        if (mode === "unlock-continue") {
          isSubmittingViolationsRef.current = false
          setViolationCount(0)
          setShowViolationModal(false)
          setShowExitTokenModal(false)
          setExitTokenInput("")
          setExitTokenError("")
          if (
            (sessionPhase === "pip" || sessionPhase === "tiu") &&
            secondsLeft > 0
          ) {
            setIsTimerRunning(true)
          }
          enterFullscreen()
          logAudit(
            "BUKA_KUNCI_PELANGGARAN_KIOSK",
            selectedCandidate?.name || currentUser.name,
            `Pengawas membuka kunci pelanggaran Safe Exam Browser pada fase ${sessionPhase.toUpperCase()}`,
          )
          showToast(
            "Kunci pelanggaran dibuka oleh Admin. Silakan lanjutkan.",
            "success",
          )
        } else {
          const isCompletedExit =
            sessionPhase === "completed" || exitTokenPurpose === "complete-exit"
          executeAuthorizedKioskExit(
            isCompletedExit
              ? "Peserta telah melihat seluruh nilai & pembahasan, lalu keluar dari Kiosk menggunakan Token Admin"
              : `Sesi ${sessionPhase.toUpperCase()} dihentikan menggunakan Token Admin`,
            isCompletedExit,
          )
        }
      } finally {
        setIsVerifyingExitToken(false)
      }
    },
    [
      exitTokenInput,
      verifyAdminTokenValue,
      sessionPhase,
      exitTokenPurpose,
      secondsLeft,
      enterFullscreen,
      logAudit,
      selectedCandidate?.name,
      currentUser.name,
      showToast,
      executeAuthorizedKioskExit,
    ],
  )

  const generateRandomAdminToken = useCallback(() => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    let code = "PK-"
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    setDraftAdminToken(code)
  }, [])

  const discardPendingSession = useCallback(() => {
    if (currentUser.role === "candidate") {
      openAdminTokenModal("discard-pending")
      return
    }
    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY)
    setHasPendingSession(false)
    setPendingSessionSummary("")
    showToast("Sesi tryout yang tertunda telah dibersihkan.", "info")
  }, [ACTIVE_SESSION_STORAGE_KEY, currentUser.role, openAdminTokenModal, showToast])

  // Check saved session on mount or candidate change
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY)
      if (!raw) {
        setHasPendingSession(false)
        return
      }
      const saved = JSON.parse(raw)
      if (!saved || !saved.sessionPhase || saved.sessionPhase === "idle") {
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

      // Untuk kandidat & fase terikat Kiosk (termasuk layar hasil/pembahasan): otomatis pulihkan ke Kiosk!
      if (sessionPhase === "idle") {
        if (
          currentUser.role === "candidate" ||
          saved.sessionPhase === "pip-anamnesis" ||
          saved.sessionPhase === "pip-final" ||
          saved.sessionPhase === "tiu-ishihara" ||
          saved.sessionPhase === "completed"
        ) {
          restoreActiveSession(saved)
        } else {
          setHasPendingSession(true)
          setPendingSessionSummary(
            saved.sessionPhase === "pip"
              ? "Sesi 1 (PIP) sedang berlangsung"
              : saved.sessionPhase === "tiu"
                ? "Sesi 2 (TIU) sedang berlangsung"
                : "Sesi menunggu kelanjutan TIU",
          )
        }
      }
    } catch {}
  }, [
    ACTIVE_SESSION_STORAGE_KEY,
    currentUser.role,
    sessionPhase,
    restoreActiveSession,
  ])

  // Prevent Browser Back / Swipe-Back navigation across PIP -> ANAMNESIS -> TIU -> ISHIHARA -> COMPLETED (until Token Admin exit)
  useEffect(() => {
    if (sessionPhase === "idle" || (sessionPhase === "completed" && !isKioskLocked))
      return

    window.history.pushState({ catSessionActive: sessionPhase }, "")

    const handlePopState = () => {
      window.history.pushState({ catSessionActive: sessionPhase }, "")
      showToast(
        "Safe Exam Browser aktif! Gunakan Token Admin untuk keluar dari Kiosk.",
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
  }, [sessionPhase, isKioskLocked, showToast])

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

  // Review & Explanation Modal / Tab ("all" = 100 soal PIP + TIU sekaligus)
  const [reviewTab, setReviewTab] = useState<"all" | "pip" | "tiu">("all")

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
      const hasPipA = attemptA && ((attemptA.pipAnswers && Object.keys(attemptA.pipAnswers).length > 0) || (typeof attemptA.pipScore === "number" && attemptA.pipScore > 0))
      const hasTiuA = attemptA && ((attemptA.tiuAnswers && Object.keys(attemptA.tiuAnswers).length > 0) || (typeof attemptA.tiuScoreScaled === "number" && attemptA.tiuScoreScaled > 0))
      const hasPipB = attemptB && ((attemptB.pipAnswers && Object.keys(attemptB.pipAnswers).length > 0) || (typeof attemptB.pipScore === "number" && attemptB.pipScore > 0))
      const hasTiuB = attemptB && ((attemptB.tiuAnswers && Object.keys(attemptB.tiuAnswers).length > 0) || (typeof attemptB.tiuScoreScaled === "number" && attemptB.tiuScoreScaled > 0))

      const pipA = (hasPipA ? attemptA?.pipScore : undefined) ?? a.pip ?? -1
      const tiuA = (hasTiuA ? attemptA?.tiuScoreScaled : undefined) ?? a.tiu ?? -1
      const pipB = (hasPipB ? attemptB?.pipScore : undefined) ?? b.pip ?? -1
      const tiuB = (hasTiuB ? attemptB?.tiuScoreScaled : undefined) ?? b.tiu ?? -1

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
    if (!effectiveIsCoachSelf) {
      lockedCandidateRef.current = effectiveCandidate
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
    setGateAnamnesisAnswers({})
    setGateIshiharaStarted(false)
    setGateIshiharaFinished(false)
    setGateIshiharaIndex(0)
    setGateIshiharaResults([])
    setGateIshiharaInput("")
    setSecondsLeft(packageConfig.pipDurationSec)
    setIsTimerRunning(true)
    setSessionPhase("pip")
    setViolationCount(0)
    setShowViolationModal(false)
    if (packageConfig.examBrowserLock || currentUser.role === "candidate") {
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
  // FINALIZE SESSION 1: PIP -> ARAHKAN KE SURVEY 21 ANAMNESA KESEHATAN DULU
  // --------------------------------------------------------------------------
  function finalizePipSession() {
    setIsTimerRunning(false)
    setShowConfirmSubmitModal(false)
    setShowViolationModal(false)
    setGateAnamnesisAnswers({})
    setSessionPhase("pip-anamnesis")
    // JANGAN keluar dari fullscreen/kiosk! Seluruh nilai baru keluar serentak setelah Tes Buta Warna selesai.
    if (packageConfig.examBrowserLock || currentUser.role === "candidate") {
      enterFullscreen()
    }
    const attemptId = currentAttemptIdRef.current || `att-${Date.now()}`
    currentAttemptIdRef.current = attemptId

    showToast(
      "Sesi 1 (PIP) terkumpul! Isi & simpan Survey 21 Anamnesa Kesehatan sebelum lanjut ke Sesi 2 (TIU).",
      "info",
    )
  }

  // --------------------------------------------------------------------------
  // SIMPAN SURVEY 21 ANAMNESA KESEHATAN -> LANJUT KE SESI 2 (TIU) TANPA TAMPILKAN NILAI DULU
  // --------------------------------------------------------------------------
  function handleSavePipAnamnesisAndShowScore() {
    if (gateAnamnesisEval.answeredCount < ANAMNESIS_QUESTIONS_21.length) {
      const remaining =
        ANAMNESIS_QUESTIONS_21.length - gateAnamnesisEval.answeredCount
      showToast(
        `Masih ada ${remaining} pertanyaan Anamnesa yang belum dijawab. Jawab seluruh 21 butir sebelum menyimpan.`,
        "warning",
      )
      const firstUnansweredIdx = ANAMNESIS_QUESTIONS_21.findIndex(
        (_, idx) =>
          gateAnamnesisAnswers[String(idx)] !== "yes" &&
          gateAnamnesisAnswers[String(idx)] !== "no",
      )
      if (firstUnansweredIdx >= 0) {
        document
          .getElementById(`cat-gate-anamnesis-q-${firstUnansweredIdx}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" })
      }
      return
    }

    const isCoachTest =
      isCoachSelfTest || selectedCandidate?.id === "coach-self"
    const attemptId = currentAttemptIdRef.current || `att-${Date.now()}`
    currentAttemptIdRef.current = attemptId
    const nowIso = new Date().toISOString()

    // Simpan hasil Survey 21 Anamnesa Kesehatan ke Rikkes Tahap 4 (nilai PIP ditahan hingga akhir setelah Tes Buta Warna)
    if (!isCoachTest && selectedCandidate) {
      let activeMedicalSession: Session | undefined = sessions.find(
        (s) => s.type === "medical",
      )
      let nextSessionsList = sessions
      if (!activeMedicalSession) {
        activeMedicalSession = {
          id: "session-rikkes-tahap4",
          type: "medical",
          title: "Pemeriksaan Kesehatan (Rikkes Tahap 4)",
          date: nowIso.slice(0, 10),
          time: "08:00",
          location: "Klinik / Posko Medis Rikkes",
          coach: "TIM MEDIS",
          participantIds: candidates.map((c) => c.id),
          status: "ongoing",
        }
        nextSessionsList = [activeMedicalSession, ...sessions]
        setSessions(nextSessionsList)
      }

      const medKey = `${activeMedicalSession.id}:${selectedCandidate.id}`
      const existingMedRec = records[medKey]
      const patchedMetrics: Record<string, string> = {
        ...(existingMedRec?.metrics ?? {}),
        anamnesis: String(gateAnamnesisEval.yesCount),
        anamnesisScore: String(gateAnamnesisEval.score),
        anamnesisStatus: gateAnamnesisEval.status,
        anamnesisCritical:
          gateAnamnesisEval.criticalTriggered.length > 0 ? "yes" : "no",
        anamnesisCompleted: "true",
        anamnesisCompletedAt: nowIso,
      }
      anamnesisItems.forEach((_, idx) => {
        patchedMetrics[`anamnesis-${idx}`] =
          gateAnamnesisAnswers[String(idx)] || "no"
      })

      const updatedMedRecord: SessionRecord = {
        attendance: existingMedRec?.attendance ?? "hadir",
        discipline: existingMedRec?.discipline ?? "4",
        focus: existingMedRec?.focus ?? "4",
        stamina: existingMedRec?.stamina ?? "4",
        note:
          existingMedRec?.note ??
          "Survey 21 Anamnesa Kesehatan terintegrasi CAT",
        metrics: patchedMetrics,
        result: gateAnamnesisEval.status,
        savedAt: nowIso,
        updatedAt: nowIso,
      }

      const nextRecordsMap: Record<string, SessionRecord> = {
        ...records,
        [medKey]: updatedMedRecord,
      }
      setRecords(nextRecordsMap)

      const statusNote =
        gateAnamnesisEval.status === "failed"
          ? `Screening Kesehatan: Gagal Kritis (${gateAnamnesisEval.criticalTriggered
              .map((c) => c.item[0].split("/")[0])
              .join(", ")})`
          : gateAnamnesisEval.status === "review"
            ? `Screening Kesehatan: Perlu Tinjau (${gateAnamnesisEval.yesCount} YA > ambang 5)`
            : `Screening Kesehatan: Laik (${gateAnamnesisEval.yesCount} YA · Skor ${gateAnamnesisEval.score}/100)`

      updateCandidateStage(
        selectedCandidate.id,
        3,
        gateAnamnesisEval.status,
        statusNote,
      )

      const existingPhysical = selectedCandidate.physicalMetrics ?? []
      updateCandidate(selectedCandidate.id, {
        physicalMetrics: [
          ...existingPhysical.filter(
            (m) => !m.label.toLowerCase().includes("anamnesis"),
          ),
          {
            label: "Anamnesis Rikkes",
            current: `${gateAnamnesisEval.score}/100 (${gateAnamnesisEval.yesCount} YA)`,
            target: "≥70 (Maks 5 YA)",
            percent: gateAnamnesisEval.score,
          },
        ],
      })

      saveAnamnesisLocalHistory(
        selectedCandidate.id,
        gateAnamnesisAnswers,
        gateAnamnesisEval,
      )
      void saveToCloud({ sessions: nextSessionsList, records: nextRecordsMap })
    }

    logAudit(
      isCoachTest
        ? "Simulasi Anamnesa & PIP Pelatih"
        : "Survey 21 Anamnesa & CAT PIP Tersimpan",
      isCoachTest ? currentUser.name : (selectedCandidate?.name ?? "Peserta"),
      `Jawaban Sesi 1 (PIP) & Survey 21 Anamnesa telah diamankan (${gateAnamnesisEval.yesCount} YA). Menunggu Sesi 2 (TIU) & Tes Buta Warna sebelum seluruh nilai dirilis.`,
    )

    setShowPipResultModal(false)
    setSessionPhase("pip-final")
    if (packageConfig.examBrowserLock || currentUser.role === "candidate") {
      enterFullscreen()
    }
    showToast(
      "Survey 21 Anamnesa tersimpan! Silakan lanjutkan ke Sesi 2 (CAT TIU). Seluruh nilai keluar di akhir.",
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
    if (packageConfig.examBrowserLock || currentUser.role === "candidate") {
      enterFullscreen()
    }
    showToast("Sesi 2: CAT TIU dimulai. Mode Safe Exam Browser tetap terkunci.", "info")
  }

  // --------------------------------------------------------------------------
  // FINALIZE SESSION 2: TIU -> ARAHKAN KE TES BUTA WARNA (ISHIHARA) DULU
  // --------------------------------------------------------------------------
  function finalizeTiuSession() {
    setIsTimerRunning(false)
    setShowConfirmSubmitModal(false)
    setShowViolationModal(false)
    setGateIshiharaStarted(false)
    setGateIshiharaFinished(false)
    setGateIshiharaIndex(0)
    setGateIshiharaResults([])
    setGateIshiharaInput("")
    setSessionPhase("tiu-ishihara")
    // JANGAN keluar dari fullscreen/kiosk! Seluruh nilai baru keluar setelah Tes Buta Warna selesai.
    if (packageConfig.examBrowserLock || currentUser.role === "candidate") {
      enterFullscreen()
    }
    showToast(
      "Sesi 2 (TIU) terkumpul! Selesaikan Tes Buta Warna terlebih dahulu untuk menampilkan seluruh nilai & pembahasan.",
      "info",
    )
  }

  // --------------------------------------------------------------------------
  // EMBEDDED ISHIHARA RUNNER HELPERS (SEBELUM NILAI TIU KELUAR)
  // --------------------------------------------------------------------------
  const handleStartGateIshihara = useCallback(() => {
    setGateIshiharaIndex(0)
    setGateIshiharaResults([])
    setGateIshiharaInput("")
    setGateIshiharaFinished(false)
    setGateIshiharaStarted(true)
    gateIshiharaPlateStartRef.current = Date.now()
  }, [])

  const handleAnswerGateIshihara = useCallback(
    (answerNum: number | null) => {
      const currentPlate =
        OFFICIAL_ISHIHARA_PLATES[
          gateIshiharaIndex % OFFICIAL_ISHIHARA_PLATES.length
        ]
      const targetNum = currentPlate.number
      const timeSpent = Math.max(
        1,
        Math.round((Date.now() - gateIshiharaPlateStartRef.current) / 1000),
      )
      const item: IshiharaPlateAnswerItem = {
        plateIndex: gateIshiharaIndex + 1,
        targetNumber: targetNum,
        userAnswer: answerNum,
        isCorrect: answerNum === targetNum,
        timeSpentSec: timeSpent,
      }
      setGateIshiharaResults((prev) => [...prev, item])
      setGateIshiharaInput("")
      const nextIndex = gateIshiharaIndex + 1
      if (nextIndex >= OFFICIAL_ISHIHARA_PLATES.length) {
        setGateIshiharaFinished(true)
        setGateIshiharaStarted(false)
      } else {
        setGateIshiharaIndex(nextIndex)
        gateIshiharaPlateStartRef.current = Date.now()
      }
    },
    [gateIshiharaIndex],
  )

  // Gambar piringan Ishihara setiap kali piringan aktif berubah atau layar penuh berubah
  useEffect(() => {
    if (
      sessionPhase !== "tiu-ishihara" ||
      !gateIshiharaStarted ||
      gateIshiharaFinished
    ) {
      return
    }
    const targetNum =
      OFFICIAL_ISHIHARA_PLATES[
        gateIshiharaIndex % OFFICIAL_ISHIHARA_PLATES.length
      ].number
    const timer = window.setTimeout(() => {
      drawOfficialIshiharaPlate(gateIshiharaCanvasRef.current, targetNum)
    }, 40)
    return () => window.clearTimeout(timer)
  }, [
    sessionPhase,
    gateIshiharaStarted,
    gateIshiharaFinished,
    gateIshiharaIndex,
    isFullscreen,
  ])

  // Dukungan keyboard numpad / Enter untuk Tes Buta Warna di dalam Kiosk
  useEffect(() => {
    if (
      sessionPhase !== "tiu-ishihara" ||
      !gateIshiharaStarted ||
      gateIshiharaFinished ||
      showExitTokenModal ||
      showViolationModal
    ) {
      return
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key >= "0" && e.key <= "9") {
        setGateIshiharaInput((prev) => (prev.length < 2 ? prev + e.key : prev))
      } else if (e.key === "Backspace") {
        setGateIshiharaInput((prev) => prev.slice(0, -1))
      } else if (e.key === "Enter") {
        if (gateIshiharaInput) {
          e.preventDefault()
          handleAnswerGateIshihara(Number(gateIshiharaInput))
        }
      } else if (e.key.toLowerCase() === "x" || e.key === " ") {
        e.preventDefault()
        handleAnswerGateIshihara(null)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [
    sessionPhase,
    gateIshiharaStarted,
    gateIshiharaFinished,
    showExitTokenModal,
    showViolationModal,
    gateIshiharaInput,
    handleAnswerGateIshihara,
  ])

  // --------------------------------------------------------------------------
  // SIMPAN HASIL TES BUTA WARNA -> BUKA KIOSK & TAMPILKAN NILAI TIU + AKHIR
  // --------------------------------------------------------------------------
  function handleSaveTiuIshiharaAndShowScore() {
    if (!gateIshiharaFinished || !gateIshiharaStats) {
      showToast(
        "Selesaikan seluruh 25 piringan Tes Buta Warna terlebih dahulu.",
        "warning",
      )
      return
    }

    const isCoachTest =
      isCoachSelfTest || selectedCandidate?.id === "coach-self"
    if (!isCoachTest && activeCatSchedule) {
      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeCatSchedule.id
            ? { ...session, status: "completed" }
            : session,
        ),
      )
    }

    const pipCorrect = pipExamQuestions.filter(
      (q) => pipAnswers[q.id] === q.correctIndex,
    ).length
    const pipScore = pipCorrect * 2
    const pipPassed = pipScore >= packageConfig.pipPassingGrade

    const tiuCorrect = tiuExamQuestions.filter(
      (q) => tiuAnswers[q.id] === q.correctIndex,
    ).length
    const tiuScoreRaw = tiuCorrect
    const tiuScoreScaled = tiuCorrect * 2
    const tiuPassed = tiuScoreScaled >= packageConfig.tiuPassingGrade

    const combined = Math.round((pipScore + tiuScoreScaled) / 2)
    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19)
    const nowIso = new Date().toISOString()

    const targetCandidateId = isCoachTest
      ? currentUser.id || "coach-self"
      : (selectedCandidate?.id ??
        (currentUser.role === "candidate" ? currentUser.candidateId : undefined) ??
        "cand-001")
    const attemptId = currentAttemptIdRef.current || `att-${Date.now()}`
    currentAttemptIdRef.current = attemptId
    const prevAttempts = attempts.filter(
      (a) => a.candidateId === targetCandidateId && a.id !== attemptId,
    )
    const attemptNumber = prevAttempts.length + 1

    const newAttempt: CatTryoutAttempt = {
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

    // 1. Simpan nilai lengkap CAT (PIP + TIU)
    saveCatTryoutAttempt(newAttempt)

    // 2. Simpan hasil Tes Buta Warna (Ishihara) ke Rikkes Tahap 4 (untuk kandidat asli)
    if (!isCoachTest && selectedCandidate) {
      const ishiharaResultObj: IshiharaScreeningResult = {
        id: `res-${Date.now()}-${selectedCandidate.id.slice(-4)}`,
        attemptId: `att-ish-${Date.now()}`,
        sessionId: "free-session",
        sessionName: "Skrining Buta Warna Terintegrasi CAT",
        sessionMode: "scheduled",
        participantId: selectedCandidate.id,
        participantName: selectedCandidate.name,
        participantNumber: selectedCandidate.number,
        school: selectedCandidate.school,
        completionStatus: "completed",
        accuracy: gateIshiharaStats.accuracy,
        totalPlates: gateIshiharaStats.total,
        correctCount: gateIshiharaStats.correctCount,
        avgTimeSec: Number(gateIshiharaStats.avgTime),
        screeningInterpretation:
          gateIshiharaStats.status === "normal"
            ? "normal"
            : "partial_protan_deutan",
        interpretationLabel: gateIshiharaStats.statusLabel,
        protocolVersion: "BPIP-ISH-25-CAT",
        clinicalFollowUp:
          gateIshiharaStats.status === "normal"
            ? "not_required"
            : "pending_professional_review",
        followUpNote:
          gateIshiharaStats.status === "normal"
            ? "Skrining visual primer memenuhi ambang batas protokol."
            : "Diperlukan konfirmasi pemeriksaan klinis oleh dokter spesialis mata menggunakan buku cetak fisik resmi.",
        selectionDecision:
          gateIshiharaStats.status === "normal" ? "eligible" : "pending",
        decisionNote:
          gateIshiharaStats.status === "normal"
            ? "Memenuhi syarat kriteria kesehatan mata Rikkes Tahap 4."
            : "Menunggu hasil verifikasi medis klinis lebih lanjut.",
        createdAt: nowIso,
      }
      saveIshiharaScreeningResult(ishiharaResultObj)

      const latestCand =
        candidates.find((c) => c.id === selectedCandidate.id) ??
        selectedCandidate
      const existingPhysical = latestCand.physicalMetrics ?? []
      updateCandidate(selectedCandidate.id, {
        physicalMetrics: [
          ...existingPhysical.filter(
            (m) => !m.label.toLowerCase().includes("buta warna"),
          ),
          {
            label: "Tes Buta Warna",
            current: `${gateIshiharaStats.accuracy}% (${gateIshiharaStats.correctCount}/${gateIshiharaStats.total})`,
            target: "≥85% (Normal)",
            percent: gateIshiharaStats.accuracy,
          },
        ],
      })
    }

    // 3. Tampilkan seluruh nilai & pembahasan lengkap 100 soal DI DALAM KIOSK (Kiosk tetap terkunci sampai Token Admin dimasukkan)
    setReviewTab("all")
    setSessionPhase("completed")
    if (packageConfig.examBrowserLock || currentUser.role === "candidate") {
      enterFullscreen()
    }
    setShowTiuResultModal(true)
    logAudit(
      isCoachTest
        ? "Simulasi Tes Buta Warna & CAT Pelatih Selesai"
        : "Tes Buta Warna & Tryout CAT Selesai",
      isCoachTest ? currentUser.name : (selectedCandidate?.name ?? "Peserta"),
      `PIP: ${pipScore}/100 (${pipPassed ? "Lolos" : "Remedial"}), TIU: ${tiuScoreScaled}/100 (${tiuPassed ? "Lolos" : "Remedial"}), Anamnesa: ${gateAnamnesisEval.score}/100, Ishihara: ${gateIshiharaStats.accuracy}%. Menunggu Token Admin untuk keluar Kiosk.`,
    )
    showToast(
      "Tes Buta Warna selesai! Seluruh nilai (PIP, TIU, Anamnesa & Buta Warna) serta pembahasan 100 soal telah dibuka.",
      "success",
    )
  }

  // --------------------------------------------------------------------------
  // ANTI-CHEAT & EXAM BROWSER PROTOCOL
  // --------------------------------------------------------------------------
  const lastViolationTimeRef = useRef(0)
  const isSubmittingViolationsRef = useRef(false)

  // Reset violation submission lock when exam is completely idle or completed
  useEffect(() => {
    if (!isKioskSessionActive) {
      isSubmittingViolationsRef.current = false
    }
  }, [isKioskSessionActive])

  const recordViolation = useCallback(
    (reason: string) => {
      if (!isKioskLocked) return
      if (showExitTokenModal) return
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
          setIsTimerRunning(false)
          showToast(
            `Layar ujian dikunci: batas ${maxViolations} pelanggaran terlampaui! Panggil Pengawas/Admin.`,
            "danger",
          )
          logAudit(
            "Kunci Pelanggaran Safe Exam Browser",
            selectedCandidate?.name || currentUser.name,
            `Terdeteksi ${nextCount} kali pelanggaran integritas pada fase ${sessionPhase.toUpperCase()}. Alasan: ${reason}. Menunggu otorisasi Token Admin.`,
          )
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
      isKioskLocked,
      showExitTokenModal,
      packageConfig.maxViolations,
      selectedCandidate?.name,
      currentUser.name,
      sessionPhase,
      showToast,
      logAudit,
    ],
  )

  // Anti-cheat event listeners across PIP -> PIP-FINAL -> TIU
  useEffect(() => {
    if (!isKioskLocked) return

    const isTokenInputTarget = (target: EventTarget | null) => {
      return (
        target instanceof HTMLElement &&
        Boolean(target.closest('[data-kiosk-token-input="true"]'))
      )
    }

    // 1. Fullscreen departure detection
    const handleFullscreenChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
          (document as any).webkitFullscreenElement,
      )
      setIsFullscreen(isFs)
      if (!isFs && !showExitTokenModal) {
        recordViolation("Meninggalkan mode Layar Penuh (Fullscreen)")
      }
    }

    // 2. Tab switching or window minimize
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation("Berpindah tab atau meminimalkan jendela ujian")
      }
    }

    // 3. Focus blur (Alt+Tab or switching mobile app)
    const handleWindowBlur = () => {
      recordViolation("Fokus layar terputus (beralih aplikasi / jendela)")
    }

    // 4. Disable context menu (Right-click / Long-press menu)
    const handleContextMenu = (e: MouseEvent) => {
      if (isTokenInputTarget(e.target)) return
      e.preventDefault()
    }

    // 5. Disable copy, cut, paste & drag
    const handleClipboard = (e: ClipboardEvent) => {
      if (isTokenInputTarget(e.target)) return
      e.preventDefault()
      showToast("Fungsi salin/tempel dinonaktifkan di Safe Exam Browser.", "warning")
    }

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault()
    }

    // 6. Keyboard Shortcuts lockdown (DevTools, Refresh, Print, Nav, Fullscreen toggle)
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrlOrMeta = e.ctrlKey || e.metaKey

      // F12 or DevTools inspect
      if (
        e.key === "F12" ||
        (ctrlOrMeta &&
          e.shiftKey &&
          ["I", "i", "J", "j", "C", "c"].includes(e.key)) ||
        (ctrlOrMeta && (e.key === "u" || e.key === "U"))
      ) {
        e.preventDefault()
        recordViolation("Membuka alat inspeksi pengembang (DevTools)")
        return
      }

      // F11 or Escape (attempting to exit fullscreen)
      if (e.key === "F11" || (e.key === "Escape" && !showExitTokenModal)) {
        e.preventDefault()
        return
      }

      // Reload / Close / New Tab / Window / Find shortcuts
      if (
        e.key === "F5" ||
        (ctrlOrMeta &&
          ["r", "R", "w", "W", "t", "T", "n", "N", "f", "F", "g", "G"].includes(
            e.key,
          ))
      ) {
        e.preventDefault()
        showToast(
          "Pintasan browser dinonaktifkan selama Safe Exam Browser aktif.",
          "warning",
        )
        return
      }

      // Clipboard shortcuts outside token input
      if (
        ctrlOrMeta &&
        ["c", "C", "v", "V", "x", "X", "p", "P", "s", "S"].includes(e.key) &&
        !isTokenInputTarget(e.target)
      ) {
        e.preventDefault()
        return
      }

      // Browser history navigation
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
    window.addEventListener("dragstart", handleDragStart)
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
      window.removeEventListener("dragstart", handleDragStart)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [isKioskLocked, showExitTokenModal, recordViolation, showToast])
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
              {isCoachOrAdmin && (
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/80 bg-amber-50 px-2.5 py-1 text-2xs font-bold text-amber-950">
                  <KeyRound className="size-3.5 text-amber-700 shrink-0" />
                  <span>Token Keluar Kiosk:</span>
                  <code className="rounded bg-amber-200/70 px-1.5 py-0.5 font-mono text-xs font-black tracking-wider text-slate-950">
                    {catExitToken}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(catExitToken).catch(() => {})
                      showToast(`Token Admin "${catExitToken}" disalin.`, "info")
                    }}
                    className="rounded p-0.5 text-amber-800 hover:bg-amber-200/80 transition cursor-pointer"
                    title="Salin Token Admin"
                  >
                    <Copy className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("settings")}
                    className="ml-0.5 underline decoration-amber-600/60 hover:text-amber-700 cursor-pointer"
                    title="Ubah Token Admin"
                  >
                    Ubah
                  </button>
                </div>
              )}
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">
              {currentUser.role === "candidate"
                ? "Begitu ujian dimulai, perangkat otomatis terkunci dalam mode Safe Exam Browser hingga Sesi 1 (PIP) dan Sesi 2 (TIU) tuntas."
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
                    Ketentuan ujian · 75 menit total + Skrining Rikkes
                    <span className="ml-2 text-3xs font-medium normal-case tracking-normal text-slate-500">
                      PIP → Survey 21 Anamnesa → TIU → Tes Buta Warna · Lihat rincian
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
                      <div className="mt-3 border-t border-slate-100 pt-2 text-2xs font-semibold text-red-700 flex items-center gap-1.5">
                        <HeartPulse className="size-3.5 shrink-0 text-red-600" />{" "}
                        <span>Lanjut isi Survey 21 Anamnesa (Nilai PIP keluar serentak di akhir)</span>
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
                      <div className="mt-3 border-t border-slate-100 pt-2 text-2xs font-semibold text-purple-700 flex items-center gap-1.5">
                        <Eye className="size-3.5 shrink-0 text-purple-600" />{" "}
                        <span>Tes Buta Warna &rarr; Seluruh nilai &amp; pembahasan keluar (Keluar wajib Token Admin)</span>
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
                  isKioskLocked
                    ? "fixed inset-0 z-[100] flex flex-col bg-slate-900 select-none overflow-hidden"
                    : "grid gap-6"
                }
              >
                {/* MANDATORY FULLSCREEN GATE OVERLAY */}
                {isKioskLocked &&
                  supportsFullscreenApi &&
                  !isFullscreen &&
                  !showExitTokenModal &&
                  !showViolationModal && (
                    <div className="absolute inset-0 z-[115] flex items-center justify-center bg-slate-950/96 p-4 backdrop-blur-xl">
                      <div className="w-full max-w-md rounded-3xl border border-amber-500/40 bg-slate-900 p-6 sm:p-7 text-center text-white shadow-2xl">
                        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          <Lock className="size-7" />
                        </div>
                        <span className="mt-4 inline-block rounded-full bg-amber-500/15 px-3 py-0.5 text-2xs font-extrabold uppercase tracking-wider text-amber-300 border border-amber-500/30">
                          Safe Exam Browser Aktif
                        </span>
                        <h3 className="mt-2 font-display text-lg sm:text-xl font-black text-white">
                          Mode Layar Penuh Wajib Aktif
                        </h3>
                        <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                          Soal ujian disembunyikan sementara karena layar keluar dari mode penuh. Anda wajib menyelesaikan{" "}
                          <strong className="text-white">Sesi 1 (PIP)</strong> hingga{" "}
                          <strong className="text-white">Sesi 2 (TIU)</strong> sebelum dapat keluar dari Safe Exam Browser.
                        </p>
                        <div className="mt-6 grid gap-2.5">
                          <button
                            type="button"
                            onClick={enterFullscreen}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 py-3 px-4 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-red-600/30 transition cursor-pointer"
                          >
                            <Maximize2 className="size-4 shrink-0" />
                            <span>Masuk Kembali ke Layar Penuh</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openAdminTokenModal("exit")}
                            className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 py-2.5 px-4 text-2xs sm:text-xs font-bold text-slate-300 transition cursor-pointer"
                          >
                            <KeyRound className="size-3.5 text-amber-400 shrink-0" />
                            <span>Keluar Darurat (Wajib Token Admin)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                {/* EXAM TOP BAR (PRD Section 6.2 & Exam Browser Cockpit) */}
                <div
                  className={
                    isKioskLocked
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
                        {isKioskLocked && (
                          <span className="hidden sm:inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-3xs font-bold text-emerald-400 border border-emerald-500/20 whitespace-nowrap shrink-0">
                            <Lock className="size-2.5" />
                            Kiosk Terkunci
                          </span>
                        )}
                      </div>
                      <p className="hidden sm:block text-3xs text-slate-400 truncate leading-tight mt-0.5">
                        {packageConfig.packageName}
                      </p>
                    </div>
                  </div>

                  {/* RIGHT: VIOLATION PILL, TIMER, TOKEN EXIT & SUBMIT */}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {/* VIOLATION COUNTER PILL */}
                    {isKioskLocked && (
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
                          {violationCount}/{maxAllowedViolations}
                        </span>
                      </div>
                    )}

                    {/* EMERGENCY ADMIN TOKEN EXIT BUTTON */}
                    {isKioskLocked && (
                      <button
                        type="button"
                        onClick={() => openAdminTokenModal("exit")}
                        className="flex items-center gap-1 rounded-lg bg-slate-800/90 px-2 py-1 text-2xs font-bold text-amber-300 border border-amber-500/30 hover:bg-slate-800 transition cursor-pointer whitespace-nowrap shrink-0"
                        title="Keluar Darurat dari Kiosk (Wajib Token Admin)"
                      >
                        <KeyRound className="size-3 shrink-0 text-amber-400" />
                        <span className="hidden md:inline">Token Admin</span>
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
                      <span className="hidden sm:inline">
                        {sessionPhase === "pip" ? "Selesai PIP" : "Selesai TIU"}
                      </span>
                    </Button>
                  </div>
                </div>

                {/* MAIN QUESTION WORKSPACE & 50-MATRIX */}
                <div
                  className={
                    isKioskLocked
                      ? "flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-6"
                      : ""
                  }
                >
                  <div
                    className={
                      isKioskLocked
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

          {/* -------------------- 2B. GATE PRA-NILAI PIP: SURVEY 21 ANAMNESA KESEHATAN -------------------- */}
          {sessionPhase === "pip-anamnesis" && (
            <div
              className={
                isKioskLocked
                  ? "fixed inset-0 z-[100] flex flex-col bg-slate-900 select-none overflow-hidden"
                  : "grid gap-5"
              }
            >
              {/* MANDATORY FULLSCREEN GATE DURING ANAMNESIS */}
              {isKioskLocked &&
                supportsFullscreenApi &&
                !isFullscreen &&
                !showExitTokenModal &&
                !showViolationModal && (
                  <div className="absolute inset-0 z-[115] flex items-center justify-center bg-slate-950/96 p-4 backdrop-blur-xl">
                    <div className="w-full max-w-md rounded-3xl border border-amber-500/40 bg-slate-900 p-6 sm:p-7 text-center text-white shadow-2xl">
                      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <Lock className="size-7" />
                      </div>
                      <h3 className="mt-4 font-display text-lg font-black text-white">
                        Layar Penuh Wajib Aktif — Survey 21 Anamnesa
                      </h3>
                      <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                        Selesaikan &amp; simpan <strong className="text-white">Survey 21 Anamnesa Kesehatan</strong> dalam mode layar penuh sebelum melanjutkan ke Sesi 2 (CAT TIU).
                      </p>
                      <div className="mt-6 grid gap-2.5">
                        <button
                          type="button"
                          onClick={enterFullscreen}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 py-3 px-4 text-xs sm:text-sm font-extrabold text-white shadow-lg transition cursor-pointer"
                        >
                          <Maximize2 className="size-4 shrink-0" />
                          <span>Masuk Kembali ke Layar Penuh</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openAdminTokenModal("exit")}
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 py-2.5 px-4 text-2xs sm:text-xs font-bold text-slate-300 transition cursor-pointer"
                        >
                          <KeyRound className="size-3.5 text-amber-400 shrink-0" />
                          <span>Keluar Darurat (Wajib Token Admin)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              {/* KIOSK TOP BAR FOR ANAMNESIS GATE */}
              <div
                className={
                  isKioskLocked
                    ? "shrink-0 flex items-center justify-between gap-2 bg-slate-950 px-3 py-2.5 sm:px-5 text-white border-b border-slate-800 shadow-md"
                    : "flex items-center justify-between gap-2 rounded-2xl bg-slate-900 p-3.5 text-white shadow-lg"
                }
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge tone="danger" className="text-2xs font-extrabold px-2 py-0.5 shrink-0">
                    SURVEY 21 ANAMNESA
                  </Badge>
                  <span className="text-xs sm:text-sm font-bold truncate">
                    {selectedCandidate?.name ?? "Peserta"}
                  </span>
                  {isKioskLocked && (
                    <span className="hidden sm:inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-3xs font-bold text-emerald-400 border border-emerald-500/20 shrink-0">
                      <Lock className="size-2.5" />
                      Safe Exam Browser Terkunci
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-2xs font-bold text-emerald-300 border border-slate-700">
                    {gateAnamnesisEval.answeredCount} / {ANAMNESIS_QUESTIONS_21.length} Terjawab
                  </span>
                  {isKioskLocked && (
                    <>
                      <div
                        className={`flex items-center gap-1 rounded-lg px-2 py-1 text-2xs font-bold border ${
                          violationCount > 0
                            ? "bg-red-500/20 text-red-300 border-red-500/40"
                            : "bg-slate-800/90 text-slate-300 border-slate-700"
                        }`}
                      >
                        <ShieldAlert className="size-3 shrink-0" />
                        <span>
                          {violationCount}/{maxAllowedViolations}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAdminTokenModal("exit")}
                        className="flex items-center gap-1 rounded-lg bg-slate-800/90 px-2.5 py-1 text-2xs font-bold text-amber-300 border border-amber-500/30 hover:bg-slate-800 transition cursor-pointer"
                      >
                        <KeyRound className="size-3 shrink-0 text-amber-400" />
                        <span className="hidden sm:inline">Token Admin</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* SCROLLABLE 21 ANAMNESIS SURVEY CONTENT */}
              <div
                className={
                  isKioskLocked
                    ? "flex-1 overflow-y-auto bg-slate-100 p-3.5 sm:p-6"
                    : ""
                }
              >
                <div className="mx-auto max-w-4xl grid gap-4 pb-6">
                  {/* INFO BANNER */}
                  <Card className="border-red-200 bg-gradient-to-r from-red-50 via-white to-amber-50/60 p-4 sm:p-5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-red-600 text-white shadow-sm">
                          <HeartPulse className="size-5" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded-md bg-red-100 px-2 py-0.5 text-3xs font-extrabold uppercase tracking-wider text-red-800">
                              Tahap Wajib Sebelum Sesi 2 (TIU)
                            </span>
                            <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-3xs font-bold text-slate-700">
                              Rikkes Tahap 4
                            </span>
                          </div>
                          <h2 className="mt-1 font-display text-base sm:text-lg font-extrabold text-slate-950">
                            Survey 21 Anamnesa Kesehatan Calon Paskibraka
                          </h2>
                          <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                            Jawaban Sesi 1 (PIP) Anda telah diamankan. Jawab seluruh <strong>21 pertanyaan kondisi kesehatan</strong> di bawah secara jujur untuk melanjutkan ke Sesi 2 (TIU). <em>Seluruh nilai akan ditampilkan serentak di akhir ujian.</em>
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-center shadow-2xs">
                        <p className="text-3xs font-bold uppercase tracking-wider text-slate-400">
                          Progres Isi
                        </p>
                        <p className="font-display text-xl font-black text-slate-950 tabular-nums">
                          {gateAnamnesisEval.answeredCount}
                          <span className="text-xs font-semibold text-slate-400">
                            /{ANAMNESIS_QUESTIONS_21.length}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* PROGRESS BAR */}
                    <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
                      <div
                        className="h-full rounded-full bg-emerald-600 transition-all duration-200"
                        style={{
                          width: `${Math.round(
                            (gateAnamnesisEval.answeredCount /
                              ANAMNESIS_QUESTIONS_21.length) *
                              100,
                          )}%`,
                        }}
                      />
                    </div>
                  </Card>

                  {/* 21 QUESTIONS LIST */}
                  <Card className="overflow-hidden border-slate-200 bg-white shadow-2xs">
                    <div className="divide-y divide-slate-100">
                      {ANAMNESIS_QUESTIONS_21.map((questionText, idx) => {
                        const ans = gateAnamnesisAnswers[String(idx)]
                        const isYes = ans === "yes"
                        const isNo = ans === "no"
                        return (
                          <div
                            key={idx}
                            id={`cat-gate-anamnesis-q-${idx}`}
                            className={`flex flex-col gap-3 p-3.5 sm:p-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                              isYes
                                ? "bg-emerald-50/35"
                                : isNo
                                  ? "bg-red-50/25"
                                  : "hover:bg-slate-50/60"
                            }`}
                          >
                            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                              <span
                                className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${
                                  isYes || isNo
                                    ? "bg-slate-900 text-white"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
                                {questionText}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setGateAnamnesisAnswers((prev) => ({
                                    ...prev,
                                    [String(idx)]: "no",
                                  }))
                                }
                                className={`flex h-9 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold transition active:scale-95 cursor-pointer ${
                                  isNo
                                    ? "border-red-600 bg-red-600 text-white shadow-2xs"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50/50"
                                }`}
                              >
                                <XCircle
                                  className={`size-3.5 ${
                                    isNo ? "text-white" : "text-red-500"
                                  }`}
                                />
                                TIDAK
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setGateAnamnesisAnswers((prev) => ({
                                    ...prev,
                                    [String(idx)]: "yes",
                                  }))
                                }
                                className={`flex h-9 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold transition active:scale-95 cursor-pointer ${
                                  isYes
                                    ? "border-emerald-600 bg-emerald-600 text-white shadow-2xs"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/50"
                                }`}
                              >
                                <CheckCircle2
                                  className={`size-3.5 ${
                                    isYes ? "text-white" : "text-emerald-600"
                                  }`}
                                />
                                YA
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* FOOTER ACTION BAR */}
                    <div className="border-t border-slate-200 bg-slate-50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs text-slate-600">
                        {gateAnamnesisAllAnswered ? (
                          <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                            Seluruh 21 pertanyaan telah dijawab. Klik Simpan untuk lanjut ke Sesi 2 (CAT TIU)!
                          </span>
                        ) : (
                          <span>
                            Jawab{" "}
                            <strong className="text-red-600">
                              {ANAMNESIS_QUESTIONS_21.length -
                                gateAnamnesisEval.answeredCount}{" "}
                              pertanyaan lagi
                            </strong>{" "}
                            untuk dapat menyimpan &amp; melanjutkan ke Sesi 2 (TIU).
                          </span>
                        )}
                      </div>

                      <Button
                        onClick={handleSavePipAnamnesisAndShowScore}
                        className={`!px-6 !py-3 !text-xs sm:!text-sm font-extrabold shadow-lg transition cursor-pointer ${
                          gateAnamnesisAllAnswered
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25"
                            : "bg-slate-800 hover:bg-slate-700 text-white"
                        }`}
                      >
                        <Save className="size-4 shrink-0" />
                        <span>Simpan Survey Anamnesa &amp; Lanjut ke Sesi 2 (TIU)</span>
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* -------------------- 3. INTER-SESSION GATE: PIP & ANAMNESA SAVED (NO SCORE REVEALED YET) -------------------- */}
          {sessionPhase === "pip-final" && (
            <div
              className={
                isKioskLocked
                  ? "fixed inset-0 z-[100] flex flex-col bg-slate-950 text-white select-none overflow-hidden"
                  : ""
              }
            >
              {/* MANDATORY FULLSCREEN GATE DURING INTER-SESSION */}
              {isKioskLocked &&
                supportsFullscreenApi &&
                !isFullscreen &&
                !showExitTokenModal &&
                !showViolationModal && (
                  <div className="absolute inset-0 z-[115] flex items-center justify-center bg-slate-950/96 p-4 backdrop-blur-xl">
                    <div className="w-full max-w-md rounded-3xl border border-amber-500/40 bg-slate-900 p-6 sm:p-7 text-center text-white shadow-2xl">
                      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <Lock className="size-7" />
                      </div>
                      <h3 className="mt-4 font-display text-lg font-black text-white">
                        Kiosk Masih Terkunci — Sesi 2 (TIU) Belum Selesai
                      </h3>
                      <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                        Anda tidak dapat keluar dari Safe Exam Browser sebelum menuntaskan{" "}
                        <strong className="text-white">Sesi 2: CAT TIU &amp; Tes Buta Warna</strong>. Aktifkan kembali layar penuh untuk melanjutkan.
                      </p>
                      <div className="mt-6 grid gap-2.5">
                        <button
                          type="button"
                          onClick={enterFullscreen}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 py-3 px-4 text-xs sm:text-sm font-extrabold text-white shadow-lg transition cursor-pointer"
                        >
                          <Maximize2 className="size-4 shrink-0" />
                          <span>Aktifkan Layar Penuh &amp; Lanjut TIU</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openAdminTokenModal("exit")}
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 py-2.5 px-4 text-2xs sm:text-xs font-bold text-slate-300 transition cursor-pointer"
                        >
                          <KeyRound className="size-3.5 text-amber-400 shrink-0" />
                          <span>Keluar Darurat (Wajib Token Admin)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              {/* KIOSK TOP BAR FOR INTER-SESSION */}
              {isKioskLocked && (
                <div className="shrink-0 flex items-center justify-between gap-2 bg-slate-950 px-3 py-2.5 sm:px-5 text-white border-b border-slate-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge tone="warning" className="text-2xs font-extrabold px-2 py-0.5 shrink-0">
                      TRANSISI SESI 1 &rarr; SESI 2
                    </Badge>
                    <span className="text-xs sm:text-sm font-bold truncate">
                      {selectedCandidate?.name ?? "Peserta"}
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-3xs font-bold text-emerald-400 border border-emerald-500/20 shrink-0">
                      <Lock className="size-2.5" />
                      Safe Exam Browser Terkunci
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className={`flex items-center gap-1 rounded-lg px-2 py-1 text-2xs font-bold border ${
                        violationCount > 0
                          ? "bg-red-500/20 text-red-300 border-red-500/40"
                          : "bg-slate-800/90 text-slate-300 border-slate-700"
                      }`}
                    >
                      <ShieldAlert className="size-3 shrink-0" />
                      <span>
                        {violationCount}/{maxAllowedViolations}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => openAdminTokenModal("exit")}
                      className="flex items-center gap-1 rounded-lg bg-slate-800/90 px-2.5 py-1 text-2xs font-bold text-amber-300 border border-amber-500/30 hover:bg-slate-800 transition cursor-pointer"
                    >
                      <KeyRound className="size-3 shrink-0 text-amber-400" />
                      <span>Keluar Darurat (Token Admin)</span>
                    </button>
                  </div>
                </div>
              )}

              <div
                className={
                  isKioskLocked
                    ? "flex-1 overflow-y-auto flex items-center justify-center p-4 sm:p-6 bg-slate-900"
                    : ""
                }
              >
                <div className={isKioskLocked ? "w-full max-w-2xl" : "w-full"}>
                  <Card className="overflow-hidden border-slate-700 bg-slate-950 text-white shadow-2xl">
                    <div className="p-5 sm:p-7">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              tone="success"
                              className="text-2xs font-extrabold uppercase px-2.5 py-0.5 whitespace-nowrap"
                            >
                              SESI 1 &amp; SURVEY ANAMNESA TERSIMPAN
                            </Badge>
                            <span className="text-2xs text-slate-400">·</span>
                            <span className="text-2xs text-slate-300 truncate">
                              {selectedCandidate?.name ?? "Peserta"}
                            </span>
                          </div>
                          <h2 className="mt-2 font-display text-xl sm:text-2xl font-extrabold text-white">
                            Sesi 1 (PIP) &amp; Survey 21 Anamnesa Selesai — Lanjutkan ke Sesi 2 (CAT TIU)
                          </h2>
                        </div>

                        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 flex items-center gap-3">
                          <CheckCircle2 className="size-6 text-emerald-400 shrink-0" />
                          <div className="text-left">
                            <p className="text-xs font-extrabold text-emerald-300">
                              {Object.keys(pipAnswers).length} / {pipExamQuestions.length} PIP &middot; 21/21 Anamnesa
                            </p>
                            <p className="text-3xs text-slate-300">
                              Nilai keluar serentak di akhir
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-200 flex items-start gap-2.5">
                        <Lock className="size-4 shrink-0 text-amber-400 mt-0.5" />
                        <p className="leading-relaxed">
                          <strong className="text-amber-300">Nilai Ditampilkan Serentak di Akhir:</strong>{" "}
                          Jawaban Sesi 1 (PIP) dan Survey 21 Anamnesa Anda telah diamankan. Seluruh nilai{" "}
                          <strong>(PIP, TIU, Anamnesa &amp; Tes Buta Warna)</strong> beserta{" "}
                          <strong>pembahasan lengkap 100 soal</strong> akan langsung ditampilkan setelah Anda menuntaskan{" "}
                          <strong>Sesi 2: CAT TIU</strong> dan <strong>Tes Buta Warna</strong>.
                        </p>
                      </div>

                      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                        <Button
                          onClick={startTiuSession}
                          className="!px-6 !py-3 !text-xs sm:!text-sm font-extrabold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 cursor-pointer"
                        >
                          <Play className="size-4 fill-current" /> Mulai Sesi 2: CAT TIU Sekarang (30 Menit &middot; 50 Soal)
                        </Button>

                        {!isKioskLocked && (
                          <Button
                            variant="secondary"
                            onClick={() => setSessionPhase("idle")}
                            className="bg-white/10 text-white hover:bg-white/20 !text-xs !py-2.5 cursor-pointer"
                          >
                            Kembali ke Menu Pelatih
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* -------------------- 3B. GATE PRA-NILAI TIU: TES BUTA WARNA (ISHIHARA 25 PIRINGAN) -------------------- */}
          {sessionPhase === "tiu-ishihara" && (
            <div
              className={
                isKioskLocked
                  ? "fixed inset-0 z-[100] flex flex-col bg-slate-900 select-none overflow-hidden"
                  : "grid gap-5"
              }
            >
              {/* MANDATORY FULLSCREEN GATE DURING ISHIHARA */}
              {isKioskLocked &&
                supportsFullscreenApi &&
                !isFullscreen &&
                !showExitTokenModal &&
                !showViolationModal && (
                  <div className="absolute inset-0 z-[115] flex items-center justify-center bg-slate-950/96 p-4 backdrop-blur-xl">
                    <div className="w-full max-w-md rounded-3xl border border-amber-500/40 bg-slate-900 p-6 sm:p-7 text-center text-white shadow-2xl">
                      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <Lock className="size-7" />
                      </div>
                      <h3 className="mt-4 font-display text-lg font-black text-white">
                        Layar Penuh Wajib Aktif — Tes Buta Warna
                      </h3>
                      <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                        Selesaikan &amp; simpan <strong className="text-white">Tes Buta Warna (Ishihara)</strong> dalam mode layar penuh untuk membuka seluruh nilai (PIP, TIU, Anamnesa &amp; Buta Warna) beserta pembahasan lengkap.
                      </p>
                      <div className="mt-6 grid gap-2.5">
                        <button
                          type="button"
                          onClick={enterFullscreen}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 py-3 px-4 text-xs sm:text-sm font-extrabold text-white shadow-lg transition cursor-pointer"
                        >
                          <Maximize2 className="size-4 shrink-0" />
                          <span>Masuk Kembali ke Layar Penuh</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openAdminTokenModal("exit")}
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 py-2.5 px-4 text-2xs sm:text-xs font-bold text-slate-300 transition cursor-pointer"
                        >
                          <KeyRound className="size-3.5 text-amber-400 shrink-0" />
                          <span>Keluar Darurat (Wajib Token Admin)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              {/* KIOSK TOP BAR FOR ISHIHARA GATE */}
              <div
                className={
                  isKioskLocked
                    ? "shrink-0 flex items-center justify-between gap-2 bg-slate-950 px-3 py-2.5 sm:px-5 text-white border-b border-slate-800 shadow-md"
                    : "flex items-center justify-between gap-2 rounded-2xl bg-slate-900 p-3.5 text-white shadow-lg"
                }
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge tone="info" className="text-2xs font-extrabold px-2 py-0.5 shrink-0">
                    TES BUTA WARNA (ISHIHARA)
                  </Badge>
                  <span className="text-xs sm:text-sm font-bold truncate">
                    {selectedCandidate?.name ?? "Peserta"}
                  </span>
                  {isKioskLocked && (
                    <span className="hidden sm:inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-3xs font-bold text-emerald-400 border border-emerald-500/20 shrink-0">
                      <Lock className="size-2.5" />
                      Safe Exam Browser Terkunci
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-2xs font-bold text-sky-300 border border-slate-700">
                    {gateIshiharaFinished
                      ? `${OFFICIAL_ISHIHARA_PLATES.length}/${OFFICIAL_ISHIHARA_PLATES.length} Selesai`
                      : gateIshiharaStarted
                        ? `Plat ${gateIshiharaIndex + 1}/${OFFICIAL_ISHIHARA_PLATES.length}`
                        : `0/${OFFICIAL_ISHIHARA_PLATES.length} Plat`}
                  </span>
                  {isKioskLocked && (
                    <>
                      <div
                        className={`flex items-center gap-1 rounded-lg px-2 py-1 text-2xs font-bold border ${
                          violationCount > 0
                            ? "bg-red-500/20 text-red-300 border-red-500/40"
                            : "bg-slate-800/90 text-slate-300 border-slate-700"
                        }`}
                      >
                        <ShieldAlert className="size-3 shrink-0" />
                        <span>
                          {violationCount}/{maxAllowedViolations}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAdminTokenModal("exit")}
                        className="flex items-center gap-1 rounded-lg bg-slate-800/90 px-2.5 py-1 text-2xs font-bold text-amber-300 border border-amber-500/30 hover:bg-slate-800 transition cursor-pointer"
                      >
                        <KeyRound className="size-3 shrink-0 text-amber-400" />
                        <span className="hidden sm:inline">Token Admin</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* SCROLLABLE ISHIHARA WORKSPACE */}
              <div
                className={
                  isKioskLocked
                    ? "flex-1 overflow-y-auto bg-slate-100 p-3.5 sm:p-6"
                    : ""
                }
              >
                <div className="mx-auto max-w-5xl pb-6">
                  {!gateIshiharaStarted && !gateIshiharaFinished ? (
                    /* INTRO CARD SEBELUM MEMULAI 25 PIRINGAN ISHIHARA */
                    <Card className="mx-auto max-w-2xl border-slate-200 bg-white p-6 sm:p-8 shadow-md">
                      <div className="flex items-start gap-3.5">
                        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-purple-600 text-white shadow-sm">
                          <Eye className="size-6" />
                        </div>
                        <div>
                          <span className="inline-block rounded-md bg-purple-100 px-2.5 py-0.5 text-2xs font-extrabold uppercase tracking-wider text-purple-800">
                            Tahap Akhir Sebelum Seluruh Nilai Keluar
                          </span>
                          <h2 className="mt-1.5 font-display text-lg sm:text-xl font-extrabold text-slate-950">
                            Tes Buta Warna — Standar 25 Piringan Resmi Ishihara
                          </h2>
                          <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                            Jawaban Sesi 1 (PIP), Survey 21 Anamnesa, dan Sesi 2 (CAT TIU) Anda telah diamankan. Tuntaskan 25 piringan persepsi warna ini untuk menampilkan seluruh nilai serta pembahasan soal.
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                          <span>
                            Jumlah piringan uji: <strong>25 Piringan Standar BPIP</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                          <span>
                            Pastikan kecerahan layar cukup dan matikan filter warna (<em>Night Light / Eye Comfort</em>).
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                          <span>
                            Setelah piringan ke-25 disimpan, <strong>seluruh nilai (PIP, TIU, Anamnesa &amp; Buta Warna) + pembahasan 100 soal langsung keluar</strong> di dalam Kiosk.
                          </span>
                        </div>
                      </div>

                      <div className="mt-6 flex justify-end">
                        <Button
                          onClick={handleStartGateIshihara}
                          className="w-full sm:w-auto justify-center !px-6 !py-3 !text-xs sm:!text-sm font-extrabold bg-red-600 hover:bg-red-700 text-white shadow-lg cursor-pointer"
                        >
                          <Play className="size-4 fill-white shrink-0" />
                          <span>Mulai Tes Buta Warna Sekarang (25 Piringan)</span>
                        </Button>
                      </div>
                    </Card>
                  ) : gateIshiharaStarted && !gateIshiharaFinished ? (
                    /* RUNNER 25 PIRINGAN ISHIHARA */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                      <Card className="lg:col-span-7 border-slate-200 bg-white p-5 sm:p-6 flex flex-col items-center justify-center">
                        <div className="w-full flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                          <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                            Piringan ke-{gateIshiharaIndex + 1} dari{" "}
                            {OFFICIAL_ISHIHARA_PLATES.length}
                          </span>
                          <Badge tone="info" className="text-2xs font-bold">
                            Rikkes Tahap 4
                          </Badge>
                        </div>

                        <div className="relative p-2 rounded-2xl bg-white border border-slate-200/80 shadow-inner">
                          <canvas
                            ref={gateIshiharaCanvasRef}
                            className="rounded-xl max-w-full h-auto drop-shadow-sm select-none"
                            style={{ width: 310, height: 310 }}
                          />
                        </div>

                        <p className="text-xs text-slate-500 mt-4 text-center">
                          Angka berapa yang tampak di dalam lingkaran titik-titik warna di atas?
                        </p>
                      </Card>

                      <Card className="lg:col-span-5 border-slate-200 bg-white p-5 sm:p-6">
                        <h3 className="font-display text-sm font-bold text-slate-900 mb-1">
                          Masukkan Angka yang Terbaca
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                          Tekan tombol angka di layar atau ketik menggunakan keyboard.
                        </p>

                        <div className="flex items-center gap-2 mb-4">
                          <div className="flex-1 h-13 rounded-xl border-2 border-slate-200 bg-slate-50 flex items-center justify-center text-2xl font-bold font-display text-slate-900 tracking-wider">
                            {gateIshiharaInput || (
                              <span className="text-slate-300 font-normal text-sm">
                                Ketik angka...
                              </span>
                            )}
                          </div>
                          {gateIshiharaInput ? (
                            <button
                              type="button"
                              onClick={() => setGateIshiharaInput("")}
                              className="size-13 rounded-xl border border-slate-200 bg-white grid place-items-center text-slate-500 hover:bg-slate-50 cursor-pointer"
                              title="Hapus"
                            >
                              <X className="size-5" />
                            </button>
                          ) : null}
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                            <button
                              key={digit}
                              type="button"
                              onClick={() =>
                                setGateIshiharaInput((prev) =>
                                  prev.length < 2 ? prev + digit : prev,
                                )
                              }
                              className="h-12 rounded-xl border border-slate-200 bg-white font-display text-lg font-bold text-slate-800 hover:bg-slate-50 active:bg-slate-100 shadow-2xs transition cursor-pointer"
                            >
                              {digit}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setGateIshiharaInput("")}
                            className="h-12 rounded-xl border border-slate-200 bg-slate-100 font-bold text-xs text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setGateIshiharaInput((prev) =>
                                prev.length < 2 ? prev + "0" : prev,
                              )
                            }
                            className="h-12 rounded-xl border border-slate-200 bg-white font-display text-lg font-bold text-slate-800 hover:bg-slate-50 active:bg-slate-100 shadow-2xs transition cursor-pointer"
                          >
                            0
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (gateIshiharaInput) {
                                handleAnswerGateIshihara(
                                  Number(gateIshiharaInput),
                                )
                              }
                            }}
                            disabled={!gateIshiharaInput}
                            className="h-12 rounded-xl bg-red-600 font-bold text-xs text-white hover:bg-red-700 disabled:opacity-40 transition shadow-xs cursor-pointer"
                          >
                            Kirim
                          </button>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleAnswerGateIshihara(null)}
                            className="w-full min-h-11 py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
                          >
                            <HelpCircle className="size-4 text-slate-400 shrink-0" />
                            <span>Tidak Ada Angka / Tidak Terbaca</span>
                          </button>
                        </div>
                      </Card>
                    </div>
                  ) : (
                    /* RINGKASAN SELESAI ISHIHARA -> KLIK SIMPAN UNTUK MEMBUKA SELURUH NILAI & PEMBAHASAN */
                    gateIshiharaStats && (
                      <Card className="mx-auto max-w-2xl border-slate-200 bg-white p-6 sm:p-8 shadow-md">
                        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                          <div>
                            <span className="text-2xs font-extrabold uppercase tracking-wider text-emerald-700">
                              25 / 25 Piringan Selesai Dijawab
                            </span>
                            <h2 className="mt-1 font-display text-xl font-extrabold text-slate-950">
                              Seluruh Rangkaian Ujian &amp; Tes Buta Warna Selesai
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Klik tombol Simpan di bawah untuk menampilkan seluruh nilai (PIP, TIU, Anamnesa &amp; Buta Warna) beserta pembahasan lengkap 100 soal.
                            </p>
                          </div>
                          <Badge
                            tone="success"
                            className="text-xs px-3 py-1 font-bold"
                          >
                            25 / 25 Plat Terisi
                          </Badge>
                        </div>

                        <div className="mt-4 rounded-2xl p-4 border border-emerald-200 bg-emerald-50/70 text-xs text-emerald-950">
                          <p className="font-bold text-sm flex items-center gap-1.5">
                            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                            <span>Siap Menampilkan Seluruh Nilai &amp; Pembahasan</span>
                          </p>
                          <p className="mt-1 opacity-90 leading-relaxed">
                            Seluruh tahapan telah terisi lengkap (rata-rata respon Ishihara{" "}
                            <strong>{gateIshiharaStats.avgTime} detik/plat</strong>). Mode Safe Exam Browser tetap terkunci saat Anda mempelajari pembahasan hingga Pengawas memasukkan <strong>Token Admin</strong>.
                          </p>
                        </div>

                        <div className="mt-6 flex justify-end">
                          <Button
                            onClick={handleSaveTiuIshiharaAndShowScore}
                            className="w-full sm:w-auto justify-center !px-6 !py-3 !text-xs sm:!text-sm font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 cursor-pointer"
                          >
                            <Save className="size-4 shrink-0" />
                            <span>
                              Simpan Tes Buta Warna &amp; Tampilkan Seluruh Nilai + Pembahasan
                            </span>
                          </Button>
                        </div>
                      </Card>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* -------------------- 4. TRYOUT COMPLETED SCREEN (LOCKED INSIDE KIOSK UNTIL ADMIN TOKEN EXIT) -------------------- */}
          {sessionPhase === "completed" && (
            <div
              className={
                isKioskLocked
                  ? "fixed inset-0 z-[100] flex flex-col bg-slate-900 select-none overflow-hidden"
                  : "grid gap-4"
              }
            >
              {/* MANDATORY FULLSCREEN GATE DURING COMPLETED REVIEW */}
              {isKioskLocked &&
                supportsFullscreenApi &&
                !isFullscreen &&
                !showExitTokenModal &&
                !showViolationModal && (
                  <div className="absolute inset-0 z-[115] flex items-center justify-center bg-slate-950/96 p-4 backdrop-blur-xl">
                    <div className="w-full max-w-md rounded-3xl border border-amber-500/40 bg-slate-900 p-6 sm:p-7 text-center text-white shadow-2xl">
                      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <Lock className="size-7" />
                      </div>
                      <h3 className="mt-4 font-display text-lg font-black text-white">
                        Kiosk Masih Terkunci — Wajib Token Admin untuk Keluar
                      </h3>
                      <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                        Seluruh nilai Anda telah tersimpan aman. Masuk kembali ke{" "}
                        <strong className="text-white">Layar Penuh</strong> untuk mempelajari nilai &amp; pembahasan soal, atau masukkan{" "}
                        <strong className="text-amber-300">Token Admin</strong> untuk keluar dari Kiosk.
                      </p>
                      <div className="mt-6 grid gap-2.5">
                        <button
                          type="button"
                          onClick={enterFullscreen}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 px-4 text-xs sm:text-sm font-extrabold text-white shadow-lg transition cursor-pointer"
                        >
                          <Maximize2 className="size-4 shrink-0" />
                          <span>Kembali ke Layar Penuh (Lihat Nilai &amp; Pembahasan)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openAdminTokenModal("complete-exit")}
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 py-2.5 px-4 text-2xs sm:text-xs font-extrabold text-amber-300 transition cursor-pointer"
                        >
                          <KeyRound className="size-3.5 text-amber-400 shrink-0" />
                          <span>Keluar dari Kiosk (Masukkan Token Admin)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              {/* KIOSK TOP BAR FOR COMPLETED REVIEW */}
              {isKioskLocked && (
                <div className="shrink-0 flex items-center justify-between gap-2 bg-slate-950 px-3 py-2.5 sm:px-5 text-white border-b border-slate-800 shadow-md">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge tone="success" className="text-2xs font-extrabold px-2 py-0.5 shrink-0">
                      HASIL &amp; PEMBAHASAN
                    </Badge>
                    <span className="text-xs sm:text-sm font-bold truncate">
                      {selectedCandidate?.name ?? "Peserta"}
                    </span>
                    <span className="hidden md:inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-3xs font-bold text-amber-300 border border-amber-500/25 shrink-0">
                      <Lock className="size-2.5" />
                      Wajib Token Admin untuk Keluar
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className={`hidden sm:flex items-center gap-1 rounded-lg px-2 py-1 text-2xs font-bold border ${
                        violationCount > 0
                          ? "bg-red-500/20 text-red-300 border-red-500/40"
                          : "bg-slate-800/90 text-slate-300 border-slate-700"
                      }`}
                    >
                      <ShieldAlert className="size-3 shrink-0" />
                      <span>
                        {violationCount}/{maxAllowedViolations}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => openAdminTokenModal("complete-exit")}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-2xs sm:text-xs font-extrabold text-slate-950 shadow-sm transition cursor-pointer"
                    >
                      <KeyRound className="size-3.5 shrink-0" />
                      <span>Keluar Kiosk (Token Admin)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SCROLLABLE COMBINED REPORT & 100 QUESTIONS EXPLANATION */}
              <div
                className={
                  isKioskLocked
                    ? "flex-1 overflow-y-auto bg-slate-100 p-3.5 sm:p-6"
                    : "grid gap-4"
                }
              >
                <div className={isKioskLocked ? "mx-auto max-w-5xl grid gap-4 pb-8" : "grid gap-4"}>
                  {/* TOP HEADER RESULTS CARD */}
                  <Card className="overflow-hidden border-slate-200 shadow-sm">
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
                              Seluruh Nilai CAT &amp; Skrining Rikkes
                            </span>
                          </div>

                          <h2 className="mt-1.5 font-display text-lg sm:text-xl font-bold text-white">
                            Laporan Evaluasi Lengkap CAT &amp; Skrining Rikkes
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
                          ) : !isKioskLocked ? (
                            <Button
                              onClick={handleSyncToCandidateProfile}
                              className="!px-3 !py-1.5 !text-xs font-bold shadow-sm bg-emerald-600 hover:bg-emerald-700 whitespace-nowrap"
                            >
                              <Save className="size-3.5" /> Sinkronkan ke Profil
                            </Button>
                          ) : null}

                          {isKioskLocked ? (
                            <Button
                              onClick={() => openAdminTokenModal("complete-exit")}
                              className="!px-3.5 !py-2 !text-xs font-extrabold shadow-md bg-amber-500 hover:bg-amber-400 !text-slate-950 whitespace-nowrap cursor-pointer"
                            >
                              <KeyRound className="size-3.5" /> Selesai &amp; Keluar Kiosk (Token Admin)
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              onClick={() => setSessionPhase("idle")}
                              className="bg-white/10 text-white hover:bg-white/20 !px-3 !py-1.5 !text-xs whitespace-nowrap"
                            >
                              <RotateCcw className="size-3.5" /> Mulai Baru
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* ALL 4 METRICS RELEASED SIMULTANEOUSLY: PIP, TIU, ANAMNESA 21, TES BUTA WARNA */}
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 1. TAHAP 2: PIP */}
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
                              <span className="font-display text-3xl font-black text-amber-400">
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

                        {/* 2. TAHAP 3: TIU */}
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
                              <span className="font-display text-3xl font-black text-purple-300">
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

                        {/* 3. SURVEY 21 ANAMNESA KESEHATAN */}
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                              <HeartPulse className="size-3.5 text-red-400 shrink-0" />
                              Survey 21 Anamnesa Kesehatan
                            </span>
                            <Badge
                              tone={
                                gateAnamnesisEval.status === "passed"
                                  ? "success"
                                  : gateAnamnesisEval.status === "review"
                                    ? "warning"
                                    : "danger"
                              }
                              className="text-3xs px-2 py-0.5 font-bold"
                            >
                              {gateAnamnesisEval.status === "passed"
                                ? "Laik"
                                : gateAnamnesisEval.status === "review"
                                  ? "Perlu Tinjau"
                                  : "Atensi Medis"}
                            </Badge>
                          </div>
                          <div className="my-2 flex items-baseline justify-between">
                            <div className="flex items-baseline gap-1">
                              <span className="font-display text-2xl font-black text-white">
                                {gateAnamnesisEval.score}
                              </span>
                              <span className="text-xs font-normal text-slate-400">
                                / 100
                              </span>
                            </div>
                            <span className="text-xs text-slate-300 font-medium">
                              {gateAnamnesisEval.yesCount} YA dari 21 Butir
                            </span>
                          </div>
                          <p className="text-3xs text-slate-400 border-t border-white/10 pt-1.5">
                            Rikkes Tahap 4 · Tersinkron otomatis ke Rekam Medis Kandidat
                          </p>
                        </div>

                        {/* 4. TES BUTA WARNA (ISHIHARA 25 PIRINGAN) */}
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                              <Eye className="size-3.5 text-sky-400 shrink-0" />
                              Tes Buta Warna (25 Piringan)
                            </span>
                            <Badge
                              tone={gateIshiharaStats ? gateIshiharaStats.tone : "neutral"}
                              className="text-3xs px-2 py-0.5 font-bold"
                            >
                              {gateIshiharaStats
                                ? gateIshiharaStats.status === "normal"
                                  ? "Normal (≥85%)"
                                  : gateIshiharaStats.status === "partial"
                                    ? "Perlu Konfirmasi"
                                    : "Indikasi Defisiensi"
                                : "—"}
                            </Badge>
                          </div>
                          <div className="my-2 flex items-baseline justify-between">
                            <div className="flex items-baseline gap-1">
                              <span className="font-display text-2xl font-black text-sky-300">
                                {gateIshiharaStats ? `${gateIshiharaStats.accuracy}%` : "—"}
                              </span>
                            </div>
                            <span className="text-xs text-slate-300 font-medium">
                              {gateIshiharaStats
                                ? `${gateIshiharaStats.correctCount} / ${gateIshiharaStats.total} Plat Benar`
                                : "—"}
                            </span>
                          </div>
                          <p className="text-3xs text-slate-400 border-t border-white/10 pt-1.5">
                            {gateIshiharaStats
                              ? gateIshiharaStats.statusLabel
                              : "Standar 25 Piringan Resmi Ishihara BPIP"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* DETAILED QUESTIONS REVIEW & EXPLANATIONS (ALL 100 QUESTIONS) */}
                    <div className="p-4 sm:p-5 bg-white">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                        <div>
                          <h3 className="font-display text-sm sm:text-base font-bold text-slate-900">
                            Tinjauan Pembahasan &amp; Kunci Jawaban Seluruh Soal ({pipExamQuestions.length + tiuExamQuestions.length} Butir)
                          </h3>
                          <p className="text-xs text-slate-500">
                            Pelajari seluruh jawaban Anda beserta kunci dan rasionalisasi pembahasan lengkap sebelum keluar dari Kiosk.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 w-full lg:w-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => setReviewTab("all")}
                            className={`flex-1 lg:flex-initial text-center whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                              reviewTab === "all"
                                ? "bg-slate-900 text-white shadow-2xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            Semua Soal ({pipExamQuestions.length + tiuExamQuestions.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setReviewTab("pip")}
                            className={`flex-1 lg:flex-initial text-center whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                              reviewTab === "pip"
                                ? "bg-white text-slate-900 shadow-2xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            PIP ({pipExamQuestions.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setReviewTab("tiu")}
                            className={`flex-1 lg:flex-initial text-center whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                              reviewTab === "tiu"
                                ? "bg-white text-slate-900 shadow-2xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            TIU ({tiuExamQuestions.length})
                          </button>
                        </div>
                      </div>

                      {/* QUESTIONS LIST ACCORDING TO ACTIVE REVIEW TAB */}
                      <div
                        className={`mt-3 divide-y divide-slate-100 ${
                          isKioskLocked ? "" : "max-h-[38rem] overflow-y-auto pr-2"
                        }`}
                      >
                        {(reviewTab === "all"
                          ? [
                              ...pipExamQuestions.map((q, i) => ({
                                q,
                                sessionType: "pip" as const,
                                sessionNum: i + 1,
                              })),
                              ...tiuExamQuestions.map((q, i) => ({
                                q,
                                sessionType: "tiu" as const,
                                sessionNum: i + 1,
                              })),
                            ]
                          : reviewTab === "pip"
                            ? pipExamQuestions.map((q, i) => ({
                                q,
                                sessionType: "pip" as const,
                                sessionNum: i + 1,
                              }))
                            : tiuExamQuestions.map((q, i) => ({
                                q,
                                sessionType: "tiu" as const,
                                sessionNum: i + 1,
                              }))
                        ).map(({ q, sessionType, sessionNum }) => {
                          const userAns =
                            sessionType === "pip"
                              ? pipAnswers[q.id]
                              : tiuAnswers[q.id]
                          const isCorrect = userAns === q.correctIndex

                          return (
                            <div key={`${sessionType}-${q.id}`} className="py-3.5">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-3xs font-extrabold uppercase tracking-wider ${
                                      sessionType === "pip"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-purple-100 text-purple-800"
                                    }`}
                                  >
                                    {sessionType.toUpperCase()} #{sessionNum}
                                  </span>
                                  <span className="text-xs font-bold text-slate-900">
                                    {q.category}
                                  </span>
                                </div>
                                <Badge
                                  tone={isCorrect ? "success" : "danger"}
                                  className="text-3xs px-2 py-0.5"
                                >
                                  {isCorrect ? "Jawaban Benar" : "Salah / Kosong"}
                                </Badge>
                              </div>

                              <p className="mt-1.5 text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed">
                                {q.question}
                              </p>

                              <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
                                <span
                                  className={`rounded-lg px-2.5 py-1 ${
                                    isCorrect
                                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                      : "bg-rose-50 text-rose-800 border border-rose-200"
                                  }`}
                                >
                                  Pilihan Peserta:{" "}
                                  <strong>
                                    {userAns !== undefined
                                      ? `${["A", "B", "C", "D", "E"][userAns]}. ${q.options[userAns]}`
                                      : "Tidak Dijawab"}
                                  </strong>
                                </span>
                                <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-emerald-900">
                                  Kunci Benar:{" "}
                                  <strong>
                                    {["A", "B", "C", "D", "E"][q.correctIndex]}.{" "}
                                    {q.options[q.correctIndex]}
                                  </strong>
                                </span>
                              </div>

                              <div className="mt-2 rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs leading-relaxed text-slate-700">
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

                  {/* BOTTOM ADMIN TOKEN EXIT CALLOUT INSIDE KIOSK */}
                  {isKioskLocked && (
                    <Card className="border-amber-300 bg-slate-950 p-5 text-white shadow-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            <KeyRound className="size-5" />
                          </div>
                          <div>
                            <h4 className="font-display text-sm sm:text-base font-extrabold text-white">
                              Sudah Selesai Melihat Nilai &amp; Pembahasan?
                            </h4>
                            <p className="mt-0.5 text-xs text-slate-300 leading-relaxed">
                              Seluruh nilai Anda telah tersimpan permanen. Mode Safe Exam Browser tidak dapat ditutup tanpa memasukkan{" "}
                              <strong className="text-amber-300">Token Admin</strong> dari Pengawas / Pelatih.
                            </p>
                          </div>
                        </div>

                        <Button
                          onClick={() => openAdminTokenModal("complete-exit")}
                          className="w-full sm:w-auto justify-center !px-5 !py-3 !text-xs sm:!text-sm font-extrabold bg-amber-500 hover:bg-amber-400 !text-slate-950 shadow-lg shrink-0 cursor-pointer"
                        >
                          <KeyRound className="size-4 shrink-0" />
                          <span>Masukkan Token Admin &amp; Keluar Kiosk</span>
                        </Button>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
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
                  const hasPip = latestAttempt && ((latestAttempt.pipAnswers && Object.keys(latestAttempt.pipAnswers).length > 0) || (typeof latestAttempt.pipScore === "number" && latestAttempt.pipScore > 0))
                  const hasTiu = latestAttempt && ((latestAttempt.tiuAnswers && Object.keys(latestAttempt.tiuAnswers).length > 0) || (typeof latestAttempt.tiuScoreScaled === "number" && latestAttempt.tiuScoreScaled > 0))
                  const pipScore = (hasPip ? latestAttempt?.pipScore : undefined) ?? cand.pip
                  const tiuScore = (hasTiu ? latestAttempt?.tiuScoreScaled : undefined) ?? cand.tiu
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
                    <span>Safe Exam Browser (Kiosk) &amp; Token Admin</span>
                  </div>

                  <label className="flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer">
                    <div>
                      <span>Kunci Kiosk Berkelanjutan (PIP &rarr; TIU)</span>
                      <p className="text-2xs font-normal text-slate-500">
                        Wajib aktif bagi kandidat: tidak dapat keluar sebelum Sesi 2 (TIU) selesai
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
                        Kunci layar ujian &amp; wajibkan Token Admin jika batas terlampaui
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

                  {isCoachOrAdmin && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                          <KeyRound className="size-3.5 text-amber-700" />
                          <span>Token Keluar Darurat Admin</span>
                        </div>
                        <span className="rounded bg-amber-200/80 px-2 py-0.5 font-mono text-xs font-black tracking-wider text-slate-950">
                          {catExitToken}
                        </span>
                      </div>
                      <p className="text-2xs text-amber-900/85 leading-relaxed">
                        Kandidat yang sedang ujian tidak bisa keluar dari Kiosk sebelum TIU selesai kecuali memasukkan token ini. Tersinkron otomatis ke semua perangkat lewat Google Sheet.
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={draftAdminToken}
                          onChange={(e) =>
                            setDraftAdminToken(
                              e.target.value
                                .toUpperCase()
                                .replace(/[^A-Z0-9-]/g, ""),
                            )
                          }
                          maxLength={16}
                          placeholder="Contoh: PASKA27"
                          className="h-9 flex-1 min-w-[8rem] rounded-lg border border-amber-300 bg-white px-2.5 font-mono text-xs font-bold tracking-wider text-slate-950 uppercase outline-none focus:border-amber-600"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={generateRandomAdminToken}
                          className="!px-2.5 !py-1.5 !text-2xs"
                        >
                          <RefreshCw className="size-3" /> Acak
                        </Button>
                        <Button
                          type="button"
                          onClick={() => updateCatExitToken(draftAdminToken)}
                          className="!px-3 !py-1.5 !text-2xs font-bold bg-slate-900 hover:bg-slate-800 text-white"
                        >
                          <Save className="size-3" /> Simpan Token
                        </Button>
                      </div>
                    </div>
                  )}
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
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm animate-in fade-in duration-150">
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

            <div className="mt-5 rounded-xl bg-amber-950/40 border border-amber-800/40 p-3.5 text-xs text-amber-200 leading-relaxed">
              <p className="font-bold flex items-center gap-1.5 text-amber-300">
                <Lock className="size-4 shrink-0 text-amber-400" />
                Safe Exam Browser Tetap Terkunci Hingga TIU Selesai
              </p>
              <p className="mt-0.5 text-2xs text-amber-200/85">
                Nilai PIP telah tersimpan permanen. Silakan langsung melanjutkan ke{" "}
                <strong>Sesi 2: CAT TIU (30 Menit)</strong> untuk menuntaskan rangkaian ujian.
              </p>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPipResultModal(false)
                  startTiuSession()
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-purple-600/30 transition cursor-pointer"
              >
                <Play className="size-4 shrink-0 fill-current" />
                <span>Lanjut Sekarang ke Sesi 2 (CAT TIU)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: TIU & FINAL TRYOUT RESULT SCORECARD */}
      {/* ===================================================================== */}
      {showTiuResultModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs animate-in fade-in duration-150">
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

            {/* RIKKES SCREENING SUMMARY (ANAMNESA 21 + TES BUTA WARNA) */}
            {(gateAnamnesisEval.answeredCount > 0 || gateIshiharaStats) && (
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-slate-800/60 p-3 border border-slate-700/60">
                  <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <HeartPulse className="size-3 text-red-400" />
                    Anamnesa 21
                  </span>
                  <p className="mt-1 text-sm font-extrabold text-white">
                    {gateAnamnesisEval.score}/100{" "}
                    <span className="text-3xs font-normal text-slate-400">
                      ({gateAnamnesisEval.yesCount} YA)
                    </span>
                  </p>
                </div>
                <div className="rounded-xl bg-slate-800/60 p-3 border border-slate-700/60">
                  <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Eye className="size-3 text-sky-400" />
                    Tes Buta Warna
                  </span>
                  <p className="mt-1 text-sm font-extrabold text-white">
                    {gateIshiharaStats ? `${gateIshiharaStats.accuracy}%` : "—"}{" "}
                    <span className="text-3xs font-normal text-slate-400">
                      {gateIshiharaStats
                        ? `(${gateIshiharaStats.correctCount}/${gateIshiharaStats.total})`
                        : ""}
                    </span>
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4 rounded-xl bg-amber-950/40 border border-amber-800/40 p-3.5 text-xs text-amber-200 leading-relaxed">
              <p className="font-bold flex items-center gap-1.5 text-amber-300">
                <Lock className="size-4 shrink-0 text-amber-400" />
                Seluruh Nilai Tersimpan — Kiosk Tetap Terkunci
              </p>
              <p className="mt-0.5 text-2xs text-amber-200/85">
                Silakan tutup dialog ini untuk <strong>mempelajari pembahasan seluruh 100 soal</strong> (PIP &amp; TIU). Untuk keluar dari Safe Exam Browser setelah selesai, wajib memasukkan <strong>Token Admin</strong>.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setReviewTab("all")
                  setShowTiuResultModal(false)
                  if (isKioskLocked) enterFullscreen()
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-extrabold shadow-lg transition cursor-pointer"
              >
                <BookOpenCheck className="size-4 shrink-0" />
                <span>Lihat Pembahasan Semua Soal (100 Soal)</span>
              </button>
              {isKioskLocked && (
                <button
                  type="button"
                  onClick={() => {
                    setShowTiuResultModal(false)
                    openAdminTokenModal("complete-exit")
                  }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-slate-800/80 hover:bg-slate-800 py-2.5 px-4 text-xs font-bold text-amber-300 transition cursor-pointer"
                >
                  <KeyRound className="size-3.5 shrink-0 text-amber-400" />
                  <span>Keluar dari Kiosk (Masukkan Token Admin)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 0: EXAM BROWSER VIOLATION DIALOG / LOCK GATE */}
      {/* ===================================================================== */}
      {(showViolationModal || isViolationLocked) && !showExitTokenModal && (
        <div className="fixed inset-0 z-[125] flex items-center justify-center bg-slate-950/95 p-4 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border-2 border-red-500/50 bg-slate-900 p-6 text-white shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30">
                <ShieldAlert className="size-6" />
              </div>
              <div>
                <span className="rounded-md bg-red-500/20 px-2 py-0.5 text-2xs font-bold uppercase tracking-wider text-red-400 border border-red-500/30">
                  Protokol Integritas CAT
                </span>
                <h3 className="font-display text-base font-bold text-white mt-0.5">
                  {violationCount >= maxAllowedViolations
                    ? "Layar Ujian Dikunci Pengawas!"
                    : "Peringatan Safe Exam Browser!"}
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
                {violationCount} / {maxAllowedViolations}
              </span>
            </div>

            <p className="mt-4 text-xs text-slate-300 leading-relaxed">
              {violationCount >= maxAllowedViolations ? (
                <span className="text-red-300 font-semibold">
                  Batas maksimal pelanggaran telah tercapai. Ujian dijeda dan dikunci penuh dalam mode Kiosk. Silakan panggil{" "}
                  <strong className="text-white">Pengawas / Admin</strong> untuk memasukkan{" "}
                  <strong className="text-amber-300">Token Admin</strong>.
                </span>
              ) : (
                <span>
                  Anda wajib tetap berada dalam mode <strong>Layar Penuh</strong> hingga{" "}
                  <strong>Pengawas mengotorisasi keluar dengan Token Admin</strong> dan dilarang berpindah tab/aplikasi. Mencapai {maxAllowedViolations} pelanggaran akan mengunci layar.
                </span>
              )}
            </p>

            <div className="mt-6 grid gap-2.5">
              {violationCount < maxAllowedViolations ? (
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
                <button
                  type="button"
                  onClick={() => openAdminTokenModal("violation-lock")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg transition cursor-pointer"
                >
                  <KeyRound className="size-4 shrink-0" />
                  <span>Otorisasi Pengawas (Masukkan Token Admin)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: SUBMIT CONFIRMATION (PRD Section 6.2) */}
      {/* ===================================================================== */}
      {showConfirmSubmitModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs">
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
                  {sessionPhase === "pip"
                    ? "Setelah PIP dikumpulkan, Anda diarahkan ke Survey 21 Anamnesa Kesehatan lalu lanjut ke Sesi 2 (TIU). Seluruh nilai keluar di akhir."
                    : "Setelah TIU dikumpulkan, Anda diarahkan ke Tes Buta Warna lalu seluruh nilai & pembahasan 100 soal akan ditampilkan."}
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
                {sessionPhase === "pip"
                  ? "Kumpulkan PIP & Isi Survey Anamnesa"
                  : "Kumpulkan TIU & Lanjut Tes Buta Warna"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL KHUSUS: VERIFIKASI TOKEN ADMIN KELUAR KIOSK / BUKA KUNCI */}
      {/* ===================================================================== */}
      {showExitTokenModal && (
        <div
          data-kiosk-token-input="true"
          className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md rounded-3xl border border-amber-500/40 bg-slate-900 p-6 sm:p-7 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <KeyRound className="size-5" />
                </div>
                <div>
                  <span className="text-3xs font-extrabold uppercase tracking-wider text-amber-400">
                    Otorisasi Pengawas / Admin
                  </span>
                  <h3 className="font-display text-base sm:text-lg font-black text-white">
                    {exitTokenPurpose === "violation-lock"
                      ? "Buka Kunci Pelanggaran Kiosk"
                      : exitTokenPurpose === "complete-exit" ||
                          sessionPhase === "completed"
                        ? "Verifikasi Token Admin — Keluar Kiosk"
                        : "Keluar Darurat Safe Exam Browser"}
                  </h3>
                </div>
              </div>
              {!isViolationLocked && (
                <button
                  type="button"
                  onClick={() => {
                    setShowExitTokenModal(false)
                    setExitTokenError("")
                    if (isKioskLocked) enterFullscreen()
                  }}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              )}
            </div>

            <p className="mt-4 text-xs text-slate-300 leading-relaxed">
              {exitTokenPurpose === "violation-lock"
                ? "Layar kandidat terkunci karena melampaui batas pelanggaran. Masukkan Token Admin untuk membuka kunci ujian atau menghentikan sesi."
                : exitTokenPurpose === "complete-exit" ||
                    sessionPhase === "completed"
                  ? "Seluruh nilai (PIP, TIU, Anamnesa & Buta Warna) telah tersimpan aman. Masukkan Token Admin dari Pengawas/Pelatih untuk menutup Safe Exam Browser."
                  : "Peserta wajib menuntaskan seluruh rangkaian ujian hingga selesai. Untuk keluar lebih awal dari mode Kiosk, masukkan Token Admin resmi."}
            </p>

            <div className="mt-4">
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Token Pengawas / Admin
              </label>
              <input
                type="password"
                autoFocus
                autoComplete="off"
                value={exitTokenInput}
                onChange={(e) => {
                  setExitTokenInput(e.target.value.toUpperCase())
                  if (exitTokenError) setExitTokenError("")
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    void handleVerifyAdminTokenAction(
                      exitTokenPurpose === "violation-lock"
                        ? "unlock-continue"
                        : "exit",
                    )
                  }
                }}
                placeholder="Masukkan Token Admin..."
                className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-center font-mono text-base font-black tracking-[0.25em] text-amber-300 placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-600 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
              {exitTokenError && (
                <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-xs font-bold text-red-300">
                  <AlertCircle className="size-4 shrink-0 text-red-400" />
                  <span>{exitTokenError}</span>
                </p>
              )}
            </div>

            <div className="mt-6 grid gap-2.5">
              {exitTokenPurpose === "violation-lock" && (
                <button
                  type="button"
                  disabled={isVerifyingExitToken}
                  onClick={() =>
                    void handleVerifyAdminTokenAction("unlock-continue")
                  }
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-3 px-4 text-xs font-extrabold text-white shadow-lg transition cursor-pointer"
                >
                  <Unlock className="size-4 shrink-0" />
                  <span>
                    {isVerifyingExitToken
                      ? "Memverifikasi..."
                      : "Buka Kunci & Izinkan Lanjut"}
                  </span>
                </button>
              )}

              <button
                type="button"
                disabled={isVerifyingExitToken}
                onClick={() => void handleVerifyAdminTokenAction("exit")}
                className={`w-full flex items-center justify-center gap-2 rounded-xl disabled:opacity-50 py-3 px-4 text-xs font-extrabold text-white shadow-lg transition cursor-pointer ${
                  exitTokenPurpose === "complete-exit" ||
                  sessionPhase === "completed"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-red-600 hover:bg-red-500"
                }`}
              >
                <LogOut className="size-4 shrink-0" />
                <span>
                  {isVerifyingExitToken
                    ? "Memverifikasi..."
                    : exitTokenPurpose === "complete-exit" ||
                        sessionPhase === "completed"
                      ? "Verifikasi Token & Keluar dari Kiosk"
                      : "Hentikan Sesi & Keluar dari Kiosk"}
                </span>
              </button>

              <button
                type="button"
                disabled={isVerifyingExitToken}
                onClick={() => {
                  setShowExitTokenModal(false)
                  setExitTokenError("")
                  if (isKioskLocked && !isViolationLocked) enterFullscreen()
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 py-2.5 px-4 text-xs font-bold text-slate-300 transition cursor-pointer"
              >
                {exitTokenPurpose === "complete-exit" ||
                sessionPhase === "completed"
                  ? "Batal & Kembali ke Pembahasan Soal"
                  : "Batal & Kembali ke Ujian"}
              </button>
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

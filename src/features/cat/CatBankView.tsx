import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Calculator,
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
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings2,
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
import { Badge, Button, CandidateAvatar, Card, Input } from "../../components/ui"
import { useApp } from "../../context/AppContext"
import { standardCatQuestions } from "../../data/catQuestions"
import type { Candidate, CatQuestion } from "../../domain/selection"

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
]

// ============================================================================
// PRD DATA TYPES
// ============================================================================
export type CatTryoutAttempt = {
  id: string
  candidateId: string
  candidateName: string
  candidateGroup: string
  packageName: string
  attemptNumber: number
  pipAnswers: Record<string, number>
  tiuAnswers: Record<string, number>
  pipCorrect: number
  pipScore: number // 0-100 (2 * C_pip)
  pipStatus: "passed" | "failed"
  tiuCorrect: number
  tiuScoreRaw: number // 0-50 (1 * C_tiu)
  tiuScoreScaled: number // 0-100 (C_tiu * 2)
  tiuStatus: "passed" | "failed"
  combinedScore: number // (pipScore + tiuScoreScaled) / 2
  startedAt: string
  finalizedAt: string
}

type MainTab = "tryout" | "pip-bank" | "tiu-bank" | "rekap" | "settings"
type SessionPhase = "idle" | "pip" | "pip-final" | "tiu" | "completed"

export default function CatBankView() {
  const {
    questions,
    candidates,
    currentUser,
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
  const [packageConfig, setPackageConfig] = useState({
    packageName: "Paket Tryout CAT BPIP (PIP & TIU) 2026",
    pipQuestionCount: 50,
    pipDurationSec: 45 * 60, // 45 minutes = 2700s
    pipPassingGrade: 70, // /100
    tiuQuestionCount: 50,
    tiuDurationSec: 30 * 60, // 30 minutes = 1800s
    tiuPassingGrade: 70, // /100 (raw >= 35)
    shuffleQuestions: true,
    maxAttempts: 3,
  })

  // --------------------------------------------------------------------------
  // TRYOUT SESSION STATE (Two sequential sessions)
  // --------------------------------------------------------------------------
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>("idle")
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    currentUser.candidateId || candidates[0]?.id || "cand-001",
  )

  // Automatically bind to candidate's own profile when logged in as candidate
  useEffect(() => {
    if (currentUser.role === "candidate" && currentUser.candidateId) {
      setSelectedCandidateId(currentUser.candidateId)
    }
  }, [currentUser])
  const selectedCandidate = useMemo(
    () => candidates.find((c) => c.id === selectedCandidateId) ?? candidates[0],
    [candidates, selectedCandidateId],
  )

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
  const [tryoutStartTime, setTryoutStartTime] = useState<string>("")

  // Review & Explanation Modal / Tab
  const [reviewTab, setReviewTab] = useState<"pip" | "tiu">("pip")

  // --------------------------------------------------------------------------
  // ATTEMPTS HISTORY (Persistent in LocalStorage)
  // --------------------------------------------------------------------------
  const [attempts, setAttempts] = useState<CatTryoutAttempt[]>(() => {
    try {
      const saved = localStorage.getItem("paska-cat-tryout-attempts")
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore
    }
    // Seed initial mock attempts matching initial data
    return [
      {
        id: "att-001",
        candidateId: "cand-001",
        candidateName: "Ahmad Fauzan Pratama",
        candidateGroup: "MA Nurul Falah",
        packageName: "Paket Tryout CAT BPIP (PIP & TIU) 2026",
        attemptNumber: 1,
        pipAnswers: {},
        tiuAnswers: {},
        pipCorrect: 39,
        pipScore: 78,
        pipStatus: "passed",
        tiuCorrect: 41,
        tiuScoreRaw: 41,
        tiuScoreScaled: 82,
        tiuStatus: "passed",
        combinedScore: 80,
        startedAt: "2026-10-21 08:00:00",
        finalizedAt: "2026-10-21 09:12:30",
      },
      {
        id: "att-002",
        candidateId: "cand-002",
        candidateName: "Dewi Sekar Arum",
        candidateGroup: "SMA Darul Ulum",
        packageName: "Paket Tryout CAT BPIP (PIP & TIU) 2026",
        attemptNumber: 1,
        pipAnswers: {},
        tiuAnswers: {},
        pipCorrect: 44,
        pipScore: 88,
        pipStatus: "passed",
        tiuCorrect: 38,
        tiuScoreRaw: 38,
        tiuScoreScaled: 76,
        tiuStatus: "passed",
        combinedScore: 82,
        startedAt: "2026-10-21 08:00:00",
        finalizedAt: "2026-10-21 09:08:15",
      },
      {
        id: "att-003",
        candidateId: "cand-003",
        candidateName: "Muhammad Rizky Pratama",
        candidateGroup: "SMK Al-Ikhlas",
        packageName: "Paket Tryout CAT BPIP (PIP & TIU) 2026",
        attemptNumber: 1,
        pipAnswers: {},
        tiuAnswers: {},
        pipCorrect: 31,
        pipScore: 62,
        pipStatus: "failed",
        tiuCorrect: 29,
        tiuScoreRaw: 29,
        tiuScoreScaled: 58,
        tiuStatus: "failed",
        combinedScore: 60,
        startedAt: "2026-10-21 08:00:00",
        finalizedAt: "2026-10-21 09:14:50",
      },
    ]
  })

  useEffect(() => {
    try {
      localStorage.setItem("paska-cat-tryout-attempts", JSON.stringify(attempts))
    } catch {
      // ignore
    }
  }, [attempts])

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
      showToast("Waktu Sesi 1 (PIP) habis. Sesi otomatis diselesaikan.", "warning")
    } else if (sessionPhase === "tiu") {
      finalizeTiuSession()
      showToast("Waktu Sesi 2 (TIU) habis. Sesi otomatis diselesaikan.", "warning")
    }
  }, [sessionPhase])

  // --------------------------------------------------------------------------
  // PREPARE QUESTIONS HELPER (FISHER-YATES SHUFFLE)
  // --------------------------------------------------------------------------
  function prepareExamQuestions(type: "pip" | "tiu", targetCount: number) {
    const pool = questions.filter((q) => q.type === type && q.status === "active")
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
  function startPipSession() {
    const qs = prepareExamQuestions("pip", packageConfig.pipQuestionCount)
    if (qs.length === 0) {
      showToast("Tidak ada butir soal PIP aktif untuk memulai ujian.", "danger")
      return
    }
    setPipExamQuestions(qs)
    setPipCurrentIdx(0)
    setPipAnswers({})
    setPipFlagged({})
    setSecondsLeft(packageConfig.pipDurationSec)
    setIsTimerRunning(true)
    setSessionPhase("pip")
    setTryoutStartTime(new Date().toISOString().replace("T", " ").substring(0, 19))
    showToast("Sesi 1: CAT PIP dimulai. Waktu 45 menit berjalan.", "info")
  }

  // --------------------------------------------------------------------------
  // FINALIZE SESSION 1: PIP -> SHOW PIP SCORECARD
  // --------------------------------------------------------------------------
  function finalizePipSession() {
    setIsTimerRunning(false)
    setShowConfirmSubmitModal(false)
    setSessionPhase("pip-final")
    showToast("Sesi 1 (PIP) telah final. Skor PIP segera dipublikasikan.", "success")
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
    showToast("Sesi 2: CAT TIU dimulai. Waktu 30 menit berjalan.", "info")
  }

  // --------------------------------------------------------------------------
  // FINALIZE SESSION 2: TIU -> COMPLETE TRYOUT
  // --------------------------------------------------------------------------
  function finalizeTiuSession() {
    setIsTimerRunning(false)
    setShowConfirmSubmitModal(false)
    setSessionPhase("completed")

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
    const prevAttempts = attempts.filter((a) => a.candidateId === selectedCandidate?.id)
    const attemptNumber = prevAttempts.length + 1

    const newAttempt: CatTryoutAttempt = {
      id: `att-${Date.now()}`,
      candidateId: selectedCandidate?.id ?? "cand-001",
      candidateName: selectedCandidate?.name ?? "Peserta Tryout",
      candidateGroup: selectedCandidate?.school ?? "Grup Mandiri",
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

    setAttempts((prev) => [newAttempt, ...prev])
    logAudit(
      "Tryout CAT Selesai",
      selectedCandidate?.name ?? "Peserta",
      `PIP: ${pipScore}/100 (${pipPassed ? "Lolos" : "Remedial"}), TIU: ${tiuScoreScaled}/100 (${tiuPassed ? "Lolos" : "Remedial"})`,
    )
    showToast("Seluruh paket Tryout CAT selesai dievaluasi!", "success")
  }

  // --------------------------------------------------------------------------
  // CALCULATED SCORES FOR CURRENT SESSION
  // --------------------------------------------------------------------------
  const currentPipResults = useMemo(() => {
    if (pipExamQuestions.length === 0) return { correct: 0, total: 50, score: 0, passed: false }
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
    if (!selectedCandidate) return
    const pipPass = currentPipResults.passed
    const tiuPass = currentTiuResults.passed

    // Update PIP score & stage 2
    updateCandidate(selectedCandidate.id, {
      pip: currentPipResults.score,
      tiu: currentTiuResults.scaled,
    })

    updateCandidateStage(
      selectedCandidate.id,
      2,
      pipPass ? "passed" : "review",
      pipPass
        ? `Lolos Tryout CAT PIP (${currentPipResults.score}/100) melampaui PG ${packageConfig.pipPassingGrade}`
        : `Nilai CAT PIP (${currentPipResults.score}/100) di bawah PG ${packageConfig.pipPassingGrade}`,
    )

    updateCandidateStage(
      selectedCandidate.id,
      3,
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
  function handleSelectOption(qId: string, optIdx: number, session: "pip" | "tiu") {
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
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
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
    if (
      confirm(
        `Sinkronkan ${standardCatQuestions.length} butir soal standar resmi Buku Pendidikan Pancasila Kelas X & BPIP (1.039 PIP + 150 TIU)? Butir soal yang belum ada akan ditambahkan.`,
      )
    ) {
      const addedCount = restoreStandardQuestions()
      showToast(
        addedCount > 0
          ? `${addedCount} butir soal standar berhasil disinkronkan (Total: ${standardCatQuestions.length} soal).`
          : `Seluruh ${standardCatQuestions.length} butir soal standar sudah tersinkronisasi.`,
        "success",
      )
    }
  }

  // --------------------------------------------------------------------------
  // FILTERED QUESTIONS FOR BANK TABS
  // --------------------------------------------------------------------------
  const pipQuestionsList = useMemo(() => {
    return questions.filter((q) => {
      if (q.type !== "pip") return false
      if (categoryFilter !== "all" && q.category !== categoryFilter) return false
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
      if (categoryFilter !== "all" && q.category !== categoryFilter) return false
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

  const pipTotalPages = Math.max(1, Math.ceil(pipQuestionsList.length / bankPageSize))
  const pipPagedList = useMemo(() => {
    const start = (bankPage - 1) * bankPageSize
    return pipQuestionsList.slice(start, start + bankPageSize)
  }, [pipQuestionsList, bankPage, bankPageSize])

  const tiuTotalPages = Math.max(1, Math.ceil(tiuQuestionsList.length / bankPageSize))
  const tiuPagedList = useMemo(() => {
    const start = (bankPage - 1) * bankPageSize
    return tiuQuestionsList.slice(start, start + bankPageSize)
  }, [tiuQuestionsList, bankPage, bankPageSize])

  const pipActiveCount = questions.filter((q) => q.type === "pip" && q.status === "active").length
  const tiuActiveCount = questions.filter((q) => q.type === "tiu" && q.status === "active").length

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
  const currentExamQuestionsList = sessionPhase === "pip" ? pipExamQuestions : tiuExamQuestions
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
    <div className="grid gap-6">
      {/* ======================= TOP NAVIGATION & BANNER ======================= */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-[0.68rem] font-black uppercase tracking-wider text-red-700 ring-1 ring-red-200">
              <Zap className="size-3 text-red-600" /> Standar BPIP PRD 1.1
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-semibold text-slate-500">
              Tryout Sekuensial (PIP 45m &rarr; TIU 30m)
            </span>
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
            CAT Tryout PIP &amp; TIU
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Sistem evaluasi berbasis komputer dengan timer otomatis, matriks 50 soal, penilaian
            resmi per sesi, dan rekapitulasi nilai terpadu.
          </p>
        </div>

        {/* TAB SWITCHER */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("tryout")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activeTab === "tryout"
                ? "bg-white text-slate-950 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Play className="size-3.5 text-red-600" />
            <span>Simulasi Ujian</span>
            {sessionPhase !== "idle" && (
              <span className="size-2 rounded-full bg-red-600 animate-pulse" />
            )}
          </button>

          {currentUser.role !== "candidate" && (
            <>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("pip-bank")
                  setCategoryFilter("all")
                  setSearch("")
                }}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  activeTab === "pip-bank"
                    ? "bg-white text-slate-950 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BookOpenCheck className="size-3.5 text-blue-600" />
                <span>Bank PIP ({pipActiveCount})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("tiu-bank")
                  setCategoryFilter("all")
                  setSearch("")
                }}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  activeTab === "tiu-bank"
                    ? "bg-white text-slate-950 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Calculator className="size-3.5 text-purple-600" />
                <span>Bank TIU ({tiuActiveCount})</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("rekap")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activeTab === "rekap"
                ? "bg-white text-slate-950 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UsersRound className="size-3.5 text-emerald-600" />
            <span>Rekap Santri ({attempts.length})</span>
          </button>

          {currentUser.role !== "candidate" && (
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                activeTab === "settings"
                  ? "bg-white text-slate-950 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Konfigurasi Paket & Formula"
            >
              <Settings2 className="size-3.5 text-slate-500" />
              <span className="hidden sm:inline">Paket</span>
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: TRYOUT ENGINE (IDLE LOBBY, PIP EXAM, INTER-SESSION, TIU, RESULT) */}
      {/* ===================================================================== */}
      {activeTab === "tryout" && (
        <div className="grid gap-6">
          {/* -------------------- 1. IDLE LOBBY -------------------- */}
          {sessionPhase === "idle" && (
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="p-6 border-slate-200 lg:col-span-2">
                <div className="flex items-center gap-3">
                  <div className="grid size-12 place-items-center rounded-2xl bg-red-100 text-red-600">
                    <GraduationCap className="size-6" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-slate-950">
                      Mulai Paket Tryout CAT Terpadu
                    </h2>
                    <p className="text-xs text-slate-500">
                      Sesuai spesifikasi PRD Final: Paket 2 sesi berurutan (PIP dahulu, kemudian TIU).
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {currentUser.role === "candidate" ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 flex items-center gap-3">
                      <CandidateAvatar
                        name={selectedCandidate.name}
                        avatar={selectedCandidate.avatar}
                        photoUrl={selectedCandidate.photoUrl}
                        className="size-11 text-xs shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-[0.62rem] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="size-3 text-emerald-600" /> Santri Terverifikasi
                        </span>
                        <p className="truncate text-xs font-bold text-slate-900 mt-0.5">
                          {selectedCandidate.name}
                        </p>
                        <p className="text-[0.68rem] text-slate-500 font-semibold">
                          Nomor: {selectedCandidate.number} · {selectedCandidate.school}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                      Pilih Calon Paskibraka
                      <select
                        value={selectedCandidateId}
                        onChange={(e) => setSelectedCandidateId(e.target.value)}
                        className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200"
                      >
                        {candidates.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.number}) · {c.school}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
                      Paket Tryout Aktif
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-900 truncate">
                      {packageConfig.packageName}
                    </p>
                    <p className="text-[0.68rem] text-slate-500">
                      Maks. {packageConfig.maxAttempts} kali percobaan · Acak butir aktif
                    </p>
                  </div>
                </div>

                {/* TWO SEQUENTIAL SESSIONS TIMELINE */}
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                    Alur Pelaksanaan Sesi Ujian (Sekuensial)
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
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
                      <div className="mt-3 border-t border-slate-100 pt-2 text-[0.68rem] font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="size-3 text-emerald-600" /> Nilai langsung keluar saat selesai
                      </div>
                    </div>

                    {/* SESI 2 CARD */}
                    <div className="relative rounded-xl border border-purple-200 bg-white p-4 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <Badge tone="neutral">Sesi 2 (Lanjutan)</Badge>
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                          <Clock className="size-3.5 text-purple-500" /> 30 Menit
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm font-bold text-slate-900">
                        CAT TIU (Intelegensia Umum)
                      </h4>
                      <ul className="mt-2 space-y-1 text-xs text-slate-600">
                        <li>&bull; 50 Butir Soal (Verbal, Numerik, Logika)</li>
                        <li>&bull; Benar +1, Salah 0 (Maks Mentah 50)</li>
                        <li>&bull; Nilai Skala 100: Skor Mentah &times; 2 (PG: 70)</li>
                      </ul>
                      <div className="mt-3 border-t border-slate-100 pt-2 text-[0.68rem] text-slate-500 flex items-center gap-1">
                        <ShieldCheck className="size-3 text-purple-600" /> Terkunci sampai Sesi 1 PIP selesai
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Info className="size-4 text-blue-500 shrink-0" />
                    <span>
                      Sistem menggunakan autosave otomatis. Jawaban tersimpan setiap kali tombol opsi diklik.
                    </span>
                  </div>

                  <Button
                    onClick={startPipSession}
                    className="!px-6 !py-2.5 !text-sm !font-bold shadow-md bg-red-600 hover:bg-red-700"
                  >
                    <Play className="size-4" /> Mulai Sesi 1: CAT PIP
                  </Button>
                </div>
              </Card>

              {/* PARTICIPANT OVERVIEW & ATTEMPTS CARD */}
              <div className="grid gap-6">
                <Card className="p-5 border-slate-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Data Calon Peserta
                  </h3>
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
                      <p className="text-xs text-slate-500">{selectedCandidate.school}</p>
                      <p className="text-[0.68rem] font-semibold text-slate-400">
                        Nomor: {selectedCandidate.number}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                    <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                      <span className="text-[0.65rem] font-bold uppercase text-slate-500">
                        Nilai PIP Saat Ini
                      </span>
                      <p className="mt-0.5 text-lg font-black text-slate-900">
                        {selectedCandidate.pip !== null ? selectedCandidate.pip.toFixed(0) : "—"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                      <span className="text-[0.65rem] font-bold uppercase text-slate-500">
                        Nilai TIU Saat Ini
                      </span>
                      <p className="mt-0.5 text-lg font-black text-slate-900">
                        {selectedCandidate.tiu !== null ? selectedCandidate.tiu.toFixed(0) : "—"}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* PRD SPECIFICATION MINI CARD */}
                <Card className="p-5 border-slate-200 bg-slate-50/60">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-amber-500" /> Ketentuan Resmi PRD 1.1
                  </h3>
                  <div className="mt-3 space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span>Model Ujian</span>
                      <span className="font-bold text-slate-900">1 Paket, 2 Sesi</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span>Durasi Total</span>
                      <span className="font-bold text-slate-900">75 Menit (45m + 30m)</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span>Jumlah Soal</span>
                      <span className="font-bold text-slate-900">100 Soal (50 + 50)</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span>Passing Grade PIP</span>
                      <span className="font-bold text-emerald-700">&ge; 70.0 (35 Benar)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Passing Grade TIU</span>
                      <span className="font-bold text-emerald-700">&ge; 70.0 (35 Benar)</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* -------------------- 2. ACTIVE EXAM SCREEN (PIP or TIU) -------------------- */}
          {(sessionPhase === "pip" || sessionPhase === "tiu") && currentExamQuestion && (
            <div className="grid gap-6">
              {/* EXAM TOP BAR (PRD Section 6.2) */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 p-4 text-white shadow-lg">
                <div className="flex items-center gap-3">
                  <Badge tone={sessionPhase === "pip" ? "danger" : "info"} className="text-xs font-black">
                    {sessionPhase === "pip" ? "SESI 1: CAT PIP" : "SESI 2: CAT TIU"}
                  </Badge>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {selectedCandidate.name}{" "}
                      <span className="text-slate-400 font-normal">({selectedCandidate.number})</span>
                    </h3>
                    <p className="text-[0.68rem] text-slate-400">
                      {packageConfig.packageName} · {sessionPhase === "pip" ? "Pancasila & TWK" : "Intelegensia Umum"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* AUTOSAVE PILL */}
                  <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-slate-800/80 px-3 py-1 text-xs text-slate-300 border border-slate-700">
                    {isSavingAnswer ? (
                      <>
                        <RefreshCw className="size-3.5 animate-spin text-amber-400" />
                        <span className="text-amber-300">Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Check className="size-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Tersimpan</span>
                      </>
                    )}
                  </div>

                  {/* TIMER COUNTDOWN (Alert: <= 5m Yellow, <= 1m Red Pulsing) */}
                  <div
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 font-display text-base font-black tracking-wider transition ${
                      secondsLeft <= 60
                        ? "bg-red-600 text-white animate-pulse"
                        : secondsLeft <= 300
                          ? "bg-amber-500 text-slate-950 font-extrabold"
                          : "bg-slate-800 text-amber-400 border border-slate-700"
                    }`}
                  >
                    <Clock className="size-4" />
                    <span>{formatTimer(secondsLeft)}</span>
                  </div>

                  <Button
                    variant="danger"
                    onClick={() => setShowConfirmSubmitModal(true)}
                    className="!px-4 !py-2 !text-xs font-bold"
                  >
                    Selesaikan Sesi
                  </Button>
                </div>
              </div>

              {/* MAIN QUESTION WORKSPACE & 50-MATRIX */}
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
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
                          checked={Boolean(currentFlaggedMap[currentExamQuestion.id])}
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
                        const isSelected = currentAnswersMap[currentExamQuestion.id] === optIdx
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
                            <span className="pt-0.5 leading-relaxed">{optText}</span>
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
                              setPipCurrentIdx((i) => Math.min(totalCount - 1, i + 1))
                            } else {
                              setTiuCurrentIdx((i) => Math.min(totalCount - 1, i + 1))
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
                      <Badge tone="info" className="text-[0.68rem] font-bold">
                        {answeredCount} / {totalCount} Dijawab
                      </Badge>
                    </div>

                    {/* 50 NUMBER GRID */}
                    <div className="mt-3 grid grid-cols-5 gap-1.5 max-h-[22rem] overflow-y-auto pr-1">
                      {currentExamQuestionsList.map((q, idx) => {
                        const isAnswered = currentAnswersMap[q.id] !== undefined
                        const isFlagged = Boolean(currentFlaggedMap[q.id])
                        const isCurrent = idx === currentExamIdx

                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => {
                              if (sessionPhase === "pip") setPipCurrentIdx(idx)
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
                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-[0.68rem] text-slate-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="size-3 rounded-md bg-emerald-600" />
                          <span>Sudah Dijawab</span>
                        </div>
                        <span className="font-bold text-slate-800">{answeredCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="size-3 rounded-md bg-amber-300 border border-amber-400" />
                          <span>Ragu-ragu</span>
                        </div>
                        <span className="font-bold text-slate-800">{flaggedCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="size-3 rounded-md bg-slate-100 border border-slate-200" />
                          <span>Belum Dijawab</span>
                        </div>
                        <span className="font-bold text-slate-800">{unansweredCount}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <Button
                      variant="danger"
                      onClick={() => setShowConfirmSubmitModal(true)}
                      className="w-full !text-xs font-bold"
                    >
                      Selesaikan {sessionPhase === "pip" ? "Sesi PIP" : "Sesi TIU"}
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* -------------------- 3. INTER-SESSION GATE: PIP FINALIZED -------------------- */}
          {sessionPhase === "pip-final" && (
            <Card className="overflow-hidden border-slate-200">
              <div className="bg-slate-950 p-6 sm:p-8 text-white">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Badge
                      tone={currentPipResults.passed ? "success" : "danger"}
                      className="text-xs font-bold px-3 py-1"
                    >
                      {currentPipResults.passed
                        ? "LOLOS PASSING GRADE PIP (≥ 70)"
                        : "BELUM MEMENUHI PASSING GRADE PIP (< 70)"}
                    </Badge>
                    <h2 className="mt-3 font-display text-2xl sm:text-3xl font-extrabold text-white">
                      Hasil Sesi 1: CAT PIP Selesai
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-slate-300">
                      Peserta: <strong>{selectedCandidate.name}</strong> ({selectedCandidate.school})
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center sm:text-right">
                    <p className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
                      Skor Akhir PIP
                    </p>
                    <p className="font-display text-4xl sm:text-5xl font-black text-amber-400">
                      {currentPipResults.score}
                      <span className="text-base font-normal text-slate-400"> / 100</span>
                    </p>
                    <p className="text-xs text-slate-300 mt-1">
                      {currentPipResults.correct} dari 50 soal benar (&times;2 poin)
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-xl bg-white/10 p-4 text-xs text-slate-200 leading-relaxed border border-white/10">
                  <strong className="text-white">Ketentuan PRD Antar-Sesi:</strong> Sesi 1 (PIP)
                  telah resmi difinalisasi. Nilai PIP tersimpan permanen dan sekarang Sesi 2 (TIU)
                  telah terbuka. Anda dapat langsung melanjutkan pengerjaan 50 soal TIU (30 menit).
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button
                    onClick={startTiuSession}
                    className="!px-6 !py-3 !text-sm font-bold bg-purple-600 hover:bg-purple-700 shadow-md"
                  >
                    <Play className="size-4" /> Lanjut ke Sesi 2: CAT TIU (30 Menit)
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => {
                      setReviewTab("pip")
                      setActiveTab("tryout")
                    }}
                    className="bg-white/10 text-white hover:bg-white/20 !text-xs"
                  >
                    <BookOpenCheck className="size-4" /> Tinjau Pembahasan PIP
                  </Button>
                </div>
              </div>

              {/* REVIEW ACCORDION FOR PIP */}
              <div className="p-6 divide-y divide-slate-100 max-h-96 overflow-y-auto">
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
                      <p className="mt-1 text-slate-700 font-medium">{q.question}</p>
                      <p className="mt-1 text-[0.68rem] text-slate-500">
                        Kunci: {["A", "B", "C", "D", "E"][q.correctIndex]}. {q.options[q.correctIndex]}
                      </p>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* -------------------- 4. TRYOUT COMPLETED SCREEN (COMBINED REPORT) -------------------- */}
          {sessionPhase === "completed" && (
            <div className="grid gap-6">
              {/* TOP HEADER RESULTS CARD */}
              <Card className="overflow-hidden border-slate-200">
                <div className="bg-slate-950 p-6 sm:p-8 text-white">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          tone={
                            currentPipResults.passed && currentTiuResults.passed
                              ? "success"
                              : "warning"
                          }
                          className="text-xs font-black px-3 py-1"
                        >
                          {currentPipResults.passed && currentTiuResults.passed
                            ? "LOLOS KEDUA SESI TRYOUT (BPIP)"
                            : "SELESAI — MEMERLUKAN PENGUATAN"}
                        </Badge>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-300">
                          2 Sesi Berurutan Selesai
                        </span>
                      </div>

                      <h2 className="mt-3 font-display text-2xl sm:text-3xl font-extrabold text-white">
                        Laporan Evaluasi Lengkap CAT BPIP
                      </h2>
                      <p className="mt-1 text-xs sm:text-sm text-slate-300">
                        Santri / Peserta: <strong>{selectedCandidate.name}</strong> ({selectedCandidate.school})
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center sm:text-right">
                      <p className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
                        Nilai Gabungan Skala 100
                      </p>
                      <p className="font-display text-4xl sm:text-5xl font-black text-amber-400">
                        {combinedTryoutScore}
                        <span className="text-base font-normal text-slate-400"> / 100</span>
                      </p>
                      <p className="text-xs text-slate-300 mt-1">
                        Rata-rata terbobot PIP &amp; TIU
                      </p>
                    </div>
                  </div>

                  {/* DUAL METRIC CARDS */}
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {/* PIP SCORECARD */}
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300">
                          Sesi 1: Pancasila &amp; Wawasan (PIP)
                        </span>
                        <Badge tone={currentPipResults.passed ? "success" : "danger"}>
                          {currentPipResults.passed ? "Lolos PG" : "Remedial"}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="font-display text-3xl font-black text-white">
                          {currentPipResults.score}
                          <span className="text-xs font-normal text-slate-400"> / 100</span>
                        </span>
                        <span className="text-xs text-slate-300">
                          {currentPipResults.correct} / 50 Soal Benar (&times;2)
                        </span>
                      </div>
                      <p className="mt-2 text-[0.68rem] text-slate-400 border-t border-white/10 pt-2">
                        Passing Grade: &ge; {packageConfig.pipPassingGrade} · Materi: Sejarah, Sila, UUD, NKRI
                      </p>
                    </div>

                    {/* TIU SCORECARD */}
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300">
                          Sesi 2: Intelegensia Umum (TIU)
                        </span>
                        <Badge tone={currentTiuResults.passed ? "success" : "danger"}>
                          {currentTiuResults.passed ? "Lolos PG" : "Remedial"}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="font-display text-3xl font-black text-white">
                          {currentTiuResults.scaled}
                          <span className="text-xs font-normal text-slate-400"> / 100</span>
                        </span>
                        <span className="text-xs text-slate-300">
                          Skor Mentah: {currentTiuResults.raw} / 50 (&times;2)
                        </span>
                      </div>
                      <p className="mt-2 text-[0.68rem] text-slate-400 border-t border-white/10 pt-2">
                        Passing Grade: &ge; {packageConfig.tiuPassingGrade} · Materi: Verbal, Numerik, Logika
                      </p>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Button
                      onClick={handleSyncToCandidateProfile}
                      className="!px-5 !py-2.5 font-bold shadow-sm bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Save className="size-4" /> Sinkronkan Nilai ke Profil Siswa
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={() => setSessionPhase("idle")}
                      className="bg-white/10 text-white hover:bg-white/20 !text-xs"
                    >
                      <RotateCcw className="size-4" /> Ulangi / Mulai Paket Baru
                    </Button>
                  </div>
                </div>

                {/* DETAILED QUESTIONS REVIEW & EXPLANATIONS */}
                <div className="p-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="font-display text-base font-bold text-slate-900">
                        Tinjauan Pembahasan &amp; Kunci Jawaban Lengkap
                      </h3>
                      <p className="text-xs text-slate-500">
                        Pelajari butir soal dan rasionalisasi pembahasan untuk evaluasi pembinaan.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1">
                      <button
                        type="button"
                        onClick={() => setReviewTab("pip")}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          reviewTab === "pip"
                            ? "bg-white text-slate-900 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Pembahasan PIP (50 Soal)
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewTab("tiu")}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          reviewTab === "tiu"
                            ? "bg-white text-slate-900 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Pembahasan TIU (50 Soal)
                      </button>
                    </div>
                  </div>

                  {/* QUESTIONS LIST ACCORDING TO ACTIVE REVIEW TAB */}
                  <div className="mt-4 divide-y divide-slate-100 max-h-[32rem] overflow-y-auto pr-2">
                    {(reviewTab === "pip" ? pipExamQuestions : tiuExamQuestions).map((q, idx) => {
                      const userAns =
                        reviewTab === "pip" ? pipAnswers[q.id] : tiuAnswers[q.id]
                      const isCorrect = userAns === q.correctIndex

                      return (
                        <div key={q.id} className="py-4">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-xs font-bold text-slate-900">
                              Nomor {idx + 1} · {q.category}
                            </span>
                            <Badge tone={isCorrect ? "success" : "danger"}>
                              {isCorrect ? "Jawaban Benar" : "Salah / Kosong"}
                            </Badge>
                          </div>

                          <p className="mt-1.5 text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed">
                            {q.question}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
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

                          <div className="mt-2.5 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
                            <strong className="text-slate-900">Pembahasan:</strong>{" "}
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
          {/* OVERVIEW CARDS */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4 border-slate-200">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
                Total Butir Soal PIP
              </span>
              <p className="mt-2 font-display text-2xl font-black text-slate-950">
                {pipActiveCount}{" "}
                <span className="text-xs font-semibold text-slate-400">soal aktif</span>
              </p>
              <p className="mt-1 text-[0.68rem] text-slate-500">
                Target paket: 50 butir soal lengkap
              </p>
            </Card>

            <Card className="p-4 border-slate-200">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
                Passing Grade Resmi
              </span>
              <p className="mt-2 font-display text-2xl font-black text-emerald-700">
                &ge; 70.0 <span className="text-xs font-semibold text-slate-400">/ 100</span>
              </p>
              <p className="mt-1 text-[0.68rem] text-slate-500">
                Minimal 35 butir benar (&times;2 poin)
              </p>
            </Card>

            <Card className="p-4 border-slate-200">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
                Durasi Ujian Resmi
              </span>
              <p className="mt-2 font-display text-2xl font-black text-slate-950">
                45 Menit <span className="text-xs font-semibold text-slate-400">/ sesi</span>
              </p>
              <p className="mt-1 text-[0.68rem] text-slate-500">
                Timer server &amp; submit otomatis
              </p>
            </Card>

            <Card className="p-4 border-slate-200 flex flex-col justify-between">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
                Aksi Cepat PIP
              </span>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  onClick={() => openCreateQuestion("pip")}
                  className="!px-3 !py-1.5 !text-xs flex-1"
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
            </Card>
          </div>

          {/* DOMAIN FILTER PILLS */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                categoryFilter === "all"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Semua Domain PIP ({questions.filter((q) => q.type === "pip").length})
            </button>
            {pipCategories.map((cat) => {
              const count = questions.filter(
                (q) => q.type === "pip" && q.category === cat,
              ).length
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    categoryFilter === cat
                      ? "bg-red-600 text-white shadow-2xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {cat} ({count})
                </button>
              )
            })}
          </div>

          {/* SEARCH & QUESTIONS LIST */}
          <Card className="overflow-hidden border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari dari 1.039 butir soal PIP, opsi, pasal, atau materi..."
                  className="!pl-9 !text-xs"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span>
                  Menampilkan{" "}
                  <strong>
                    {pipQuestionsList.length === 0
                      ? 0
                      : (bankPage - 1) * bankPageSize + 1}
                    –
                    {Math.min(bankPage * bankPageSize, pipQuestionsList.length)}
                  </strong>{" "}
                  dari <strong>{pipQuestionsList.length}</strong> soal PIP
                </span>
                <Button
                  variant="secondary"
                  disabled={bankPage <= 1}
                  onClick={() => setBankPage((p) => Math.max(1, p - 1))}
                  className="!px-2.5 !py-1 !text-xs"
                >
                  <ArrowLeft className="size-3.5" />
                </Button>
                <span className="font-bold text-slate-900">
                  Hal {bankPage} / {pipTotalPages}
                </span>
                <Button
                  variant="secondary"
                  disabled={bankPage >= pipTotalPages}
                  onClick={() => setBankPage((p) => Math.min(pipTotalPages, p + 1))}
                  className="!px-2.5 !py-1 !text-xs"
                >
                  <ArrowRight className="size-3.5" />
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
                  <div key={q.id} className="p-5 hover:bg-slate-50/60 transition">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[0.68rem] font-bold text-white">
                          #{(bankPage - 1) * bankPageSize + idx + 1}
                        </span>
                        <Badge tone="info">{q.category}</Badge>
                        <Badge tone={q.status === "active" ? "success" : "neutral"}>
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
                            if (confirm("Hapus butir soal ini dari bank soal?")) {
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
                      <p className="mt-2.5 rounded-lg bg-slate-50/80 p-2 text-[0.68rem] text-slate-600 leading-relaxed">
                        <strong className="text-slate-800">Pembahasan:</strong> {q.explanation}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {pipTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-600">
                <span>
                  Halaman <strong>{bankPage}</strong> dari <strong>{pipTotalPages}</strong> ({pipQuestionsList.length} butir soal)
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
                    onClick={() => setBankPage((p) => Math.min(pipTotalPages, p + 1))}
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
          {/* OVERVIEW CARDS */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4 border-slate-200">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
                Total Butir Soal TIU
              </span>
              <p className="mt-2 font-display text-2xl font-black text-slate-950">
                {tiuActiveCount}{" "}
                <span className="text-xs font-semibold text-slate-400">soal aktif</span>
              </p>
              <p className="mt-1 text-[0.68rem] text-slate-500">
                Verbal, Numerik, Logika &amp; Analitis
              </p>
            </Card>

            <Card className="p-4 border-slate-200">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
                Passing Grade Resmi
              </span>
              <p className="mt-2 font-display text-2xl font-black text-emerald-700">
                &ge; 70.0 <span className="text-xs font-semibold text-slate-400">/ 100</span>
              </p>
              <p className="mt-1 text-[0.68rem] text-slate-500">
                Skor mentah &ge; 35 (skala 100: skor &times; 2)
              </p>
            </Card>

            <Card className="p-4 border-slate-200">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
                Durasi Ujian Resmi
              </span>
              <p className="mt-2 font-display text-2xl font-black text-slate-950">
                30 Menit <span className="text-xs font-semibold text-slate-400">/ sesi</span>
              </p>
              <p className="mt-1 text-[0.68rem] text-slate-500">
                50 butir pilihan ganda A–E
              </p>
            </Card>

            <Card className="p-4 border-slate-200 flex flex-col justify-between">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
                Aksi Cepat TIU
              </span>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  onClick={() => openCreateQuestion("tiu")}
                  className="!px-3 !py-1.5 !text-xs flex-1"
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
            </Card>
          </div>

          {/* SUBMATERI FILTER PILLS */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                categoryFilter === "all"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Semua TIU ({questions.filter((q) => q.type === "tiu").length})
            </button>
            {tiuCategories.map((cat) => {
              const count = questions.filter(
                (q) => q.type === "tiu" && q.category === cat,
              ).length
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-xl px-2.5 py-1 text-[0.68rem] font-bold transition whitespace-nowrap ${
                    categoryFilter === cat
                      ? "bg-purple-600 text-white shadow-2xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {cat} ({count})
                </button>
              )
            })}
          </div>

          {/* SEARCH & QUESTIONS LIST */}
          <Card className="overflow-hidden border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari dari 150 butir soal TIU, opsi, rumus, atau logika..."
                  className="!pl-9 !text-xs"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span>
                  Menampilkan{" "}
                  <strong>
                    {tiuQuestionsList.length === 0
                      ? 0
                      : (bankPage - 1) * bankPageSize + 1}
                    –
                    {Math.min(bankPage * bankPageSize, tiuQuestionsList.length)}
                  </strong>{" "}
                  dari <strong>{tiuQuestionsList.length}</strong> soal TIU
                </span>
                <Button
                  variant="secondary"
                  disabled={bankPage <= 1}
                  onClick={() => setBankPage((p) => Math.max(1, p - 1))}
                  className="!px-2.5 !py-1 !text-xs"
                >
                  <ArrowLeft className="size-3.5" />
                </Button>
                <span className="font-bold text-slate-900">
                  Hal {bankPage} / {tiuTotalPages}
                </span>
                <Button
                  variant="secondary"
                  disabled={bankPage >= tiuTotalPages}
                  onClick={() => setBankPage((p) => Math.min(tiuTotalPages, p + 1))}
                  className="!px-2.5 !py-1 !text-xs"
                >
                  <ArrowRight className="size-3.5" />
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
                  <div key={q.id} className="p-5 hover:bg-slate-50/60 transition">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-purple-900 px-2 py-0.5 text-[0.68rem] font-bold text-white">
                          #{(bankPage - 1) * bankPageSize + idx + 1}
                        </span>
                        <Badge tone="warning">{q.category}</Badge>
                        <Badge tone={q.status === "active" ? "success" : "neutral"}>
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
                            if (confirm("Hapus butir soal ini dari bank soal?")) {
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
                      <p className="mt-2.5 rounded-lg bg-slate-50/80 p-2 text-[0.68rem] text-slate-600 leading-relaxed">
                        <strong className="text-slate-800">Pembahasan:</strong> {q.explanation}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {tiuTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-600">
                <span>
                  Halaman <strong>{bankPage}</strong> dari <strong>{tiuTotalPages}</strong> ({tiuQuestionsList.length} butir soal)
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
                    onClick={() => setBankPage((p) => Math.min(tiuTotalPages, p + 1))}
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
                <Button onClick={handleExportCsv} className="!px-3.5 !py-2 !text-xs font-bold">
                  <FileSpreadsheet className="size-4" /> Unduh Format PRD (CSV)
                </Button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-xs">
              <thead className="bg-slate-50 text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Santri / Peserta</th>
                  <th className="px-4 py-3.5">Asal Sekolah</th>
                  <th className="px-4 py-3.5">Skor PIP (PG 70)</th>
                  <th className="px-4 py-3.5">Status PIP</th>
                  <th className="px-4 py-3.5">TIU Mentah</th>
                  <th className="px-4 py-3.5">TIU Skala 100</th>
                  <th className="px-4 py-3.5">Status TIU</th>
                  <th className="px-4 py-3.5">Rata-Rata Gabungan</th>
                  {currentUser.role !== "candidate" && (
                    <th className="px-5 py-3.5 text-right">Uji Cepat</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(currentUser.role === "candidate" && currentUser.candidateId
                  ? candidates.filter((c) => c.id === currentUser.candidateId)
                  : candidates
                ).map((cand) => {
                  const pipScore = cand.pip
                  const tiuScore = cand.tiu
                  const pipPass = pipScore !== null && pipScore >= 70
                  const tiuPass = tiuScore !== null && tiuScore >= 70
                  const combined =
                    pipScore !== null && tiuScore !== null
                      ? Math.round((pipScore + tiuScore) / 2)
                      : null

                  return (
                    <tr key={cand.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <CandidateAvatar
                            name={cand.name}
                            avatar={cand.avatar}
                            photoUrl={cand.photoUrl}
                            className="size-8 text-xs shrink-0"
                          />
                          <div>
                            <p className="font-bold text-slate-900">{cand.name}</p>
                            <p className="text-[0.68rem] text-slate-400">{cand.number}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 font-medium">{cand.school}</td>

                      <td className="px-4 py-3.5 font-bold tabular-nums">
                        {pipScore !== null ? (
                          <span className={pipPass ? "text-emerald-700 font-extrabold" : "text-amber-700"}>
                            {pipScore.toFixed(0)} <span className="text-[0.68rem] text-slate-400">/ 100</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">Belum Ujian</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge tone={pipPass ? "success" : pipScore !== null ? "warning" : "neutral"}>
                          {pipPass ? "Lolos (≥70)" : pipScore !== null ? "Remedial" : "—"}
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
                          <span className={tiuPass ? "text-emerald-700 font-extrabold" : "text-amber-700"}>
                            {tiuScore.toFixed(0)} <span className="text-[0.68rem] text-slate-400">/ 100</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">Belum Ujian</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge tone={tiuPass ? "success" : tiuScore !== null ? "warning" : "neutral"}>
                          {tiuPass ? "Lolos (≥70)" : tiuScore !== null ? "Remedial" : "—"}
                        </Badge>
                      </td>

                      <td className="px-4 py-3.5 font-extrabold text-slate-900 tabular-nums">
                        {combined !== null ? (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5">
                            {combined}
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
                            className="!px-2.5 !py-1 !text-[0.68rem] font-bold text-red-600 hover:bg-red-50"
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
                Sesuaikan durasi timer, bobot passing grade, dan kebijakan pengacakan butir soal.
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
                    setPackageConfig((p) => ({ ...p, packageName: e.target.value }))
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
                    <option value={45}>45 Menit (Standar PRD)</option>
                    <option value={30}>30 Menit</option>
                    <option value={60}>60 Menit</option>
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
                    <option value={30}>30 Menit (Standar PRD)</option>
                    <option value={20}>20 Menit</option>
                    <option value={45}>45 Menit</option>
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
                  <span>Batas Maksimum Percobaan Santri</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={packageConfig.maxAttempts}
                    onChange={(e) =>
                      setPackageConfig((p) => ({
                        ...p,
                        maxAttempts: Number(e.target.value),
                      }))
                    }
                    className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs text-right font-bold"
                  />
                </label>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-600 leading-relaxed space-y-1.5">
                <p className="font-bold text-slate-900">Ketentuan Rumus Penilaian (PRD 4.3):</p>
                <p>&bull; Sesi PIP: 50 soal, Benar +2, Salah/Kosong 0 &rarr; Maks 100.</p>
                <p>&bull; Sesi TIU: 50 soal, Benar +1, Salah/Kosong 0 &rarr; Mentah Maks 50 &rarr; Skala 100: Skor Mentah &times; 2.</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: SUBMIT CONFIRMATION (PRD Section 6.2) */}
      {/* ===================================================================== */}
      {showConfirmSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
                <AlertCircle className="size-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-slate-950">
                  Konfirmasi Selesaikan {sessionPhase === "pip" ? "Sesi 1 (PIP)" : "Sesi 2 (TIU)"}
                </h3>
                <p className="text-xs text-slate-500">
                  Periksa kembali rekapitulasi jawaban sebelum memfinalisasi sesi ini.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-100">
                <p className="text-[0.68rem] font-bold uppercase text-emerald-800">Dijawab</p>
                <p className="mt-1 text-xl font-black text-emerald-700">{answeredCount}</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3 border border-amber-100">
                <p className="text-[0.68rem] font-bold uppercase text-amber-800">Ragu-ragu</p>
                <p className="mt-1 text-xl font-black text-amber-700">{flaggedCount}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <p className="text-[0.68rem] font-bold uppercase text-slate-600">Kosong</p>
                <p className="mt-1 text-xl font-black text-slate-700">{unansweredCount}</p>
              </div>
            </div>

            {unansweredCount > 0 && (
              <p className="mt-4 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 leading-relaxed font-semibold">
                Perhatian: Masih ada {unansweredCount} butir soal yang belum Anda jawab. Soal kosong bernilai 0.
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
                <p className="text-[0.68rem] font-bold uppercase tracking-wider text-red-600">
                  Bank Soal CAT BPIP
                </p>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  {editingQuestionId ? "Edit Butir Soal" : "Tambah Butir Soal Baru"}
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
                        category: t === "tiu" ? tiuCategories[0] : pipCategories[0],
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
                    onChange={(e) => setQForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-red-500"
                  >
                    {(qForm.type === "pip" ? pipCategories : tiuCategories).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                Pertanyaan Soal
                <textarea
                  rows={3}
                  value={qForm.question}
                  onChange={(e) => setQForm((prev) => ({ ...prev, question: e.target.value }))}
                  placeholder="Ketikkan narasi pertanyaan soal secara lengkap..."
                  className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed outline-none focus:border-red-500"
                />
              </label>

              <div className="grid gap-2">
                <span className="text-xs font-bold text-slate-700">
                  Pilihan Jawaban (A s.d. E) &amp; Kunci Benar:
                </span>
                {(["optionA", "optionB", "optionC", "optionD", "optionE"] as const).map(
                  (field, idx) => {
                    const letter = ["A", "B", "C", "D", "E"][idx]
                    const isCorrect = qForm.correctIndex === idx
                    return (
                      <div key={field} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQForm((prev) => ({ ...prev, correctIndex: idx }))}
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
                            setQForm((prev) => ({ ...prev, [field]: e.target.value }))
                          }
                          placeholder={`Teks pilihan ${letter}...`}
                          className={`!text-xs flex-1 ${
                            isCorrect ? "!border-emerald-400 !bg-emerald-50/40" : ""
                          }`}
                        />
                      </div>
                    )
                  },
                )}
              </div>

              <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                Penjelasan &amp; Pembahasan
                <textarea
                  rows={2}
                  value={qForm.explanation}
                  onChange={(e) => setQForm((prev) => ({ ...prev, explanation: e.target.value }))}
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

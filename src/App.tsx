import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react"
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bell,
  BookOpenCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Cloud,
  Download,
  Edit3,
  Eye,
  FileCheck2,
  Flame,
  FileSpreadsheet,
  GraduationCap,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  PanelLeftClose,
  Plus,
  Printer,
  RefreshCw,
  RotateCw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  Upload,
  UserRound,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react"
import {
  Badge,
  Button,
  CandidateAvatar,
  Card,
  Input,
  UserAvatar,
} from "./components/ui"
import { AppProvider, useApp } from "./context/AppContext"
import { candidates as initialCandidates } from "./data/initialData"
import {
  administrationDocuments,
  fitnessScore,
  fitnessTables,
  pbbRubric,
  pipTopics,
  tiuTopics,
} from "./data/selectionGuide"
import {
  ageOnReferenceDate,
  bmi,
  compareRankedCandidates,
  evaluateAnthropometry,
  evaluateRankingAnthropometry,
  finalScore,
  selectionStages,
  type Candidate,
  type CatTryoutAttempt,
  type StageStatus,
} from "./domain/selection"
import {
  CandidateDetailView,
  CreateCandidateModal,
} from "./features/candidates/CandidateModal"
import { CandidateIntervalView } from "./features/candidates/CandidateIntervalView"
import { extractCandidateIntervalLogs } from "./domain/intervalAnalytics"
import CandidateProjection from "./features/progress/CandidateProjection"
import { StageCards } from "./features/progress/StageCards"
import { getProgressStageStatuses } from "./features/progress/readiness"
import {
  CandidateLoginModal,
  LoginScreen,
} from "./features/users/UsersAndAuditModal"
import { GoogleSheetSyncModal } from "./components/GoogleSheetSyncModal"
import { formatLastSync } from "./lib/googleSheetSync"
import logoUrl from "./assets/BACAPASMUIN.webp"
import {
  downloadCandidateTemplateCsv,
  exportCandidatesCsv,
  exportRankingCsv,
  printCandidateReport,
} from "./lib/exportUtils"

const GuideView = lazy(() => import("./features/guide/GuideView"))
const SimulationCenter = lazy(
  () => import("./features/simulation/SimulationCenter"),
)
const CatBankView = lazy(() => import("./features/cat/CatBankView"))
const DocumentsView = lazy(() => import("./features/documents/DocumentsView"))
const IshiharaView = lazy(() => import("./features/ishihara/IshiharaView"))
const UsersAuditView = lazy(() => import("./features/users/UsersAuditView"))

export type View = "overview" | "candidate-home" | "candidate-stages" | "candidate-results" | "candidate-progress" | "candidate-ranking" | "sessions" | "guide" | "stages" | "candidates" | "progress" | "ranking" | "standards" | "cat-bank" | "documents" | "ishihara" | "users-audit"

type NavItem = {
  id: View
  label: string
  icon: typeof LayoutDashboard
  hasCount?: boolean
}

type NavSection = {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: "Pendidikan & Latihan",
    items: [
      { id: "overview", label: "Ringkasan", icon: LayoutDashboard },
      { id: "sessions", label: "Sesi & latihan", icon: ClipboardCheck },
      { id: "candidates", label: "Kandidat", icon: UsersRound, hasCount: true },
      { id: "progress", label: "Perkembangan", icon: Activity },
      { id: "cat-bank", label: "CAT Tryout (PIP & TIU)", icon: GraduationCap },
    ],
  },
  {
    title: "Seleksi",
    items: [
      { id: "stages", label: "Tahapan seleksi", icon: Settings2 },
      { id: "ranking", label: "Pemeringkatan sementara", icon: Trophy },
      {
        id: "standards",
        label: "Standar & kalkulator",
        icon: SlidersHorizontal,
      },
    ],
  },
  {
    title: "Panduan",
    items: [
      { id: "guide", label: "Panduan lengkap", icon: BookOpenCheck },
      { id: "documents", label: "Dokumen & regulasi", icon: FileCheck2 },
      { id: "ishihara", label: "Tes buta warna (Ishihara)", icon: Eye },
    ],
  },
  {
    title: "Administrasi",
    items: [
      {
        id: "users-audit",
        label: "Manajemen staf & audit",
        icon: ShieldCheck,
      },
    ],
  },
]

const candidateNavSections: NavSection[] = [
  {
    title: "Portal kandidat",
    items: [
      { id: "candidate-home", label: "Beranda saya", icon: LayoutDashboard },
      { id: "candidate-stages", label: "Tahapan seleksi", icon: CheckCircle2 },
      { id: "candidate-progress", label: "Perkembangan saya", icon: Activity },
      { id: "candidate-ranking", label: "Peringkat sementara", icon: Trophy },
      { id: "cat-bank", label: "Latihan & ujian CAT", icon: GraduationCap },
      { id: "candidate-results", label: "Hasil & riwayat", icon: Activity },
      {
        id: "standards",
        label: "Kalkulator Nilai BPIP",
        icon: SlidersHorizontal,
      },
      { id: "ishihara", label: "Tes Buta Warna (Ishihara)", icon: Eye },
    ],
  },
  {
    title: "Materi & Dokumen",
    items: [
      { id: "guide", label: "Panduan Lengkap", icon: BookOpenCheck },
      { id: "documents", label: "Dokumen & Regulasi", icon: FileCheck2 },
    ],
  },
]

function stageTone(status: StageStatus) {
  if (status === "passed") return "bg-emerald-500 text-white"
  if (status === "active") return "bg-blue-600 text-white ring-4 ring-blue-100"
  if (status === "failed") return "bg-red-600 text-white"
  if (status === "review") return "bg-amber-400 text-amber-950"
  return "bg-slate-100 text-slate-400"
}

function stageLabel(status: StageStatus) {
  return {
    passed: "Siap Standar",
    active: "Sedang Dilatih",
    locked: "Belum Dinilai",
    failed: "Perlu Remedial",
    review: "Perlu Penguatan",
  }[status]
}

function StatusBadge({ status }: { status: StageStatus }) {
  const tone =
    status === "passed"
      ? "success"
      : status === "failed"
        ? "danger"
        : status === "locked"
          ? "neutral"
          : status === "review"
            ? "warning"
            : "info"
  return <Badge tone={tone}>{stageLabel(status)}</Badge>
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src={logoUrl}
        alt="BACAPASMUIN!"
        className="h-8 w-auto object-contain drop-shadow"
      />
      <div>
        <p className="font-display text-sm font-bold tracking-tight text-white leading-none">
          BACAPASMUIN!
        </p>
        <p className="text-3xs font-semibold uppercase tracking-[0.08em] text-amber-400/90 leading-none mt-1">
          Seleksi &amp; Pembinaan Paskibraka
        </p>
      </div>
    </div>
  )
}

function Sidebar({
  view,
  onView,
  mobileOpen,
  onClose,
  onOpenGoogleSync,
}: {
  view: View
  onView: (view: View) => void
  mobileOpen: boolean
  onClose: () => void
  onOpenGoogleSync?: () => void
}) {
  const { currentUser, candidates, logout } = useApp()
  const isCandidate = currentUser.role === "candidate"
  const currentCandidate = isCandidate
    ? candidates.find(
        (c) =>
          c.id === currentUser.candidateId ||
          c.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase(),
      )
    : undefined
  const sectionsToRender = isCandidate ? candidateNavSections : navSections

  return (
    <>
      {mobileOpen ? (
        <button
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={onClose}
          aria-label="Tutup navigasi"
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-950 p-3.5 text-white transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-2 pt-1 pb-3 mb-2 border-b border-white/[0.08]">
          <Brand />
          <Button
            variant="ghost"
            className="!px-1.5 text-slate-300 lg:hidden"
            onClick={onClose}
            aria-label="Tutup menu"
          >
            <X className="size-4" />
          </Button>
        </div>

        <nav
          className="flex-1 space-y-4 overflow-y-auto pr-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Navigasi utama"
        >
          {sectionsToRender.map((section) => (
            <div key={section.title} className="space-y-0.5">
              <p className="px-2.5 pt-2 pb-1 text-3xs font-bold uppercase tracking-widest text-slate-400">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const active = view === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onView(item.id)
                        onClose()
                      }}
                      className={`group flex h-8.5 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-xs transition ${
                        active
                          ? "bg-red-600/90 text-white font-medium shadow-xs shadow-red-950/40"
                          : "text-slate-300 hover:bg-white/[0.06] hover:text-white font-normal"
                      }`}
                    >
                      <Icon
                        className={`size-4 shrink-0 transition-colors ${
                          active
                            ? "text-white"
                            : "text-slate-400 group-hover:text-slate-200"
                        }`}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.hasCount ? (
                        <span
                          className={`text-3xs px-1.5 py-0.5 rounded-full font-bold tabular-nums tracking-tight ${
                            active
                              ? "bg-red-700/80 text-white"
                              : "bg-white/10 text-slate-300"
                          }`}
                        >
                          {candidates.length}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/[0.08] pt-2.5">
          {isCandidate ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-red-500/20 bg-red-950/20 p-1.5 pl-2">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <CandidateAvatar
                  name={currentCandidate?.name || currentUser.name}
                  avatar={currentCandidate?.avatar || currentUser.avatar || "MA"}
                  photoUrl={currentCandidate?.photoUrl}
                  className="size-8 shrink-0 border border-white/20 text-3xs"
                  rounded="rounded-lg"
                />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-white leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="block truncate text-3xs text-slate-400 leading-tight mt-0.5">
                    Sesi Mandiri Santri
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout()
                  onClose()
                }}
                className="flex items-center gap-1 rounded-lg bg-red-500/10 border border-red-500/20 px-2 py-1 text-2xs font-bold text-red-400 hover:bg-red-500/20 transition shrink-0"
                title="Keluar dari sesi santri"
              >
                <LogOut className="size-3" />
                <span>Keluar</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1.5 pl-2">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <UserAvatar
                  avatar={currentUser.avatar}
                  name={currentUser.name}
                  className="size-8"
                  rounded="rounded-lg"
                />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-white leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="block truncate text-3xs text-slate-400 leading-tight mt-0.5">
                    {currentUser.title}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  logout()
                  onClose()
                }}
                className="flex items-center gap-1 rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-2xs font-bold text-red-400 hover:bg-red-500/20 transition shrink-0"
                title="Keluar Sesi (Logout)"
              >
                <LogOut className="size-3.5" />
                <span>Keluar</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

function Header({
  onMenu,
  onView,
  onSelectCandidate,
  onOpenGoogleSync,
}: {
  onMenu: () => void
  onView: (view: View) => void
  onSelectCandidate: (candidateId: string) => void
  onOpenGoogleSync: () => void
}) {
  const {
    candidates,
    currentUser,
    cycles,
    activeCycle,
    setActiveCycleId,
    addCycle,
    deleteCycle,
    standardRules,
    cloudSyncStatus,
    googleSheetUrl,
    lastCloudSync,
    refreshAndSync,
    hasUnsavedChanges,
    logout,
    catTryoutAttempts,
    schedules,
  } = useApp()
  const [searchQuery, setSearchQuery] = useState("")
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [candNotifOpen, setCandNotifOpen] = useState(false)
  const [cycleMenuOpen, setCycleMenuOpen] = useState(false)
  const [showNewCycle, setShowNewCycle] = useState(false)
  const [newCycleName, setNewCycleName] = useState("")
  const [newCycleYear, setNewCycleYear] = useState(2027)
  const [newCycleLevel, setNewCycleLevel] =
    useState<"Kabupaten/Kota" | "Provinsi" | "Pusat">("Kabupaten/Kota")
  const cycleMenuRef = useRef<HTMLDivElement>(null)
  const candNotifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        cycleMenuRef.current &&
        !cycleMenuRef.current.contains(event.target as Node)
      ) {
        setCycleMenuOpen(false)
        setShowNewCycle(false)
      }
      if (
        candNotifRef.current &&
        !candNotifRef.current.contains(event.target as Node)
      ) {
        setCandNotifOpen(false)
      }
    }
    if (cycleMenuOpen || candNotifOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [cycleMenuOpen, candNotifOpen])

  function handleCreateCycle(e: React.FormEvent) {
    e.preventDefault()
    if (!newCycleName.trim()) return
    const yearNum = Number(newCycleYear) || 2027
    addCycle({
      name: newCycleName.trim(),
      year: yearNum,
      level: newCycleLevel,
      referenceDate: `${yearNum}-08-17`,
      status: "active",
    })
    setNewCycleName("")
    setShowNewCycle(false)
    setCycleMenuOpen(false)
  }

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    return candidates
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.number.toLowerCase().includes(q) ||
          c.school.toLowerCase().includes(q) ||
          (c.nik && c.nik.includes(q)),
      )
      .slice(0, 6)
  }, [candidates, searchQuery])

  const notifications = useMemo(() => {
    const items: {
      id: string
      title: string
      detail: string
      targetView: View
      tone: "danger" | "warning" | "info"
    }[] = []

    const medReview = candidates.filter(
      (c) => c.stageStatuses[3] === "review" || c.stageStatuses[3] === "active",
    ).length
    if (medReview > 0) {
      items.push({
        id: "notif-med",
        title: `${medReview} kandidat menunggu evaluasi Rikkes`,
        detail: "Periksa hasil tensi dan survei 21 anamnesis pada Tahap 4.",
        targetView: "stages",
        tone: "danger",
      })
    }

    const incompleteDocs = candidates.filter(
      (c) => (c.documents ?? []).filter(Boolean).length < 6,
    ).length
    if (incompleteDocs > 0) {
      items.push({
        id: "notif-docs",
        title: `${incompleteDocs} kandidat belum melengkapi 6 berkas`,
        detail: "Verifikasi berkas administrasi di halaman Dokumen.",
        targetView: "documents",
        tone: "warning",
      })
    }

    const unverifiedRules = standardRules.filter(
      (r) => r.status !== "Terverifikasi internal",
    ).length
    if (unverifiedRules > 0) {
      items.push({
        id: "notif-rules",
        title: `${unverifiedRules} aturan standar menunggu pengesahan`,
        detail: "Tinjau register aturan pada halaman Standar & Kalkulator.",
        targetView: "standards",
        tone: "info",
      })
    }

    return items
  }, [candidates, standardRules])

  const currentCandidate = useMemo(
    () => candidates.find((c) => c.id === currentUser.candidateId),
    [candidates, currentUser.candidateId],
  )

  const candidateNotifications = useMemo(() => {
    if (currentUser.role !== "candidate" || !currentCandidate) return []
    const items: {
      id: string
      title: string
      detail: string
      targetView: View
      tone: "danger" | "warning" | "info" | "success"
    }[] = []

    // 1. Incomplete documents
    const incompleteDocs =
      6 - (currentCandidate.documents ?? []).filter(Boolean).length
    if (incompleteDocs > 0) {
      items.push({
        id: "cand-docs",
        title: `${incompleteDocs} berkas administrasi belum lengkap`,
        detail: "Lengkapi berkas pendaftaran agar memenuhi syarat seleksi.",
        targetView: "candidate-stages",
        tone: "warning",
      })
    } else {
      items.push({
        id: "cand-docs-ok",
        title: "6 Berkas administrasi lengkap",
        detail: "Seluruh berkas pendaftaran telah diverifikasi dan siap.",
        targetView: "candidate-stages",
        tone: "success",
      })
    }

    // 2. Upcoming schedule
    const myUpcoming = (schedules ?? [])
      .filter(
        (s) =>
          s.assignedCandidateIds?.includes(currentCandidate.id) &&
          s.status !== "completed",
      )
      .filter(
        (s) =>
          new Date(`${s.date}T${s.time || "00:00"}`).getTime() >= Date.now(),
      )
      .sort((a, b) =>
        `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
      )[0]

    if (myUpcoming) {
      items.push({
        id: "cand-sched",
        title: `Jadwal terdekat: ${myUpcoming.title}`,
        detail: `${new Date(`${myUpcoming.date}T${myUpcoming.time || "00:00"}`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" })} · ${myUpcoming.location}`,
        targetView: "candidate-home",
        tone: "info",
      })
    }

    // 3. Coach note / feedback
    if (currentCandidate.coachNote && currentCandidate.coachNote.trim()) {
      items.push({
        id: "cand-note",
        title: "Catatan khusus dari pelatih",
        detail: currentCandidate.coachNote,
        targetView: "candidate-progress",
        tone: "info",
      })
    }

    // 4. CAT tryout reminder / alert
    const myAttempts = (catTryoutAttempts ?? [])
      .filter(
        (a) =>
          a.candidateId === currentCandidate.id ||
          a.candidateName.trim().toLowerCase() ===
            currentCandidate.name.trim().toLowerCase(),
      )
      .sort((a, b) => b.finalizedAt.localeCompare(a.finalizedAt))
    const latestAttempt = myAttempts[0]
    if (!latestAttempt) {
      items.push({
        id: "cand-cat-none",
        title: "Tryout CAT belum dikerjakan",
        detail: "Buka menu CAT untuk menguji pemahaman PIP & TIU.",
        targetView: "cat-bank",
        tone: "warning",
      })
    } else if (
      latestAttempt.pipStatus !== "passed" ||
      latestAttempt.tiuStatus !== "passed"
    ) {
      items.push({
        id: "cand-cat-low",
        title: "Nilai CAT perlu penguatan",
        detail: `Skor terakhir: PIP ${latestAttempt.pipScore}, TIU ${latestAttempt.tiuScoreScaled}. Passing grade 70.`,
        targetView: "candidate-results",
        tone: "danger",
      })
    }

    return items
  }, [currentUser.role, currentCandidate, schedules, catTryoutAttempts])

  // CANDIDATE RESTRICTED HEADER
  if (currentUser.role === "candidate") {
    return (
      <header className="sticky top-0 z-30 flex h-14 sm:h-16 w-full max-w-full min-w-0 items-center justify-between gap-2 sm:gap-3 border-b border-slate-200/80 bg-white/95 px-2.5 sm:px-4 backdrop-blur-xl md:px-6">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            className="!px-2 lg:hidden shrink-0"
            onClick={onMenu}
            aria-label="Buka navigasi"
          >
            <Menu className="size-5" />
          </Button>

          {/* Logo & Judul BACAPASMUIN! */}
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={logoUrl}
              alt="BACAPASMUIN!"
              className="h-7 w-auto object-contain shrink-0 drop-shadow-xs"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-sm font-black tracking-tight text-slate-900 leading-none">
                  BACAPASMUIN!
                </span>
                <span className="hidden md:inline rounded bg-emerald-100 px-1.5 py-0.5 text-3xs font-bold text-emerald-800">
                  Portal Siswa
                </span>
              </div>
              <p className="text-3xs font-bold text-red-600 uppercase tracking-wider leading-none mt-0.5 truncate">
                Paskibraka
              </p>
            </div>
          </div>
        </div>

        {/* Sisi Kanan: Bersih, Rapi & Tidak Padat */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Lonceng Notifikasi */}
          <div ref={candNotifRef} className="relative">
            <button
              type="button"
              onClick={() => setCandNotifOpen((v) => !v)}
              className="relative flex size-9 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95"
              title="Notifikasi & Arahan Seleksi"
            >
              <Bell className="size-5" />
              {candidateNotifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-red-600 text-3xs font-black text-white ring-2 ring-white">
                  {candidateNotifications.length}
                </span>
              )}
            </button>

            {candNotifOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-xs sm:hidden"
                  onClick={() => setCandNotifOpen(false)}
                  aria-hidden="true"
                />
                <div className="fixed inset-x-3 top-15 max-w-sm mx-auto sm:max-w-none sm:mx-0 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Arahan &amp; Notifikasi Saya
                      </p>
                      <p className="text-2xs text-slate-500">
                        {currentCandidate?.name || currentUser.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge tone="info">
                        {candidateNotifications.length} notifikasi
                      </Badge>
                      <button
                        type="button"
                        onClick={() => setCandNotifOpen(false)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 sm:hidden"
                        aria-label="Tutup notifikasi"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 divide-y divide-slate-100 max-h-[60vh] sm:max-h-72 overflow-y-auto">
                    {candidateNotifications.map((notif) => (
                      <button
                        key={notif.id}
                        type="button"
                        onClick={() => {
                          onView(notif.targetView)
                          setCandNotifOpen(false)
                        }}
                        className="w-full text-left py-2.5 px-2 rounded-lg hover:bg-slate-50 transition flex items-start gap-2.5"
                      >
                        <span
                          className={`size-2 rounded-full mt-1.5 shrink-0 ${
                            notif.tone === "danger"
                              ? "bg-red-500"
                              : notif.tone === "warning"
                                ? "bg-amber-500"
                                : notif.tone === "success"
                                  ? "bg-emerald-500"
                                  : "bg-blue-500"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 leading-snug">
                            {notif.title}
                          </p>
                          <p className="text-2xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                            {notif.detail}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Profil Santri - Minimalis */}
          <div className="flex items-center gap-2 pl-0.5">
            <CandidateAvatar
              name={currentCandidate?.name || currentUser.name}
              avatar={currentCandidate?.avatar}
              photoUrl={currentCandidate?.photoUrl}
              className="size-8 sm:size-8.5 shrink-0 border border-slate-200 shadow-2xs text-3xs"
              rounded="rounded-xl"
            />
            <div className="hidden md:block text-left">
              <p className="truncate text-xs font-bold text-slate-900 leading-tight max-w-[10rem]">
                {currentCandidate?.name || currentUser.name}
              </p>
              <p className="truncate text-3xs text-slate-500 leading-tight">
                {currentCandidate?.number || "Santri"}
              </p>
            </div>
          </div>

          {/* Tombol Keluar Ringkas */}
          <button
            type="button"
            onClick={logout}
            className="flex size-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600 active:scale-95"
            title="Keluar dari sesi santri"
          >
            <LogOut className="size-4.5" />
          </button>
        </div>
      </header>
    )
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 sm:h-16 w-full max-w-full min-w-0 items-center justify-between gap-2 border-b border-slate-200/80 bg-white/95 px-3 backdrop-blur-xl sm:px-4 md:px-6">
        {/* Sisi Kiri: Menu + Logo Paskib & Judul di Mobile, Periode di Desktop */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onMenu}
            className="flex size-9 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 transition active:scale-90 lg:hidden shrink-0"
            aria-label="Buka navigasi"
          >
            <Menu className="size-5" />
          </button>

          {/* Logo Paskib & Judul BACAPASMUIN di Mobile */}
          <div className="flex items-center gap-2 md:hidden min-w-0">
            <img
              src={logoUrl}
              alt="BACAPASMUIN!"
              className="h-7 w-auto object-contain shrink-0 drop-shadow-xs"
            />
            <div className="min-w-0">
              <p className="font-display text-sm font-black tracking-tight text-slate-900 leading-none">
                BACAPASMUIN!
              </p>
              <p className="text-3xs font-bold text-red-600 uppercase tracking-wider leading-none mt-0.5 truncate">
                Paskibraka
              </p>
            </div>
          </div>

          {/* Selector Periode Seleksi / Latihan di Layar Desktop */}
          <div ref={cycleMenuRef} className="relative shrink-0 hidden md:block">
            <button
              type="button"
              onClick={() => setCycleMenuOpen((v) => !v)}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-800 shadow-2xs transition hover:bg-slate-50 hover:border-slate-300"
              title="Ubah atau kelola periode seleksi / latihan"
            >
              <CalendarDays className="size-3.5 text-red-600 shrink-0" />
              <span className="font-bold truncate max-w-48 md:max-w-none">
                {activeCycle?.name || "Periode Seleksi"}
              </span>
              <span className="inline rounded bg-slate-100 px-1.5 py-0.5 text-3xs font-bold text-slate-600">
                {activeCycle?.level}
              </span>
              <ChevronDown
                className={`size-3 text-slate-400 transition shrink-0 ${
                  cycleMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {cycleMenuOpen ? (
              <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-3.5 py-2.5">
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Periode Seleksi & Latihan
                    </p>
                    <p className="text-2xs text-slate-500">
                      Pilih angkatan aktif atau kelola periode
                    </p>
                  </div>
                  {currentUser.role === "admin" && (
                    <button
                      type="button"
                      onClick={() => setShowNewCycle((v) => !v)}
                      className="flex items-center gap-1 text-2xs font-bold text-red-600 hover:text-red-700 hover:underline"
                    >
                      <Plus className="size-3.5" />
                      <span>{showNewCycle ? "Batal" : "Tambah"}</span>
                    </button>
                  )}
                </div>

                {showNewCycle ? (
                  <form
                    onSubmit={handleCreateCycle}
                    className="border-b border-slate-100 p-3 bg-slate-50/50"
                  >
                    <p className="text-2xs font-bold text-slate-700 mb-2">
                      Tambah Periode Baru
                    </p>
                    <div className="space-y-2">
                      <Input
                        value={newCycleName}
                        onChange={(e) => setNewCycleName(e.target.value)}
                        placeholder="Contoh: Latihan & Pembinaan 2026/2027"
                        className="h-8 text-xs bg-white"
                        autoFocus
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-3xs font-bold text-slate-500 uppercase">
                            Tahun
                          </label>
                          <Input
                            type="number"
                            value={newCycleYear}
                            onChange={(e) =>
                              setNewCycleYear(Number(e.target.value))
                            }
                            className="h-8 text-xs bg-white mt-0.5"
                          />
                        </div>
                        <div>
                          <label className="text-3xs font-bold text-slate-500 uppercase">
                            Tingkat
                          </label>
                          <select
                            value={newCycleLevel}
                            onChange={(e) =>
                              setNewCycleLevel(e.target.value as any)
                            }
                            className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:border-slate-300"
                          >
                            <option value="Kabupaten/Kota">
                              Kabupaten/Kota
                            </option>
                            <option value="Provinsi">Provinsi</option>
                            <option value="Pusat">Pusat</option>
                          </select>
                        </div>
                      </div>
                      <Button
                        type="submit"
                        size="sm"
                        className="w-full h-8 text-xs font-bold bg-red-600 hover:bg-red-700 text-white mt-1"
                      >
                        Simpan Periode
                      </Button>
                    </div>
                  </form>
                ) : null}

                <div className="p-1.5 max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {cycles.map((c) => {
                    const isCurrent = c.id === activeCycle.id
                    return (
                      <div
                        key={c.id}
                        className={`flex items-center justify-between rounded-lg px-2.5 py-2 transition ${
                          isCurrent
                            ? "bg-red-50 text-red-900"
                            : "hover:bg-slate-50 text-slate-800"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCycleId(c.id)
                            setCycleMenuOpen(false)
                          }}
                          className="flex flex-1 items-center gap-2.5 text-left min-w-0"
                        >
                          <div
                            className={`grid size-7 place-items-center rounded-md text-xs font-bold shrink-0 ${
                              isCurrent
                                ? "bg-red-600 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {c.year}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-xs font-bold truncate ${
                                isCurrent ? "text-red-950" : "text-slate-900"
                              }`}
                            >
                              {c.name}
                            </p>
                            <p className="text-3xs text-slate-500 truncate">
                              Tingkat {c.level} ·{" "}
                              {c.status === "active" ? "Aktif" : "Arsip"}
                            </p>
                          </div>
                          {isCurrent ? (
                            <CheckCircle2 className="size-4 text-red-600 shrink-0" />
                          ) : null}
                        </button>

                        {cycles.length > 1 && currentUser.role === "admin" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (
                                confirm(
                                  `Hapus periode "${c.name}"? Data di dalamnya akan dibersihkan.`,
                                )
                              ) {
                                deleteCycle(c.id)
                              }
                            }}
                            className="ml-2 rounded p-1 text-slate-400 hover:text-red-600 hover:bg-red-100/50 transition shrink-0"
                            title="Hapus periode"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Tengah: Search Input di Layar Tablet & Desktop (md ke atas) */}
        <div className="hidden md:block relative min-w-0 flex-1 max-w-md mx-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-8 text-xs outline-none transition placeholder:text-slate-400 hover:bg-slate-50 focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100"
            placeholder="Cari kandidat, nomor peserta, atau sekolah..."
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Bersihkan pencarian"
            >
              <X className="size-3.5" />
            </button>
          ) : null}

          {searchQuery.trim() ? (
            <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl z-50">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-2xs font-bold uppercase tracking-wider text-slate-500">
                Hasil pencarian kandidat ({searchResults.length})
              </div>
              {searchResults.length ? (
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {searchResults.map((cand) => (
                    <button
                      key={cand.id}
                      type="button"
                      onClick={() => {
                        onSelectCandidate(cand.id)
                        setSearchQuery("")
                      }}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <CandidateAvatar
                          name={cand.name}
                          avatar={cand.avatar}
                          photoUrl={cand.photoUrl}
                          className="size-8 text-xs shrink-0"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {cand.name}
                          </p>
                          <p className="text-2xs text-slate-500">
                            {cand.number} · {cand.school}
                          </p>
                        </div>
                      </div>
                      <Badge tone="info">Tahap {cand.stage}</Badge>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-500">
                  Kandidat tidak ditemukan untuk kata kunci tersebut.
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Sisi Kanan: Aksi & Notifikasi */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Google Sheet Bar Lengkap di Layar Desktop (md ke atas) */}
          {googleSheetUrl ? (
            <div className="hidden md:flex h-9 items-center rounded-lg border border-slate-200 bg-white shadow-2xs text-xs">
              <div
                className="flex h-full items-center gap-1.5 px-2.5 font-medium border-r border-slate-200 select-none cursor-default"
                title={`Tersimpan aman di Google Sheet (Terakhir: ${formatLastSync(lastCloudSync)})`}
              >
                {cloudSyncStatus === "syncing" ||
                cloudSyncStatus === "pulling" ? (
                  <>
                    <RotateCw className="size-3.5 animate-spin text-blue-600" />
                    <span className="text-blue-700">
                      {cloudSyncStatus === "syncing"
                        ? "Menyimpan..."
                        : "Memuat..."}
                    </span>
                  </>
                ) : cloudSyncStatus === "error" ? (
                  <>
                    <span className="size-2 rounded-full bg-red-500" />
                    <span className="text-red-600">Gagal simpan</span>
                  </>
                ) : (
                  <>
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <span className="text-slate-700">Google Sheet</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => refreshAndSync("manual")}
                disabled={
                  cloudSyncStatus === "syncing" || cloudSyncStatus === "pulling"
                }
                className="flex h-full items-center gap-1.5 px-2.5 font-medium text-slate-700 hover:bg-slate-50 transition border-r border-slate-200 disabled:opacity-50"
                title="Ambil data terbaru dari Google Sheet"
              >
                <RotateCw className="size-3 text-slate-500" />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={onOpenGoogleSync}
                className="flex h-full items-center px-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition rounded-r-lg"
                title="Pengaturan Google Sheet"
              >
                <Cloud className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenGoogleSync}
              className="hidden md:flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              title="Hubungkan Google Sheet"
            >
              <Cloud className="size-3.5 text-slate-400" />
              <span>Hubungkan Sheet</span>
            </button>
          )}

          {/* Notifikasi (Ghost button di mobile, rounded-xl di desktop) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotif((v) => !v)}
              className="relative flex size-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition active:scale-90 md:rounded-xl md:border md:border-slate-200 md:bg-white md:shadow-2xs"
              aria-label="Notifikasi"
            >
              <Bell className="size-4.5 md:size-4" />
              {notifications.length > 0 ? (
                <span className="absolute right-2 top-2 size-2 rounded-full bg-red-600 ring-2 ring-white" />
              ) : null}
            </button>

            {showNotif ? (
              <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:w-96 z-50">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Notifikasi & Tugas ({notifications.length})
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowNotif(false)}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-700"
                  >
                    Tutup
                  </button>
                </div>
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {notifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onView(item.targetView)
                        setShowNotif(false)
                      }}
                      className="block w-full p-3.5 text-left transition hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-900">
                          {item.title}
                        </p>
                        <Badge tone={item.tone}>Tindak Lanjut</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.detail}
                      </p>
                    </button>
                  ))}
                  {!notifications.length ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Seluruh tugas prioritas telah ditindaklanjuti.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>
    </>
  )
}

function MobileNav({
  view,
  onView,
  onMenu,
}: {
  view: View
  onView: (view: View) => void
  onMenu?: () => void
}) {
  const { currentUser } = useApp()
  const items =
    currentUser.role === "candidate"
      ? [
          {
            id: "candidate-home" as View,
            label: "Beranda",
            icon: LayoutDashboard,
            color: "bg-indigo-600 shadow-indigo-600/30",
          },
          {
            id: "cat-bank" as View,
            label: "Ujian CAT",
            icon: GraduationCap,
            color: "bg-pink-600 shadow-pink-600/30",
          },
          {
            id: "candidate-progress" as View,
            label: "Perkembangan",
            icon: Activity,
            color: "bg-emerald-600 shadow-emerald-600/30",
          },
          {
            id: "candidate-stages" as View,
            label: "Tahap",
            icon: CheckCircle2,
            color: "bg-amber-500 shadow-amber-500/30",
          },
          {
            id: "candidate-ranking" as View,
            label: "Peringkat",
            icon: Trophy,
            color: "bg-cyan-600 shadow-cyan-600/30",
          },
        ]
      : [
          {
            id: "overview" as View,
            label: "Beranda",
            icon: LayoutDashboard,
            color: "bg-indigo-600 shadow-indigo-600/30",
          },
          {
            id: "sessions" as View,
            label: "Sesi",
            icon: ClipboardCheck,
            color: "bg-pink-600 shadow-pink-600/30",
          },
          {
            id: "candidates" as View,
            label: "Kandidat",
            icon: UsersRound,
            color: "bg-amber-500 shadow-amber-500/30",
          },
          {
            id: "progress" as View,
            label: "Perkembangan",
            icon: Activity,
            color: "bg-emerald-600 shadow-emerald-600/30",
          },
          {
            id: "ranking" as View,
            label: "Peringkat",
            icon: Trophy,
            color: "bg-cyan-600 shadow-cyan-600/30",
          },
        ]

  return (
    <nav
      className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] inset-x-3 z-40 max-w-[360px] mx-auto rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-[0_12px_36px_rgba(15,23,42,0.14)] backdrop-blur-2xl ring-1 ring-slate-900/5 lg:hidden"
      aria-label="Navigasi mobile"
    >
      <div className="flex items-center justify-between gap-1 w-full">
        {items.map((item) => {
          const Icon = item.icon
          const active = view === item.id
          if (active) {
            return (
              <button
                key={item.id}
                onClick={() => onView(item.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-white font-bold text-xs shadow-md transition-all duration-200 active:scale-95 shrink-0 ${item.color}`}
                title={item.label}
                aria-label={item.label}
                aria-current="page"
              >
                <Icon className="size-4.5 stroke-[2.25] shrink-0" />
                <span className="font-bold text-xs tracking-tight whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            )
          }
          return (
            <button
              key={item.id}
              onClick={() => onView(item.id)}
              className="flex size-9.5 items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-all duration-150 active:scale-90 shrink-0"
              title={item.label}
              aria-label={item.label}
            >
              <Icon className="size-5 stroke-[1.8]" />
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function PageLoader() {
  return (
    <div className="grid gap-5" aria-label="Memuat halaman">
      <div className="h-7 w-44 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-4 w-72 max-w-full animate-pulse rounded bg-slate-100" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-36 animate-pulse rounded-2xl bg-white shadow-sm" />
        <div className="h-36 animate-pulse rounded-2xl bg-white shadow-sm" />
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-white shadow-sm" />
    </div>
  )
}

function StagePipeline({
  onSelectStage,
}: {
  onSelectStage: (stageIndex: number) => void
}) {
  const { candidates } = useApp()
  const totalCandidates = candidates.length

  const stageStats = useMemo(() => {
    return selectionStages.map((stage, index) => {
      const ratio = (count: number) =>
        totalCandidates > 0 ? Math.round((count / totalCandidates) * 100) : 0
      const average = (values: number[]) =>
        values.length > 0
          ? (
              values.reduce((sum, value) => sum + value, 0) / values.length
            ).toFixed(1)
          : null
      const scoreStatus = (scores: Array<number | null>, passingGrade = 70) => {
        const tested = scores.filter((score): score is number => score !== null)
        const passed = tested.filter((score) => score >= passingGrade).length
        return {
          readyCount: tested.length,
          percent: ratio(tested.length),
          statusLabel: `${tested.length}/${totalCandidates}`,
          badgeText: `${passed} mencapai nilai ${passingGrade}`,
          subtext: tested.length
            ? `Rata-rata ${average(tested)}`
            : "Belum ada nilai",
          tone: tested.length ? "blue" : "slate",
        }
      }

      // 0: Administrasi
      if (index === 0) {
        const readyCount = candidates.filter((c) =>
          Boolean(
            c.documents &&
              c.documents.length >= 6 &&
              c.documents.every(Boolean),
          ),
        ).length
        const percent = ratio(readyCount)
        return {
          readyCount,
          percent,
          statusLabel: `${percent}%`,
          badgeText: `${readyCount}/${totalCandidates} Berkas Lengkap`,
          subtext: "6 berkas terverifikasi",
          tone: "emerald",
        }
      }
      // 1: CAT Wawasan / PIP
      if (index === 1) {
        return scoreStatus(candidates.map((c) => c.pip))
      }
      // 2: CAT Intelegensia / TIU
      if (index === 2) {
        return scoreStatus(candidates.map((c) => c.tiu))
      }
      // 3: Kesehatan & Antropometri (RIK)
      if (index === 3) {
        const evaluated = candidates.filter((c) =>
          ["passed", "failed"].includes(c.stageStatuses[index]),
        )
        const readyCount = evaluated.filter(
          (c) => c.stageStatuses[index] === "passed",
        ).length
        return {
          readyCount: evaluated.length,
          percent: ratio(evaluated.length),
          statusLabel: `${evaluated.length}/${totalCandidates}`,
          badgeText: `${readyCount} memenuhi standar`,
          subtext: evaluated.length
            ? "Hasil pemeriksaan tercatat"
            : "Belum ada hasil pemeriksaan",
          tone: "emerald",
        }
      }
      // 4: Parade & Postur Tubuh (PAR)
      if (index === 4) {
        const evaluated = candidates.filter((c) =>
          ["passed", "failed"].includes(c.stageStatuses[index]),
        )
        const readyCount = evaluated.filter(
          (c) => c.stageStatuses[index] === "passed",
        ).length
        const percent = ratio(evaluated.length)
        return {
          readyCount: evaluated.length,
          percent,
          statusLabel: `${evaluated.length}/${totalCandidates}`,
          badgeText: `${readyCount} memenuhi standar`,
          subtext: evaluated.length
            ? "Hasil parade tercatat"
            : "Belum ada hasil parade",
          tone: "indigo",
        }
      }
      // 5: Drill PBB
      if (index === 5) {
        return scoreStatus(
          candidates.map((c) => c.pbb),
          75,
        )
      }
      // 6: Kesamaptaan Jasmani (SAM)
      if (index === 6) {
        const runValues = candidates
          .map((c) => {
            const metric = (c.physicalMetrics ?? []).find((item) =>
              item.label.toLowerCase().includes("lari"),
            )
            if (
              !metric?.current ||
              ["DNF", "Belum diuji", "Belum dicatat", "—"].includes(
                metric.current,
              )
            )
              return null
            const value = Number.parseFloat(
              metric.current
                .replace(/\./g, "")
                .replace(",", ".")
                .replace(/[^\d.]/g, ""),
            )
            return Number.isFinite(value) ? value : null
          })
          .filter((value): value is number => value !== null)
        const meanRun = average(runValues)
        const maxRun = runValues.length
          ? Math.max(...runValues).toLocaleString("id-ID")
          : null
        const percent = ratio(runValues.length)
        return {
          readyCount: runValues.length,
          percent,
          statusLabel: `${runValues.length}/${totalCandidates}`,
          badgeText: maxRun ? `Terjauh ${maxRun} m` : "Belum ada hasil",
          subtext: meanRun
            ? `Rata-rata ${Number(meanRun).toLocaleString("id-ID")} m`
            : "Belum ada hasil lari",
          tone: "emerald",
        }
      }
      // 7: Kepribadian & Wawancara (KEP)
      return scoreStatus(candidates.map((c) => c.personality))
    })
  }, [candidates, totalCandidates])

  const overallAvg = useMemo(() => {
    if (stageStats.length === 0) return 0
    return Math.round(
      stageStats.reduce((sum, stage) => sum + stage.percent, 0) /
        stageStats.length,
    )
  }, [stageStats])

  return (
    <Card className="min-w-0 w-full max-w-full overflow-hidden border border-slate-200 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-white p-3.5 sm:px-6 sm:py-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="size-4.5 sm:size-5 text-red-600" />
            <h2 className="font-display text-sm sm:text-lg font-bold text-slate-900">
              Progres 8 tahap seleksi
            </h2>
          </div>
          <p className="mt-0.5 sm:mt-1 text-xs text-slate-500">
            Dihitung dari nilai, hasil pemeriksaan, dan berkas yang sudah
            dicatat.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="size-1.5 sm:size-2 rounded-full bg-blue-600 animate-pulse" />
            Rerata: {overallAvg}%
          </span>
          <span className="hidden sm:flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-emerald-600" />
              Semua dinilai
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-blue-600" />
              Sebagian
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-slate-800" />
              Belum ada hasil
            </span>
          </span>
        </div>
      </div>

      {/* Tampilan Mobile: Horizontal swipe carousel yang pas dengan layar dan TIDAK melebar ke 896px */}
      <div className="block sm:hidden p-3 bg-slate-50/50">
        <div className="flex gap-2.5 overflow-x-auto pb-1 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {selectionStages.map((stage, index) => {
            const stat = stageStats[index] ?? {
              readyCount: 0,
              percent: 0,
              statusLabel: "0%",
              badgeText: "",
              subtext: "",
              tone: "slate",
            }
            const circleColor =
              stat.percent >= 100
                ? "bg-emerald-600 text-white"
                : stat.percent > 0
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-white"

            return (
              <button
                key={stage.key}
                type="button"
                onClick={() => onSelectStage(index)}
                className="snap-start shrink-0 w-28 rounded-xl border border-slate-200/90 bg-white p-2.5 text-center shadow-2xs hover:border-red-300 transition active:scale-95"
              >
                <div
                  className={`mx-auto grid size-9 place-items-center rounded-full font-display text-2xs font-bold ${circleColor}`}
                >
                  {stage.shortLabel}
                </div>
                <p className="mt-1.5 text-2xs font-bold text-slate-800 line-clamp-1">
                  {stage.label}
                </p>
                <p className="mt-0.5 font-display text-sm font-black text-slate-900">
                  {stat.statusLabel}
                </p>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      stat.percent >= 100
                        ? "bg-emerald-500"
                        : stat.percent > 0
                          ? "bg-blue-500"
                          : "bg-slate-400"
                    }`}
                    style={{ width: `${stat.percent}%` }}
                  />
                </div>
                <p className="mt-1 text-3xs font-bold text-slate-500 truncate">
                  {stat.badgeText || "Belum dinilai"}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tampilan Desktop: Pipeline horizontal dengan garis penghubung */}
      <div className="hidden sm:block overflow-x-auto px-5 py-6 sm:px-6 bg-slate-50/40">
        <div className="flex min-w-[56rem] items-start">
          {selectionStages.map((stage, index) => {
            const stat = stageStats[index] ?? {
              readyCount: 0,
              percent: 0,
              statusLabel: "0%",
              badgeText: "",
              subtext: "",
              tone: "slate",
            }

            const circleColor =
              stat.percent >= 100
                ? "bg-emerald-600 text-white shadow-emerald-200"
                : stat.percent > 0
                  ? "bg-blue-600 text-white shadow-blue-200"
                  : "bg-slate-800 text-white shadow-slate-200"

            return (
              <div className="flex flex-1 items-start" key={stage.key}>
                <button
                  type="button"
                  onClick={() => onSelectStage(index)}
                  className="group flex flex-1 flex-col items-center text-center transition hover:-translate-y-0.5"
                >
                  <div
                    className={`grid size-11 place-items-center rounded-full font-display text-xs font-bold transition shadow-sm group-hover:ring-4 group-hover:ring-red-100 ${circleColor}`}
                  >
                    {stage.shortLabel}
                  </div>

                  <div className="mt-2.5 flex h-8 items-center justify-center">
                    <p className="max-w-24 text-center text-xs font-bold leading-tight text-slate-800 group-hover:text-red-600 transition-colors">
                      {stage.label}
                    </p>
                  </div>

                  <p className="mt-1 font-display text-base font-extrabold text-slate-900 tabular-nums">
                    {stat.statusLabel}
                  </p>

                  <div className="mt-1 flex items-center justify-center">
                    <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          stat.percent >= 100
                            ? "bg-emerald-500"
                            : stat.percent > 0
                              ? "bg-blue-500"
                              : "bg-slate-400"
                        }`}
                        style={{ width: `${stat.percent}%` }}
                      />
                    </div>
                  </div>

                  <p className="mt-1 text-3xs font-bold text-slate-600 truncate max-w-[100px]">
                    {stat.badgeText}
                  </p>
                  <p className="text-3xs text-slate-400 truncate max-w-[100px]">
                    {stat.subtext}
                  </p>
                </button>

                {index < selectionStages.length - 1 ? (
                  <div className="mt-5 h-0.5 flex-1 bg-slate-200" />
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

function StatCard({
  label,
  value,
  detail,
  badgeText,
  badgeTone,
  badges,
  progress,
  icon: Icon,
  tone,
  onClick,
}: {
  label: string
  value: string
  detail: React.ReactNode
  badgeText?: string
  badgeTone?: string
  badges?: Array<{ text: string, tone?: string }>
  progress?: number
  icon: typeof UsersRound
  tone: string
  onClick?: () => void
}) {
  return (
    <Card
      onClick={onClick}
      className={`p-3 sm:p-5 transition flex flex-col justify-between min-w-0 ${
        onClick
          ? "cursor-pointer hover:border-slate-300 hover:shadow-md active:scale-[0.99] group"
          : ""
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-1.5 sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-2xs sm:text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-800 transition truncate">
              {label}
            </p>
            <p className="mt-1 font-display text-base sm:text-2xl font-black tracking-tight text-slate-950 truncate">
              {value}
            </p>
          </div>
          <div
            className={`grid size-8 sm:size-11 place-items-center rounded-xl sm:rounded-2xl shrink-0 transition group-hover:scale-105 shadow-2xs ${tone}`}
          >
            <Icon className="size-4 sm:size-5" />
          </div>
        </div>

        {badges && badges.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1 sm:gap-1.5">
            {badges.map((b, i) => (
              <span
                key={i}
                className={`inline-flex max-w-full truncate items-center text-3xs sm:text-2xs font-bold px-1.5 sm:px-2 py-0.5 rounded-md border ${
                  b.tone || "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {b.text}
              </span>
            ))}
          </div>
        ) : badgeText ? (
          <div className="mt-2">
            <span
              className={`inline-flex max-w-full truncate items-center text-3xs sm:text-2xs font-bold px-1.5 sm:px-2 py-0.5 rounded-md border ${
                badgeTone || "bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              {badgeText}
            </span>
          </div>
        ) : null}

        {typeof progress === "number" && (
          <div className="mt-2 sm:mt-2.5">
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <p className="mt-2.5 text-3xs sm:text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-2 line-clamp-2 sm:line-clamp-none">
        {detail}
      </p>
    </Card>
  )
}

function CandidateTable({
  compact = false,
  onSelectCandidate,
  onViewAll,
}: {
  compact?: boolean
  onSelectCandidate: (candidateId: string) => void
  onViewAll?: () => void
}) {
  const { candidates, catTryoutAttempts, sessions, records, auditLogs } =
    useApp()
  const [showFilters, setShowFilters] = useState(false)
  const [search, setSearch] = useState("")
  const [stageFilter, setStageFilter] = useState<number | "all">("all")
  const [statusFilter, setStatusFilter] = useState<StageStatus | "all">("all")
  const [sortBy, setSortBy] = useState<"number" | "name" | "stage" | "score">(
    "number",
  )

  const progressByCandidate = useMemo(() => {
    return new Map(
      candidates.map((candidate) => {
        const statuses = getProgressStageStatuses(
          candidate,
          catTryoutAttempts,
          sessions,
          records,
        )
        const firstIncomplete = statuses.findIndex(
          (status) => status !== "passed",
        )
        return [
          candidate.id,
          {
            statuses,
            stageIndex:
              firstIncomplete === -1 ? statuses.length - 1 : firstIncomplete,
          },
        ] as const
      }),
    )
  }, [candidates, catTryoutAttempts, sessions, records])

  const latestAttemptByCandidate = useMemo(() => {
    const latest = new Map<string, CatTryoutAttempt>()
    for (const attempt of catTryoutAttempts) {
      const current = latest.get(attempt.candidateId)
      if (!current || attempt.finalizedAt > current.finalizedAt) {
        latest.set(attempt.candidateId, attempt)
      }
    }
    return latest
  }, [catTryoutAttempts])

  const latestActivityByCandidate = useMemo(() => {
    const latest = new Map<string, number>()
    for (const candidate of candidates) {
      const attemptTime =
        Date.parse(
          latestAttemptByCandidate.get(candidate.id)?.finalizedAt ?? "",
        ) || 0
      const recordTime = sessions.reduce((maxTime, session) => {
        const savedAt = records[`${session.id}:${candidate.id}`]?.savedAt
        return Math.max(maxTime, Date.parse(savedAt ?? "") || 0)
      }, 0)
      const auditTime = auditLogs.reduce((maxTime, entry) => {
        const belongsToCandidate =
          entry.target.trim().toLocaleLowerCase() ===
            candidate.name.trim().toLocaleLowerCase() ||
          entry.target.includes(candidate.number) ||
          entry.detail.includes(candidate.number)
        if (!belongsToCandidate) return maxTime
        const timestamp = Date.parse(entry.timestamp.replace(" ", "T")) || 0
        return Math.max(maxTime, timestamp)
      }, 0)
      const candidateTime = Date.parse(candidate.updatedAt) || 0
      latest.set(
        candidate.id,
        Math.max(attemptTime, recordTime, auditTime, candidateTime),
      )
    }
    return latest
  }, [candidates, latestAttemptByCandidate, sessions, records, auditLogs])

  const candidateInsightsById = useMemo(() => {
    return new Map(
      candidates.map((candidate) => {
        const statuses = progressByCandidate.get(candidate.id)?.statuses ?? []
        const completedStages = statuses.filter(
          (status) => status === "passed",
        ).length
        const firstActionable = statuses.findIndex(
          (status) => status === "failed" || status === "review",
        )
        const focusStageIndex =
          firstActionable >= 0
            ? firstActionable
            : statuses.findIndex((status) => status === "active") >= 0
              ? statuses.findIndex((status) => status === "active")
              : statuses.findIndex((status) => status === "locked")
        const overallStatus = statuses.includes("failed")
          ? "Tidak lolos"
          : statuses.includes("review")
            ? "Perlu perbaikan"
            : statuses.every((status) => status === "passed")
              ? "Lolos"
              : statuses.includes("active")
                ? "Berlangsung"
                : "Belum dimulai"
        const overallTone =
          overallStatus === "Lolos"
            ? "success"
            : overallStatus === "Perlu perbaikan" ||
                overallStatus === "Tidak lolos"
              ? "warning"
              : "info"
        const missingDocs =
          6 - (candidate.documents ?? []).filter(Boolean).length
        const focusStage =
          focusStageIndex >= 0 ? selectionStages[focusStageIndex] : null
        const focusStageStatus =
          focusStageIndex >= 0 ? statuses[focusStageIndex] : null
        const followUp =
          missingDocs > 0
            ? `${missingDocs} berkas administrasi belum lengkap`
            : focusStageStatus === "failed"
              ? `Tindak lanjuti hasil ${focusStage?.shortLabel}`
              : focusStageStatus === "review"
                ? `Perkuat materi ${focusStage?.shortLabel}`
                : focusStageStatus === "active"
                  ? `Selesaikan tahap ${focusStage?.shortLabel}`
                  : focusStageStatus === "locked"
                    ? `Belum ada hasil ${focusStage?.shortLabel}`
                    : "Tidak ada tindak lanjut"

        const latestAttempt = latestAttemptByCandidate.get(candidate.id)
        let latestResult = latestAttempt
          ? {
              title: "CAT PIP & TIU",
              detail: `PIP ${latestAttempt.pipScore} · TIU ${latestAttempt.tiuScoreScaled}`,
              time: Date.parse(latestAttempt.finalizedAt) || 0,
            }
          : null
        for (const session of sessions) {
          const record = records[`${session.id}:${candidate.id}`]
          const time = Date.parse(record?.savedAt ?? "") || 0
          if (!record?.savedAt || (latestResult && latestResult.time >= time))
            continue
          const metricSummary = Object.entries(record.metrics ?? {})
            .filter(
              ([key, value]) =>
                value !== "" && !key.toLowerCase().includes("target"),
            )
            .slice(0, 2)
            .map(([key, value]) => {
              const label: Record<string, string> = {
                distance: "Lari 12 mnt",
                pushup: "Push-up",
                situp: "Sit-up",
                backup: "Back-up",
                shuttle: "Shuttle run",
                pip: "PIP",
                tiu: "TIU",
                score: "Nilai",
              }
              const unit =
                key === "distance" ? " m" : key === "shuttle" ? " dtk" : ""
              return `${label[key] ?? key}: ${value}${unit}`
            })
            .join(" · ")
          latestResult = {
            title:
              session.title ||
              selectionStages[
                session.type === "medical"
                  ? 3
                  : session.type === "parade"
                    ? 4
                    : session.type === "pbb"
                      ? 5
                      : session.type === "fitness"
                        ? 6
                        : 0
              ]?.label ||
              "Sesi latihan",
            detail:
              metricSummary ||
              (record.result === "passed"
                ? "Lulus"
                : record.result === "failed"
                  ? "Tidak lulus"
                  : record.result === "review"
                    ? "Perlu ditinjau"
                    : "Hasil tersimpan"),
            time,
          }
        }
        if (
          !latestResult &&
          (candidate.pip !== null || candidate.tiu !== null)
        ) {
          latestResult = {
            title: "CAT PIP & TIU",
            detail: `PIP ${candidate.pip ?? "—"} · TIU ${candidate.tiu ?? "—"}`,
            time: 0,
          }
        }

        return [
          candidate.id,
          {
            statuses,
            completedStages,
            overallStatus,
            overallTone,
            focusStageIndex,
            focusStatus: focusStageStatus,
            focusLabel: focusStage?.label ?? "Semua tahap selesai",
            followUp,
            latestResult,
          },
        ] as const
      }),
    )
  }, [
    candidates,
    progressByCandidate,
    latestAttemptByCandidate,
    sessions,
    records,
  ])

  const filtered = useMemo(() => {
    const list = candidates.filter((cand) => {
      const progress = progressByCandidate.get(cand.id)
      const currentStageIndex = progress?.stageIndex ?? 0
      if (stageFilter !== "all" && currentStageIndex + 1 !== stageFilter)
        return false
      const currentStatus = progress?.statuses[currentStageIndex] ?? "locked"
      if (statusFilter !== "all" && currentStatus !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          cand.name.toLowerCase().includes(q) ||
          cand.number.toLowerCase().includes(q) ||
          cand.school.toLowerCase().includes(q) ||
          (cand.nik && cand.nik.includes(q))
        )
      }
      return true
    })

    return [...list].sort((a, b) => {
      if (compact) {
        return (
          (latestActivityByCandidate.get(b.id) ?? 0) -
          (latestActivityByCandidate.get(a.id) ?? 0)
        )
      }
      if (sortBy === "name") return a.name.localeCompare(b.name)
      if (sortBy === "stage") {
        return (
          (progressByCandidate.get(b.id)?.stageIndex ?? 0) -
          (progressByCandidate.get(a.id)?.stageIndex ?? 0)
        )
      }
      if (sortBy === "score")
        return (finalScore(b) ?? -1) - (finalScore(a) ?? -1)
      return a.number.localeCompare(b.number)
    })
  }, [
    candidates,
    progressByCandidate,
    latestActivityByCandidate,
    stageFilter,
    statusFilter,
    search,
    sortBy,
    compact,
  ])

  const shown = compact ? filtered.slice(0, 5) : filtered

  return (
    <Card className="overflow-hidden w-full min-w-0 max-w-full">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-3.5 sm:px-6 sm:py-5 min-w-0">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 truncate">
            {compact ? "Aktivitas kandidat" : "Daftar kandidat"}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {compact
              ? "Pembaruan terbaru lintas tahapan"
              : `${filtered.length} dari ${candidates.length} kandidat`}
          </p>
        </div>
        {compact ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={onViewAll}
            className="shrink-0 text-xs h-8 px-3"
          >
            Lihat semua <ChevronRight className="size-3.5" />
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className="shrink-0 text-xs h-8 px-3"
          >
            Filter &amp; urutkan <SlidersHorizontal className="size-3.5" />
          </Button>
        )}
      </div>

      {!compact && showFilters ? (
        <div className="grid gap-3 border-b border-slate-100 bg-slate-50/80 p-3.5 sm:grid-cols-2 lg:grid-cols-5 sm:px-6 sm:py-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, nomor, sekolah..."
            className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-red-400"
          />
          <select
            value={stageFilter}
            onChange={(e) =>
              setStageFilter(
                e.target.value === "all" ? "all" : Number(e.target.value),
              )
            }
            className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-red-400"
          >
            <option value="all">Semua Tahap (1–8)</option>
            {selectionStages.map((s) => (
              <option key={s.id} value={s.id}>
                Tahap {s.id} — {s.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as StageStatus | "all")
            }
            className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-red-400"
          >
            <option value="all">Semua Status</option>
            <option value="passed">Lolos</option>
            <option value="active">Aktif</option>
            <option value="review">Ditinjau</option>
            <option value="failed">Gugur</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "number" | "name" | "stage" | "score")
            }
            className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-red-400"
          >
            <option value="number">Urutkan: Nomor Peserta</option>
            <option value="name">Urutkan: Nama A–Z</option>
            <option value="stage">Urutkan: Tahap Tertinggi</option>
            <option value="score">Urutkan: Nilai Akhir</option>
          </select>
        </div>
      ) : null}

      <div className="p-3 sm:p-4 space-y-3 md:hidden w-full min-w-0 bg-slate-50/40">
        {shown.map((candidate) => {
          const insight = candidateInsightsById.get(candidate.id)
          const completion = Math.round(
            ((insight?.completedStages ?? 0) / 8) * 100,
          )
          return (
            <button
              key={candidate.id}
              type="button"
              onClick={() => onSelectCandidate(candidate.id)}
              className="w-full min-w-0 rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-all duration-200 hover:border-slate-300 text-left active:scale-[0.99] flex flex-col gap-3 group"
            >
              <div className="flex items-start gap-3 w-full min-w-0">
                <CandidateAvatar
                  name={candidate.name}
                  avatar={candidate.avatar}
                  photoUrl={candidate.photoUrl}
                  className="size-11 sm:size-12 text-xs font-bold shrink-0 border border-slate-200 shadow-2xs mt-0.5"
                  rounded="rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-red-600 transition leading-snug break-words">
                      {candidate.name}
                    </p>
                    <ChevronRight className="size-4 shrink-0 text-slate-300 group-hover:text-slate-600 transition mt-0.5" />
                  </div>
                  <p className="mt-0.5 text-2xs sm:text-xs text-slate-500">
                    {candidate.school}
                  </p>
                </div>
              </div>

              <div className="w-full min-w-0 rounded-xl bg-slate-50/90 border border-slate-100 p-2.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 text-2xs flex items-center gap-1.5 truncate">
                    <span className="size-1.5 rounded-full bg-red-600 shrink-0" />
                    Progres Seleksi: {insight?.completedStages ?? 0}/8 tahap
                  </span>
                  <span className="font-bold text-2xs text-slate-800 shrink-0">
                    {completion}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      completion === 100
                        ? "bg-emerald-500"
                        : completion >= 50
                          ? "bg-blue-600"
                          : completion > 0
                            ? "bg-amber-500"
                            : "bg-slate-300"
                    }`}
                    style={{
                      width: `${Math.max(completion, completion > 0 ? 6 : 0)}%`,
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/50 text-2xs">
                  <div className="min-w-0">
                    <span className="text-slate-400 block font-medium">
                      Fokus
                    </span>
                    <p className="font-semibold text-slate-700 truncate mt-0.5">
                      {insight?.focusLabel ?? "—"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <span className="text-slate-400 block font-medium">
                      Hasil Terbaru
                    </span>
                    <p className="font-semibold text-slate-700 truncate mt-0.5">
                      {insight?.latestResult
                        ? `${insight.latestResult.title} · ${insight.latestResult.detail}`
                        : "Belum ada hasil"}
                    </p>
                  </div>
                </div>
              </div>

              {insight?.followUp &&
              insight.followUp !== "Tidak ada tindak lanjut" ? (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50/90 border border-amber-200/70 px-2.5 py-1.5 text-2xs text-amber-900 min-w-0">
                  <AlertTriangle className="size-3.5 shrink-0 text-amber-600 mt-0.5" />
                  <p className="min-w-0 leading-snug break-words">
                    <strong className="font-bold">Tindak lanjut:</strong>{" "}
                    {insight.followUp}
                  </p>
                </div>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[74rem] text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-2xs font-bold uppercase tracking-wider text-slate-500">
              <th className="px-6 py-3.5">Kandidat</th>
              <th className="px-4 py-3.5">Progres seleksi</th>
              <th className="px-4 py-3.5">Status seleksi</th>
              <th className="px-4 py-3.5">Fokus pembinaan</th>
              <th className="px-4 py-3.5">Hasil terbaru</th>
              <th className="px-4 py-3.5">Tindak lanjut</th>
              <th className="px-4 py-3.5">Diperbarui</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map((candidate) => {
              const insight = candidateInsightsById.get(candidate.id)
              const completion = Math.round(
                ((insight?.completedStages ?? 0) / 8) * 100,
              )
              return (
                <tr
                  key={candidate.id}
                  onClick={() => onSelectCandidate(candidate.id)}
                  className="group cursor-pointer transition hover:bg-slate-50/80"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3.5">
                      <CandidateAvatar
                        name={candidate.name}
                        avatar={candidate.avatar}
                        photoUrl={candidate.photoUrl}
                        className="size-14 text-sm font-bold shrink-0 border border-slate-200 shadow-xs"
                        rounded="rounded-xl"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-900 group-hover:text-red-600">
                          {candidate.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {candidate.number} · {candidate.gender} ·{" "}
                          {candidate.school}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-semibold tabular-nums text-slate-800">
                      {insight?.completedStages ?? 0} / 8 tahap
                    </p>
                    <div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${completion}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Badge tone={insight?.overallTone ?? "neutral"}>
                      {insight?.overallStatus ?? "Belum dimulai"}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-semibold text-slate-800">
                      {insight?.focusLabel ?? "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {insight?.focusStatus === "review"
                        ? "Perlu penguatan"
                        : insight?.focusStatus === "failed"
                          ? "Tidak memenuhi standar"
                          : insight?.focusStatus === "active"
                            ? "Sedang berlangsung"
                            : insight?.focusStatus === "locked"
                              ? "Belum dimulai"
                              : "Tuntas"}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-semibold text-slate-800">
                      {insight?.latestResult?.title ?? "Belum ada hasil"}
                    </p>
                    {insight?.latestResult ? (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {insight.latestResult.detail}
                      </p>
                    ) : null}
                  </td>
                  <td className="max-w-56 px-4 py-4 text-sm text-slate-600">
                    {insight?.followUp ?? "—"}
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-500">
                    {candidate.updatedAt}
                  </td>
                  <td className="px-5 py-4">
                    <Button
                      variant="ghost"
                      className="!px-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectCandidate(candidate.id)
                      }}
                      aria-label={`Opsi ${candidate.name}`}
                    >
                      <MoreHorizontal className="size-5" />
                    </Button>
                  </td>
                </tr>
              )
            })}
            {!shown.length ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-10 text-center text-sm text-slate-500"
                >
                  Tidak ada kandidat yang sesuai filter pencarian.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function CandidateHome({ onNavigate }: { onNavigate: (view: View) => void }) {
  const {
    currentUser,
    candidates,
    catTryoutAttempts,
    sessions,
    records,
    schedules,
    ishiharaResults,
  } = useApp()
  const candidate = candidates.find(
    (item) => item.id === currentUser.candidateId,
  )

  const [dailyTasks, setDailyTasks] = useState<Record<string, boolean>>(() => {
    if (!candidate) return {}
    try {
      const saved = localStorage.getItem(
        `bacapasmuin_daily_tasks_${candidate.id}`,
      )
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const toggleDailyTask = (id: string) => {
    if (!candidate) return
    setDailyTasks((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      try {
        localStorage.setItem(
          `bacapasmuin_daily_tasks_${candidate.id}`,
          JSON.stringify(next),
        )
      } catch {}
      return next
    })
  }

  if (!candidate) {
    return (
      <Card className="p-6">
        <h1 className="font-display text-xl font-bold text-slate-950">
          Profil kandidat belum tersedia
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Hubungi pelatih untuk memeriksa akun dan data peserta Anda.
        </p>
      </Card>
    )
  }

  const stageStatuses = getProgressStageStatuses(
    candidate,
    catTryoutAttempts,
    sessions,
    records,
  )
  const completedStages = stageStatuses.filter(
    (status) => status === "passed",
  ).length
  const currentStageIndex = stageStatuses.findIndex(
    (status) => status !== "passed",
  )
  const currentStage =
    currentStageIndex >= 0 ? selectionStages[currentStageIndex] : null
  const ownAttempts = catTryoutAttempts
    .filter(
      (attempt) =>
        attempt.candidateId === candidate.id ||
        attempt.candidateName.trim().toLocaleLowerCase() ===
          candidate.name.trim().toLocaleLowerCase(),
    )
    .slice()
    .sort((a, b) => b.finalizedAt.localeCompare(a.finalizedAt))
  const latestAttempt = ownAttempts[0]

  const upcomingSchedule = schedules
    .filter(
      (schedule) =>
        schedule.assignedCandidateIds?.includes(candidate.id) &&
        schedule.status !== "completed",
    )
    .filter(
      (schedule) =>
        new Date(`${schedule.date}T${schedule.time || "00:00"}`).getTime() >=
        Date.now(),
    )
    .sort((a, b) =>
      `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
    )[0]

  const scheduleCountdown = upcomingSchedule
    ? (() => {
        const targetDate = new Date(
          `${upcomingSchedule.date}T${upcomingSchedule.time || "00:00"}`,
        )
        const diffMs = targetDate.getTime() - Date.now()
        if (diffMs <= 0) return "Hari ini!"
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        const diffHours = Math.floor(
          (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
        )
        if (diffDays === 0) return `${diffHours} jam lagi`
        if (diffDays === 1) return "Besok!"
        return `${diffDays} hari lagi`
      })()
    : null

  const candidateIntervalHistory = extractCandidateIntervalLogs(
    candidate.id,
    sessions,
    records,
    candidate.intervalHistory ?? [],
  )
  const latestInterval = candidateIntervalHistory[0]

  const latestIshihara = (ishiharaResults ?? [])
    .filter((result) => result.participantId === candidate.id)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]

  // 4 Pillars of Readiness
  const docCount = (candidate.documents ?? []).filter(Boolean).length
  const docPercent = Math.round((docCount / 6) * 100)
  const pipScore = latestAttempt ? latestAttempt.pipScore : (candidate.pip ?? 0)
  const tiuScore = latestAttempt
    ? latestAttempt.tiuScoreScaled
    : (candidate.tiu ?? 0)
  const catAvg = latestAttempt
    ? latestAttempt.combinedScore
    : pipScore && tiuScore
      ? (pipScore + tiuScore) / 2
      : 0
  const fitnessVal =
    candidate.fitness !== null
      ? candidate.fitness
      : (latestInterval?.projected12MinScore ?? 0)
  const bmiInfo = bmi(candidate.weightKg ?? 0, candidate.heightCm ?? 0)

  // Coach Spotlight message
  const coachMessage = candidate.coachNote?.trim()
    ? candidate.coachNote
    : latestInterval?.coachRecommendation?.trim()
      ? latestInterval.coachRecommendation
      : null

  const defaultTasks = [
    {
      id: "task-pushup",
      label: "Push-up & Sit-up bertahap 40 repetisi",
      category: "Fisik",
    },
    {
      id: "task-run",
      label: "Lari aerobik endurance 20–30 menit",
      category: "Fisik",
    },
    {
      id: "task-cat",
      label: "Selesaikan 1 sesi latihan soal CAT PIP / TIU",
      category: "Akademik",
    },
    {
      id: "task-pbb",
      label: "Latihan sikap sempurna & langkah tegap PBB",
      category: "PBB",
    },
    {
      id: "task-docs",
      label: "Periksa berkas pendaftaran yang belum lengkap",
      category: "Administrasi",
    },
  ]
  const completedTaskCount = defaultTasks.filter((t) => dailyTasks[t.id]).length

  return (
    <div className="grid gap-5">
      {/* 1. Profil Santri - Dark Mode Bersih & Elegan */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6 shadow-sm text-white">
        <div className="flex flex-col gap-4.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 sm:gap-4.5 min-w-0">
            <CandidateAvatar
              name={candidate.name}
              avatar={candidate.avatar}
              photoUrl={candidate.photoUrl}
              className="size-14 sm:size-16 shrink-0 border border-slate-700/80 text-sm shadow-2xs"
              rounded="rounded-2xl"
            />
            <div className="min-w-0 space-y-1">
              <p className="text-xs text-slate-400 font-medium truncate">
                {candidate.school} · {candidate.gender}
              </p>
              <h1 className="font-display text-base sm:text-xl font-bold tracking-tight text-white leading-snug">
                {candidate.name}
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Peserta Seleksi Paskibraka 2027
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 pt-3 sm:pt-0 border-t border-slate-800/80 sm:border-0">
            <button
              type="button"
              onClick={() => onNavigate("cat-bank")}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 text-xs font-bold text-white transition hover:bg-red-500 active:scale-95 whitespace-nowrap shadow-2xs"
            >
              <GraduationCap className="size-3.5" /> Latihan CAT
            </button>
            <button
              type="button"
              onClick={() => onNavigate("standards")}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs font-bold text-slate-200 transition hover:bg-slate-700 hover:text-white active:scale-95 whitespace-nowrap shadow-2xs"
            >
              <SlidersHorizontal className="size-3.5" /> Kalkulator BPIP
            </button>
          </div>
        </div>
      </section>

      {/* 2. Spotlight: Arahan & Catatan Pelatih */}
      {coachMessage && (
        <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs shadow-2xs flex items-start gap-2.5">
          <Sparkles className="size-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-amber-900 uppercase tracking-wider text-2xs">
                Catatan &amp; Arahan Pelatih
              </p>
              <span className="text-3xs font-semibold text-amber-700">
                Tindak Lanjut
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-800 leading-relaxed font-medium">
              &ldquo;{coachMessage}&rdquo;
            </p>
          </div>
        </section>
      )}

      {/* 3. Peta Kesiapan 4 Dimensi Seleksi Paskibraka (Format 2 x 2) */}
      <section
        className="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4"
        aria-label="Kesiapan 4 Dimensi"
      >
        <Card className="p-3 sm:p-4 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-3xs sm:text-xs font-bold text-slate-500 uppercase truncate">
                1. Administrasi
              </span>
              <FileCheck2 className="size-3.5 sm:size-4 text-emerald-600 shrink-0" />
            </div>
            <p className="mt-1 sm:mt-2 font-display text-lg sm:text-2xl font-black text-slate-950 truncate">
              {docCount}
              <span className="text-xs sm:text-sm font-bold text-slate-400">
                /6 berkas
              </span>
            </p>
          </div>
          <div>
            <div className="mt-2.5 sm:mt-3 h-1.5 sm:h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${
                  docCount === 6 ? "bg-emerald-500" : "bg-amber-500"
                }`}
                style={{ width: `${docPercent}%` }}
              />
            </div>
            <p className="mt-1.5 sm:mt-2 text-3xs sm:text-2xs text-slate-500 truncate">
              {docCount === 6
                ? "Lengkap & siap"
                : `${6 - docCount} berkas kurang`}
            </p>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-3xs sm:text-xs font-bold text-slate-500 uppercase truncate">
                2. Akademik CAT
              </span>
              <Target className="size-3.5 sm:size-4 text-blue-600 shrink-0" />
            </div>
            <p className="mt-1 sm:mt-2 font-display text-lg sm:text-2xl font-black text-slate-950 truncate">
              {catAvg > 0 ? catAvg.toFixed(1) : "—"}
              <span className="text-xs sm:text-sm font-bold text-slate-400">
                /100
              </span>
            </p>
          </div>
          <div>
            <div className="mt-2.5 sm:mt-3 h-1.5 sm:h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${
                  catAvg >= 70 ? "bg-emerald-500" : "bg-blue-600"
                }`}
                style={{ width: `${Math.min(100, Math.round(catAvg))}%` }}
              />
            </div>
            <p className="mt-1.5 sm:mt-2 text-3xs sm:text-2xs text-slate-500 truncate">
              {catAvg >= 70 ? "Lulus passing grade" : "Target minimum: 70"}
            </p>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-3xs sm:text-xs font-bold text-slate-500 uppercase truncate">
                3. Kesamaptaan
              </span>
              <Flame className="size-3.5 sm:size-4 text-red-600 shrink-0" />
            </div>
            <p className="mt-1 sm:mt-2 font-display text-lg sm:text-2xl font-black text-slate-950 truncate">
              {fitnessVal > 0 ? fitnessVal : "—"}
              <span className="text-xs sm:text-sm font-bold text-slate-400">
                /100
              </span>
            </p>
          </div>
          <div>
            <div className="mt-2.5 sm:mt-3 h-1.5 sm:h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${
                  fitnessVal >= 75 ? "bg-emerald-500" : "bg-red-500"
                }`}
                style={{ width: `${Math.min(100, Math.round(fitnessVal))}%` }}
              />
            </div>
            <p className="mt-1.5 sm:mt-2 text-3xs sm:text-2xs text-slate-500 truncate">
              {latestInterval
                ? `Proyeksi: ${latestInterval.projected12MinDistanceM}m`
                : "Standar min. 2.400 m"}
            </p>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-3xs sm:text-xs font-bold text-slate-500 uppercase truncate">
                4. Medis / Postur
              </span>
              <HeartPulse className="size-3.5 sm:size-4 text-violet-600 shrink-0" />
            </div>
            <p className="mt-1 sm:mt-2 font-display text-base sm:text-xl font-black text-slate-950 truncate">
              {bmiInfo
                ? `${bmiInfo.value} (${bmiInfo.category})`
                : "Belum diukur"}
            </p>
          </div>
          <div>
            <div className="mt-2.5 sm:mt-3 h-1.5 sm:h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${
                  bmiInfo && bmiInfo.category === "Normal"
                    ? "bg-emerald-500"
                    : "bg-violet-500"
                }`}
                style={{ width: "100%" }}
              />
            </div>
            <p className="mt-1.5 sm:mt-2 text-3xs sm:text-2xs text-slate-500 truncate">
              {latestIshihara
                ? `Ishihara: ${
                    latestIshihara.selectionDecision === "eligible"
                      ? "Memenuhi"
                      : "Evaluasi"
                  }`
                : "Rikkes & Ishihara"}
            </p>
          </div>
        </Card>
      </section>

      {/* 4. Jadwal Terdekat & Target Latihan Harian */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* Jadwal dengan Countdown */}
        {upcomingSchedule ? (
          <Card className="flex flex-col justify-between border-blue-200 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 p-5">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-800">
                  <CalendarDays className="size-3.5" /> Jadwal Seleksi Terdekat
                </span>
                {scheduleCountdown && (
                  <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-2xs font-black text-white shadow-2xs animate-pulse">
                    <Clock className="inline size-3 mr-1" />
                    {scheduleCountdown}
                  </span>
                )}
              </div>
              <h2 className="mt-2 font-display text-xl font-bold text-slate-950">
                {upcomingSchedule.title}
              </h2>
              <p className="mt-1 text-sm text-slate-700 font-medium">
                {new Date(
                  `${upcomingSchedule.date}T${upcomingSchedule.time || "00:00"}`,
                ).toLocaleString("id-ID", {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Lokasi: <strong>{upcomingSchedule.location}</strong>
              </p>
              {upcomingSchedule.notes && (
                <div className="mt-3 rounded-xl bg-white/80 border border-blue-200/80 p-2.5 text-xs text-blue-900 leading-relaxed">
                  📌 <strong>Catatan:</strong> {upcomingSchedule.notes}
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-blue-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-600">
                Bawa atribut lengkap &amp; hadir 15 menit sebelum sesi.
              </span>
              <button
                type="button"
                onClick={() => onNavigate("candidate-stages")}
                className="font-bold text-blue-700 hover:text-blue-900"
              >
                Cek panduan &rarr;
              </button>
            </div>
          </Card>
        ) : (
          <Card className="flex flex-col justify-between p-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <CheckCircle2 className="size-4 text-emerald-600" /> Status
                Jadwal
              </div>
              <h2 className="mt-2 font-display text-lg font-bold text-slate-950">
                Tidak ada agenda mendesak hari ini
              </h2>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Pelatih belum menjadwalkan sesi tes baru. Manfaatkan waktu luang
                ini untuk drill fisik mandiri dan latihan soal tryout CAT.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onNavigate("cat-bank")}
                className="w-full justify-center"
              >
                Mulai 1 Tryout Sekarang
              </Button>
            </div>
          </Card>
        )}

        {/* Target Latihan Mandiri Santri (Interactive Daily Checklist) */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Target Latihan Mandiri Hari Ini
                </h3>
                <p className="text-2xs text-slate-500">
                  Beri centang saat Anda telah menyelesaikan target
                </p>
              </div>
              <Badge
                tone={
                  completedTaskCount === defaultTasks.length
                    ? "success"
                    : "info"
                }
              >
                {completedTaskCount}/{defaultTasks.length} tercapai
              </Badge>
            </div>

            <div className="mt-3 space-y-2">
              {defaultTasks.map((task) => {
                const isDone = Boolean(dailyTasks[task.id])
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => toggleDailyTask(task.id)}
                    className={`w-full flex items-center justify-between gap-2.5 rounded-xl border p-2.5 text-left transition ${
                      isDone
                        ? "border-emerald-200 bg-emerald-50/60 text-slate-700"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`size-4.5 rounded-md border flex items-center justify-center shrink-0 transition ${
                          isDone
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isDone && <Check className="size-3 stroke-[3]" />}
                      </div>
                      <span
                        className={`text-xs ${
                          isDone
                            ? "line-through text-slate-400 font-medium"
                            : "font-semibold text-slate-800"
                        }`}
                      >
                        {task.label}
                      </span>
                    </div>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-3xs font-bold text-slate-500 shrink-0">
                      {task.category}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="mt-3 pt-2 text-2xs text-slate-500 text-center">
            Konsistensi harian menentukan keberhasilan di seleksi tingkat
            Kota/Provinsi.
          </div>
        </Card>
      </section>

      {/* 5. Akses Cepat 6 Modul Utama */}
      <Card className="p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Akses Cepat Modul Pembinaan &amp; Panduan
        </p>
        <div className="mt-3 grid gap-2.5 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
          <button
            type="button"
            onClick={() => onNavigate("cat-bank")}
            className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-red-300 hover:bg-red-50/50 group"
          >
            <GraduationCap className="size-5 text-red-600 group-hover:scale-110 transition" />
            <span className="mt-2 block text-xs font-bold text-slate-800">
              Latihan CAT
            </span>
            <span className="text-3xs text-slate-500">PIP &amp; TIU</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("candidate-stages")}
            className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-amber-300 hover:bg-amber-50/50 group"
          >
            <CheckCircle2 className="size-5 text-amber-600 group-hover:scale-110 transition" />
            <span className="mt-2 block text-xs font-bold text-slate-800">
              8 Tahap Seleksi
            </span>
            <span className="text-3xs text-slate-500">Status kelulusan</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("standards")}
            className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/50 group"
          >
            <SlidersHorizontal className="size-5 text-indigo-600 group-hover:scale-110 transition" />
            <span className="mt-2 block text-xs font-bold text-slate-800">
              Kalkulator BPIP
            </span>
            <span className="text-3xs text-slate-500">Simulasi fisik</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("ishihara")}
            className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/50 group"
          >
            <Eye className="size-5 text-blue-600 group-hover:scale-110 transition" />
            <span className="mt-2 block text-xs font-bold text-slate-800">
              Tes Ishihara
            </span>
            <span className="text-3xs text-slate-500">Penglihatan warna</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("guide")}
            className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/50 group"
          >
            <BookOpenCheck className="size-5 text-emerald-600 group-hover:scale-110 transition" />
            <span className="mt-2 block text-xs font-bold text-slate-800">
              Panduan Lengkap
            </span>
            <span className="text-3xs text-slate-500">Juknis resmi BPIP</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("candidate-ranking")}
            className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-violet-300 hover:bg-violet-50/50 group"
          >
            <Trophy className="size-5 text-violet-600 group-hover:scale-110 transition" />
            <span className="mt-2 block text-xs font-bold text-slate-800">
              Peringkat Saya
            </span>
            <span className="text-3xs text-slate-500">Posisi seleksi</span>
          </button>
        </div>
      </Card>
    </div>
  )
}

function CandidateStages() {
  const {
    currentUser,
    candidates,
    catTryoutAttempts,
    sessions,
    records,
    ishiharaResults,
  } = useApp()
  const candidate = candidates.find(
    (item) => item.id === currentUser.candidateId,
  )
  if (!candidate)
    return (
      <Card className="p-6">
        <p className="text-sm text-slate-600">
          Profil kandidat belum tersedia.
        </p>
      </Card>
    )

  const statuses = getProgressStageStatuses(
    candidate,
    catTryoutAttempts,
    sessions,
    records,
  )
  const ownAttempts = catTryoutAttempts
    .filter(
      (attempt) =>
        attempt.candidateId === candidate.id ||
        attempt.candidateName.trim().toLocaleLowerCase() ===
          candidate.name.trim().toLocaleLowerCase(),
    )
    .slice()
    .sort((a, b) => b.finalizedAt.localeCompare(a.finalizedAt))
  const latestAttempt = ownAttempts[0]
  const latestIshihara = ishiharaResults
    .filter((result) => result.participantId === candidate.id)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const detailForStage = (index: number) => {
    if (index === 0) {
      const valid = (candidate.documents ?? []).filter(Boolean).length
      return `${valid} dari 6 berkas tercatat lengkap`
    }
    if (index === 1)
      return latestAttempt
        ? `Nilai terakhir ${latestAttempt.pipScore}/100`
        : candidate.pip !== null
          ? `Nilai tercatat ${candidate.pip}/100`
          : "Hasil PIP belum tersedia"
    if (index === 2)
      return latestAttempt
        ? `Nilai terakhir ${latestAttempt.tiuScoreScaled}/100`
        : candidate.tiu !== null
          ? `Nilai tercatat ${candidate.tiu}/100`
          : "Hasil TIU belum tersedia"
    if (index === 3)
      return latestIshihara
        ? `Pemeriksaan ${
            latestIshihara.completionStatus === "completed"
              ? "selesai"
              : "belum tuntas"
          } · ${
            latestIshihara.selectionDecision === "eligible"
              ? "memenuhi syarat"
              : latestIshihara.selectionDecision === "ineligible"
                ? "perlu tindak lanjut"
                : "menunggu keputusan"
          }`
        : "Hasil pemeriksaan belum tersedia"
    if (index === 4)
      return candidate.heightCm
        ? `Tinggi badan tercatat ${candidate.heightCm} cm`
        : "Data parade belum tersedia"
    if (index === 5)
      return candidate.pbb !== null
        ? `Nilai tercatat ${candidate.pbb}/100`
        : "Hasil PBB belum tersedia"
    if (index === 6)
      return candidate.fitness !== null
        ? `Nilai tercatat ${candidate.fitness}/100`
        : candidate.physicalMetrics?.length
          ? `${candidate.physicalMetrics.length} catatan kebugaran tersedia`
          : "Hasil kesamaptaan belum tersedia"
    return candidate.personality !== null
      ? `Nilai tercatat ${candidate.personality}/100`
      : "Hasil kepribadian belum tersedia"
  }
  const prepMaterials = [
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {administrationDocuments.map((doc) => (
        <li key={doc.name}>
          <strong>{doc.name}:</strong> {doc.detail}
        </li>
      ))}
    </ul>,
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {pipTopics.map((topic) => (
        <li key={topic.name}>
          <strong>{topic.name}:</strong> {topic.detail}
        </li>
      ))}
    </ul>,
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {tiuTopics.map(([name, category, detail]) => (
        <li key={name}>
          <strong>
            {name} · {category}:
          </strong>{" "}
          {detail}
        </li>
      ))}
    </ul>,
    <p>
      Jaga kebugaran, istirahat cukup, dan ikuti instruksi petugas. Bawa dokumen
      kesehatan yang diminta panitia. Pemeriksaan dan keputusan resmi hanya
      dilakukan oleh petugas berwenang.
    </p>,
    <p>
      Latih sikap sempurna, postur, kerapian, ketegapan, dan langkah berjalan.
      Pastikan pakaian dan perlengkapan sesuai arahan panitia.
    </p>,
    <ul className="grid gap-1.5">
      {pbbRubric.map(([name, detail]) => (
        <li key={name}>
          <strong>{name}:</strong> {detail}
        </li>
      ))}
    </ul>,
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {Object.entries(fitnessTables).map(([name, rows]) => (
        <li key={name}>
          <strong>
            {name === "run"
              ? "Lari 12 menit"
              : name === "pushup"
                ? "Push-up"
                : name === "situp"
                  ? "Sit-up"
                  : name === "backup"
                    ? "Back-up"
                    : "Shuttle run"}
            :
          </strong>{" "}
          {rows
            .slice(0, 4)
            .map(
              ([range, score, grade]) => `${range}: nilai ${score} (${grade})`,
            )
            .join("; ")}
        </li>
      ))}
    </ul>,
    <p>
      Persiapkan komunikasi yang jelas, kerja sama, disiplin, kepemimpinan, dan
      pengendalian diri. Jawab asesmen dengan jujur dan ikuti arahan
      pewawancara.
    </p>,
  ]
  const done = statuses.filter((status) => status === "passed").length

  return (
    <div className="grid gap-5">
      {/* Wadah Header Tahapan Seleksi Saya */}
      <Card className="p-4 sm:p-5 border-slate-200/90 shadow-2xs">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
            Perjalanan Seleksi Paskibraka 2027
          </p>
          <h1 className="mt-1 font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-950">
            Tahapan seleksi saya
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Pantau status dan informasi yang sudah tercatat untuk setiap tahap seleksi.
          </p>
        </div>
      </Card>
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Progres keseluruhan
            </p>
            <p className="mt-1 font-display text-2xl font-bold">
              {done} dari 8 tahap selesai
            </p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-600"
            style={{ width: `${Math.round((done / 8) * 100)}%` }}
          />
        </div>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        {selectionStages.map((stage, index) => {
          const status = statuses[index] ?? "locked"
          return (
            <Card key={stage.key} className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-2xl text-xs font-black ${stageTone(status)}`}
                >
                  {stage.shortLabel}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-display font-bold text-slate-950">
                      {stage.id}. {stage.label}
                    </h2>
                    <StatusBadge status={status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {detailForStage(index)}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {stage.phase === 1
                      ? "Tahap seleksi awal"
                      : "Tahap lanjutan"}
                  </p>
                </div>
              </div>
              {index === 0 && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-3 border-t border-slate-100">
                  {administrationDocuments.map((doc, docIdx) => {
                    const isReady = Boolean(candidate.documents?.[docIdx])
                    return (
                      <div
                        key={doc.name}
                        className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-2xs border ${
                          isReady
                            ? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
                            : "border-amber-200 bg-amber-50/70 text-amber-950"
                        }`}
                      >
                        <span className="font-semibold truncate">
                          {doc.name}
                        </span>
                        {isReady ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 shrink-0">
                            <Check className="size-3" /> Lengkap
                          </span>
                        ) : (
                          <span className="font-bold text-amber-700 shrink-0">
                            Belum Lengkap
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              <details className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <summary className="cursor-pointer text-xs font-bold text-blue-800">
                  Materi &amp; persiapan tahap ini
                </summary>
                <div className="mt-3 text-xs leading-relaxed text-slate-600">
                  {prepMaterials[index]}
                </div>
              </details>
            </Card>
          )
        })}
      </div>
      <p className="text-xs text-slate-500">
        Status diperbarui berdasarkan hasil dan data yang dicatat pelatih. Jika
        ada informasi yang belum sesuai, hubungi pelatih Anda.
      </p>
    </div>
  )
}

function CandidateProgress() {
  const {
    currentUser,
    candidates,
    catTryoutAttempts,
    sessions,
    records,
    ishiharaResults,
  } = useApp()
  const candidate = candidates.find(
    (item) => item.id === currentUser.candidateId,
  )
  if (!candidate)
    return (
      <Card className="p-6">
        <p className="text-sm text-slate-600">
          Profil kandidat belum tersedia.
        </p>
      </Card>
    )

  const statuses = getProgressStageStatuses(
    candidate,
    catTryoutAttempts,
    sessions,
    records,
  )
  const completed = statuses.filter((status) => status === "passed").length
  const latestAttempt = catTryoutAttempts
    .filter(
      (attempt) =>
        attempt.candidateId === candidate.id ||
        attempt.candidateName.trim().toLocaleLowerCase() ===
          candidate.name.trim().toLocaleLowerCase(),
    )
    .slice()
    .sort((a, b) => b.finalizedAt.localeCompare(a.finalizedAt))[0]
  const attempts = catTryoutAttempts
    .filter(
      (attempt) =>
        attempt.candidateId === candidate.id ||
        attempt.candidateName.trim().toLocaleLowerCase() ===
          candidate.name.trim().toLocaleLowerCase(),
    )
    .slice()
    .sort((a, b) => b.finalizedAt.localeCompare(a.finalizedAt))
  const anthropometry = (candidate.anthropometryHistory ?? [])
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
  const latestMeasurement = anthropometry[0]
  const height = latestMeasurement?.heightCm ?? candidate.heightCm
  const weight = latestMeasurement?.weightKg ?? candidate.weightKg
  const bmiInfo = bmi(weight ?? 0, height ?? 0)
  const physicalMetrics = candidate.physicalMetrics ?? []
  const metricFor = (term: string) =>
    physicalMetrics.find((metric) => metric.label.toLowerCase().includes(term))
  const fitnessRecords = sessions
    .filter(
      (session) =>
        session.type === "fitness" &&
        !session.title.toLowerCase().includes("interval"),
    )
    .map((session) => ({
      session,
      record: records[`${session.id}:${candidate.id}`],
    }))
    .filter((item) => Boolean(item.record?.savedAt))
    .sort((a, b) =>
      (b.record?.savedAt ?? "").localeCompare(a.record?.savedAt ?? ""),
    )
  const latestIshihara = ishiharaResults
    .filter((result) => result.participantId === candidate.id)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const candidateIntervalHistory = extractCandidateIntervalLogs(
    candidate.id,
    sessions,
    records,
    candidate.intervalHistory ?? [],
  )
  const decisionText =
    latestIshihara?.selectionDecision === "eligible"
      ? "Memenuhi syarat"
      : latestIshihara?.selectionDecision === "ineligible"
        ? "Perlu tindak lanjut"
        : latestIshihara
          ? "Menunggu keputusan"
          : "Belum ada hasil"
  const dataByStage = [
    `${(candidate.documents ?? []).filter(Boolean).length}/6 berkas tercatat lengkap`,
    latestAttempt
      ? `Nilai terakhir ${latestAttempt.pipScore}/100`
      : candidate.pip !== null
        ? `Nilai tercatat ${candidate.pip}/100`
        : "Belum ada hasil CAT PIP",
    latestAttempt
      ? `Nilai terakhir ${latestAttempt.tiuScoreScaled}/100`
      : candidate.tiu !== null
        ? `Nilai tercatat ${candidate.tiu}/100`
        : "Belum ada hasil CAT TIU",
    latestIshihara ? decisionText : "Hasil pemeriksaan belum tercatat",
    candidate.heightCm && candidate.weightKg
      ? `${candidate.heightCm} cm · ${candidate.weightKg} kg`
      : "Data postur belum tersedia",
    candidate.pbb !== null
      ? `Nilai tercatat ${candidate.pbb}/100`
      : "Hasil PBB belum tersedia",
    candidate.physicalMetrics?.length
      ? candidate.physicalMetrics
          .map((metric) => `${metric.label}: ${metric.current}`)
          .join(" · ")
      : candidate.fitness !== null
        ? `Nilai tercatat ${candidate.fitness}/100`
        : "Hasil kesamaptaan belum tersedia",
    candidate.personality !== null
      ? `Nilai tercatat ${candidate.personality}/100`
      : "Hasil kepribadian belum tersedia",
  ]

  return (
    <div className="grid gap-4 sm:gap-5 print:bg-white">
      {/* Wadah Header Perkembangan Saya */}
      <Card className="p-4 sm:p-5 border-slate-200/90 shadow-2xs">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-[0.65rem] font-bold text-red-700 border border-red-200/60 uppercase tracking-wider">
              Rekam Individual
            </span>
            <h1 className="mt-1 font-display text-lg sm:text-2xl font-bold tracking-tight text-slate-950">
              Perkembangan saya
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              Informasi seleksi pribadi untuk {candidate.name}
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => window.print()}
            className="shrink-0 shadow-2xs text-xs font-bold"
          >
            <Printer className="size-3.5" />
            <span className="hidden sm:inline">Cetak ringkasan</span>
            <span className="sm:hidden">Cetak</span>
          </Button>
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 bg-slate-950 p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-4">
            <CandidateAvatar
              name={candidate.name}
              avatar={candidate.avatar}
              photoUrl={candidate.photoUrl}
              className="size-16 shrink-0 border border-white/20"
              rounded="rounded-2xl"
            />
            <div>
              <h2 className="font-display text-xl font-bold">
                {candidate.name}
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                {candidate.number} · {candidate.school} · {candidate.gender}
              </p>
            </div>
          </div>
          <div className="min-w-48">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Kesiapan seleksi</span>
              <strong className="text-emerald-300">
                {Math.round((completed / 8) * 100)}%
              </strong>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{ width: `${Math.round((completed / 8) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-right text-xs text-slate-300">
              {completed} dari 8 tahap siap standar
            </p>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Peta kesiapan 8 tahap seleksi
            </h2>
            <span className="text-xs text-slate-500">Data akun Anda</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {selectionStages.map((stage, index) => (
              <div
                key={stage.key}
                className="rounded-xl border border-slate-200 bg-white p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-500">
                    {stage.id} · {stage.shortLabel}
                  </span>
                  <StatusBadge status={statuses[index] ?? "locked"} />
                </div>
                <h3 className="mt-2 text-sm font-bold text-slate-900">
                  {stage.label}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {dataByStage[index]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [
            "Administrasi",
            `${(candidate.documents ?? []).filter(Boolean).length}/6 berkas`,
          ],
          [
            "PIP",
            latestAttempt
              ? `${latestAttempt.pipScore}/100`
              : candidate.pip === null
                ? "Belum dinilai"
                : `${candidate.pip}/100`,
          ],
          [
            "TIU",
            latestAttempt
              ? `${latestAttempt.tiuScoreScaled}/100`
              : candidate.tiu === null
                ? "Belum dinilai"
                : `${candidate.tiu}/100`,
          ],
          ["Status Ishihara", decisionText],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-2 font-display text-lg font-bold text-slate-950">
              {value}
            </p>
          </Card>
        ))}
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-950">
              Tracking tinggi badan, berat badan &amp; BMI
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Riwayat pengukuran yang tercatat untuk akun Anda.
            </p>
          </div>
          <Badge tone="info">
            {anthropometry.length || (height && weight ? 1 : 0)} pengukuran
          </Badge>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-3 sm:p-5">
          {[
            {
              label: "Tinggi badan",
              value: height ? `${height} cm` : "Belum diukur",
              target:
                candidate.gender === "Putra"
                  ? "Target 170–180 cm"
                  : "Target 165–175 cm",
              tone: "bg-blue-500",
            },
            {
              label: "Berat badan",
              value: weight ? `${weight} kg` : "Belum diukur",
              target: height
                ? `Rentang proporsional ${(height - 115).toFixed(0)}–${(height - 105).toFixed(0)} kg`
                : "Target proporsional",
              tone: "bg-emerald-500",
            },
            {
              label: "Indeks Massa Tubuh",
              value: bmiInfo ? `${bmiInfo.value} kg/m²` : "Belum tersedia",
              target: bmiInfo ? bmiInfo.category : "Rentang acuan 18,5–24,9",
              tone: "bg-violet-500",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
            >
              <p className="text-xs font-bold text-slate-600">{item.label}</p>
              <p className="mt-2 font-display text-2xl font-bold text-slate-950">
                {item.value}
              </p>
              <div className={`mt-4 h-1.5 rounded-full ${item.tone}`} />
              <p className="mt-3 text-xs text-slate-500">{item.target}</p>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full min-w-[38rem] text-left text-sm">
            <thead className="bg-slate-50 text-2xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Tanggal ukur</th>
                <th className="px-4 py-3">Tinggi</th>
                <th className="px-4 py-3">Berat</th>
                <th className="px-4 py-3">BMI / IMT</th>
                <th className="px-5 py-3">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {anthropometry.length ? (
                anthropometry.map((entry) => {
                  const entryBmi = bmi(entry.weightKg, entry.heightCm)
                  return (
                    <tr key={entry.id}>
                      <td className="px-5 py-3.5 text-slate-600">
                        {entry.date}
                      </td>
                      <td className="px-4 py-3.5 font-semibold">
                        {entry.heightCm} cm
                      </td>
                      <td className="px-4 py-3.5 font-semibold">
                        {entry.weightKg} kg
                      </td>
                      <td className="px-4 py-3.5">
                        {entryBmi
                          ? `${entryBmi.value} (${entryBmi.category})`
                          : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {entry.note || "—"}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-7 text-center text-sm text-slate-500"
                  >
                    Belum ada riwayat pengukuran tersimpan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-950">
                Riwayat CAT PIP &amp; TIU
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Percobaan Anda, dari yang paling baru.
              </p>
            </div>
            <Badge tone="info">{attempts.length} percobaan</Badge>
          </div>
        </div>
        {attempts.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-left text-sm">
              <thead className="bg-slate-50 text-2xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Selesai</th>
                  <th className="px-4 py-3">Percobaan</th>
                  <th className="px-4 py-3">PIP</th>
                  <th className="px-4 py-3">TIU</th>
                  <th className="px-5 py-3 text-right">Rata-rata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td className="px-5 py-3.5 text-slate-600">
                      {new Date(
                        attempt.finalizedAt.replace(" ", "T"),
                      ).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3.5 font-semibold">
                      #{attempt.attemptNumber}
                    </td>
                    <td className="px-4 py-3.5 font-semibold">
                      {attempt.pipScore}/100
                    </td>
                    <td className="px-4 py-3.5 font-semibold">
                      {attempt.tiuScoreScaled}/100
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-emerald-700">
                      {attempt.combinedScore.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            Belum ada riwayat ujian CAT PIP/TIU untuk akun ini.
          </p>
        )}
      </Card>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-950">
              Tren &amp; rekap kesamaptaan
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Nilai serta catatan sesi kebugaran yang sudah disimpan.
            </p>
          </div>
          <Badge tone="info">{fitnessRecords.length} sesi tercatat</Badge>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5 sm:p-5">
          {[
            ["Lari 12 menit", metricFor("lari")?.current ?? "—", "3000 m"],
            ["Push-up", metricFor("push")?.current ?? "—", "45 kali"],
            ["Sit-up", metricFor("sit")?.current ?? "—", "40 kali"],
            ["Back-up", metricFor("back")?.current ?? "—", "50 kali"],
            ["Shuttle run", metricFor("shuttle")?.current ?? "—", "15,4 dtk"],
          ].map(([label, value, target]) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
            >
              <p className="text-xs font-bold text-slate-700">{label}</p>
              <p className="mt-2 font-display text-xl font-bold text-slate-950">
                {value}
              </p>
              <p className="mt-3 border-t border-slate-200 pt-2 text-xs text-slate-500">
                Target acuan: {target}
              </p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 border-y border-slate-100 bg-emerald-50/60 px-5 py-3">
          <span className="text-sm font-semibold text-slate-700">
            Nilai kesamaptaan terakhir
          </span>
          <strong className="font-display text-lg text-emerald-800">
            {candidate.fitness === null
              ? "Belum dinilai"
              : `${candidate.fitness}/100`}
          </strong>
        </div>
        {fitnessRecords.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-left text-sm">
              <thead className="bg-slate-50 text-2xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Tanggal &amp; sesi</th>
                  <th className="px-4 py-3">Lari</th>
                  <th className="px-4 py-3">Push-up</th>
                  <th className="px-4 py-3">Sit-up</th>
                  <th className="px-4 py-3">Back-up</th>
                  <th className="px-5 py-3">Shuttle run</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fitnessRecords.map(({ session, record }) => (
                  <tr key={session.id}>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800">
                        {session.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {record?.savedAt?.slice(0, 10)}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      {record?.metrics.distance || "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      {record?.metrics.pushup || "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      {record?.metrics.situp || "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      {record?.metrics.backup || "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      {record?.metrics.shuttle || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-7 text-center text-sm text-slate-500">
            Belum ada riwayat sesi kesamaptaan.
          </p>
        )}
      </Card>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-bold text-slate-950">
                Latihan Interval &amp; Proyeksi Ketahanan
              </h2>
              <Badge tone="info">Menu Pembinaan</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Pelacakan kecepatan lari (speed endurance) dan perkiraan capaian
              seleksi 12 menit.
            </p>
          </div>
          <Badge tone="neutral">
            {candidateIntervalHistory.length} sesi tercatat
          </Badge>
        </div>

        {candidateIntervalHistory.length > 0 ? (
          <div className="p-4 sm:p-5 space-y-4">
            {(() => {
              const latest = candidateIntervalHistory[0]
              return (
                <div className="rounded-2xl border border-red-100 bg-gradient-to-r from-red-50/70 via-amber-50/40 to-white p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-red-700">
                      Analisis Proyeksi Terkini ({latest.date})
                    </span>
                    <Badge tone="success">
                      Konsistensi: {latest.paceConsistency}
                    </Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-white/90 border border-slate-200/80 p-3 shadow-2xs">
                      <span className="text-2xs font-bold text-slate-500 uppercase">
                        Proyeksi Lari 12 Menit
                      </span>
                      <p className="mt-1 font-display text-2xl font-black text-emerald-700">
                        {latest.projected12MinDistanceM.toLocaleString("id-ID")}{" "}
                        m
                      </p>
                      <p className="text-2xs text-slate-500 mt-0.5">
                        Prediksi Nilai BPIP:{" "}
                        <strong>{latest.projected12MinScore}/100</strong>
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/90 border border-slate-200/80 p-3 shadow-2xs">
                      <span className="text-2xs font-bold text-slate-500 uppercase">
                        Rata-rata Split Pace
                      </span>
                      <p className="mt-1 font-display text-2xl font-black text-slate-900">
                        {latest.avgSplitSec}s{" "}
                        <span className="text-xs font-normal text-slate-500">
                          / 400m
                        </span>
                      </p>
                      <p className="text-2xs text-slate-500 mt-0.5">
                        Target Acuan: {latest.targetPaceSec}s / lap
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/90 border border-slate-200/80 p-3 shadow-2xs">
                      <span className="text-2xs font-bold text-slate-500 uppercase">
                        Skor Sesi Latihan
                      </span>
                      <p className="mt-1 font-display text-2xl font-black text-red-600">
                        {latest.score}
                        <span className="text-xs font-normal text-slate-400">
                          /100
                        </span>
                      </p>
                      <p className="text-2xs text-slate-500 mt-0.5">
                        {latest.completedSets} dari {latest.targetSets} set
                        tuntas
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-blue-50/80 border border-blue-200/80 p-3 text-xs text-blue-950 leading-relaxed">
                    💡 <strong>Saran Kepelatihan:</strong>{" "}
                    {latest.coachRecommendation}
                  </div>
                </div>
              )
            })()}

            <div className="overflow-x-auto border-t border-slate-100 pt-2">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="bg-slate-50 text-2xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Tanggal &amp; Sesi</th>
                    <th className="px-4 py-3">Set</th>
                    <th className="px-4 py-3">Rata Split</th>
                    <th className="px-4 py-3">Split Tiap Set (Lap)</th>
                    <th className="px-4 py-3">Proyeksi 12 Mnt</th>
                    <th className="px-4 py-3 text-right">Skor Drill</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {candidateIntervalHistory.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-800">
                          {item.sessionTitle}
                        </p>
                        <p className="text-3xs text-slate-400">{item.date}</p>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-700">
                        {item.completedSets}/{item.targetSets} set
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {item.avgSplitSec}s
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {item.lapSplitsSec.map((split, i) => (
                            <span
                              key={i}
                              className={`rounded px-1.5 py-0.5 text-3xs font-bold ${
                                split <= item.targetPaceSec
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              L{i + 1}: {split}s
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-emerald-700">
                        {item.projected12MinDistanceM.toLocaleString("id-ID")} m
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-red-600">
                        {item.score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-sm text-slate-500">
            Belum ada riwayat latihan interval tercatat. Hasil drill interval
            pelatih akan muncul di sini tanpa mengubah nilai resmi Lari 12 Menit
            seleksi.
          </div>
        )}
      </Card>
      <p className="text-xs text-slate-500">
        Nilai dan status ditampilkan dari hasil yang dicatat panitia. Kandidat
        tidak dapat mengubah hasil atau catatan seleksi.
      </p>
    </div>
  )
}

function CandidateRanking() {
  return <RankingView onSelectCandidate={() => undefined} />
}

function CandidateProfileMissing() {
  return (
    <Card className="p-6">
      <h1 className="font-display text-xl font-bold text-slate-950">
        Profil santri belum terhubung
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Tes belum dapat dibuka karena akun ini belum terhubung ke nomor peserta.
        Minta pelatih memeriksa profil akun Anda.
      </p>
    </Card>
  )
}

function CandidateResults({
  onNavigate,
}: {
  onNavigate: (view: View) => void
}) {
  const { currentUser, candidates, catTryoutAttempts } = useApp()
  const candidate = candidates.find(
    (item) => item.id === currentUser.candidateId,
  )
  const attempts = catTryoutAttempts
    .filter(
      (attempt) =>
        attempt.candidateId === candidate?.id ||
        attempt.candidateName.trim().toLocaleLowerCase() ===
          candidate?.name.trim().toLocaleLowerCase(),
    )
    .slice()
    .sort((a, b) => b.finalizedAt.localeCompare(a.finalizedAt))

  if (!candidate) {
    return (
      <Card className="p-6">
        <p className="text-sm text-slate-600">
          Profil kandidat belum tersedia.
        </p>
      </Card>
    )
  }

  const latest = attempts[0]
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
            Ruang pribadi · {candidate.number}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-slate-950 sm:text-3xl">
            Hasil &amp; riwayat
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Hanya hasil ujian Anda yang ditampilkan di halaman ini.
          </p>
        </div>
        <Button variant="secondary" onClick={() => onNavigate("cat-bank")}>
          <GraduationCap className="size-4" /> Buka CAT
        </Button>
      </div>

      {latest ? (
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Percobaan terbaru · #{latest.attemptNumber}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {new Date(latest.finalizedAt.replace(" ", "T")).toLocaleString(
                  "id-ID",
                  { dateStyle: "long", timeStyle: "short" },
                )}
              </p>
            </div>
            <Badge
              tone={
                latest.pipStatus === "passed" && latest.tiuStatus === "passed"
                  ? "success"
                  : "warning"
              }
            >
              {latest.pipStatus === "passed" && latest.tiuStatus === "passed"
                ? "Lulus PIP & TIU"
                : "Perlu tindak lanjut"}
            </Badge>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">Nilai PIP</p>
              <p className="mt-1 font-display text-2xl font-bold text-slate-950">
                {latest.pipScore}
                <span className="ml-1 text-sm text-slate-400">/100</span>
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">Nilai TIU</p>
              <p className="mt-1 font-display text-2xl font-bold text-slate-950">
                {latest.tiuScoreScaled}
                <span className="ml-1 text-sm text-slate-400">/100</span>
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-semibold text-emerald-800">
                Rata-rata
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-emerald-800">
                {latest.combinedScore.toFixed(1)}
                <span className="ml-1 text-sm text-emerald-700/60">/100</span>
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-950">
              Belum ada hasil CAT
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Hasil akan tampil di sini setelah Anda menyelesaikan sesi PIP dan
              TIU.
            </p>
          </div>
          <Button onClick={() => onNavigate("cat-bank")}>
            <GraduationCap className="size-4" /> Mulai tryout CAT
          </Button>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-display text-base font-bold text-slate-950">
            Riwayat percobaan
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Percobaan terbaru ditampilkan lebih dahulu.
          </p>
        </div>
        {attempts.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-left text-sm">
              <thead className="bg-slate-50 text-2xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Tanggal</th>
                  <th className="px-4 py-3">Percobaan</th>
                  <th className="px-4 py-3">PIP</th>
                  <th className="px-4 py-3">TIU</th>
                  <th className="px-5 py-3 text-right">Rata-rata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td className="px-5 py-3.5 text-slate-600">
                      {new Date(
                        attempt.finalizedAt.replace(" ", "T"),
                      ).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3.5 font-semibold">
                      #{attempt.attemptNumber}
                    </td>
                    <td className="px-4 py-3.5 font-semibold tabular-nums">
                      {attempt.pipScore}{" "}
                      <span className="text-xs font-normal text-slate-400">
                        ·{" "}
                        {attempt.pipStatus === "passed"
                          ? "Lulus"
                          : "Belum lulus"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold tabular-nums">
                      {attempt.tiuScoreScaled}{" "}
                      <span className="text-xs font-normal text-slate-400">
                        ·{" "}
                        {attempt.tiuStatus === "passed"
                          ? "Lulus"
                          : "Belum lulus"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold tabular-nums text-emerald-700">
                      {attempt.combinedScore.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            Riwayat ujian Anda akan muncul di sini.
          </p>
        )}
      </Card>
    </div>
  )
}

function Overview({
  onOpenAddCandidate,
  onSelectCandidate,
  onNavigateView,
  onNavigateStage,
}: {
  onOpenAddCandidate: () => void
  onSelectCandidate: (candidateId: string) => void
  onNavigateView: (view: View) => void
  onNavigateStage: (stageIndex: number) => void
}) {
  const {
    candidates,
    currentUser,
    activeCycle,
    catTryoutAttempts,
    sessions,
    records,
  } = useApp()

  const totalCount = candidates.length

  // 1. Kehadiran & Status Lapangan
  const absentCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const note = (c.coachNote || "").toLowerCase()
      return ["izin", "sakit", "alpa"].some((w) => note.includes(w))
    })
  }, [candidates])
  const activeInFieldCount = totalCount - absentCandidates.length

  // 2. Evaluasi Hasil Tes Lari 12 Menit (Standar Paskibraka >= 2400m, Target 3000m)
  const runEvaluation = useMemo(() => {
    let tested = 0
    let passedStandard = 0 // >= 2400m
    let dnf = 0
    let totalDistance = 0

    for (const c of candidates) {
      const note = (c.coachNote || "").toLowerCase()
      const runM = (c.physicalMetrics ?? []).find((pm) =>
        pm.label.toLowerCase().includes("lari"),
      )
      const isDnf = (runM && runM.current === "DNF") || note.includes("dnf")

      if (isDnf) {
        tested++
        dnf++
      } else if (
        runM &&
        runM.current &&
        !["Belum diuji", "Belum dicatat", "—"].includes(runM.current)
      ) {
        tested++
        const distMatch = runM.current.match(/[\d.]+/)
        const dist = distMatch ? parseFloat(distMatch[0].replace(".", "")) : 0
        if (dist >= 2400) {
          passedStandard++
        }
        if (dist > 0) {
          totalDistance += dist
        }
      }
    }
    const avgDist =
      tested > dnf ? Math.round(totalDistance / (tested - dnf)) : 0
    return {
      tested,
      passedStandard,
      dnf,
      untested: totalCount - tested,
      passRate: tested > 0 ? Math.round((passedStandard / tested) * 100) : 0,
      avgDist,
    }
  }, [candidates, totalCount])

  // 3. Sesi Susulan / Tindak Lanjut Mendesak (HANYA DNF, Absen Sesi, Belum Tes)
  const urgentFollowUpCandidates = useMemo(() => {
    return candidates.flatMap((c) => {
      const note = (c.coachNote || "").toLowerCase()
      const runM = (c.physicalMetrics ?? []).find((pm) =>
        pm.label.toLowerCase().includes("lari"),
      )
      const isDnf = (runM && runM.current === "DNF") || note.includes("dnf")
      const noRun =
        !runM ||
        !runM.current ||
        ["Belum diuji", "Belum dicatat", "—"].includes(runM.current)
      const attendanceWord = ["izin", "sakit", "alpa"].find((w) =>
        note.includes(w),
      )

      if (isDnf) {
        return [
          {
            candidate: c,
            category: "dnf" as const,
            statusLabel: "Tes Ulang Lari",
            statusTone: "bg-rose-50 text-rose-700 border-rose-200",
            reason: "DNF pada uji lari 12 menit · perlu uji ulang fisik",
          },
        ]
      }
      if (attendanceWord) {
        const attUpper = attendanceWord.toUpperCase()
        return [
          {
            candidate: c,
            category: "attendance" as const,
            statusLabel: `Susulan (${attUpper})`,
            statusTone:
              attendanceWord === "izin"
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : attendanceWord === "sakit"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-rose-50 text-rose-700 border-rose-200",
            reason: `Tidak hadir latihan (${attUpper}) · belum ada nilai lapangan`,
          },
        ]
      }
      if (noRun) {
        return [
          {
            candidate: c,
            category: "no_run" as const,
            statusLabel: "Belum Uji",
            statusTone: "bg-slate-100 text-slate-700 border-slate-200",
            reason: "Belum ada catatan tes lari resmi",
          },
        ]
      }
      return []
    })
  }, [candidates])

  const attentionStage = selectionStages
    .slice(1)
    .map((stage) => {
      const index = stage.id - 1
      const assigned = candidates.filter(
        (candidate) => candidate.stage === stage.id,
      )
      const pending = assigned.filter(
        (candidate) => candidate.stageStatuses[index] !== "passed",
      )
      const failed = pending.filter(
        (candidate) => candidate.stageStatuses[index] === "failed",
      ).length
      const needsReview = pending.filter(
        (candidate) => candidate.stageStatuses[index] === "review",
      ).length
      return {
        stage,
        index,
        pendingCount: pending.length,
        priority:
          failed * 3 +
          needsReview * 2 +
          (pending.length - failed - needsReview),
      }
    })
    .sort((a, b) => b.priority - a.priority)[0]

  // Compare every available numeric result on the same 0–100 scale; use completed stages to break ties.
  const topPerformers = useMemo(() => {
    return [...candidates]
      .map((candidate) => {
        const statuses = getProgressStageStatuses(
          candidate,
          catTryoutAttempts,
          sessions,
          records,
        )
        const normalizedName = candidate.name.trim().toLocaleLowerCase()
        const latestAttempt = catTryoutAttempts
          .filter(
            (attempt) =>
              attempt.candidateId === candidate.id ||
              attempt.candidateName.trim().toLocaleLowerCase() ===
                normalizedName,
          )
          .sort((a, b) => b.finalizedAt.localeCompare(a.finalizedAt))[0]
        const latestSessionScore = (type: "pip" | "tiu") =>
          sessions
            .filter((session) => session.type === type)
            .map((session) => {
              const record = records[`${session.id}:${candidate.id}`]
              if (!record?.savedAt) return null
              const rawScore =
                record.metrics.score !== undefined &&
                record.metrics.score !== ""
                  ? Number(record.metrics.score)
                  : record.metrics.correct !== undefined &&
                      record.metrics.correct !== ""
                    ? Number(record.metrics.correct) * 2
                    : null
              return rawScore !== null && Number.isFinite(rawScore)
                ? { score: rawScore, time: Date.parse(record.savedAt) || 0 }
                : null
            })
            .filter(
              (entry): entry is { score: number; time: number } =>
                entry !== null,
            )
            .sort((a, b) => b.time - a.time)[0]?.score
        const pipScore =
          latestAttempt?.pipScore ?? candidate.pip ?? latestSessionScore("pip")
        const tiuScore =
          latestAttempt?.tiuScoreScaled ??
          candidate.tiu ??
          latestSessionScore("tiu")
        const values = [
          pipScore,
          tiuScore,
          candidate.pbb,
          candidate.fitness,
          candidate.personality,
        ].filter(
          (value): value is number =>
            typeof value === "number" && Number.isFinite(value),
        )
        const score = values.length
          ? Number(
              (
                values.reduce((total, value) => total + value, 0) /
                values.length
              ).toFixed(1),
            )
          : null
        const completedStages = statuses.filter(
          (status) => status === "passed",
        ).length
        const hasResult =
          score !== null ||
          statuses.some(
            (status) => status === "review" || status === "failed",
          ) ||
          (candidate.documents ?? []).some(Boolean)
        return {
          candidate,
          statuses,
          score,
          scoreCount: values.length,
          completedStages,
          hasResult,
          pipScore,
          tiuScore,
        }
      })
      .sort((a, b) => {
        if (a.hasResult !== b.hasResult) return a.hasResult ? -1 : 1
        return (
          (b.score ?? -1) - (a.score ?? -1) ||
          b.completedStages - a.completedStages ||
          a.candidate.number.localeCompare(b.candidate.number)
        )
      })
  }, [candidates, catTryoutAttempts, sessions, records])

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 sm:space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-4 sm:p-5 text-white shadow-xs border border-slate-800/80 w-full min-w-0">
        {/* Subtle glowing ambient accents */}
        <div className="pointer-events-none absolute -top-12 -right-12 size-48 rounded-full bg-red-600/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 size-48 rounded-full bg-indigo-600/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between w-full min-w-0">
          <div className="min-w-0 flex-1">
            <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-2.5 py-0.5 text-3xs sm:text-2xs font-medium text-slate-300">
              <ShieldCheck className="size-3 text-emerald-400 shrink-0" />
              <span className="truncate">{activeCycle.name}</span>
              <span className="text-white/30">·</span>
              <span className="shrink-0">{activeCycle.level}</span>
              <span className="text-white/30">·</span>
              <span className="truncate">MA Mu'allimin</span>
            </div>
            <h1 className="mt-1.5 font-display text-lg sm:text-2xl font-bold tracking-tight text-white">
              Selamat datang,{" "}
              <span className="capitalize">
                {currentUser.name.split(" ")[0]}
              </span>
            </h1>
            <p className="mt-0.5 text-xs text-slate-300/90 leading-relaxed">
              Pantau progres latihan fisik dan hasil tes santri dari satu
              tempat.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onNavigateView("sessions")}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 hover:bg-white/15 active:scale-95 px-3 py-2 text-xs font-semibold text-white backdrop-blur-md transition-all duration-150 h-9 w-full sm:w-auto"
            >
              <CalendarDays className="size-3.5 shrink-0 text-slate-300" />
              <span className="truncate">Jadwal latihan</span>
            </button>
            <button
              type="button"
              onClick={onOpenAddCandidate}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-red-600/30 transition-all duration-150 h-9 w-full sm:w-auto"
            >
              <Plus className="size-3.5 shrink-0" />
              <span className="truncate">Tambah santri</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4 w-full min-w-0">
        <StatCard
          label="Santri Binaan"
          value={`${totalCount} Santri`}
          badges={[
            {
              text: `${activeInFieldCount} Aktif Lapangan`,
              tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
            },
            {
              text: `${absentCandidates.length} Izin / Absen`,
              tone: "bg-blue-50 text-blue-800 border-blue-200",
            },
          ]}
          detail="10 santri aktif berlatih rutin di lapangan. 3 santri tercatat berhalangan (izin/sakit/alpa) dan disiapkan jadwal susulan."
          icon={UsersRound}
          tone="bg-blue-50 text-blue-700"
          onClick={() => onNavigateView("candidates")}
        />
        <StatCard
          label="Uji Lari 12 Menit"
          value={`${runEvaluation.passedStandard} / ${runEvaluation.tested} Santri`}
          badges={[
            {
              text: "Standar ≥ 2.400 m",
              tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
            },
            {
              text: `Rerata ${
                runEvaluation.avgDist
                  ? runEvaluation.avgDist.toLocaleString("id-ID") + " m"
                  : "—"
              }`,
              tone: "bg-slate-100 text-slate-700 border-slate-200",
            },
          ]}
          progress={runEvaluation.passRate}
          detail="9 dari 10 santri yang diuji tuntas melampaui batas minimal 2.400m. 1 santri DNF dan 3 santri menunggu uji lari."
          icon={Activity}
          tone="bg-emerald-50 text-emerald-700"
          onClick={() => onNavigateView("stages")}
        />
        <StatCard
          label="Fokus Pembinaan"
          value="Kesamaptaan & PBB"
          badges={[
            {
              text: "Target Ideal 3.000 m",
              tone: "bg-indigo-50 text-indigo-800 border-indigo-200",
            },
            {
              text: "Samapta B & Aba-aba",
              tone: "bg-purple-50 text-purple-800 border-purple-200",
            },
          ]}
          detail="Prioritas peningkatan daya tahan lari menuju target 3.000m serta pemantapan aba-aba dan kekompakan langkah tegap PBB."
          icon={Target}
          tone="bg-indigo-50 text-indigo-700"
          onClick={() => onNavigateStage(5)}
        />
        <StatCard
          label="Prioritas Susulan"
          value={`${urgentFollowUpCandidates.length} Santri`}
          badges={[
            {
              text: `${runEvaluation.dnf} Tes Ulang DNF`,
              tone: "bg-rose-50 text-rose-800 border-rose-200",
            },
            {
              text: `${absentCandidates.length} Susulan Absen`,
              tone: "bg-amber-50 text-amber-800 border-amber-200",
            },
          ]}
          detail={
            urgentFollowUpCandidates.length > 0
              ? `${urgentFollowUpCandidates
                  .slice(0, 3)
                  .map((item) =>
                    item.candidate.name.split(" ").slice(0, 2).join(" "),
                  )
                  .join(", ")}${
                  urgentFollowUpCandidates.length > 3 ? " dll." : ""
                } perlu tindak lanjut sesi susulan/perbaikan.`
              : "Semua santri telah mengikuti sesi latihan fisik & materi."
          }
          icon={AlertTriangle}
          tone="bg-amber-50 text-amber-700"
          onClick={() => onNavigateView("sessions")}
        />
      </div>

      {/* Peta Kesiapan 8 Materi Latihan */}
      <StagePipeline onSelectStage={onNavigateStage} />

      {/* Dua Kartu Aksi Cepat: Kandidat Unggulan & Atensi Sesi Susulan */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 w-full min-w-0">
        <Card className="p-4 sm:p-6 flex flex-col justify-between border border-slate-200 shadow-xs min-w-0">
          <div>
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3.5">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200 mt-0.5">
                  <Trophy className="size-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    Peringkat kesiapan santri
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Rerata nilai dan progres singkat; rincian tiap tahap ada di
                    pemeringkatan lengkap
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 shrink-0">
                {topPerformers.length} santri
              </span>
            </div>

            <div className="mt-3.5 divide-y divide-slate-100">
              {topPerformers.map((entry, idx) => {
                const {
                  candidate: cand,
                  score,
                  scoreCount,
                  completedStages,
                } = entry
                return (
                  <button
                    key={cand.id}
                    type="button"
                    onClick={() => onSelectCandidate(cand.id)}
                    className="grid w-full gap-2.5 rounded-xl px-2 py-3 text-left transition hover:bg-slate-50 group"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-900 font-display text-xs font-bold text-white">
                        {idx + 1}
                      </div>
                      <CandidateAvatar
                        name={cand.name}
                        avatar={cand.avatar}
                        photoUrl={cand.photoUrl}
                        className="size-10 shrink-0 border border-slate-200 text-xs font-bold"
                        rounded="rounded-xl"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-900 group-hover:text-red-600 transition">
                          {cand.name}
                        </p>
                        <p className="text-2xs text-slate-500 truncate mt-0.5">
                          <span>
                            {score === null
                              ? "Belum ada nilai"
                              : `Rerata ${score.toFixed(1)}/100 (${scoreCount} nilai)`}
                          </span>
                          <span className="mx-1 text-slate-300">·</span>
                          <span>{completedStages}/8 tahap lulus</span>
                        </p>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-slate-400 group-hover:text-slate-600" />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => onNavigateView("ranking")}
              className="w-full flex items-center justify-between gap-1.5 rounded-xl bg-slate-50/90 hover:bg-red-50 border border-slate-200/80 hover:border-red-200/80 px-3 py-2 text-2xs sm:text-xs font-semibold text-slate-700 hover:text-red-700 transition-all duration-200 group active:scale-[0.99]"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <Trophy className="size-3.5 text-slate-400 group-hover:text-red-600 transition shrink-0" />
                <span className="font-bold truncate">
                  Pemeringkatan lengkap
                </span>
              </span>
              <span className="flex items-center gap-0.5 font-bold text-red-600 group-hover:text-red-700 shrink-0">
                <span>Detail</span>
                <ChevronRight className="size-3 group-hover:translate-x-0.5 transition shrink-0" />
              </span>
            </button>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 flex flex-col justify-between border border-slate-200 shadow-xs min-w-0">
          <div>
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3.5">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200 mt-0.5">
                  <AlertTriangle className="size-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    Prioritas sesi susulan &amp; perbaikan
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Santri berstatus DNF atau belum mengikuti sesi latihan
                    lapangan
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-800 shrink-0">
                {urgentFollowUpCandidates.length} Santri
              </span>
            </div>

            <div className="mt-2.5 divide-y divide-slate-100">
              {urgentFollowUpCandidates.map(
                ({ candidate: cand, statusLabel, statusTone, reason }) => {
                  return (
                    <div
                      key={cand.id}
                      onClick={() => onSelectCandidate(cand.id)}
                      className="flex items-center justify-between gap-3 py-2.5 px-2 rounded-xl hover:bg-slate-50 transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <CandidateAvatar
                          name={cand.name}
                          avatar={cand.avatar}
                          photoUrl={cand.photoUrl}
                          className="size-9.5 shrink-0 border border-slate-200 text-xs font-bold"
                          rounded="rounded-xl"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs sm:text-sm font-bold text-slate-900 group-hover:text-red-600 transition">
                            {cand.name}
                          </p>
                          <p className="mt-0.5 text-2xs text-slate-500 truncate">
                            {reason}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-3xs sm:text-2xs font-bold ${statusTone}`}
                        >
                          {statusLabel}
                        </span>
                        <ChevronRight className="size-4 text-slate-300 group-hover:text-slate-500 transition shrink-0" />
                      </div>
                    </div>
                  )
                },
              )}
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => onNavigateView("sessions")}
              className="w-full flex items-center justify-between gap-1.5 rounded-xl bg-slate-50/90 hover:bg-amber-50 border border-slate-200/80 hover:border-amber-200/80 px-3 py-2 text-2xs sm:text-xs font-semibold text-slate-700 hover:text-amber-800 transition-all duration-200 group active:scale-[0.99]"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <CalendarDays className="size-3.5 text-slate-400 group-hover:text-amber-600 transition shrink-0" />
                <span className="font-bold truncate">Jadwal sesi susulan</span>
              </span>
              <span className="flex items-center gap-0.5 font-bold text-amber-700 group-hover:text-amber-800 shrink-0">
                <span>Jadwal</span>
                <ChevronRight className="size-3 group-hover:translate-x-0.5 transition shrink-0" />
              </span>
            </button>
          </div>
        </Card>
      </div>

      {/* Tabel Kandidat Binaan Terpadu */}
      <CandidateTable
        compact
        onSelectCandidate={onSelectCandidate}
        onViewAll={() => onNavigateView("candidates")}
      />
    </div>
  )
}

function CandidatesView({
  onOpenAddCandidate,
  onSelectCandidate,
}: {
  onOpenAddCandidate: () => void
  onSelectCandidate: (candidateId: string) => void
}) {
  const { candidates, importCandidates, activeCycle, showToast } = useApp()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const totalCount = candidates.length
  const posturPassCount = candidates.filter(
    (c) => (c.heightCm ?? 0) >= 170,
  ).length
  const completeProfileCount = candidates.filter(
    (c) => (c.documents ?? []).filter(Boolean).length === 6,
  ).length
  const posturPassPct =
    totalCount > 0 ? Math.round((posturPassCount / totalCount) * 100) : 0
  const completeProfilePct =
    totalCount > 0 ? Math.round((completeProfileCount / totalCount) * 100) : 0
  const pendingDocsCount = totalCount - completeProfileCount

  function handleCsvFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? "")
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
      if (lines.length < 2) {
        showToast("File CSV kosong atau tidak memiliki baris data.", "danger")
        return
      }
      const dataLines = lines.slice(1)
      const imported: Candidate[] = dataLines.map((line, idx) => {
        const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim())
        const name = cols[0] || `Kandidat Impor ${idx + 1}`
        const gender = "Putra" as const
        const birthDate = /^\d{4}-\d{2}-\d{2}$/.test(cols[2] ?? "")
          ? cols[2]
          : "2009-10-10"
        const school = cols[3] || "SMA Negeri Yogyakarta"
        const nik = cols[4] || undefined
        const heightCm = Number(cols[5]) || 170
        const weightKg = Number(cols[6]) || 60
        const num = `KAB-026-${String(candidates.length + idx + 1).padStart(3, "0")}`
        const initials = name
          .split(/\s+/)
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
        return {
          id: `cand-imp-${Date.now()}-${idx}`,
          number: num,
          nik,
          name,
          school,
          gender,
          birthDate,
          heightCm,
          weightKg,
          avatar: initials || "PK",
          stage: 1,
          stageStatuses: [
            "active",
            "locked",
            "locked",
            "locked",
            "locked",
            "locked",
            "locked",
            "locked",
          ],
          pip: null,
          tiu: null,
          pbb: null,
          fitness: null,
          personality: null,
          documents: [true, true, true, true, false, false],
          cycleId: activeCycle.id,
          updatedAt: "Baru diimpor",
        }
      })
      importCandidates(imported)
      e.target.value = ""
    }
    reader.readAsText(file)
  }

  return (
    <div className="grid gap-4 sm:gap-5">
      {/* Wadah Header Kandidat Terstruktur & Rapi */}
      <Card className="border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid size-8 sm:size-9 shrink-0 place-items-center rounded-xl bg-red-100 text-red-600 shadow-2xs">
                <UsersRound className="size-4.5" />
              </span>
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-950">
                Kandidat
              </h1>
              <span className="inline-flex items-center rounded-lg bg-red-50 border border-red-200/80 px-2.5 py-0.5 text-xs font-bold text-red-700">
                {activeCycle.name} · {activeCycle.level}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 max-w-xl leading-relaxed">
              Kelola profil, status tahap, dan kelengkapan berkas kandidat.
            </p>
          </div>

          <div className="shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCsvFileChange}
            />
            {/* Tombol Aksi Utama: Tambah Kandidat */}
            <Button
              size="sm"
              onClick={onOpenAddCandidate}
              className="justify-center text-xs w-full sm:w-auto shadow-xs font-bold whitespace-nowrap"
            >
              <UserRoundCheck className="size-3.5" />
              <span>Tambah kandidat</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* 3 Kotak Metrik 1 Baris (Responsif & Modern) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
        {/* Card 1: Total Santri Putra */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl sm:rounded-2xl border border-blue-200/80 bg-gradient-to-br from-white via-blue-50/25 to-indigo-50/40 p-2.5 sm:p-4 shadow-2xs hover:shadow-xs transition duration-200">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="grid size-7 sm:size-9 place-items-center rounded-lg sm:rounded-xl bg-blue-100/90 text-blue-700 shadow-2xs">
                <UsersRound className="size-3.5 sm:size-4.5" />
              </span>
              <span className="inline-flex items-center rounded-md bg-blue-100/80 px-1.5 py-0.5 text-3xs sm:text-xs font-bold text-blue-700">
                100%
              </span>
            </div>
            <div className="mt-2 sm:mt-3">
              <p className="text-3xs sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate">
                Total Santri
              </p>
              <p className="font-display text-lg sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-950">
                {totalCount}
              </p>
            </div>
          </div>
          <div className="mt-2 sm:mt-3 pt-1.5 sm:pt-2 border-t border-blue-100/70">
            <div className="flex items-center justify-between text-3xs sm:text-xs text-slate-500">
              <span className="truncate">Kategori</span>
              <span className="font-semibold text-blue-700 shrink-0">
                Putra
              </span>
            </div>
            <div className="mt-1 h-1 sm:h-1.5 w-full rounded-full bg-blue-100 overflow-hidden">
              <div className="h-full rounded-full bg-blue-600 w-full" />
            </div>
          </div>
        </div>

        {/* Card 2: Standar Postur */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl sm:rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/25 to-teal-50/40 p-2.5 sm:p-4 shadow-2xs hover:shadow-xs transition duration-200">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="grid size-7 sm:size-9 place-items-center rounded-lg sm:rounded-xl bg-emerald-100/90 text-emerald-700 shadow-2xs">
                <UserRoundCheck className="size-3.5 sm:size-4.5" />
              </span>
              <span className="inline-flex items-center rounded-md bg-emerald-100/80 px-1.5 py-0.5 text-3xs sm:text-xs font-bold text-emerald-700">
                {posturPassPct}%
              </span>
            </div>
            <div className="mt-2 sm:mt-3">
              <p className="text-3xs sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate">
                Target Postur
              </p>
              <p className="font-display text-lg sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-950">
                {posturPassCount}
              </p>
            </div>
          </div>
          <div className="mt-2 sm:mt-3 pt-1.5 sm:pt-2 border-t border-emerald-100/70">
            <div className="flex items-center justify-between text-3xs sm:text-xs text-slate-500">
              <span className="truncate">≥ 170 cm</span>
              <span className="font-semibold text-emerald-700 shrink-0">
                {posturPassCount}/{totalCount}
              </span>
            </div>
            <div className="mt-1 h-1 sm:h-1.5 w-full rounded-full bg-emerald-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                style={{ width: `${posturPassPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Berkas 6/6 Lengkap */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl sm:rounded-2xl border border-amber-200/80 bg-gradient-to-br from-white via-amber-50/25 to-orange-50/40 p-2.5 sm:p-4 shadow-2xs hover:shadow-xs transition duration-200">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="grid size-7 sm:size-9 place-items-center rounded-lg sm:rounded-xl bg-amber-100/90 text-amber-700 shadow-2xs">
                <FileCheck2 className="size-3.5 sm:size-4.5" />
              </span>
              <span className="inline-flex items-center rounded-md bg-amber-100/80 px-1.5 py-0.5 text-3xs sm:text-xs font-bold text-amber-800">
                {completeProfilePct}%
              </span>
            </div>
            <div className="mt-2 sm:mt-3">
              <p className="text-3xs sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate">
                Berkas 6/6
              </p>
              <p className="font-display text-lg sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-950">
                {completeProfileCount}
              </p>
            </div>
          </div>
          <div className="mt-2 sm:mt-3 pt-1.5 sm:pt-2 border-t border-amber-100/70">
            <div className="flex items-center justify-between text-3xs sm:text-xs text-slate-500">
              <span className="truncate">
                {pendingDocsCount > 0 ? "Kurang" : "Lengkap"}
              </span>
              <span className="font-semibold text-amber-800 shrink-0">
                {pendingDocsCount > 0 ? `${pendingDocsCount} santri` : "Semua"}
              </span>
            </div>
            <div className="mt-1 h-1 sm:h-1.5 w-full rounded-full bg-amber-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                style={{ width: `${completeProfilePct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <CandidateTable onSelectCandidate={onSelectCandidate} />
    </div>
  )
}

const stageWorkspace = [
  {
    description: "Validasi usia, biodata, dan enam berkas pokok kandidat.",
    owner: "Tim Administrasi",
    rule: "Seluruh berkas wajib valid sebelum CAT dibuka.",
    checklist: [
      "Validasi usia per 17 Agustus",
      "Periksa 16 digit NIK",
      "Verifikasi enam berkas",
      "Catat akun media sosial",
    ],
    icon: FileCheck2,
  },
  {
    description: "CAT Pembinaan Ideologi Pancasila dan Wawasan Kebangsaan.",
    owner: "Panitia CAT",
    rule: "50 soal · 2 poin benar · passing grade ≥70.",
    checklist: [
      "Pastikan kartu ujian aktif",
      "Pantau sesi dan timer",
      "Finalisasi jawaban",
      "Terbitkan hasil dan pembahasan",
    ],
    icon: BookOpenCheck,
  },
  {
    description: "CAT Intelegensia Umum dengan sebelas submateri.",
    owner: "Panitia CAT",
    rule: "50 soal · durasi 60 menit · passing grade ≥70.",
    checklist: [
      "Cek komposisi blueprint",
      "Pantau sesi ujian",
      "Tinjau anomali pengerjaan",
      "Finalisasi hasil evaluasi materi",
    ],
    icon: Target,
  },
  {
    description: "Pemeriksaan vital, mata, gigi, THT, dan anamnesis.",
    owner: "Tim Medis",
    rule: "Lebih dari 5 jawaban ya atau kondisi kritis memerlukan pembinaan medis khusus.",
    checklist: [
      "Input tanda vital",
      "Selesaikan 21 anamnesis",
      "Periksa kondisi kritis",
      "Finalisasi oleh petugas medis",
    ],
    icon: Stethoscope,
  },
  {
    description: "Antropometri, postur, kaki, dan dokumentasi Parade.",
    owner: "Panitia Parade",
    rule: "Tinggi, BMI, celah kaki, flat foot, dan simetri ditinjau.",
    checklist: [
      "Ukur tinggi dan berat",
      "Hitung BMI",
      "Periksa celah O/X dan telapak",
      "Unggah foto Parade",
    ],
    icon: UserRound,
  },
  {
    description: "Penilaian PBB statis, dinamis, dan vokal komando.",
    owner: "Juri PBB",
    rule: "Nilai akhir PBB berkontribusi 30% pada ranking.",
    checklist: [
      "Nilai PBB statis",
      "Nilai PBB dinamis",
      "Nilai vokal komando",
      "Finalisasi seluruh juri",
    ],
    icon: ClipboardCheck,
  },
  {
    description: "Lari 12 menit, push-up, sit-up, back-up, dan shuttle run.",
    owner: "Juri Samapta",
    rule: "Input mentah dikonversi melalui tabel standar berversi.",
    checklist: [
      "Input lima hasil tes",
      "Validasi lap dan sisa meter",
      "Tinjau skor konversi",
      "Finalisasi seluruh juri",
    ],
    icon: Activity,
  },
  {
    description:
      "Wawancara STAR, integritas, psikologi, bakat, dan audit digital.",
    owner: "Juri Kepribadian",
    rule: "Kepribadian berkontribusi 40% dan menjadi bobot tertinggi.",
    checklist: [
      "Selesaikan rubric STAR",
      "Audit medsos manual",
      "Catat bakat dan minat",
      "Finalisasi seluruh juri",
    ],
    icon: GraduationCap,
  },
]

function getCandidateStageMetric(cand: Candidate, stageIdx: number) {
  if (stageIdx === 0) {
    const docs = (cand.documents ?? []).filter(Boolean).length
    return {
      primary: `${docs}/6 Berkas`,
      secondary: docs === 6 ? "Lengkap & Valid" : `${6 - docs} berkas kurang`,
      badge:
        docs === 6
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-amber-50 text-amber-700 border-amber-200",
    }
  }
  if (stageIdx === 1) {
    return {
      primary: cand.pip !== null ? `${cand.pip} Poin` : "Belum Tes",
      secondary:
        cand.pip !== null
          ? cand.pip >= 70
            ? "Memenuhi PG (≥70)"
            : "Di bawah PG (<70)"
          : "Passing Grade 70",
      badge:
        cand.pip !== null
          ? cand.pip >= 70
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-red-50 text-red-700 border-red-200"
          : "bg-slate-100 text-slate-600 border-slate-200",
    }
  }
  if (stageIdx === 2) {
    return {
      primary: cand.tiu !== null ? `${cand.tiu} Poin` : "Belum Tes",
      secondary:
        cand.tiu !== null
          ? cand.tiu >= 70
            ? "Memenuhi PG (≥70)"
            : "Di bawah PG (<70)"
          : "Passing Grade 70",
      badge:
        cand.tiu !== null
          ? cand.tiu >= 70
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-red-50 text-red-700 border-red-200"
          : "bg-slate-100 text-slate-600 border-slate-200",
    }
  }
  if (stageIdx === 3) {
    const isReady = cand.stageStatuses[3] === "passed"
    return {
      primary: isReady
        ? "Memenuhi Standar"
        : cand.stageStatuses[3] === "review"
          ? "Perlu Konsul Medis"
          : "Evaluasi Medis",
      secondary: "Tensi & 21 Anamnesis",
      badge: isReady
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-amber-50 text-amber-700 border-amber-200",
    }
  }
  if (stageIdx === 4) {
    const candBmi =
      cand.heightCm && cand.weightKg ? bmi(cand.weightKg, cand.heightCm) : null
    return {
      primary: cand.heightCm
        ? `${cand.heightCm} cm / ${cand.weightKg ?? "—"} kg`
        : "Belum Ukur",
      secondary: candBmi
        ? `BMI ${candBmi.value} (${candBmi.category})`
        : "Antropometri Postur",
      badge:
        candBmi?.status === "ideal"
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-slate-100 text-slate-700 border-slate-200",
    }
  }
  if (stageIdx === 5) {
    return {
      primary: cand.pbb !== null ? `Nilai ${cand.pbb}` : "Belum Dinilai",
      secondary: "Statis, Dinamis & Komando (Bobot 30%)",
      badge:
        cand.pbb !== null && cand.pbb >= 80
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-blue-50 text-blue-700 border-blue-200",
    }
  }
  if (stageIdx === 6) {
    const runMetric = (cand.physicalMetrics ?? []).find((m) =>
      m.label.toLowerCase().includes("lari"),
    )
    return {
      primary:
        cand.fitness !== null
          ? `Skor ${cand.fitness}`
          : runMetric?.current
            ? `Lari ${runMetric.current}`
            : "Belum Dinilai",
      secondary: runMetric
        ? `Target: ${runMetric.target}`
        : "5 Parameter Kesamaptaan",
      badge:
        cand.fitness !== null && cand.fitness >= 75
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-amber-50 text-amber-700 border-amber-200",
    }
  }
  if (stageIdx === 7) {
    return {
      primary:
        cand.personality !== null
          ? `Nilai ${cand.personality}`
          : "Belum Wawancara",
      secondary: "STAR, Integritas & Bakat (Bobot 40%)",
      badge:
        cand.personality !== null && cand.personality >= 80
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-slate-100 text-slate-600 border-slate-200",
    }
  }
  return {
    primary: "—",
    secondary: "",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
  }
}

function StagesView({
  activeStage,
  setActiveStage,
  onSelectCandidate,
  onNavigateSessions,
}: {
  activeStage: number
  setActiveStage: (index: number) => void
  onSelectCandidate: (candidateId: string) => void
  onNavigateSessions: () => void
}) {
  const {
    candidates,
    updateCandidateStage,
    stageChecklists,
    toggleStageChecklist,
  } = useApp()
  const [viewMode, setViewMode] = useState<"stage" | "matrix">("stage")
  const [statusFilter, setStatusFilter] = useState<StageStatus | "all">("all")
  const [searchFilter, setSearchFilter] = useState("")

  const stage = selectionStages[activeStage]
  const workspace = stageWorkspace[activeStage]
  const Icon = workspace.icon

  const stageCandidates = candidates
  const visibleCandidates = stageCandidates.filter((c) => {
    const matchesStatus =
      statusFilter === "all" || c.stageStatuses[activeStage] === statusFilter
    const q = searchFilter.trim().toLowerCase()
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.number.toLowerCase().includes(q) ||
      c.school.toLowerCase().includes(q)
    return matchesStatus && matchesSearch
  })

  const passed = stageCandidates.filter(
    (candidate) => candidate.stageStatuses[activeStage] === "passed",
  ).length
  const failedCount = stageCandidates.filter(
    (candidate) => candidate.stageStatuses[activeStage] === "failed",
  ).length
  const attention = stageCandidates.filter((candidate) =>
    ["active", "review"].includes(candidate.stageStatuses[activeStage]),
  ).length

  const checklistState = stageChecklists[activeStage] ?? [
    false,
    false,
    false,
    false,
  ]
  const completedChecks = checklistState.filter(Boolean).length

  return (
    <div className="grid gap-4 sm:gap-5">
      {/* Header Halaman */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-950">
              Kesiapan Tahapan Seleksi
            </h1>
            <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/10">
              <Target className="size-3 text-red-600" />
              Evaluasi Per Materi
            </span>
            <span className="hidden sm:inline text-xs text-slate-400">·</span>
            <span className="hidden sm:inline text-xs font-medium text-slate-500">
              8 Tahap Standar BPIP
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 max-w-2xl">
            Pantau target kelayakan materi, evaluasi kesiapan 13 santri binaan,
            dan checklist tugas pembina.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Switcher Mode: Fokus Materi vs Matriks 8 Tahap */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("stage")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "stage"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal className="size-3.5" />
              <span>Fokus Materi</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("matrix")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "matrix"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <LayoutDashboard className="size-3.5" />
              <span>Matriks 8 Tahap</span>
            </button>
          </div>

          <Button variant="secondary" onClick={onNavigateSessions}>
            <ClipboardCheck className="size-4 text-red-600" />
            <span>Input Sesi Latihan</span>
          </Button>
        </div>
      </div>

      {/* Stepper 8 Tahap Seleksi - Responsif Tanpa Scrollbar Paksa */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {selectionStages.map((item, index) => {
          const isCurrent = activeStage === index && viewMode === "stage"
          const readyCount = candidates.filter(
            (c) => c.stageStatuses[index] === "passed",
          ).length
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setActiveStage(index)
                setViewMode("stage")
              }}
              className={`group relative flex flex-col justify-between rounded-xl border p-2.5 text-left transition ${
                isCurrent
                  ? "border-red-600 bg-red-50/70 ring-2 ring-red-100 shadow-xs"
                  : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/70"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`grid size-6 place-items-center rounded-lg text-2xs font-bold ${
                    isCurrent
                      ? "bg-red-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 group-hover:bg-slate-200"
                  }`}
                >
                  {index + 1}
                </span>
                <span
                  className={`text-3xs font-bold px-1.5 py-0.5 rounded-md tabular-nums ${
                    readyCount === candidates.length
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {readyCount}/{candidates.length} Siap
                </span>
              </div>
              <p
                className={`mt-2 text-xs font-bold truncate ${
                  isCurrent ? "text-red-950" : "text-slate-800"
                }`}
              >
                {item.label}
              </p>
              <p className="text-3xs text-slate-400 truncate mt-0.5">
                {item.phase === 1 ? "Kualifikasi Dasar" : "Uji Lapangan"}
              </p>
            </button>
          )
        })}
      </div>

      {viewMode === "stage" ? (
        <>
          {/* Kartu Ringkasan Materi & SOP Checklist */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Box Target & Standar Materi */}
            <Card className="lg:col-span-2 p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-red-600 text-white shadow-xs">
                      <Icon className="size-6" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-red-600">
                          Tahap {stage.id} ·{" "}
                          {stage.phase === 1
                            ? "Kualifikasi Dasar"
                            : "Uji Lapangan"}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-3xs font-semibold text-slate-600">
                          PJ: {workspace.owner}
                        </span>
                      </div>
                      <h2 className="mt-1 font-display text-xl sm:text-2xl font-bold text-slate-900">
                        {stage.label}
                      </h2>
                      <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {workspace.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Aturan / Passing Grade Mutlak */}
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs sm:text-sm text-amber-900 font-medium">
                  <ShieldCheck className="size-4 text-amber-700 shrink-0 mt-0.5" />
                  <p>
                    <strong className="font-bold">Standar Mutlak: </strong>
                    {workspace.rule}
                  </p>
                </div>
              </div>

              {/* Stat Counters Kesiapan Santri */}
              <div className="mt-4 grid grid-cols-3 gap-2.5 pt-4 border-t border-slate-100">
                <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-2.5 text-center">
                  <p className="text-2xs font-bold text-emerald-800 uppercase">
                    Siap Standar
                  </p>
                  <p className="font-display text-lg sm:text-xl font-bold text-emerald-900 mt-0.5 tabular-nums">
                    {passed}{" "}
                    <span className="text-xs font-normal text-emerald-700">
                      santri
                    </span>
                  </p>
                </div>
                <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-2.5 text-center">
                  <p className="text-2xs font-bold text-blue-800 uppercase">
                    Sedang Dilatih
                  </p>
                  <p className="font-display text-lg sm:text-xl font-bold text-blue-900 mt-0.5 tabular-nums">
                    {attention}{" "}
                    <span className="text-xs font-normal text-blue-700">
                      santri
                    </span>
                  </p>
                </div>
                <div className="rounded-xl bg-red-50/60 border border-red-100 p-2.5 text-center">
                  <p className="text-2xs font-bold text-red-800 uppercase">
                    Perlu Remedial
                  </p>
                  <p className="font-display text-lg sm:text-xl font-bold text-red-900 mt-0.5 tabular-nums">
                    {failedCount}{" "}
                    <span className="text-xs font-normal text-red-700">
                      santri
                    </span>
                  </p>
                </div>
              </div>
            </Card>

            {/* Checklist SOP Pembina */}
            <Card className="p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-sm font-bold text-slate-900">
                      SOP &amp; Checklist Pembina
                    </h3>
                    <p className="text-2xs text-slate-500">
                      Verifikasi teknis materi tahap ini
                    </p>
                  </div>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 tabular-nums">
                    {completedChecks}/{workspace.checklist.length}
                  </span>
                </div>

                <div className="mt-3.5 space-y-2">
                  {workspace.checklist.map((item, index) => (
                    <label
                      key={item}
                      className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-100 p-2.5 text-xs transition hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(checklistState[index])}
                        onChange={() =>
                          toggleStageChecklist(activeStage, index)
                        }
                        className="mt-0.5 size-3.5 rounded border-slate-300 accent-red-600"
                      />
                      <span
                        className={`font-medium leading-snug ${
                          checklistState[index]
                            ? "text-slate-400 line-through"
                            : "text-slate-700"
                        }`}
                      >
                        {item}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 text-2xs text-slate-400">
                Pembaruan checklist tersimpan otomatis secara real-time.
              </div>
            </Card>
          </div>

          {/* Tabel Evaluasi Kesiapan Santri */}
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 bg-slate-50/50">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Evaluasi Kesiapan Santri — {stage.label}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Menampilkan {visibleCandidates.length} dari{" "}
                  {candidates.length} santri binaan MA Mu'allimin
                </p>
              </div>

              {/* Kontrol Filter & Pencarian */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Cari santri..."
                  className="h-8 w-36 sm:w-44 rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-slate-400"
                />
                <div className="flex flex-wrap gap-1">
                  {([
                    ["all", `Semua (${stageCandidates.length})`],
                    ["passed", `Siap Standar (${passed})`],
                    ["review", `Penguatan (${attention})`],
                    ["failed", `Remedial (${failedCount})`],
                  ] as const).map(([st, lbl]) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`h-8 rounded-lg px-2.5 text-xs font-semibold transition ${
                        statusFilter === st
                          ? "bg-slate-900 text-white shadow-2xs"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* List Tabel Santri */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/70 text-2xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                    <th className="px-5 py-3">Santri</th>
                    <th className="px-4 py-3">Capaian / Data Riil</th>
                    <th className="px-4 py-3">Status Kesiapan</th>
                    <th className="px-5 py-3 text-right">
                      Aksi Evaluasi 1-Klik
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleCandidates.length ? (
                    visibleCandidates.map((candidate) => {
                      const status = candidate.stageStatuses[activeStage]
                      const metric = getCandidateStageMetric(
                        candidate,
                        activeStage,
                      )
                      return (
                        <tr
                          key={candidate.id}
                          className="hover:bg-slate-50/70 transition"
                        >
                          <td className="px-5 py-3.5">
                            <button
                              type="button"
                              onClick={() => onSelectCandidate(candidate.id)}
                              className="flex items-center gap-3 text-left group"
                            >
                              <CandidateAvatar
                                name={candidate.name}
                                avatar={candidate.avatar}
                                photoUrl={candidate.photoUrl}
                                className="size-9 text-xs font-bold shrink-0 border border-slate-200 rounded-lg shadow-2xs"
                              />
                              <div>
                                <p className="font-bold text-slate-900 group-hover:text-red-600 transition">
                                  {candidate.name}
                                </p>
                                <p className="text-2xs text-slate-500">
                                  {candidate.number} · {candidate.gender}
                                </p>
                              </div>
                            </button>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-md font-bold text-xs border ${metric.badge}`}
                              >
                                {metric.primary}
                              </span>
                              <span className="text-2xs text-slate-500">
                                {metric.secondary}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusBadge status={status} />
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  updateCandidateStage(
                                    candidate.id,
                                    activeStage,
                                    "passed",
                                  )
                                }
                                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition border ${
                                  status === "passed"
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                }`}
                                title="Tandai santri siap standar"
                              >
                                Siap
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateCandidateStage(
                                    candidate.id,
                                    activeStage,
                                    "review",
                                  )
                                }
                                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition border ${
                                  status === "review"
                                    ? "bg-amber-500 text-white border-amber-500 shadow-2xs"
                                    : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                                }`}
                                title="Tandai butuh penguatan"
                              >
                                Penguatan
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateCandidateStage(
                                    candidate.id,
                                    activeStage,
                                    "failed",
                                  )
                                }
                                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition border ${
                                  status === "failed"
                                    ? "bg-red-600 text-white border-red-600 shadow-2xs"
                                    : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                }`}
                                title="Tandai butuh remedial"
                              >
                                Remedial
                              </button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="!px-1.5 text-slate-400 hover:text-slate-700"
                                onClick={() => onSelectCandidate(candidate.id)}
                                title="Buka profil lengkap"
                              >
                                <ChevronRight className="size-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-10 text-center text-sm text-slate-500"
                      >
                        Tidak ada santri yang sesuai filter pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        /* Matriks Peta Kesiapan 8 Tahap Seleksi */
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Matriks Peta Kesiapan 13 Santri (8 Tahap Seleksi)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pantau seluruh santri lintas 8 materi. Klik kolom atau santri
                untuk beralih ke materi tersebut.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <span className="grid size-4 place-items-center rounded bg-emerald-100 text-emerald-800 font-bold text-3xs">
                  ✓
                </span>
                Siap
              </span>
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <span className="grid size-4 place-items-center rounded bg-amber-100 text-amber-800 font-bold text-3xs">
                  !
                </span>
                Penguatan
              </span>
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <span className="grid size-4 place-items-center rounded bg-red-100 text-red-800 font-bold text-3xs">
                  ✕
                </span>
                Remedial
              </span>
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <span className="grid size-4 place-items-center rounded bg-slate-100 text-slate-500 font-bold text-3xs">
                  ⏳
                </span>
                Berjalan
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 text-2xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <th className="px-4 py-3 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                    Santri
                  </th>
                  {selectionStages.map((s, idx) => (
                    <th
                      key={s.key}
                      onClick={() => {
                        setActiveStage(idx)
                        setViewMode("stage")
                      }}
                      className="px-2 py-3 text-center cursor-pointer hover:bg-red-50 hover:text-red-700 transition"
                      title={`Klik untuk buka Tahap ${idx + 1}: ${s.label}`}
                    >
                      <div className="font-bold text-slate-900">T{idx + 1}</div>
                      <div className="font-normal text-3xs text-slate-500 truncate max-w-20 mx-auto">
                        {s.shortLabel}
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center">Ringkasan Kesiapan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidates.map((cand) => {
                  const readyCount = cand.stageStatuses.filter(
                    (s) => s === "passed",
                  ).length
                  return (
                    <tr
                      key={cand.id}
                      className="hover:bg-slate-50/60 transition"
                    >
                      <td className="px-4 py-3 font-bold text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-100">
                        <button
                          type="button"
                          onClick={() => onSelectCandidate(cand.id)}
                          className="flex items-center gap-2 hover:text-red-600 text-left truncate max-w-48"
                        >
                          <span className="grid size-6 place-items-center rounded bg-slate-900 text-3xs font-bold text-white shrink-0">
                            {cand.avatar}
                          </span>
                          <span className="truncate">{cand.name}</span>
                        </button>
                      </td>
                      {selectionStages.map((s, idx) => {
                        const st = cand.stageStatuses[idx]
                        const isPassed = st === "passed"
                        const isReview = st === "review"
                        const isFailed = st === "failed"
                        return (
                          <td
                            key={s.key}
                            onClick={() => {
                              setActiveStage(idx)
                              setViewMode("stage")
                            }}
                            className="px-2 py-2.5 text-center cursor-pointer hover:bg-slate-100/70"
                            title={`${cand.name} · Tahap ${idx + 1} (${s.label}): ${stageLabel(st)}`}
                          >
                            <span
                              className={`inline-grid size-6 place-items-center rounded-md text-xs font-bold ${
                                isPassed
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isReview
                                    ? "bg-amber-100 text-amber-800"
                                    : isFailed
                                      ? "bg-red-100 text-red-800"
                                      : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              {isPassed
                                ? "✓"
                                : isReview
                                  ? "!"
                                  : isFailed
                                    ? "✕"
                                    : "⏳"}
                            </span>
                          </td>
                        )
                      })}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                            readyCount >= 6
                              ? "bg-emerald-100 text-emerald-800"
                              : readyCount >= 4
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {readyCount} / 8 Tahap Siap
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

function ProgressView({
  onSelectCandidate,
}: {
  onSelectCandidate: (candidateId: string) => void
}) {
  const {
    candidates,
    activeCycle,
    updateCandidate,
    catTryoutAttempts,
    sessions,
    records,
  } = useApp()
  const [selectedId, setSelectedId] = useState("")
  const [isEditingSamapta, setIsEditingSamapta] = useState(false)
  const [samaptaForm, setSamaptaForm] = useState<{
    run: string
    pushup: string
    situp: string
    backup: string
    shuttle: string
  }>({
    run: "",
    pushup: "",
    situp: "",
    backup: "",
    shuttle: "",
  })

  if (candidates.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-slate-500">
        Belum ada kandidat pada periode ini.
      </Card>
    )
  }

  const candidate = candidates.find((item) => item.id === selectedId) ?? null

  const currentIndex = candidate
    ? candidates.findIndex((c) => c.id === candidate.id)
    : -1

  const handlePrev = () => {
    if (!candidate) return
    if (currentIndex > 0) {
      setSelectedId(candidates[currentIndex - 1].id)
    } else {
      setSelectedId(candidates[candidates.length - 1].id)
    }
  }

  const handleNext = () => {
    if (!candidate) {
      if (candidates.length > 0) setSelectedId(candidates[0].id)
      return
    }
    if (currentIndex >= 0 && currentIndex < candidates.length - 1) {
      setSelectedId(candidates[currentIndex + 1].id)
    } else {
      setSelectedId(candidates[0].id)
    }
  }

  const docsValidCount = (candidate?.documents ?? []).filter(Boolean).length
  const docsPercent = Math.round((docsValidCount / 6) * 100)

  const existingMetrics = candidate?.physicalMetrics ?? []

  const parseMetricNum = (str: string | undefined): number | null => {
    if (!str) return null
    if (str.trim().toUpperCase() === "DNF") return 0
    const cleaned = str
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^\d.]/g, "")
    const val = parseFloat(cleaned)
    return isNaN(val) ? null : val
  }

  const findMetric = (term: string) => {
    return existingMetrics.find(
      (m) =>
        m.label.toLowerCase().includes(term.toLowerCase()) &&
        m.current &&
        m.current !== "Belum dicatat" &&
        m.current !== "Belum diuji" &&
        m.current !== "—",
    )
  }

  const runItem = findMetric("lari")
  const pushupItem = findMetric("push")
  const situpItem = findMetric("sit")
  const backupItem = findMetric("back")
  const shuttleItem = findMetric("shuttle")

  const parsedRun = parseMetricNum(runItem?.current)
  // Jaminan proteksi: jika metrik lari lokal sempat tercemar nilai interval (< 2000m),
  // pulihkan ke hasil tes lari 12 menit resmi (misal 2.880m pada sesi Mapping Lari)
  let effectiveRunItem = runItem
  let runVal = parsedRun
  if (parsedRun !== null && parsedRun < 2000) {
    const officialSession = sessions.find(
      (s) =>
        s.type === "fitness" &&
        !s.title.toLowerCase().includes("interval") &&
        !s.title.toLowerCase().includes("drill"),
    )
    let dist: number | null = null
    if (officialSession) {
      const offRec = records[`${officialSession.id}:${candidate?.id}`]
      if (
        offRec?.metrics?.distance &&
        !offRec.metrics.runMode?.includes("interval")
      ) {
        const parsed = parseFloat(offRec.metrics.distance)
        if (parsed >= 2000) dist = parsed
      }
    }
    if (!dist) {
      const seeded = initialCandidates.find(
        (sc) => sc.id === candidate?.id || sc.number === candidate?.number,
      )
      const seededRun = seeded?.physicalMetrics?.find((m) =>
        m.label.toLowerCase().includes("lari"),
      )
      if (seededRun) {
        const parsed = parseFloat(
          seededRun.current.replace(/\./g, "").replace(/[^\d.]/g, ""),
        )
        if (parsed >= 2000) dist = parsed
      }
    }
    if (dist && dist >= 2000) {
      runVal = dist
      effectiveRunItem = {
        label: "Lari 12 menit",
        current: `${dist.toLocaleString("id-ID")} m`,
        target: "3.000 m",
        percent: Math.min(100, Math.round((dist / 3000) * 100)),
      }
    }
  }

  const pushVal = parseMetricNum(pushupItem?.current)
  const sitVal = parseMetricNum(situpItem?.current)
  const backVal = parseMetricNum(backupItem?.current)
  const shuttleVal = parseMetricNum(shuttleItem?.current)

  const rawCandidateFitness = candidate?.fitness ?? null
  const effectiveCandidateFitness =
    rawCandidateFitness !== null && rawCandidateFitness > 20
      ? rawCandidateFitness
      : runVal !== null
        ? fitnessScore("run", runVal)
        : rawCandidateFitness

  const handleOpenSamaptaModal = () => {
    if (!candidate) return
    setSamaptaForm({
      run: runVal !== null ? String(runVal) : "",
      pushup: pushVal !== null ? String(pushVal) : "",
      situp: sitVal !== null ? String(sitVal) : "",
      backup: backVal !== null ? String(backVal) : "",
      shuttle: shuttleVal !== null ? String(shuttleVal) : "",
    })
    setIsEditingSamapta(true)
  }

  const handleSaveSamapta = () => {
    const runTarget = 3000
    const pushTarget = 45
    const sitTarget = 40
    const backTarget = 50
    const shuttleTarget = 15.4

    const fRun =
      samaptaForm.run.trim() !== "" ? parseFloat(samaptaForm.run) : null
    const fPush =
      samaptaForm.pushup.trim() !== "" ? parseFloat(samaptaForm.pushup) : null
    const fSit =
      samaptaForm.situp.trim() !== "" ? parseFloat(samaptaForm.situp) : null
    const fBack =
      samaptaForm.backup.trim() !== "" ? parseFloat(samaptaForm.backup) : null
    const fShuttle =
      samaptaForm.shuttle.trim() !== ""
        ? parseFloat(samaptaForm.shuttle.replace(",", "."))
        : null

    const testedScores: number[] = []
    const newMetrics = []

    if (fRun !== null && !isNaN(fRun)) {
      testedScores.push(fitnessScore("run", fRun))
      newMetrics.push({
        label: "Lari 12 menit",
        current: `${fRun.toLocaleString("id-ID")} m`,
        target: `${runTarget.toLocaleString("id-ID")} m`,
        percent: Math.min(100, Math.round((fRun / runTarget) * 100)),
      })
    }
    if (fPush !== null && !isNaN(fPush)) {
      testedScores.push(fitnessScore("pushup", fPush))
      newMetrics.push({
        label: "Push-up (1 Menit)",
        current: `${fPush} kali`,
        target: `${pushTarget} kali`,
        percent: Math.min(100, Math.round((fPush / pushTarget) * 100)),
      })
    }
    if (fSit !== null && !isNaN(fSit)) {
      testedScores.push(fitnessScore("situp", fSit))
      newMetrics.push({
        label: "Sit-up (1 Menit)",
        current: `${fSit} kali`,
        target: `${sitTarget} kali`,
        percent: Math.min(100, Math.round((fSit / sitTarget) * 100)),
      })
    }
    if (fBack !== null && !isNaN(fBack)) {
      testedScores.push(fitnessScore("backup", fBack))
      newMetrics.push({
        label: "Back-up (1 Menit)",
        current: `${fBack} kali`,
        target: `${backTarget} kali`,
        percent: Math.min(100, Math.round((fBack / backTarget) * 100)),
      })
    }
    if (fShuttle !== null && !isNaN(fShuttle)) {
      testedScores.push(fitnessScore("shuttle", fShuttle))
      newMetrics.push({
        label: "Shuttle Run (6×10m)",
        current: `${fShuttle.toFixed(1).replace(".", ",")} dtk`,
        target: `${shuttleTarget.toFixed(1).replace(".", ",")} dtk`,
        percent: Math.min(100, Math.round((shuttleTarget / fShuttle) * 100)),
      })
    }

    const newFitness =
      testedScores.length > 0
        ? Number(
            (
              testedScores.reduce((a, b) => a + b, 0) / testedScores.length
            ).toFixed(1),
          )
        : null

    if (candidate) {
      updateCandidate(candidate.id, {
        physicalMetrics: newMetrics,
        fitness: newFitness,
      })
    }
    setIsEditingSamapta(false)
  }

  const defaultPhysicalList = [
    {
      key: "run" as const,
      label: "Lari 12 Menit",
      category: "Samapta A",
      isPrimary: true,
      current: effectiveRunItem ? effectiveRunItem.current : null,
      target: "3.000 m",
      score: runVal !== null ? fitnessScore("run", runVal) : null,
      percent:
        runVal !== null
          ? Math.min(100, Math.round((runVal / 3000) * 100))
          : null,
    },
    {
      key: "pushup" as const,
      label: "Push-up (1 Menit)",
      category: "Samapta B",
      isPrimary: false,
      current: pushupItem ? pushupItem.current : null,
      target: "45 kali",
      score: pushVal !== null ? fitnessScore("pushup", pushVal) : null,
      percent:
        pushVal !== null
          ? Math.min(100, Math.round((pushVal / 45) * 100))
          : null,
    },
    {
      key: "situp" as const,
      label: "Sit-up (1 Menit)",
      category: "Samapta B",
      isPrimary: false,
      current: situpItem ? situpItem.current : null,
      target: "40 kali",
      score: sitVal !== null ? fitnessScore("situp", sitVal) : null,
      percent:
        sitVal !== null ? Math.min(100, Math.round((sitVal / 40) * 100)) : null,
    },
    {
      key: "backup" as const,
      label: "Back-up (1 Menit)",
      category: "Samapta B",
      isPrimary: false,
      current: backupItem ? backupItem.current : null,
      target: "50 kali",
      score: backVal !== null ? fitnessScore("backup", backVal) : null,
      percent:
        backVal !== null
          ? Math.min(100, Math.round((backVal / 50) * 100))
          : null,
    },
    {
      key: "shuttle" as const,
      label: "Shuttle Run (6×10m)",
      category: "Samapta B",
      isPrimary: false,
      current: shuttleItem ? shuttleItem.current : null,
      target: "15,4 dtk",
      score: shuttleVal !== null ? fitnessScore("shuttle", shuttleVal) : null,
      percent:
        shuttleVal !== null && shuttleVal > 0
          ? Math.min(100, Math.round((15.4 / shuttleVal) * 100))
          : null,
    },
  ]

  const formRunVal =
    samaptaForm.run.trim() !== "" ? parseFloat(samaptaForm.run) : null
  const formPushVal =
    samaptaForm.pushup.trim() !== "" ? parseFloat(samaptaForm.pushup) : null
  const formSitVal =
    samaptaForm.situp.trim() !== "" ? parseFloat(samaptaForm.situp) : null
  const formBackVal =
    samaptaForm.backup.trim() !== "" ? parseFloat(samaptaForm.backup) : null
  const formShuttleVal =
    samaptaForm.shuttle.trim() !== ""
      ? parseFloat(samaptaForm.shuttle.replace(",", "."))
      : null

  const modalScores: number[] = []
  if (formRunVal !== null && !isNaN(formRunVal))
    modalScores.push(fitnessScore("run", formRunVal))
  if (formPushVal !== null && !isNaN(formPushVal))
    modalScores.push(fitnessScore("pushup", formPushVal))
  if (formSitVal !== null && !isNaN(formSitVal))
    modalScores.push(fitnessScore("situp", formSitVal))
  if (formBackVal !== null && !isNaN(formBackVal))
    modalScores.push(fitnessScore("backup", formBackVal))
  if (formShuttleVal !== null && !isNaN(formShuttleVal))
    modalScores.push(fitnessScore("shuttle", formShuttleVal))

  const modalCompositeScore =
    modalScores.length > 0
      ? (modalScores.reduce((a, b) => a + b, 0) / modalScores.length).toFixed(1)
      : null

  const development = {
    attendance: candidate?.attendance ?? 0,
    training: candidate?.trainingCompliance ?? 0,
    documents: docsPercent,
    note:
      candidate?.coachNote ??
      "Belum ada catatan pelatih. Lengkapi penilaian sesi atau tambahkan catatan evaluasi kandidat.",
    physical: defaultPhysicalList,
  }

  const progressStatuses = candidate
    ? getProgressStageStatuses(candidate, catTryoutAttempts, sessions, records)
    : []
  const passedCount = progressStatuses.filter(
    (status) => status === "passed",
  ).length
  const completion = Math.round((passedCount / selectionStages.length) * 100)
  const examScores = candidate
    ? [
        { label: "PIP", value: candidate.pip, target: 70 },
        { label: "TIU", value: candidate.tiu, target: 70 },
        { label: "PBB", value: candidate.pbb, target: 80 },
        { label: "Samapta", value: candidate.fitness, target: 80 },
        { label: "Kepribadian", value: candidate.personality, target: 80 },
      ]
    : []

  return (
    <div className="flex flex-col gap-4 sm:gap-5 w-full min-w-0 max-w-full overflow-x-hidden">
      {/* Wadah Header Perkembangan Santri Berstandar Desain Identik Kandidat & Sesi */}
      <Card className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
            <span className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100 shadow-2xs">
              <TrendingUp className="size-5 sm:size-5.5 stroke-[2.2]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-950">
                  Perkembangan Santri
                </h1>
                <span className="inline-flex items-center rounded-md bg-red-50 border border-red-200/80 px-2.5 py-0.5 text-xs font-bold text-red-700">
                  Rekam Individual
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                {candidate
                  ? `Santri ke-${currentIndex + 1} dari ${candidates.length} santri aktif · MA Mu'allimin Yogyakarta`
                  : `Pilih salah satu dari ${candidates.length} santri aktif untuk melihat rekam perkembangan individual`}
              </p>
            </div>
          </div>
        </div>

        {candidate && (
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-3 min-w-0">
            {/* Yang Kiri: Kembali */}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSelectedId("")}
              className="gap-1.5 text-xs font-bold shrink-0"
            >
              <ArrowLeft className="size-3.5" /> Kembali
            </Button>

            {/* Yang Kanan: Cuman Sevron Kiri Kanan */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-1 shadow-2xs shrink-0">
              <button
                type="button"
                onClick={handlePrev}
                disabled={!candidate}
                className="grid size-8 sm:size-9 place-items-center rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition disabled:opacity-30 disabled:pointer-events-none"
                title="Santri sebelumnya"
              >
                <ChevronLeft className="size-4" />
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={!candidate}
                className="grid size-8 sm:size-9 place-items-center rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition disabled:opacity-30 disabled:pointer-events-none"
                title="Santri berikutnya"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {!candidate ? (
        <Card className="p-4 sm:p-6 md:p-8 text-center border border-slate-200/90 bg-white shadow-2xs rounded-2xl min-w-0 overflow-hidden">
          <div className="mx-auto flex size-12 sm:size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 mb-3 sm:mb-4 shadow-2xs">
            <UsersRound className="size-6 sm:size-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            Belum Ada Santri yang Dipilih
          </h3>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed break-words px-2">
            Silakan pilih santri melalui dropdown di atas atau klik salah satu
            kartu santri di bawah untuk melihat rekam perkembangan individual,
            peta kesiapan 8 materi, dan evaluasi latihan.
          </p>

          <div className="mt-5 border-t border-slate-100 pt-5 text-left">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-4 text-left">
              {candidates.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className="group flex flex-col justify-between items-center text-center p-3 sm:p-4 rounded-xl border border-slate-200/90 bg-slate-50/40 hover:bg-white hover:border-red-400 hover:shadow-xs transition-all cursor-pointer min-w-0 w-full"
                >
                  <div className="w-full flex items-center justify-between mb-2">
                    <span className="text-3xs sm:text-2xs font-black text-slate-600 bg-white border border-slate-200 group-hover:bg-red-50 group-hover:text-red-700 group-hover:border-red-200 px-2 py-0.5 rounded-full">
                      #{i + 1}
                    </span>
                    <span className="text-3xs sm:text-2xs font-semibold text-slate-400">
                      {c.gender}
                    </span>
                  </div>

                  <CandidateAvatar
                    name={c.name}
                    avatar={c.avatar}
                    photoUrl={c.photoUrl}
                    className="size-14 sm:size-18 text-base sm:text-lg font-bold shrink-0 ring-2 ring-slate-100 group-hover:ring-red-200 shadow-2xs"
                    rounded="rounded-2xl"
                  />

                  <div className="mt-2.5 w-full min-w-0">
                    <p className="font-display text-xs sm:text-sm font-bold text-slate-900 group-hover:text-red-700 leading-snug break-words">
                      {c.name}
                    </p>
                    <p className="mt-1 text-2xs font-semibold text-slate-500">
                      {c.number}
                    </p>
                    <p className="mt-0.5 text-3xs font-medium text-slate-400 break-words leading-tight">
                      {c.school}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Banner Profil & Stepper Alur 8 Materi (Fully Responsive & Contained) */}
          <Card className="overflow-hidden border border-slate-200/90 shadow-2xs rounded-2xl min-w-0 max-w-full">
            <div className="bg-slate-950 p-4 sm:p-6 text-white min-w-0 max-w-full">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between min-w-0 max-w-full">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <CandidateAvatar
                    name={candidate.name}
                    avatar={candidate.avatar}
                    photoUrl={candidate.photoUrl}
                    className="size-16 sm:size-24 md:size-28 font-display text-xl sm:text-2xl md:text-3xl border-2 border-white/20 shadow-xl shadow-red-950/40 shrink-0"
                    rounded="rounded-2xl"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-base sm:text-xl lg:text-2xl font-bold tracking-tight text-white break-words">
                        {candidate.name}
                      </h2>
                      <Badge
                        tone={
                          candidate.stageStatuses.includes("failed")
                            ? "danger"
                            : "success"
                        }
                        className="shrink-0 text-3xs !py-0.5 !px-2 font-semibold"
                      >
                        {candidate.stageStatuses.includes("failed")
                          ? "Perlu Pembinaan"
                          : "Aktif"}
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 break-words leading-relaxed">
                      {candidate.number} · {candidate.school}
                    </p>
                    <span className="inline-block rounded-md bg-white/10 px-2 py-0.5 text-2xs font-semibold text-slate-200">
                      {candidate.gender}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3 border-t border-white/10 pt-3 sm:border-t-0 sm:pt-0 min-w-0 w-full lg:w-auto">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-center min-w-0 flex-1 sm:flex-none sm:min-w-28">
                    <p className="text-3xs font-semibold text-slate-400 uppercase tracking-wider">
                      Fisik (TB/BB)
                    </p>
                    <p className="mt-0.5 text-xs sm:text-sm font-bold text-white whitespace-nowrap">
                      {candidate.heightCm ?? "—"} cm ·{" "}
                      {candidate.weightKg ?? "—"} kg
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 min-w-0 flex-1 sm:flex-none sm:min-w-36">
                    <div className="flex items-center justify-between text-xs font-semibold gap-1">
                      <span className="text-slate-400 text-3xs uppercase tracking-wider">
                        Kesiapan
                      </span>
                      <span className="text-emerald-300 font-bold">
                        {completion}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${completion}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Responsive Stage Stepper (Grid 8 kolom di Desktop, 4 kolom di Tablet, 2 kolom di HP) */}
            <div className="border-t border-slate-100 bg-slate-50/70 p-3 sm:p-5 min-w-0 max-w-full overflow-hidden">
              <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Peta Kesiapan 8 Materi Latihan
                </p>
                <span className="text-xs font-semibold text-slate-500">
                  {passedCount} dari {selectionStages.length} materi siap
                  standar
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8 min-w-0 max-w-full">
                {selectionStages.map((stage, index) => {
                  const status = progressStatuses[index] ?? "locked"
                  const isPassed = status === "passed"
                  const isFailed = status === "failed"
                  const isReview = status === "review"
                  return (
                    <div
                      key={stage.key}
                      className={`flex flex-col justify-between rounded-xl border p-2 sm:p-2.5 text-center transition min-w-0 max-w-full overflow-hidden ${
                        isPassed
                          ? "border-emerald-200 bg-emerald-50/60 shadow-2xs"
                          : isReview
                            ? "border-amber-200 bg-amber-50/60"
                            : isFailed
                              ? "border-red-200 bg-red-50/60"
                              : "border-slate-200/90 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 min-w-0">
                        <span
                          className={`grid size-5 sm:size-6 place-items-center rounded-full text-3xs sm:text-xs font-bold shrink-0 ${
                            isPassed
                              ? "bg-emerald-600 text-white"
                              : isReview
                                ? "bg-amber-500 text-white"
                                : isFailed
                                  ? "bg-red-600 text-white"
                                  : "bg-slate-700 text-white"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span
                          className={`text-3xs sm:text-3xs font-bold uppercase tracking-wider truncate ${
                            isPassed
                              ? "text-emerald-700 font-extrabold"
                              : isReview
                                ? "text-amber-700 font-bold"
                                : isFailed
                                  ? "text-red-700 font-bold"
                                  : "text-slate-500 font-semibold"
                          }`}
                        >
                          {stageLabel(status)}
                        </span>
                      </div>
                      <p
                        className="mt-1.5 text-xs font-bold text-slate-800 break-words leading-tight"
                        title={stage.label}
                      >
                        {stage.label}
                      </p>
                      <p className="mt-1 text-3xs font-medium text-slate-400">
                        {stage.shortLabel} · {index < 5 ? "Dasar" : "Lapangan"}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>

          {/* Semua 8 Tahap Punya Kartu Mandiri dengan LineChart */}
          <StageCards
            candidate={candidate}
            onOpenModal={() => onSelectCandidate(candidate.id)}
          />

          <CandidateProjection candidateId={candidate.id} />

          {/* Wadah Terpadu Latihan Interval & Analisis Masa Depan */}
          <CandidateIntervalView candidate={candidate} />

          <div className="flex flex-col gap-6 w-full min-w-0 max-w-full">
            <Card className="overflow-hidden border border-slate-200/90 shadow-2xs rounded-2xl w-full min-w-0 max-w-full">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-slate-100 bg-white px-4 py-3 sm:px-5 sm:py-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 border border-red-100">
                    <Activity className="size-4" />
                  </span>
                  <div>
                    <h2 className="font-display text-sm sm:text-base font-bold text-slate-900 leading-snug">
                      Rekap Uji Kesamaptaan Jasmani (BPIP)
                    </h2>
                    <p className="text-2xs text-slate-500">
                      Standar Nilai 100: Lari 3.000m · Push-up 45x · Sit-up 40x
                      · Back-up 50x · Shuttle 15,4s
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {effectiveCandidateFitness !== null && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-950">
                      <span className="text-3xs font-bold uppercase text-emerald-700">
                        Rata-rata:
                      </span>
                      <span className="font-display font-black text-xs sm:text-sm text-emerald-800">
                        {effectiveCandidateFitness}
                      </span>
                      <span className="text-3xs text-emerald-600">/ 100</span>
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleOpenSamaptaModal}
                    className="gap-1 text-xs font-bold"
                  >
                    <Edit3 className="size-3.5" /> Catat / Edit Nilai
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-slate-100 bg-white">
                {defaultPhysicalList.map((metric) => {
                  const isRecorded =
                    metric.current !== null &&
                    metric.current !== "Belum dicatat" &&
                    metric.current !== "Belum diuji"
                  return (
                    <div
                      key={metric.key}
                      className="px-3.5 py-2.5 sm:px-5 sm:py-3 hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Tampilan Desktop (Satu Baris Seimbang) */}
                      <div className="hidden sm:flex items-center justify-between gap-4">
                        {/* Left: Kategori & Nama Uji */}
                        <div className="flex items-center gap-2.5 w-5/12 min-w-0">
                          <span
                            className={`text-3xs font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              metric.isPrimary
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {metric.category}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {metric.label}
                            </p>
                            <p className="text-3xs text-slate-400">
                              Target:{" "}
                              <strong className="text-slate-600">
                                {metric.target}
                              </strong>
                            </p>
                          </div>
                        </div>

                        {/* Middle: Capaian & Nilai BPIP */}
                        <div className="flex items-center gap-4 w-4/12">
                          <div className="min-w-0">
                            <span className="text-3xs uppercase font-bold text-slate-400 block">
                              Hasil
                            </span>
                            {isRecorded ? (
                              <span className="font-display text-xs font-bold text-slate-900">
                                {metric.current}
                              </span>
                            ) : (
                              <span className="font-sans text-2xs italic text-slate-400">
                                Belum diuji
                              </span>
                            )}
                          </div>

                          <div className="pl-3 border-l border-slate-100 min-w-0">
                            <span className="text-3xs uppercase font-bold text-slate-400 block">
                              Poin BPIP
                            </span>
                            {isRecorded && metric.score !== null ? (
                              <span
                                className={`text-xs font-bold ${
                                  metric.score >= 85
                                    ? "text-emerald-600"
                                    : metric.score >= 70
                                      ? "text-blue-600"
                                      : "text-amber-600"
                                }`}
                              >
                                {metric.score} Poin
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </div>
                        </div>

                        {/* Right: Progress Bar & Status */}
                        <div className="flex items-center justify-end w-3/12">
                          {isRecorded && metric.percent !== null ? (
                            <div className="w-full max-w-[120px] space-y-1">
                              <div className="flex justify-between text-3xs">
                                <span className="text-slate-400">Kesiapan</span>
                                <span className="font-bold text-slate-700">
                                  {metric.percent}%
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    metric.percent >= 90
                                      ? "bg-emerald-500"
                                      : metric.percent >= 75
                                        ? "bg-blue-600"
                                        : "bg-amber-500"
                                  }`}
                                  style={{
                                    width: `${Math.min(100, metric.percent)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center text-3xs font-medium text-slate-400 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded">
                              Menunggu Pengujian
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tampilan Mobile: 2 Baris Ringkas & Rapi */}
                      <div className="sm:hidden space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`text-3xs font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                metric.isPrimary
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              {metric.category}
                            </span>
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {metric.label}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            {isRecorded ? (
                              <div className="flex items-baseline gap-1">
                                <span className="font-display text-xs font-black text-slate-900">
                                  {metric.current}
                                </span>
                                {metric.score !== null && (
                                  <span
                                    className={`text-3xs font-bold ${
                                      metric.score >= 85
                                        ? "text-emerald-600"
                                        : metric.score >= 70
                                          ? "text-blue-600"
                                          : "text-amber-600"
                                    }`}
                                  >
                                    · {metric.score} Poin
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-3xs italic text-slate-400">
                                Belum diuji
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-3xs text-slate-400">
                          <span>
                            Target:{" "}
                            <strong className="text-slate-600">
                              {metric.target}
                            </strong>
                          </span>
                          {isRecorded && metric.percent !== null ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-600">
                                {metric.percent}%
                              </span>
                              <div className="w-14 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    metric.percent >= 90
                                      ? "bg-emerald-500"
                                      : metric.percent >= 75
                                        ? "bg-blue-600"
                                        : "bg-amber-500"
                                  }`}
                                  style={{
                                    width: `${Math.min(100, metric.percent)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-3xs text-slate-400">
                              Menunggu Pengujian
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer note */}
              <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2 sm:px-5 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="text-2xs">
                  Passing grade kelulusan jasmani BPIP:{" "}
                  <strong className="text-slate-700">
                    Rata-rata &ge; 75.0
                  </strong>
                  .
                </span>
                <span className="text-3xs text-slate-400">
                  Terakhir diperbarui: {candidate.updatedAt || "Hari ini"}
                </span>
              </div>
            </Card>

            {/* Modal Catat / Edit Hasil Tes Samapta Mandiri */}
            {isEditingSamapta && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
                <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                  <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="font-display text-lg font-bold text-slate-900">
                        Input / Catat Hasil Tes Samapta
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {candidate.name} ({candidate.number} ·{" "}
                        {candidate.gender})
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingSamapta(false)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X className="size-5" />
                    </button>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700">
                        Lari 12 Menit (Jarak dalam meter)
                      </label>
                      <p className="text-2xs text-slate-400">
                        Target nilai 100: 3.000 m (Putra)
                      </p>
                      <input
                        type="number"
                        step="10"
                        placeholder="Target 3.000 m"
                        value={samaptaForm.run}
                        onChange={(e) =>
                          setSamaptaForm({
                            ...samaptaForm,
                            run: e.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:border-red-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700">
                          Push-up 1 Menit (kali)
                        </label>
                        <p className="text-2xs text-slate-400">
                          Target: 45 kali
                        </p>
                        <input
                          type="number"
                          placeholder="Belum diuji"
                          value={samaptaForm.pushup}
                          onChange={(e) =>
                            setSamaptaForm({
                              ...samaptaForm,
                              pushup: e.target.value,
                            })
                          }
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:border-red-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700">
                          Sit-up 1 Menit (kali)
                        </label>
                        <p className="text-2xs text-slate-400">
                          Target: 40 kali
                        </p>
                        <input
                          type="number"
                          placeholder="Belum diuji"
                          value={samaptaForm.situp}
                          onChange={(e) =>
                            setSamaptaForm({
                              ...samaptaForm,
                              situp: e.target.value,
                            })
                          }
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:border-red-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700">
                          Back-up 1 Menit (kali)
                        </label>
                        <p className="text-2xs text-slate-400">
                          Target: 50 kali
                        </p>
                        <input
                          type="number"
                          placeholder="Belum diuji"
                          value={samaptaForm.backup}
                          onChange={(e) =>
                            setSamaptaForm({
                              ...samaptaForm,
                              backup: e.target.value,
                            })
                          }
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:border-red-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700">
                          Shuttle Run 6×10m (detik)
                        </label>
                        <p className="text-2xs text-slate-400">
                          Target: 15,4 dtk
                        </p>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Belum diuji"
                          value={samaptaForm.shuttle}
                          onChange={(e) =>
                            setSamaptaForm({
                              ...samaptaForm,
                              shuttle: e.target.value,
                            })
                          }
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:border-red-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Preview Skor BPIP */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600">
                          Estimasi Skor Samapta Standar BPIP:
                        </span>
                        {modalCompositeScore !== null ? (
                          <span className="font-display text-base font-black text-emerald-700">
                            {modalCompositeScore}{" "}
                            <span className="text-xs font-normal text-slate-500">
                              / 100 ({modalScores.length} parameter terisi)
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs italic text-slate-400">
                            Belum ada parameter yang diisi
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
                    <Button
                      variant="ghost"
                      onClick={() => setIsEditingSamapta(false)}
                    >
                      Batal
                    </Button>
                    <Button variant="primary" onClick={handleSaveSamapta}>
                      <Check className="size-4" /> Simpan Hasil Tes
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 md:gap-6">
            {[
              ["Kehadiran latihan", development.attendance, CalendarDays],
              ["Kepatuhan program", development.training, ClipboardCheck],
              [
                "Kelengkapan berkas (6 dokumen)",
                development.documents,
                FileCheck2,
              ],
            ].map(([label, value, Icon]) => {
              const MetricIcon = Icon as typeof CalendarDays
              return (
                <Card
                  className="flex flex-col justify-between p-3 sm:p-5"
                  key={label as string}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="grid size-8 sm:size-10 shrink-0 place-items-center rounded-lg sm:rounded-xl bg-slate-100 text-slate-700">
                        <MetricIcon className="size-4 sm:size-5" />
                      </span>
                      <span className="font-display text-base sm:text-2xl font-bold text-slate-950">
                        {value as number}%
                      </span>
                    </div>
                    <p className="mt-2.5 sm:mt-4 text-xs sm:text-sm font-bold text-slate-800 leading-tight">
                      {label as string}
                    </p>
                  </div>
                  <div className="mt-2.5 sm:mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-red-500"
                      style={{ width: `${value as number}%` }}
                    />
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function RankingView({
  onSelectCandidate,
}: {
  onSelectCandidate: (candidateId: string) => void
}) {
  const { candidates, currentUser } = useApp()
  const [searchQuery, setSearchQuery] = useState("")

  const ranked = useMemo(
    () =>
      candidates
        .filter(
          (candidate) =>
            evaluateRankingAnthropometry(candidate).status === "eligible",
        )
        .map((candidate) => ({ candidate, score: finalScore(candidate) }))
        .filter(
          (item): item is { candidate: Candidate; score: number } =>
            item.score !== null && item.score > 0,
        )
        .sort(compareRankedCandidates),
    [candidates],
  )

  const filteredRanked = useMemo(() => {
    if (!searchQuery.trim()) return ranked
    const q = searchQuery.toLowerCase().trim()
    return ranked.filter(
      (item) =>
        item.candidate.name.toLowerCase().includes(q) ||
        item.candidate.number.toLowerCase().includes(q) ||
        item.candidate.school.toLowerCase().includes(q),
    )
  }, [ranked, searchQuery])

  const unranked = useMemo(
    () =>
      candidates.filter(
        (c) =>
          evaluateRankingAnthropometry(c).status !== "eligible" ||
          finalScore(c) === null ||
          (finalScore(c) ?? 0) <= 0,
      ),
    [candidates],
  )

  return (
    <div className="grid gap-4 sm:gap-5">
      {/* Wadah Header Pemeringkatan Ringkas & Berikon */}
      <Card className="border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-2xs">
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          <span className="grid size-9 sm:size-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600 border border-red-100/80 shadow-2xs">
            <Trophy className="size-4.5 sm:size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-950">
                Peringkat Sementara
              </h1>
              <span className="inline-flex items-center rounded-md bg-red-50 border border-red-200/80 px-2 py-0.5 text-2xs font-semibold text-red-700">
                Simulasi &amp; Evaluasi
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
              Capaian nilai latihan dan kesiapan seleksi santri.
            </p>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-slate-900">
              Leaderboard kesiapan sementara
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
              {filteredRanked.length} santri aktif
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau nomor..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs sm:text-sm placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Mobile View */}
        <div className="grid divide-y divide-slate-100 md:hidden">
          {filteredRanked.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Tidak ada santri yang sesuai dengan filter pencarian.
            </div>
          ) : (
            filteredRanked.map(({ candidate, score }) => {
              const actualRank =
                ranked.findIndex((r) => r.candidate.id === candidate.id) + 1
              return (
                <button
                  type="button"
                  onClick={() => onSelectCandidate(candidate.id)}
                  disabled={currentUser.role === "candidate"}
                  className="p-4 text-left transition hover:bg-slate-50 disabled:cursor-default disabled:hover:bg-transparent"
                  key={candidate.id}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-xl font-display text-sm font-bold ${
                        actualRank === 1
                          ? "bg-amber-400 text-amber-950"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {actualRank}
                    </span>
                    <CandidateAvatar
                      name={candidate.name}
                      avatar={candidate.avatar}
                      photoUrl={candidate.photoUrl}
                      className="size-12 shrink-0 border border-slate-200 text-sm font-bold shadow-xs"
                      rounded="rounded-xl"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 leading-snug break-words">
                        {candidate.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {candidate.number} · {candidate.gender}
                        {candidate.heightCm
                          ? ` · ${candidate.heightCm} cm`
                          : ""}
                        {candidate.heightCm && candidate.weightKg
                          ? ` · BMI ${bmi(candidate.weightKg, candidate.heightCm)?.value ?? "—"}`
                          : ""}
                      </p>
                    </div>
                    <p className="font-display text-lg font-bold tabular-nums text-emerald-600">
                      {score.toFixed(2)}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Desktop Table: Bersih, Rapi & Fungsional */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[54rem] text-left">
            <thead className="bg-slate-50/70 text-2xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5 text-center w-16">Peringkat</th>
                <th className="px-4 py-3.5">Santri</th>
                <th className="px-4 py-3.5">Postur</th>
                <th className="px-4 py-3.5">PBB · 30%</th>
                <th className="px-4 py-3.5">Samapta · 30%</th>
                <th className="px-4 py-3.5">Kepribadian · 40%</th>
                <th className="px-6 py-3.5 text-right">Nilai Sementara</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRanked.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-slate-500 text-sm"
                  >
                    Tidak ada santri yang sesuai dengan filter pencarian "
                    {searchQuery}".
                  </td>
                </tr>
              ) : (
                filteredRanked.map(({ candidate, score }) => {
                  const actualRank =
                    ranked.findIndex((r) => r.candidate.id === candidate.id) + 1
                  return (
                    <tr
                      key={candidate.id}
                      onClick={
                        currentUser.role === "candidate"
                          ? undefined
                          : () => onSelectCandidate(candidate.id)
                      }
                      className={
                        currentUser.role === "candidate"
                          ? "transition"
                          : "cursor-pointer transition hover:bg-slate-50/80"
                      }
                    >
                      {/* Peringkat */}
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`grid size-8 place-items-center rounded-lg font-display text-sm font-bold mx-auto ${
                            actualRank === 1
                              ? "bg-amber-400 text-amber-950 font-black shadow-xs"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {actualRank}
                        </span>
                      </td>

                      {/* Santri */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <CandidateAvatar
                            name={candidate.name}
                            avatar={candidate.avatar}
                            photoUrl={candidate.photoUrl}
                            className="size-11 shrink-0 border border-slate-200 text-xs font-bold shadow-xs"
                            rounded="rounded-xl"
                          />
                          <div>
                            <p className="font-bold text-slate-900 hover:text-red-600 transition">
                              {candidate.name}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {candidate.number} · {candidate.gender}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Postur: Simpel & Bersih */}
                      <td className="px-4 py-4 text-xs font-medium text-slate-700 tabular-nums">
                        {candidate.heightCm && candidate.weightKg ? (
                          <span>
                            {candidate.heightCm} cm / {candidate.weightKg} kg
                            <span className="mt-1 block text-2xs text-slate-500">
                              BMI{" "}
                              {bmi(candidate.weightKg, candidate.heightCm)
                                ?.value ?? "—"}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Belum diukur</span>
                        )}
                      </td>

                      {/* PBB (30%) */}
                      <td className="px-4 py-4 text-sm font-semibold tabular-nums text-slate-800">
                        {candidate.pbb !== null ? (
                          candidate.pbb.toFixed(1)
                        ) : (
                          <span className="text-xs font-normal text-slate-400">
                            Belum diisi
                          </span>
                        )}
                      </td>

                      {/* Samapta (30%) */}
                      <td className="px-4 py-4 text-sm font-semibold tabular-nums text-slate-800">
                        {candidate.fitness !== null ? (
                          candidate.fitness.toFixed(1)
                        ) : (
                          <span className="text-xs font-normal text-slate-400">
                            Belum diisi
                          </span>
                        )}
                      </td>

                      {/* Kepribadian (40%) */}
                      <td className="px-4 py-4 text-sm font-semibold tabular-nums text-slate-800">
                        {candidate.personality !== null ? (
                          candidate.personality.toFixed(1)
                        ) : (
                          <span className="text-xs font-normal text-slate-400">
                            Belum diisi
                          </span>
                        )}
                      </td>

                      {/* Nilai Akhir */}
                      <td className="px-6 py-4 text-right">
                        <span className="font-display text-xl font-bold tabular-nums text-emerald-600">
                          {score.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {currentUser.role !== "candidate" && unranked.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="font-display text-base font-bold text-slate-900">
              Santri belum masuk pemeringkatan ({unranked.length})
            </h3>
            <p className="text-xs text-slate-500">
              Peringkat hanya menampilkan santri dengan tinggi minimal 170 cm,
              BMI normal (18,5–24,9), dan nilai latihan tercatat.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {unranked.map((cand) => {
              const anthropometry = evaluateRankingAnthropometry(cand)
              const reason =
                anthropometry.status !== "eligible"
                  ? anthropometry.reason
                  : cand.coachNote ||
                    "Belum ada catatan nilai dari sesi latihan sebelumnya"

              return (
                <button
                  key={cand.id}
                  type="button"
                  onClick={() => onSelectCandidate(cand.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 px-6 py-3.5 text-left hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <CandidateAvatar
                      name={cand.name}
                      avatar={cand.avatar}
                      photoUrl={cand.photoUrl}
                      className="size-12 text-sm font-bold shrink-0 border border-slate-200 shadow-xs"
                      rounded="rounded-xl"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {cand.name} ({cand.number})
                      </p>
                      <p className="text-xs text-slate-500">{reason}</p>
                    </div>
                  </div>
                  <Badge
                    tone={
                      anthropometry.status === "failed" ? "danger" : "warning"
                    }
                  >
                    {anthropometry.status === "failed"
                      ? "Tidak memenuhi syarat"
                      : "Perlu data/nilai"}
                  </Badge>
                </button>
              )
            })}
          </div>
        </Card>
      ) : null}
    </div>
  )
}

function StandardsView() {
  const { standardRules, updateStandardRule, currentUser, candidates } =
    useApp()
  const isCandidate = currentUser.role === "candidate"
  const myCandidate = useMemo(
    () => candidates.find((c) => c.id === currentUser.candidateId),
    [candidates, currentUser.candidateId],
  )

  const [birthDate, setBirthDate] = useState(
    myCandidate?.birthDate || "2009-08-18",
  )
  const [weight, setWeight] = useState(myCandidate?.weightKg || 64)
  const [height, setHeight] = useState(myCandidate?.heightCm || 174)
  const [runDist, setRunDist] = useState(2850)
  const [pushup, setPushup] = useState(39)
  const [situp, setSitup] = useState(37)
  const [backup, setBackup] = useState(41)
  const [shuttle, setShuttle] = useState(16.0)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [ruleApprover, setRuleApprover] = useState(currentUser.name)
  const [ruleRef, setRuleRef] = useState("SK Panitia Internal 2027")

  const age = ageOnReferenceDate(birthDate, 2027)
  const bmiResult = bmi(weight, height)
  const samaptaCalc = useMemo(() => {
    const s1 = fitnessScore("run", runDist)
    const s2 = fitnessScore("pushup", pushup)
    const s3 = fitnessScore("situp", situp)
    const s4 = fitnessScore("backup", backup)
    const s5 = fitnessScore("shuttle", shuttle)
    const avg = (s1 + s2 + s3 + s4 + s5) / 5
    return { s1, s2, s3, s4, s5, avg }
  }, [runDist, pushup, situp, backup, shuttle])

  return (
    <div className="grid gap-4 sm:gap-5">
      <div className="border-b border-slate-200/70 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-950">
            {isCandidate
              ? "Kalkulator Nilai & Standar BPIP"
              : "Standar & kalkulator"}
          </h1>
          <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/10">
            {isCandidate ? "Simulasi Mandiri Santri" : "Governance Standar"}
          </span>
        </div>
        <p className="mt-0.5 max-w-2xl text-xs text-slate-500">
          {isCandidate
            ? "Simulasikan capaian kesamaptaan fisik, cek antropometri BMI/IMT ideal, serta pelajari standar kelulusan resmi BPIP."
            : "Uji kalkulator presisi usia, BMI/IMT, dan konversi Samapta, serta sahkan register aturan seleksi."}
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Kalkulator usia
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Acuan 17 Agustus 2027
              </p>
            </div>
            <Badge
              tone={age.years >= 16 && age.years < 18 ? "success" : "danger"}
            >
              {age.years >= 16 && age.years < 18
                ? "Memenuhi (16–<18 th)"
                : "Di luar rentang"}
            </Badge>
          </div>
          <div className="mt-6">
            <Input
              label="Tanggal lahir kandidat"
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              ["Tahun", age.years],
              ["Bulan", age.months],
              ["Hari", age.days],
            ].map(([label, value]) => (
              <div
                className="rounded-2xl bg-slate-50 p-4 text-center"
                key={label}
              >
                <p className="font-display text-2xl font-bold text-slate-950">
                  {value}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {label}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
            Kalkulator presisi menghitung selisih eksak tahun, bulan, dan hari
            terhadap 17 Agustus tahun penugasan.
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Kalkulator BMI / IMT
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Umpan balik antropometri
              </p>
            </div>
            <Badge tone="info">Kalkulator</Badge>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <Input
              label="Tinggi badan (cm)"
              type="number"
              value={height}
              onChange={(event) => setHeight(Number(event.target.value))}
            />
            <Input
              label="Berat badan (kg)"
              type="number"
              value={weight}
              onChange={(event) => setWeight(Number(event.target.value))}
            />
          </div>
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-950 p-5 text-white">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Hasil BMI
              </p>
              <p className="mt-1 font-display text-3xl font-bold">
                {bmiResult?.value ?? "—"}
              </p>
            </div>
            <Badge
              tone={
                bmiResult?.category === "Normal"
                  ? "success"
                  : bmiResult?.category === "Obesitas"
                    ? "danger"
                    : "warning"
              }
            >
              {bmiResult?.category ?? "Belum tersedia"}
            </Badge>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Kategori kuning masuk review manual; BMI ≥30 ditandai merah sesuai
            draft PRD.
          </p>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Kalkulator konversi Samapta 5 pos
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Simulasikan nilai konversi otomatis dari hasil mentah latihan
              lapangan.
            </p>
          </div>
          <div className="rounded-xl bg-slate-950 px-4 py-2 text-white">
            <span className="text-xs text-slate-400">Rerata Samapta: </span>
            <strong className="font-display text-lg text-red-400">
              {samaptaCalc.avg.toFixed(1)}
            </strong>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            label={`Lari 12 mnt (Skor: ${samaptaCalc.s1})`}
            type="number"
            value={runDist}
            onChange={(e) => setRunDist(Number(e.target.value))}
          />
          <Input
            label={`Push-up (Skor: ${samaptaCalc.s2})`}
            type="number"
            value={pushup}
            onChange={(e) => setPushup(Number(e.target.value))}
          />
          <Input
            label={`Sit-up (Skor: ${samaptaCalc.s3})`}
            type="number"
            value={situp}
            onChange={(e) => setSitup(Number(e.target.value))}
          />
          <Input
            label={`Back-up (Skor: ${samaptaCalc.s4})`}
            type="number"
            value={backup}
            onChange={(e) => setBackup(Number(e.target.value))}
          />
          <Input
            label={`Shuttle dtk (Skor: ${samaptaCalc.s5})`}
            type="number"
            step="0.1"
            value={shuttle}
            onChange={(e) => setShuttle(Number(e.target.value))}
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="font-display text-lg font-bold text-slate-900">
            Register aturan & pengesahan standar
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Versi standar: Draft BPIP 2026/2027 · Klik &ldquo;Ubah Status /
            Sahkan&rdquo; untuk mencatat pengesahan approver.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {standardRules.map((rule) => (
            <div key={rule.id} className="px-6 py-4">
              <div className="grid gap-3 md:grid-cols-[1.1fr_1.3fr_auto_auto] md:items-center">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {rule.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Approver: {rule.approver ?? "—"} · Ref:{" "}
                    {rule.reference ?? "—"}
                  </p>
                </div>
                <p className="text-sm text-slate-600">{rule.value}</p>
                <Badge tone={rule.tone}>{rule.status}</Badge>
                {!isCandidate ? (
                  <Button
                    variant="secondary"
                    className="!px-3 !py-1.5 !text-xs"
                    onClick={() =>
                      setEditingRuleId(
                        editingRuleId === rule.id ? null : rule.id,
                      )
                    }
                  >
                    {editingRuleId === rule.id
                      ? "Tutup"
                      : "Sahkan / Ubah Status"}
                  </Button>
                ) : (
                  <span className="text-2xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    Standar Resmi
                  </span>
                )}
              </div>

              {editingRuleId === rule.id ? (
                <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
                  <Input
                    label="Nama pengesah (Approver)"
                    value={ruleApprover}
                    onChange={(e) => setRuleApprover(e.target.value)}
                  />
                  <Input
                    label="Referensi regulasi / SK"
                    value={ruleRef}
                    onChange={(e) => setRuleRef(e.target.value)}
                  />
                  <div className="flex items-end gap-2">
                    <Button
                      onClick={() => {
                        updateStandardRule(rule.id, {
                          status: "Terverifikasi internal",
                          tone: "success",
                          approver: ruleApprover,
                          reference: ruleRef,
                        })
                        setEditingRuleId(null)
                      }}
                    >
                      <CheckCircle2 className="size-4" /> Sahkan Verified
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        updateStandardRule(rule.id, {
                          status: "Belum terverifikasi",
                          tone: "warning",
                          approver: ruleApprover,
                          reference: ruleRef,
                        })
                        setEditingRuleId(null)
                      }}
                    >
                      Set Draft
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function AppShell() {
  const { isAuthenticated, toast, clearToast, currentUser, candidates } =
    useApp()
  const [view, setView] = useState<View>(
    currentUser?.role === "candidate" ? "candidate-home" : "overview",
  )
  const [activeStage, setActiveStage] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showAddCandidate, setShowAddCandidate] = useState(false)
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    null,
  )
  const [showGoogleSync, setShowGoogleSync] = useState(false)
  const [showCandidateLogin, setShowCandidateLogin] = useState(false)

  // Security Route Guard: Candidate restricted views
  useEffect(() => {
    if (currentUser?.role === "candidate") {
      const allowedViews: View[] = [
        "candidate-home",
        "candidate-stages",
        "candidate-progress",
        "candidate-ranking",
        "candidate-results",
        "cat-bank",
        "standards",
        "guide",
        "documents",
        "ishihara",
      ]
      if (!allowedViews.includes(view)) {
        setView("candidate-home")
      }
    } else if (
      view === "candidate-home" ||
      view === "candidate-stages" ||
      view === "candidate-progress" ||
      view === "candidate-ranking" ||
      view === "candidate-results"
    ) {
      setView("overview")
    }
  }, [currentUser?.role, view])

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  const handleViewChange = (nextView: View) => {
    setSelectedCandidateId(null)
    setView(nextView)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        view={view}
        onView={handleViewChange}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onOpenGoogleSync={() => setShowGoogleSync(true)}
      />
      <div className="min-w-0 w-full max-w-full overflow-x-clip lg:pl-72">
        <Header
          onMenu={() => setMobileOpen(true)}
          onView={handleViewChange}
          onSelectCandidate={(id) => setSelectedCandidateId(id)}
          onOpenGoogleSync={() => setShowGoogleSync(true)}
        />
        <main className="mx-auto min-w-0 w-full max-w-[100rem] overflow-x-clip px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-3.5 sm:px-5 sm:pt-5 md:px-8 md:pt-8 md:pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-8">
          {selectedCandidateId ? (
            <CandidateDetailView
              candidateId={selectedCandidateId}
              onClose={() => setSelectedCandidateId(null)}
            />
          ) : (
            <>
              {view === "overview" ? (
                <Overview
                  onOpenAddCandidate={() => setShowAddCandidate(true)}
                  onSelectCandidate={(id) => setSelectedCandidateId(id)}
                  onNavigateView={handleViewChange}
                  onNavigateStage={(idx) => {
                    setActiveStage(idx)
                    handleViewChange("stages")
                  }}
                />
              ) : null}
              {view === "candidate-home" ? (
                <CandidateHome onNavigate={handleViewChange} />
              ) : null}
              {view === "candidate-results" ? (
                <CandidateResults onNavigate={handleViewChange} />
              ) : null}
              {view === "candidate-stages" ? <CandidateStages /> : null}
              {view === "candidate-progress" ? <CandidateProgress /> : null}
              {view === "candidate-ranking" ? <CandidateRanking /> : null}
              {view === "sessions" ? (
                <Suspense fallback={<PageLoader />}>
                  <SimulationCenter />
                </Suspense>
              ) : null}
              {view === "guide" ? (
                <Suspense fallback={<PageLoader />}>
                  <GuideView />
                </Suspense>
              ) : null}
              {view === "stages" ? (
                <StagesView
                  activeStage={activeStage}
                  setActiveStage={setActiveStage}
                  onSelectCandidate={(id) => setSelectedCandidateId(id)}
                  onNavigateSessions={() => handleViewChange("sessions")}
                />
              ) : null}
              {view === "candidates" ? (
                <CandidatesView
                  onOpenAddCandidate={() => setShowAddCandidate(true)}
                  onSelectCandidate={(id) => setSelectedCandidateId(id)}
                />
              ) : null}
              {view === "progress" ? (
                currentUser.role === "candidate" ? (
                  <CandidateProgress />
                ) : (
                  <ProgressView
                    onSelectCandidate={(id) => setSelectedCandidateId(id)}
                  />
                )
              ) : null}
              {view === "ranking" ? (
                currentUser.role === "candidate" ? (
                  <CandidateRanking />
                ) : (
                  <RankingView
                    onSelectCandidate={(id) => setSelectedCandidateId(id)}
                  />
                )
              ) : null}
              {view === "standards" ? <StandardsView /> : null}
              {view === "cat-bank" ? (
                currentUser.role === "candidate" &&
                !candidates.some(
                  (candidate) => candidate.id === currentUser.candidateId,
                ) ? (
                  <CandidateProfileMissing />
                ) : (
                  <Suspense fallback={<PageLoader />}>
                    <CatBankView />
                  </Suspense>
                )
              ) : null}
              {view === "documents" ? (
                <Suspense fallback={<PageLoader />}>
                  <DocumentsView />
                </Suspense>
              ) : null}
              {view === "ishihara" ? (
                currentUser.role === "candidate" &&
                !candidates.some(
                  (candidate) => candidate.id === currentUser.candidateId,
                ) ? (
                  <CandidateProfileMissing />
                ) : (
                  <Suspense fallback={<PageLoader />}>
                    <IshiharaView />
                  </Suspense>
                )
              ) : null}
              {view === "users-audit" ? (
                <Suspense fallback={<PageLoader />}>
                  <UsersAuditView onNavigate={handleViewChange} />
                </Suspense>
              ) : null}
            </>
          )}
        </main>
      </div>

      <MobileNav
        view={view}
        onView={handleViewChange}
        onMenu={() => setMobileOpen(true)}
      />

      <CreateCandidateModal
        open={showAddCandidate}
        onClose={() => setShowAddCandidate(false)}
      />

      <CandidateLoginModal
        open={showCandidateLogin}
        onClose={() => setShowCandidateLogin(false)}
        onLoggedIn={() => {
          setSelectedCandidateId(null)
          setView("cat-bank")
        }}
      />

      <GoogleSheetSyncModal
        open={showGoogleSync}
        onClose={() => setShowGoogleSync(false)}
      />

      {toast ? (
        <div className="fixed bottom-20 right-4 z-50 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs font-bold text-white shadow-2xl lg:bottom-6 lg:right-6">
          <CheckCircle2 className="size-4 text-emerald-400" />
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={clearToast}
            className="text-slate-400 hover:text-white"
            aria-label="Tutup notifikasi"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}

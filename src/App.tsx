import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react"
import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpenCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Cloud,
  Download,
  Edit3,
  Eye,
  FileCheck2,
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
  Stethoscope,
  Target,
  Trash2,
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
import { administrationDocuments, fitnessScore, fitnessTables, pbbRubric, pipTopics, tiuTopics } from "./data/selectionGuide"
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

export type View =
  | "overview"
  | "candidate-home"
  | "candidate-stages"
  | "candidate-results"
  | "candidate-progress"
  | "candidate-ranking"
  | "sessions"
  | "guide"
  | "stages"
  | "candidates"
  | "progress"
  | "ranking"
  | "standards"
  | "cat-bank"
  | "documents"
  | "ishihara"
  | "users-audit"

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
      { id: "standards", label: "Standar & kalkulator", icon: SlidersHorizontal },
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
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-amber-400/90 leading-none mt-1">
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
              <p className="px-2.5 pt-2 pb-1 text-[0.62rem] font-bold uppercase tracking-widest text-slate-400">
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
                          className={`text-[0.62rem] px-1.5 py-0.5 rounded-full font-bold tabular-nums tracking-tight ${
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
              <div className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-white leading-tight">
                  {currentUser.name}
                </span>
                <span className="block truncate text-[0.62rem] text-slate-400 leading-tight mt-0.5">
                  Sesi Mandiri Santri
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout()
                  onClose()
                }}
                className="flex items-center gap-1 rounded-lg bg-red-500/10 border border-red-500/20 px-2 py-1 text-[0.68rem] font-bold text-red-400 hover:bg-red-500/20 transition shrink-0"
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
                  <span className="block truncate text-[0.65rem] text-slate-400 leading-tight mt-0.5">
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
                className="flex items-center gap-1 rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-[0.68rem] font-bold text-red-400 hover:bg-red-500/20 transition shrink-0"
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
  } = useApp()
  const [searchQuery, setSearchQuery] = useState("")
  const [showNotif, setShowNotif] = useState(false)
  const [cycleMenuOpen, setCycleMenuOpen] = useState(false)
  const [showNewCycle, setShowNewCycle] = useState(false)
  const [newCycleName, setNewCycleName] = useState("")
  const [newCycleYear, setNewCycleYear] = useState(2027)
  const [newCycleLevel, setNewCycleLevel] =
    useState<"Kabupaten/Kota" | "Provinsi" | "Pusat">("Kabupaten/Kota")
  const cycleMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cycleMenuRef.current && !cycleMenuRef.current.contains(event.target as Node)) {
        setCycleMenuOpen(false)
        setShowNewCycle(false)
      }
    }
    if (cycleMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [cycleMenuOpen])

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

  // CANDIDATE RESTRICTED HEADER
  if (currentUser.role === "candidate") {
    return (
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-xl md:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="!px-2 lg:hidden"
            onClick={onMenu}
            aria-label="Buka navigasi"
          >
            <Menu className="size-5" />
          </Button>
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-950 font-bold shadow-2xs">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Portal Siswa: {currentUser.name}</span>
            <span className="hidden sm:inline text-emerald-700 font-normal">({currentUser.title})</span>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition hover:bg-red-100 shadow-2xs"
          title="Keluar dari sesi ujian santri"
        >
          <LogOut className="size-3.5" />
          <span className="hidden sm:inline">Keluar Sesi Santri</span>
          <span className="sm:hidden">Keluar</span>
        </button>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-30 flex min-w-0 h-16 items-center gap-2 border-b border-slate-200/80 bg-white/90 px-3 backdrop-blur-xl sm:gap-3 sm:px-4 md:gap-4 md:px-6">
      <Button
        variant="ghost"
        className="!px-2 lg:hidden"
        onClick={onMenu}
        aria-label="Buka navigasi"
      >
        <Menu className="size-5" />
      </Button>

      {/* Selector Periode Seleksi / Latihan */}
      <div ref={cycleMenuRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setCycleMenuOpen((v) => !v)}
          className="flex h-9 items-center gap-1.5 sm:gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 shadow-2xs transition hover:bg-slate-50 hover:border-slate-300"
          title="Ubah atau kelola periode seleksi / latihan"
        >
          <CalendarDays className="size-3.5 text-red-600 shrink-0" />
          <span className="font-bold truncate max-w-28 sm:max-w-44 md:max-w-none">
            {activeCycle?.name || "Periode Seleksi"}
          </span>
          <span className="hidden md:inline rounded bg-slate-100 px-1.5 py-0.5 text-[0.62rem] font-bold text-slate-600">
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
                <p className="text-xs font-bold text-slate-900">Periode Seleksi & Latihan</p>
                <p className="text-[0.68rem] text-slate-500">Pilih angkatan aktif atau kelola periode</p>
              </div>
              {currentUser.role === "admin" && (
                <button
                  type="button"
                  onClick={() => setShowNewCycle((v) => !v)}
                  className="flex items-center gap-1 text-[0.7rem] font-bold text-red-600 hover:text-red-700 hover:underline"
                >
                  <Plus className="size-3.5" />
                  <span>{showNewCycle ? "Batal" : "Tambah"}</span>
                </button>
              )}
            </div>

            {showNewCycle ? (
              <form onSubmit={handleCreateCycle} className="border-b border-slate-100 p-3 bg-slate-50/50">
                <p className="text-[0.7rem] font-bold text-slate-700 mb-2">Tambah Periode Baru</p>
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
                      <label className="text-[0.62rem] font-bold text-slate-500 uppercase">Tahun</label>
                      <Input
                        type="number"
                        value={newCycleYear}
                        onChange={(e) => setNewCycleYear(Number(e.target.value))}
                        className="h-8 text-xs bg-white mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[0.62rem] font-bold text-slate-500 uppercase">Tingkat</label>
                      <select
                        value={newCycleLevel}
                        onChange={(e) => setNewCycleLevel(e.target.value as any)}
                        className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:border-slate-300"
                      >
                        <option value="Kabupaten/Kota">Kabupaten/Kota</option>
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
                      isCurrent ? "bg-red-50 text-red-900" : "hover:bg-slate-50 text-slate-800"
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
                          isCurrent ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {c.year}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold truncate ${isCurrent ? "text-red-950" : "text-slate-900"}`}>
                          {c.name}
                        </p>
                        <p className="text-[0.65rem] text-slate-500 truncate">
                          Tingkat {c.level} · {c.status === "active" ? "Aktif" : "Arsip"}
                        </p>
                      </div>
                      {isCurrent ? <CheckCircle2 className="size-4 text-red-600 shrink-0" /> : null}
                    </button>

                    {cycles.length > 1 && currentUser.role === "admin" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(`Hapus periode "${c.name}"? Data di dalamnya akan dibersihkan.`)) {
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

      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-8 text-xs outline-none transition placeholder:text-slate-400 hover:bg-slate-50 focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100"
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
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
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
                        <p className="text-[0.68rem] text-slate-500">
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

      <div className="ml-auto flex items-center gap-2">
        {/* Google Sheet Cloud Status & Sync Control */}
        {googleSheetUrl ? (
          <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-white shadow-2xs text-xs">
            {/* Status Indikator Cloud */}
            <div
              className="flex h-full items-center gap-1.5 px-2.5 font-medium border-r border-slate-200 select-none cursor-default"
              title={
                cloudSyncStatus === "syncing"
                  ? "Sedang menyimpan perubahan ke Google Sheet..."
                  : cloudSyncStatus === "pulling"
                    ? "Sedang memuat data terbaru dari Google Sheet..."
                    : `Tersimpan aman di Google Sheet (Terakhir: ${formatLastSync(lastCloudSync)})`
              }
            >
              {cloudSyncStatus === "syncing" || cloudSyncStatus === "pulling" ? (
                <>
                  <RotateCw className="size-3.5 animate-spin text-blue-600" />
                  <span className="hidden sm:inline text-blue-700">
                    {cloudSyncStatus === "syncing" ? "Menyimpan..." : "Memuat..."}
                  </span>
                </>
              ) : cloudSyncStatus === "error" ? (
                <>
                  <span className="size-2 rounded-full bg-red-500" />
                  <span className="hidden sm:inline text-red-600">Gagal simpan</span>
                </>
              ) : (
                <>
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span className="hidden sm:inline text-slate-700">Google Sheet</span>
                </>
              )}
            </div>

            {/* Tombol Refresh Manual */}
            <button
              type="button"
              onClick={() => refreshAndSync("manual")}
              disabled={cloudSyncStatus === "syncing" || cloudSyncStatus === "pulling"}
              className="flex h-full items-center gap-1.5 px-2.5 font-medium text-slate-700 hover:bg-slate-50 transition border-r border-slate-200 disabled:opacity-50"
              title="Ambil data terbaru dari Google Sheet"
            >
              <RotateCw className="size-3 text-slate-500" />
              <span>Refresh</span>
            </button>

            {/* Modal Pengaturan Sheet */}
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
            className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            title="Hubungkan Google Sheet"
          >
            <Cloud className="size-3.5 text-slate-400" />
            <span className="hidden sm:inline">Hubungkan Sheet</span>
          </button>
        )}

        {/* Notifikasi */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotif((v) => !v)}
            className="relative flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs"
            aria-label="Notifikasi"
          >
            <Bell className="size-4" />
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
                    <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
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

        {/* Status Sesi Mandiri Santri (Hanya jika login sebagai santri) */}
        {currentUser.role === "candidate" && (
          <div
            className="flex h-9 items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 text-xs font-bold text-emerald-800 shadow-2xs"
            title="Sesi Mandiri Santri Aktif"
          >
            <GraduationCap className="size-4 text-emerald-600" />
            <span className="hidden sm:inline">Santri: {currentUser.name.split(" ")[0]}</span>
            <span className="sm:hidden">{currentUser.name.split(" ")[0]}</span>
          </div>
        )}
      </div>
    </header>
  )
}

function MobileNav({
  view,
  onView,
  onMenu,
}: {
  view: View
  onView: (view: View) => void
  onMenu: () => void
}) {
  const { currentUser } = useApp()
  const items = currentUser.role === "candidate"
    ? [
        { id: "candidate-home" as View, label: "Beranda", icon: LayoutDashboard },
        { id: "candidate-stages" as View, label: "Tahap", icon: CheckCircle2 },
        { id: "cat-bank" as View, label: "Ujian CAT", icon: GraduationCap },
        { id: "candidate-progress" as View, label: "Progres", icon: Activity },
      ]
    : [
        { id: "overview" as View, label: "Beranda", icon: LayoutDashboard },
        { id: "sessions" as View, label: "Sesi", icon: ClipboardCheck },
        { id: "stages" as View, label: "Tahap", icon: Settings2 },
        { id: "progress" as View, label: "Progres", icon: Activity },
      ]
  return (
    <nav
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 grid grid-cols-5 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-2xl shadow-slate-900/15 backdrop-blur-xl lg:hidden"
      aria-label="Navigasi mobile"
    >
      {items.map((item) => {
        const Icon = item.icon
        const active = view === item.id
        return (
          <button
            key={item.id}
            onClick={() => onView(item.id)}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[0.64rem] font-bold transition ${
              active ? "bg-red-50 text-red-700" : "text-slate-500"
            }`}
          >
            <Icon className={`size-5 ${active ? "stroke-[2.5]" : ""}`} />
            {item.label}
          </button>
        )
      })}
      <button
        onClick={onMenu}
        className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[0.64rem] font-bold text-slate-500"
      >
        <Menu className="size-5" />
        Lainnya
      </button>
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
      const ratio = (count: number) => totalCandidates > 0 ? Math.round((count / totalCandidates) * 100) : 0
      const average = (values: number[]) => values.length > 0
        ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)
        : null
      const scoreStatus = (scores: Array<number | null>, passingGrade = 70) => {
        const tested = scores.filter((score): score is number => score !== null)
        const passed = tested.filter((score) => score >= passingGrade).length
        return {
          readyCount: tested.length,
          percent: ratio(tested.length),
          statusLabel: `${tested.length}/${totalCandidates}`,
          badgeText: `${passed} mencapai nilai ${passingGrade}`,
          subtext: tested.length ? `Rata-rata ${average(tested)}` : "Belum ada nilai",
          tone: tested.length ? "blue" : "slate",
        }
      }

      // 0: Administrasi
      if (index === 0) {
        const readyCount = candidates.filter(
          (c) => Boolean(c.documents && c.documents.length >= 6 && c.documents.every(Boolean))
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
        const evaluated = candidates.filter((c) => ["passed", "failed"].includes(c.stageStatuses[index]))
        const readyCount = evaluated.filter((c) => c.stageStatuses[index] === "passed").length
        return {
          readyCount: evaluated.length,
          percent: ratio(evaluated.length),
          statusLabel: `${evaluated.length}/${totalCandidates}`,
          badgeText: `${readyCount} memenuhi standar`,
          subtext: evaluated.length ? "Hasil pemeriksaan tercatat" : "Belum ada hasil pemeriksaan",
          tone: "emerald",
        }
      }
      // 4: Parade & Postur Tubuh (PAR)
      if (index === 4) {
        const evaluated = candidates.filter((c) => ["passed", "failed"].includes(c.stageStatuses[index]))
        const readyCount = evaluated.filter((c) => c.stageStatuses[index] === "passed").length
        const percent = ratio(evaluated.length)
        return {
          readyCount: evaluated.length,
          percent,
          statusLabel: `${evaluated.length}/${totalCandidates}`,
          badgeText: `${readyCount} memenuhi standar`,
          subtext: evaluated.length ? "Hasil parade tercatat" : "Belum ada hasil parade",
          tone: "indigo",
        }
      }
      // 5: Drill PBB
      if (index === 5) {
        return scoreStatus(candidates.map((c) => c.pbb), 75)
      }
      // 6: Kesamaptaan Jasmani (SAM)
      if (index === 6) {
        const runValues = candidates.map((c) => {
          const metric = (c.physicalMetrics ?? []).find((item) => item.label.toLowerCase().includes("lari"))
          if (!metric?.current || ["DNF", "Belum diuji", "Belum dicatat", "—"].includes(metric.current)) return null
          const value = Number.parseFloat(metric.current.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, ""))
          return Number.isFinite(value) ? value : null
        }).filter((value): value is number => value !== null)
        const meanRun = average(runValues)
        const maxRun = runValues.length ? Math.max(...runValues).toLocaleString("id-ID") : null
        const percent = ratio(runValues.length)
        return {
          readyCount: runValues.length,
          percent,
          statusLabel: `${runValues.length}/${totalCandidates}`,
          badgeText: maxRun ? `Terjauh ${maxRun} m` : "Belum ada hasil",
          subtext: meanRun ? `Rata-rata ${Number(meanRun).toLocaleString("id-ID")} m` : "Belum ada hasil lari",
          tone: "emerald",
        }
      }
      // 7: Kepribadian & Wawancara (KEP)
      return scoreStatus(candidates.map((c) => c.personality))
    })
  }, [candidates, totalCandidates])

  const overallAvg = useMemo(() => {
    if (stageStats.length === 0) return 0
    return Math.round(stageStats.reduce((sum, stage) => sum + stage.percent, 0) / stageStats.length)
  }, [stageStats])

  return (
    <Card className="overflow-hidden border border-slate-200 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="size-5 text-red-600" />
            <h2 className="font-display text-base sm:text-lg font-bold text-slate-900">
              Progres 8 tahap seleksi
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Dihitung dari nilai, hasil pemeriksaan, dan berkas yang sudah dicatat. Pilih tahap untuk melihat rinciannya.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="size-2 rounded-full bg-blue-600 animate-pulse" />
            Rata-rata progres: {overallAvg}%
          </span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.68rem] text-slate-500">
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-600" />Semua dinilai</span>
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-blue-600" />Sebagian</span>
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-slate-800" />Belum ada hasil</span>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto px-5 py-6 sm:px-6 bg-slate-50/40">
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

            const circleColor = stat.percent >= 100
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
                          stat.percent >= 100 ? "bg-emerald-500" : stat.percent > 0 ? "bg-blue-500" : "bg-slate-400"
                        }`}
                        style={{ width: `${stat.percent}%` }}
                      />
                    </div>
                  </div>

                  <p className="mt-1 text-[0.65rem] font-bold text-slate-600 truncate max-w-[100px]">
                    {stat.badgeText}
                  </p>
                  <p className="text-[0.62rem] text-slate-400 truncate max-w-[100px]">
                    {stat.subtext}
                  </p>
                </button>

                {index < selectionStages.length - 1 ? (
                  <div
                    className="mt-5 h-0.5 flex-1 bg-slate-200"
                  />
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
  progress,
  icon: Icon,
  tone,
  onClick,
}: {
  label: string
  value: string
  detail: string
  badgeText?: string
  badgeTone?: string
  progress?: number
  icon: typeof UsersRound
  tone: string
  onClick?: () => void
}) {
  return (
    <Card
      onClick={onClick}
      className={`p-5 transition ${onClick ? "cursor-pointer hover:border-slate-300 hover:shadow-md" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-600 truncate">{label}</p>
          <p className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <div className={`grid size-11 place-items-center rounded-2xl shrink-0 ${tone}`}>
          <Icon className="size-5" />
        </div>
      </div>
      {badgeText && (
        <div className="mt-2.5">
          <span className={`inline-flex items-center text-[0.68rem] font-bold px-2 py-0.5 rounded-md border ${badgeTone || "bg-slate-100 text-slate-700 border-slate-200"}`}>
            {badgeText}
          </span>
        </div>
      )}
      {typeof progress === "number" && (
        <div className="mt-3">
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>
      )}
      <p className="mt-3 text-xs font-medium text-slate-500 truncate">{detail}</p>
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
  const { candidates, catTryoutAttempts, sessions, records, auditLogs } = useApp()
  const [showFilters, setShowFilters] = useState(false)
  const [search, setSearch] = useState("")
  const [genderFilter, setGenderFilter] = useState<"all" | "Putra" | "Putri">(
    "all",
  )
  const [stageFilter, setStageFilter] = useState<number | "all">("all")
  const [statusFilter, setStatusFilter] = useState<StageStatus | "all">("all")
  const [sortBy, setSortBy] = useState<"number" | "name" | "stage" | "score">(
    "number",
  )

  const progressByCandidate = useMemo(() => {
    return new Map(candidates.map((candidate) => {
      const statuses = getProgressStageStatuses(candidate, catTryoutAttempts, sessions, records)
      const firstIncomplete = statuses.findIndex((status) => status !== "passed")
      return [candidate.id, {
        statuses,
        stageIndex: firstIncomplete === -1 ? statuses.length - 1 : firstIncomplete,
      }] as const
    }))
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
      const attemptTime = Date.parse(latestAttemptByCandidate.get(candidate.id)?.finalizedAt ?? "") || 0
      const recordTime = sessions.reduce((maxTime, session) => {
        const savedAt = records[`${session.id}:${candidate.id}`]?.savedAt
        return Math.max(maxTime, Date.parse(savedAt ?? "") || 0)
      }, 0)
      const auditTime = auditLogs.reduce((maxTime, entry) => {
        const belongsToCandidate =
          entry.target.trim().toLocaleLowerCase() === candidate.name.trim().toLocaleLowerCase() ||
          entry.target.includes(candidate.number) ||
          entry.detail.includes(candidate.number)
        if (!belongsToCandidate) return maxTime
        const timestamp = Date.parse(entry.timestamp.replace(" ", "T")) || 0
        return Math.max(maxTime, timestamp)
      }, 0)
      const candidateTime = Date.parse(candidate.updatedAt) || 0
      latest.set(candidate.id, Math.max(attemptTime, recordTime, auditTime, candidateTime))
    }
    return latest
  }, [candidates, latestAttemptByCandidate, sessions, records, auditLogs])

  const candidateInsightsById = useMemo(() => {
    return new Map(candidates.map((candidate) => {
      const statuses = progressByCandidate.get(candidate.id)?.statuses ?? []
      const completedStages = statuses.filter((status) => status === "passed").length
      const firstActionable = statuses.findIndex((status) => status === "failed" || status === "review")
      const focusStageIndex = firstActionable >= 0
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
      const overallTone = overallStatus === "Lolos"
        ? "success"
        : overallStatus === "Perlu perbaikan" || overallStatus === "Tidak lolos"
          ? "warning"
          : "info"
      const missingDocs = 6 - (candidate.documents ?? []).filter(Boolean).length
      const focusStage = focusStageIndex >= 0 ? selectionStages[focusStageIndex] : null
      const focusStageStatus = focusStageIndex >= 0 ? statuses[focusStageIndex] : null
      const followUp = missingDocs > 0
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
        if (!record?.savedAt || (latestResult && latestResult.time >= time)) continue
        const metricSummary = Object.entries(record.metrics ?? {})
          .filter(([, value]) => value !== "")
          .slice(0, 2)
          .map(([key, value]) => {
            const label: Record<string, string> = {
              distance: "Lari 12 menit",
              pushup: "Push-up",
              situp: "Sit-up",
              backup: "Back-up",
              shuttle: "Shuttle run",
              pip: "PIP",
              tiu: "TIU",
              score: "Nilai",
            }
            const unit = key === "distance" ? " m" : key === "shuttle" ? " dtk" : ""
            return `${label[key] ?? key}: ${value}${unit}`
          })
          .join(" · ")
        latestResult = {
          title: session.title || selectionStages[session.type === "medical" ? 3 : session.type === "parade" ? 4 : session.type === "pbb" ? 5 : session.type === "fitness" ? 6 : 0]?.label || "Sesi latihan",
          detail: metricSummary || (record.result === "passed" ? "Lulus" : record.result === "failed" ? "Tidak lulus" : record.result === "review" ? "Perlu ditinjau" : "Hasil tersimpan"),
          time,
        }
      }
      if (!latestResult && (candidate.pip !== null || candidate.tiu !== null)) {
        latestResult = {
          title: "CAT PIP & TIU",
          detail: `PIP ${candidate.pip ?? "—"} · TIU ${candidate.tiu ?? "—"}`,
          time: 0,
        }
      }

      return [candidate.id, {
        statuses,
        completedStages,
        overallStatus,
        overallTone,
        focusStageIndex,
        focusStatus: focusStageStatus,
        focusLabel: focusStage?.label ?? "Semua tahap selesai",
        followUp,
        latestResult,
      }] as const
    }))
  }, [candidates, progressByCandidate, latestAttemptByCandidate, sessions, records])

  const filtered = useMemo(() => {
    const list = candidates.filter((cand) => {
      const progress = progressByCandidate.get(cand.id)
      const currentStageIndex = progress?.stageIndex ?? 0
      if (genderFilter !== "all" && cand.gender !== genderFilter) return false
      if (stageFilter !== "all" && currentStageIndex + 1 !== stageFilter) return false
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
        return (latestActivityByCandidate.get(b.id) ?? 0) -
          (latestActivityByCandidate.get(a.id) ?? 0)
      }
      if (sortBy === "name") return a.name.localeCompare(b.name)
      if (sortBy === "stage") {
        return (progressByCandidate.get(b.id)?.stageIndex ?? 0) -
          (progressByCandidate.get(a.id)?.stageIndex ?? 0)
      }
      if (sortBy === "score")
        return (finalScore(b) ?? -1) - (finalScore(a) ?? -1)
      return a.number.localeCompare(b.number)
    })
  }, [candidates, progressByCandidate, latestActivityByCandidate, genderFilter, stageFilter, statusFilter, search, sortBy, compact])

  const shown = compact ? filtered.slice(0, 5) : filtered

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            {compact ? "Aktivitas kandidat" : "Daftar kandidat"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {compact
              ? "Pembaruan terbaru lintas tahapan (klik baris untuk evaluasi)"
              : `${filtered.length} dari ${candidates.length} kandidat ditampilkan`}
          </p>
        </div>
        {compact ? (
          <Button variant="secondary" onClick={onViewAll}>
            Lihat semua <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => setShowFilters((v) => !v)}>
            Filter & urutkan <SlidersHorizontal className="size-4" />
          </Button>
        )}
      </div>

      {!compact && showFilters ? (
        <div className="grid gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:grid-cols-2 lg:grid-cols-5 sm:px-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, nomor, sekolah..."
            className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-red-400"
          />
          <select
            value={genderFilter}
            onChange={(e) =>
              setGenderFilter(e.target.value as "all" | "Putra" | "Putri")
            }
            className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-red-400"
          >
            <option value="all">Semua Gender</option>
            <option value="Putra">Putra</option>
            <option value="Putri">Putri</option>
          </select>
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

      <div className="grid divide-y divide-slate-100 md:hidden">
        {shown.map((candidate) => {
          const insight = candidateInsightsById.get(candidate.id)
          const completion = Math.round(((insight?.completedStages ?? 0) / 8) * 100)
          return (
            <button
              key={candidate.id}
              type="button"
              onClick={() => onSelectCandidate(candidate.id)}
              className="grid gap-3 p-4 text-left transition active:bg-slate-50"
            >
              <span className="flex items-center gap-3.5">
                <CandidateAvatar
                  name={candidate.name}
                  avatar={candidate.avatar}
                  photoUrl={candidate.photoUrl}
                  className="size-16 text-sm shrink-0 border border-slate-200 shadow-xs"
                  rounded="rounded-xl"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-900">
                    {candidate.name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                    {candidate.number} · {candidate.school}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-slate-400" />
              </span>
              <span className="flex items-center justify-between gap-3 pl-19">
                <span>
                  <span className="block text-xs font-bold text-slate-700">
                    Progres seleksi · {insight?.completedStages ?? 0}/8 tahap
                  </span>
                  <span className="mt-2 block h-1.5 w-40 max-w-full overflow-hidden rounded-full bg-slate-100">
                    <span className="block h-full rounded-full bg-blue-600" style={{ width: `${completion}%` }} />
                  </span>
                </span>
                <Badge tone={insight?.overallTone ?? "neutral"}>{insight?.overallStatus ?? "Belum dimulai"}</Badge>
              </span>
              <span className="grid gap-1 pl-19 text-xs text-slate-600">
                <span>Fokus: {insight?.focusLabel ?? "—"}</span>
                <span>Hasil terbaru: {insight?.latestResult ? `${insight.latestResult.title} · ${insight.latestResult.detail}` : "Belum ada hasil"}</span>
                <span>Tindak lanjut: {insight?.followUp ?? "—"}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[74rem] text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
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
              const completion = Math.round(((insight?.completedStages ?? 0) / 8) * 100)
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
                      <div className="h-full rounded-full bg-blue-600" style={{ width: `${completion}%` }} />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Badge tone={insight?.overallTone ?? "neutral"}>{insight?.overallStatus ?? "Belum dimulai"}</Badge>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-semibold text-slate-800">
                      {insight?.focusLabel ?? "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {insight?.focusStatus === "review" ? "Perlu penguatan" : insight?.focusStatus === "failed" ? "Tidak memenuhi standar" : insight?.focusStatus === "active" ? "Sedang berlangsung" : insight?.focusStatus === "locked" ? "Belum dimulai" : "Tuntas"}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-semibold text-slate-800">{insight?.latestResult?.title ?? "Belum ada hasil"}</p>
                    {insight?.latestResult ? <p className="mt-0.5 text-xs text-slate-500">{insight.latestResult.detail}</p> : null}
                  </td>
                  <td className="max-w-56 px-4 py-4 text-sm text-slate-600">{insight?.followUp ?? "—"}</td>
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
  const { currentUser, candidates, catTryoutAttempts, sessions, records, schedules } = useApp()
  const candidate = candidates.find((item) => item.id === currentUser.candidateId)

  if (!candidate) {
    return (
      <Card className="p-6">
        <h1 className="font-display text-xl font-bold text-slate-950">Profil kandidat belum tersedia</h1>
        <p className="mt-2 text-sm text-slate-600">Hubungi pelatih untuk memeriksa akun dan data peserta Anda.</p>
      </Card>
    )
  }

  const stageStatuses = getProgressStageStatuses(candidate, catTryoutAttempts, sessions, records)
  const completedStages = stageStatuses.filter((status) => status === "passed").length
  const currentStageIndex = stageStatuses.findIndex((status) => status !== "passed")
  const currentStage = currentStageIndex >= 0 ? selectionStages[currentStageIndex] : null
  const ownAttempts = catTryoutAttempts
    .filter((attempt) => attempt.candidateId === candidate.id || attempt.candidateName.trim().toLocaleLowerCase() === candidate.name.trim().toLocaleLowerCase())
    .slice()
    .sort((a, b) => b.finalizedAt.localeCompare(a.finalizedAt))
  const latestAttempt = ownAttempts[0]
  const upcomingSchedule = schedules
    .filter((schedule) => schedule.assignedCandidateIds?.includes(candidate.id) && schedule.status !== "completed")
    .filter((schedule) => new Date(`${schedule.date}T${schedule.time || "00:00"}`).getTime() >= Date.now())
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0]

  return (
    <div className="grid gap-5">
      <section className="flex flex-col gap-5 rounded-3xl bg-slate-950 p-6 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-center gap-4">
          <CandidateAvatar
            name={candidate.name}
            avatar={candidate.avatar}
            photoUrl={candidate.photoUrl}
            className="size-14 shrink-0 border border-white/15 text-sm shadow-sm"
            rounded="rounded-2xl"
          />
          <div>
            <p className="text-xs font-semibold text-emerald-300">Portal pribadi · {candidate.number}</p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Selamat datang, {candidate.name.split(" ")[0]}
            </h1>
            <p className="mt-1 text-sm text-slate-300">Pantau progres dan selesaikan langkah seleksi berikutnya.</p>
          </div>
        </div>
        <Button onClick={() => onNavigate("cat-bank")} className="!bg-red-600 text-white hover:!bg-red-500">
          <GraduationCap className="size-4" /> Buka latihan CAT
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-3" aria-label="Ringkasan progres pribadi">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">Progres seleksi</p>
              <p className="mt-2 font-display text-2xl font-bold text-slate-950">{completedStages} dari 8 tahap</p>
            </div>
            <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Activity className="size-5" /></span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${Math.round((completedStages / selectionStages.length) * 100)}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">Tahap selesai berdasarkan hasil yang sudah tercatat.</p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold text-slate-500">Fokus berikutnya</p>
          <p className="mt-2 font-display text-xl font-bold text-slate-950">{currentStage?.label ?? "Semua tahap selesai"}</p>
          <div className="mt-3"><StatusBadge status={currentStage ? stageStatuses[currentStageIndex] : "passed"} /></div>
          <p className="mt-3 text-xs text-slate-500">Jika status perlu evaluasi, ikuti arahan pelatih.</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">Hasil CAT terbaru</p>
              {latestAttempt ? (
                <p className="mt-2 font-display text-2xl font-bold text-slate-950">{latestAttempt.combinedScore.toFixed(1)}<span className="ml-1 text-sm font-semibold text-slate-400">/100</span></p>
              ) : (
                <p className="mt-2 font-display text-xl font-bold text-slate-500">Belum ada hasil</p>
              )}
            </div>
            <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-700"><Target className="size-5" /></span>
          </div>
          <button type="button" onClick={() => onNavigate("candidate-results")} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900">
            Lihat hasil &amp; riwayat <ChevronRight className="size-3.5" />
          </button>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {upcomingSchedule ? (
          <Card className="flex items-start gap-4 border-blue-200 bg-blue-50/60 p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-blue-700"><CalendarDays className="size-5" /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-800">Jadwal berikutnya</p>
              <h2 className="mt-1 font-display text-lg font-bold text-slate-950">{upcomingSchedule.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{new Date(`${upcomingSchedule.date}T${upcomingSchedule.time || "00:00"}`).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })} · {upcomingSchedule.location}</p>
            </div>
          </Card>
        ) : (
          <Card className="flex items-start gap-4 p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle2 className="size-5" /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Tidak ada jadwal mendatang</p>
              <p className="mt-1 text-sm text-slate-600">Jadwal akan muncul di sini setelah pelatih menugaskan sesi untuk Anda.</p>
            </div>
          </Card>
        )}
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Akses cepat</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <button type="button" onClick={() => onNavigate("cat-bank")} className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-red-200 hover:bg-red-50/50">
              <GraduationCap className="size-4 text-red-600" /><span className="mt-2 block text-xs font-bold text-slate-800">Latihan CAT</span>
            </button>
            <button type="button" onClick={() => onNavigate("candidate-stages")} className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-amber-200 hover:bg-amber-50/50">
              <CheckCircle2 className="size-4 text-amber-600" /><span className="mt-2 block text-xs font-bold text-slate-800">Semua tahapan</span>
            </button>
            <button type="button" onClick={() => onNavigate("ishihara")} className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/50">
              <Eye className="size-4 text-blue-600" /><span className="mt-2 block text-xs font-bold text-slate-800">Tes buta warna</span>
            </button>
            <button type="button" onClick={() => onNavigate("guide")} className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/50">
              <BookOpenCheck className="size-4 text-emerald-600" /><span className="mt-2 block text-xs font-bold text-slate-800">Buka panduan</span>
            </button>
            <button type="button" onClick={() => onNavigate("candidate-ranking")} className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-violet-200 hover:bg-violet-50/50">
              <Trophy className="size-4 text-violet-600" /><span className="mt-2 block text-xs font-bold text-slate-800">Peringkat saya</span>
            </button>
          </div>
        </Card>
      </section>
    </div>
  )
}

function CandidateStages() {
  const { currentUser, candidates, catTryoutAttempts, sessions, records, ishiharaResults } = useApp()
  const candidate = candidates.find((item) => item.id === currentUser.candidateId)
  if (!candidate) return <Card className="p-6"><p className="text-sm text-slate-600">Profil kandidat belum tersedia.</p></Card>

  const statuses = getProgressStageStatuses(candidate, catTryoutAttempts, sessions, records)
  const ownAttempts = catTryoutAttempts
    .filter((attempt) => attempt.candidateId === candidate.id || attempt.candidateName.trim().toLocaleLowerCase() === candidate.name.trim().toLocaleLowerCase())
    .slice().sort((a, b) => b.finalizedAt.localeCompare(a.finalizedAt))
  const latestAttempt = ownAttempts[0]
  const latestIshihara = ishiharaResults
    .filter((result) => result.participantId === candidate.id)
    .slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const detailForStage = (index: number) => {
    if (index === 0) {
      const valid = (candidate.documents ?? []).filter(Boolean).length
      return `${valid} dari 6 berkas tercatat lengkap`
    }
    if (index === 1) return latestAttempt ? `Nilai terakhir ${latestAttempt.pipScore}/100` : candidate.pip !== null ? `Nilai tercatat ${candidate.pip}/100` : "Hasil PIP belum tersedia"
    if (index === 2) return latestAttempt ? `Nilai terakhir ${latestAttempt.tiuScoreScaled}/100` : candidate.tiu !== null ? `Nilai tercatat ${candidate.tiu}/100` : "Hasil TIU belum tersedia"
    if (index === 3) return latestIshihara ? `Pemeriksaan ${latestIshihara.completionStatus === "completed" ? "selesai" : "belum tuntas"} · ${latestIshihara.selectionDecision === "eligible" ? "memenuhi syarat" : latestIshihara.selectionDecision === "ineligible" ? "perlu tindak lanjut" : "menunggu keputusan"}` : "Hasil pemeriksaan belum tersedia"
    if (index === 4) return candidate.heightCm ? `Tinggi badan tercatat ${candidate.heightCm} cm` : "Data parade belum tersedia"
    if (index === 5) return candidate.pbb !== null ? `Nilai tercatat ${candidate.pbb}/100` : "Hasil PBB belum tersedia"
    if (index === 6) return candidate.fitness !== null ? `Nilai tercatat ${candidate.fitness}/100` : candidate.physicalMetrics?.length ? `${candidate.physicalMetrics.length} catatan kebugaran tersedia` : "Hasil kesamaptaan belum tersedia"
    return candidate.personality !== null ? `Nilai tercatat ${candidate.personality}/100` : "Hasil kepribadian belum tersedia"
  }
  const prepMaterials = [
    <ul className="grid gap-1.5 sm:grid-cols-2">{administrationDocuments.map((doc) => <li key={doc.name}><strong>{doc.name}:</strong> {doc.detail}</li>)}</ul>,
    <ul className="grid gap-1.5 sm:grid-cols-2">{pipTopics.map((topic) => <li key={topic.name}><strong>{topic.name}:</strong> {topic.detail}</li>)}</ul>,
    <ul className="grid gap-1.5 sm:grid-cols-2">{tiuTopics.map(([name, category, detail]) => <li key={name}><strong>{name} · {category}:</strong> {detail}</li>)}</ul>,
    <p>Jaga kebugaran, istirahat cukup, dan ikuti instruksi petugas. Bawa dokumen kesehatan yang diminta panitia. Pemeriksaan dan keputusan resmi hanya dilakukan oleh petugas berwenang.</p>,
    <p>Latih sikap sempurna, postur, kerapian, ketegapan, dan langkah berjalan. Pastikan pakaian dan perlengkapan sesuai arahan panitia.</p>,
    <ul className="grid gap-1.5">{pbbRubric.map(([name, detail]) => <li key={name}><strong>{name}:</strong> {detail}</li>)}</ul>,
    <ul className="grid gap-1.5 sm:grid-cols-2">{Object.entries(fitnessTables).map(([name, rows]) => <li key={name}><strong>{name === "run" ? "Lari 12 menit" : name === "pushup" ? "Push-up" : name === "situp" ? "Sit-up" : name === "backup" ? "Back-up" : "Shuttle run"}:</strong> {rows.slice(0, 4).map(([range, score, grade]) => `${range}: nilai ${score} (${grade})`).join("; ")}</li>)}</ul>,
    <p>Persiapkan komunikasi yang jelas, kerja sama, disiplin, kepemimpinan, dan pengendalian diri. Jawab asesmen dengan jujur dan ikuti arahan pewawancara.</p>,
  ]
  const done = statuses.filter((status) => status === "passed").length

  return <div className="grid gap-5">
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Perjalanan seleksi · {candidate.number}</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-slate-950 sm:text-3xl">Tahapan seleksi saya</h1>
      <p className="mt-1 text-sm text-slate-600">Pantau status dan informasi yang sudah tercatat untuk setiap tahap seleksi.</p>
    </div>
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold text-slate-500">Progres keseluruhan</p><p className="mt-1 font-display text-2xl font-bold">{done} dari 8 tahap selesai</p></div><Badge tone="info">Kandidat: {candidate.name}</Badge></div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.round(done / 8 * 100)}%` }} /></div>
    </Card>
    <div className="grid gap-3 md:grid-cols-2">
      {selectionStages.map((stage, index) => {
        const status = statuses[index] ?? "locked"
        return <Card key={stage.key} className="p-4 sm:p-5">
          <div className="flex items-start gap-3"><span className={`grid size-11 shrink-0 place-items-center rounded-2xl text-xs font-black ${stageTone(status)}`}>{stage.shortLabel}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display font-bold text-slate-950">{stage.id}. {stage.label}</h2><StatusBadge status={status} /></div><p className="mt-1 text-sm text-slate-600">{detailForStage(index)}</p><p className="mt-2 text-xs text-slate-500">{stage.phase === 1 ? "Tahap seleksi awal" : "Tahap lanjutan"}</p></div></div>
          <details className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3"><summary className="cursor-pointer text-xs font-bold text-blue-800">Materi &amp; persiapan tahap ini</summary><div className="mt-3 text-xs leading-relaxed text-slate-600">{prepMaterials[index]}</div></details>
        </Card>
      })}
    </div>
    <p className="text-xs text-slate-500">Status diperbarui berdasarkan hasil dan data yang dicatat pelatih. Jika ada informasi yang belum sesuai, hubungi pelatih Anda.</p>
  </div>
}

function CandidateProgress() {
  const { currentUser, candidates, catTryoutAttempts, sessions, records, ishiharaResults } = useApp()
  const candidate = candidates.find((item) => item.id === currentUser.candidateId)
  if (!candidate) return <Card className="p-6"><p className="text-sm text-slate-600">Profil kandidat belum tersedia.</p></Card>

  const statuses = getProgressStageStatuses(candidate, catTryoutAttempts, sessions, records)
  const completed = statuses.filter((status) => status === "passed").length
  const latestAttempt = catTryoutAttempts
    .filter((attempt) => attempt.candidateId === candidate.id || attempt.candidateName.trim().toLocaleLowerCase() === candidate.name.trim().toLocaleLowerCase())
    .slice().sort((a, b) => b.finalizedAt.localeCompare(a.finalizedAt))[0]
  const attempts = catTryoutAttempts
    .filter((attempt) => attempt.candidateId === candidate.id || attempt.candidateName.trim().toLocaleLowerCase() === candidate.name.trim().toLocaleLowerCase())
    .slice().sort((a, b) => b.finalizedAt.localeCompare(a.finalizedAt))
  const anthropometry = (candidate.anthropometryHistory ?? []).slice().sort((a, b) => b.date.localeCompare(a.date))
  const latestMeasurement = anthropometry[0]
  const height = latestMeasurement?.heightCm ?? candidate.heightCm
  const weight = latestMeasurement?.weightKg ?? candidate.weightKg
  const bmiInfo = bmi(weight ?? 0, height ?? 0)
  const physicalMetrics = candidate.physicalMetrics ?? []
  const metricFor = (term: string) => physicalMetrics.find((metric) => metric.label.toLowerCase().includes(term))
  const fitnessRecords = sessions
    .filter((session) => session.type === "fitness")
    .map((session) => ({ session, record: records[`${session.id}:${candidate.id}`] }))
    .filter((item) => Boolean(item.record?.savedAt))
    .sort((a, b) => (b.record?.savedAt ?? "").localeCompare(a.record?.savedAt ?? ""))
  const latestIshihara = ishiharaResults
    .filter((result) => result.participantId === candidate.id)
    .slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const decisionText = latestIshihara?.selectionDecision === "eligible"
    ? "Memenuhi syarat"
    : latestIshihara?.selectionDecision === "ineligible"
      ? "Perlu tindak lanjut"
      : latestIshihara ? "Menunggu keputusan" : "Belum ada hasil"
  const dataByStage = [
    `${(candidate.documents ?? []).filter(Boolean).length}/6 berkas tercatat lengkap`,
    latestAttempt ? `Nilai terakhir ${latestAttempt.pipScore}/100` : candidate.pip !== null ? `Nilai tercatat ${candidate.pip}/100` : "Belum ada hasil CAT PIP",
    latestAttempt ? `Nilai terakhir ${latestAttempt.tiuScoreScaled}/100` : candidate.tiu !== null ? `Nilai tercatat ${candidate.tiu}/100` : "Belum ada hasil CAT TIU",
    latestIshihara ? decisionText : "Hasil pemeriksaan belum tercatat",
    candidate.heightCm && candidate.weightKg ? `${candidate.heightCm} cm · ${candidate.weightKg} kg` : "Data postur belum tersedia",
    candidate.pbb !== null ? `Nilai tercatat ${candidate.pbb}/100` : "Hasil PBB belum tersedia",
    candidate.physicalMetrics?.length ? candidate.physicalMetrics.map((metric) => `${metric.label}: ${metric.current}`).join(" · ") : candidate.fitness !== null ? `Nilai tercatat ${candidate.fitness}/100` : "Hasil kesamaptaan belum tersedia",
    candidate.personality !== null ? `Nilai tercatat ${candidate.personality}/100` : "Hasil kepribadian belum tersedia",
  ]

  return <div className="grid gap-5 print:bg-white">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-red-600">Rekam perkembangan individual</p><h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Perkembangan saya</h1><p className="mt-1 text-sm text-slate-600">Informasi seleksi pribadi untuk {candidate.name} · {candidate.number}</p></div><Button variant="secondary" onClick={() => window.print()}><Printer className="size-4"/>Cetak ringkasan</Button></div>
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-4 bg-slate-950 p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-4"><CandidateAvatar name={candidate.name} avatar={candidate.avatar} photoUrl={candidate.photoUrl} className="size-16 shrink-0 border border-white/20" rounded="rounded-2xl"/><div><h2 className="font-display text-xl font-bold">{candidate.name}</h2><p className="mt-1 text-sm text-slate-300">{candidate.number} · {candidate.school} · {candidate.gender}</p></div></div>
        <div className="min-w-48"><div className="flex justify-between text-xs"><span className="text-slate-300">Kesiapan seleksi</span><strong className="text-emerald-300">{Math.round(completed / 8 * 100)}%</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.round(completed / 8 * 100)}%` }}/></div><p className="mt-1 text-right text-xs text-slate-300">{completed} dari 8 tahap siap standar</p></div>
      </div>
      <div className="p-4 sm:p-5"><div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">Peta kesiapan 8 tahap seleksi</h2><span className="text-xs text-slate-500">Data akun Anda</span></div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{selectionStages.map((stage, index) => <div key={stage.key} className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-slate-500">{stage.id} · {stage.shortLabel}</span><StatusBadge status={statuses[index] ?? "locked"}/></div><h3 className="mt-2 text-sm font-bold text-slate-900">{stage.label}</h3><p className="mt-1 text-xs leading-relaxed text-slate-600">{dataByStage[index]}</p></div>)}</div></div>
    </Card>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
      ["Administrasi", `${(candidate.documents ?? []).filter(Boolean).length}/6 berkas`],
      ["PIP", latestAttempt ? `${latestAttempt.pipScore}/100` : candidate.pip === null ? "Belum dinilai" : `${candidate.pip}/100`],
      ["TIU", latestAttempt ? `${latestAttempt.tiuScoreScaled}/100` : candidate.tiu === null ? "Belum dinilai" : `${candidate.tiu}/100`],
      ["Status Ishihara", decisionText],
    ].map(([label, value]) => <Card key={label} className="p-4"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 font-display text-lg font-bold text-slate-950">{value}</p></Card>)}</div>
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h2 className="font-display text-lg font-bold text-slate-950">Tracking tinggi badan, berat badan &amp; BMI</h2><p className="mt-1 text-sm text-slate-600">Riwayat pengukuran yang tercatat untuk akun Anda.</p></div><Badge tone="info">{anthropometry.length || (height && weight ? 1 : 0)} pengukuran</Badge></div>
      <div className="grid gap-3 p-4 md:grid-cols-3 sm:p-5">{[
        { label: "Tinggi badan", value: height ? `${height} cm` : "Belum diukur", target: candidate.gender === "Putra" ? "Target 170–180 cm" : "Target 165–175 cm", tone: "bg-blue-500" },
        { label: "Berat badan", value: weight ? `${weight} kg` : "Belum diukur", target: height ? `Rentang proporsional ${(height - 115).toFixed(0)}–${(height - 105).toFixed(0)} kg` : "Target proporsional", tone: "bg-emerald-500" },
        { label: "Indeks Massa Tubuh", value: bmiInfo ? `${bmiInfo.value} kg/m²` : "Belum tersedia", target: bmiInfo ? bmiInfo.category : "Rentang acuan 18,5–24,9", tone: "bg-violet-500" },
      ].map((item) => <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"><p className="text-xs font-bold text-slate-600">{item.label}</p><p className="mt-2 font-display text-2xl font-bold text-slate-950">{item.value}</p><div className={`mt-4 h-1.5 rounded-full ${item.tone}`} /><p className="mt-3 text-xs text-slate-500">{item.target}</p></div>)}</div>
      <div className="overflow-x-auto border-t border-slate-100"><table className="w-full min-w-[38rem] text-left text-sm"><thead className="bg-slate-50 text-[0.68rem] font-bold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Tanggal ukur</th><th className="px-4 py-3">Tinggi</th><th className="px-4 py-3">Berat</th><th className="px-4 py-3">BMI / IMT</th><th className="px-5 py-3">Catatan</th></tr></thead><tbody className="divide-y divide-slate-100">{anthropometry.length ? anthropometry.map((entry) => { const entryBmi = bmi(entry.weightKg, entry.heightCm); return <tr key={entry.id}><td className="px-5 py-3.5 text-slate-600">{entry.date}</td><td className="px-4 py-3.5 font-semibold">{entry.heightCm} cm</td><td className="px-4 py-3.5 font-semibold">{entry.weightKg} kg</td><td className="px-4 py-3.5">{entryBmi ? `${entryBmi.value} (${entryBmi.category})` : "—"}</td><td className="px-5 py-3.5 text-slate-600">{entry.note || "—"}</td></tr> }) : <tr><td colSpan={5} className="px-5 py-7 text-center text-sm text-slate-500">Belum ada riwayat pengukuran tersimpan.</td></tr>}</tbody></table></div>
    </Card>
    <Card className="overflow-hidden"><div className="border-b border-slate-100 px-5 py-4"><div className="flex items-center justify-between gap-3"><div><h2 className="font-display text-lg font-bold text-slate-950">Riwayat CAT PIP &amp; TIU</h2><p className="mt-1 text-sm text-slate-600">Percobaan Anda, dari yang paling baru.</p></div><Badge tone="info">{attempts.length} percobaan</Badge></div></div>{attempts.length ? <div className="overflow-x-auto"><table className="w-full min-w-[42rem] text-left text-sm"><thead className="bg-slate-50 text-[0.68rem] font-bold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Selesai</th><th className="px-4 py-3">Percobaan</th><th className="px-4 py-3">PIP</th><th className="px-4 py-3">TIU</th><th className="px-5 py-3 text-right">Rata-rata</th></tr></thead><tbody className="divide-y divide-slate-100">{attempts.map((attempt) => <tr key={attempt.id}><td className="px-5 py-3.5 text-slate-600">{new Date(attempt.finalizedAt.replace(" ", "T")).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</td><td className="px-4 py-3.5 font-semibold">#{attempt.attemptNumber}</td><td className="px-4 py-3.5 font-semibold">{attempt.pipScore}/100</td><td className="px-4 py-3.5 font-semibold">{attempt.tiuScoreScaled}/100</td><td className="px-5 py-3.5 text-right font-bold text-emerald-700">{attempt.combinedScore.toFixed(1)}</td></tr>)}</tbody></table></div> : <p className="px-5 py-8 text-center text-sm text-slate-500">Belum ada riwayat ujian CAT PIP/TIU untuk akun ini.</p>}</Card>
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h2 className="font-display text-lg font-bold text-slate-950">Tren &amp; rekap kesamaptaan</h2><p className="mt-1 text-sm text-slate-600">Nilai serta catatan sesi kebugaran yang sudah disimpan.</p></div><Badge tone="info">{fitnessRecords.length} sesi tercatat</Badge></div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5 sm:p-5">{[
        ["Lari 12 menit", metricFor("lari")?.current ?? "—", "3000 m"], ["Push-up", metricFor("push")?.current ?? "—", "45 kali"], ["Sit-up", metricFor("sit")?.current ?? "—", "40 kali"], ["Back-up", metricFor("back")?.current ?? "—", "50 kali"], ["Shuttle run", metricFor("shuttle")?.current ?? "—", "15,4 dtk"],
      ].map(([label, value, target]) => <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"><p className="text-xs font-bold text-slate-700">{label}</p><p className="mt-2 font-display text-xl font-bold text-slate-950">{value}</p><p className="mt-3 border-t border-slate-200 pt-2 text-xs text-slate-500">Target acuan: {target}</p></div>)}</div>
      <div className="flex items-center justify-between gap-3 border-y border-slate-100 bg-emerald-50/60 px-5 py-3"><span className="text-sm font-semibold text-slate-700">Nilai kesamaptaan terakhir</span><strong className="font-display text-lg text-emerald-800">{candidate.fitness === null ? "Belum dinilai" : `${candidate.fitness}/100`}</strong></div>
      {fitnessRecords.length ? <div className="overflow-x-auto"><table className="w-full min-w-[42rem] text-left text-sm"><thead className="bg-slate-50 text-[0.68rem] font-bold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Tanggal &amp; sesi</th><th className="px-4 py-3">Lari</th><th className="px-4 py-3">Push-up</th><th className="px-4 py-3">Sit-up</th><th className="px-4 py-3">Back-up</th><th className="px-5 py-3">Shuttle run</th></tr></thead><tbody className="divide-y divide-slate-100">{fitnessRecords.map(({ session, record }) => <tr key={session.id}><td className="px-5 py-3.5"><p className="font-semibold text-slate-800">{session.title}</p><p className="text-xs text-slate-500">{record?.savedAt?.slice(0, 10)}</p></td><td className="px-4 py-3.5">{record?.metrics.distance || "—"}</td><td className="px-4 py-3.5">{record?.metrics.pushup || "—"}</td><td className="px-4 py-3.5">{record?.metrics.situp || "—"}</td><td className="px-4 py-3.5">{record?.metrics.backup || "—"}</td><td className="px-5 py-3.5">{record?.metrics.shuttle || "—"}</td></tr>)}</tbody></table></div> : <p className="px-5 py-7 text-center text-sm text-slate-500">Belum ada riwayat sesi kesamaptaan.</p>}
    </Card>
    <p className="text-xs text-slate-500">Nilai dan status ditampilkan dari hasil yang dicatat panitia. Kandidat tidak dapat mengubah hasil atau catatan seleksi.</p>
  </div>
}

function CandidateRanking() {
  return <RankingView onSelectCandidate={() => undefined} />
}

function CandidateProfileMissing() {
  return <Card className="p-6"><h1 className="font-display text-xl font-bold text-slate-950">Profil santri belum terhubung</h1><p className="mt-2 text-sm text-slate-600">Tes belum dapat dibuka karena akun ini belum terhubung ke nomor peserta. Minta pelatih memeriksa profil akun Anda.</p></Card>
}

function CandidateResults({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { currentUser, candidates, catTryoutAttempts } = useApp()
  const candidate = candidates.find((item) => item.id === currentUser.candidateId)
  const attempts = catTryoutAttempts
    .filter((attempt) => attempt.candidateId === candidate?.id || attempt.candidateName.trim().toLocaleLowerCase() === candidate?.name.trim().toLocaleLowerCase())
    .slice()
    .sort((a, b) => b.finalizedAt.localeCompare(a.finalizedAt))

  if (!candidate) {
    return <Card className="p-6"><p className="text-sm text-slate-600">Profil kandidat belum tersedia.</p></Card>
  }

  const latest = attempts[0]
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Ruang pribadi · {candidate.number}</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-slate-950 sm:text-3xl">Hasil &amp; riwayat</h1>
          <p className="mt-1 text-sm text-slate-600">Hanya hasil ujian Anda yang ditampilkan di halaman ini.</p>
        </div>
        <Button variant="secondary" onClick={() => onNavigate("cat-bank")}><GraduationCap className="size-4" /> Buka CAT</Button>
      </div>

      {latest ? (
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Percobaan terbaru · #{latest.attemptNumber}</p>
              <p className="mt-1 text-sm text-slate-600">{new Date(latest.finalizedAt.replace(" ", "T")).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}</p>
            </div>
            <Badge tone={latest.pipStatus === "passed" && latest.tiuStatus === "passed" ? "success" : "warning"}>
              {latest.pipStatus === "passed" && latest.tiuStatus === "passed" ? "Lulus PIP & TIU" : "Perlu tindak lanjut"}
            </Badge>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">Nilai PIP</p><p className="mt-1 font-display text-2xl font-bold text-slate-950">{latest.pipScore}<span className="ml-1 text-sm text-slate-400">/100</span></p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">Nilai TIU</p><p className="mt-1 font-display text-2xl font-bold text-slate-950">{latest.tiuScoreScaled}<span className="ml-1 text-sm text-slate-400">/100</span></p></div>
            <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-semibold text-emerald-800">Rata-rata</p><p className="mt-1 font-display text-2xl font-bold text-emerald-800">{latest.combinedScore.toFixed(1)}<span className="ml-1 text-sm text-emerald-700/60">/100</span></p></div>
          </div>
        </Card>
      ) : (
        <Card className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-950">Belum ada hasil CAT</h2>
            <p className="mt-1 text-sm text-slate-600">Hasil akan tampil di sini setelah Anda menyelesaikan sesi PIP dan TIU.</p>
          </div>
          <Button onClick={() => onNavigate("cat-bank")}><GraduationCap className="size-4" /> Mulai tryout CAT</Button>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-display text-base font-bold text-slate-950">Riwayat percobaan</h2>
          <p className="mt-1 text-xs text-slate-500">Percobaan terbaru ditampilkan lebih dahulu.</p>
        </div>
        {attempts.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-left text-sm">
              <thead className="bg-slate-50 text-[0.68rem] font-bold uppercase tracking-wide text-slate-500">
                <tr><th className="px-5 py-3">Tanggal</th><th className="px-4 py-3">Percobaan</th><th className="px-4 py-3">PIP</th><th className="px-4 py-3">TIU</th><th className="px-5 py-3 text-right">Rata-rata</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td className="px-5 py-3.5 text-slate-600">{new Date(attempt.finalizedAt.replace(" ", "T")).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="px-4 py-3.5 font-semibold">#{attempt.attemptNumber}</td>
                    <td className="px-4 py-3.5 font-semibold tabular-nums">{attempt.pipScore} <span className="text-xs font-normal text-slate-400">· {attempt.pipStatus === "passed" ? "Lulus" : "Belum lulus"}</span></td>
                    <td className="px-4 py-3.5 font-semibold tabular-nums">{attempt.tiuScoreScaled} <span className="text-xs font-normal text-slate-400">· {attempt.tiuStatus === "passed" ? "Lulus" : "Belum lulus"}</span></td>
                    <td className="px-5 py-3.5 text-right font-bold tabular-nums text-emerald-700">{attempt.combinedScore.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Riwayat ujian Anda akan muncul di sini.</p>
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

  const hasRecordedTest = (candidate: Candidate) => {
    const hasScore = [candidate.pip, candidate.tiu, candidate.pbb, candidate.personality]
      .some((score) => score !== null)
      || (candidate.fitness !== null && candidate.fitness > 0)
    const hasPhysicalResult = (candidate.physicalMetrics ?? []).some((metric) =>
      Boolean(metric.current)
      && !["Belum diuji", "Belum dicatat", "—"].includes(metric.current),
    )
    return hasScore || hasPhysicalResult
  }
  const candidatesWithTests = candidates.filter(hasRecordedTest).length
  const attentionStage = selectionStages.slice(1).map((stage) => {
    const index = stage.id - 1
    const assigned = candidates.filter((candidate) => candidate.stage === stage.id)
    const pending = assigned.filter((candidate) => candidate.stageStatuses[index] !== "passed")
    const failed = pending.filter((candidate) => candidate.stageStatuses[index] === "failed").length
    const needsReview = pending.filter((candidate) => candidate.stageStatuses[index] === "review").length
    return {
      stage,
      index,
      pendingCount: pending.length,
      priority: failed * 3 + needsReview * 2 + (pending.length - failed - needsReview),
    }
  }).sort((a, b) => b.priority - a.priority)[0]
  // Perlu Atensi / Sesi Susulan
  const susulanCandidates = useMemo(() => {
    return candidates.flatMap((c) => {
      const note = (c.coachNote || "").toLowerCase()
      const runM = (c.physicalMetrics ?? []).find((pm) => pm.label.toLowerCase().includes("lari"))
      const isDnf = (runM && runM.current === "DNF") || note.includes("dnf")
      const noRun = !runM || !runM.current || runM.current === "Belum diuji" || runM.current === "Belum dicatat" || runM.current === "—"
      const attendanceNote = ["izin", "sakit", "alpa"].find((word) => note.includes(word))
      const statuses = getProgressStageStatuses(c, catTryoutAttempts, sessions, records)
      const reviewStages = statuses
        .slice(1)
        .map((status, idx) => ({ status, stage: selectionStages[idx + 1] }))
        .filter(({ status }) => status === "failed" || status === "review")
        .map(({ stage }) => stage.shortLabel)
      const needsReview = reviewStages.length > 0
      if (!isDnf && !noRun && !attendanceNote && !needsReview) return []

      const reason = isDnf
        ? "DNF · tes lari perlu diulang"
        : attendanceNote
          ? `Tidak hadir (${attendanceNote}) · perlu dijadwalkan ulang`
          : noRun
            ? "Belum ada hasil tes lari"
            : `Perlu penguatan: ${reviewStages.join(", ")}`
      return [{ candidate: c, runM, isDnf, noRun, attendanceNote, reviewStages, reason }]
    })
  }, [candidates, catTryoutAttempts, sessions, records])

  const dnfCount = susulanCandidates.filter((c) => {
    return c.isDnf
  }).length
  const untestedCount = susulanCandidates.filter((c) => c.noRun && !c.isDnf).length
  const needsReviewCount = susulanCandidates.filter((c) => c.reviewStages.length > 0).length
  const followUpSummary = [
    dnfCount > 0 ? `${dnfCount} DNF` : null,
    untestedCount > 0 ? `${untestedCount} belum tes` : null,
    needsReviewCount > 0 ? `${needsReviewCount} perlu evaluasi` : null,
  ].filter(Boolean).join(" · ") || "Tidak ada catatan"

  // Compare every available numeric result on the same 0–100 scale; use completed stages to break ties.
  const topPerformers = useMemo(() => {
    return [...candidates]
      .map((candidate) => {
        const statuses = getProgressStageStatuses(candidate, catTryoutAttempts, sessions, records)
        const normalizedName = candidate.name.trim().toLocaleLowerCase()
        const latestAttempt = catTryoutAttempts
          .filter((attempt) => attempt.candidateId === candidate.id || attempt.candidateName.trim().toLocaleLowerCase() === normalizedName)
          .sort((a, b) => b.finalizedAt.localeCompare(a.finalizedAt))[0]
        const latestSessionScore = (type: "pip" | "tiu") => sessions
          .filter((session) => session.type === type)
          .map((session) => {
            const record = records[`${session.id}:${candidate.id}`]
            if (!record?.savedAt) return null
            const rawScore = record.metrics.score !== undefined && record.metrics.score !== ""
              ? Number(record.metrics.score)
              : record.metrics.correct !== undefined && record.metrics.correct !== ""
                ? Number(record.metrics.correct) * 2
                : null
            return rawScore !== null && Number.isFinite(rawScore)
              ? { score: rawScore, time: Date.parse(record.savedAt) || 0 }
              : null
          })
          .filter((entry): entry is { score: number; time: number } => entry !== null)
          .sort((a, b) => b.time - a.time)[0]?.score
        const pipScore = latestAttempt?.pipScore ?? candidate.pip ?? latestSessionScore("pip")
        const tiuScore = latestAttempt?.tiuScoreScaled ?? candidate.tiu ?? latestSessionScore("tiu")
        const values = [
          pipScore,
          tiuScore,
          candidate.pbb,
          candidate.fitness,
          candidate.personality,
        ].filter((value): value is number => typeof value === "number" && Number.isFinite(value))
        const score = values.length
          ? Number((values.reduce((total, value) => total + value, 0) / values.length).toFixed(1))
          : null
        const completedStages = statuses.filter((status) => status === "passed").length
        const hasResult = score !== null || statuses.some((status) => status === "review" || status === "failed") || (candidate.documents ?? []).some(Boolean)
        return { candidate, statuses, score, scoreCount: values.length, completedStages, hasResult, pipScore, tiuScore }
      })
      .sort((a, b) => {
        if (a.hasResult !== b.hasResult) return a.hasResult ? -1 : 1
        return (b.score ?? -1) - (a.score ?? -1) ||
          b.completedStages - a.completedStages ||
          a.candidate.number.localeCompare(b.candidate.number)
      })
  }, [candidates, catTryoutAttempts, sessions, records])

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-6 rounded-2xl bg-slate-900 p-6 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            {activeCycle.name} · {activeCycle.level} · MA Mu'allimin Yogyakarta
          </p>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Selamat datang, {currentUser.name.split(" ")[0]}
          </h1>
          <p className="mt-2 text-sm text-slate-300">Pantau progres latihan dan hasil tes santri dari satu tempat.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            onClick={() => onNavigateView("sessions")}
            className="!border-white/20 !bg-white/5 !text-white hover:!bg-white/10"
          >
            <ClipboardCheck className="size-4" /> Jadwal latihan
          </Button>
          <Button
            onClick={onOpenAddCandidate}
            className="!bg-red-600 text-white hover:!bg-red-500"
          >
            <UserRoundCheck className="size-4" /> Tambah santri
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Santri aktif"
          value={`${totalCount} santri`}
          detail="Jumlah santri dalam angkatan latihan aktif."
          icon={UsersRound}
          tone="bg-blue-50 text-blue-700"
          onClick={() => onNavigateView("candidates")}
        />
        <StatCard
          label="Cakupan hasil tes"
          value={`${candidatesWithTests} / ${totalCount} santri`}
          detail="Santri yang sudah memiliki hasil tes, dibandingkan total santri aktif."
          icon={Activity}
          tone="bg-blue-50 text-blue-700"
          onClick={() => onNavigateView("stages")}
        />
        <StatCard
          label="Tahap perlu perhatian"
          value={attentionStage?.priority ? attentionStage.stage.shortLabel : "—"}
          badgeText={attentionStage?.priority ? `${attentionStage.pendingCount} belum tuntas` : "Semua tahap tuntas"}
          badgeTone="bg-amber-50 text-amber-800 border-amber-200"
          detail={attentionStage?.priority ? attentionStage.stage.label : "Belum ada tahap yang perlu ditindaklanjuti."}
          icon={Target}
          tone="bg-indigo-50 text-indigo-700"
          onClick={() => attentionStage?.priority && onNavigateStage(attentionStage.index)}
        />
        <StatCard
          label="Tindak lanjut"
          value={`${susulanCandidates.length} santri`}
          badgeText={followUpSummary}
          badgeTone="bg-amber-50 text-amber-800 border-amber-200"
          detail="Periksa catatan dan jadwalkan tes susulan"
          icon={AlertTriangle}
          tone="bg-amber-50 text-amber-700"
        />
      </div>

      {/* Peta Kesiapan 8 Materi Latihan */}
      <StagePipeline onSelectStage={onNavigateStage} />

      {/* Dua Kartu Aksi Cepat: Kandidat Unggulan & Atensi Sesi Susulan */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6 flex flex-col justify-between border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                  <Trophy className="size-4" />
                </span>
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Peringkat kesiapan santri
                  </h2>
                  <p className="text-xs text-slate-500">
                    Rerata nilai dan progres singkat; rincian tiap tahap ada di pemeringkatan lengkap
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                {topPerformers.length} santri
              </span>
            </div>

            <div className="mt-3.5 divide-y divide-slate-100">
              {topPerformers.map((entry, idx) => {
                const { candidate: cand, score, scoreCount, completedStages } = entry
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
                        <p className="truncate text-[0.68rem] text-slate-400">
                          {cand.number} · {score === null ? "Belum ada nilai angka" : `Rerata ${score.toFixed(1)}/100 dari ${scoreCount} nilai`} · {completedStages}/8 tahap lulus
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
              className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center justify-center gap-1 w-full py-1.5 transition"
            >
              Lihat pemeringkatan lengkap <ChevronRight className="size-3.5" />
            </button>
          </div>
        </Card>

        <Card className="p-5 sm:p-6 flex flex-col justify-between border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertTriangle className="size-4" />
                </span>
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Perlu tindak lanjut
                  </h2>
                  <p className="text-xs text-slate-500">
                    Tes lari belum tercatat, DNF, absen, atau nilai perlu penguatan
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-800 shrink-0">
                {susulanCandidates.length} Santri
              </span>
            </div>

            <div className="mt-3.5 divide-y divide-slate-100">
              {susulanCandidates.map(({ candidate: cand, isDnf, noRun, attendanceNote, reason }) => {
                const statusLabel = isDnf
                  ? "Tes lari ulang"
                  : attendanceNote
                    ? "Jadwalkan ulang"
                    : noRun
                      ? "Belum tes"
                      : "Penguatan"

                const statusTone = isDnf
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"

                return (
                  <div
                    key={cand.id}
                    className="flex items-center justify-between gap-3 py-3 rounded-xl px-2 hover:bg-slate-50 transition"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectCandidate(cand.id)}
                      className="flex items-center gap-2.5 min-w-0 text-left flex-1"
                    >
                      <CandidateAvatar
                        name={cand.name}
                        avatar={cand.avatar}
                        photoUrl={cand.photoUrl}
                        className="size-10 shrink-0 border border-slate-200 text-xs font-bold"
                        rounded="rounded-xl"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900 hover:text-red-600 transition">
                          {cand.name}
                        </p>
                        <p className="mt-0.5 text-[0.68rem] text-slate-500">
                          {cand.number} · {reason}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`rounded-md border px-2 py-0.5 text-[0.68rem] font-bold ${statusTone}`}>
                        {statusLabel}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onSelectCandidate(cand.id)}
                        className="text-[0.68rem] py-1 px-2.5 h-7 font-bold gap-1"
                      >
                        <Edit3 className="size-3" /> Catat
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Tinjau alasan dan jadwalkan tindak lanjut
            </p>
            <button
              type="button"
              onClick={() => onNavigateView("sessions")}
              className="text-xs font-bold text-slate-900 hover:text-red-600 flex items-center gap-1 transition"
            >
              Lihat jadwal <ChevronRight className="size-3.5" />
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

  const putraCount = candidates.filter((c) => c.gender === "Putra").length
  const putriCount = candidates.filter((c) => c.gender === "Putri").length
  const completeProfileCount = candidates.filter(
    (c) => (c.documents ?? []).filter(Boolean).length === 6,
  ).length

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
        const gender =
          cols[1]?.toLowerCase() === "putri" ? "Putri" : "Putra" as const
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
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-red-600">
            {activeCycle.name} · {activeCycle.level}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-950">
            Kandidat
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Kelola profil, status tahap, impor/ekspor CSV, dan kelengkapan
            berkas kandidat.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCsvFileChange}
          />
          <Button
            variant="secondary"
            onClick={downloadCandidateTemplateCsv}
            title="Unduh contoh format CSV untuk impor"
          >
            <Download className="size-4" /> Template CSV
          </Button>
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-4" /> Impor CSV
          </Button>
          <Button
            variant="secondary"
            onClick={() => exportCandidatesCsv(candidates)}
          >
            <Download className="size-4" /> Ekspor CSV
          </Button>
          <Button onClick={onOpenAddCandidate}>
            <UserRoundCheck className="size-4" /> Tambah kandidat
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Putra"
          value={String(putraCount)}
          detail={`${
            candidates.length
              ? Math.round((putraCount / candidates.length) * 100)
              : 0
          }% dari total kandidat`}
          icon={UsersRound}
          tone="bg-blue-50 text-blue-700"
        />
        <StatCard
          label="Putri"
          value={String(putriCount)}
          detail={`${
            candidates.length
              ? Math.round((putriCount / candidates.length) * 100)
              : 0
          }% dari total kandidat`}
          icon={UsersRound}
          tone="bg-violet-50 text-violet-700"
        />
        <StatCard
          label="Berkas 6/6 lengkap"
          value={String(completeProfileCount)}
          detail={`${candidates.length - completeProfileCount} kandidat perlu dilengkapi`}
          icon={FileCheck2}
          tone="bg-emerald-50 text-emerald-700"
        />
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
      badge: docs === 6 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200",
    }
  }
  if (stageIdx === 1) {
    return {
      primary: cand.pip !== null ? `${cand.pip} Poin` : "Belum Tes",
      secondary: cand.pip !== null ? (cand.pip >= 70 ? "Memenuhi PG (≥70)" : "Di bawah PG (<70)") : "Passing Grade 70",
      badge: cand.pip !== null ? (cand.pip >= 70 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200") : "bg-slate-100 text-slate-600 border-slate-200",
    }
  }
  if (stageIdx === 2) {
    return {
      primary: cand.tiu !== null ? `${cand.tiu} Poin` : "Belum Tes",
      secondary: cand.tiu !== null ? (cand.tiu >= 70 ? "Memenuhi PG (≥70)" : "Di bawah PG (<70)") : "Passing Grade 70",
      badge: cand.tiu !== null ? (cand.tiu >= 70 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200") : "bg-slate-100 text-slate-600 border-slate-200",
    }
  }
  if (stageIdx === 3) {
    const isReady = cand.stageStatuses[3] === "passed"
    return {
      primary: isReady ? "Memenuhi Standar" : cand.stageStatuses[3] === "review" ? "Perlu Konsul Medis" : "Evaluasi Medis",
      secondary: "Tensi & 21 Anamnesis",
      badge: isReady ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200",
    }
  }
  if (stageIdx === 4) {
    const candBmi = cand.heightCm && cand.weightKg ? bmi(cand.weightKg, cand.heightCm) : null
    return {
      primary: cand.heightCm ? `${cand.heightCm} cm / ${cand.weightKg ?? "—"} kg` : "Belum Ukur",
      secondary: candBmi ? `BMI ${candBmi.value} (${candBmi.label})` : "Antropometri Postur",
      badge: candBmi?.status === "ideal" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-700 border-slate-200",
    }
  }
  if (stageIdx === 5) {
    return {
      primary: cand.pbb !== null ? `Nilai ${cand.pbb}` : "Belum Dinilai",
      secondary: "Statis, Dinamis & Komando (Bobot 30%)",
      badge: cand.pbb !== null && cand.pbb >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200",
    }
  }
  if (stageIdx === 6) {
    const runMetric = (cand.physicalMetrics ?? []).find((m) => m.label.toLowerCase().includes("lari"))
    return {
      primary: cand.fitness !== null ? `Skor ${cand.fitness}` : runMetric?.current ? `Lari ${runMetric.current}` : "Belum Dinilai",
      secondary: runMetric ? `Target: ${runMetric.target}` : "5 Parameter Kesamaptaan",
      badge: cand.fitness !== null && cand.fitness >= 75 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200",
    }
  }
  if (stageIdx === 7) {
    return {
      primary: cand.personality !== null ? `Nilai ${cand.personality}` : "Belum Wawancara",
      secondary: "STAR, Integritas & Bakat (Bobot 40%)",
      badge: cand.personality !== null && cand.personality >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200",
    }
  }
  return { primary: "—", secondary: "", badge: "bg-slate-100 text-slate-600 border-slate-200" }
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
    <div className="grid gap-6">
      {/* Header Halaman */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
              <Target className="size-3.5" />
              Evaluasi Per Materi
            </span>
            <span className="text-xs text-slate-400">· 8 Tahap Standar BPIP</span>
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
            Kesiapan Tahapan Seleksi
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl">
            Pantau target kelayakan materi, evaluasi kesiapan 13 santri binaan, dan checklist tugas pembina.
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
                  className={`grid size-6 place-items-center rounded-lg text-[0.68rem] font-bold ${
                    isCurrent
                      ? "bg-red-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 group-hover:bg-slate-200"
                  }`}
                >
                  {index + 1}
                </span>
                <span
                  className={`text-[0.62rem] font-bold px-1.5 py-0.5 rounded-md tabular-nums ${
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
              <p className="text-[0.62rem] text-slate-400 truncate mt-0.5">
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
                          Tahap {stage.id} · {stage.phase === 1 ? "Kualifikasi Dasar" : "Uji Lapangan"}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-600">
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
                  <p className="text-[0.68rem] font-bold text-emerald-800 uppercase">Siap Standar</p>
                  <p className="font-display text-lg sm:text-xl font-bold text-emerald-900 mt-0.5 tabular-nums">
                    {passed} <span className="text-xs font-normal text-emerald-700">santri</span>
                  </p>
                </div>
                <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-2.5 text-center">
                  <p className="text-[0.68rem] font-bold text-blue-800 uppercase">Sedang Dilatih</p>
                  <p className="font-display text-lg sm:text-xl font-bold text-blue-900 mt-0.5 tabular-nums">
                    {attention} <span className="text-xs font-normal text-blue-700">santri</span>
                  </p>
                </div>
                <div className="rounded-xl bg-red-50/60 border border-red-100 p-2.5 text-center">
                  <p className="text-[0.68rem] font-bold text-red-800 uppercase">Perlu Remedial</p>
                  <p className="font-display text-lg sm:text-xl font-bold text-red-900 mt-0.5 tabular-nums">
                    {failedCount} <span className="text-xs font-normal text-red-700">santri</span>
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
                    <p className="text-[0.68rem] text-slate-500">
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
                        onChange={() => toggleStageChecklist(activeStage, index)}
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

              <div className="mt-3 pt-3 border-t border-slate-100 text-[0.68rem] text-slate-400">
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
                  Menampilkan {visibleCandidates.length} dari {candidates.length} santri binaan MA Mu'allimin
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
                  <tr className="bg-slate-50/70 text-[0.68rem] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                    <th className="px-5 py-3">Santri</th>
                    <th className="px-4 py-3">Capaian / Data Riil</th>
                    <th className="px-4 py-3">Status Kesiapan</th>
                    <th className="px-5 py-3 text-right">Aksi Evaluasi 1-Klik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleCandidates.length ? (
                    visibleCandidates.map((candidate) => {
                      const status = candidate.stageStatuses[activeStage]
                      const metric = getCandidateStageMetric(candidate, activeStage)
                      return (
                        <tr key={candidate.id} className="hover:bg-slate-50/70 transition">
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
                                <p className="text-[0.68rem] text-slate-500">
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
                              <span className="text-[0.68rem] text-slate-500">
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
                                  updateCandidateStage(candidate.id, activeStage, "passed")
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
                                  updateCandidateStage(candidate.id, activeStage, "review")
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
                                  updateCandidateStage(candidate.id, activeStage, "failed")
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
                      <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500">
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
                Pantau seluruh santri lintas 8 materi. Klik kolom atau santri untuk beralih ke materi tersebut.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <span className="grid size-4 place-items-center rounded bg-emerald-100 text-emerald-800 font-bold text-[0.6rem]">✓</span>
                Siap
              </span>
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <span className="grid size-4 place-items-center rounded bg-amber-100 text-amber-800 font-bold text-[0.6rem]">!</span>
                Penguatan
              </span>
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <span className="grid size-4 place-items-center rounded bg-red-100 text-red-800 font-bold text-[0.6rem]">✕</span>
                Remedial
              </span>
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <span className="grid size-4 place-items-center rounded bg-slate-100 text-slate-500 font-bold text-[0.6rem]">⏳</span>
                Berjalan
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 text-[0.68rem] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
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
                      <div className="font-normal text-[0.62rem] text-slate-500 truncate max-w-20 mx-auto">
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
                    <tr key={cand.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 font-bold text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-100">
                        <button
                          type="button"
                          onClick={() => onSelectCandidate(cand.id)}
                          className="flex items-center gap-2 hover:text-red-600 text-left truncate max-w-48"
                        >
                          <span className="grid size-6 place-items-center rounded bg-slate-900 text-[0.62rem] font-bold text-white shrink-0">
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
                              {isPassed ? "✓" : isReview ? "!" : isFailed ? "✕" : "⏳"}
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
  const [selectedId, setSelectedId] = useState(candidates[0]?.id ?? "")
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

  const candidate =
    candidates.find((item) => item.id === selectedId) ?? candidates[0]

  if (!candidate) {
    return (
      <Card className="p-8 text-center text-sm text-slate-500">
        Belum ada kandidat pada periode ini.
      </Card>
    )
  }

  const currentIndex = candidates.findIndex((c) => c.id === candidate.id)

  const handlePrev = () => {
    if (currentIndex > 0) {
      setSelectedId(candidates[currentIndex - 1].id)
    } else {
      setSelectedId(candidates[candidates.length - 1].id)
    }
  }

  const handleNext = () => {
    if (currentIndex < candidates.length - 1) {
      setSelectedId(candidates[currentIndex + 1].id)
    } else {
      setSelectedId(candidates[0].id)
    }
  }

  const docsValidCount = (candidate.documents ?? []).filter(Boolean).length
  const docsPercent = Math.round((docsValidCount / 6) * 100)

  const isPutri = candidate.gender === "Putri"
  const existingMetrics = candidate.physicalMetrics ?? []

  const parseMetricNum = (str: string | undefined): number | null => {
    if (!str) return null
    if (str.trim().toUpperCase() === "DNF") return 0
    const cleaned = str.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "")
    const val = parseFloat(cleaned)
    return isNaN(val) ? null : val
  }

  const findMetric = (term: string) => {
    return existingMetrics.find((m) =>
      m.label.toLowerCase().includes(term.toLowerCase()) &&
      m.current &&
      m.current !== "Belum dicatat" &&
      m.current !== "Belum diuji" &&
      m.current !== "—"
    )
  }

  const runItem = findMetric("lari")
  const pushupItem = findMetric("push")
  const situpItem = findMetric("sit")
  const backupItem = findMetric("back")
  const shuttleItem = findMetric("shuttle")

  const runVal = parseMetricNum(runItem?.current)
  const pushVal = parseMetricNum(pushupItem?.current)
  const sitVal = parseMetricNum(situpItem?.current)
  const backVal = parseMetricNum(backupItem?.current)
  const shuttleVal = parseMetricNum(shuttleItem?.current)

  const handleOpenSamaptaModal = () => {
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
    const runTarget = isPutri ? 2600 : 3000
    const pushTarget = isPutri ? 35 : 45
    const sitTarget = isPutri ? 38 : 40
    const backTarget = isPutri ? 40 : 50
    const shuttleTarget = isPutri ? 17.0 : 15.4

    const fRun = samaptaForm.run.trim() !== "" ? parseFloat(samaptaForm.run) : null
    const fPush = samaptaForm.pushup.trim() !== "" ? parseFloat(samaptaForm.pushup) : null
    const fSit = samaptaForm.situp.trim() !== "" ? parseFloat(samaptaForm.situp) : null
    const fBack = samaptaForm.backup.trim() !== "" ? parseFloat(samaptaForm.backup) : null
    const fShuttle = samaptaForm.shuttle.trim() !== "" ? parseFloat(samaptaForm.shuttle.replace(",", ".")) : null

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

    const newFitness = testedScores.length > 0
      ? Number((testedScores.reduce((a, b) => a + b, 0) / testedScores.length).toFixed(1))
      : null

    updateCandidate(candidate.id, {
      physicalMetrics: newMetrics,
      fitness: newFitness,
    })
    setIsEditingSamapta(false)
  }

  const defaultPhysicalList = [
    {
      key: "run" as const,
      label: "Lari 12 Menit",
      category: "Samapta A",
      isPrimary: true,
      current: runItem ? runItem.current : null,
      target: isPutri ? "2.600 m" : "3.000 m",
      score: runVal !== null ? fitnessScore("run", runVal) : null,
      percent: runVal !== null ? Math.min(100, Math.round((runVal / (isPutri ? 2600 : 3000)) * 100)) : null,
    },
    {
      key: "pushup" as const,
      label: "Push-up (1 Menit)",
      category: "Samapta B",
      isPrimary: false,
      current: pushupItem ? pushupItem.current : null,
      target: isPutri ? "35 kali" : "45 kali",
      score: pushVal !== null ? fitnessScore("pushup", pushVal) : null,
      percent: pushVal !== null ? Math.min(100, Math.round((pushVal / (isPutri ? 35 : 45)) * 100)) : null,
    },
    {
      key: "situp" as const,
      label: "Sit-up (1 Menit)",
      category: "Samapta B",
      isPrimary: false,
      current: situpItem ? situpItem.current : null,
      target: isPutri ? "38 kali" : "40 kali",
      score: sitVal !== null ? fitnessScore("situp", sitVal) : null,
      percent: sitVal !== null ? Math.min(100, Math.round((sitVal / (isPutri ? 38 : 40)) * 100)) : null,
    },
    {
      key: "backup" as const,
      label: "Back-up (1 Menit)",
      category: "Samapta B",
      isPrimary: false,
      current: backupItem ? backupItem.current : null,
      target: isPutri ? "40 kali" : "50 kali",
      score: backVal !== null ? fitnessScore("backup", backVal) : null,
      percent: backVal !== null ? Math.min(100, Math.round((backVal / (isPutri ? 40 : 50)) * 100)) : null,
    },
    {
      key: "shuttle" as const,
      label: "Shuttle Run (6×10m)",
      category: "Samapta B",
      isPrimary: false,
      current: shuttleItem ? shuttleItem.current : null,
      target: isPutri ? "17,0 dtk" : "15,4 dtk",
      score: shuttleVal !== null ? fitnessScore("shuttle", shuttleVal) : null,
      percent: shuttleVal !== null && shuttleVal > 0 ? Math.min(100, Math.round(((isPutri ? 17.0 : 15.4) / shuttleVal) * 100)) : null,
    },
  ]

  const formRunVal = samaptaForm.run.trim() !== "" ? parseFloat(samaptaForm.run) : null
  const formPushVal = samaptaForm.pushup.trim() !== "" ? parseFloat(samaptaForm.pushup) : null
  const formSitVal = samaptaForm.situp.trim() !== "" ? parseFloat(samaptaForm.situp) : null
  const formBackVal = samaptaForm.backup.trim() !== "" ? parseFloat(samaptaForm.backup) : null
  const formShuttleVal = samaptaForm.shuttle.trim() !== "" ? parseFloat(samaptaForm.shuttle.replace(",", ".")) : null

  const modalScores: number[] = []
  if (formRunVal !== null && !isNaN(formRunVal)) modalScores.push(fitnessScore("run", formRunVal))
  if (formPushVal !== null && !isNaN(formPushVal)) modalScores.push(fitnessScore("pushup", formPushVal))
  if (formSitVal !== null && !isNaN(formSitVal)) modalScores.push(fitnessScore("situp", formSitVal))
  if (formBackVal !== null && !isNaN(formBackVal)) modalScores.push(fitnessScore("backup", formBackVal))
  if (formShuttleVal !== null && !isNaN(formShuttleVal)) modalScores.push(fitnessScore("shuttle", formShuttleVal))

  const modalCompositeScore = modalScores.length > 0
    ? (modalScores.reduce((a, b) => a + b, 0) / modalScores.length).toFixed(1)
    : null

  const development = {
    attendance: candidate.attendance ?? 0,
    training: candidate.trainingCompliance ?? 0,
    documents: docsPercent,
    note:
      candidate.coachNote ??
      "Belum ada catatan pelatih. Lengkapi penilaian sesi atau tambahkan catatan evaluasi kandidat.",
    physical: defaultPhysicalList,
  }

  const progressStatuses = getProgressStageStatuses(
    candidate,
    catTryoutAttempts,
    sessions,
    records,
  )
  const passedCount = progressStatuses.filter(
    (status) => status === "passed",
  ).length
  const completion = Math.round((passedCount / selectionStages.length) * 100)
  const examScores = [
    { label: "PIP", value: candidate.pip, target: 70 },
    { label: "TIU", value: candidate.tiu, target: 70 },
    { label: "PBB", value: candidate.pbb, target: 80 },
    { label: "Samapta", value: candidate.fitness, target: 80 },
    { label: "Kepribadian", value: candidate.personality, target: 80 },
  ]

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-red-600">
            Rekam perkembangan individual
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
              Perkembangan santri
            </h1>

            {/* Navigasi Santri Bersih: Dropdown 1-klik + tombol panah Sebelumnya / Berikutnya */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
              <button
                type="button"
                onClick={handlePrev}
                className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                title="Santri sebelumnya"
              >
                <ChevronLeft className="size-4" />
              </button>

              <select
                value={candidate.id}
                onChange={(e) => setSelectedId(e.target.value)}
                className="h-8 max-w-[15rem] sm:max-w-[20rem] truncate rounded-lg border-0 bg-transparent px-2 text-xs sm:text-sm font-bold text-slate-900 outline-none cursor-pointer"
              >
                {candidates.map((c, i) => (
                  <option key={c.id} value={c.id}>
                    {i + 1}. {c.name} ({c.number})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleNext}
                className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                title="Santri berikutnya"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Santri ke-{currentIndex + 1} dari {candidates.length} santri aktif · MA Mu&apos;allimin Yogyakarta
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => onSelectCandidate(candidate.id)}
          >
            <Edit3 className="size-4" /> Edit nilai & catatan
          </Button>
          <Button
            variant="secondary"
            onClick={() => printCandidateReport(candidate, activeCycle.year)}
          >
            <Printer className="size-4" /> Unduh / cetak laporan
          </Button>
        </div>
      </div>

      {/* Banner Profil & Stepper Alur 8 Materi (Fully Responsive, No Cutoff!) */}
      <Card className="overflow-hidden">
        <div className="bg-slate-950 p-5 sm:p-6 text-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <CandidateAvatar
                name={candidate.name}
                avatar={candidate.avatar}
                photoUrl={candidate.photoUrl}
                className="size-24 sm:size-28 md:size-32 font-display text-2xl sm:text-3xl border-2 border-white/20 shadow-xl shadow-red-950/40 shrink-0"
                rounded="rounded-2xl"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
                    {candidate.name}
                  </h2>
                  <Badge
                    tone={
                      candidate.stageStatuses.includes("failed")
                        ? "danger"
                        : "success"
                    }
                  >
                    {candidate.stageStatuses.includes("failed")
                      ? "Perlu Pembinaan Khusus"
                      : "Aktif"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-slate-400">
                  {candidate.number} · {candidate.school} · {candidate.gender}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-3 sm:border-t-0 sm:pt-0">
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center min-w-24">
                <p className="text-[0.65rem] font-semibold text-slate-400 uppercase tracking-wider">
                  Fisik (TB/BB)
                </p>
                <p className="mt-0.5 text-xs font-bold text-white">
                  {candidate.heightCm ?? "—"} cm · {candidate.weightKg ?? "—"} kg
                </p>
              </div>

              <div className="min-w-36 flex-1 sm:flex-initial">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-400">Tingkat kesiapan</span>
                  <span className="text-emerald-300 font-bold">{completion}%</span>
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
        <div className="border-t border-slate-100 bg-slate-50/60 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Peta Kesiapan 8 Materi Latihan
            </p>
            <span className="text-xs font-semibold text-slate-500">
              {passedCount} dari {selectionStages.length} materi siap standar
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {selectionStages.map((stage, index) => {
              const status = progressStatuses[index] ?? "locked"
              const isPassed = status === "passed"
              const isFailed = status === "failed"
              const isReview = status === "review"
              return (
                <div
                  key={stage.key}
                  className={`flex flex-col justify-between rounded-xl border p-2.5 text-center transition ${
                    isPassed
                      ? "border-emerald-200 bg-emerald-50/60 shadow-2xs"
                      : isReview
                        ? "border-amber-200 bg-amber-50/60"
                        : isFailed
                          ? "border-red-200 bg-red-50/60"
                          : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`grid size-6 place-items-center rounded-full text-[0.68rem] font-bold ${
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
                      className={`text-[0.62rem] font-bold uppercase tracking-wider ${
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
                    className="mt-2 line-clamp-1 text-xs font-bold text-slate-800"
                    title={stage.label}
                  >
                    {stage.label}
                  </p>
                  <p className="mt-0.5 text-[0.65rem] font-medium text-slate-400">
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

      <div className="grid gap-6">

        <Card className="overflow-hidden border border-slate-200 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white p-5 sm:p-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-red-100 text-red-600">
                  <Activity className="size-4" />
                </span>
                <h2 className="font-display text-base sm:text-lg font-bold text-slate-900">
                  Rekap Uji Kesamaptaan Jasmani (BPIP)
                </h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Standar Nilai 100: Lari 3.000m · Push-up 45x · Sit-up 40x · Back-up 50x · Shuttle 15,4s
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {candidate.fitness !== null && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-950">
                  <span className="text-[0.68rem] font-bold uppercase text-emerald-700">Rata-rata:</span>
                  <span className="font-display font-black text-sm text-emerald-800">{candidate.fitness}</span>
                  <span className="text-xs text-emerald-600">/ 100</span>
                </div>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleOpenSamaptaModal}
                className="gap-1.5 text-xs font-bold"
              >
                <Edit3 className="size-3.5" /> Catat / Edit Nilai
              </Button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 bg-white">
            {defaultPhysicalList.map((metric) => {
              const isRecorded = metric.current !== null && metric.current !== "Belum dicatat" && metric.current !== "Belum diuji"
              return (
                <div
                  key={metric.key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50/70 transition-colors"
                >
                  {/* Left: Kategori & Nama Uji */}
                  <div className="flex items-center gap-3 sm:w-1/3 min-w-0">
                    <span
                      className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                        metric.isPrimary
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {metric.category}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{metric.label}</p>
                      <p className="text-[0.68rem] text-slate-400">Target 100: <strong className="text-slate-600">{metric.target}</strong></p>
                    </div>
                  </div>

                  {/* Middle: Capaian & Nilai BPIP */}
                  <div className="flex items-center gap-5 sm:w-1/3">
                    <div>
                      <span className="text-[0.62rem] uppercase font-bold text-slate-400 block">Hasil</span>
                      {isRecorded ? (
                        <span className="font-display text-sm font-bold text-slate-900">
                          {metric.current}
                        </span>
                      ) : (
                        <span className="font-sans text-xs italic text-slate-400">
                          Belum diuji
                        </span>
                      )}
                    </div>

                    <div className="pl-4 border-l border-slate-100">
                      <span className="text-[0.62rem] uppercase font-bold text-slate-400 block">Poin BPIP</span>
                      {isRecorded && metric.score !== null ? (
                        <span className={`text-xs font-bold ${metric.score >= 85 ? "text-emerald-600" : metric.score >= 70 ? "text-blue-600" : "text-amber-600"}`}>
                          {metric.score} Poin
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </div>

                  {/* Right: Progress Bar & Status */}
                  <div className="flex items-center justify-end gap-3 sm:w-1/3">
                    {isRecorded && metric.percent !== null ? (
                      <div className="w-full max-w-[140px] space-y-1">
                        <div className="flex justify-between text-[0.68rem]">
                          <span className="text-slate-400">Kesiapan</span>
                          <span className="font-bold text-slate-700">{metric.percent}%</span>
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
                            style={{ width: `${Math.min(100, metric.percent)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[0.68rem] font-medium text-slate-400 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-md">
                        Menunggu Pengujian
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer note */}
          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span className="text-[0.72rem]">
              Passing grade kelulusan jasmani BPIP: <strong className="text-slate-700">Rata-rata &ge; 75.0</strong>.
            </span>
            <span className="text-[0.68rem] text-slate-400">
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
                    {candidate.name} ({candidate.number} · {candidate.gender})
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
                  <p className="text-[0.68rem] text-slate-400">
                    Target nilai 100: {isPutri ? "2.600 m" : "3.000 m"}
                  </p>
                  <input
                    type="number"
                    step="10"
                    placeholder={isPutri ? "Target 2.600 m" : "Target 3.000 m"}
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
                    <p className="text-[0.68rem] text-slate-400">
                      Target: {isPutri ? "35 kali" : "45 kali"}
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
                    <p className="text-[0.68rem] text-slate-400">
                      Target: {isPutri ? "38 kali" : "40 kali"}
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
                    <p className="text-[0.68rem] text-slate-400">
                      Target: {isPutri ? "40 kali" : "50 kali"}
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
                    <p className="text-[0.68rem] text-slate-400">
                      Target: {isPutri ? "17,0 dtk" : "15,4 dtk"}
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

      <div className="grid gap-6 md:grid-cols-3">
        {[
          ["Kehadiran latihan", development.attendance, CalendarDays],
          ["Kepatuhan program", development.training, ClipboardCheck],
          ["Kelengkapan berkas (6 dokumen)", development.documents, FileCheck2],
        ].map(([label, value, Icon]) => {
          const MetricIcon = Icon as typeof CalendarDays
          return (
            <Card className="p-5" key={label as string}>
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-700">
                  <MetricIcon className="size-5" />
                </span>
                <span className="font-display text-2xl font-bold text-slate-950">
                  {value as number}%
                </span>
              </div>
              <p className="mt-4 text-sm font-bold text-slate-800">
                {label as string}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-red-500"
                  style={{ width: `${value as number}%` }}
                />
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="border-blue-200 bg-blue-50 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white">
              <GraduationCap className="size-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                Catatan pelatih
              </p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-blue-950">
                {development.note}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={() => onSelectCandidate(candidate.id)}
          >
            Ubah catatan
          </Button>
        </div>
      </Card>
    </div>
  )
}

function RankingView({
  onSelectCandidate,
}: {
  onSelectCandidate: (candidateId: string) => void
}) {
  const { candidates, rankingPublished, setRankingPublished, currentUser } =
    useApp()
  const [genderFilter, setGenderFilter] = useState<"all" | "Putra" | "Putri">(
    "all",
  )
  const [searchQuery, setSearchQuery] = useState("")

  const ranked = useMemo(
    () =>
      candidates
        .filter((c) => genderFilter === "all" || c.gender === genderFilter)
        .filter((candidate) => evaluateRankingAnthropometry(candidate).status === "eligible")
        .map((candidate) => ({ candidate, score: finalScore(candidate) }))
        .filter(
          (item): item is { candidate: Candidate, score: number } =>
            item.score !== null && item.score > 0,
        )
        .sort(compareRankedCandidates),
    [candidates, genderFilter],
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
          (genderFilter === "all" || c.gender === genderFilter) &&
          (evaluateRankingAnthropometry(c).status !== "eligible" ||
            finalScore(c) === null ||
            (finalScore(c) ?? 0) <= 0),
      ),
    [candidates, genderFilter],
  )

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-red-600">
            Simulasi &amp; Evaluasi Latihan · MA Mu'allimin Yogyakarta
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-950">
            Pemeringkatan sementara latihan
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Peringkat dinamis berbasis capaian nilai latihan yang sudah tercatat.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {currentUser.role === "admin" ? (
            <Button
              variant={rankingPublished ? "danger" : "primary"}
              onClick={() => setRankingPublished(!rankingPublished)}
            >
              <ShieldCheck className="size-4" />{" "}
              {rankingPublished
                ? "Tarik Publikasi Hasil"
                : "Publikasikan Hasil Sementara"}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => exportRankingCsv(ranked)}>
            <Download className="size-4" /> Ekspor rekap CSV
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Leaderboard kesiapan sementara
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredRanked.length} santri aktif
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau nomor..."
                className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-8 text-xs placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
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

            <div className="flex gap-1.5">
              {(["all", "Putra", "Putri"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGenderFilter(g)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                    genderFilter === g
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {g === "all" ? "Semua Gender" : g}
                </button>
              ))}
            </div>
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
                      <p className="truncate text-sm font-bold text-slate-900">
                        {candidate.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {candidate.number} · {candidate.gender}
                        {candidate.heightCm ? ` · ${candidate.heightCm} cm` : ""}
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
            <thead className="bg-slate-50/70 text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
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
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">
                    Tidak ada santri yang sesuai dengan filter pencarian "{searchQuery}".
                  </td>
                </tr>
              ) : (
                filteredRanked.map(({ candidate, score }) => {
                  const actualRank =
                    ranked.findIndex((r) => r.candidate.id === candidate.id) + 1
                  return (
                    <tr
                      key={candidate.id}
                      onClick={currentUser.role === "candidate" ? undefined : () => onSelectCandidate(candidate.id)}
                      className={currentUser.role === "candidate" ? "transition" : "cursor-pointer transition hover:bg-slate-50/80"}
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
                            <span className="mt-1 block text-[0.68rem] text-slate-500">
                              BMI {bmi(candidate.weightKg, candidate.heightCm)?.value ?? "—"}
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
                          <span className="text-xs font-normal text-slate-400">Belum diisi</span>
                        )}
                      </td>

                      {/* Samapta (30%) */}
                      <td className="px-4 py-4 text-sm font-semibold tabular-nums text-slate-800">
                        {candidate.fitness !== null ? (
                          candidate.fitness.toFixed(1)
                        ) : (
                          <span className="text-xs font-normal text-slate-400">Belum diisi</span>
                        )}
                      </td>

                      {/* Kepribadian (40%) */}
                      <td className="px-4 py-4 text-sm font-semibold tabular-nums text-slate-800">
                        {candidate.personality !== null ? (
                          candidate.personality.toFixed(1)
                        ) : (
                          <span className="text-xs font-normal text-slate-400">Belum diisi</span>
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
              Peringkat hanya menampilkan santri dengan tinggi minimal 170 cm, BMI normal (18,5–24,9), dan nilai latihan tercatat.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {unranked.map((cand) => {
              const anthropometry = evaluateRankingAnthropometry(cand)
              const reason = anthropometry.status !== "eligible"
                ? anthropometry.reason
                : cand.coachNote || "Belum ada catatan nilai dari sesi latihan sebelumnya"

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
                  <Badge tone={anthropometry.status === "failed" ? "danger" : "warning"}>
                    {anthropometry.status === "failed" ? "Tidak memenuhi syarat" : "Perlu data/nilai"}
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
  const { standardRules, updateStandardRule, currentUser } = useApp()
  const [birthDate, setBirthDate] = useState("2009-08-18")
  const [weight, setWeight] = useState(64)
  const [height, setHeight] = useState(174)
  const [runDist, setRunDist] = useState(2850)
  const [pushup, setPushup] = useState(39)
  const [situp, setSitup] = useState(37)
  const [backup, setBackup] = useState(41)
  const [shuttle, setShuttle] = useState(16.0)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [ruleApprover, setRuleApprover] = useState(currentUser.name)
  const [ruleRef, setRuleRef] = useState("SK Panitia Internal 2026")

  const age = ageOnReferenceDate(birthDate, 2026)
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
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-semibold text-red-600">Governance standar</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-950">
          Standar & kalkulator
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Uji kalkulator presisi usia, BMI/IMT, dan konversi Samapta, serta
          sahkan register aturan seleksi.
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
                Acuan 17 Agustus 2026
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
                <Button
                  variant="secondary"
                  className="!px-3 !py-1.5 !text-xs"
                  onClick={() =>
                    setEditingRuleId(editingRuleId === rule.id ? null : rule.id)
                  }
                >
                  {editingRuleId === rule.id ? "Tutup" : "Sahkan / Ubah Status"}
                </Button>
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
  const { isAuthenticated, toast, clearToast, currentUser, candidates } = useApp()
  const [view, setView] = useState<View>(currentUser?.role === "candidate" ? "candidate-home" : "overview")
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
      const allowedViews: View[] = ["candidate-home", "candidate-stages", "candidate-progress", "candidate-ranking", "candidate-results", "cat-bank", "guide", "documents", "ishihara"]
      if (!allowedViews.includes(view)) {
        setView("candidate-home")
      }
    } else if (view === "candidate-home" || view === "candidate-stages" || view === "candidate-progress" || view === "candidate-ranking" || view === "candidate-results") {
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
      <div className="min-w-0 lg:pl-72">
        <Header
          onMenu={() => setMobileOpen(true)}
          onView={handleViewChange}
          onSelectCandidate={(id) => setSelectedCandidateId(id)}
          onOpenGoogleSync={() => setShowGoogleSync(true)}
        />
        <main className="mx-auto min-w-0 max-w-[100rem] px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-5 sm:pt-5 md:px-8 md:pt-8 md:pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-8">
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
                currentUser.role === "candidate" ? <CandidateProgress /> : <ProgressView
                  onSelectCandidate={(id) => setSelectedCandidateId(id)}
                />
              ) : null}
              {view === "ranking" ? (
                currentUser.role === "candidate" ? <CandidateRanking /> : <RankingView
                  onSelectCandidate={(id) => setSelectedCandidateId(id)}
                />
              ) : null}
              {view === "standards" ? <StandardsView /> : null}
              {view === "cat-bank" ? (
                currentUser.role === "candidate" && !candidates.some((candidate) => candidate.id === currentUser.candidateId)
                  ? <CandidateProfileMissing />
                  : <Suspense fallback={<PageLoader />}><CatBankView /></Suspense>
              ) : null}
              {view === "documents" ? (
                <Suspense fallback={<PageLoader />}>
                  <DocumentsView />
                </Suspense>
              ) : null}
              {view === "ishihara" ? (
                currentUser.role === "candidate" && !candidates.some((candidate) => candidate.id === currentUser.candidateId)
                  ? <CandidateProfileMissing />
                  : <Suspense fallback={<PageLoader />}><IshiharaView /></Suspense>
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

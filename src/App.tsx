import { lazy, Suspense, useMemo, useRef, useState } from "react"
import {
  Activity,
  Bell,
  BookOpenCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Cloud,
  Download,
  Edit3,
  FileCheck2,
  FileSpreadsheet,
  GraduationCap,
  HeartPulse,
  LayoutDashboard,
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
import { Badge, Button, Card, Input } from "./components/ui"
import { AppProvider, useApp } from "./context/AppContext"
import { fitnessScore } from "./data/selectionGuide"
import {
  ageOnReferenceDate,
  bmi,
  compareRankedCandidates,
  finalScore,
  getQuotaBand,
  isPhaseOnePassed,
  selectionStages,
  type Candidate,
  type StageStatus,
} from "./domain/selection"
import {
  CandidateDetailModal,
  CreateCandidateModal,
} from "./features/candidates/CandidateModal"
import CandidateProjection from "./features/progress/CandidateProjection"
import {
  LoginScreen,
  UsersAndAuditModal,
} from "./features/users/UsersAndAuditModal"
import { GoogleSheetSyncModal } from "./components/GoogleSheetSyncModal"
import { formatLastSync } from "./lib/googleSheetSync"
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
const SchedulesView = lazy(() => import("./features/schedules/SchedulesView"))
const CatBankView = lazy(() => import("./features/cat/CatBankView"))
const DocumentsView = lazy(() => import("./features/documents/DocumentsView"))

export type View = "overview" | "sessions" | "guide" | "stages" | "candidates" | "progress" | "ranking" | "standards" | "schedules" | "cat-bank" | "documents"

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
    title: "1. Pendidikan & Latihan",
    items: [
      { id: "overview", label: "Ringkasan", icon: LayoutDashboard },
      { id: "sessions", label: "Sesi & latihan", icon: ClipboardCheck },
      { id: "candidates", label: "Kandidat", icon: UsersRound, hasCount: true },
      { id: "progress", label: "Perkembangan", icon: Activity },
      { id: "schedules", label: "Jadwal latihan", icon: CalendarDays },
      { id: "cat-bank", label: "Bank soal CAT", icon: GraduationCap },
    ],
  },
  {
    title: "2. Seleksi",
    items: [
      { id: "stages", label: "Tahapan seleksi", icon: Settings2 },
      { id: "ranking", label: "Pemeringkatan", icon: Trophy },
      { id: "standards", label: "Standar & kalkulator", icon: SlidersHorizontal },
    ],
  },
  {
    title: "3. Panduan",
    items: [
      { id: "guide", label: "Panduan lengkap", icon: BookOpenCheck },
      { id: "documents", label: "Dokumen & regulasi", icon: FileCheck2 },
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
    passed: "Lolos",
    active: "Aktif",
    locked: "Terkunci",
    failed: "Gugur",
    review: "Ditinjau",
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
    <div className="flex items-center gap-3">
      <img
        src="/BACAPASMUIN.webp"
        alt="BACAPASMUIN!"
        className="h-11 w-auto object-contain drop-shadow"
      />
      <div>
        <p className="font-display text-base font-bold tracking-tight text-white">
          BACAPASMUIN!
        </p>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-amber-400/90">
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
  onOpenUsersModal,
}: {
  view: View
  onView: (view: View) => void
  mobileOpen: boolean
  onClose: () => void
  onOpenGoogleSync?: () => void
  onOpenUsersModal?: () => void
}) {
  const {
    currentUser,
    candidates,
    cycles,
    activeCycle,
    setActiveCycleId,
    addCycle,
    deleteCycle,
  } = useApp()
  const [cycleMenuOpen, setCycleMenuOpen] = useState(false)
  const [showNewCycle, setShowNewCycle] = useState(false)
  const [newCycleName, setNewCycleName] = useState("")
  const [newCycleYear, setNewCycleYear] = useState(2027)
  const [newCycleLevel, setNewCycleLevel] =
    useState<"Kabupaten/Kota" | "Provinsi" | "Pusat">("Kabupaten/Kota")

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
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-y-auto bg-slate-950 px-4 py-5 text-white transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-2">
          <Brand />
          <Button
            variant="ghost"
            className="!px-2 text-slate-300 lg:hidden"
            onClick={onClose}
            aria-label="Tutup menu"
          >
            <X className="size-5" />
          </Button>
        </div>

        <div className="relative mt-6">
          <button
            type="button"
            onClick={() => setCycleMenuOpen((v) => !v)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-left transition hover:bg-white/[0.1]"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Periode aktif
            </p>
            <div className="mt-1.5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{activeCycle.name}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {cycles.length ? activeCycle.level : "Klik untuk buat periode"}
                </p>
              </div>
              <ChevronDown
                className={`size-4 text-slate-400 transition ${
                  cycleMenuOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {cycleMenuOpen ? (
            <div className="mt-2 rounded-2xl border border-white/15 bg-slate-900 p-2 shadow-xl">
              {cycles.length ? (
                <div className="grid gap-1">
                  {cycles.map((c) => (
                    <div
                      key={c.id}
                      className={`flex items-center gap-1 rounded-xl pr-1 transition ${
                        c.id === activeCycle.id
                          ? "bg-red-600 text-white"
                          : "text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCycleId(c.id)
                          setCycleMenuOpen(false)
                        }}
                        className="flex flex-1 items-center justify-between px-3 py-2 text-left text-xs font-semibold"
                      >
                        <span className="truncate">
                          {c.name} · {c.level}
                        </span>
                        {c.id === activeCycle.id ? (
                          <CheckCircle2 className="size-3.5 shrink-0" />
                        ) : null}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteCycle(c.id)
                        }}
                        title={`Hapus periode ${c.name}`}
                        aria-label={`Hapus periode ${c.name}`}
                        className={`rounded-lg p-1.5 transition ${
                          c.id === activeCycle.id
                            ? "text-red-100 hover:bg-red-700 hover:text-white"
                            : "text-slate-400 hover:bg-red-500/20 hover:text-red-300"
                        }`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-3 py-2 text-xs text-slate-400">
                  Belum ada periode terdaftar.
                </p>
              )}
              {!showNewCycle ? (
                <button
                  type="button"
                  onClick={() => setShowNewCycle(true)}
                  className="mt-1.5 flex w-full items-center gap-1.5 rounded-xl border border-dashed border-white/20 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-white/5"
                >
                  <Plus className="size-3.5" /> Buat periode baru
                </button>
              ) : (
                <form
                  onSubmit={handleCreateCycle}
                  className="mt-2 grid gap-2 border-t border-white/10 pt-2"
                >
                  <input
                    value={newCycleName}
                    onChange={(e) => setNewCycleName(e.target.value)}
                    placeholder="Nama periode (mis. Seleksi 2026)..."
                    className="rounded-lg border border-white/20 bg-slate-950 px-2.5 py-1.5 text-xs text-white outline-none"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="number"
                      value={newCycleYear}
                      onChange={(e) => setNewCycleYear(Number(e.target.value))}
                      placeholder="Tahun"
                      className="rounded-lg border border-white/20 bg-slate-950 px-2.5 py-1.5 text-xs text-white outline-none"
                    />
                    <select
                      value={newCycleLevel}
                      onChange={(e) =>
                        setNewCycleLevel(
                          e.target
                            .value as "Kabupaten/Kota" | "Provinsi" | "Pusat",
                        )
                      }
                      className="rounded-lg border border-white/20 bg-slate-950 px-2.5 py-1.5 text-xs text-white outline-none"
                    >
                      <option value="Kabupaten/Kota">Kabupaten/Kota</option>
                      <option value="Provinsi">Provinsi</option>
                      <option value="Pusat">Pusat</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowNewCycle(false)}
                      className="rounded-lg px-2 py-1 text-xs text-slate-400"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white"
                    >
                      Simpan
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : null}
        </div>

        <nav className="mt-6 grid gap-5" aria-label="Navigasi utama">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-3 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-400">
                {section.title}
              </p>
              <div className="grid gap-1">
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
                      className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition ${
                        active
                          ? "bg-red-600 text-white shadow-lg shadow-red-950/30"
                          : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
                      }`}
                    >
                      <Icon className="size-[1.15rem]" />
                      <span className="flex-1">{item.label}</span>
                      {item.hasCount ? (
                        <span
                          className={active ? "text-red-100" : "text-slate-400"}
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

        <div className="mt-auto border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() => {
              onOpenUsersModal?.()
              onClose()
            }}
            className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 text-left transition hover:bg-white/[0.08]"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-slate-900 text-xs font-bold text-white shadow-sm">
              {currentUser.avatar}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-white">
                {currentUser.name}
              </span>
              <span className="block truncate text-xs text-slate-400">
                {currentUser.title}
              </span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-slate-400 transition group-hover:text-slate-200" />
          </button>
        </div>
      </aside>
    </>
  )
}

function Header({
  onMenu,
  onView,
  onSelectCandidate,
  onOpenUsersModal,
  onOpenGoogleSync,
}: {
  onMenu: () => void
  onView: (view: View) => void
  onSelectCandidate: (candidateId: string) => void
  onOpenUsersModal: () => void
  onOpenGoogleSync: () => void
}) {
  const {
    candidates,
    currentUser,
    standardRules,
    cloudSyncStatus,
    googleSheetUrl,
    lastCloudSync,
    refreshAndSync,
    hasUnsavedChanges,
  } = useApp()
  const [searchQuery, setSearchQuery] = useState("")
  const [showNotif, setShowNotif] = useState(false)

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

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl md:gap-4 md:px-6">
      <Button
        variant="ghost"
        className="!px-2 lg:hidden"
        onClick={onMenu}
        aria-label="Buka navigasi"
      >
        <Menu className="size-5" />
      </Button>

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
                      <span className="grid size-8 place-items-center rounded-lg bg-slate-900 text-xs font-bold text-white">
                        {cand.avatar}
                      </span>
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

        <div className="mx-0.5 hidden h-5 w-px bg-slate-200 sm:block" />

        {/* Profil Pengguna */}
        <button
          type="button"
          onClick={onOpenUsersModal}
          className="flex h-9 items-center gap-2.5 rounded-lg px-2 text-left transition hover:bg-slate-100"
        >
          <span className="grid size-7 place-items-center rounded-lg bg-slate-900 text-xs font-bold text-white shadow-2xs">
            {currentUser.avatar}
          </span>
          <span className="hidden sm:block">
            <span className="block text-xs font-bold text-slate-800 leading-tight">
              {currentUser.name}
            </span>
            <span className="block text-[0.68rem] text-slate-500 leading-tight">
              {currentUser.title}
            </span>
          </span>
          <ChevronDown className="hidden size-3.5 text-slate-400 sm:block" />
        </button>
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
  const items = [
    { id: "overview" as View, label: "Beranda", icon: LayoutDashboard },
    { id: "sessions" as View, label: "Sesi", icon: ClipboardCheck },
    { id: "stages" as View, label: "Tahap", icon: Settings2 },
    { id: "progress" as View, label: "Progres", icon: Activity },
  ]
  return (
    <nav
      className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-2xl shadow-slate-900/15 backdrop-blur-xl lg:hidden"
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
  const { candidates, standardRules } = useApp()
  const counts = useMemo(
    () =>
      selectionStages.map(
        (_, index) =>
          candidates.filter((c) => c.stageStatuses[index] !== "locked").length,
      ),
    [candidates],
  )
  const unverifiedCount = standardRules.filter(
    (r) => r.status !== "Terverifikasi internal",
  ).length

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="size-5 text-red-600" />
            <h2 className="font-display text-lg font-bold text-slate-900">
              Alur Materi Latihan &amp; Seleksi
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Klik tahapan di bawah untuk mencatat evaluasi dan memantau perkembangan santri.
          </p>
        </div>
        <Badge tone={unverifiedCount > 0 ? "warning" : "success"}>
          {unverifiedCount > 0
            ? `${unverifiedCount} aturan belum terverifikasi`
            : "Seluruh aturan terverifikasi"}
        </Badge>
      </div>
      <div className="overflow-x-auto px-5 py-6 sm:px-6">
        <div className="flex min-w-[56rem] items-start">
          {selectionStages.map((stage, index) => (
            <div className="flex flex-1 items-start" key={stage.key}>
              <button
                type="button"
                onClick={() => onSelectStage(index)}
                className="group flex flex-1 flex-col items-center text-center transition hover:-translate-y-0.5"
              >
                <div
                  className={`grid size-11 place-items-center rounded-full font-display text-xs font-bold transition group-hover:ring-4 group-hover:ring-red-100 ${
                    index < 5
                      ? "bg-slate-900 text-white"
                      : "bg-red-600 text-white"
                  }`}
                >
                  {stage.shortLabel}
                </div>
                <p className="mt-3 max-w-24 text-xs font-bold text-slate-800 group-hover:text-red-600">
                  {stage.label}
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums text-slate-950">
                  {counts[index]}
                </p>
                <p className="text-[0.68rem] text-slate-400">kandidat</p>
              </button>
              {index < selectionStages.length - 1 ? (
                <div
                  className={`mt-5 h-0.5 flex-1 ${
                    index === 4 ? "bg-red-200" : "bg-slate-200"
                  }`}
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  detail: string
  icon: typeof UsersRound
  tone: string
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <div className={`grid size-11 place-items-center rounded-2xl ${tone}`}>
          <Icon className="size-5" />
        </div>
      </div>
      <p className="mt-4 text-xs font-medium text-slate-500">{detail}</p>
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
  const { candidates } = useApp()
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

  const filtered = useMemo(() => {
    const list = candidates.filter((cand) => {
      if (genderFilter !== "all" && cand.gender !== genderFilter) return false
      if (stageFilter !== "all" && cand.stage !== stageFilter) return false
      const currentStatus = cand.stageStatuses[cand.stage - 1]
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
      if (sortBy === "name") return a.name.localeCompare(b.name)
      if (sortBy === "stage") return b.stage - a.stage
      if (sortBy === "score")
        return (finalScore(b) ?? -1) - (finalScore(a) ?? -1)
      return a.number.localeCompare(b.number)
    })
  }, [candidates, genderFilter, stageFilter, statusFilter, search, sortBy])

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
          const current = candidate.stageStatuses[candidate.stage - 1]
          const candBmi =
            candidate.heightCm && candidate.weightKg
              ? bmi(candidate.weightKg, candidate.heightCm)
              : null
          return (
            <button
              key={candidate.id}
              type="button"
              onClick={() => onSelectCandidate(candidate.id)}
              className="grid gap-3 p-4 text-left transition active:bg-slate-50"
            >
              <span className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-900 text-xs font-bold text-white">
                  {candidate.avatar}
                </span>
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
              <span className="flex items-center justify-between gap-3 pl-14">
                <span>
                  <span className="block text-xs font-bold text-slate-700">
                    Tahap {candidate.stage} ·{" "}
                    {selectionStages[candidate.stage - 1]?.shortLabel}
                  </span>
                  <span className="mt-0.5 block text-[0.68rem] text-slate-400">
                    TB/BB: {candidate.heightCm ?? "—"} cm /{" "}
                    {candidate.weightKg ?? "—"} kg
                    {candBmi ? ` (BMI ${candBmi.value})` : ""} · PIP{" "}
                    {candidate.pip ?? "—"} · TIU {candidate.tiu ?? "—"}
                  </span>
                </span>
                <StatusBadge status={current} />
              </span>
            </button>
          )
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[56rem] text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
              <th className="px-6 py-3.5">Kandidat</th>
              <th className="px-4 py-3.5">TB / BB (BMI)</th>
              <th className="px-4 py-3.5">Tahap latihan aktif</th>
              <th className="px-4 py-3.5">PIP</th>
              <th className="px-4 py-3.5">TIU</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Diperbarui</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map((candidate) => {
              const current = candidate.stageStatuses[candidate.stage - 1]
              const candBmi =
                candidate.heightCm && candidate.weightKg
                  ? bmi(candidate.weightKg, candidate.heightCm)
                  : null
              return (
                <tr
                  key={candidate.id}
                  onClick={() => onSelectCandidate(candidate.id)}
                  className="group cursor-pointer transition hover:bg-slate-50/80"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-slate-900 text-xs font-bold text-white">
                        {candidate.avatar}
                      </span>
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
                    <p className="text-sm font-bold tabular-nums text-slate-800">
                      {candidate.heightCm ?? "—"} cm ·{" "}
                      {candidate.weightKg ?? "—"} kg
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {candBmi
                        ? `BMI ${candBmi.value} (${candBmi.category})`
                        : "Belum diukur"}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-semibold text-slate-800">
                      {selectionStages[candidate.stage - 1]?.label}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Tahap {candidate.stage} dari 8
                    </p>
                  </td>
                  <td className="px-4 py-4 text-sm font-bold tabular-nums text-slate-800">
                    {candidate.pip ?? "—"}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold tabular-nums text-slate-800">
                    {candidate.tiu ?? "—"}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={current} />
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
  const { candidates, currentUser, standardRules } = useApp()

  const totalCount = candidates.length
  const phase1Count = candidates.filter(isPhaseOnePassed).length
  const phase1Percent = totalCount
    ? ((phase1Count / totalCount) * 100).toFixed(1)
    : "0"
  const reviewCount = candidates.filter(
    (c) =>
      c.stageStatuses.includes("review") ||
      (c.documents ?? []).filter(Boolean).length < 6,
  ).length
  const eliminatedCount = candidates.filter((c) =>
    c.stageStatuses.includes("failed"),
  ).length

  const medTasks = candidates.filter(
    (c) => c.stageStatuses[3] === "review" || c.stageStatuses[3] === "active",
  ).length
  const docTasks = candidates.filter(
    (c) => (c.documents ?? []).filter(Boolean).length < 6,
  ).length
  const judgeTasks = candidates.filter(
    (c) =>
      isPhaseOnePassed(c) &&
      (c.pbb === null || c.fitness === null || c.personality === null),
  ).length

  const verifiedRulesCount = standardRules.filter(
    (r) => r.status === "Terverifikasi internal",
  ).length
  const standardsReadiness = standardRules.length
    ? Math.round((verifiedRulesCount / standardRules.length) * 100)
    : 100

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-red-600">
            Dashboard Operasional · Peran: {currentUser.title}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-950">
            Selamat datang, {currentUser.name.split(" ")[0]}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Pantau kesiapan kandidat dan tindak lanjuti pekerjaan yang menunggu
            verifikasi.
          </p>
        </div>
        <Button onClick={onOpenAddCandidate}>
          <UserRoundCheck className="size-4" />
          Tambah kandidat
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Total kandidat"
          value={String(totalCount)}
          detail="Kandidat terdaftar pada periode aktif"
          icon={UsersRound}
          tone="bg-blue-50 text-blue-700"
        />
        <StatCard
          label="Memenuhi Standar Dasar"
          value={String(phase1Count)}
          detail={`${phase1Percent}% siap tahap simulasi`}
          icon={ShieldCheck}
          tone="bg-emerald-50 text-emerald-700"
        />
        <StatCard
          label="Menunggu review"
          value={String(reviewCount)}
          detail={`${medTasks} medis · ${docTasks} administrasi`}
          icon={Activity}
          tone="bg-amber-50 text-amber-700"
        />
        <StatCard
          label="Perlu Pembinaan Khusus"
          value={String(eliminatedCount)}
          detail="Di bawah batas target latihan"
          icon={PanelLeftClose}
          tone="bg-red-50 text-red-700"
        />
      </div>

      <StagePipeline onSelectStage={onNavigateStage} />

      <div className="grid gap-6 xl:grid-cols-[1.55fr_0.75fr]">
        <CandidateTable
          compact
          onSelectCandidate={onSelectCandidate}
          onViewAll={() => onNavigateView("candidates")}
        />
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Perlu tindakan
              </h2>
              <p className="mt-1 text-sm text-slate-500">Prioritas hari ini</p>
            </div>
            <Badge tone="danger">
              {medTasks + docTasks + judgeTasks} tugas
            </Badge>
          </div>
          <div className="mt-5 grid gap-3">
            {[
              {
                icon: HeartPulse,
                label: "Review hasil Rikkes",
                detail: `${medTasks} kandidat`,
                tone: "bg-red-50 text-red-700",
                onClick: () => onNavigateStage(3),
              },
              {
                icon: FileCheck2,
                label: "Verifikasi dokumen",
                detail: `${docTasks} kandidat belum 6/6`,
                tone: "bg-amber-50 text-amber-700",
                onClick: () => onNavigateView("documents"),
              },
              {
                icon: GraduationCap,
                label: "Input nilai simulasi lapangan",
                detail: `${judgeTasks} santri (PBB & Samapta)`,
                tone: "bg-blue-50 text-blue-700",
                onClick: () => onNavigateStage(5),
              },
            ].map((task) => {
              const Icon = task.icon
              return (
                <button
                  key={task.label}
                  type="button"
                  onClick={task.onClick}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3.5 text-left transition hover:border-slate-200 hover:bg-slate-50"
                >
                  <span
                    className={`grid size-10 place-items-center rounded-xl ${task.tone}`}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-slate-800">
                      {task.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {task.detail}
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-slate-400" />
                </button>
              )
            })}
          </div>
          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Kelengkapan pengesahan standar</span>
              <span>{standardsReadiness}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-amber-400 transition-all"
                style={{ width: `${standardsReadiness}%` }}
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Tabel Samapta, cutoff usia, dan tie-break dapat disahkan pada menu{" "}
              <button
                type="button"
                onClick={() => onNavigateView("standards")}
                className="font-bold text-red-600 underline"
              >
                Standar & kalkulator
              </button>
              .
            </p>
          </div>
        </Card>
      </div>
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
      "Finalisasi status hard-lock",
    ],
    icon: Target,
  },
  {
    description: "Pemeriksaan vital, mata, gigi, THT, dan anamnesis.",
    owner: "Tim Medis",
    rule: "Lebih dari 5 jawaban ya atau kondisi kritis memicu hard-lock.",
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

function StagesView({
  activeStage,
  setActiveStage,
  onSelectCandidate,
  onNavigateSchedules,
}: {
  activeStage: number
  setActiveStage: (index: number) => void
  onSelectCandidate: (candidateId: string) => void
  onNavigateSchedules: () => void
}) {
  const {
    candidates,
    updateCandidateStage,
    stageChecklists,
    toggleStageChecklist,
  } = useApp()
  const [statusFilter, setStatusFilter] = useState<StageStatus | "all">("all")

  const stage = selectionStages[activeStage]
  const workspace = stageWorkspace[activeStage]
  const Icon = workspace.icon
  const stageCandidates = candidates.filter(
    (candidate) => candidate.stageStatuses[activeStage] !== "locked",
  )
  const visibleCandidates = stageCandidates.filter(
    (c) =>
      statusFilter === "all" || c.stageStatuses[activeStage] === statusFilter,
  )
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

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-red-600">
            Workspace operasional
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-950">
            Tahapan seleksi
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Buka setiap tahap untuk melihat aturan, pekerjaan, dan menetapkan
            status kelulusan kandidat.
          </p>
        </div>
        <Button variant="secondary" onClick={onNavigateSchedules}>
          <CalendarDays className="size-4" /> Atur jadwal tahap
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="flex min-w-[58rem] border-b border-slate-200">
            {selectionStages.map((item, index) => (
              <button
                key={item.key}
                onClick={() => setActiveStage(index)}
                className={`relative flex min-w-28 flex-1 flex-col items-center gap-2 px-3 py-4 text-center transition ${
                  activeStage === index
                    ? "bg-red-50 text-red-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <span
                  className={`grid size-8 place-items-center rounded-full text-xs font-bold ${
                    activeStage === index
                      ? "bg-red-600 text-white"
                      : index < 5
                        ? "bg-slate-900 text-white"
                        : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="text-xs font-bold">{item.label}</span>
                {activeStage === index ? (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-red-600" />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="grid gap-6">
          <Card className="overflow-hidden">
            <div className="bg-slate-950 p-6 text-white">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="flex items-start gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-red-600">
                    <Icon className="size-6" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-red-300">
                      Tahap {stage.id} · {stage.phase === 1 ? "Standar Dasar" : "Simulasi Lapangan"}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-bold">
                      {stage.label}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                      {workspace.description}
                    </p>
                  </div>
                </div>
                <Badge tone={stage.phase === 1 ? "neutral" : "info"}>
                  {stage.phase === 1 ? "Kualifikasi Dasar" : "Pembobotan Nilai"}
                </Badge>
              </div>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">
                  Penanggung jawab
                </p>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  {workspace.owner}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">
                  Progres tahap
                </p>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  {passed} lolos · {attention} ditinjau · {failedCount} gugur
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">
                  Perlu perhatian
                </p>
                <p className="mt-2 text-sm font-bold text-amber-700">
                  {attention} kandidat
                </p>
              </div>
            </div>
            <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                <p>{workspace.rule}</p>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Kandidat pada tahap ini
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {visibleCandidates.length} ditampilkan · {passed} sudah lolos
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {([
                  ["all", "Semua"],
                  ["passed", "Lolos"],
                  ["active", "Aktif"],
                  ["review", "Ditinjau"],
                  ["failed", "Gugur"],
                ] as const).map(([st, lbl]) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      statusFilter === st
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {visibleCandidates.length ? (
                visibleCandidates.map((candidate) => {
                  const status = candidate.stageStatuses[activeStage]
                  const score =
                    activeStage === 1
                      ? candidate.pip
                      : activeStage === 2
                        ? candidate.tiu
                        : activeStage === 5
                          ? candidate.pbb
                          : activeStage === 6
                            ? candidate.fitness
                            : activeStage === 7
                              ? candidate.personality
                              : null
                  return (
                    <div
                      key={candidate.id}
                      className="flex flex-wrap items-center gap-4 px-6 py-4 transition hover:bg-slate-50"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectCandidate(candidate.id)}
                        className="flex min-w-44 flex-1 items-center gap-3 text-left"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-900 text-xs font-bold text-white">
                          {candidate.avatar}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-slate-900 hover:text-red-600">
                            {candidate.name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {candidate.number} · {candidate.school}
                          </p>
                        </div>
                      </button>
                      {score !== null ? (
                        <div className="text-right">
                          <p className="font-display text-lg font-bold tabular-nums text-slate-900">
                            {score}
                          </p>
                          <p className="text-[0.68rem] text-slate-400">nilai</p>
                        </div>
                      ) : null}
                      <StatusBadge status={status} />
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            updateCandidateStage(
                              candidate.id,
                              activeStage,
                              "passed",
                            )
                          }
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                          title="Loloskan tahap ini"
                        >
                          Loloskan
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
                          className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100"
                          title="Tandai untuk ditinjau"
                        >
                          Tinjau
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
                          className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-100"
                          title="Gugurkan pada tahap ini"
                        >
                          Gugur
                        </button>
                        <Button
                          variant="ghost"
                          className="!px-2"
                          onClick={() => onSelectCandidate(candidate.id)}
                          aria-label={`Detail ${candidate.name}`}
                        >
                          <ChevronRight className="size-5" />
                        </Button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="px-6 py-12 text-center text-sm text-slate-500">
                  Belum ada kandidat dengan status tersebut pada tahap ini.
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Checklist petugas
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Langkah wajib sebelum finalisasi.
                </p>
              </div>
              <Badge tone="info">
                {checklistState.filter(Boolean).length}/
                {workspace.checklist.length}
              </Badge>
            </div>
            <div className="mt-5 grid gap-3">
              {workspace.checklist.map((item, index) => (
                <label
                  key={item}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 p-3 transition hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(checklistState[index])}
                    onChange={() => toggleStageChecklist(activeStage, index)}
                    className="mt-0.5 size-4 rounded border-slate-300 accent-red-600"
                  />
                  <span className="text-sm font-semibold leading-snug text-slate-700">
                    {item}
                  </span>
                </label>
              ))}
            </div>
          </Card>
          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Distribusi status
            </h2>
            <div className="mt-5 grid gap-4">
              {(["passed", "active", "review", "failed"] as StageStatus[]).map(
                (status) => {
                  const count = stageCandidates.filter(
                    (candidate) =>
                      candidate.stageStatuses[activeStage] === status,
                  ).length
                  const width = stageCandidates.length
                    ? Math.max((count / stageCandidates.length) * 100, 3)
                    : 0
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                        <span>{stageLabel(status)}</span>
                        <span>{count}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${stageTone(status).split(" ")[0]}`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  )
                },
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ProgressView({
  onSelectCandidate,
}: {
  onSelectCandidate: (candidateId: string) => void
}) {
  const { candidates, activeCycle } = useApp()
  const [selectedId, setSelectedId] = useState(candidates[0]?.id ?? "")
  const candidate =
    candidates.find((item) => item.id === selectedId) ?? candidates[0]

  if (!candidate) {
    return (
      <Card className="p-8 text-center text-sm text-slate-500">
        Belum ada kandidat pada periode ini.
      </Card>
    )
  }

  const docsValidCount = (candidate.documents ?? []).filter(Boolean).length
  const docsPercent = Math.round((docsValidCount / 6) * 100)
  const development = {
    attendance: candidate.attendance ?? 0,
    training: candidate.trainingCompliance ?? 0,
    documents: docsPercent,
    note:
      candidate.coachNote ??
      "Belum ada catatan pelatih. Lengkapi penilaian sesi atau tambahkan catatan evaluasi kandidat.",
    physical: candidate.physicalMetrics ?? [
      {
        label: "Lari 12 menit",
        current: "Belum diinput",
        target: "3.000 m",
        percent: 0,
      },
      {
        label: "Push-up",
        current: "Belum diinput",
        target: "43 kali",
        percent: 0,
      },
      {
        label: "Sit-up",
        current: "Belum diinput",
        target: "40 kali",
        percent: 0,
      },
      {
        label: "Shuttle run",
        current: "Belum diinput",
        target: "15,4 dtk",
        percent: 0,
      },
    ],
  }

  const passedCount = candidate.stageStatuses.filter(
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-red-600">
            Rekam perkembangan individual
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-950">
            Perkembangan kandidat
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Pantau progres seleksi, akademik, fisik, dan kesiapan kandidat.
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

      <Card className="p-4">
        <div className="flex gap-3 overflow-x-auto pb-1">
          {candidates.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className={`flex min-w-56 items-center gap-3 rounded-xl border p-3 text-left transition ${
                candidate.id === item.id
                  ? "border-red-200 bg-red-50 ring-2 ring-red-100"
                  : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-xl text-xs font-bold text-white ${
                  candidate.id === item.id ? "bg-red-600" : "bg-slate-900"
                }`}
              >
                {item.avatar}
              </span>
              <span>
                <span className="block text-sm font-bold text-slate-900">
                  {item.name}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Tahap {item.stage} ·{" "}
                  {selectionStages[item.stage - 1]?.shortLabel}
                </span>
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="grid gap-6 bg-slate-950 p-6 text-white md:grid-cols-[auto_1fr_auto] md:items-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-red-600 font-display text-lg font-bold">
            {candidate.avatar}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-bold">
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
            <p className="mt-1 text-sm text-slate-400">
              {candidate.number} · {candidate.school} · {candidate.gender}
            </p>
          </div>
          <div className="min-w-40">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">Progres seleksi</span>
              <span>{completion}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-red-500"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto px-6 py-6">
          <div className="flex min-w-[58rem]">
            {selectionStages.map((stage, index) => {
              const status = candidate.stageStatuses[index]
              return (
                <div className="flex flex-1 items-start" key={stage.key}>
                  <div className="flex flex-col items-center text-center">
                    <span
                      className={`grid size-9 place-items-center rounded-full text-xs font-bold ${stageTone(status)}`}
                    >
                      {index + 1}
                    </span>
                    <p className="mt-2 max-w-20 text-[0.68rem] font-bold text-slate-700">
                      {stage.label}
                    </p>
                    <p className="mt-1 text-[0.65rem] text-slate-400">
                      {stageLabel(status)}
                    </p>
                  </div>
                  {index < selectionStages.length - 1 ? (
                    <div
                      className={`mt-4 h-0.5 flex-1 ${
                        status === "passed" ? "bg-emerald-300" : "bg-slate-200"
                      }`}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      <CandidateProjection candidateId={candidate.id} />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Perkembangan nilai
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Nilai aktual terhadap target aman.
              </p>
            </div>
            <Target className="size-5 text-red-600" />
          </div>
          <div className="mt-6 grid gap-5">
            {examScores.map((score) => (
              <div key={score.label}>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-600">{score.label}</span>
                  <span
                    className={
                      score.value === null ? "text-slate-400" : "text-slate-900"
                    }
                  >
                    {score.value === null
                      ? "Belum dinilai"
                      : `${score.value} / 100`}
                  </span>
                </div>
                <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      score.value !== null && score.value >= score.target
                        ? "bg-emerald-500"
                        : score.value !== null
                          ? "bg-amber-400"
                          : "bg-slate-200"
                    }`}
                    style={{ width: `${score.value ?? 0}%` }}
                  />
                  <span
                    className="absolute inset-y-0 w-0.5 bg-slate-700/50"
                    style={{ left: `${score.target}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Kesiapan fisik
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Hasil latihan terbaru terhadap target.
              </p>
            </div>
            <Activity className="size-5 text-red-600" />
          </div>
          <div className="mt-6 grid gap-4">
            {development.physical.map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl border border-slate-100 p-3.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {metric.label}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Target {metric.target}
                    </p>
                  </div>
                  <p className="text-sm font-bold tabular-nums text-slate-900">
                    {metric.current}
                  </p>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${metric.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
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

  const ranked = useMemo(
    () =>
      candidates
        .filter((c) => genderFilter === "all" || c.gender === genderFilter)
        .map((candidate) => ({ candidate, score: finalScore(candidate) }))
        .filter(
          (item): item is { candidate: Candidate, score: number } =>
            item.score !== null && isPhaseOnePassed(item.candidate),
        )
        .sort(compareRankedCandidates),
    [candidates, genderFilter],
  )

  const unranked = useMemo(
    () =>
      candidates.filter(
        (c) =>
          (genderFilter === "all" || c.gender === genderFilter) &&
          (!isPhaseOnePassed(c) || finalScore(c) === null),
      ),
    [candidates, genderFilter],
  )

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-red-600">
            Simulasi Penjurian Lapangan · Kabupaten/Kota
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-950">
            Pemeringkatan akhir
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Formula: PBB 30% + Samapta 30% + Kepribadian 40% (Tie-break:
            Kepribadian → PBB → Samapta → Nomor Peserta).
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
                : "Publikasikan Hasil"}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => exportRankingCsv(ranked)}>
            <Download className="size-4" /> Ekspor rekap CSV
          </Button>
        </div>
      </div>

      <div
        className={`rounded-2xl border p-4 text-sm ${
          rankingPublished
            ? "border-emerald-200 bg-emerald-50 text-emerald-950"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-bold">
              {rankingPublished
                ? "Status: Dipublikasikan ke Portal Internal Kandidat"
                : "Status: Simulasi Internal (Draft Belum Dipublikasikan)"}
            </p>
            <p className="mt-1 opacity-90">
              Hanya santri yang telah memenuhi seluruh standar dasar (Tahap 1–5) dan
              memiliki ketiga nilai simulasi lapangan lengkap yang masuk ke tabel
              pemeringkatan.
            </p>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Leaderboard pemeringkatan
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {ranked.length} kandidat memenuhi syarat & memiliki penilaian
              lengkap
            </p>
          </div>
          <div className="flex gap-2">
            {(["all", "Putra", "Putri"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGenderFilter(g)}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
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

        <div className="grid divide-y divide-slate-100 md:hidden">
          {ranked.map(({ candidate, score }, index) => {
            const band = getQuotaBand(index + 1)
            return (
              <button
                type="button"
                onClick={() => onSelectCandidate(candidate.id)}
                className="p-4 text-left"
                key={candidate.id}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`grid size-10 place-items-center rounded-xl font-display text-sm font-bold ${
                      index === 0
                        ? "bg-amber-400 text-amber-950"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {candidate.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {candidate.number} · {candidate.gender}
                    </p>
                  </div>
                  <p className="font-display text-xl font-bold tabular-nums text-red-600">
                    {score.toFixed(2)}
                  </p>
                </div>
                <div className="mt-2 pl-13">
                  <Badge tone={band.tone}>{band.label}</Badge>
                </div>
              </button>
            )
          })}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[54rem] text-left">
            <thead className="bg-slate-50/70 text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Peringkat</th>
                <th className="px-4 py-3.5">Kandidat</th>
                <th className="px-4 py-3.5">PBB · 30%</th>
                <th className="px-4 py-3.5">Samapta · 30%</th>
                <th className="px-4 py-3.5">Kepribadian · 40%</th>
                <th className="px-4 py-3.5">Kuota Simulasi</th>
                <th className="px-6 py-3.5">Nilai akhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ranked.map(({ candidate, score }, index) => {
                const band = getQuotaBand(index + 1)
                return (
                  <tr
                    key={candidate.id}
                    onClick={() => onSelectCandidate(candidate.id)}
                    className="cursor-pointer hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-5">
                      <span
                        className={`grid size-9 place-items-center rounded-xl font-display text-sm font-bold ${
                          index === 0
                            ? "bg-amber-400 text-amber-950"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-5">
                      <p className="font-bold text-slate-900">
                        {candidate.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {candidate.number} · {candidate.gender} ·{" "}
                        {candidate.school}
                      </p>
                    </td>
                    <td className="px-4 py-5 font-semibold tabular-nums text-slate-700">
                      {candidate.pbb?.toFixed(1)}
                    </td>
                    <td className="px-4 py-5 font-semibold tabular-nums text-slate-700">
                      {candidate.fitness?.toFixed(1)}
                    </td>
                    <td className="px-4 py-5 font-semibold tabular-nums text-slate-700">
                      {candidate.personality?.toFixed(1)}
                    </td>
                    <td className="px-4 py-5">
                      <Badge tone={band.tone}>{band.label}</Badge>
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-display text-xl font-bold tabular-nums text-red-600">
                        {score.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {unranked.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="font-display text-base font-bold text-slate-900">
              Kandidat belum masuk pemeringkatan ({unranked.length})
            </h3>
            <p className="text-xs text-slate-500">
              Klik kandidat untuk melengkapi nilai simulasi lapangan atau melihat
              catatan evaluasi standar dasar.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {unranked.map((cand) => {
              const failedIdx = cand.stageStatuses.findIndex(
                (s) => s === "failed",
              )
              const reason =
                failedIdx !== -1
                  ? `Catatan khusus pada Tahap ${failedIdx + 1} (${selectionStages[failedIdx]?.label})`
                  : !isPhaseOnePassed(cand)
                    ? `Masih dalam evaluasi standar dasar (Tahap ${cand.stage})`
                    : "Menunggu kelengkapan nilai PBB / Samapta / Kepribadian"

              return (
                <button
                  key={cand.id}
                  type="button"
                  onClick={() => onSelectCandidate(cand.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 px-6 py-3.5 text-left hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-slate-200 text-xs font-bold text-slate-700">
                      {cand.avatar}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {cand.name} ({cand.number})
                      </p>
                      <p className="text-xs text-slate-500">{reason}</p>
                    </div>
                  </div>
                  <Badge tone={failedIdx !== -1 ? "danger" : "warning"}>
                    {failedIdx !== -1 ? "Perlu Pembinaan" : "Belum Lengkap"}
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
  const { isAuthenticated, toast, clearToast } = useApp()
  const [view, setView] = useState<View>("overview")
  const [activeStage, setActiveStage] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showAddCandidate, setShowAddCandidate] = useState(false)
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    null,
  )
  const [showUsersModal, setShowUsersModal] = useState(false)
  const [showGoogleSync, setShowGoogleSync] = useState(false)

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        view={view}
        onView={setView}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onOpenGoogleSync={() => setShowGoogleSync(true)}
        onOpenUsersModal={() => setShowUsersModal(true)}
      />
      <div className="lg:pl-72">
        <Header
          onMenu={() => setMobileOpen(true)}
          onView={setView}
          onSelectCandidate={(id) => setSelectedCandidateId(id)}
          onOpenUsersModal={() => setShowUsersModal(true)}
          onOpenGoogleSync={() => setShowGoogleSync(true)}
        />
        <main className="mx-auto max-w-[100rem] px-4 pb-28 pt-5 sm:px-5 md:p-8">
          {view === "overview" ? (
            <Overview
              onOpenAddCandidate={() => setShowAddCandidate(true)}
              onSelectCandidate={(id) => setSelectedCandidateId(id)}
              onNavigateView={setView}
              onNavigateStage={(idx) => {
                setActiveStage(idx)
                setView("stages")
              }}
            />
          ) : null}
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
              onNavigateSchedules={() => setView("schedules")}
            />
          ) : null}
          {view === "candidates" ? (
            <CandidatesView
              onOpenAddCandidate={() => setShowAddCandidate(true)}
              onSelectCandidate={(id) => setSelectedCandidateId(id)}
            />
          ) : null}
          {view === "progress" ? (
            <ProgressView
              onSelectCandidate={(id) => setSelectedCandidateId(id)}
            />
          ) : null}
          {view === "ranking" ? (
            <RankingView
              onSelectCandidate={(id) => setSelectedCandidateId(id)}
            />
          ) : null}
          {view === "standards" ? <StandardsView /> : null}
          {view === "schedules" ? (
            <Suspense fallback={<PageLoader />}>
              <SchedulesView />
            </Suspense>
          ) : null}
          {view === "cat-bank" ? (
            <Suspense fallback={<PageLoader />}>
              <CatBankView />
            </Suspense>
          ) : null}
          {view === "documents" ? (
            <Suspense fallback={<PageLoader />}>
              <DocumentsView />
            </Suspense>
          ) : null}
        </main>
      </div>

      <MobileNav
        view={view}
        onView={setView}
        onMenu={() => setMobileOpen(true)}
      />

      <CreateCandidateModal
        open={showAddCandidate}
        onClose={() => setShowAddCandidate(false)}
      />

      <CandidateDetailModal
        candidateId={selectedCandidateId}
        onClose={() => setSelectedCandidateId(null)}
      />

      <UsersAndAuditModal
        open={showUsersModal}
        onClose={() => setShowUsersModal(false)}
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

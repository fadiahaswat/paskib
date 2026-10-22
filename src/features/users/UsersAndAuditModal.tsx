import { useEffect, useMemo, useRef, useState } from "react"
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronRight,
  CloudUpload,
  Compass,
  Copy,
  ExternalLink,
  FileCheck2,
  GraduationCap,
  HeartPulse,
  History,
  Info,
  KeyRound,
  Landmark,
  Loader2,
  LogOut,
  Mail,
  MessagesSquare,
  Plus,
  RotateCcw,
  Ruler,
  Search,
  Shield,
  Sparkles,
  User,
  UserCheck,
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
} from "../../components/ui"
import { useApp } from "../../context/AppContext"
import type { Candidate, UserRole } from "../../domain/selection"
import logoUrl from "../../assets/BACAPASMUIN.webp"
import logoMualliminUrl from "../../assets/logo-muallimin.png"
import logoTontiUrl from "../../assets/logo-tonti-muallimin.png"

// Whitelist email resmi pelatih sesuai instruksi pengguna
const AUTHORIZED_COACH_EMAILS = [
  "andiaqillahfadiahaswat@gmail.com",
  "andiaqillah@muallimin.sch.id",
]

// ============================================================================
// HELPER: PARSE GOOGLE JWT CREDENTIAL SAFELY (CLIENT-SIDE)
// ============================================================================
function parseGoogleJwt(token: string): {
  email?: string
  name?: string
  picture?: string
  sub?: string
} | null {
  try {
    const parts = token.split(".")
    if (parts.length < 2) return null
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

// ============================================================================
// GOOGLE MULTI-COLOR OFFICIAL ICON COMPONENT
// ============================================================================
export function GoogleIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}

// ============================================================================
// MODAL 1: CANDIDATE LOGIN MODAL (LOGIN VIA NIK)
// ============================================================================
export function CandidateLoginModal({
  open,
  onClose,
  onLoggedIn,
}: {
  open: boolean
  onClose: () => void
  onLoggedIn?: () => void
}) {
  const { candidates, loginCandidateByNik } = useApp()
  const [nikInput, setNikInput] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const cleanNik = nikInput.replace(/\D/g, "").slice(0, 16)

  // Live match candidate identification
  const matchedCandidate = useMemo(() => {
    if (cleanNik.length < 4) return null
    return candidates.find(
      (c) =>
        (c.nik && c.nik.replace(/\s+/g, "") === cleanNik) ||
        c.number.toLowerCase() === cleanNik.toLowerCase(),
    )
  }, [candidates, cleanNik])

  if (!open) return null

  function handleSubmitNik(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)
    const res = loginCandidateByNik(cleanNik)
    if (res.success) {
      onClose()
      onLoggedIn?.()
    } else if (res.error) {
      setErrorMessage(res.error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative max-h-[92vh] w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl text-slate-900">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-red-600 text-white shadow-sm">
              <GraduationCap className="size-5" />
            </div>
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-wider text-red-400">
                Portal Mandiri Santri
              </p>
              <h2 className="font-display text-lg font-bold">
                Masuk Ujian CAT via NIK
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(92vh-100px)]">
          <form onSubmit={handleSubmitNik} className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                16 Digit Nomor Induk Kependudukan (NIK)
              </label>
              <span
                className={`text-[0.68rem] font-mono font-bold px-2 py-0.5 rounded-full ${
                  cleanNik.length === 16
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {cleanNik.length} / 16 Digit
              </span>
            </div>

            <div className="relative">
              <input
                autoFocus
                type="text"
                inputMode="numeric"
                maxLength={16}
                value={cleanNik}
                onChange={(e) => {
                  setNikInput(e.target.value.replace(/\D/g, ""))
                  setErrorMessage(null)
                }}
                placeholder="Contoh: 3404071005100005"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 font-mono text-base font-bold tracking-wider text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-50"
              />
            </div>

            {/* LIVE VERIFIED CANDIDATE CARD */}
            {matchedCandidate && (
              <div className="flex items-center gap-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 animate-in fade-in duration-200">
                <CandidateAvatar
                  name={matchedCandidate.name}
                  avatar={matchedCandidate.avatar}
                  photoUrl={matchedCandidate.photoUrl}
                  className="size-10 shrink-0 text-sm font-bold ring-2 ring-emerald-400"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    <p className="text-[0.65rem] font-bold uppercase tracking-wider text-emerald-700">
                      Santri Teridentifikasi
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {matchedCandidate.name}
                  </p>
                  <p className="text-[0.68rem] text-slate-500 truncate">
                    No: {matchedCandidate.number} • {matchedCandidate.school}
                  </p>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
                <AlertCircle className="size-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={cleanNik.length < 4}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-700 active:scale-[0.99] transition disabled:opacity-50"
            >
              <span>Masuk Ruang Ujian CAT</span>
              <ArrowRight className="size-4" />
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MODAL 2: USERS & AUDIT MODAL (RBAC MANAGEMENT FOR COACH)
// ============================================================================
export function UsersAndAuditModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const {
    users,
    currentUser,
    candidates,
    loginAs,
    loginCandidateByNik,
    logout,
    addUser,
    toggleUserActive,
    auditLogs,
    syncStatus,
    syncWithBackend,
    resetAllData,
    googleSheetUrl,
    syncToGoogleSheet,
    cloudSyncStatus,
  } = useApp()

  const [tab, setTab] = useState<"switch" | "candidates" | "manage" | "audit">("switch")
  const [candidateSearch, setCandidateSearch] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<UserRole>("coach")
  const [title, setTitle] = useState("Pelatih Pendamping")

  if (!open) return null

  // If candidate is somehow opening this, close it immediately
  if (currentUser.role === "candidate") {
    onClose()
    return null
  }

  const filteredCandidates = candidates.filter((c) => {
    if (!candidateSearch.trim()) return true
    const term = candidateSearch.toLowerCase()
    return (
      c.name.toLowerCase().includes(term) ||
      c.number.toLowerCase().includes(term) ||
      (c.nik && c.nik.includes(term)) ||
      c.school.toLowerCase().includes(term)
    )
  })

  function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    addUser({
      name: name.trim(),
      email: email.trim(),
      role,
      title: title.trim() || role.toUpperCase(),
      avatar: "",
      active: true,
    })
    setName("")
    setEmail("")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-slate-950 px-6 py-5 text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-red-400">
              Panel Administrator &amp; Jejak Audit
            </p>
            <h2 className="mt-1 font-display text-xl font-bold">
              Manajemen Pengguna &amp; Akses Sistem
            </h2>
          </div>
          <Button
            variant="ghost"
            className="!px-2 text-white hover:bg-white/10"
            onClick={onClose}
          >
            <X className="size-5" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-6">
          <div className="flex">
            {([
              ["switch", "Beralih Peran"],
              ["candidates", `Simulasi Santri (${candidates.length})`],
              ["manage", `Kelola Staf (${users.length})`],
              ["audit", `Log Audit (${auditLogs.length})`],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`border-b-2 px-4 py-3.5 text-xs font-bold transition ${
                  tab === id
                    ? "border-red-600 text-red-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 py-2">
            <Button
              variant="secondary"
              className="!px-3 !py-1.5 !text-xs font-semibold"
              loading={syncStatus === "syncing" || cloudSyncStatus === "syncing"}
              onClick={async () => {
                if (googleSheetUrl) {
                  await syncToGoogleSheet()
                } else {
                  await syncWithBackend()
                }
              }}
            >
              <CloudUpload className="size-3.5" /> Sinkronisasi Cloud
            </Button>
            <Button
              variant="ghost"
              className="!px-3 !py-1.5 !text-xs text-red-600 hover:bg-red-50"
              onClick={() => {
                logout()
                onClose()
              }}
            >
              <LogOut className="size-3.5" /> Keluar Sesi
            </Button>
          </div>
        </div>

        <div className="p-6">
          {/* TAB 1: BERALIH STAF */}
          {tab === "switch" && (
            <div className="grid gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
                Pilih profil pengguna internal pelatih untuk menguji batas otorisasi. Akun terotorisasi Google: <strong>{AUTHORIZED_COACH_EMAILS.join(", ")}</strong>.
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {users.map((u) => {
                  const isCurrent = u.id === currentUser.id
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        loginAs(u.id)
                        onClose()
                      }}
                      className={`flex items-center gap-3.5 rounded-2xl border p-4 text-left transition ${
                        isCurrent
                          ? "border-red-300 bg-red-50 ring-2 ring-red-100"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <UserAvatar
                        avatar={u.avatar}
                        name={u.name}
                        className="size-11"
                        rounded="rounded-xl"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-slate-900">{u.name}</p>
                          <Badge tone={isCurrent ? "success" : "neutral"}>
                            {u.role.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {u.title} · {u.email}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500">
                  Ingin mengembalikan seluruh database lokal ke data awal?
                </p>
                <Button variant="danger" onClick={resetAllData}>
                  <RotateCcw className="size-4" /> Reset seluruh data ke default
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: SIMULASI MASUK SEBAGAI SANTRI (VIA NIK) */}
          {tab === "candidates" && (
            <div className="grid gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  placeholder="Cari santri berdasarkan NIK, nama, atau sekolah..."
                  className="!pl-9 !text-xs"
                />
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 max-h-96 overflow-y-auto pr-1">
                {filteredCandidates.map((cand) => (
                  <button
                    key={cand.id}
                    type="button"
                    onClick={() => {
                      if (cand.nik) loginCandidateByNik(cand.nik)
                      onClose()
                    }}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-red-400 hover:bg-slate-50"
                  >
                    <CandidateAvatar
                      name={cand.name}
                      avatar={cand.avatar}
                      photoUrl={cand.photoUrl}
                      className="size-10 text-xs font-bold shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-900">{cand.name}</p>
                      <p className="font-mono text-[0.68rem] text-red-600 font-bold">
                        NIK: {cand.nik}
                      </p>
                      <p className="truncate text-[0.65rem] text-slate-500">{cand.school}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MANAJEMEN AKUN */}
          {tab === "manage" && (
            <div className="grid gap-6">
              {currentUser.role === "admin" ? (
                <form
                  onSubmit={handleAddUser}
                  className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2"
                >
                  <Input
                    label="Nama pengguna baru"
                    required
                    placeholder="Contoh: Lettu Arifin"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <Input
                    label="Email Google"
                    type="email"
                    required
                    placeholder="arifin@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Role RBAC
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-normal outline-none focus:border-red-400"
                    >
                      <option value="admin">Admin</option>
                      <option value="coach">Coach / Pelatih</option>
                      <option value="medical">Tim Medis</option>
                      <option value="judge">Juri Penilai</option>
                    </select>
                  </label>
                  <Input
                    label="Jabatan / spesialisasi"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <div className="flex justify-end sm:col-span-2">
                    <Button type="submit">
                      <Plus className="size-4" /> Tambah Staf
                    </Button>
                  </div>
                </form>
              ) : null}

              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        avatar={u.avatar}
                        name={u.name}
                        className="size-10"
                        rounded="rounded-xl"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-900">{u.name}</p>
                        <p className="text-xs text-slate-500">
                          {u.email} · {u.title}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={u.active ? "success" : "danger"}>
                        {u.active ? "Aktif" : "Nonaktif"}
                      </Badge>
                      {currentUser.role === "admin" && u.id !== currentUser.id && (
                        <Button
                          variant="secondary"
                          className="!px-3 !py-1.5 !text-xs"
                          onClick={() => toggleUserActive(u.id)}
                        >
                          {u.active ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT LOG */}
          {tab === "audit" && (
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Jejak audit append-only untuk setiap aksi dan autentikasi.
                </p>
                <Badge tone="info">{auditLogs.length} aktivitas tercatat</Badge>
              </div>
              <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-200">
                {auditLogs.map((log) => (
                  <div key={log.id} className="px-4 py-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge tone="neutral">{log.action}</Badge>
                        <strong className="text-slate-900">{log.target}</strong>
                      </div>
                      <span className="text-slate-400">
                        {log.timestamp} · {log.actor} ({log.role})
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600">{log.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MODAL 3: GOOGLE OFFICIAL ACCOUNT CHOOSER MODAL (accounts.google.com faithful)
// ============================================================================
export function GoogleAccountPickerModal({
  open,
  onClose,
  onSelectEmail,
}: {
  open: boolean
  onClose: () => void
  onSelectEmail: (
    email: string,
    profile?: { name?: string; picture?: string },
  ) => void
}) {
  const [customEmail, setCustomEmail] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customError, setCustomError] = useState<string | null>(null)
  const [authenticatingEmail, setAuthenticatingEmail] = useState<string | null>(null)

  if (!open) return null

  const googleProfiles = [
    {
      name: "Coach Andi Aqillah",
      email: "andiaqillahfadiahaswat@gmail.com",
      badge: "Google Account Pribadi",
      initials: "CA",
      color: "bg-blue-600",
    },
    {
      name: "Coach Andi Aqillah",
      email: "andiaqillah@muallimin.sch.id",
      badge: "Google Workspace Madrasah",
      initials: "AM",
      color: "bg-emerald-600",
    },
  ]

  function handleChoose(email: string, name?: string) {
    setAuthenticatingEmail(email)
    setCustomError(null)
    setTimeout(() => {
      onSelectEmail(email, { name: name || "Coach Andi Aqillah" })
      setAuthenticatingEmail(null)
    }, 400)
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault()
    const clean = customEmail.trim().toLowerCase()
    if (!clean) return
    if (!clean.includes("@")) {
      setCustomError("Format email Google tidak valid.")
      return
    }
    setAuthenticatingEmail(clean)
    setCustomError(null)
    setTimeout(() => {
      onSelectEmail(clean, { name: clean.split("@")[0] })
      setAuthenticatingEmail(null)
    }, 400)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl text-slate-800">
        {/* Top Google Header */}
        <div className="p-6 text-center border-b border-slate-100 bg-slate-50/50">
          <div className="flex justify-center mb-2.5">
            <GoogleIcon className="size-8" />
          </div>
          <h3 className="text-xl font-medium tracking-tight text-slate-900 font-sans">
            Pilih Akun Google
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            untuk melanjutkan ke <strong className="text-slate-800">BACAPASMUIN! Selection</strong>
          </p>
        </div>

        {/* Google Profiles List */}
        <div className="p-3 divide-y divide-slate-100 max-h-80 overflow-y-auto">
          {googleProfiles.map((p) => {
            const isProcessing = authenticatingEmail === p.email
            return (
              <button
                key={p.email}
                type="button"
                disabled={Boolean(authenticatingEmail)}
                onClick={() => handleChoose(p.email, p.name)}
                className="w-full flex items-center gap-3.5 p-3 rounded-xl hover:bg-slate-50 transition text-left group disabled:opacity-60"
              >
                <div
                  className={`size-10 rounded-full ${p.color} text-white font-semibold grid place-items-center text-sm shadow-xs shrink-0`}
                >
                  {isProcessing ? (
                    <Loader2 className="size-4 animate-spin text-white" />
                  ) : (
                    p.initials
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition truncate">
                      {p.name}
                    </p>
                    <span className="text-[0.62rem] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full font-bold">
                      Whitelist
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono truncate">
                    {p.email}
                  </p>
                </div>
                <ChevronRight className="size-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
              </button>
            )
          })}

          {/* Use another Google account */}
          <div className="p-2">
            {!showCustomInput ? (
              <button
                type="button"
                disabled={Boolean(authenticatingEmail)}
                onClick={() => setShowCustomInput(true)}
                className="w-full flex items-center gap-3.5 p-3 rounded-xl hover:bg-slate-50 transition text-left text-slate-700 hover:text-slate-900"
              >
                <div className="size-10 rounded-full border border-slate-300 grid place-items-center text-slate-500 shrink-0">
                  <User className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Gunakan akun Google lain</p>
                  <p className="text-[0.68rem] text-slate-400">
                    Uji akun di luar whitelist (akan ditolak oleh sistem)
                  </p>
                </div>
              </button>
            ) : (
              <form onSubmit={handleCustomSubmit} className="p-2 space-y-2.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Masukkan Alamat Email Google:
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    autoFocus
                    value={customEmail}
                    onChange={(e) => {
                      setCustomEmail(e.target.value)
                      setCustomError(null)
                    }}
                    placeholder="nama@gmail.com"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={Boolean(authenticatingEmail)}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {authenticatingEmail ? "Memproses..." : "Lanjut"}
                  </button>
                </div>
                {customError && (
                  <p className="text-[0.7rem] text-red-600 font-medium">{customError}</p>
                )}
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="text-[0.68rem]">Google Identity Services • OAuth 2.0</span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MODAL 4: LOGIN SCREEN (PORTAL INSTITUSIONAL RESMI)
// ============================================================================
export function LoginScreen() {
  const { candidates, loginCandidateByNik, loginCoachWithGoogle } = useApp()
  const [loginTab, setLoginTab] = useState<"candidate" | "coach">("candidate")

  // Candidate NIK state (16-digit OTP slots: 3 - 3 - 6 - 4)
  const [nikSlots, setNikSlots] = useState<string[]>(() => Array(16).fill(""))
  const [nikError, setNikError] = useState<string | null>(null)
  const otpRefs = useRef<Array<HTMLInputElement | null>>([])

  // Coach Google state
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false)
  const OFFICIAL_GOOGLE_CLIENT_ID =
    "87369771174-0gcuas7sn7af7mn4eer08d16c8qcv2qn.apps.googleusercontent.com"

  const googleClientId =
    localStorage.getItem("paska_google_client_id") ||
    (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) ||
    OFFICIAL_GOOGLE_CLIENT_ID

  const filledCount = useMemo(
    () => nikSlots.filter((d) => /^\d$/.test(d)).length,
    [nikSlots],
  )
  const cleanNik = useMemo(() => nikSlots.join(""), [nikSlots])

  function focusSlot(idx: number) {
    const clamped = Math.max(0, Math.min(15, idx))
    const el = otpRefs.current[clamped]
    if (el) {
      el.focus()
      el.select()
    }
  }

  function handleSlotChange(index: number, rawValue: string) {
    const digits = rawValue.replace(/\D/g, "")
    setNikError(null)

    if (!digits) {
      setNikSlots((prev) => {
        const next = [...prev]
        next[index] = ""
        return next
      })
      return
    }

    if (digits.length === 1) {
      setNikSlots((prev) => {
        const next = [...prev]
        next[index] = digits
        return next
      })
      if (index < 15) {
        focusSlot(index + 1)
      }
      return
    }

    // Multiple digits entered at once (e.g. mobile autofill)
    const startIdx = digits.length >= 12 ? 0 : index
    setNikSlots((prev) => {
      const next = [...prev]
      for (let i = 0; i < digits.length && startIdx + i < 16; i++) {
        next[startIdx + i] = digits[i]
      }
      return next
    })
    focusSlot(Math.min(15, startIdx + digits.length))
  }

  function handleSlotKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Backspace") {
      e.preventDefault()
      setNikError(null)
      if (nikSlots[index]) {
        setNikSlots((prev) => {
          const next = [...prev]
          next[index] = ""
          return next
        })
      } else if (index > 0) {
        setNikSlots((prev) => {
          const next = [...prev]
          next[index - 1] = ""
          return next
        })
        focusSlot(index - 1)
      }
      return
    }

    if (e.key === "Delete") {
      e.preventDefault()
      setNikError(null)
      setNikSlots((prev) => {
        const next = [...prev]
        next[index] = ""
        return next
      })
      return
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault()
      if (index > 0) focusSlot(index - 1)
      return
    }

    if (e.key === "ArrowRight") {
      e.preventDefault()
      if (index < 15) focusSlot(index + 1)
      return
    }

    if (e.key === "Home") {
      e.preventDefault()
      focusSlot(0)
      return
    }

    if (e.key === "End") {
      e.preventDefault()
      focusSlot(15)
      return
    }

    // Overwrite existing digit seamlessly when typing a number on an already-filled slot
    if (/^\d$/.test(e.key) && nikSlots[index]) {
      e.preventDefault()
      const digit = e.key
      setNikError(null)
      setNikSlots((prev) => {
        const next = [...prev]
        next[index] = digit
        return next
      })
      if (index < 15) {
        focusSlot(index + 1)
      }
    }
  }

  function handleSlotPaste(
    index: number,
    e: React.ClipboardEvent<HTMLInputElement>,
  ) {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "")
    if (!pasted) return
    setNikError(null)
    const startIdx = pasted.length >= 12 ? 0 : index
    setNikSlots((prev) => {
      const next = [...prev]
      for (let i = 0; i < pasted.length && startIdx + i < 16; i++) {
        next[startIdx + i] = pasted[i]
      }
      return next
    })
    focusSlot(Math.min(15, startIdx + pasted.length - 1))
  }

  // Live match candidate identification
  const matchedCandidate = useMemo(() => {
    if (cleanNik.length < 4) return null
    return candidates.find(
      (c) =>
        (c.nik && c.nik.replace(/\s+/g, "") === cleanNik) ||
        c.number.toLowerCase() === cleanNik.toLowerCase(),
    )
  }, [candidates, cleanNik])

  // Initialize official Google Identity Services (GIS) if available
  useEffect(() => {
    if (loginTab !== "coach") return
    const google = (window as unknown as { google?: any })?.google
    if (!google?.accounts?.id) return

    try {
      const activeClientId = googleClientId || OFFICIAL_GOOGLE_CLIENT_ID

      google.accounts.id.initialize({
        client_id: activeClientId,
        callback: (response: { credential?: string }) => {
          if (response?.credential) {
            const payload = parseGoogleJwt(response.credential)
            if (payload?.email) {
              handleGoogleCoachLogin(payload.email, {
                name: payload.name,
                picture: payload.picture,
              })
            }
          }
        },
      })
    } catch (err) {
      console.warn("GIS initialization notice:", err)
    }
  }, [loginTab, googleClientId])

  function handleCandidateSubmit(e: React.FormEvent) {
    e.preventDefault()
    setNikError(null)
    if (!cleanNik) {
      setNikError("Silakan masukkan 16 digit NIK santri.")
      return
    }
    const res = loginCandidateByNik(cleanNik)
    if (!res.success && res.error) {
      setNikError(res.error)
    }
  }

  function handleGoogleCoachLogin(
    email: string,
    profile?: { name?: string; picture?: string },
  ) {
    setGoogleError(null)
    const res = loginCoachWithGoogle(email, profile)
    if (!res.success && res.error) {
      setGoogleError(res.error)
    }
  }

  // REAL GOOGLE IDENTITY SERVICES / OAUTH TRIGGER
  function handleTriggerRealGoogleSignIn() {
    setGoogleError(null)
    setIsConnectingGoogle(true)
    const google = (window as unknown as { google?: any })?.google

    // 1. If Google OAuth2 Token Client is available, use it directly!
    const activeClientId = googleClientId || OFFICIAL_GOOGLE_CLIENT_ID
    if (google?.accounts?.oauth2 && activeClientId) {
      try {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: activeClientId,
          scope: "email profile openid",
          error_callback: (nonOAuthError: any) => {
            setIsConnectingGoogle(false)
            console.warn("Google OAuth notice:", nonOAuthError)
            setGoogleError("Google tidak dapat mengautentikasi akun. Silakan coba lagi.")
          },
          callback: async (resp: any) => {
            setIsConnectingGoogle(false)
            if (resp?.access_token) {
              try {
                const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                  headers: { Authorization: `Bearer ${resp.access_token}` },
                })
                const userInfo = await userRes.json()
                if (userInfo?.email) {
                  handleGoogleCoachLogin(userInfo.email, {
                    name: userInfo.name,
                    picture: userInfo.picture,
                  })
                  return
                }
              } catch (e) {
                console.warn("Google userinfo fetch fallback", e)
              }
            }
            setGoogleError("Tidak dapat mengambil profil Google. Silakan coba lagi.")
          },
        })
        client.requestAccessToken()
        return
      } catch (err) {
        console.warn("OAuth token client failed", err)
        setIsConnectingGoogle(false)
        setGoogleError("Google Sign-In gagal dimulai. Silakan coba lagi.")
        return
      }
    }

    // 2. Fallback to Google prompt or official Google Account Chooser
    setTimeout(() => {
      setIsConnectingGoogle(false)
      if (google?.accounts?.id && googleClientId) {
        google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setGoogleError("Google Sign-In tidak tersedia di browser ini. Silakan coba lagi.")
          }
        })
      } else {
        setGoogleError("Google Sign-In tidak tersedia di browser ini. Silakan muat ulang halaman.")
      }
    }, 300)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-red-700 selection:text-white">
      {/* Bottom-Right Paskibraka Emblem Graphic (Full Opacity & Large) */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none fixed -bottom-24 -right-20 z-0"
      >
        <img
          src={logoUrl}
          alt=""
          className="w-80 sm:w-[28rem] lg:w-[34rem] h-auto object-contain -rotate-6 drop-shadow-xl"
        />
      </div>

      {/* Top 3px National Accent Bar */}
      <div className="relative z-10 h-[3px] w-full bg-red-700" />

      {/* Top Institutional Bar */}
      <header className="relative z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[84rem] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img
              src={logoUrl}
              alt="BACAPASMUIN!"
              className="h-9 w-auto object-contain"
            />
            <div className="flex items-baseline gap-2.5">
              <span className="font-display text-sm font-extrabold tracking-tight text-slate-950 sm:text-base">
                BACAPASMUIN!
              </span>
              <span className="hidden text-slate-300 sm:inline">/</span>
              <span className="hidden text-xs font-medium text-slate-500 sm:inline">
                Madrasah Mu&apos;allimin Muhammadiyah Yogyakarta
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="font-mono text-[0.7rem] font-medium text-slate-600">
              PERIODE 2026/2027
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center">
        <div className="mx-auto w-full max-w-[84rem] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="grid items-start gap-8 lg:grid-cols-[0.94fr_1.06fr] lg:gap-9">
            
            {/* Left Column: System Overview & Complete 8-Stage Index */}
            <div className="order-2 lg:order-1">
              <div className="border-b border-slate-200 pb-6">
                <p className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-red-700">
                  Sistem Pembinaan &amp; Seleksi Paskibraka
                </p>
                <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Manajemen Latihan, Evaluasi Fisik, dan Seleksi Terpadu
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
                  Pusat data pemantauan kesiapan calon Paskibraka utusan MA Mu&apos;allimin Yogyakarta. Mencakup rekapitulasi berkas, antropometri kesehatan, latihan baris-berbaris, kesamaptaan jasmani, hingga simulasi ujian.
                </p>
              </div>

              {/* 8-Stage Specification Index (Editorial Grid, No AI Slop Cards) */}
              <div className="mt-6">
                <div className="flex items-center justify-between pb-3">
                  <span className="font-mono text-[0.68rem] font-semibold uppercase tracking-wider text-slate-500">
                    Cakupan 8 Materi Pembinaan &amp; Seleksi
                  </span>
                  <span className="font-mono text-[0.68rem] text-slate-400">
                    Acuan BPIP
                  </span>
                </div>

                <div className="grid grid-cols-1 border-t border-l border-slate-200 bg-white sm:grid-cols-2">
                  {[
                    {
                      num: "01",
                      code: "ADM",
                      title: "Administrasi & Berkas",
                      desc: "Verifikasi 6 dokumen syarat pendaftaran",
                      icon: FileCheck2,
                      iconWrap: "bg-emerald-50 text-emerald-600 border-emerald-200/80",
                      badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
                      numColor: "text-emerald-600",
                    },
                    {
                      num: "02",
                      code: "PIP",
                      title: "Wawasan Kebangsaan",
                      desc: "Ideologi Pancasila & kepaskibrakaan",
                      icon: Landmark,
                      iconWrap: "bg-red-50 text-red-600 border-red-200/80",
                      badge: "bg-red-50 text-red-700 border-red-200/80",
                      numColor: "text-red-600",
                    },
                    {
                      num: "03",
                      code: "TIU",
                      title: "Intelegensia Umum",
                      desc: "Kemampuan verbal, numerik & logika",
                      icon: BrainCircuit,
                      iconWrap: "bg-blue-50 text-blue-600 border-blue-200/80",
                      badge: "bg-blue-50 text-blue-700 border-blue-200/80",
                      numColor: "text-blue-600",
                    },
                    {
                      num: "04",
                      code: "RIK",
                      title: "Kesehatan & Antropometri",
                      desc: "Tinggi/berat badan, postur & buta warna",
                      icon: HeartPulse,
                      iconWrap: "bg-teal-50 text-teal-600 border-teal-200/80",
                      badge: "bg-teal-50 text-teal-700 border-teal-200/80",
                      numColor: "text-teal-600",
                    },
                    {
                      num: "05",
                      code: "PAR",
                      title: "Parade & Sikap Tubuh",
                      desc: "Proporsi anatomi & konsistensi sikap",
                      icon: Ruler,
                      iconWrap: "bg-indigo-50 text-indigo-600 border-indigo-200/80",
                      badge: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
                      numColor: "text-indigo-600",
                    },
                    {
                      num: "06",
                      code: "PBB",
                      title: "Peraturan Baris-Berbaris",
                      desc: "Gerak di tempat, berjalan & aba-aba",
                      icon: Compass,
                      iconWrap: "bg-amber-50 text-amber-600 border-amber-200/80",
                      badge: "bg-amber-50 text-amber-700 border-amber-200/80",
                      numColor: "text-amber-600",
                    },
                    {
                      num: "07",
                      code: "SAM",
                      title: "Kesamaptaan Jasmani",
                      desc: "Lari 12 menit, push-up, sit-up & shuttle",
                      icon: Activity,
                      iconWrap: "bg-orange-50 text-orange-600 border-orange-200/80",
                      badge: "bg-orange-50 text-orange-700 border-orange-200/80",
                      numColor: "text-orange-600",
                    },
                    {
                      num: "08",
                      code: "KEP",
                      title: "Kepribadian & Wawancara",
                      desc: "Evaluasi mental, rekam jejak & minat bakat",
                      icon: MessagesSquare,
                      iconWrap: "bg-violet-50 text-violet-600 border-violet-200/80",
                      badge: "bg-violet-50 text-violet-700 border-violet-200/80",
                      numColor: "text-violet-600",
                    },
                  ].map((item) => {
                    const StageIcon = item.icon
                    return (
                      <div
                        key={item.num}
                        className="flex items-start gap-2.5 border-r border-b border-slate-200 px-3.5 py-3 transition-colors hover:bg-slate-50/70"
                      >
                        <div
                          className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border ${item.iconWrap}`}
                        >
                          <StageIcon className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[0.65rem] font-semibold text-slate-400">
                              {item.num}
                            </span>
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {item.title}
                            </p>
                          </div>
                          <p className="mt-0.5 text-[0.69rem] leading-snug text-slate-500">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Institutional Footnote */}
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
                <span>
                  Terdaftar: <strong className="font-semibold text-slate-800">{candidates.length} santri aktif</strong>
                </span>
                <span className="text-slate-300">•</span>
                <span>
                  Tingkat: <strong className="font-semibold text-slate-800">Kabupaten / Kota</strong>
                </span>
                <span className="text-slate-300">•</span>
                <span>
                  Metode: <strong className="font-semibold text-slate-800">Pembinaan Non-Gugur</strong>
                </span>
              </div>
            </div>

            {/* Right Column: Authentication Panel */}
            <div className="order-1 lg:order-2">
              <div className="border border-slate-200 bg-white shadow-2xs">
                {/* Role Switcher Tabs (Top Bordered) */}
                <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginTab("candidate")
                      setNikError(null)
                    }}
                    className={`flex items-center justify-center gap-2 border-b-2 py-3.5 px-4 text-xs font-semibold transition sm:text-sm ${
                      loginTab === "candidate"
                        ? "border-red-700 bg-white text-slate-950"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <GraduationCap className="size-4" />
                    <span>Santri / Peserta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLoginTab("coach")
                      setGoogleError(null)
                    }}
                    className={`flex items-center justify-center gap-2 border-b-2 border-l border-l-slate-200 py-3.5 px-4 text-xs font-semibold transition sm:text-sm ${
                      loginTab === "coach"
                        ? "border-b-slate-900 bg-white text-slate-950"
                        : "border-b-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Shield className="size-4" />
                    <span>Pelatih &amp; Juri</span>
                  </button>
                </div>

                <div className="p-5 sm:p-6 min-h-[21rem] flex flex-col justify-between">
                  {loginTab === "candidate" ? (
                    <div className="space-y-5">
                      <div>
                        <h2 className="font-display text-lg font-bold tracking-tight text-slate-950">
                          Akses Portal Santri
                        </h2>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                          Lihat progres pembinaan fisik, kelengkapan berkas, panduan materi, hasil penilaian lapangan, serta akses ujian yang dijadwalkan.
                        </p>
                      </div>

                      <form onSubmit={handleCandidateSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label
                              htmlFor="nik-otp-0"
                              className="text-xs font-semibold text-slate-700"
                            >
                              Nomor Induk Kependudukan (NIK)
                            </label>
                            <div className="flex items-center gap-2.5">
                              {filledCount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNikSlots(Array(16).fill(""))
                                    setNikError(null)
                                    focusSlot(0)
                                  }}
                                  className="text-[0.68rem] font-medium text-slate-400 hover:text-slate-700 transition"
                                >
                                  Reset
                                </button>
                              )}
                              <span
                                className={`font-mono text-[0.68rem] font-semibold ${
                                  filledCount === 16
                                    ? "text-emerald-700"
                                    : "text-slate-400"
                                }`}
                              >
                                {filledCount}/16 digit
                              </span>
                            </div>
                          </div>

                          {/* 16-Box OTP Style Input: 3 - 3 - 6 - 4 */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-x-1">
                              {[
                                { indices: [0, 1, 2], label: "Wil. I (3)" },
                                { indices: [3, 4, 5], label: "Wil. II (3)" },
                                { indices: [6, 7, 8, 9, 10, 11], label: "Tgl Lahir (6)" },
                                { indices: [12, 13, 14, 15], label: "Urut (4)" },
                              ].map((group, groupIdx) => (
                                <div key={group.label} className="contents">
                                  {groupIdx > 0 && (
                                    <span
                                      aria-hidden="true"
                                      className="font-mono text-xs font-bold text-slate-300 select-none shrink-0"
                                    >
                                      -
                                    </span>
                                  )}
                                  <div
                                    className="grid gap-[3px] min-w-0"
                                    style={{
                                      flex: group.indices.length,
                                      gridTemplateColumns: `repeat(${group.indices.length}, minmax(0, 1fr))`,
                                    }}
                                  >
                                    {group.indices.map((slotIdx) => {
                                      const val = nikSlots[slotIdx] || ""
                                      const isCompleteMatch =
                                        Boolean(matchedCandidate) && filledCount === 16
                                      return (
                                        <input
                                          key={slotIdx}
                                          id={slotIdx === 0 ? "nik-otp-0" : undefined}
                                          ref={(el) => {
                                            otpRefs.current[slotIdx] = el
                                          }}
                                          type="text"
                                          inputMode="numeric"
                                          pattern="[0-9]*"
                                          maxLength={1}
                                          autoComplete="off"
                                          aria-label={`Digit NIK ke-${slotIdx + 1}`}
                                          value={val}
                                          onFocus={(e) => e.currentTarget.select()}
                                          onChange={(e) =>
                                            handleSlotChange(slotIdx, e.target.value)
                                          }
                                          onKeyDown={(e) => handleSlotKeyDown(slotIdx, e)}
                                          onPaste={(e) => handleSlotPaste(slotIdx, e)}
                                          className={`aspect-square w-full rounded-[5px] border text-center font-mono text-xs sm:text-sm font-bold p-0 outline-none transition-all duration-150 focus:z-10 focus:border-blue-600 focus:bg-white focus:ring-[3px] focus:ring-blue-500/20 ${
                                            isCompleteMatch
                                              ? "border-emerald-500 bg-emerald-50/40 text-emerald-950"
                                              : val
                                                ? "border-slate-400 bg-white text-slate-950"
                                                : "border-slate-300 bg-white text-slate-900 hover:border-slate-400"
                                          }`}
                                        />
                                      )
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Subtle Segment Guide (3 - 3 - 6 - 4) */}
                            <div className="hidden sm:flex items-center justify-between text-[0.62rem] font-mono text-slate-400 px-0.5">
                              <span>Kode Wil. (3-3)</span>
                              <span>Tgl Lahir DDMMYY (6)</span>
                              <span>No. Urut (4)</span>
                            </div>
                          </div>
                        </div>

                        {matchedCandidate && (
                          <div className="flex items-center gap-3 border border-emerald-200 bg-emerald-50/60 px-3.5 py-2.5">
                            <CandidateAvatar
                              name={matchedCandidate.name}
                              avatar={matchedCandidate.avatar}
                              photoUrl={matchedCandidate.photoUrl}
                              className="size-9 shrink-0 text-xs font-bold"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {matchedCandidate.name}
                              </p>
                              <p className="font-mono text-[0.68rem] text-emerald-800 truncate">
                                {matchedCandidate.number} · {matchedCandidate.school}
                              </p>
                            </div>
                            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                          </div>
                        )}

                        {nikError && (
                          <div className="flex items-start gap-2 border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
                            <AlertCircle className="size-4 shrink-0 text-red-600 mt-0.5" />
                            <span>{nikError}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={filledCount !== 16}
                          className="flex w-full items-center justify-center gap-2 bg-red-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:text-sm"
                        >
                          <span>Masuk sebagai Santri</span>
                          <ArrowRight className="size-4" />
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div>
                        <h2 className="font-display text-lg font-bold tracking-tight text-slate-950">
                          Akses Pelatih, Juri &amp; Tim Penyeleksi
                        </h2>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                          Input skor lapangan (PBB, Samapta, Parade &amp; Wawancara), verifikasi berkas &amp; pemeriksaan medis, kelola sesi ujian, serta pantau klasemen seleksi.
                        </p>
                      </div>

                      <div className="space-y-3 pt-1">
                        <button
                          type="button"
                          disabled={isConnectingGoogle}
                          onClick={handleTriggerRealGoogleSignIn}
                          className="flex w-full items-center justify-center gap-3 border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 hover:border-slate-400 disabled:cursor-wait disabled:opacity-60 sm:text-sm"
                        >
                          {isConnectingGoogle ? (
                            <Loader2 className="size-4 animate-spin text-slate-700" />
                          ) : (
                            <GoogleIcon className="size-4" />
                          )}
                          <span>
                            {isConnectingGoogle
                              ? "Memverifikasi kredensial..."
                              : "Masuk dengan Akun Google"}
                          </span>
                        </button>

                        {googleError && (
                          <div className="flex items-start gap-2 border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
                            <AlertCircle className="size-4 shrink-0 text-red-600 mt-0.5" />
                            <span>{googleError}</span>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-100 pt-4 text-[0.7rem] leading-relaxed text-slate-500">
                        <p className="font-semibold text-slate-700">
                          Otorisasi Pelatih, Juri &amp; Medis:
                        </p>
                        <p className="mt-0.5">
                          Akses penilaian dan manajemen hanya diberikan bagi akun Google pelatih, juri (tim penyeleksi), serta petugas medis yang terdaftar di daftar izin (allowlist) sistem.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <img
                        src={logoTontiUrl}
                        alt="Tonti Mu'allimin — Caraka Bhaskara Muda"
                        className="h-10 sm:h-11 w-auto object-contain"
                      />
                      <img
                        src={logoMualliminUrl}
                        alt="Madrasah Mu'allimin Muhammadiyah Yogyakarta"
                        className="h-9 sm:h-10 w-auto object-contain"
                      />
                      <span className="h-6 w-px bg-slate-200" />
                      <span className="text-xs font-semibold text-slate-600">
                        Utusan MA Mu&apos;allimin
                      </span>
                    </div>
                    <span className="font-mono text-[0.7rem] text-slate-400">BPIP-STD</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200/80 bg-white/85 backdrop-blur-[2px] py-3.5 text-xs text-slate-500">
        <div className="mx-auto flex max-w-[84rem] flex-wrap items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
          <p>© 2026–2027 Madrasah Mu&apos;allimin Muhammadiyah Yogyakarta</p>
          <p className="text-[0.7rem] text-slate-400">
            Sistem Informasi Pembinaan &amp; Seleksi Paskibraka
          </p>
        </div>
      </footer>
    </div>
  )
}

import { useMemo, useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  CloudUpload,
  Copy,
  Download,
  Filter,
  GraduationCap,
  History,
  Info,
  Lock,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  User,
  UserCheck,
  UserCog,
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

// Whitelist email resmi pelatih sesuai instruksi pengguna
const AUTHORIZED_COACH_EMAILS = [
  "andiaqillahfadiahaswat@gmail.com",
  "andiaqillah@muallimin.sch.id",
]

const ROLE_PERMISSIONS: Record<
  UserRole,
  { label: string; badge: "danger" | "info" | "success" | "warning" | "neutral"; description: string; permissions: string[] }
> = {
  admin: {
    label: "Administrator",
    badge: "danger",
    description: "Akses penuh ke seluruh modul, manajemen pengguna, konfigurasi sistem, dan integrasi cloud.",
    permissions: [
      "Manajemen seluruh data kandidat & nilai",
      "Konfigurasi standar, tahapan & bobot seleksi",
      "Kelola akun staf & otorisasi Google OAuth",
      "Sinkronisasi Google Sheets & reset database",
      "Akses penuh jejak audit sistem",
    ],
  },
  coach: {
    label: "Pelatih / Pembina",
    badge: "neutral",
    description: "Pendampingan latihan fisik, parade, PBB, bank soal CAT, dan evaluasi harian kandidat.",
    permissions: [
      "Pencatatan sesi latihan & log harian",
      "Input & evaluasi butir soal CAT BPIP",
      "Pemantauan antropometri & kebugaran",
      "Lihat pemeringkatan sementara",
      "Sinkronisasi data ke Google Sheets",
    ],
  },
  medical: {
    label: "Tim Medis",
    badge: "success",
    description: "Pemeriksaan kesehatan, tes buta warna Ishihara, antropometri fisik, dan riwayat cedera.",
    permissions: [
      "Input hasil skrining Ishihara (buta warna)",
      "Pencatatan tekanan darah, TB/BB & BMI",
      "Validasi berkas rekam medis & riwayat penyakit",
      "Pemberian catatan kelayakan medis santri",
    ],
  },
  judge: {
    label: "Juri Penilai",
    badge: "warning",
    description: "Penilaian obyektif tahapan seleksi (PBB, wawancara kepribadian, parade, dan kesamaptaan).",
    permissions: [
      "Input lembar penilaian tahapan seleksi",
      "Verifikasi berkas persyaratan administratif",
      "Pemberian skor rubrik wawancara & parade",
      "Melihat rekap skor kandidat binaan",
    ],
  },
  candidate: {
    label: "Santri / Kandidat",
    badge: "info",
    description: "Akses terbatas ke ruang ujian CAT Tryout dan pemantauan dokumen persyaratan mandiri.",
    permissions: [
      "Pengerjaan simulasi ujian CAT (PIP & TIU)",
      "Melihat riwayat skor & pembahasan ujian",
      "Cek status kelengkapan 6 dokumen pokok",
    ],
  },
}

export default function UsersAuditView({
  onNavigate,
}: {
  onNavigate?: (view: any) => void
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
    lastCloudSync,
    showToast,
  } = useApp()

  const [activeTab, setActiveTab] = useState<
    "switch" | "candidates" | "manage" | "audit"
  >("switch")

  // Tab 2: Candidate search & filter
  const [candidateSearch, setCandidateSearch] = useState("")
  const [copiedNik, setCopiedNik] = useState<string | null>(null)

  // Tab 3: Add new user form
  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newRole, setNewRole] = useState<UserRole>("coach")
  const [newTitle, setNewTitle] = useState("Pelatih Pendamping")

  // Tab 4: Audit search & filters
  const [auditSearch, setAuditSearch] = useState("")
  const [auditActionFilter, setAuditActionFilter] = useState<string>("all")

  // Reset confirmation modal state
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Filtered candidates for simulation
  const filteredCandidates = useMemo(() => {
    if (!candidateSearch.trim()) return candidates
    const term = candidateSearch.toLowerCase()
    return candidates.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.number.toLowerCase().includes(term) ||
        (c.nik && c.nik.includes(term)) ||
        c.school.toLowerCase().includes(term),
    )
  }, [candidates, candidateSearch])

  // Filtered audit logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (auditActionFilter !== "all" && !log.action.toLowerCase().includes(auditActionFilter.toLowerCase())) {
        return false
      }
      if (auditSearch.trim()) {
        const term = auditSearch.toLowerCase()
        return (
          log.actor.toLowerCase().includes(term) ||
          log.action.toLowerCase().includes(term) ||
          log.target.toLowerCase().includes(term) ||
          log.detail.toLowerCase().includes(term) ||
          log.role.toLowerCase().includes(term)
        )
      }
      return true
    })
  }, [auditLogs, auditSearch, auditActionFilter])

  // Unique action types in audit logs
  const auditActionTypes = useMemo(() => {
    const set = new Set<string>()
    auditLogs.forEach((l) => {
      const mainAct = l.action.split("_")[0] || l.action
      set.add(mainAct)
    })
    return Array.from(set)
  }, [auditLogs])

  function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !newEmail.trim()) return
    addUser({
      name: newName.trim(),
      email: newEmail.trim(),
      role: newRole,
      title: newTitle.trim() || newRole.toUpperCase(),
      avatar: "",
      active: true,
    })
    showToast(`Akun staf "${newName.trim()}" berhasil didaftarkan.`, "success")
    setNewName("")
    setNewEmail("")
    setNewTitle("Pelatih Pendamping")
  }

  function handleCopyNik(nik: string) {
    navigator.clipboard.writeText(nik)
    setCopiedNik(nik)
    showToast(`NIK ${nik} disalin ke papan klip.`, "info")
    setTimeout(() => setCopiedNik(null), 2000)
  }

  function handleSimulateCandidate(cand: Candidate) {
    if (cand.nik) {
      loginCandidateByNik(cand.nik)
      showToast(`Beralih ke simulasi santri: ${cand.name}`, "info")
      if (onNavigate) {
        onNavigate("cat-bank")
      }
    }
  }

  function handleExportAuditCsv() {
    if (auditLogs.length === 0) {
      showToast("Tidak ada data audit log untuk diunduh.", "warning")
      return
    }
    const headers = ["ID", "Waktu", "Pelaku", "Role", "Aksi", "Target", "Detail"]
    const rows = auditLogs.map((l) => [
      l.id,
      `"${l.timestamp}"`,
      `"${l.actor}"`,
      `"${l.role}"`,
      `"${l.action}"`,
      `"${l.target}"`,
      `"${l.detail.replace(/"/g, '""')}"`,
    ])
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `paskibraka-audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast("Jejak audit berhasil diekspor ke CSV.", "success")
  }

  const isSyncing = syncStatus === "syncing" || cloudSyncStatus === "syncing"

  return (
    <div className="grid gap-6">
      {/* ===================================================================== */}
      {/* PAGE HEADER */}
      {/* ===================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Manajemen Pengguna &amp; Jejak Audit
            </h1>
            <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-red-700 ring-1 ring-inset ring-red-600/10">
              <ShieldCheck className="size-3 text-red-600" /> Admin &amp; RBAC
            </span>
          </div>
          <p className="mt-0.5 max-w-2xl text-xs text-slate-500">
            Pusat tata kelola otorisasi staf, simulasi pengujian peran santri, pantau log aktivitas sistem, dan sinkronisasi data cloud.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Button
            size="sm"
            variant="secondary"
            loading={isSyncing}
            onClick={async () => {
              if (googleSheetUrl) {
                await syncToGoogleSheet()
              } else {
                await syncWithBackend()
              }
            }}
            className="!text-xs font-semibold"
          >
            <CloudUpload className="size-3.5" />
            {isSyncing ? "Menyinkronkan..." : "Sinkronisasi Cloud"}
          </Button>

          <Button
            size="sm"
            variant="danger"
            onClick={() => setShowResetConfirm(true)}
            className="!text-xs font-semibold"
          >
            <RotateCcw className="size-3.5" /> Reset Database
          </Button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* NAVIGATION TABS */}
      {/* ===================================================================== */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <Button
          variant={activeTab === "switch" ? "primary" : "secondary"}
          onClick={() => setActiveTab("switch")}
          className="!text-xs font-bold"
        >
          <UserCheck className="size-3.5" /> Beralih Peran &amp; Profil
        </Button>
        <Button
          variant={activeTab === "candidates" ? "primary" : "secondary"}
          onClick={() => setActiveTab("candidates")}
          className="!text-xs font-bold"
        >
          <GraduationCap className="size-3.5" /> Simulasi Santri ({candidates.length})
        </Button>
        <Button
          variant={activeTab === "manage" ? "primary" : "secondary"}
          onClick={() => setActiveTab("manage")}
          className="!text-xs font-bold"
        >
          <UserCog className="size-3.5" /> Kelola Staf RBAC ({users.length})
        </Button>
        <Button
          variant={activeTab === "audit" ? "primary" : "secondary"}
          onClick={() => setActiveTab("audit")}
          className="!text-xs font-bold"
        >
          <History className="size-3.5" /> Jejak Audit ({auditLogs.length})
        </Button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: BERALIH PERAN & PROFIL STAF */}
      {/* ===================================================================== */}
      {activeTab === "switch" && (
        <div className="grid gap-6">
          {/* Active User Highlight Banner */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-linear-to-r from-slate-900 via-slate-850 to-slate-900 p-6 text-white shadow-md">
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <UserAvatar
                  avatar={currentUser.avatar}
                  name={currentUser.name}
                  className="size-16 ring-4 ring-white/10"
                  rounded="rounded-2xl"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-red-600 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-white">
                      Sesi Aktif Saat Ini
                    </span>
                    <Badge tone="neutral" className="!bg-white/10 !text-slate-200 border-none">
                      {currentUser.role.toUpperCase()}
                    </Badge>
                  </div>
                  <h3 className="mt-1 text-lg font-bold text-white sm:text-xl">
                    {currentUser.name}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {currentUser.title} · <span className="font-mono text-red-300">{currentUser.email}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  className="!text-xs text-slate-300 hover:bg-white/10 hover:text-white"
                  onClick={logout}
                >
                  <LogOut className="size-3.5" /> Keluar Sesi
                </Button>
              </div>
            </div>

            {/* Background decoration */}
            <div className="pointer-events-none absolute -right-6 -bottom-6 size-48 rounded-full bg-red-600/10 blur-2xl" />
          </div>

          {/* Whitelist Info Notice */}
          <div className="flex items-start gap-3 rounded-2xl border border-blue-200/80 bg-blue-50/60 p-4 text-xs leading-relaxed text-blue-900">
            <Info className="size-5 shrink-0 text-blue-600" />
            <div>
              <p className="font-bold">Ketentuan Autentikasi Google Sign-In Resmi:</p>
              <p className="mt-0.5 text-blue-800">
                Akses manajemen pelatih dikunci khusus untuk akun Google resmi yang terdaftar:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {AUTHORIZED_COACH_EMAILS.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-2.5 py-1 font-mono text-[0.7rem] font-bold text-blue-950 shadow-2xs"
                  >
                    <CheckCircle2 className="size-3 text-emerald-600" />
                    {email}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Switch Staff Grid */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Daftar Profil Staf &amp; Penguji Internal
                </h3>
                <p className="text-xs text-slate-500">
                  Pilih salah satu profil di bawah untuk beralih konteks peran dan menguji batas otorisasi.
                </p>
              </div>
              <Badge tone="neutral">{users.length} Profil Staf</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((u) => {
                const isCurrent = u.id === currentUser.id
                return (
                  <div
                    key={u.id}
                    onClick={() => {
                      if (!isCurrent) {
                        loginAs(u.id)
                        showToast(`Beralih ke akun ${u.name} (${u.role.toUpperCase()})`, "success")
                      }
                    }}
                    className={`group relative flex cursor-pointer items-start gap-3.5 rounded-2xl border p-4 text-left transition ${
                      isCurrent
                        ? "border-red-400 bg-red-50/50 ring-2 ring-red-100 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70"
                    }`}
                  >
                    <UserAvatar
                      avatar={u.avatar}
                      name={u.name}
                      className="size-11 shrink-0"
                      rounded="rounded-xl"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="truncate text-sm font-bold text-slate-900 group-hover:text-red-700">
                          {u.name}
                        </p>
                        {isCurrent ? (
                          <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[0.6rem] font-bold text-white">
                            Aktif
                          </span>
                        ) : (
                          <Badge tone={ROLE_PERMISSIONS[u.role]?.badge || "neutral"}>
                            {u.role.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{u.title}</p>
                      <p className="mt-1 truncate font-mono text-[0.68rem] text-slate-400">
                        {u.email}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Role Permissions Reference Matrix */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-bold text-slate-900">
              Matriks Batas Wewenang Peran (RBAC Matrix)
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Hak akses setiap komponen aplikasi disesuaikan dengan peran kerja masing-masing staf pembina.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(["admin", "coach", "medical", "judge"] as UserRole[]).map((r) => {
                const info = ROLE_PERMISSIONS[r]
                return (
                  <div
                    key={r}
                    className="flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-4"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{info.label}</span>
                        <Badge tone={info.badge}>{r.toUpperCase()}</Badge>
                      </div>
                      <p className="mt-2 text-[0.72rem] leading-relaxed text-slate-600">
                        {info.description}
                      </p>
                    </div>
                    <ul className="mt-3 space-y-1.5 border-t border-slate-200/60 pt-3 text-[0.68rem] text-slate-600">
                      {info.permissions.map((p, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <Check className="size-3 shrink-0 text-emerald-600 mt-0.5" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: SIMULASI AKSES SANTRI (LOGIN VIA NIK) */}
      {/* ===================================================================== */}
      {activeTab === "candidates" && (
        <div className="grid gap-4">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 text-xs leading-relaxed text-amber-900">
            <GraduationCap className="size-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-bold">Simulasi Portal Mandiri Santri (Tanpa Kata Sandi):</p>
              <p className="mt-0.5 text-amber-800">
                Santri melakukan login resmi secara mandiri menggunakan 16 digit NIK. Melalui panel ini, Anda dapat mensimulasikan antarmuka yang dilihat santri untuk validasi berkas dan pengerjaan CAT Tryout BPIP.
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative min-w-72 flex-1">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
                placeholder="Cari santri berdasarkan NIK, nama lengkap, atau sekolah..."
                className="!pl-9 !text-xs"
              />
            </div>
            <Badge tone="neutral">
              Menampilkan {filteredCandidates.length} dari {candidates.length} santri
            </Badge>
          </div>

          {/* Candidates Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCandidates.map((cand) => (
              <div
                key={cand.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-red-300 hover:shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <CandidateAvatar
                    name={cand.name}
                    avatar={cand.avatar}
                    photoUrl={cand.photoUrl}
                    className="size-11 shrink-0 text-xs font-bold"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-900" title={cand.name}>
                      {cand.name}
                    </p>
                    <p className="truncate text-[0.68rem] text-slate-500">{cand.school}</p>

                    {/* NIK Display with Copy Button */}
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="font-mono text-[0.7rem] font-bold text-red-600">
                        NIK: {cand.nik || "Belum diisi"}
                      </span>
                      {cand.nik && (
                        <button
                          type="button"
                          onClick={() => handleCopyNik(cand.nik!)}
                          title="Salin NIK"
                          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          {copiedNik === cand.nik ? (
                            <Check className="size-3 text-emerald-600" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <Button
                    variant="secondary"
                    className="w-full !py-1.5 !text-xs font-bold hover:!bg-red-50 hover:!text-red-700"
                    onClick={() => handleSimulateCandidate(cand)}
                  >
                    <UserCheck className="size-3.5 text-red-600" /> Masuk Sebagai Santri Ini
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: MANAJEMEN AKUN STAF (RBAC) */}
      {/* ===================================================================== */}
      {activeTab === "manage" && (
        <div className="grid gap-6">
          {/* Add user form (Admin only) */}
          {currentUser.role === "admin" ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900">
                  Daftarkan Akun Staf Baru
                </h3>
                <p className="text-xs text-slate-500">
                  Tambahkan pelatih pendamping, tim medis, atau juri penilai ke dalam sistem.
                </p>
              </div>

              <form onSubmit={handleAddUser} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Input
                  label="Nama lengkap staf"
                  required
                  placeholder="Contoh: Lettu Arifin"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="!text-xs"
                />
                <Input
                  label="Email Google"
                  type="email"
                  required
                  placeholder="arifin@gmail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="!text-xs"
                />
                <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                  Role Wewenang (RBAC)
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-red-500"
                  >
                    <option value="admin">Admin (Akses Penuh)</option>
                    <option value="coach">Coach (Pelatih Pendamping)</option>
                    <option value="medical">Tim Medis (Kesehatan &amp; Fisik)</option>
                    <option value="judge">Juri Penilai (Tahapan Seleksi)</option>
                  </select>
                </label>
                <Input
                  label="Jabatan / Bidang Tugas"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Pelatih Pendamping PBB"
                  className="!text-xs"
                />
                <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                  <Button type="submit" className="!text-xs font-bold">
                    <Plus className="size-3.5" /> Tambahkan Staf ke Sistem
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
              Pendaftaran akun staf baru hanya dapat dilakukan oleh pengguna dengan wewenang <strong>Administrator</strong>.
            </div>
          )}

          {/* Staff Accounts List */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
              <h3 className="text-xs font-bold text-slate-900">
                Daftar Staf Terdaftar ({users.length} Akun)
              </h3>
            </div>

            <div className="divide-y divide-slate-100">
              {users.map((u) => {
                const isCurrent = u.id === currentUser.id
                return (
                  <div
                    key={u.id}
                    className="flex flex-wrap items-center justify-between gap-4 p-4 transition hover:bg-slate-50/50"
                  >
                    <div className="flex items-center gap-3.5">
                      <UserAvatar
                        avatar={u.avatar}
                        name={u.name}
                        className="size-10"
                        rounded="rounded-xl"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">{u.name}</p>
                          {isCurrent && (
                            <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[0.6rem] font-bold text-white">
                              Anda
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {u.title} · <span className="font-mono text-slate-400">{u.email}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge tone={ROLE_PERMISSIONS[u.role]?.badge || "neutral"}>
                        {u.role.toUpperCase()}
                      </Badge>

                      <Badge tone={u.active ? "success" : "danger"}>
                        {u.active ? "Aktif" : "Nonaktif"}
                      </Badge>

                      {currentUser.role === "admin" && !isCurrent && (
                        <Button
                          variant="secondary"
                          className="!px-3 !py-1 !text-xs font-semibold"
                          onClick={() => {
                            toggleUserActive(u.id)
                            showToast(`Status staf ${u.name} diperbarui.`, "info")
                          }}
                        >
                          {u.active ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: LOG JEJAK AUDIT */}
      {/* ===================================================================== */}
      {activeTab === "audit" && (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search and filters */}
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-64">
              <div className="relative min-w-60 flex-1">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Cari nama pelaku, aksi, target, atau detail..."
                  className="!pl-9 !text-xs"
                />
              </div>

              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-red-500"
              >
                <option value="all">Semua Jenis Aksi</option>
                {auditActionTypes.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={handleExportAuditCsv}
                className="!text-xs font-semibold"
              >
                <Download className="size-3.5" /> Ekspor Log (CSV)
              </Button>
            </div>
          </div>

          {/* Audit logs table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-900">
                Catatan Aktivitas Sistem (Immutable Append-Only Audit Trail)
              </p>
              <Badge tone="info">{filteredAuditLogs.length} aktivitas ditampilkan</Badge>
            </div>

            <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
              {filteredAuditLogs.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  Tidak ada catatan audit yang cocok dengan filter.
                </div>
              ) : (
                filteredAuditLogs.map((log) => {
                  const isDanger =
                    log.action.includes("DELETE") ||
                    log.action.includes("RESET") ||
                    log.action.includes("DROP")
                  const isSuccess =
                    log.action.includes("LOGIN") ||
                    log.action.includes("CREATE") ||
                    log.action.includes("SYNC")

                  return (
                    <div key={log.id} className="p-4 transition hover:bg-slate-50/60">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge tone={isDanger ? "danger" : isSuccess ? "success" : "neutral"}>
                            {log.action}
                          </Badge>
                          <span className="text-xs font-bold text-slate-900">
                            {log.target}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[0.68rem] text-slate-400">
                          <Clock className="size-3" />
                          <span>{log.timestamp}</span>
                          <span>·</span>
                          <span className="font-semibold text-slate-600">
                            {log.actor} ({log.role.toUpperCase()})
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                        {log.detail}
                      </p>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: RESET DATABASE CONFIRMATION */}
      {/* ===================================================================== */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600">
              <div className="rounded-xl bg-red-100 p-2.5">
                <AlertTriangle className="size-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Konfirmasi Reset Database
                </h3>
                <p className="text-xs text-red-600 font-semibold">Tindakan Tidak Dapat Dibatalkan</p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-600">
              Apakah Anda yakin ingin mengembalikan seluruh database lokal ke nilai default awal? Semua penambahan nilai, butir soal kustom, dan berkas yang belum disinkronkan ke cloud akan dihapus.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <Button
                variant="ghost"
                onClick={() => setShowResetConfirm(false)}
                className="!text-xs font-bold"
              >
                Batalkan
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  resetAllData()
                  setShowResetConfirm(false)
                  showToast("Seluruh database telah dikembalikan ke kondisi default awal.", "info")
                }}
                className="!text-xs font-bold"
              >
                <RotateCcw className="size-3.5" /> Ya, Reset Seluruh Data
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

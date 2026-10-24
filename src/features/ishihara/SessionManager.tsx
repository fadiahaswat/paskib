import React, { useState, useMemo } from "react"
import {
  Calendar,
  Clock,
  UserCheck,
  Users,
  Plus,
  Play,
  Copy,
  Check,
  Eye,
  Shield,
  Trash2,
  RefreshCw,
  ExternalLink,
  Lock,
  Unlock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
} from "lucide-react"
import { Button, Card, Badge } from "../../components/ui"
import { useApp } from "../../context/AppContext"
import type {
  IshiharaTestSession,
  SessionMode,
  SessionStatus,
  ResultVisibility,
  TestAssignment,
} from "./types"

interface SessionManagerProps {
  onStartSessionForCandidate?: (sessionId: string, candidateId: string) => void
}

export default function SessionManager({
  onStartSessionForCandidate,
}: SessionManagerProps) {
  const {
    candidates,
    ishiharaSessions,
    addIshiharaSession,
    updateIshiharaSession,
    deleteIshiharaSession,
    updateSessionAssignment,
    currentUser,
    showToast,
  } = useApp()

  const [filterMode, setFilterMode] = useState<"all" | SessionMode>("all")
  const [filterStatus, setFilterStatus] = useState<"all" | SessionStatus>("all")
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(
    ishiharaSessions[0]?.id ?? null,
  )
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // Form State untuk Tambah Sesi
  const [formName, setFormName] = useState("")
  const [formCode, setFormCode] = useState("")
  const [formMode, setFormMode] = useState<SessionMode>("scheduled")
  const [formProtocol, setFormProtocol] = useState("BPIP-ISH-24-V1")
  const [formSeconds, setFormSeconds] = useState(5)
  const [formPlateCount, setFormPlateCount] = useState(24)
  const [formOperator, setFormOperator] = useState(
    currentUser.name.includes("Coach")
      ? "dr. Hendra (Tim Medis)"
      : currentUser.name,
  )
  const [formStartsAt, setFormStartsAt] = useState(
    new Date().toISOString().slice(0, 16),
  )
  const [formEndsAt, setFormEndsAt] = useState(
    new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16),
  )
  const [formVisibility, setFormVisibility] =
    useState<ResultVisibility>("staff_only")
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>(
    candidates.map((c) => c.id),
  )

  const filteredSessions = useMemo(() => {
    return ishiharaSessions.filter((s) => {
      if (filterMode !== "all" && s.mode !== filterMode) return false
      if (filterStatus !== "all" && s.status !== filterStatus) return false
      return true
    })
  }, [ishiharaSessions, filterMode, filterStatus])

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      showToast("Nama sesi wajib diisi.", "danger")
      return
    }

    const sessionCode =
      formCode.trim() ||
      `ISH-${
        formMode === "scheduled" ? "SCH" : "SELF"
      }-${Date.now().toString().slice(-4)}`

    const assignments: TestAssignment[] = selectedCandidateIds.map((cid) => {
      const cand = candidates.find((c) => c.id === cid)
      return {
        id: `asg-${Date.now()}-${cid}`,
        sessionId: "",
        participantId: cid,
        participantName: cand?.name ?? "Kandidat",
        participantNumber: cand?.number ?? "-",
        school: cand?.school ?? "MA Mu'allimin",
        assignedBy: currentUser.name,
        status: "assigned",
        assignedAt: new Date().toISOString(),
      }
    })

    const shareableToken =
      formMode === "self_service"
        ? `token_${Math.random().toString(36).substring(2, 12)}`
        : undefined

    addIshiharaSession({
      name: formName.trim(),
      code: sessionCode,
      mode: formMode,
      protocolVersion: formProtocol,
      secondsPerPlate: formSeconds,
      plateCount: formPlateCount,
      operatorName: formMode === "scheduled" ? formOperator : undefined,
      startsAt: new Date(formStartsAt).toISOString(),
      endsAt: new Date(formEndsAt).toISOString(),
      status: "open",
      maxAttempts: formMode === "scheduled" ? 1 : 2,
      allowResume: true,
      resultVisibility: formVisibility,
      createdBy: currentUser.name,
      shareableToken,
      assignments,
    })

    setIsCreateModalOpen(false)
    setFormName("")
    setFormCode("")
  }

  const handleCopyLink = (session: IshiharaTestSession) => {
    const origin = window.location.origin
    const link = `${origin}/#ishihara?session=${session.code}&token=${session.shareableToken ?? ""}`
    navigator.clipboard.writeText(link)
    setCopiedToken(session.id)
    showToast("Tautan sesi mandiri berhasil disalin ke clipboard!", "success")
    setTimeout(() => setCopiedToken(null), 3000)
  }

  const handleToggleSessionStatus = (session: IshiharaTestSession) => {
    const newStatus: SessionStatus =
      session.status === "open"
        ? "closed"
        : session.status === "closed"
          ? "open"
          : "open"
    updateIshiharaSession(session.id, { status: newStatus })
    showToast(
      `Status sesi "${session.name}" diubah menjadi ${
        newStatus === "open" ? "DIBUKA" : "DITUTUP"
      }.`,
      "info",
    )
  }

  const handleReopenAttempt = (
    sessionId: string,
    assignment: TestAssignment,
  ) => {
    updateSessionAssignment(sessionId, assignment.id, {
      status: "assigned",
      accuracy: undefined,
      correctCount: undefined,
      avgTimeSec: undefined,
      interpretationCode: undefined,
      completedAt: undefined,
    })
    showToast(
      `Percobaan untuk ${assignment.participantName} telah dibuka ulang.`,
      "info",
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Manajemen Sesi Skrining Ishihara
            </h2>
            <Badge tone="indigo" size="sm">
              PRD Bab 6
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dukung <strong>Mode A (Terjadwal dengan Operator/Pengawas)</strong>{" "}
            dan{" "}
            <strong>
              Mode B (Tes Mandiri dengan Tautan Berbatas Akun Internal)
            </strong>
            .
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold gap-2 text-xs"
          >
            <Plus className="size-4" /> Buat Sesi Baru
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 mr-2">Mode:</span>
          <button
            onClick={() => setFilterMode("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterMode === "all"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Semua Mode ({ishiharaSessions.length})
          </button>
          <button
            onClick={() => setFilterMode("scheduled")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterMode === "scheduled"
                ? "bg-white text-brand-700 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Mode A: Terjadwal (
            {ishiharaSessions.filter((s) => s.mode === "scheduled").length})
          </button>
          <button
            onClick={() => setFilterMode("self_service")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterMode === "self_service"
                ? "bg-white text-purple-700 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Mode B: Mandiri (
            {ishiharaSessions.filter((s) => s.mode === "self_service").length})
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-500">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">Semua Status</option>
            <option value="open">Aktif / Dibuka</option>
            <option value="closed">Ditutup</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Users className="size-6" />
          </div>
          <h3 className="font-display font-bold text-slate-800 text-sm">
            Belum ada sesi skrining
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Buat sesi baru untuk mengelompokkan kandidat santri dalam tes
            penglihatan warna baik terjadwal maupun mandiri.
          </p>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            size="sm"
            className="bg-brand-600 text-white font-bold gap-1.5"
          >
            <Plus className="size-3.5" /> Buat Sesi Pertama
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => {
            const completedCount = session.assignments.filter(
              (a) => a.status === "completed",
            ).length
            const totalCount = session.assignments.length
            const percent =
              totalCount > 0
                ? Math.round((completedCount / totalCount) * 100)
                : 0
            const isExpanded = expandedSessionId === session.id

            return (
              <Card
                key={session.id}
                className="overflow-hidden border border-slate-200 transition-all hover:border-slate-300"
              >
                {/* Session Card Header */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display font-bold text-base text-slate-900">
                        {session.name}
                      </h3>
                      <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-600 border border-slate-200">
                        {session.code}
                      </span>
                      {session.mode === "scheduled" ? (
                        <Badge tone="blue" size="sm">
                          Mode A: Terjadwal
                        </Badge>
                      ) : (
                        <Badge tone="purple" size="sm">
                          Mode B: Mandiri
                        </Badge>
                      )}
                      <Badge
                        tone={
                          session.status === "open"
                            ? "green"
                            : session.status === "closed"
                              ? "amber"
                              : "slate"
                        }
                        size="sm"
                      >
                        {session.status.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span>
                        Protokol:{" "}
                        <strong className="text-slate-700">
                          {session.protocolVersion}
                        </strong>{" "}
                        ({session.plateCount} plat)
                      </span>
                      <span>
                        Durasi per plat:{" "}
                        <strong className="text-slate-700">
                          {session.secondsPerPlate} detik
                        </strong>
                      </span>
                      {session.operatorName && (
                        <span>
                          Pengawas:{" "}
                          <strong className="text-slate-700">
                            {session.operatorName}
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Action & Progress Summary */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-700">
                        Progres:{" "}
                        <span className="text-brand-600">{completedCount}</span>{" "}
                        / {totalCount} santri
                      </div>
                      <div className="w-32 h-2 rounded-full bg-slate-100 overflow-hidden mt-1">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {session.mode === "self_service" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleCopyLink(session)}
                          className="gap-1.5 text-xs text-purple-700 border-purple-200 hover:bg-purple-50"
                          title="Salin Tautan Akses Mode Mandiri"
                        >
                          {copiedToken === session.id ? (
                            <Check className="size-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                          Salin Tautan
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleToggleSessionStatus(session)}
                        className="text-xs gap-1"
                        title={
                          session.status === "open" ? "Tutup Sesi" : "Buka Sesi"
                        }
                      >
                        {session.status === "open" ? (
                          <>
                            <Lock className="size-3.5 text-amber-600" /> Tutup
                          </>
                        ) : (
                          <>
                            <Unlock className="size-3.5 text-emerald-600" />{" "}
                            Buka
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setExpandedSessionId(isExpanded ? null : session.id)
                        }
                        className="text-xs gap-1"
                      >
                        {isExpanded ? (
                          <>
                            Tutup <ChevronUp className="size-3.5" />
                          </>
                        ) : (
                          <>
                            Detail Peserta <ChevronDown className="size-3.5" />
                          </>
                        )}
                      </Button>

                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Apakah Anda yakin ingin menghapus sesi "${session.name}"?`,
                            )
                          ) {
                            deleteIshiharaSession(session.id)
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                        title="Hapus Sesi"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Participants Table */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Daftar Penugasan Peserta ({session.assignments.length}{" "}
                        Santri)
                      </h4>
                      <span className="text-2xs text-slate-500">
                        Maksimal {session.maxAttempts} percobaan per peserta
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-3xs">
                          <tr>
                            <th className="py-2.5 px-3">No Peserta</th>
                            <th className="py-2.5 px-3">Nama Santri</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Akurasi</th>
                            <th className="py-2.5 px-3">Waktu Selesai</th>
                            <th className="py-2.5 px-3 text-right">
                              Aksi Operator
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {session.assignments.map((asg) => (
                            <tr key={asg.id} className="hover:bg-slate-50/80">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                                {asg.participantNumber}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">
                                {asg.participantName}
                              </td>
                              <td className="py-2.5 px-3">
                                {asg.status === "completed" ? (
                                  <Badge tone="green" size="sm">
                                    Selesai
                                  </Badge>
                                ) : asg.status === "in_progress" ? (
                                  <Badge tone="amber" size="sm">
                                    Berjalan
                                  </Badge>
                                ) : (
                                  <Badge tone="slate" size="sm">
                                    Belum Mulai
                                  </Badge>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                {asg.accuracy !== undefined ? (
                                  <span
                                    className={`font-bold ${
                                      asg.accuracy >= 85
                                        ? "text-emerald-600"
                                        : "text-amber-600"
                                    }`}
                                  >
                                    {asg.accuracy}% ({asg.correctCount}/
                                    {asg.totalPlates})
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500">
                                {asg.completedAt
                                  ? new Date(
                                      asg.completedAt,
                                    ).toLocaleTimeString("id-ID", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "—"}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {asg.status !== "completed" &&
                                    onStartSessionForCandidate && (
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          onStartSessionForCandidate(
                                            session.id,
                                            asg.participantId,
                                          )
                                        }
                                        className="bg-brand-600 hover:bg-brand-700 text-white text-2xs px-2.5 py-1 gap-1"
                                      >
                                        <Play className="size-3" /> Mulai Tes
                                      </Button>
                                    )}

                                  {asg.status === "completed" && (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() =>
                                        handleReopenAttempt(session.id, asg)
                                      }
                                      className="text-2xs px-2 py-1 text-slate-600 hover:text-amber-700 gap-1"
                                      title="Buka ulang percobaan jika ada kendala teknis (PRD 8.2)"
                                    >
                                      <RefreshCw className="size-3" /> Buka
                                      Ulang
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Buat Sesi Baru */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Buat Sesi Skrining Ishihara Baru
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tentukan mode pelaksanaan, parameter protokol medis, dan
                  daftar kandidat.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="mt-4 space-y-4">
              {/* Nama & Kode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Sesi *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: Skrining Rikkes Tahap 4 - Kloter 1"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kode Sesi (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="Auto: ISH-SCH-XXXX"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500 font-mono"
                  />
                </div>
              </div>

              {/* Mode Pelaksanaan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mode Pelaksanaan (PRD Bab 6)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      formMode === "scheduled"
                        ? "border-brand-500 bg-brand-50/50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      value="scheduled"
                      checked={formMode === "scheduled"}
                      onChange={() => setFormMode("scheduled")}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="block font-bold text-xs text-slate-900">
                        Mode A: Terjadwal
                      </span>
                      <span className="block text-2xs text-slate-500 mt-0.5">
                        Didampingi operator/pengawas di ruangan seleksi.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      formMode === "self_service"
                        ? "border-purple-500 bg-purple-50/50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      value="self_service"
                      checked={formMode === "self_service"}
                      onChange={() => setFormMode("self_service")}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="block font-bold text-xs text-slate-900">
                        Mode B: Mandiri
                      </span>
                      <span className="block text-2xs text-slate-500 mt-0.5">
                        Akses mandiri via tautan privat berbatas akun internal.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Parameter Protokol */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Versi Protokol
                  </label>
                  <select
                    value={formProtocol}
                    onChange={(e) => setFormProtocol(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="BPIP-ISH-24-V1">
                      BPIP-ISH-24-V1 (24 Plat)
                    </option>
                    <option value="BPIP-ISH-10-V1">
                      BPIP-ISH-10-V1 (10 Plat Ringkas)
                    </option>
                    <option value="BPIP-ISH-38-V1">
                      BPIP-ISH-38-V1 (38 Plat Lengkap)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Batas Waktu per Plat
                  </label>
                  <select
                    value={formSeconds}
                    onChange={(e) => setFormSeconds(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500"
                  >
                    <option value={3}>3 Detik (Ketepatan Refleks)</option>
                    <option value={5}>5 Detik (Standar Medis)</option>
                    <option value={8}>8 Detik (Toleransi Layar)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jumlah Piringan
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={38}
                    value={formPlateCount}
                    onChange={(e) => setFormPlateCount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Pengawas jika Mode Scheduled */}
              {formMode === "scheduled" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Operator / Pengawas Medis
                  </label>
                  <input
                    type="text"
                    value={formOperator}
                    onChange={(e) => setFormOperator(e.target.value)}
                    placeholder="Contoh: dr. Hendra (Tim Medis Paskibra)"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}

              {/* Multi-select Penetapan Kandidat */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Tetapkan Peserta ({selectedCandidateIds.length} dari{" "}
                    {candidates.length} Santri)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedCandidateIds(
                        selectedCandidateIds.length === candidates.length
                          ? []
                          : candidates.map((c) => c.id),
                      )
                    }
                    className="text-2xs font-bold text-brand-600 hover:underline"
                  >
                    {selectedCandidateIds.length === candidates.length
                      ? "Batal Pilih Semua"
                      : "Pilih Semua Santri"}
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-slate-50/50">
                  {candidates.map((c) => {
                    const isChecked = selectedCandidateIds.includes(c.id)
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white text-xs cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedCandidateIds(
                                selectedCandidateIds.filter(
                                  (id) => id !== c.id,
                                ),
                              )
                            } else {
                              setSelectedCandidateIds([
                                ...selectedCandidateIds,
                                c.id,
                              ])
                            }
                          }}
                          className="rounded text-brand-600"
                        />
                        <span className="font-mono text-slate-500 font-bold">
                          {c.number}
                        </span>
                        <span className="font-bold text-slate-800">
                          {c.name}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Tombol Aksi */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="bg-brand-600 hover:bg-brand-700 text-white font-bold"
                >
                  Simpan Sesi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

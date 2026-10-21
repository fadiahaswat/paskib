import { useEffect, useState } from "react"
import {
  Activity,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  HeartPulse,
  MapPin,
  Plus,
  Save,
  ShieldCheck,
  Target,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react"
import { Badge, Button, Card, Input } from "../../components/ui"
import { useApp } from "../../context/AppContext"
import {
  administrationDocuments,
  anamnesisItems,
  criticalAnamnesis,
  fitnessScore,
} from "../../data/selectionGuide"
import {
  ageOnReferenceDate,
  selectionStages,
  type Candidate,
} from "../../domain/selection"

type SessionType = "administration" | "pip" | "tiu" | "medical" | "parade" | "pbb" | "fitness" | "interview"
type SessionStatus = "scheduled" | "active" | "completed"
type ResultStatus = "pending" | "passed" | "review" | "failed"

type Session = {
  id: string
  type: SessionType
  title: string
  date: string
  time: string
  location: string
  coach: string
  participantIds: string[]
  status: SessionStatus
}

type SessionRecord = {
  metrics: globalThis.Record<string, string>
  result: ResultStatus
  discipline: string
  focus: string
  stamina: string
  note: string
  savedAt?: string
}

const definitions: globalThis.Record<SessionType, {
  label: string
  group: string
  description: string
  icon: typeof Activity
  tone: string
  fields: { key: string, label: string, placeholder: string, type?: string }[]
}> = {
  administration: {
    label: "Verifikasi Administrasi",
    group: "Seleksi",
    description: "Validasi usia, NIK, profil, dan enam berkas pokok.",
    icon: ClipboardList,
    tone: "bg-slate-100 text-slate-700",
    fields: [
      { key: "nik", label: "Status NIK", placeholder: "Valid / tidak valid" },
      { key: "age", label: "Status usia", placeholder: "Valid / review" },
      {
        key: "profile",
        label: "Kelengkapan profil (%)",
        placeholder: "0–100",
        type: "number",
      },
    ],
  },
  pip: {
    label: "Tryout PIP",
    group: "CAT",
    description: "50 soal Pancasila dan Wawasan Kebangsaan.",
    icon: BookOpenCheck,
    tone: "bg-blue-50 text-blue-700",
    fields: [
      {
        key: "score",
        label: "Nilai PIP",
        placeholder: "0–100",
        type: "number",
      },
      {
        key: "correct",
        label: "Jawaban benar (dikali 2 jika nilai kosong)",
        placeholder: "0–50",
        type: "number",
      },
      {
        key: "duration",
        label: "Waktu selesai",
        placeholder: "Contoh: 42 menit",
      },
    ],
  },
  tiu: {
    label: "Tryout TIU",
    group: "CAT",
    description: "Simulasi sebelas submateri Intelegensia Umum.",
    icon: Target,
    tone: "bg-violet-50 text-violet-700",
    fields: [
      {
        key: "score",
        label: "Nilai TIU",
        placeholder: "0–100",
        type: "number",
      },
      {
        key: "correct",
        label: "Jawaban benar (dikali 2 jika nilai kosong)",
        placeholder: "0–50",
        type: "number",
      },
      {
        key: "weakness",
        label: "Materi terlemah",
        placeholder: "Contoh: Silogisme",
      },
    ],
  },
  medical: {
    label: "Sesi Rikkes",
    group: "Seleksi",
    description: "Pemeriksaan vital dan survei anamnesis.",
    icon: HeartPulse,
    tone: "bg-red-50 text-red-700",
    fields: [
      { key: "bloodPressure", label: "Tekanan darah", placeholder: "120/80" },
      {
        key: "pulse",
        label: "Nadi istirahat",
        placeholder: "bpm",
        type: "number",
      },
      {
        key: "anamnesis",
        label: "Anamnesis YA",
        placeholder: "0–21",
        type: "number",
      },
    ],
  },
  parade: {
    label: "Simulasi Parade",
    group: "Seleksi",
    description: "Antropometri, postur, dan rangka.",
    icon: UserRound,
    tone: "bg-amber-50 text-amber-700",
    fields: [
      {
        key: "height",
        label: "Tinggi badan (cm)",
        placeholder: "cm",
        type: "number",
      },
      {
        key: "weight",
        label: "Berat badan (kg)",
        placeholder: "kg",
        type: "number",
      },
      {
        key: "legGap",
        label: "Celah kaki O/X",
        placeholder: "cm",
        type: "number",
      },
      { key: "flatFoot", label: "Flat foot", placeholder: "Tidak / Ya" },
      {
        key: "shoulder",
        label: "Simetri bahu",
        placeholder: "Simetris / review",
      },
      {
        key: "posture",
        label: "Skor postur",
        placeholder: "0–100",
        type: "number",
      },
    ],
  },
  pbb: {
    label: "Latihan PBB",
    group: "Latihan",
    description: "Drill statis, dinamis, dan vokal komando.",
    icon: ShieldCheck,
    tone: "bg-slate-100 text-slate-700",
    fields: [
      {
        key: "static",
        label: "PBB statis",
        placeholder: "0–100",
        type: "number",
      },
      {
        key: "dynamic",
        label: "PBB dinamis",
        placeholder: "0–100",
        type: "number",
      },
      {
        key: "command",
        label: "Vokal komando",
        placeholder: "0–100",
        type: "number",
      },
    ],
  },
  fitness: {
    label: "Latihan Samapta",
    group: "Latihan",
    description: "Pencatatan perkembangan kemampuan jasmani.",
    icon: Dumbbell,
    tone: "bg-emerald-50 text-emerald-700",
    fields: [
      {
        key: "distance",
        label: "Lari 12 menit",
        placeholder: "meter",
        type: "number",
      },
      { key: "pushup", label: "Push-up", placeholder: "kali", type: "number" },
      { key: "situp", label: "Sit-up", placeholder: "kali", type: "number" },
      { key: "backup", label: "Back-up", placeholder: "kali", type: "number" },
      {
        key: "shuttle",
        label: "Shuttle run",
        placeholder: "detik",
        type: "number",
      },
    ],
  },
  interview: {
    label: "Simulasi Wawancara",
    group: "Latihan",
    description: "Rubric STAR, ideologi, dan kematangan.",
    icon: ClipboardList,
    tone: "bg-fuchsia-50 text-fuchsia-700",
    fields: [
      {
        key: "star",
        label: "Metode STAR",
        placeholder: "0–100",
        type: "number",
      },
      {
        key: "integrity",
        label: "Integritas",
        placeholder: "0–100",
        type: "number",
      },
      {
        key: "communication",
        label: "Komunikasi",
        placeholder: "0–100",
        type: "number",
      },
    ],
  },
}

const emptyRecord = (): SessionRecord => ({
  metrics: {},
  result: "pending",
  discipline: "4",
  focus: "4",
  stamina: "4",
  note: "",
})

function SessionBadge({ status }: { status: SessionStatus }) {
  return (
    <Badge
      tone={
        status === "completed"
          ? "success"
          : status === "active"
            ? "info"
            : "warning"
      }
    >
      {status === "completed"
        ? "Selesai"
        : status === "active"
          ? "Berlangsung"
          : "Terjadwal"}
    </Badge>
  )
}

function ResultBadge({ status }: { status: ResultStatus }) {
  const values = {
    pending: ["Belum diinput", "neutral"],
    passed: ["Lolos target", "success"],
    review: ["Perlu review", "warning"],
    failed: ["Belum memenuhi", "danger"],
  } as const
  return <Badge tone={values[status][1]}>{values[status][0]}</Badge>
}

function Profile({
  candidate,
  sessionCount,
  recordCount,
}: {
  candidate: Candidate
  sessionCount: number
  recordCount: number
}) {
  const age = ageOnReferenceDate(candidate.birthDate, 2026)
  return (
    <div>
      <div className="rounded-2xl bg-slate-950 p-5 text-white">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-red-600 font-display font-bold">
            {candidate.avatar}
          </span>
          <div>
            <p className="font-display text-lg font-bold">{candidate.name}</p>
            <p className="mt-1 text-xs text-slate-400">{candidate.number}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/[0.07] p-3">
            <p className="text-[0.68rem] text-slate-400">Usia 17 Agustus</p>
            <p className="mt-1 text-sm font-bold">
              {age.years} th {age.months} bln
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.07] p-3">
            <p className="text-[0.68rem] text-slate-400">Tahap aktif</p>
            <p className="mt-1 text-sm font-bold">
              {selectionStages[candidate.stage - 1]?.shortLabel ?? "ADM"}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-3 text-sm">
        {[
          ["Sekolah", candidate.school],
          ["Jenis kelamin", candidate.gender],
          ["PIP / TIU", `${candidate.pip ?? "—"} / ${candidate.tiu ?? "—"}`],
          [
            "PBB / Samapta",
            `${candidate.pbb ?? "—"} / ${candidate.fitness ?? "—"}`,
          ],
          ["Kepribadian", `${candidate.personality ?? "—"}`],
          ["Sesi diikuti", `${sessionCount} sesi`],
          ["Hasil tersimpan", `${recordCount} hasil`],
        ].map(([label, value]) => (
          <div
            className="flex justify-between gap-4 border-b border-slate-100 pb-3"
            key={label}
          >
            <span className="text-slate-500">{label}</span>
            <span className="text-right font-semibold text-slate-800">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SimulationCenter() {
  const { candidates, syncCandidateFromSession, showToast } = useApp()

  const [sessions, setSessions] = useState<Session[]>(() => {
    const value = localStorage.getItem("paska-clean-sessions")
    if (value) {
      try {
        return JSON.parse(value)
      } catch {
        return []
      }
    }
    return []
  })
  const [records, setRecords] =
    useState<globalThis.Record<string, SessionRecord>>(() => {
      const value = localStorage.getItem("paska-clean-records")
      if (value) {
        try {
          return JSON.parse(value)
        } catch {
          return {}
        }
      }
      return {}
    })
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? "")
  const [candidateId, setCandidateId] = useState(
    sessions[0]?.participantIds[0] ?? candidates[0]?.id ?? "",
  )
  const [showCreate, setShowCreate] = useState(false)
  const [saved, setSaved] = useState(false)
  const [sessionFilter, setSessionFilter] =
    useState<"Semua" | "Seleksi" | "CAT" | "Latihan">("Semua")
  const [draft, setDraft] = useState({
    type: "pip" as SessionType,
    title: "",
    date: "2026-10-24",
    time: "14:00",
    location: "",
    coach: "",
  })

  // Ensure any new candidate added in the app is available in active sessions
  useEffect(() => {
    const allIds = candidates.map((c) => c.id)
    setSessions((prev) =>
      prev.map((s) => {
        const merged = Array.from(new Set([...s.participantIds, ...allIds]))
        return merged.length !== s.participantIds.length
          ? { ...s, participantIds: merged }
          : s
      }),
    )
  }, [candidates])

  useEffect(
    () =>
      localStorage.setItem("paska-clean-sessions", JSON.stringify(sessions)),
    [sessions],
  )
  useEffect(() => {
    localStorage.setItem("paska-clean-records", JSON.stringify(records))
    window.dispatchEvent(new CustomEvent("paska-track-updated"))
  }, [records])

  const session = sessions.find((item) => item.id === sessionId) ?? sessions[0]
  const candidate =
    candidates.find((item) => item.id === candidateId) ?? candidates[0]

  function createSession() {
    const next: Session = {
      id: `session-${Date.now()}`,
      ...draft,
      title: draft.title || definitions[draft.type].label,
      location: draft.location.trim() || "Sekretariat Seleksi",
      coach: draft.coach.trim() || "Petugas Seleksi",
      participantIds: candidates.map((item) => item.id),
      status: "scheduled",
    }
    setSessions((current) => [next, ...current])
    setSessionId(next.id)
    setCandidateId(next.participantIds[0] ?? candidates[0]?.id ?? "")
    setShowCreate(false)
    showToast(`Sesi "${next.title}" berhasil dibuat.`)
  }

  const createModalBlock = showCreate ? (
    <Card className="border-red-200 p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Jadwalkan sesi
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Seluruh kandidat periode aktif akan disertakan dalam sesi.
          </p>
        </div>
        <Badge tone="info">Draft</Badge>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Jenis sesi
          <select
            value={draft.type}
            onChange={(event) =>
              setDraft((value) => ({
                ...value,
                type: event.target.value as SessionType,
              }))
            }
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-normal outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
          >
            {Object.entries(definitions).map(([value, item]) => (
              <option value={value} key={value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Nama sesi"
          value={draft.title}
          placeholder={definitions[draft.type].label}
          onChange={(event) =>
            setDraft((value) => ({ ...value, title: event.target.value }))
          }
        />
        <Input
          label="Tanggal"
          type="date"
          value={draft.date}
          onChange={(event) =>
            setDraft((value) => ({ ...value, date: event.target.value }))
          }
        />
        <Input
          label="Waktu"
          type="time"
          value={draft.time}
          onChange={(event) =>
            setDraft((value) => ({ ...value, time: event.target.value }))
          }
        />
        <Input
          label="Lokasi"
          value={draft.location}
          placeholder="Contoh: Lapangan Utama / Lab Komputer"
          onChange={(event) =>
            setDraft((value) => ({
              ...value,
              location: event.target.value,
            }))
          }
        />
        <Input
          label="Pelatih / petugas"
          value={draft.coach}
          placeholder="Nama pelatih atau penguji"
          onChange={(event) =>
            setDraft((value) => ({ ...value, coach: event.target.value }))
          }
        />
      </div>
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="ghost" onClick={() => setShowCreate(false)}>
          Batal
        </Button>
        <Button onClick={createSession}>
          <CalendarDays className="size-4" /> Simpan jadwal
        </Button>
      </div>
    </Card>
  ) : null

  if (!session || !candidate) {
    return (
      <div className="grid gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-red-600">Pusat simulasi</p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-950">
              Sesi seleksi & latihan
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Buat sesi, input hasil, isi survei pelatih, dan sinkronkan otomatis
              ke profil, tahapan, serta pemeringkatan kandidat.
            </p>
          </div>
          <Button onClick={() => setShowCreate((value) => !value)}>
            <Plus className="size-4" /> Buat sesi baru
          </Button>
        </div>
        {createModalBlock}
        <Card className="p-10 text-center">
          <p className="font-display text-base font-bold text-slate-900">
            {!sessions.length
              ? "Belum ada sesi simulasi atau latihan yang dibuat"
              : "Belum ada kandidat terdaftar pada periode ini"}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            {!sessions.length
              ? "Klik tombol 'Buat sesi baru' di atas untuk menjadwalkan sesi verifikasi administrasi, CAT, Rikkes, Parade, PBB, Samapta, atau Wawancara."
              : `Terdapat ${sessions.length} sesi terjadwal. Tambahkan kandidat terlebih dahulu pada menu Kandidat untuk mulai menginput hasil penilaian sesi.`}
          </p>
          {!sessions.length ? (
            <div className="mt-4 flex justify-center">
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="size-4" /> Buat sesi pertama
              </Button>
            </div>
          ) : null}
        </Card>
      </div>
    )
  }

  const key = `${session.id}:${candidate.id}`
  const record = records[key] ?? emptyRecord()
  const definition = definitions[session.type]
  const visibleSessions = sessions.filter(
    (item) =>
      sessionFilter === "Semua" ||
      definitions[item.type].group === sessionFilter,
  )
  const medicalYesCount = anamnesisItems.filter(
    (_, index) => record.metrics[`anamnesis-${index}`] === "yes",
  ).length
  const medicalCritical = anamnesisItems.some(
    (_, index) =>
      criticalAnamnesis.has(index) &&
      record.metrics[`anamnesis-${index}`] === "yes",
  )
  const fitnessScores =
    session.type === "fitness"
      ? [
          ["Lari", fitnessScore("run", Number(record.metrics.distance) || 0)],
          [
            "Push-up",
            fitnessScore("pushup", Number(record.metrics.pushup) || 0),
          ],
          ["Sit-up", fitnessScore("situp", Number(record.metrics.situp) || 0)],
          [
            "Back-up",
            fitnessScore("backup", Number(record.metrics.backup) || 0),
          ],
          [
            "Shuttle",
            fitnessScore("shuttle", Number(record.metrics.shuttle) || 99),
          ],
        ]
      : []
  const fitnessAverage = fitnessScores.length
    ? fitnessScores.reduce((total, item) => total + Number(item[1]), 0) /
      fitnessScores.length
    : 0
  const completed = session.participantIds.filter(
    (id) =>
      candidates.some((c) => c.id === id) &&
      records[`${session.id}:${id}`]?.savedAt,
  ).length

  function patchRecord(patch: Partial<SessionRecord>) {
    setRecords((current) => ({ ...current, [key]: { ...record, ...patch } }))
  }

  function saveRecord() {
    const nextRecord = { ...record, savedAt: new Date().toISOString() }
    setRecords((current) => ({
      ...current,
      [key]: nextRecord,
    }))
    // Sync score & stage status directly to Candidate master state!
    syncCandidateFromSession({
      candidateId: candidate.id,
      sessionType: session.type,
      metrics: nextRecord.metrics,
      result: nextRecord.result,
      note: nextRecord.note,
    })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  function updateSessionStatus(nextStatus: SessionStatus) {
    setSessions((current) =>
      current.map((s) =>
        s.id === session.id ? { ...s, status: nextStatus } : s,
      ),
    )
    showToast(`Status sesi diubah menjadi ${nextStatus}.`, "info")
  }

  function deleteCurrentSession() {
    const remaining = sessions.filter((s) => s.id !== session.id)
    setSessions(remaining)
    setSessionId(remaining[0]?.id ?? "")
    showToast(`Sesi "${session.title}" telah dihapus.`, "warning")
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-red-600">Pusat simulasi</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-950">
            Sesi seleksi & latihan
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Buat sesi, input hasil, isi survei pelatih, dan sinkronkan otomatis
            ke profil, tahapan, serta pemeringkatan kandidat.
          </p>
        </div>
        <Button onClick={() => setShowCreate((value) => !value)}>
          <Plus className="size-4" /> Buat sesi baru
        </Button>
      </div>

      <Card className="p-3 sm:p-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            ["1", "Pilih sesi", true],
            ["2", "Pilih kandidat", Boolean(candidate)],
            ["3", "Input & simpan", Boolean(record.savedAt)],
          ].map(([number, label, complete], index) => (
            <div
              key={label as string}
              className={`flex items-center gap-2 rounded-xl p-2.5 sm:p-3 ${
                complete
                  ? "bg-emerald-50 text-emerald-800"
                  : index === 2
                    ? "bg-red-50 text-red-800"
                    : "bg-slate-50 text-slate-500"
              }`}
            >
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  complete ? "bg-emerald-600 text-white" : "bg-white"
                }`}
              >
                {complete ? <CheckCircle2 className="size-4" /> : number}
              </span>
              <span className="hidden text-xs font-bold sm:block">
                {label as string}
              </span>
              <span className="text-[0.65rem] font-bold sm:hidden">
                {index === 0 ? "Sesi" : index === 1 ? "Kandidat" : "Simpan"}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {createModalBlock}

      <div className="grid gap-6 xl:grid-cols-[21rem_minmax(0,1fr)]">
        <Card className="h-fit overflow-hidden p-4">
          <div className="flex items-center justify-between px-1 pb-4">
            <div>
              <h2 className="font-display font-bold text-slate-900">
                Daftar sesi
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {sessions.length} sesi tercatat
              </p>
            </div>
            <Badge>
              {sessions.filter((item) => item.status === "active").length} aktif
            </Badge>
          </div>
          <div className="mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
            {(["Semua", "Seleksi", "CAT", "Latihan"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSessionFilter(filter)}
                className={`min-h-9 shrink-0 rounded-full px-3 text-xs font-bold transition ${
                  sessionFilter === filter
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 xl:grid xl:max-h-[45rem] xl:overflow-x-visible xl:overflow-y-auto xl:pb-0">
            {visibleSessions.map((item) => {
              const config = definitions[item.type]
              const Icon = config.icon
              const active = item.id === session.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSessionId(item.id)
                    setCandidateId(item.participantIds[0] ?? candidates[0].id)
                  }}
                  className={`min-w-[17rem] rounded-2xl border p-4 text-left transition xl:min-w-0 ${
                    active
                      ? "border-red-200 bg-red-50 ring-2 ring-red-100"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-xl ${config.tone}`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-900">
                        {item.title}
                      </span>
                      <span className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                        <CalendarDays className="size-3.5" /> {item.date} ·{" "}
                        {item.time}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <UsersRound className="size-3.5" /> {candidates.length}{" "}
                        kandidat
                      </span>
                    </span>
                    <SessionBadge status={item.status} />
                  </div>
                </button>
              )
            })}
            {!visibleSessions.length ? (
              <div className="min-w-full rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                Belum ada sesi pada kategori ini.
              </div>
            ) : null}
          </div>
        </Card>

        <div className="grid min-w-0 gap-6">
          <Card className="overflow-hidden">
            <div className="bg-slate-950 p-5 text-white sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="flex gap-4">
                  <span
                    className={`grid size-12 shrink-0 place-items-center rounded-2xl ${definition.tone}`}
                  >
                    <definition.icon className="size-6" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-red-300">
                        {definition.group}
                      </p>
                      <SessionBadge status={session.status} />
                    </div>
                    <h2 className="mt-1 font-display text-2xl font-bold">
                      {session.title}
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                      {definition.description}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(["scheduled", "active", "completed"] as const).map(
                      (st) => (
                        <button
                          key={st}
                          onClick={() => updateSessionStatus(st)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                            session.status === st
                              ? "bg-red-600 text-white"
                              : "bg-white/10 text-slate-300 hover:bg-white/20"
                          }`}
                        >
                          {st === "scheduled"
                            ? "Terjadwal"
                            : st === "active"
                              ? "Aktif"
                              : "Selesai"}
                        </button>
                      ),
                    )}
                    <button
                      onClick={deleteCurrentSession}
                      className="rounded-lg bg-white/10 px-2 py-1 text-xs text-red-300 transition hover:bg-red-600 hover:text-white"
                      title="Hapus sesi ini"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <div className="grid gap-1 text-xs text-slate-300">
                    <span className="flex items-center gap-2">
                      <CalendarDays className="size-3.5" /> {session.date} ·{" "}
                      {session.time}
                    </span>
                    <span className="flex items-center gap-2">
                      <MapPin className="size-3.5" /> {session.location} ·{" "}
                      {session.coach}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-slate-100">
              {[
                ["Peserta", candidates.length],
                ["Sudah diinput", completed],
                ["Belum diinput", Math.max(0, candidates.length - completed)],
              ].map(([label, value]) => (
                <div className="p-4 text-center" key={label}>
                  <p className="font-display text-xl font-bold text-slate-950">
                    {value}
                  </p>
                  <p className="mt-1 text-[0.68rem] font-semibold text-slate-500">
                    {label}
                  </p>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 px-5 py-3">
              <div className="flex items-center justify-between text-[0.68rem] font-semibold text-slate-500">
                <span>Progres input peserta</span>
                <span>
                  {completed}/{candidates.length}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{
                    width: `${
                      candidates.length
                        ? (completed / candidates.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </Card>

          <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_20rem]">
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900">
                    Input hasil & survei
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Tersimpan per kandidat & menyinkronkan nilai ke profil
                    utama.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ResultBadge status={record.result} />
                  <Button
                    className="hidden sm:inline-flex"
                    onClick={saveRecord}
                  >
                    <Save className="size-4" /> Simpan
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto border-b border-slate-100 p-4 sm:px-6">
                {candidates.map((item) => (
                  <button
                    key={item.id}
                    title={item.name}
                    onClick={() => setCandidateId(item.id)}
                    className={`relative grid size-11 shrink-0 place-items-center rounded-xl text-xs font-bold transition ${
                      candidate.id === item.id
                        ? "bg-red-600 text-white ring-4 ring-red-100"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {item.avatar}
                    {records[`${session.id}:${item.id}`]?.savedAt ? (
                      <CheckCircle2 className="absolute -right-1 -top-1 size-4 rounded-full bg-white text-emerald-600" />
                    ) : null}
                  </button>
                ))}
              </div>
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-slate-900 text-xs font-bold text-white">
                    {candidate.avatar}
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">{candidate.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {candidate.number} · {candidate.school}
                    </p>
                  </div>
                </div>

                <p className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Hasil sesi
                </p>
                <div className="mt-3 grid gap-4 md:grid-cols-3">
                  {definition.fields.map((field) => (
                    <Input
                      key={field.key}
                      label={field.label}
                      type={field.type ?? "text"}
                      placeholder={field.placeholder}
                      value={record.metrics[field.key] ?? ""}
                      onChange={(event) =>
                        patchRecord({
                          metrics: {
                            ...record.metrics,
                            [field.key]: event.target.value,
                          },
                        })
                      }
                    />
                  ))}
                </div>
                <fieldset className="mt-5">
                  <legend className="text-sm font-semibold text-slate-700">
                    Keputusan / status tahapan kandidat
                  </legend>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      ["pending", "Belum"],
                      ["passed", "Lolos target"],
                      ["review", "Remedial / Tinjau"],
                      ["failed", "Belum memenuhi"],
                    ].map(([value, label]) => (
                      <button
                        type="button"
                        key={value}
                        onClick={() =>
                          patchRecord({ result: value as ResultStatus })
                        }
                        className={`min-h-11 rounded-xl border px-2 text-xs font-bold transition ${
                          record.result === value
                            ? value === "passed"
                              ? "border-emerald-300 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100"
                              : value === "failed"
                                ? "border-red-300 bg-red-50 text-red-800 ring-2 ring-red-100"
                                : value === "review"
                                  ? "border-amber-300 bg-amber-50 text-amber-800 ring-2 ring-amber-100"
                                  : "border-slate-300 bg-slate-100 text-slate-800"
                            : "border-slate-200 bg-white text-slate-500"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                {session.type === "administration" ? (
                  <div className="mt-6 rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          Enam berkas pokok
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Tandai setelah file dan isi dokumen diverifikasi.
                        </p>
                      </div>
                      <Badge tone="info">
                        {
                          administrationDocuments.filter(
                            (_, index) =>
                              record.metrics[`document-${index}`] === "valid",
                          ).length
                        }
                        /6 valid
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {administrationDocuments.map((document, index) => {
                        const checked =
                          record.metrics[`document-${index}`] === "valid"
                        return (
                          <label
                            key={document.name}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                              checked
                                ? "border-emerald-200 bg-emerald-50"
                                : "border-slate-100 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                patchRecord({
                                  metrics: {
                                    ...record.metrics,
                                    [`document-${index}`]: event.target.checked
                                      ? "valid"
                                      : "",
                                  },
                                })
                              }
                              className="mt-0.5 size-4 accent-emerald-600"
                            />
                            <span>
                              <span className="block text-sm font-bold text-slate-800">
                                {document.name}
                              </span>
                              <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                                {document.detail}
                              </span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ) : null}

                {session.type === "medical" ? (
                  <div className="mt-6 rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          Survei 21 anamnesis
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Lebih dari 5 YA atau critical flag memerlukan
                          keputusan hard-lock.
                        </p>
                      </div>
                      <Badge
                        tone={
                          medicalCritical || medicalYesCount > 5
                            ? "danger"
                            : medicalYesCount
                              ? "warning"
                              : "success"
                        }
                      >
                        {medicalYesCount} YA
                        {medicalCritical ? " · KRITIS" : ""}
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-2">
                      {anamnesisItems.map(([item, detail], index) => {
                        const checked =
                          record.metrics[`anamnesis-${index}`] === "yes"
                        return (
                          <label
                            key={item}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                              checked
                                ? criticalAnamnesis.has(index)
                                  ? "border-red-200 bg-red-50"
                                  : "border-amber-200 bg-amber-50"
                                : "border-slate-100 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                patchRecord({
                                  metrics: {
                                    ...record.metrics,
                                    [`anamnesis-${index}`]: event.target.checked
                                      ? "yes"
                                      : "no",
                                  },
                                })
                              }
                              className="mt-0.5 size-4 accent-red-600"
                            />
                            <span className="grid flex-1 gap-1 md:grid-cols-[1fr_1.1fr]">
                              <span className="text-sm font-semibold text-slate-800">
                                {index + 1}. {item}
                              </span>
                              <span className="text-xs leading-relaxed text-slate-500">
                                {detail}
                              </span>
                            </span>
                            {criticalAnamnesis.has(index) ? (
                              <Badge tone="danger">Kritis</Badge>
                            ) : null}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ) : null}

                {session.type === "fitness" ? (
                  <div className="mt-6 rounded-2xl bg-slate-950 p-4 text-white">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold">
                          Konversi otomatis Samapta
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Rata-rata lima tes otomatis disinkronkan ke nilai
                          Samapta kandidat saat disimpan.
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-2xl font-bold">
                          {fitnessAverage.toFixed(1)}
                        </p>
                        <p className="text-[0.68rem] text-slate-400">
                          nilai rata-rata
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {fitnessScores.map(([label, score]) => (
                        <div
                          className="rounded-xl bg-white/[0.07] p-3 text-center"
                          key={label}
                        >
                          <p className="text-[0.68rem] text-slate-400">
                            {label}
                          </p>
                          <p className="mt-1 font-bold">{score}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-7 border-t border-slate-100 pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Survei pelatih
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Skala observasi 1–5.
                      </p>
                    </div>
                    <ClipboardList className="size-5 text-red-600" />
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    {[
                      ["discipline", "Disiplin"],
                      ["focus", "Fokus"],
                      ["stamina", "Stamina"],
                    ].map(([field, label]) => (
                      <label
                        className="grid gap-2 text-sm font-semibold text-slate-700"
                        key={field}
                      >
                        {label}
                        <select
                          value={
                            record[
                              (field as "discipline" | "focus" | "stamina")
                            ]
                          }
                          onChange={(event) =>
                            patchRecord({ [field]: event.target.value })
                          }
                          className="min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-normal outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
                        >
                          {[1, 2, 3, 4, 5].map((value) => (
                            <option value={value} key={value}>
                              {value} —{" "}
                              {value === 5
                                ? "Sangat baik"
                                : value === 1
                                  ? "Perlu perhatian"
                                  : "Cukup"}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                  <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
                    Catatan pelatih / petugas
                    <textarea
                      rows={4}
                      value={record.note}
                      onChange={(event) =>
                        patchRecord({ note: event.target.value })
                      }
                      placeholder="Catat koreksi teknik, kondisi kandidat, dan tindak lanjut..."
                      className="resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-normal outline-none placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-100"
                    />
                  </label>
                  <div className="mt-5 flex items-center justify-end gap-3">
                    {saved ? (
                      <span className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 className="size-4" /> Tersimpan &
                        Disinkronkan
                      </span>
                    ) : null}
                    <Button onClick={saveRecord}>
                      <Save className="size-4" /> Simpan hasil kandidat
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="h-fit p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-slate-900">
                  Profil kandidat
                </h2>
                <Badge tone="info">Live</Badge>
              </div>
              <div className="mt-5">
                <Profile
                  candidate={candidate}
                  sessionCount={
                    sessions.filter((item) =>
                      item.participantIds.includes(candidate.id),
                    ).length
                  }
                  recordCount={
                    Object.entries(records).filter(
                      ([recordKey, value]) =>
                        recordKey.endsWith(`:${candidate.id}`) && value.savedAt,
                    ).length
                  }
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

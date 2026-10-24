import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  Calculator,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleDashed,
  ClipboardList,
  Clock,
  Dumbbell,
  Eye,
  Filter,
  HeartPulse,
  ListFilter,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Smile,
  Sparkles,
  Stethoscope,
  Target,
  Trash2,
  UserRound,
  UsersRound,
  UserX,
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
import PbbEvaluationSection from "./PbbEvaluationSection"
import {
  administrationDocuments,
  anamnesisItems,
  criticalAnamnesis,
  fitnessScore,
} from "../../data/selectionGuide"
import {
  ageOnReferenceDate,
  bmi,
  evaluateAnthropometry,
  provisionalScore,
  selectionStages,
  type Candidate,
} from "../../domain/selection"

type SessionType = "cat" | "administration" | "pip" | "tiu" | "medical" | "parade" | "pbb" | "fitness" | "interview"
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
  fitnessPreset?: "all" | "run_only" | "run_shuttle" | "samapta_b" | "custom"
  activeFitnessTests?: string[]
  trackLength?: number
}

export const FITNESS_ITEMS = [
  {
    key: "distance",
    label: "Lari 12 menit",
    shortLabel: "Lari",
    target: "3.000 m",
    unit: "meter",
    placeholder: "meter",
    typeKey: "run" as const,
    category: "Samapta A",
  },
  {
    key: "pushup",
    label: "Push-up 1 menit",
    shortLabel: "Push-up",
    target: "45 kali",
    unit: "kali",
    placeholder: "kali",
    typeKey: "pushup" as const,
    category: "Samapta B",
  },
  {
    key: "situp",
    label: "Sit-up 1 menit",
    shortLabel: "Sit-up",
    target: "40 kali",
    unit: "kali",
    placeholder: "kali",
    typeKey: "situp" as const,
    category: "Samapta B",
  },
  {
    key: "backup",
    label: "Back-up 1 menit",
    shortLabel: "Back-up",
    target: "50 kali",
    unit: "kali",
    placeholder: "kali",
    typeKey: "backup" as const,
    category: "Samapta B",
  },
  {
    key: "shuttle",
    label: "Shuttle run 6x10m",
    shortLabel: "Shuttle",
    target: "15,4 dtk",
    unit: "detik",
    placeholder: "detik",
    typeKey: "shuttle" as const,
    category: "Kelincahan",
  },
]

type AttendanceStatus = "hadir" | "sakit" | "izin" | "alpa"

type SessionRecord = {
  attendance?: AttendanceStatus
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
  fields: { key: string; label: string; placeholder: string; type?: string }[]
}> = {
  cat: {
    label: "CAT PIP & TIU",
    group: "CAT",
    description:
      "Jadwal terpusat tryout CAT PIP dan TIU untuk kandidat terpilih.",
    icon: BookOpenCheck,
    tone: "bg-red-50 text-red-700",
    fields: [
      {
        key: "score",
        label: "Nilai CAT",
        placeholder: "Diisi otomatis dari tryout",
        type: "number",
      },
      {
        key: "duration",
        label: "Durasi",
        placeholder: "PIP 45 menit · TIU 30 menit",
      },
    ],
  },
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
    description: "5 Pilar Klinis (Tensi, Nadi, Mata/Ishihara, Gigi, THT) & 21 Anamnesis.",
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
  attendance: "hadir",
  metrics: {},
  result: "pending",
  discipline: "4",
  focus: "4",
  stamina: "4",
  note: "",
})

function formatSecondsToMmSs(totalSec: number): string {
  if (isNaN(totalSec) || totalSec <= 0) return "--:--"
  const m = Math.floor(totalSec / 60)
  const s = Math.round(totalSec % 60)
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

function calculateIntervalScore(
  targetSets: number,
  completedSets: number,
  targetPace: number,
  avgSplit: number,
  isDnf: boolean,
): number {
  if (isDnf) return 0
  if (completedSets === 0) return 0

  const completionRatio = Math.min(1, completedSets / Math.max(1, targetSets))
  let score = completionRatio * 85

  if (targetPace > 0 && avgSplit > 0) {
    if (avgSplit <= targetPace) {
      score += 15
    } else if (avgSplit <= targetPace * 1.05) {
      score += 10
    } else if (avgSplit <= targetPace * 1.15) {
      score += 5
    }
  } else {
    score += 10
  }

  return Math.min(100, Math.max(10, Math.round(score)))
}

export function hasRecordMetrics(rec?: SessionRecord): boolean {
  if (!rec || !rec.metrics) return false
  const configKeys = new Set([
    "runMode",
    "intervalDist",
    "intervalTargetSets",
    "intervalTargetPace",
  ])
  const entries = Object.entries(rec.metrics)
  return entries.some(([k, val]) => {
    if (configKeys.has(k)) return false
    return val !== undefined && val !== null && String(val).trim() !== ""
  })
}

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

function NumberStepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max,
  unit,
  placeholder,
  quickAdds = [],
  hint,
}: {
  label: string
  value: string
  onChange: (val: string) => void
  step?: number
  min?: number
  max?: number
  unit?: string
  placeholder?: string
  quickAdds?: number[]
  hint?: string
}) {
  const numVal = parseFloat(value) || 0

  const handleStep = (delta: number) => {
    const nextVal = Math.max(
      min,
      max !== undefined ? Math.min(max, numVal + delta) : numVal + delta,
    )
    const formatted = Number.isInteger(nextVal)
      ? String(nextVal)
      : parseFloat(nextVal.toFixed(2)).toString()
    onChange(formatted)
  }

  return (
    <div className="grid gap-1.5 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800">{label}</label>
        {unit && (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-2xs font-bold text-slate-500">
            {unit}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleStep(-step)}
          disabled={numVal <= min}
          className="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700 transition active:scale-95 disabled:opacity-30 hover:bg-slate-200"
          aria-label={`Kurangi ${label}`}
        >
          <Minus className="size-4.5" />
        </button>
        <div className="relative min-w-[4.5rem] flex-1">
          <input
            type="number"
            inputMode="decimal"
            step="any"
            value={value}
            placeholder={placeholder || "0"}
            onChange={(e) => onChange(e.target.value)}
            className="h-11 w-full min-w-[4.5rem] rounded-xl border border-slate-200 bg-slate-50/70 px-2 text-center font-display text-xl font-extrabold text-slate-900 outline-none transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:border-red-400 focus:bg-white focus:ring-3 focus:ring-red-100"
          />
        </div>
        <button
          type="button"
          onClick={() => handleStep(step)}
          className="grid size-11 shrink-0 place-items-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition active:scale-95 hover:bg-red-100"
          aria-label={`Tambah ${label}`}
        >
          <Plus className="size-4.5" />
        </button>
      </div>
      {quickAdds.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2">
          <span className="text-3xs font-semibold text-slate-400">Cepat:</span>
          {quickAdds.map((add) => (
            <button
              key={add}
              type="button"
              onClick={() => {
                const next = Math.max(
                  min,
                  max !== undefined
                    ? Math.min(max, numVal + add)
                    : numVal + add,
                )
                onChange(String(next))
              }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95"
            >
              +{add}
            </button>
          ))}
        </div>
      )}
      {hint && <span className="text-2xs text-slate-400">{hint}</span>}
    </div>
  )
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
  const bmiResult =
    candidate.weightKg && candidate.heightCm
      ? bmi(candidate.weightKg, candidate.heightCm)
      : null
  const anthroEval = evaluateAnthropometry(
    candidate.gender,
    candidate.heightCm,
    candidate.weightKg,
  )
  const score = provisionalScore(candidate)
  const docCount = candidate.documents
    ? candidate.documents.filter(Boolean).length
    : 6
  const maskedNik = candidate.nik
    ? `${candidate.nik.slice(0, 4)}••••••${candidate.nik.slice(-4)}`
    : "—"

  return (
    <div className="space-y-4">
      {/* 1. Header Card with 4 Quick Metrics & Provisional Score */}
      <div className="rounded-2xl bg-slate-950 p-4 sm:p-5 text-white shadow-xs">
        <div className="flex items-center gap-4">
          <CandidateAvatar
            name={candidate.name}
            avatar={candidate.avatar}
            photoUrl={candidate.photoUrl}
            className="size-16 sm:size-20 text-xl border-2 border-white/20 shadow-md shrink-0"
            rounded="rounded-2xl"
          />
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-extrabold tracking-tight truncate">
              {candidate.name}
            </p>
            <p className="text-xs text-slate-400 font-medium">
              {candidate.number}
            </p>
          </div>
        </div>

        {/* 2x2 Metric Grid */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-white/[0.08] p-2.5">
            <p className="text-2xs text-slate-400">Usia 17 Agustus</p>
            <p className="mt-0.5 font-bold text-white">
              {age.years} th {age.months} bln
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.08] p-2.5">
            <p className="text-2xs text-slate-400">Tahap Aktif</p>
            <p className="mt-0.5 font-bold text-white truncate">
              {selectionStages[candidate.stage - 1]?.shortLabel ?? "ADM"} ·{" "}
              {selectionStages[candidate.stage - 1]?.label ?? "Administrasi"}
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.08] p-2.5">
            <p className="text-2xs text-slate-400">Tinggi / Berat</p>
            <p className="mt-0.5 font-bold text-white">
              {candidate.heightCm ?? 170} cm / {candidate.weightKg ?? 60} kg
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.08] p-2.5">
            <p className="text-2xs text-slate-400">IMT / Status</p>
            <p className="mt-0.5 font-bold text-emerald-400 truncate">
              {bmiResult?.value ?? "—"} ({bmiResult?.category ?? "Normal"})
            </p>
          </div>
        </div>

        {/* Skor Kumulatif Sementara Banner */}
        <div className="mt-3 flex items-center justify-between rounded-xl bg-white/[0.06] px-3 py-2 border border-white/10">
          <div>
            <span className="text-2xs text-slate-400">
              Skor Total Sementara
            </span>
            <p className="font-display text-base font-black text-amber-400">
              {score > 0 ? score.toFixed(1) : "—"}
              <span className="text-xs font-normal text-slate-400"> / 100</span>
            </p>
          </div>
          <span
            className={`rounded-lg px-2 py-0.5 text-xs font-extrabold ${
              score >= 80
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : score >= 70
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  : "bg-slate-500/20 text-slate-300 border border-slate-500/30"
            }`}
          >
            {score >= 80
              ? "Sangat Baik"
              : score >= 70
                ? "Memenuhi"
                : "Dalam Pantauan"}
          </span>
        </div>
      </div>

      {/* 2. Informasi Detail Tabular */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs divide-y divide-slate-100 text-xs">
        <div className="pb-3">
          <p className="font-bold text-slate-900 mb-2">
            Identitas & Administrasi
          </p>
          <div className="grid gap-2">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Sekolah</span>
              <span className="font-semibold text-slate-800 text-right">
                {candidate.school}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Jenis Kelamin</span>
              <span className="font-semibold text-slate-800">
                {candidate.gender}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Tanggal Lahir</span>
              <span className="font-semibold text-slate-800">
                {candidate.birthDate}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">NIK Resmi</span>
              <span className="font-mono font-semibold text-slate-800">
                {maskedNik}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Kelengkapan Berkas</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                <Check className="size-3" /> {docCount}/6 Berkas Valid
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Tinggi Standar BPIP</span>
              <span
                className={`font-semibold ${
                  anthroEval.heightStatus.tone === "danger"
                    ? "text-rose-600"
                    : "text-slate-800"
                }`}
              >
                {anthroEval.heightStatus.label}
              </span>
            </div>
          </div>
        </div>

        <div className="py-3">
          <p className="font-bold text-slate-900 mb-2">Rekap Nilai Materi</p>
          <div className="grid gap-2">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">CAT PIP / TIU</span>
              <span className="font-semibold text-slate-800">
                {candidate.pip !== null ? candidate.pip : "—"} /{" "}
                {candidate.tiu !== null ? candidate.tiu : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">PBB & Komando</span>
              <span className="font-semibold text-slate-800">
                {candidate.pbb !== null ? candidate.pbb : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Kesamaptaan Jasmani</span>
              <span className="font-semibold text-slate-800">
                {candidate.fitness !== null ? candidate.fitness : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Kepribadian / Wawancara</span>
              <span className="font-semibold text-slate-800">
                {candidate.personality !== null ? candidate.personality : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Riwayat Sesi Terdata</span>
              <span className="font-semibold text-slate-800">
                {sessionCount} Sesi ({recordCount} Hasil)
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Kedisiplinan Latihan</span>
              <span className="font-bold text-blue-700">
                {candidate.trainingCompliance ?? 100}% Disiplin
              </span>
            </div>
          </div>
        </div>

        {candidate.coachNote && (
          <div className="pt-3">
            <p className="font-bold text-slate-900 mb-1">Catatan Pelatih</p>
            <p className="rounded-xl bg-slate-50 p-2.5 text-2xs italic text-slate-600 border border-slate-100">
              "{candidate.coachNote}"
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SimulationCenter() {
  const {
    candidates,
    syncCandidateFromSession,
    showToast,
    sessions,
    setSessions,
    records,
    setRecords,
    saveToCloud,
    ishiharaResults,
    catTryoutAttempts,
  } = useApp()

  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? "")
  const [candidateId, setCandidateId] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [saved, setSaved] = useState(false)
  const [sessionFilter, setSessionFilter] =
    useState<"Semua" | "Seleksi" | "CAT" | "Latihan">("Semua")
  const [candidateFilter, setCandidateFilter] =
    useState<"all" | "unrated" | "rated" | "unscored" | "absent">("all")
  const [mobileTab, setMobileTab] = useState<"scoring" | "survey" | "profile">(
    "scoring",
  )
  const [showCandidatePicker, setShowCandidatePicker] = useState(false)
  const [candidateSearch, setCandidateSearch] = useState("")
  const [showMobileSessionList, setShowMobileSessionList] = useState(false)
  const [draft, setDraft] = useState({
    type: "cat" as SessionType,
    title: "",
    date: "2026-10-24",
    time: "14:00",
    location: "",
    coach: "",
    fitnessPreset:
      "all" as "all" | "run_only" | "run_shuttle" | "samapta_b" | "custom",
    activeFitnessTests: [
      "distance",
      "pushup",
      "situp",
      "backup",
      "shuttle",
    ] as string[],
    trackLength: 400,
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

  useEffect(() => {
    if (
      (!sessionId || !sessions.some((s) => s.id === sessionId)) &&
      sessions.length > 0
    ) {
      setSessionId(sessions[0].id)
    }
  }, [sessions, sessionId])

  useEffect(() => {
    if (
      candidateId &&
      !candidates.some((c) => c.id === candidateId) &&
      candidates.length > 0
    ) {
      setCandidateId("")
    }
  }, [candidates, candidateId])

  const session = sessions.find((item) => item.id === sessionId) ?? sessions[0]
  const candidate = candidates.find((item) => item.id === candidateId)

  const sessionCandidates = useMemo(() => {
    if (!session) return candidates
    const idSet = new Set(session.participantIds)
    const list = candidates.filter((c) => idSet.has(c.id))
    return list.length > 0 ? list : candidates
  }, [candidates, session])

  const completedCandidateIds = useMemo(() => {
    if (!session) return new Set<string>()
    return new Set(
      sessionCandidates
        .filter((c) => {
          const rec = records[`${session.id}:${c.id}`]
          return (
            rec?.savedAt &&
            (rec.attendance === "hadir" || !rec.attendance) &&
            hasRecordMetrics(rec)
          )
        })
        .map((c) => c.id),
    )
  }, [session, sessionCandidates, records])

  const unratedPresentCandidateIds = useMemo(() => {
    if (!session) return new Set<string>()
    return new Set(
      sessionCandidates
        .filter((c) => {
          const rec = records[`${session.id}:${c.id}`]
          return (
            rec?.savedAt &&
            (rec.attendance === "hadir" || !rec.attendance) &&
            !hasRecordMetrics(rec)
          )
        })
        .map((c) => c.id),
    )
  }, [session, sessionCandidates, records])

  const absentCandidateIds = useMemo(() => {
    if (!session) return new Set<string>()
    return new Set(
      sessionCandidates
        .filter((c) => {
          const rec = records[`${session.id}:${c.id}`]
          return rec?.savedAt && rec.attendance && rec.attendance !== "hadir"
        })
        .map((c) => c.id),
    )
  }, [session, sessionCandidates, records])

  const savedCandidateIds = useMemo(() => {
    if (!session) return new Set<string>()
    return new Set(
      sessionCandidates
        .filter((c) => records[`${session.id}:${c.id}`]?.savedAt)
        .map((c) => c.id),
    )
  }, [session, sessionCandidates, records])

  const currentCandidateIndex = useMemo(() => {
    return sessionCandidates.findIndex((c) => c.id === candidate?.id)
  }, [sessionCandidates, candidate])

  const prevCandidate =
    currentCandidateIndex > 0
      ? sessionCandidates[currentCandidateIndex - 1]
      : null
  const nextCandidate =
    currentCandidateIndex >= 0 &&
    currentCandidateIndex < sessionCandidates.length - 1
      ? sessionCandidates[currentCandidateIndex + 1]
      : null

  const nextUnratedCandidate = useMemo(() => {
    if (currentCandidateIndex < 0) return null
    for (let i = currentCandidateIndex + 1; i < sessionCandidates.length; i++) {
      if (!savedCandidateIds.has(sessionCandidates[i].id)) {
        return sessionCandidates[i]
      }
    }
    for (let i = 0; i < currentCandidateIndex; i++) {
      if (!savedCandidateIds.has(sessionCandidates[i].id)) {
        return sessionCandidates[i]
      }
    }
    return null
  }, [sessionCandidates, currentCandidateIndex, savedCandidateIds])

  const filteredCandidates = useMemo(() => {
    return sessionCandidates.filter((c) => {
      if (candidateFilter === "unrated") return !savedCandidateIds.has(c.id)
      if (candidateFilter === "rated") return completedCandidateIds.has(c.id)
      if (candidateFilter === "unscored")
        return unratedPresentCandidateIds.has(c.id)
      if (candidateFilter === "absent") return absentCandidateIds.has(c.id)
      return true
    })
  }, [
    sessionCandidates,
    completedCandidateIds,
    unratedPresentCandidateIds,
    absentCandidateIds,
    savedCandidateIds,
    candidateFilter,
  ])

  const searchedCandidates = useMemo(() => {
    const q = candidateSearch.trim().toLowerCase()
    if (!q) return sessionCandidates
    return sessionCandidates.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.number.toLowerCase().includes(q) ||
        c.school.toLowerCase().includes(q),
    )
  }, [sessionCandidates, candidateSearch])

  function createSession() {
    const next: Session = {
      id: `session-${Date.now()}`,
      ...draft,
      title: draft.title || definitions[draft.type].label,
      location: draft.location.trim() || "Sekretariat Seleksi",
      coach: draft.coach.trim() || "Petugas Seleksi",
      participantIds: candidates.map((item) => item.id),
      status: "scheduled",
      fitnessPreset: draft.type === "fitness" ? draft.fitnessPreset : undefined,
      activeFitnessTests:
        draft.type === "fitness" ? draft.activeFitnessTests : undefined,
      trackLength: draft.type === "fitness" ? draft.trackLength : undefined,
    }
    const nextSessions = [next, ...sessions]
    setSessions(nextSessions)
    setSessionId(next.id)
    setCandidateId(next.participantIds[0] ?? candidates[0]?.id ?? "")
    setShowCreate(false)
    showToast(`Sesi "${next.title}" berhasil dibuat.`)
    saveToCloud({ sessions: nextSessions })
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
            onChange={(event) => {
              const newType = event.target.value as SessionType
              setDraft((value) => ({
                ...value,
                type: newType,
                title: definitions[newType].label,
              }))
            }}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-normal outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
          >
            {Object.entries(definitions)
              .filter(([value]) => value !== "pip" && value !== "tiu")
              .map(([value, item]) => (
                <option value={value} key={value}>
                  {item.label}
                </option>
              ))}
          </select>
        </label>
        {draft.type === "fitness" ? (
          <>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Fokus latihan fisik
              <select
                value={draft.fitnessPreset}
                onChange={(e) => {
                  const p = e.target.value as any
                  const tests =
                    p === "run_only"
                      ? ["distance"]
                      : p === "run_shuttle"
                        ? ["distance", "shuttle"]
                        : p === "samapta_b"
                          ? ["pushup", "situp", "backup"]
                          : ["distance", "pushup", "situp", "backup", "shuttle"]
                  setDraft((v) => ({
                    ...v,
                    fitnessPreset: p,
                    activeFitnessTests: tests,
                  }))
                }}
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-normal outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
              >
                <option value="all">5 Tes Lengkap (Samapta A & B)</option>
                <option value="run_only">🏃 Hanya Lari 12 Menit</option>
                <option value="run_shuttle">🏃⚡ Lari & Shuttle Run</option>
                <option value="samapta_b">
                  💪 Samapta B (Push/Sit/Back-up)
                </option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Panjang lintasan lari (meter)
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="400"
                  value={draft.trackLength || ""}
                  onChange={(e) =>
                    setDraft((v) => ({
                      ...v,
                      trackLength: Number(e.target.value) || 0,
                    }))
                  }
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 pr-8 text-sm font-bold text-slate-800 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  m
                </span>
              </div>
            </label>
          </>
        ) : null}
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

  if (!session || !candidates.length) {
    return (
      <div className="grid gap-4 sm:gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-950">
              Sesi seleksi & latihan
            </h1>
            <p className="mt-0.5 max-w-2xl text-xs text-slate-500">
              Buat sesi, input hasil, isi survei pelatih, dan sinkronkan
              otomatis ke profil, tahapan, serta pemeringkatan kandidat.
            </p>
          </div>
          <Button size="sm" onClick={() => setShowCreate((value) => !value)}>
            <Plus className="size-3.5" /> Buat sesi baru
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

  const key = candidate ? `${session.id}:${candidate.id}` : ""
  const record = (key ? records[key] : null) ?? emptyRecord()
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

  // 1. Data Hasil Tes Ishihara (Buta Warna) dari Portal
  const candidateIshihara = useMemo(() => {
    if (!candidate?.id || !ishiharaResults) return null
    return ishiharaResults.find((res) => res.participantId === candidate.id) || null
  }, [candidate?.id, ishiharaResults])

  // 2. Data Cek Anamnesis Mandiri dari Portal
  const candidatePortalAnamnesis = useMemo(() => {
    if (!candidate?.id) return null
    try {
      const histRaw = localStorage.getItem(`paska-anamnesis-history-${candidate.id}`)
      if (histRaw) {
        const hist = JSON.parse(histRaw)
        if (Array.isArray(hist) && hist.length > 0) {
          return {
            answers: hist[0].answers ?? {},
            score: hist[0].score ?? 100,
            yesCount: hist[0].yesCount ?? 0,
            criticalCount: hist[0].criticalCount ?? 0,
            status: (hist[0].status as "passed" | "review" | "failed") ?? "passed",
            timestamp: hist[0].timestamp ?? "",
            source: "Riwayat Portal Mandiri",
          }
        }
      }
      const savedRaw = localStorage.getItem(`paska-anamnesis-${candidate.id}`)
      if (savedRaw) {
        const saved = JSON.parse(savedRaw)
        return {
          answers: (saved.answers as Record<string, "yes" | "no">) ?? {},
          score: saved.score ?? 100,
          yesCount: saved.yesCount ?? 0,
          criticalCount: saved.criticalCount ?? 0,
          status: (saved.status as "passed" | "review" | "failed") ?? "passed",
          timestamp: saved.savedAt ?? "",
          source: "Portal Mandiri",
        }
      }
      const rikkesKey = `session-rikkes-tahap4:${candidate.id}`
      const rec = records[rikkesKey]
      if (rec && rec.metrics) {
        const answers: Record<string, "yes" | "no"> = {}
        anamnesisItems.forEach((_, i) => {
          const val = rec.metrics[`anamnesis-${i}`]
          if (val === "yes" || val === "no") answers[String(i)] = val
        })
        if (Object.keys(answers).length > 0) {
          return {
            answers,
            score: Number(rec.metrics.anamnesisScore) || 100,
            yesCount: Number(rec.metrics.anamnesis) || 0,
            criticalCount: rec.metrics.anamnesisCritical === "yes" ? 1 : 0,
            status: ((rec.metrics.anamnesisStatus as any) || "passed") as "passed" | "review" | "failed",
            timestamp: rec.metrics.anamnesisCompletedAt || rec.savedAt || "",
            source: "Sesi Rikkes Tahap 4",
          }
        }
      }
    } catch {
      // Ignore
    }
    return null
  }, [candidate?.id, records])

  // 3. Data Hasil Tryout CAT dari Portal
  const candidateCatAttempt = useMemo(() => {
    if (!candidate?.id) return null
    const matched = (catTryoutAttempts || []).filter(
      (a) => a.candidateId === candidate.id,
    )
    if (matched.length > 0) {
      return [...matched].sort((a, b) =>
        (b.finalizedAt || "").localeCompare(a.finalizedAt || ""),
      )[0]
    }
    if (candidate.pip !== null || candidate.tiu !== null) {
      const pipS = candidate.pip ?? 0
      const tiuS = candidate.tiu ?? 0
      const comb = Math.round((pipS + tiuS) / 2)
      return {
        id: `synth-${candidate.id}`,
        candidateId: candidate.id,
        candidateName: candidate.name,
        candidateGroup: candidate.school,
        packageName: "Simulasi CAT Mandiri",
        attemptNumber: 1,
        pipAnswers: {},
        tiuAnswers: {},
        pipCorrect: Math.round(pipS / 2),
        pipScore: pipS,
        pipStatus: (pipS >= 70 ? "passed" : "failed") as "passed" | "failed",
        tiuCorrect: Math.round(tiuS / 2),
        tiuScoreRaw: Math.round(tiuS / 2),
        tiuScoreScaled: tiuS,
        tiuStatus: (tiuS >= 70 ? "passed" : "failed") as "passed" | "failed",
        combinedScore: comb,
        startedAt: "",
        finalizedAt: candidate.updatedAt || "",
      }
    }
    return null
  }, [candidate?.id, candidate?.pip, candidate?.tiu, candidate?.name, candidate?.school, candidate?.updatedAt, catTryoutAttempts])

  // Sinkronkan semua nilai tryout santri yang sudah ada ke sesi CAT ini
  const syncAllCatTryoutsToSession = () => {
    let count = 0
    let nextRecords = { ...records }
    for (const cand of sessionCandidates) {
      const matched = (catTryoutAttempts || []).filter((a) => a.candidateId === cand.id)
      const attempt = matched.length > 0
        ? [...matched].sort((a, b) => (b.finalizedAt || "").localeCompare(a.finalizedAt || ""))[0]
        : null

      const pS = attempt ? attempt.pipScore : (cand.pip ?? null)
      const tS = attempt ? attempt.tiuScoreScaled : (cand.tiu ?? null)

      if (pS !== null || tS !== null) {
        const pipScore = pS ?? 0
        const tiuScore = tS ?? 0
        const comb = attempt?.combinedScore ?? Math.round((pipScore + tiuScore) / 2)
        const scoreVal = session.type === "pip" ? pipScore : session.type === "tiu" ? tiuScore : comb
        const isPassed = session.type === "pip" ? pipScore >= 70 : session.type === "tiu" ? tiuScore >= 70 : (pipScore >= 70 && tiuScore >= 70)
        
        const recKey = `${session.id}:${cand.id}`
        const oldRec = nextRecords[recKey]
        nextRecords[recKey] = {
          ...(oldRec ?? {
            attendance: "hadir",
            discipline: "4",
            focus: "4",
            stamina: "4",
            note: "",
          }),
          attendance: "hadir",
          result: isPassed ? "passed" : "review",
          metrics: {
            ...(oldRec?.metrics ?? {}),
            score: String(scoreVal),
            pipScore: String(pipScore),
            tiuScore: String(tiuScore),
            duration: "PIP 45m · TIU 30m",
            tryoutAttemptId: attempt?.id,
          },
          savedAt: attempt?.finalizedAt || new Date().toISOString(),
        }
        count++
      }
    }

    if (count > 0) {
      setRecords(nextRecords)
      saveToCloud({ records: nextRecords })
      showToast(`Berhasil menyinkronkan ${count} nilai tryout santri ke sesi ini!`, "success")
    } else {
      showToast("Belum ada santri yang menyelesaikan tryout di portal CAT.", "info")
    }
  }

  // 4. Evaluasi Diagnostik Lengkap Rikkes Sesuai 5 Pilar BPIP
  const rikkesEval = useMemo(() => {
    if (session.type !== "medical") return null

    const m = record.metrics
    const tmsReasons: string[] = []
    const reviewWarnings: string[] = []

    // 1. TEKANAN DARAH
    let sys = parseFloat(m.systolic || "")
    let dia = parseFloat(m.diastolic || "")
    if ((isNaN(sys) || isNaN(dia)) && m.bloodPressure) {
      const parts = m.bloodPressure.split("/")
      if (parts.length === 2) {
        sys = parseFloat(parts[0].trim())
        dia = parseFloat(parts[1].trim())
      }
    }

    let bpCategory: "normal" | "tolerance" | "failed" | "hypotension" | "empty" = "empty"
    if (!isNaN(sys) && !isNaN(dia) && sys > 0 && dia > 0) {
      if (sys > 140 || dia > 90) {
        bpCategory = "failed"
        tmsReasons.push(
          `Tekanan darah tinggi > 140/90 mmHg (${Math.round(sys)}/${Math.round(dia)} mmHg) — MUTLAK GUGUR tensi tinggi`,
        )
      } else if (sys > 125 || dia > 85) {
        bpCategory = "tolerance"
        reviewWarnings.push(
          `Tekanan darah di batas maksimal toleransi (${Math.round(sys)}/${Math.round(dia)} mmHg, maks 130/90). Perlu istirahat & ukur ulang.`,
        )
      } else if (sys < 100 || dia < 60) {
        bpCategory = "hypotension"
        reviewWarnings.push(
          `Hipotensi (${Math.round(sys)}/${Math.round(dia)} mmHg < 100/60). Waspada pusing/sinkop di lapangan.`,
        )
      } else {
        bpCategory = "normal"
      }
    }

    // 2. DENYUT NADI ISTIRAHAT
    const pulse = parseFloat(m.pulse || "")
    const rhythm = m.pulseRhythm ?? "sinus"
    let pulseCategory: "normal" | "arrhythmia" | "tachycardia" | "bradycardia" | "empty" = "empty"

    if (rhythm === "arrhythmia") {
      pulseCategory = "arrhythmia"
      tmsReasons.push("Irama denyut nadi ARITMIA (tidak teratur) — Tidak memenuhi syarat kardiovaskular")
    } else if (!isNaN(pulse) && pulse > 0) {
      if (pulse > 100) {
        pulseCategory = "tachycardia"
        tmsReasons.push(`Denyut nadi istirahat takikardia (${Math.round(pulse)} bpm > 100 bpm)`)
      } else if (pulse > 85) {
        pulseCategory = "tachycardia"
        reviewWarnings.push(`Denyut nadi istirahat (${Math.round(pulse)} bpm) di atas batas normal 85 bpm`)
      } else if (pulse < 60) {
        pulseCategory = "bradycardia"
        reviewWarnings.push(`Denyut nadi istirahat bradikardia (${Math.round(pulse)} bpm < 60 bpm)`)
      } else {
        pulseCategory = "normal"
      }
    }

    // 3. MATA & PENGLIHATAN
    const ishihara =
      m.ishiharaStatus ??
      (candidateIshihara
        ? candidateIshihara.screeningInterpretation === "normal" ||
          candidateIshihara.selectionDecision === "eligible"
          ? "normal"
          : "partial"
        : "normal")
    const minus = parseFloat(m.refractionMinus || "0")
    let eyeCategory: "normal" | "tolerance" | "failed" = "normal"

    if (ishihara === "partial" || ishihara === "total") {
      eyeCategory = "failed"
      tmsReasons.push(
        `Buta warna ${ishihara === "total" ? "Total" : "Parsial"} (Uji Ishihara) — MUTLAK GUGUR`,
      )
    } else if (minus > 1.0) {
      eyeCategory = "failed"
      tmsReasons.push(
        `Refraksi mata minus/silinder (${minus.toFixed(2)} D) melebihi toleransi maksimal 1.0 dioptri`,
      )
    } else if (minus > 0 && minus <= 1.0) {
      eyeCategory = "tolerance"
      reviewWarnings.push(
        `Koreksi visus minus ringan (${minus.toFixed(2)} D) dalam toleransi maksimal 1.0 D`,
      )
    }

    // 4. KESEHATAN GIGI & MULUT
    const karies = m.kariesActive ?? "bebas"
    const cavityCount = parseInt(m.cavityCount || "0", 10) || 0
    const cavityFilled = m.cavityFilled ?? "yes"
    const frontTeeth = m.frontTeeth ?? "utuh"
    const occlusion = m.occlusion ?? "normal"
    let teethCategory: "normal" | "tolerance" | "failed" = "normal"

    if (karies === "parah") {
      teethCategory = "failed"
      tmsReasons.push("Terdapat karies aktif parah pada gigi/rongga mulut")
    }
    if (cavityCount > 5) {
      teethCategory = "failed"
      tmsReasons.push(`Gigi berlubang melebihi batas (${cavityCount} gigi > batas maksimal 5 gigi)`)
    } else if (cavityCount > 0 && cavityFilled === "no") {
      teethCategory = "failed"
      tmsReasons.push(`Terdapat ${cavityCount} gigi berlubang yang belum ditambal sebelum seleksi`)
    }
    if (frontTeeth === "ompong_patah") {
      teethCategory = "failed"
      tmsReasons.push("Gigi depan ompong/patah tanpa gigi tiruan estetik permanen — MUTLAK GUGUR")
    }
    if (occlusion === "maloklusi_parah") {
      teethCategory = teethCategory === "failed" ? "failed" : "tolerance"
      reviewWarnings.push("Maloklusi parah (susunan gigi rawan penalti evaluasi)")
    }

    // 5. THT & PERNAPASAN
    const tonsil = m.tonsil ?? "normal"
    const polyp = m.nasalPolyp ?? "bebas"
    const tympanic = m.tympanic ?? "utuh"
    let entCategory: "normal" | "failed" = "normal"

    if (tonsil === "t3_t4") {
      entCategory = "failed"
      tmsReasons.push("Tonsilitis kronis T3–T4 (amandel membesar parah) — MUTLAK GUGUR")
    }
    if (polyp === "ada") {
      entCategory = "failed"
      tmsReasons.push("Terdapat polip hidung — MUTLAK GUGUR")
    }
    if (tympanic === "robek_congek") {
      entCategory = "failed"
      tmsReasons.push("Membran timpani robek / riwayat congek (otitis media) — MUTLAK GUGUR")
    }

    // 6. ANAMNESIS
    if (medicalCritical) {
      tmsReasons.push("Riwayat penyakit kritis pada survei Anamnesis (Asma/Jantung/Epilepsi/Narkoba) — Hard-lock gugur")
    }
    if (medicalYesCount > 5) {
      reviewWarnings.push(`Survei anamnesis melebihi ambang batas (${medicalYesCount} YA > 5 keluhan)`)
    }

    let finalDecision: "passed" | "review" | "failed" = "passed"
    if (tmsReasons.length > 0) {
      finalDecision = "failed"
    } else if (reviewWarnings.length > 0) {
      finalDecision = "review"
    } else {
      finalDecision = "passed"
    }

    return {
      finalDecision,
      tmsReasons,
      reviewWarnings,
      bpCategory,
      pulseCategory,
      eyeCategory,
      teethCategory,
      entCategory,
      sys: !isNaN(sys) ? sys : null,
      dia: !isNaN(dia) ? dia : null,
      pulse: !isNaN(pulse) ? pulse : null,
      rhythm,
      ishihara,
      minus,
      karies,
      cavityCount,
      cavityFilled,
      frontTeeth,
      occlusion,
      tonsil,
      polyp,
      tympanic,
    }
  }, [record.metrics, session.type, candidateIshihara, medicalCritical, medicalYesCount])
  const isIntervalSession = session.title.toLowerCase().includes("interval")
  const activeFitnessTests: string[] =
    session.type === "fitness"
      ? (session.activeFitnessTests ??
        (isIntervalSession && session.title.toLowerCase().includes("shuttle")
          ? ["distance", "shuttle"]
          : isIntervalSession
            ? ["distance"]
            : ["distance", "pushup", "situp", "backup", "shuttle"]))
      : []

  const sessionTrackLength: number = session.trackLength ?? 400

  const isRunDnf = record.metrics.runDnf === "yes"

  const currentRunMode: "test12" | "interval" =
    record.metrics.runMode === "test12"
      ? "test12"
      : record.metrics.runMode === "interval"
        ? "interval"
        : isIntervalSession
          ? "interval"
          : "test12"

  const fitnessItemsData =
    session.type === "fitness"
      ? FITNESS_ITEMS.map((item) => {
          const rawStr = (record.metrics[item.key] ?? "").trim()
          const isDnf = item.key === "distance" && isRunDnf
          const isIntervalDistance =
            item.key === "distance" && currentRunMode === "interval"
          const hasIntervalLaps = [1, 2, 3, 4, 5, 6].some((i) =>
            Boolean(record.metrics[`intervalLap${i}`]),
          )
          const hasVal =
            isDnf ||
            (rawStr !== "" && !isNaN(Number(rawStr)) && Number(rawStr) > 0) ||
            (isIntervalDistance && hasIntervalLaps)
          const rawNum = hasVal && !isNaN(Number(rawStr)) ? Number(rawStr) : 0

          let score = 0
          if (isDnf) {
            score = 0
          } else if (isIntervalDistance) {
            const targetSets =
              parseInt(record.metrics.intervalTargetSets || "4", 10) || 4
            const targetPace =
              parseFloat(record.metrics.intervalTargetPace || "90") || 90
            const laps = Array.from({ length: 12 }, (_, i) => i + 1)
              .map((i) => parseFloat(record.metrics[`intervalLap${i}`] || ""))
              .filter((v) => !isNaN(v) && v > 0)
            const completedSets =
              laps.length > 0
                ? laps.length
                : parseInt(record.metrics.intervalTargetSets || "4", 10) || 4
            const avgSplit =
              laps.length > 0
                ? laps.reduce((a, b) => a + b, 0) / laps.length
                : targetPace
            score = calculateIntervalScore(
              targetSets,
              completedSets,
              targetPace,
              avgSplit,
              isRunDnf,
            )
          } else if (hasVal) {
            score = fitnessScore(item.typeKey, rawNum)
          }

          const isActive = activeFitnessTests.includes(item.key)
          const label = isIntervalDistance
            ? "Drill Interval (Bina Fisik)"
            : item.label
          const shortLabel = isIntervalDistance ? "Interval" : item.shortLabel

          return {
            ...item,
            isInterval: isIntervalDistance,
            isOfficialSamapta: !isIntervalDistance,
            label,
            shortLabel,
            rawStr,
            hasVal,
            rawNum,
            score,
            isDnf,
            isActive,
          }
        })
      : []

  // Tes Resmi Samapta: HANYA Lari 12 Menit resmi dan Samapta B (Latihan Interval TIDAK PERNAH masuk nilai Samapta!)
  const officialTestedFitnessItems = fitnessItemsData.filter(
    (item) => item.isActive && item.hasVal && item.isOfficialSamapta,
  )

  const officialFitnessAverage = officialTestedFitnessItems.length
    ? officialTestedFitnessItems.reduce((acc, item) => acc + item.score, 0) /
      officialTestedFitnessItems.length
    : null

  // Komponen Drill Interval (terpisah dari nilai Samapta)
  const intervalItemData = fitnessItemsData.find((item) => item.isInterval)

  function setSessionFitnessPreset(
    presetId: "all" | "run_only" | "run_shuttle" | "samapta_b" | "custom",
    tests?: string[],
  ) {
    const defaultTests =
      presetId === "run_only"
        ? ["distance"]
        : presetId === "run_shuttle"
          ? ["distance", "shuttle"]
          : presetId === "samapta_b"
            ? ["pushup", "situp", "backup"]
            : ["distance", "pushup", "situp", "backup", "shuttle"]

    const nextTests = tests ?? defaultTests
    const nextSessions = sessions.map((s) =>
      s.id === session.id
        ? {
            ...s,
            fitnessPreset: presetId,
            activeFitnessTests: nextTests,
          }
        : s,
    )
    setSessions(nextSessions)
    saveToCloud({ sessions: nextSessions })
  }

  function toggleFitnessTest(testKey: string) {
    const currentTests = session.activeFitnessTests ?? [
      "distance",
      "pushup",
      "situp",
      "backup",
      "shuttle",
    ]
    let next: string[]
    if (currentTests.includes(testKey)) {
      if (currentTests.length <= 1) {
        showToast("Minimal satu item tes harus aktif.", "warning")
        return
      }
      next = currentTests.filter((k) => k !== testKey)
    } else {
      next = [...currentTests, testKey]
    }
    const nextSessions = sessions.map((s) =>
      s.id === session.id
        ? {
            ...s,
            fitnessPreset: "custom",
            activeFitnessTests: next,
          }
        : s,
    )
    setSessions(nextSessions)
    saveToCloud({ sessions: nextSessions })
  }

  function updateTrackLength(newLen: number) {
    const nextSessions = sessions.map((s) =>
      s.id === session.id ? { ...s, trackLength: newLen } : s,
    )
    setSessions(nextSessions)
    saveToCloud({ sessions: nextSessions })
    const currentLaps = record.metrics.laps
    if (currentLaps && !isNaN(Number(currentLaps))) {
      const extra = Number(record.metrics.extraMeters) || 0
      const totalDist = Math.round(Number(currentLaps) * newLen + extra)
      patchRecord({
        metrics: {
          ...record.metrics,
          distance: totalDist > 0 ? String(totalDist) : "",
        },
      })
    }
  }

  function handleLapsChange(lapsStr: string) {
    const lapsNum = parseFloat(lapsStr)
    const extra = Number(record.metrics.extraMeters) || 0
    if (!isNaN(lapsNum) && lapsNum >= 0) {
      const totalDist = Math.round(lapsNum * sessionTrackLength + extra)
      patchRecord({
        metrics: {
          ...record.metrics,
          laps: lapsStr,
          distance: totalDist > 0 ? String(totalDist) : "",
        },
      })
    } else {
      patchRecord({
        metrics: {
          ...record.metrics,
          laps: lapsStr,
          distance: extra > 0 ? String(extra) : "",
        },
      })
    }
  }

  function stepLaps(delta: number) {
    const currentLaps = parseFloat(record.metrics.laps || "0") || 0
    const nextLaps = Math.max(0, parseFloat((currentLaps + delta).toFixed(2)))
    handleLapsChange(String(nextLaps))
  }

  function handleExtraMetersChange(extraStr: string) {
    const extraNum = parseFloat(extraStr) || 0
    const lapsNum = parseFloat(record.metrics.laps || "0") || 0
    const totalDist = Math.round(lapsNum * sessionTrackLength + extraNum)
    patchRecord({
      metrics: {
        ...record.metrics,
        extraMeters: extraStr,
        distance: totalDist > 0 ? String(totalDist) : "",
      },
    })
  }

  function handleDistanceDirectChange(distStr: string) {
    const distNum = parseFloat(distStr)
    if (!isNaN(distNum) && distNum > 0) {
      const estLaps = (distNum / sessionTrackLength)
        .toFixed(2)
        .replace(/\.00$/, "")
      patchRecord({
        metrics: {
          ...record.metrics,
          distance: distStr,
          laps: estLaps,
        },
      })
    } else {
      patchRecord({
        metrics: {
          ...record.metrics,
          distance: distStr,
          laps: "",
        },
      })
    }
  }

  const intervalLaps = Array.from({ length: 12 }, (_, i) => i + 1)
    .map((i) => parseFloat(record.metrics[`intervalLap${i}`] || ""))
    .filter((v) => !isNaN(v) && v > 0)
  const calcIntervalCompletedSets = intervalLaps.length
  const currentIntervalDist =
    record.metrics.intervalDist || String(sessionTrackLength || 400)
  const currentIntervalTargetSets = record.metrics.intervalTargetSets || "4"
  const currentIntervalTargetPace = record.metrics.intervalTargetPace || "90"
  const calcIntervalDistPerSet = parseFloat(currentIntervalDist) || 400
  const effectiveSets =
    calcIntervalCompletedSets > 0
      ? calcIntervalCompletedSets
      : parseInt(currentIntervalTargetSets, 10) || 4
  const calcIntervalTotalDistance = effectiveSets * calcIntervalDistPerSet
  const calcIntervalAvgSplit =
    calcIntervalCompletedSets > 0
      ? intervalLaps.reduce((a, b) => a + b, 0) / calcIntervalCompletedSets
      : 0

  function updateIntervalMetrics(patch: Record<string, string>) {
    const nextMetrics = {
      ...record.metrics,
      runMode: "interval",
      ...patch,
    }
    const distPerSet =
      parseFloat(
        nextMetrics.intervalDist || String(sessionTrackLength || 400),
      ) || 400
    const completedLaps = Array.from({ length: 12 }, (_, i) => i + 1)
      .map((i) => parseFloat(nextMetrics[`intervalLap${i}`] || ""))
      .filter((v) => !isNaN(v) && v > 0).length

    const setsCount =
      completedLaps > 0
        ? completedLaps
        : parseInt(nextMetrics.intervalTargetSets || "4", 10) || 4

    nextMetrics.intervalTotalDist = String(setsCount * distPerSet)
    // JANGAN timpa distance dengan total jarak interval! distance HANYA untuk tes resmi Lari 12 Menit.
    delete nextMetrics.distance
    patchRecord({ metrics: nextMetrics })
  }

  function updateLapSplit(setNum: number, value: string) {
    const fieldKey = `intervalLap${setNum}`
    const nextMetrics = {
      ...record.metrics,
      runMode: "interval",
      [fieldKey]: value,
    }
    const laps = Array.from({ length: 12 }, (_, i) => i + 1)
      .map((i) =>
        i === setNum
          ? parseFloat(value)
          : parseFloat(record.metrics[`intervalLap${i}`] || ""),
      )
      .filter((v) => !isNaN(v) && v > 0)

    const distPerSet =
      parseFloat(
        nextMetrics.intervalDist || String(sessionTrackLength || 400),
      ) || 400
    const totalDist = laps.length * distPerSet
    const avg =
      laps.length > 0 ? laps.reduce((a, b) => a + b, 0) / laps.length : 0

    nextMetrics.intervalTotalDist = totalDist > 0 ? String(totalDist) : ""
    nextMetrics.intervalAvg = avg > 0 ? avg.toFixed(1) : ""
    nextMetrics.laps = String(laps.length)
    // JANGAN timpa distance dengan total jarak interval! distance HANYA untuk tes resmi Lari 12 Menit.
    delete nextMetrics.distance

    patchRecord({ metrics: nextMetrics })
  }
  const completed = session.participantIds.filter(
    (id) =>
      candidates.some((c) => c.id === id) &&
      records[`${session.id}:${id}`]?.savedAt,
  ).length

  function patchRecord(patch: Partial<SessionRecord>) {
    if (!key) return
    setRecords((current) => ({ ...current, [key]: { ...record, ...patch } }))
  }

  function saveRecord(advanceToNext = false) {
    if (!candidate || !key) return
    const isAbsent = Boolean(record.attendance && record.attendance !== "hadir")
    const metricsToSave = isAbsent ? {} : { ...record.metrics }
    // Jaminan proteksi: jika mode lari adalah latihan interval, pastikan runMode: 'interval' dan distance tidak disalahartikan
    if (currentRunMode === "interval") {
      metricsToSave.runMode = "interval"
      delete metricsToSave.distance
    }
    const nextRecord = {
      ...record,
      metrics: metricsToSave,
      result: isAbsent ? "review" : record.result,
      savedAt: new Date().toISOString(),
    }
    const nextRecords = {
      ...records,
      [key]: nextRecord,
    }
    setRecords(nextRecords)
    // Sync score & stage status directly to Candidate master state!
    const nextCandidates = syncCandidateFromSession({
      candidateId: candidate.id,
      sessionType: session.type,
      sessionId: session.id,
      sessionTitle: session.title,
      metrics: metricsToSave,
      records: nextRecords,
      result: nextRecord.result,
      note: nextRecord.note,
      attendance: nextRecord.attendance,
    })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
    saveToCloud({
      records: nextRecords,
      candidates: nextCandidates,
    })

    const hasScores = hasRecordMetrics(record)
    const actionText = isAbsent
      ? `Status absensi (${record.attendance!.toUpperCase()}) ${candidate.name}`
      : hasScores
        ? `Nilai ${candidate.name}`
        : `Status sesi ${candidate.name} (tanpa nilai)`

    if (advanceToNext) {
      const target = nextUnratedCandidate || nextCandidate
      if (target && target.id !== candidate.id) {
        setCandidateId(target.id)
        showToast(
          `${actionText} disimpan! Lanjut ke ${target.name}.`,
          "success",
        )
      } else {
        showToast(
          `${actionText} disimpan! Semua peserta dalam sesi ini telah selesai diinput. 🎉`,
          "success",
        )
      }
    } else {
      showToast(`${actionText} berhasil disimpan.`, "success")
    }
  }

  function updateSessionStatus(nextStatus: SessionStatus) {
    const nextSessions = sessions.map((s) =>
      s.id === session.id ? { ...s, status: nextStatus } : s,
    )
    setSessions(nextSessions)
    showToast(`Status sesi diubah menjadi ${nextStatus}.`, "info")
    saveToCloud({ sessions: nextSessions })
  }

  function deleteCurrentSession() {
    const remaining = sessions.filter((s) => s.id !== session.id)
    setSessions(remaining)
    setSessionId(remaining[0]?.id ?? "")
    showToast(`Sesi "${session.title}" telah dihapus.`, "warning")
    saveToCloud({ sessions: remaining })
  }

  // Statistik & Standar Khusus Sesi Aktif untuk Mengisi Ruang Kartu dengan Informasi Relevan
  const sessionGradedRecords = session.participantIds
    .map((id) => records[`${session.id}:${id}`])
    .filter((r): r is SessionRecord =>
      Boolean(
        r &&
          r.savedAt &&
          (r.attendance === "hadir" || !r.attendance) &&
          hasRecordMetrics(r),
      ),
    )

  const sessionPassCount = sessionGradedRecords.filter(
    (r) => r.result === "passed",
  ).length

  const sessionReviewCount = sessionGradedRecords.filter(
    (r) => r.result === "review",
  ).length

  const sessionStandards = (() => {
    switch (session.type) {
      case "fitness": {
        const isInterval = session.title.toLowerCase().includes("interval")
        const allItems = [
          {
            key: "distance",
            label: isInterval ? "Lari Interval" : "Lari 12 Menit",
            target: isInterval ? "4–6 Set" : "3.000 m",
            sub: isInterval
              ? `Track ${sessionTrackLength}m · Pace Stabil`
              : `Track ${sessionTrackLength}m · Min. 2.400m`,
          },
          {
            key: "pushup",
            label: "Push-up (1 mnt)",
            target: "45 kali",
            sub: "Putra · Min. 30x",
          },
          {
            key: "situp",
            label: "Sit-up (1 mnt)",
            target: "40 kali",
            sub: "Putra · Min. 30x",
          },
          {
            key: "backup",
            label: "Back-up (1 mnt)",
            target: "50 kali",
            sub: "Putra · Min. 30x",
          },
          {
            key: "shuttle",
            label: "Shuttle-Run",
            target: "16.2 dtk",
            sub: "6x10m angka 8",
          },
        ]
        const filteredItems = allItems.filter((item) =>
          activeFitnessTests.includes(item.key),
        )
        return {
          title: isInterval
            ? "Standar & Parameter Latihan Interval (Jasmani)"
            : "Standar & Parameter Jasmani (BPIP)",
          badge: isInterval
            ? "Latihan Interval & Stamina"
            : "Kesamaptaan Jasmani",
          items: filteredItems.length > 0 ? filteredItems : allItems,
          guideline: isInterval
            ? "Fokus menjaga konsistensi split waktu antar-set (pace target) dan adaptasi denyut pemulihan."
            : "Target nilai 100 mengacu pada Peraturan BPIP RI. Rata-rata skor minimal 75.0 untuk predikat Siap.",
        }
      }
      case "pbb":
        return {
          title: "Standar Penilaian PBB BPIP",
          badge: "Baris Berbaris",
          items: [
            {
              label: "12 Gerakan Pokok",
              target: "Sempurna",
              sub: "Sikap, hadap/balik, jalan di tempat",
            },
            {
              label: "PBB Berjalan",
              target: "Tegap & Irama",
              sub: "Langkah tegap, hormat kanan",
            },
            {
              label: "Kerapian Saf/Banjar",
              target: "Presisi",
              sub: "Kekompakan tempo barisan",
            },
            {
              label: "Aba-aba & Respon",
              target: "Tegas",
              sub: "Kecepatan dan kepatuhan komando",
            },
          ],
          guideline:
            "Standar kelulusan PBB minimal 75.0. Penilaian menitikberatkan ketegapan postur dan keseragaman tempo.",
        }
      case "cat":
      case "pip":
      case "tiu":
        return {
          title: "Standar Ujian CAT Terstandarisasi",
          badge:
            session.type === "cat"
              ? "CAT Terpadu (PIP & TIU)"
              : session.type === "pip"
                ? "CAT PIP (Pancasila)"
                : "CAT TIU (Intelegensia)",
          items: [
            {
              label: "Jumlah Soal",
              target: session.type === "cat" ? "100 Soal" : "50 Soal",
              sub: session.type === "cat" ? "50 PIP + 50 TIU" : "Pilihan ganda CAT BPIP",
            },
            {
              label: "Alokasi Waktu",
              target: session.type === "cat" ? "75 Menit" : session.type === "pip" ? "45 Menit" : "30 Menit",
              sub: session.type === "cat" ? "45m PIP + 30m TIU" : "Rata-rata 54 dtk per butir",
            },
            {
              label: "Passing Grade",
              target: "≥ 70.0",
              sub: "Ambang batas kelulusan resmi",
            },
            {
              label: "Bobot Kelulusan",
              target: "Kumulatif",
              sub: "Penentu kuota ranking kota",
            },
          ],
          guideline:
            "Peserta wajib melampaui passing grade 70.0 untuk PIP dan TIU untuk dapat direkomendasikan ke tahapan parade berikutnya.",
        }
      case "medical":
        return {
          title: "Standar Rikkes BPIP (Tahap 4)",
          badge: "Pemeriksaan Kesehatan",
          items: [
            {
              label: "Tekanan Darah",
              target: "110/70–125/85",
              sub: "Maks. 130/90 · >140/90 Mutlak Gugur",
            },
            {
              label: "Nadi Istirahat",
              target: "60–85 bpm",
              sub: "Sinus Reguler · Tanpa Aritmia",
            },
            {
              label: "Mata & Ishihara",
              target: "Visus 6/6",
              sub: "Toleransi ≤1D · Bebas Buta Warna",
            },
            {
              label: "Gigi & Mulut",
              target: "≤5 Gigi Ditambal",
              sub: "Gigi Depan Utuh · Bebas Maloklusi Berat",
            },
            {
              label: "THT & Pernapasan",
              target: "T0–T2 Tenang",
              sub: "Bebas Amandel T3-T4 · Polip · Congek",
            },
          ],
          guideline:
            "Standar Medis Rikkes BPIP mewajibkan 5 pilar organ vital di atas berada pada rentang sehat dan maksimal 5 YA tanpa keluhan kritis pada 21 anamnesis.",
        }
      case "interview":
        return {
          title: "Standar Wawancara & Kepribadian",
          badge: "Integritas & Bakat",
          items: [
            {
              label: "Wawasan Kebangsaan",
              target: "Mendalam",
              sub: "4 Konsensus Dasar & Sejarah RI",
            },
            {
              label: "Integritas & Mental",
              target: "Tangguh",
              sub: "Kepemimpinan & motivasi diri",
            },
            {
              label: "Bakat Kesenian",
              target: "Terampil",
              sub: "Kesenian daerah atau olahraga",
            },
            {
              label: "Public Speaking",
              target: "Santun",
              sub: "Artikulasi lugas & percaya diri",
            },
          ],
          guideline:
            "Menilai kedewasaan berpikir, komitmen pengabdian, dan kepribadian luhur calon pengibar bendera.",
        }
      case "parade":
        return {
          title: "Standar Parade & Kesamaptaan Fisik",
          badge: "Parade Awal",
          items: [
            {
              label: "Tegak Simetris",
              target: "Sempurna",
              sub: "Bahu datar & dagu terangkat",
            },
            {
              label: "Garis Tungkai",
              target: "Lurus",
              sub: "Bebas kelainan sendi kaki O/X",
            },
            {
              label: "Keseimbangan Statis",
              target: "Stabil",
              sub: "Tanpa goyang saat sikap sempurna",
            },
            {
              label: "Sorot Mata",
              target: "Fokus",
              sub: "Tatapan lurus berwibawa",
            },
          ],
          guideline:
            "Verifikasi visual bentuk tubuh dan kesiapan performa sebelum seleksi baris-berbaris mendalam.",
        }
      case "administration":
      default:
        return {
          title: "Standar Validasi Berkas Administrasi",
          badge: "Verifikasi Pokok",
          items: [
            {
              label: "Izin Orang Tua/Wali",
              target: "Lengkap",
              sub: "Bermeterai & bertandatangan",
            },
            {
              label: "Rekomendasi Madrasah",
              target: "Resmi",
              sub: "Disetujui Kepala Madrasah",
            },
            {
              label: "Legalisir Rapor",
              target: "Valid",
              sub: "Semester berjalan memenuhi syarat",
            },
            {
              label: "Identitas NIK/KTP",
              target: "Cocok",
              sub: "Sesuai Dapodik & Dukcapil",
            },
          ],
          guideline:
            "Semua dokumen wajib terverifikasi sah untuk memastikan kepesertaan santri di tingkat kota/kabupaten.",
        }
    }
  })()

  return (
    <div className="grid gap-6 pb-28 lg:pb-0">
      {/* Candidate Jump & Search Modal */}
      {showCandidatePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Pilih Peserta Sesi
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {completedCandidateIds.size} dari {sessionCandidates.length}{" "}
                  peserta telah dinilai
                  {absentCandidateIds.size > 0 && (
                    <span className="text-slate-400">
                      {" "}
                      ({absentCandidateIds.size} izin/absen)
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCandidatePicker(false)}
                className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="border-b border-slate-100 p-3 space-y-2.5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  type="text"
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  placeholder="Cari nama, nomor, atau sekolah..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100"
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto text-xs font-semibold pb-1">
                {[
                  { id: "all", label: `Semua (${sessionCandidates.length})` },
                  {
                    id: "unrated",
                    label: `Belum Input (${
                      sessionCandidates.length - savedCandidateIds.size
                    })`,
                  },
                  {
                    id: "rated",
                    label: `Dinilai (${completedCandidateIds.size})`,
                  },
                  ...(unratedPresentCandidateIds.size > 0
                    ? [
                        {
                          id: "unscored",
                          label: `Tanpa Nilai (${unratedPresentCandidateIds.size})`,
                        },
                      ]
                    : []),
                  ...(absentCandidateIds.size > 0
                    ? [
                        {
                          id: "absent",
                          label: `Izin/Absen (${absentCandidateIds.size})`,
                        },
                      ]
                    : []),
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setCandidateFilter(f.id as any)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition whitespace-nowrap ${
                      candidateFilter === f.id
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
              {searchedCandidates
                .filter((c) => {
                  if (candidateFilter === "unrated")
                    return !savedCandidateIds.has(c.id)
                  if (candidateFilter === "rated")
                    return completedCandidateIds.has(c.id)
                  if (candidateFilter === "unscored")
                    return unratedPresentCandidateIds.has(c.id)
                  if (candidateFilter === "absent")
                    return absentCandidateIds.has(c.id)
                  return true
                })
                .map((c) => {
                  const isSelected = candidate ? c.id === candidate.id : false
                  const rec = records[`${session.id}:${c.id}`]
                  const isSaved = Boolean(rec?.savedAt)
                  const att = rec?.attendance ?? "hadir"
                  const isAbsent = att !== "hadir"
                  const hasMetrics = hasRecordMetrics(rec)
                  const isRated = isSaved && !isAbsent && hasMetrics
                  const isPresentUnrated = isSaved && !isAbsent && !hasMetrics
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCandidateId(c.id)
                        setShowCandidatePicker(false)
                      }}
                      className={`w-full flex items-center justify-between gap-3 p-3 text-left rounded-xl transition ${
                        isSelected
                          ? "bg-red-50 text-red-900 ring-1 ring-red-200"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CandidateAvatar
                          name={c.name}
                          avatar={c.avatar}
                          photoUrl={c.photoUrl}
                          className="size-12 text-sm shrink-0"
                          rounded="rounded-xl"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-900 truncate">
                            {c.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {c.number} · {c.school}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isAbsent ? (
                          <>
                            <span
                              className={`rounded-md px-2 py-0.5 text-3xs font-bold uppercase ${
                                att === "izin"
                                  ? "bg-blue-100 text-blue-800"
                                  : att === "sakit"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {att}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              {isSaved ? "Tanpa Nilai" : "Belum Simpan"}
                            </span>
                          </>
                        ) : isRated ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                            <Check className="size-3" /> Dinilai
                          </span>
                        ) : isPresentUnrated ? (
                          <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800">
                            Tanpa Nilai
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            Belum
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
            </div>
          </div>
        </div>
      )}

      {/* Page Header (Wadah Card) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs w-full min-w-0">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100 shadow-2xs">
            <ClipboardList className="size-5.5 stroke-[2.2]" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-950 truncate">
                Sesi seleksi &amp; latihan
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
              Input hasil seleksi &amp; latihan secara cepat di lapangan dengan
              sinkronisasi otomatis.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowCreate((value) => !value)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 shadow-md shadow-red-600/25 transition-all duration-150 shrink-0 w-full sm:w-auto"
          >
            <Plus className="size-4 shrink-0" />
            <span>Buat sesi baru</span>
          </button>
        </div>
      </div>

      {createModalBlock}

      {/* Mobile Active Session Banner with Quick Switcher */}
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xs xl:hidden">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-xl ${definition.tone}`}
          >
            <definition.icon className="size-4.5" />
          </span>
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">
              {session.title}
            </p>
            <div className="shrink-0">
              <SessionBadge status={session.status} />
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowMobileSessionList((v) => !v)}
          className="inline-flex items-center gap-1 shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition active:scale-95 whitespace-nowrap"
        >
          <ListFilter className="size-3.5" />
          <span>{showMobileSessionList ? "Tutup" : "Ganti Sesi"}</span>
        </button>
      </div>

      {/* 1. BAGIAN ATAS: Daftar Sesi & Header Sesi Aktif (2 Kolom Seimbang) */}
      <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)] items-stretch">
        {/* Col 1: Daftar Sesi Card */}
        <Card
          className={`overflow-hidden flex flex-col ${
            showMobileSessionList ? "block" : "hidden xl:flex"
          }`}
        >
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center justify-between pb-3">
              <div>
                <h2 className="font-display font-bold text-slate-900">
                  Daftar sesi
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {sessions.length} sesi tercatat
                </p>
              </div>
              <Badge tone="neutral">
                {sessions.filter((item) => item.status === "active").length}{" "}
                aktif
              </Badge>
            </div>
            {/* Filter pills tanpa scrollbar abu-abu */}
            <div className="flex flex-wrap gap-1.5">
              {(["Semua", "Seleksi", "CAT", "Latihan"] as const).map(
                (filter) => (
                  <button
                    key={filter}
                    onClick={() => setSessionFilter(filter)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition active:scale-95 ${
                      sessionFilter === filter
                        ? "bg-slate-950 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {filter}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {visibleSessions.map((item) => {
              const config = definitions[item.type]
              const Icon = config.icon
              const active = item.id === session.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSessionId(item.id)
                    setShowMobileSessionList(false)
                  }}
                  className={`w-full rounded-xl border p-3 text-left transition active:scale-[0.99] ${
                    active
                      ? "border-red-300 bg-red-50/80 shadow-2xs ring-1 ring-red-200"
                      : "border-slate-200/80 bg-white hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-lg ${config.tone}`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-900">
                        {item.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-2xs text-slate-500">
                        <span>{item.date}</span>
                        <span>·</span>
                        <span>{sessionCandidates.length} kandidat</span>
                      </div>
                    </div>
                    <SessionBadge status={item.status} />
                  </div>
                </button>
              )
            })}
            {!visibleSessions.length ? (
              <div className="rounded-xl bg-slate-50 p-6 text-center text-xs text-slate-400">
                Belum ada sesi pada kategori ini.
              </div>
            ) : null}
          </div>
        </Card>

        {/* Col 2: Detail Sesi Aktif */}
        <Card className="overflow-hidden flex flex-col justify-between">
          <div className="bg-slate-950 p-3.5 sm:p-5 text-white">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                <span
                  className={`grid size-9.5 sm:size-11 shrink-0 place-items-center rounded-xl ${definition.tone}`}
                >
                  <definition.icon className="size-5 sm:size-5.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-white truncate">
                    {session.title}
                  </h2>
                </div>
              </div>

              {/* Status Badge at far right (Mobile & Desktop) + Desktop Controls */}
              <div className="flex items-center gap-2 shrink-0">
                <SessionBadge status={session.status} />

                {/* Desktop Status & Delete (Hidden on Mobile) */}
                <div className="hidden sm:flex items-center gap-2">
                  <div className="inline-flex rounded-lg bg-white/10 p-0.5 border border-white/10">
                    {(["scheduled", "active", "completed"] as const).map(
                      (st) => (
                        <button
                          key={st}
                          onClick={() => updateSessionStatus(st)}
                          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition active:scale-95 ${
                            session.status === st
                              ? "bg-red-600 text-white font-bold shadow-xs"
                              : "text-slate-300 hover:text-white"
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
                  </div>
                  <button
                    onClick={deleteCurrentSession}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 hover:bg-rose-600/30 text-slate-400 hover:text-rose-200 border border-white/10 transition active:scale-95"
                    title="Hapus sesi ini"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Symmetrical Sub-Bar: Mobile Controls & Metadata Badges */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-3 border-t border-white/10">
              {/* Mobile Symmetrical Status Switcher */}
              <div className="flex sm:hidden items-center justify-between gap-2 w-full">
                <div className="grid grid-cols-3 flex-1 rounded-lg bg-white/10 p-0.5 border border-white/10 text-center">
                  {(["scheduled", "active", "completed"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => updateSessionStatus(st)}
                      className={`rounded-md py-1 text-xs font-semibold transition active:scale-95 ${
                        session.status === st
                          ? "bg-red-600 text-white font-bold shadow-xs"
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      {st === "scheduled"
                        ? "Terjadwal"
                        : st === "active"
                          ? "Aktif"
                          : "Selesai"}
                    </button>
                  ))}
                </div>
                <button
                  onClick={deleteCurrentSession}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 hover:bg-rose-600/30 text-slate-400 hover:text-rose-200 border border-white/10 transition active:scale-95"
                  title="Hapus sesi ini"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              {/* Clean Symmetrical Metadata Badges */}
              <div className="flex flex-wrap items-center gap-2 text-2xs sm:text-xs text-slate-300">
                <span className="flex items-center gap-1.5 bg-white/[0.07] border border-white/10 px-2.5 py-1 rounded-lg">
                  <CalendarDays className="size-3 text-slate-400 shrink-0" />
                  <span>
                    {session.date} · {session.time}
                  </span>
                </span>
                <span className="flex items-center gap-1.5 bg-white/[0.07] border border-white/10 px-2.5 py-1 rounded-lg">
                  <MapPin className="size-3 text-slate-400 shrink-0" />
                  <span>
                    {session.location} · {session.coach}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Middle Section: Parameter & Standar Sesi */}
          <div className="flex-1 bg-white p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex size-6 items-center justify-center rounded-lg bg-red-100 text-red-700 shrink-0">
                <Target className="size-3.5" />
              </span>
              <h3 className="font-display text-sm font-bold text-slate-900 truncate">
                {sessionStandards.title}
              </h3>
            </div>

            {/* Grid Kartu Target Standar (Berdampingan & Rapi) */}
            <div
              className={`grid gap-2 sm:gap-2.5 ${
                sessionStandards.items.length === 1
                  ? "grid-cols-1"
                  : sessionStandards.items.length === 2
                    ? "grid-cols-2"
                    : sessionStandards.items.length === 3
                      ? "grid-cols-3"
                      : sessionStandards.items.length === 4
                        ? "grid-cols-2 sm:grid-cols-4"
                        : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
              }`}
            >
              {sessionStandards.items.map((item, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border border-slate-200/90 bg-slate-50/70 p-2.5 sm:p-3 transition hover:border-slate-300 hover:bg-slate-50 flex flex-col justify-between ${
                    sessionStandards.items.length === 1
                      ? "!flex-row !items-center !justify-between gap-3"
                      : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-2xs font-bold text-slate-500 uppercase tracking-wider truncate">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-3xs text-slate-400 truncate">
                      {item.sub}
                    </p>
                  </div>
                  <p
                    className={`font-display font-bold text-emerald-600 ${
                      sessionStandards.items.length === 1
                        ? "text-lg sm:text-xl shrink-0"
                        : "mt-2 text-sm sm:text-base leading-none"
                    }`}
                  >
                    {item.target}
                  </p>
                </div>
              ))}
            </div>

            {/* Live Session Insights / Ringkasan Kesiapan Simetris */}
            {sessionGradedRecords.length > 0 ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-emerald-200/90 bg-emerald-50/70 p-3 text-xs text-emerald-950">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span className="font-bold truncate">
                    {sessionPassCount} dari {sessionGradedRecords.length} santri
                    (
                    {Math.round(
                      (sessionPassCount / sessionGradedRecords.length) * 100,
                    )}
                    %) memenuhi standar kelayakan
                  </span>
                </div>
                {sessionReviewCount > 0 && (
                  <span className="inline-flex items-center self-start sm:self-auto text-2xs font-bold text-amber-800 bg-amber-100/90 border border-amber-200/80 px-2 py-0.5 rounded-md shrink-0">
                    {sessionReviewCount} butuh penguatan
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs text-slate-600">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="size-4 text-amber-500 shrink-0" />
                  <span className="font-medium text-2xs truncate">
                    {sessionStandards.guideline}
                  </span>
                </div>
                <span className="text-2xs font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-md shrink-0">
                  Menunggu input
                </span>
              </div>
            )}
          </div>

          {/* Footer Card: Ringkasan Sesi & Progres Kompak */}
          <div className="bg-slate-50/70 border-t border-slate-200/80 p-3 sm:p-3.5 space-y-2.5">
            {/* Header Progres Bar Kompak */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold text-2xs flex items-center gap-1.5">
                  <span>Progres Penilaian</span>
                  <span className="text-slate-300">·</span>
                  <strong className="text-slate-900 font-bold">
                    {completedCandidateIds.size} dari {sessionCandidates.length}
                  </strong>
                  <span className="text-slate-500 text-2xs hidden sm:inline">
                    santri dinilai
                  </span>
                </span>
                <span className="font-display font-bold text-red-600 text-xs">
                  {Math.round(
                    sessionCandidates.length
                      ? (completedCandidateIds.size /
                          sessionCandidates.length) *
                          100
                      : 0,
                  )}
                  %
                </span>
              </div>

              {/* Multi-Segment Stacked Progress Bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80 flex shadow-2xs">
                <div
                  className="bg-emerald-500 transition-all duration-300"
                  style={{
                    width: `${
                      sessionCandidates.length
                        ? (completedCandidateIds.size /
                            sessionCandidates.length) *
                          100
                        : 0
                    }%`,
                  }}
                  title={`Dinilai: ${completedCandidateIds.size}`}
                />
                <div
                  className="bg-amber-400 transition-all duration-300"
                  style={{
                    width: `${
                      sessionCandidates.length
                        ? (unratedPresentCandidateIds.size /
                            sessionCandidates.length) *
                          100
                        : 0
                    }%`,
                  }}
                  title={`Tanpa Nilai: ${unratedPresentCandidateIds.size}`}
                />
                <div
                  className="bg-blue-400 transition-all duration-300"
                  style={{
                    width: `${
                      sessionCandidates.length
                        ? (absentCandidateIds.size / sessionCandidates.length) *
                          100
                        : 0
                    }%`,
                  }}
                  title={`Izin/Absen: ${absentCandidateIds.size}`}
                />
              </div>
            </div>

            {/* Micro-Badges Status Kompak & Menarik */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-800 shadow-2xs">
                <UsersRound className="size-3.5 text-slate-500 shrink-0" />
                <span className="font-display text-xs font-bold text-slate-900">
                  {sessionCandidates.length}
                </span>
                <span className="text-2xs font-medium text-slate-500">
                  Peserta
                </span>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/90 bg-emerald-50/90 px-2.5 py-1 text-emerald-900 shadow-2xs">
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                <span className="font-display text-xs font-bold text-emerald-800">
                  {completedCandidateIds.size}
                </span>
                <span className="text-2xs font-bold text-emerald-700">
                  Dinilai
                </span>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-700 shadow-2xs">
                <Clock className="size-3.5 text-slate-400 shrink-0" />
                <span className="font-display text-xs font-bold text-slate-700">
                  {Math.max(
                    0,
                    sessionCandidates.length - savedCandidateIds.size,
                  )}
                </span>
                <span className="text-2xs font-medium text-slate-500">
                  Belum diinput
                </span>
              </div>

              {unratedPresentCandidateIds.size > 0 && (
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200/90 bg-amber-50/90 px-2.5 py-1 text-amber-900 shadow-2xs">
                  <AlertCircle className="size-3.5 text-amber-600 shrink-0" />
                  <span className="font-display text-xs font-bold text-amber-800">
                    {unratedPresentCandidateIds.size}
                  </span>
                  <span className="text-2xs font-bold text-amber-700">
                    Tanpa Nilai
                  </span>
                </div>
              )}

              {absentCandidateIds.size > 0 && (
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200/90 bg-blue-50/90 px-2.5 py-1 text-blue-900 shadow-2xs">
                  <UserX className="size-3.5 text-blue-600 shrink-0" />
                  <span className="font-display text-xs font-bold text-blue-800">
                    {absentCandidateIds.size}
                  </span>
                  <span className="text-2xs font-bold text-blue-700">
                    Izin/Absen
                  </span>
                </div>
              )}

              {["cat", "pip", "tiu"].includes(session.type) && (
                <button
                  type="button"
                  onClick={syncAllCatTryoutsToSession}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 px-2.5 py-1 text-2xs font-bold transition active:scale-95 ml-auto"
                  title="Tarik nilai tryout santri yang sudah selesai di portal mandiri ke sesi ini"
                >
                  <Sparkles className="size-3.5 text-red-600" />
                  <span>Sinkronkan Hasil Tryout Portal</span>
                </button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* 2. BAGIAN BAWAH: Input Hasil & Survei + Profil Kandidat (2 Kolom) */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Col 1: Input Hasil & Survei */}
        <Card className="overflow-hidden">
          {/* Header with Title and Result Badge */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-3.5 bg-white">
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-sm sm:text-base font-bold text-slate-900 whitespace-nowrap">
                Input Hasil &amp; Penilaian
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {candidate && (
                <ResultBadge
                  status={
                    record.attendance && record.attendance !== "hadir"
                      ? "review"
                      : record.result
                  }
                />
              )}
            </div>
          </div>

          {/* Clean Unified Candidate & Attendance Console */}
          <div className="border-b border-slate-100 bg-slate-50/80 p-3 sm:p-4 space-y-2.5">
            {/* Candidate Selector Row */}
            <div className="flex items-center justify-between gap-2.5">
              <button
                type="button"
                disabled={!prevCandidate}
                onClick={() =>
                  prevCandidate && setCandidateId(prevCandidate.id)
                }
                className="grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs transition hover:bg-slate-100 disabled:opacity-30 active:scale-95"
                title="Kandidat sebelumnya"
              >
                <ChevronLeft className="size-4" />
              </button>

              {candidate ? (
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 px-1">
                  <CandidateAvatar
                    name={candidate.name}
                    avatar={candidate.avatar}
                    photoUrl={candidate.photoUrl}
                    className="size-10 sm:size-11 text-xs font-bold shrink-0 border border-slate-200 shadow-2xs"
                    rounded="rounded-xl"
                  />

                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setShowCandidatePicker(true)}
                      className="group flex items-center gap-1.5 text-left min-w-0 cursor-pointer w-full"
                      title="Klik untuk cari atau ganti kandidat"
                    >
                      <span className="truncate font-display text-xs sm:text-base font-bold text-slate-950 group-hover:text-red-600 transition">
                        {candidate.name}
                      </span>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-200/90 px-1.5 py-0.5 text-3xs font-bold text-slate-700 group-hover:bg-red-100 group-hover:text-red-700 transition shrink-0">
                        <span>
                          {currentCandidateIndex + 1}/{sessionCandidates.length}
                        </span>
                        <ChevronDown className="size-2.5 text-slate-500 group-hover:text-red-600 transition" />
                      </span>
                    </button>
                    <p className="text-3xs sm:text-xs font-medium text-slate-500 truncate mt-0.5">
                      {candidate.school}
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCandidatePicker(true)}
                  className="group flex flex-1 items-center gap-2 p-1 rounded-lg hover:bg-white/80 transition text-left cursor-pointer min-w-0"
                  title="Klik untuk memilih kandidat"
                >
                  <div className="size-9 rounded-xl border-2 border-dashed border-slate-300 grid place-items-center text-slate-400 bg-white group-hover:border-red-400 group-hover:text-red-500 transition shrink-0">
                    <UsersRound className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-display text-xs sm:text-sm font-bold text-slate-700 group-hover:text-red-600 transition truncate">
                        Pilih Santri
                      </span>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-200/90 px-1.5 py-0.5 text-3xs font-bold text-slate-700 group-hover:bg-red-100 group-hover:text-red-700 transition shrink-0">
                        <span>0/{sessionCandidates.length}</span>
                        <ChevronDown className="size-2.5 text-slate-500" />
                      </span>
                    </div>
                  </div>
                </button>
              )}

              <button
                type="button"
                disabled={!nextCandidate}
                onClick={() =>
                  nextCandidate && setCandidateId(nextCandidate.id)
                }
                className="grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs transition hover:bg-slate-100 disabled:opacity-30 active:scale-95"
                title="Kandidat berikutnya"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {/* Attendance Segmented Bar - Full Width & Cleanly Balanced */}
            {candidate && (
              <div className="grid grid-cols-4 gap-1 p-1 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
                {[
                  {
                    id: "hadir",
                    label: "Hadir",
                    activeClass:
                      "bg-emerald-600 text-white shadow-xs font-bold",
                  },
                  {
                    id: "sakit",
                    label: "Sakit",
                    activeClass: "bg-amber-600 text-white shadow-xs font-bold",
                  },
                  {
                    id: "izin",
                    label: "Izin",
                    activeClass: "bg-blue-600 text-white shadow-xs font-bold",
                  },
                  {
                    id: "alpa",
                    label: "Alpa",
                    activeClass: "bg-rose-600 text-white shadow-xs font-bold",
                  },
                ].map((item) => {
                  const isCur = (record.attendance ?? "hadir") === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        patchRecord({
                          attendance: item.id as any,
                          result: item.id === "hadir" ? "passed" : "review",
                        })
                      }}
                      className={`py-1.5 text-center text-xs rounded-lg transition active:scale-95 ${
                        isCur
                          ? item.activeClass
                          : "text-slate-600 hover:bg-slate-100 font-medium"
                      }`}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {!candidate ? (
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3 text-left">
                {sessionCandidates.map((c, i) => {
                  const rec = records[`${session.id}:${c.id}`]
                  const att = rec?.attendance ?? "hadir"
                  const isSaved = Boolean(rec?.savedAt)
                  const isAbsent = att !== "hadir"
                  const hasMetrics = hasRecordMetrics(rec)
                  const isRated = isSaved && !isAbsent && hasMetrics
                  const isPresentUnrated = isSaved && !isAbsent && !hasMetrics
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCandidateId(c.id)}
                      className={`flex flex-col items-center text-center p-2.5 sm:p-3 rounded-2xl border bg-white transition-all cursor-pointer group hover:shadow-md ${
                        isRated
                          ? "border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/20"
                          : isAbsent && isSaved
                            ? "border-blue-200 hover:border-blue-400 hover:bg-blue-50/20"
                            : isPresentUnrated
                              ? "border-amber-200 hover:border-amber-400 hover:bg-amber-50/20"
                              : "border-slate-200 hover:border-red-400 hover:bg-red-50/20"
                      }`}
                    >
                      {/* Header row: Number and Attendance/Rated Badge (Single Clean Badge) */}
                      <div className="w-full flex items-center justify-between gap-1 mb-2">
                        <span className="text-3xs font-bold text-slate-400 bg-slate-100 group-hover:bg-red-100 group-hover:text-red-700 px-1.5 py-0.5 rounded-md">
                          #{i + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          {isAbsent ? (
                            <span
                              className={`text-3xs font-bold px-1.5 py-0.5 rounded uppercase ${
                                att === "izin"
                                  ? "bg-blue-100 text-blue-800"
                                  : att === "sakit"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {att}
                            </span>
                          ) : isRated ? (
                            <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              ✓ Dinilai
                            </span>
                          ) : isPresentUnrated ? (
                            <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                              Tanpa Nilai
                            </span>
                          ) : (
                            <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                              Belum
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Compact Portrait Photo */}
                      <CandidateAvatar
                        name={c.name}
                        avatar={c.avatar}
                        photoUrl={c.photoUrl}
                        className="size-13 sm:size-15 text-sm font-bold shrink-0 ring-2 ring-slate-100 group-hover:ring-red-200 shadow-2xs"
                        rounded="rounded-xl"
                      />

                      {/* Candidate Details (Compact, Essential Info Only) */}
                      <div className="mt-2 w-full text-center">
                        <p className="font-display text-xs sm:text-sm font-bold text-slate-900 group-hover:text-red-700 leading-snug line-clamp-2">
                          {c.name}
                        </p>
                        <p className="mt-0.5 text-2xs font-medium text-slate-400">
                          {c.number}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              {/* Mobile Segmented Tabs */}
              <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 lg:hidden">
                <button
                  type="button"
                  onClick={() => setMobileTab("scoring")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                    mobileTab === "scoring"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Target className="size-3.5 text-red-600" />
                  <span>Nilai Sesi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab("survey")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                    mobileTab === "survey"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <ClipboardList className="size-3.5 text-blue-600" />
                  <span>Survei</span>
                  {record.note.trim() && (
                    <span className="size-1.5 rounded-full bg-blue-600" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab("profile")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                    mobileTab === "profile"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <UserRound className="size-3.5 text-emerald-600" />
                  <span>Profil</span>
                </button>
              </div>

              {/* Notifikasi jika peserta Sakit / Izin / Alpa */}
              {record.attendance && record.attendance !== "hadir" ? (
                <div
                  className={`mt-4 flex items-center justify-between rounded-xl p-3.5 text-xs font-medium ${
                    record.attendance === "sakit"
                      ? "border border-amber-200 bg-amber-50 text-amber-900"
                      : record.attendance === "izin"
                        ? "border border-blue-200 bg-blue-50 text-blue-900"
                        : "border border-rose-200 bg-rose-50 text-rose-900"
                  }`}
                >
                  <span>
                    Peserta berstatus{" "}
                    <strong className="uppercase">{record.attendance}</strong>.
                    Nilai dilewati pada sesi ini dan otomatis dijadwalkan
                    susulan.
                  </span>
                  <button
                    type="button"
                    onClick={() => patchRecord({ attendance: "hadir" })}
                    className="ml-2 shrink-0 font-bold underline"
                  >
                    Ubah Hadir
                  </button>
                </div>
              ) : null}

              {/* 2. SECTION NILAI SESI */}
              <div className={mobileTab === "scoring" || "hidden lg:block"}>
                {(record.attendance ?? "hadir") === "hadir" ? (
                  <>
                    {session.type !== "pbb" ? (
                      <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <p className="text-2xs sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                          Hasil Pengujian Sesi
                        </p>
                        {session.type === "fitness" ? (
                          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs no-scrollbar">
                            <span className="text-3xs text-slate-400 shrink-0">
                              Filter:
                            </span>
                            {[
                              ["all", "Semua"],
                              ["run_only", "Lari"],
                              ["run_shuttle", "Lari+Shuttle"],
                              ["samapta_b", "Samapta B"],
                            ].map(([id, label]) => {
                              const isSelected =
                                session.fitnessPreset === id ||
                                (!session.fitnessPreset &&
                                  (isIntervalSession &&
                                  session.title
                                    .toLowerCase()
                                    .includes("shuttle")
                                    ? id === "run_shuttle"
                                    : isIntervalSession
                                      ? id === "run_only"
                                      : id === "all"))
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() =>
                                    setSessionFitnessPreset(id as any)
                                  }
                                  className={`rounded-lg px-2 py-0.5 text-2xs font-semibold transition shrink-0 ${
                                    isSelected
                                      ? "bg-slate-900 text-white shadow-2xs font-bold"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  }`}
                                >
                                  {label}
                                </button>
                              )
                            })}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {/* SAMAPTA FITNESS SECTION */}
                    {session.type === "fitness" ? (
                      <div className="mt-3 space-y-4">
                        {/* Lari 12 menit / Lari Interval */}
                        {activeFitnessTests.includes("distance") ? (
                          <div
                            className={`rounded-2xl border p-4 transition ${
                              record.metrics.runDnf === "yes"
                                ? "border-rose-300 bg-rose-50/50"
                                : "border-slate-200 bg-slate-50/60"
                            }`}
                          >
                            {/* Header & Mode Switcher */}
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                              <div className="flex items-center gap-2">
                                <div className="inline-flex rounded-xl bg-slate-200/70 p-0.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      patchRecord({
                                        metrics: {
                                          ...record.metrics,
                                          runMode: "test12",
                                        },
                                      })
                                    }
                                    className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                                      currentRunMode === "test12"
                                        ? "bg-white text-slate-900 shadow-2xs"
                                        : "text-slate-600 hover:text-slate-900"
                                    }`}
                                  >
                                    Tes 12 Menit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      patchRecord({
                                        metrics: {
                                          ...record.metrics,
                                          runMode: "interval",
                                        },
                                      })
                                    }
                                    className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                                      currentRunMode === "interval"
                                        ? "bg-white text-slate-900 shadow-2xs"
                                        : "text-slate-600 hover:text-slate-900"
                                    }`}
                                  >
                                    Latihan Interval
                                  </button>
                                </div>

                                {record.metrics.runDnf === "yes" ? (
                                  <span className="rounded-md bg-rose-100 px-2 py-0.5 text-3xs font-bold text-rose-700">
                                    DNF
                                  </span>
                                ) : null}
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">
                                  {currentRunMode === "interval"
                                    ? `Target: ${currentIntervalTargetSets} Set · Total ${calcIntervalTotalDistance}m`
                                    : "Target: 3.000m"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const isDnf =
                                      record.metrics.runDnf === "yes"
                                    patchRecord({
                                      metrics: {
                                        ...record.metrics,
                                        runDnf: isDnf ? "" : "yes",
                                      },
                                      result: !isDnf ? "review" : record.result,
                                    })
                                  }}
                                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition active:scale-95 ${
                                    record.metrics.runDnf === "yes"
                                      ? "bg-rose-600 text-white shadow-xs"
                                      : "border border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:text-rose-600"
                                  }`}
                                >
                                  {record.metrics.runDnf === "yes"
                                    ? "✕ DNF Aktif"
                                    : "+ DNF"}
                                </button>
                              </div>
                            </div>

                            {currentRunMode === "interval" ? (
                              <div className="space-y-3">
                                {/* 3 Kolom Utama Bersih Sejajar */}
                                <div className="grid gap-3 sm:grid-cols-3">
                                  {/* Panjang Lintasan */}
                                  <div className="grid gap-1">
                                    <label className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                                      <span>Lintasan per Set (m)</span>
                                      <span className="text-3xs text-slate-400 font-normal">
                                        Ketik bebas
                                      </span>
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        inputMode="numeric"
                                        placeholder="400"
                                        value={currentIntervalDist}
                                        onChange={(e) =>
                                          updateIntervalMetrics({
                                            intervalDist: e.target.value,
                                          })
                                        }
                                        className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 pr-8 font-display text-lg font-bold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
                                      />
                                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                        m
                                      </span>
                                    </div>
                                  </div>

                                  {/* Repetisi / Set with Stepper */}
                                  <div className="grid gap-1">
                                    <label className="text-xs font-semibold text-slate-600">
                                      Repetisi Tuntas (Set)
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const cur =
                                            parseInt(
                                              currentIntervalTargetSets,
                                              10,
                                            ) || 4
                                          updateIntervalMetrics({
                                            intervalTargetSets: String(
                                              Math.max(1, cur - 1),
                                            ),
                                          })
                                        }}
                                        className="grid size-12 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-100 text-sm font-bold text-slate-700 active:scale-95"
                                      >
                                        -1
                                      </button>
                                      <input
                                        type="number"
                                        inputMode="numeric"
                                        placeholder="4"
                                        value={currentIntervalTargetSets}
                                        onChange={(e) =>
                                          updateIntervalMetrics({
                                            intervalTargetSets: e.target.value,
                                          })
                                        }
                                        className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-2 text-center font-display text-xl font-extrabold text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const cur =
                                            parseInt(
                                              currentIntervalTargetSets,
                                              10,
                                            ) || 4
                                          updateIntervalMetrics({
                                            intervalTargetSets: String(cur + 1),
                                          })
                                        }}
                                        className="grid size-12 shrink-0 place-items-center rounded-xl border border-red-200 bg-red-50 text-sm font-bold text-red-600 active:scale-95"
                                      >
                                        +1
                                      </button>
                                    </div>
                                  </div>

                                  {/* Rata-rata Waktu / Lap */}
                                  <div className="grid gap-1">
                                    <label className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                                      <span>Rata-rata Waktu (Detik)</span>
                                      {calcIntervalAvgSplit > 0 ? (
                                        <span className="text-3xs text-slate-500 font-medium">
                                          {formatSecondsToMmSs(
                                            calcIntervalAvgSplit,
                                          )}{" "}
                                          / lap
                                        </span>
                                      ) : null}
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        step="0.1"
                                        inputMode="decimal"
                                        placeholder="90.0"
                                        value={
                                          calcIntervalAvgSplit > 0
                                            ? calcIntervalAvgSplit.toFixed(1)
                                            : currentIntervalTargetPace
                                        }
                                        onChange={(e) =>
                                          updateIntervalMetrics({
                                            intervalTargetPace: e.target.value,
                                          })
                                        }
                                        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 pr-14 font-display text-xl font-extrabold text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
                                      />
                                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                        detik
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Catatan Split Stopwatch per Set (Dinamis Sesuai Repetisi) */}
                                {(() => {
                                  const targetSetCount = Math.min(
                                    12,
                                    Math.max(
                                      1,
                                      parseInt(currentIntervalTargetSets, 10) ||
                                        4,
                                    ),
                                  )
                                  const setList = Array.from(
                                    { length: targetSetCount },
                                    (_, i) => i + 1,
                                  )
                                  const gridColsClass =
                                    targetSetCount <= 3
                                      ? "grid-cols-3"
                                      : targetSetCount === 4
                                        ? "grid-cols-2 sm:grid-cols-4"
                                        : targetSetCount <= 6
                                          ? "grid-cols-3 sm:grid-cols-6"
                                          : "grid-cols-4 sm:grid-cols-8"

                                  return (
                                    <div className="pt-1">
                                      <div className="mb-1.5 flex items-center justify-between text-xs">
                                        <span className="font-semibold text-slate-600">
                                          Split Stopwatch per Set (
                                          {targetSetCount} Set)
                                        </span>
                                        <span className="text-2xs text-slate-400">
                                          Kotak otomatis menyesuaikan jumlah
                                          repetisi di atas
                                        </span>
                                      </div>
                                      <div
                                        className={`grid gap-2 ${gridColsClass}`}
                                      >
                                        {setList.map((setNum) => {
                                          const fieldKey =
                                            `intervalLap${setNum}` as const
                                          return (
                                            <div
                                              key={setNum}
                                              className="relative"
                                            >
                                              <input
                                                type="number"
                                                step="0.1"
                                                inputMode="decimal"
                                                placeholder={`Set ${setNum} (dtk)`}
                                                value={
                                                  record.metrics[fieldKey] || ""
                                                }
                                                onChange={(e) =>
                                                  updateLapSplit(
                                                    setNum,
                                                    e.target.value,
                                                  )
                                                }
                                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-center text-xs font-bold text-slate-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                                              />
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )
                                })()}
                              </div>
                            ) : (
                              /* Regular 12-Minute Run Grid */
                              <div className="grid gap-3 sm:grid-cols-3">
                                {/* Panjang lintasan */}
                                <div className="grid gap-1">
                                  <label className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                                    <span>Lintasan (m)</span>
                                    <span className="text-3xs text-slate-400 font-normal">
                                      Ketik bebas
                                    </span>
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      inputMode="numeric"
                                      placeholder="400"
                                      value={sessionTrackLength || ""}
                                      onChange={(e) =>
                                        updateTrackLength(
                                          Number(e.target.value) || 0,
                                        )
                                      }
                                      className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 pr-8 font-display text-lg font-bold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
                                    />
                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                      m
                                    </span>
                                  </div>
                                </div>

                                {/* Putaran with steppers */}
                                <div className="grid gap-1">
                                  <label className="text-xs font-semibold text-slate-600">
                                    Putaran (Laps)
                                  </label>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => stepLaps(-0.5)}
                                      className="grid size-12 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-100 text-sm font-bold text-slate-700 active:scale-95"
                                    >
                                      -0.5
                                    </button>
                                    <input
                                      type="number"
                                      step="0.25"
                                      inputMode="decimal"
                                      placeholder="0"
                                      value={record.metrics.laps ?? ""}
                                      onChange={(e) =>
                                        handleLapsChange(e.target.value)
                                      }
                                      className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-2 text-center font-display text-xl font-extrabold text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => stepLaps(0.5)}
                                      className="grid size-12 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-100 text-sm font-bold text-slate-700 active:scale-95"
                                    >
                                      +0.5
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => stepLaps(1)}
                                      className="grid size-12 shrink-0 place-items-center rounded-xl border border-red-200 bg-red-50 text-sm font-bold text-red-600 active:scale-95"
                                    >
                                      +1
                                    </button>
                                  </div>
                                </div>

                                {/* Total Jarak */}
                                <div className="grid gap-1">
                                  <label className="text-xs font-semibold text-slate-600">
                                    Total Jarak (Meter)
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      inputMode="numeric"
                                      placeholder="0"
                                      value={record.metrics.distance ?? ""}
                                      onChange={(e) =>
                                        handleDistanceDirectChange(
                                          e.target.value,
                                        )
                                      }
                                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 pr-14 font-display text-xl font-extrabold text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
                                    />
                                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                      meter
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : null}

                        {/* Samapta B: Pushup, Situp, Backup, Shuttle (Ukuran Otomatis Menyesuaikan Jumlah Tes Aktif) */}
                        {(() => {
                          const samaptaBCount = activeFitnessTests.filter(
                            (k) => k !== "distance",
                          ).length
                          if (samaptaBCount === 0) return null

                          const gridClass =
                            samaptaBCount === 1
                              ? "grid gap-3 sm:max-w-sm md:max-w-md"
                              : samaptaBCount === 2
                                ? "grid gap-3 sm:grid-cols-2"
                                : samaptaBCount === 3
                                  ? "grid gap-3 sm:grid-cols-3"
                                  : "grid gap-3 sm:grid-cols-2 xl:grid-cols-4"

                          return (
                            <div className={gridClass}>
                              {activeFitnessTests.includes("pushup") ? (
                                <NumberStepper
                                  label="Push-up 1 Menit"
                                  unit="kali"
                                  value={record.metrics.pushup ?? ""}
                                  quickAdds={[1, 5, 10]}
                                  placeholder="0"
                                  onChange={(val) =>
                                    patchRecord({
                                      metrics: {
                                        ...record.metrics,
                                        pushup: val,
                                      },
                                    })
                                  }
                                />
                              ) : null}

                              {activeFitnessTests.includes("situp") ? (
                                <NumberStepper
                                  label="Sit-up 1 Menit"
                                  unit="kali"
                                  value={record.metrics.situp ?? ""}
                                  quickAdds={[1, 5, 10]}
                                  placeholder="0"
                                  onChange={(val) =>
                                    patchRecord({
                                      metrics: {
                                        ...record.metrics,
                                        situp: val,
                                      },
                                    })
                                  }
                                />
                              ) : null}

                              {activeFitnessTests.includes("backup") ? (
                                <NumberStepper
                                  label="Back-up 1 Menit"
                                  unit="kali"
                                  value={record.metrics.backup ?? ""}
                                  quickAdds={[1, 5, 10]}
                                  placeholder="0"
                                  onChange={(val) =>
                                    patchRecord({
                                      metrics: {
                                        ...record.metrics,
                                        backup: val,
                                      },
                                    })
                                  }
                                />
                              ) : null}

                              {activeFitnessTests.includes("shuttle") ? (
                                <NumberStepper
                                  label="Shuttle Run 6x10m"
                                  unit="detik"
                                  step={0.1}
                                  value={record.metrics.shuttle ?? ""}
                                  quickAdds={[0.5, 1]}
                                  placeholder="16.0"
                                  onChange={(val) =>
                                    patchRecord({
                                      metrics: {
                                        ...record.metrics,
                                        shuttle: val,
                                      },
                                    })
                                  }
                                />
                              ) : null}
                            </div>
                          )
                        })()}
                      </div>
                    ) : session.type === "pbb" ? (
                      <div className="mt-5">
                        <PbbEvaluationSection
                          metrics={record.metrics}
                          onUpdateMetrics={(updatedMetrics) =>
                            patchRecord({ metrics: updatedMetrics })
                          }
                        />
                      </div>
                    ) : session.type === "parade" ? (
                      /* PARADE SIMULATION INPUTS */
                      <div className="mt-4 space-y-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <NumberStepper
                            label="Tinggi Badan"
                            unit="cm"
                            value={record.metrics.height ?? ""}
                            placeholder="170"
                            quickAdds={[0.5, 1]}
                            onChange={(val) =>
                              patchRecord({
                                metrics: { ...record.metrics, height: val },
                              })
                            }
                          />
                          <NumberStepper
                            label="Berat Badan"
                            unit="kg"
                            value={record.metrics.weight ?? ""}
                            placeholder="60"
                            quickAdds={[0.5, 1]}
                            onChange={(val) =>
                              patchRecord({
                                metrics: { ...record.metrics, weight: val },
                              })
                            }
                          />
                          {/* Live BMI badge */}
                          {(() => {
                            const h = parseFloat(
                              record.metrics.height ||
                                String(candidate.height || 0),
                            )
                            const w = parseFloat(
                              record.metrics.weight ||
                                String(candidate.weight || 0),
                            )
                            const bmiVal = h > 0 && w > 0 ? bmi(h, w) : null
                            return (
                              <div className="flex flex-col justify-center rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                                <span className="text-xs font-semibold text-slate-500">
                                  Indeks Massa Tubuh (BMI)
                                </span>
                                <div className="mt-1 flex items-baseline gap-2">
                                  <span className="font-display text-2xl font-black text-slate-900">
                                    {bmiVal !== null ? bmiVal.toFixed(1) : "—"}
                                  </span>
                                  {bmiVal !== null && (
                                    <span
                                      className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                                        bmiVal >= 18.5 && bmiVal <= 25
                                          ? "bg-emerald-100 text-emerald-800"
                                          : bmiVal < 18.5
                                            ? "bg-amber-100 text-amber-800"
                                            : "bg-rose-100 text-rose-800"
                                      }`}
                                    >
                                      {bmiVal >= 18.5 && bmiVal <= 25
                                        ? "Ideal / Normal"
                                        : bmiVal < 18.5
                                          ? "Underweight"
                                          : "Overweight"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })()}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          {/* Flat foot pill selector */}
                          <div className="grid gap-1.5 rounded-2xl border border-slate-200 bg-white p-3.5">
                            <label className="text-xs font-bold text-slate-800">
                              Kondisi Telapak Kaki (Flat Foot)
                            </label>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              {[
                                { id: "Tidak", label: "Normal (Lengkung)" },
                                { id: "Ya", label: "Flat Foot (Datar)" },
                              ].map((opt) => {
                                const isSel = record.metrics.flatFoot === opt.id
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() =>
                                      patchRecord({
                                        metrics: {
                                          ...record.metrics,
                                          flatFoot: opt.id,
                                        },
                                      })
                                    }
                                    className={`min-h-11 rounded-xl text-xs font-bold transition active:scale-95 ${
                                      isSel
                                        ? opt.id === "Tidak"
                                          ? "bg-emerald-600 text-white shadow-xs"
                                          : "bg-rose-600 text-white shadow-xs"
                                        : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          {/* Simetri Bahu pill selector */}
                          <div className="grid gap-1.5 rounded-2xl border border-slate-200 bg-white p-3.5">
                            <label className="text-xs font-bold text-slate-800">
                              Simetri Bahu
                            </label>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              {[
                                { id: "Simetris", label: "Simetris (Normal)" },
                                { id: "Review", label: "Asimetris (Review)" },
                              ].map((opt) => {
                                const isSel = record.metrics.shoulder === opt.id
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() =>
                                      patchRecord({
                                        metrics: {
                                          ...record.metrics,
                                          shoulder: opt.id,
                                        },
                                      })
                                    }
                                    className={`min-h-11 rounded-xl text-xs font-bold transition active:scale-95 ${
                                      isSel
                                        ? opt.id === "Simetris"
                                          ? "bg-emerald-600 text-white shadow-xs"
                                          : "bg-amber-600 text-white shadow-xs"
                                        : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <NumberStepper
                            label="Celah Kaki O/X (cm)"
                            unit="cm"
                            value={record.metrics.legGap ?? ""}
                            placeholder="0"
                            quickAdds={[0.5, 1]}
                            hint="Target celah kaki < 5 cm"
                            onChange={(val) =>
                              patchRecord({
                                metrics: { ...record.metrics, legGap: val },
                              })
                            }
                          />
                          <NumberStepper
                            label="Skor Postur & Antropometri"
                            unit="poin"
                            value={record.metrics.posture ?? ""}
                            placeholder="85"
                            quickAdds={[5, 10]}
                            onChange={(val) =>
                              patchRecord({
                                metrics: { ...record.metrics, posture: val },
                              })
                            }
                          />
                        </div>
                      </div>
                    ) : session.type === "cat" || session.type === "pip" || session.type === "tiu" ? (
                      /* CAT PIP & TIU INPUTS & PORTAL INTEGRATION */
                      <div className="mt-4 space-y-4">
                        {/* PORTAL TRYOUT CAT INTEGRATION CARD */}
                        <div
                          className={`rounded-2xl border p-4 transition ${
                            candidateCatAttempt
                              ? (candidateCatAttempt.pipScore >= 70 && candidateCatAttempt.tiuScoreScaled >= 70) ||
                                (session.type === "pip" && candidateCatAttempt.pipScore >= 70) ||
                                (session.type === "tiu" && candidateCatAttempt.tiuScoreScaled >= 70)
                                ? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
                                : "border-amber-200 bg-amber-50/70 text-amber-950"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={`grid size-9.5 shrink-0 place-items-center rounded-xl ${
                                  candidateCatAttempt
                                    ? "bg-white text-emerald-600 shadow-2xs"
                                    : "bg-slate-200 text-slate-500"
                                }`}
                              >
                                <BookOpenCheck className="size-5" />
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">
                                    Hasil Tryout Portal Mandiri
                                  </span>
                                  {candidateCatAttempt ? (
                                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-3xs font-extrabold uppercase text-emerald-800">
                                      Terkoneksi (Percobaan #{candidateCatAttempt.attemptNumber})
                                    </span>
                                  ) : (
                                    <span className="rounded-md bg-slate-200 px-2 py-0.5 text-3xs font-semibold text-slate-600">
                                      Belum Ada Nilai di Portal
                                    </span>
                                  )}
                                </div>
                                {candidateCatAttempt ? (
                                  <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs font-semibold">
                                    <span>
                                      PIP:{" "}
                                      <strong className="text-slate-900 font-bold">
                                        {candidateCatAttempt.pipScore}/100
                                      </strong>{" "}
                                      <span
                                        className={
                                          candidateCatAttempt.pipScore >= 70
                                            ? "text-emerald-700 font-bold"
                                            : "text-amber-700 font-bold"
                                        }
                                      >
                                        ({candidateCatAttempt.pipScore >= 70 ? "Lolos" : "Remedial"})
                                      </span>
                                    </span>
                                    <span className="text-slate-300">·</span>
                                    <span>
                                      TIU:{" "}
                                      <strong className="text-slate-900 font-bold">
                                        {candidateCatAttempt.tiuScoreScaled}/100
                                      </strong>{" "}
                                      <span
                                        className={
                                          candidateCatAttempt.tiuScoreScaled >= 70
                                            ? "text-emerald-700 font-bold"
                                            : "text-amber-700 font-bold"
                                        }
                                      >
                                        ({candidateCatAttempt.tiuScoreScaled >= 70 ? "Lolos" : "Remedial"})
                                      </span>
                                    </span>
                                    <span className="text-slate-300">·</span>
                                    <span>
                                      Rata-rata:{" "}
                                      <strong className="text-emerald-700 font-bold">
                                        {candidateCatAttempt.combinedScore ??
                                          Math.round(
                                            (candidateCatAttempt.pipScore +
                                              candidateCatAttempt.tiuScoreScaled) /
                                              2,
                                          )}
                                      </strong>
                                    </span>
                                  </div>
                                ) : (
                                  <p className="mt-1 text-xs text-slate-500">
                                    Santri belum menyelesaikan simulasi ujian di portal CAT. Anda dapat menginput nilai manual di bawah atau menunggu santri menyelesaikan tryout.
                                  </p>
                                )}
                              </div>
                            </div>

                            {candidateCatAttempt && (
                              <button
                                type="button"
                                onClick={() => {
                                  const pS = candidateCatAttempt.pipScore
                                  const tS = candidateCatAttempt.tiuScoreScaled
                                  const comb =
                                    candidateCatAttempt.combinedScore ??
                                    Math.round((pS + tS) / 2)
                                  const scoreToApply =
                                    session.type === "pip"
                                      ? String(pS)
                                      : session.type === "tiu"
                                        ? String(tS)
                                        : String(comb)
                                  const isPass =
                                    session.type === "pip"
                                      ? pS >= 70
                                      : session.type === "tiu"
                                        ? tS >= 70
                                        : pS >= 70 && tS >= 70
                                  patchRecord({
                                    result: isPass ? "passed" : "review",
                                    metrics: {
                                      ...record.metrics,
                                      score: scoreToApply,
                                      pipScore: String(pS),
                                      tiuScore: String(tS),
                                      duration: "PIP 45m · TIU 30m",
                                      tryoutAttemptId: candidateCatAttempt.id,
                                    },
                                  })
                                  showToast(
                                    "Nilai tryout portal santri berhasil diterapkan ke sesi!",
                                    "success",
                                  )
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-50 active:scale-95 transition cursor-pointer"
                              >
                                <Sparkles className="size-3.5 text-emerald-600" />
                                Terapkan Nilai Tryout Ini
                              </button>
                            )}
                          </div>
                        </div>

                        {session.type === "cat" ? (
                          /* SESI CAT TERPADU (PIP + TIU) */
                          <div className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-3">
                              <NumberStepper
                                label="Nilai PIP (Pancasila & TWK)"
                                unit="poin"
                                min={0}
                                max={100}
                                value={
                                  record.metrics.pipScore ??
                                  (candidateCatAttempt ? String(candidateCatAttempt.pipScore) : "")
                                }
                                placeholder="70"
                                quickAdds={[5, 10]}
                                hint="Ambang batas ≥ 70"
                                onChange={(val) => {
                                  const pS = Number(val) || 0
                                  const tS =
                                    Number(
                                      record.metrics.tiuScore ||
                                        (candidateCatAttempt ? candidateCatAttempt.tiuScoreScaled : 0),
                                    ) || 0
                                  const avg = Math.round((pS + tS) / 2)
                                  patchRecord({
                                    metrics: {
                                      ...record.metrics,
                                      pipScore: val,
                                      score: String(avg),
                                    },
                                    result: pS >= 70 && tS >= 70 ? "passed" : "review",
                                  })
                                }}
                              />
                              <NumberStepper
                                label="Nilai TIU (Intelegensia)"
                                unit="poin"
                                min={0}
                                max={100}
                                value={
                                  record.metrics.tiuScore ??
                                  (candidateCatAttempt ? String(candidateCatAttempt.tiuScoreScaled) : "")
                                }
                                placeholder="70"
                                quickAdds={[5, 10]}
                                hint="Ambang batas ≥ 70"
                                onChange={(val) => {
                                  const tS = Number(val) || 0
                                  const pS =
                                    Number(
                                      record.metrics.pipScore ||
                                        (candidateCatAttempt ? candidateCatAttempt.pipScore : 0),
                                    ) || 0
                                  const avg = Math.round((pS + tS) / 2)
                                  patchRecord({
                                    metrics: {
                                      ...record.metrics,
                                      tiuScore: val,
                                      score: String(avg),
                                    },
                                    result: pS >= 70 && tS >= 70 ? "passed" : "review",
                                  })
                                }}
                              />
                              <NumberStepper
                                label="Nilai Rata-rata CAT"
                                unit="poin"
                                min={0}
                                max={100}
                                value={
                                  record.metrics.score ??
                                  (record.metrics.pipScore && record.metrics.tiuScore
                                    ? String(
                                        Math.round(
                                          (Number(record.metrics.pipScore) +
                                            Number(record.metrics.tiuScore)) /
                                            2,
                                        ),
                                      )
                                    : candidateCatAttempt
                                      ? String(
                                          candidateCatAttempt.combinedScore ??
                                            Math.round(
                                              (candidateCatAttempt.pipScore +
                                                candidateCatAttempt.tiuScoreScaled) /
                                                2,
                                            ),
                                        )
                                      : "")
                                }
                                placeholder="80"
                                quickAdds={[5, 10]}
                                hint="Skor kumulatif gabungan"
                                onChange={(val) =>
                                  patchRecord({
                                    metrics: { ...record.metrics, score: val },
                                  })
                                }
                              />
                            </div>

                            <Input
                              label="Alokasi Waktu Ujian (Durasi)"
                              placeholder="PIP 45 menit · TIU 30 menit"
                              value={record.metrics.duration ?? "PIP 45 menit · TIU 30 menit"}
                              onChange={(e) =>
                                patchRecord({
                                  metrics: {
                                    ...record.metrics,
                                    duration: e.target.value,
                                  },
                                })
                              }
                            />
                          </div>
                        ) : (
                          /* SESI SPESIFIK PIP ATAU TIU SAJA */
                          <div className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <NumberStepper
                                label={`Nilai ${session.type.toUpperCase()} (0 - 100)`}
                                unit="poin"
                                min={0}
                                max={100}
                                value={
                                  record.metrics.score ??
                                  (candidateCatAttempt
                                    ? String(
                                        session.type === "pip"
                                          ? candidateCatAttempt.pipScore
                                          : candidateCatAttempt.tiuScoreScaled,
                                      )
                                    : "")
                                }
                                placeholder="80"
                                quickAdds={[5, 10]}
                                hint="Passing grade ≥ 70"
                                onChange={(val) => {
                                  const num = Number(val) || 0
                                  patchRecord({
                                    metrics: { ...record.metrics, score: val },
                                    result: num >= 70 ? "passed" : "review",
                                  })
                                }}
                              />
                              <NumberStepper
                                label="Jumlah Jawaban Benar (0 - 50)"
                                unit="soal"
                                min={0}
                                max={50}
                                value={record.metrics.correct ?? ""}
                                placeholder="40"
                                quickAdds={[1, 5]}
                                onChange={(val) => {
                                  const num = parseFloat(val) || 0
                                  const calculatedScore = String(
                                    Math.min(100, num * 2),
                                  )
                                  patchRecord({
                                    metrics: {
                                      ...record.metrics,
                                      correct: val,
                                      score:
                                        !record.metrics.score ||
                                        record.metrics.score === ""
                                          ? calculatedScore
                                          : record.metrics.score,
                                    },
                                    result: Number(calculatedScore) >= 70 ? "passed" : "review",
                                  })
                                }}
                              />
                            </div>

                            {session.type === "pip" ? (
                              <Input
                                label="Waktu Selesai (Durasi)"
                                placeholder="Contoh: 38 menit"
                                value={record.metrics.duration ?? ""}
                                onChange={(e) =>
                                  patchRecord({
                                    metrics: {
                                      ...record.metrics,
                                      duration: e.target.value,
                                    },
                                  })
                                }
                              />
                            ) : (
                              <Input
                                label="Materi Terlemah (Opsional)"
                                placeholder="Contoh: Silogisme / Figural"
                                value={record.metrics.weakness ?? ""}
                                onChange={(e) =>
                                  patchRecord({
                                    metrics: {
                                      ...record.metrics,
                                      weakness: e.target.value,
                                    },
                                  })
                                }
                              />
                            )}
                          </div>
                        )}
                      </div>
                    ) : session.type === "medical" ? (
                      /* RIKKES CLINICAL 5-PILLAR INPUTS & PORTAL INTEGRATION (CLEAN & TIDY) */
                      <div className="mt-4 space-y-3.5">
                        {/* PORTAL INTEGRATION NOTIFICATION BAR */}
                        <div className="grid gap-2.5 sm:grid-cols-2">
                          {/* Portal Ishihara Banner */}
                          <div
                            className={`flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 transition ${
                              candidateIshihara
                                ? candidateIshihara.screeningInterpretation === "normal" ||
                                  candidateIshihara.selectionDecision === "eligible"
                                  ? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
                                  : "border-rose-200 bg-rose-50/70 text-rose-950"
                                : "border-slate-200 bg-slate-50 text-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Eye
                                className={`size-4 shrink-0 ${
                                  candidateIshihara
                                    ? candidateIshihara.screeningInterpretation === "normal" ||
                                      candidateIshihara.selectionDecision === "eligible"
                                      ? "text-emerald-600"
                                      : "text-rose-600"
                                    : "text-slate-400"
                                }`}
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">
                                    Tes Ishihara Portal
                                  </span>
                                  {candidateIshihara ? (
                                    <span
                                      className={`rounded px-1.5 py-0.2 text-3xs font-extrabold uppercase ${
                                        candidateIshihara.screeningInterpretation === "normal" ||
                                        candidateIshihara.selectionDecision === "eligible"
                                          ? "bg-emerald-200/80 text-emerald-800"
                                          : "bg-rose-200/80 text-rose-800"
                                      }`}
                                    >
                                      Terkoneksi
                                    </span>
                                  ) : (
                                    <span className="rounded bg-slate-200 px-1.5 py-0.2 text-3xs font-semibold text-slate-600">
                                      Belum Ada
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-semibold truncate">
                                  {candidateIshihara
                                    ? `Akurasi ${candidateIshihara.accuracy}% · ${candidateIshihara.interpretationLabel}`
                                    : "Belum ada rekam tes Ishihara di portal."}
                                </p>
                              </div>
                            </div>
                            {candidateIshihara ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const isNormal =
                                    candidateIshihara.screeningInterpretation === "normal" ||
                                    candidateIshihara.selectionDecision === "eligible"
                                  patchRecord({
                                    metrics: {
                                      ...record.metrics,
                                      ishiharaStatus: isNormal ? "normal" : "partial",
                                      ishiharaDetail: `${candidateIshihara.accuracy}% (${candidateIshihara.interpretationLabel})`,
                                    },
                                  })
                                  showToast(
                                    `Hasil Ishihara portal (${candidateIshihara.accuracy}%) disinkronkan.`,
                                    "success",
                                  )
                                }}
                                className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-white px-2.5 py-1.5 text-2xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-50 active:scale-95 transition"
                              >
                                <Zap className="size-3 text-amber-500" />
                                Sinkronkan
                              </button>
                            ) : null}
                          </div>

                          {/* Portal Anamnesis Banner */}
                          <div
                            className={`flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 transition ${
                              candidatePortalAnamnesis
                                ? candidatePortalAnamnesis.criticalCount > 0
                                  ? "border-rose-200 bg-rose-50/70 text-rose-950"
                                  : candidatePortalAnamnesis.yesCount > 5
                                    ? "border-amber-200 bg-amber-50/70 text-amber-950"
                                    : "border-emerald-200 bg-emerald-50/70 text-emerald-950"
                                : "border-slate-200 bg-slate-50 text-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <HeartPulse
                                className={`size-4 shrink-0 ${
                                  candidatePortalAnamnesis
                                    ? candidatePortalAnamnesis.criticalCount > 0
                                      ? "text-rose-600"
                                      : "text-emerald-600"
                                    : "text-slate-400"
                                }`}
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">
                                    Anamnesis Mandiri
                                  </span>
                                  {candidatePortalAnamnesis ? (
                                    <span className="rounded bg-emerald-200/80 px-1.5 py-0.2 text-3xs font-extrabold uppercase text-emerald-800">
                                      Terkoneksi
                                    </span>
                                  ) : (
                                    <span className="rounded bg-slate-200 px-1.5 py-0.2 text-3xs font-semibold text-slate-600">
                                      Belum Ada
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-semibold truncate">
                                  {candidatePortalAnamnesis
                                    ? `${candidatePortalAnamnesis.yesCount} dari 21 YA (Skor ${candidatePortalAnamnesis.score}/100)`
                                    : "Belum mengisi kuesioner medis di portal."}
                                </p>
                              </div>
                            </div>
                            {candidatePortalAnamnesis ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const nextMetrics = { ...record.metrics }
                                  anamnesisItems.forEach((_, i) => {
                                    nextMetrics[`anamnesis-${i}`] =
                                      candidatePortalAnamnesis.answers[String(i)] || "no"
                                  })
                                  nextMetrics.anamnesis = String(candidatePortalAnamnesis.yesCount)
                                  nextMetrics.anamnesisScore = String(candidatePortalAnamnesis.score)
                                  nextMetrics.anamnesisStatus = candidatePortalAnamnesis.status
                                  patchRecord({ metrics: nextMetrics })
                                  showToast(
                                    `21 Jawaban Anamnesis (${candidatePortalAnamnesis.yesCount} YA) disinkronkan.`,
                                    "success",
                                  )
                                }}
                                className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-white px-2.5 py-1.5 text-2xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-50 active:scale-95 transition"
                              >
                                <Zap className="size-3 text-amber-500" />
                                Tarik Jawaban
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {/* PILAR 1: KARDIOVASKULAR (TENSI & NADI) */}
                        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5">
                            <div className="flex items-center gap-2">
                              <Activity className="size-4 text-red-600" />
                              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                1. Kardiovaskular (Tekanan Darah &amp; Nadi)
                              </span>
                            </div>
                            <span className="text-3xs font-semibold text-slate-500">
                              Standar BPIP: Normal 110/70–125/85 mmHg · Nadi 60–85 bpm Sinus
                            </span>
                          </div>

                          <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
                            {/* Card Tensi */}
                            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800">
                                  Tekanan Darah (Tensi)
                                </span>
                                {rikkesEval && rikkesEval.bpCategory !== "empty" ? (
                                  <span
                                    className={`rounded-md px-2 py-0.5 text-3xs font-bold ${
                                      rikkesEval.bpCategory === "normal"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : rikkesEval.bpCategory === "failed"
                                          ? "bg-rose-100 text-rose-800 font-extrabold"
                                          : "bg-amber-100 text-amber-800"
                                    }`}
                                  >
                                    {rikkesEval.bpCategory === "normal"
                                      ? "Normal (110/70–125/85)"
                                      : rikkesEval.bpCategory === "failed"
                                        ? "MUTLAK GUGUR (>140/90)"
                                        : rikkesEval.bpCategory === "tolerance"
                                          ? "Batas Maks (130/90)"
                                          : "Hipotensi (<100/60)"}
                                  </span>
                                ) : (
                                  <span className="text-3xs text-slate-400 font-semibold">mmHg</span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <span className="text-3xs font-semibold text-slate-400 block mb-1">
                                    Sistol
                                  </span>
                                  <input
                                    type="number"
                                    placeholder="120"
                                    value={
                                      record.metrics.systolic ??
                                      (record.metrics.bloodPressure?.split("/")[0] ?? "")
                                    }
                                    onChange={(e) => {
                                      const sVal = e.target.value
                                      const dVal =
                                        record.metrics.diastolic ??
                                        (record.metrics.bloodPressure?.split("/")[1] ?? "80")
                                      patchRecord({
                                        metrics: {
                                          ...record.metrics,
                                          systolic: sVal,
                                          diastolic: dVal,
                                          bloodPressure: `${sVal}/${dVal}`,
                                        },
                                      })
                                    }}
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-display text-base font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400/20"
                                  />
                                </div>
                                <span className="pt-4 text-lg font-bold text-slate-300">/</span>
                                <div className="flex-1">
                                  <span className="text-3xs font-semibold text-slate-400 block mb-1">
                                    Diastol
                                  </span>
                                  <input
                                    type="number"
                                    placeholder="80"
                                    value={
                                      record.metrics.diastolic ??
                                      (record.metrics.bloodPressure?.split("/")[1] ?? "")
                                    }
                                    onChange={(e) => {
                                      const dVal = e.target.value
                                      const sVal =
                                        record.metrics.systolic ??
                                        (record.metrics.bloodPressure?.split("/")[0] ?? "120")
                                      patchRecord({
                                        metrics: {
                                          ...record.metrics,
                                          systolic: sVal,
                                          diastolic: dVal,
                                          bloodPressure: `${sVal}/${dVal}`,
                                        },
                                      })
                                    }}
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-display text-base font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400/20"
                                  />
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-1 pt-1.5 border-t border-slate-100">
                                <span className="text-3xs text-slate-400 mr-1">Cepat:</span>
                                {[
                                  { s: "115", d: "75" },
                                  { s: "120", d: "80" },
                                  { s: "125", d: "85" },
                                  { s: "130", d: "90" },
                                  { s: "145", d: "95" },
                                ].map((p) => (
                                  <button
                                    key={`${p.s}/${p.d}`}
                                    type="button"
                                    onClick={() =>
                                      patchRecord({
                                        metrics: {
                                          ...record.metrics,
                                          systolic: p.s,
                                          diastolic: p.d,
                                          bloodPressure: `${p.s}/${p.d}`,
                                        },
                                      })
                                    }
                                    className={`rounded-lg px-2 py-0.5 text-3xs font-semibold transition active:scale-95 ${
                                      p.s === "145"
                                        ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                    }`}
                                  >
                                    {p.s}/{p.d}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Card Nadi */}
                            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800">
                                  Denyut Nadi Istirahat
                                </span>
                                {rikkesEval && rikkesEval.pulseCategory !== "empty" ? (
                                  <span
                                    className={`rounded-md px-2 py-0.5 text-3xs font-bold ${
                                      rikkesEval.pulseCategory === "normal"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : rikkesEval.pulseCategory === "arrhythmia"
                                          ? "bg-rose-100 text-rose-800 font-extrabold"
                                          : "bg-amber-100 text-amber-800"
                                    }`}
                                  >
                                    {rikkesEval.pulseCategory === "normal"
                                      ? "Normal (60–85 bpm)"
                                      : rikkesEval.pulseCategory === "arrhythmia"
                                        ? "ARITMIA (GUGUR)"
                                        : rikkesEval.pulseCategory === "tachycardia"
                                          ? "Takikardia (>85)"
                                          : "Bradikardia (<60)"}
                                  </span>
                                ) : (
                                  <span className="text-3xs text-slate-400 font-semibold">60–85 bpm</span>
                                )}
                              </div>

                              {/* Stepper Frekuensi */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = parseFloat(record.metrics.pulse || "72")
                                    const next = Math.max(40, cur - 2)
                                    patchRecord({ metrics: { ...record.metrics, pulse: String(next) } })
                                  }}
                                  className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 active:scale-95"
                                >
                                  -
                                </button>
                                <div className="relative flex-1">
                                  <input
                                    type="number"
                                    placeholder="72"
                                    value={record.metrics.pulse ?? ""}
                                    onChange={(e) =>
                                      patchRecord({ metrics: { ...record.metrics, pulse: e.target.value } })
                                    }
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 pr-10 text-center font-display text-base font-bold text-slate-900 focus:bg-white focus:outline-none"
                                  />
                                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-2xs font-semibold text-slate-400">
                                    bpm
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = parseFloat(record.metrics.pulse || "72")
                                    const next = Math.min(180, cur + 2)
                                    patchRecord({ metrics: { ...record.metrics, pulse: String(next) } })
                                  }}
                                  className="grid size-10 shrink-0 place-items-center rounded-xl border border-red-200 bg-red-50 font-bold text-red-600 hover:bg-red-100 active:scale-95"
                                >
                                  +
                                </button>
                              </div>

                              {/* Segmented Control Irama */}
                              <div className="pt-1.5 border-t border-slate-100">
                                <div className="inline-flex w-full rounded-xl bg-slate-100 p-1">
                                  {[
                                    { id: "sinus", label: "Sinus Reguler (Normal)" },
                                    { id: "arrhythmia", label: "Aritmia (Gugur)" },
                                  ].map((opt) => {
                                    const isSel = (record.metrics.pulseRhythm ?? "sinus") === opt.id
                                    return (
                                      <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() =>
                                          patchRecord({
                                            metrics: { ...record.metrics, pulseRhythm: opt.id },
                                          })
                                        }
                                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition active:scale-95 ${
                                          isSel
                                            ? opt.id === "sinus"
                                              ? "bg-emerald-600 text-white shadow-xs"
                                              : "bg-rose-600 text-white shadow-xs"
                                            : "text-slate-600 hover:text-slate-900"
                                        }`}
                                      >
                                        {opt.label}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* PILAR 2: MATA & PENGLIHATAN */}
                        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5">
                            <div className="flex items-center gap-2">
                              <Eye className="size-4 text-blue-600" />
                              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                2. Mata &amp; Penglihatan
                              </span>
                            </div>
                            <span className="text-3xs font-semibold text-slate-500">
                              Visus 6/6 (Toleransi minus ≤1.0D) · Buta Warna Mutlak Gugur
                            </span>
                          </div>

                          <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
                            {/* Tajam Penglihatan & Minus */}
                            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs space-y-2.5">
                              <span className="text-xs font-bold text-slate-800 block">
                                Tajam Penglihatan &amp; Refraksi
                              </span>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-3xs font-semibold text-slate-500 block mb-1">
                                    Visus Tanpa Kacamata
                                  </label>
                                  <select
                                    value={record.metrics.visusRight ?? "6/6"}
                                    onChange={(e) =>
                                      patchRecord({
                                        metrics: {
                                          ...record.metrics,
                                          visusRight: e.target.value,
                                          visusLeft: e.target.value,
                                        },
                                      })
                                    }
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                                  >
                                    <option value="6/6">6/6 (Normal Sempurna)</option>
                                    <option value="6/7.5">6/7.5 (Minus Ringan)</option>
                                    <option value="6/9">6/9 (Batas Toleransi ≤1D)</option>
                                    <option value="6/12">6/12 (&gt; 1D - TMS)</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="text-3xs font-semibold text-slate-500 block mb-1">
                                    Koreksi Minus (Dioptri)
                                  </label>
                                  <select
                                    value={record.metrics.refractionMinus ?? "0.0"}
                                    onChange={(e) =>
                                      patchRecord({
                                        metrics: {
                                          ...record.metrics,
                                          refractionMinus: e.target.value,
                                        },
                                      })
                                    }
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                                  >
                                    <option value="0.0">0.0 D (Normal / Bebas)</option>
                                    <option value="0.25">-0.25 D (Toleransi)</option>
                                    <option value="0.50">-0.50 D (Toleransi)</option>
                                    <option value="0.75">-0.75 D (Toleransi)</option>
                                    <option value="1.00">-1.00 D (Batas Maksimal)</option>
                                    <option value="1.50">-1.50 D (&gt;1D GUGUR)</option>
                                    <option value="2.00">-2.00 D (&gt;1D GUGUR)</option>
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Uji Ishihara Buta Warna */}
                            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs space-y-2.5 flex flex-col justify-between">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800">
                                  Uji Ishihara (14/24 Plates)
                                </span>
                                <span className="rounded bg-rose-100 text-rose-800 text-3xs font-extrabold px-1.5 py-0.5">
                                  Buta Warna Mutlak Gugur
                                </span>
                              </div>

                              <div className="inline-flex w-full rounded-xl bg-slate-100 p-1">
                                {[
                                  { id: "normal", label: "Bebas Buta Warna (Normal)" },
                                  { id: "partial", label: "Buta Warna (GUGUR)" },
                                ].map((opt) => {
                                  const cur =
                                    record.metrics.ishiharaStatus ??
                                    (candidateIshihara
                                      ? candidateIshihara.screeningInterpretation === "normal" ||
                                        candidateIshihara.selectionDecision === "eligible"
                                        ? "normal"
                                        : "partial"
                                      : "normal")
                                  const isSel = cur === opt.id
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() =>
                                        patchRecord({
                                          metrics: {
                                            ...record.metrics,
                                            ishiharaStatus: opt.id,
                                          },
                                        })
                                      }
                                      className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition active:scale-95 ${
                                        isSel
                                          ? opt.id === "normal"
                                            ? "bg-emerald-600 text-white shadow-xs"
                                            : "bg-rose-600 text-white shadow-xs"
                                          : "text-slate-600 hover:text-slate-900"
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  )
                                })}
                              </div>

                              <p className="text-3xs text-slate-400">
                                {candidateIshihara
                                  ? `Terhubung ke hasil portal: Akurasi ${candidateIshihara.accuracy}% (${candidateIshihara.interpretationLabel})`
                                  : "Buku referensi Ishihara resmi: Buta warna parsial/total mutlak tidak memenuhi syarat."}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* PILAR 3: KESEHATAN GIGI & MULUT */}
                        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5">
                            <div className="flex items-center gap-2">
                              <Smile className="size-4 text-emerald-600" />
                              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                3. Kesehatan Gigi &amp; Mulut
                              </span>
                            </div>
                            <span className="text-3xs font-semibold text-slate-500">
                              Karies ≤ 5 gigi ditambal · Gigi depan utuh · Bebas maloklusi parah
                            </span>
                          </div>

                          <div className="mt-3.5 grid gap-3 sm:grid-cols-3">
                            {/* Card Gigi Berlubang */}
                            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800">
                                  Gigi Berlubang (Maks. 5)
                                </span>
                                <span className="text-3xs font-semibold text-slate-400">Karies</span>
                              </div>

                              {/* Stepper Lubang Gigi */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = parseInt(record.metrics.cavityCount || "0", 10)
                                    const next = Math.max(0, cur - 1)
                                    patchRecord({ metrics: { ...record.metrics, cavityCount: String(next) } })
                                  }}
                                  className="grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 active:scale-95"
                                >
                                  -
                                </button>
                                <div className="relative flex-1">
                                  <input
                                    type="number"
                                    min={0}
                                    max={20}
                                    value={record.metrics.cavityCount ?? "0"}
                                    onChange={(e) =>
                                      patchRecord({ metrics: { ...record.metrics, cavityCount: e.target.value } })
                                    }
                                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 text-center font-display text-base font-bold text-slate-900 focus:bg-white focus:outline-none"
                                  />
                                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-2xs text-slate-400 font-semibold">
                                    gigi
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = parseInt(record.metrics.cavityCount || "0", 10)
                                    const next = Math.min(20, cur + 1)
                                    patchRecord({ metrics: { ...record.metrics, cavityCount: String(next) } })
                                  }}
                                  className="grid size-9 shrink-0 place-items-center rounded-xl border border-red-200 bg-red-50 font-bold text-red-600 hover:bg-red-100 active:scale-95"
                                >
                                  +
                                </button>
                              </div>

                              {/* Status Tambalan */}
                              <div>
                                <span className="text-3xs font-semibold text-slate-500 block mb-1">
                                  Status Penambalan
                                </span>
                                <div className="inline-flex w-full rounded-xl bg-slate-100 p-1">
                                  {[
                                    { id: "yes", label: "Sudah Ditambal" },
                                    { id: "no", label: "Belum Ditambal" },
                                  ].map((opt) => {
                                    const isSel = (record.metrics.cavityFilled ?? "yes") === opt.id
                                    return (
                                      <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() =>
                                          patchRecord({ metrics: { ...record.metrics, cavityFilled: opt.id } })
                                        }
                                        className={`flex-1 py-1 px-1.5 rounded-lg text-2xs font-bold transition active:scale-95 ${
                                          isSel
                                            ? opt.id === "yes"
                                              ? "bg-emerald-600 text-white shadow-xs"
                                              : "bg-rose-600 text-white shadow-xs"
                                            : "text-slate-600 hover:text-slate-900"
                                        }`}
                                      >
                                        {opt.label}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Card Gigi Depan */}
                            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs space-y-2">
                              <span className="text-xs font-bold text-slate-800 block">
                                Keutuhan Gigi Depan
                              </span>

                              <div className="space-y-1.5">
                                {[
                                  { id: "utuh", label: "Utuh / Normal" },
                                  { id: "tiruan_permanen", label: "Tiruan Estetik Permanen" },
                                  { id: "ompong_patah", label: "Ompong / Patah (GUGUR)" },
                                ].map((opt) => {
                                  const isSel = (record.metrics.frontTeeth ?? "utuh") === opt.id
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() =>
                                        patchRecord({
                                          metrics: { ...record.metrics, frontTeeth: opt.id },
                                        })
                                      }
                                      className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold text-left transition active:scale-95 flex items-center justify-between ${
                                        isSel
                                          ? opt.id === "ompong_patah"
                                            ? "bg-rose-600 text-white shadow-xs"
                                            : "bg-emerald-600 text-white shadow-xs"
                                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80"
                                      }`}
                                    >
                                      <span>{opt.label}</span>
                                      {isSel && <Check className="size-3.5 shrink-0" />}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>

                            {/* Card Susunan Gigi (Oklusi) */}
                            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs space-y-2">
                              <span className="text-xs font-bold text-slate-800 block">
                                Susunan Gigi (Oklusi)
                              </span>

                              <div className="space-y-1.5">
                                {[
                                  { id: "normal", label: "Normal & Rapi" },
                                  { id: "maloklusi_ringan", label: "Maloklusi Ringan (Toleransi)" },
                                  { id: "maloklusi_parah", label: "Maloklusi Parah (Penalti)" },
                                ].map((opt) => {
                                  const isSel = (record.metrics.occlusion ?? "normal") === opt.id
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() =>
                                        patchRecord({
                                          metrics: { ...record.metrics, occlusion: opt.id },
                                        })
                                      }
                                      className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold text-left transition active:scale-95 flex items-center justify-between ${
                                        isSel
                                          ? opt.id === "normal"
                                            ? "bg-emerald-600 text-white shadow-xs"
                                            : opt.id === "maloklusi_ringan"
                                              ? "bg-amber-600 text-white shadow-xs"
                                              : "bg-rose-600 text-white shadow-xs"
                                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80"
                                      }`}
                                    >
                                      <span>{opt.label}</span>
                                      {isSel && <Check className="size-3.5 shrink-0" />}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* PILAR 4: THT & PERNAPASAN */}
                        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5">
                            <div className="flex items-center gap-2">
                              <Stethoscope className="size-4 text-purple-600" />
                              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                4. THT &amp; Pernapasan
                              </span>
                            </div>
                            <span className="text-3xs font-semibold text-slate-500">
                              Bebas tonsilitis T3-T4 · Bebas polip · Membran timpani utuh tanpa congek
                            </span>
                          </div>

                          <div className="mt-3.5 grid gap-3 sm:grid-cols-3">
                            {/* Card Amandel / Tonsil */}
                            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs space-y-2">
                              <span className="text-xs font-bold text-slate-800 block">
                                Amandel / Tonsil
                              </span>
                              <div className="inline-flex w-full rounded-xl bg-slate-100 p-1">
                                {[
                                  { id: "normal", label: "T0–T2 (Normal)" },
                                  { id: "t3_t4", label: "T3–T4 (GUGUR)" },
                                ].map((opt) => {
                                  const isSel = (record.metrics.tonsil ?? "normal") === opt.id
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() =>
                                        patchRecord({
                                          metrics: { ...record.metrics, tonsil: opt.id },
                                        })
                                      }
                                      className={`flex-1 py-1.5 px-1.5 rounded-lg text-xs font-bold transition active:scale-95 ${
                                        isSel
                                          ? opt.id === "normal"
                                            ? "bg-emerald-600 text-white shadow-xs"
                                            : "bg-rose-600 text-white shadow-xs"
                                          : "text-slate-600 hover:text-slate-900"
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>

                            {/* Card Polip Hidung */}
                            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs space-y-2">
                              <span className="text-xs font-bold text-slate-800 block">
                                Polip Hidung
                              </span>
                              <div className="inline-flex w-full rounded-xl bg-slate-100 p-1">
                                {[
                                  { id: "bebas", label: "Bebas Polip (Normal)" },
                                  { id: "ada", label: "Ada Polip (GUGUR)" },
                                ].map((opt) => {
                                  const isSel = (record.metrics.nasalPolyp ?? "bebas") === opt.id
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() =>
                                        patchRecord({
                                          metrics: { ...record.metrics, nasalPolyp: opt.id },
                                        })
                                      }
                                      className={`flex-1 py-1.5 px-1.5 rounded-lg text-xs font-bold transition active:scale-95 ${
                                        isSel
                                          ? opt.id === "bebas"
                                            ? "bg-emerald-600 text-white shadow-xs"
                                            : "bg-rose-600 text-white shadow-xs"
                                          : "text-slate-600 hover:text-slate-900"
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>

                            {/* Card Membran Timpani & Riwayat Congek */}
                            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs space-y-2">
                              <span className="text-xs font-bold text-slate-800 block">
                                Membran Timpani (Telinga)
                              </span>
                              <div className="inline-flex w-full rounded-xl bg-slate-100 p-1">
                                {[
                                  { id: "utuh", label: "Utuh (Normal)" },
                                  { id: "robek_congek", label: "Congek (GUGUR)" },
                                ].map((opt) => {
                                  const isSel = (record.metrics.tympanic ?? "utuh") === opt.id
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() =>
                                        patchRecord({
                                          metrics: { ...record.metrics, tympanic: opt.id },
                                        })
                                      }
                                      className={`flex-1 py-1.5 px-1.5 rounded-lg text-xs font-bold transition active:scale-95 ${
                                        isSel
                                          ? opt.id === "utuh"
                                            ? "bg-emerald-600 text-white shadow-xs"
                                            : "bg-rose-600 text-white shadow-xs"
                                          : "text-slate-600 hover:text-slate-900"
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* GENERIC / INTERVIEW FIELDS */
                      <div className="mt-3 grid gap-4 md:grid-cols-3">
                        {definition.fields.map((field) =>
                          field.type === "number" ? (
                            <NumberStepper
                              key={field.key}
                              label={field.label}
                              value={record.metrics[field.key] ?? ""}
                              placeholder={field.placeholder}
                              onChange={(val) =>
                                patchRecord({
                                  metrics: {
                                    ...record.metrics,
                                    [field.key]: val,
                                  },
                                })
                              }
                            />
                          ) : (
                            <Input
                              key={field.key}
                              label={field.label}
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
                          ),
                        )}
                      </div>
                    )}

                    {/* Sesi Administrasi Khusus */}
                    {session.type === "administration" ? (
                      <div className="mt-6 rounded-2xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              Enam Berkas Pokok
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              Tandai setelah berkas fisik dan digital
                              diverifikasi.
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const patched: Record<string, string> = {
                                  ...record.metrics,
                                }
                                administrationDocuments.forEach(
                                  (_, i) =>
                                    (patched[`document-${i}`] = "valid"),
                                )
                                patchRecord({ metrics: patched })
                              }}
                              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 transition active:scale-95"
                            >
                              ✨ Validasi Semua (6/6)
                            </button>
                            <Badge tone="info">
                              {
                                administrationDocuments.filter(
                                  (_, index) =>
                                    record.metrics[`document-${index}`] ===
                                    "valid",
                                ).length
                              }
                              /6 valid
                            </Badge>
                          </div>
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
                                        [`document-${index}`]: event.target
                                          .checked
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

                    {/* Sesi Rikkes Khusus */}
                    {session.type === "medical" ? (
                      <div className="mt-6 rounded-2xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              Survei 21 Anamnesis
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Lebih dari 5 YA atau tanda kritis memerlukan
                              hard-lock tinjau.
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {candidatePortalAnamnesis ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const patched: Record<string, string> = {
                                    ...record.metrics,
                                  }
                                  anamnesisItems.forEach((_, i) => {
                                    patched[`anamnesis-${i}`] =
                                      candidatePortalAnamnesis.answers[String(i)] || "no"
                                  })
                                  patched.anamnesis = String(candidatePortalAnamnesis.yesCount)
                                  patched.anamnesisScore = String(candidatePortalAnamnesis.score)
                                  patched.anamnesisStatus = candidatePortalAnamnesis.status
                                  patchRecord({ metrics: patched })
                                  showToast(
                                    `21 Jawaban Anamnesis (${candidatePortalAnamnesis.yesCount} YA) disinkronkan dari portal!`,
                                    "success",
                                  )
                                }}
                                className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800 transition active:scale-95"
                              >
                                ⚡ Tarik dari Portal Mandiri
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => {
                                const patched: Record<string, string> = {
                                  ...record.metrics,
                                }
                                anamnesisItems.forEach(
                                  (_, i) => (patched[`anamnesis-${i}`] = "no"),
                                )
                                patchRecord({ metrics: patched })
                              }}
                              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 transition active:scale-95"
                            >
                              ✨ Set Semua TIDAK (Sehat)
                            </button>
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
                                        [`anamnesis-${index}`]: event.target
                                          .checked
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

                    {/* Konversi Samapta Resmi vs Drill Interval Live Card */}
                    {session.type === "fitness" ? (
                      <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-white shadow-md">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold">
                                {currentRunMode === "interval"
                                  ? officialTestedFitnessItems.length > 0
                                    ? "Konversi Otomatis Samapta B"
                                    : "Status Penilaian Kesamaptaan"
                                  : "Konversi Otomatis Samapta"}
                              </p>
                              {currentRunMode === "interval" ? (
                                <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-3xs font-bold text-amber-300 ring-1 ring-inset ring-amber-500/30">
                                  Porsi Interval = Drill Fisik
                                </span>
                              ) : (
                                <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-3xs font-bold text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
                                  Resmi BPIP (Lari 12 Mnt)
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-slate-400">
                              {currentRunMode === "interval"
                                ? officialTestedFitnessItems.length > 0
                                  ? `Rata-rata ${officialTestedFitnessItems.length} tes Samapta B disinkronkan ke profil kandidat. Latihan interval dicatat terpisah ke riwayat drill.`
                                  : "Sesi ini adalah Drill Interval (Pembinaan Fisik). Nilai latihan tidak memengaruhi nilai resmi Samapta (hanya tes Lari 12 Menit resmi yang dihitung sebagai Samapta A)."
                                : officialTestedFitnessItems.length > 0
                                  ? `Rata-rata ${officialTestedFitnessItems.length} tes resmi disinkronkan ke nilai Samapta kandidat.`
                                  : "Rata-rata tes otomatis disinkronkan ke profil kandidat saat disimpan."}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-display text-2xl font-bold">
                              {officialFitnessAverage !== null
                                ? officialFitnessAverage.toFixed(1)
                                : "—"}
                            </p>
                            <p className="text-2xs text-slate-400">
                              {officialFitnessAverage !== null
                                ? `skor Samapta (${officialTestedFitnessItems.length} tes resmi)`
                                : currentRunMode === "interval"
                                  ? "tidak ada tes Samapta resmi"
                                  : "belum diisi"}
                            </p>
                          </div>
                        </div>

                        {/* Banner Info Skor Drill Interval jika dalam mode interval */}
                        {currentRunMode === "interval" &&
                        intervalItemData?.hasVal ? (
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-amber-300">
                                ⚡ Skor Drill Interval:
                              </span>
                              <span className="text-slate-200 font-bold text-sm">
                                {intervalItemData.score}/100
                              </span>
                              <span className="text-slate-400 text-2xs">
                                ({calcIntervalCompletedSets} set · split{" "}
                                {calcIntervalAvgSplit > 0
                                  ? `${calcIntervalAvgSplit.toFixed(1)}s`
                                  : `${currentIntervalTargetPace}s`}
                                )
                              </span>
                            </div>
                            <span className="text-3xs text-amber-300 font-semibold bg-amber-500/20 px-2 py-0.5 rounded">
                              Masuk Riwayat Latihan · Bukan Samapta
                            </span>
                          </div>
                        ) : null}

                        <div
                          className={`mt-3 grid gap-2 ${
                            activeFitnessTests.length <= 2
                              ? "grid-cols-2"
                              : activeFitnessTests.length === 3
                                ? "grid-cols-3"
                                : activeFitnessTests.length === 4
                                  ? "grid-cols-2 sm:grid-cols-4"
                                  : "grid-cols-2 sm:grid-cols-5"
                          }`}
                        >
                          {fitnessItemsData
                            .filter((item) => item.isActive)
                            .map((item) => (
                              <div
                                className={`rounded-xl p-2.5 text-center ${
                                  item.isInterval
                                    ? "bg-amber-500/10 border border-amber-500/30"
                                    : "bg-white/[0.07]"
                                }`}
                                key={item.key}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <p className="text-3xs text-slate-400">
                                    {item.shortLabel}
                                  </p>
                                  {item.isInterval ? (
                                    <span className="text-3xs font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded tracking-wide">
                                      Drill
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1 font-bold">
                                  {item.isDnf ? (
                                    <span className="font-extrabold text-rose-400">
                                      DNF
                                    </span>
                                  ) : item.hasVal ? (
                                    item.isInterval ? (
                                      <span className="text-amber-300 font-extrabold">
                                        {item.score}
                                      </span>
                                    ) : (
                                      item.score
                                    )
                                  ) : (
                                    "—"
                                  )}
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : null}

                    {/* Live Evaluasi Diagnostik Kelayakan Rikkes BPIP */}
                    {session.type === "medical" && rikkesEval ? (
                      <div
                        className={`mt-4 rounded-2xl border p-4 shadow-2xs transition ${
                          rikkesEval.finalDecision === "failed"
                            ? "border-rose-300 bg-rose-50/80"
                            : rikkesEval.finalDecision === "review"
                              ? "border-amber-300 bg-amber-50/80"
                              : "border-emerald-300 bg-emerald-50/80"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
                          <div className="flex items-center gap-2.5">
                            <Stethoscope
                              className={`size-5 ${
                                rikkesEval.finalDecision === "failed"
                                  ? "text-rose-600"
                                  : rikkesEval.finalDecision === "review"
                                    ? "text-amber-600"
                                    : "text-emerald-600"
                              }`}
                            />
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                Diagnostik Kelayakan Rikkes BPIP (Tahap 4)
                              </p>
                              <p className="text-2xs text-slate-500">
                                Evaluasi terintegrasi 5 pilar klinis, tes Ishihara, &amp; 21 anamnesis.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              tone={
                                rikkesEval.finalDecision === "failed"
                                  ? "danger"
                                  : rikkesEval.finalDecision === "review"
                                    ? "warning"
                                    : "success"
                              }
                            >
                              {rikkesEval.finalDecision === "failed"
                                ? "🔴 MUTLAK GUGUR (TMS)"
                                : rikkesEval.finalDecision === "review"
                                  ? "🟡 PERLU TINJAU MEDIS"
                                  : "🟢 MEMENUHI SYARAT (LAIK)"}
                            </Badge>
                            <button
                              type="button"
                              onClick={() => {
                                const noteSummary =
                                  rikkesEval.tmsReasons.length > 0
                                    ? `TMS Rikkes: ${rikkesEval.tmsReasons.join("; ")}`
                                    : rikkesEval.reviewWarnings.length > 0
                                      ? `Tinjau Medis: ${rikkesEval.reviewWarnings.join("; ")}`
                                      : "Laik Rikkes: Memenuhi seluruh 5 pilar klinis BPIP dan anamnesis aman."
                                patchRecord({
                                  result: rikkesEval.finalDecision,
                                  note: record.note?.trim()
                                    ? record.note
                                    : noteSummary,
                                })
                                showToast(
                                  `Status Rikkes "${rikkesEval.finalDecision.toUpperCase()}" otomatis diterapkan!`,
                                  "success",
                                )
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 text-xs font-bold shadow-xs active:scale-95 transition"
                            >
                              <Sparkles className="size-3.5 text-amber-300" />
                              Terapkan ke Keputusan
                            </button>
                          </div>
                        </div>

                        {/* Rincian Alasan Gugur atau Catatan */}
                        {rikkesEval.tmsReasons.length > 0 ? (
                          <div className="mt-3 space-y-1.5 rounded-xl border border-rose-300/80 bg-rose-100/70 p-3 text-xs text-rose-950">
                            <p className="font-bold flex items-center gap-1.5 text-rose-800">
                              <XCircle className="size-4 shrink-0 text-rose-600" />
                              Kriteria Mutlak Gugur (TMS) Terdeteksi:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-2xs sm:text-xs">
                              {rikkesEval.tmsReasons.map((r, i) => (
                                <li key={i} className="font-semibold text-rose-900">
                                  {r}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : rikkesEval.reviewWarnings.length > 0 ? (
                          <div className="mt-3 space-y-1.5 rounded-xl border border-amber-300/80 bg-amber-100/70 p-3 text-xs text-amber-950">
                            <p className="font-bold flex items-center gap-1.5 text-amber-800">
                              <AlertCircle className="size-4 shrink-0 text-amber-600" />
                              Catatan Batas Toleransi / Remedial Medis:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-2xs sm:text-xs">
                              {rikkesEval.reviewWarnings.map((w, i) => (
                                <li key={i} className="text-amber-900">
                                  {w}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-100/70 p-2.5 text-xs text-emerald-950 font-medium">
                            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                            <span>
                              Kandidat memenuhi seluruh kriteria kesehatan fisik resmi BPIP: Tensi 110/70–125/85, Nadi 60–85 bpm Sinus Reguler, Visus 6/6 Bebas Buta Warna, Gigi rapi tanpa karies aktif, THT bersih, dan Anamnesis aman.
                            </span>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </>
                ) : null}

                {/* 3. Keputusan / Status Tahapan Kandidat */}
                <div className="mt-4 rounded-xl border border-slate-200/90 bg-slate-50/60 p-3 sm:p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 text-slate-500 shrink-0" />
                      <span className="text-2xs font-bold uppercase tracking-wider text-slate-600">
                        Keputusan / Status Hasil Kandidat
                      </span>
                    </div>
                    <span className="text-3xs font-semibold text-slate-400 hidden sm:inline">
                      Pilih kelayakan
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      {
                        value: "pending",
                        label: "Belum",
                        icon: CircleDashed,
                        activeStyle:
                          "border-slate-400 bg-slate-100 text-slate-900 font-bold ring-2 ring-slate-400/20 shadow-xs",
                        iconColor: "text-slate-400",
                        activeIconColor: "text-slate-700",
                      },
                      {
                        value: "passed",
                        label: "Lolos Target",
                        icon: CheckCircle2,
                        activeStyle:
                          "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-500/20 shadow-xs",
                        iconColor: "text-emerald-500",
                        activeIconColor: "text-emerald-600",
                      },
                      {
                        value: "review",
                        label: "Remedial / Tinjau",
                        mobileLabel: "Remedial",
                        icon: AlertCircle,
                        activeStyle:
                          "border-amber-500 bg-amber-50 text-amber-900 font-bold ring-2 ring-amber-500/20 shadow-xs",
                        iconColor: "text-amber-500",
                        activeIconColor: "text-amber-600",
                      },
                      {
                        value: "failed",
                        label: "Belum Memenuhi",
                        icon: XCircle,
                        activeStyle:
                          "border-rose-500 bg-rose-50 text-rose-900 font-bold ring-2 ring-rose-500/20 shadow-xs",
                        iconColor: "text-rose-500",
                        activeIconColor: "text-rose-600",
                      },
                    ].map((item) => {
                      const Icon = item.icon
                      const isSelected = record.result === item.value
                      return (
                        <button
                          type="button"
                          key={item.value}
                          onClick={() =>
                            patchRecord({ result: item.value as ResultStatus })
                          }
                          className={`flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-2 py-1.5 text-xs font-semibold transition active:scale-95 ${
                            isSelected
                              ? item.activeStyle
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-2xs"
                          }`}
                        >
                          <Icon
                            className={`size-3.5 shrink-0 ${
                              isSelected ? item.activeIconColor : item.iconColor
                            }`}
                          />
                          <span className="text-2xs sm:text-xs leading-tight text-center">
                            {item.mobileLabel ? (
                              <>
                                <span className="hidden sm:inline">
                                  {item.label}
                                </span>
                                <span className="sm:hidden">
                                  {item.mobileLabel}
                                </span>
                              </>
                            ) : (
                              item.label
                            )}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* 3. SECTION SURVEI PELATIH / CATATAN */}
              <div className={mobileTab === "survey" || "hidden lg:block"}>
                <div className="mt-7 border-t border-slate-100 pt-5">
                  {(record.attendance ?? "hadir") === "hadir" ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Survei Observasi Pelatih
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            Pilih skala observasi 1–5 (1: Perlu Perhatian, 5:
                            Sangat Baik).
                          </p>
                        </div>
                        <ClipboardList className="size-5 text-red-600" />
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        {[
                          ["discipline", "Disiplin"],
                          ["focus", "Fokus"],
                          ["stamina", "Stamina"],
                        ].map(([field, label]) => {
                          const currentVal =
                            record[
                              (field as "discipline" | "focus" | "stamina")
                            ] || "4"
                          return (
                            <div
                              key={field}
                              className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-800">
                                  {label}
                                </span>
                                <span className="text-xs font-bold text-red-600">
                                  {currentVal} / 5
                                </span>
                              </div>
                              <div className="grid grid-cols-5 gap-1">
                                {[1, 2, 3, 4, 5].map((val) => {
                                  const isSel = String(val) === currentVal
                                  return (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() =>
                                        patchRecord({ [field]: String(val) })
                                      }
                                      className={`min-h-10 rounded-xl text-xs font-bold transition active:scale-95 ${
                                        isSel
                                          ? val >= 4
                                            ? "bg-emerald-600 text-white shadow-xs font-extrabold"
                                            : val === 3
                                              ? "bg-blue-600 text-white shadow-xs font-extrabold"
                                              : "bg-amber-500 text-white shadow-xs font-extrabold"
                                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                                      }`}
                                    >
                                      {val}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  ) : null}

                  <label className="mt-4 grid gap-1.5 text-xs font-bold text-slate-700">
                    Catatan Pelatih / Petugas Sesi
                    <textarea
                      rows={3}
                      value={record.note}
                      onChange={(event) =>
                        patchRecord({ note: event.target.value })
                      }
                      placeholder={
                        record.attendance && record.attendance !== "hadir"
                          ? `Alasan ${record.attendance} atau keterangan rencana susulan...`
                          : "Catat koreksi teknik, kendala fisik, atau instruksi khusus..."
                      }
                      className="resize-y rounded-xl border border-slate-200 p-3 text-xs font-normal outline-none placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-100"
                    />
                  </label>
                </div>
              </div>

              {/* 4. SECTION PROFIL KANDIDAT ON MOBILE */}
              {mobileTab === "profile" && (
                <div className="mt-5 border-t border-slate-100 pt-5 lg:hidden">
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
                          recordKey.endsWith(`:${candidate.id}`) &&
                          value.savedAt,
                      ).length
                    }
                  />
                </div>
              )}

              {/* Compact Save Actions Bar at bottom of card */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 min-w-0">
                  {saved ? (
                    <span className="flex items-center gap-1 text-2xs font-bold text-emerald-700 animate-in fade-in">
                      <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                      <span>Tersimpan &amp; Disinkronkan</span>
                    </span>
                  ) : (
                    <span className="text-2xs text-slate-400 truncate">
                      Otomatis tersinkron ke master kandidat.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                  <button
                    type="button"
                    onClick={() => saveRecord(false)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition active:scale-95 whitespace-nowrap"
                  >
                    <Save className="size-3 text-slate-500 shrink-0" />
                    <span>
                      {record.attendance && record.attendance !== "hadir"
                        ? "Simpan Absen"
                        : "Simpan"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => saveRecord(true)}
                    className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs shadow-red-600/20 transition active:scale-95 whitespace-nowrap"
                  >
                    <Save className="size-3 shrink-0" />
                    <span>Simpan &amp; Lanjut</span>
                    <ArrowRight className="size-3 shrink-0" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Col 2: Candidate Profile Card on Desktop (Row 2 Kanan) */}
        <Card className="hidden h-fit p-5 xl:block">
          <h2 className="font-display font-bold text-slate-900">
            Profil kandidat
          </h2>
          <div className="mt-5">
            {candidate ? (
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
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-400">
                Pilih salah satu kandidat untuk melihat ringkasan profil dan
                riwayat penilaian.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* MOBILE STICKY FLOATING ACTION BAR (Touch-First) */}
      {candidate && (
        <div className="fixed inset-x-3 bottom-20 z-30 flex items-center justify-between gap-2.5 rounded-2xl border border-slate-200/95 bg-white/95 p-2 shadow-2xl shadow-slate-950/20 backdrop-blur-xl lg:hidden">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <CandidateAvatar
              name={candidate.name}
              avatar={candidate.avatar}
              photoUrl={candidate.photoUrl}
              className="size-9.5 text-xs shrink-0 border border-slate-200"
              rounded="rounded-xl"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 leading-tight line-clamp-2">
                {candidate.name}
              </p>
              <div className="flex items-center gap-1.5 text-3xs mt-0.5">
                {record.savedAt ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="size-2.5 shrink-0" /> Tersimpan
                  </span>
                ) : (
                  <span className="text-amber-600 font-bold flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />{" "}
                    Belum simpan
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Compact Joined Prev/Next Pill */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 shadow-2xs">
              <button
                type="button"
                disabled={!prevCandidate}
                onClick={() =>
                  prevCandidate && setCandidateId(prevCandidate.id)
                }
                className="size-7 grid place-items-center rounded text-slate-700 transition disabled:opacity-30 active:scale-90 hover:bg-white"
                title="Kandidat sebelumnya"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <div className="h-3.5 w-px bg-slate-200" />
              <button
                type="button"
                disabled={!nextCandidate}
                onClick={() =>
                  nextCandidate && setCandidateId(nextCandidate.id)
                }
                className="size-7 grid place-items-center rounded text-slate-700 transition disabled:opacity-30 active:scale-90 hover:bg-white"
                title="Kandidat berikutnya"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => saveRecord(true)}
              className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-3 py-2 text-xs font-bold text-white shadow-md shadow-red-600/25 active:scale-95 transition whitespace-nowrap"
            >
              <Save className="size-3.5" />
              <span>Simpan</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

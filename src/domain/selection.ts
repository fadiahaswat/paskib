export type StageStatus = "passed" | "active" | "locked" | "failed" | "review"

export type UserRole = "admin" | "coach" | "medical" | "judge" | "candidate"

export type UserProfile = {
  id: string
  name: string
  email: string
  role: UserRole
  avatar: string
  title: string
  active: boolean
  candidateId?: string
}

export type SelectionCycle = {
  id: string
  name: string
  year: number
  level: "Kabupaten/Kota" | "Provinsi" | "Pusat"
  referenceDate: string
  status: "active" | "draft" | "closed"
}

export type SelectionStage = {
  id: number
  key: string
  shortLabel: string
  label: string
  phase: 1 | 2
}

export type PhysicalMetric = {
  label: string
  current: string
  target: string
  percent: number
}

export type AnthropometryLog = {
  id: string
  date: string
  heightCm: number
  weightKg: number
  note?: string
}

export type CandidateDocumentFile = {
  name: string
  size?: string
  url: string
  uploadedAt: string
}

export type IntervalTrainingLog = {
  id: string
  sessionId?: string
  sessionTitle?: string
  date: string
  targetSets: number
  completedSets: number
  distancePerSet: number
  totalDistance: number
  targetPaceSec: number
  avgSplitSec: number
  lapSplitsSec: number[]
  score: number
  projected12MinDistanceM: number
  projected12MinScore: number
  paceConsistency: "Sangat Konsisten" | "Negatif Split (Kuat)" | "Cukup Stabil" | "Penurunan Drastis" | "Data Belum Lengkap"
  coachRecommendation: string
  note?: string
}

export type Candidate = {
  id: string
  number: string
  nik?: string
  /** Data supplied on the candidate registration roster. */
  origin?: string
  className?: string
  studentNumber?: string
  name: string
  school: string
  gender: "Putra" | "Putri"
  birthDate: string
  phone?: string
  socialMedia?: string
  heightCm?: number
  weightKg?: number
  anthropometryHistory?: AnthropometryLog[]
  intervalHistory?: IntervalTrainingLog[]
  avatar: string
  photoUrl?: string
  stage: number
  stageStatuses: StageStatus[]
  pip: number | null
  tiu: number | null
  pbb: number | null
  fitness: number | null
  personality: number | null
  documents?: boolean[] // 6 administration documents
  documentFiles?: Record<number, CandidateDocumentFile>
  attendance?: number
  trainingCompliance?: number
  coachNote?: string
  eliminationReason?: string
  physicalMetrics?: PhysicalMetric[]
  cycleId?: string
  updatedAt: string
}

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
  pipScore: number
  pipStatus: "passed" | "failed"
  tiuCorrect: number
  tiuScoreRaw: number
  tiuScoreScaled: number
  tiuStatus: "passed" | "failed"
  combinedScore: number
  startedAt: string
  finalizedAt: string
}

export type SelectionSchedule = {
  id: string
  stageId: number
  title: string
  date: string
  time: string
  location: string
  capacity: number
  pic: string
  assignedCandidateIds: string[]
  status: "scheduled" | "ongoing" | "completed"
}

export type CatQuestion = {
  id: string
  type: "pip" | "tiu"
  category: string
  question: string
  options: [string, string, string, string, string]
  correctIndex: number
  explanation: string
  status: "active" | "draft"
}

export type SupportingDoc = {
  id: string
  title: string
  category: "Pengumuman" | "Regulasi" | "Template" | "Panduan"
  summary: string
  content: string
  fileSize: string
  updatedAt: string
  status: "published" | "draft"
}

export type StandardRuleItem = {
  id: string
  name: string
  value: string
  status: "Terverifikasi internal" | "Terlihat pada portal" | "Belum terverifikasi" | "Diblokir"
  tone: "success" | "info" | "warning" | "danger"
  approver?: string
  reference?: string
  updatedAt?: string
}

export type AuditLogEntry = {
  id: string
  timestamp: string
  actor: string
  role: string
  action: string
  target: string
  detail: string
}

export const selectionStages: SelectionStage[] = [
  {
    id: 1,
    key: "administration",
    shortLabel: "ADM",
    label: "Administrasi",
    phase: 1,
  },
  {
    id: 2,
    key: "pip",
    shortLabel: "PIP",
    label: "Pancasila & Wawasan",
    phase: 1,
  },
  {
    id: 3,
    key: "tiu",
    shortLabel: "TIU",
    label: "Intelegensia Umum",
    phase: 1,
  },
  { id: 4, key: "medical", shortLabel: "RIK", label: "Kesehatan", phase: 1 },
  { id: 5, key: "parade", shortLabel: "PAR", label: "Parade", phase: 1 },
  { id: 6, key: "pbb", shortLabel: "PBB", label: "PBB", phase: 2 },
  { id: 7, key: "fitness", shortLabel: "SAM", label: "Kesamaptaan", phase: 2 },
  {
    id: 8,
    key: "personality",
    shortLabel: "KEP",
    label: "Kepribadian",
    phase: 2,
  },
]

export function provisionalScore(candidate: Candidate): number {
  let totalWeightedScore = 0
  let totalWeight = 0

  if (candidate.fitness !== null) {
    totalWeightedScore += candidate.fitness * 0.3
    totalWeight += 0.3
  }
  if (candidate.pbb !== null) {
    totalWeightedScore += candidate.pbb * 0.3
    totalWeight += 0.3
  }
  if (candidate.personality !== null) {
    totalWeightedScore += candidate.personality * 0.4
    totalWeight += 0.4
  }

  // Jika ada nilai materi lapangan yang masuk, normalisasikan bobotnya (0 - 100)
  if (totalWeight > 0) {
    return Number((totalWeightedScore / totalWeight).toFixed(2))
  }

  // Jika nilai lapangan belum ada, gunakan rata-rata nilai CAT (jika sudah tryout)
  let catScore = 0
  let catWeight = 0
  if (candidate.pip !== null && candidate.pip > 0) {
    catScore += candidate.pip
    catWeight++
  }
  if (candidate.tiu !== null && candidate.tiu > 0) {
    catScore += candidate.tiu
    catWeight++
  }
  if (catWeight > 0) {
    return Number((catScore / catWeight).toFixed(2))
  }

  return 0
}

export function finalScore(candidate: Candidate): number | null {
  // Hitung nilai kesiapan sementara secara dinamis dari data latihan yang tersedia
  const score = provisionalScore(candidate)
  return score > 0 ? score : null
}

export function isPhaseOnePassed(candidate: Candidate): boolean {
  // Dalam paradigma pembinaan: santri dapat masuk pemeringkatan latihan
  // selama tidak ada catatan diskualifikasi/remedial fatal pada standar dasar
  return !candidate.stageStatuses.slice(0, 5).some((status) => status === "failed")
}

export function ageOnReferenceDate(birthDate: string, referenceYear: number) {
  const birth = new Date(`${birthDate}T00:00:00`)
  const reference = new Date(`${referenceYear}-08-17T00:00:00`)
  if (Number.isNaN(birth.getTime())) {
    return { years: 0, months: 0, days: 0 }
  }
  let years = reference.getFullYear() - birth.getFullYear()
  let months = reference.getMonth() - birth.getMonth()
  let days = reference.getDate() - birth.getDate()

  if (days < 0) {
    months -= 1
    const previousMonth = new Date(
      reference.getFullYear(),
      reference.getMonth(),
      0,
    )
    days += previousMonth.getDate()
  }
  if (months < 0) {
    years -= 1
    months += 12
  }
  return { years, months, days }
}

export function evaluateAgeEligibility(
  birthDate: string,
  referenceYear: number,
) {
  const age = ageOnReferenceDate(birthDate, referenceYear)
  const isBoundaryConflict =
    age.years === 18 && age.months === 0 && age.days === 0
  const eligible = age.years >= 16 && age.years < 18
  return {
    ...age,
    eligible,
    status: isBoundaryConflict
      ? "review" as const
      : eligible
        ? "valid" as const
        : "invalid" as const,
    message: isBoundaryConflict
      ? "Konflik batas tepat 18 tahun (perlu review diskresi aturan)"
      : eligible
        ? "Memenuhi rentang usia 16 s.d. <18 tahun"
        : "Di luar rentang usia 16 s.d. <18 tahun",
  }
}

export function validateStageTransition(
  _statuses: StageStatus[],
  stageIndex: number,
) {
  // Dalam paradigma pembinaan: semua materi (0-7) terbuka dan dapat dinilai kapan saja
  return stageIndex >= 0 && stageIndex <= 7
}

/**
 * Paradigma Pembinaan & Kesiapan:
 * - Setiap materi mandiri (tidak saling mengunci / auto-lock).
 * - Tidak ada sistem gugur paksa; penilaian tiap materi mencatat kesiapan nyata santri.
 */
export function applyStageDecision(
  currentStatuses: StageStatus[],
  stageIndex: number,
  nextStatus: StageStatus,
): { stageStatuses: StageStatus[], activeStageNumber: number } {
  const next = [...currentStatuses] as StageStatus[]
  while (next.length < 8) next.push("active")

  next[stageIndex] = nextStatus

  // Hitung nomor materi yang sedang difokuskan (1-8)
  const activeStageNumber = stageIndex + 1

  return { stageStatuses: next, activeStageNumber }
}

export function bmi(weightKg: number, heightCm: number) {
  if (!weightKg || !heightCm || heightCm <= 0 || weightKg <= 0) return null
  const value = weightKg / (heightCm / 100) ** 2
  const category =
    value < 18.5
      ? "Kurus"
      : value < 25
        ? "Normal"
        : value < 30
          ? "Overweight"
          : "Obesitas"
  return { value: Number(value.toFixed(1)), category }
}

export function evaluateRankingAnthropometry(candidate: Pick<Candidate, "heightCm" | "weightKg">) {
  if (candidate.heightCm === undefined || candidate.weightKg === undefined) {
    return { status: "pending" as const, reason: "Data tinggi atau berat belum lengkap" }
  }
  if (candidate.heightCm < 170) {
    return { status: "failed" as const, reason: `Tinggi ${candidate.heightCm} cm, di bawah syarat 170 cm` }
  }
  const result = bmi(candidate.weightKg, candidate.heightCm)
  if (!result) {
    return { status: "pending" as const, reason: "Data BMI belum dapat dihitung" }
  }
  if (result.category !== "Normal") {
    return { status: "failed" as const, reason: `BMI ${result.value} (${result.category}), di luar rentang ideal 18,5–24,9` }
  }
  return { status: "eligible" as const, reason: `Memenuhi syarat · BMI ${result.value}` }
}

export function evaluateAnthropometry(
  gender: "Putra" | "Putri",
  heightCm?: number,
  weightKg?: number,
) {
  const minIdealHeight = gender === "Putra" ? 170 : 165
  const maxIdealHeight = gender === "Putra" ? 180 : 175
  const minKabHeight = gender === "Putra" ? 165 : 160

  const hasHeight = Boolean(heightCm && heightCm > 0)
  const hasWeight = Boolean(weightKg && weightKg > 0)

  const heightStatus = !hasHeight
    ? { label: "Belum diukur", tone: "neutral" as const }
    : heightCm! >= minIdealHeight && heightCm! <= maxIdealHeight
      ? { label: "Ideal Standar BPIP", tone: "success" as const }
      : heightCm! >= minKabHeight && heightCm! < minIdealHeight
        ? { label: "Min. Kab/Kota", tone: "info" as const }
        : { label: "Di Luar Rentang", tone: "danger" as const }

  const idealWeight = hasHeight ? Math.max(40, heightCm! - 110) : null
  const minIdealWeight = idealWeight !== null ? idealWeight - 5 : null
  const maxIdealWeight = idealWeight !== null ? idealWeight + 5 : null

  const weightStatus =
    !hasWeight || minIdealWeight === null || maxIdealWeight === null
      ? { label: "Belum diukur", tone: "neutral" as const }
      : weightKg! >= minIdealWeight && weightKg! <= maxIdealWeight
        ? { label: "Proporsional Ideal", tone: "success" as const }
        : weightKg! < minIdealWeight
          ? {
              label: `Kurang ${Number((minIdealWeight - weightKg!).toFixed(1))} kg`,
              tone: "warning" as const,
            }
          : {
              label: `Lebih ${Number((weightKg! - maxIdealWeight).toFixed(1))} kg`,
              tone: "warning" as const,
            }

  const bmiResult =
    hasHeight && hasWeight ? bmi(weightKg!, heightCm!) : null

  return {
    minIdealHeight,
    maxIdealHeight,
    minKabHeight,
    heightStatus,
    idealWeight,
    minIdealWeight,
    maxIdealWeight,
    weightStatus,
    bmi: bmiResult,
  }
}

/**
 * Tie-breaker komparator untuk pemeringkatan sementara santri:
 * 1. Nilai Sementara (descending)
 * 2. Kehadiran latihan / Attendance (descending)
 * 3. Samapta / Fitness (descending)
 * 4. PBB (descending)
 * 5. Kepribadian (descending)
 * 6. Nomor Peserta (ascending)
 */
export function compareRankedCandidates(
  a: { candidate: Candidate, score: number },
  b: { candidate: Candidate, score: number },
): number {
  if (Math.abs(b.score - a.score) > 1e-6) {
    return b.score - a.score
  }
  const attDiff = (b.candidate.attendance ?? 0) - (a.candidate.attendance ?? 0)
  if (Math.abs(attDiff) > 1e-6) return attDiff

  const fitDiff = (b.candidate.fitness ?? 0) - (a.candidate.fitness ?? 0)
  if (Math.abs(fitDiff) > 1e-6) return fitDiff

  const pbbDiff = (b.candidate.pbb ?? 0) - (a.candidate.pbb ?? 0)
  if (Math.abs(pbbDiff) > 1e-6) return pbbDiff

  const persDiff =
    (b.candidate.personality ?? 0) - (a.candidate.personality ?? 0)
  if (Math.abs(persDiff) > 1e-6) return persDiff

  return a.candidate.number.localeCompare(b.candidate.number)
}

export type SessionType =
  | "cat"
  | "administration"
  | "pip"
  | "tiu"
  | "medical"
  | "parade"
  | "pbb"
  | "fitness"
  | "interview"

export type SessionStatus = "scheduled" | "active" | "completed"
export type ResultStatus = "pending" | "passed" | "review" | "failed"

export type Session = {
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

export type SessionRecord = {
  metrics: Record<string, string>
  result: ResultStatus
  discipline: string
  focus: string
  stamina: string
  note: string
  savedAt?: string
}


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

export type Candidate = {
  id: string
  number: string
  nik?: string
  name: string
  school: string
  gender: "Putra" | "Putri"
  birthDate: string
  phone?: string
  socialMedia?: string
  heightCm?: number
  weightKg?: number
  anthropometryHistory?: AnthropometryLog[]
  avatar: string
  stage: number
  stageStatuses: StageStatus[]
  pip: number | null
  tiu: number | null
  pbb: number | null
  fitness: number | null
  personality: number | null
  documents?: boolean[] // 6 administration documents
  attendance?: number
  trainingCompliance?: number
  coachNote?: string
  eliminationReason?: string
  physicalMetrics?: PhysicalMetric[]
  cycleId?: string
  updatedAt: string
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

export function finalScore(candidate: Candidate): number | null {
  if (
    candidate.pbb === null ||
    candidate.fitness === null ||
    candidate.personality === null
  ) {
    return null
  }
  return (
    candidate.pbb * 0.3 + candidate.fitness * 0.3 + candidate.personality * 0.4
  )
}

export function isPhaseOnePassed(candidate: Candidate): boolean {
  return candidate.stageStatuses
    .slice(0, 5)
    .every((status) => status === "passed")
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
  statuses: StageStatus[],
  stageIndex: number,
) {
  if (stageIndex < 0 || stageIndex > 7) return false
  if (stageIndex < 5) {
    return statuses.slice(0, stageIndex).every((status) => status === "passed")
  }
  return statuses.slice(0, 5).every((status) => status === "passed")
}

/**
 * Enforces the Paskibraka hard-lock state machine across 8 stages:
 * - Stages 0..4 (Tahap 1–5): sequential hard-lock.
 *   - If any stage 0..4 is set to "failed" (or anything other than "passed"), all subsequent stages become "locked".
 *   - When stage i (0..3) becomes "passed", stage i+1 is automatically unlocked to "active" if it was "locked".
 *   - When stage 4 (Parade) becomes "passed", all Phase 2 stages (5, 6, 7) are unlocked to "active" if they were "locked".
 */
export function applyStageDecision(
  currentStatuses: StageStatus[],
  stageIndex: number,
  nextStatus: StageStatus,
): { stageStatuses: StageStatus[], activeStageNumber: number } {
  const next = [...currentStatuses] as StageStatus[]
  while (next.length < 8) next.push("locked")

  next[stageIndex] = nextStatus

  if (stageIndex < 5) {
    if (nextStatus === "passed") {
      // Check if all stages up to stageIndex are passed
      const allUpToHerePassed = next
        .slice(0, stageIndex + 1)
        .every((s) => s === "passed")
      if (allUpToHerePassed) {
        if (stageIndex < 4) {
          if (next[stageIndex + 1] === "locked") {
            next[stageIndex + 1] = "active"
          }
        } else if (stageIndex === 4) {
          // Parade passed -> unlock Phase 2 (PBB, Samapta, Kepribadian)
          for (let i = 5; i < 8; i++) {
            if (next[i] === "locked") {
              next[i] = "active"
            }
          }
        }
      }
    } else {
      // Hard-lock: if stage 1-5 is not passed (e.g. failed, review, active, locked), lock subsequent stages
      for (let i = stageIndex + 1; i < 8; i++) {
        next[i] = "locked"
      }
    }
  }

  // Compute current active stage number (1-8)
  let activeStageNumber = 1
  const failedIndex = next.findIndex((s) => s === "failed")
  if (failedIndex !== -1) {
    activeStageNumber = failedIndex + 1
  } else {
    const activeOrReviewIndex = next.findIndex(
      (s) => s === "active" || s === "review",
    )
    if (activeOrReviewIndex !== -1) {
      activeStageNumber = activeOrReviewIndex + 1
    } else {
      const lastPassed = next.reduce(
        (acc, s, idx) => (s === "passed" ? idx + 1 : acc),
        1,
      )
      activeStageNumber = Math.min(8, lastPassed)
    }
  }

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
 * Deterministic tie-breaker comparator for ranked candidates:
 * 1. Final Score (descending)
 * 2. Kepribadian / Personality (descending)
 * 3. PBB (descending)
 * 4. Samapta / Fitness (descending)
 * 5. Participant Number (ascending)
 */
export function compareRankedCandidates(
  a: { candidate: Candidate, score: number },
  b: { candidate: Candidate, score: number },
): number {
  if (Math.abs(b.score - a.score) > 1e-6) {
    return b.score - a.score
  }
  const persDiff =
    (b.candidate.personality ?? 0) - (a.candidate.personality ?? 0)
  if (Math.abs(persDiff) > 1e-6) return persDiff

  const pbbDiff = (b.candidate.pbb ?? 0) - (a.candidate.pbb ?? 0)
  if (Math.abs(pbbDiff) > 1e-6) return pbbDiff

  const fitDiff = (b.candidate.fitness ?? 0) - (a.candidate.fitness ?? 0)
  if (Math.abs(fitDiff) > 1e-6) return fitDiff

  return a.candidate.number.localeCompare(b.candidate.number)
}

export function getQuotaBand(
  rank: number,
): {
  label: string
  tone: "success" | "info" | "warning" | "neutral"
} {
  if (rank <= 2) {
    return { label: "Utusan Provinsi/Nasional", tone: "success" }
  }
  if (rank <= 30) {
    return { label: "Pasukan Inti Kab/Kota", tone: "info" }
  }
  if (rank <= 40) {
    return { label: "Cadangan Kab/Kota", tone: "warning" }
  }
  return { label: "Di Luar Kuota", tone: "neutral" }
}

export type SessionType =
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


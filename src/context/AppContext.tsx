import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type SetStateAction,
} from "react"
import {
  candidates as seededCandidates,
  initialAuditLogs,
  initialCycles,
  initialQuestions,
  initialRecords,
  initialSchedules,
  initialSessions,
  initialStandardRules,
  initialSupportingDocs,
  initialUsers,
  initialAuthorizedAccounts,
} from "../data/initialData"
import type {
  AccountRole,
  AuthorizedAccount,
  IshiharaScreeningResult,
  IshiharaTestSession,
  TestAssignment,
} from "../features/ishihara/types"
import { fitnessScore } from "../data/selectionGuide"
import {
  deduplicateCandidateNumbers,
  generateNextCandidateNumber,
  mergeCandidatesList,
  mergeCatAttempts,
  mergeDatabaseStates,
  recoverOrphanedCandidates,
} from "../domain/cloudSyncMerge"
import { createIntervalLogEntry } from "../domain/intervalAnalytics"
import {
  applyStageDecision,
  type AuditLogEntry,
  type Candidate,
  type CatTryoutAttempt,
  type CatQuestion,
  type SelectionCycle,
  type SelectionSchedule,
  type Session,
  type SessionRecord,
  type StageStatus,
  type StandardRuleItem,
  type SupportingDoc,
  type UserProfile,
} from "../domain/selection"
import {
  type AppDatabaseState,
  getAutoSyncEnabled,
  getLastSyncTime,
  getSavedGasUrl,
  pullStateFromGoogleSheet,
  pushStateToGoogleSheet,
  saveGasUrl,
  saveLastSyncTime,
  setAutoSyncEnabled,
  testGasConnection,
} from "../lib/googleSheetSync"
import { serverUrl } from "../lib/supabase"
import { publicAnonKey } from "../../utils/supabase/info"

type ToastMessage = {
  id: number
  message: string
  tone: "success" | "warning" | "danger" | "info"
}

type SyncStatus = "local" | "syncing" | "synced" | "error"

// Percobaan demo bawaan versi lama pernah tersimpan ke localStorage.
const legacyDemoCatAttemptIds = new Set(["att-001", "att-002", "att-003"])
const standardQuestionSetVersion = `${initialQuestions.length}:${initialQuestions[initialQuestions.length - 1]?.id ?? "empty"}`

type AppContextValue = {
  // Cycles
  cycles: SelectionCycle[]
  activeCycle: SelectionCycle
  setActiveCycleId: (id: string) => void
  addCycle: (cycle: Omit<SelectionCycle, "id">) => void
  updateCycle: (id: string, patch: Partial<SelectionCycle>) => void
  deleteCycle: (id: string) => void

  // Auth & Users
  currentUser: UserProfile
  users: UserProfile[]
  isAuthenticated: boolean
  loginAs: (userId: string) => void
  loginAsCandidate: (candidateIdOrNumber: string) => boolean
  loginCandidateByNik: (nik: string) => { success: boolean; candidate?: Candidate; error?: string }
  loginCoachWithGoogle: (
    email: string,
    profile?: { name?: string; picture?: string },
  ) => { success: boolean; error?: string }
  logout: () => void
  addUser: (user: Omit<UserProfile, "id">) => void
  toggleUserActive: (userId: string) => void

  // Candidates
  candidates: Candidate[]
  allCandidates: Candidate[]
  addCandidate: (
    data: Omit<Candidate, "id" | "avatar" | "stage" | "stageStatuses" | "updatedAt"> & {
      stage?: number
      stageStatuses?: StageStatus[]
    },
  ) => Candidate
  updateCandidate: (id: string, patch: Partial<Candidate>) => void
  catTryoutAttempts: CatTryoutAttempt[]
  saveCatTryoutAttempt: (attempt: CatTryoutAttempt) => void
  deleteCatTryoutAttempt: (attemptId: string) => void
  deleteCandidate: (id: string) => void
  importCandidates: (newItems: Candidate[]) => number
  updateCandidateStage: (
    candidateId: string,
    stageIndex: number,
    status: StageStatus,
    reason?: string,
  ) => void
  toggleCandidateDocument: (candidateId: string, docIndex: number) => void
  addAnthropometryLog: (
    candidateId: string,
    entry: { date: string, heightCm: number, weightKg: number, note?: string },
  ) => void
  deleteAnthropometryLog: (candidateId: string, logId: string) => void
  addIntervalLog: (
    candidateId: string,
    entry: Omit<import("../domain/selection").IntervalTrainingLog, "id">,
  ) => void
  deleteIntervalLog: (candidateId: string, logId: string) => void
  syncCandidateFromSession: (params: {
    candidateId: string
    sessionType: string
    sessionId?: string
    sessionTitle?: string
    metrics: Record<string, string>
    records: Record<string, SessionRecord>
    result: "pending" | "passed" | "review" | "failed"
    note: string
    attendance?: "hadir" | "sakit" | "izin" | "alpa"
  }) => Candidate[]

  // Stage checklists
  stageChecklists: Record<number, boolean[]>
  toggleStageChecklist: (stageIndex: number, itemIndex: number) => void

  // Schedules
  schedules: SelectionSchedule[]
  addSchedule: (schedule: Omit<SelectionSchedule, "id">) => void
  updateSchedule: (id: string, patch: Partial<SelectionSchedule>) => void
  deleteSchedule: (id: string) => void
  toggleCandidateSchedule: (scheduleId: string, candidateId: string) => boolean

  // CAT Questions
  questions: CatQuestion[]
  addQuestion: (question: Omit<CatQuestion, "id">) => void
  updateQuestion: (id: string, patch: Partial<CatQuestion>) => void
  deleteQuestion: (id: string) => void
  restoreStandardQuestions: () => number

  // Supporting Documents & Announcements
  supportingDocs: SupportingDoc[]
  addSupportingDoc: (doc: Omit<SupportingDoc, "id" | "updatedAt">) => void
  updateSupportingDoc: (id: string, patch: Partial<SupportingDoc>) => void
  deleteSupportingDoc: (id: string) => void

  // Standards Governance
  standardRules: StandardRuleItem[]
  updateStandardRule: (id: string, patch: Partial<StandardRuleItem>) => void

  // Ranking publication
  rankingPublished: boolean
  setRankingPublished: (value: boolean) => void

  // Audit & Notifications
  auditLogs: AuditLogEntry[]
  logAudit: (action: string, target: string, detail: string) => void
  toast: ToastMessage | null
  showToast: (
    message: string,
    tone?: "success" | "warning" | "danger" | "info",
  ) => void
  clearToast: () => void

  // Persistence & Cloud Sync
  syncStatus: SyncStatus
  syncWithBackend: () => Promise<void>
  resetAllData: () => void

  // Google Sheet Cloud Sync
  sessions: Session[]
  setSessions: React.Dispatch<React.SetStateAction<Session[]>>
  records: Record<string, SessionRecord>
  setRecords: React.Dispatch<React.SetStateAction<Record<string, SessionRecord>>>
  googleSheetUrl: string
  setGoogleSheetUrl: (url: string) => void
  autoSyncGoogleSheet: boolean
  setAutoSyncGoogleSheet: (enabled: boolean) => void
  cloudSyncStatus: "idle" | "syncing" | "pulling" | "synced" | "error"
  lastCloudSync: string | null
  hasUnsavedChanges: boolean
  saveToCloud: (
    override?: Partial<AppDatabaseState>,
  ) => Promise<{ ok: boolean, message: string }>
  refreshAndSync: (reason?: "initial" | "manual" | "idle") => Promise<void>
  syncToGoogleSheet: (
    customUrl?: string,
    silent?: boolean,
  ) => Promise<{ ok: boolean, message: string }>
  pullFromGoogleSheet: (
    customUrl?: string,
    silent?: boolean,
  ) => Promise<{ ok: boolean, message: string }>
  testGoogleSheet: (customUrl?: string) => Promise<{ ok: boolean, message: string }>

  // Ishihara Screening System (PRD Version 1.1)
  ishiharaSessions: IshiharaTestSession[]
  ishiharaAllowlist: AuthorizedAccount[]
  ishiharaResults: IshiharaScreeningResult[]
  addAuthorizedAccount: (acc: Omit<AuthorizedAccount, "id" | "createdAt" | "approvedAt">) => void
  toggleAuthorizedAccount: (id: string) => void
  updateAuthorizedAccountRole: (id: string, role: AccountRole) => void
  deleteAuthorizedAccount: (id: string) => void
  addIshiharaSession: (session: Omit<IshiharaTestSession, "id" | "createdAt">) => void
  updateIshiharaSession: (id: string, patch: Partial<IshiharaTestSession>) => void
  deleteIshiharaSession: (id: string) => void
  updateSessionAssignment: (sessionId: string, assignmentId: string, patch: Partial<TestAssignment>) => void
  saveIshiharaScreeningResult: (result: IshiharaScreeningResult) => void
}

const AppContext = createContext<AppContextValue | null>(null)

const LEGACY_KEYS = [
  "paska-track-cycles",
  "paska-track-active-cycle",
  "paska-track-users",
  "paska-track-current-user",
  "paska-track-auth",
  "paska-track-candidates",
  "paska-track-checklists",
  "paska-track-schedules",
  "paska-track-questions",
  "paska-track-supporting-docs",
  "paska-track-standards",
  "paska-track-ranking-published",
  "paska-track-audit",
  "paska-track-sessions",
  "paska-track-records",
]

try {
  for (const key of LEGACY_KEYS) {
    localStorage.removeItem(key)
  }
} catch {
  // Ignore storage access errors
}

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const DELETED_CANDIDATES_STORAGE_KEY = "paska-deleted-candidate-ids"
const MULTIUSER_SYNC_CHANNEL = "paska-multiuser-sync-v1"

function loadDeletedCandidateIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_CANDIDATES_STORAGE_KEY)
    if (!raw) return new Set<string>()
    const parsed = JSON.parse(raw)
    return new Set<string>(Array.isArray(parsed) ? parsed.filter(Boolean) : [])
  } catch {
    return new Set<string>()
  }
}

function saveDeletedCandidateIds(ids: Iterable<string>): void {
  try {
    localStorage.setItem(
      DELETED_CANDIDATES_STORAGE_KEY,
      JSON.stringify(Array.from(new Set(ids))),
    )
  } catch {}
}

function readActiveCatCandidatesFromStorage(): Candidate[] {
  const activeCandidates: Candidate[] = []
  try {
    if (typeof window === "undefined" || !window.localStorage) return []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith("paska-cat-active-session-")) continue
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw)
      if (parsed?.candidateSnapshot && parsed.candidateSnapshot.id) {
        activeCandidates.push(parsed.candidateSnapshot as Candidate)
      }
    }
  } catch {}
  return activeCandidates
}

function makeAvatar(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "PK"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

const semanticTiuCategories = new Set([
  "Sinonim & Antonim",
  "Analogi Kata",
  "Pemahaman Bacaan",
  "Silogisme",
  "Penalaran Analitis",
])

function questionIdentity(question: CatQuestion): string {
  const correctAnswer = question.options[question.correctIndex] ?? ""
  if (question.type === "tiu" && semanticTiuCategories.has(question.category)) {
    return `${question.type}|${question.category}|${correctAnswer}|${question.explanation}`
      .normalize("NFKC")
      .toLocaleLowerCase()
      .replace(/\s+/g, " ")
      .trim()
  }
  const stem = question.question
    .replace(/^(Pilih jawaban yang tepat\. |Cermati pertanyaan berikut\. |Manakah jawaban yang benar\? |Jawablah pertanyaan ini\. |Dalam pengetahuan umum, |Informasi yang tepat untuk pertanyaan berikut adalah: |Tentukan jawaban yang sesuai\. |Pertanyaan: |Pilih satu jawaban paling tepat\. )/i, "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
  return `${question.type}|${question.category}|${stem}|${correctAnswer.toLocaleLowerCase()}`
}

function mergeWithStandardQuestions(loaded: CatQuestion[] | null | undefined): CatQuestion[] {
  const standardIds = new Set(initialQuestions.map((q) => q.id))
  // Preserve custom user-added questions (e.g. id starting with "q-")
  const customQuestions = (Array.isArray(loaded) ? loaded : []).filter(
    (q) => q && q.id && !standardIds.has(q.id) && !/^(pip|tiu)-\d+$/.test(q.id),
  )
  const seen = new Set<string>()
  return [...customQuestions, ...initialQuestions].filter((question) => {
    const identity = questionIdentity(question)
    if (seen.has(identity)) return false
    seen.add(identity)
    return true
  })
}

const defaultChecklists: Record<number, boolean[]> = {
  0: [false, false, false, false],
  1: [false, false, false, false],
  2: [false, false, false, false],
  3: [false, false, false, false],
  4: [false, false, false, false],
  5: [false, false, false, false],
  6: [false, false, false, false],
  7: [false, false, false, false],
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [cycles, setCycles] = useState<SelectionCycle[]>(() => {
    const loaded = loadStorage<SelectionCycle[]>("paska-clean-cycles", initialCycles)
    const updated = loaded.map((c) =>
      c.id === "cycle-2026-kab" || c.year === 2026 || c.name.includes("2026")
        ? {
            ...c,
            id: c.id === "cycle-2026-kab" ? "cycle-2027-kab" : c.id,
            name: c.name.replace("2026", "2027"),
            year: 2027,
            referenceDate: c.referenceDate ? c.referenceDate.replace("2026", "2027") : "2027-08-17",
          }
        : c,
    )
    try {
      localStorage.setItem("paska-clean-cycles", JSON.stringify(updated))
    } catch {}
    return updated
  })
  const [activeCycleId, setActiveCycleId] = useState<string>(() => {
    const loaded = loadStorage<string>("paska-clean-active-cycle", initialCycles[0].id)
    const nextId = loaded === "cycle-2026-kab" ? "cycle-2027-kab" : loaded
    try {
      localStorage.setItem("paska-clean-active-cycle", JSON.stringify(nextId))
    } catch {}
    return nextId
  })
  const [users, setUsers] = useState<UserProfile[]>(() =>
    loadStorage("paska-clean-users", initialUsers),
  )
  const [currentUserId, setCurrentUserId] = useState<string>(() =>
    loadStorage("paska-clean-current-user", ""),
  )
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("paska-enforce-auth-v1")) {
      try {
        localStorage.setItem("paska-enforce-auth-v1", "true")
        localStorage.setItem("paska-clean-auth", "false")
      } catch {}
      return false
    }
    return loadStorage("paska-clean-auth", false)
  })
  const [allCandidates, setAllCandidates] = useState<Candidate[]>(() => {
    const isFirstSamaptaClean = typeof window !== "undefined" && !localStorage.getItem("paska-samapta-purged-v2")
    if (isFirstSamaptaClean) {
      try {
        localStorage.setItem("paska-samapta-purged-v2", "true")
      } catch {}
    }

    const isIntervalPurgedV7 = typeof window !== "undefined" && !localStorage.getItem("paska-samapta-interval-purged-v7")
    if (isIntervalPurgedV7) {
      try {
        localStorage.setItem("paska-samapta-interval-purged-v7", "true")
      } catch {}
    }

    const isScoreRepairedV8 = typeof window !== "undefined" && !localStorage.getItem("paska-samapta-score-repair-v8")
    if (isScoreRepairedV8) {
      try {
        localStorage.setItem("paska-samapta-score-repair-v8", "true")
      } catch {}
    }

    const isCatAydinFixedV1 = typeof window !== "undefined" && !localStorage.getItem("paska-cat-aydin-fixed-v1")
    if (isCatAydinFixedV1) {
      try {
        localStorage.setItem("paska-cat-aydin-fixed-v1", "true")
      } catch {}
    }

    const deletedIds = loadDeletedCandidateIds()
    const loaded = loadStorage<Candidate[]>("paska-clean-candidates", seededCandidates)
    const baseList = !loaded || loaded.length === 0 ? seededCandidates : loaded
    // Ensure all 13 seeded candidates are present (unless explicitly deleted) and key by ID, NEVER by colliding number
    const candidateMap = new Map<string, Candidate>()
    for (const sc of seededCandidates) {
      if (!deletedIds.has(sc.id)) {
        candidateMap.set(sc.id, sc)
      }
    }
    for (const c of baseList) {
      if (!c) continue
      const seededMatch = seededCandidates.find(
        (sc) => sc.id === c.id || (!c.id && sc.number === c.number),
      )
      const targetId = seededMatch ? seededMatch.id : (c.id || c.number)
      if (!targetId || deletedIds.has(targetId)) continue
      const existing = candidateMap.get(targetId)
      candidateMap.set(targetId, { ...(existing ?? {}), ...c, id: targetId })
    }
    const merged = Array.from(candidateMap.values())
    const sanitizedBase = merged.map((c) => {
      const match = seededCandidates.find((sc) => sc.id === c.id)
      let metrics = Array.isArray(c.physicalMetrics)
        ? c.physicalMetrics
        : (match?.physicalMetrics ?? [])

      // If migrating from previous dummy state, keep only tests actually conducted (e.g. Lari)
      if (isFirstSamaptaClean) {
        metrics = metrics.filter((m) => m.label.toLowerCase().includes("lari"))
      }

      // RESTORASI KONTAMINASI INTERVAL: Jika Lari 12 menit sebelumnya tercemar oleh jarak interval (misal 960m, 640m)
      const runMetric = metrics.find((m) => m.label.toLowerCase().includes("lari"))
      const runMetricDist = runMetric
        ? parseFloat(runMetric.current.replace(/\./g, "").replace(/[^\d.]/g, ""))
        : null

      let candidateFitness = c.fitness ?? match?.fitness ?? null

      if (match && match.physicalMetrics && match.physicalMetrics.length > 0) {
        const seededRunMetric = match.physicalMetrics.find((m) => m.label.toLowerCase().includes("lari"))
        const seededDist = seededRunMetric
          ? parseFloat(seededRunMetric.current.replace(/\./g, "").replace(/[^\d.]/g, ""))
          : null

        // Perbaikan anomali: jika nilai fitness saat ini anomali (< 50) padahal santri memiliki data lari resmi >= 2000m,
        // atau jika terkena kontaminasi riwayat sesi sebelumnya, pulihkan ke nilai resmi standar BPIP.
        const isAnomalousScore =
          candidateFitness !== null &&
          candidateFitness < 50 &&
          ((runMetricDist !== null && runMetricDist >= 2000) || (seededDist !== null && seededDist >= 2000))

        if (
          (seededDist &&
            seededDist >= 2000 &&
            (runMetricDist === null || runMetricDist < 2000 || isIntervalPurgedV7 || isScoreRepairedV8)) ||
          isAnomalousScore
        ) {
          // Pulihkan kembali ke hasil tes resmi Lari 12 Menit yang sah (misal 2.880 m untuk Devga, 2.740 m untuk Alfan, 2.710 m untuk Ihsan)
          metrics = match.physicalMetrics
          if (match.fitness !== undefined && match.fitness !== null) {
            candidateFitness = match.fitness
          } else if (seededDist) {
            candidateFitness = fitnessScore("run", seededDist)
          }
        }
      }

      return {
        ...c,
        // Registration identity comes from the verified roster, even when an older
        // localStorage snapshot still contains stale values. Preserve all training data.
        ...(match
          ? {
              nik: match.nik,
              birthDate: match.birthDate,
              origin: match.origin,
              className: match.className,
              studentNumber: match.studentNumber,
            }
          : {}),
        cycleId: c.cycleId === "cycle-2026-kab" ? "cycle-2027-kab" : (c.cycleId || "cycle-2027-kab"),
        pip: c.pip ?? null,
        tiu: c.tiu ?? null,
        pbb: c.pbb ?? null,
        fitness: candidateFitness,
        personality: c.personality ?? null,
        documents:
          Array.isArray(c.documents) && c.documents.length === 6
            ? match
              ? c.documents.some(Boolean)
                ? c.documents
                : (match.documents ?? [true, true, true, true, true, true])
              : c.documents
            : match?.documents ?? [false, false, false, false, false, false],
        stage: typeof c.stage === "number" ? c.stage : (match ? match.stage : 1),
        stageStatuses:
          Array.isArray(c.stageStatuses) && c.stageStatuses.length === 8
            ? c.stageStatuses
            : match?.stageStatuses ?? ["active", "active", "active", "active", "active", "active", "active", "active"],
        coachNote: c.coachNote ?? match?.coachNote ?? "",
        physicalMetrics: metrics,
        intervalHistory: (Array.isArray(c.intervalHistory)
          ? c.intervalHistory
          : (match?.intervalHistory ?? [])
        ).filter(
          (entry) =>
            Array.isArray(entry.lapSplitsSec) && entry.lapSplitsSec.length > 0,
        ),
      }
    })
    const storedAttempts = loadStorage<CatTryoutAttempt[]>("paska-cat-tryout-attempts", []).filter(
      (attempt) => attempt && !legacyDemoCatAttemptIds.has(attempt.id),
    )
    const storedAudits = loadStorage<AuditLogEntry[]>("paska-clean-audit", initialAuditLogs)
    const storedUsers = loadStorage<UserProfile[]>("paska-clean-users", initialUsers)
    const storedIshResults = loadStorage<IshiharaScreeningResult[]>(
      "paska-clean-ishihara-results",
      [],
    )
    const { candidates: withRecovered } = recoverOrphanedCandidates({
      candidates: sanitizedBase,
      catTryoutAttempts: storedAttempts,
      auditLogs: storedAudits,
      users: storedUsers,
      ishiharaResults: storedIshResults,
      activeCatCandidates: readActiveCatCandidatesFromStorage(),
      activeCycleId: "cycle-2027-kab",
      cycleYear: 2027,
      deletedCandidateIds: deletedIds,
    })
    const sanitized = deduplicateCandidateNumbers(withRecovered, 2027)
    try {
      localStorage.setItem("paska-clean-candidates", JSON.stringify(sanitized))
    } catch {}
    return sanitized
  })
  const [catTryoutAttempts, setCatTryoutAttempts] = useState<CatTryoutAttempt[]>(() =>
    loadStorage<CatTryoutAttempt[]>("paska-cat-tryout-attempts", []).filter(
      (attempt) => !legacyDemoCatAttemptIds.has(attempt.id),
    ),
  )
  const [stageChecklists, setStageChecklists] =
    useState<Record<number, boolean[]>>(() =>
      loadStorage("paska-clean-checklists", defaultChecklists),
    )
  const [schedules, setSchedules] = useState<SelectionSchedule[]>(() =>
    loadStorage("paska-clean-schedules", initialSchedules),
  )
  const [questions, setQuestions] = useState<CatQuestion[]>(() => {
    const loaded = loadStorage<CatQuestion[]>("paska-clean-questions", initialQuestions)
    const merged = mergeWithStandardQuestions(loaded)
    try {
      localStorage.setItem("paska-clean-questions", JSON.stringify(merged))
    } catch {}
    return merged
  })
  const [supportingDocs, setSupportingDocs] = useState<SupportingDoc[]>(() =>
    loadStorage("paska-clean-supporting-docs", initialSupportingDocs),
  )
  const [standardRules, setStandardRules] = useState<StandardRuleItem[]>(() =>
    loadStorage("paska-clean-standards", initialStandardRules),
  )
  const [rankingPublished, setRankingPublishedState] = useState<boolean>(() =>
    loadStorage("paska-clean-ranking-published", true),
  )
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() =>
    loadStorage("paska-clean-audit", initialAuditLogs),
  )

  // Ishihara Screening System State (PRD Version 1.1)
  const defaultIshiharaSessions = useMemo<IshiharaTestSession[]>(() => [
    {
      id: "session-ish-01",
      name: "Skrining Rikkes Tahap 4 — Angkatan 2027 (Gelombang 1)",
      code: "ISH-2027-01",
      mode: "scheduled",
      protocolVersion: "BPIP-ISH-24-V1",
      startsAt: "2026-10-22T08:00:00Z",
      endsAt: "2026-10-22T17:00:00Z",
      status: "open",
      maxAttempts: 1,
      allowResume: true,
      resultVisibility: "staff_only",
      operatorName: "dr. Hendra (Tim Medis)",
      secondsPerPlate: 5,
      plateCount: 24,
      assignments: seededCandidates.map((c) => ({
        id: `asg-${c.id}`,
        sessionId: "session-ish-01",
        participantId: c.id,
        participantName: c.name,
        participantNumber: c.number,
        school: c.school,
        assignedBy: "Coach Andi",
        status: "assigned",
        assignedAt: "2026-10-20T08:00:00Z",
      })),
      createdBy: "Coach Andi",
      createdAt: "2026-10-20T08:00:00Z",
    },
    {
      id: "session-ish-02",
      name: "Uji Mandiri Penglihatan Warna (Tautan Terbatas)",
      code: "ISH-SELF-2027",
      mode: "self_service",
      protocolVersion: "BPIP-ISH-10-V1",
      startsAt: "2026-10-22T00:00:00Z",
      endsAt: "2026-10-25T23:59:59Z",
      status: "published",
      maxAttempts: 2,
      allowResume: true,
      resultVisibility: "participant_and_staff",
      secondsPerPlate: 5,
      plateCount: 10,
      shareableToken: "ish-token-self-muallimin-2027",
      assignments: seededCandidates.slice(0, 5).map((c) => ({
        id: `asg-self-${c.id}`,
        sessionId: "session-ish-02",
        participantId: c.id,
        participantName: c.name,
        participantNumber: c.number,
        school: c.school,
        assignedBy: "Coach Andi",
        status: "assigned",
        assignedAt: "2026-10-21T09:00:00Z",
      })),
      createdBy: "Coach Andi",
      createdAt: "2026-10-21T09:00:00Z",
    },
  ], [])

  const [ishiharaSessions, setIshiharaSessions] = useState<IshiharaTestSession[]>(() =>
    loadStorage("paska-clean-ishihara-sessions", defaultIshiharaSessions),
  )
  const [ishiharaAllowlist, setIshiharaAllowlist] = useState<AuthorizedAccount[]>(() =>
    loadStorage("paska-clean-ishihara-allowlist", initialAuthorizedAccounts),
  )
  const [ishiharaResults, setIshiharaResults] = useState<IshiharaScreeningResult[]>(() =>
    loadStorage("paska-clean-ishihara-results", []),
  )
  const [sessions, setSessionsRaw] = useState<Session[]>(() => {
    const loaded = loadStorage<Session[]>("paska-clean-sessions", initialSessions)
    if (!loaded || loaded.length === 0) return initialSessions
    return loaded
  })
  const [records, setRecordsRaw] = useState<Record<string, SessionRecord>>(() => {
    const loaded = loadStorage<Record<string, SessionRecord>>(
      "paska-clean-records",
      initialRecords,
    )
    if (!loaded || Object.keys(loaded).length === 0) return initialRecords
    return loaded
  })
  const setSessions = useCallback(
    (action: SetStateAction<Session[]>) => {
      setSessionsRaw((prev) => {
        const next = typeof action === "function" ? action(prev) : action
        stateRef.current = { ...stateRef.current, sessions: next }
        return next
      })
    },
    [],
  )
  const setRecords = useCallback(
    (action: SetStateAction<Record<string, SessionRecord>>) => {
      setRecordsRaw((prev) => {
        const next = typeof action === "function" ? action(prev) : action
        stateRef.current = { ...stateRef.current, records: next }
        return next
      })
    },
    [],
  )
  const [googleSheetUrl, setGoogleSheetUrlState] = useState<string>(() =>
    getSavedGasUrl(),
  )
  const [autoSyncGoogleSheet, setAutoSyncGoogleSheetState] = useState<boolean>(
    () => getAutoSyncEnabled(),
  )
  const [cloudSyncStatus, setCloudSyncStatus] = useState<
    "idle" | "syncing" | "pulling" | "synced" | "error"
  >("idle")
  const [lastCloudSync, setLastCloudSync] = useState<string | null>(() =>
    getLastSyncTime(),
  )
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local")

  const currentUser = useMemo(() => {
    const found = users.find((u) => u.id === currentUserId)
    if (found) return found

    // Jika user aktif adalah sesi kandidat/santri, cari atau rekonstruksi langsung dari allCandidates
    if (currentUserId && currentUserId.startsWith("user-cand-")) {
      const candidateId = currentUserId.replace("user-cand-", "")
      const cand = allCandidates.find(
        (c) => c.id === candidateId || `user-cand-${c.id}` === currentUserId,
      )
      if (cand) {
        return {
          id: currentUserId,
          name: cand.name,
          email: `${cand.number.toLowerCase()}@paskibraka.internal`,
          role: "candidate" as const,
          avatar: cand.avatar || cand.name.slice(0, 2).toUpperCase(),
          title: `Peserta No. ${cand.number}`,
          active: true,
          candidateId: cand.id,
        }
      }
    }

    // Fallback aman ke pelatih/admin resmi, jangan pernah jatuh ke kandidat sembarang
    return (
      users.find((u) => u.role === "admin" || u.role === "coach") ??
      users[0] ??
      initialUsers[0]
    )
  }, [users, currentUserId, allCandidates])

  const activeCycle = useMemo<SelectionCycle>(
    () =>
      cycles.find((c) => c.id === activeCycleId) ??
      cycles[0] ?? {
        id: "cycle-empty",
        name: "Belum ada periode",
        year: 2027,
        level: "Kabupaten/Kota",
        referenceDate: "2027-08-17",
        status: "draft",
      },
    [cycles, activeCycleId],
  )

  const candidates = useMemo(() => {
    const list = allCandidates.length > 0 ? allCandidates : seededCandidates
    const filtered = list.filter(
      (c) =>
        !c.cycleId ||
        c.cycleId === activeCycle.id ||
        c.cycleId === "cycle-2027-kab" ||
        c.cycleId === "cycle-2026-kab",
    )
    return filtered.length > 0 ? filtered : list
  }, [allCandidates, activeCycle.id])

  const deletedCandidateIdsRef = useRef<Set<string>>(loadDeletedCandidateIds())
  const syncChannelRef = useRef<BroadcastChannel | null>(null)

  const broadcastStateSync = useCallback((source: string) => {
    try {
      syncChannelRef.current?.postMessage({
        type: "STATE_UPDATED",
        source,
        timestamp: Date.now(),
      })
    } catch {}
  }, [])

  // Auto-recovery: if allCandidates is somehow cleared, immediately restore all 13 candidates + any orphaned candidates
  useEffect(() => {
    if (allCandidates.length === 0) {
      const restoredSeeded = seededCandidates.map((c) => ({
        ...c,
        cycleId: activeCycle.id || "cycle-2027-kab",
      }))
      const { candidates: withOrphans } = recoverOrphanedCandidates({
        candidates: restoredSeeded,
        catTryoutAttempts,
        auditLogs,
        users,
        ishiharaResults,
        activeCatCandidates: readActiveCatCandidatesFromStorage(),
        activeCycleId: activeCycle.id || "cycle-2027-kab",
        cycleYear: activeCycle.year || 2027,
        deletedCandidateIds: deletedCandidateIdsRef.current,
      })
      setAllCandidates(withOrphans)
    }
  }, [
    allCandidates.length,
    activeCycle.id,
    activeCycle.year,
    catTryoutAttempts,
    auditLogs,
    users,
    ishiharaResults,
  ])

  // Self-healing guard for logged-in candidate (User C): if currentUser is a candidate whose profile is missing from allCandidates, restore immediately
  useEffect(() => {
    if (
      currentUser.role === "candidate" &&
      currentUser.candidateId &&
      !deletedCandidateIdsRef.current.has(currentUser.candidateId) &&
      !allCandidates.some((c) => c.id === currentUser.candidateId)
    ) {
      const { candidates: healed, recoveredCount } = recoverOrphanedCandidates({
        candidates: allCandidates,
        catTryoutAttempts,
        auditLogs,
        users,
        ishiharaResults,
        activeCatCandidates: readActiveCatCandidatesFromStorage(),
        activeCycleId: activeCycle.id || "cycle-2027-kab",
        cycleYear: activeCycle.year || 2027,
        deletedCandidateIds: deletedCandidateIdsRef.current,
      })
      if (recoveredCount > 0) {
        stateRef.current = { ...stateRef.current, allCandidates: healed }
        setAllCandidates(healed)
      }
    }
  }, [
    currentUser.role,
    currentUser.candidateId,
    allCandidates,
    catTryoutAttempts,
    auditLogs,
    users,
    ishiharaResults,
    activeCycle.id,
    activeCycle.year,
  ])

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem("paska-clean-cycles", JSON.stringify(cycles))
  }, [cycles])

  useEffect(() => {
    localStorage.setItem(
      "paska-clean-active-cycle",
      JSON.stringify(activeCycleId),
    )
  }, [activeCycleId])

  useEffect(() => {
    localStorage.setItem("paska-clean-users", JSON.stringify(users))
  }, [users])

  useEffect(() => {
    localStorage.setItem(
      "paska-clean-current-user",
      JSON.stringify(currentUserId),
    )
  }, [currentUserId])

  useEffect(() => {
    localStorage.setItem("paska-clean-auth", JSON.stringify(isAuthenticated))
  }, [isAuthenticated])

  useEffect(() => {
    // Non-destructive cross-tab storage write: never overwrite candidates added by another tab!
    const storedCandidates = loadStorage<Candidate[]>("paska-clean-candidates", [])
    const currentIds = new Set(allCandidates.map((c) => c.id))
    const hasMissingFromStorage = storedCandidates.some(
      (sc) =>
        sc &&
        sc.id &&
        !currentIds.has(sc.id) &&
        !deletedCandidateIdsRef.current.has(sc.id),
    )
    if (hasMissingFromStorage) {
      const { candidates: merged } = mergeCandidatesList({
        localCandidates: allCandidates,
        storageCandidates: storedCandidates,
        catTryoutAttempts: stateRef.current.catTryoutAttempts,
        auditLogs: stateRef.current.auditLogs,
        users: stateRef.current.users,
        ishiharaResults: stateRef.current.ishiharaResults,
        activeCatCandidates: readActiveCatCandidatesFromStorage(),
        activeCycleId: activeCycle.id || "cycle-2027-kab",
        cycleYear: activeCycle.year || 2027,
        deletedCandidateIds: deletedCandidateIdsRef.current,
      })
      localStorage.setItem("paska-clean-candidates", JSON.stringify(merged))
      if (merged.length !== allCandidates.length) {
        stateRef.current = { ...stateRef.current, allCandidates: merged }
        setAllCandidates(merged)
      }
      return
    }
    localStorage.setItem(
      "paska-clean-candidates",
      JSON.stringify(allCandidates),
    )
  }, [allCandidates, activeCycle.id, activeCycle.year])

  useEffect(() => {
    const storedAttempts = loadStorage<CatTryoutAttempt[]>(
      "paska-cat-tryout-attempts",
      [],
    )
    const currentAttemptIds = new Set(catTryoutAttempts.map((a) => a.id))
    const hasMissingAttemptFromStorage = storedAttempts.some(
      (sa) =>
        sa &&
        sa.id &&
        !legacyDemoCatAttemptIds.has(sa.id) &&
        !currentAttemptIds.has(sa.id),
    )
    if (hasMissingAttemptFromStorage) {
      const mergedAttempts = mergeCatAttempts(
        catTryoutAttempts,
        [],
        storedAttempts,
      )
      localStorage.setItem(
        "paska-cat-tryout-attempts",
        JSON.stringify(mergedAttempts),
      )
      if (mergedAttempts.length !== catTryoutAttempts.length) {
        stateRef.current = {
          ...stateRef.current,
          catTryoutAttempts: mergedAttempts,
        }
        setCatTryoutAttempts(mergedAttempts)
      }
      return
    }
    localStorage.setItem(
      "paska-cat-tryout-attempts",
      JSON.stringify(catTryoutAttempts),
    )
  }, [catTryoutAttempts])

  // Real-time Cross-Tab Synchronization (storage event + BroadcastChannel)
  useEffect(() => {
    const syncFromLocalStorage = () => {
      deletedCandidateIdsRef.current = loadDeletedCandidateIds()
      const storedCandidates = loadStorage<Candidate[]>(
        "paska-clean-candidates",
        [],
      )
      const storedAttempts = loadStorage<CatTryoutAttempt[]>(
        "paska-cat-tryout-attempts",
        [],
      )
      const s = stateRef.current
      const mergedAttempts = mergeCatAttempts(
        s.catTryoutAttempts,
        [],
        storedAttempts,
      )
      const { candidates: mergedCandidates } = mergeCandidatesList({
        localCandidates: s.allCandidates,
        storageCandidates: storedCandidates,
        catTryoutAttempts: mergedAttempts,
        auditLogs: s.auditLogs,
        users: s.users,
        ishiharaResults: s.ishiharaResults,
        activeCatCandidates: readActiveCatCandidatesFromStorage(),
        activeCycleId: s.activeCycleId || "cycle-2027-kab",
        cycleYear: 2027,
        deletedCandidateIds: deletedCandidateIdsRef.current,
      })

      if (
        JSON.stringify(mergedAttempts) !== JSON.stringify(s.catTryoutAttempts)
      ) {
        stateRef.current = {
          ...stateRef.current,
          catTryoutAttempts: mergedAttempts,
        }
        setCatTryoutAttempts(mergedAttempts)
      }
      if (
        JSON.stringify(mergedCandidates) !== JSON.stringify(s.allCandidates)
      ) {
        stateRef.current = {
          ...stateRef.current,
          allCandidates: mergedCandidates,
        }
        setAllCandidates(mergedCandidates)
      }
    }

    const handleStorageEvent = (e: StorageEvent) => {
      if (
        !e.key ||
        e.key === "paska-clean-candidates" ||
        e.key === "paska-cat-tryout-attempts" ||
        e.key === DELETED_CANDIDATES_STORAGE_KEY ||
        e.key.startsWith("paska-cat-active-session-")
      ) {
        syncFromLocalStorage()
      }
    }

    window.addEventListener("storage", handleStorageEvent)

    let channel: BroadcastChannel | null = null
    if (typeof BroadcastChannel !== "undefined") {
      try {
        channel = new BroadcastChannel(MULTIUSER_SYNC_CHANNEL)
        syncChannelRef.current = channel
        channel.onmessage = () => {
          syncFromLocalStorage()
        }
      } catch {}
    }

    return () => {
      window.removeEventListener("storage", handleStorageEvent)
      try {
        channel?.close()
      } catch {}
      syncChannelRef.current = null
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      "paska-clean-checklists",
      JSON.stringify(stageChecklists),
    )
  }, [stageChecklists])

  useEffect(() => {
    localStorage.setItem("paska-clean-schedules", JSON.stringify(schedules))
  }, [schedules])

  useEffect(() => {
    localStorage.setItem("paska-clean-questions", JSON.stringify(questions))
  }, [questions])

  useEffect(() => {
    localStorage.setItem(
      "paska-clean-supporting-docs",
      JSON.stringify(supportingDocs),
    )
  }, [supportingDocs])

  useEffect(() => {
    localStorage.setItem("paska-clean-standards", JSON.stringify(standardRules))
  }, [standardRules])

  useEffect(() => {
    localStorage.setItem(
      "paska-clean-ranking-published",
      JSON.stringify(rankingPublished),
    )
  }, [rankingPublished])

  useEffect(() => {
    localStorage.setItem("paska-clean-audit", JSON.stringify(auditLogs))
  }, [auditLogs])

  useEffect(() => {
    localStorage.setItem("paska-clean-sessions", JSON.stringify(sessions))
  }, [sessions])

  useEffect(() => {
    localStorage.setItem("paska-clean-records", JSON.stringify(records))
  }, [records])

  useEffect(() => {
    localStorage.setItem(
      "paska-clean-ishihara-sessions",
      JSON.stringify(ishiharaSessions),
    )
  }, [ishiharaSessions])

  useEffect(() => {
    localStorage.setItem(
      "paska-clean-ishihara-allowlist",
      JSON.stringify(ishiharaAllowlist),
    )
  }, [ishiharaAllowlist])

  useEffect(() => {
    localStorage.setItem(
      "paska-clean-ishihara-results",
      JSON.stringify(ishiharaResults),
    )
  }, [ishiharaResults])

  const showToast = useCallback(
    (
      message: string,
      tone: "success" | "warning" | "danger" | "info" = "success",
    ) => {
      const id = Date.now()
      setToast({ id, message, tone })
      window.setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current))
      }, 3600)
    },
    [],
  )

  const clearToast = useCallback(() => setToast(null), [])

  const lastSyncedHash = useRef<string>("")
  const isSyncingRef = useRef<boolean>(false)
  const isSavingRef = useRef<boolean>(false)
  const saveQueueRef = useRef<Partial<AppDatabaseState> | null>(null)
  const saveDebounceTimerRef = useRef<number | null>(null)
  const pendingSaveOverrideRef = useRef<Partial<AppDatabaseState>>({})
  const initialMountDone = useRef<boolean>(false)

  const stateRef = useRef({
    allCandidates,
    catTryoutAttempts,
    cycles,
    activeCycleId,
    currentUserId,
    sessions,
    records,
    schedules,
    questions,
    supportingDocs,
    standardRules,
    stageChecklists,
    users,
    auditLogs,
    rankingPublished,
    ishiharaSessions,
    ishiharaAllowlist,
    ishiharaResults,
  })
  stateRef.current = {
    allCandidates,
    catTryoutAttempts,
    cycles,
    activeCycleId,
    currentUserId,
    sessions,
    records,
    schedules,
    questions,
    supportingDocs,
    standardRules,
    stageChecklists,
    users,
    auditLogs,
    rankingPublished,
    ishiharaSessions,
    ishiharaAllowlist,
    ishiharaResults,
  }

  const computeDataHash = useCallback(() => {
    const s = stateRef.current
    return JSON.stringify({
      c: s.allCandidates,
      cat: s.catTryoutAttempts,
      s: s.sessions,
      r: s.records,
      sch: s.schedules,
      q: s.questions,
      d: s.supportingDocs,
      st: s.standardRules,
      ch: s.stageChecklists,
      ish: s.ishiharaSessions || [],
      alw: s.ishiharaAllowlist || [],
      res: s.ishiharaResults || [],
    })
  }, [])

  const executePushToCloud = useCallback(
    async (
      override?: Partial<AppDatabaseState>,
    ): Promise<{ ok: boolean, message: string }> => {
      const targetUrl = googleSheetUrl.trim()
      if (!targetUrl) {
        return { ok: false, message: "URL Google Apps Script belum diatur." }
      }

      if (isSavingRef.current) {
        const prevQueue = saveQueueRef.current || {}
        const mergedQueuedCandidates =
          prevQueue.candidates && override?.candidates
            ? mergeCandidatesList({
                localCandidates: override.candidates,
                storageCandidates: prevQueue.candidates,
                deletedCandidateIds: deletedCandidateIdsRef.current,
              }).candidates
            : (override?.candidates ?? prevQueue.candidates)
        saveQueueRef.current = {
          ...prevQueue,
          ...(override || {}),
          ...(mergedQueuedCandidates ? { candidates: mergedQueuedCandidates } : {}),
        }
        return { ok: true, message: "Perubahan dijadwalkan untuk disimpan" }
      }

      isSavingRef.current = true
      setCloudSyncStatus("syncing")

      try {
        // 1. ATOMIC PULL-BEFORE-PUSH: Tarik state cloud terbaru terlebih dahulu agar perubahan dari pengguna/perangkat lain (misal User B menambah kandidat baru saat User A sedang ujian CAT) TIDAK PERNAH tertimpa!
        let cloudData: Partial<AppDatabaseState> | null = null
        try {
          const pullRes = await pullStateFromGoogleSheet(targetUrl)
          if (pullRes.ok && pullRes.data) {
            cloudData = pullRes.data
          }
        } catch {
          // Jika jaringan gagal saat pre-pull, tetap lanjutkan dengan merge localStorage
        }

        // 2. PENTING: Baca stateRef.current dan localStorage SETELAH await pullStateFromGoogleSheet selesai agar mutasi lokal yang terjadi selama request jaringan tidak hilang!
        const s = stateRef.current
        deletedCandidateIdsRef.current = loadDeletedCandidateIds()
        const storageCandidates = loadStorage<Candidate[]>(
          "paska-clean-candidates",
          [],
        )
        const storageAttempts = loadStorage<CatTryoutAttempt[]>(
          "paska-cat-tryout-attempts",
          [],
        )
        const activeCatCandidates = readActiveCatCandidatesFromStorage()

        const combinedLocalCandidates = override?.candidates
          ? mergeCandidatesList({
              localCandidates: override.candidates,
              storageCandidates: s.allCandidates,
              catTryoutAttempts:
                override?.catTryoutAttempts ?? s.catTryoutAttempts,
              activeCatCandidates,
              activeCycleId: override?.activeCycleId ?? s.activeCycleId,
              deletedCandidateIds: deletedCandidateIdsRef.current,
            }).candidates
          : s.allCandidates

        const localSnapshot: AppDatabaseState = {
          candidates: combinedLocalCandidates,
          catTryoutAttempts: override?.catTryoutAttempts ?? s.catTryoutAttempts,
          cycles: override?.cycles ?? s.cycles,
          activeCycleId: override?.activeCycleId ?? s.activeCycleId,
          sessions: override?.sessions ?? s.sessions,
          records: override?.records ?? s.records,
          schedules: override?.schedules ?? s.schedules,
          questions: override?.questions ?? s.questions,
          supportingDocs: override?.supportingDocs ?? s.supportingDocs,
          standardRules: override?.standardRules ?? s.standardRules,
          stageChecklists: override?.stageChecklists ?? s.stageChecklists,
          users: override?.users ?? s.users,
          auditLogs: override?.auditLogs ?? s.auditLogs,
          rankingPublished: override?.rankingPublished ?? s.rankingPublished,
          ishiharaSessions: override?.ishiharaSessions ?? s.ishiharaSessions,
          ishiharaAllowlist: override?.ishiharaAllowlist ?? s.ishiharaAllowlist,
          ishiharaResults: override?.ishiharaResults ?? s.ishiharaResults,
          deletedCandidateIds: Array.from(deletedCandidateIdsRef.current),
        }

        const { mergedState } = mergeDatabaseStates({
          localState: localSnapshot,
          cloudState: cloudData,
          storageCandidates,
          storageAttempts,
          activeCatCandidates,
          deletedCandidateIds: deletedCandidateIdsRef.current,
          currentUserId: s.currentUserId,
        })

        if (Array.isArray(mergedState.deletedCandidateIds)) {
          deletedCandidateIdsRef.current = new Set(
            mergedState.deletedCandidateIds,
          )
          saveDeletedCandidateIds(deletedCandidateIdsRef.current)
        }

        // Sinkronkan kembali hasil merge ke memori, React state, dan localStorage
        stateRef.current = {
          ...stateRef.current,
          allCandidates: mergedState.candidates,
          catTryoutAttempts: mergedState.catTryoutAttempts || [],
          sessions: mergedState.sessions || [],
          records: mergedState.records || {},
          schedules: mergedState.schedules || [],
          auditLogs: mergedState.auditLogs || [],
          ishiharaSessions: mergedState.ishiharaSessions || [],
          ishiharaResults: mergedState.ishiharaResults || [],
        }
        setAllCandidates(mergedState.candidates)
        if (mergedState.catTryoutAttempts) {
          setCatTryoutAttempts(mergedState.catTryoutAttempts)
        }
        if (mergedState.sessions) {
          setSessions(mergedState.sessions)
        }
        if (mergedState.records) {
          setRecords(mergedState.records)
        }
        try {
          localStorage.setItem(
            "paska-clean-candidates",
            JSON.stringify(mergedState.candidates),
          )
          if (mergedState.catTryoutAttempts) {
            localStorage.setItem(
              "paska-cat-tryout-attempts",
              JSON.stringify(mergedState.catTryoutAttempts),
            )
          }
        } catch {}
        broadcastStateSync("executePushToCloud")

        const stateToPush: AppDatabaseState = {
          ...mergedState,
          users: (mergedState.users || []).filter(
            (u) => u.role !== "candidate",
          ),
        }

        const res = await pushStateToGoogleSheet(stateToPush, targetUrl)
        if (res.ok) {
          lastSyncedHash.current = JSON.stringify({
            c: stateToPush.candidates,
            cat: stateToPush.catTryoutAttempts,
            s: stateToPush.sessions,
            r: stateToPush.records,
            sch: stateToPush.schedules,
            q: stateToPush.questions,
            d: stateToPush.supportingDocs,
            st: stateToPush.standardRules,
            ch: stateToPush.stageChecklists,
            ish: stateToPush.ishiharaSessions || [],
            alw: stateToPush.ishiharaAllowlist || [],
            res: stateToPush.ishiharaResults || [],
          })
          setCloudSyncStatus("synced")
          setLastCloudSync(new Date().toISOString())
        } else {
          setCloudSyncStatus("error")
        }
        return res
      } catch (err) {
        setCloudSyncStatus("error")
        return {
          ok: false,
          message: err instanceof Error ? err.message : String(err),
        }
      } finally {
        isSavingRef.current = false
        if (saveQueueRef.current) {
          const nextOverride = saveQueueRef.current
          saveQueueRef.current = null
          void executePushToCloud(nextOverride)
        }
      }
    },
    [googleSheetUrl, broadcastStateSync, setSessions, setRecords],
  )

  const saveToCloud = useCallback(
    (
      override?: Partial<AppDatabaseState>,
      immediate: boolean = false,
    ): Promise<{ ok: boolean, message: string }> => {
      if (override) {
        pendingSaveOverrideRef.current = {
          ...pendingSaveOverrideRef.current,
          ...override,
        }
      }
      if (saveDebounceTimerRef.current) {
        window.clearTimeout(saveDebounceTimerRef.current)
      }
      if (immediate) {
        const toSave = { ...pendingSaveOverrideRef.current }
        pendingSaveOverrideRef.current = {}
        return executePushToCloud(toSave)
      }
      return new Promise((resolve) => {
        saveDebounceTimerRef.current = window.setTimeout(async () => {
          const toSave = { ...pendingSaveOverrideRef.current }
          pendingSaveOverrideRef.current = {}
          const res = await executePushToCloud(toSave)
          resolve(res)
        }, 350)
      })
    },
    [executePushToCloud],
  )

  useEffect(() => {
    const currentQuestions = stateRef.current.questions
    const migratedQuestions = mergeWithStandardQuestions(currentQuestions)
    if (JSON.stringify(currentQuestions) === JSON.stringify(migratedQuestions)) return
    stateRef.current = { ...stateRef.current, questions: migratedQuestions }
    setQuestions(migratedQuestions)
    try {
      localStorage.setItem("paska-clean-questions", JSON.stringify(migratedQuestions))
    } catch {}
    void saveToCloud({ questions: migratedQuestions })
  }, [saveToCloud, standardQuestionSetVersion])

  const saveCatTryoutAttempt = useCallback(
    (attempt: CatTryoutAttempt) => {
      const nowIso = new Date().toISOString()
      const storedAttempts = loadStorage<CatTryoutAttempt[]>(
        "paska-cat-tryout-attempts",
        [],
      )
      const updatedAttempts = mergeCatAttempts(
        [attempt, ...stateRef.current.catTryoutAttempts],
        [],
        storedAttempts,
      )

      // Sinkronkan langsung ke kandidat terkait jika bukan simulasi mandiri pelatih,
      // serta gabungkan dengan kandidat terbaru di localStorage & sesi aktif agar tidak pernah menimpa kandidat baru dari pengguna lain!
      const candId = attempt.candidateId
      const storedCandidates = loadStorage<Candidate[]>(
        "paska-clean-candidates",
        [],
      )
      const { candidates: baseCandidates } = mergeCandidatesList({
        localCandidates: stateRef.current.allCandidates,
        storageCandidates: storedCandidates,
        catTryoutAttempts: updatedAttempts,
        auditLogs: stateRef.current.auditLogs,
        users: stateRef.current.users,
        ishiharaResults: stateRef.current.ishiharaResults,
        activeCatCandidates: readActiveCatCandidatesFromStorage(),
        activeCycleId: stateRef.current.activeCycleId || "cycle-2027-kab",
        cycleYear: 2027,
        deletedCandidateIds: deletedCandidateIdsRef.current,
      })

      let updatedCandidates = baseCandidates
      if (
        candId &&
        candId !== "coach-self" &&
        updatedCandidates.some((c) => c.id === candId)
      ) {
        updatedCandidates = updatedCandidates.map((c) => {
          if (c.id !== candId) return c
          const stageStatuses: StageStatus[] = [
            ...(c.stageStatuses ?? Array<StageStatus>(8).fill("locked")),
          ]
          const hasPipAttempt =
            (attempt.pipAnswers && Object.keys(attempt.pipAnswers).length > 0) ||
            (typeof attempt.pipScore === "number" && attempt.pipScore > 0)
          const hasTiuAttempt =
            (attempt.tiuAnswers && Object.keys(attempt.tiuAnswers).length > 0) ||
            (typeof attempt.tiuScoreScaled === "number" && attempt.tiuScoreScaled > 0)

          if (hasPipAttempt && attempt.pipStatus) stageStatuses[1] = attempt.pipStatus
          if (hasTiuAttempt && attempt.tiuStatus) stageStatuses[2] = attempt.tiuStatus

          return {
            ...c,
            pip: hasPipAttempt ? attempt.pipScore : (c.pip ?? attempt.pipScore),
            tiu: hasTiuAttempt ? attempt.tiuScoreScaled : (c.tiu ?? attempt.tiuScoreScaled),
            stageStatuses,
            updatedAt: "Baru saja",
            updatedAtIso: nowIso,
          }
        })
      }
      setAllCandidates(updatedCandidates)

      // Sinkronkan juga otomatis ke sesi evaluasi lapangan (SimulationCenter) jika ada sesi CAT terkait
      let updatedRecords = { ...stateRef.current.records }
      let recordsModified = false
      if (candId && candId !== "coach-self") {
        const hasPipAttempt =
          (attempt.pipAnswers && Object.keys(attempt.pipAnswers).length > 0) ||
          (typeof attempt.pipScore === "number" && attempt.pipScore > 0)
        const hasTiuAttempt =
          (attempt.tiuAnswers && Object.keys(attempt.tiuAnswers).length > 0) ||
          (typeof attempt.tiuScoreScaled === "number" && attempt.tiuScoreScaled > 0)

        for (const sess of stateRef.current.sessions) {
          if (["cat", "pip", "tiu"].includes(sess.type) && sess.participantIds.includes(candId)) {
            // Jangan override sesi jika sesi spesifik tidak dikerjakan dalam attempt ini
            if (sess.type === "tiu" && !hasTiuAttempt) continue
            if (sess.type === "pip" && !hasPipAttempt) continue

            const recKey = `${sess.id}:${candId}`
            const oldRec = updatedRecords[recKey]
            const scoreVal = sess.type === "pip"
              ? attempt.pipScore
              : sess.type === "tiu"
              ? attempt.tiuScoreScaled
              : (attempt.combinedScore ?? Math.round(((attempt.pipScore ?? 0) + (attempt.tiuScoreScaled ?? 0)) / 2))

            const isPassed = sess.type === "pip"
              ? attempt.pipStatus === "passed"
              : sess.type === "tiu"
              ? attempt.tiuStatus === "passed"
              : (attempt.pipStatus === "passed" && attempt.tiuStatus === "passed")

            updatedRecords[recKey] = {
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
                pipScore: String(attempt.pipScore ?? ""),
                tiuScore: String(attempt.tiuScoreScaled ?? ""),
                duration: "PIP 45m · TIU 30m",
                tryoutAttemptId: attempt.id,
              },
              savedAt: attempt.finalizedAt || nowIso,
            }
            recordsModified = true
          }
        }
      }
      if (recordsModified) {
        setRecords(updatedRecords)
        try {
          localStorage.setItem("paska-clean-records", JSON.stringify(updatedRecords))
        } catch {}
      }

      stateRef.current = {
        ...stateRef.current,
        catTryoutAttempts: updatedAttempts,
        allCandidates: updatedCandidates,
        ...(recordsModified ? { records: updatedRecords } : {}),
      }
      setCatTryoutAttempts(updatedAttempts)

      try {
        localStorage.setItem(
          "paska-cat-tryout-attempts",
          JSON.stringify(updatedAttempts),
        )
        localStorage.setItem(
          "paska-clean-candidates",
          JSON.stringify(updatedCandidates),
        )
      } catch {}
      broadcastStateSync("saveCatTryoutAttempt")

      // Push instan (immediate) ke cloud tanpa menunggu debounce agar tersimpan langsung di Google Sheet
      void saveToCloud(
        {
          catTryoutAttempts: updatedAttempts,
          candidates: updatedCandidates,
          ...(recordsModified ? { records: updatedRecords } : {}),
        },
        true,
      )
    },
    [saveToCloud, setRecords, broadcastStateSync],
  )

  const logAudit = useCallback(
    (action: string, target: string, detail: string) => {
      const now = new Date()
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      const entry: AuditLogEntry = {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp,
        actor: currentUser.name,
        role: currentUser.role,
        action,
        target,
        detail,
      }
      setAuditLogs((prev) => [entry, ...prev.slice(0, 199)])
    },
    [currentUser.name, currentUser.role],
  )

  const deleteCatTryoutAttempt = useCallback(
    (attemptId: string) => {
      if (currentUser.role !== "admin" && currentUser.role !== "coach") {
        showToast("Hanya admin atau pelatih yang dapat menghapus hasil CAT.", "warning")
        return
      }
      const existing = stateRef.current.catTryoutAttempts.find((item) => item.id === attemptId)
      if (!existing) return
      const nextAttempts = stateRef.current.catTryoutAttempts.filter((item) => item.id !== attemptId)
      const latestRemaining = nextAttempts
        .filter((item) => item.candidateId === existing.candidateId)
        .sort((a, b) => b.finalizedAt.localeCompare(a.finalizedAt))[0]
      const nextCandidates = stateRef.current.allCandidates.map((candidate) => {
        if (candidate.id !== existing.candidateId) return candidate
        const stageStatuses: StageStatus[] = [
          ...(candidate.stageStatuses ?? Array<StageStatus>(8).fill("locked")),
        ]
        stageStatuses[1] = latestRemaining?.pipStatus ?? "locked"
        stageStatuses[2] = latestRemaining?.tiuStatus ?? "locked"
        return {
          ...candidate,
          pip: latestRemaining?.pipScore ?? null,
          tiu: latestRemaining?.tiuScoreScaled ?? null,
          stageStatuses,
          updatedAt: "Baru saja",
        }
      })
      stateRef.current = {
        ...stateRef.current,
        catTryoutAttempts: nextAttempts,
        allCandidates: nextCandidates,
      }
      setCatTryoutAttempts(nextAttempts)
      setAllCandidates(nextCandidates)
      logAudit(
        "Hapus Hasil CAT",
        existing.candidateName,
        `Menghapus percobaan ${existing.attemptNumber} (${existing.packageName}) pada ${existing.finalizedAt}`,
      )
      saveToCloud({ catTryoutAttempts: nextAttempts, candidates: nextCandidates })
      showToast("Riwayat CAT dihapus dan nilai terakhir diperbarui.", "warning")
    },
    [currentUser.role, logAudit, saveToCloud, showToast],
  )

  // Cycle actions
  const addCycle = useCallback(
    (cycle: Omit<SelectionCycle, "id">) => {
      const next: SelectionCycle = {
        ...cycle,
        id: `cycle-${Date.now()}`,
      }
      const nextCycles = [...cycles, next]
      setCycles(nextCycles)
      setActiveCycleId(next.id)
      logAudit(
        "CREATE_CYCLE",
        next.name,
        `Membuat periode ${next.name} (${next.level})`,
      )
      showToast(`Periode "${next.name}" berhasil dibuat & diaktifkan.`)
      saveToCloud({ cycles: nextCycles, activeCycleId: next.id })
    },
    [cycles, logAudit, showToast, saveToCloud],
  )

  const updateCycle = useCallback(
    (id: string, patch: Partial<SelectionCycle>) => {
      const nextCycles = stateRef.current.cycles.map((c) => (c.id === id ? { ...c, ...patch } : c))
      setCycles(nextCycles)
      logAudit("UPDATE_CYCLE", id, "Memperbarui konfigurasi periode seleksi")
      showToast("Periode seleksi berhasil diperbarui.")
      saveToCloud({ cycles: nextCycles })
    },
    [logAudit, showToast, saveToCloud],
  )

  const deleteCycle = useCallback(
    (id: string) => {
      const target = cycles.find((c) => c.id === id)
      if (!target) return
      const remainingCycles = cycles.filter((c) => c.id !== id)
      let remainingCandidates = allCandidates.filter((c) => c.cycleId !== id)
      if (remainingCandidates.length === 0) {
        remainingCandidates = seededCandidates.map((c) => ({
          ...c,
          cycleId: remainingCycles[0]?.id ?? "cycle-2027-kab",
        }))
      }
      setCycles(remainingCycles)
      setAllCandidates(remainingCandidates)
      const nextActiveId =
        activeCycleId === id ? remainingCycles[0]?.id ?? "" : activeCycleId
      if (activeCycleId === id) {
        setActiveCycleId(nextActiveId)
      }
      logAudit(
        "DELETE_CYCLE",
        target.name,
        `Menghapus periode ${target.name} (${target.level}) beserta kandidat di dalamnya`,
      )
      showToast(`Periode "${target.name}" telah dihapus.`, "warning")
      saveToCloud({
        cycles: remainingCycles,
        candidates: remainingCandidates,
        activeCycleId: nextActiveId,
      })
    },
    [cycles, allCandidates, activeCycleId, logAudit, showToast, saveToCloud],
  )

  // Auth & User actions
  const loginAs = useCallback(
    (userId: string) => {
      const target = users.find((u) => u.id === userId)
      if (!target) return
      if (!target.active) {
        showToast("Akun pengguna ini sedang dinonaktifkan.", "danger")
        return
      }
      setCurrentUserId(target.id)
      setIsAuthenticated(true)
      showToast(`Masuk sebagai ${target.name} (${target.title})`, "info")
    },
    [users, showToast],
  )

  const loginAsCandidate = useCallback(
    (candidateIdOrNumber: string): boolean => {
      const clean = candidateIdOrNumber.trim().toLowerCase()
      const storedCandidates = loadStorage<Candidate[]>(
        "paska-clean-candidates",
        [],
      )
      const { candidates: latestList } = mergeCandidatesList({
        localCandidates: stateRef.current.allCandidates,
        storageCandidates: storedCandidates,
        catTryoutAttempts: stateRef.current.catTryoutAttempts,
        activeCatCandidates: readActiveCatCandidatesFromStorage(),
        activeCycleId: stateRef.current.activeCycleId || "cycle-2027-kab",
        deletedCandidateIds: deletedCandidateIdsRef.current,
      })
      if (latestList.length !== stateRef.current.allCandidates.length) {
        stateRef.current = { ...stateRef.current, allCandidates: latestList }
        setAllCandidates(latestList)
      }

      const cand = latestList.find(
        (c) =>
          c.id.toLowerCase() === clean ||
          c.number.toLowerCase() === clean ||
          (c.nik && c.nik.toLowerCase() === clean),
      )
      if (!cand) {
        showToast(
          `Kandidat dengan nomor/ID "${candidateIdOrNumber}" tidak ditemukan.`,
          "danger",
        )
        return false
      }

      const candidateUserId = `user-cand-${cand.id}`
      const existingUser = stateRef.current.users.find(
        (u) => u.candidateId === cand.id || u.id === candidateUserId,
      )

      if (existingUser) {
        stateRef.current = { ...stateRef.current, currentUserId: existingUser.id }
        setCurrentUserId(existingUser.id)
      } else {
        const candidateUser: UserProfile = {
          id: candidateUserId,
          name: cand.name,
          email: `${cand.number.toLowerCase()}@paskibraka.internal`,
          role: "candidate",
          avatar: cand.avatar || cand.name.slice(0, 2).toUpperCase(),
          title: `Peserta No. ${cand.number}`,
          active: true,
          candidateId: cand.id,
        }
        const nextUsers = [
          ...stateRef.current.users.filter((u) => u.id !== candidateUser.id),
          candidateUser,
        ]
        stateRef.current = {
          ...stateRef.current,
          users: nextUsers,
          currentUserId: candidateUser.id,
        }
        setUsers(nextUsers)
        setCurrentUserId(candidateUser.id)
      }

      setIsAuthenticated(true)
      showToast(`Berhasil masuk sebagai ${cand.name} (${cand.number})`, "success")
      logAudit(
        "Login Mandiri Santri",
        cand.name,
        `Masuk ke sistem CAT dengan nomor peserta ${cand.number}`,
      )
      return true
    },
    [showToast, logAudit],
  )

  const loginCandidateByNik = useCallback(
    (nikInput: string): { success: boolean; candidate?: Candidate; error?: string } => {
      const clean = nikInput.replace(/\s+/g, "").trim()
      if (!clean) {
        const errMsg = "Silakan masukkan 16 digit NIK santri."
        showToast(errMsg, "warning")
        return { success: false, error: errMsg }
      }

      const storedCandidates = loadStorage<Candidate[]>(
        "paska-clean-candidates",
        [],
      )
      const { candidates: latestList } = mergeCandidatesList({
        localCandidates: stateRef.current.allCandidates,
        storageCandidates: storedCandidates,
        catTryoutAttempts: stateRef.current.catTryoutAttempts,
        activeCatCandidates: readActiveCatCandidatesFromStorage(),
        activeCycleId: stateRef.current.activeCycleId || "cycle-2027-kab",
        deletedCandidateIds: deletedCandidateIdsRef.current,
      })
      if (latestList.length !== stateRef.current.allCandidates.length) {
        stateRef.current = { ...stateRef.current, allCandidates: latestList }
        setAllCandidates(latestList)
      }

      const cand = latestList.find(
        (c) =>
          (c.nik && c.nik.replace(/\s+/g, "") === clean) ||
          c.number.toLowerCase() === clean.toLowerCase() ||
          c.id.toLowerCase() === clean.toLowerCase(),
      )

      if (!cand) {
        const errMsg = `NIK "${clean}" tidak terdaftar dalam basis data calon Paskibraka.`
        showToast(errMsg, "danger")
        logAudit("Gagal Login Santri", clean, "NIK tidak ditemukan dalam database")
        return { success: false, error: errMsg }
      }

      loginAsCandidate(cand.id)
      return { success: true, candidate: cand }
    },
    [loginAsCandidate, showToast, logAudit],
  )

  const loginCoachWithGoogle = useCallback(
    (
      emailInput: string,
      googleProfile?: { name?: string; picture?: string },
    ): { success: boolean; error?: string } => {
      const cleanEmail = emailInput.trim().toLowerCase()
      const allowedEmails = [
        "andiaqillahfadiahaswat@gmail.com",
        "andiaqillah@muallimin.sch.id",
      ]

      if (!allowedEmails.includes(cleanEmail)) {
        const errMsg = `Akses Ditolak: Email "${cleanEmail}" bukan akun Google Pelatih resmi terdaftar.`
        showToast(errMsg, "danger")
        logAudit(
          "Gagal Login Google Pelatih",
          cleanEmail,
          "Email Google tidak terdaftar dalam whitelist pelatih",
        )
        return { success: false, error: errMsg }
      }

      const coachUserId = "user-coach-andi"
      const existingUser = users.find(
        (u) =>
          u.email.toLowerCase() === cleanEmail ||
          u.id === coachUserId ||
          u.role === "admin",
      )

      const coachProfile: UserProfile = {
        id: existingUser?.id || coachUserId,
        name: googleProfile?.name || existingUser?.name || "Coach Andi Aqillah",
        email: cleanEmail,
        role: "admin",
        avatar: googleProfile?.picture || existingUser?.avatar || "CA",
        title: "Pelatih Kepala MA Mu'allimin",
        active: true,
      }

      setUsers((prev) => [
        coachProfile,
        ...prev.filter((u) => u.id !== coachProfile.id),
      ])
      setCurrentUserId(coachProfile.id)
      setIsAuthenticated(true)
      showToast(
        `Login Google Berhasil sebagai ${coachProfile.name} (${cleanEmail})`,
        "success",
      )
      logAudit(
        "Login Google Pelatih",
        coachProfile.name,
        `Terautentikasi melalui Google Identity Service (${cleanEmail})`,
      )
      return { success: true }
    },
    [users, showToast, logAudit],
  )

  const logout = useCallback(() => {
    setIsAuthenticated(false)
    setCurrentUserId("")
    showToast(
      "Sesi telah keluar. Silakan pilih akun untuk masuk kembali.",
      "info",
    )
  }, [showToast])

  const addUser = useCallback(
    (user: Omit<UserProfile, "id">) => {
      const next: UserProfile = {
        ...user,
        id: `user-${Date.now()}`,
        avatar: user.avatar || makeAvatar(user.name),
      }
      setUsers((prev) => [...prev, next])
      logAudit(
        "INVITE_USER",
        next.name,
        `Menambahkan pengguna role ${next.role}`,
      )
      showToast(`Pengguna ${next.name} berhasil ditambahkan.`)
    },
    [logAudit, showToast],
  )

  const toggleUserActive = useCallback(
    (userId: string) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, active: !u.active } : u)),
      )
      showToast("Status aktif pengguna diperbarui.")
    },
    [showToast],
  )

  // Candidate CRUD
  const addCandidate = useCallback(
    (
      data: Omit<Candidate, "id" | "avatar" | "stage" | "stageStatuses" | "updatedAt"> & {
        stage?: number
        stageStatuses?: StageStatus[]
      },
    ) => {
      const nowIso = new Date().toISOString()
      const storedCandidates = loadStorage<Candidate[]>(
        "paska-clean-candidates",
        [],
      )
      const { candidates: currentMerged } = mergeCandidatesList({
        localCandidates: stateRef.current.allCandidates,
        storageCandidates: storedCandidates,
        catTryoutAttempts: stateRef.current.catTryoutAttempts,
        activeCatCandidates: readActiveCatCandidatesFromStorage(),
        activeCycleId: activeCycle.id,
        cycleYear: activeCycle.year,
        deletedCandidateIds: deletedCandidateIdsRef.current,
      })

      const number = generateNextCandidateNumber(
        currentMerged,
        activeCycle.year,
        data.number,
      )
      const defaultStatuses: StageStatus[] = data.stageStatuses ?? [
        "active",
        "active",
        "active",
        "active",
        "active",
        "active",
        "active",
        "active",
      ]
      const todayStr = nowIso.slice(0, 10)
      const initialAnthro =
        data.heightCm && data.weightKg
          ? [
              {
                id: `anthro-${Date.now()}`,
                date: todayStr,
                heightCm: data.heightCm,
                weightKg: data.weightKg,
                note: "Pengukuran awal pendaftaran",
              },
            ]
          : []
      const next: Candidate = {
        ...data,
        id: `cand-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        number,
        avatar: makeAvatar(data.name),
        stage: data.stage ?? 1,
        stageStatuses: defaultStatuses,
        documents: data.documents ?? [false, false, false, false, false, false],
        attendance: data.attendance ?? 0,
        trainingCompliance: data.trainingCompliance ?? 0,
        anthropometryHistory: data.anthropometryHistory ?? initialAnthro,
        cycleId: data.cycleId ?? activeCycle.id,
        updatedAt: "Baru saja",
        updatedAtIso: nowIso,
      }
      const nextCandidates = [next, ...currentMerged]
      stateRef.current = { ...stateRef.current, allCandidates: nextCandidates }
      setAllCandidates(nextCandidates)
      try {
        localStorage.setItem(
          "paska-clean-candidates",
          JSON.stringify(nextCandidates),
        )
      } catch {}
      broadcastStateSync("addCandidate")
      logAudit(
        "CREATE_CANDIDATE",
        `${next.name} (${next.number})`,
        `Menambahkan kandidat baru dari ${next.school}`,
      )
      showToast(`Kandidat ${next.name} (${next.number}) berhasil ditambahkan.`)
      void saveToCloud({ candidates: nextCandidates }, true)
      return next
    },
    [
      activeCycle.id,
      activeCycle.year,
      broadcastStateSync,
      logAudit,
      showToast,
      saveToCloud,
    ],
  )

  const updateCandidate = useCallback(
    (id: string, patch: Partial<Candidate>) => {
      const nowIso = new Date().toISOString()
      const storedCandidates = loadStorage<Candidate[]>(
        "paska-clean-candidates",
        [],
      )
      const { candidates: currentList } = mergeCandidatesList({
        localCandidates: stateRef.current.allCandidates,
        storageCandidates: storedCandidates,
        catTryoutAttempts: stateRef.current.catTryoutAttempts,
        activeCatCandidates: readActiveCatCandidatesFromStorage(),
        activeCycleId: stateRef.current.activeCycleId || "cycle-2027-kab",
        deletedCandidateIds: deletedCandidateIdsRef.current,
      })
      const nextCandidates = currentList.map((item) => {
        if (item.id !== id) return item
        const updatedName = patch.name ?? item.name
        return {
          ...item,
          ...patch,
          avatar: patch.name ? makeAvatar(updatedName) : item.avatar,
          updatedAt: "Baru saja",
          updatedAtIso: nowIso,
        }
      })
      stateRef.current = { ...stateRef.current, allCandidates: nextCandidates }
      setAllCandidates(nextCandidates)
      try {
        localStorage.setItem(
          "paska-clean-candidates",
          JSON.stringify(nextCandidates),
        )
      } catch {}
      broadcastStateSync("updateCandidate")
      logAudit("UPDATE_CANDIDATE", id, "Memperbarui data/profil kandidat")
      showToast("Data kandidat berhasil diperbarui.")
      void saveToCloud({ candidates: nextCandidates })
    },
    [broadcastStateSync, logAudit, showToast, saveToCloud],
  )

  const deleteCandidate = useCallback(
    (id: string) => {
      deletedCandidateIdsRef.current.add(id)
      saveDeletedCandidateIds(deletedCandidateIdsRef.current)
      const currentList = stateRef.current.allCandidates
      const target = currentList.find((c) => c.id === id)
      const nextCandidates = currentList.filter((item) => item.id !== id)
      stateRef.current = { ...stateRef.current, allCandidates: nextCandidates }
      setAllCandidates(nextCandidates)
      try {
        localStorage.setItem(
          "paska-clean-candidates",
          JSON.stringify(nextCandidates),
        )
      } catch {}
      broadcastStateSync("deleteCandidate")
      if (target) {
        logAudit(
          "DELETE_CANDIDATE",
          `${target.name} (${target.number})`,
          "Menghapus data kandidat dari periode aktif",
        )
        showToast(`Kandidat ${target.name} telah dihapus.`, "warning")
      }
      void saveToCloud(
        {
          candidates: nextCandidates,
          deletedCandidateIds: Array.from(deletedCandidateIdsRef.current),
        },
        true,
      )
    },
    [broadcastStateSync, logAudit, showToast, saveToCloud],
  )

  const importCandidates = useCallback(
    (newItems: Candidate[]) => {
      if (!newItems.length) return 0
      const nowIso = new Date().toISOString()
      const stampedItems = newItems.map((item) => ({
        ...item,
        updatedAt: item.updatedAt || "Baru saja",
        updatedAtIso: item.updatedAtIso || nowIso,
      }))
      const storedCandidates = loadStorage<Candidate[]>(
        "paska-clean-candidates",
        [],
      )
      const { candidates: nextCandidates } = mergeCandidatesList({
        localCandidates: [...stampedItems, ...stateRef.current.allCandidates],
        storageCandidates: storedCandidates,
        catTryoutAttempts: stateRef.current.catTryoutAttempts,
        activeCatCandidates: readActiveCatCandidatesFromStorage(),
        activeCycleId: stateRef.current.activeCycleId || "cycle-2027-kab",
        deletedCandidateIds: deletedCandidateIdsRef.current,
      })
      stateRef.current = { ...stateRef.current, allCandidates: nextCandidates }
      setAllCandidates(nextCandidates)
      try {
        localStorage.setItem(
          "paska-clean-candidates",
          JSON.stringify(nextCandidates),
        )
      } catch {}
      broadcastStateSync("importCandidates")
      logAudit(
        "IMPORT_CANDIDATES",
        `${newItems.length} kandidat`,
        "Impor massal data kandidat via CSV",
      )
      showToast(`${newItems.length} kandidat berhasil diimpor.`)
      void saveToCloud({ candidates: nextCandidates }, true)
      return newItems.length
    },
    [broadcastStateSync, logAudit, showToast, saveToCloud],
  )

  const updateCandidateStage = useCallback(
    (
      candidateId: string,
      stageIndex: number,
      status: StageStatus,
      reason?: string,
    ) => {
      const currentList = stateRef.current.allCandidates
      const nextCandidates = currentList.map((cand) => {
        if (cand.id !== candidateId) return cand
        const { stageStatuses, activeStageNumber } = applyStageDecision(
          cand.stageStatuses,
          stageIndex,
          status,
        )
        return {
          ...cand,
          stageStatuses,
          stage: activeStageNumber,
          eliminationReason:
            status === "failed"
              ? reason || `Gugur pada Tahap ${stageIndex + 1}`
              : status === "passed"
                ? undefined
                : cand.eliminationReason,
          updatedAt: "Baru saja",
        }
      })

      // Jika stage 3 (medical) atau 4 (parade) diubah via evaluasi 1-klik, selaraskan juga record sesi terkait jika ada
      let nextRecords = stateRef.current.records
      let recordsUpdated = false
      if (
        (stageIndex === 3 || stageIndex === 4) &&
        (status === "passed" || status === "review" || status === "failed")
      ) {
        const sessType = stageIndex === 3 ? "medical" : "parade"
        const matchingSessions = stateRef.current.sessions.filter((s) => s.type === sessType)
        for (const sess of matchingSessions) {
          const recKey = `${sess.id}:${candidateId}`
          if (nextRecords[recKey]?.savedAt) {
            if (!recordsUpdated) {
              nextRecords = { ...nextRecords }
              recordsUpdated = true
            }
            nextRecords[recKey] = {
              ...nextRecords[recKey],
              result: status,
            }
          }
        }
      }

      stateRef.current = {
        ...stateRef.current,
        allCandidates: nextCandidates,
        ...(recordsUpdated ? { records: nextRecords } : {}),
      }
      setAllCandidates(nextCandidates)
      if (recordsUpdated) {
        setRecordsRaw(nextRecords)
      }
      const cand = currentList.find((c) => c.id === candidateId)
      if (cand) {
        logAudit(
          "STAGE_DECISION",
          `${cand.name} (${cand.number})`,
          `Tahap ${stageIndex + 1} diubah menjadi ${status.toUpperCase()}${
            reason ? ` — Alasan: ${reason}` : ""
          }`,
        )
      }
      showToast(`Status Tahap ${stageIndex + 1} diperbarui menjadi ${status}.`)
      saveToCloud({
        candidates: nextCandidates,
        ...(recordsUpdated ? { records: nextRecords } : {}),
      })
    },
    [logAudit, showToast, saveToCloud],
  )

  const toggleCandidateDocument = useCallback(
    (candidateId: string, docIndex: number) => {
      const currentList = stateRef.current.allCandidates
      const nextCandidates = currentList.map((cand) => {
        if (cand.id !== candidateId) return cand
        const docs = [
          ...(cand.documents ?? [false, false, false, false, false, false]),
        ]
        docs[docIndex] = !docs[docIndex]
        const allValid = docs.every(Boolean)
        let nextStageStatuses = [...cand.stageStatuses]
        let nextStage = cand.stage
        if (allValid) {
          const applied = applyStageDecision(cand.stageStatuses, 0, "passed")
          nextStageStatuses = applied.stageStatuses
          nextStage = applied.activeStageNumber
        } else if (nextStageStatuses[0] === "passed") {
          nextStageStatuses[0] = "review"
        }
        return {
          ...cand,
          documents: docs,
          stageStatuses: nextStageStatuses,
          stage: nextStage,
          updatedAt: "Baru saja",
        }
      })
      stateRef.current = { ...stateRef.current, allCandidates: nextCandidates }
      setAllCandidates(nextCandidates)
      saveToCloud({ candidates: nextCandidates })
    },
    [saveToCloud],
  )

  const addAnthropometryLog = useCallback(
    (
      candidateId: string,
      entry: { date: string, heightCm: number, weightKg: number, note?: string },
    ) => {
      const currentList = stateRef.current.allCandidates
      const nextCandidates = currentList.map((cand) => {
        if (cand.id !== candidateId) return cand
        const newLog = {
          id: `anthro-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          date: entry.date,
          heightCm: entry.heightCm,
          weightKg: entry.weightKg,
          note: entry.note?.trim() || undefined,
        }
        const history = [...(cand.anthropometryHistory ?? []), newLog].sort(
          (a, b) => a.date.localeCompare(b.date),
        )
        const latest = history.at(-1) ?? newLog
        return {
          ...cand,
          heightCm: latest.heightCm,
          weightKg: latest.weightKg,
          anthropometryHistory: history,
          updatedAt: "Baru saja",
        }
      })
      stateRef.current = { ...stateRef.current, allCandidates: nextCandidates }
      setAllCandidates(nextCandidates)
      logAudit(
        "LOG_ANTHROPOMETRY",
        candidateId,
        `Mencatat tinggi ${entry.heightCm} cm & berat ${entry.weightKg} kg (${entry.date})`,
      )
      showToast("Data pengukuran tinggi & berat badan berhasil dicatat.")
      saveToCloud({ candidates: nextCandidates })
    },
    [logAudit, showToast, saveToCloud],
  )

  const deleteAnthropometryLog = useCallback(
    (candidateId: string, logId: string) => {
      const currentList = stateRef.current.allCandidates
      const nextCandidates = currentList.map((cand) => {
        if (cand.id !== candidateId) return cand
        const history = (cand.anthropometryHistory ?? []).filter(
          (item) => item.id !== logId,
        )
        const latest = history.at(-1)
        return {
          ...cand,
          heightCm: latest ? latest.heightCm : cand.heightCm,
          weightKg: latest ? latest.weightKg : cand.weightKg,
          anthropometryHistory: history,
          updatedAt: "Baru saja",
        }
      })
      stateRef.current = { ...stateRef.current, allCandidates: nextCandidates }
      setAllCandidates(nextCandidates)
      showToast("Riwayat pengukuran tinggi & berat badan dihapus.", "warning")
      saveToCloud({ candidates: nextCandidates })
    },
    [showToast, saveToCloud],
  )

  const addIntervalLog = useCallback(
    (
      candidateId: string,
      entry: Omit<import("../domain/selection").IntervalTrainingLog, "id">,
    ) => {
      const currentList = stateRef.current.allCandidates
      const newEntry = {
        ...entry,
        id: `interval-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      }
      const nextCandidates = currentList.map((cand) => {
        if (cand.id !== candidateId) return cand
        const history = [newEntry, ...(cand.intervalHistory ?? [])]
        return {
          ...cand,
          intervalHistory: history,
          updatedAt: "Baru saja",
        }
      })
      stateRef.current = { ...stateRef.current, allCandidates: nextCandidates }
      setAllCandidates(nextCandidates)
      logAudit(
        "LOG_INTERVAL",
        candidateId,
        `Mencatat sesi interval: ${newEntry.completedSets}/${newEntry.targetSets} set, split ${newEntry.avgSplitSec}s, skor ${newEntry.score}`,
      )
      showToast("Data sesi latihan interval berhasil dicatat.")
      saveToCloud({ candidates: nextCandidates })
    },
    [logAudit, showToast, saveToCloud],
  )

  const deleteIntervalLog = useCallback(
    (candidateId: string, logId: string) => {
      const currentList = stateRef.current.allCandidates
      const nextCandidates = currentList.map((cand) => {
        if (cand.id !== candidateId) return cand
        const history = (cand.intervalHistory ?? []).filter(
          (item) => item.id !== logId,
        )
        return {
          ...cand,
          intervalHistory: history,
          updatedAt: "Baru saja",
        }
      })
      stateRef.current = { ...stateRef.current, allCandidates: nextCandidates }
      setAllCandidates(nextCandidates)
      showToast("Riwayat sesi latihan interval dihapus.", "warning")
      saveToCloud({ candidates: nextCandidates })
    },
    [showToast, saveToCloud],
  )

  const syncCandidateFromSession = useCallback(
    ({
      candidateId,
      sessionType,
      sessionId,
      sessionTitle,
      metrics,
      records,
      result,
      note,
      attendance,
    }: {
      candidateId: string
      sessionType: string
      sessionId?: string
      sessionTitle?: string
      metrics: Record<string, string>
      records: Record<string, SessionRecord>
      result: "pending" | "passed" | "review" | "failed"
      note: string
      attendance?: "hadir" | "sakit" | "izin" | "alpa"
    }) => {
      const currentList = stateRef.current.allCandidates
      const candidateSessionRecords = stateRef.current.sessions
        .filter((session) => session.type === sessionType)
        .map((session) => {
          const rec = records[`${session.id}:${candidateId}`]
          const m = rec?.metrics ?? {}
          const isInterval =
            session.title.toLowerCase().includes("interval") ||
            m.runMode === "interval" ||
            Boolean(m.intervalLap1) ||
            Boolean(m.intervalDist) ||
            Boolean(m.intervalTargetSets) ||
            Boolean(m.intervalAvg)
          return {
            sessionId: session.id,
            sessionTitle: session.title,
            isInterval,
            savedAt: rec?.savedAt ?? "",
            metrics: m,
          }
        })
        .filter((record) => record.savedAt)
        .sort((a, b) => a.savedAt.localeCompare(b.savedAt))
      const latestMetrics = (keys: string[]) => {
        const latest: Record<string, number> = {}
        for (const record of candidateSessionRecords) {
          for (const key of keys) {
            const raw = record.metrics[key]
            if (raw === undefined || raw.trim() === "") continue
            const value = Number(raw)
            if (Number.isFinite(value) && value >= 0) latest[key] = value
          }
        }
        return latest
      }
      const nextCandidates = currentList.map((cand) => {
        if (cand.id !== candidateId) return cand
        const patch: Partial<Candidate> = {
          updatedAt: "Baru saja",
        }
        if (note.trim()) {
          patch.coachNote = note.trim()
        } else if (attendance && attendance !== "hadir") {
          patch.coachNote = `Status sesi: ${attendance.toUpperCase()}`
        }

          let stageIndex: number | null = null

          if (sessionType === "administration") {
            stageIndex = 0
            const hasDocShortKey = [0, 1, 2, 3, 4, 5].some((idx) => `doc-${idx}` in metrics)
            const hasDocLongKey = [0, 1, 2, 3, 4, 5].some((idx) => `document-${idx}` in metrics)
            if (hasDocShortKey || hasDocLongKey) {
              const prevDocs = cand.documents ?? [false, false, false, false, false, false]
              patch.documents = [0, 1, 2, 3, 4, 5].map((idx) => {
                if (`doc-${idx}` in metrics) {
                  const v = metrics[`doc-${idx}`]
                  return v === "valid" || v === "true" || v === "1"
                }
                if (`document-${idx}` in metrics) {
                  const v = metrics[`document-${idx}`]
                  return v === "valid" || v === "true" || v === "1"
                }
                return Boolean(prevDocs[idx])
              })
            }
          } else if (sessionType === "pip") {
            stageIndex = 1
            const compSum =
              (Number(metrics.understanding) || 0) +
              (Number(metrics.implementation) || 0) +
              (Number(metrics.caseStudy) || 0)
            const hasComp =
              Boolean(metrics.understanding) ||
              Boolean(metrics.implementation) ||
              Boolean(metrics.caseStudy)
            const score =
              metrics.score !== undefined && metrics.score !== ""
                ? Number(metrics.score)
                : metrics.pipScore !== undefined && metrics.pipScore !== ""
                  ? Number(metrics.pipScore)
                  : metrics.correct
                    ? Number(metrics.correct) * 2
                    : hasComp
                      ? compSum
                      : null
            if (score !== null && Number.isFinite(score)) {
              patch.pip = Math.min(100, Math.max(0, score))
            }
          } else if (sessionType === "tiu") {
            stageIndex = 2
            const compSum =
              (Number(metrics.verbal) || 0) +
              (Number(metrics.numerical) || 0) +
              (Number(metrics.figural) || 0)
            const hasComp =
              Boolean(metrics.verbal) ||
              Boolean(metrics.numerical) ||
              Boolean(metrics.figural)
            const score =
              metrics.score !== undefined && metrics.score !== ""
                ? Number(metrics.score)
                : metrics.tiuScore !== undefined && metrics.tiuScore !== ""
                  ? Number(metrics.tiuScore)
                  : metrics.correct
                    ? Number(metrics.correct) * 2
                    : hasComp
                      ? compSum
                      : null
            if (score !== null && Number.isFinite(score)) {
              patch.tiu = Math.min(100, Math.max(0, score))
            }
          } else if (sessionType === "cat") {
            if (metrics.pipScore !== undefined && metrics.pipScore !== "") {
              const pScore = Number(metrics.pipScore)
              if (Number.isFinite(pScore)) patch.pip = Math.min(100, Math.max(0, pScore))
            }
            if (metrics.tiuScore !== undefined && metrics.tiuScore !== "") {
              const tScore = Number(metrics.tiuScore)
              if (Number.isFinite(tScore)) patch.tiu = Math.min(100, Math.max(0, tScore))
            }
            if (metrics.score !== undefined && metrics.score !== "") {
              const score = Number(metrics.score)
              if (Number.isFinite(score)) {
                if (patch.pip === undefined && cand.pip == null) patch.pip = score
                if (patch.tiu === undefined && cand.tiu == null) patch.tiu = score
              }
            }
            const pipVal = patch.pip ?? cand.pip ?? 0
            const tiuVal = patch.tiu ?? cand.tiu ?? 0
            const nextStageStatuses: StageStatus[] = [
              ...(cand.stageStatuses ?? Array<StageStatus>(8).fill("locked")),
            ]
            if (patch.pip !== undefined || cand.pip != null) {
              nextStageStatuses[1] = pipVal >= 70 ? "passed" : "review"
            }
            if (patch.tiu !== undefined || cand.tiu != null) {
              nextStageStatuses[2] = tiuVal >= 70 ? "passed" : "review"
            }
            patch.stageStatuses = nextStageStatuses
          } else if (sessionType === "medical") {
            stageIndex = 3
            const existingMetrics = cand.physicalMetrics ?? []
            const bp =
              metrics.bloodPressure ||
              (metrics.systolic && metrics.diastolic
                ? `${metrics.systolic}/${metrics.diastolic} mmHg`
                : "")
            const pulse = metrics.pulse ? `${metrics.pulse} bpm` : ""
            const eye =
              metrics.ishiharaDetail ||
              (metrics.ishiharaStatus === "normal"
                ? "Bebas Buta Warna (Ishihara)"
                : metrics.ishiharaStatus
                  ? "Buta Warna (TMS)"
                  : "")
            const teeth =
              metrics.kariesActive === "bebas"
                ? `Bebas Karies${metrics.cavityCount ? ` (${metrics.cavityCount} tambalan)` : ""}`
                : metrics.kariesActive === "parah"
                  ? "Karies Parah"
                  : ""
            const ent =
              metrics.tonsil === "normal" &&
              metrics.nasalPolyp === "bebas" &&
              metrics.tympanic === "utuh"
                ? "THT Sehat (Utuh)"
                : metrics.tonsil === "t3_t4"
                  ? "Tonsilitis T3-T4"
                  : metrics.nasalPolyp === "ada"
                    ? "Ada Polip Hidung"
                    : metrics.tympanic === "robek_congek"
                      ? "Congek / Gendang Robek"
                      : ""
            const anam = metrics.anamnesis ? `${metrics.anamnesis} YA` : ""

            const filteredMetrics = existingMetrics.filter(
              (m) =>
                ![
                  "tekanan darah",
                  "tensi",
                  "nadi",
                  "ishihara",
                  "mata",
                  "gigi",
                  "tht",
                  "anamnesis",
                ].some((k) => m.label.toLowerCase().includes(k)),
            )

            if (bp) {
              filteredMetrics.push({
                label: "Tekanan Darah",
                current: bp,
                target: "110/70–125/85 mmHg",
                percent: 100,
              })
            }
            if (pulse) {
              filteredMetrics.push({
                label: "Nadi Istirahat",
                current: pulse,
                target: "60–85 bpm",
                percent: 100,
              })
            }
            if (eye) {
              filteredMetrics.push({
                label: "Mata & Ishihara",
                current: eye,
                target: "Visus 6/6 · Normal",
                percent: 100,
              })
            }
            if (teeth) {
              filteredMetrics.push({
                label: "Kesehatan Gigi",
                current: teeth,
                target: "Karies ≤5 · Depan Utuh",
                percent: 100,
              })
            }
            if (ent) {
              filteredMetrics.push({
                label: "THT & Pernapasan",
                current: ent,
                target: "Bebas T3-T4 / Polip",
                percent: 100,
              })
            }
            if (anam) {
              const anamScore = Number(metrics.anamnesisScore) || 100
              filteredMetrics.push({
                label: "Anamnesis Rikkes",
                current: `${anam} (Skor ${anamScore})`,
                target: "≤5 YA · 0 Kritis",
                percent: anamScore,
              })
            }

            patch.physicalMetrics = filteredMetrics
          } else if (sessionType === "parade") {
            stageIndex = 4
            const h = Number(metrics.height)
            const w = Number(metrics.weight)
            if (metrics.height && Number.isFinite(h) && h > 0) {
              patch.heightCm = h
            }
            if (metrics.weight && Number.isFinite(w) && w > 0) {
              patch.weightKg = w
            }
            if (
              metrics.height &&
              metrics.weight &&
              Number.isFinite(h) &&
              Number.isFinite(w) &&
              h > 0 &&
              w > 0
            ) {
              const todayStr = new Date().toISOString().slice(0, 10)
              patch.anthropometryHistory = [
                ...(cand.anthropometryHistory ?? []),
                {
                  id: `anthro-${Date.now()}`,
                  date: todayStr,
                  heightCm: h,
                  weightKg: w,
                  note: note.trim() || "Pengukuran Sesi Parade",
                },
              ]
            }
          } else if (sessionType === "pbb") {
            stageIndex = 5
            const latest = latestMetrics(["static", "dynamic", "command", "pbbScore"])
            for (const key of ["static", "dynamic", "command", "pbbScore"]) {
              const raw = metrics[key]
              if (raw !== undefined && raw.trim() !== "" && Number.isFinite(Number(raw)) && Number(raw) >= 0) latest[key] = Number(raw)
            }
            const components = [latest.static, latest.dynamic, latest.command].filter(
              (value): value is number => value !== undefined,
            )
            if (latest.pbbScore !== undefined && latest.pbbScore > 0) {
              patch.pbb = Number(latest.pbbScore.toFixed(1))
            } else if (components.length === 3 && components.every((v) => v <= 40)) {
              patch.pbb = Number(components.reduce((a, b) => a + b, 0).toFixed(1))
            } else if (components.length > 0) {
              patch.pbb = Number((components.reduce((a, b) => a + b, 0) / components.length).toFixed(1))
            }
          } else if (sessionType === "fitness") {
            const isRunDnf = metrics.runDnf === "yes"
            const isIntervalRun =
              metrics.runMode === "interval" ||
              Boolean(sessionTitle && sessionTitle.toLowerCase().includes("interval")) ||
              Boolean(metrics.intervalLap1 || metrics.intervalTargetSets || metrics.intervalDist || metrics.intervalAvg)

            if (isIntervalRun) {
              const targetSets = parseInt(metrics.intervalTargetSets || "4", 10) || 4
              const targetPace = parseFloat(metrics.intervalTargetPace || "90") || 90
              const distPerSet = parseFloat(metrics.intervalDist || "400") || 400

              let laps = Array.from({ length: 12 }, (_, i) => i + 1)
                .map((i) => parseFloat(metrics[`intervalLap${i}`] || ""))
                .filter((v) => !isNaN(v) && v > 0)

              if (laps.length === 0) {
                const directAvg = parseFloat(metrics.intervalAvg || "")
                if (!isNaN(directAvg) && directAvg > 0) {
                  laps = Array.from({ length: Math.max(1, targetSets) }, () => directAvg)
                }
              }

              const prevHistory = (cand.intervalHistory ?? []).filter(
                (h) => Array.isArray(h.lapSplitsSec) && h.lapSplitsSec.length > 0,
              )

              if (laps.length > 0) {
                const completedSets = laps.length
                const avgSplit = laps.reduce((a, b) => a + b, 0) / laps.length

                const todayStr = new Date().toISOString().slice(0, 10)
                const newLog = createIntervalLogEntry({
                  sessionId,
                  sessionTitle: sessionTitle || "Latihan Lari Interval",
                  date: todayStr,
                  targetSets,
                  completedSets,
                  targetPaceSec: targetPace,
                  avgSplitSec: avgSplit,
                  lapSplits: laps,
                  isDnf: isRunDnf,
                  distPerSetM: distPerSet,
                  note: note.trim() || undefined,
                })

                const filtered = sessionId ? prevHistory.filter((h) => h.sessionId !== sessionId) : prevHistory
                patch.intervalHistory = [newLog, ...filtered]
              } else if (sessionId) {
                patch.intervalHistory = prevHistory.filter((h) => h.sessionId !== sessionId)
              }
            }

            const hasDistance =
              !isIntervalRun &&
              (isRunDnf ||
                (metrics.distance !== undefined &&
                  metrics.distance.trim() !== "" &&
                  !isNaN(Number(metrics.distance))))
            const hasPushup =
              metrics.pushup !== undefined &&
              metrics.pushup.trim() !== "" &&
              !isNaN(Number(metrics.pushup))
            const hasSitup =
              metrics.situp !== undefined &&
              metrics.situp.trim() !== "" &&
              !isNaN(Number(metrics.situp))
            const hasBackup =
              metrics.backup !== undefined &&
              metrics.backup.trim() !== "" &&
              !isNaN(Number(metrics.backup))
            const hasShuttle =
              metrics.shuttle !== undefined &&
              metrics.shuttle.trim() !== "" &&
              !isNaN(Number(metrics.shuttle))

            const distance = hasDistance ? Number(metrics.distance) || 0 : 0
            const pushup = hasPushup ? Number(metrics.pushup) : 0
            const situp = hasSitup ? Number(metrics.situp) : 0
            const backup = hasBackup ? Number(metrics.backup) : 0
            const shuttle = hasShuttle ? Number(metrics.shuttle) : 0

            // Sesi hanya memengaruhi tahap 6 (Samapta Resmi) jika ada tes Samapta resmi (bukan semata latihan interval)
            if (!isIntervalRun || hasPushup || hasSitup || hasBackup || hasShuttle) {
              stageIndex = 6
            }

            {
              const existing = cand.physicalMetrics ?? []
              const getExisting = (lbl: string) =>
                existing.find((m) =>
                  m.label.toLowerCase().includes(lbl.toLowerCase()),
                )

              const samaptaLabels = ["lari 12 menit", "push-up", "sit-up", "back-up", "shuttle run"]
              const nonSamaptaMetrics = existing.filter(
                (m) => !samaptaLabels.some((lbl) => m.label.toLowerCase().includes(lbl)),
              )

              const updatedSamaptaMetrics = [
                hasDistance
                  ? {
                      label: "Lari 12 menit",
                      current: isRunDnf
                        ? distance > 0
                          ? `${distance} m (DNF)`
                          : "DNF"
                        : `${distance} m`,
                      target: "3.000 m",
                      percent: isRunDnf
                        ? 0
                        : Math.min(
                            100,
                            Math.round((distance / 3000) * 100),
                          ),
                    }
                  : getExisting("Lari 12 menit"),
                hasPushup
                  ? {
                      label: "Push-up",
                      current: `${pushup} kali`,
                      target: "45 kali",
                      percent: Math.min(100, Math.round((pushup / 45) * 100)),
                    }
                  : getExisting("Push-up"),
                hasSitup
                  ? {
                      label: "Sit-up",
                      current: `${situp} kali`,
                      target: "40 kali",
                      percent: Math.min(100, Math.round((situp / 40) * 100)),
                    }
                  : getExisting("Sit-up"),
                hasBackup
                  ? {
                      label: "Back-up",
                      current: `${backup} kali`,
                      target: "50 kali",
                      percent: Math.min(100, Math.round((backup / 50) * 100)),
                    }
                  : getExisting("Back-up"),
                hasShuttle
                  ? {
                      label: "Shuttle run",
                      current: `${shuttle} dtk`,
                      target: "15,4 dtk",
                      percent: Math.min(
                        100,
                        Math.max(40, Math.round((15.4 / shuttle) * 100)),
                      ),
                    }
                  : getExisting("Shuttle run"),
              ].filter(Boolean) as NonNullable<Candidate["physicalMetrics"]>

              if (updatedSamaptaMetrics.length > 0 || nonSamaptaMetrics.length > 0) {
                patch.physicalMetrics = [...updatedSamaptaMetrics, ...nonSamaptaMetrics]
              }

              const latest = latestMetrics([
                "pushup",
                "situp",
                "backup",
                "shuttle",
              ])

              // HANYA sesi tes lari resmi (bukan latihan interval) yang masuk ke evaluasi lari 12 menit resmi
              const officialRunRecords = candidateSessionRecords.filter(
                (r) =>
                  !r.isInterval &&
                  r.metrics.runMode !== "interval" &&
                  !r.metrics.intervalLap1 &&
                  !r.metrics.intervalDist,
              )
              for (const record of officialRunRecords) {
                if (record.metrics.runDnf === "yes") {
                  latest.distance = 0
                  latest.runDnf = 1
                } else if (
                  record.metrics.distance?.trim() &&
                  Number.isFinite(Number(record.metrics.distance))
                ) {
                  const dVal = Number(record.metrics.distance)
                  const isTest12 = record.metrics.runMode === "test12"
                  if (isTest12 ? dVal > 0 : dVal >= 1200) {
                    latest.distance = dVal
                    latest.runDnf = 0
                  }
                }
              }
              const isCurrentTest12 = metrics.runMode === "test12"
              if (hasDistance && (isCurrentTest12 ? distance > 0 : distance >= 1200)) {
                latest.distance = distance
                latest.runDnf = isRunDnf ? 1 : 0
              } else if (hasDistance && isRunDnf) {
                latest.distance = 0
                latest.runDnf = 1
              }
              if (hasPushup) latest.pushup = pushup
              if (hasSitup) latest.situp = situp
              if (hasBackup) latest.backup = backup
              if (hasShuttle) latest.shuttle = shuttle
              const scores: number[] = []
              if (latest.distance !== undefined) {
                scores.push(
                  latest.runDnf === 1 ? 0 : fitnessScore("run", latest.distance),
                )
              }
              if (latest.pushup !== undefined) {
                scores.push(fitnessScore("pushup", latest.pushup))
              }
              if (latest.situp !== undefined) {
                scores.push(fitnessScore("situp", latest.situp))
              }
              if (latest.backup !== undefined) {
                scores.push(fitnessScore("backup", latest.backup))
              }
              if (latest.shuttle !== undefined) {
                scores.push(fitnessScore("shuttle", latest.shuttle))
              }
              // HANYA perbarui nilai Samapta resmi (patch.fitness) jika ada tes Samapta resmi (Lari 12 menit atau Samapta B)!
              // Sesi drill interval murni TIDAK PERNAH mengubah atau merusak nilai Samapta kandidat.
              if (!isIntervalRun || hasPushup || hasSitup || hasBackup || hasShuttle) {
                if (scores.length > 0) {
                  patch.fitness = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
                }
              }
            }
          } else if (sessionType === "interview") {
            stageIndex = 7
            const latest = latestMetrics(["star", "integrity", "communication", "interviewScore"])
            for (const key of ["star", "integrity", "communication", "interviewScore"]) {
              const raw = metrics[key]
              if (
                raw !== undefined &&
                raw.trim() !== "" &&
                Number.isFinite(Number(raw)) &&
                Number(raw) >= 0
              ) {
                latest[key] = Number(raw)
              }
            }
            const vals = [latest.star, latest.integrity, latest.communication].filter(
              (v): v is number => v !== undefined,
            )
            if (latest.interviewScore !== undefined && latest.interviewScore > 0) {
              patch.personality = Number(latest.interviewScore.toFixed(1))
            } else if (vals.length === 3 && vals.every((v) => v <= 40)) {
              patch.personality = Number(vals.reduce((a, b) => a + b, 0).toFixed(1))
            } else if (vals.length > 0) {
              patch.personality = Number(
                (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1),
              )
            }
          }

          let effectiveResult = result
          if (effectiveResult === "pending") {
            if (attendance && attendance !== "hadir") {
              effectiveResult = "review"
            } else if (sessionType === "administration") {
              const docs = patch.documents ?? cand.documents ?? []
              if (docs.length === 6 && docs.every(Boolean)) {
                effectiveResult = "passed"
              } else if (docs.some(Boolean)) {
                effectiveResult = "review"
              }
            } else if (sessionType === "pip") {
              const v = patch.pip ?? cand.pip
              if (v !== null && v !== undefined) {
                effectiveResult = v >= 70 ? "passed" : v >= 50 ? "review" : "failed"
              }
            } else if (sessionType === "tiu") {
              const v = patch.tiu ?? cand.tiu
              if (v !== null && v !== undefined) {
                effectiveResult = v >= 70 ? "passed" : v >= 50 ? "review" : "failed"
              }
            } else if (sessionType === "medical") {
              if (metrics.anamnesisCritical && Number(metrics.anamnesisCritical) > 0) {
                effectiveResult = "review"
              } else if (metrics.ishiharaStatus && metrics.ishiharaStatus !== "normal") {
                effectiveResult = "failed"
              } else if (metrics.anamnesisScore !== undefined && metrics.anamnesisScore !== "") {
                effectiveResult = Number(metrics.anamnesisScore) >= 70 ? "passed" : "review"
              } else if (Object.keys(metrics).some((k) => metrics[k] !== "")) {
                effectiveResult = "passed"
              }
            } else if (sessionType === "parade") {
              const h = patch.heightCm ?? cand.heightCm
              const w = patch.weightKg ?? cand.weightKg
              if (h && w) {
                const minH = cand.gender === "Putra" ? 165 : 160
                effectiveResult = h >= minH ? "passed" : "review"
              }
            } else if (sessionType === "fitness") {
              const isIntervalRun =
                metrics.runMode === "interval" ||
                Boolean(sessionTitle && sessionTitle.toLowerCase().includes("interval")) ||
                Boolean(metrics.intervalLap1 || metrics.intervalTargetSets || metrics.intervalDist || metrics.intervalAvg)
              const hasB =
                Boolean(metrics.pushup?.trim()) ||
                Boolean(metrics.situp?.trim()) ||
                Boolean(metrics.backup?.trim()) ||
                Boolean(metrics.shuttle?.trim())
              if (isIntervalRun && !hasB) {
                effectiveResult = "pending"
              } else if (metrics.runDnf === "yes") {
                effectiveResult = "review"
              } else if (Number(metrics.distance) >= 2400 && !isIntervalRun) {
                effectiveResult = "passed"
              } else if (Number(metrics.distance) > 0 && !isIntervalRun) {
                effectiveResult = "review"
              } else if (patch.fitness !== undefined && patch.fitness !== null) {
                effectiveResult = patch.fitness >= 70 ? "passed" : "review"
              }
            } else if (sessionType === "pbb") {
              if (patch.pbb !== undefined && patch.pbb !== null) {
                effectiveResult = patch.pbb >= 75 ? "passed" : patch.pbb >= 60 ? "review" : "failed"
              }
            } else if (sessionType === "interview") {
              if (patch.personality !== undefined && patch.personality !== null) {
                effectiveResult =
                  patch.personality >= 75 ? "passed" : patch.personality >= 60 ? "review" : "failed"
              }
            }
          }

          if (stageIndex !== null && effectiveResult !== "pending") {
            const { stageStatuses, activeStageNumber } = applyStageDecision(
              cand.stageStatuses,
              stageIndex,
              effectiveResult as StageStatus,
            )
            patch.stageStatuses = stageStatuses
            patch.stage = activeStageNumber
          }

          // Hitung kehadiran & kepatuhan latihan kandidat secara dinamis dari seluruh sesi yang diikuti
          const assignedSessions = stateRef.current.sessions.filter((s) =>
            s.participantIds.includes(cand.id),
          )
          if (assignedSessions.length > 0) {
            let attendedCount = 0
            let recordedCount = 0
            for (const s of assignedSessions) {
              const r =
                sessionId === s.id
                  ? { attendance: attendance ?? "hadir", savedAt: "now" }
                  : records[`${s.id}:${cand.id}`]
              if (r?.savedAt) {
                recordedCount++
                if (!r.attendance || r.attendance === "hadir") {
                  attendedCount++
                }
              }
            }
            if (recordedCount > 0) {
              patch.attendance = Math.round((attendedCount / recordedCount) * 100)
              patch.trainingCompliance = Math.min(
                100,
                Math.round((recordedCount / assignedSessions.length) * 100),
              )
            }
          }

          return {
            ...cand,
            ...patch,
          }
        })

      // Jika record sesi yang disimpan masih berstatus "pending" namun effectiveResult sudah terinferensi, perbarui juga di records
      let finalRecords = records
      if (sessionId) {
        const recKey = `${sessionId}:${candidateId}`
        const currentRec = records[recKey]
        const targetCand = nextCandidates.find((c) => c.id === candidateId)
        if (currentRec && currentRec.result === "pending" && targetCand) {
          const sIdx =
            sessionType === "administration"
              ? 0
              : sessionType === "pip"
                ? 1
                : sessionType === "tiu"
                  ? 2
                  : sessionType === "medical"
                    ? 3
                    : sessionType === "parade"
                      ? 4
                      : sessionType === "pbb"
                        ? 5
                        : sessionType === "fitness"
                          ? 6
                          : sessionType === "interview"
                            ? 7
                            : null
          const inferredStatus = sIdx !== null ? targetCand.stageStatuses[sIdx] : null
          if (
            inferredStatus === "passed" ||
            inferredStatus === "review" ||
            inferredStatus === "failed"
          ) {
            finalRecords = {
              ...records,
              [recKey]: {
                ...currentRec,
                result: inferredStatus,
              },
            }
            setRecordsRaw(finalRecords)
          }
        }
      }

      stateRef.current = {
        ...stateRef.current,
        allCandidates: nextCandidates,
        records: finalRecords,
      }
      setAllCandidates(nextCandidates)
      logAudit(
        "SESSION_RECORD_SAVED",
        candidateId,
        `Menyimpan hasil sesi ${sessionType.toUpperCase()} (status: ${result})`,
      )
      showToast("Hasil sesi & profil kandidat berhasil disinkronkan.")
      saveToCloud({ candidates: nextCandidates, records: finalRecords })
      return nextCandidates
    },
    [logAudit, showToast, saveToCloud],
  )

  const toggleStageChecklist = useCallback(
    (stageIndex: number, itemIndex: number) => {
      const current = stateRef.current.stageChecklists[stageIndex] ?? [false, false, false, false]
      const next = [...current]
      next[itemIndex] = !next[itemIndex]
      const nextChecklists = { ...stateRef.current.stageChecklists, [stageIndex]: next }
      setStageChecklists(nextChecklists)
      saveToCloud({ stageChecklists: nextChecklists })
    },
    [saveToCloud],
  )

  // Schedule CRUD
  const addSchedule = useCallback(
    (schedule: Omit<SelectionSchedule, "id">) => {
      const next: SelectionSchedule = {
        ...schedule,
        id: `sched-${Date.now()}`,
      }
      const nextSchedules = [next, ...schedules]
      setSchedules(nextSchedules)
      logAudit(
        "CREATE_SCHEDULE",
        next.title,
        `Jadwal tahap ${next.stageId} pada ${next.date}`,
      )
      showToast(`Jadwal "${next.title}" berhasil dibuat.`)
      saveToCloud({ schedules: nextSchedules })
    },
    [schedules, logAudit, showToast, saveToCloud],
  )

  const updateSchedule = useCallback(
    (id: string, patch: Partial<SelectionSchedule>) => {
      const currentList = stateRef.current.schedules
      const nextSchedules = currentList.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      )
      setSchedules(nextSchedules)
      showToast("Jadwal seleksi berhasil diperbarui.")
      saveToCloud({ schedules: nextSchedules })
    },
    [showToast, saveToCloud],
  )

  const deleteSchedule = useCallback(
    (id: string) => {
      const remaining = schedules.filter((item) => item.id !== id)
      setSchedules(remaining)
      showToast("Jadwal seleksi telah dihapus.", "warning")
      saveToCloud({ schedules: remaining })
    },
    [schedules, showToast, saveToCloud],
  )

  const toggleCandidateSchedule = useCallback(
    (scheduleId: string, candidateId: string): boolean => {
      const currentList = stateRef.current.schedules
      const target = currentList.find((s) => s.id === scheduleId)
      if (!target) return false
      const exists = target.assignedCandidateIds.includes(candidateId)
      if (!exists && target.assignedCandidateIds.length >= target.capacity) {
        showToast(
          `Kapasitas sesi penuh (${target.capacity} peserta). Tidak dapat menambah peserta.`,
          "danger",
        )
        return false
      }
      const nextSchedules = currentList.map((s) => {
        if (s.id !== scheduleId) return s
        const nextIds = exists
          ? s.assignedCandidateIds.filter((id) => id !== candidateId)
          : [...s.assignedCandidateIds, candidateId]
        return { ...s, assignedCandidateIds: nextIds }
      })
      setSchedules(nextSchedules)
      saveToCloud({ schedules: nextSchedules })
      return true
    },
    [showToast, saveToCloud],
  )

  // CAT Questions CRUD
  const addQuestion = useCallback(
    (question: Omit<CatQuestion, "id">) => {
      const next: CatQuestion = {
        ...question,
        id: `q-${question.type}-${Date.now()}`,
      }
      const nextQuestions = [next, ...questions]
      setQuestions(nextQuestions)
      logAudit(
        "CREATE_QUESTION",
        `${next.type.toUpperCase()} · ${next.category}`,
        "Menambahkan butir soal baru ke bank soal",
      )
      showToast("Soal berhasil ditambahkan ke Bank Soal CAT.")
      saveToCloud({ questions: nextQuestions })
    },
    [questions, logAudit, showToast, saveToCloud],
  )

  const updateQuestion = useCallback(
    (id: string, patch: Partial<CatQuestion>) => {
      const currentList = stateRef.current.questions
      const nextQuestions = currentList.map((q) =>
        q.id === id ? { ...q, ...patch } : q,
      )
      setQuestions(nextQuestions)
      showToast("Butir soal berhasil diperbarui.")
      saveToCloud({ questions: nextQuestions })
    },
    [showToast, saveToCloud],
  )

  const deleteQuestion = useCallback(
    (id: string) => {
      const remaining = questions.filter((q) => q.id !== id)
      setQuestions(remaining)
      showToast("Butir soal telah dihapus.", "warning")
      saveToCloud({ questions: remaining })
    },
    [questions, showToast, saveToCloud],
  )

  const restoreStandardQuestions = useCallback(() => {
    const currentList = stateRef.current.questions
    const merged = mergeWithStandardQuestions(currentList)
    const changed = JSON.stringify(currentList) !== JSON.stringify(merged)
    setQuestions(merged)
    try {
      localStorage.setItem("paska-clean-questions", JSON.stringify(merged))
    } catch {}
    saveToCloud({ questions: merged })
    return changed ? 1 : 0
  }, [saveToCloud])

  // Supporting Docs CRUD
  const addSupportingDoc = useCallback(
    (doc: Omit<SupportingDoc, "id" | "updatedAt">) => {
      const next: SupportingDoc = {
        ...doc,
        id: `doc-${Date.now()}`,
        updatedAt: "Baru saja",
      }
      const nextDocs = [next, ...supportingDocs]
      setSupportingDocs(nextDocs)
      logAudit("CREATE_DOCUMENT", next.title, `Kategori: ${next.category}`)
      showToast(`Dokumen "${next.title}" berhasil diterbitkan.`)
      saveToCloud({ supportingDocs: nextDocs })
    },
    [supportingDocs, logAudit, showToast, saveToCloud],
  )

  const updateSupportingDoc = useCallback(
    (id: string, patch: Partial<SupportingDoc>) => {
      const currentList = stateRef.current.supportingDocs
      const nextDocs = currentList.map((d) =>
        d.id === id ? { ...d, ...patch, updatedAt: "Baru saja" } : d,
      )
      setSupportingDocs(nextDocs)
      showToast("Dokumen pendukung berhasil diperbarui.")
      saveToCloud({ supportingDocs: nextDocs })
    },
    [showToast, saveToCloud],
  )

  const deleteSupportingDoc = useCallback(
    (id: string) => {
      const remaining = supportingDocs.filter((d) => d.id !== id)
      setSupportingDocs(remaining)
      showToast("Dokumen telah dihapus.", "warning")
      saveToCloud({ supportingDocs: remaining })
    },
    [supportingDocs, showToast, saveToCloud],
  )

  // Standards Governance
  const updateStandardRule = useCallback(
    (id: string, patch: Partial<StandardRuleItem>) => {
      const currentList = stateRef.current.standardRules
      const nextRules = currentList.map((rule) =>
        rule.id === id ? { ...rule, ...patch, updatedAt: "Baru saja" } : rule,
      )
      setStandardRules(nextRules)
      logAudit(
        "UPDATE_STANDARD_RULE",
        id,
        `Status aturan diubah menjadi ${patch.status ?? "diperbarui"} oleh ${patch.approver ?? currentUser.name}`,
      )
      showToast("Register aturan standar berhasil diperbarui.")
      saveToCloud({ standardRules: nextRules })
    },
    [currentUser.name, logAudit, showToast, saveToCloud],
  )

  const setRankingPublished = useCallback(
    (value: boolean) => {
      setRankingPublishedState(value)
      logAudit(
        value ? "PUBLISH_RANKING" : "UNPUBLISH_RANKING",
        activeCycle.name,
        value
          ? "Mempublikasikan leaderboard hasil akhir ke portal kandidat"
          : "Menarik kembali publikasi leaderboard",
      )
      showToast(
        value
          ? "Hasil pemeringkatan resmi dipublikasikan ke Portal Kandidat."
          : "Publikasi pemeringkatan ditarik kembali ke mode draft internal.",
        value ? "success" : "info",
      )
      saveToCloud({ rankingPublished: value })
    },
    [activeCycle.name, logAudit, showToast, saveToCloud],
  )

  // Ishihara Screening Actions (PRD Version 1.1)
  const addAuthorizedAccount = useCallback(
    (acc: Omit<AuthorizedAccount, "id" | "createdAt" | "approvedAt">) => {
      const now = new Date().toISOString()
      const newAcc: AuthorizedAccount = {
        ...acc,
        id: `auth-${Date.now()}`,
        approvedAt: now,
        createdAt: now,
      }
      setIshiharaAllowlist((prev) => [newAcc, ...prev])
      logAudit("ADD_ALLOWLIST", acc.emailNormalized, `Mengizinkan akun ${acc.fullName} (${acc.role})`)
      showToast(`Akun ${acc.emailNormalized} berhasil diizinkan.`, "success")
      saveToCloud({ ishiharaAllowlist: [newAcc, ...ishiharaAllowlist] })
    },
    [ishiharaAllowlist, logAudit, showToast, saveToCloud],
  )

  const toggleAuthorizedAccount = useCallback(
    (id: string) => {
      let updated: AuthorizedAccount[] = []
      setIshiharaAllowlist((prev) => {
        updated = prev.map((a) => (a.id === id ? { ...a, isAllowed: !a.isAllowed } : a))
        return updated
      })
      const target = ishiharaAllowlist.find((a) => a.id === id)
      logAudit(
        "TOGGLE_ALLOWLIST",
        target?.emailNormalized ?? id,
        `Mengubah status izin akun menjadi ${target?.isAllowed ? "Nonaktif" : "Aktif"}`,
      )
      showToast(`Status izin akun ${target?.emailNormalized} diperbarui.`)
      saveToCloud({ ishiharaAllowlist: updated })
    },
    [ishiharaAllowlist, logAudit, showToast, saveToCloud],
  )

  const updateAuthorizedAccountRole = useCallback(
    (id: string, role: AccountRole) => {
      let updated: AuthorizedAccount[] = []
      setIshiharaAllowlist((prev) => {
        updated = prev.map((a) => (a.id === id ? { ...a, role } : a))
        return updated
      })
      const target = ishiharaAllowlist.find((a) => a.id === id)
      logAudit("UPDATE_ROLE", target?.emailNormalized ?? id, `Mengubah peran menjadi ${role}`)
      showToast(`Peran akun ${target?.emailNormalized} diubah menjadi ${role}.`)
      saveToCloud({ ishiharaAllowlist: updated })
    },
    [ishiharaAllowlist, logAudit, showToast, saveToCloud],
  )

  const deleteAuthorizedAccount = useCallback(
    (id: string) => {
      const target = ishiharaAllowlist.find((a) => a.id === id)
      const remaining = ishiharaAllowlist.filter((a) => a.id !== id)
      setIshiharaAllowlist(remaining)
      logAudit("DELETE_ALLOWLIST", target?.emailNormalized ?? id, `Mencabut izin akun ${target?.fullName}`)
      showToast(`Izin akun ${target?.emailNormalized} telah dicabut.`, "warning")
      saveToCloud({ ishiharaAllowlist: remaining })
    },
    [ishiharaAllowlist, logAudit, showToast, saveToCloud],
  )

  const addIshiharaSession = useCallback(
    (session: Omit<IshiharaTestSession, "id" | "createdAt">) => {
      const now = new Date().toISOString()
      const newSession: IshiharaTestSession = {
        ...session,
        id: `session-ish-${Date.now()}`,
        createdAt: now,
      }
      const updated = [newSession, ...ishiharaSessions]
      setIshiharaSessions(updated)
      logAudit("CREATE_SESSION", newSession.code, `Membuat sesi skrining ${newSession.name} (${newSession.mode})`)
      showToast(`Sesi "${newSession.name}" (${newSession.code}) berhasil dibuat.`, "success")
      saveToCloud({ ishiharaSessions: updated })
    },
    [ishiharaSessions, logAudit, showToast, saveToCloud],
  )

  const updateIshiharaSession = useCallback(
    (id: string, patch: Partial<IshiharaTestSession>) => {
      let updated: IshiharaTestSession[] = []
      setIshiharaSessions((prev) => {
        updated = prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
        return updated
      })
      showToast("Sesi skrining berhasil diperbarui.")
      saveToCloud({ ishiharaSessions: updated })
    },
    [showToast, saveToCloud],
  )

  const deleteIshiharaSession = useCallback(
    (id: string) => {
      const target = ishiharaSessions.find((s) => s.id === id)
      const remaining = ishiharaSessions.filter((s) => s.id !== id)
      setIshiharaSessions(remaining)
      logAudit("DELETE_SESSION", target?.code ?? id, `Menghapus sesi ${target?.name}`)
      showToast(`Sesi "${target?.name}" berhasil dihapus.`, "warning")
      saveToCloud({ ishiharaSessions: remaining })
    },
    [ishiharaSessions, logAudit, showToast, saveToCloud],
  )

  const updateSessionAssignment = useCallback(
    (sessionId: string, assignmentId: string, patch: Partial<TestAssignment>) => {
      let updated: IshiharaTestSession[] = []
      setIshiharaSessions((prev) => {
        updated = prev.map((sess) => {
          if (sess.id !== sessionId) return sess
          return {
            ...sess,
            assignments: sess.assignments.map((asg) =>
              asg.id === assignmentId ? { ...asg, ...patch } : asg,
            ),
          }
        })
        return updated
      })
      saveToCloud({ ishiharaSessions: updated })
    },
    [saveToCloud],
  )

  const saveIshiharaScreeningResult = useCallback(
    (result: IshiharaScreeningResult) => {
      const updated = [result, ...ishiharaResults]
      setIshiharaResults(updated)
      updateSessionAssignment(result.sessionId, `asg-${result.participantId}`, {
        status: result.completionStatus === "completed" ? "completed" : "in_progress",
        completedAt: result.createdAt,
        accuracy: result.accuracy,
        correctCount: result.correctCount,
        totalPlates: result.totalPlates,
        avgTimeSec: result.avgTimeSec,
        interpretationCode: result.screeningInterpretation,
      })
      updateCandidateStage(
        result.participantId,
        3,
        result.screeningInterpretation === "normal" ? "passed" : "review",
        `Skrining Ishihara (${result.sessionName}): Akurasi ${result.accuracy}%. ${result.interpretationLabel}`,
      )
      logAudit(
        "SAVE_ISHIHARA_RESULT",
        result.participantName,
        `Hasil Ishihara: ${result.interpretationLabel} (${result.accuracy}%)`,
      )
      showToast(
        `Hasil skrining ${result.participantName} (${result.accuracy}%) tersimpan & disinkronkan ke Rikkes.`,
        "success",
      )
      saveToCloud({ ishiharaResults: updated })
    },
    [
      ishiharaResults,
      updateSessionAssignment,
      updateCandidateStage,
      logAudit,
      showToast,
      saveToCloud,
    ],
  )

  // Cloud Sync with Supabase Edge Function (with automatic local fallback)
  const syncWithBackend = useCallback(async () => {
    setSyncStatus("syncing")
    try {
      const response = await fetch(`${serverUrl}/state`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          candidates: allCandidates,
          schedules,
          questions,
          announcements: supportingDocs,
          standards: standardRules,
          users,
          audit: auditLogs,
          checklists: stageChecklists,
        }),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      setSyncStatus("synced")
      showToast("Sinkronisasi cloud Supabase berhasil.", "success")
    } catch {
      setSyncStatus("local")
      showToast(
        "Data tersimpan aman di penyimpanan lokal browser (Mode Offline/Lokal aktif).",
        "info",
      )
    }
  }, [
    allCandidates,
    schedules,
    questions,
    supportingDocs,
    standardRules,
    users,
    auditLogs,
    stageChecklists,
    showToast,
  ])

  const resetAllData = useCallback(() => {
    localStorage.clear()
    deletedCandidateIdsRef.current.clear()
    setCycles(initialCycles)
    setActiveCycleId(initialCycles[0].id)
    setUsers(initialUsers)
    setCurrentUserId(initialUsers[0].id)
    setIsAuthenticated(true)
    setAllCandidates(seededCandidates)
    setCatTryoutAttempts([])
    setStageChecklists(defaultChecklists)
    setSchedules(initialSchedules)
    setQuestions(initialQuestions)
    setSupportingDocs(initialSupportingDocs)
    setStandardRules(initialStandardRules)
    setRankingPublishedState(false)
    setAuditLogs(initialAuditLogs)
    setSessions([])
    setRecords({})
    broadcastStateSync("resetAllData")
    window.dispatchEvent(new CustomEvent("paska-track-updated"))
    showToast("Seluruh data berhasil direset ke kondisi awal.", "info")
  }, [broadcastStateSync, showToast])

  // Google Sheet Methods
  const setGoogleSheetUrl = useCallback((url: string) => {
    saveGasUrl(url)
    setGoogleSheetUrlState(url.trim())
  }, [])

  const setAutoSyncGoogleSheet = useCallback((enabled: boolean) => {
    setAutoSyncEnabled(enabled)
    setAutoSyncGoogleSheetState(enabled)
  }, [])

  const hasUnsavedChanges = Boolean(
    googleSheetUrl &&
      lastSyncedHash.current &&
      computeDataHash() !== lastSyncedHash.current,
  )

  // Fungsi sinkronisasi cloud utama:
  // 1. Membuka pertama kali ("initial")
  // 2. Tombol refresh ("manual")
  // 3. Ditinggal lama / sinkronisasi berkala ("idle")
  const refreshAndSync = useCallback(
    async (reason: "initial" | "manual" | "idle" = "manual") => {
      const targetUrl = googleSheetUrl.trim()
      if (!targetUrl) {
        if (reason === "manual") {
          showToast("URL Google Apps Script belum diatur.", "warning")
        }
        return
      }

      if (isSyncingRef.current || isSavingRef.current) return
      isSyncingRef.current = true
      setCloudSyncStatus(reason === "initial" ? "pulling" : "syncing")

      try {
        // 1. Tarik data terbaru dari Google Sheet terlebih dahulu (Pull First)
        const res = await pullStateFromGoogleSheet(targetUrl)

        // 2. KRUSIAL: Ambil stateRef.current dan localStorage SETELAH await pullStateFromGoogleSheet selesai
        // agar kandidat baru yang didaftarkan saat request jaringan sedang berjalan TIDAK PERNAH tertimpa!
        const s = stateRef.current
        deletedCandidateIdsRef.current = loadDeletedCandidateIds()
        const storageCandidates = loadStorage<Candidate[]>(
          "paska-clean-candidates",
          [],
        )
        const storageAttempts = loadStorage<CatTryoutAttempt[]>(
          "paska-cat-tryout-attempts",
          [],
        )
        const activeCatCandidates = readActiveCatCandidatesFromStorage()

        if (res.ok && res.data) {
          const d = res.data
          const localSnapshot: AppDatabaseState = {
            candidates: s.allCandidates,
            catTryoutAttempts: s.catTryoutAttempts,
            cycles: s.cycles,
            activeCycleId: s.activeCycleId,
            sessions: s.sessions,
            records: s.records,
            schedules: s.schedules,
            questions: s.questions,
            supportingDocs: s.supportingDocs,
            standardRules: s.standardRules,
            stageChecklists: s.stageChecklists,
            users: s.users,
            auditLogs: s.auditLogs,
            rankingPublished: s.rankingPublished,
            ishiharaSessions: s.ishiharaSessions,
            ishiharaAllowlist: s.ishiharaAllowlist,
            ishiharaResults: s.ishiharaResults,
            deletedCandidateIds: Array.from(deletedCandidateIdsRef.current),
          }

          const { mergedState, localHasNewerData } = mergeDatabaseStates({
            localState: localSnapshot,
            cloudState: d,
            storageCandidates,
            storageAttempts,
            activeCatCandidates,
            deletedCandidateIds: deletedCandidateIdsRef.current,
            currentUserId: s.currentUserId,
          })

          if (Array.isArray(mergedState.deletedCandidateIds)) {
            deletedCandidateIdsRef.current = new Set(
              mergedState.deletedCandidateIds,
            )
            saveDeletedCandidateIds(deletedCandidateIdsRef.current)
          }

          const mergedQuestions = mergeWithStandardQuestions(
            Array.isArray(d.questions) ? d.questions : s.questions,
          )

          stateRef.current = {
            ...stateRef.current,
            allCandidates: mergedState.candidates,
            catTryoutAttempts: mergedState.catTryoutAttempts || [],
            sessions: mergedState.sessions || [],
            records: mergedState.records || {},
            schedules: mergedState.schedules || [],
            questions: mergedQuestions,
            users: mergedState.users || s.users,
            auditLogs: mergedState.auditLogs || s.auditLogs,
            ishiharaSessions: mergedState.ishiharaSessions || [],
            ishiharaResults: mergedState.ishiharaResults || [],
          }

          setAllCandidates(mergedState.candidates)
          setCatTryoutAttempts(mergedState.catTryoutAttempts || [])
          if (Array.isArray(mergedState.cycles) && mergedState.cycles.length > 0) {
            setCycles(mergedState.cycles)
          }
          if (mergedState.activeCycleId) {
            setActiveCycleId(mergedState.activeCycleId)
          }
          setSessions(mergedState.sessions || [])
          setRecords(mergedState.records || {})
          if (
            Array.isArray(mergedState.schedules) &&
            mergedState.schedules.length > 0
          ) {
            setSchedules(mergedState.schedules)
          }
          setQuestions(mergedQuestions)
          if (
            Array.isArray(mergedState.supportingDocs) &&
            mergedState.supportingDocs.length > 0
          ) {
            setSupportingDocs(mergedState.supportingDocs)
          }
          if (
            Array.isArray(mergedState.standardRules) &&
            mergedState.standardRules.length > 0
          ) {
            setStandardRules(mergedState.standardRules)
          }
          if (
            mergedState.stageChecklists &&
            typeof mergedState.stageChecklists === "object"
          ) {
            setStageChecklists(mergedState.stageChecklists)
          }
          if (Array.isArray(mergedState.users) && mergedState.users.length > 0) {
            setUsers(mergedState.users)
          }
          if (
            Array.isArray(mergedState.auditLogs) &&
            mergedState.auditLogs.length > 0
          ) {
            setAuditLogs(mergedState.auditLogs)
          }
          if (mergedState.rankingPublished !== undefined) {
            setRankingPublishedState(mergedState.rankingPublished)
          }
          setIshiharaSessions(mergedState.ishiharaSessions || [])
          if (
            Array.isArray(mergedState.ishiharaAllowlist) &&
            mergedState.ishiharaAllowlist.length > 0
          ) {
            setIshiharaAllowlist(mergedState.ishiharaAllowlist)
          }
          setIshiharaResults(mergedState.ishiharaResults || [])

          try {
            localStorage.setItem(
              "paska-clean-candidates",
              JSON.stringify(mergedState.candidates),
            )
            localStorage.setItem(
              "paska-cat-tryout-attempts",
              JSON.stringify(mergedState.catTryoutAttempts || []),
            )
          } catch {}
          broadcastStateSync("refreshAndSync")

          const newSyncedHash = JSON.stringify({
            c: mergedState.candidates,
            cat: mergedState.catTryoutAttempts || [],
            s: mergedState.sessions || [],
            r: mergedState.records || {},
            sch: mergedState.schedules || s.schedules,
            q: mergedQuestions,
            d: mergedState.supportingDocs || s.supportingDocs,
            st: mergedState.standardRules || s.standardRules,
            ch:
              mergedState.stageChecklists ||
              s.stageChecklists ||
              defaultChecklists,
            ish: mergedState.ishiharaSessions || [],
            alw: mergedState.ishiharaAllowlist || s.ishiharaAllowlist || [],
            res: mergedState.ishiharaResults || [],
          })
          lastSyncedHash.current = newSyncedHash

          // Jika ada data lokal yang belum ada atau lebih baru dibanding cloud, dorong data gabungan ke cloud
          const cloudAttemptsLen = Array.isArray(d.catTryoutAttempts)
            ? d.catTryoutAttempts.length
            : 0
          const cloudCandsLen = Array.isArray(d.candidates)
            ? d.candidates.length
            : 0
          if (
            (mergedState.catTryoutAttempts || []).length > cloudAttemptsLen ||
            mergedState.candidates.length > cloudCandsLen ||
            localHasNewerData
          ) {
            const mergedStateToPush: AppDatabaseState = {
              ...mergedState,
              questions: mergedQuestions,
              users: (mergedState.users || []).filter(
                (u) => u.role !== "candidate",
              ),
            }
            await pushStateToGoogleSheet(mergedStateToPush, targetUrl)
          }

          setCloudSyncStatus("synced")
          const now = new Date().toISOString()
          setLastCloudSync(now)
          if (reason === "manual") {
            showToast("Sinkronisasi Google Sheet berhasil!", "success")
            logAudit(
              "SYNC_GOOGLE_SHEET",
              "Google Sheet",
              `Sinkronisasi ${mergedState.candidates.length} kandidat & ${(mergedState.catTryoutAttempts || []).length} riwayat CAT berhasil`,
            )
          }
        } else if (res.ok && !res.data) {
          // Google Sheet kosong tapi lokal ada data
          if (s.allCandidates.length > 0 || s.sessions.length > 0 || s.ishiharaSessions.length > 0) {
            const stateToPush: AppDatabaseState = {
              candidates: s.allCandidates,
              catTryoutAttempts: s.catTryoutAttempts,
              cycles: s.cycles,
              activeCycleId: s.activeCycleId,
              sessions: s.sessions,
              records: s.records,
              schedules: s.schedules,
              questions: s.questions,
              supportingDocs: s.supportingDocs,
              standardRules: s.standardRules,
              stageChecklists: s.stageChecklists,
              users: s.users.filter((u) => u.role !== "candidate"),
              auditLogs: s.auditLogs,
              rankingPublished: s.rankingPublished,
              ishiharaSessions: s.ishiharaSessions,
              ishiharaAllowlist: s.ishiharaAllowlist,
              ishiharaResults: s.ishiharaResults,
              deletedCandidateIds: Array.from(deletedCandidateIdsRef.current),
            }
            await pushStateToGoogleSheet(stateToPush, targetUrl)
            lastSyncedHash.current = computeDataHash()
          }
          setCloudSyncStatus("synced")
        } else {
          setCloudSyncStatus("error")
          if (reason === "manual") showToast(res.message, "danger")
        }
      } catch (err) {
        setCloudSyncStatus("error")
        const msg = err instanceof Error ? err.message : String(err)
        if (reason === "manual") showToast(`Gagal sinkron: ${msg}`, "danger")
      } finally {
        isSyncingRef.current = false
      }
    },
    [
      googleSheetUrl,
      computeDataHash,
      showToast,
      logAudit,
      broadcastStateSync,
      setSessions,
      setRecords,
    ],
  )

  const syncToGoogleSheet = useCallback(
    async (customUrl?: string, silent: boolean = false) => {
      await refreshAndSync(silent ? "idle" : "manual")
      return { ok: true, message: "Sinkronisasi selesai" }
    },
    [refreshAndSync],
  )

  const pullFromGoogleSheet = useCallback(
    async (customUrl?: string, silent: boolean = false) => {
      await refreshAndSync(silent ? "initial" : "manual")
      return { ok: true, message: "Sinkronisasi selesai" }
    },
    [refreshAndSync],
  )

  const testGoogleSheet = useCallback(
    async (customUrl?: string) => {
      const res = await testGasConnection(customUrl || googleSheetUrl)
      if (res.ok) {
        showToast(res.message, "success")
      } else {
        showToast(res.message, "danger")
      }
      return res
    },
    [googleSheetUrl, showToast],
  )

  // 1. Kondisi 1: Membuka pertama kali -> otomatis sinkron data terbaru dari Google Sheet (hanya 1x)
  useEffect(() => {
    if (!initialMountDone.current && googleSheetUrl) {
      initialMountDone.current = true
      refreshAndSync("initial")
    }
  }, [googleSheetUrl, refreshAndSync])

  // 3. Kondisi 3: Ditinggal lama -> otomatis sinkron saat ditinggal > 3 menit atau idle > 5 menit
  useEffect(() => {
    if (!googleSheetUrl) return

    let lastActive = Date.now()
    const handleActivity = () => {
      lastActive = Date.now()
    }

    window.addEventListener("pointerdown", handleActivity, { passive: true })
    window.addEventListener("keydown", handleActivity, { passive: true })

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        if (
          document.activeElement &&
          (document.activeElement.tagName === "INPUT" ||
            document.activeElement.tagName === "TEXTAREA")
        ) {
          return
        }
        const timeAwayMs = Date.now() - lastActive
        if (timeAwayMs > 180000) {
          // Tab ditinggal > 3 menit
          refreshAndSync("idle")
        }
        lastActive = Date.now()
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)

    const idleTimer = setInterval(() => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === "INPUT" ||
          document.activeElement.tagName === "TEXTAREA")
      ) {
        return
      }
      const timeAwayMs = Date.now() - lastActive
      if (timeAwayMs > 300000) {
        // Tidak ada interaksi > 5 menit
        refreshAndSync("idle")
        lastActive = Date.now()
      }
    }, 60000)

    return () => {
      window.removeEventListener("pointerdown", handleActivity)
      window.removeEventListener("keydown", handleActivity)
      document.removeEventListener("visibilitychange", handleVisibility)
      clearInterval(idleTimer)
    }
  }, [googleSheetUrl, refreshAndSync])

  const value = useMemo<AppContextValue>(
    () => ({
      cycles,
      activeCycle,
      setActiveCycleId,
      addCycle,
      updateCycle,
      deleteCycle,
      currentUser,
      users,
      isAuthenticated,
      loginAs,
      loginAsCandidate,
      loginCandidateByNik,
      loginCoachWithGoogle,
      logout,
      addUser,
      toggleUserActive,
      candidates,
      allCandidates,
      addCandidate,
      updateCandidate,
      catTryoutAttempts,
      saveCatTryoutAttempt,
      deleteCatTryoutAttempt,
      deleteCandidate,
      importCandidates,
      updateCandidateStage,
      toggleCandidateDocument,
      addAnthropometryLog,
      deleteAnthropometryLog,
      addIntervalLog,
      deleteIntervalLog,
      syncCandidateFromSession,
      stageChecklists,
      toggleStageChecklist,
      schedules,
      addSchedule,
      updateSchedule,
      deleteSchedule,
      toggleCandidateSchedule,
      questions,
      addQuestion,
      updateQuestion,
      deleteQuestion,
      restoreStandardQuestions,
      supportingDocs,
      addSupportingDoc,
      updateSupportingDoc,
      deleteSupportingDoc,
      standardRules,
      updateStandardRule,
      rankingPublished,
      setRankingPublished,
      auditLogs,
      logAudit,
      toast,
      showToast,
      clearToast,
      syncStatus,
      syncWithBackend,
      resetAllData,
      sessions,
      setSessions,
      records,
      setRecords,
      googleSheetUrl,
      setGoogleSheetUrl,
      autoSyncGoogleSheet,
      setAutoSyncGoogleSheet,
      cloudSyncStatus,
      lastCloudSync,
      syncToGoogleSheet,
      pullFromGoogleSheet,
      testGoogleSheet,
      saveToCloud,
      refreshAndSync,
      hasUnsavedChanges,
      ishiharaSessions,
      setIshiharaSessions,
      ishiharaAllowlist,
      setIshiharaAllowlist,
      ishiharaResults,
      setIshiharaResults,
      addAuthorizedAccount,
      toggleAuthorizedAccount,
      updateAuthorizedAccountRole,
      deleteAuthorizedAccount,
      addIshiharaSession,
      updateIshiharaSession,
      deleteIshiharaSession,
      updateSessionAssignment,
      saveIshiharaScreeningResult,
    }),
    [
      cycles,
      activeCycle,
      addCycle,
      updateCycle,
      deleteCycle,
      currentUser,
      users,
      isAuthenticated,
      loginAs,
      loginAsCandidate,
      loginCandidateByNik,
      loginCoachWithGoogle,
      logout,
      addUser,
      toggleUserActive,
      candidates,
      allCandidates,
      addCandidate,
      updateCandidate,
      catTryoutAttempts,
      saveCatTryoutAttempt,
      deleteCatTryoutAttempt,
      deleteCandidate,
      importCandidates,
      updateCandidateStage,
      toggleCandidateDocument,
      addAnthropometryLog,
      deleteAnthropometryLog,
      addIntervalLog,
      deleteIntervalLog,
      syncCandidateFromSession,
      stageChecklists,
      toggleStageChecklist,
      schedules,
      addSchedule,
      updateSchedule,
      deleteSchedule,
      toggleCandidateSchedule,
      questions,
      addQuestion,
      updateQuestion,
      deleteQuestion,
      restoreStandardQuestions,
      supportingDocs,
      addSupportingDoc,
      updateSupportingDoc,
      deleteSupportingDoc,
      standardRules,
      updateStandardRule,
      rankingPublished,
      setRankingPublished,
      auditLogs,
      logAudit,
      toast,
      showToast,
      clearToast,
      syncStatus,
      syncWithBackend,
      resetAllData,
      sessions,
      records,
      googleSheetUrl,
      setGoogleSheetUrl,
      autoSyncGoogleSheet,
      setAutoSyncGoogleSheet,
      cloudSyncStatus,
      lastCloudSync,
      syncToGoogleSheet,
      pullFromGoogleSheet,
      testGoogleSheet,
      saveToCloud,
      refreshAndSync,
      hasUnsavedChanges,
      ishiharaSessions,
      ishiharaAllowlist,
      ishiharaResults,
      addAuthorizedAccount,
      toggleAuthorizedAccount,
      updateAuthorizedAccountRole,
      deleteAuthorizedAccount,
      addIshiharaSession,
      updateIshiharaSession,
      deleteIshiharaSession,
      updateSessionAssignment,
      saveIshiharaScreeningResult,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error("useApp must be used within an AppProvider")
  }
  return ctx
}

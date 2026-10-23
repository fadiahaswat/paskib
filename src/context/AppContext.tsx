import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
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
    loadStorage("paska-clean-current-user", initialUsers[0].id),
  )
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    loadStorage("paska-clean-auth", true),
  )
  const [allCandidates, setAllCandidates] = useState<Candidate[]>(() => {
    const isFirstSamaptaClean = typeof window !== "undefined" && !localStorage.getItem("paska-samapta-purged-v2")
    if (isFirstSamaptaClean) {
      try {
        localStorage.setItem("paska-samapta-purged-v2", "true")
      } catch {}
    }

    const isIntervalPurgedV6 = typeof window !== "undefined" && !localStorage.getItem("paska-samapta-interval-purged-v6")
    if (isIntervalPurgedV6) {
      try {
        localStorage.setItem("paska-samapta-interval-purged-v6", "true")
      } catch {}
    }

    const loaded = loadStorage<Candidate[]>("paska-clean-candidates", seededCandidates)
    const baseList = !loaded || loaded.length === 0 ? seededCandidates : loaded
    // Ensure all 13 seeded candidates are always present
    const candidateMap = new Map<string, Candidate>()
    for (const sc of seededCandidates) {
      candidateMap.set(sc.number, sc)
    }
    for (const c of baseList) {
      const existing = candidateMap.get(c.number)
      candidateMap.set(c.number || c.id, { ...(existing ?? {}), ...c })
    }
    const merged = Array.from(candidateMap.values())
    const sanitized = merged.map((c) => {
      const match = seededCandidates.find((sc) => sc.id === c.id || sc.number === c.number)
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

        if (
          seededDist &&
          seededDist >= 2000 &&
          (runMetricDist === null || runMetricDist < 2000 || isIntervalPurgedV6)
        ) {
          // Pulihkan kembali ke hasil tes resmi Lari 12 Menit yang sah (misal 2.880 m untuk Devga, 2.740 m untuk Alfan)
          metrics = match.physicalMetrics
          if (match.fitness) {
            candidateFitness = match.fitness
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
          Array.isArray(c.documents) && c.documents.length === 6 && c.documents.some(Boolean)
            ? c.documents
            : match?.documents ?? [true, true, true, true, true, true],
        stage: typeof c.stage === "number" ? c.stage : (match ? match.stage : 1),
        stageStatuses:
          Array.isArray(c.stageStatuses) && c.stageStatuses.length === 8
            ? c.stageStatuses
            : match?.stageStatuses ?? ["active", "locked", "locked", "locked", "locked", "locked", "locked", "locked"],
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
  const [sessions, setSessions] = useState<Session[]>(() => {
    const loaded = loadStorage<Session[]>("paska-clean-sessions", initialSessions)
    if (!loaded || loaded.length === 0) return initialSessions
    return loaded
  })
  const [records, setRecords] = useState<Record<string, SessionRecord>>(() => {
    const loaded = loadStorage<Record<string, SessionRecord>>(
      "paska-clean-records",
      initialRecords,
    )
    if (!loaded || Object.keys(loaded).length === 0) return initialRecords
    return loaded
  })
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

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) ?? users[0],
    [users, currentUserId],
  )

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

  // Auto-recovery: if allCandidates is somehow cleared, immediately restore all 13 candidates
  useEffect(() => {
    if (allCandidates.length === 0) {
      setAllCandidates(
        seededCandidates.map((c) => ({
          ...c,
          cycleId: activeCycle.id || "cycle-2027-kab",
        })),
      )
    }
  }, [allCandidates.length, activeCycle.id])

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
    localStorage.setItem(
      "paska-clean-candidates",
      JSON.stringify(allCandidates),
    )
  }, [allCandidates])

  useEffect(() => {
    localStorage.setItem("paska-cat-tryout-attempts", JSON.stringify(catTryoutAttempts))
  }, [catTryoutAttempts])

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
        saveQueueRef.current = {
          ...(saveQueueRef.current || {}),
          ...(override || {}),
        }
        return { ok: true, message: "Perubahan dijadwalkan untuk disimpan" }
      }

      isSavingRef.current = true
      setCloudSyncStatus("syncing")

      try {
        const s = stateRef.current
        const stateToPush: AppDatabaseState = {
          candidates: override?.candidates ?? s.allCandidates,
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
          executePushToCloud(nextOverride)
        }
      }
    },
    [googleSheetUrl],
  )

  const saveToCloud = useCallback(
    (override?: Partial<AppDatabaseState>): Promise<{ ok: boolean, message: string }> => {
      if (override) {
        pendingSaveOverrideRef.current = {
          ...pendingSaveOverrideRef.current,
          ...override,
        }
      }
      if (saveDebounceTimerRef.current) {
        window.clearTimeout(saveDebounceTimerRef.current)
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
      const updated = [
        attempt,
        ...stateRef.current.catTryoutAttempts.filter((item) => item.id !== attempt.id),
      ]
      stateRef.current = { ...stateRef.current, catTryoutAttempts: updated }
      setCatTryoutAttempts(updated)
      void saveToCloud({ catTryoutAttempts: updated })
    },
    [saveToCloud],
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
      const cand = allCandidates.find(
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
      const existingUser = users.find(
        (u) => u.candidateId === cand.id || u.id === candidateUserId,
      )

      if (existingUser) {
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
        setUsers((prev) => [
          candidateUser,
          ...prev.filter((u) => u.id !== candidateUser.id),
        ])
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
    [allCandidates, users, showToast, logAudit],
  )

  const loginCandidateByNik = useCallback(
    (nikInput: string): { success: boolean; candidate?: Candidate; error?: string } => {
      const clean = nikInput.replace(/\s+/g, "").trim()
      if (!clean) {
        const errMsg = "Silakan masukkan 16 digit NIK santri."
        showToast(errMsg, "warning")
        return { success: false, error: errMsg }
      }

      const cand = allCandidates.find(
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
    [allCandidates, loginAsCandidate, showToast, logAudit],
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
      const nextIndex = allCandidates.length + 1
      const number =
        data.number?.trim() ||
        `KAB-${String(activeCycle.year).slice(-2)}-${String(nextIndex).padStart(3, "0")}`
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
      const todayStr = new Date().toISOString().slice(0, 10)
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
        id: `cand-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
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
      }
      const nextCandidates = [next, ...allCandidates]
      setAllCandidates(nextCandidates)
      logAudit(
        "CREATE_CANDIDATE",
        `${next.name} (${next.number})`,
        `Menambahkan kandidat baru dari ${next.school}`,
      )
      showToast(`Kandidat ${next.name} (${next.number}) berhasil ditambahkan.`)
      saveToCloud({ candidates: nextCandidates })
      return next
    },
    [
      allCandidates,
      activeCycle.id,
      activeCycle.year,
      logAudit,
      showToast,
      saveToCloud,
    ],
  )

  const updateCandidate = useCallback(
    (id: string, patch: Partial<Candidate>) => {
      const currentList = stateRef.current.allCandidates
      const nextCandidates = currentList.map((item) => {
        if (item.id !== id) return item
        const updatedName = patch.name ?? item.name
        return {
          ...item,
          ...patch,
          avatar: patch.name ? makeAvatar(updatedName) : item.avatar,
          updatedAt: "Baru saja",
        }
      })
      stateRef.current = { ...stateRef.current, allCandidates: nextCandidates }
      setAllCandidates(nextCandidates)
      logAudit("UPDATE_CANDIDATE", id, "Memperbarui data/profil kandidat")
      showToast("Data kandidat berhasil diperbarui.")
      saveToCloud({ candidates: nextCandidates })
    },
    [logAudit, showToast, saveToCloud],
  )

  const deleteCandidate = useCallback(
    (id: string) => {
      const target = allCandidates.find((c) => c.id === id)
      const nextCandidates = allCandidates.filter((item) => item.id !== id)
      setAllCandidates(nextCandidates)
      if (target) {
        logAudit(
          "DELETE_CANDIDATE",
          `${target.name} (${target.number})`,
          "Menghapus data kandidat dari periode aktif",
        )
        showToast(`Kandidat ${target.name} telah dihapus.`, "warning")
      }
      saveToCloud({ candidates: nextCandidates })
    },
    [allCandidates, logAudit, showToast, saveToCloud],
  )

  const importCandidates = useCallback(
    (newItems: Candidate[]) => {
      if (!newItems.length) return 0
      const nextCandidates = [...newItems, ...allCandidates]
      setAllCandidates(nextCandidates)
      logAudit(
        "IMPORT_CANDIDATES",
        `${newItems.length} kandidat`,
        "Impor massal data kandidat via CSV",
      )
      showToast(`${newItems.length} kandidat berhasil diimpor.`)
      saveToCloud({ candidates: nextCandidates })
      return newItems.length
    },
    [allCandidates, logAudit, showToast, saveToCloud],
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
      stateRef.current = { ...stateRef.current, allCandidates: nextCandidates }
      setAllCandidates(nextCandidates)
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
      saveToCloud({ candidates: nextCandidates })
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
        let nextStageStatuses = cand.stageStatuses
        let nextStage = cand.stage
        // If candidate is in stage 1 and all 6 docs become valid, can mark stage 1 passed or ready
        if (
          cand.stage === 1 &&
          allValid &&
          (cand.stageStatuses[0] === "review" || cand.stageStatuses[0] === "active")
        ) {
          const applied = applyStageDecision(cand.stageStatuses, 0, "passed")
          nextStageStatuses = applied.stageStatuses
          nextStage = applied.activeStageNumber
        }
        return {
          ...cand,
          documents: docs,
          stageStatuses: nextStageStatuses,
          stage: nextStage,
          updatedAt: "Baru saja",
        }
      })
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
        .map((session) => ({
          sessionId: session.id,
          sessionTitle: session.title,
          isInterval: session.title.toLowerCase().includes("interval"),
          savedAt: records[`${session.id}:${candidateId}`]?.savedAt ?? "",
          metrics: records[`${session.id}:${candidateId}`]?.metrics ?? {},
        }))
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
            const hasAnyDocKey = [0, 1, 2, 3, 4, 5].some((idx) => `document-${idx}` in metrics)
            if (hasAnyDocKey) {
              patch.documents = [0, 1, 2, 3, 4, 5].map(
                (idx) => metrics[`document-${idx}`] === "valid",
              )
            }
          } else if (sessionType === "pip") {
            stageIndex = 1
            const score =
              metrics.score !== undefined && metrics.score !== ""
                ? Number(metrics.score)
                : metrics.correct
                  ? Number(metrics.correct) * 2
                  : null
            if (score !== null && Number.isFinite(score)) {
              patch.pip = Math.min(100, Math.max(0, score))
            }
          } else if (sessionType === "tiu") {
            stageIndex = 2
            const score =
              metrics.score !== undefined && metrics.score !== ""
                ? Number(metrics.score)
                : metrics.correct
                  ? Number(metrics.correct) * 2
                  : null
            if (score !== null && Number.isFinite(score)) {
              patch.tiu = Math.min(100, Math.max(0, score))
            }
          } else if (sessionType === "medical") {
            stageIndex = 3
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
            if (components.length > 0) {
              patch.pbb = Number((components.reduce((a, b) => a + b, 0) / components.length).toFixed(1))
            } else if (latest.pbbScore !== undefined) {
              patch.pbb = Number(latest.pbbScore.toFixed(1))
            }
          } else if (sessionType === "fitness") {
            const isRunDnf = metrics.runDnf === "yes"
            const isIntervalRun =
              metrics.runMode === "interval" ||
              Boolean(sessionTitle && sessionTitle.toLowerCase().includes("interval"))

            if (isIntervalRun) {
              const laps = Array.from({ length: 12 }, (_, i) => i + 1)
                .map((i) => parseFloat(metrics[`intervalLap${i}`] || ""))
                .filter((v) => !isNaN(v) && v > 0)

              const prevHistory = (cand.intervalHistory ?? []).filter(
                (h) => Array.isArray(h.lapSplitsSec) && h.lapSplitsSec.length > 0,
              )

              // KUNCI: HANYA buat log interval jika ada split lap yang benar-benar dicatat!
              if (laps.length > 0) {
                const targetSets = parseInt(metrics.intervalTargetSets || "4", 10) || 4
                const targetPace = parseFloat(metrics.intervalTargetPace || "90") || 90
                const distPerSet = parseFloat(metrics.intervalDist || "400") || 400
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
                // Hapus entri kosong jika tidak ada lap yang dicatat
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

              const updatedMetrics = [
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

              if (updatedMetrics.length > 0) {
                patch.physicalMetrics = updatedMetrics
              }

              const latest = latestMetrics([
                "pushup",
                "situp",
                "backup",
                "shuttle",
              ])

              // HANYA sesi tes lari resmi (bukan latihan interval) yang masuk ke evaluasi lari 12 menit resmi
              const officialRunRecords = candidateSessionRecords.filter(
                (r) => !r.isInterval && r.metrics.runMode !== "interval",
              )
              for (const record of officialRunRecords) {
                if (record.metrics.runDnf === "yes") {
                  latest.distance = 0
                  latest.runDnf = 1
                } else if (
                  record.metrics.distance?.trim() &&
                  Number.isFinite(Number(record.metrics.distance))
                ) {
                  latest.distance = Number(record.metrics.distance)
                  latest.runDnf = 0
                }
              }
              if (hasDistance) {
                latest.distance = distance
                latest.runDnf = isRunDnf ? 1 : 0
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
              if (scores.length > 0) {
                patch.fitness = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
              }
            }
          } else if (sessionType === "interview") {
            stageIndex = 7
            const latest = latestMetrics(["star", "integrity", "communication"])
            for (const key of ["star", "integrity", "communication"]) {
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
            if (vals.length > 0) {
              patch.personality = Number(
                (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1),
              )
            }
          }

          let effectiveResult = result
          if (effectiveResult === "pending") {
            if (attendance && attendance !== "hadir") {
              effectiveResult = "review"
            } else if (sessionType === "fitness") {
              if (metrics.runDnf === "yes") {
                effectiveResult = "review"
              } else if (Number(metrics.distance) >= 2400) {
                effectiveResult = "passed"
              } else if (Number(metrics.distance) > 0) {
                effectiveResult = "review"
              }
            } else if (sessionType === "pbb") {
              if (patch.pbb !== undefined && patch.pbb >= 0) {
                effectiveResult = "passed"
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

          return {
            ...cand,
            ...patch,
          }
        })
      setAllCandidates(nextCandidates)
      logAudit(
        "SESSION_RECORD_SAVED",
        candidateId,
        `Menyimpan hasil sesi ${sessionType.toUpperCase()} (status: ${result})`,
      )
      showToast("Hasil sesi & profil kandidat berhasil disinkronkan.")
      saveToCloud({ candidates: nextCandidates })
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
    window.dispatchEvent(new CustomEvent("paska-track-updated"))
    showToast("Seluruh data berhasil direset ke kondisi awal.", "info")
  }, [showToast])

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
  // 3. Ditinggal lama ("idle")
  const refreshAndSync = useCallback(
    async (reason: "initial" | "manual" | "idle" = "manual") => {
      const targetUrl = googleSheetUrl.trim()
      if (!targetUrl) {
        if (reason === "manual") {
          showToast("URL Google Apps Script belum diatur.", "warning")
        }
        return
      }

      if (isSyncingRef.current) return
      isSyncingRef.current = true
      setCloudSyncStatus(reason === "initial" ? "pulling" : "syncing")

      try {
        const s = stateRef.current
        const currentHash = computeDataHash()
        const hasLocalChanges =
          Boolean(lastSyncedHash.current) &&
          currentHash !== lastSyncedHash.current

        // Jika ada perubahan data lokal dan bukan saat pertama buka, simpan perubahan ke Google Sheet
        if (hasLocalChanges && reason !== "initial") {
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
            users: s.users,
            auditLogs: s.auditLogs,
            rankingPublished: s.rankingPublished,
            ishiharaSessions: s.ishiharaSessions,
            ishiharaAllowlist: s.ishiharaAllowlist,
            ishiharaResults: s.ishiharaResults,
          }
          await pushStateToGoogleSheet(stateToPush, targetUrl)
        }

        // Ambil data terbaru dari Google Sheet
        const res = await pullStateFromGoogleSheet(targetUrl)
        if (res.ok && res.data) {
          const d = res.data
          let sanitizedCandidates = s.allCandidates
          if (Array.isArray(d.candidates) && d.candidates.length > 0) {
            sanitizedCandidates = d.candidates.map((c: Candidate) => {
              const verified = seededCandidates.find((sc) => sc.number === c.number)
              return {
                ...c,
                ...(verified
                  ? {
                      nik: verified.nik,
                      birthDate: verified.birthDate,
                      origin: verified.origin,
                      className: verified.className,
                      studentNumber: verified.studentNumber,
                    }
                  : {}),
                documents:
                  Array.isArray(c.documents) && c.documents.length === 6
                    ? c.documents
                    : (c.documents ?? [false, false, false, false, false, false]),
              }
            })
            setAllCandidates(sanitizedCandidates)
          }
          if (Array.isArray(d.catTryoutAttempts))
            setCatTryoutAttempts(
              d.catTryoutAttempts.filter(
                (attempt: CatTryoutAttempt) => !legacyDemoCatAttemptIds.has(attempt.id),
              ),
            )
          if (Array.isArray(d.cycles) && d.cycles.length > 0) setCycles(d.cycles)
          if (d.activeCycleId) setActiveCycleId(d.activeCycleId)
          if (Array.isArray(d.sessions)) setSessions(d.sessions)
          if (d.records && typeof d.records === "object") setRecords(d.records)
          if (Array.isArray(d.schedules)) setSchedules(d.schedules)
          if (Array.isArray(d.questions)) setQuestions(mergeWithStandardQuestions(d.questions))
          if (Array.isArray(d.supportingDocs)) setSupportingDocs(d.supportingDocs)
          if (Array.isArray(d.standardRules)) setStandardRules(d.standardRules)
          if (d.stageChecklists && typeof d.stageChecklists === "object")
            setStageChecklists(d.stageChecklists)
          if (Array.isArray(d.users) && d.users.length > 0) setUsers(d.users)
          if (Array.isArray(d.auditLogs)) setAuditLogs(d.auditLogs)
          if (d.rankingPublished !== undefined)
            setRankingPublishedState(d.rankingPublished)
          if (Array.isArray(d.ishiharaSessions)) setIshiharaSessions(d.ishiharaSessions)
          if (Array.isArray(d.ishiharaAllowlist)) setIshiharaAllowlist(d.ishiharaAllowlist)
          if (Array.isArray(d.ishiharaResults)) setIshiharaResults(d.ishiharaResults)

          lastSyncedHash.current = JSON.stringify({
            c: sanitizedCandidates,
            cat: d.catTryoutAttempts || [],
            s: d.sessions || [],
            r: d.records || {},
            sch: d.schedules || [],
            q: d.questions || [],
            d: d.supportingDocs || [],
            st: d.standardRules || [],
            ch: d.stageChecklists || defaultChecklists,
            ish: d.ishiharaSessions || [],
            alw: d.ishiharaAllowlist || [],
            res: d.ishiharaResults || [],
          })

          setCloudSyncStatus("synced")
          const now = new Date().toISOString()
          setLastCloudSync(now)
          if (reason === "manual") {
            showToast("Sinkronisasi Google Sheet berhasil!", "success")
            logAudit(
              "SYNC_GOOGLE_SHEET",
              "Google Sheet",
              `Sinkronisasi ${sanitizedCandidates.length} kandidat berhasil`,
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
              users: s.users,
              auditLogs: s.auditLogs,
              rankingPublished: s.rankingPublished,
              ishiharaSessions: s.ishiharaSessions,
              ishiharaAllowlist: s.ishiharaAllowlist,
              ishiharaResults: s.ishiharaResults,
            }
            await pushStateToGoogleSheet(stateToPush, targetUrl)
            lastSyncedHash.current = currentHash
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
    [googleSheetUrl, computeDataHash, showToast, logAudit],
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

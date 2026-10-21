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
} from "../data/initialData"
import { fitnessScore } from "../data/selectionGuide"
import {
  applyStageDecision,
  type AuditLogEntry,
  type Candidate,
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
  syncCandidateFromSession: (params: {
    candidateId: string
    sessionType: string
    metrics: Record<string, string>
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
    return loaded.map((c) =>
      c.id === "cycle-2026-kab" || c.name === "Latihan & Pembinaan 2026"
        ? {
            ...c,
            id: "cycle-2027-kab",
            name: "Latihan & Pembinaan 2027",
            year: 2027,
            referenceDate: "2027-08-17",
          }
        : c,
    )
  })
  const [activeCycleId, setActiveCycleId] = useState<string>(() => {
    const loaded = loadStorage<string>("paska-clean-active-cycle", initialCycles[0].id)
    return loaded === "cycle-2026-kab" ? "cycle-2027-kab" : loaded
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
    const loaded = loadStorage<Candidate[]>("paska-clean-candidates", seededCandidates)
    if (!loaded || loaded.length === 0) return seededCandidates
    // Bersihkan seluruh data dummy: PIP, TIU, PBB, dan Kepribadian yang belum dites dijadikan null murni
    const sanitized = loaded.map((c) => {
      const match = seededCandidates.find((sc) => sc.id === c.id || sc.number === c.number)
      return {
        ...c,
        pip: null,
        tiu: null,
        pbb: null,
        personality: null,
        documents: [true, true, true, true, true, true],
        stage: match ? match.stage : c.stage,
        stageStatuses: match ? match.stageStatuses : c.stageStatuses,
        fitness: match ? match.fitness : c.fitness,
        coachNote: match ? match.coachNote : c.coachNote,
        physicalMetrics: match?.physicalMetrics ?? (c.physicalMetrics ?? []).filter((m) => m.label.toLowerCase().includes("lari")),
      }
    })
    return sanitized
  })
  const [stageChecklists, setStageChecklists] =
    useState<Record<number, boolean[]>>(() =>
      loadStorage("paska-clean-checklists", defaultChecklists),
    )
  const [schedules, setSchedules] = useState<SelectionSchedule[]>(() =>
    loadStorage("paska-clean-schedules", initialSchedules),
  )
  const [questions, setQuestions] = useState<CatQuestion[]>(() =>
    loadStorage("paska-clean-questions", initialQuestions),
  )
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

  const candidates = useMemo(
    () =>
      cycles.length === 0
        ? []
        : allCandidates.filter(
            (c) => !c.cycleId || c.cycleId === activeCycle.id,
          ),
    [allCandidates, activeCycle.id, cycles.length],
  )

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
  const initialMountDone = useRef<boolean>(false)

  const stateRef = useRef({
    allCandidates,
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
  })
  stateRef.current = {
    allCandidates,
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
  }

  const computeDataHash = useCallback(() => {
    const s = stateRef.current
    return JSON.stringify({
      c: s.allCandidates,
      s: s.sessions,
      r: s.records,
      sch: s.schedules,
      q: s.questions,
      d: s.supportingDocs,
      st: s.standardRules,
      ch: s.stageChecklists,
    })
  }, [])

  const saveToCloud = useCallback(
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
        }

        const res = await pushStateToGoogleSheet(stateToPush, targetUrl)
        if (res.ok) {
          lastSyncedHash.current = JSON.stringify({
            c: stateToPush.candidates,
            s: stateToPush.sessions,
            r: stateToPush.records,
            sch: stateToPush.schedules,
            q: stateToPush.questions,
            d: stateToPush.supportingDocs,
            st: stateToPush.standardRules,
            ch: stateToPush.stageChecklists,
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
          saveToCloud(nextOverride)
        }
      }
    },
    [googleSheetUrl],
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
      let nextCycles: SelectionCycle[] = []
      setCycles((prev) => {
        nextCycles = prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
        return nextCycles
      })
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
      const remainingCandidates = allCandidates.filter((c) => c.cycleId !== id)
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
        "locked",
        "locked",
        "locked",
        "locked",
        "locked",
        "locked",
        "locked",
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
      let nextCandidates: Candidate[] = []
      setAllCandidates((prev) => {
        nextCandidates = prev.map((item) => {
          if (item.id !== id) return item
          const updatedName = patch.name ?? item.name
          return {
            ...item,
            ...patch,
            avatar: patch.name ? makeAvatar(updatedName) : item.avatar,
            updatedAt: "Baru saja",
          }
        })
        return nextCandidates
      })
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
      let nextCandidates: Candidate[] = []
      setAllCandidates((prev) => {
        nextCandidates = prev.map((cand) => {
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
        return nextCandidates
      })
      const cand = allCandidates.find((c) => c.id === candidateId)
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
    [allCandidates, logAudit, showToast, saveToCloud],
  )

  const toggleCandidateDocument = useCallback(
    (candidateId: string, docIndex: number) => {
      let nextCandidates: Candidate[] = []
      setAllCandidates((prev) => {
        nextCandidates = prev.map((cand) => {
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
        return nextCandidates
      })
      saveToCloud({ candidates: nextCandidates })
    },
    [saveToCloud],
  )

  const addAnthropometryLog = useCallback(
    (
      candidateId: string,
      entry: { date: string, heightCm: number, weightKg: number, note?: string },
    ) => {
      let nextCandidates: Candidate[] = []
      setAllCandidates((prev) => {
        nextCandidates = prev.map((cand) => {
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
        return nextCandidates
      })
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
      let nextCandidates: Candidate[] = []
      setAllCandidates((prev) => {
        nextCandidates = prev.map((cand) => {
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
        return nextCandidates
      })
      showToast("Riwayat pengukuran tinggi & berat badan dihapus.", "warning")
      saveToCloud({ candidates: nextCandidates })
    },
    [showToast, saveToCloud],
  )

  const syncCandidateFromSession = useCallback(
    ({
      candidateId,
      sessionType,
      metrics,
      result,
      note,
      attendance,
    }: {
      candidateId: string
      sessionType: string
      metrics: Record<string, string>
      result: "pending" | "passed" | "review" | "failed"
      note: string
      attendance?: "hadir" | "sakit" | "izin" | "alpa"
    }) => {
      let nextCandidates: Candidate[] = []
      setAllCandidates((prev) => {
        nextCandidates = prev.map((cand) => {
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
            const docs = [0, 1, 2, 3, 4, 5].map(
              (idx) => metrics[`document-${idx}`] === "valid",
            )
            if (docs.some(Boolean)) {
              patch.documents = docs
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
            const pbbScore = Number(metrics.pbbScore)
            if (Number.isFinite(pbbScore) && pbbScore > 0) {
              patch.pbb = Number(pbbScore.toFixed(1))
            } else {
              const s = Number(metrics.static)
              const d = Number(metrics.dynamic)
              const c = Number(metrics.command)
              const vals = [s, d, c].filter((v) => Number.isFinite(v) && v > 0)
              if (vals.length > 0) {
                patch.pbb = Number(
                  (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1),
                )
              }
            }
          } else if (sessionType === "fitness") {
            stageIndex = 6
            const isRunDnf = metrics.runDnf === "yes"
            const hasDistance =
              isRunDnf ||
              (metrics.distance !== undefined &&
                metrics.distance.trim() !== "" &&
                !isNaN(Number(metrics.distance)))
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

            const scores: number[] = []
            if (hasDistance) {
              scores.push(isRunDnf ? 0 : fitnessScore("run", distance))
            }
            if (hasPushup) scores.push(fitnessScore("pushup", pushup))
            if (hasSitup) scores.push(fitnessScore("situp", situp))
            if (hasBackup) scores.push(fitnessScore("backup", backup))
            if (hasShuttle) scores.push(fitnessScore("shuttle", shuttle))

            if (scores.length > 0) {
              const avg =
                scores.reduce((acc, val) => acc + val, 0) / scores.length
              patch.fitness = Number(avg.toFixed(1))

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
                      target: "43 kali",
                      percent: Math.min(100, Math.round((pushup / 43) * 100)),
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
            }
          } else if (sessionType === "interview") {
            stageIndex = 7
            const star = Number(metrics.star)
            const integ = Number(metrics.integrity)
            const comm = Number(metrics.communication)
            const vals = [star, integ, comm].filter(
              (v) => Number.isFinite(v) && v > 0,
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
              if (patch.pbb !== undefined && patch.pbb > 0) {
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
        return nextCandidates
      })
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
      let nextChecklists: Record<number, boolean[]> = {}
      setStageChecklists((prev) => {
        const current = prev[stageIndex] ?? [false, false, false, false]
        const next = [...current]
        next[itemIndex] = !next[itemIndex]
        nextChecklists = { ...prev, [stageIndex]: next }
        return nextChecklists
      })
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
      let nextSchedules: SelectionSchedule[] = []
      setSchedules((prev) => {
        nextSchedules = prev.map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        )
        return nextSchedules
      })
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
      const target = schedules.find((s) => s.id === scheduleId)
      if (!target) return false
      const exists = target.assignedCandidateIds.includes(candidateId)
      if (!exists && target.assignedCandidateIds.length >= target.capacity) {
        showToast(
          `Kapasitas sesi penuh (${target.capacity} peserta). Tidak dapat menambah peserta.`,
          "danger",
        )
        return false
      }
      let nextSchedules: SelectionSchedule[] = []
      setSchedules((prev) => {
        nextSchedules = prev.map((s) => {
          if (s.id !== scheduleId) return s
          const nextIds = exists
            ? s.assignedCandidateIds.filter((id) => id !== candidateId)
            : [...s.assignedCandidateIds, candidateId]
          return { ...s, assignedCandidateIds: nextIds }
        })
        return nextSchedules
      })
      saveToCloud({ schedules: nextSchedules })
      return true
    },
    [schedules, showToast, saveToCloud],
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
      let nextQuestions: CatQuestion[] = []
      setQuestions((prev) => {
        nextQuestions = prev.map((q) => (q.id === id ? { ...q, ...patch } : q))
        return nextQuestions
      })
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
      let nextDocs: SupportingDoc[] = []
      setSupportingDocs((prev) => {
        nextDocs = prev.map((d) =>
          d.id === id ? { ...d, ...patch, updatedAt: "Baru saja" } : d,
        )
        return nextDocs
      })
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
      let nextRules: StandardRuleItem[] = []
      setStandardRules((prev) => {
        nextRules = prev.map((rule) =>
          rule.id === id ? { ...rule, ...patch, updatedAt: "Baru saja" } : rule,
        )
        return nextRules
      })
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
          }
          await pushStateToGoogleSheet(stateToPush, targetUrl)
        }

        // Ambil data terbaru dari Google Sheet
        const res = await pullStateFromGoogleSheet(targetUrl)
        if (res.ok && res.data) {
          const d = res.data
          let sanitizedCandidates = s.allCandidates
          if (Array.isArray(d.candidates)) {
            sanitizedCandidates = d.candidates.map((c: Candidate) => {
              if (
                c.stage === 1 &&
                c.stageStatuses?.[0] === "active" &&
                (!c.documents || c.documents.every((doc) => !doc))
              ) {
                const matched = seededCandidates.find(
                  (sc) => sc.number === c.number || sc.name === c.name,
                )
                if (matched) return { ...c, ...matched }
              }
              return c
            })
            setAllCandidates(sanitizedCandidates)
          }
          if (Array.isArray(d.cycles) && d.cycles.length > 0) setCycles(d.cycles)
          if (d.activeCycleId) setActiveCycleId(d.activeCycleId)
          if (Array.isArray(d.sessions)) setSessions(d.sessions)
          if (d.records && typeof d.records === "object") setRecords(d.records)
          if (Array.isArray(d.schedules)) setSchedules(d.schedules)
          if (Array.isArray(d.questions)) setQuestions(d.questions)
          if (Array.isArray(d.supportingDocs)) setSupportingDocs(d.supportingDocs)
          if (Array.isArray(d.standardRules)) setStandardRules(d.standardRules)
          if (d.stageChecklists && typeof d.stageChecklists === "object")
            setStageChecklists(d.stageChecklists)
          if (Array.isArray(d.users) && d.users.length > 0) setUsers(d.users)
          if (Array.isArray(d.auditLogs)) setAuditLogs(d.auditLogs)
          if (d.rankingPublished !== undefined)
            setRankingPublishedState(d.rankingPublished)

          lastSyncedHash.current = JSON.stringify({
            c: sanitizedCandidates,
            s: d.sessions || [],
            r: d.records || {},
            sch: d.schedules || [],
            q: d.questions || [],
            d: d.supportingDocs || [],
            st: d.standardRules || [],
            ch: d.stageChecklists || defaultChecklists,
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
          if (s.allCandidates.length > 0 || s.sessions.length > 0) {
            const stateToPush: AppDatabaseState = {
              candidates: s.allCandidates,
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
      logout,
      addUser,
      toggleUserActive,
      candidates,
      allCandidates,
      addCandidate,
      updateCandidate,
      deleteCandidate,
      importCandidates,
      updateCandidateStage,
      toggleCandidateDocument,
      addAnthropometryLog,
      deleteAnthropometryLog,
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
      logout,
      addUser,
      toggleUserActive,
      candidates,
      allCandidates,
      addCandidate,
      updateCandidate,
      deleteCandidate,
      importCandidates,
      updateCandidateStage,
      toggleCandidateDocument,
      addAnthropometryLog,
      deleteAnthropometryLog,
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

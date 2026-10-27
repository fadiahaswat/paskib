import type {
  AuthorizedAccount,
  IshiharaScreeningResult,
  IshiharaTestSession,
} from "../features/ishihara/types"
import type { AppDatabaseState } from "../lib/googleSheetSync"
import type {
  AuditLogEntry,
  Candidate,
  CatTryoutAttempt,
  IntervalTrainingLog,
  SelectionCycle,
  SelectionSchedule,
  Session,
  SessionRecord,
  StageStatus,
  UserProfile,
} from "./selection"

const LEGACY_DEMO_ATTEMPT_IDS = new Set(["att-001", "att-002", "att-003"])

function makeAvatarFromName(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "PK"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function extractDeletedCandidateIds(
  explicitDeletedIds: Iterable<string> = [],
  auditLogs: AuditLogEntry[] = [],
): Set<string> {
  const set = new Set<string>()
  for (const id of explicitDeletedIds) {
    if (id && typeof id === "string") set.add(id.trim())
  }
  // Never allow seeded core candidates to be accidentally marked deleted unless explicitly in set
  return set
}

export function generateNextCandidateNumber(
  candidates: Candidate[],
  cycleYear: number = 2027,
  explicitNumber?: string,
  excludeCandidateId?: string,
): string {
  const usedNumbers = new Set(
    candidates
      .filter((c) => !excludeCandidateId || c.id !== excludeCandidateId)
      .map((c) => (c.number || "").trim().toUpperCase())
      .filter(Boolean),
  )

  const trimmedExplicit = explicitNumber?.trim()
  if (trimmedExplicit && !usedNumbers.has(trimmedExplicit.toUpperCase())) {
    return trimmedExplicit
  }

  const yy = String(cycleYear || 2027).slice(-2)
  let maxSeq = candidates.length
  for (const c of candidates) {
    const match = (c.number || "").trim().match(/(\d+)$/)
    if (match) {
      const num = parseInt(match[1], 10)
      if (Number.isFinite(num) && num > maxSeq) {
        maxSeq = num
      }
    }
  }

  let nextSeq = maxSeq + 1
  let candidateNumber = `KAB-${yy}-${String(nextSeq).padStart(3, "0")}`
  while (usedNumbers.has(candidateNumber.toUpperCase())) {
    nextSeq += 1
    candidateNumber = `KAB-${yy}-${String(nextSeq).padStart(3, "0")}`
  }
  return candidateNumber
}

export function deduplicateCandidateNumbers(
  candidates: Candidate[],
  cycleYear: number = 2027,
): Candidate[] {
  const seenNumbers = new Map<string, string>() // normalizedNumber -> candidateId

  // First pass: register seeded candidates' numbers (cand-001..cand-013) so they keep priority
  for (const c of candidates) {
    if (/^cand-0\d\d$/.test(c.id) && c.number) {
      seenNumbers.set(c.number.trim().toUpperCase(), c.id)
    }
  }

  const result: Candidate[] = []
  for (const c of candidates) {
    const normNum = (c.number || "").trim().toUpperCase()
    const ownerId = normNum ? seenNumbers.get(normNum) : undefined
    if (!normNum || (ownerId && ownerId !== c.id)) {
      const newNumber = generateNextCandidateNumber(
        [...candidates, ...result],
        cycleYear,
        undefined,
        c.id,
      )
      seenNumbers.set(newNumber.toUpperCase(), c.id)
      result.push({ ...c, number: newNumber })
    } else {
      seenNumbers.set(normNum, c.id)
      result.push(c)
    }
  }
  return result
}

export function mergeSingleCatAttempt(
  a: CatTryoutAttempt,
  b: CatTryoutAttempt,
): CatTryoutAttempt {
  const aHasPip =
    (a.pipAnswers && Object.keys(a.pipAnswers).length > 0) ||
    (typeof a.pipScore === "number" && a.pipScore > 0)
  const bHasPip =
    (b.pipAnswers && Object.keys(b.pipAnswers).length > 0) ||
    (typeof b.pipScore === "number" && b.pipScore > 0)

  const aHasTiu =
    (a.tiuAnswers && Object.keys(a.tiuAnswers).length > 0) ||
    (typeof a.tiuScoreScaled === "number" && a.tiuScoreScaled > 0)
  const bHasTiu =
    (b.tiuAnswers && Object.keys(b.tiuAnswers).length > 0) ||
    (typeof b.tiuScoreScaled === "number" && b.tiuScoreScaled > 0)

  const aTime = a.finalizedAt || a.startedAt || ""
  const bTime = b.finalizedAt || b.startedAt || ""
  const primary = bTime >= aTime ? b : a
  const secondary = primary === b ? a : b

  const pipSource =
    (primary === b ? bHasPip : aHasPip) || !(secondary === b ? bHasPip : aHasPip)
      ? primary
      : secondary
  const tiuSource =
    (primary === b ? bHasTiu : aHasTiu) || !(secondary === b ? bHasTiu : aHasTiu)
      ? primary
      : secondary

  const pipScore = pipSource.pipScore ?? secondary.pipScore ?? 0
  const tiuScoreScaled = tiuSource.tiuScoreScaled ?? secondary.tiuScoreScaled ?? 0
  const hasBoth = (aHasPip || bHasPip) && (aHasTiu || bHasTiu)

  return {
    ...secondary,
    ...primary,
    pipAnswers:
      pipSource.pipAnswers && Object.keys(pipSource.pipAnswers).length > 0
        ? pipSource.pipAnswers
        : secondary.pipAnswers || {},
    pipCorrect: pipSource.pipCorrect ?? secondary.pipCorrect ?? 0,
    pipScore,
    pipStatus: pipSource.pipStatus ?? (pipScore >= 70 ? "passed" : "failed"),
    tiuAnswers:
      tiuSource.tiuAnswers && Object.keys(tiuSource.tiuAnswers).length > 0
        ? tiuSource.tiuAnswers
        : secondary.tiuAnswers || {},
    tiuCorrect: tiuSource.tiuCorrect ?? secondary.tiuCorrect ?? 0,
    tiuScoreRaw: tiuSource.tiuScoreRaw ?? secondary.tiuScoreRaw ?? 0,
    tiuScoreScaled,
    tiuStatus: tiuSource.tiuStatus ?? (tiuScoreScaled >= 70 ? "passed" : "failed"),
    combinedScore: hasBoth
      ? Math.round((pipScore + tiuScoreScaled) / 2)
      : primary.combinedScore || secondary.combinedScore || pipScore || tiuScoreScaled,
    startedAt:
      secondary.startedAt && primary.startedAt
        ? secondary.startedAt < primary.startedAt
          ? secondary.startedAt
          : primary.startedAt
        : primary.startedAt || secondary.startedAt,
    finalizedAt: bTime >= aTime ? b.finalizedAt : a.finalizedAt,
  }
}

export function mergeCatAttempts(
  localAttempts: CatTryoutAttempt[] = [],
  cloudAttempts: CatTryoutAttempt[] = [],
  storageAttempts: CatTryoutAttempt[] = [],
): CatTryoutAttempt[] {
  const attemptMap = new Map<string, CatTryoutAttempt>()

  const addAll = (list: CatTryoutAttempt[]) => {
    if (!Array.isArray(list)) return
    for (const item of list) {
      if (!item || !item.id || LEGACY_DEMO_ATTEMPT_IDS.has(item.id)) continue
      const existing = attemptMap.get(item.id)
      if (!existing) {
        attemptMap.set(item.id, item)
      } else {
        attemptMap.set(item.id, mergeSingleCatAttempt(existing, item))
      }
    }
  }

  addAll(cloudAttempts)
  addAll(storageAttempts)
  addAll(localAttempts)

  return Array.from(attemptMap.values()).sort((a, b) =>
    (b.finalizedAt || b.startedAt || "").localeCompare(
      a.finalizedAt || a.startedAt || "",
    ),
  )
}

export function mergeSingleCandidate(
  cloudCand: Candidate | undefined,
  localCand: Candidate | undefined,
  latestAttempt?: CatTryoutAttempt,
): Candidate {
  if (!cloudCand && !localCand) {
    throw new Error("Cannot merge two undefined candidates")
  }
  const base = (cloudCand ?? localCand)!
  const other = cloudCand ? localCand : undefined

  const cloudIso = cloudCand?.updatedAtIso || ""
  const localIso = localCand?.updatedAtIso || ""
  const isLocalNewer =
    !cloudCand ||
    (Boolean(localCand) &&
      ((localIso && cloudIso ? localIso >= cloudIso : false) ||
        (localIso && !cloudIso) ||
        localCand?.updatedAt === "Baru saja"))

  const primary = isLocalNewer ? (localCand ?? cloudCand)! : (cloudCand ?? localCand)!
  const fallback = primary === localCand ? cloudCand : localCand

  const hasPipAttempt =
    latestAttempt &&
    ((latestAttempt.pipAnswers && Object.keys(latestAttempt.pipAnswers).length > 0) ||
      (typeof latestAttempt.pipScore === "number" && latestAttempt.pipScore > 0))
  const hasTiuAttempt =
    latestAttempt &&
    ((latestAttempt.tiuAnswers && Object.keys(latestAttempt.tiuAnswers).length > 0) ||
      (typeof latestAttempt.tiuScoreScaled === "number" &&
        latestAttempt.tiuScoreScaled > 0))

  const pipScore =
    primary.pip !== null && primary.pip !== undefined
      ? primary.pip
      : fallback?.pip !== null && fallback?.pip !== undefined
        ? fallback.pip
        : hasPipAttempt
          ? (latestAttempt?.pipScore ?? null)
          : null

  const tiuScore =
    primary.tiu !== null && primary.tiu !== undefined
      ? primary.tiu
      : fallback?.tiu !== null && fallback?.tiu !== undefined
        ? fallback.tiu
        : hasTiuAttempt
          ? (latestAttempt?.tiuScoreScaled ?? null)
          : null

  const pbbScore = primary.pbb ?? fallback?.pbb ?? null
  const fitnessVal = primary.fitness ?? fallback?.fitness ?? null
  const personalityVal = primary.personality ?? fallback?.personality ?? null

  // Merge intervalHistory by sessionId || id
  const cloudInt = Array.isArray(cloudCand?.intervalHistory)
    ? cloudCand.intervalHistory
    : []
  const localInt = Array.isArray(localCand?.intervalHistory)
    ? localCand.intervalHistory
    : []
  const intMap = new Map<string, IntervalTrainingLog>()
  for (const entry of cloudInt) {
    if (entry && Array.isArray(entry.lapSplitsSec) && entry.lapSplitsSec.length > 0) {
      intMap.set(entry.sessionId || entry.id, entry)
    }
  }
  for (const entry of localInt) {
    if (entry && Array.isArray(entry.lapSplitsSec) && entry.lapSplitsSec.length > 0) {
      const key = entry.sessionId || entry.id
      if (!intMap.has(key) || isLocalNewer) {
        intMap.set(key, entry)
      }
    }
  }
  const mergedIntervalHistory = Array.from(intMap.values()).sort((a, b) =>
    (b.date || "").localeCompare(a.date || ""),
  )

  // Merge anthropometryHistory
  const cloudAnthro = Array.isArray(cloudCand?.anthropometryHistory)
    ? cloudCand.anthropometryHistory
    : []
  const localAnthro = Array.isArray(localCand?.anthropometryHistory)
    ? localCand.anthropometryHistory
    : []
  const anthroMap = new Map<
    string,
    NonNullable<Candidate["anthropometryHistory"]>[number]
  >()
  for (const item of cloudAnthro) {
    if (item) anthroMap.set(`${item.date}:${item.heightCm}:${item.weightKg}`, item)
  }
  for (const item of localAnthro) {
    if (item) {
      const k = `${item.date}:${item.heightCm}:${item.weightKg}`
      if (!anthroMap.has(k) || isLocalNewer) {
        anthroMap.set(k, item)
      }
    }
  }
  const mergedAnthroHistory = Array.from(anthroMap.values()).sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  )

  // Merge physicalMetrics by normalized label
  const cloudMetrics = Array.isArray(cloudCand?.physicalMetrics)
    ? cloudCand.physicalMetrics
    : []
  const localMetrics = Array.isArray(localCand?.physicalMetrics)
    ? localCand.physicalMetrics
    : []
  const metricMap = new Map<
    string,
    NonNullable<Candidate["physicalMetrics"]>[number]
  >()
  for (const m of cloudMetrics) {
    if (m?.label) metricMap.set(m.label.toLowerCase(), m)
  }
  for (const m of localMetrics) {
    if (m?.label) {
      const key = m.label.toLowerCase()
      if (!metricMap.has(key) || isLocalNewer) {
        metricMap.set(key, m)
      }
    }
  }
  const mergedPhysicalMetrics = Array.from(metricMap.values())

  const baseStatuses =
    Array.isArray(primary.stageStatuses) && primary.stageStatuses.length === 8
      ? primary.stageStatuses
      : Array.isArray(fallback?.stageStatuses) && fallback.stageStatuses.length === 8
        ? fallback.stageStatuses
        : Array<StageStatus>(8).fill("active")
  const stageStatuses: StageStatus[] = [...baseStatuses]
  if (hasPipAttempt && latestAttempt?.pipStatus) {
    stageStatuses[1] = latestAttempt.pipStatus
  } else if (pipScore !== null && stageStatuses[1] === "locked") {
    stageStatuses[1] = pipScore >= 70 ? "passed" : "review"
  }
  if (hasTiuAttempt && latestAttempt?.tiuStatus) {
    stageStatuses[2] = latestAttempt.tiuStatus
  } else if (tiuScore !== null && stageStatuses[2] === "locked") {
    stageStatuses[2] = tiuScore >= 70 ? "passed" : "review"
  }

  const cloudDocs =
    Array.isArray(cloudCand?.documents) && cloudCand.documents.length === 6
      ? cloudCand.documents
      : null
  const localDocs =
    Array.isArray(localCand?.documents) && localCand.documents.length === 6
      ? localCand.documents
      : null
  const mergedDocs =
    isLocalNewer && localDocs
      ? localDocs
      : cloudDocs && localDocs
        ? cloudDocs.map((v, i) => Boolean(v || localDocs[i]))
        : cloudDocs ?? localDocs ?? [false, false, false, false, false, false]

  const mergedDocFiles = {
    ...(fallback?.documentFiles || {}),
    ...(primary.documentFiles || {}),
  }

  return {
    ...(fallback || {}),
    ...primary,
    id: primary.id || other?.id || base.id,
    name: primary.name || fallback?.name || "Kandidat",
    number: primary.number || fallback?.number || "",
    school:
      primary.school ||
      fallback?.school ||
      "MA Mu'allimin Muhammadiyah Yogyakarta",
    gender: primary.gender || fallback?.gender || "Putra",
    birthDate: primary.birthDate || fallback?.birthDate || "2009-10-15",
    avatar:
      primary.avatar ||
      fallback?.avatar ||
      makeAvatarFromName(primary.name || fallback?.name || "PK"),
    photoUrl: primary.photoUrl || fallback?.photoUrl,
    pip: pipScore,
    tiu: tiuScore,
    pbb: pbbScore,
    fitness: fitnessVal,
    personality: personalityVal,
    heightCm: primary.heightCm || fallback?.heightCm || 170,
    weightKg: primary.weightKg || fallback?.weightKg || 60,
    stageStatuses,
    documents: mergedDocs,
    ...(Object.keys(mergedDocFiles).length > 0
      ? { documentFiles: mergedDocFiles }
      : {}),
    physicalMetrics: mergedPhysicalMetrics,
    intervalHistory: mergedIntervalHistory,
    anthropometryHistory: mergedAnthroHistory,
    coachNote: primary.coachNote || fallback?.coachNote || "",
    updatedAt: primary.updatedAt || fallback?.updatedAt || "Baru saja",
    updatedAtIso:
      (localIso && cloudIso
        ? localIso >= cloudIso
          ? localIso
          : cloudIso
        : localIso || cloudIso) || undefined,
  }
}

export function recoverOrphanedCandidates({
  candidates,
  catTryoutAttempts = [],
  auditLogs = [],
  users = [],
  ishiharaResults = [],
  activeCatCandidates = [],
  activeCycleId = "cycle-2027-kab",
  cycleYear = 2027,
  deletedCandidateIds = new Set<string>(),
}: {
  candidates: Candidate[]
  catTryoutAttempts?: CatTryoutAttempt[]
  auditLogs?: AuditLogEntry[]
  users?: UserProfile[]
  ishiharaResults?: IshiharaScreeningResult[]
  activeCatCandidates?: Candidate[]
  activeCycleId?: string
  cycleYear?: number
  deletedCandidateIds?: Set<string>
}): { candidates: Candidate[]; recoveredCount: number } {
  const result = [...candidates]
  const existingIds = new Set(result.map((c) => c.id))
  const existingNames = new Set(
    result.map((c) => (c.name || "").trim().toLowerCase()).filter(Boolean),
  )
  const existingNumbers = new Set(
    result.map((c) => (c.number || "").trim().toUpperCase()).filter(Boolean),
  )
  let recoveredCount = 0

  const defaultStatuses: StageStatus[] = [
    "active",
    "active",
    "active",
    "active",
    "active",
    "active",
    "active",
    "active",
  ]

  // 1. Recover from active CAT exam snapshots (e.g., User C currently taking CAT exam!)
  for (const snap of activeCatCandidates) {
    if (!snap || !snap.id || snap.id === "coach-self") continue
    if (deletedCandidateIds.has(snap.id) || existingIds.has(snap.id)) continue
    const number = generateNextCandidateNumber(result, cycleYear, snap.number)
    const restored: Candidate = {
      ...snap,
      number,
      avatar: snap.avatar || makeAvatarFromName(snap.name),
      stage: snap.stage ?? 1,
      stageStatuses:
        Array.isArray(snap.stageStatuses) && snap.stageStatuses.length === 8
          ? snap.stageStatuses
          : [...defaultStatuses],
      cycleId: snap.cycleId || activeCycleId,
      updatedAt: snap.updatedAt || "Baru saja",
      updatedAtIso: snap.updatedAtIso || new Date().toISOString(),
    }
    result.push(restored)
    existingIds.add(restored.id)
    existingNames.add(restored.name.trim().toLowerCase())
    existingNumbers.add(restored.number.trim().toUpperCase())
    recoveredCount += 1
  }

  // 2. Recover from catTryoutAttempts (any candidate who took CAT but whose profile was overwritten)
  for (const att of catTryoutAttempts) {
    if (
      !att ||
      !att.candidateId ||
      att.candidateId === "coach-self" ||
      LEGACY_DEMO_ATTEMPT_IDS.has(att.id)
    ) {
      continue
    }
    if (deletedCandidateIds.has(att.candidateId) || existingIds.has(att.candidateId)) {
      continue
    }
    const nameKey = (att.candidateName || "").trim().toLowerCase()
    if (nameKey && existingNames.has(nameKey)) continue

    const number = generateNextCandidateNumber(result, cycleYear)
    const stageStatuses: StageStatus[] = [...defaultStatuses]
    if (att.pipStatus) stageStatuses[1] = att.pipStatus
    if (att.tiuStatus) stageStatuses[2] = att.tiuStatus

    const restored: Candidate = {
      id: att.candidateId,
      number,
      name: att.candidateName || "Kandidat Peserta CAT",
      school: att.candidateGroup || "MA Mu'allimin Muhammadiyah Yogyakarta",
      gender: "Putra",
      birthDate: "2009-10-15",
      heightCm: 172,
      weightKg: 62,
      avatar: makeAvatarFromName(att.candidateName || "KP"),
      stage: 2,
      stageStatuses,
      pip: typeof att.pipScore === "number" ? att.pipScore : null,
      tiu: typeof att.tiuScoreScaled === "number" ? att.tiuScoreScaled : null,
      pbb: null,
      fitness: null,
      personality: null,
      documents: [false, false, false, false, false, false],
      attendance: 0,
      trainingCompliance: 0,
      cycleId: activeCycleId,
      updatedAt: "Dipulihkan otomatis",
      updatedAtIso: att.finalizedAt || att.startedAt || new Date().toISOString(),
    }
    result.push(restored)
    existingIds.add(restored.id)
    if (nameKey) existingNames.add(nameKey)
    existingNumbers.add(restored.number.trim().toUpperCase())
    recoveredCount += 1
  }

  // 3. Recover from active candidate UserProfiles (e.g., User C logged in as candidate)
  for (const u of users) {
    if (!u || u.role !== "candidate" || !u.candidateId) continue
    if (deletedCandidateIds.has(u.candidateId) || existingIds.has(u.candidateId)) {
      continue
    }
    const nameKey = (u.name || "").trim().toLowerCase()
    if (nameKey && existingNames.has(nameKey)) continue

    const numberMatch = (u.title || "").match(/(KAB-[\w-]+)/i)
    const explicitNum = numberMatch ? numberMatch[1].toUpperCase() : undefined
    const number = generateNextCandidateNumber(result, cycleYear, explicitNum)

    const restored: Candidate = {
      id: u.candidateId,
      number,
      name: u.name,
      school: "MA Mu'allimin Muhammadiyah Yogyakarta",
      gender: "Putra",
      birthDate: "2009-10-15",
      heightCm: 172,
      weightKg: 62,
      avatar: u.avatar || makeAvatarFromName(u.name),
      stage: 1,
      stageStatuses: [...defaultStatuses],
      pip: null,
      tiu: null,
      pbb: null,
      fitness: null,
      personality: null,
      documents: [false, false, false, false, false, false],
      attendance: 0,
      trainingCompliance: 0,
      cycleId: activeCycleId,
      updatedAt: "Dipulihkan otomatis",
      updatedAtIso: new Date().toISOString(),
    }
    result.push(restored)
    existingIds.add(restored.id)
    if (nameKey) existingNames.add(nameKey)
    existingNumbers.add(restored.number.trim().toUpperCase())
    recoveredCount += 1
  }

  // 4. Recover from Ishihara screening results
  for (const ish of ishiharaResults) {
    if (!ish || !ish.participantId || ish.participantId === "coach-self") continue
    if (
      deletedCandidateIds.has(ish.participantId) ||
      existingIds.has(ish.participantId)
    ) {
      continue
    }
    const nameKey = (ish.participantName || "").trim().toLowerCase()
    if (nameKey && existingNames.has(nameKey)) continue

    const number = generateNextCandidateNumber(
      result,
      cycleYear,
      ish.participantNumber,
    )
    const restored: Candidate = {
      id: ish.participantId,
      number,
      name: ish.participantName || "Peserta Ishihara",
      school: ish.school || "MA Mu'allimin Muhammadiyah Yogyakarta",
      gender: "Putra",
      birthDate: "2009-10-15",
      heightCm: 172,
      weightKg: 62,
      avatar: makeAvatarFromName(ish.participantName || "PI"),
      stage: 4,
      stageStatuses: [...defaultStatuses],
      pip: null,
      tiu: null,
      pbb: null,
      fitness: null,
      personality: null,
      documents: [false, false, false, false, false, false],
      cycleId: activeCycleId,
      updatedAt: "Dipulihkan otomatis",
      updatedAtIso: ish.createdAt || new Date().toISOString(),
    }
    result.push(restored)
    existingIds.add(restored.id)
    if (nameKey) existingNames.add(nameKey)
    existingNumbers.add(restored.number.trim().toUpperCase())
    recoveredCount += 1
  }

  // 5. Recover from auditLogs (CREATE_CANDIDATE without subsequent DELETE_CANDIDATE)
  const deletedTargets = new Set<string>()
  for (const log of auditLogs) {
    if (log?.action === "DELETE_CANDIDATE" && log.target) {
      deletedTargets.add(log.target.trim().toLowerCase())
    }
  }
  for (const log of auditLogs) {
    if (log?.action !== "CREATE_CANDIDATE" || !log.target) continue
    const targetNorm = log.target.trim().toLowerCase()
    if (deletedTargets.has(targetNorm)) continue

    // Format target: "Nama Kandidat (KAB-27-014)"
    const match = log.target.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
    const parsedName = (match ? match[1] : log.target).trim()
    const parsedNum = match ? match[2].trim() : undefined
    if (!parsedName) continue

    const nameKey = parsedName.toLowerCase()
    if (existingNames.has(nameKey)) continue

    const schoolMatch = (log.detail || "").match(
      /Menambahkan kandidat baru dari\s+(.+)$/i,
    )
    const parsedSchool = schoolMatch
      ? schoolMatch[1].trim()
      : "MA Mu'allimin Muhammadiyah Yogyakarta"
    const number = generateNextCandidateNumber(result, cycleYear, parsedNum)
    const recoveredId = `cand-recovered-${nameKey.replace(/[^a-z0-9]+/g, "-")}`
    if (deletedCandidateIds.has(recoveredId) || existingIds.has(recoveredId)) {
      continue
    }

    const restored: Candidate = {
      id: recoveredId,
      number,
      name: parsedName,
      school: parsedSchool,
      gender: "Putra",
      birthDate: "2009-10-15",
      heightCm: 172,
      weightKg: 62,
      avatar: makeAvatarFromName(parsedName),
      stage: 1,
      stageStatuses: [...defaultStatuses],
      pip: null,
      tiu: null,
      pbb: null,
      fitness: null,
      personality: null,
      documents: [false, false, false, false, false, false],
      cycleId: activeCycleId,
      updatedAt: "Dipulihkan dari jejak audit",
      updatedAtIso: new Date().toISOString(),
    }
    result.push(restored)
    existingIds.add(restored.id)
    existingNames.add(nameKey)
    existingNumbers.add(restored.number.trim().toUpperCase())
    recoveredCount += 1
  }

  return { candidates: result, recoveredCount }
}

export function mergeCandidatesList({
  localCandidates = [],
  cloudCandidates = [],
  storageCandidates = [],
  catTryoutAttempts = [],
  auditLogs = [],
  users = [],
  ishiharaResults = [],
  activeCatCandidates = [],
  activeCycleId = "cycle-2027-kab",
  cycleYear = 2027,
  deletedCandidateIds = new Set<string>(),
}: {
  localCandidates?: Candidate[]
  cloudCandidates?: Candidate[]
  storageCandidates?: Candidate[]
  catTryoutAttempts?: CatTryoutAttempt[]
  auditLogs?: AuditLogEntry[]
  users?: UserProfile[]
  ishiharaResults?: IshiharaScreeningResult[]
  activeCatCandidates?: Candidate[]
  activeCycleId?: string
  cycleYear?: number
  deletedCandidateIds?: Set<string>
}): {
  candidates: Candidate[]
  localHasNewerData: boolean
  recoveredCount: number
} {
  // Latest CAT attempt per candidateId AND normalized candidateName
  const latestAttemptByCand = new Map<string, CatTryoutAttempt>()
  for (const att of catTryoutAttempts) {
    if (!att || !att.candidateId || att.candidateId === "coach-self") continue
    const prev = latestAttemptByCand.get(att.candidateId)
    if (!prev || (att.finalizedAt || "") > (prev.finalizedAt || "")) {
      latestAttemptByCand.set(att.candidateId, att)
    }
  }

  // Combine storageCandidates and localCandidates into an effective local map by ID
  // Always key by candidate.id (NEVER overwrite different IDs that share a number!)
  const effectiveLocalMap = new Map<string, Candidate>()
  for (const c of storageCandidates) {
    if (c && c.id && !deletedCandidateIds.has(c.id)) {
      effectiveLocalMap.set(c.id, c)
    }
  }
  for (const c of localCandidates) {
    if (c && c.id && !deletedCandidateIds.has(c.id)) {
      const fromStorage = effectiveLocalMap.get(c.id)
      if (!fromStorage) {
        effectiveLocalMap.set(c.id, c)
      } else {
        effectiveLocalMap.set(
          c.id,
          mergeSingleCandidate(
            fromStorage,
            c,
            latestAttemptByCand.get(c.id),
          ),
        )
      }
    }
  }

  const cloudMap = new Map<string, Candidate>()
  for (const c of cloudCandidates) {
    if (c && c.id && !deletedCandidateIds.has(c.id)) {
      const existing = cloudMap.get(c.id)
      cloudMap.set(
        c.id,
        existing
          ? mergeSingleCandidate(existing, c, latestAttemptByCand.get(c.id))
          : c,
      )
    }
  }

  // Union all candidate IDs preserving order: local new candidates first, then cloud/seeded
  const allIds: string[] = []
  const seenIds = new Set<string>()
  const pushId = (id: string) => {
    if (id && !seenIds.has(id) && !deletedCandidateIds.has(id)) {
      seenIds.add(id)
      allIds.push(id)
    }
  }

  for (const c of localCandidates) if (c?.id) pushId(c.id)
  for (const c of storageCandidates) if (c?.id) pushId(c.id)
  for (const c of cloudCandidates) if (c?.id) pushId(c.id)
  for (const id of effectiveLocalMap.keys()) pushId(id)

  let localHasNewerData = false
  const mergedList: Candidate[] = []

  for (const id of allIds) {
    const cloudCand = cloudMap.get(id)
    const localCand = effectiveLocalMap.get(id)
    if (!cloudCand && localCand) {
      localHasNewerData = true
    } else if (
      cloudCand &&
      localCand &&
      ((localCand.updatedAtIso &&
        (!cloudCand.updatedAtIso ||
          localCand.updatedAtIso > cloudCand.updatedAtIso)) ||
        localCand.updatedAt === "Baru saja")
    ) {
      localHasNewerData = true
    }
    const merged = mergeSingleCandidate(
      cloudCand,
      localCand,
      latestAttemptByCand.get(id),
    )
    mergedList.push(merged)
  }

  // Recover any orphaned candidates from CAT attempts, active CAT sessions, users, Ishihara, or Audit Logs
  const { candidates: withRecovered, recoveredCount } = recoverOrphanedCandidates({
    candidates: mergedList,
    catTryoutAttempts,
    auditLogs,
    users,
    ishiharaResults,
    activeCatCandidates,
    activeCycleId,
    cycleYear,
    deletedCandidateIds,
  })
  if (recoveredCount > 0) {
    localHasNewerData = true
  }

  const deduplicated = deduplicateCandidateNumbers(withRecovered, cycleYear)
  return {
    candidates: deduplicated,
    localHasNewerData,
    recoveredCount,
  }
}

export function mergeDatabaseStates({
  localState,
  cloudState,
  storageCandidates = [],
  storageAttempts = [],
  activeCatCandidates = [],
  deletedCandidateIds = new Set<string>(),
  currentUserId = "",
}: {
  localState: AppDatabaseState
  cloudState?: Partial<AppDatabaseState> | null
  storageCandidates?: Candidate[]
  storageAttempts?: CatTryoutAttempt[]
  activeCatCandidates?: Candidate[]
  deletedCandidateIds?: Set<string>
  currentUserId?: string
}): {
  mergedState: AppDatabaseState
  localHasNewerData: boolean
  recoveredCount: number
} {
  const d = cloudState || {}
  let localHasNewerData = false

  // 1. Merge CAT Attempts
  const cloudAttempts = Array.isArray(d.catTryoutAttempts)
    ? d.catTryoutAttempts.filter((a) => a && !LEGACY_DEMO_ATTEMPT_IDS.has(a.id))
    : []
  const mergedAttempts = mergeCatAttempts(
    localState.catTryoutAttempts || [],
    cloudAttempts,
    storageAttempts,
  )
  if (mergedAttempts.length > cloudAttempts.length) {
    localHasNewerData = true
  }

  // 2. Merge Sessions
  const localSessions: Session[] = localState.sessions || []
  const cloudSessions: Session[] = Array.isArray(d.sessions) ? d.sessions : []
  const sessionMap = new Map<string, Session>()
  for (const sess of cloudSessions) {
    if (sess?.id) sessionMap.set(sess.id, sess)
  }
  for (const sess of localSessions) {
    if (!sess?.id) continue
    if (!sessionMap.has(sess.id)) {
      sessionMap.set(sess.id, sess)
      localHasNewerData = true
    } else {
      const cloudSess = sessionMap.get(sess.id)!
      const mergedParticipants = Array.from(
        new Set([
          ...(cloudSess.participantIds || []),
          ...(sess.participantIds || []),
        ]),
      )
      sessionMap.set(sess.id, {
        ...cloudSess,
        ...sess,
        participantIds: mergedParticipants,
      })
    }
  }
  const mergedSessions = Array.from(sessionMap.values())

  // 3. Merge Records
  const localRecords: Record<string, SessionRecord> = localState.records || {}
  const cloudRecords: Record<string, SessionRecord> =
    d.records && typeof d.records === "object" ? d.records : {}
  const mergedRecords: Record<string, SessionRecord> = { ...cloudRecords }
  for (const [k, localRec] of Object.entries(localRecords)) {
    if (!localRec) continue
    const cloudRec = mergedRecords[k]
    if (!cloudRec) {
      mergedRecords[k] = localRec
      localHasNewerData = true
    } else {
      const localTime = localRec.savedAt || ""
      const cloudTime = cloudRec.savedAt || ""
      if (localTime > cloudTime) {
        mergedRecords[k] = localRec
        localHasNewerData = true
      } else if (
        localTime === cloudTime &&
        JSON.stringify(localRec) !== JSON.stringify(cloudRec)
      ) {
        mergedRecords[k] = {
          ...cloudRec,
          ...localRec,
          metrics: {
            ...(cloudRec.metrics || {}),
            ...(localRec.metrics || {}),
          },
        }
        localHasNewerData = true
      }
    }
  }

  // 4. Merge Ishihara Results & Sessions
  const localIshResults: IshiharaScreeningResult[] =
    localState.ishiharaResults || []
  const cloudIshResults: IshiharaScreeningResult[] = Array.isArray(
    d.ishiharaResults,
  )
    ? d.ishiharaResults
    : []
  const ishResMap = new Map<string, IshiharaScreeningResult>()
  for (const r of cloudIshResults) if (r?.id) ishResMap.set(r.id, r)
  for (const r of localIshResults) {
    if (r?.id && !ishResMap.has(r.id)) {
      ishResMap.set(r.id, r)
      localHasNewerData = true
    }
  }
  const mergedIshResults = Array.from(ishResMap.values()).sort((a, b) =>
    (b.createdAt || "").localeCompare(a.createdAt || ""),
  )

  const localIshSessions: IshiharaTestSession[] =
    localState.ishiharaSessions || []
  const cloudIshSessions: IshiharaTestSession[] = Array.isArray(
    d.ishiharaSessions,
  )
    ? d.ishiharaSessions
    : []
  const ishSessMap = new Map<string, IshiharaTestSession>()
  for (const isess of cloudIshSessions) if (isess?.id) ishSessMap.set(isess.id, isess)
  for (const isess of localIshSessions) {
    if (isess?.id && !ishSessMap.has(isess.id)) {
      ishSessMap.set(isess.id, isess)
      localHasNewerData = true
    }
  }
  const mergedIshSessions = Array.from(ishSessMap.values())

  // 5. Merge Audit Logs (union by id)
  const localAudits: AuditLogEntry[] = localState.auditLogs || []
  const cloudAudits: AuditLogEntry[] = Array.isArray(d.auditLogs)
    ? d.auditLogs
    : []
  const auditMap = new Map<string, AuditLogEntry>()
  for (const a of cloudAudits) if (a?.id) auditMap.set(a.id, a)
  for (const a of localAudits) {
    if (a?.id && !auditMap.has(a.id)) {
      auditMap.set(a.id, a)
      localHasNewerData = true
    }
  }
  const mergedAuditLogs = Array.from(auditMap.values())
    .sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""))
    .slice(0, 250)

  // 6. Merge Users (preserve staff + active candidate user profiles)
  const localUsers: UserProfile[] = localState.users || []
  const cloudUsers: UserProfile[] = Array.isArray(d.users) ? d.users : []
  const userMap = new Map<string, UserProfile>()
  for (const u of cloudUsers) {
    if (u?.id && u.role !== "candidate") userMap.set(u.id, u)
  }
  for (const u of localUsers) {
    if (!u?.id) continue
    if (
      u.role !== "candidate" ||
      u.id === currentUserId ||
      u.id.startsWith("user-cand-")
    ) {
      userMap.set(u.id, u)
    }
  }
  const mergedUsers = Array.from(userMap.values())

  // 7. Merge Cycles & Schedules
  const mergedCycles: SelectionCycle[] =
    Array.isArray(localState.cycles) && localState.cycles.length > 0
      ? localState.cycles
      : Array.isArray(d.cycles) && d.cycles.length > 0
        ? d.cycles
        : []
  const activeCycleId =
    localState.activeCycleId || d.activeCycleId || "cycle-2027-kab"
  const activeCycleYear =
    mergedCycles.find((c) => c.id === activeCycleId)?.year || 2027

  const localSchedules: SelectionSchedule[] = localState.schedules || []
  const cloudSchedules: SelectionSchedule[] = Array.isArray(d.schedules)
    ? d.schedules
    : []
  const schedMap = new Map<string, SelectionSchedule>()
  for (const sch of cloudSchedules) if (sch?.id) schedMap.set(sch.id, sch)
  for (const sch of localSchedules) {
    if (!sch?.id) continue
    if (!schedMap.has(sch.id)) {
      schedMap.set(sch.id, sch)
      localHasNewerData = true
    } else {
      const existing = schedMap.get(sch.id)!
      schedMap.set(sch.id, {
        ...existing,
        ...sch,
        assignedCandidateIds: Array.from(
          new Set([
            ...(existing.assignedCandidateIds || []),
            ...(sch.assignedCandidateIds || []),
          ]),
        ),
      })
    }
  }
  const mergedSchedules = Array.from(schedMap.values())

  // 8. Merge Deleted Candidate IDs from local and cloud
  const mergedDeletedIds = new Set<string>(deletedCandidateIds)
  if (Array.isArray(d.deletedCandidateIds)) {
    for (const delId of d.deletedCandidateIds) {
      if (delId && typeof delId === "string") mergedDeletedIds.add(delId)
    }
  }

  // 9. Merge Candidates + Orphan Recovery
  const candidateMergeResult = mergeCandidatesList({
    localCandidates: localState.candidates || [],
    cloudCandidates: Array.isArray(d.candidates) ? d.candidates : [],
    storageCandidates,
    catTryoutAttempts: mergedAttempts,
    auditLogs: mergedAuditLogs,
    users: mergedUsers,
    ishiharaResults: mergedIshResults,
    activeCatCandidates,
    activeCycleId,
    cycleYear: activeCycleYear,
    deletedCandidateIds: mergedDeletedIds,
  })

  if (candidateMergeResult.localHasNewerData) {
    localHasNewerData = true
  }

  const mergedAllowlist: AuthorizedAccount[] =
    Array.isArray(localState.ishiharaAllowlist) &&
    localState.ishiharaAllowlist.length > 0
      ? localState.ishiharaAllowlist
      : Array.isArray(d.ishiharaAllowlist)
        ? d.ishiharaAllowlist
        : []

  const mergedState: AppDatabaseState = {
    candidates: candidateMergeResult.candidates,
    catTryoutAttempts: mergedAttempts,
    cycles: mergedCycles,
    activeCycleId,
    sessions: mergedSessions,
    records: mergedRecords,
    schedules: mergedSchedules,
    questions: localState.questions || d.questions || [],
    supportingDocs:
      localState.supportingDocs && localState.supportingDocs.length > 0
        ? localState.supportingDocs
        : d.supportingDocs || [],
    standardRules:
      localState.standardRules && localState.standardRules.length > 0
        ? localState.standardRules
        : d.standardRules || [],
    stageChecklists:
      localState.stageChecklists || d.stageChecklists || {},
    users: mergedUsers,
    auditLogs: mergedAuditLogs,
    rankingPublished:
      localState.rankingPublished !== undefined
        ? localState.rankingPublished
        : Boolean(d.rankingPublished),
    ishiharaSessions: mergedIshSessions,
    ishiharaAllowlist: mergedAllowlist,
    ishiharaResults: mergedIshResults,
    deletedCandidateIds: Array.from(mergedDeletedIds),
  }

  return {
    mergedState,
    localHasNewerData,
    recoveredCount: candidateMergeResult.recoveredCount,
  }
}

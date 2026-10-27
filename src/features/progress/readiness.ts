import type {
  Candidate,
  CatTryoutAttempt,
  ResultStatus,
  Session,
  SessionRecord,
  StageStatus,
} from "../../domain/selection"

export function latestSessionRecord(
  candidateId: string,
  type: Session["type"],
  sessions: Session[],
  records: Record<string, SessionRecord>,
): SessionRecord | undefined {
  return sessions
    .filter((session) => session.type === type)
    .map((session) => records[`${session.id}:${candidateId}`])
    .filter((record): record is SessionRecord => Boolean(record?.savedAt))
    .sort((a, b) => (b.savedAt ?? "").localeCompare(a.savedAt ?? ""))[0]
}

function resultToStageStatus(result: ResultStatus | undefined): StageStatus {
  if (!result) return "locked"
  return result === "pending" ? "active" : result
}

function scoreToStageStatus(score: number | null | undefined, target: number): StageStatus {
  if (score === null || score === undefined || !Number.isFinite(score)) return "locked"
  return score >= target ? "passed" : "review"
}

export function getProgressStageStatuses(
  candidate: Candidate,
  attempts: CatTryoutAttempt[],
  sessions: Session[],
  records: Record<string, SessionRecord>,
): StageStatus[] {
  const latestAttempt = attempts
    .filter((attempt) => attempt.candidateId === candidate.id)
    .sort((a, b) => b.finalizedAt.localeCompare(a.finalizedAt))[0]
  const validDocuments = (candidate.documents ?? []).filter(Boolean).length
  const medicalRecord = latestSessionRecord(candidate.id, "medical", sessions, records)
  const paradeRecord = latestSessionRecord(candidate.id, "parade", sessions, records)

  const hasPipAttempt =
    latestAttempt &&
    ((latestAttempt.pipAnswers && Object.keys(latestAttempt.pipAnswers).length > 0) ||
      (typeof latestAttempt.pipScore === "number" && latestAttempt.pipScore > 0))
  const hasTiuAttempt =
    latestAttempt &&
    ((latestAttempt.tiuAnswers && Object.keys(latestAttempt.tiuAnswers).length > 0) ||
      (typeof latestAttempt.tiuScoreScaled === "number" && latestAttempt.tiuScoreScaled > 0))

  const savedStatuses = candidate.stageStatuses ?? []
  const adminStatus: StageStatus =
    validDocuments === 6 || savedStatuses[0] === "passed"
      ? "passed"
      : savedStatuses[0] === "failed" || savedStatuses[0] === "review"
        ? savedStatuses[0]
        : validDocuments > 0
          ? "active"
          : "locked"

  const pipVal = hasPipAttempt ? latestAttempt?.pipScore : candidate.pip
  const pipStatus: StageStatus =
    pipVal !== null && pipVal !== undefined
      ? scoreToStageStatus(pipVal, 70)
      : savedStatuses[1] && savedStatuses[1] !== "locked"
        ? savedStatuses[1]
        : "locked"

  const tiuVal = hasTiuAttempt ? latestAttempt?.tiuScoreScaled : candidate.tiu
  const tiuStatus: StageStatus =
    tiuVal !== null && tiuVal !== undefined
      ? scoreToStageStatus(tiuVal, 70)
      : savedStatuses[2] && savedStatuses[2] !== "locked"
        ? savedStatuses[2]
        : "locked"

  const medicalStatus: StageStatus =
    medicalRecord?.result && medicalRecord.result !== "pending"
      ? resultToStageStatus(medicalRecord.result)
      : savedStatuses[3] && savedStatuses[3] !== "locked" && savedStatuses[3] !== "active"
        ? savedStatuses[3]
        : medicalRecord?.savedAt
          ? "active"
          : savedStatuses[3] ?? "locked"

  const paradeStatus: StageStatus =
    paradeRecord?.result && paradeRecord.result !== "pending"
      ? resultToStageStatus(paradeRecord.result)
      : savedStatuses[4] && savedStatuses[4] !== "locked" && savedStatuses[4] !== "active"
        ? savedStatuses[4]
        : paradeRecord?.savedAt || (candidate.heightCm && candidate.weightKg)
          ? "active"
          : savedStatuses[4] ?? "locked"

  const pbbStatus: StageStatus =
    candidate.pbb !== null && candidate.pbb !== undefined
      ? scoreToStageStatus(candidate.pbb, 80)
      : savedStatuses[5] && savedStatuses[5] !== "locked"
        ? savedStatuses[5]
        : "locked"

  const fitnessStatus: StageStatus =
    candidate.fitness !== null && candidate.fitness !== undefined
      ? scoreToStageStatus(candidate.fitness, 80)
      : savedStatuses[6] && savedStatuses[6] !== "locked"
        ? savedStatuses[6]
        : "locked"

  const personalityStatus: StageStatus =
    candidate.personality !== null && candidate.personality !== undefined
      ? scoreToStageStatus(candidate.personality, 80)
      : savedStatuses[7] && savedStatuses[7] !== "locked"
        ? savedStatuses[7]
        : "locked"

  return [
    adminStatus,
    pipStatus,
    tiuStatus,
    medicalStatus,
    paradeStatus,
    pbbStatus,
    fitnessStatus,
    personalityStatus,
  ]
}

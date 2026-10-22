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

  return [
    validDocuments === 6 ? "passed" : validDocuments > 0 ? "active" : "locked",
    scoreToStageStatus(latestAttempt?.pipScore ?? candidate.pip, 70),
    scoreToStageStatus(latestAttempt?.tiuScoreScaled ?? candidate.tiu, 70),
    resultToStageStatus(medicalRecord?.result),
    paradeRecord?.savedAt
      ? resultToStageStatus(paradeRecord.result)
      : candidate.heightCm && candidate.weightKg
        ? "active"
        : "locked",
    scoreToStageStatus(candidate.pbb, 80),
    scoreToStageStatus(candidate.fitness, 80),
    scoreToStageStatus(candidate.personality, 80),
  ]
}

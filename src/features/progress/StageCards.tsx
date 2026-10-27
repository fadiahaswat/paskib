import React from "react"
import { Layers } from "lucide-react"
import { Badge, Card } from "../../components/ui"
import { bmi, type Candidate, type Session, type SessionRecord } from "../../domain/selection"
import { useApp } from "../../context/AppContext"
import { latestSessionRecord } from "./readiness"
import { LineChart, type LineChartColor } from "./LineChart"

function extractReactiveStageHistory(
  candidate: Candidate,
  stageType: "pip" | "tiu" | "pbb" | "fitness" | "personality",
  sessions: Session[],
  records: Record<string, SessionRecord>,
): number[] {
  const targetType = stageType === "personality" ? "interview" : stageType
  const matching = sessions
    .filter((s) => s.type === targetType || (stageType === "pip" && s.type === "cat") || (stageType === "tiu" && s.type === "cat"))
    .sort((a, b) => a.date.localeCompare(b.date))

  const scores: number[] = []
  for (const sess of matching) {
    const rec = records[`${sess.id}:${candidate.id}`]
    if (!rec?.savedAt || !rec.metrics) continue
    const m = rec.metrics
    let val = 0

    if (stageType === "pip") {
      if (sess.type === "cat") {
        val = Number(m.pipScore) || 0
      } else {
        const direct = Number(m.pipScore) || Number(m.score)
        const c = (Number(m.understanding) || 0) + (Number(m.implementation) || 0) + (Number(m.caseStudy) || 0)
        val = direct > 0 ? direct : c
      }
    } else if (stageType === "tiu") {
      if (sess.type === "cat") {
        val = Number(m.tiuScore) || 0
      } else {
        const direct = Number(m.tiuScore) || Number(m.score)
        const c = (Number(m.verbal) || 0) + (Number(m.numerical) || 0) + (Number(m.figural) || 0)
        val = direct > 0 ? direct : c
      }
    } else if (stageType === "pbb") {
      const direct = Number(m.pbbScore) || Number(m.score) || Number(m.finalScore)
      const c = (Number(m.static) || 0) + (Number(m.dynamic) || 0) + (Number(m.command) || 0)
      val = direct > 0 ? direct : c
    } else if (stageType === "fitness") {
      const direct = Number(m.fitnessScore) || Number(m.score) || Number(m.finalScore)
      if (direct > 0) {
        val = direct
      } else if (m.runMode !== "interval" && !m.intervalLap1) {
        const dist = Number(m.distance) || 0
        const push = Number(m.pushup) || 0
        const sit = Number(m.situp) || 0
        const back = Number(m.backup) || 0
        const shuttle = Number(m.shuttle) || 0
        if (dist > 0 || push > 0 || sit > 0 || back > 0 || shuttle > 0) {
          const isPutra = candidate.gender === "Putra"
          const pDist = dist > 0 ? Math.min(100, Math.round((dist / (isPutra ? 2400 : 2000)) * 100)) : 0
          const pPush = push > 0 ? Math.min(100, Math.round((push / (isPutra ? 35 : 25)) * 100)) : 0
          const pSit = sit > 0 ? Math.min(100, Math.round((sit / (isPutra ? 40 : 35)) * 100)) : 0
          const pBack = back > 0 ? Math.min(100, Math.round((back / (isPutra ? 45 : 40)) * 100)) : 0
          const pShuttle = shuttle > 0 ? Math.min(100, Math.max(0, Math.round((1 - (shuttle - (isPutra ? 17.2 : 19.0)) / 8) * 100))) : 0
          const active = [pDist, pPush, pSit, pBack, pShuttle].filter((v) => v > 0)
          if (active.length > 0) {
            val = Math.round(active.reduce((a, b) => a + b, 0) / active.length)
          }
        }
      }
    } else if (stageType === "personality") {
      const direct = Number(m.interviewScore) || Number(m.personalityScore) || Number(m.score)
      const c = (Number(m.star) || 0) + (Number(m.integrity) || 0) + (Number(m.communication) || 0)
      val = direct > 0 ? direct : c
    }

    if (Number.isFinite(val) && val > 0) {
      scores.push(val)
    }
  }
  return scores
}

export function StageCards({
  candidate,
  onOpenModal,
}: {
  candidate: Candidate
  onOpenModal?: () => void
}) {
  const { catTryoutAttempts, sessions, records, ishiharaResults } = useApp()
  const validDocs = (candidate.documents ?? []).filter(Boolean).length
  const bmiInfo = bmi(candidate.weightKg ?? 0, candidate.heightCm ?? 0)

  const candidateAttempts = catTryoutAttempts
    .filter((attempt) => attempt.candidateId === candidate.id)
    .sort((a, b) => a.finalizedAt.localeCompare(b.finalizedAt))
  const latestAttempt = candidateAttempts[candidateAttempts.length - 1]
  const medicalRecord = latestSessionRecord(
    candidate.id,
    "medical",
    sessions,
    records,
  )
  const latestIshihara = (ishiharaResults ?? [])
    .filter((r) => r.participantId === candidate.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]

  // Stage historical data (reactive from AppContext state)
  const pipHistory = extractReactiveStageHistory(candidate, "pip", sessions, records)
  const tiuHistory = extractReactiveStageHistory(candidate, "tiu", sessions, records)
  const pbbHistory = extractReactiveStageHistory(candidate, "pbb", sessions, records)
  const fitnessHistory = extractReactiveStageHistory(candidate, "fitness", sessions, records)
  const personalityHistory = extractReactiveStageHistory(candidate, "personality", sessions, records)

  const pipScore =
    latestAttempt?.pipScore ??
    candidate.pip ??
    (pipHistory.length > 0 ? pipHistory[pipHistory.length - 1] : null)
  const tiuScore =
    latestAttempt?.tiuScoreScaled ??
    candidate.tiu ??
    (tiuHistory.length > 0 ? tiuHistory[tiuHistory.length - 1] : null)
  const pipScores = candidateAttempts.length
    ? candidateAttempts.map((attempt) => attempt.pipScore)
    : pipHistory.length > 0
      ? pipHistory
      : candidate.pip !== null
        ? [candidate.pip]
        : []
  const tiuScores = candidateAttempts.length
    ? candidateAttempts.map((attempt) => attempt.tiuScoreScaled)
    : tiuHistory.length > 0
      ? tiuHistory
      : candidate.tiu !== null
        ? [candidate.tiu]
        : []
  const paradeHeights = (candidate.anthropometryHistory ?? [])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => entry.heightCm)
  if (paradeHeights.length === 0 && candidate.heightCm)
    paradeHeights.push(candidate.heightCm)

  const stagesData = [
    {
      num: 1,
      shortLabel: "ADM",
      name: "Administrasi",
      value: `${validDocs}/6`,
      unit: "berkas",
      target: 6,
      targetText: "6 berkas",
      status: validDocs === 6 ? "Lengkap" : `${validDocs}/6 Valid`,
      tone: validDocs === 6 ? "success" as const : "neutral" as const,
      dotColor: "bg-blue-500",
      color: "blue" as LineChartColor,
      chartValues: validDocs > 0 ? [validDocs] : [],
    },
    {
      num: 2,
      shortLabel: "PIP",
      name: "Pancasila & PIP",
      value: pipScore !== null ? `${pipScore.toFixed(0)}` : "—",
      unit: pipScore !== null ? "/ 100" : "",
      target: 70,
      targetText: "≥ 70",
      status:
        pipScore !== null
          ? pipScore >= 70
            ? "Siap"
            : "Penguatan"
          : "Belum Dinilai",
      tone:
        pipScore !== null
          ? pipScore >= 70
            ? "success" as const
            : "warning" as const
          : "neutral" as const,
      dotColor: "bg-red-500",
      color: "red" as LineChartColor,
      chartValues: pipScores.length > 0 ? pipScores : pipHistory,
    },
    {
      num: 3,
      shortLabel: "TIU",
      name: "Intelegensia Umum",
      value: tiuScore !== null ? `${tiuScore.toFixed(0)}` : "—",
      unit: tiuScore !== null ? "/ 100" : "",
      target: 70,
      targetText: "≥ 70",
      status:
        tiuScore !== null
          ? tiuScore >= 70
            ? "Siap"
            : "Penguatan"
          : "Belum Dinilai",
      tone:
        tiuScore !== null
          ? tiuScore >= 70
            ? "success" as const
            : "warning" as const
          : "neutral" as const,
      dotColor: "bg-purple-500",
      color: "purple" as LineChartColor,
      chartValues: tiuScores.length > 0 ? tiuScores : tiuHistory,
    },
    {
      num: 4,
      shortLabel: "RIK",
      name: "Kesehatan & Rikkes",
      value: (() => {
        const anamMetric = candidate.physicalMetrics?.find((m) =>
          m.label.toLowerCase().includes("anamnesis"),
        )
        const score =
          medicalRecord?.metrics?.anamnesisScore ||
          (anamMetric ? anamMetric.percent : null) ||
          (latestIshihara ? latestIshihara.accuracy : null)
        if (score !== null && score !== undefined) return `${score}`
        const effStatus =
          medicalRecord?.result && medicalRecord.result !== "pending"
            ? medicalRecord.result
            : candidate.stageStatuses[3] && candidate.stageStatuses[3] !== "locked" && candidate.stageStatuses[3] !== "active"
              ? candidate.stageStatuses[3]
              : medicalRecord?.result === "pending"
                ? "pending"
                : null
        return effStatus === "passed"
          ? "Laik"
          : effStatus === "failed"
            ? "Tidak Laik"
            : effStatus === "review"
              ? "Perlu Tinjau"
              : effStatus === "pending"
                ? "Proses"
                : "—"
      })(),
      unit: (() => {
        const anamMetric = candidate.physicalMetrics?.find((m) =>
          m.label.toLowerCase().includes("anamnesis"),
        )
        const score =
          medicalRecord?.metrics?.anamnesisScore ||
          (anamMetric ? anamMetric.percent : null) ||
          (latestIshihara ? latestIshihara.accuracy : null)
        return score !== null && score !== undefined ? "/ 100" : ""
      })(),
      target: 70,
      targetText: "≥ 70 (Laik)",
      status: (() => {
        const effStatus =
          medicalRecord?.result && medicalRecord.result !== "pending"
            ? medicalRecord.result
            : candidate.stageStatuses[3] && candidate.stageStatuses[3] !== "locked" && candidate.stageStatuses[3] !== "active"
              ? candidate.stageStatuses[3]
              : latestIshihara
                ? latestIshihara.screeningInterpretation === "normal"
                  ? "passed"
                  : "review"
                : medicalRecord?.result === "pending"
                  ? "pending"
                  : null
        return effStatus === "passed"
          ? "Memenuhi"
          : effStatus === "failed"
            ? "Tidak Memenuhi"
            : effStatus === "review"
              ? "Perlu Tinjau"
              : effStatus === "pending"
                ? "Proses"
                : "Belum Dinilai"
      })(),
      tone: (() => {
        const effStatus =
          medicalRecord?.result && medicalRecord.result !== "pending"
            ? medicalRecord.result
            : candidate.stageStatuses[3] && candidate.stageStatuses[3] !== "locked" && candidate.stageStatuses[3] !== "active"
              ? candidate.stageStatuses[3]
              : latestIshihara
                ? latestIshihara.screeningInterpretation === "normal"
                  ? "passed"
                  : "review"
                : medicalRecord?.result === "pending"
                  ? "pending"
                  : null
        return effStatus === "passed"
          ? ("success" as const)
          : effStatus === "failed"
            ? ("danger" as const)
            : effStatus === "review" || effStatus === "pending"
              ? ("warning" as const)
              : ("neutral" as const)
      })(),
      dotColor: "bg-emerald-500",
      color: "emerald" as LineChartColor,
      chartValues: (() => {
        const anamMetric = candidate.physicalMetrics?.find((m) =>
          m.label.toLowerCase().includes("anamnesis"),
        )
        const score =
          medicalRecord?.metrics?.anamnesisScore ||
          (anamMetric ? anamMetric.percent : null) ||
          (latestIshihara ? latestIshihara.accuracy : null)
        return score !== null && score !== undefined ? [Number(score)] : []
      })(),
    },
    {
      num: 5,
      shortLabel: "PAR",
      name: "Parade & Postur",
      value: candidate.heightCm ? `${candidate.heightCm}` : "—",
      unit: "cm",
      target: candidate.gender === "Putra" ? 170 : 165,
      targetText: candidate.gender === "Putra" ? "≥ 170 cm" : "≥ 165 cm",
      status: bmiInfo ? bmiInfo.category : "Belum Ukur",
      tone:
        bmiInfo?.category === "Normal"
          ? "success" as const
          : bmiInfo
            ? "warning" as const
            : "neutral" as const,
      dotColor: "bg-amber-500",
      color: "amber" as LineChartColor,
      chartValues: paradeHeights,
    },
    {
      num: 6,
      shortLabel: "PBB",
      name: "Baris Berbaris",
      value: candidate.pbb !== null ? `${candidate.pbb.toFixed(1)}` : "—",
      unit: candidate.pbb !== null ? "/ 100" : "",
      target: 80,
      targetText: "≥ 80",
      status:
        candidate.pbb !== null
          ? candidate.pbb >= 80
            ? "Siap"
            : "Penguatan"
          : "Belum Dinilai",
      tone:
        candidate.pbb !== null
          ? candidate.pbb >= 80
            ? "success" as const
            : "warning" as const
          : "neutral" as const,
      dotColor: "bg-blue-600",
      color: "blue" as LineChartColor,
      chartValues:
        pbbHistory.length > 0
          ? pbbHistory
          : candidate.pbb !== null
            ? [candidate.pbb]
            : [],
    },
    {
      num: 7,
      shortLabel: "SAM",
      name: "Kesamaptaan",
      value:
        candidate.fitness !== null ? `${candidate.fitness.toFixed(1)}` : "—",
      unit: candidate.fitness !== null ? "/ 100" : "",
      target: 80,
      targetText: "≥ 80",
      status:
        candidate.fitness !== null
          ? candidate.fitness >= 80
            ? "Siap"
            : "Penguatan"
          : "Belum Dinilai",
      tone:
        candidate.fitness !== null
          ? candidate.fitness >= 80
            ? "success" as const
            : "warning" as const
          : "neutral" as const,
      dotColor: "bg-rose-500",
      color: "red" as LineChartColor,
      chartValues:
        fitnessHistory.length > 0
          ? fitnessHistory
          : candidate.fitness !== null
            ? [candidate.fitness]
            : [],
    },
    {
      num: 8,
      shortLabel: "WAW",
      name: "Kepribadian",
      value:
        candidate.personality !== null
          ? `${candidate.personality.toFixed(1)}`
          : "—",
      unit: candidate.personality !== null ? "/ 100" : "",
      target: 80,
      targetText: "≥ 80",
      status:
        candidate.personality !== null
          ? candidate.personality >= 80
            ? "Siap"
            : "Penguatan"
          : "Belum Dinilai",
      tone:
        candidate.personality !== null
          ? candidate.personality >= 80
            ? "success" as const
            : "warning" as const
          : "neutral" as const,
      dotColor: "bg-indigo-500",
      color: "indigo" as LineChartColor,
      chartValues:
        personalityHistory.length > 0
          ? personalityHistory
          : candidate.personality !== null
            ? [candidate.personality]
            : [],
    },
  ]

  return (
    <Card className="overflow-hidden border border-slate-200/90 bg-white shadow-2xs rounded-2xl">
      {/* Header Wadah Ringkas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 bg-white px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
            <Layers className="size-4" />
          </span>
          <div>
            <h2 className="font-display text-sm sm:text-base font-bold text-slate-900 leading-snug">
              Kesiapan 8 Materi Pembinaan
            </h2>
            <p className="text-2xs text-slate-500">
              Monitoring kesiapan tahapan seleksi berdasarkan standar resmi BPIP
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="neutral" className="text-2xs font-semibold px-2 py-0.5">
            Standar BPIP
          </Badge>
        </div>
      </div>

      {/* Grid 8 Kartu Materi Pembinaan Compact */}
      <div className="p-2.5 sm:p-4 bg-slate-50/50">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4">
          {stagesData.map((stage) => (
            <div
              key={stage.num}
              onClick={onOpenModal}
              className={`flex flex-col justify-between p-2.5 sm:p-3 rounded-xl border border-slate-200/90 bg-white hover:border-blue-300 hover:shadow-2xs transition-all duration-150 ${
                onOpenModal ? "cursor-pointer" : ""
              }`}
            >
              <div>
                {/* Baris 1: Kode Tahap + Status Badge */}
                <div className="flex items-center justify-between gap-1">
                  <span className="inline-flex items-center gap-1.5 text-2xs font-bold text-slate-500 uppercase tracking-wider">
                    <span
                      className={`size-1.5 shrink-0 rounded-full ${stage.dotColor}`}
                    />
                    {stage.shortLabel}
                  </span>
                  <Badge
                    tone={stage.tone}
                    className="text-3xs !py-0 !px-1.5 shrink-0 font-semibold"
                  >
                    {stage.status}
                  </Badge>
                </div>

                {/* Baris 2: Nama Materi Lengkap */}
                <h3 className="mt-1 text-xs font-bold text-slate-900 leading-tight">
                  {stage.name}
                </h3>

                {/* Baris 3: Nilai / Metrik & Target */}
                <div className="mt-1.5 flex items-baseline justify-between gap-1">
                  <div className="flex items-baseline gap-1 min-w-0">
                    <span className="font-display text-base sm:text-lg font-black text-slate-950">
                      {stage.value}
                    </span>
                    {stage.unit ? (
                      <span className="text-3xs font-semibold text-slate-400 shrink-0">
                        {stage.unit}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-3xs text-slate-400 font-medium shrink-0 text-right">
                    Tgt {stage.targetText}
                  </span>
                </div>
              </div>

              {/* Sparkline Trend Chart Compact */}
              <div className="mt-1.5 pt-1.5 border-t border-slate-100">
                <LineChart
                  values={stage.chartValues}
                  target={stage.target}
                  color={stage.color}
                  height={14}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

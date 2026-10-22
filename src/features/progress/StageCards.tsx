import React from "react"
import { Badge, Card } from "../../components/ui"
import { bmi, type Candidate } from "../../domain/selection"
import { useApp } from "../../context/AppContext"
import { latestSessionRecord } from "./readiness"
import { LineChart, type LineChartColor } from "./LineChart"

type StoredSession = {
  id: string
  type: string
  title: string
  date: string
  status: string
}

type StoredRecord = {
  metrics: Record<string, string>
  savedAt?: string
}

function getStageHistory(candidateId: string, stageType: string): number[] {
  try {
    const sessions = JSON.parse(
      localStorage.getItem("paska-clean-sessions") ?? "[]",
    ) as StoredSession[]
    const records = JSON.parse(
      localStorage.getItem("paska-clean-records") ?? "{}",
    ) as Record<string, StoredRecord>

    const matching = sessions
      .filter((s) => s.type === stageType)
      .sort((a, b) => a.date.localeCompare(b.date))

    const scores: number[] = []
    for (const sess of matching) {
      const rec = records[`${sess.id}:${candidateId}`]
      if (rec?.savedAt && rec.metrics) {
        const val =
          Number(rec.metrics.score) ||
          Number(rec.metrics[`${stageType}Score`]) ||
          Number(rec.metrics.finalScore) ||
          Number(rec.metrics.totalScore)
        if (Number.isFinite(val) && val > 0) {
          scores.push(val)
        }
      }
    }
    return scores
  } catch {
    return []
  }
}

export function StageCards({
  candidate,
}: {
  candidate: Candidate
}) {
  const { catTryoutAttempts, sessions, records } = useApp()
  const validDocs = (candidate.documents ?? []).filter(Boolean).length
  const bmiInfo = bmi(candidate.weightKg ?? 0, candidate.heightCm ?? 0)

  const candidateAttempts = catTryoutAttempts
    .filter((attempt) => attempt.candidateId === candidate.id)
    .sort((a, b) => a.finalizedAt.localeCompare(b.finalizedAt))
  const latestAttempt = candidateAttempts[candidateAttempts.length - 1]
  const medicalRecord = latestSessionRecord(candidate.id, "medical", sessions, records)
  const pipScore = latestAttempt?.pipScore ?? candidate.pip
  const tiuScore = latestAttempt?.tiuScoreScaled ?? candidate.tiu
  const pipScores = candidateAttempts.length
    ? candidateAttempts.map((attempt) => attempt.pipScore)
    : candidate.pip !== null ? [candidate.pip] : []
  const tiuScores = candidateAttempts.length
    ? candidateAttempts.map((attempt) => attempt.tiuScoreScaled)
    : candidate.tiu !== null ? [candidate.tiu] : []
  const paradeHeights = (candidate.anthropometryHistory ?? [])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => entry.heightCm)
  if (paradeHeights.length === 0 && candidate.heightCm) paradeHeights.push(candidate.heightCm)

  // Stage historical data
  const pipHistory = getStageHistory(candidate.id, "pip")
  const tiuHistory = getStageHistory(candidate.id, "tiu")
  const pbbHistory = getStageHistory(candidate.id, "pbb")
  const fitnessHistory = getStageHistory(candidate.id, "fitness")
  const personalityHistory = getStageHistory(candidate.id, "personality")

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
      tone: validDocs === 6 ? ("success" as const) : ("neutral" as const),
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
            ? ("success" as const)
            : ("warning" as const)
          : ("neutral" as const),
      dotColor: "bg-red-500",
      color: "red" as LineChartColor,
      chartValues: pipScores.length > 0 ? pipScores : pipHistory,
    },
    {
      num: 3,
      shortLabel: "TIU",
      name: "Intelegensia",
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
            ? ("success" as const)
            : ("warning" as const)
          : ("neutral" as const),
      dotColor: "bg-purple-500",
      color: "purple" as LineChartColor,
      chartValues: tiuScores.length > 0 ? tiuScores : tiuHistory,
    },
    {
      num: 4,
      shortLabel: "RIK",
      name: "Kesehatan",
      value: medicalRecord
        ? medicalRecord.result === "passed"
          ? "Laik"
          : medicalRecord.result === "failed"
            ? "Tidak Laik"
            : medicalRecord.result === "review"
              ? "Perlu Tinjau"
              : "Proses"
        : "Belum Dinilai",
      unit: "",
      target: 85,
      targetText: "Standar Laik",
      status: medicalRecord
        ? medicalRecord.result === "passed"
          ? "Memenuhi"
          : medicalRecord.result === "failed"
            ? "Tidak Memenuhi"
            : medicalRecord.result === "review"
              ? "Perlu Tinjau"
              : "Proses"
        : "Belum Dinilai",
      tone: medicalRecord
        ? medicalRecord.result === "passed"
          ? ("success" as const)
          : medicalRecord.result === "failed"
            ? ("danger" as const)
            : ("warning" as const)
        : ("neutral" as const),
      dotColor: "bg-emerald-500",
      color: "emerald" as LineChartColor,
      chartValues: [],
    },
    {
      num: 5,
      shortLabel: "PAR",
      name: "Parade & Postur",
      value: candidate.heightCm ? `${candidate.heightCm}` : "—",
      unit: "cm",
      target: candidate.gender === "Putra" ? 175 : 170,
      targetText: candidate.gender === "Putra" ? "170–180 cm" : "165–175 cm",
      status: bmiInfo ? bmiInfo.category : "Belum Ukur",
      tone:
        bmiInfo?.category === "Normal"
          ? ("success" as const)
          : bmiInfo
            ? ("warning" as const)
            : ("neutral" as const),
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
      targetText: "≥ 80 (30%)",
      status:
        candidate.pbb !== null
          ? candidate.pbb >= 80
            ? "Siap"
            : "Drill"
          : "Belum Dinilai",
      tone:
        candidate.pbb !== null
          ? candidate.pbb >= 80
            ? ("success" as const)
            : ("warning" as const)
          : ("neutral" as const),
      dotColor: "bg-blue-600",
      color: "blue" as LineChartColor,
      chartValues: pbbHistory.length > 0 ? pbbHistory : candidate.pbb !== null ? [candidate.pbb] : [],
    },
    {
      num: 7,
      shortLabel: "SAM",
      name: "Kesamaptaan",
      value: candidate.fitness !== null ? `${candidate.fitness.toFixed(1)}` : "—",
      unit: candidate.fitness !== null ? "/ 100" : "",
      target: 80,
      targetText: "≥ 80 (30%)",
      status:
        candidate.fitness !== null
          ? candidate.fitness >= 80
            ? "Siap"
            : "Penguatan"
          : "Belum Dinilai",
      tone:
        candidate.fitness !== null
          ? candidate.fitness >= 80
            ? ("success" as const)
            : ("warning" as const)
          : ("neutral" as const),
      dotColor: "bg-rose-500",
      color: "red" as LineChartColor,
      chartValues: fitnessHistory.length > 0 ? fitnessHistory : candidate.fitness !== null ? [candidate.fitness] : [],
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
      targetText: "≥ 80 (40%)",
      status:
        candidate.personality !== null
          ? candidate.personality >= 80
            ? "Siap"
            : "Pembinaan"
          : "Belum Dinilai",
      tone:
        candidate.personality !== null
          ? candidate.personality >= 80
            ? ("success" as const)
            : ("warning" as const)
          : ("neutral" as const),
      dotColor: "bg-indigo-500",
      color: "indigo" as LineChartColor,
      chartValues: personalityHistory.length > 0 ? personalityHistory : candidate.personality !== null ? [candidate.personality] : [],
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-slate-900">
          Kesiapan 8 Materi Pembinaan
        </h2>
        <span className="text-xs text-slate-500">
          Standar Resmi BPIP
        </span>
      </div>

      {/* Clean 4-Column Grid of 8 Minimalist KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
        {stagesData.map((stage) => (
          <Card
            key={stage.num}
            className="flex flex-col justify-between p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-2xs transition"
          >
            <div>
              {/* Top Row: Dot + Stage Name + Status Pill */}
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`size-2 shrink-0 rounded-full ${stage.dotColor}`} />
                  <span className="truncate text-xs font-bold text-slate-800">
                    {stage.shortLabel} · {stage.name}
                  </span>
                </div>
                <Badge tone={stage.tone} className="text-[0.62rem] !py-0 !px-1.5 shrink-0">
                  {stage.status}
                </Badge>
              </div>

              {/* Main Metric Value + Target */}
              <div className="mt-2.5 flex items-baseline justify-between gap-1">
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-xl font-black text-slate-950">
                    {stage.value}
                  </span>
                  {stage.unit ? (
                    <span className="text-[0.68rem] font-semibold text-slate-400">
                      {stage.unit}
                    </span>
                  ) : null}
                </div>
                <span className="text-[0.62rem] text-slate-400 font-medium shrink-0">
                  Tgt {stage.targetText}
                </span>
              </div>
            </div>

            {/* Seamless, Borderless Mini LineChart */}
            <div className="mt-2 pt-1 border-t border-slate-100/80">
              <LineChart
                values={stage.chartValues}
                target={stage.target}
                color={stage.color}
                height={26}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

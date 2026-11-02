import { anamnesisItems, criticalAnamnesis } from "../../data/selectionGuide"
import type { ScreeningHistoryEntry } from "./AnamnesisView"

export const ANAMNESIS_QUESTIONS_21: string[] = [
  "Apakah Anda sering mengalami ISPA atau batuk/pilek lebih dari 4 kali dalam setahun?",
  "Apakah telinga Anda sering berdenging atau pernah mengeluarkan cairan?",
  "Apakah Anda memiliki riwayat asma yang sering kambuh atau riwayat sakit TBC?",
  "Apakah Anda sering mengalami insomnia atau gangguan tidur yang parah?",
  "Apakah terdapat pembuluh darah varises yang menonjol di bagian kaki Anda?",
  "Apakah Anda memiliki gangguan bicara seperti gagap atau kesulitan artikulasi berat?",
  "Apakah Anda pernah mengalami ambeien/wasir atau perdarahan saluran cerna?",
  "Apakah Anda sering merasakan nyeri tulang belakang atau kelainan bentuk rangka/tulang punggung?",
  "Apakah Anda memiliki riwayat sakit maag kronis atau asam lambung (GERD)?",
  "Apakah Anda pernah mengalami patah tulang atau masih terpasang pen/implan ortopedi?",
  "Apakah Anda pernah merasakan nyeri dada atau detak jantung tidak beraturan (aritmia)?",
  "Apakah saat ini Anda sedang mengonsumsi obat rutin tertentu selain vitamin/suplemen?",
  "Apakah Anda memiliki riwayat penyakit ginjal atau gangguan saluran kemih?",
  "Apakah Anda pernah menjalani tindakan operasi besar dengan pembiusan umum (total)?",
  "Apakah Anda sering mengalami migrain atau sakit kepala lebih dari 1 kali dalam seminggu?",
  "Apakah Anda pernah pingsan dalam kurun waktu 3 bulan terakhir?",
  "Apakah Anda memiliki kebiasaan merokok atau menggunakan rokok elektrik (vape)?",
  "Apakah Anda memiliki riwayat kejang atau penyakit epilepsi?",
  "Apakah Anda pernah atau sedang mengonsumsi minuman beralkohol atau zat terlarang (narkoba)?",
  "Apakah Anda memiliki gigi berlubang (karies aktif) lebih dari 5 gigi?",
  "Apakah Anda memiliki riwayat alergi berat terhadap makanan atau obat-obatan tertentu?",
]

export interface AnamnesisEvaluation {
  answeredCount: number
  yesCount: number
  criticalTriggered: { item: readonly [string, string]; index: number }[]
  score: number
  status: "passed" | "review" | "failed"
}

export function evaluateAnamnesisAnswers(
  answers: Record<string, "yes" | "no">,
): AnamnesisEvaluation {
  const answeredCount = Object.keys(answers).filter(
    (k) => answers[k] === "yes" || answers[k] === "no",
  ).length
  const yesCount = anamnesisItems.filter(
    (_, i) => answers[String(i)] === "yes",
  ).length
  const criticalTriggered = anamnesisItems
    .map((item, index) => ({ item, index }))
    .filter(
      ({ index }) =>
        criticalAnamnesis.has(index) && answers[String(index)] === "yes",
    )

  let score = 0
  if (answeredCount > 0) {
    if (criticalTriggered.length > 0) {
      score = 0
    } else if (yesCount === 0) {
      score = 100
    } else if (yesCount <= 5) {
      score = Math.max(60, 100 - yesCount * 8)
    } else {
      score = Math.max(20, 60 - (yesCount - 5) * 8)
    }
  }

  const status: "passed" | "review" | "failed" =
    answeredCount === 0
      ? "passed"
      : criticalTriggered.length > 0
        ? "failed"
        : yesCount > 5
          ? "review"
          : "passed"

  return {
    answeredCount,
    yesCount,
    criticalTriggered,
    score,
    status,
  }
}

export function saveAnamnesisLocalHistory(
  candidateId: string,
  answers: Record<string, "yes" | "no">,
  evaluation: AnamnesisEvaluation,
): void {
  const now = new Date()
  const nowIso = now.toISOString()
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  let monthLabel = "Bulan Ini"
  try {
    monthLabel = new Intl.DateTimeFormat("id-ID", {
      month: "long",
      year: "numeric",
    }).format(now)
  } catch {}

  try {
    localStorage.setItem(
      `paska-anamnesis-${candidateId}`,
      JSON.stringify({
        answers,
        score: evaluation.score,
        yesCount: evaluation.yesCount,
        criticalCount: evaluation.criticalTriggered.length,
        status: evaluation.status,
        savedAt: nowIso,
      }),
    )
  } catch {}

  try {
    const rawHist = localStorage.getItem(
      `paska-anamnesis-history-${candidateId}`,
    )
    const parsedHist: ScreeningHistoryEntry[] = rawHist
      ? JSON.parse(rawHist)
      : []
    const thisMonthAttempts = parsedHist.filter(
      (h) => h.candidateId === candidateId && h.monthKey === monthKey,
    ).length
    const entry: ScreeningHistoryEntry = {
      id: `screening-cat-${Date.now()}`,
      candidateId,
      timestamp: nowIso,
      monthKey,
      monthLabel,
      attemptInMonth: Math.min(2, thisMonthAttempts + 1),
      score: evaluation.score,
      yesCount: evaluation.yesCount,
      criticalCount: evaluation.criticalTriggered.length,
      status: evaluation.status,
      answers,
    }
    const updatedHist = [entry, ...parsedHist]
    localStorage.setItem(
      `paska-anamnesis-history-${candidateId}`,
      JSON.stringify(updatedHist),
    )
  } catch {}
}

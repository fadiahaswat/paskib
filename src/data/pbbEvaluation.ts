export type PbbGrade = "A" | "B" | "C" | "D"

export type PbbCategoryKey =
  | "di_tempat"
  | "perubahan_arah_di_tempat"
  | "berpindah_tempat"
  | "berjalan"
  | "perubahan_arah"
  | "komandan"

export interface PbbItem {
  id: string
  number: number
  name: string
}

export interface PbbCategoryDef {
  key: PbbCategoryKey
  title: string
  macroGroup: "statis" | "dinamis" | "komando"
  items: PbbItem[]
}

export const PBB_GRADE_POINTS: Record<PbbGrade, number> = {
  A: 100,
  B: 80,
  C: 60,
  D: 40,
}

export const PBB_GRADE_LABELS: Record<PbbGrade, { label: string; short: string }> = {
  A: { label: "Sangat Baik (100)", short: "Sangat Baik" },
  B: { label: "Baik (80)", short: "Baik" },
  C: { label: "Cukup (60)", short: "Cukup" },
  D: { label: "Kurang (40)", short: "Kurang" },
}

export const PBB_CATEGORIES: PbbCategoryDef[] = [
  {
    key: "di_tempat",
    title: "Gerakan di Tempat",
    macroGroup: "statis",
    items: [
      { id: "gdt_1", number: 1, name: "Sikap Sempurna" },
      { id: "gdt_2", number: 2, name: "Penghormatan" },
      { id: "gdt_3", number: 3, name: "Istirahat di Tempat" },
    ],
  },
  {
    key: "perubahan_arah_di_tempat",
    title: "Gerakan Perubahan Arah (Di Tempat)",
    macroGroup: "statis",
    items: [
      { id: "padt_1", number: 1, name: "Hadap Kanan" },
      { id: "padt_2", number: 2, name: "Hadap Kiri" },
      { id: "padt_3", number: 3, name: "Hadap Serong Kanan" },
      { id: "padt_4", number: 4, name: "Hadap Serong Kiri" },
      { id: "padt_5", number: 5, name: "Balik Kanan" },
    ],
  },
  {
    key: "berpindah_tempat",
    title: "Gerakan Berpindah Tempat",
    macroGroup: "statis",
    items: [
      { id: "gbt_1", number: 1, name: "Langkah ke Depan" },
      { id: "gbt_2", number: 2, name: "Langkah ke Belakang" },
      { id: "gbt_3", number: 3, name: "Langkah ke Kiri" },
      { id: "gbt_4", number: 4, name: "Langkah ke Kanan" },
    ],
  },
  {
    key: "berjalan",
    title: "Gerakan Berjalan",
    macroGroup: "dinamis",
    items: [
      { id: "gbj_1", number: 1, name: "Jalan di Tempat" },
      { id: "gbj_2", number: 2, name: "Langkah Biasa" },
      { id: "gbj_3", number: 3, name: "Langkah Tegap" },
    ],
  },
  {
    key: "perubahan_arah",
    title: "Gerakan Perubahan Arah",
    macroGroup: "dinamis",
    items: [
      { id: "gpa_1", number: 1, name: "Belok Kanan" },
      { id: "gpa_2", number: 2, name: "Belok Kiri" },
      { id: "gpa_3", number: 3, name: "2 Kali Belok Kanan" },
      { id: "gpa_4", number: 4, name: "2 Kali Belok Kiri" },
      { id: "gpa_5", number: 5, name: "Tiap-tiap Banjar 2 Kali Belok Kanan" },
      { id: "gpa_6", number: 6, name: "Tiap-tiap Banjar 2 Kali Belok Kiri" },
    ],
  },
  {
    key: "komandan",
    title: "Komandan",
    macroGroup: "komando",
    items: [
      { id: "kmd_1", number: 1, name: "Volume dan Kekuatan Suara" },
      { id: "kmd_2", number: 2, name: "Sikap" },
      { id: "kmd_3", number: 3, name: "Artikulasi & Intonasi" },
      { id: "kmd_4", number: 4, name: "Ketepatan Aba-aba" },
    ],
  },
]

export const ALL_PBB_ITEMS = PBB_CATEGORIES.flatMap((c) =>
  c.items.map((i) => ({ ...i, categoryKey: c.key, macroGroup: c.macroGroup }))
)

export interface PbbSummary {
  totalItems: number
  gradedCount: number
  distribution: Record<PbbGrade, number>
  finalScore: number | null
  predicate: "A" | "B" | "C" | "D" | "-"
  staticScore: number | null
  dynamicScore: number | null
  commandScore: number | null
}

export function calculatePbbSummary(metrics: Record<string, string>): PbbSummary {
  let totalScore = 0
  let gradedCount = 0
  const distribution: Record<PbbGrade, number> = { A: 0, B: 0, C: 0, D: 0 }

  const groupScores: Record<"statis" | "dinamis" | "komando", { sum: number; count: number }> = {
    statis: { sum: 0, count: 0 },
    dinamis: { sum: 0, count: 0 },
    komando: { sum: 0, count: 0 },
  }

  for (const item of ALL_PBB_ITEMS) {
    const val = metrics[`pbb_${item.id}`] as PbbGrade | undefined
    if (val && PBB_GRADE_POINTS[val] !== undefined) {
      const pts = PBB_GRADE_POINTS[val]
      totalScore += pts
      gradedCount++
      distribution[val]++
      groupScores[item.macroGroup].sum += pts
      groupScores[item.macroGroup].count++
    }
  }

  const finalScore = gradedCount > 0 ? Number((totalScore / gradedCount).toFixed(1)) : null
  const staticScore =
    groupScores.statis.count > 0
      ? Number((groupScores.statis.sum / groupScores.statis.count).toFixed(1))
      : null
  const dynamicScore =
    groupScores.dinamis.count > 0
      ? Number((groupScores.dinamis.sum / groupScores.dinamis.count).toFixed(1))
      : null
  const commandScore =
    groupScores.komando.count > 0
      ? Number((groupScores.komando.sum / groupScores.komando.count).toFixed(1))
      : null

  let predicate: "A" | "B" | "C" | "D" | "-" = "-"
  if (finalScore !== null) {
    if (finalScore >= 85) predicate = "A"
    else if (finalScore >= 70) predicate = "B"
    else if (finalScore >= 55) predicate = "C"
    else predicate = "D"
  }

  return {
    totalItems: ALL_PBB_ITEMS.length,
    gradedCount,
    distribution,
    finalScore,
    predicate,
    staticScore,
    dynamicScore,
    commandScore,
  }
}

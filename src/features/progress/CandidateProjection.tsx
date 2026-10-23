import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Plus,
  Ruler,
  Scale,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react"
import { Badge, Button, Card, Input } from "../../components/ui"
import { useApp } from "../../context/AppContext"
import { bmi, evaluateAnthropometry } from "../../domain/selection"
import { LineChart } from "./LineChart"

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

type FitnessEntry = {
  sessionId: string
  title: string
  date: string
  distance: number | null
  pushup: number | null
  situp: number | null
  backup: number | null
  shuttle: number | null
}

const metrics = [
  {
    key: "distance",
    label: "Lari 12 menit",
    unit: "m",
    target: 3000,
    lowerIsBetter: false,
  },
  {
    key: "pushup",
    label: "Push-up",
    unit: "kali",
    target: 45,
    lowerIsBetter: false,
  },
  {
    key: "situp",
    label: "Sit-up",
    unit: "kali",
    target: 40,
    lowerIsBetter: false,
  },
  {
    key: "backup",
    label: "Back-up",
    unit: "kali",
    target: 50,
    lowerIsBetter: false,
  },
  {
    key: "shuttle",
    label: "Shuttle run",
    unit: "dtk",
    target: 15.4,
    lowerIsBetter: true,
  },
] as const

function readHistory(candidateId: string): FitnessEntry[] {
  try {
    const sessions = JSON.parse(
      localStorage.getItem("paska-clean-sessions") ?? "[]",
    ) as StoredSession[]
    const records = JSON.parse(
      localStorage.getItem("paska-clean-records") ?? "{}",
    ) as Record<string, StoredRecord>

    return sessions
      .filter((session) => {
        if (session.type !== "fitness") return false
        const t = session.title.toLowerCase()
        return !t.includes("interval") && !t.includes("drill")
      })
      .flatMap((session) => {
        const record = records[`${session.id}:${candidateId}`]
        if (!record?.savedAt) return []
        if (
          record.metrics.runMode === "interval" ||
          record.metrics.intervalDist ||
          record.metrics.intervalLap1
        ) return []
        const numberValue = (key: string) => {
          const value = Number(record.metrics[key])
          return Number.isFinite(value) && record.metrics[key] !== ""
            ? value
            : null
        }
        const rawDist = numberValue("distance")
        const dist = rawDist !== null && rawDist >= 2000 ? rawDist : null
        return [
          {
            sessionId: session.id,
            title: session.title,
            date: session.date,
            distance: dist,
            pushup: numberValue("pushup"),
            situp: numberValue("situp"),
            backup: numberValue("backup"),
            shuttle: numberValue("shuttle"),
          },
        ]
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  } catch {
    return []
  }
}


export default function CandidateProjection({
  candidateId,
}: {
  candidateId: string
}) {
  const {
    candidates,
    sessions,
    records,
    currentUser,
    catTryoutAttempts,
    deleteCatTryoutAttempt,
    addAnthropometryLog,
    deleteAnthropometryLog,
  } = useApp()
  const candidate = candidates.find((c) => c.id === candidateId)
  const catHistory = useMemo(
    () => catTryoutAttempts
      .filter((attempt) => attempt.candidateId === candidateId)
      .sort((a, b) => b.finalizedAt.localeCompare(a.finalizedAt)),
    [catTryoutAttempts, candidateId],
  )
  const canDeleteCatHistory = currentUser.role === "admin" || currentUser.role === "coach"

  const history = useMemo<FitnessEntry[]>(() => {
    // 1. Ambil dari sessions resmi non-interval
    const sessionEntries: FitnessEntry[] = sessions
      .filter((session) => {
        if (session.type !== "fitness") return false
        const t = session.title.toLowerCase()
        return !t.includes("interval") && !t.includes("drill")
      })
      .flatMap((session) => {
        const record = records[`${session.id}:${candidateId}`]
        if (!record?.savedAt) return []

        if (
          record.metrics.runMode === "interval" ||
          record.metrics.intervalDist ||
          record.metrics.intervalTargetSets ||
          record.metrics.intervalLap1
        ) {
          return []
        }

        const numberValue = (key: string) => {
          const value = Number(record.metrics[key])
          return Number.isFinite(value) && record.metrics[key] !== ""
            ? value
            : null
        }

        const rawDist = numberValue("distance")
        // Proteksi: tes lari 12 menit resmi tidak mungkin < 2000 m (jika < 2000 berarti porsi interval/drill)
        const dist = rawDist !== null && rawDist >= 2000 ? rawDist : null

        return [
          {
            sessionId: session.id,
            title: session.title,
            date: session.date,
            distance: dist,
            pushup: numberValue("pushup"),
            situp: numberValue("situp"),
            backup: numberValue("backup"),
            shuttle: numberValue("shuttle"),
          },
        ]
      })
      .sort((a, b) => a.date.localeCompare(b.date))

    // 2. Ambil baseline resmi dari profil kandidat
    const physicalMetrics = candidate?.physicalMetrics ?? []
    const parseMetricNum = (str: string | undefined): number | null => {
      if (!str) return null
      if (str.trim().toUpperCase() === "DNF") return 0
      const cleaned = str.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "")
      const val = parseFloat(cleaned)
      return isNaN(val) ? null : val
    }
    const findM = (term: string) =>
      physicalMetrics.find(
        (m) =>
          m.label.toLowerCase().includes(term.toLowerCase()) &&
          m.current &&
          !m.current.includes("Belum") &&
          m.current !== "—",
      )
    const baseRun = parseMetricNum(findM("lari")?.current)
    const basePush = parseMetricNum(findM("push")?.current)
    const baseSit = parseMetricNum(findM("sit")?.current)
    const baseBack = parseMetricNum(findM("back")?.current)
    const baseShuttle = parseMetricNum(findM("shuttle")?.current)

    const baselineEntry: FitnessEntry = {
      sessionId: "baseline",
      title: "Tes Pemetaan Awal (Resmi)",
      date: "2026-10-21",
      distance: baseRun !== null && baseRun >= 2000 ? baseRun : null,
      pushup: basePush,
      situp: baseSit,
      backup: baseBack,
      shuttle: baseShuttle,
    }

    if (sessionEntries.length === 0) {
      return baseRun || basePush || baseSit || baseBack || baseShuttle ? [baselineEntry] : []
    }

    const hasAnyRunInSessions = sessionEntries.some((s) => s.distance !== null)
    if (!hasAnyRunInSessions && baseRun !== null && baseRun >= 2000) {
      return [baselineEntry, ...sessionEntries]
    }

    return sessionEntries
  }, [sessions, records, candidateId, candidate])

  const [showAnthroForm, setShowAnthroForm] = useState(false)
  const [logDate, setLogDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  )
  const [logHeight, setLogHeight] = useState<number>(
    candidate?.heightCm ?? 170,
  )
  const [logWeight, setLogWeight] = useState<number>(candidate?.weightKg ?? 60)
  const [logNote, setLogNote] = useState("")

  useEffect(() => {
    if (candidate) {
      setLogHeight(candidate.heightCm ?? 170)
      setLogWeight(candidate.weightKg ?? 60)
    }
  }, [candidate])

  const anthroLogs = useMemo(() => {
    if (!candidate) return []
    const logs = candidate.anthropometryHistory ?? []
    if (logs.length > 0) return logs
    if (candidate.heightCm && candidate.weightKg) {
      return [
        {
          id: "baseline",
          date: new Date().toISOString().slice(0, 10),
          heightCm: candidate.heightCm,
          weightKg: candidate.weightKg,
          note: "Data profil saat ini",
        },
      ]
    }
    return []
  }, [candidate])

  const anthroEval = useMemo(() => {
    if (!candidate) return null
    return evaluateAnthropometry(
      candidate.gender,
      candidate.heightCm,
      candidate.weightKg,
    )
  }, [candidate])

  const heightDelta = useMemo(() => {
    if (anthroLogs.length < 2) return null
    return Number(
      (anthroLogs.at(-1)!.heightCm - anthroLogs.at(-2)!.heightCm).toFixed(1),
    )
  }, [anthroLogs])

  const weightDelta = useMemo(() => {
    if (anthroLogs.length < 2) return null
    return Number(
      (anthroLogs.at(-1)!.weightKg - anthroLogs.at(-2)!.weightKg).toFixed(1),
    )
  }, [anthroLogs])

  const projections = useMemo(
    () =>
      metrics.map((metric) => {
        const values = history
          .map((entry) => entry[metric.key])
          .filter((value): value is number => value !== null)
        const latest = values.at(-1) ?? null
        const previous = values.at(-2) ?? null
        const changes = values
          .slice(1)
          .map((value, index) => value - values[index])
        const averageChange = changes.length
          ? changes.reduce((total, value) => total + value, 0) / changes.length
          : 0
        const projected =
          latest === null ? null : Math.max(0, latest + averageChange)
        const improvement =
          latest !== null && previous !== null
            ? metric.lowerIsBetter
              ? previous - latest
              : latest - previous
            : null
        const targetMet =
          latest !== null &&
          (metric.lowerIsBetter
            ? latest <= metric.target
            : latest >= metric.target)
        return {
          ...metric,
          values,
          latest,
          projected,
          improvement,
          targetMet,
        }
      }),
    [history],
  )

  const completedMetrics = projections.filter((item) => item.targetMet).length

  function handleSaveAnthro(e: React.FormEvent) {
    e.preventDefault()
    if (!candidate) return
    if (!logHeight || logHeight <= 0 || !logWeight || logWeight <= 0) return
    addAnthropometryLog(candidate.id, {
      date: logDate,
      heightCm: Number(logHeight),
      weightKg: Number(logWeight),
      note: logNote,
    })
    setLogNote("")
    setShowAnthroForm(false)
  }

  return (
    <div className="grid gap-6 min-w-0 max-w-full">
      {candidate && anthroEval ? (
        <Card className="overflow-hidden min-w-0 max-w-full border border-slate-200/90 shadow-2xs rounded-2xl">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div>
              <div className="flex items-center gap-2">
                <Scale className="size-5 text-red-600" />
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Tracking Tinggi Badan, Berat Badan & BMI (Antropometri)
                </h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Pemantauan berkala proporsi tubuh kandidat terhadap standar
                Parade BPIP ({candidate.gender}: {anthroEval.minIdealHeight}–
                {anthroEval.maxIdealHeight} cm).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={anthroLogs.length ? "info" : "neutral"}>
                {anthroLogs.length} pengukuran
              </Badge>
              <Button
                variant="secondary"
                onClick={() => setShowAnthroForm((v) => !v)}
              >
                <Plus className="size-4" /> Catat tinggi & berat
              </Button>
            </div>
          </div>

          {showAnthroForm ? (
            <form
              onSubmit={handleSaveAnthro}
              className="border-b border-slate-100 bg-slate-50/80 p-5 sm:px-6"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-red-600">
                Input pengukuran antropometri baru
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Input
                  label="Tanggal ukur"
                  type="date"
                  required
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                />
                <Input
                  label="Tinggi badan (cm)"
                  type="number"
                  step="0.1"
                  min={120}
                  max={220}
                  required
                  value={logHeight}
                  onChange={(e) => setLogHeight(Number(e.target.value))}
                />
                <Input
                  label="Berat badan (kg)"
                  type="number"
                  step="0.1"
                  min={30}
                  max={150}
                  required
                  value={logWeight}
                  onChange={(e) => setLogWeight(Number(e.target.value))}
                />
                <Input
                  label="Catatan (opsional)"
                  placeholder="Mis. Evaluasi pekan ke-2"
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setShowAnthroForm(false)}
                >
                  Batal
                </Button>
                <Button type="submit">Simpan pengukuran</Button>
              </div>
            </form>
          ) : null}

          <div className="grid gap-3 p-3.5 sm:p-5 md:grid-cols-3">
            {/* Tinggi Badan */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3 sm:p-3.5 shadow-2xs">
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Ruler className="size-3.5 text-blue-600 shrink-0" /> Tinggi Badan
                  </p>
                  <Badge tone={anthroEval.heightStatus.tone} className="text-[10px] !py-0.5 !px-2 font-semibold shrink-0">
                    {anthroEval.heightStatus.label}
                  </Badge>
                </div>

                <div className="mt-1.5 flex items-baseline justify-between gap-1">
                  <p className="font-display text-xl sm:text-2xl font-black text-slate-950">
                    {candidate.heightCm ?? "—"}{" "}
                    <span className="font-sans text-xs font-semibold text-slate-400">cm</span>
                  </p>
                  <div className="text-right text-[11px] text-slate-500">
                    Tgt: <strong className="text-slate-800">{anthroEval.minIdealHeight}–{anthroEval.maxIdealHeight} cm</strong>
                    <span className="ml-1 font-bold text-blue-700">
                      ({heightDelta !== null ? `${heightDelta >= 0 ? "+" : ""}${heightDelta} cm` : "Baseline"})
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-2 pt-1.5 border-t border-slate-100">
                <LineChart
                  values={anthroLogs.map((l) => l.heightCm)}
                  target={candidate.gender === "Putra" ? 175 : 170}
                  unit="cm"
                  color="blue"
                  height={14}
                />
              </div>
            </div>

            {/* Berat Badan */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3 sm:p-3.5 shadow-2xs">
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Scale className="size-3.5 text-emerald-600 shrink-0" /> Berat Badan
                  </p>
                  <Badge tone={anthroEval.weightStatus.tone} className="text-[10px] !py-0.5 !px-2 font-semibold shrink-0">
                    {anthroEval.weightStatus.label}
                  </Badge>
                </div>

                <div className="mt-1.5 flex items-baseline justify-between gap-1">
                  <p className="font-display text-xl sm:text-2xl font-black text-slate-950">
                    {candidate.weightKg ?? "—"}{" "}
                    <span className="font-sans text-xs font-semibold text-slate-400">kg</span>
                  </p>
                  <div className="text-right text-[11px] text-slate-500">
                    Ideal: <strong className="text-slate-800">{anthroEval.minIdealWeight !== null ? `${anthroEval.minIdealWeight}–${anthroEval.maxIdealWeight} kg` : "—"}</strong>
                    <span className="ml-1 font-bold text-emerald-700">
                      ({weightDelta !== null ? `${weightDelta >= 0 ? "+" : ""}${weightDelta} kg` : "Baseline"})
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-2 pt-1.5 border-t border-slate-100">
                <LineChart
                  values={anthroLogs.map((l) => l.weightKg)}
                  target={anthroEval.idealWeight ?? 62}
                  unit="kg"
                  color="emerald"
                  height={14}
                />
              </div>
            </div>

            {/* Indeks Massa Tubuh (BMI) */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3 sm:p-3.5 shadow-2xs">
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Activity className="size-3.5 text-purple-600 shrink-0" /> BMI / IMT
                  </p>
                  <Badge
                    tone={
                      anthroEval.bmi?.category === "Normal"
                        ? "success"
                        : anthroEval.bmi
                          ? "warning"
                          : "neutral"
                    }
                    className="text-[10px] !py-0.5 !px-2 font-semibold shrink-0"
                  >
                    {anthroEval.bmi?.category ?? "Belum diukur"}
                  </Badge>
                </div>

                <div className="mt-1.5 flex items-baseline justify-between gap-1">
                  <p className="font-display text-xl sm:text-2xl font-black text-slate-950">
                    {anthroEval.bmi?.value ?? "—"}{" "}
                    <span className="font-sans text-xs font-semibold text-slate-400">kg/m²</span>
                  </p>
                  <div className="text-right text-[11px] text-slate-500">
                    Tgt: <strong className="text-slate-800">18,5–24,9</strong>
                    <span className="ml-1 text-slate-400">
                      (Ideal: {anthroEval.idealWeight ?? "—"} kg)
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-2 pt-1.5 border-t border-slate-100">
                <LineChart
                  values={anthroLogs
                    .map((l) => bmi(l.weightKg, l.heightCm)?.value ?? 0)
                    .filter((v) => v > 0)}
                  target={22}
                  unit=""
                  color="purple"
                  height={14}
                />
              </div>
            </div>
          </div>

          {anthroLogs.length > 0 ? (
            <div className="overflow-x-auto w-full min-w-0 max-w-full border-t border-slate-100">
              <table className="w-full min-w-[44rem] text-left text-sm">
                <thead className="bg-slate-50 text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3">Tanggal Ukur</th>
                    <th className="px-4 py-3">Tinggi Badan</th>
                    <th className="px-4 py-3">Berat Badan</th>
                    <th className="px-4 py-3">BMI / IMT</th>
                    <th className="px-4 py-3">Catatan</th>
                    <th className="px-6 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...anthroLogs].reverse().map((entry) => {
                    const entryBmi = bmi(entry.weightKg, entry.heightCm)
                    return (
                      <tr key={entry.id}>
                        <td className="px-6 py-3.5 font-semibold text-slate-800">
                          {entry.date}
                        </td>
                        <td className="px-4 py-3.5 font-bold tabular-nums text-slate-900">
                          {entry.heightCm} cm
                        </td>
                        <td className="px-4 py-3.5 font-bold tabular-nums text-slate-900">
                          {entry.weightKg} kg
                        </td>
                        <td className="px-4 py-3.5">
                          {entryBmi ? (
                            <Badge
                              tone={
                                entryBmi.category === "Normal"
                                  ? "success"
                                  : "warning"
                              }
                            >
                              {entryBmi.value} ({entryBmi.category})
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500">
                          {entry.note ?? "—"}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          {entry.id !== "baseline" ? (
                            <button
                              type="button"
                              onClick={() =>
                                deleteAnthropometryLog(candidate.id, entry.id)
                              }
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              title="Hapus pengukuran ini"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card className="overflow-hidden min-w-0 max-w-full border border-slate-200/90 shadow-2xs rounded-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="size-5 text-red-600" />
              <h2 className="font-display text-lg font-bold text-slate-900">
                Riwayat CAT PIP & TIU
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Semua percobaan CAT kandidat, diurutkan dari yang terbaru.
            </p>
          </div>
          <Badge tone={catHistory.length ? "info" : "neutral"}>
            {catHistory.length} percobaan
          </Badge>
        </div>

        {catHistory.length ? (
          <div className="overflow-x-auto w-full min-w-0 max-w-full">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="bg-slate-50/70 text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">Waktu ujian</th>
                  <th className="px-4 py-3">Paket</th>
                  <th className="px-4 py-3">PIP</th>
                  <th className="px-4 py-3">TIU</th>
                  <th className="px-4 py-3">Gabungan</th>
                  <th className="px-4 py-3">Hasil</th>
                  {canDeleteCatHistory ? <th className="px-6 py-3 text-right">Aksi</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {catHistory.map((attempt) => {
                  const pipPassed = attempt.pipStatus === "passed"
                  const tiuPassed = attempt.tiuStatus === "passed"
                  const finalized = new Date(attempt.finalizedAt.replace(" ", "T"))
                  const displayTime = Number.isNaN(finalized.getTime())
                    ? attempt.finalizedAt
                    : finalized.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
                  return (
                    <tr key={attempt.id}>
                      <td className="px-6 py-3.5 font-medium text-slate-700">
                        <span className="block">{displayTime}</span>
                        <span className="text-xs text-slate-400">Percobaan {attempt.attemptNumber}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{attempt.packageName}</td>
                      <td className="px-4 py-3.5 font-bold tabular-nums text-slate-900">
                        {attempt.pipScore} <span className="text-xs font-normal text-slate-400">({pipPassed ? "Lulus" : "Belum lulus"})</span>
                      </td>
                      <td className="px-4 py-3.5 font-bold tabular-nums text-slate-900">
                        {attempt.tiuScoreScaled} <span className="text-xs font-normal text-slate-400">({tiuPassed ? "Lulus" : "Belum lulus"})</span>
                      </td>
                      <td className="px-4 py-3.5 font-bold tabular-nums text-slate-900">{attempt.combinedScore}</td>
                      <td className="px-4 py-3.5">
                        <Badge tone={pipPassed && tiuPassed ? "success" : "warning"}>
                          {pipPassed && tiuPassed ? "Lulus keduanya" : "Perlu tindak lanjut"}
                        </Badge>
                      </td>
                      {canDeleteCatHistory ? (
                        <td className="px-6 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const confirmed = window.confirm(
                                `Hapus percobaan CAT ${attempt.attemptNumber} tanggal ${displayTime}? Nilai kandidat akan diperbarui dari percobaan tersisa.`,
                              )
                              if (confirmed) deleteCatTryoutAttempt(attempt.id)
                            }}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            title="Hapus percobaan CAT ini"
                            aria-label={`Hapus percobaan CAT ${attempt.attemptNumber}`}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            Belum ada riwayat ujian CAT PIP/TIU untuk kandidat ini.
          </div>
        )}
      </Card>

      <Card className="overflow-hidden border border-slate-200/90 shadow-2xs rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 bg-white px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 border border-red-100">
              <TrendingUp className="size-4" />
            </span>
            <div>
              <h2 className="font-display text-sm sm:text-base font-bold text-slate-900 leading-snug">
                Tren & Proyeksi Samapta
              </h2>
              <p className="text-[11px] text-slate-500">
                Dihitung otomatis dari hasil sesi latihan fisik tersimpan
              </p>
            </div>
          </div>
          <Badge tone={history.length ? "info" : "neutral"} className="text-[11px] font-semibold px-2 py-0.5 shrink-0 self-start sm:self-auto">
            {history.length} sesi tercatat
          </Badge>
        </div>

        {!history.length ? (
          <div className="px-6 py-10 text-center">
            <span className="mx-auto grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-500">
              <Activity className="size-5" />
            </span>
            <p className="mt-3 text-sm font-bold text-slate-900">
              Belum ada hasil Samapta tersimpan
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
              Buat atau buka sesi Latihan Samapta, input lima hasil kandidat,
              lalu tekan &ldquo;Simpan hasil kandidat&rdquo;. Tren akan muncul
              otomatis di sini.
            </p>
          </div>
        ) : (
          <>
            <div className="p-2.5 sm:p-4 bg-slate-50/50">
              <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {projections.map((metric, idx) => (
                  <div
                    key={metric.key}
                    className={`flex flex-col justify-between p-2.5 sm:p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs ${
                      idx === 4 ? "col-span-2 sm:col-span-1" : ""
                    }`}
                  >
                    <div>
                      {/* Baris 1: Label + Trend Icon */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-800 leading-tight">
                          {metric.label}
                        </span>
                        {metric.targetMet ? (
                          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                        ) : metric.improvement !== null && metric.improvement > 0 ? (
                          <ArrowUpRight className="size-4 text-blue-600 shrink-0" />
                        ) : (
                          <ArrowDownRight className="size-4 text-amber-600 shrink-0" />
                        )}
                      </div>

                      {/* Baris 2: Nilai Terkini */}
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="font-display text-base sm:text-lg font-black text-slate-950">
                          {metric.latest ?? "—"}
                        </span>
                        <span className="font-sans text-[10px] font-semibold text-slate-400">
                          {metric.unit}
                        </span>
                      </div>
                    </div>

                    {/* Baris 3: Sparkline Compact */}
                    <div className="mt-1.5">
                      <LineChart
                        values={metric.values}
                        target={metric.target}
                        unit={metric.unit}
                        color={metric.targetMet ? "emerald" : "red"}
                        lowerIsBetter={metric.lowerIsBetter}
                        height={14}
                      />
                    </div>

                    {/* Baris 4: Target & Proyeksi Berikut */}
                    <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] gap-1">
                      <span className="text-slate-500">
                        Tgt: <strong className="text-slate-700">{metric.target} {metric.unit}</strong>
                      </span>
                      <span className="text-blue-700 font-bold shrink-0 text-right">
                        Proy: {metric.projected?.toFixed(metric.key === "shuttle" ? 1 : 0) ?? "—"} {metric.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 border-t border-slate-100 px-4 py-3 sm:px-5 sm:py-3.5 bg-white lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <Target className="size-3.5 text-red-600" />
                  <p className="text-xs sm:text-sm font-bold text-slate-900">
                    Kesiapan target: {completedMetrics} dari 5 komponen
                  </p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-red-500 transition-all"
                    style={{ width: `${(completedMetrics / 5) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <CalendarDays className="size-3.5" />
                Terakhir:{" "}
                {new Date(
                  `${history.at(-1)?.date}T00:00:00`,
                ).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>

            <div className="overflow-x-auto w-full min-w-0 max-w-full border-t border-slate-100">
              <table className="w-full min-w-[48rem] text-left text-sm">
                <thead className="bg-slate-50 text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3">Tanggal & sesi</th>
                    {metrics.map((metric) => (
                      <th className="px-4 py-3" key={metric.key}>
                        {metric.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...history].reverse().map((entry) => (
                    <tr key={entry.sessionId}>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{entry.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {entry.date}
                        </p>
                      </td>
                      {metrics.map((metric) => (
                        <td
                          className="px-4 py-4 font-semibold tabular-nums text-slate-700"
                          key={metric.key}
                        >
                          {entry[metric.key] ?? "—"}{" "}
                          {entry[metric.key] !== null ? metric.unit : ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

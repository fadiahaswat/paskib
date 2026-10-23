import { useMemo, useState } from "react"
import {
  Activity,
  Award,
  Calendar,
  ChevronDown,
  ChevronUp,
  Flame,
  Gauge,
  Plus,
  Sparkles,
  Target,
  Timer,
  Trash2,
  TrendingUp,
  Zap,
} from "lucide-react"
import { Badge, Button, Card, Input } from "../../components/ui"
import { useApp } from "../../context/AppContext"
import {
  analyzeIntervalPerformance,
  analyzePaceConsistency,
  createIntervalLogEntry,
  extractCandidateIntervalLogs,
  project12MinuteRun,
} from "../../domain/intervalAnalytics"
import type { Candidate, IntervalTrainingLog } from "../../domain/selection"

interface CandidateIntervalViewProps {
  candidate: Candidate
}

export function CandidateIntervalView({ candidate }: CandidateIntervalViewProps) {
  const { addIntervalLog, deleteIntervalLog, sessions, records } = useApp()
  const [showAddForm, setShowAddForm] = useState(false)

  // Form State
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [sessionTitle, setSessionTitle] = useState("Latihan Kardio & Interval 400m")
  const [targetSets, setTargetSets] = useState("4")
  const [distPerSet, setDistPerSet] = useState("400")
  const [targetPace, setTargetPace] = useState("90.0")
  const [lapSplits, setLapSplits] = useState<string[]>(["92", "91", "90", "94"])
  const [coachNote, setCoachNote] = useState("")

  // Otomatis mengekstrak seluruh data interval dari sesi sebelumnya (termasuk kemarin) + input manual
  const history = useMemo(
    () =>
      extractCandidateIntervalLogs(
        candidate.id,
        sessions,
        records,
        candidate.intervalHistory ?? [],
      ),
    [candidate.id, sessions, records, candidate.intervalHistory],
  )
  const latestLog = history[0] as IntervalTrainingLog | undefined

  // Statistik agregat
  const totalSessions = history.length
  const bestAvgSplit =
    history.length > 0
      ? Math.min(...history.map((h) => h.avgSplitSec).filter((v) => v > 0))
      : null
  const bestProjectedDist =
    history.length > 0
      ? Math.max(...history.map((h) => h.projected12MinDistanceM).filter((v) => v > 0))
      : null

  // Handler update target sets form
  const handleTargetSetsChange = (newSetsCount: number) => {
    const count = Math.min(12, Math.max(1, newSetsCount))
    setTargetSets(String(count))
    setLapSplits((prev) => {
      const next = [...prev]
      while (next.length < count) {
        next.push(targetPace || "90")
      }
      return next.slice(0, count)
    })
  }

  // Quick simulation / live analysis preview for the form
  const parsedLaps = lapSplits.map((l) => parseFloat(l) || 0).filter((v) => v > 0)
  const currentCompletedSets = parsedLaps.length
  const currentAvgSplit =
    parsedLaps.length > 0 ? parsedLaps.reduce((a, b) => a + b, 0) / parsedLaps.length : 0
  const livePreview = analyzeIntervalPerformance({
    targetSets: parseInt(targetSets, 10) || 4,
    completedSets: currentCompletedSets || parseInt(targetSets, 10) || 4,
    targetPaceSec: parseFloat(targetPace) || 90,
    avgSplitSec: currentAvgSplit > 0 ? currentAvgSplit : parseFloat(targetPace) || 90,
    lapSplits: parsedLaps,
    distPerSetM: parseFloat(distPerSet) || 400,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const tSets = parseInt(targetSets, 10) || 4
    const tPace = parseFloat(targetPace) || 90
    const dPerSet = parseFloat(distPerSet) || 400

    const validLaps = lapSplits.map((l) => parseFloat(l) || 0).filter((v) => v > 0)
    const compSets = validLaps.length > 0 ? validLaps.length : tSets
    const avgSplit = validLaps.length > 0 ? validLaps.reduce((a, b) => a + b, 0) / validLaps.length : tPace

    const newLog = createIntervalLogEntry({
      sessionTitle: sessionTitle.trim() || "Latihan Lari Interval",
      date,
      targetSets: tSets,
      completedSets: compSets,
      targetPaceSec: tPace,
      avgSplitSec: avgSplit,
      lapSplits: validLaps,
      distPerSetM: dPerSet,
      note: coachNote.trim() || undefined,
    })

    const { id, ...entryWithoutId } = newLog
    addIntervalLog(candidate.id, entryWithoutId)
    setShowAddForm(false)
    setCoachNote("")
  }

  return (
    <div className="flex flex-col gap-4 w-full min-w-0 max-w-full">
      {/* Top Banner & Insight Compact */}
      <Card className="overflow-hidden border border-slate-200/90 bg-white shadow-2xs rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-slate-100 bg-white px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 border border-red-100">
              <Timer className="size-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-sm sm:text-base font-bold text-slate-900 leading-snug">
                  Pelacakan &amp; Analisis Latihan Interval
                </h3>
                <Badge tone="info" className="text-[10px] !py-0 !px-1.5 font-semibold">
                  Khusus Drill Fisik
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500">
                Pencatatan drill kardio &amp; proyeksi daya tahan lari 12 menit santri
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant={showAddForm ? "secondary" : "primary"}
            onClick={() => setShowAddForm(!showAddForm)}
            className="shrink-0 gap-1 text-xs font-bold self-start sm:self-auto"
          >
            {showAddForm ? (
              <>
                <ChevronUp className="size-3.5" /> Tutup Form
              </>
            ) : (
              <>
                <Plus className="size-3.5" /> Catat Latihan Interval
              </>
            )}
          </Button>
        </div>

        {/* 4 Kartu KPI Ringkasan Compact */}
        <div className="p-2.5 sm:p-4 bg-slate-50/50">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
            <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-2.5 sm:p-3 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Drill</span>
                <Activity className="size-3.5 text-blue-500" />
              </div>
              <p className="mt-1 font-display text-lg sm:text-xl font-black text-slate-900">
                {totalSessions}{" "}
                <span className="font-sans text-xs font-semibold text-slate-400">Sesi</span>
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">Tercatat dalam rekam jejak</p>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-2.5 sm:p-3 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Split Terbaik</span>
                <Zap className="size-3.5 text-amber-500" />
              </div>
              <p className="mt-1 font-display text-lg sm:text-xl font-black text-slate-900">
                {bestAvgSplit ? `${bestAvgSplit.toFixed(1)}s` : "—"}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                {bestAvgSplit ? `Pace ${(bestAvgSplit / 400 * 1000 / 60).toFixed(1)} m/km` : "Belum ada sesi"}
              </p>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-2.5 sm:p-3 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Proyeksi 12 Mnt</span>
                <TrendingUp className="size-3.5 text-emerald-500" />
              </div>
              <p className="mt-1 font-display text-lg sm:text-xl font-black text-emerald-700">
                {latestLog ? `${latestLog.projected12MinDistanceM.toLocaleString("id-ID")} m` : "—"}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                {latestLog ? `Skor BPIP: ${latestLog.projected12MinScore}/100` : "Menunggu data"}
              </p>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-2.5 sm:p-3 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Konsistensi</span>
                <Target className="size-3.5 text-rose-500" />
              </div>
              <p className="mt-1 font-display text-lg sm:text-xl font-black text-slate-900">
                {latestLog?.paceConsistency ?? "—"}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                {latestLog ? `Sesi ${latestLog.date}` : "Lakukan sesi drill"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Form Input Sesi Latihan Baru (Bisa dibuka/tutup) */}
      {showAddForm ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border-2 border-red-200 bg-white p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-display text-sm font-bold text-slate-900">
                Input Hasil Latihan Interval Baru
              </h4>
              <p className="text-xs text-slate-500">
                Masukkan target set, waktu split per putaran, dan evaluasi kepelatihan.
              </p>
            </div>
            <span className="rounded-md bg-red-100 px-2 py-0.5 text-[0.65rem] font-bold text-red-700">
              Form Entri Cepat
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <div className="grid gap-1">
              <label className="text-xs font-semibold text-slate-600">Tanggal Latihan</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                required
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-semibold text-slate-600">Judul / Menu Latihan</label>
              <input
                type="text"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="Misal: Kardio Interval 6x400m"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                required
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-semibold text-slate-600">Panjang Lintasan (m)</label>
              <input
                type="number"
                value={distPerSet}
                onChange={(e) => setDistPerSet(e.target.value)}
                placeholder="400"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                required
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-semibold text-slate-600">Target Pace (Detik/Lap)</label>
              <input
                type="number"
                step="0.1"
                value={targetPace}
                onChange={(e) => setTargetPace(e.target.value)}
                placeholder="90.0"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                required
              />
            </div>
          </div>

          {/* Stepper Jumlah Set */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <span className="text-xs font-bold text-slate-800">
                  Target Repetisi / Set: {targetSets} Set
                </span>
                <span className="ml-2 text-xs text-slate-500">
                  (Total {parseInt(targetSets, 10) * (parseFloat(distPerSet) || 400)} meter)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {[4, 6, 8, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleTargetSetsChange(num)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      parseInt(targetSets, 10) === num
                        ? "bg-red-600 text-white shadow-2xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {num} Set
                  </button>
                ))}
              </div>
            </div>

            {/* Split Tiap Lap */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {Array.from({ length: parseInt(targetSets, 10) || 4 }, (_, i) => i).map((idx) => (
                <div key={idx} className="relative">
                  <label className="mb-1 block text-[0.65rem] font-bold text-slate-500">
                    Lap / Set #{idx + 1}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="90.0"
                      value={lapSplits[idx] || ""}
                      onChange={(e) => {
                        const val = e.target.value
                        setLapSplits((prev) => {
                          const next = [...prev]
                          next[idx] = val
                          return next
                        })
                      }}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2 pr-7 text-center text-xs font-bold text-slate-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[0.65rem] font-bold text-slate-400">
                      dtk
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Preview Hasil Analisis */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
              <Sparkles className="size-4 text-emerald-600" />
              <span>Analisis &amp; Proyeksi Seketika (Live Preview)</span>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3 text-xs">
              <div>
                <span className="text-slate-500">Rata-rata Split:</span>{" "}
                <strong className="text-slate-900">{livePreview.avgSplitSec.toFixed(1)} dtk/lap</strong>{" "}
                <span className="text-slate-400">({livePreview.projectedPaceKm})</span>
              </div>
              <div>
                <span className="text-slate-500">Proyeksi 12 Menit:</span>{" "}
                <strong className="text-emerald-700">
                  {livePreview.projected12MinDistanceM.toLocaleString("id-ID")} m
                </strong>{" "}
                <span className="text-slate-500">(Skor {livePreview.projected12MinScore})</span>
              </div>
              <div>
                <span className="text-slate-500">Konsistensi:</span>{" "}
                <strong className="text-slate-900">{livePreview.paceConsistency}</strong>
              </div>
            </div>
          </div>

          <div className="grid gap-1">
            <label className="text-xs font-semibold text-slate-600">Catatan Khusus Pelatih (Opsional)</label>
            <input
              type="text"
              value={coachNote}
              onChange={(e) => setCoachNote(e.target.value)}
              placeholder="Misal: Santri terlihat stabil di lap 1-3, pernapasan perlu diatur di lap 4"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary">
              Simpan Sesi Latihan
            </Button>
          </div>
        </form>
      ) : null}

      {/* Card Utama: Proyeksi Ke Depan & Analisis Daya Tahan (Forward Analysis) */}
      {latestLog ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs w-full min-w-0 max-w-full overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 min-w-0">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-display text-base font-bold text-slate-900">
                  Analisis Ke Depan &amp; Proyeksi Seleksi Resmi
                </h4>
                <Badge tone="success">Berdasarkan Sesi Terakhir ({latestLog.date})</Badge>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Model prediksi adaptasi fisik santri menuju tes Lari 12 Menit standar BPIP.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:gap-4 lg:grid-cols-3 min-w-0">
            {/* Box 1: Prediksi Lari 12 Menit */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Prediksi Lari 12 Menit</span>
                <Gauge className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="font-display text-2xl sm:text-3xl font-black text-slate-900">
                  {latestLog.projected12MinDistanceM.toLocaleString("id-ID")}{" "}
                  <span className="text-sm font-semibold text-slate-400">meter</span>
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-emerald-700">
                    Skor BPIP: {latestLog.projected12MinScore}/100
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-600">
                    {latestLog.projected12MinScore >= 90
                      ? "Standar Sangat Unggul"
                      : latestLog.projected12MinScore >= 75
                        ? "Batas Kelulusan Aman"
                        : "Perlu Peningkatan"}
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round((latestLog.projected12MinDistanceM / 3000) * 100))}%`,
                  }}
                />
              </div>
              <p className="text-[0.68rem] text-slate-500">
                Target sempurna 3.000m (7,5 putaran). Kapasitas aerobik saat ini mencapai{" "}
                {Math.round((latestLog.projected12MinDistanceM / 3000) * 100)}% dari standar 100.
              </p>
            </div>

            {/* Box 2: Target Pacing Lap Realistis */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Rekomendasi Pacing Seleksi</span>
                <Flame className="size-4 text-amber-500" />
              </div>
              <div>
                <p className="font-display text-2xl sm:text-3xl font-black text-slate-900">
                  {latestLog.avgSplitSec}s{" "}
                  <span className="text-sm font-semibold text-slate-400">/ 400m</span>
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-700">
                  Pace Rata-rata: {(latestLog.avgSplitSec / 400 * 1000 / 60).toFixed(2)} menit/km
                </p>
              </div>
              <div className="rounded-xl bg-amber-50/80 border border-amber-200/80 p-2.5 text-[0.68rem] text-amber-900 leading-relaxed">
                <strong>Instruksi Lap:</strong> Jaga split di kisaran{" "}
                <strong>
                  {Math.floor(latestLog.avgSplitSec - 1)}s – {Math.ceil(latestLog.avgSplitSec + 2)}s
                </strong>{" "}
                per putaran. Hindari lonjakan kecepatan di awal agar asam laktat tidak menumpuk.
              </div>
            </div>

            {/* Box 3: Konsistensi & Fatigue */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Konsistensi &amp; Ketahanan</span>
                <Target className="size-4 text-blue-600" />
              </div>
              <div>
                <Badge
                  tone={
                    latestLog.paceConsistency.includes("Konsisten") ||
                    latestLog.paceConsistency.includes("Kuat")
                      ? "success"
                      : latestLog.paceConsistency.includes("Stabil")
                        ? "info"
                        : "warning"
                  }
                >
                  {latestLog.paceConsistency}
                </Badge>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {latestLog.lapSplitsSec.length >= 2
                    ? `Perbandingan paruh awal vs akhir menunjukkan ritme ${latestLog.paceConsistency.toLowerCase()}.`
                    : "Data split set tersimpan."}
                </p>
              </div>
              <div className="border-t border-slate-200 pt-2 text-[0.68rem] text-slate-500">
                Penyelesaian: <strong>{latestLog.completedSets}/{latestLog.targetSets} Set</strong> ({latestLog.totalDistance}m)
              </div>
            </div>
          </div>

          {/* AI Coach Recommendation Box */}
          <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 min-w-0">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-xs">
                <Award className="size-4" />
              </div>
              <div className="space-y-1">
                <h5 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                  Rekomendasi Kepelatihan Terpadu
                </h5>
                <p className="text-xs leading-relaxed text-blue-950 font-medium">
                  {latestLog.coachRecommendation}
                </p>
                {latestLog.note ? (
                  <p className="text-xs text-blue-800 italic mt-1">
                    Catatan pelatih lapangan: &ldquo;{latestLog.note}&rdquo;
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
          <Timer className="mx-auto size-8 text-slate-400" />
          <h4 className="mt-2 font-display text-sm font-bold text-slate-800">
            Belum Ada Data Latihan Interval
          </h4>
          <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
            Sesi latihan interval yang dicatat melalui tombol di atas atau melalui modul Simulasi
            akan terakumulasi di sini secara terpisah dari ujian resmi Lari 12 Menit.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowAddForm(true)}
            className="mt-4"
          >
            <Plus className="size-4" /> Tambah Sesi Latihan Sekarang
          </Button>
        </div>
      )}

      {/* Riwayat Sesi Interval & Breakdown Split Tiap Lap */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs w-full min-w-0 max-w-full">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4 min-w-0">
          <div className="min-w-0 flex-1">
            <h4 className="font-display text-sm sm:text-base font-bold text-slate-900">
              Riwayat Sesi Latihan Interval Santri
            </h4>
            <p className="mt-0.5 text-xs text-slate-500">
              Rincian split stopwatch per set dan perbandingan target pace.
            </p>
          </div>
          <Badge tone="neutral">{history.length} Sesi Disimpan</Badge>
        </div>

        {history.length > 0 ? (
          <>
            {/* Tampilan Desktop: Tabel Lengkap */}
            <div className="hidden sm:block overflow-x-auto w-full min-w-0 max-w-full">
              <table className="w-full min-w-[50rem] text-left text-xs">
                <thead className="bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Tanggal &amp; Sesi</th>
                    <th className="px-3 py-3">Set / Total</th>
                    <th className="px-3 py-3">Rata-rata Split</th>
                    <th className="px-4 py-3">Split per Lap (Detik)</th>
                    <th className="px-3 py-3">Konsistensi</th>
                    <th className="px-3 py-3">Proyeksi 12 Mnt</th>
                    <th className="px-3 py-3">Skor</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((log) => {
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-slate-900">{log.sessionTitle}</p>
                          <p className="text-[0.68rem] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="size-3" /> {log.date}
                          </p>
                          {log.note ? (
                            <p className="text-[0.68rem] text-slate-600 italic mt-0.5 max-w-xs">
                              &ldquo;{log.note}&rdquo;
                            </p>
                          ) : null}
                        </td>

                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <span className="font-bold text-slate-800">
                            {log.completedSets} / {log.targetSets} Set
                          </span>
                          <p className="text-[0.65rem] text-slate-500">
                            {log.totalDistance}m ({log.distancePerSet}m/set)
                          </p>
                        </td>

                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <strong className="font-display text-sm font-black text-slate-900">
                            {log.avgSplitSec}s
                          </strong>
                          <p className="text-[0.65rem] text-slate-500">
                            Target: {log.targetPaceSec}s
                          </p>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                            {log.lapSplitsSec.length > 0 ? (
                              log.lapSplitsSec.map((split, i) => {
                                const isFaster = split <= log.targetPaceSec
                                const isNear = split <= log.targetPaceSec * 1.05
                                return (
                                  <span
                                    key={i}
                                    className={`rounded-md px-1.5 py-0.5 text-[0.65rem] font-bold ${
                                      isFaster
                                        ? "bg-emerald-100 text-emerald-800"
                                        : isNear
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-rose-100 text-rose-800"
                                    }`}
                                    title={`Lap ${i + 1}: ${split}s`}
                                  >
                                    L{i + 1}: {split}s
                                  </span>
                                )
                              })
                            ) : (
                              <span className="text-slate-400 italic">Tidak dicatat per lap</span>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-700">
                            {log.paceConsistency}
                          </span>
                        </td>

                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <strong className="font-bold text-emerald-700">
                            {log.projected12MinDistanceM.toLocaleString("id-ID")} m
                          </strong>
                          <p className="text-[0.65rem] text-slate-500">
                            Skor: {log.projected12MinScore}/100
                          </p>
                        </td>

                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <span className="rounded-lg bg-red-50 border border-red-200 px-2 py-1 font-display font-extrabold text-red-700">
                            {log.score}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("Hapus catatan sesi latihan interval ini?")) {
                                deleteIntervalLog(candidate.id, log.id)
                              }
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                            title="Hapus riwayat sesi ini"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Tampilan Mobile: Kartu Vertikal Ringkas & Responsif */}
            <div className="sm:hidden divide-y divide-slate-100 w-full min-w-0">
              {history.map((log) => (
                <div key={log.id} className="p-3.5 space-y-2.5 w-full min-w-0">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-slate-900 leading-snug break-words">
                        {log.sessionTitle}
                      </p>
                      <p className="text-[0.68rem] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="size-3 shrink-0" /> {log.date}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="rounded-lg bg-red-50 border border-red-200 px-2 py-0.5 font-display font-extrabold text-xs text-red-700">
                        {log.score}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Hapus catatan sesi latihan interval ini?")) {
                            deleteIntervalLog(candidate.id, log.id)
                          }
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Hapus riwayat sesi ini"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Grid 2 Kolom Ringkas */}
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50/80 p-2.5 border border-slate-100 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Set / Total</p>
                      <p className="font-bold text-slate-800">
                        {log.completedSets}/{log.targetSets} Set
                      </p>
                      <p className="text-[10px] text-slate-500">{log.totalDistance}m ({log.distancePerSet}m/set)</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Rata-rata Split</p>
                      <p className="font-display font-bold text-slate-900">{log.avgSplitSec}s</p>
                      <p className="text-[10px] text-slate-500">Tgt: {log.targetPaceSec}s · {log.paceConsistency}</p>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-500">Proyeksi 12 Menit:</span>
                      <strong className="text-xs font-bold text-emerald-700">
                        {log.projected12MinDistanceM.toLocaleString("id-ID")} m ({log.projected12MinScore}/100)
                      </strong>
                    </div>
                  </div>

                  {/* Split per lap badges */}
                  {log.lapSplitsSec.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      {log.lapSplitsSec.map((split, i) => {
                        const isFaster = split <= log.targetPaceSec
                        const isNear = split <= log.targetPaceSec * 1.05
                        return (
                          <span
                            key={i}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              isFaster
                                ? "bg-emerald-100 text-emerald-800"
                                : isNear
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            L{i + 1}: {split}s
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {log.note && (
                    <p className="text-[11px] text-slate-600 italic leading-snug">
                      &ldquo;{log.note}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-xs text-slate-500">
            Belum ada riwayat sesi latihan interval yang tersimpan untuk santri ini.
          </div>
        )}
      </div>
    </div>
  )
}

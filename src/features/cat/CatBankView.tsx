import { useEffect, useMemo, useState } from "react"
import {
  BookOpenCheck,
  CheckCircle2,
  Clock,
  Edit3,
  Flag,
  Play,
  Plus,
  RotateCcw,
  Save,
  Search,
  Target,
  Trash2,
  X,
} from "lucide-react"
import { Badge, Button, Card, Input } from "../../components/ui"
import { useApp } from "../../context/AppContext"
import type { CatQuestion } from "../../domain/selection"

const pipCategories = [
  "Sejarah & Filosofi Pancasila",
  "Nilai & Pengamalan Sila",
  "UUD NRI 1945 & Konstitusi",
  "NKRI, Wasantara & Moderasi",
]

const tiuCategories = [
  "Sinonim & Antonim",
  "Analogi Kata",
  "Pemahaman Bacaan",
  "Aritmatika & Hitung Cepat",
  "Perbandingan Nilai",
  "Kecepatan, Jarak & Waktu",
  "Aritmatika Sosial",
  "Deret Angka & Huruf",
  "Silogisme",
  "Penalaran Analitis",
  "Figural",
]

export default function CatBankView() {
  const {
    questions,
    candidates,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    updateCandidate,
    updateCandidateStage,
    showToast,
  } = useApp()

  const [activeTab, setActiveTab] = useState<"bank" | "simulator">("bank")
  const [typeFilter, setTypeFilter] = useState<"all" | "pip" | "tiu">("all")
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    type: "pip" as "pip" | "tiu",
    category: pipCategories[0],
    question: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    optionE: "",
    correctIndex: 0,
    explanation: "",
    status: "active" as "active" | "draft",
  })

  // Live CAT Simulator state
  const [simType, setSimType] = useState<"pip" | "tiu">("pip")
  const [simCandidateId, setSimCandidateId] = useState(
    candidates[0]?.id ?? "cand-001",
  )
  const [simRunning, setSimRunning] = useState(false)
  const [simSubmitted, setSimSubmitted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem("paska-cat-answers") ?? "{}")
    } catch {
      return {}
    }
  })
  const [flagged, setFlagged] = useState<Record<string, boolean>>({})
  const [secondsLeft, setSecondsLeft] = useState(1800) // 30 minutes default

  useEffect(() => {
    localStorage.setItem("paska-cat-answers", JSON.stringify(answers))
  }, [answers])

  useEffect(() => {
    if (!simRunning || simSubmitted) return
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setSimSubmitted(true)
          setSimRunning(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [simRunning, simSubmitted])

  const filteredQuestions = useMemo(
    () =>
      questions.filter((q) => {
        if (typeFilter !== "all" && q.type !== typeFilter) return false
        if (search.trim()) {
          const term = search.toLowerCase()
          return (
            q.question.toLowerCase().includes(term) ||
            q.category.toLowerCase().includes(term) ||
            q.explanation.toLowerCase().includes(term)
          )
        }
        return true
      }),
    [questions, typeFilter, search],
  )

  const simQuestions = useMemo(
    () => questions.filter((q) => q.type === simType && q.status === "active"),
    [questions, simType],
  )

  const currentSimQuestion = simQuestions[currentIndex]

  const simScoreResult = useMemo(() => {
    if (!simQuestions.length) return { correct: 0, total: 0, score: 0 }
    const correct = simQuestions.filter(
      (q) => answers[q.id] === q.correctIndex,
    ).length
    const score = Math.round((correct / simQuestions.length) * 100)
    return { correct, total: simQuestions.length, score }
  }, [simQuestions, answers])

  function openCreate() {
    setEditingId(null)
    setForm({
      type: typeFilter === "tiu" ? "tiu" : "pip",
      category: typeFilter === "tiu" ? tiuCategories[0] : pipCategories[0],
      question: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      optionE: "",
      correctIndex: 0,
      explanation: "",
      status: "active",
    })
    setShowForm(true)
  }

  function openEdit(q: CatQuestion) {
    setEditingId(q.id)
    setForm({
      type: q.type,
      category: q.category,
      question: q.question,
      optionA: q.options[0] ?? "",
      optionB: q.options[1] ?? "",
      optionC: q.options[2] ?? "",
      optionD: q.options[3] ?? "",
      optionE: q.options[4] ?? "",
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      status: q.status,
    })
    setShowForm(true)
  }

  function handleSaveQuestion(e: React.FormEvent) {
    e.preventDefault()
    const payload: Omit<CatQuestion, "id"> = {
      type: form.type,
      category: form.category,
      question: form.question.trim(),
      options: [
        form.optionA.trim(),
        form.optionB.trim(),
        form.optionC.trim(),
        form.optionD.trim(),
        form.optionE.trim(),
      ],
      correctIndex: form.correctIndex,
      explanation: form.explanation.trim(),
      status: form.status,
    }
    if (editingId) {
      updateQuestion(editingId, payload)
    } else {
      addQuestion(payload)
    }
    setShowForm(false)
    setEditingId(null)
  }

  function startSimulation() {
    setAnswers({})
    setFlagged({})
    setCurrentIndex(0)
    setSecondsLeft(1800)
    setSimSubmitted(false)
    setSimRunning(true)
  }

  function applySimScoreToCandidate() {
    const targetCandidate = candidates.find((c) => c.id === simCandidateId)
    if (!targetCandidate) return
    const passed = simScoreResult.score >= 70
    if (simType === "pip") {
      updateCandidate(targetCandidate.id, { pip: simScoreResult.score })
      updateCandidateStage(
        targetCandidate.id,
        1,
        passed ? "passed" : "failed",
        passed
          ? `Lolos CAT PIP dengan skor ${simScoreResult.score}`
          : `Skor CAT PIP (${simScoreResult.score}) di bawah passing grade 70`,
      )
    } else {
      updateCandidate(targetCandidate.id, { tiu: simScoreResult.score })
      updateCandidateStage(
        targetCandidate.id,
        2,
        passed ? "passed" : "failed",
        passed
          ? `Lolos CAT TIU dengan skor ${simScoreResult.score}`
          : `Skor CAT TIU (${simScoreResult.score}) di bawah passing grade 70`,
      )
    }
    showToast(
      `Nilai ${simType.toUpperCase()} (${simScoreResult.score}) berhasil disimpan ke profil ${targetCandidate.name}.`,
      passed ? "success" : "warning",
    )
  }

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-red-600">
            Engine evaluasi akademik CAT
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-950">
            Bank soal & simulator CAT
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Kelola butir soal PIP & TIU beserta pembahasan, atau jalankan
            simulasi ujian CAT interaktif lengkap dengan timer dan penilaian
            otomatis.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeTab === "bank" ? "primary" : "secondary"}
            onClick={() => setActiveTab("bank")}
          >
            <BookOpenCheck className="size-4" /> Bank Soal ({questions.length})
          </Button>
          <Button
            variant={activeTab === "simulator" ? "primary" : "secondary"}
            onClick={() => setActiveTab("simulator")}
          >
            <Play className="size-4" /> Simulator Ujian CAT
          </Button>
        </div>
      </div>

      {activeTab === "bank" ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Soal PIP
              </p>
              <p className="mt-2 font-display text-3xl font-bold text-slate-950">
                {questions.filter((q) => q.type === "pip").length}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                4 domain Pancasila & Wawasan Kebangsaan
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Soal TIU
              </p>
              <p className="mt-2 font-display text-3xl font-bold text-slate-950">
                {questions.filter((q) => q.type === "tiu").length}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Verbal, numerik, silogisme & analitis
              </p>
            </Card>
            <Card className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Passing Grade
                  </p>
                  <p className="mt-2 font-display text-3xl font-bold text-emerald-700">
                    ≥ 70
                  </p>
                </div>
                <Button onClick={openCreate}>
                  <Plus className="size-4" /> Tambah soal
                </Button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Skala 0–100 · Pembahasan terbuka pasca-submit
              </p>
            </Card>
          </div>

          {showForm ? (
            <Card className="border-red-200 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-slate-900">
                  {editingId ? "Edit butir soal CAT" : "Tambah butir soal baru"}
                </h2>
                <Button
                  variant="ghost"
                  className="!px-2"
                  onClick={() => setShowForm(false)}
                >
                  <X className="size-5" />
                </Button>
              </div>
              <form onSubmit={handleSaveQuestion} className="mt-5 grid gap-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Jenis ujian
                    <select
                      value={form.type}
                      onChange={(e) => {
                        const nextType = e.target.value as "pip" | "tiu"
                        setForm((f) => ({
                          ...f,
                          type: nextType,
                          category:
                            nextType === "pip"
                              ? pipCategories[0]
                              : tiuCategories[0],
                        }))
                      }}
                      className="min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-normal outline-none focus:border-red-400"
                    >
                      <option value="pip">PIP — Pancasila & Wawasan</option>
                      <option value="tiu">TIU — Intelegensia Umum</option>
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Submateri / kategori
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, category: e.target.value }))
                      }
                      className="min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-normal outline-none focus:border-red-400"
                    >
                      {(form.type === "pip"
                        ? pipCategories
                        : tiuCategories
                      ).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Status soal
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          status: e.target.value as "active" | "draft",
                        }))
                      }
                      className="min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-normal outline-none focus:border-red-400"
                    >
                      <option value="active">Aktif (Masuk Simulator)</option>
                      <option value="draft">Draft Review</option>
                    </select>
                  </label>
                </div>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Pertanyaan / pokok soal
                  <textarea
                    required
                    rows={3}
                    value={form.question}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, question: e.target.value }))
                    }
                    placeholder="Tuliskan pokok soal secara lengkap..."
                    className="rounded-xl border border-slate-200 p-3.5 text-sm font-normal outline-none focus:border-red-400"
                  />
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  {([
                    ["optionA", "Pilihan A"],
                    ["optionB", "Pilihan B"],
                    ["optionC", "Pilihan C"],
                    ["optionD", "Pilihan D"],
                    ["optionE", "Pilihan E"],
                  ] as const).map(([key, label], idx) => (
                    <div key={key} className="flex items-end gap-2">
                      <div className="flex-1">
                        <Input
                          label={label}
                          required
                          value={form[key]}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, [key]: e.target.value }))
                          }
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({ ...f, correctIndex: idx }))
                        }
                        className={`min-h-11 rounded-xl border px-3 text-xs font-bold transition ${
                          form.correctIndex === idx
                            ? "border-emerald-300 bg-emerald-600 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        {form.correctIndex === idx
                          ? "Kunci Benar"
                          : "Set Kunci"}
                      </button>
                    </div>
                  ))}
                </div>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Pembahasan & rumus cepat
                  <textarea
                    required
                    rows={2}
                    value={form.explanation}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, explanation: e.target.value }))
                    }
                    placeholder="Jelaskan alasan jawaban benar atau rumus cepat..."
                    className="rounded-xl border border-slate-200 p-3.5 text-sm font-normal outline-none focus:border-red-400"
                  />
                </label>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowForm(false)}
                  >
                    Batal
                  </Button>
                  <Button type="submit">
                    <Save className="size-4" /> Simpan butir soal
                  </Button>
                </div>
              </form>
            </Card>
          ) : null}

          <Card className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                {([
                  ["all", "Semua Soal"],
                  ["pip", "PIP / TWK"],
                  ["tiu", "TIU"],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setTypeFilter(id)}
                    className={`min-h-10 rounded-xl px-4 text-xs font-bold transition ${
                      typeFilter === id
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="relative min-w-64 flex-1 md:max-w-sm">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari teks soal, submateri, pembahasan..."
                  className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-red-300 focus:bg-white"
                />
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              {filteredQuestions.map((q, index) => (
                <div
                  key={q.id}
                  className="rounded-2xl border border-slate-200 p-5 transition hover:border-slate-300"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={q.type === "pip" ? "info" : "warning"}>
                        {q.type.toUpperCase()}
                      </Badge>
                      <Badge tone="neutral">{q.category}</Badge>
                      <Badge
                        tone={q.status === "active" ? "success" : "neutral"}
                      >
                        {q.status === "active" ? "Aktif" : "Draft"}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        className="!px-2"
                        onClick={() => openEdit(q)}
                        aria-label="Edit soal"
                      >
                        <Edit3 className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        className="!px-2 text-red-600 hover:bg-red-50"
                        onClick={() => deleteQuestion(q.id)}
                        aria-label="Hapus soal"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-bold leading-relaxed text-slate-900">
                    {index + 1}. {q.question}
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = optIdx === q.correctIndex
                      const letter = ["A", "B", "C", "D", "E"][optIdx]
                      return (
                        <div
                          key={`${q.id}-opt-${optIdx}`}
                          className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-xs ${
                            isCorrect
                              ? "border-emerald-300 bg-emerald-50 font-bold text-emerald-900"
                              : "border-slate-100 bg-slate-50 text-slate-600"
                          }`}
                        >
                          <span
                            className={`grid size-6 shrink-0 place-items-center rounded-lg text-[0.7rem] font-bold ${
                              isCorrect
                                ? "bg-emerald-600 text-white"
                                : "bg-white text-slate-700"
                            }`}
                          >
                            {letter}
                          </span>
                          <span>{opt}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                    <strong className="text-slate-900">Pembahasan:</strong>{" "}
                    {q.explanation}
                  </div>
                </div>
              ))}
              {!filteredQuestions.length ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  Tidak ada butir soal yang sesuai dengan pencarian.
                </div>
              ) : null}
            </div>
          </Card>
        </>
      ) : (
        <div className="grid gap-6">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="grid flex-1 gap-4 sm:grid-cols-2 md:max-w-xl">
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Peserta ujian
                  <select
                    disabled={simRunning}
                    value={simCandidateId}
                    onChange={(e) => setSimCandidateId(e.target.value)}
                    className="min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-normal outline-none focus:border-red-400"
                  >
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.number})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Paket materi CAT
                  <select
                    disabled={simRunning}
                    value={simType}
                    onChange={(e) => {
                      setSimType(e.target.value as "pip" | "tiu")
                      setCurrentIndex(0)
                      setSimSubmitted(false)
                    }}
                    className="min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-normal outline-none focus:border-red-400"
                  >
                    <option value="pip">
                      Tahap 2: CAT PIP & Wawasan Kebangsaan
                    </option>
                    <option value="tiu">Tahap 3: CAT Intelegensia Umum</option>
                  </select>
                </label>
              </div>
              <div className="flex items-center gap-3">
                {simRunning ? (
                  <div className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 font-display text-sm font-bold text-white">
                    <Clock className="size-4 text-red-400" />
                    {formatTimer(secondsLeft)}
                  </div>
                ) : null}
                {!simRunning ? (
                  <Button onClick={startSimulation}>
                    <Play className="size-4" /> Mulai ujian sekarang
                  </Button>
                ) : (
                  <Button
                    variant="danger"
                    onClick={() => {
                      setSimRunning(false)
                      setSimSubmitted(true)
                    }}
                  >
                    <CheckCircle2 className="size-4" /> Selesaikan & kumpulkan
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {simSubmitted ? (
            <Card className="overflow-hidden">
              <div className="bg-slate-950 p-6 text-white">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <Badge
                      tone={simScoreResult.score >= 70 ? "success" : "danger"}
                    >
                      {simScoreResult.score >= 70
                        ? "LOLOS PASSING GRADE (≥ 70)"
                        : "BELUM MEMENUHI PASSING GRADE (< 70)"}
                    </Badge>
                    <h2 className="mt-2 font-display text-2xl font-bold">
                      Hasil Evaluasi CAT {simType.toUpperCase()}
                    </h2>
                    <p className="mt-1 text-sm text-slate-300">
                      Menjawab benar {simScoreResult.correct} dari{" "}
                      {simScoreResult.total} butir soal aktif.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Skor Akhir
                    </p>
                    <p className="font-display text-4xl font-bold text-red-400">
                      {simScoreResult.score}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button onClick={applySimScoreToCandidate}>
                    <Save className="size-4" /> Simpan nilai ke profil kandidat
                  </Button>
                  <Button variant="secondary" onClick={startSimulation}>
                    <RotateCcw className="size-4" /> Ulangi simulasi
                  </Button>
                </div>
              </div>
              <div className="divide-y divide-slate-100 p-6">
                <h3 className="pb-4 font-display text-lg font-bold text-slate-900">
                  Review Jawaban & Pembahasan Lengkap
                </h3>
                {simQuestions.map((q, idx) => {
                  const chosen = answers[q.id]
                  const isCorrect = chosen === q.correctIndex
                  return (
                    <div key={q.id} className="py-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-900">
                          Soal {idx + 1}: {q.question}
                        </p>
                        <Badge tone={isCorrect ? "success" : "danger"}>
                          {isCorrect ? "Benar" : "Salah / Kosong"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-slate-600">
                        Jawaban Anda:{" "}
                        <strong>
                          {chosen !== undefined
                            ? `${["A", "B", "C", "D", "E"][chosen]}. ${q.options[chosen]}`
                            : "Tidak dijawab"}
                        </strong>{" "}
                        · Kunci:{" "}
                        <strong className="text-emerald-700">
                          {["A", "B", "C", "D", "E"][q.correctIndex]}.{" "}
                          {q.options[q.correctIndex]}
                        </strong>
                      </p>
                      <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                        <strong>Pembahasan:</strong> {q.explanation}
                      </p>
                    </div>
                  )
                })}
              </div>
            </Card>
          ) : currentSimQuestion ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
              <Card className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <Badge tone="info">
                      Soal {currentIndex + 1} dari {simQuestions.length}
                    </Badge>
                    <Badge tone="neutral">{currentSimQuestion.category}</Badge>
                  </div>
                  <Badge tone="success">Autosave aktif</Badge>
                </div>

                <p className="mt-5 text-base font-bold leading-relaxed text-slate-900">
                  {currentSimQuestion.question}
                </p>

                <div className="mt-5 grid gap-3">
                  {currentSimQuestion.options.map((opt, optIdx) => {
                    const selected = answers[currentSimQuestion.id] === optIdx
                    const letter = ["A", "B", "C", "D", "E"][optIdx]
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => {
                          if (!simRunning) setSimRunning(true)
                          setAnswers((prev) => ({
                            ...prev,
                            [currentSimQuestion.id]: optIdx,
                          }))
                        }}
                        className={`flex items-center gap-3.5 rounded-2xl border p-4 text-left text-sm transition ${
                          selected
                            ? "border-red-400 bg-red-50 font-bold text-red-950 ring-2 ring-red-100"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`grid size-8 shrink-0 place-items-center rounded-xl text-xs font-bold ${
                            selected
                              ? "bg-red-600 text-white"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {letter}
                        </span>
                        <span>{opt}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                  <Button
                    variant="secondary"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  >
                    Soal sebelumnya
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setFlagged((prev) => ({
                        ...prev,
                        [currentSimQuestion.id]: !prev[currentSimQuestion.id],
                      }))
                    }
                    className={
                      flagged[currentSimQuestion.id]
                        ? "!border-amber-300 !bg-amber-50 !text-amber-800"
                        : ""
                    }
                  >
                    <Flag className="size-4" />{" "}
                    {flagged[currentSimQuestion.id]
                      ? "Ditandai ragu-ragu"
                      : "Tandai ragu-ragu"}
                  </Button>
                  {currentIndex < simQuestions.length - 1 ? (
                    <Button
                      onClick={() =>
                        setCurrentIndex((i) =>
                          Math.min(simQuestions.length - 1, i + 1),
                        )
                      }
                    >
                      Soal berikutnya
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        setSimRunning(false)
                        setSimSubmitted(true)
                      }}
                    >
                      <CheckCircle2 className="size-4" /> Kumpulkan jawaban
                    </Button>
                  )}
                </div>
              </Card>

              <Card className="h-fit p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-slate-900">
                    Navigasi soal
                  </h3>
                  <Target className="size-4 text-red-600" />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Hijau: terjawab · Kuning: ragu-ragu
                </p>
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {simQuestions.map((q, idx) => {
                    const isAnswered = answers[q.id] !== undefined
                    const isFlagged = flagged[q.id]
                    const isCurrent = idx === currentIndex
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIndex(idx)}
                        className={`grid size-10 place-items-center rounded-xl text-xs font-bold transition ${
                          isCurrent ? "ring-2 ring-red-600 ring-offset-1" : ""
                        } ${
                          isFlagged
                            ? "bg-amber-400 text-amber-950"
                            : isAnswered
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <Button
                    className="w-full"
                    onClick={() => {
                      setSimRunning(false)
                      setSimSubmitted(true)
                    }}
                  >
                    <CheckCircle2 className="size-4" /> Selesaikan ujian
                  </Button>
                </div>
              </Card>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

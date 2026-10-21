import React, { useMemo, useState } from "react"
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Filter,
  MessageSquare,
  RotateCcw,
  ShieldCheck,
  X,
} from "lucide-react"
import {
  ALL_PBB_ITEMS,
  PBB_CATEGORIES,
  PBB_GRADE_POINTS,
  calculatePbbSummary,
  type PbbGrade,
} from "../../data/pbbEvaluation"

interface PbbEvaluationSectionProps {
  metrics: Record<string, string>
  onUpdateMetrics: (updatedMetrics: Record<string, string>) => void
}

type FilterView = "all" | "unrated" | "with_notes"

export default function PbbEvaluationSection({
  metrics,
  onUpdateMetrics,
}: PbbEvaluationSectionProps) {
  const [filterView, setFilterView] = useState<FilterView>("all")
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})

  const summary = calculatePbbSummary(metrics)

  // Count items with notes
  const notesCount = useMemo(() => {
    return ALL_PBB_ITEMS.filter((i) => Boolean(metrics[`pbb_note_${i.id}`]?.trim())).length
  }, [metrics])

  const unratedCount = summary.totalItems - summary.gradedCount

  // Handle selecting / toggling A, B, C, D
  function handleSelectGrade(itemId: string, grade: PbbGrade) {
    const key = `pbb_${itemId}`
    const currentVal = metrics[key]
    const nextVal = currentVal === grade ? "" : grade

    const nextMetrics = {
      ...metrics,
      [key]: nextVal,
    }

    const nextSummary = calculatePbbSummary(nextMetrics)
    if (nextSummary.finalScore !== null) {
      nextMetrics.pbbScore = String(nextSummary.finalScore)
      nextMetrics.pbbGrade = nextSummary.predicate
      if (nextSummary.staticScore !== null) {
        nextMetrics.static = String(nextSummary.staticScore)
      }
      if (nextSummary.dynamicScore !== null) {
        nextMetrics.dynamic = String(nextSummary.dynamicScore)
      }
      if (nextSummary.commandScore !== null) {
        nextMetrics.command = String(nextSummary.commandScore)
      }
    } else {
      delete nextMetrics.pbbScore
      delete nextMetrics.pbbGrade
    }

    onUpdateMetrics(nextMetrics)
  }

  // Handle direct inline note editing
  function handleNoteChange(itemId: string, note: string) {
    const key = `pbb_note_${itemId}`
    const nextMetrics = { ...metrics }
    if (note.trim() === "") {
      delete nextMetrics[key]
    } else {
      nextMetrics[key] = note
    }
    onUpdateMetrics(nextMetrics)
  }

  // Quick fill all with a specific grade
  function handleBulkFill(grade: PbbGrade) {
    const nextMetrics = { ...metrics }
    for (const item of ALL_PBB_ITEMS) {
      nextMetrics[`pbb_${item.id}`] = grade
    }
    const nextSummary = calculatePbbSummary(nextMetrics)
    if (nextSummary.finalScore !== null) {
      nextMetrics.pbbScore = String(nextSummary.finalScore)
      nextMetrics.pbbGrade = nextSummary.predicate
      if (nextSummary.staticScore !== null) {
        nextMetrics.static = String(nextSummary.staticScore)
      }
      if (nextSummary.dynamicScore !== null) {
        nextMetrics.dynamic = String(nextSummary.dynamicScore)
      }
      if (nextSummary.commandScore !== null) {
        nextMetrics.command = String(nextSummary.commandScore)
      }
    }
    onUpdateMetrics(nextMetrics)
  }

  // Quick fill category with a grade
  function handleCategoryFill(catKey: string, grade: PbbGrade) {
    const category = PBB_CATEGORIES.find((c) => c.key === catKey)
    if (!category) return
    const nextMetrics = { ...metrics }
    for (const item of category.items) {
      nextMetrics[`pbb_${item.id}`] = grade
    }
    const nextSummary = calculatePbbSummary(nextMetrics)
    if (nextSummary.finalScore !== null) {
      nextMetrics.pbbScore = String(nextSummary.finalScore)
      nextMetrics.pbbGrade = nextSummary.predicate
      if (nextSummary.staticScore !== null) {
        nextMetrics.static = String(nextSummary.staticScore)
      }
      if (nextSummary.dynamicScore !== null) {
        nextMetrics.dynamic = String(nextSummary.dynamicScore)
      }
      if (nextSummary.commandScore !== null) {
        nextMetrics.command = String(nextSummary.commandScore)
      }
    }
    onUpdateMetrics(nextMetrics)
  }

  // Reset all PBB grades
  function handleResetAll() {
    if (
      summary.gradedCount > 0 &&
      !window.confirm("Kosongkan seluruh 25 penilaian PBB pada sesi kandidat ini?")
    ) {
      return
    }
    const nextMetrics = { ...metrics }
    for (const item of ALL_PBB_ITEMS) {
      delete nextMetrics[`pbb_${item.id}`]
    }
    delete nextMetrics.pbbScore
    delete nextMetrics.pbbGrade
    onUpdateMetrics(nextMetrics)
  }

  function toggleCategory(catKey: string) {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catKey]: !prev[catKey],
    }))
  }

  const completionPercent = Math.round((summary.gradedCount / summary.totalItems) * 100)

  return (
    <div className="space-y-5">
      {/* 1. Header & Live Score Dashboard */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {/* Main Header Bar */}
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Title & Progress */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-lg bg-red-600 text-white shadow-xs">
                    <ShieldCheck className="size-4" />
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    Lembar Penilaian PBB & Komando
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    summary.gradedCount === summary.totalItems
                      ? "bg-emerald-100 text-emerald-800"
                      : summary.gradedCount > 0
                        ? "bg-blue-100 text-blue-800"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {summary.gradedCount === summary.totalItems ? (
                    <Check className="size-3" />
                  ) : null}
                  {summary.gradedCount} dari {summary.totalItems} Gerakan Dinilai ({completionPercent}%)
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Pilih predikat <strong className="text-slate-700">A (100)</strong>, <strong className="text-slate-700">B (80)</strong>, <strong className="text-slate-700">C (60)</strong>, atau <strong className="text-slate-700">D (40)</strong>. Catatan koreksi gerakan tersimpan otomatis.
              </p>
            </div>

            {/* Scorecard Box */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:px-4">
              <div className="text-right">
                <div className="flex items-baseline justify-end gap-1">
                  <span className="font-display text-3xl font-extrabold tracking-tight text-slate-900">
                    {summary.finalScore !== null ? summary.finalScore.toFixed(1) : "—"}
                  </span>
                  <span className="text-xs font-bold text-slate-400">/ 100</span>
                </div>
                <p className="text-[0.68rem] font-medium text-slate-500">
                  Nilai Akhir PBB (30%)
                </p>
              </div>

              <div className="h-9 w-px bg-slate-200" />

              <div className="min-w-[100px]">
                {summary.predicate !== "-" ? (
                  <span
                    className={`inline-block rounded-lg px-2.5 py-1 text-xs font-extrabold ${
                      summary.predicate === "A"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : summary.predicate === "B"
                          ? "bg-blue-600 text-white shadow-xs"
                          : summary.predicate === "C"
                            ? "bg-amber-500 text-white shadow-xs"
                            : "bg-rose-600 text-white shadow-xs"
                    }`}
                  >
                    Predikat {summary.predicate}
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-400">
                    Belum Dinilai
                  </span>
                )}
                <p className="mt-0.5 text-[0.68rem] text-slate-400">
                  {summary.predicate === "A"
                    ? "Sangat Baik"
                    : summary.predicate === "B"
                      ? "Baik"
                      : summary.predicate === "C"
                        ? "Cukup"
                        : summary.predicate === "D"
                          ? "Kurang"
                          : "25 Materi"}
                </p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full transition-all duration-300 ${
                completionPercent === 100
                  ? "bg-emerald-500"
                  : completionPercent > 50
                    ? "bg-blue-600"
                    : "bg-red-500"
              }`}
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>

        {/* Toolbar: Distribution Counters, Sub-Scores & Fast Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-xs sm:px-5">
          {/* Distribution Counters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-400">
              Distribusi:
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-800">
              <span>A</span>
              <span className="rounded bg-emerald-200/70 px-1 text-[0.65rem]">
                {summary.distribution.A}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2 py-0.5 font-bold text-blue-800">
              <span>B</span>
              <span className="rounded bg-blue-200/70 px-1 text-[0.65rem]">
                {summary.distribution.B}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 font-bold text-amber-800">
              <span>C</span>
              <span className="rounded bg-amber-200/70 px-1 text-[0.65rem]">
                {summary.distribution.C}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2 py-0.5 font-bold text-rose-800">
              <span>D</span>
              <span className="rounded bg-rose-200/70 px-1 text-[0.65rem]">
                {summary.distribution.D}
              </span>
            </span>

            {/* Sub-group averages */}
            <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 text-slate-500 sm:flex">
              <span>
                Statis:{" "}
                <strong className="text-slate-800">
                  {summary.staticScore !== null ? summary.staticScore.toFixed(1) : "—"}
                </strong>
              </span>
              <span>•</span>
              <span>
                Dinamis:{" "}
                <strong className="text-slate-800">
                  {summary.dynamicScore !== null ? summary.dynamicScore.toFixed(1) : "—"}
                </strong>
              </span>
              <span>•</span>
              <span>
                Komando:{" "}
                <strong className="text-slate-800">
                  {summary.commandScore !== null ? summary.commandScore.toFixed(1) : "—"}
                </strong>
              </span>
            </div>
          </div>

          {/* Bulk Tools */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[0.7rem] font-bold text-slate-400 mr-1 hidden lg:inline">
              Aksi Cepat:
            </span>
            <button
              type="button"
              onClick={() => handleBulkFill("A")}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition"
              title="Isi seluruh 25 gerakan dengan nilai A (100)"
            >
              Semua A
            </button>
            <button
              type="button"
              onClick={() => handleBulkFill("B")}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition"
              title="Isi seluruh 25 gerakan dengan nilai B (80)"
            >
              Semua B
            </button>
            {summary.gradedCount > 0 && (
              <button
                type="button"
                onClick={handleResetAll}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                title="Kosongkan seluruh nilai"
              >
                <RotateCcw className="size-3" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar (Semua / Belum Dinilai / Ada Catatan) */}
        <div className="flex items-center gap-2 border-t border-slate-200/80 bg-white px-4 py-2 text-xs sm:px-5">
          <span className="text-slate-400 flex items-center gap-1 font-medium">
            <Filter className="size-3" /> Filter:
          </span>
          {[
            { id: "all", label: `Semua Gerakan (${summary.totalItems})` },
            { id: "unrated", label: `Belum Dinilai (${unratedCount})` },
            { id: "with_notes", label: `Ada Catatan Koreksi (${notesCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterView(tab.id as FilterView)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                filterView === tab.id
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Structured Assessment Tables (Full-Width, Zero Truncation!) */}
      <div className="space-y-4">
        {PBB_CATEGORIES.map((cat, catIdx) => {
          const isCollapsed = collapsedCategories[cat.key]

          // Filter items based on active filter tab
          const visibleItems = cat.items.filter((item) => {
            if (filterView === "unrated") {
              return !metrics[`pbb_${item.id}`]
            }
            if (filterView === "with_notes") {
              return Boolean(metrics[`pbb_note_${item.id}`]?.trim())
            }
            return true
          })

          const catGraded = cat.items.filter((i) => Boolean(metrics[`pbb_${i.id}`])).length
          const isCatComplete = catGraded === cat.items.length

          // If filtering and no items match in this category, hide category
          if (visibleItems.length === 0 && filterView !== "all") {
            return null
          }

          return (
            <div
              key={cat.key}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs"
            >
              {/* Category Header */}
              <div
                onClick={() => toggleCategory(cat.key)}
                className="flex cursor-pointer select-none items-center justify-between border-b border-slate-200 bg-slate-50/90 px-4 py-3 hover:bg-slate-100 transition"
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {catIdx + 1}.
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">
                    {cat.title}
                  </h4>
                  <span className="rounded-md bg-slate-200/70 px-2 py-0.5 text-[0.68rem] font-semibold text-slate-600">
                    {cat.macroGroup === "statis"
                      ? "PBB Statis"
                      : cat.macroGroup === "dinamis"
                        ? "PBB Dinamis"
                        : "Vokal & Komando"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold ${
                      isCatComplete
                        ? "bg-emerald-100 text-emerald-800"
                        : catGraded > 0
                          ? "bg-blue-100 text-blue-800"
                          : "bg-slate-200/80 text-slate-600"
                    }`}
                  >
                    {isCatComplete ? <CheckCircle2 className="size-3" /> : null}
                    {catGraded} / {cat.items.length} selesai
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Category Fast Fill */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="hidden items-center gap-1 sm:flex text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => handleCategoryFill(cat.key, "A")}
                      className="rounded bg-white px-2 py-0.5 text-[0.68rem] font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition"
                      title="Set semua gerakan di kategori ini jadi A"
                    >
                      Kategori A
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCategoryFill(cat.key, "B")}
                      className="rounded bg-white px-2 py-0.5 text-[0.68rem] font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition"
                      title="Set semua gerakan di kategori ini jadi B"
                    >
                      Kategori B
                    </button>
                  </div>

                  <span className="text-slate-400">
                    {isCollapsed ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronUp className="size-4" />
                    )}
                  </span>
                </div>
              </div>

              {/* Items Table View */}
              {!isCollapsed && (
                <div>
                  {/* Table Column Headers (Desktop) */}
                  <div className="hidden border-b border-slate-100 bg-slate-50/50 px-4 py-2 text-[0.7rem] font-bold uppercase tracking-wider text-slate-400 md:grid md:grid-cols-12 md:gap-4 md:items-center">
                    <div className="col-span-1">No</div>
                    <div className="col-span-4">Materi Gerakan</div>
                    <div className="col-span-3 text-center">Nilai (A · B · C · D)</div>
                    <div className="col-span-4">Catatan Koreksi Gerakan</div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-slate-100">
                    {visibleItems.map((item) => {
                      const grade = metrics[`pbb_${item.id}`] as PbbGrade | undefined
                      const noteKey = `pbb_note_${item.id}`
                      const noteValue = metrics[noteKey] ?? ""
                      const hasNote = Boolean(noteValue.trim())

                      return (
                        <div
                          key={item.id}
                          className={`p-3.5 transition md:px-4 md:py-3 ${
                            grade ? "bg-white hover:bg-slate-50/60" : "bg-white/70 hover:bg-slate-50/40"
                          }`}
                        >
                          {/* Desktop Layout (Grid) */}
                          <div className="hidden md:grid md:grid-cols-12 md:gap-4 md:items-center">
                            {/* 1. Number */}
                            <div className="col-span-1 text-xs font-bold text-slate-400">
                              {item.number}.
                            </div>

                            {/* 2. Movement Full Title (NEVER TRUNCATED!) */}
                            <div className="col-span-4 pr-2">
                              <span className="text-sm font-semibold text-slate-900 leading-snug">
                                {item.name}
                              </span>
                            </div>

                            {/* 3. Segmented Grade Buttons A - B - C - D */}
                            <div className="col-span-3 flex justify-center">
                              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-0.5 shadow-2xs">
                                {(["A", "B", "C", "D"] as const).map((g) => {
                                  const isSelected = grade === g
                                  return (
                                    <button
                                      key={g}
                                      type="button"
                                      onClick={() => handleSelectGrade(item.id, g)}
                                      className={`h-8 w-9 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                                        isSelected
                                          ? g === "A"
                                            ? "bg-emerald-600 text-white shadow-xs font-extrabold"
                                            : g === "B"
                                              ? "bg-blue-600 text-white shadow-xs font-extrabold"
                                              : g === "C"
                                                ? "bg-amber-500 text-white shadow-xs font-extrabold"
                                                : "bg-rose-600 text-white shadow-xs font-extrabold"
                                          : "text-slate-600 hover:text-slate-900 hover:bg-white"
                                      }`}
                                      title={`${g} — ${PBB_GRADE_POINTS[g]} Poin (${g === "A" ? "Sangat Baik" : g === "B" ? "Baik" : g === "C" ? "Cukup" : "Kurang"})`}
                                    >
                                      {g}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>

                            {/* 4. Integrated Note Input Field */}
                            <div className="col-span-4">
                              <div className="relative flex items-center">
                                <input
                                  type="text"
                                  value={noteValue}
                                  onChange={(e) => handleNoteChange(item.id, e.target.value)}
                                  placeholder={`Catatan untuk ${item.name}...`}
                                  className={`w-full rounded-lg border py-1.5 pl-3 pr-7 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition ${
                                    hasNote
                                      ? "border-amber-300 bg-amber-50/40 focus:border-amber-500 focus:bg-white"
                                      : "border-slate-200 bg-slate-50/60 focus:border-red-400 focus:bg-white"
                                  }`}
                                />
                                {hasNote && (
                                  <button
                                    type="button"
                                    onClick={() => handleNoteChange(item.id, "")}
                                    className="absolute right-2 text-slate-400 hover:text-rose-600 transition"
                                    title="Hapus catatan"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Mobile Layout (Stacked) */}
                          <div className="space-y-2.5 md:hidden">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs font-bold text-slate-400 shrink-0">
                                  {item.number}.
                                </span>
                                <span className="text-sm font-semibold text-slate-900">
                                  {item.name}
                                </span>
                              </div>

                              {/* Segmented Grades */}
                              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-0.5 shrink-0">
                                {(["A", "B", "C", "D"] as const).map((g) => {
                                  const isSelected = grade === g
                                  return (
                                    <button
                                      key={g}
                                      type="button"
                                      onClick={() => handleSelectGrade(item.id, g)}
                                      className={`h-7 w-8 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                                        isSelected
                                          ? g === "A"
                                            ? "bg-emerald-600 text-white shadow-xs"
                                            : g === "B"
                                              ? "bg-blue-600 text-white shadow-xs"
                                              : g === "C"
                                                ? "bg-amber-500 text-white shadow-xs"
                                                : "bg-rose-600 text-white shadow-xs"
                                          : "text-slate-600 hover:bg-white"
                                      }`}
                                    >
                                      {g}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>

                            {/* Note Input */}
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                value={noteValue}
                                onChange={(e) => handleNoteChange(item.id, e.target.value)}
                                placeholder={`Catatan koreksi ${item.name}...`}
                                className={`w-full rounded-lg border py-1.5 pl-3 pr-7 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition ${
                                  hasNote
                                    ? "border-amber-300 bg-amber-50/40 focus:border-amber-500 focus:bg-white"
                                    : "border-slate-200 bg-slate-50/60 focus:border-red-400 focus:bg-white"
                                }`}
                              />
                              {hasNote && (
                                <button
                                  type="button"
                                  onClick={() => handleNoteChange(item.id, "")}
                                  className="absolute right-2 text-slate-400 hover:text-rose-600 transition"
                                  title="Hapus catatan"
                                >
                                  <X className="size-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

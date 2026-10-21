import React, { useState } from "react"
import {
  Check,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  MessageSquarePlus,
  RotateCcw,
  Sparkles,
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

export default function PbbEvaluationSection({
  metrics,
  onUpdateMetrics,
}: PbbEvaluationSectionProps) {
  // Set of item IDs whose note input field is explicitly expanded
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>(() => {
    // Automatically open items that already have existing notes
    const initial: Record<string, boolean> = {}
    for (const item of ALL_PBB_ITEMS) {
      if (metrics[`pbb_note_${item.id}`]?.trim()) {
        initial[item.id] = true
      }
    }
    return initial
  })

  // Collapsed categories state (all expanded by default for quick grading)
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})

  const summary = calculatePbbSummary(metrics)

  // Handle grade selection (clicking same grade clears it)
  function handleSelectGrade(itemId: string, grade: PbbGrade) {
    const key = `pbb_${itemId}`
    const currentVal = metrics[key]
    const nextVal = currentVal === grade ? "" : grade

    const nextMetrics = {
      ...metrics,
      [key]: nextVal,
    }

    // Recalculate summary & sync backward-compatible metrics
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

  // Handle note input
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

  // Reset all PBB grades
  function handleResetAll() {
    if (
      summary.gradedCount > 0 &&
      !window.confirm("Kosongkan semua penilaian PBB pada sesi ini?")
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

  // Toggle open note input for an item
  function toggleNoteInput(itemId: string) {
    setOpenNotes((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }))
  }

  // Expand or collapse all note boxes
  const allNotesOpen = ALL_PBB_ITEMS.every((item) => openNotes[item.id])
  function toggleAllNotes() {
    const nextState = !allNotesOpen
    const updated: Record<string, boolean> = {}
    for (const item of ALL_PBB_ITEMS) {
      updated[item.id] = nextState
    }
    setOpenNotes(updated)
  }

  function toggleCategory(catKey: string) {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catKey]: !prev[catKey],
    }))
  }

  return (
    <div className="mt-4 space-y-4">
      {/* 1. Score Summary Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Lembar Penilaian PBB & Komando
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                {summary.gradedCount} / {summary.totalItems} dinilai
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Pilih nilai A, B, C, atau D pada tiap gerakan. Tambahkan catatan bila ada koreksi gerak.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-baseline justify-end gap-1.5">
                <span className="font-display text-2xl font-extrabold text-slate-900">
                  {summary.finalScore !== null ? summary.finalScore.toFixed(1) : "—"}
                </span>
                <span className="text-xs font-bold text-slate-400">/ 100</span>
                {summary.predicate !== "-" && (
                  <span
                    className={`ml-1 rounded-md px-1.5 py-0.5 text-xs font-extrabold ${
                      summary.predicate === "A"
                        ? "bg-emerald-100 text-emerald-800"
                        : summary.predicate === "B"
                          ? "bg-blue-100 text-blue-800"
                          : summary.predicate === "C"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    Predikat {summary.predicate}
                  </span>
                )}
              </div>
              <p className="text-[0.68rem] text-slate-400">
                Nilai akhir PBB (Bobot 30%)
              </p>
            </div>
          </div>
        </div>

        {/* Breakdown & Quick Tools */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Grade Distribution Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400">Distribusi:</span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 border border-emerald-200/50">
              <span className="font-bold">A</span>
              <span className="rounded-full bg-emerald-200/60 px-1.5 text-[0.65rem]">
                {summary.distribution.A}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 border border-blue-200/50">
              <span className="font-bold">B</span>
              <span className="rounded-full bg-blue-200/60 px-1.5 text-[0.65rem]">
                {summary.distribution.B}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 font-semibold text-amber-700 border border-amber-200/50">
              <span className="font-bold">C</span>
              <span className="rounded-full bg-amber-200/60 px-1.5 text-[0.65rem]">
                {summary.distribution.C}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-0.5 font-semibold text-rose-700 border border-rose-200/50">
              <span className="font-bold">D</span>
              <span className="rounded-full bg-rose-200/60 px-1.5 text-[0.65rem]">
                {summary.distribution.D}
              </span>
            </span>

            {/* Sub-group averages */}
            <div className="hidden items-center gap-2 border-l border-slate-200 pl-2 text-slate-500 sm:flex">
              <span>Statis: <strong className="text-slate-800">{summary.staticScore ?? "—"}</strong></span>
              <span>•</span>
              <span>Dinamis: <strong className="text-slate-800">{summary.dynamicScore ?? "—"}</strong></span>
              <span>•</span>
              <span>Komando: <strong className="text-slate-800">{summary.commandScore ?? "—"}</strong></span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleBulkFill("A")}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[0.7rem] font-semibold text-slate-700 hover:bg-slate-100 transition"
              title="Isi seluruh 25 gerakan dengan nilai A"
            >
              Semua A
            </button>
            <button
              type="button"
              onClick={() => handleBulkFill("B")}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[0.7rem] font-semibold text-slate-700 hover:bg-slate-100 transition"
              title="Isi seluruh 25 gerakan dengan nilai B"
            >
              Semua B
            </button>
            <button
              type="button"
              onClick={toggleAllNotes}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[0.7rem] font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              {allNotesOpen ? "Tutup Catatan" : "Buka Catatan"}
            </button>
            {summary.gradedCount > 0 && (
              <button
                type="button"
                onClick={handleResetAll}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[0.7rem] font-semibold text-rose-600 hover:bg-rose-50 transition"
                title="Kosongkan semua penilaian"
              >
                <RotateCcw className="size-3" />
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Categorized Movement Lists */}
      <div className="grid gap-4 lg:grid-cols-2">
        {PBB_CATEGORIES.map((cat, catIdx) => {
          const isCollapsed = collapsedCategories[cat.key]
          // Calculate category progress
          const catGraded = cat.items.filter((i) => Boolean(metrics[`pbb_${i.id}`])).length
          const isCatComplete = catGraded === cat.items.length

          return (
            <div
              key={cat.key}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs"
            >
              {/* Category Header */}
              <div
                onClick={() => toggleCategory(cat.key)}
                className="flex cursor-pointer select-none items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 hover:bg-slate-100/70 transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    {cat.title}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.2 text-[0.65rem] font-bold ${
                      isCatComplete
                        ? "bg-emerald-100 text-emerald-800"
                        : catGraded > 0
                          ? "bg-blue-100 text-blue-800"
                          : "bg-slate-200/70 text-slate-600"
                    }`}
                  >
                    {catGraded}/{cat.items.length}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  {isCollapsed ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronUp className="size-4" />
                  )}
                </div>
              </div>

              {/* Items List */}
              {!isCollapsed && (
                <div className="divide-y divide-slate-100">
                  {cat.items.map((item) => {
                    const grade = metrics[`pbb_${item.id}`] as PbbGrade | undefined
                    const noteKey = `pbb_note_${item.id}`
                    const noteValue = metrics[noteKey] ?? ""
                    const hasNote = Boolean(noteValue.trim())
                    const isNoteOpen = openNotes[item.id] || hasNote

                    return (
                      <div
                        key={item.id}
                        className={`p-3 transition ${
                          grade ? "bg-white" : "bg-white/50"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          {/* Movement Name & Note Preview */}
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 shrink-0 w-4">
                              {item.number}.
                            </span>
                            <span className="text-xs font-semibold text-slate-800 truncate">
                              {item.name}
                            </span>
                            {hasNote && !isNoteOpen && (
                              <button
                                type="button"
                                onClick={() => toggleNoteInput(item.id)}
                                className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[0.65rem] font-medium text-amber-700 hover:bg-amber-100 transition truncate max-w-[130px]"
                                title={noteValue}
                              >
                                <MessageSquare className="size-2.5 shrink-0" />
                                <span className="truncate">{noteValue}</span>
                              </button>
                            )}
                          </div>

                          {/* A - B - C - D Grade Buttons + Note Toggle Button */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {(["A", "B", "C", "D"] as const).map((g) => {
                              const isSelected = grade === g
                              return (
                                <button
                                  key={g}
                                  type="button"
                                  onClick={() => handleSelectGrade(item.id, g)}
                                  className={`size-8 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                                    isSelected
                                      ? g === "A"
                                        ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300"
                                        : g === "B"
                                          ? "bg-blue-600 text-white shadow-xs ring-2 ring-blue-300"
                                          : g === "C"
                                            ? "bg-amber-500 text-white shadow-xs ring-2 ring-amber-300"
                                            : "bg-rose-600 text-white shadow-xs ring-2 ring-rose-300"
                                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                  }`}
                                  title={`${g} (${PBB_GRADE_POINTS[g]} poin)`}
                                >
                                  {g}
                                </button>
                              )
                            })}

                            {/* Note Toggle Button */}
                            <button
                              type="button"
                              onClick={() => toggleNoteInput(item.id)}
                              className={`size-8 rounded-lg border text-xs font-semibold transition flex items-center justify-center ${
                                hasNote
                                  ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                  : isNoteOpen
                                    ? "border-slate-300 bg-slate-100 text-slate-700"
                                    : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600"
                              }`}
                              title={hasNote ? "Ubah catatan koreksi" : "Tambah catatan koreksi"}
                            >
                              {hasNote ? (
                                <MessageSquare className="size-3.5 fill-amber-500 text-amber-600" />
                              ) : (
                                <MessageSquarePlus className="size-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Inline Note Input Field */}
                        {isNoteOpen && (
                          <div className="mt-2 flex items-center gap-2 pt-2 border-t border-slate-100">
                            <input
                              type="text"
                              value={noteValue}
                              onChange={(e) => handleNoteChange(item.id, e.target.value)}
                              placeholder={`Catatan untuk ${item.name} (misal: tumit rapat, tempo 96 BPM)...`}
                              className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-red-400 focus:bg-white focus:outline-none"
                              autoFocus={!hasNote}
                            />
                            {hasNote ? (
                              <button
                                type="button"
                                onClick={() => handleNoteChange(item.id, "")}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition"
                                title="Hapus catatan"
                              >
                                <X className="size-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleNoteInput(item.id)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition text-[0.65rem] font-semibold"
                                title="Tutup"
                              >
                                Tutup
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

import { useState } from "react"
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Edit3,
  IdCard,
  MapPin,
  Plus,
  Trash2,
  UserCheck,
  UsersRound,
  X,
} from "lucide-react"
import { Badge, Button, Card, Input } from "../../components/ui"
import { useApp } from "../../context/AppContext"
import { selectionStages, type SelectionSchedule } from "../../domain/selection"
import { printAdmissionCard } from "../../lib/exportUtils"

export default function SchedulesView() {
  const {
    schedules,
    candidates,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    toggleCandidateSchedule,
  } = useApp()

  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(
    schedules[0]?.id ?? "",
  )
  const [stageFilter, setStageFilter] = useState<number | "all">("all")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    stageId: 1,
    title: "",
    date: "2026-10-26",
    time: "08:00 - 11:30",
    location: "",
    capacity: 40,
    pic: "",
    status: "scheduled" as SelectionSchedule["status"],
  })

  const filteredSchedules = schedules.filter(
    (s) => stageFilter === "all" || s.stageId === stageFilter,
  )
  const activeSchedule =
    schedules.find((s) => s.id === selectedScheduleId) ??
    filteredSchedules[0] ??
    schedules[0]

  function openCreate() {
    setEditingId(null)
    setForm({
      stageId: stageFilter === "all" ? 1 : stageFilter,
      title: "",
      date: "2026-10-26",
      time: "08:00 - 11:30",
      location: "",
      capacity: 40,
      pic: "",
      status: "scheduled",
    })
    setShowForm(true)
  }

  function openEdit(sched: SelectionSchedule) {
    setEditingId(sched.id)
    setForm({
      stageId: sched.stageId,
      title: sched.title,
      date: sched.date,
      time: sched.time,
      location: sched.location,
      capacity: sched.capacity,
      pic: sched.pic,
      status: sched.status,
    })
    setShowForm(true)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const stageObj = selectionStages.find((s) => s.id === form.stageId)
    const finalTitle =
      form.title.trim() ||
      `Jadwal ${stageObj?.label ?? "Seleksi"} — ${form.date}`

    if (editingId) {
      updateSchedule(editingId, {
        ...form,
        title: finalTitle,
      })
    } else {
      addSchedule({
        ...form,
        title: finalTitle,
        assignedCandidateIds: candidates
          .filter((c) => c.stageStatuses[form.stageId - 1] !== "locked")
          .slice(0, form.capacity)
          .map((c) => c.id),
      })
    }
    setShowForm(false)
    setEditingId(null)
  }

  return (
    <div className="grid gap-4 sm:gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-950">
              Jadwal seleksi &amp; kartu ujian
            </h1>
            <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/10">
              Operasional &amp; Kartu Peserta
            </span>
          </div>
          <p className="mt-0.5 max-w-2xl text-xs text-slate-500">
            Atur jadwal per tahapan, kelola kapasitas ruangan/lapangan, tetapkan peserta, dan cetak kartu ujian internal.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-3.5" /> Buat jadwal baru
        </Button>
      </div>

      {showForm ? (
        <Card className="border-red-200 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                {editingId ? "Edit jadwal seleksi" : "Buat jadwal tahap baru"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Sistem otomatis membatasi jumlah peserta sesuai kapasitas sesi.
              </p>
            </div>
            <Button
              variant="ghost"
              className="!px-2"
              onClick={() => setShowForm(false)}
            >
              <X className="size-5" />
            </Button>
          </div>
          <form
            onSubmit={handleSave}
            className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Tahap seleksi
              <select
                value={form.stageId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, stageId: Number(e.target.value) }))
                }
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-normal outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
              >
                {selectionStages.map((s) => (
                  <option key={s.id} value={s.id}>
                    Tahap {s.id} — {s.label}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Nama jadwal / gelombang"
              required
              placeholder="Contoh: Ujian CAT PIP Sesi Pagi"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
            />
            <Input
              label="Tanggal pelaksanaan"
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
            <Input
              label="Rentang waktu"
              required
              placeholder="08:00 - 11:30"
              value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
            />
            <Input
              label="Lokasi / ruangan"
              required
              placeholder="Lab Komputer / Lapangan"
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
            />
            <Input
              label="Kapasitas maksimum peserta"
              type="number"
              min={1}
              max={500}
              required
              value={form.capacity}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  capacity: Math.max(1, Number(e.target.value)),
                }))
              }
            />
            <Input
              label="Penanggung jawab (PIC)"
              required
              value={form.pic}
              onChange={(e) => setForm((f) => ({ ...f, pic: e.target.value }))}
            />
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Status pelaksanaan
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as SelectionSchedule["status"],
                  }))
                }
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-normal outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
              >
                <option value="scheduled">Terjadwal</option>
                <option value="ongoing">Sedang berlangsung</option>
                <option value="completed">Selesai</option>
              </select>
            </label>
            <div className="flex items-end justify-end gap-3 md:col-span-2 xl:col-span-1">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowForm(false)}
              >
                Batal
              </Button>
              <Button type="submit">
                <CalendarDays className="size-4" /> Simpan jadwal
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setStageFilter("all")}
          className={`min-h-10 shrink-0 rounded-xl px-3.5 text-xs font-bold transition ${
            stageFilter === "all"
              ? "bg-slate-950 text-white"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          Semua tahap ({schedules.length})
        </button>
        {selectionStages.map((st) => {
          const count = schedules.filter((s) => s.stageId === st.id).length
          return (
            <button
              key={st.id}
              onClick={() => setStageFilter(st.id)}
              className={`min-h-10 shrink-0 rounded-xl px-3.5 text-xs font-bold transition ${
                stageFilter === st.id
                  ? "bg-red-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Tahap {st.id}: {st.shortLabel} ({count})
            </button>
          )
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <div className="grid content-start gap-3">
          {filteredSchedules.map((sched) => {
            const st = selectionStages.find((s) => s.id === sched.stageId)
            const isSelected = activeSchedule?.id === sched.id
            return (
              <Card
                key={sched.id}
                className={`p-4 transition ${
                  isSelected
                    ? "border-red-300 bg-red-50/40 ring-2 ring-red-100"
                    : "hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    className="flex-1 text-left"
                    onClick={() => setSelectedScheduleId(sched.id)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="neutral">
                        Tahap {sched.stageId} · {st?.shortLabel}
                      </Badge>
                      <Badge
                        tone={
                          sched.status === "completed"
                            ? "success"
                            : sched.status === "ongoing"
                              ? "info"
                              : "warning"
                        }
                      >
                        {sched.status === "completed"
                          ? "Selesai"
                          : sched.status === "ongoing"
                            ? "Berlangsung"
                            : "Terjadwal"}
                      </Badge>
                    </div>
                    <p className="mt-2.5 font-display text-base font-bold text-slate-900">
                      {sched.title}
                    </p>
                    <div className="mt-2 grid gap-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" /> {sched.date} ·{" "}
                        {sched.time}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="size-3.5" /> {sched.location}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <UsersRound className="size-3.5" />{" "}
                        {sched.assignedCandidateIds.length} / {sched.capacity}{" "}
                        peserta terdaftar
                      </span>
                    </div>
                  </button>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      className="!px-2"
                      onClick={() => openEdit(sched)}
                      aria-label="Edit jadwal"
                    >
                      <Edit3 className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="!px-2 text-red-600 hover:bg-red-50"
                      onClick={() => deleteSchedule(sched.id)}
                      aria-label="Hapus jadwal"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
          {!filteredSchedules.length ? (
            <Card className="p-8 text-center text-sm text-slate-500">
              Belum ada jadwal pada filter tahapan ini. Klik &ldquo;Buat jadwal
              baru&rdquo; di kanan atas.
            </Card>
          ) : null}
        </div>

        {activeSchedule ? (
          <Card className="overflow-hidden">
            <div className="bg-slate-950 p-6 text-white">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-red-300">
                    Tahap {activeSchedule.stageId} ·{" "}
                    {
                      selectionStages.find(
                        (s) => s.id === activeSchedule.stageId,
                      )?.label
                    }
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold">
                    {activeSchedule.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-300">
                    PIC: {activeSchedule.pic} · Lokasi:{" "}
                    {activeSchedule.location}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["scheduled", "ongoing", "completed"] as const).map(
                    (st) => (
                      <button
                        key={st}
                        onClick={() =>
                          updateSchedule(activeSchedule.id, { status: st })
                        }
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                          activeSchedule.status === st
                            ? "bg-red-600 text-white"
                            : "bg-white/10 text-slate-300 hover:bg-white/20"
                        }`}
                      >
                        {st === "scheduled"
                          ? "Terjadwal"
                          : st === "ongoing"
                            ? "Berlangsung"
                            : "Selesai"}
                      </button>
                    ),
                  )}
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl bg-white/[0.06] p-4 text-xs">
                <div>
                  <p className="text-slate-400">Tanggal & Waktu</p>
                  <p className="mt-1 font-bold text-white">
                    {activeSchedule.date} ({activeSchedule.time})
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Kapasitas Sesi</p>
                  <p className="mt-1 font-bold text-white">
                    {activeSchedule.assignedCandidateIds.length} /{" "}
                    {activeSchedule.capacity} kursi terisi
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Kartu Ujian Internal</p>
                  <p className="mt-1 font-bold text-emerald-300">
                    Siap cetak bagi yang lolos Adm
                  </p>
                </div>
              </div>
            </div>

            <div className="border-b border-slate-100 px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Daftar penugasan peserta & cetak kartu ujian
                  </h3>
                  <p className="text-xs text-slate-500">
                    Klik tombol penugasan untuk memasukkan/mengeluarkan peserta
                    dari sesi ini. Kartu ujian hanya terbit setelah Administrasi
                    lulus.
                  </p>
                </div>
                <Badge tone="info">
                  Sisa kuota:{" "}
                  {Math.max(
                    0,
                    activeSchedule.capacity -
                      activeSchedule.assignedCandidateIds.length,
                  )}
                </Badge>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {candidates.map((cand) => {
                const isAssigned = activeSchedule.assignedCandidateIds.includes(
                  cand.id,
                )
                const admPassed = cand.stageStatuses[0] === "passed"
                const stageUnlocked =
                  cand.stageStatuses[activeSchedule.stageId - 1] !== "locked"

                return (
                  <div
                    key={cand.id}
                    className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid size-10 place-items-center rounded-xl text-xs font-bold text-white ${
                          isAssigned ? "bg-red-600" : "bg-slate-900"
                        }`}
                      >
                        {cand.avatar}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">
                            {cand.name}
                          </p>
                          {isAssigned ? (
                            <Badge tone="success">Terdaftar di Sesi</Badge>
                          ) : null}
                          {!stageUnlocked ? (
                            <Badge tone="neutral">Tahap Terkunci</Badge>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {cand.number} · {cand.school} · Adm:{" "}
                          {admPassed ? "Lolos" : "Belum Lolos"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAssigned && admPassed ? (
                        <Button
                          variant="secondary"
                          onClick={() =>
                            printAdmissionCard(cand, activeSchedule)
                          }
                        >
                          <IdCard className="size-4 text-red-600" /> Cetak kartu
                        </Button>
                      ) : null}
                      <Button
                        variant={isAssigned ? "danger" : "secondary"}
                        onClick={() =>
                          toggleCandidateSchedule(activeSchedule.id, cand.id)
                        }
                      >
                        {isAssigned ? (
                          <>
                            <X className="size-4" /> Keluarkan
                          </>
                        ) : (
                          <>
                            <UserCheck className="size-4" /> Masukkan ke sesi
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

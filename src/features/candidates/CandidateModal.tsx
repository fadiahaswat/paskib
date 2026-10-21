import { useEffect, useState } from "react"
import {
  CheckCircle2,
  FileCheck2,
  IdCard,
  Printer,
  Save,
  ShieldAlert,
  Trash2,
  UserRoundCheck,
  X,
} from "lucide-react"
import { Badge, Button, Input } from "../../components/ui"
import { useApp } from "../../context/AppContext"
import { administrationDocuments } from "../../data/selectionGuide"
import {
  bmi,
  evaluateAgeEligibility,
  finalScore,
  isPhaseOnePassed,
  selectionStages,
  type Candidate,
  type StageStatus,
} from "../../domain/selection"
import { printAdmissionCard, printCandidateReport } from "../../lib/exportUtils"

export function CreateCandidateModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { addCandidate, activeCycle } = useApp()
  const [name, setName] = useState("")
  const [number, setNumber] = useState("")
  const [nik, setNik] = useState("")
  const [school, setSchool] = useState("")
  const [gender, setGender] = useState<"Putra" | "Putri">("Putra")
  const [birthDate, setBirthDate] = useState("2009-10-15")
  const [heightCm, setHeightCm] = useState(172)
  const [weightKg, setWeightKg] = useState(62)
  const [phone, setPhone] = useState("")
  const [socialMedia, setSocialMedia] = useState("")
  const [error, setError] = useState("")

  if (!open) return null

  const ageCheck = evaluateAgeEligibility(birthDate, activeCycle.year)
  const bmiCheck = bmi(weightKg, heightCm)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !school.trim()) {
      setError("Nama lengkap dan asal sekolah wajib diisi.")
      return
    }
    if (nik.trim() && !/^\d{16}$/.test(nik.trim())) {
      setError("NIK harus terdiri dari tepat 16 digit angka.")
      return
    }
    addCandidate({
      name: name.trim(),
      number: number.trim(),
      nik: nik.trim() || undefined,
      school: school.trim(),
      gender,
      birthDate,
      heightCm,
      weightKg,
      phone: phone.trim() || undefined,
      socialMedia: socialMedia.trim() || undefined,
      pip: null,
      tiu: null,
      pbb: null,
      fitness: null,
      personality: null,
      documents: [false, false, false, false, false, false],
    })
    setName("")
    setNumber("")
    setNik("")
    setSchool("")
    setError("")
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-red-600">
              Pendaftaran peserta · {activeCycle.name}
            </p>
            <h2 className="font-display text-xl font-bold text-slate-950">
              Tambah kandidat baru
            </h2>
          </div>
          <Button variant="ghost" className="!px-2" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 p-6">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nama lengkap kandidat"
              required
              placeholder="Contoh: Arya Wiratmaja"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Nomor peserta (opsional, otomatis jika kosong)"
              placeholder="KAB-026-011"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
            <Input
              label="Asal sekolah / madrasah"
              required
              placeholder="SMA Negeri 1 Yogyakarta"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
            />
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Jenis kelamin
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as "Putra" | "Putri")}
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-normal outline-none focus:border-red-400"
              >
                <option value="Putra">Putra</option>
                <option value="Putri">Putri</option>
              </select>
            </label>
            <Input
              label="NIK (16 digit)"
              placeholder="347101..."
              maxLength={16}
              value={nik}
              onChange={(e) => setNik(e.target.value.replace(/\D/g, ""))}
            />
            <Input
              label="Tanggal lahir"
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
            <Input
              label="Tinggi badan (cm)"
              type="number"
              min={140}
              max={210}
              value={heightCm}
              onChange={(e) => setHeightCm(Number(e.target.value))}
            />
            <Input
              label="Berat badan (kg)"
              type="number"
              min={35}
              max={130}
              value={weightKg}
              onChange={(e) => setWeightKg(Number(e.target.value))}
            />
            <Input
              label="Nomor telepon / WA"
              placeholder="0812-xxxx-xxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="Akun media sosial"
              placeholder="@username (Publik)"
              value={socialMedia}
              onChange={(e) => setSocialMedia(e.target.value)}
            />
          </div>

          <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-slate-500">
                Kalkulasi usia per 17 Agustus {activeCycle.year}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {ageCheck.years} th {ageCheck.months} bln {ageCheck.days} hr
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {ageCheck.message}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">
                Estimasi BMI / IMT awal
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {bmiCheck ? `${bmiCheck.value} (${bmiCheck.category})` : "—"}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Standar tinggi: {gender === "Putra" ? "170–180" : "165–175"} cm
              </p>
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit">
              <UserRoundCheck className="size-4" /> Simpan kandidat
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function CandidateDetailModal({
  candidateId,
  onClose,
}: {
  candidateId: string | null
  onClose: () => void
}) {
  const {
    allCandidates,
    updateCandidate,
    deleteCandidate,
    updateCandidateStage,
    toggleCandidateDocument,
    activeCycle,
  } = useApp()

  const candidate = allCandidates.find((c) => c.id === candidateId) ?? null
  const [tab, setTab] = useState<"profile" | "stages" | "scores">("profile")

  const [name, setName] = useState("")
  const [school, setSchool] = useState("")
  const [gender, setGender] = useState<"Putra" | "Putri">("Putra")
  const [birthDate, setBirthDate] = useState("")
  const [nik, setNik] = useState("")
  const [heightCm, setHeightCm] = useState(170)
  const [weightKg, setWeightKg] = useState(60)
  const [phone, setPhone] = useState("")
  const [socialMedia, setSocialMedia] = useState("")

  const [pip, setPip] = useState("")
  const [tiu, setTiu] = useState("")
  const [pbb, setPbb] = useState("")
  const [fitness, setFitness] = useState("")
  const [personality, setPersonality] = useState("")
  const [attendance, setAttendance] = useState("90")
  const [trainingCompliance, setTrainingCompliance] = useState("88")
  const [coachNote, setCoachNote] = useState("")
  const [stageReason, setStageReason] = useState("")

  useEffect(() => {
    if (!candidate) return
    setName(candidate.name)
    setSchool(candidate.school)
    setGender(candidate.gender)
    setBirthDate(candidate.birthDate)
    setNik(candidate.nik ?? "")
    setHeightCm(candidate.heightCm ?? 170)
    setWeightKg(candidate.weightKg ?? 60)
    setPhone(candidate.phone ?? "")
    setSocialMedia(candidate.socialMedia ?? "")
    setPip(candidate.pip !== null ? String(candidate.pip) : "")
    setTiu(candidate.tiu !== null ? String(candidate.tiu) : "")
    setPbb(candidate.pbb !== null ? String(candidate.pbb) : "")
    setFitness(candidate.fitness !== null ? String(candidate.fitness) : "")
    setPersonality(
      candidate.personality !== null ? String(candidate.personality) : "",
    )
    setAttendance(String(candidate.attendance ?? 90))
    setTrainingCompliance(String(candidate.trainingCompliance ?? 88))
    setCoachNote(candidate.coachNote ?? "")
    setStageReason(candidate.eliminationReason ?? "")
  }, [candidate])

  if (!candidate) return null

  const age = evaluateAgeEligibility(candidate.birthDate, activeCycle.year)
  const bmiInfo = bmi(candidate.weightKg ?? 0, candidate.heightCm ?? 0)
  const score = finalScore(candidate)
  const phase1Passed = isPhaseOnePassed(candidate)
  const docs = candidate.documents ?? [false, false, false, false, false, false]

  function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!candidate) return
    updateCandidate(candidate.id, {
      name: name.trim() || candidate.name,
      school: school.trim() || candidate.school,
      gender,
      birthDate,
      nik: nik.trim() || undefined,
      heightCm: Number(heightCm) || undefined,
      weightKg: Number(weightKg) || undefined,
      phone: phone.trim() || undefined,
      socialMedia: socialMedia.trim() || undefined,
    })
  }

  function saveScores(e: React.FormEvent) {
    e.preventDefault()
    if (!candidate) return
    const parseNum = (val: string) => (val.trim() === "" ? null : Number(val))
    updateCandidate(candidate.id, {
      pip: parseNum(pip),
      tiu: parseNum(tiu),
      pbb: parseNum(pbb),
      fitness: parseNum(fitness),
      personality: parseNum(personality),
      attendance: Number(attendance) || 90,
      trainingCompliance: Number(trainingCompliance) || 85,
      coachNote: coachNote.trim(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4 bg-slate-950 p-6 text-white">
          <div className="flex items-center gap-4">
            <span className="grid size-14 place-items-center rounded-2xl bg-red-600 font-display text-lg font-bold">
              {candidate.avatar}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-bold">
                  {candidate.name}
                </h2>
                <Badge tone={phase1Passed ? "success" : "info"}>
                  Tahap {candidate.stage} ·{" "}
                  {selectionStages[candidate.stage - 1]?.shortLabel}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-300">
                {candidate.number} · {candidate.school} · {candidate.gender} ·
                Usia: {age.years} th {age.months} bln
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="!px-3 !py-1.5 !text-xs"
              onClick={() => printAdmissionCard(candidate)}
            >
              <IdCard className="size-4" /> Kartu Ujian
            </Button>
            <Button
              variant="secondary"
              className="!px-3 !py-1.5 !text-xs"
              onClick={() => printCandidateReport(candidate, activeCycle.year)}
            >
              <Printer className="size-4" /> Cetak Laporan
            </Button>
            <Button
              variant="ghost"
              className="!px-2 text-white hover:bg-white/10"
              onClick={onClose}
            >
              <X className="size-5" />
            </Button>
          </div>
        </div>

        <div className="flex border-b border-slate-200 bg-slate-50 px-6">
          {([
            ["profile", "Profil & 6 Berkas"],
            ["stages", "Tahapan & Hard-Lock (1–8)"],
            ["scores", "Nilai & Catatan Pelatih"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`border-b-2 px-4 py-3.5 text-xs font-bold transition ${
                tab === id
                  ? "border-red-600 text-red-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "profile" ? (
            <div className="grid gap-6">
              <form onSubmit={saveProfile} className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Nama lengkap"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <Input
                    label="Asal sekolah"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                  />
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Jenis kelamin
                    <select
                      value={gender}
                      onChange={(e) =>
                        setGender(e.target.value as "Putra" | "Putri")
                      }
                      className="min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-normal outline-none focus:border-red-400"
                    >
                      <option value="Putra">Putra</option>
                      <option value="Putri">Putri</option>
                    </select>
                  </label>
                  <Input
                    label="Tanggal lahir"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                  <Input
                    label="NIK (16 digit)"
                    value={nik}
                    maxLength={16}
                    onChange={(e) => setNik(e.target.value.replace(/\D/g, ""))}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Tinggi (cm)"
                      type="number"
                      value={heightCm}
                      onChange={(e) => setHeightCm(Number(e.target.value))}
                    />
                    <Input
                      label="Berat (kg)"
                      type="number"
                      value={weightKg}
                      onChange={(e) => setWeightKg(Number(e.target.value))}
                    />
                  </div>
                  <Input
                    label="Telepon / WA"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <Input
                    label="Akun media sosial"
                    value={socialMedia}
                    onChange={(e) => setSocialMedia(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600">
                  <span>
                    BMI:{" "}
                    <strong>
                      {bmiInfo ? `${bmiInfo.value} (${bmiInfo.category})` : "—"}
                    </strong>{" "}
                    · Usia 17 Agt:{" "}
                    <strong>
                      {age.years} th {age.months} bln
                    </strong>
                  </span>
                  <Button type="submit">
                    <Save className="size-4" /> Simpan perubahan profil
                  </Button>
                </div>
              </form>

              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900">
                      Verifikasi 6 berkas pokok administrasi
                    </h3>
                    <p className="text-xs text-slate-500">
                      Centang berkas yang sudah valid.
                    </p>
                  </div>
                  <Badge
                    tone={
                      docs.filter(Boolean).length === 6 ? "success" : "warning"
                    }
                  >
                    {docs.filter(Boolean).length}/6 Valid
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {administrationDocuments.map((doc, idx) => {
                    const checked = Boolean(docs[idx])
                    return (
                      <label
                        key={doc.name}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs transition ${
                          checked
                            ? "border-emerald-200 bg-emerald-50/70"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            toggleCandidateDocument(candidate.id, idx)
                          }
                          className="mt-0.5 size-4 accent-emerald-600"
                        />
                        <span>
                          <strong className="block text-slate-900">
                            {idx + 1}. {doc.name}
                          </strong>
                          <span className="text-slate-500">{doc.detail}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <Button
                  variant="danger"
                  onClick={() => {
                    deleteCandidate(candidate.id)
                    onClose()
                  }}
                >
                  <Trash2 className="size-4" /> Hapus kandidat ini
                </Button>
                <Button variant="secondary" onClick={onClose}>
                  Tutup
                </Button>
              </div>
            </div>
          ) : null}

          {tab === "stages" ? (
            <div className="grid gap-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
                <strong>Aturan State Machine Hard-Lock:</strong> Tahap 1–5
                bersifat sekuensial. Jika salah satu Tahap 1–5 disetel{" "}
                <strong>Gugur</strong>, seluruh tahap sesudahnya otomatis{" "}
                <strong>Terkunci</strong>. Meloloskan Tahap 5 (Parade) akan
                membuka Tahap 6, 7, dan 8 secara paralel.
              </div>

              <Input
                label="Catatan / alasan keputusan tahap (wajib diisi untuk Gugur atau Reopen)"
                placeholder="Contoh: Lulus verifikasi berkas / Gugur TIU di bawah passing grade"
                value={stageReason}
                onChange={(e) => setStageReason(e.target.value)}
              />

              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
                {selectionStages.map((stage, idx) => {
                  const st = candidate.stageStatuses[idx] ?? "locked"
                  return (
                    <div
                      key={stage.key}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">
                            Tahap {stage.id}
                          </span>
                          <p className="text-sm font-bold text-slate-900">
                            {stage.label}
                          </p>
                          <Badge
                            tone={
                              st === "passed"
                                ? "success"
                                : st === "failed"
                                  ? "danger"
                                  : st === "review"
                                    ? "warning"
                                    : st === "active"
                                      ? "info"
                                      : "neutral"
                            }
                          >
                            {st.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {stage.phase === 1
                            ? "Fase 1 · Hard-Lock"
                            : "Fase 2 · Pembobotan Nilai Akhir"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {([
                          ["passed", "Lolos"],
                          ["active", "Aktif"],
                          ["review", "Ditinjau"],
                          ["failed", "Gugur"],
                        ] as [StageStatus, string][]).map(
                          ([statusVal, label]) => (
                            <button
                              key={statusVal}
                              type="button"
                              onClick={() =>
                                updateCandidateStage(
                                  candidate.id,
                                  idx,
                                  statusVal,
                                  stageReason,
                                )
                              }
                              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                                st === statusVal
                                  ? "bg-slate-950 text-white"
                                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              {label}
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          {tab === "scores" ? (
            <form onSubmit={saveScores} className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <Input
                  label="Nilai CAT PIP (Tahap 2)"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  placeholder="0–100"
                  value={pip}
                  onChange={(e) => setPip(e.target.value)}
                />
                <Input
                  label="Nilai CAT TIU (Tahap 3)"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  placeholder="0–100"
                  value={tiu}
                  onChange={(e) => setTiu(e.target.value)}
                />
                <Input
                  label="Nilai PBB · Bobot 30% (Tahap 6)"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  placeholder="0–100"
                  value={pbb}
                  onChange={(e) => setPbb(e.target.value)}
                />
                <Input
                  label="Nilai Samapta · Bobot 30% (Tahap 7)"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  placeholder="0–100"
                  value={fitness}
                  onChange={(e) => setFitness(e.target.value)}
                />
                <Input
                  label="Nilai Kepribadian · Bobot 40% (Tahap 8)"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  placeholder="0–100"
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                />
                <div className="flex flex-col justify-center rounded-2xl bg-slate-950 p-4 text-white">
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
                    Nilai Akhir (30/30/40)
                  </span>
                  <span className="mt-1 font-display text-2xl font-bold text-red-400">
                    {score !== null ? score.toFixed(2) : "Belum lengkap"}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Kehadiran latihan (%)"
                  type="number"
                  min={0}
                  max={100}
                  value={attendance}
                  onChange={(e) => setAttendance(e.target.value)}
                />
                <Input
                  label="Kepatuhan program latihan (%)"
                  type="number"
                  min={0}
                  max={100}
                  value={trainingCompliance}
                  onChange={(e) => setTrainingCompliance(e.target.value)}
                />
              </div>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Catatan pelatih / rekomendasi evaluasi
                <textarea
                  rows={3}
                  value={coachNote}
                  onChange={(e) => setCoachNote(e.target.value)}
                  className="rounded-xl border border-slate-200 p-3.5 text-sm font-normal outline-none focus:border-red-400"
                />
              </label>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>
                  Tutup
                </Button>
                <Button type="submit">
                  <Save className="size-4" /> Simpan seluruh nilai & catatan
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from "react"
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Eye,
  FileCheck2,
  FileText,
  IdCard,
  Paperclip,
  Printer,
  Save,
  ShieldAlert,
  Trash2,
  Upload,
  UserRoundCheck,
  X,
} from "lucide-react"
import { Badge, Button, CandidateAvatar, Input } from "../../components/ui"
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
import {
  compressImageToDataUrl,
  readDocumentFileToDataUrl,
} from "../../lib/imageUtils"

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
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [error, setError] = useState("")

  if (!open) return null

  const ageCheck = evaluateAgeEligibility(birthDate, activeCycle.year)
  const bmiCheck = bmi(weightKg, heightCm)

  async function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploadingPhoto(true)
      const dataUrl = await compressImageToDataUrl(file)
      setPhotoUrl(dataUrl)
    } catch {
      setError("Gagal memproses foto. Pastikan format gambar valid (JPG, PNG, WebP).")
    } finally {
      setUploadingPhoto(false)
      e.target.value = ""
    }
  }

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
      photoUrl,
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
    setPhotoUrl(undefined)
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

          <div className="flex items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-3.5">
            <div className="relative group size-20 shrink-0">
              <CandidateAvatar
                name={name || "Kandidat Baru"}
                avatar={name ? name.slice(0, 2).toUpperCase() : "KB"}
                photoUrl={photoUrl}
                className="size-20 text-xl border border-slate-200 shadow-2xs"
                rounded="rounded-2xl"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900">
                Foto Profil Santri (Opsional)
              </p>
              <p className="text-[0.68rem] text-slate-500">
                Otomatis dioptimasi dan langsung jadi avatar di semua modul.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition">
                  <Camera className="size-3.5 text-red-600" />
                  <span>
                    {uploadingPhoto
                      ? "Memproses..."
                      : photoUrl
                        ? "Ganti Foto"
                        : "Unggah Foto Santri"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingPhoto}
                    className="hidden"
                    onChange={handlePhotoPick}
                  />
                </label>
                {photoUrl ? (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl(undefined)}
                    className="text-xs text-red-600 hover:underline font-semibold"
                  >
                    Hapus Foto
                  </button>
                ) : null}
              </div>
            </div>
          </div>

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
              <div className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-700">
                Putra (Khusus Seleksi Putra)
              </div>
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
                Standar tinggi BPIP Putra: 170–180 cm (Min. 165 cm)
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

export function CandidateDetailView({
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingDocIdx, setUploadingDocIdx] = useState<number | null>(null)

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !candidate) return
    try {
      setUploadingPhoto(true)
      const dataUrl = await compressImageToDataUrl(file)
      updateCandidate(candidate.id, { photoUrl: dataUrl })
    } catch {
      alert("Gagal memproses foto. Pastikan format gambar valid (JPG, PNG, WebP).")
    } finally {
      setUploadingPhoto(false)
      e.target.value = ""
    }
  }

  function handleRemovePhoto() {
    if (!candidate) return
    if (confirm("Hapus foto profil santri ini dan gunakan avatar inisial?")) {
      updateCandidate(candidate.id, { photoUrl: undefined })
    }
  }

  async function handleDocumentUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    docIdx: number,
  ) {
    const file = e.target.files?.[0]
    if (!file || !candidate) return
    try {
      setUploadingDocIdx(docIdx)
      const docData = await readDocumentFileToDataUrl(file)
      const nextFiles = {
        ...(candidate.documentFiles ?? {}),
        [docIdx]: docData,
      }
      const nextDocs = [
        ...(candidate.documents ?? [false, false, false, false, false, false]),
      ]
      nextDocs[docIdx] = true // otomatis centang valid jika file diupload
      updateCandidate(candidate.id, {
        documentFiles: nextFiles,
        documents: nextDocs,
      })
    } catch (err: any) {
      alert(err.message || "Gagal mengunggah berkas.")
    } finally {
      setUploadingDocIdx(null)
      e.target.value = ""
    }
  }

  function handleRemoveDocument(docIdx: number) {
    if (!candidate) return
    if (confirm("Hapus file berkas ini?")) {
      const nextFiles = { ...(candidate.documentFiles ?? {}) }
      delete nextFiles[docIdx]
      updateCandidate(candidate.id, {
        documentFiles: nextFiles,
      })
    }
  }

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
    <div className="mx-auto max-w-5xl space-y-4 animate-in fade-in duration-200">
      {/* Top Back & Breadcrumb Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:border-slate-300 active:scale-95"
        >
          <ArrowLeft className="size-4 text-slate-500 group-hover:text-red-600 transition" />
          <span>Kembali</span>
        </button>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Buku Induk Santri</span>
          <span>/</span>
          <span className="font-bold text-slate-900">{candidate.name}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4 bg-slate-950 p-5 sm:p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="relative group size-16 sm:size-20 shrink-0">
              <CandidateAvatar
                name={candidate.name}
                avatar={candidate.avatar}
                photoUrl={candidate.photoUrl}
                className="size-16 sm:size-20 text-2xl border-2 border-white/20 shadow-md"
                rounded="rounded-2xl"
              />
              <label
                className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/75 opacity-0 group-hover:opacity-100 transition cursor-pointer text-[0.68rem] font-bold text-white text-center p-1"
                title="Klik untuk unggah atau ganti foto profil santri"
              >
                <Camera className="size-4 mb-0.5" />
                <span>{uploadingPhoto ? "Memuat..." : "Ganti Foto"}</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingPhoto}
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </label>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl sm:text-2xl font-bold">
                  {candidate.name}
                </h2>
                <Badge tone={phase1Passed ? "success" : "info"}>
                  Materi {candidate.stage} ·{" "}
                  {selectionStages[candidate.stage - 1]?.shortLabel}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-300">
                {candidate.number} · {candidate.school} · {candidate.gender} ·
                Usia: {age.years} th {age.months} bln
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
              className="!px-3 !py-1.5 !text-xs text-white hover:bg-white/10"
              onClick={onClose}
            >
              <ArrowLeft className="size-4" /> Kembali
            </Button>
          </div>
        </div>

        <div className="flex border-b border-slate-200 bg-slate-50 px-6">
          {([
            ["profile", "Profil & 6 Berkas"],
            ["stages", "Peta Kesiapan 8 Materi"],
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
              {/* Photo & Avatar Card */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4.5 shadow-2xs">
                <div className="flex items-center gap-4">
                  <div className="relative group size-20 sm:size-24 shrink-0">
                    <CandidateAvatar
                      name={candidate.name}
                      avatar={candidate.avatar}
                      photoUrl={candidate.photoUrl}
                      className="size-20 sm:size-24 text-2xl border-2 border-white shadow-md"
                      rounded="rounded-2xl"
                    />
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-bold text-slate-900">
                      Foto Profil &amp; Avatar Santri
                    </h4>
                    <p className="mt-0.5 text-xs text-slate-500 max-w-md">
                      {candidate.photoUrl
                        ? "Foto aktif tersimpan dan otomatis menjadi avatar santri di tabel kandidat, leaderboard, dan kartu cetak."
                        : "Belum ada foto santri. Sistem saat ini menampilkan inisial dua huruf sebagai avatar."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 transition">
                    <Camera className="size-4 text-red-600" />
                    <span>
                      {uploadingPhoto
                        ? "Memproses..."
                        : candidate.photoUrl
                          ? "Ganti Foto"
                          : "Unggah Foto Santri"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingPhoto}
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </label>
                  {candidate.photoUrl ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="!px-3 !py-2 !text-xs text-red-600 hover:bg-red-50"
                      onClick={handleRemovePhoto}
                    >
                      <Trash2 className="size-3.5" /> Hapus Foto
                    </Button>
                  ) : null}
                </div>
              </div>

              {/* Biodata Form */}
              <form onSubmit={saveProfile} className="grid gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Edit Biodata &amp; Data Fisik
                  </h3>
                  <span className="text-xs text-slate-500">
                    Perubahan langsung disimpan ke data aplikasi
                  </span>
                </div>
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
                    <div className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-700">
                      Putra (Khusus Seleksi Putra)
                    </div>
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

              {/* 6 Berkas Pokok Administrasi */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900">
                      Verifikasi &amp; Upload 6 Berkas Administrasi
                    </h3>
                    <p className="text-xs text-slate-500">
                      Unggah dokumen digital (PDF atau Foto gambar) dan tandai verifikasi berkas pokok.
                    </p>
                  </div>
                  <Badge
                    tone={
                      docs.filter(Boolean).length === 6 ? "success" : "warning"
                    }
                  >
                    {docs.filter(Boolean).length}/6 Berkas Valid
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {administrationDocuments.map((doc, idx) => {
                    const checked = Boolean(docs[idx])
                    const file = candidate.documentFiles?.[idx]
                    const isUploadingThis = uploadingDocIdx === idx

                    return (
                      <div
                        key={doc.name}
                        className={`flex flex-col justify-between rounded-xl border p-3.5 text-xs transition ${
                          checked
                            ? "border-emerald-200 bg-emerald-50/50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <label className="flex cursor-pointer items-start gap-2.5">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  toggleCandidateDocument(candidate.id, idx)
                                }
                                className="mt-0.5 size-4 accent-emerald-600 cursor-pointer"
                              />
                              <div>
                                <strong className="block text-slate-900 text-xs font-semibold leading-tight">
                                  {idx + 1}. {doc.name}
                                </strong>
                                <span className="mt-0.5 block text-[0.7rem] text-slate-500">
                                  {doc.detail}
                                </span>
                              </div>
                            </label>
                            <Badge
                              tone={checked ? "success" : "neutral"}
                              className="text-[0.62rem] !py-0.5 shrink-0"
                            >
                              {checked ? "Valid" : "Belum Valid"}
                            </Badge>
                          </div>

                          {file ? (
                            <div className="mt-2.5 flex items-center justify-between rounded-lg border border-emerald-200 bg-white p-2 text-[0.68rem] text-emerald-900 shadow-2xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileCheck2 className="size-4 shrink-0 text-emerald-600" />
                                <div className="truncate">
                                  <p className="font-semibold truncate">{file.name}</p>
                                  <p className="text-[0.62rem] text-slate-400">
                                    {(file.size / 1024).toFixed(0)} KB · {file.uploadedAt}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                          {file ? (
                            <div className="flex items-center gap-2">
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-[0.68rem] font-bold text-emerald-800 hover:bg-emerald-200 transition"
                              >
                                <Eye className="size-3" /> Lihat / Unduh
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRemoveDocument(idx)}
                                className="inline-flex items-center gap-1 text-[0.68rem] text-red-600 hover:underline"
                              >
                                <Trash2 className="size-3" /> Hapus File
                              </button>
                            </div>
                          ) : (
                            <span className="text-[0.68rem] text-slate-400">
                              Belum ada lampiran file
                            </span>
                          )}

                          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[0.68rem] font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition">
                            <Upload className="size-3 text-slate-500" />
                            <span>
                              {isUploadingThis
                                ? "Memuat..."
                                : file
                                  ? "Ganti File"
                                  : "Upload File"}
                            </span>
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              disabled={isUploadingThis}
                              className="hidden"
                              onChange={(e) => handleDocumentUpload(e, idx)}
                            />
                          </label>
                        </div>
                      </div>
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
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-xs text-blue-900">
                <strong>Paradigma Pembinaan &amp; Kesiapan:</strong> Setiap materi latihan bersifat mandiri tanpa sistem gugur. Santri dapat dievaluasi, diberi penguatan, atau ditandai remedial kapan saja untuk persiapan seleksi resmi.
              </div>

              <Input
                label="Catatan perkembangan / hasil evaluasi materi"
                placeholder="Contoh: Berkas terverifikasi lengkap / Perlu drill vokal komando PBB"
                value={stageReason}
                onChange={(e) => setStageReason(e.target.value)}
              />

              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
                {selectionStages.map((stage, idx) => {
                  const st = candidate.stageStatuses[idx] ?? "active"
                  return (
                    <div
                      key={stage.key}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">
                            Materi {stage.id}
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
                            {st === "passed"
                              ? "SIAP"
                              : st === "failed"
                                ? "REMEDIAL"
                                : st === "review"
                                  ? "PENGUATAN"
                                  : st === "active"
                                    ? "PROSES"
                                    : "BELUM DINILAI"}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {stage.phase === 1
                            ? "Standar Kualifikasi Dasar"
                            : "Simulasi Lapangan & Bobot Nilai"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {([
                          ["passed", "Siap Standar"],
                          ["active", "Sedang Dilatih"],
                          ["review", "Perlu Penguatan"],
                          ["failed", "Perlu Remedial"],
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
                  <ArrowLeft className="size-4" /> Kembali
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

export const CandidateDetailModal = CandidateDetailView

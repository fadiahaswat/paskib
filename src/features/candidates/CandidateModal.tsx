import { useEffect, useState } from "react"
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  FileText,
  Paperclip,
  RotateCcw,
  Save,
  ShieldAlert,
  Trash2,
  Upload,
  UserRoundCheck,
  X,
} from "lucide-react"
import {
  Badge,
  Button,
  CandidateAvatar,
  Card,
  Input,
} from "../../components/ui"
import { useApp } from "../../context/AppContext"
import { administrationDocuments } from "../../data/selectionGuide"
import type { IshiharaScreeningResult } from "../ishihara/types"
import {
  bmi,
  evaluateAgeEligibility,
  finalScore,
  selectionStages,
  type Candidate,
  type StageStatus,
} from "../../domain/selection"
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
      setError(
        "Gagal memproses foto. Pastikan format gambar valid (JPG, PNG, WebP).",
      )
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
              <p className="text-2xs text-slate-500">
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

const STAGE_STATUS_CONFIG = {
  passed: {
    label: "Siap Standar",
    shortLabel: "Siap",
    badgeLabel: "SIAP",
    tone: "success" as const,
    icon: CheckCircle2,
    activeClass:
      "bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-600 font-semibold",
  },
  active: {
    label: "Sedang Dilatih",
    shortLabel: "Proses",
    badgeLabel: "PROSES",
    tone: "info" as const,
    icon: Clock,
    activeClass:
      "bg-blue-600 text-white shadow-xs ring-1 ring-blue-600 font-semibold",
  },
  review: {
    label: "Perlu Penguatan",
    shortLabel: "Penguatan",
    badgeLabel: "PENGUATAN",
    tone: "warning" as const,
    icon: AlertCircle,
    activeClass:
      "bg-amber-600 text-white shadow-xs ring-1 ring-amber-600 font-semibold",
  },
  failed: {
    label: "Perlu Remedial",
    shortLabel: "Remedial",
    badgeLabel: "REMEDIAL",
    tone: "danger" as const,
    icon: RotateCcw,
    activeClass:
      "bg-rose-600 text-white shadow-xs ring-1 ring-rose-600 font-semibold",
  },
} as const

type StageAnalysisResult = {
  metricLabel: string
  metricBadgeClass: string
  analysis: string
  coachConsideration: string
  mismatchWarning?: string
}

function getDetailedStageAnalysis(
  stageKey: string,
  status: StageStatus,
  candidate: Candidate,
  ishiharaResults?: IshiharaScreeningResult[],
): StageAnalysisResult {
  const docsUploaded = Object.keys(candidate.documentFiles ?? {}).length
  const docsValid = (candidate.documents ?? []).filter(Boolean).length
  const docsCount = Math.max(docsUploaded, docsValid)

  switch (stageKey) {
    case "administration": {
      const metricLabel =
        docsCount >= 6
          ? "6/6 Berkas Lengkap"
          : docsCount > 0
            ? `${docsCount}/6 Berkas Terunggah`
            : "0/6 Berkas (Kosong)"
      const metricBadgeClass =
        docsCount >= 6
          ? "bg-emerald-100 text-emerald-800"
          : docsCount > 0
            ? "bg-amber-100 text-amber-800"
            : "bg-rose-100 text-rose-800"

      let analysis = ""
      let coachConsideration = ""
      let mismatchWarning: string | undefined

      if (docsCount >= 6) {
        analysis =
          "Seluruh 6 berkas administrasi pokok (KK, Rapor, Akta Kelahiran, Izin Orang Tua, Surat Keterangan Sehat, dan Pas Foto) telah terunggah dan terverifikasi lengkap."
        coachConsideration =
          "Kandidat telah memenuhi seluruh syarat administratif awal dan siap diverifikasi pada registrasi resmi."
      } else if (docsCount > 0) {
        analysis = `Baru ${docsCount} dari 6 berkas pokok yang terunggah/terverifikasi. Masih kurang ${6 - docsCount} berkas wajib yang belum dilengkapi.`
        coachConsideration =
          "Prioritaskan pengunggahan dokumen legalisir rapor, surat izin orang tua, dan surat sehat dari faskes sebelum batas penutupan."
        if (status === "passed") {
          mismatchWarning = `Perhatian: Status ditandai "Siap", namun berkas baru ${docsCount}/6. Standar kelulusan administrasi mensyaratkan 6 berkas lengkap.`
        }
      } else {
        analysis =
          "Belum ada berkas pokok administrasi yang diunggah ke sistem."
        coachConsideration =
          "Segera kumpulkan dokumen persyaratan santri dan unggah scan asli melalui tab Profil & Berkas."
        if (status === "passed") {
          mismatchWarning =
            'Perhatian: Status ditandai "Siap" tetapi belum ada berkas administrasi yang diunggah.'
        }
      }

      return {
        metricLabel,
        metricBadgeClass,
        analysis,
        coachConsideration,
        mismatchWarning,
      }
    }

    case "pip": {
      const hasTaken = candidate.pip !== null
      const score = candidate.pip ?? 0
      const metricLabel = hasTaken
        ? `Skor CAT: ${score}/100`
        : "Belum Ada Tryout CAT"
      const metricBadgeClass = !hasTaken
        ? "bg-slate-100 text-slate-700"
        : score >= 80
          ? "bg-emerald-100 text-emerald-800"
          : score >= 70
            ? "bg-amber-100 text-amber-800"
            : "bg-rose-100 text-rose-800"

      let analysis = ""
      let coachConsideration = ""
      let mismatchWarning: string | undefined

      if (!hasTaken) {
        analysis =
          "Santri belum pernah mengikuti tryout atau simulasi CAT PIP (Pancasila & Wawasan Kebangsaan). Belum ada data baseline nilai."
        coachConsideration =
          "Jadwalkan sesi tryout CAT PIP perdana pada menu Bank Soal CAT untuk mengukur daya serap materi ideologi Pancasila dan UUD 1945."
        if (status === "passed") {
          mismatchWarning =
            'Perhatian: Status ditandai "Siap", namun belum ada rekam nilai tryout CAT Pancasila.'
        }
      } else if (score >= 80) {
        analysis = `Skor tryout terakhir mencapai ${score}/100 (Kategori: Unggul). Melampaui passing grade standar BPIP (≥70).`
        coachConsideration =
          "Pertahankan konsistensi dengan latihan variasi soal studi kasus dan penalaran nilai-nilai kebangsaan."
      } else if (score >= 70) {
        analysis = `Skor tryout terakhir ${score}/100 (Kategori: Memenuhi Ambang Batas). Masih berada pada batas minimal passing grade 70.`
        coachConsideration =
          "Tingkatkan drill pada butir Pancasila, sejarah lambang negara, dan struktur ketatanegaraan agar nilai aman di atas 80."
      } else {
        analysis = `Skor tryout terakhir ${score}/100 (Kategori: Di Bawah Passing Grade). Belum memenuhi batas minimal kelulusan (70).`
        coachConsideration =
          "Wajib remedial mandiri dan pengulangan simulasi tryout CAT PIP minimal 2 kali seminggu."
        if (status === "passed") {
          mismatchWarning = `Perhatian: Nilai CAT ${score} masih di bawah passing grade 70, disarankan status Remedial/Penguatan.`
        }
      }

      return {
        metricLabel,
        metricBadgeClass,
        analysis,
        coachConsideration,
        mismatchWarning,
      }
    }

    case "tiu": {
      const hasTaken = candidate.tiu !== null
      const score = candidate.tiu ?? 0
      const metricLabel = hasTaken
        ? `Skor CAT: ${score}/100`
        : "Belum Ada Tryout CAT"
      const metricBadgeClass = !hasTaken
        ? "bg-slate-100 text-slate-700"
        : score >= 80
          ? "bg-emerald-100 text-emerald-800"
          : score >= 70
            ? "bg-amber-100 text-amber-800"
            : "bg-rose-100 text-rose-800"

      let analysis = ""
      let coachConsideration = ""
      let mismatchWarning: string | undefined

      if (!hasTaken) {
        analysis =
          "Santri belum pernah mengikuti tes simulasi CAT TIU (Tes Intelegensia Umum). Belum ada riwayat kemampuan numerik dan logika."
        coachConsideration =
          "Lakukan simulasi CAT TIU untuk memetakan kecepatan hitung numerik, analogi kata, dan silogisme logika."
        if (status === "passed") {
          mismatchWarning =
            'Perhatian: Status ditandai "Siap", namun belum ada rekam tryout CAT TIU.'
        }
      } else if (score >= 80) {
        analysis = `Skor CAT TIU mencapai ${score}/100 (Kategori: Unggul). Ketepatan penalaran analitis dan kecepatan numerik sangat prima.`
        coachConsideration =
          "Pertahankan manajemen waktu pengerjaan soal (rata-rata 45–50 detik per butir soal)."
      } else if (score >= 70) {
        analysis = `Skor CAT TIU ${score}/100 (Kategori: Cukup). Lolos passing grade minimal, namun rentan pada soal figural dan deret angka panjang.`
        coachConsideration =
          "Beri drill khusus trik eliminasi pilihan jawaban dan rumus cepat aritmatika dasar."
      } else {
        analysis = `Skor CAT TIU ${score}/100 (Kategori: Di Bawah Standar). Nilai belum mencapai passing grade kelulusan.`
        coachConsideration =
          "Perlu bimbingan intensif materi logika deduktif dan perbanyak latihan soal bertempo cepat."
        if (status === "passed") {
          mismatchWarning = `Perhatian: Nilai CAT ${score} masih di bawah passing grade TIU, disarankan Remedial.`
        }
      }

      return {
        metricLabel,
        metricBadgeClass,
        analysis,
        coachConsideration,
        mismatchWarning,
      }
    }

    case "medical": {
      const ishihara = ishiharaResults?.find(
        (r) =>
          r.participantId === candidate.id ||
          (r as any).candidateId === candidate.id,
      )
      const hasMedicalHistory =
        (candidate.anthropometryHistory?.length ?? 0) > 0
      const isNormal =
        ishihara &&
        (ishihara.screeningInterpretation === "normal" ||
          ishihara.selectionDecision === "eligible")

      const anamMetric = candidate.physicalMetrics?.find((m) =>
        m.label.toLowerCase().includes("anamnesis"),
      )

      const metricLabel = ishihara
        ? isNormal
          ? `Ishihara: Bebas Buta Warna${anamMetric ? ` · ${anamMetric.current}` : ""}`
          : `Ishihara: Catatan Khusus${anamMetric ? ` · ${anamMetric.current}` : ""}`
        : anamMetric
          ? `Anamnesis: ${anamMetric.current}`
          : hasMedicalHistory
            ? "Rikkes Awal Tercatat"
            : "Belum Ada Rekam Rikkes"
      const metricBadgeClass = ishihara
        ? isNormal
          ? "bg-emerald-100 text-emerald-800"
          : "bg-rose-100 text-rose-800"
        : anamMetric
          ? (anamMetric.percent >= 70 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")
          : hasMedicalHistory
            ? "bg-blue-100 text-blue-800"
            : "bg-slate-100 text-slate-700"

      let analysis = ""
      let coachConsideration = ""
      let mismatchWarning: string | undefined

      if (!ishihara && !hasMedicalHistory && !anamMetric) {
        analysis =
          "Belum ada catatan skrining kesehatan fisik (Rikkes), Screening Kesehatan mandiri, maupun tes buta warna Ishihara yang terdata di sistem."
        coachConsideration =
          "Arahkan santri/kandidat mengisi Screening Kesehatan di portal dan jadwalkan pemeriksaan kesehatan umum sebelum latihan fisik tinggi."
        if (status === "passed") {
          mismatchWarning =
            'Perhatian: Status ditandai "Siap", namun belum ada catatan pemeriksaan medis/buta warna resmi.'
        }
      } else {
        const ishiharaText = ishihara
          ? isNormal
            ? "Skrining Ishihara: Lolos / Bebas Buta Warna (14/14 benar)."
            : `Skrining Ishihara: Catatan (${ishihara.interpretationLabel}). Perlu pemeriksaan dokter spesialis mata.`
          : "Tes Ishihara belum terekam."
        const anamText = anamMetric
          ? `Sub-nilai Screening Kesehatan: ${anamMetric.current}.`
          : "Screening Kesehatan belum diisi."
        analysis = `${ishiharaText} ${anamText} Kondisi fisik dan tensi darah dalam pemantauan tim pelatih.`
        coachConsideration =
          "Pastikan santri menjaga pola hidrasi, istirahat teratur minimal 7 jam per malam, dan asupan gizi seimbang."
      }

      return {
        metricLabel,
        metricBadgeClass,
        analysis,
        coachConsideration,
        mismatchWarning,
      }
    }

    case "parade": {
      const h = candidate.heightCm ?? 0
      const w = candidate.weightKg ?? 0
      const minH = candidate.gender === "Putri" ? 165 : 170
      const isHeightEligible = h >= minH
      const bmiVal = h > 0 ? (w / Math.pow(h / 100, 2)).toFixed(1) : "0"
      const numBmi = Number(bmiVal)
      const bmiCategory =
        numBmi < 18.5
          ? "Kurang (Underweight)"
          : numBmi <= 24.9
            ? "Ideal (Normal)"
            : numBmi <= 27
              ? "Kelebihan (Overweight)"
              : "Obesitas"

      const metricLabel =
        h > 0
          ? `TB: ${h} cm · BB: ${w} kg · BMI: ${bmiVal}`
          : "Data Fisik Kosong"
      const metricBadgeClass =
        isHeightEligible && numBmi >= 18.5 && numBmi <= 24.9
          ? "bg-emerald-100 text-emerald-800"
          : isHeightEligible
            ? "bg-amber-100 text-amber-800"
            : "bg-rose-100 text-rose-800"

      let analysis = ""
      let coachConsideration = ""
      let mismatchWarning: string | undefined

      if (h <= 0) {
        analysis =
          "Belum ada pengukuran tinggi dan berat badan resmi yang diinput."
        coachConsideration =
          "Lakukan pengukuran antropometri dengan stadiometer terkalibrasi."
      } else if (!isHeightEligible) {
        analysis = `Tinggi badan santri ${h} cm masih di bawah batas kualifikasi minimal ${minH} cm untuk kategori ${candidate.gender}.`
        coachConsideration =
          "Beri program peregangan, hanging exercise, renang, dan evaluasi ulang tinggi badan secara berkala."
        if (status === "passed") {
          mismatchWarning = `Perhatian: Tinggi ${h} cm belum memenuhi syarat minimum ${minH} cm, berisiko gugur di parade resmi.`
        }
      } else {
        analysis = `Tinggi badan ${h} cm memenuhi syarat minimal (≥${minH} cm). Berat ${w} kg dengan BMI ${bmiVal} (${bmiCategory}).`
        coachConsideration =
          "Latih sikap sempurna berdiri lama (30–45 menit), perbaiki simetri bahu, dan pastikan tidak ada postur condong ke depan."
      }

      return {
        metricLabel,
        metricBadgeClass,
        analysis,
        coachConsideration,
        mismatchWarning,
      }
    }

    case "pbb": {
      const hasScore = candidate.pbb !== null
      const score = candidate.pbb ?? 0
      const metricLabel = hasScore
        ? `Nilai Latihan: ${score}/100`
        : "Belum Ada Nilai PBB"
      const metricBadgeClass = !hasScore
        ? "bg-slate-100 text-slate-700"
        : score >= 85
          ? "bg-emerald-100 text-emerald-800"
          : score >= 75
            ? "bg-amber-100 text-amber-800"
            : "bg-rose-100 text-rose-800"

      let analysis = ""
      let coachConsideration = ""
      let mismatchWarning: string | undefined

      if (!hasScore) {
        analysis =
          "Belum ada catatan penilaian latihan PBB (Peraturan Baris Berbaris) di lapangan."
        coachConsideration =
          "Lakukan evaluasi materi PBB dasar: sikap sempurna, istirahat di tempat, hadap kanan/kiri, dan langkah tegap."
        if (status === "passed") {
          mismatchWarning =
            'Perhatian: Status ditandai "Siap", namun belum ada nilai ujian latihan PBB yang terekam.'
        }
      } else if (score >= 85) {
        analysis = `Nilai PBB latihan terakhir: ${score}/100 (Kategori: Sangat Baik / Standar Lolos). Hentakan langkah presisi, tempo stabil, dan aba-aba lantang.`
        coachConsideration =
          "Pertahankan performa, latih adaptasi formasi kelompok besar dan kesiapan sebagai komandan peleton (danton)."
      } else if (score >= 75) {
        analysis = `Nilai PBB latihan terakhir: ${score}/100 (Kategori: Cukup — Belum Sempurna). Gerakan dasar sudah terbentuk namun masih kurang ketukan tegas, presisi ayunan tangan 90°, dan stabilitas tempo langkah tegap.`
        coachConsideration =
          "Tingkatkan drill repetisi gerakan berjalan dan latihan pernapasan vokal komando agar nilai meningkat ke standar unggul (≥80)."
        if (status === "passed") {
          mismatchWarning = `Pertimbangan: Skor PBB ${score} tergolong cukup namun belum sempurna untuk level seleksi (target aman: ≥80).`
        }
      } else {
        analysis = `Nilai PBB latihan terakhir: ${score}/100 (Kategori: Perlu Remedial). Masih sering keliru tempo, ayunan tangan belum seragam, atau vokal aba-aba kurang tegas.`
        coachConsideration =
          "Wajib pembinaan khusus gerakan di tempat secara perorangan sebelum diikutsertakan dalam formasi peleton."
        if (status === "passed") {
          mismatchWarning = `Perhatian: Skor PBB ${score} di bawah standar kelulusan minimal, belum siap untuk seleksi resmi.`
        }
      }

      return {
        metricLabel,
        metricBadgeClass,
        analysis,
        coachConsideration,
        mismatchWarning,
      }
    }

    case "fitness": {
      const hasScore = candidate.fitness !== null
      const score = candidate.fitness ?? 0
      const metricLabel = hasScore
        ? `Nilai Samapta: ${score}/100`
        : "Belum Ada Tes Samapta"
      const metricBadgeClass = !hasScore
        ? "bg-slate-100 text-slate-700"
        : score >= 80
          ? "bg-emerald-100 text-emerald-800"
          : score >= 70
            ? "bg-amber-100 text-amber-800"
            : "bg-rose-100 text-rose-800"

      let analysis = ""
      let coachConsideration = ""
      let mismatchWarning: string | undefined

      if (!hasScore) {
        analysis =
          "Belum ada catatan tes kesamaptaan jasmani resmi (lari 12 menit, push up, sit up, shuttle run)."
        coachConsideration =
          "Jadwalkan tes Cooper lari 12 menit di lintasan standar untuk mengetahui volume aerobik maksimal (VO2Max)."
        if (status === "passed") {
          mismatchWarning =
            'Perhatian: Status ditandai "Siap", namun belum ada rekam nilai fisik Samapta.'
        }
      } else if (score >= 80) {
        analysis = `Nilai Kesamaptaan: ${score}/100 (Kategori: Prima). Daya tahan kardiorespirasi dan kekuatan otot memenuhi standar kuota seleksi.`
        coachConsideration =
          "Pertahankan jadwal lari jarak menengah dan perbanyak pendinginan (stretching) untuk mencegah cedera otot."
      } else if (score >= 70) {
        analysis = `Nilai Kesamaptaan: ${score}/100 (Kategori: Cukup). Lolos ambang batas minimal, namun daya tahan di 3 menit terakhir lari masih menurun.`
        coachConsideration =
          "Tambahkan porsi lari interval (400m x 6 repetisi) dan penguatan otot inti (plank & sit-up)."
      } else {
        analysis = `Nilai Kesamaptaan: ${score}/100 (Kategori: Kurang). Jarak tempuh lari 12 menit dan repetisi push-up belum mencapai batas aman.`
        coachConsideration =
          "Program latihan fisik adaptif bertahap, perbaiki teknik pernapasan dan tingkatkan frekuensi lari mingguan."
        if (status === "passed") {
          mismatchWarning = `Perhatian: Nilai Samapta ${score} belum mencapai batas aman seleksi.`
        }
      }

      return {
        metricLabel,
        metricBadgeClass,
        analysis,
        coachConsideration,
        mismatchWarning,
      }
    }

    case "personality": {
      const hasScore = candidate.personality !== null
      const score = candidate.personality ?? 0
      const att = candidate.attendance ?? 90
      const comp = candidate.trainingCompliance ?? 85
      const metricLabel = hasScore
        ? `Wawancara: ${score}/100`
        : `Disiplin: Kehadiran ${att}%`
      const metricBadgeClass = hasScore
        ? score >= 80
          ? "bg-emerald-100 text-emerald-800"
          : "bg-amber-100 text-amber-800"
        : att >= 90
          ? "bg-blue-100 text-blue-800"
          : "bg-amber-100 text-amber-800"

      let analysis = ""
      let coachConsideration = ""
      let mismatchWarning: string | undefined

      if (!hasScore) {
        analysis = `Belum dilakukan simulasi wawancara kepribadian resmi. Rekam kedisiplinan harian: kehadiran latihan ${att}% dan kepatuhan instruksi ${comp}%.`
        coachConsideration =
          "Lakukan simulasi wawancara tatap muka: uji pengenalan diri, motivasi santri, adab, dan penelusuran rekam jejak santri."
        if (status === "passed") {
          mismatchWarning =
            'Perhatian: Status ditandai "Siap", namun sesi wawancara formal kepribadian belum dilaksanakan.'
        }
      } else if (score >= 80) {
        analysis = `Nilai Kepribadian & Wawancara: ${score}/100 (Kategori: Terpuji). Artikulasi bahasa jelas, adab santri santun, dan integritas mental ideologi mantap.`
        coachConsideration =
          "Perkuat wawasan isu aktual nasional dan keistimewaan daerah Yogyakarta untuk persiapan seleksi tingkat lanjut."
      } else {
        analysis = `Nilai Wawancara: ${score}/100 (Kategori: Cukup). Masih terlihat gugup saat menjawab dan gestur tubuh kurang tenang.`
        coachConsideration =
          "Latih eye contact, intonasi suara yang lugas, dan simulasi menjawab pertanyaan pancingan dari penguji."
      }

      return {
        metricLabel,
        metricBadgeClass,
        analysis,
        coachConsideration,
        mismatchWarning,
      }
    }

    default:
      return {
        metricLabel: "Standar Materi",
        metricBadgeClass: "bg-slate-100 text-slate-700",
        analysis: "Materi dalam pemantauan rutin pelatih.",
        coachConsideration:
          "Lanjutkan pemantauan perkembangan santri secara berkala.",
      }
  }
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
    ishiharaResults,
  } = useApp()

  const candidate = allCandidates.find((c) => c.id === candidateId) ?? null
  const [tab, setTab] = useState<"profile" | "stages">("profile")

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
      alert(
        "Gagal memproses foto. Pastikan format gambar valid (JPG, PNG, WebP).",
      )
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
  }, [candidate])

  if (!candidate) return null

  const age = evaluateAgeEligibility(candidate.birthDate, activeCycle.year)
  const bmiInfo = bmi(candidate.weightKg ?? 0, candidate.heightCm ?? 0)
  const score = finalScore(candidate)
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
      {/* Wadah Navigasi & Nama Kandidat (Berdampingan Rapi Tanpa Jarak Kosong) */}
      <Card className="border border-slate-200/90 bg-white p-2.5 sm:p-3 shadow-2xs">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="group inline-flex items-center gap-1.5 sm:gap-2 rounded-xl border border-slate-200/90 bg-slate-50/70 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-red-50 hover:border-red-200 hover:text-red-700 active:scale-95 shrink-0"
          >
            <ArrowLeft className="size-3.5 sm:size-4 text-slate-500 group-hover:text-red-600 transition" />
            <span>Kembali</span>
          </button>
          <span className="h-4 w-px bg-slate-200 shrink-0" />
          <span className="font-bold text-xs sm:text-sm text-slate-900 truncate min-w-0">
            {candidate.name}
          </span>
        </div>
      </Card>

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
                className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/75 opacity-0 group-hover:opacity-100 transition cursor-pointer text-2xs font-bold text-white text-center p-1"
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
              <h2 className="font-display text-xl sm:text-2xl font-bold">
                {candidate.name}
              </h2>
              <p className="mt-1 text-xs text-slate-300">
                {candidate.number} · {candidate.school} · {candidate.gender} ·
                Usia: {age.years} th {age.months} bln
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="!px-3 !py-1.5 !text-xs text-white hover:bg-white/10"
              onClick={onClose}
            >
              <ArrowLeft className="size-4" /> Kembali
            </Button>
          </div>
        </div>

        {/* Segmented Control Navigasi 2 Tab Bersih, Rapi & Lega */}
        <div className="border-b border-slate-200/80 bg-slate-50/70 p-2 sm:p-3">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200/60 p-1">
            {[
              {
                id: "profile" as const,
                label: "Profil & Berkas",
                shortLabel: "Profil",
                icon: FileCheck2,
              },
              {
                id: "stages" as const,
                label: "Kesiapan Materi",
                shortLabel: "Materi",
                icon: Activity,
              },
            ].map(({ id, label, shortLabel, icon: TabIcon }) => {
              const active = tab === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2 sm:py-2.5 px-3 text-xs sm:text-sm font-semibold transition-all duration-150 active:scale-[0.99] min-w-0 ${
                    active
                      ? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/5 font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  <TabIcon
                    className={`size-4 shrink-0 transition ${
                      active ? "text-red-600" : "text-slate-400"
                    }`}
                  />
                  <span className="whitespace-nowrap sm:hidden">
                    {shortLabel}
                  </span>
                  <span className="hidden whitespace-nowrap sm:inline">
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-4 sm:p-6">
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
                      Unggah dokumen digital (PDF atau Foto gambar) dan tandai
                      verifikasi berkas pokok.
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
                          <div className="flex items-start justify-between gap-2.5">
                            <label className="flex cursor-pointer items-start gap-2.5 min-w-0 flex-1">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  toggleCandidateDocument(candidate.id, idx)
                                }
                                className="mt-0.5 size-4 accent-emerald-600 cursor-pointer shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <strong className="block text-slate-900 text-xs font-semibold leading-tight">
                                  {idx + 1}. {doc.name}
                                </strong>
                                <span className="mt-0.5 block text-2xs text-slate-500 leading-snug">
                                  {doc.detail}
                                </span>
                              </div>
                            </label>
                            <Badge
                              tone={checked ? "success" : "neutral"}
                              className="text-3xs px-2.5 py-0.5 shrink-0 whitespace-nowrap font-bold"
                            >
                              {checked ? "Valid" : "Belum Valid"}
                            </Badge>
                          </div>

                          {file ? (
                            <div className="mt-2.5 flex items-center justify-between rounded-lg border border-emerald-200 bg-white p-2 text-2xs text-emerald-900 shadow-2xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileCheck2 className="size-4 shrink-0 text-emerald-600" />
                                <div className="truncate">
                                  <p className="font-semibold truncate">
                                    {file.name}
                                  </p>
                                  <p className="text-3xs text-slate-400">
                                    {(file.size / 1024).toFixed(0)} KB ·{" "}
                                    {file.uploadedAt}
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
                                className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-2xs font-bold text-emerald-800 hover:bg-emerald-200 transition"
                              >
                                <Eye className="size-3" /> Lihat / Unduh
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRemoveDocument(idx)}
                                className="inline-flex items-center gap-1 text-2xs text-red-600 hover:underline"
                              >
                                <Trash2 className="size-3" /> Hapus File
                              </button>
                            </div>
                          ) : (
                            <span className="text-2xs text-slate-400">
                              Belum ada lampiran file
                            </span>
                          )}

                          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-2xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition">
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
              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/90 bg-white">
                {selectionStages.map((stage, idx) => {
                  const st = candidate.stageStatuses[idx] ?? "active"
                  const currentConfig = STAGE_STATUS_CONFIG[
                    (st as keyof typeof STAGE_STATUS_CONFIG)
                  ] ?? {
                    label: "Belum Dinilai",
                    badgeLabel: "BELUM DINILAI",
                    tone: "neutral" as const,
                    icon: Clock,
                    activeClass:
                      "bg-slate-800 text-white shadow-xs ring-1 ring-slate-800 font-semibold",
                  }
                  const CurrentIcon = currentConfig.icon
                  const analysis = getDetailedStageAnalysis(
                    stage.key,
                    st,
                    candidate,
                    ishiharaResults,
                  )

                  return (
                    <div
                      key={stage.key}
                      className="p-4 transition sm:p-5 hover:bg-slate-50/50"
                    >
                      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                              Materi {stage.id}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900">
                              {stage.label}
                            </h4>
                          </div>
                          <p className="text-xs text-slate-500">
                            {stage.phase === 1
                              ? "Standar Kualifikasi Dasar"
                              : "Simulasi Lapangan & Bobot Nilai"}
                          </p>
                        </div>

                        <Badge
                          tone={currentConfig.tone}
                          className="self-start gap-1.5 px-3 py-1 text-xs font-semibold sm:self-center"
                        >
                          <CurrentIcon className="size-3.5 shrink-0" />
                          <span>{currentConfig.badgeLabel}</span>
                        </Badge>
                      </div>

                      {/* Uraian Kesiapan & Analisis Terperinci Berdasarkan Data Latihan */}
                      <div
                        className={`mt-3.5 space-y-2.5 rounded-xl border p-3.5 text-xs transition ${
                          st === "passed"
                            ? "border-emerald-200/90 bg-emerald-50/50 text-emerald-950"
                            : st === "active"
                              ? "border-blue-200/90 bg-blue-50/50 text-blue-950"
                              : st === "review"
                                ? "border-amber-200/90 bg-amber-50/50 text-amber-950"
                                : st === "failed"
                                  ? "border-rose-200/90 bg-rose-50/50 text-rose-950"
                                  : "border-slate-200 bg-slate-50 text-slate-800"
                        }`}
                      >
                        {/* Header Analisis: Riwayat Latihan / Data Terakhir */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 pb-2">
                          <div className="flex items-center gap-1.5 font-bold">
                            <CurrentIcon className="size-4 shrink-0 opacity-80" />
                            <span>Rekam &amp; Latihan Terakhir:</span>
                          </div>
                          <span
                            className={`rounded-md px-2 py-0.5 text-2xs font-bold ${analysis.metricBadgeClass}`}
                          >
                            {analysis.metricLabel}
                          </span>
                        </div>

                        {/* Uraian Evaluasi & Pertimbangan */}
                        <div className="space-y-1.5 leading-relaxed">
                          <p>
                            <span className="font-bold">
                              Analisis Kesiapan:{" "}
                            </span>
                            <span className="font-normal opacity-90">
                              {analysis.analysis}
                            </span>
                          </p>

                          <p>
                            <span className="font-bold">
                              Pertimbangan Pelatih:{" "}
                            </span>
                            <span className="font-normal opacity-90">
                              {analysis.coachConsideration}
                            </span>
                          </p>
                        </div>

                        {/* Peringatan jika status belum sinkron dengan fakta */}
                        {analysis.mismatchWarning ? (
                          <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-300/80 bg-amber-100/90 p-2.5 text-2xs font-medium text-amber-950">
                            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-amber-700" />
                            <span>{analysis.mismatchWarning}</span>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {([
                          "passed",
                          "active",
                          "review",
                          "failed",
                        ] as keyof typeof STAGE_STATUS_CONFIG[]).map(
                          (statusVal) => {
                            const config = STAGE_STATUS_CONFIG[statusVal]
                            const Icon = config.icon
                            const isSelected = st === statusVal
                            return (
                              <button
                                key={statusVal}
                                type="button"
                                onClick={() =>
                                  updateCandidateStage(
                                    candidate.id,
                                    idx,
                                    statusVal,
                                  )
                                }
                                className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition active:scale-[0.98] ${
                                  isSelected
                                    ? config.activeClass
                                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                              >
                                <Icon className="size-3.5 shrink-0" />
                                <span className="whitespace-nowrap sm:hidden">
                                  {config.shortLabel}
                                </span>
                                <span className="hidden whitespace-nowrap sm:inline">
                                  {config.label}
                                </span>
                              </button>
                            )
                          },
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export const CandidateDetailModal = CandidateDetailView

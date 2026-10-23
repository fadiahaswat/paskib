import { useState } from "react"
import {
  BookOpenCheck,
  Check,
  ClipboardCheck,
  Dumbbell,
  HeartPulse,
  ShieldAlert,
  Target,
} from "lucide-react"
import { Badge, Card } from "../../components/ui"
import {
  administrationDocuments,
  anamnesisItems,
  dosDonts,
  fitnessTables,
  pipRpul,
  pipTopics,
  pbbRubric,
  tiuTopics,
  weeklyProgram,
} from "../../data/selectionGuide"

type Tab = "architecture" | "pip" | "tiu" | "medical" | "fitness" | "field"
type TableRows = ReadonlyArray<ReadonlyArray<string>>

const tabs: { id: Tab, label: string, icon: typeof Target }[] = [
  {
    id: "architecture",
    label: "Arsitektur & Administrasi",
    icon: ClipboardCheck,
  },
  { id: "pip", label: "PIP / TWK", icon: BookOpenCheck },
  { id: "tiu", label: "TIU 11 Materi", icon: Target },
  { id: "medical", label: "Rikkes & Parade", icon: HeartPulse },
  { id: "fitness", label: "PBB & Samapta", icon: Dumbbell },
  { id: "field", label: "Strategi & Program", icon: ShieldAlert },
]

function SectionTitle({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string
  title: string
  detail: string
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-red-600">
        {eyebrow}
      </p>
      <h2 className="mt-1 font-display text-2xl font-bold text-slate-950">
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
        {detail}
      </p>
    </div>
  )
}

function DataTable({ headers, rows }: { headers: string[], rows: TableRows }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="bg-slate-950 text-white">
          <tr>
            {headers.map((header) => (
              <th
                className="px-4 py-3 text-xs font-bold uppercase tracking-wider"
                key={header}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr
              className="odd:bg-white even:bg-slate-50/70"
              key={`${row[0]}-${index}`}
            >
              {row.map((cell, cellIndex) => (
                <td
                  className={`px-4 py-3 ${
                    cellIndex === 0
                      ? "font-semibold text-slate-900"
                      : "text-slate-600"
                  }`}
                  key={`${cell}-${cellIndex}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function GuideView() {
  const [tab, setTab] = useState<Tab>("architecture")
  return (
    <div className="grid gap-4 sm:gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-950">
              Panduan Seleksi 2026/2027
            </h1>
            <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/10">
              Basis Pengetahuan Pelatih
            </span>
          </div>
          <p className="mt-0.5 max-w-3xl text-xs text-slate-500">
            Referensi kronologis, standar latihan, dan matriks lapangan yang menjadi dasar seluruh form simulasi.
          </p>
        </div>
        <Badge tone="warning">Baseline internal · perlu pengesahan</Badge>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
        <div className="flex gap-3">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" />
          <p>
            Angka mengikuti dokumen yang diberikan, tetapi tidak otomatis
            dianggap ketentuan resmi BPIP 2026/2027. Konflik cutoff usia dan
            tabel parsial harus disahkan sebelum eliminasi produksi.
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-200">
          {tabs.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex min-w-max items-center gap-2 px-5 py-4 text-sm font-bold transition ${
                  tab === item.id
                    ? "border-b-2 border-red-600 bg-red-50 text-red-700"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Icon className="size-4" /> {item.label}
              </button>
            )
          })}
        </div>
      </Card>

      {tab === "architecture" ? (
        <div className="grid gap-6">
          <SectionTitle
            eyebrow="Bagian I & Tahap 1"
            title="Arsitektur hard-lock dan administrasi"
            detail="Tahap 1–5 menggugurkan kandidat secara bertingkat. Tahap 6–8 membentuk nilai akhir 30% PBB, 30% Samapta, dan 40% Kepribadian."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {administrationDocuments.map((document, index) => (
              <Card className="p-5" key={document.name}>
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-red-50 text-sm font-bold text-red-700">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {document.name}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
                      {document.detail}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Card className="p-5 sm:p-6">
            <h3 className="font-display text-lg font-bold text-slate-900">
              Validasi umur per 17 Agustus
            </h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {[
                ["2026", "17 Agustus 2010", "17 Agustus 2008"],
                ["2027", "17 Agustus 2011", "17 Agustus 2009"],
              ].map(([year, min, max]) => (
                <div className="rounded-2xl bg-slate-50 p-5" key={year}>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Penugasan {year}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-slate-800">
                    {min} s.d. {max}
                  </p>
                  <p className="mt-2 text-xs text-amber-700">
                    Belum terverifikasi: tanggal batas berkonflik dengan
                    definisi usia &lt;18.
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "pip" ? (
        <div className="grid gap-6">
          <SectionTitle
            eyebrow="Tahap 2"
            title="CAT PIP / Wawasan Kebangsaan"
            detail="50 soal, durasi 45–60 menit, benar 2 poin, salah/kosong 0, dan passing grade 70."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {pipTopics.map((topic) => (
              <Card className="p-5" key={topic.name}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold text-slate-900">{topic.name}</p>
                  <Badge tone="info">{topic.weight}%</Badge>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  {topic.detail}
                </p>
              </Card>
            ))}
          </div>
          <Card className="p-5 sm:p-6">
            <h3 className="font-display text-lg font-bold text-slate-900">
              RPUL dan pengetahuan wajib
            </h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {pipRpul.map((item) => (
                <div
                  className="flex gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700"
                  key={item}
                >
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "tiu" ? (
        <div className="grid gap-6">
          <SectionTitle
            eyebrow="Tahap 3"
            title="Sebelas submateri TIU"
            detail="Peta verbal, numerik, logika, analitis, dan figural untuk membentuk blueprint tryout."
          />
          <DataTable
            headers={["Submateri", "Kemampuan", "Pola soal"]}
            rows={tiuTopics}
          />
          <div className="grid gap-4 md:grid-cols-2">
            {[
              [
                "Perbandingan berbalik",
                "Tambahan pekerja = (hari berhenti × pekerja awal) ÷ sisa hari.",
              ],
              [
                "Papasan beda waktu",
                "Kurangi jarak awal, lalu bagi sisa jarak dengan jumlah kecepatan.",
              ],
              [
                "Posisi melingkar",
                "Tetapkan titik jangkar, lalu isi relasi berhadapan dan bersebelahan.",
              ],
              [
                "Silogisme",
                "Premis partikular menghasilkan kesimpulan partikular; premis negatif menuntut kesimpulan negatif.",
              ],
            ].map(([title, detail]) => (
              <Card className="p-5" key={title}>
                <p className="font-bold text-slate-900">{title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {detail}
                </p>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "medical" ? (
        <div className="grid gap-6">
          <SectionTitle
            eyebrow="Tahap 4 & 5"
            title="Rikkes, anamnesis, dan Parade"
            detail="Pemeriksaan vital, mata, gigi, THT, 21 riwayat penyakit, antropometri, dan rangka."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Tensi", "110/70–125/85", ">140/90 hard-fail draft"],
              ["Nadi", "60–85 bpm", "Irama sinus reguler"],
              ["Visus", "6/6", "Buta warna hard-fail"],
              ["Gigi", "≤5 karies", "Gigi depan utuh"],
            ].map(([name, value, detail]) => (
              <Card className="p-5" key={name}>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {name}
                </p>
                <p className="mt-2 font-display text-xl font-bold text-slate-950">
                  {value}
                </p>
                <p className="mt-2 text-xs text-slate-500">{detail}</p>
              </Card>
            ))}
          </div>
          <DataTable
            headers={["Riwayat penyakit", "Evaluasi"]}
            rows={anamnesisItems}
          />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Tinggi", "Standar Putra: 170–180 cm (Min. 165 cm di Kab/Kota)"],
              ["BMI", "18,5–24,9 normal · ≥30 obesitas"],
              ["Rangka", "Celah kaki <5 cm · tidak flat foot · bahu simetris"],
            ].map(([title, detail]) => (
              <Card className="p-5" key={title}>
                <p className="font-bold text-slate-900">{title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {detail}
                </p>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "fitness" ? (
        <div className="grid gap-6">
          <SectionTitle
            eyebrow="Tahap 6 & 7"
            title="PBB dan tabel lengkap Samapta"
            detail="Rubric PBB berkontribusi 30%. Lima tes Samapta dikonversi ke nilai sebelum agregasi."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {pbbRubric.map(([title, detail]) => (
              <Card className="p-5" key={title}>
                <p className="font-bold text-slate-900">{title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {detail}
                </p>
              </Card>
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            {[
              ["Lari 12 menit", fitnessTables.run],
              ["Push-up", fitnessTables.pushup],
              ["Sit-up", fitnessTables.situp],
              ["Back-up", fitnessTables.backup],
              ["Shuttle run", fitnessTables.shuttle],
            ].map(([title, rows]) => (
              <div key={title as string}>
                <h3 className="mb-3 font-display font-bold text-slate-900">
                  {title as string}
                </h3>
                <DataTable
                  headers={["Hasil", "Nilai", "Kategori"]}
                  rows={rows as TableRows}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "field" ? (
        <div className="grid gap-6">
          <SectionTitle
            eyebrow="Bagian IX & X"
            title="Strategi lapangan dan program mingguan"
            detail="Matriks operasional untuk mencegah kesalahan teknis dan menjaga siklus latihan seimbang."
          />
          <DataTable
            headers={["Tahap", "Wajib dilakukan", "Harus dihindari"]}
            rows={dosDonts}
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {weeklyProgram.map(([day, title, detail]) => (
              <Card className="p-5" key={day}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-red-600">
                    {day}
                  </p>
                  <Badge tone={day === "Minggu" ? "success" : "neutral"}>
                    {day === "Minggu" ? "Recovery" : "Latihan"}
                  </Badge>
                </div>
                <p className="mt-3 font-bold text-slate-900">{title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {detail}
                </p>
              </Card>
            ))}
          </div>
          <Card className="p-5 sm:p-6">
            <h3 className="font-display text-lg font-bold text-slate-900">
              Tips hari-H lapangan
            </h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                "Karbohidrat kompleks 90 menit sebelum tes.",
                "Gunakan sepatu yang sudah broken-in.",
                "Warm-up dinamis 15 menit dan 3–4 strides.",
                "Hidrasi bertahap dengan teguk kecil.",
              ].map((item) => (
                <div
                  className="flex gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700"
                  key={item}
                >
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

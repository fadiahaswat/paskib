export const administrationDocuments = [
  {
    name: "Kartu Keluarga Asli",
    detail: "Validasi 16 digit NIK dan alamat domisili peserta.",
  },
  {
    name: "Izin Kepala Sekolah",
    detail: "Format BPIP, tanda tangan basah, dan stempel dinas.",
  },
  {
    name: "Izin Orang Tua/Wali",
    detail: "Meterai fisik Rp10.000 dan tanda tangan mengenai meterai.",
  },
  {
    name: "Surat Pernyataan",
    detail: "Kesediaan mematuhi aturan program dan bermeterai.",
  },
  {
    name: "Salinan Rapor",
    detail: "Kelas X semester berjalan, legalisir basah, minimal Baik.",
  },
  {
    name: "Pas Foto Resmi",
    detail: "Seragam sekolah dan latar merah/putih sesuai juklak.",
  },
]

export const pipTopics = [
  {
    name: "Sejarah & Filosofi Pancasila",
    weight: 30,
    detail: "BPUPKI, Panitia Sembilan, Piagam Jakarta, PPKI, dan 1 Juni 1945.",
  },
  {
    name: "Nilai & Pengamalan Sila",
    weight: 30,
    detail: "Dilema etika, toleransi, persatuan, musyawarah, dan keadilan.",
  },
  {
    name: "UUD NRI 1945 & Konstitusi",
    weight: 20,
    detail: "Pembukaan, lembaga negara, HAM, bela negara, dan simbol negara.",
  },
  {
    name: "NKRI, Wasantara & Moderasi",
    weight: 20,
    detail: "Bhinneka, Deklarasi Djuanda, ancaman, dan integrasi nasional.",
  },
]

export const pipRpul = [
  "Husein Mutahar dan sejarah Paskibraka 1946",
  "Formasi 17–8–45",
  "Bendera Pusaka dan pengibar 1945",
  "Filosofi Teratai: Belajar, Bekerja, Berbakti",
  "Lagu nasional dan penciptanya",
  "38 provinsi, DOB Papua, IKN, laut teritorial, dan ZEE",
]

export const tiuTopics = [
  [
    "Sinonim & Antonim",
    "Verbal Kosakata",
    "Kata serapan, istilah ilmiah, dan KBBI.",
  ],
  [
    "Analogi Kata",
    "Verbal Asosiasi",
    "Fungsi, sebab-akibat, spesialisasi, dan bahan baku.",
  ],
  [
    "Pemahaman Bacaan",
    "Verbal Analisis",
    "Ide pokok, simpulan, kalimat tidak padu, fakta/opini.",
  ],
  [
    "Aritmatika & Hitung Cepat",
    "Numerik Aljabar",
    "Pecahan, desimal, akar, dan persen.",
  ],
  [
    "Perbandingan Nilai",
    "Numerik Terapan",
    "Pekerja-waktu, proyek, dan konsumsi.",
  ],
  [
    "Kecepatan, Jarak & Waktu",
    "Numerik Kinematika",
    "Papasan, menyusul, dan beda waktu.",
  ],
  [
    "Aritmatika Sosial",
    "Numerik Bisnis",
    "Untung-rugi, diskon, tara-neto-bruto, bunga.",
  ],
  [
    "Deret Angka & Huruf",
    "Numerik Logika",
    "Pola bertingkat, Fibonacci, dan interval abjad.",
  ],
  [
    "Silogisme",
    "Logika Formal",
    "Premis universal/partikular, ponens, dan tollens.",
  ],
  [
    "Penalaran Analitis",
    "Logika Spasial",
    "Posisi duduk, ranking, dan jadwal.",
  ],
  [
    "Figural",
    "Visual Spasial",
    "Rotasi, pencerminan, serial pola, dan matriks.",
  ],
] as const

export const anamnesisItems = [
  [
    "ISPA kronis >4 kali setahun",
    "Risiko fungsi pernapasan saat aktivitas lapangan.",
  ],
  ["Telinga berdenging/keluar cairan", "Gangguan pendengaran instruksi."],
  ["Asma kambuhan/riwayat TBC", "Kondisi kritis kardiorespirasi."],
  ["Insomnia/gangguan tidur parah", "Risiko kelelahan motorik."],
  ["Varises menonjol", "Risiko saat berdiri lama."],
  ["Gangguan bicara berat", "Menghambat pelaporan dan vokal."],
  ["Ambeien/perdarahan cerna", "Nyeri saat gerakan hentakan."],
  ["Nyeri tulang belakang", "Indikasi skoliosis/HNP."],
  ["Maag kronis/GERD", "Risiko mual saat latihan."],
  ["Patah tulang dengan pen", "Memerlukan evaluasi dokter bedah."],
  ["Nyeri dada/aritmia", "Kondisi kritis aktivitas berat."],
  ["Obat rutin selain vitamin", "Indikasi penyakit aktif."],
  ["Penyakit ginjal/kemih", "Memerlukan evaluasi medis."],
  ["Operasi besar bius umum", "Perlu evaluasi masa pemulihan."],
  ["Migrain >1 kali seminggu", "Risiko vertigo."],
  ["Pingsan 3 bulan terakhir", "Indikasi sinkop/ketahanan buruk."],
  ["Merokok/vaping", "Penurunan fungsi kardiorespirasi."],
  ["Kejang/epilepsi", "Kondisi kritis mutlak."],
  ["Alkohol/narkoba", "Kondisi kritis hukum dan kesehatan."],
  ["Karies >5 gigi", "Fokus infeksi aktif."],
  ["Alergi makanan/obat berat", "Risiko anafilaksis."],
] as const

export const criticalAnamnesis = new Set([2, 10, 17, 18])

export const fitnessTables = {
  run: [
    [">= 3.000 m", "100", "Sempurna"],
    ["2.900–2.999 m", "95", "Sangat Baik"],
    ["2.800–2.899 m", "90", "Standar Unggul"],
    ["2.700–2.799 m", "85", "Baik Sekali"],
    ["2.600–2.699 m", "80", "Baik"],
    ["2.500–2.599 m", "75", "Cukup Baik"],
    ["2.400–2.499 m", "70", "Batas Aman"],
    ["2.200–2.399 m", "60", "Kurang"],
    ["2.000–2.199 m", "50", "Sangat Kurang"],
    ["< 2.000 m", "<40", "TMS"],
  ],
  pushup: [
    [">= 43", "100", "Sempurna"],
    ["40–42", "93", "Sangat Baik"],
    ["37–39", "86", "Baik Sekali"],
    ["34–36", "79", "Baik"],
    ["31–33", "72", "Cukup"],
    ["28–30", "65", "Batas Minimal"],
    ["24–27", "55", "Kurang"],
    ["< 20", "<35", "TMS"],
  ],
  situp: [
    [">= 40", "100", "Sempurna"],
    ["37–39", "92", "Sangat Baik"],
    ["34–36", "84", "Baik Sekali"],
    ["31–33", "76", "Baik"],
    ["28–30", "68", "Cukup Baik"],
    ["25–27", "60", "Batas Minimal"],
    ["< 21", "<40", "TMS"],
  ],
  backup: [
    [">= 45", "100", "Sempurna"],
    ["41–44", "90", "Sangat Baik"],
    ["37–40", "80", "Baik Sekali"],
    ["33–36", "70", "Batas Aman"],
    ["29–32", "60", "Batas Minimal"],
    ["< 25", "<40", "TMS"],
  ],
  shuttle: [
    ["<= 15,4 dtk", "100", "Sempurna"],
    ["15,5–16,0", "92", "Sangat Baik"],
    ["16,1–16,6", "84", "Baik Sekali"],
    ["16,7–17,2", "76", "Baik"],
    ["17,3–17,8", "68", "Cukup"],
    ["17,9–18,5", "60", "Batas Minimal"],
    ["> 19,5", "<40", "TMS"],
  ],
} as const

export const pbbRubric = [
  [
    "PBB Statis (12 Gerakan)",
    "Gerakan di Tempat (Sikap Sempurna, Penghormatan, Istirahat), Perubahan Arah di Tempat (Hadap Kanan/Kiri, Serong, Balik Kanan), dan Berpindah Tempat.",
  ],
  [
    "PBB Dinamis (9 Gerakan)",
    "Gerakan Berjalan (Jalan di Tempat, Langkah Biasa, Langkah Tegap) dan Perubahan Arah Berjalan (Belok Kanan/Kiri, 2x Belok, Tiap Banjar 2x Belok).",
  ],
  [
    "Komandan (4 Item)",
    "Volume dan kekuatan suara, sikap, artikulasi & intonasi, serta ketepatan aba-aba.",
  ],
]

export const weeklyProgram = [
  [
    "Senin",
    "Kardio Interval & PBB Statis",
    "Drill 45 menit + interval 6×400 m target 1:35/lap.",
  ],
  [
    "Selasa",
    "Strength & Core",
    "Push-up 4×25, sit-up 4×25, back-up 4×30, plank.",
  ],
  [
    "Rabu",
    "PBB Dinamis & Shuttle",
    "Langkah tegap 96 BPM, vokal, shuttle run 6×10 m.",
  ],
  ["Kamis", "Simulasi Lari 12 Menit", "Target 7,5 putaran atau 3.000 meter."],
  ["Jumat", "Tryout CAT & Wawancara", "PIP dan TIU 50 soal + simulasi STAR."],
  ["Sabtu", "Simulasi Lapangan", "PBB terpadu dilanjutkan Samapta penuh."],
  [
    "Minggu",
    "Recovery & Nutrisi",
    "Active recovery, protein, hidrasi, tidur 8 jam.",
  ],
]

export const dosDonts = [
  [
    "Administrasi",
    "Scan asli, cek meterai, sinkronkan nama/tanggal lahir.",
    "Berkas buram, meterai palsu, file >2 MB.",
  ],
  [
    "CAT PIP/TIU",
    "Latihan hitung, kerjakan soal cepat, jaga perangkat.",
    "Terpaku >90 detik, membuka tab lain.",
  ],
  [
    "Kesehatan",
    "Tambal gigi, istirahat 8 jam, hidrasi cukup.",
    "Kopi/energi, begadang, merokok/vaping.",
  ],
  [
    "Parade",
    "Peregangan, BMI ideal, latihan postur.",
    "Lutut menekuk, bahu merosot, kaki menyeret.",
  ],
  [
    "PBB",
    "Kunci lutut, diafragma, tempo 96 BPM.",
    "Melirik, vokal tenggorokan, ayunan bengkok.",
  ],
  [
    "Samapta",
    "Pace stabil, teknik repetisi sah, warm-up.",
    "Sprint awal, gerakan tidak sah, pegang tiang.",
  ],
  [
    "Kepribadian",
    "Gunakan STAR, audit medsos, jaga integritas.",
    "Akun private, konten SARA, jawaban bohong.",
  ],
]

export function fitnessScore(type: keyof typeof fitnessTables, raw: number) {
  if (!raw || raw <= 0) return 0
  if (type === "run") {
    if (raw >= 3000) return 100
    if (raw >= 2900) return 95
    if (raw >= 2800) return 90
    if (raw >= 2700) return 85
    if (raw >= 2600) return 80
    if (raw >= 2500) return 75
    if (raw >= 2400) return 70
    if (raw >= 2200) return 60
    if (raw >= 2000) return 50
    if (raw >= 1600) return 35
    if (raw >= 1200) return 20
    return 10
  }
  if (type === "pushup") {
    if (raw >= 43) return 100
    if (raw >= 40) return 93
    if (raw >= 37) return 86
    if (raw >= 34) return 79
    if (raw >= 31) return 72
    if (raw >= 28) return 65
    if (raw >= 24) return 55
    if (raw >= 20) return 40
    if (raw >= 10) return 20
    return 10
  }
  if (type === "situp") {
    if (raw >= 40) return 100
    if (raw >= 37) return 92
    if (raw >= 34) return 84
    if (raw >= 31) return 76
    if (raw >= 28) return 68
    if (raw >= 25) return 60
    if (raw >= 21) return 40
    if (raw >= 10) return 20
    return 10
  }
  if (type === "backup") {
    if (raw >= 45) return 100
    if (raw >= 41) return 90
    if (raw >= 37) return 80
    if (raw >= 33) return 70
    if (raw >= 29) return 60
    if (raw >= 25) return 40
    if (raw >= 10) return 20
    return 10
  }
  if (raw <= 15.4) return 100
  if (raw <= 16) return 92
  if (raw <= 16.6) return 84
  if (raw <= 17.2) return 76
  if (raw <= 17.8) return 68
  if (raw <= 18.5) return 60
  if (raw <= 19.5) return 40
  if (raw <= 22) return 20
  return 10
}

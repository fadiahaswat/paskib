import type { CatQuestion } from "../domain/selection"

const categories = [
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
] as const

const vocab = [
  ["akurat", "Tepat", "Keliru"],
  ["adaptif", "Mudah menyesuaikan", "Kaku"],
  ["andal", "Tepercaya", "Rapuh"],
  ["arogan", "Sombong", "Rendah hati"],
  ["autentik", "Asli", "Palsu"],
  ["bijaksana", "Arif", "Ceroboh"],
  ["cermat", "Teliti", "Lalai"],
  ["dinamis", "Bergerak maju", "Statis"],
  ["efisien", "Tepat guna", "Boros"],
  ["elastis", "Lentur", "Kaku"],
  ["esensial", "Mendasar", "Tambahan"],
  ["fana", "Sementara", "Abadi"],
  ["gamblang", "Jelas", "Samar"],
  ["genting", "Kritis", "Sepele"],
  ["harmonis", "Selaras", "Bertentangan"],
  ["ideal", "Sesuai cita-cita", "Timpang"],
  ["implisit", "Tersirat", "Tersurat"],
  ["inklusif", "Terbuka", "Eksklusif"],
  ["inovatif", "Kebaruan kreatif", "Konvensional"],
  ["integral", "Menyeluruh", "Terpisah"],
  ["intensif", "Sungguh-sungguh", "Longgar"],
  ["jenaka", "Menggelitik", "Serius"],
  ["konsisten", "Ajek", "Berubah-ubah"],
  ["kontinu", "Berkelanjutan", "Terputus"],
  ["kredibel", "Dapat dipercaya", "Meragukan"],
  ["krusial", "Sangat penting", "Sepele"],
  ["lugas", "Apa adanya", "Berbelit-belit"],
  ["labil", "Goyah", "Stabil"],
  ["moderat", "Berimbang", "Ekstrem"],
  ["mutakhir", "Terbaru", "Usang"],
  ["objektif", "Tidak memihak", "Subjektif"],
  ["optimum", "Paling baik", "Minimum"],
  ["orisinal", "Tulen", "Tiruan"],
  ["parsial", "Sebagian", "Menyeluruh"],
  ["progresif", "Berhaluan maju", "Regresif"],
  ["relevan", "Bersangkut-paut", "Menyimpang"],
  ["ringkas", "Padat singkat", "Bertele-tele"],
  ["sahih", "Valid", "Cacat"],
  ["sporadis", "Kadang-kadang", "Merata"],
  ["stagnan", "Mandek", "Berkembang"],
  ["subtil", "Halus", "Kasar"],
  ["transparan", "Terbuka jelas", "Tertutup"],
  ["universal", "Berlaku umum", "Khusus"],
  ["valid", "Sah", "Batal"],
  ["variatif", "Beragam", "Seragam"],
  ["visioner", "Berpandangan jauh", "Rabun dekat"],
  ["waspada", "Siaga", "Lengah"],
  ["yakin", "Mantap percaya", "Bimbang"],
  ["zenit", "Titik puncak", "Titik dasar"],
  ["absah", "Resmi sah", "Ilegal"],
] as const

const analogies = [
  ["Dokter", "Pasien", "Guru", "Murid", "Obat", "Sekolah", "Buku"],
  ["Penulis", "Buku", "Pelukis", "Lukisan", "Kanvas", "Warna", "Galeri"],
  ["Kompas", "Arah", "Termometer", "Suhu", "Cuaca", "Jarak", "Waktu"],
  ["Padi", "Beras", "Tebu", "Gula", "Garam", "Gandum", "Minyak"],
  ["Mata", "Melihat", "Telinga", "Mendengar", "Berbicara", "Berjalan", "Berpikir"],
  ["Kapal", "Laut", "Pesawat", "Udara", "Rel", "Stasiun", "Jalan"],
  ["Menit", "Jam", "Sentimeter", "Meter", "Kilogram", "Liter", "Derajat"],
  ["Benih", "Tanaman", "Telur", "Ayam", "Sarang", "Bulu", "Pakan"],
  ["Rajin", "Tekun", "Hemat", "Cermat", "Malas", "Boros", "Ceroboh"],
  ["Haus", "Minum", "Lapar", "Makan", "Tidur", "Bangun", "Berlari"],
  ["Indonesia", "Jakarta", "Jepang", "Tokyo", "Asia", "Kyoto", "Osaka"],
  ["Pagi", "Siang", "Fajar", "Senja", "Malam", "Subuh", "Petang"],
  ["Roda", "Mobil", "Sayap", "Pesawat", "Mesin", "Bensin", "Rem"],
  ["Sapu", "Membersihkan", "Gunting", "Memotong", "Menjahit", "Menempel", "Mengukur"],
  ["Api", "Panas", "Es", "Dingin", "Air", "Cair", "Uap"],
  ["Arsitek", "Bangunan", "Nakhoda", "Kapal", "Pelabuhan", "Penumpang", "Laut"],
  ["Kata", "Kalimat", "Nada", "Lagu", "Huruf", "Paragraf", "Suara"],
  ["Pohon", "Hutan", "Ikan", "Laut", "Daun", "Akar", "Sungai"],
  ["Kunci", "Pintu", "Kata sandi", "Akun", "Gembok", "Pagar", "Rumah"],
  ["Fotografer", "Kamera", "Koki", "Wajan", "Pisau", "Makanan", "Restoran"],
] as const

const passages: ReadonlyArray<{
  text: string
  conclusion: string
  distractors: [string, string, string, string]
}> = [
  {
    text: "Perpustakaan sekolah memperpanjang jam layanan selama pekan ujian. Jumlah pengunjung meningkat, sehingga pengelola menambah meja belajar dan petugas piket.",
    conclusion: "Penambahan fasilitas dilakukan untuk mengimbangi kenaikan pengunjung.",
    distractors: [
      "Perpanjangan jam layanan menyebabkan minat baca siswa menurun saat pekan ujian.",
      "Pengelola menambah meja belajar terlebih dahulu sebelum memperpanjang jam layanan.",
      "Seluruh petugas piket perpustakaan digantikan oleh sistem layanan mandiri.",
      "Kenaikan jumlah pengunjung hanya terjadi di luar masa pelaksanaan ujian sekolah.",
    ],
  },
  {
    text: "Sebuah desa memasang penampung air hujan di beberapa rumah. Saat musim kemarau, persediaan air warga lebih terjaga dan penggunaan air tanah berkurang.",
    conclusion: "Penampungan air hujan membantu menjaga ketersediaan air saat kemarau.",
    distractors: [
      "Pemasangan penampung air hujan meningkatkan ketergantungan warga pada air tanah.",
      "Persediaan air warga saat musim kemarau tetap berkurang meskipun ada penampung hujan.",
      "Seluruh rumah di desa diwajibkan menutup sumur air tanah secara permanen.",
      "Penampung air hujan hanya bermanfaat untuk mencegah genangan pada musim penghujan.",
    ],
  },
  {
    text: "Toko roti mencatat banyak roti tersisa setiap sore. Pemilik lalu membuat ukuran produksi berdasarkan rata-rata penjualan harian dan jumlah pesanan.",
    conclusion: "Penyesuaian produksi bertujuan mengurangi sisa roti harian.",
    distractors: [
      "Pemilik toko menambah jumlah produksi sore hari tanpa melihat catatan penjualan.",
      "Roti yang tersisa setiap sore disebabkan oleh keterlambatan bahan baku harian.",
      "Toko roti menghentikan seluruh layanan pesanan agar fokus pada penjualan langsung.",
      "Rata-rata penjualan harian menurun drastis setelah ukuran produksi disesuaikan.",
    ],
  },
  {
    text: "Jalur sepeda baru dibangun menuju pusat kota. Setelah enam bulan, semakin banyak pekerja bersepeda dan kepadatan kendaraan pada jam sibuk menurun.",
    conclusion: "Tersedianya jalur sepeda mendorong perubahan moda perjalanan pekerja.",
    distractors: [
      "Pembangunan jalur sepeda memperparah kemacetan kendaraan bermotor pada jam sibuk.",
      "Para pekerja beralih menggunakan sepeda sebelum jalur sepeda menuju kota dibangun.",
      "Kendaraan bermotor dilarang melintas sama sekali menuju pusat kota setelah enam bulan.",
      "Penurunan kepadatan lalu lintas hanya berlangsung pada akhir pekan di luar jam kerja.",
    ],
  },
  {
    text: "Kelompok tani menguji beberapa jenis benih pada petak yang sama luasnya. Mereka mencatat hasil panen dan kebutuhan air setiap jenis sebelum memilih benih untuk musim berikutnya.",
    conclusion: "Pemilihan benih didasarkan pada perbandingan hasil panen dan kebutuhan air.",
    distractors: [
      "Kelompok tani memilih benih musim berikutnya hanya berdasarkan harga benih termurah.",
      "Pengujian benih dilakukan pada petak sawah dengan luas lahan yang berbeda-beda.",
      "Jenis benih yang membutuhkan air paling banyak selalu menghasilkan panen tertinggi.",
      "Pencatatan kebutuhan air dilakukan setelah benih ditanam secara massal musim berikutnya.",
    ],
  },
  {
    text: "Museum menyediakan pemandu audio dalam beberapa bahasa. Pengunjung asing lebih mudah memahami koleksi, sementara jumlah pertanyaan kepada petugas berkurang.",
    conclusion: "Pemandu audio memperluas akses informasi koleksi bagi pengunjung museum.",
    distractors: [
      "Penyediaan pemandu audio membuat pengunjung asing lebih sering bertanya kepada petugas.",
      "Petugas museum dilarang memberikan penjelasan langsung kepada pengunjung domestik.",
      "Pemandu audio hanya disediakan dalam satu bahasa pengantar bagi seluruh wisatawan.",
      "Jumlah pengunjung asing di museum menurun setelah pemandu audio mulai diterapkan.",
    ],
  },
  {
    text: "Perusahaan memberi kesempatan kerja dari rumah dua hari setiap pekan. Pegawai melaporkan waktu perjalanan yang lebih singkat, sedangkan rapat daring dijadwalkan lebih teratur.",
    conclusion: "Pengaturan kerja baru mengurangi waktu perjalanan dan menata koordinasi.",
    distractors: [
      "Seluruh pegawai bekerja dari rumah penuh selama sepekan tanpa datang ke kantor.",
      "Kebijakan kerja dari rumah menyebabkan jadwal rapat koordinasi menjadi tidak menentu.",
      "Waktu tempuh perjalanan pegawai ke kantor justru bertambah panjang setiap pekan.",
      "Perusahaan menghapus seluruh rapat daring agar pegawai fokus menyelesaikan tugas mandiri.",
    ],
  },
  {
    text: "Kota menanam pohon peneduh di sepanjang trotoar. Pada siang hari, suhu permukaan di ruas tersebut lebih rendah dibandingkan ruas tanpa pepohonan.",
    conclusion: "Pepohonan peneduh membantu menurunkan suhu permukaan di kawasan trotoar.",
    distractors: [
      "Ruas trotoar tanpa pepohonan memiliki suhu permukaan lebih sejuk pada siang hari.",
      "Penanaman pohon peneduh hanya berdampak pada penurunan suhu saat malam hari.",
      "Suhu permukaan jalan di seluruh ruas kota menjadi sama setelah pohon ditanam.",
      "Pohon peneduh ditanam untuk menggantikan fungsi jalur pejalan kaki di pusat kota.",
    ],
  },
  {
    text: "Koperasi menyediakan catatan pemasukan dan pengeluaran yang dapat dilihat seluruh anggota. Pertanyaan mengenai penggunaan dana berkurang setelah laporan dibagikan rutin.",
    conclusion: "Keterbukaan laporan meningkatkan pemahaman anggota tentang keuangan koperasi.",
    distractors: [
      "Pembagian laporan rutin membuat anggota semakin meragukan pengelolaan dana koperasi.",
      "Catatan pemasukan dan pengeluaran koperasi hanya boleh diakses oleh ketua pengurus.",
      "Pertanyaan anggota berkurang karena koperasi melarang pembahasan dana dalam rapat.",
      "Laporan keuangan baru dibagikan apabila terdapat selisih pengeluaran akhir tahun.",
    ],
  },
  {
    text: "Pusat kesehatan mengirim pengingat jadwal pemeriksaan melalui pesan singkat. Jumlah pasien yang datang sesuai jadwal meningkat pada bulan berikutnya.",
    conclusion: "Pengingat pesan singkat meningkatkan ketepatan kehadiran pasien sesuai jadwal.",
    distractors: [
      "Pengiriman pesan singkat menyebabkan banyak pasien membatalkan jadwal pemeriksaan.",
      "Peningkatan kehadiran pasien terjadi sebelum layanan pengingat pesan singkat dimulai.",
      "Pusat kesehatan mengganti seluruh pemeriksaan tatap muka menjadi konsultasi pesan singkat.",
      "Layanan pengingat jadwal hanya dikirimkan kepada pasien yang terlambat bulan lalu.",
    ],
  },
]

const names = ["Alya", "Bima", "Citra", "Damar", "Elin"]
const syllogismGroups = [
  ["burung", "hewan", "makhluk hidup"],
  ["mawar", "tumbuhan", "organisme"],
  ["bus kota", "kendaraan", "alat transportasi"],
  ["novel", "buku", "bahan bacaan"],
  ["dokter", "tenaga kesehatan", "pekerja"],
  ["piano", "alat musik", "benda"],
  ["apel", "buah", "bahan pangan"],
  ["elang", "unggas", "hewan"],
  ["persegi", "bangun datar", "bentuk geometris"],
  ["perak", "logam", "bahan"],
] as const

const money = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`
const fmtDec = (n: number) => (Number.isInteger(n) ? String(n) : String(n).replace(".", ","))

const makeOptions = (answer: string | number, distractors: (string | number)[], seed: number) => {
  const correct = String(answer)
  const wrong = [...new Set(distractors.map(String).filter((value) => value !== correct))]

  let fallbackCounter = 1
  while (wrong.length < 4) {
    let candidate = ""
    const numMatch = correct.match(/-?[\d.,]+/)
    if (numMatch) {
      const normalized = numMatch[0].replace(/\./g, "").replace(",", ".")
      const num = parseFloat(normalized)
      if (!Number.isNaN(num)) {
        const sign = fallbackCounter % 2 === 0 ? 1 : -1
        const stepIdx = Math.ceil(fallbackCounter / 2)
        if (correct.startsWith("Rp")) {
          const delta = stepIdx * Math.max(5_000, Math.round(Math.abs(num) * 0.1))
          const val = Math.max(5_000, num + sign * delta)
          candidate = money(val)
        } else if (correct.endsWith("km/jam")) {
          const val = Math.max(10, Math.round(num + sign * stepIdx * 8))
          candidate = `${val} km/jam`
        } else if (correct.endsWith("jam")) {
          const val = Math.max(0.5, num + sign * stepIdx * 0.5)
          candidate = `${fmtDec(val)} jam`
        } else if (correct.endsWith("km")) {
          const val = Math.max(10, Math.round(num + sign * stepIdx * 12))
          candidate = `${val} km`
        } else if (correct.endsWith("%")) {
          const val = Math.max(5, Math.round(num + sign * stepIdx * 5))
          candidate = `${val}%`
        } else {
          const val = Math.round(num + sign * stepIdx * 4)
          candidate = String(val === num ? val + 7 : val)
        }
      }
    }

    if (candidate && candidate !== correct && !wrong.includes(candidate)) {
      wrong.push(candidate)
    }
    fallbackCounter += 1
    if (fallbackCounter > 40) break
  }

  const values = [correct, ...wrong.slice(0, 4)]
  const correctIndex = seed % 5
  values[0] = values[correctIndex]
  values[correctIndex] = correct
  return { options: values, correctIndex }
}

function buildQuestion(index: number): CatQuestion {
  const cat = Math.floor(index / 200)
  const n = index % 200
  const seed = index + 150
  let question = ""
  let answer: string | number = ""
  let distractors: (string | number)[] = []
  let explanation = ""

  if (cat === 0) {
    const [word, synonym, antonym] = vocab[Math.floor(n / 4)]
    const form = n % 4
    const target = form < 2 ? synonym : antonym
    const opposite = target === synonym ? antonym : synonym
    const variants = [
      `Pilih padanan kata yang paling tepat untuk kata “${word}”.`,
      `Arti kata “${word}” yang paling dekat adalah ....`,
      `Lawan kata yang paling tepat dari “${word}” adalah ....`,
      `Kata yang maknanya berlawanan dengan “${word}” ialah ....`,
    ]
    question = variants[form]
    answer = target
    const otherWords: string[] = []
    let vOffset = 1
    while (otherWords.length < 4) {
      const v = vocab[(Math.floor(n / 4) + vOffset * 7) % vocab.length]
      const cand = vOffset % 2 === 0 ? v[1] : v[2]
      if (cand !== target && cand !== opposite && !otherWords.includes(cand)) {
        otherWords.push(cand)
      }
      vOffset++
    }
    distractors = [opposite, ...otherWords.slice(0, 3)]
    explanation = `Kata “${word}” bermakna ${synonym.toLowerCase()}; lawan katanya adalah ${antonym.toLowerCase()}.`
  } else if (cat === 1) {
    const row = analogies[Math.floor(n / 10)]
    const form = n % 10
    const a = row[0]
    const b = row[1]
    const c = row[2]
    const d = row[3]
    const reverse = form >= 5
    const x = reverse ? c : a
    const y = reverse ? d : b
    const z = reverse ? a : c
    const forms = [
      `Hubungan kata ${x} dan ${y} sepadan dengan hubungan kata ${z} dan ....`,
      `${x} : ${y} = ${z} : ....`,
      `Jika ${x} berhubungan dengan ${y}, kata yang melengkapi pasangan ${z} : .... adalah ....`,
      `Pasangan kata yang memiliki hubungan sama dengan ${x} : ${y} ialah ${z} : ....`,
      `Lengkapilah analogi berikut: ${x} terhadap ${y} seperti ${z} terhadap ....`,
    ]
    question = forms[form % forms.length]
    answer = reverse ? b : d
    distractors = [row[4], row[5], row[6], reverse ? d : b]
    explanation = reverse
      ? `${c} berhubungan dengan ${d}; dengan pola yang sama, ${a} berhubungan dengan ${b}.`
      : `${a} berhubungan dengan ${b}; dengan pola yang sama, ${c} berhubungan dengan ${d}.`
  } else if (cat === 2) {
    const item = passages[Math.floor(n / 20)]
    const form = n % 20
    const prompts = [
      "Simpulan yang paling sesuai dengan bacaan tersebut adalah ....",
      "Gagasan utama bacaan tersebut ialah ....",
      "Pernyataan yang paling didukung oleh isi bacaan adalah ....",
      "Hubungan sebab-akibat yang tampak dalam bacaan adalah ....",
      "Alasan utama tindakan dalam bacaan tersebut dilakukan ialah ....",
      "Dampak langsung yang dijelaskan berdasarkan bacaan itu adalah ....",
      "Informasi yang selaras dengan fakta dalam bacaan adalah ....",
      "Tujuan langkah yang ditempuh dalam bacaan tersebut adalah ....",
      "Inti persoalan dan solusi yang tergambar dalam bacaan adalah ....",
      "Simpulan logis yang tepat berdasarkan bacaan tersebut ialah ....",
      "Kebijakan dalam bacaan tersebut terutama bermanfaat untuk ....",
      "Pernyataan yang paling tepat merangkum bacaan tersebut ialah ....",
      "Apa hasil perubahan yang dijelaskan dalam bacaan tersebut?",
      "Apa pertimbangan rasional di balik langkah pada bacaan tersebut?",
      "Bagaimana langkah dalam bacaan tersebut membantu mengatasi masalah?",
      "Apa pokok informasi yang disampaikan penulis melalui bacaan?",
      "Kesimpulan yang sahih dari uraian teks tersebut adalah ....",
      "Perubahan keadaan pada teks tersebut menunjukkan bahwa ....",
      "Ringkasan paling akurat atas peristiwa dalam teks ialah ....",
      "Keterkaitan antara tindakan dan hasil pada bacaan adalah ....",
    ]
    question = `Bacalah teks berikut!\n${item.text}\n${prompts[form]}`
    answer = item.conclusion
    distractors = [...item.distractors]
    explanation = item.conclusion
  } else if (cat === 3) {
    const a = 18 + ((n * 7) % 83)
    const b = 12 + ((n * 11) % 67)
    const c = 3 + (n % 9)
    const form = n % 5
    const ops = [
      `${a} + ${b} × ${c}`,
      `${a} × ${c} + ${b}`,
      `${a} × ${b} − ${c}`,
      `(${a} + ${b}) × ${c}`,
      `${a} × ${c} − ${b}`,
    ]
    const results = [a + b * c, a * c + b, a * b - c, (a + b) * c, a * c - b]
    question = `Berapakah hasil dari ${ops[form]}?`
    const res = results[form]
    answer = res
    distractors = [res + c, res - c, res + 2 * c + 3, res - (b % 9) - 4]
    explanation = `Kerjakan perkalian atau tanda kurung terlebih dahulu sebelum penjumlahan/pengurangan. Hasilnya ${res}.`
  } else if (cat === 4) {
    const a = 3 + (n % 15)
    const b = 4 + ((n * 5) % 16)
    const c = 5 + ((n * 7) % 19)
    const d = 6 + ((n * 11) % 21)
    const form = n % 5
    let left = ""
    let right = ""
    let lv = 0
    let rv = 0
    if (form === 0) {
      left = `${a}/${b}`
      right = `${c}/${d}`
      lv = a / b
      rv = c / d
    } else if (form === 1) {
      left = `${a * 5}% dari 240`
      right = `${b * 4}% dari 250`
      lv = (a * 5 * 240) / 100
      rv = (b * 4 * 250) / 100
    } else if (form === 2) {
      left = `${a + 4}² − ${a}²`
      right = `${8 * a + 12}`
      lv = (a + 4) * (a + 4) - a * a
      rv = 8 * a + 12
    } else if (form === 3) {
      const k = 2 + (n % 4)
      left = `${a * k}/${b * k}`
      right = `${a}/${b}`
      lv = a / b
      rv = a / b
    } else {
      left = `${a * 6} × 1/3`
      right = `${b * 4} × 1/2`
      lv = a * 2
      rv = b * 2
    }
    const isEqual = Math.abs(lv - rv) < 1e-9
    const rel = isEqual ? "P = Q" : lv > rv ? "P > Q" : "P < Q"
    const dDoubleRight = Math.abs(lv - 2 * rv) < 1e-9 ? "P = 3Q" : "P = 2Q"
    const dDoubleLeft = Math.abs(2 * lv - rv) < 1e-9 ? "3P = Q" : "2P = Q"
    answer = rel
    question = `Perhatikan dua kuantitas berikut!\nP = ${left}\nQ = ${right}\nHubungan kuantitatif yang tepat antara P dan Q adalah ....`
    distractors = ["P > Q", "P < Q", "P = Q", dDoubleLeft, dDoubleRight].filter((x) => x !== rel)
    explanation = `Nilai P = ${ Number.isInteger(lv) ? lv : lv.toFixed(3).replace(".", ",") } dan nilai Q = ${ Number.isInteger(rv) ? rv : rv.toFixed(3).replace(".", ",") }, sehingga hubungan yang tepat adalah ${rel}.`
  } else if (cat === 5) {
    const speeds = [36, 40, 44, 48, 50, 52, 56, 60, 64, 68, 70, 72, 76, 80, 84, 88, 90, 96]
    const durations = [1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
    const speed = speeds[n % speeds.length]
    const hours = durations[Math.floor(n / speeds.length) % durations.length]
    const distance = Math.round(speed * hours)
    const hLabel = fmtDec(hours)
    const form = n % 3
    question =
      form === 0
        ? `Sebuah kendaraan melaju dengan kecepatan rata-rata ${speed} km/jam selama ${hLabel} jam. Berapa jarak yang ditempuh?`
        : form === 1
          ? `Jarak sejauh ${distance} km ditempuh dengan kecepatan rata-rata ${speed} km/jam. Berapa lama waktu tempuh perjalanannya?`
          : `Sebuah kendaraan menempuh jarak ${distance} km dalam waktu ${hLabel} jam. Berapa kecepatan rata-rata kendaraan tersebut?`
    answer = form === 0 ? `${distance} km` : form === 1 ? `${hLabel} jam` : `${speed} km/jam`
    distractors =
      form === 0
        ? [
            `${distance + 18} km`,
            `${Math.max(24, distance - 18)} km`,
            `${distance + 36} km`,
            `${Math.max(16, distance - 36)} km`,
          ]
        : form === 1
          ? [
              `${fmtDec(Math.max(0.5, hours - 0.5))} jam`,
              `${fmtDec(hours + 0.5)} jam`,
              `${fmtDec(hours + 1)} jam`,
              `${fmtDec(hours > 1.5 ? hours - 1 : hours + 1.5)} jam`,
            ]
          : [
              `${speed + 8} km/jam`,
              `${Math.max(20, speed - 8)} km/jam`,
              `${speed + 16} km/jam`,
              `${Math.max(16, speed - 16)} km/jam`,
            ]
    explanation = `Gunakan hubungan jarak = kecepatan × waktu: ${distance} km = ${speed} km/jam × ${hLabel} jam.`
  } else if (cat === 6) {
    const base = 80_000 + n * 15_000
    const pct = [10, 15, 20, 25, 30][Math.floor(n / 4) % 5]
    const form = n % 4
    const result =
      form === 0
        ? (base * (100 - pct)) / 100
        : form === 1
          ? (base * (100 + pct)) / 100
          : (base * pct) / 100
    question =
      form === 0
        ? `Sebuah barang seharga ${money(base)} mendapat diskon ${pct}%. Berapa harga yang harus dibayar setelah diskon?`
        : form === 1
          ? `Modal pembelian sebuah barang adalah ${money(base)} dan dijual dengan keuntungan ${pct}%. Berapa harga jual barang tersebut?`
          : form === 2
            ? `Berapakah nilai dari ${pct}% atas dana sebesar ${money(base)}?`
            : `Harga sebuah perlengkapan ${money(base)} didiskon sebesar ${pct}%. Berapa nominal potongan harganya?`
    answer = money(result)
    const d1 = result + (base * 5) / 100
    const d2 = Math.max(5_000, result - (base * 5) / 100)
    const d3 = result + (base * 10) / 100
    const d4 = Math.max(5_000, result - (base * 10) / 100)
    distractors = [
      money(d1),
      money(d2),
      money(d3),
      money(d4 === result || d4 === d2 ? result + 15_000 : d4),
    ]
    explanation = `Nilai ${pct}% dari ${money(base)} adalah ${money((base * pct) / 100)}, sehingga jawaban yang tepat ialah ${money(result)}.`
  } else if (cat === 7) {
    const form = n % 5
    if (form === 4) {
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
      const lStep = 2 + (Math.floor(n / 5) % 4)
      const startIdx = Math.floor(n / 5) % (26 - lStep * 4)
      const seqLetters = [0, 1, 2, 3].map((k) => alphabet[startIdx + k * lStep])
      const ansIdx = startIdx + 4 * lStep
      const ansLetter = alphabet[ansIdx]
      question = `Tentukan huruf berikutnya dari deret berikut: ${seqLetters.join(", ")}, ....`
      answer = ansLetter
      const candIndices = [
        ansIdx - 1,
        ansIdx + 1,
        ansIdx - 2,
        ansIdx + 2,
        ansIdx - 3,
        ansIdx + 3,
        ansIdx - 4,
        ansIdx + 4,
      ].filter((idx) => idx >= 0 && idx < 26 && idx !== ansIdx)
      distractors = candIndices.slice(0, 4).map((idx) => alphabet[idx])
      explanation = `Setiap suku maju ${lStep} huruf dalam abjad, sehingga setelah ${seqLetters[3]} adalah ${ansLetter}.`
    } else {
      const start = 3 + n * 2
      const step = 3 + ((n * 3) % 10)
      const ratio = 2 + (n % 3)
      const seq =
        form === 0
          ? [start, start + step, start + 2 * step, start + 3 * step, start + 4 * step]
          : form === 1
            ? [start, start * ratio, start * ratio ** 2, start * ratio ** 3]
            : form === 2
              ? [start, start + 2, start + 6, start + 12, start + 20]
              : [start, start + 5, start + step, start + 5 + step, start + 2 * step, start + 5 + 2 * step]
      const result =
        form === 0
          ? start + 5 * step
          : form === 1
            ? start * ratio ** 4
            : form === 2
              ? start + 30
              : start + 3 * step
      question = `Tentukan bilangan berikutnya pada deret: ${seq.join(", ")}, ....`
      answer = result
      const dSet = new Set<number>()
      const deltas = [step, -step, step * 2, -step * 2, ratio * 2, -(ratio + 2), step + 4, -(step - 1), 6, -6, 10, -10]
      for (const d of deltas) {
        const val = result + d
        if (val > 0 && val !== result) {
          dSet.add(val)
          if (dSet.size === 4) break
        }
      }
      while (dSet.size < 4) {
        dSet.add(result + dSet.size * 3 + 4)
      }
      distractors = Array.from(dSet)
      explanation =
        form === 0
          ? `Deret aritmatika bertambah tetap sebesar ${step} pada setiap langkah.`
          : form === 1
            ? `Deret geometri dikalikan ${ratio} pada setiap langkah berikutnya.`
            : form === 2
              ? "Selisih antarsuku berturut-turut bertambah +2, +4, +6, +8, lalu +10."
              : `Deret larik ganda berselang-seling di mana suku ganjil bertambah ${step} setiap dua langkah.`
    }
  } else if (cat === 8) {
    const [a, b, c] = syllogismGroups[Math.floor(n / 20)]
    const form = n % 4
    const variant = Math.floor(n / 4) % 5
    const lead = [
      "Perhatikan premis berikut.",
      "Diketahui pernyataan berikut.",
      "Dalam suatu penalaran, berlaku ketentuan berikut.",
      "Cermati hubungan antarkelompok berikut.",
      "Berdasarkan informasi berikut,",
    ][variant]
    if (form === 0) {
      question = `${lead} Semua ${a} adalah ${b}. Semua ${b} adalah ${c}. Kesimpulan yang pasti benar adalah ....`
      answer = `Semua ${a} adalah ${c}.`
      distractors = [
        `Semua ${c} adalah ${a}.`,
        `Tidak ada ${a} yang ${c}.`,
        `Sebagian ${c} bukan ${b}.`,
        `Semua ${b} adalah ${a}.`,
      ]
      explanation = `Jika seluruh ${a} termasuk ${b}, dan seluruh ${b} termasuk ${c}, maka seluruh ${a} termasuk ${c}.`
    } else if (form === 1) {
      question = `${lead} Tidak ada ${a} yang ${b}. Sebagian ${c} adalah ${a}. Kesimpulan yang pasti benar adalah ....`
      answer = `Sebagian ${c} bukan ${b}.`
      distractors = [
        `Semua ${c} adalah ${b}.`,
        `Semua ${b} adalah ${a}.`,
        `Sebagian ${b} adalah ${c}.`,
        `Tidak ada ${c} yang ${a}.`,
      ]
      explanation = `Bagian ${c} yang termasuk ${a} tidak mungkin termasuk ${b}.`
    } else if (form === 2) {
      question = `${lead} Sebagian ${a} adalah ${b}. Semua ${b} adalah ${c}. Kesimpulan yang tepat adalah ....`
      answer = `Sebagian ${a} adalah ${c}.`
      distractors = [
        `Semua ${a} adalah ${c}.`,
        `Tidak ada ${a} yang ${c}.`,
        `Semua ${c} adalah ${b}.`,
        `Sebagian ${c} bukan ${b}.`,
      ]
      explanation = `Anggota ${a} yang termasuk ${b} juga termasuk ${c}.`
    } else {
      question = `${lead} Semua ${a} adalah ${b}. Tidak ada ${b} yang ${c}. Kesimpulan yang pasti benar adalah ....`
      answer = `Tidak ada ${a} yang ${c}.`
      distractors = [
        `Semua ${c} adalah ${a}.`,
        `Sebagian ${a} adalah ${c}.`,
        `Semua ${b} adalah ${a}.`,
        `Sebagian ${c} adalah ${b}.`,
      ]
      explanation = `Karena seluruh ${a} termasuk ${b}, sedangkan ${b} tidak beririsan dengan ${c}, maka ${a} tidak beririsan dengan ${c}.`
    }
  } else {
    const people = [...names]
    let rank = n % 120
    const order: string[] = []
    const remaining = [...people]
    for (let size = remaining.length; size > 0; size -= 1) {
      let factorial = 1
      for (let k = 2; k < size; k += 1) factorial *= k
      const choice = Math.floor(rank / factorial)
      rank %= factorial
      order.push(remaining.splice(choice, 1)[0])
    }
    const clues = [
      `${order[0]} berada sebelum ${order[1]}.`,
      `${order[1]} berada sebelum ${order[2]}.`,
      `${order[2]} berada sebelum ${order[3]}.`,
      `${order[3]} berada sebelum ${order[4]}.`,
    ]
    const pos = [0, 1, 2, 3, 4][Math.floor(n / 4) % 5]
    const context = [
      "menyusun laporan secara berurutan",
      "tiba di garis akhir secara berurutan",
      "mempresentasikan hasil kerja secara berurutan",
      "memilih jadwal tampil secara berurutan",
      "mengisi giliran pelayanan secara berurutan",
      "menerima nomor penghargaan secara berurutan",
      "menjalani tahap seleksi secara berurutan",
    ][Math.floor(n / 5) % 7]
    question = `Lima peserta, ${people.join(", ")}, ${context}.\n${clues.join(" ")} Siapakah yang berada di urutan ke-${pos + 1}?`
    answer = order[pos]
    distractors = people.filter((x) => x !== answer).slice(0, 4)
    explanation = `Urutan lengkap berdasarkan petunjuk adalah ${order.join(" – ")}; urutan ke-${pos + 1} ditempati ${answer}.`
  }

  const arranged = makeOptions(answer, distractors, seed)
  return {
    id: `tiu-${String(151 + index).padStart(4, "0")}`,
    type: "tiu",
    category: categories[cat],
    question,
    options: arranged.options,
    correctIndex: arranged.correctIndex,
    explanation,
    status: "active",
  }
}

const generatedTiuQuestions = Array.from({ length: 2_000 }, (_, i) => buildQuestion(i))

function getQuestionIdentity(question: CatQuestion): string {
  const categoryIndex = categories.indexOf(question.category as (typeof categories)[number])
  if ([0, 1, 8, 9].includes(categoryIndex)) {
    const correctAnswer = question.options[question.correctIndex]
    return `${question.category}|${correctAnswer}|${question.explanation}`.toLocaleLowerCase()
  }
  if (categoryIndex === 2) {
    return `${question.category}|${question.question.split("\n").slice(0, 2).join(" ")}`.toLocaleLowerCase()
  }
  return `${question.category}|${question.question.replace(/\s+/g, " ").trim()}`.toLocaleLowerCase()
}

const seenTiuQuestionIdentities = new Set<string>()
export const expandedTiuQuestions: CatQuestion[] = generatedTiuQuestions.filter((question) => {
  const identity = getQuestionIdentity(question)
  if (seenTiuQuestionIdentities.has(identity)) return false
  seenTiuQuestionIdentities.add(identity)
  return true
})

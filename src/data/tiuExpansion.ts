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
  ["akurat", "tepat", "keliru"], ["adaptif", "mudah menyesuaikan", "kaku"], ["andal", "tepercaya", "rapuh"],
  ["arogan", "sombong", "rendah hati"], ["autentik", "asli", "palsu"], ["bijaksana", "arif", "ceroboh"],
  ["cermat", "teliti", "lalai"], ["dinamis", "bergerak", "statis"], ["efisien", "hemat guna", "boros"],
  ["elastis", "lentur", "kaku"], ["esensial", "pokok", "tambahan"], ["fana", "sementara", "abadi"],
  ["gamblang", "jelas", "samar"], ["genting", "kritis", "sepele"], ["harmonis", "selaras", "bertentangan"],
  ["ideal", "sempurna", "buruk"], ["implisit", "tersirat", "tersurat"], ["inklusif", "terbuka", "eksklusif"],
  ["inovatif", "kreatif", "konvensional"], ["integral", "menyeluruh", "terpisah"], ["intensif", "sungguh-sungguh", "santai"],
  ["jenaka", "lucu", "serius"], ["konsisten", "ajek", "berubah-ubah"], ["kontinu", "berkelanjutan", "terputus"],
  ["kredibel", "tepercaya", "meragukan"], ["krusial", "penting", "tidak berarti"], ["lugas", "terus terang", "berbelit-belit"],
  ["labil", "goyah", "stabil"], ["moderat", "sedang", "berlebihan"], ["mutakhir", "terbaru", "kuno"],
  ["objektif", "tidak memihak", "subjektif"], ["optimum", "terbaik", "minimum"], ["orisinil", "asli", "tiruan"],
  ["parsial", "sebagian", "menyeluruh"], ["progresif", "maju", "mundur"], ["relevan", "berkaitan", "tidak sesuai"],
  ["ringkas", "singkat", "panjang lebar"], ["sahih", "valid", "keliru"], ["sporadis", "tersebar", "teratur"],
  ["stagnan", "mandek", "berkembang"], ["subtil", "halus", "kasar"], ["transparan", "terbuka", "tertutup"],
  ["universal", "umum", "khusus"], ["valid", "sah", "tidak sah"], ["variatif", "beragam", "seragam"],
  ["visioner", "berpandangan jauh", "berpikiran sempit"], ["waspada", "siaga", "lalai"], ["yakin", "percaya", "ragu"],
  ["zenit", "puncak", "dasar"], ["absah", "resmi", "ilegal"],
] as const

const analogies = [
  ["dokter", "pasien", "guru", "murid", "obat", "sekolah", "buku"],
  ["penulis", "buku", "pelukis", "lukisan", "kanvas", "warna", "galeri"],
  ["kompas", "arah", "termometer", "suhu", "cuaca", "jarak", "waktu"],
  ["padi", "beras", "tebu", "gula", "garam", "gandum", "minyak"],
  ["mata", "melihat", "telinga", "mendengar", "berbicara", "berjalan", "berpikir"],
  ["kapal", "laut", "pesawat", "udara", "rel", "stasiun", "jalan"],
  ["menit", "jam", "sentimeter", "meter", "kilogram", "liter", "derajat"],
  ["benih", "tanaman", "telur", "ayam", "sarang", "bulu", "pakan"],
  ["rajin", "tekun", "hemat", "cermat", "malas", "boros", "ceroboh"],
  ["haus", "minum", "lapar", "makan", "tidur", "bangun", "berlari"],
  ["Indonesia", "Jakarta", "Jepang", "Tokyo", "Asia", "Kyoto", "Osaka"],
  ["pagi", "siang", "fajar", "senja", "malam", "subuh", "petang"],
  ["roda", "mobil", "sayap", "pesawat", "mesin", "bensin", "rem"],
  ["sapu", "membersihkan", "gunting", "memotong", "menjahit", "menempel", "mengukur"],
  ["api", "panas", "es", "dingin", "air", "cair", "uap"],
  ["arsitek", "bangunan", "nahkoda", "kapal", "pelabuhan", "penumpang", "laut"],
  ["kata", "kalimat", "nada", "lagu", "huruf", "paragraf", "suara"],
  ["pohon", "hutan", "ikan", "laut", "daun", "akar", "sungai"],
  ["kunci", "pintu", "kata sandi", "akun", "gembok", "pagar", "rumah"],
  ["fotografer", "kamera", "koki", "wajan", "pisau", "makanan", "restoran"],
] as const

const passages = [
  ["Perpustakaan sekolah memperpanjang jam layanan selama pekan ujian. Jumlah pengunjung meningkat, sehingga pengelola menambah meja belajar dan petugas piket.", "Penambahan fasilitas dilakukan untuk mengimbangi kenaikan pengunjung."],
  ["Sebuah desa memasang penampung air hujan di beberapa rumah. Saat musim kemarau, persediaan air warga lebih terjaga dan penggunaan air tanah berkurang.", "Penampungan air hujan membantu menjaga ketersediaan air saat kemarau."],
  ["Toko roti mencatat banyak roti tersisa setiap sore. Pemilik lalu membuat ukuran produksi berdasarkan rata-rata penjualan harian dan jumlah pesanan.", "Penyesuaian produksi bertujuan mengurangi sisa roti."],
  ["Jalur sepeda baru dibangun menuju pusat kota. Setelah enam bulan, semakin banyak pekerja bersepeda dan kepadatan kendaraan pada jam sibuk menurun.", "Tersedianya jalur sepeda mendorong perubahan moda perjalanan."],
  ["Kelompok tani menguji beberapa jenis benih pada petak yang sama luasnya. Mereka mencatat hasil panen dan kebutuhan air setiap jenis sebelum memilih benih untuk musim berikutnya.", "Pemilihan benih didasarkan pada perbandingan hasil dan kebutuhan air."],
  ["Museum menyediakan pemandu audio dalam beberapa bahasa. Pengunjung asing lebih mudah memahami koleksi, sementara jumlah pertanyaan kepada petugas berkurang.", "Pemandu audio memperluas akses informasi bagi pengunjung."],
  ["Perusahaan memberi kesempatan kerja dari rumah dua hari setiap pekan. Pegawai melaporkan waktu perjalanan yang lebih singkat, sedangkan rapat daring dijadwalkan lebih teratur.", "Pengaturan kerja baru mengurangi waktu perjalanan dan menata koordinasi."],
  ["Kota menanam pohon peneduh di sepanjang trotoar. Pada siang hari, suhu permukaan di ruas tersebut lebih rendah dibandingkan ruas tanpa pepohonan.", "Pepohonan peneduh membantu mengurangi panas di kawasan jalan."],
  ["Koperasi menyediakan catatan pemasukan dan pengeluaran yang dapat dilihat seluruh anggota. Pertanyaan mengenai penggunaan dana berkurang setelah laporan dibagikan rutin.", "Keterbukaan laporan meningkatkan pemahaman anggota tentang keuangan."],
  ["Pusat kesehatan mengirim pengingat jadwal pemeriksaan melalui pesan singkat. Jumlah pasien yang datang sesuai jadwal meningkat pada bulan berikutnya.", "Pengingat membantu pasien mengingat jadwal pemeriksaan."],
] as const

const names = ["Alya", "Bima", "Citra", "Damar", "Elin"]
const syllogismGroups = [
  ["burung", "hewan", "makhluk hidup"], ["mawar", "tumbuhan", "organisme"], ["bus kota", "kendaraan", "alat transportasi"],
  ["novel", "buku", "bahan bacaan"], ["dokter", "tenaga kesehatan", "pekerja"], ["piano", "alat musik", "benda"],
  ["apel", "buah", "bahan pangan"], ["elang", "unggas", "hewan"], ["persegi", "bangun datar", "bentuk geometris"],
  ["perak", "logam", "bahan"],
] as const
const money = (n: number) => `Rp${n.toLocaleString("id-ID")}`
const makeOptions = (answer: string | number, distractors: (string | number)[], seed: number) => {
  const correct = String(answer)
  const wrong = [...new Set(distractors.map(String).filter((value) => value !== correct))]
  let filler = 1
  while (wrong.length < 4) {
    const candidate = `${correct} (${filler})`
    if (!wrong.includes(candidate)) wrong.push(candidate)
    filler += 1
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
    distractors = [opposite, vocab[(Math.floor(n / 4) + 7) % vocab.length][1], vocab[(Math.floor(n / 4) + 13) % vocab.length][2], vocab[(Math.floor(n / 4) + 21) % vocab.length][1]]
    explanation = `Kata “${word}” bermakna ${synonym}; lawan katanya adalah ${antonym}.`
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
    const [text, conclusion] = passages[Math.floor(n / 20)]
    const form = n % 20
    const prompts = [
      "Simpulan yang paling sesuai dengan bacaan tersebut adalah ....", "Gagasan utama bacaan tersebut ialah ....",
      "Tindakan yang paling mungkin dilakukan berdasarkan bacaan adalah ....", "Hubungan sebab-akibat yang tampak dalam bacaan adalah ....",
      "Alasan utama perubahan tersebut dilakukan ialah ....", "Hasil yang paling jelas dari tindakan itu adalah ....",
      "Pernyataan yang didukung oleh bacaan adalah ....", "Tujuan langkah yang dilakukan dalam bacaan adalah ....",
      "Masalah yang hendak diatasi dalam bacaan adalah ....", "Informasi tersirat yang dapat disimpulkan ialah ....",
      "Kebijakan tersebut terutama bermanfaat untuk ....", "Pernyataan yang paling tepat berdasarkan bacaan ialah ....",
      "Apa dampak yang dijelaskan dalam bacaan?", "Apa pertimbangan di balik keputusan tersebut?",
      "Bagaimana tindakan itu membantu menyelesaikan persoalan?", "Apa inti informasi yang disampaikan penulis?",
      "Kesimpulan logis dari informasi tersebut adalah ....", "Perubahan yang terjadi menunjukkan bahwa ....",
      "Langkah berikut yang paling masuk akal ialah ....", "Hubungan antara tindakan dan hasilnya adalah ....",
    ]
    question = `Bacalah teks berikut!\n${text}\n${prompts[form]}`
    answer = conclusion
    distractors = ["Perubahan tersebut tidak berhubungan dengan kebutuhan masyarakat.", "Semua kegiatan sebelumnya dihentikan tanpa pertimbangan.", "Keputusan diambil tanpa mengamati keadaan yang ada.", "Hasil yang dicapai terjadi secara kebetulan dan tidak dapat dijelaskan."]
    explanation = conclusion
  } else if (cat === 3) {
    const a = 18 + ((n * 7) % 83)
    const b = 12 + ((n * 11) % 67)
    const c = 3 + (n % 9)
    const form = n % 5
    const values = [a + b + c, a * c + b, a * b - c, (a + b) * c, a * c - b]
    const ops = [`${a} + ${b} × ${c}`, `${a} × ${c} + ${b}`, `${a} × ${b} − ${c}`, `(${a} + ${b}) × ${c}`, `${a} × ${c} − ${b}`]
    const results = [a + b * c, a * c + b, a * b - c, (a + b) * c, a * c - b]
    question = `Berapakah hasil dari ${ops[form]}?`
    answer = results[form]
    distractors = [answer + c, answer - b, answer + 2 * c, answer - c].filter((v) => v >= 0)
    while (distractors.length < 4) distractors.push(answer + distractors.length + 11)
    explanation = `Kerjakan perkalian sebelum penjumlahan atau pengurangan. Hasilnya ${answer}.`
  } else if (cat === 4) {
    const a = 2 + (n % 17)
    const b = 3 + ((n * 5) % 19)
    const c = 4 + ((n * 7) % 23)
    const d = 5 + ((n * 11) % 29)
    const form = n % 4
    const left = form === 0 ? `${a}/${b}` : form === 1 ? `${a * 10}%` : form === 2 ? `${a} : ${b}` : `${a}²`
    const right = form === 0 ? `${c}/${d}` : form === 1 ? `${b * 5}%` : form === 2 ? `${c} : ${d}` : `${b}²`
    const lv = form === 0 ? a / b : form === 1 ? a / 100 : form === 2 ? a / b : a * a
    const rv = form === 0 ? c / d : form === 1 ? b / 20 : form === 2 ? c / d : b * b
    answer = lv > rv ? "A" : lv < rv ? "B" : "C"
    question = `Bandingkan nilai pada kolom A dan kolom B.\nKolom A: ${left}\nKolom B: ${right}\nPilih A jika A lebih besar, B jika B lebih besar, atau C jika keduanya sama.`
    distractors = ["A", "B", "C", "Informasi tidak cukup"].filter((x) => x !== answer)
    explanation = `Nilai kolom A ${lv > rv ? "lebih besar" : lv < rv ? "lebih kecil" : "sama"} daripada nilai kolom B.`
  } else if (cat === 5) {
    const speed = 25 + (n % 50) * 5
    const hours = 1 + Math.floor(n / 50)
    const distance = speed * hours
    const form = n % 3
    question = form === 0 ? `Kendaraan melaju dengan kecepatan ${speed} km/jam selama ${hours} jam. Berapa jarak yang ditempuh?` : form === 1 ? `Jarak ${distance} km ditempuh dengan kecepatan ${speed} km/jam. Berapa lama waktu perjalanannya?` : `Sebuah kendaraan menempuh ${distance} km dalam ${hours} jam. Berapa kecepatan rata-ratanya?`
    answer = form === 0 ? distance : form === 1 ? `${hours} jam` : `${speed} km/jam`
    distractors = form === 0 ? [distance + speed, distance - speed, speed + hours, distance / 2] : form === 1 ? [`${hours + 1} jam`, `${hours - 1} jam`, `${speed} jam`, `${distance} jam`] : [`${speed + 10} km/jam`, `${speed - 10} km/jam`, `${distance} km/jam`, `${hours} km/jam`]
    explanation = `Gunakan rumus jarak = kecepatan × waktu. Jaraknya ${distance} km, waktunya ${hours} jam, dan kecepatannya ${speed} km/jam.`
  } else if (cat === 6) {
    const base = 80_000 + n * 15_000
    const pct = [10, 15, 20, 25, 30][Math.floor(n / 4) % 5]
    const form = n % 4
    const result = form === 0 ? base * (100 - pct) / 100 : form === 1 ? base * (100 + pct) / 100 : base * pct / 100
    question = form === 0 ? `Sebuah barang seharga ${money(base)} mendapat diskon ${pct}%. Berapa harga setelah diskon?` : form === 1 ? `Modal sebuah barang ${money(base)} dan dijual dengan keuntungan ${pct}%. Berapa harga jualnya?` : form === 2 ? `Berapa besar ${pct}% dari ${money(base)}?` : `Harga barang ${money(base)} didiskon ${pct}%. Berapa jumlah potongan harganya?`
    answer = money(result)
    distractors = [money(base * pct / 100), money(base + base * pct / 100), money(base - base * (pct - 5) / 100), money(result + 10_000)]
    explanation = `${pct}% dari ${money(base)} adalah ${money(base * pct / 100)}; hasil sesuai pertanyaan adalah ${money(result)}.`
  } else if (cat === 7) {
    const start = 3 + n * 2
    const step = 2 + ((n * 3) % 11)
    const ratio = 2 + (n % 4)
    const form = n % 4
    const seq = form === 0 ? [start, start + step, start + 2 * step, start + 3 * step] : form === 1 ? [start, start * ratio, start * ratio ** 2, start * ratio ** 3] : form === 2 ? [start, start + 2, start + 6, start + 12] : [start, start + step, start, start + step]
    const result = form === 0 ? start + 4 * step : form === 1 ? start * ratio ** 4 : form === 2 ? start + 20 : start
    question = `Tentukan bilangan berikutnya: ${seq.join(", ")}, ....`
    answer = result
    distractors = [result + step, result - step, result + ratio, Math.max(0, result - 2)].filter((x) => x !== result)
    while (distractors.length < 4) distractors.push(result + distractors.length + 3)
    explanation = form === 0 ? `Pola bertambah ${step} setiap langkah.` : form === 1 ? `Setiap bilangan dikalikan ${ratio}.` : form === 2 ? "Selisih bertambah 2, 4, 6, lalu 8." : `Pola bergantian antara ${start} dan ${start + step}.`
  } else if (cat === 8) {
    const [a, b, c] = syllogismGroups[Math.floor(n / 20)]
    const form = n % 4
    const variant = Math.floor(n / 4) % 5
    const lead = ["Perhatikan premis berikut.", "Diketahui pernyataan berikut.", "Dalam suatu penalaran, berlaku ketentuan berikut.", "Cermati hubungan antarkelompok berikut.", "Berdasarkan informasi berikut,"][variant]
    if (form === 0) {
      question = `${lead} Semua ${a} adalah ${b}. Semua ${b} adalah ${c}. Kesimpulan yang pasti benar adalah ....`
      answer = `Semua ${a} adalah ${c}.`
      distractors = [`Semua ${c} adalah ${a}.`, `Tidak ada ${a} yang ${c}.`, `Sebagian ${c} bukan ${b}.`, `Semua ${b} adalah ${a}.`]
      explanation = `Jika seluruh ${a} termasuk ${b}, dan seluruh ${b} termasuk ${c}, maka seluruh ${a} termasuk ${c}.`
    } else if (form === 1) {
      question = `${lead} Tidak ada ${a} yang ${b}. Sebagian ${c} adalah ${a}. Kesimpulan yang pasti benar adalah ....`
      answer = `Sebagian ${c} bukan ${b}.`
      distractors = [`Semua ${c} adalah ${b}.`, `Semua ${b} adalah ${a}.`, `Sebagian ${b} adalah ${c}.`, `Tidak ada ${c} yang ${a}.`]
      explanation = `Bagian ${c} yang termasuk ${a} tidak mungkin termasuk ${b}.`
    } else if (form === 2) {
      question = `${lead} Sebagian ${a} adalah ${b}. Semua ${b} adalah ${c}. Kesimpulan yang tepat adalah ....`
      answer = `Sebagian ${a} adalah ${c}.`
      distractors = [`Semua ${a} adalah ${c}.`, `Tidak ada ${a} yang ${c}.`, `Semua ${c} adalah ${b}.`, `Sebagian ${c} bukan ${b}.`]
      explanation = `Anggota ${a} yang termasuk ${b} juga termasuk ${c}.`
    } else {
      question = `${lead} Semua ${a} adalah ${b}. Tidak ada ${b} yang ${c}. Kesimpulan yang pasti benar adalah ....`
      answer = `Tidak ada ${a} yang ${c}.`
      distractors = [`Semua ${c} adalah ${a}.`, `Sebagian ${a} adalah ${c}.`, `Semua ${b} adalah ${a}.`, `Sebagian ${c} adalah ${b}.`]
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
    const clues = [`${order[0]} berada sebelum ${order[1]}.`, `${order[1]} berada sebelum ${order[2]}.`, `${order[2]} berada sebelum ${order[3]}.`, `${order[3]} berada sebelum ${order[4]}.`]
    const pos = [0, 1, 2, 3, 4][Math.floor(n / 4) % 5]
    const context = ["menyusun laporan secara berurutan", "tiba di garis akhir secara berurutan", "mempresentasikan hasil kerja secara berurutan", "memilih jadwal tampil secara berurutan", "mengisi giliran pelayanan secara berurutan", "menerima nomor penghargaan secara berurutan", "menjalani tahap seleksi secara berurutan"][Math.floor(n / 5) % 7]
    question = `Lima peserta, ${people.join(", ")}, ${context}.\n${clues.join(" ")} Siapakah yang berada di urutan ${pos + 1}?`
    answer = order[pos]
    distractors = people.filter((x) => x !== answer).slice(0, 4)
    explanation = `Urutan yang memenuhi petunjuk adalah ${order.join(" – ")}; posisi ke-${pos + 1} ditempati ${answer}.`
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

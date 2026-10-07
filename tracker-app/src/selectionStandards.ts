/**
 * STANDAR RESMI SELEKSI PASKIBRAKA NASIONAL BPIP TERBARU
 * Rincian Teknis, Nilai Ambang Batas (Passing Grade), Aturan Gugur Otomatis,
 * Parameter Medis (Rikkes), Antropometri (Parade), Fisik (Samapta A & B),
 * Tes PIP/TIU CAT, Wawancara STAR, dan Audit Jejak Digital.
 */

export interface StageDetail {
  id: string;
  namaTahap: string;
  sistemUjian: string;
  passingGrade: string;
  sifatKelulusan: 'Gugur Otomatis (Locked)' | 'Pemeringkatan Kuota' | 'Objektif Medis' | 'Kompetensi Juri';
  parameterKritis: string[];
  trikLolos100: string[];
}

export const TAHAPAN_SELEKSI_BPIP: StageDetail[] = [
  {
    id: "adm",
    namaTahap: "1. Validasi Administrasi Online (Portal BPIP)",
    sistemUjian: "Unggah dokumen asli via portal resmi Transparansi Paskibraka BPIP",
    passingGrade: "Valid 100% Berkas Terverifikasi",
    sifatKelulusan: "Gugur Otomatis (Locked)",
    parameterKritis: [
      "KK & Kartu Pelajar asli terbaca jelas",
      "Surat Izin Kepala Sekolah (Form-A baku sistem BPIP, dilarang modifikasi kalimat)",
      "Surat Persetujuan Orang Tua/Wali (Form-B) bermeterai fisik Rp10.000 (tanda tangan wajib mengenai sebagian meterai fisik, dilarang e-meterai jika diminta fisik)",
      "Surat Pernyataan Kesediaan mematuhi aturan program Paskibraka",
      "Salinan Rapor Kelas X nilai kompetensi minimal Baik",
      "Foto portrait latar belakang merah/putih resmi sesuai pedoman",
      "Dilarang ada dokumen buram, miring, atau terpotong (otomatis ditolak sistem AI/verifikator)"
    ],
    trikLolos100: [
      "Gunakan aplikasi scanner profesional (CamScanner/Adobe Scan), jangan kamera HP biasa tanpa cropping presisi.",
      "Cek nomor seri meterai fisik agar tidak tertutup coretan tanda tangan.",
      "Pastikan ukuran file dan resolusi sesuai batas portal tanpa mengurangi ketajaman teks."
    ]
  },
  {
    id: "pip",
    namaTahap: "2. Pembinaan Ideologi Pancasila (PIP / TWK)",
    sistemUjian: "Computer Assisted Test (CAT) daring lewat web Perisai Paskibraka BPIP",
    passingGrade: "Minimal Nilai 70 (Passing Grade Mutlak)",
    sifatKelulusan: "Gugur Otomatis (Locked)",
    parameterKritis: [
      "Nilai < 70 saat tombol submit ditekan langsung mengunci akun dan dinyatakan gugur detik itu juga",
      "Buku Teks Utama Pendidikan Pancasila Kelas X (Kemendikbudristek/BPIP)",
      "Sejarah BPUPKI (29 Mei-1 Juni 1945), Panitia Sembilan, Piagam Jakarta 22 Juni 1945",
      "Butir Pancasila & Tap MPR No. I/MPR/2003 (Studi kasus penalaran moral/sosial)",
      "UU No. 24 Tahun 2009: Ukuran bendera (Lapangan Istana 200x300cm, Kapal 120x180cm, Ruangan 100x150cm), tata cara pengibaran/penurunan/setengah tiang, larangan perusakan bendera",
      "Lagu Kebangsaan Indonesia Raya (aturan penggunaan, larangan pengubahan nada/lirik), Lambang Garuda (17-8-19-45)",
      "Sejarah Paskibraka: Mayor Husein Mutahar (1946 Yogyakarta), Idik Sulaeman (1973), Bunga Teratai, Kendit, MPG"
    ],
    trikLolos100: [
      "Baca kalimat pertanyaan terakhir terlebih dahulu pada soal narasi panjang (soal HOTS) sebelum membaca studi kasus.",
      "Terapkan aturan manajemen waktu 30 detik per soal, jangan tertahan pada soal yang ragu.",
      "Eliminasi opsi jawaban sempit/subjektif, pilih opsi yang mengutamakan kepentingan nasional dan keutuhan NKRI."
    ]
  },
  {
    id: "tiu",
    namaTahap: "3. Seleksi Inteligensi Umum (TIU)",
    sistemUjian: "Ujian CAT Daring lanjutan pasca lolos PIP",
    passingGrade: "Pemeringkatan Nilai Tertinggi Kuota Daerah",
    sifatKelulusan: "Pemeringkatan Kuota",
    parameterKritis: [
      "Kemampuan Verbal: Sinonim, antonim, analogi kata, silogisme logis",
      "Kemampuan Numerik: Berhitung cepat, pecahan/persentase, deret angka & huruf, logika matematika dasar",
      "Kemampuan Figural: Analogi gambar, rotasi 3 dimensi, kelanjutan pola grafis",
      "Pengetahuan Umum / RPUL: 4 Provinsi baru Papua (Papua Selatan-Merauke, Papua Tengah-Nabire, Papua Pegunungan-Wamena, Papua Barat Daya-Sorong), ibu kota dunia unik (Canberra, Brasilia, Ankara, Ottawa), Flora/Fauna nasional (Melati, Anggrek Bulan, Padma Raksasa), Penemu dunia & badan PBB"
    ],
    trikLolos100: [
      "Metode tembak langsung < 5 detik untuk soal hafalan RPUL murni.",
      "Trik figural: fokus pada 1 titik kecil/garis detail penanda putaran, jangan putar seluruh gambar di kepala.",
      "Trik silogisme: gunakan metode coret premis tengah (Semua A adalah B, Semua B adalah C => Semua A adalah C)."
    ]
  },
  {
    id: "rikkes",
    namaTahap: "4. Seleksi Kesehatan Fisik Menyeluruh (Rikkes)",
    sistemUjian: "Pemeriksaan medis objektif oleh tim dokter independen TNI/Polri/Dinkes",
    passingGrade: "Status Memenuhi Syarat (MS)",
    sifatKelulusan: "Objektif Medis",
    parameterKritis: [
      "Mata: Tajam visus normal, toleransi maksimal 1.0 dioptri (tanpa kacamata tebal), 100% bebas buta warna parsial/total (Tes Ishihara mutlak)",
      "Gigi & Mulut (Odontogram Standar BPIP): Caries Dentis ≤ 3 gigi, Tumpatan Gigi ≤ 5 gigi, Impaksi Gigi ≤ 2 gigi, Kehilangan Gigi Depan = TIDAK ADA (Mutlak gugur jika ada gigi depan tanggal tanpa gigi tiruan permanen)",
      "Kardiovaskular: Tensi normal (120/80 mmHg), tidak hipertensi (>140/90) atau hipotensi (<90/60), detak jantung reguler tanpa aritmia/murmur",
      "Vaskular & Anatomi: Bebas varises kaki tingkat berat, bebas ambeien/hemoroid stadium 3-4, bebas hernia",
      "Kulit & Estetika: Bebas tato, bebas tindik (putra), bebas keloid mencolok pada area baju PDU",
      "Informed consent wajib ditandatangani sebelum tes medis"
    ],

    trikLolos100: [
      "H-30: Scaling karang gigi & penambalan permanen semua lubang gigi ke dokter gigi.",
      "H-3: Hindari makanan asin/kopi/mie instan, tidur 8 jam, lakukan teknik Deep Breathing (tarik 4s, tahan 2s, buang 5s) saat diukur tensi.",
      "Latihan mandiri plat tes Ishihara secara daring agar refleks mengenali angka warna meningkat."
    ]
  },
  {
    id: "parade",
    namaTahap: "5. Seleksi Parade (Kriteria Antropometri)",
    sistemUjian: "Pemeriksaan bentuk fisik luar secara presisi menggunakan stadiometer & kaliper",
    passingGrade: "Kesesuaian Rentang TB, BB Ideal ±5kg, Kaki ≤5cm",
    sifatKelulusan: "Objektif Medis",
    parameterKritis: [
      "Tinggi Badan Putra: 170 – 180 cm (kurang 0,5 cm langsung gugur)",
      "Tinggi Badan Putri: 165 – 175 cm (kurang 0,5 cm langsung gugur)",
      "Berat Badan Ideal (BBI): Rumus (TB - 100) x 90%. Batas toleransi deviasi maksimal ±5 kg",
      "Rasio Ekstremitas Kaki: Celah lutut kaki O (Genu Varum) atau kaki X (Genu Valgum) maksimal 5 cm saat posisi siap",
      "Telapak Kaki: Dilarang memiliki telapak kaki rata total (Flat Foot)",
      "Kelurusan Tulang Belakang: Bebas skoliosis (tulang S/C), lordosis (terlalu menungging), dan kifosis (bungkuk)",
      "Simetris Bahu & Leher: Bebas bahu miring sebelah dan leher condong ke depan"
    ],
    trikLolos100: [
      "Decompressing tulang belakang: Lakukan hanging di bar / cobra stretch sebelum masuk ruang ukur untuk bonus tinggi instan 0,5-1 cm.",
      "Military stance: Rapatkan tumit, buka 45 derajat, tekan tempurung lutut ke belakang, busungkan dada, pandangan mata lurus sejajar mata (jangan mendongak)."
    ]
  },
  {
    id: "pbb",
    namaTahap: "6. Seleksi Peraturan Baris-Berbaris (PBB)",
    sistemUjian: "Uji ketangkasan motorik instruksi lapangan mengacu Perpang TNI 58/2018 & Juklak Kota",
    passingGrade: "Minimal Nilai 80.0 (Rentang Nilai Juri 50-90)",
    sifatKelulusan: "Kompetensi Juri",
    parameterKritis: [
      "Gerakan di Tempat: Sikap siap sempurna, sikap istirahat parade, hadap kanan/kiri, serong, balik kanan, jalan di tempat, periksa kerapian",
      "Gerakan Berjalan: Langkah tegap tempo 96 bpm panjang langkah 65 cm, langkah biasa, langkah perlahan, perubahan arah, hormat kanan",
      "Kualitas Instruksi: Kelantangan vokal suara perut (diafragma), artikulasi aba-aba petunjuk-peringatan-pelaksanaan, ketegasan danpas",
      "Penalti Ketat: Garis keluar/menginjak (-50 poin), waktu lebih (-50 poin/30 dtk), aba-aba tambahan lebih dari 3x (-20 poin)"
    ],
    trikLolos100: [
      "Gerakan 'Snap' (patah-patah): Hentakan berhenti seketika, hilangkan gerakan mengalun atau lemas.",
      "Pandangan mata mengunci: Tatapan mata tajam ke satu titik setinggi mata, tidak melirik atau berkedip berlebihan.",
      "Suara perut: Proyeksikan suara dari diafragma bawah agar bulat bervolume tanpa serak."
    ]
  },
  {
    id: "samapta",
    namaTahap: "7. Seleksi Kesamaptaan Fisik (Uji Fisik Militer)",
    sistemUjian: "Uji kebugaran jasmani lapangan tabel konversi standar TNI/Polri BPIP",
    passingGrade: "Ambang Aman: Putra >2400m, Putri >2000m | Target Nilai 100: Putra ≥3000-3200m",
    sifatKelulusan: "Pemeringkatan Kuota",
    parameterKritis: [
      "Samapta A (Lari 12 Menit): Putra batas minimal 2.400 - 3.200m (Target 100: ≥3.000-3.200m / 7.5-8 lap). Putri minimal 2.000 - 2.400m (Target 100: ≥2.300-2.400m / 5.5-6 lap)",
      "Push-Up 1 Menit: Putra 35 - 45x (Target 100: ≥42x, dada sentuh busa, tangan lurus penuh). Putri 20 - 30x tumpuan lutut (Target 100: ≥37x)",
      "Sit-Up 1 Menit: Putra 35 - 40x (Target 100: ≥41x, siku sentuh lutut, tangan di belakang kepala). Putri 30 - 35x (Target 100: ≥42x)",
      "Back-Up 1 Menit: Putra & Putri 40 - 50x (Target 100: ≥40x putra / ≥35-40x putri, dada terangkat, penyeimbang postur tegap)",
      "Shuttle Run (3 putaran angka 8 jarak 10m): Target aman < 16 - 19 detik (Target 100: < 16.0s putra / < 17.0s putri)"
    ],
    trikLolos100: [
      "Pacing Lari: Menit 1-3 stabil jogging 65%, Menit 4-10 konstan 80% (drafting di belakang pelari stabil), Menit 11-12 all-out sprint habis-habisan.",
      "Back-up & Sit-up: Manfaatkan gravitasi saat badan turun agar otot relaks sesaat, ledakkan tenaga hanya saat menarik badan ke atas.",
      "Shuttle Run: Rendahkan titik berat tubuh (sedikit membungkuk) saat tikungan angka 8 agar tidak slip."
    ]
  },
  {
    id: "kepribadian",
    namaTahap: "8. Seleksi Kepribadian, Wawancara & Audit Jejak Digital",
    sistemUjian: "Wawancara tatap muka tim gabungan Kesbangpol, TNI/Polri, DPPI & Psikolog",
    passingGrade: "Status Sangat Direkomendasikan (High Integrity & Leadership)",
    sifatKelulusan: "Kompetensi Juri",
    parameterKritis: [
      "Wawancara Kompetensi: Kepercayaan diri, artikulasi bahasa (kemampuan Bahasa Inggris nilai plus besar), wawasan budaya, stabilitas emosi saat ditekan",
      "Penelusuran Minat & Bakat: Menampilkan keahlian individu (alat musik daerah, tari tradisional, seni bela diri/pencak silat, orasi)",
      "Audit Rekam Jejak Digital: Pemeriksaan ponsel langsung (Instagram, X/Twitter, YouTube, WhatsApp). Wajib bersih dari konten hoaks, asusila, judi online, kata kasar, bullying, politik praktis, dan radikalisme",
      "Kepatuhan Protokoler: Langkah tegap saat masuk ruangan, penghormatan resmi, posisi duduk tegak militer"
    ],
    trikLolos100: [
      "Gunakan Metode STAR (Situation, Task, Action, Result) saat menjawab studi kasus organisasi dan pemecahan konflik.",
      "Lakukan Digital Sterilization sejak H-30: bersihkan riwayat postingan/komentar masa lalu dari unsur keluhan dan dark jokes.",
      "Bawakan bakat daerah yang autentik dan tegas dengan kostum/alat yang rapi untuk mencuri perhatian tim penilai nasional."
    ]
  }
];

export const CALCULATE_BBI = (heightCm: number) => {
  const bbi = (heightCm - 100) * 0.9;
  const minSafe = Math.round((bbi - 5) * 10) / 10;
  const maxSafe = Math.round((bbi + 5) * 10) / 10;
  return {
    bbi: Math.round(bbi * 10) / 10,
    minSafe,
    maxSafe
  };
};

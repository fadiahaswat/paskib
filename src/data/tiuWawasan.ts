import type { CatQuestion } from "../domain/selection"

type Fact = {
  question: string
  answer: string
  explanation: string
  pool?: string
  distractors?: [string, string, string, string]
}

const categories = [
  "Sejarah & Kepaskibrakaan",
  "Geografi & Pemerintahan",
  "Wawasan Global & Kerja Sama Internasional",
  "Penemu & Tokoh Dunia",
  "Ibu Kota Negara",
  "Organisasi Internasional",
  "Flora, Fauna & Simbol Nasional",
] as const

const historyFacts: Fact[] = [
  {
    question: "Pada tanggal berapakah Proklamasi Kemerdekaan Indonesia dibacakan?",
    answer: "17 Agustus 1945",
    distractors: ["18 Agustus 1945", "16 Agustus 1945", "1 Juni 1945", "22 Juni 1945"],
    explanation: "Proklamasi Kemerdekaan Indonesia dibacakan pada 17 Agustus 1945.",
  },
  {
    question: "Siapakah yang membacakan teks Proklamasi Kemerdekaan Indonesia?",
    answer: "Ir. Sukarno",
    distractors: ["Drs. Mohammad Hatta", "Mr. Achmad Soebardjo", "Sutan Sjahrir", "Mr. Mohammad Yamin"],
    explanation: "Teks proklamasi dibacakan oleh Ir. Sukarno.",
  },
  {
    question: "Siapakah yang mendampingi Ir. Sukarno saat membacakan teks Proklamasi?",
    answer: "Drs. Mohammad Hatta",
    distractors: ["Mr. Achmad Soebardjo", "Dr. Radjiman Wedyodiningrat", "Sukarni Kartodiwirjo", "Sayuti Melik"],
    explanation: "Drs. Mohammad Hatta mendampingi Ir. Sukarno saat pembacaan proklamasi.",
  },
  {
    question: "Di alamat manakah Proklamasi Kemerdekaan dibacakan pada 17 Agustus 1945?",
    answer: "Jalan Pegangsaan Timur No. 56, Jakarta",
    distractors: [
      "Jalan Imam Bonjol No. 1, Jakarta",
      "Jalan Pejambon No. 2, Jakarta",
      "Jalan Prapatan No. 10, Jakarta",
      "Jalan Cikini Raya No. 71, Jakarta",
    ],
    explanation: "Pembacaan proklamasi berlangsung di Jalan Pegangsaan Timur No. 56, Jakarta.",
  },
  {
    question: "Siapakah tokoh yang menjahit Bendera Pusaka Sang Merah Putih?",
    answer: "Fatmawati",
    distractors: ["S.K. Trimurti", "Maria Ulfah Santoso", "Inggit Garnasih", "Rasuna Said"],
    explanation: "Fatmawati menjahit Bendera Pusaka yang dikibarkan saat proklamasi.",
  },
  {
    question: "Siapakah tokoh yang mengetik naskah autentik Proklamasi Kemerdekaan Indonesia?",
    answer: "Sayuti Melik",
    distractors: ["B.M. Diah", "Sukarni", "Chaeroel Saleh", "Wikana"],
    explanation: "Naskah proklamasi diketik oleh Sayuti Melik.",
  },
  {
    question: "Di kediaman siapakah naskah Proklamasi dirumuskan pada dini hari 17 Agustus 1945?",
    answer: "Laksamana Tadashi Maeda",
    distractors: [
      "Jenderal Kumakichi Harada",
      "Marsekal Hisaichi Terauchi",
      "Jenderal Moichiro Yamamoto",
      "Shigetada Nishijima",
    ],
    explanation: "Perumusan naskah proklamasi berlangsung di rumah Laksamana Tadashi Maeda.",
  },
  {
    question: "Siapakah tokoh yang mengusulkan agar teks Proklamasi ditandatangani Sukarno dan Hatta atas nama bangsa Indonesia?",
    answer: "Sukarni",
    distractors: ["Chaeroel Saleh", "Wikana", "Achmad Soebardjo", "Latief Hendraningrat"],
    explanation: "Sukarni mengusulkan penandatanganan oleh Sukarno dan Hatta atas nama bangsa Indonesia.",
  },
  {
    question: "Siapakah perwira yang menerima tugas menyiapkan upacara pengibaran bendera peringatan kemerdekaan tahun 1946 di Yogyakarta?",
    answer: "Mayor Husein Mutahar",
    distractors: ["Latief Hendraningrat", "Suhud Sastro Kusumo", "Kapten Widodo", "Kolonel Abdul Kadir"],
    explanation: "Presiden Sukarno menugaskan Mayor Husein Mutahar menyiapkan upacara 17 Agustus 1946 di Yogyakarta.",
  },
  {
    question: "Di gedung manakah pengibaran Bendera Pusaka dilaksanakan di Yogyakarta pada 17 Agustus 1946?",
    answer: "Gedung Agung",
    distractors: ["Gedung Pancasila", "Gedung Merdeka", "Benteng Vredeburg", "Kraton Ngayogyakarta"],
    explanation: "Upacara peringatan kemerdekaan 1946 berlangsung di halaman Gedung Agung, Yogyakarta.",
  },
  {
    question: "Tahun berapakah gagasan awal pasukan pengibar Bendera Pusaka mulai diwujudkan di Yogyakarta?",
    answer: "1946",
    distractors: ["1945", "1947", "1949", "1950"],
    explanation: "Gagasan awal pasukan pengibar Bendera Pusaka diwujudkan pada peringatan kemerdekaan tahun 1946.",
  },
  {
    question: "Berapa orang pemuda yang ditugaskan dalam formasi awal pengibaran Bendera Pusaka di Yogyakarta tahun 1946?",
    answer: "Lima orang",
    distractors: ["Tiga orang", "Delapan orang", "Tujuh belas orang", "Empat puluh lima orang"],
    explanation: "Husein Mutahar menunjuk lima pemuda dari berbagai daerah di Yogyakarta sebagai lambang Pancasila.",
  },
  {
    question: "Berapa orang pemudi (putri) yang termasuk dalam kelompok awal pengibar Bendera Pusaka tahun 1946?",
    answer: "Tiga orang",
    distractors: ["Dua orang", "Empat orang", "Lima orang", "Satu orang"],
    explanation: "Kelompok lima pemuda tahun 1946 terdiri atas tiga putri dan dua putra.",
  },
  {
    question: "Berapa orang pemuda (putra) yang termasuk dalam kelompok awal pengibar Bendera Pusaka tahun 1946?",
    answer: "Dua orang",
    distractors: ["Tiga orang", "Empat orang", "Satu orang", "Lima orang"],
    explanation: "Kelompok lima pemuda tahun 1946 terdiri atas tiga putri dan dua putra.",
  },
  {
    question: "Apakah kepanjangan resmi dari istilah Paskibraka?",
    answer: "Pasukan Pengibar Bendera Pusaka",
    distractors: [
      "Pasukan Pengawal Bendera Pusaka",
      "Pasukan Pengibar Bendera Kebangsaan",
      "Pasukan Kehormatan Bendera Negara",
      "Pasukan Pemuda Pengibar Bendera",
    ],
    explanation: "Paskibraka merupakan akronim dari Pasukan Pengibar Bendera Pusaka yang dikukuhkan sejak 1973.",
  },
  {
    question: "Siapakah Presiden yang menugaskan Mayor Husein Mutahar menyusun tata upacara pengibaran bendera tahun 1946?",
    answer: "Presiden Sukarno",
    distractors: ["Presiden Soeharto", "Wakil Presiden Moh. Hatta", "Mr. Assaat", "Sjafruddin Prawiranegara"],
    explanation: "Presiden Sukarno memberikan penugasan langsung kepada Mayor Husein Mutahar di Yogyakarta.",
  },
  {
    question: "Apakah sebutan resmi Bendera Negara Indonesia menurut Undang-Undang Nomor 24 Tahun 2009?",
    answer: "Sang Merah Putih",
    distractors: ["Sang Saka Nusantara", "Dwiwarna Pusaka", "Panji Merah Putih", "Bendera Kebangsaan Raya"],
    explanation: "Pasal 4 UU Nomor 24 Tahun 2009 menyebut Bendera Negara Indonesia sebagai Sang Merah Putih.",
  },
  {
    question: "Warna apakah yang terletak pada bagian atas Bendera Negara Republik Indonesia?",
    answer: "Merah",
    distractors: ["Putih", "Emas", "Kuning", "Hitam"],
    explanation: "Bendera negara berbentuk empat persegi panjang dengan bagian atas berwarna merah dan bawah putih.",
  },
  {
    question: "Warna apakah yang terletak pada bagian bawah Bendera Negara Republik Indonesia?",
    answer: "Putih",
    distractors: ["Merah", "Perak", "Kuning", "Biru"],
    explanation: "Bagian bawah Bendera Negara Indonesia berwarna putih yang sama besar dengan bagian merah di atas.",
  },
  {
    question: "Jika panjang Bendera Negara adalah 3 meter, berapakah ukuran lebarnya sesuai ketentuan undang-undang?",
    answer: "2 meter",
    distractors: ["1,5 meter", "2,5 meter", "1 meter", "1,8 meter"],
    explanation: "Lebar bendera negara berukuran dua pertiga (2/3) dari ukuran panjangnya.",
  },
  {
    question: "Berapakah perbandingan resmi antara ukuran lebar dan panjang Bendera Negara Indonesia?",
    answer: "2 : 3",
    distractors: ["1 : 2", "3 : 4", "3 : 5", "4 : 5"],
    explanation: "Pasal 4 ayat (1) UU Nomor 24 Tahun 2009 menetapkan rasio lebar berbanding panjang adalah 2 : 3.",
  },
  {
    question: "Siapakah komponis pencipta lagu kebangsaan Indonesia Raya?",
    answer: "Wage Rudolf Supratman",
    distractors: ["Ismail Marzuki", "Cornel Simanjuntak", "Husein Mutahar", "Kusbini"],
    explanation: "Lagu kebangsaan Indonesia Raya diciptakan oleh Wage Rudolf Supratman.",
  },
  {
    question: "Pada peristiwa bersejarah apakah lagu Indonesia Raya pertama kali diperdengarkan secara publik tahun 1928?",
    answer: "Kongres Pemuda II",
    distractors: ["Kongres Pemuda I", "Kongres Budi Utomo", "Sidang Pertama BPUPK", "Kongres Perempuan I"],
    explanation: "W.R. Supratman memperdengarkan Indonesia Raya pada penutupan Kongres Pemuda II tanggal 28 Oktober 1928.",
  },
  {
    question: "Sosok apakah yang menjadi Lambang Negara Kesatuan Republik Indonesia?",
    answer: "Garuda Pancasila",
    distractors: ["Elang Bondol", "Rajawali Emas", "Cenderawasih Raja", "Jalak Nusantara"],
    explanation: "Pasal 36A UUD NRI Tahun 1945 menetapkan Lambang Negara ialah Garuda Pancasila.",
  },
  {
    question: "Semboyan apakah yang tertulis pada pita putih yang dicengkeram oleh Garuda Pancasila?",
    answer: "Bhinneka Tunggal Ika",
    distractors: ["Tut Wuri Handayani", "Jalesveva Jayamahe", "Swa Bhuwana Paksa", "Kartika Eka Paksi"],
    explanation: "Pita pada lambang negara memuat semboyan Bhinneka Tunggal Ika.",
  },
  {
    question: "Ke arah manakah kepala Garuda Pancasila menoleh apabila dilihat dari sudut pandang lambang Garuda itu sendiri?",
    answer: "Ke sebelah kanan",
    distractors: ["Ke sebelah kiri", "Lurus ke depan", "Menengadah ke atas", "Menunduk ke perisai"],
    explanation: "Pasal 46 UU Nomor 24 Tahun 2009 menegaskan Garuda Pancasila kepalanya menoleh lurus ke sebelah kanan.",
  },
  {
    question: "Apakah nama organisasi yang menghimpun anggota Paskibraka setelah purna melaksanakan tugas?",
    answer: "Purna Paskibraka Indonesia",
    distractors: [
      "Korps Alumni Paskibraka Nasional",
      "Ikatan Pengibar Bendera Pusaka",
      "Himpunan Pemuda Bela Negara",
      "Persatuan Duta Pancasila Muda",
    ],
    explanation: "Purna Paskibraka Indonesia (PPI) menaungi para purna anggota Paskibraka.",
  },
  {
    question: "Bunga apakah yang dijadikan simbol utama pada lambang Purna Paskibraka Indonesia?",
    answer: "Bunga teratai",
    distractors: ["Bunga melati", "Bunga anggrek", "Bunga mawar", "Bunga cempaka"],
    explanation: "Lambang kepaskibrakaan dan PPI menggunakan simbol bunga teratai yang tumbuh dari lumpur dan mekar di atas air.",
  },
  {
    question: "Tiga helai mahkota bunga yang tumbuh ke atas pada lambang kepaskibrakaan melambangkan makna apa?",
    answer: "Belajar, bekerja, dan berbakti",
    distractors: [
      "Aktif, disiplin, dan gembira",
      "Asah, asih, dan asuh",
      "Cerdas, tangkas, dan ikhlas",
      "Setia, berani, dan jujur",
    ],
    explanation: "Tiga helai mahkota bunga ke atas melambangkan jiwa pemuda yang belajar, bekerja, dan berbakti.",
  },
  {
    question: "Tiga helai kelopak daun yang tumbuh mendatar pada lambang kepaskibrakaan melambangkan sifat apa?",
    answer: "Aktif, disiplin, dan gembira",
    distractors: [
      "Belajar, bekerja, dan berbakti",
      "Tegas, lugas, dan wibawa",
      "Sabar, tekun, dan mandiri",
      "Rukun, kompak, dan tangguh",
    ],
    explanation: "Tiga helai daun mendatar melambangkan sifat pemuda yang aktif, disiplin, dan gembira.",
  },
]

const geographyFacts: Fact[] = [
  ["Aceh", "Banda Aceh"],
  ["Sumatera Utara", "Medan"],
  ["Sumatera Barat", "Padang"],
  ["Riau", "Pekanbaru"],
  ["Jambi", "Jambi"],
  ["Sumatera Selatan", "Palembang"],
  ["Bengkulu", "Bengkulu"],
  ["Lampung", "Bandar Lampung"],
  ["Kepulauan Bangka Belitung", "Pangkalpinang"],
  ["Kepulauan Riau", "Tanjungpinang"],
  ["DKI Jakarta", "Jakarta"],
  ["Jawa Barat", "Bandung"],
  ["Jawa Tengah", "Semarang"],
  ["Daerah Istimewa Yogyakarta", "Yogyakarta"],
  ["Jawa Timur", "Surabaya"],
  ["Banten", "Serang"],
  ["Bali", "Denpasar"],
  ["Nusa Tenggara Barat", "Mataram"],
  ["Nusa Tenggara Timur", "Kupang"],
  ["Kalimantan Barat", "Pontianak"],
  ["Kalimantan Tengah", "Palangka Raya"],
  ["Kalimantan Selatan", "Banjarbaru"],
  ["Kalimantan Timur", "Samarinda"],
  ["Kalimantan Utara", "Tanjung Selor"],
  ["Sulawesi Utara", "Manado"],
  ["Sulawesi Tengah", "Palu"],
  ["Sulawesi Selatan", "Makassar"],
  ["Sulawesi Tenggara", "Kendari"],
  ["Gorontalo", "Gorontalo"],
  ["Sulawesi Barat", "Mamuju"],
  ["Maluku", "Ambon"],
  ["Maluku Utara", "Sofifi"],
  ["Papua", "Jayapura"],
  ["Papua Barat", "Manokwari"],
  ["Papua Selatan", "Merauke"],
  ["Papua Tengah", "Nabire"],
  ["Papua Pegunungan", "Wamena"],
  ["Papua Barat Daya", "Sorong"],
].map(([province, capital]) => ({
  question: `Apakah ibu kota Provinsi ${province}?`,
  answer: capital,
  explanation: `Ibu kota Provinsi ${province} adalah ${capital}.`,
  pool: "provinsi",
}))

geographyFacts.push(
  {
    question: "Negara apakah yang berbatasan darat langsung dengan wilayah Indonesia di Pulau Kalimantan?",
    answer: "Malaysia",
    distractors: ["Brunei Darussalam", "Singapura", "Filipina", "Thailand"],
    explanation: "Di Pulau Kalimantan, Indonesia berbatasan darat langsung dengan Malaysia (Sabah dan Sarawak).",
  },
  {
    question: "Negara apakah yang berbatasan darat langsung dengan wilayah Indonesia di Pulau Papua?",
    answer: "Papua Nugini",
    distractors: ["Australia", "Kepulauan Solomon", "Timor-Leste", "Selandia Baru"],
    explanation: "Indonesia dan Papua Nugini berbagi perbatasan darat di Pulau Papua.",
  },
  {
    question: "Negara apakah yang berbatasan darat langsung dengan wilayah Indonesia di Pulau Timor?",
    answer: "Timor-Leste",
    distractors: ["Australia", "Papua Nugini", "Filipina", "Malaysia"],
    explanation: "Indonesia berbatasan darat dengan Timor-Leste di Pulau Timor (Nusa Tenggara Timur).",
  },
  {
    question: "Samudra apakah yang membentang di sebelah barat dan selatan kepulauan Indonesia?",
    answer: "Samudra Hindia",
    distractors: ["Samudra Pasifik", "Samudra Atlantik", "Samudra Arktik", "Samudra Selatan"],
    explanation: "Samudra Hindia terletak di sebelah barat Sumatra dan selatan Jawa hingga Nusa Tenggara.",
  },
  {
    question: "Samudra apakah yang membentang di sebelah timur laut wilayah kepulauan Indonesia?",
    answer: "Samudra Pasifik",
    distractors: ["Samudra Hindia", "Samudra Atlantik", "Samudra Arktik", "Samudra Selatan"],
    explanation: "Samudra Pasifik terletak di sebelah utara Papua dan timur laut Indonesia.",
  },
  {
    question: "Laut apakah yang memisahkan wilayah Nusa Tenggara Timur Indonesia dengan Australia bagian utara?",
    answer: "Laut Timor",
    distractors: ["Laut Jawa", "Laut Banda", "Laut Sulawesi", "Laut Natuna Utara"],
    explanation: "Laut Timor dan Laut Arafura berada di antara wilayah Indonesia bagian selatan-timur dan Australia.",
  },
  {
    question: "Selat apakah yang memisahkan Pulau Sumatra dengan Semenanjung Malaya?",
    answer: "Selat Malaka",
    distractors: ["Selat Sunda", "Selat Karimata", "Selat Makassar", "Selat Bangka"],
    explanation: "Selat Malaka memisahkan Pulau Sumatra dari Semenanjung Malaya.",
  },
  {
    question: "Selat apakah yang memisahkan Pulau Jawa dan Pulau Bali?",
    answer: "Selat Bali",
    distractors: ["Selat Lombok", "Selat Sunda", "Selat Madura", "Selat Alas"],
    explanation: "Selat Bali terletak tepat di antara Pulau Jawa dan Pulau Bali.",
  },
  {
    question: "Selat apakah yang memisahkan Pulau Kalimantan dan Pulau Sulawesi?",
    answer: "Selat Makassar",
    distractors: ["Selat Karimata", "Selat Malaka", "Selat Lombok", "Selat Berhala"],
    explanation: "Selat Makassar memisahkan Pulau Kalimantan di barat dan Pulau Sulawesi di timur.",
  },
  {
    question: "Berapakah jumlah provinsi di Indonesia setelah pemekaran provinsi-provinsi baru di wilayah Papua?",
    answer: "38 provinsi",
    distractors: ["34 provinsi", "36 provinsi", "37 provinsi", "40 provinsi"],
    explanation: "Indonesia terdiri atas 38 provinsi setelah pembentukan empat daerah otonom baru di Papua.",
  },
  {
    question: "Siapakah Menteri Dalam Negeri pada Kabinet Merah Putih yang dilantik Oktober 2024?",
    answer: "Muhammad Tito Karnavian",
    explanation: "Muhammad Tito Karnavian menjabat sebagai Menteri Dalam Negeri pada Kabinet Merah Putih.",
    pool: "menteri",
  },
  {
    question: "Siapakah Menteri Luar Negeri pada Kabinet Merah Putih yang dilantik Oktober 2024?",
    answer: "Sugiono",
    explanation: "Sugiono menjabat sebagai Menteri Luar Negeri pada Kabinet Merah Putih.",
    pool: "menteri",
  },
  {
    question: "Siapakah Menteri Pertahanan pada Kabinet Merah Putih yang dilantik Oktober 2024?",
    answer: "Sjafrie Sjamsoeddin",
    explanation: "Sjafrie Sjamsoeddin menjabat sebagai Menteri Pertahanan pada Kabinet Merah Putih.",
    pool: "menteri",
  },
  {
    question: "Siapakah Menteri Pendidikan Dasar dan Menengah pada Kabinet Merah Putih?",
    answer: "Abdul Mu'ti",
    explanation: "Abdul Mu'ti menjabat sebagai Menteri Pendidikan Dasar dan Menengah pada Kabinet Merah Putih.",
    pool: "menteri",
  },
  {
    question: "Siapakah Menteri Kesehatan pada Kabinet Merah Putih?",
    answer: "Budi Gunadi Sadikin",
    explanation: "Budi Gunadi Sadikin menjabat sebagai Menteri Kesehatan pada Kabinet Merah Putih.",
    pool: "menteri",
  },
  {
    question: "Siapakah Menteri Agama pada Kabinet Merah Putih?",
    answer: "Nasaruddin Umar",
    explanation: "Nasaruddin Umar menjabat sebagai Menteri Agama pada Kabinet Merah Putih.",
    pool: "menteri",
  },
  {
    question: "Siapakah Menteri Badan Usaha Milik Negara yang dilantik pada awal Kabinet Merah Putih Oktober 2024?",
    answer: "Erick Thohir",
    explanation: "Erick Thohir dilantik pada jajaran Kabinet Merah Putih Oktober 2024.",
    pool: "menteri",
  },
  {
    question: "Siapakah Menteri Sekretaris Negara pada Kabinet Merah Putih?",
    answer: "Prasetyo Hadi",
    explanation: "Prasetyo Hadi menjabat sebagai Menteri Sekretaris Negara pada Kabinet Merah Putih.",
    pool: "menteri",
  },
  {
    question: "Lembaga negara apakah yang bertugas memeriksa pengelolaan dan tanggung jawab keuangan negara?",
    answer: "Badan Pemeriksa Keuangan",
    explanation: "BPK bertugas memeriksa pengelolaan dan tanggung jawab tentang keuangan negara.",
    pool: "lembaga",
  },
  {
    question: "Lembaga perwakilan apakah yang memegang kekuasaan membentuk undang-undang bersama Presiden?",
    answer: "Dewan Perwakilan Rakyat",
    explanation: "DPR memegang fungsi legislasi, anggaran, dan pengawasan.",
    pool: "lembaga",
  },
  {
    question: "Lembaga negara apakah yang mewakili aspirasi dan kepentingan daerah provinsi di tingkat pusat?",
    answer: "Dewan Perwakilan Daerah",
    explanation: "DPD merupakan lembaga perwakilan daerah yang mengajukan dan membahas RUU terkait otonomi daerah.",
    pool: "lembaga",
  },
  {
    question: "Lembaga pelaku kekuasaan kehakiman apakah yang berwenang mengadili perkara pada tingkat kasasi?",
    answer: "Mahkamah Agung",
    explanation: "Mahkamah Agung berwenang mengadili pada tingkat kasasi dan menguji peraturan di bawah UU terhadap UU.",
    pool: "lembaga",
  },
  {
    question: "Lembaga pelaku kekuasaan kehakiman apakah yang berwenang menguji undang-undang terhadap UUD NRI Tahun 1945?",
    answer: "Mahkamah Konstitusi",
    explanation: "Mahkamah Konstitusi berwenang menguji undang-undang terhadap Undang-Undang Dasar.",
    pool: "lembaga",
  },
  {
    question: "Lembaga penyelenggara pemilu yang bersifat nasional, tetap, dan mandiri menurut Pasal 22E UUD 1945 adalah...",
    answer: "Komisi Pemilihan Umum",
    explanation: "Komisi Pemilihan Umum menyelenggarakan pemilihan umum secara nasional, tetap, dan mandiri.",
    pool: "lembaga",
  },
)

const globalFacts: Fact[] = [
  {
    question: "Di kota manakah Konferensi Asia-Afrika tahun 1955 diselenggarakan?",
    answer: "Bandung",
    distractors: ["Jakarta", "Bogor", "Yogyakarta", "Kolombo"],
    explanation: "Konferensi Asia-Afrika diselenggarakan di Bandung pada 18–24 April 1955.",
  },
  {
    question: "Pada tahun berapakah Konferensi Asia-Afrika berlangsung di Bandung?",
    answer: "1955",
    distractors: ["1950", "1954", "1961", "1967"],
    explanation: "Konferensi Asia-Afrika berlangsung pada tahun 1955.",
  },
  {
    question: "Berapa negara peserta yang menghadiri Konferensi Asia-Afrika tahun 1955?",
    answer: "29 negara",
    distractors: ["25 negara", "27 negara", "32 negara", "35 negara"],
    explanation: "Sebanyak 29 negara dari kawasan Asia dan Afrika menghadiri KAA 1955.",
  },
  {
    question: "Apakah nama sepuluh prinsip perdamaian dan kerja sama yang dihasilkan Konferensi Asia-Afrika 1955?",
    answer: "Dasasila Bandung",
    distractors: ["Deklarasi Bogor", "Piagam Jakarta", "Deklarasi Bangkok", "Deklarasi Djuanda"],
    explanation: "Sepuluh prinsip hasil KAA 1955 dikenal sebagai Dasasila Bandung.",
  },
  {
    question: "Gedung bersejarah apakah yang menjadi lokasi sidang utama Konferensi Asia-Afrika di Bandung?",
    answer: "Gedung Merdeka",
    distractors: ["Gedung Sate", "Gedung Agung", "Gedung Pancasila", "Istana Bogor"],
    explanation: "Sidang KAA berlangsung di Gedung Merdeka (dahulu Gedung Concordia), Bandung.",
  },
  {
    question: "Pada tanggal berapakah Konferensi Asia-Afrika tahun 1955 secara resmi dibuka?",
    answer: "18 April 1955",
    distractors: ["17 April 1955", "20 April 1955", "24 April 1955", "28 April 1955"],
    explanation: "KAA dibuka oleh Presiden Sukarno pada 18 April 1955.",
  },
  {
    question: "Pada tanggal berapakah Konferensi Asia-Afrika tahun 1955 resmi ditutup?",
    answer: "24 April 1955",
    distractors: ["22 April 1955", "25 April 1955", "28 April 1955", "30 April 1955"],
    explanation: "KAA ditutup pada 24 April 1955 dengan pengesahan komunike akhir dan Dasasila Bandung.",
  },
  {
    question: "Siapakah Perdana Menteri Indonesia yang menggagas dan mengetuai sidang Konferensi Asia-Afrika 1955?",
    answer: "Ali Sastroamidjojo",
    distractors: ["Mohammad Natsir", "Burhanuddin Harahap", "Djuanda Kartawidjaja", "Wilopo"],
    explanation: "Perdana Menteri Ali Sastroamidjojo memprakarsai dan terpilih sebagai Ketua KAA 1955.",
  },
  {
    question: "Apakah nama organisasi kerja sama regional negara-negara Asia Tenggara yang didirikan tahun 1967?",
    answer: "ASEAN",
    distractors: ["APEC", "SAARC", "SEATO", "BIMSTEC"],
    explanation: "ASEAN adalah Association of Southeast Asian Nations.",
  },
  {
    question: "Pada tanggal berapakah ASEAN secara resmi didirikan?",
    answer: "8 Agustus 1967",
    distractors: ["17 Agustus 1967", "24 Oktober 1967", "18 April 1967", "28 September 1967"],
    explanation: "ASEAN didirikan pada 8 Agustus 1967 melalui penandatanganan Deklarasi Bangkok.",
  },
  {
    question: "Di kota manakah deklarasi pendirian ASEAN tahun 1967 ditandatangani?",
    answer: "Bangkok",
    distractors: ["Jakarta", "Kuala Lumpur", "Manila", "Singapura"],
    explanation: "Deklarasi ASEAN ditandatangani oleh lima menteri luar negeri di Bangkok, Thailand.",
  },
  {
    question: "Negara manakah yang resmi diterima menjadi anggota penuh ke-11 ASEAN pada Oktober 2025?",
    answer: "Timor-Leste",
    distractors: ["Papua Nugini", "Sri Lanka", "Palau", "Bangladesh"],
    explanation: "Timor-Leste resmi diterima sebagai anggota ke-11 ASEAN pada KTT ASEAN Oktober 2025.",
  },
  {
    question: "Berapakah jumlah negara anggota penuh ASEAN setelah bergabungnya Timor-Leste?",
    answer: "11 negara",
    distractors: ["10 negara", "9 negara", "12 negara", "13 negara"],
    explanation: "Dengan masuknya Timor-Leste, ASEAN beranggotakan 11 negara Asia Tenggara.",
  },
  {
    question: "Di kota manakah gedung Sekretariat ASEAN berkedudukan tetap?",
    answer: "Jakarta",
    distractors: ["Singapura", "Bangkok", "Kuala Lumpur", "Manila"],
    explanation: "Sekretariat ASEAN berkedudukan tetap di Jalan Sisingamangaraja, Jakarta.",
  },
  {
    question: "Negara manakah yang menjadi tuan rumah KTT ASEAN pertama di Bali tahun 1976?",
    answer: "Indonesia",
    distractors: ["Malaysia", "Thailand", "Filipina", "Singapura"],
    explanation: "Indonesia menjadi tuan rumah KTT ASEAN ke-1 di Bali pada Februari 1976.",
  },
  {
    question: "Apakah nama organisasi internasional yang dibentuk tahun 1945 usai Perang Dunia II untuk menjaga perdamaian dunia?",
    answer: "Perserikatan Bangsa-Bangsa",
    distractors: [
      "Liga Bangsa-Bangsa",
      "Gerakan Non-Blok",
      "Mahkamah Pidana Internasional",
      "Organisasi Kerja Sama Ekonomi",
    ],
    explanation: "Perserikatan Bangsa-Bangsa (PBB) didirikan pada 24 Oktober 1945.",
  },
  {
    question: "Pada tahun berapakah organisasi Perserikatan Bangsa-Bangsa (PBB) resmi didirikan?",
    answer: "1945",
    distractors: ["1919", "1942", "1948", "1950"],
    explanation: "Piagam PBB mulai berlaku secara resmi pada 24 Oktober 1945.",
  },
  {
    question: "Pada tanggal berapakah Republik Indonesia pertama kali diterima sebagai anggota PBB?",
    answer: "28 September 1950",
    distractors: ["27 Desember 1949", "17 Agustus 1950", "24 Oktober 1950", "18 April 1955"],
    explanation: "Indonesia resmi diterima menjadi anggota PBB pada 28 September 1950.",
  },
  {
    question: "Indonesia diterima menjadi anggota Perserikatan Bangsa-Bangsa (PBB) pada urutan ke berapa?",
    answer: "Ke-60",
    distractors: ["Ke-50", "Ke-55", "Ke-65", "Ke-70"],
    explanation: "Indonesia tercatat sebagai negara anggota ke-60 PBB pada tahun 1950.",
  },
  {
    question: "Apakah nama forum negara-negara yang memilih tidak memihak blok Barat maupun blok Timur pada masa Perang Dingin?",
    answer: "Gerakan Non-Blok",
    distractors: ["Pakta Warsawa", "Pakta Atlantik Utara", "Persemakmuran Bangsa", "Kelompok Tujuh"],
    explanation: "Gerakan Non-Blok (GNB) didirikan tahun 1961 dengan peran aktif Presiden Sukarno.",
  },
  {
    question: "Di kota manakah Konferensi Tingkat Tinggi pertama Gerakan Non-Blok diselenggarakan pada tahun 1961?",
    answer: "Beograd",
    distractors: ["Kairo", "New Delhi", "Bandung", "Havana"],
    explanation: "KTT ke-1 Gerakan Non-Blok berlangsung di Beograd, Yugoslavia, pada September 1961.",
  },
  {
    question: "Negara manakah yang memegang Presidensi dan menjadi tuan rumah KTT G20 pada tahun 2022?",
    answer: "Indonesia",
    distractors: ["India", "Brasil", "Italia", "Jepang"],
    explanation: "Indonesia memegang Presidensi G20 tahun 2022 dengan tema Recover Together, Recover Stronger.",
  },
  {
    question: "Di provinsi/pulau manakah puncak KTT G20 Presidensi Indonesia tahun 2022 dilaksanakan?",
    answer: "Bali",
    distractors: ["DKI Jakarta", "Jawa Barat", "Nusa Tenggara Barat", "DI Yogyakarta"],
    explanation: "Puncak KTT G20 Indonesia berlangsung di Nusa Dua, Bali, pada November 2022.",
  },
  {
    question: "Apakah nama dokumen deklarasi yang menandai berdirinya organisasi ASEAN tahun 1967?",
    answer: "Deklarasi Bangkok",
    distractors: ["Deklarasi Kuala Lumpur", "Deklarasi Bali Concord", "Deklarasi Manila", "Piagam Jakarta"],
    explanation: "ASEAN dibentuk melalui penandatanganan Deklarasi Bangkok pada 8 Agustus 1967.",
  },
  {
    question: "Apakah singkatan forum kerja sama ekonomi kawasan Asia-Pasifik yang turut diikuti Indonesia sejak 1989?",
    answer: "APEC",
    distractors: ["OPEC", "OECD", "NAFTA", "MERCOSUR"],
    explanation: "APEC (Asia-Pacific Economic Cooperation) adalah forum kerja sama ekonomi lingkar Asia-Pasifik.",
  },
  {
    question: "Apakah kepanjangan dari forum ekonomi internasional G20?",
    answer: "Group of Twenty",
    distractors: [
      "Global Twenty Nations",
      "Governance of Twenty",
      "Gateway of Twenty",
      "Guild of Twenty",
    ],
    explanation: "G20 adalah singkatan dari Group of Twenty.",
  },
  {
    question: "Apakah tujuan utama penyelenggaraan Konferensi Asia-Afrika tahun 1955?",
    answer: "Mempererat solidaritas Asia-Afrika dan menentang segala bentuk kolonialisme",
    distractors: [
      "Membentuk aliansi pakta pertahanan militer bersama melawan Eropa Barat",
      "Menetapkan mata uang tunggal bagi seluruh negara di Asia dan Afrika",
      "Menggantikan kedudukan Perserikatan Bangsa-Bangsa dalam hukum global",
      "Menyeragamkan bentuk pemerintahan negara peserta menjadi sistem parlementer",
    ],
    explanation: "KAA bertujuan mendorong kerja sama Asia-Afrika, perdamaian dunia, dan penghapusan kolonialisme.",
  },
  {
    question: "Dua kawasan benua apakah yang menjadi peserta utama dalam Konferensi Bandung tahun 1955?",
    answer: "Asia dan Afrika",
    distractors: ["Asia dan Eropa", "Asia dan Amerika", "Afrika dan Eropa", "Asia dan Australia"],
    explanation: "KAA 1955 mempertemukan negara-negara merdeka dari benua Asia dan Afrika.",
  },
  {
    question: "Apakah istilah hubungan internasional bagi prinsip menghormati kedaulatan dan tidak mencampuri urusan dalam negeri negara lain?",
    answer: "Nonintervensi",
    distractors: ["Ekstrateritorial", "Resiprositas", "Yurisdiksi universal", "Ratifikasi"],
    explanation: "Prinsip nonintervensi melarang suatu negara mencampuri urusan domestik negara berdaulat lain.",
  },
  {
    question: "Kota manakah yang dijuluki sebagai ibu kota diplomasi ASEAN karena menjadi lokasi Sekretariat ASEAN dan Perwakilan Tetap?",
    answer: "Jakarta",
    distractors: ["Bangkok", "Kuala Lumpur", "Singapura", "Hanoi"],
    explanation: "Jakarta merupakan kedudukan Sekretariat ASEAN dan misi diplomatik tetap negara mitra bagi ASEAN.",
  },
]

const inventorFacts: Fact[] = [
  ["Michael Faraday", "induksi elektromagnetik"],
  ["Alexander Graham Bell", "telepon"],
  ["Thomas Alva Edison", "lampu pijar praktis"],
  ["Alexander Fleming", "penisilin"],
  ["Albert Einstein", "teori relativitas"],
  ["Johannes Gutenberg", "mesin cetak huruf lepas di Eropa"],
  ["Isaac Newton", "hukum gerak dan gravitasi klasik"],
  ["Marie Curie", "penelitian radioaktivitas"],
  ["Charles Darwin", "teori evolusi melalui seleksi alam"],
  ["Wright bersaudara", "pesawat bermesin yang berhasil terbang"],
  ["Nikola Tesla", "pengembangan sistem arus bolak-balik"],
  ["James Watt", "penyempurnaan mesin uap"],
  ["Galileo Galilei", "pengamatan astronomi dengan teleskop"],
  ["Nicolaus Copernicus", "model tata surya heliosentris"],
  ["Louis Pasteur", "pasteurisasi"],
  ["Ada Lovelace", "algoritma awal untuk mesin analitik"],
  ["Tim Berners-Lee", "World Wide Web"],
  ["Johannes Kepler", "hukum gerak planet"],
  ["Dmitri Mendeleev", "tabel periodik unsur"],
  ["Gregor Mendel", "dasar ilmu genetika"],
  ["Katherine Johnson", "perhitungan lintasan penerbangan antariksa NASA"],
  ["Grace Hopper", "pengembangan compiler komputer"],
  ["Alan Turing", "landasan teoretis ilmu komputasi"],
  ["Robert Koch", "penelitian bakteri penyebab penyakit"],
  ["Edward Jenner", "vaksin cacar"],
  ["Alessandro Volta", "baterai listrik awal (tumpukan volta)"],
  ["Samuel Morse", "kode telegraf yang memakai namanya"],
  ["Guglielmo Marconi", "pengembangan telegrafi nirkabel"],
  ["Hedy Lamarr", "gagasan komunikasi spread-spectrum"],
  ["Tu Youyou", "penemuan artemisinin untuk pengobatan malaria"],
].map(([person, contribution]) => ({
  question: `Tokoh ilmuwan/penemu yang dikenal atas kontribusinya pada ${contribution} adalah ....`,
  answer: person,
  explanation: `${person} dikenal atas kontribusi pentingnya pada ${contribution}.`,
  pool: "penemu",
}))

const worldCapitalFacts: Fact[] = [
  ["Vietnam", "Hanoi"],
  ["Filipina", "Manila"],
  ["Myanmar", "Naypyidaw"],
  ["Thailand", "Bangkok"],
  ["Malaysia", "Kuala Lumpur"],
  ["Singapura", "Singapura"],
  ["Kamboja", "Phnom Penh"],
  ["Laos", "Vientiane"],
  ["Brunei Darussalam", "Bandar Seri Begawan"],
  ["Timor-Leste", "Dili"],
  ["Amerika Serikat", "Washington, D.C."],
  ["Australia", "Canberra"],
  ["Turki", "Ankara"],
  ["Brasil", "Brasília"],
  ["India", "New Delhi"],
  ["Jepang", "Tokyo"],
  ["Tiongkok", "Beijing"],
  ["Korea Selatan", "Seoul"],
  ["Pakistan", "Islamabad"],
  ["Bangladesh", "Dhaka"],
  ["Nepal", "Kathmandu"],
  ["Arab Saudi", "Riyadh"],
  ["Uni Emirat Arab", "Abu Dhabi"],
  ["Mesir", "Kairo"],
  ["Selandia Baru", "Wellington"],
  ["Prancis", "Paris"],
  ["Jerman", "Berlin"],
  ["Italia", "Roma"],
  ["Spanyol", "Madrid"],
  ["Britania Raya", "London"],
].map(([country, capital]) => ({
  question: `Apakah ibu kota negara ${country}?`,
  answer: capital,
  explanation: `Ibu kota negara ${country} adalah ${capital}.`,
  pool: "ibu-kota",
}))

const organizationFacts: Fact[] = [
  ["UNESCO", "pendidikan, ilmu pengetahuan, dan kebudayaan", "Paris"],
  ["UNICEF", "perlindungan dan kesejahteraan anak", "New York"],
  ["WHO", "kesehatan masyarakat dunia", "Jenewa"],
  ["UNHCR", "perlindungan pengungsi internasional", "Jenewa"],
  ["ILO", "ketenagakerjaan dan standar kerja internasional", "Jenewa"],
  ["FAO", "pangan dan pertanian dunia", "Roma"],
  ["IMF", "stabilitas moneter dan kerja sama keuangan global", "Washington, D.C."],
  ["Bank Dunia", "pembiayaan pembangunan dan pengurangan kemiskinan", "Washington, D.C."],
  ["ICAO", "penerbangan sipil internasional", "Montreal"],
  ["IMO", "keselamatan pelayaran dan pencegahan pencemaran laut", "London"],
  ["WIPO", "perlindungan kekayaan intelektual dunia", "Jenewa"],
  ["IAEA", "kerja sama dan pengawasan pemanfaatan energi atom", "Wina"],
  ["OPEC", "koordinasi kebijakan negara-negara pengekspor minyak", "Wina"],
  ["NATO", "aliansi pertahanan kolektif negara-negara Atlantik Utara", "Brussels"],
  ["ASEAN", "kerja sama regional negara-negara Asia Tenggara", "Jakarta"],
  ["PBB", "pemeliharaan perdamaian dan keamanan internasional", "New York"],
  ["UNDP", "program pembangunan dan pengentasan kemiskinan global", "New York"],
  ["UN Women", "kesetaraan gender dan pemberdayaan perempuan", "New York"],
  ["UNIDO", "pengembangan industri yang inklusif dan berkelanjutan", "Wina"],
  ["WMO", "kerja sama meteorologi, iklim, dan hidrologi dunia", "Jenewa"],
  ["ITU", "standardisasi telekomunikasi dan teknologi informasi global", "Jenewa"],
  ["IFAD", "pendanaan pembangunan pertanian pedesaan", "Roma"],
  ["UNEP", "program pelestarian lingkungan hidup global", "Nairobi"],
  ["UN Tourism", "kepariwisataan dunia yang bertanggung jawab dan berkelanjutan", "Madrid"],
  ["ICJ", "penyelesaian sengketa hukum antarnegara di peradilan PBB", "Den Haag"],
  ["Interpol", "kerja sama kepolisian kriminal lintas negara", "Lyon"],
  ["WFP", "bantuan darurat pangan kemanusiaan dunia", "Roma"],
  ["IOM", "penanganan migrasi internasional yang tertib dan manusiawi", "Jenewa"],
  ["WTO", "aturan dan perundingan perdagangan multilateral dunia", "Jenewa"],
  ["UNODC", "penanggulangan narkotika dan kejahatan transnasional", "Wina"],
].flatMap(([org, mandate, headquarters]) => [
  {
    question: `Organisasi internasional apakah yang bergerak dalam bidang ${mandate}?`,
    answer: org,
    explanation: `${org} menjalankan mandat di bidang ${mandate}.`,
    pool: "organisasi",
  },
  {
    question: `Di kota manakah kantor pusat ${org} berada?`,
    answer: headquarters,
    explanation: `Kantor pusat ${org} berkedudukan di ${headquarters}.`,
    pool: "markas",
  },
])

const symbolFacts: Fact[] = [
  {
    question: "Bunga apakah yang ditetapkan melalui Keppres Nomor 4 Tahun 1993 sebagai Puspa Bangsa Indonesia?",
    answer: "Melati putih",
    distractors: ["Anggrek bulan", "Padma raksasa", "Bunga cempaka", "Bunga kenanga"],
    explanation: "Melati putih (Jasminum sambac) ditetapkan sebagai Puspa Bangsa Indonesia.",
  },
  {
    question: "Bunga apakah yang ditetapkan sebagai Puspa Pesona Indonesia?",
    answer: "Anggrek bulan",
    distractors: ["Melati putih", "Padma raksasa", "Bunga teratai", "Bunga edelweis"],
    explanation: "Anggrek bulan (Phalaenopsis amabilis) ditetapkan sebagai Puspa Pesona Indonesia.",
  },
  {
    question: "Flora apakah yang ditetapkan sebagai Puspa Langka Nasional Indonesia?",
    answer: "Padma raksasa",
    distractors: ["Melati putih", "Anggrek bulan", "Kantong semar", "Cendana wangi"],
    explanation: "Padma raksasa (Rafflesia arnoldii) ditetapkan sebagai Puspa Langka Indonesia.",
  },
  {
    question: "Satwa apakah yang ditetapkan sebagai Satwa Nasional (Satwa Darat) Indonesia?",
    answer: "Komodo",
    distractors: ["Elang Jawa", "Ikan siluk merah", "Badak Jawa", "Harimau Sumatra"],
    explanation: "Komodo (Varanus komodoensis) ditetapkan sebagai Satwa Nasional Indonesia.",
  },
  {
    question: "Satwa air apakah yang ditetapkan sebagai Satwa Pesona Nasional Indonesia?",
    answer: "Ikan siluk merah",
    distractors: ["Ikan napoleon", "Pesut Mahakam", "Penyu belimbing", "Hiu paus"],
    explanation: "Ikan siluk merah atau arwana merah (Scleropages formosus) ditetapkan sebagai Satwa Pesona.",
  },
  {
    question: "Satwa burung apakah yang ditetapkan sebagai Satwa Langka Nasional Indonesia?",
    answer: "Elang Jawa",
    distractors: ["Jalak Bali", "Cenderawasih", "Burung maleo", "Kakatua raja"],
    explanation: "Elang Jawa (Nisaetus bartelsi) ditetapkan sebagai Satwa Langka Indonesia.",
  },
  {
    question: "Apakah nama ilmiah dari bunga melati putih yang ditetapkan sebagai Puspa Bangsa?",
    answer: "Jasminum sambac",
    distractors: ["Phalaenopsis amabilis", "Rafflesia arnoldii", "Amorphophallus titanum", "Nelumbo nucifera"],
    explanation: "Nama ilmiah melati putih Puspa Bangsa adalah Jasminum sambac.",
  },
  {
    question: "Di provinsi manakah habitat alami satwa purba komodo berada?",
    answer: "Nusa Tenggara Timur",
    distractors: ["Nusa Tenggara Barat", "Maluku Tenggara", "Sulawesi Tenggara", "Papua Barat"],
    explanation: "Komodo hidup secara alami di Taman Nasional Komodo, Provinsi Nusa Tenggara Timur.",
  },
  {
    question: "Burung apakah yang dikenal sebagai fauna endemik ikonik tanah Papua dengan bulu indah?",
    answer: "Cenderawasih",
    distractors: ["Jalak Bali", "Elang Jawa", "Burung maleo", "Rangkong gading"],
    explanation: "Burung cenderawasih merupakan fauna endemik kebanggaan wilayah Papua.",
  },
  {
    question: "Mamalia berkantung (marsupialia) manakah yang merupakan satwa khas hutan Papua?",
    answer: "Kanguru pohon",
    distractors: ["Anoa pegunungan", "Babirusa", "Tarsius kerdil", "Bekantan"],
    explanation: "Kanguru pohon (Dendrolagus) merupakan mamalia berkantung endemik hutan Papua.",
  },
  {
    question: "Mamalia endemik Pulau Sulawesi yang menyerupai kerbau kerdil bertanduk lurus adalah...",
    answer: "Anoa",
    distractors: ["Tapir Asia", "Kijang muncak", "Banteng Jawa", "Kambing hutan"],
    explanation: "Anoa adalah mamalia endemik khas Pulau Sulawesi yang dilindungi.",
  },
  {
    question: "Burung berbulu putih bersih dengan pelupuk mata biru yang endemik di Pulau Bali adalah...",
    answer: "Jalak Bali",
    distractors: ["Cenderawasih kuning", "Elang bondol", "Nuri kepala hitam", "Kepodang emas"],
    explanation: "Jalak Bali (Leucopsar rothschildi) adalah burung endemik Pulau Bali.",
  },
  {
    question: "Spesies badak bercula satu yang dilestarikan di Taman Nasional Ujung Kulon, Banten, adalah...",
    answer: "Badak Jawa",
    distractors: ["Badak Sumatra", "Badak Kalimantan", "Badak Putih", "Badak India"],
    explanation: "Badak Jawa (Rhinoceros sondaicus) hidup di habitat terakhirnya di Taman Nasional Ujung Kulon.",
  },
  {
    question: "Di pulau manakah spesies kera besar langka orangutan Tapanuli hidup secara alami?",
    answer: "Pulau Sumatra",
    distractors: ["Pulau Kalimantan", "Pulau Sulawesi", "Pulau Jawa", "Pulau Papua"],
    explanation: "Orangutan Tapanuli (Pongo tapanuliensis) ditemukan di ekosistem Batang Toru, Sumatra Utara.",
  },
  {
    question: "Di pulau manakah burung maleo yang mengubur telurnya di pasir hangat merupakan satwa endemik?",
    answer: "Pulau Sulawesi",
    distractors: ["Pulau Sumatra", "Pulau Kalimantan", "Pulau Bali", "Pulau Timor"],
    explanation: "Maleo senkawor merupakan burung endemik Pulau Sulawesi.",
  },
  {
    question: "Primata berhidung panjang yang menjadi fauna identitas Provinsi Kalimantan Selatan adalah...",
    answer: "Bekantan",
    distractors: ["Owa Jawa", "Siamang", "Kukang", "Lutung budeng"],
    explanation: "Bekantan (Nasalis larvatus) merupakan primata endemik Kalimantan dan maskot Kalimantan Selatan.",
  },
  {
    question: "Apakah nama ilmiah dari tumbuhan parasit tanpa daun sejati yang menjadi Puspa Langka Indonesia?",
    answer: "Rafflesia arnoldii",
    distractors: ["Jasminum sambac", "Phalaenopsis amabilis", "Santalum album", "Shorea pinanga"],
    explanation: "Rafflesia arnoldii merupakan nama ilmiah padma raksasa yang ditetapkan sebagai Puspa Langka.",
  },
  {
    question: "Unsur utama apakah yang ditampilkan pada lencana lambang Purna Paskibraka Indonesia?",
    answer: "Bunga teratai yang dilingkari mata rantai",
    distractors: [
      "Padi dan kapas yang mengapit bintang emas",
      "Burung garuda di atas kemudi kapal",
      "Obor menyala di antara dua sayap perak",
      "Pohon beringin dengan perisai merah putih",
    ],
    explanation: "Lambang PPI menampilkan bunga teratai putih yang dikelilingi 16 mata rantai bulat dan belah ketupat.",
  },
  {
    question: "Makna filosofis tiga helai mahkota bunga yang tumbuh ke atas pada lambang kepaskibrakaan ialah...",
    answer: "Belajar, bekerja, dan berbakti",
    distractors: [
      "Aktif, disiplin, dan gembira",
      "Beriman, berilmu, dan beramal",
      "Tangguh, tanggap, dan trengginas",
      "Mandiri, kreatif, dan gotong royong",
    ],
    explanation: "Tiga helai tumbuh ke atas bermakna belajar, bekerja, dan berbakti.",
  },
  {
    question: "Makna filosofis tiga helai kelopak yang tumbuh mendatar pada lambang kepaskibrakaan ialah...",
    answer: "Aktif, disiplin, dan gembira",
    distractors: [
      "Belajar, bekerja, dan berbakti",
      "Jujur, adil, dan bertanggung jawab",
      "Cepat, tepat, dan terukur",
      "Sopan, santun, dan bersahaja",
    ],
    explanation: "Tiga helai mendatar bermakna karakter pemuda yang aktif, disiplin, dan gembira.",
  },
  {
    question: "Mata rantai bulat dan belah ketupat yang saling berkaitan pada lambang kepaskibrakaan melambangkan...",
    answer: "Persaudaraan akrab antarsesama generasi muda dari seluruh penjuru tanah air",
    distractors: [
      "Pemisahan jenjang kepangkatan antara pengurus pusat dan pengurus daerah",
      "Keterikatan mutlak organisasi pada struktur komando angkatan bersenjata",
      "Batas wilayah administrasi darat dan laut Negara Kesatuan Republik Indonesia",
      "Urutan tahapan seleksi fisik yang wajib dilalui setiap calon peserta",
    ],
    explanation: "Mata rantai melambangkan persaudaraan putra-putri bangsa tanpa memandang asal suku, agama, dan daerah.",
  },
  {
    question: "Berapa jumlah bulu pada masing-masing sayap Garuda Pancasila yang melambangkan tanggal kemerdekaan?",
    answer: "17 helai",
    distractors: ["8 helai", "19 helai", "45 helai", "27 helai"],
    explanation: "Jumlah bulu Garuda Pancasila melambangkan 17-8-1945: 17 helai pada tiap sayap, 8 pada ekor, 19 di pangkal ekor, dan 45 di leher.",
  },
  {
    question: "Burung tidak terbang apakah yang dikenal luas sebagai simbol fauna nasional Selandia Baru?",
    answer: "Burung kiwi",
    distractors: ["Burung emu", "Burung kasuari", "Burung unta", "Burung albatros"],
    explanation: "Burung kiwi merupakan satwa endemik dan simbol nasional Selandia Baru.",
  },
  {
    question: "Mamalia berkantung apakah yang menjadi salah satu simbol nasional pada lambang negara Australia?",
    answer: "Kanguru",
    distractors: ["Koala", "Platipus", "Wombat", "Walabi"],
    explanation: "Lambang perisai negara Australia ditopang oleh kanguru merah dan burung emu.",
  },
  {
    question: "Bunga apakah yang menjadi simbol budaya nasional Jepang yang mekar pada musim semi?",
    answer: "Bunga sakura",
    distractors: ["Bunga tulip", "Bunga peony", "Bunga lotus", "Bunga lavender"],
    explanation: "Sakura merupakan bunga simbolik yang sangat lekat dengan budaya Jepang.",
  },
  {
    question: "Bunga apakah yang menjadi ikon hortikultura dan simbol terkenal negara Belanda?",
    answer: "Bunga tulip",
    distractors: ["Bunga mawar", "Bunga sakura", "Bunga anggrek", "Bunga krisan"],
    explanation: "Tulip menjadi simbol ikonik negeri Belanda sejak abad ke-17.",
  },
  {
    question: "Pohon apakah yang tergambar berwarna hijau di bagian tengah bendera negara Lebanon?",
    answer: "Pohon aras",
    distractors: ["Pohon zaitun", "Pohon kurma", "Pohon ek", "Pohon baobab"],
    explanation: "Pohon aras Lebanon (Lebanon cedar) menjadi simbol keteguhan pada bendera nasional Lebanon.",
  },
  {
    question: "Burung pemangsa apakah yang menjadi lambang negara Amerika Serikat?",
    answer: "Elang botak",
    distractors: ["Elang emas", "Rajawali harpy", "Burung kondor", "Albatros kelana"],
    explanation: "Elang botak (Bald eagle) merupakan burung nasional dan lambang Amerika Serikat sejak 1782.",
  },
  {
    question: "Bunga air apakah yang ditetapkan sebagai bunga nasional negara India?",
    answer: "Bunga teratai",
    distractors: ["Bunga melati", "Bunga sepatu", "Bunga kamboja", "Bunga mawar"],
    explanation: "Teratai India (Nelumbo nucifera) merupakan bunga nasional India.",
  },
  {
    question: "Bunga berwarna kuning cerah apakah yang dikenal sebagai bunga nasional Ukraina?",
    answer: "Bunga matahari",
    distractors: ["Bunga edelweis", "Bunga tulip", "Bunga aster", "Bunga dandelion"],
    explanation: "Bunga matahari merupakan simbol nasional yang tumbuh luas di Ukraina.",
  },
]

const factSets = [
  historyFacts,
  geographyFacts,
  globalFacts,
  inventorFacts,
  worldCapitalFacts,
  organizationFacts,
  symbolFacts,
]

function optionsFor(fact: Fact, facts: Fact[], seed: number) {
  let distractors: string[] = []
  if (fact.distractors) {
    distractors = [...fact.distractors]
  } else {
    const pool = fact.pool ? facts.filter((item) => item.pool === fact.pool) : facts
    const choices = [...new Set(pool.map((item) => item.answer).filter((item) => item !== fact.answer))]
    for (let step = 0; step < choices.length && distractors.length < 4; step += 1) {
      const candidate = choices[(seed + step * 3) % choices.length]
      if (candidate && candidate !== fact.answer && !distractors.includes(candidate)) {
        distractors.push(candidate)
      }
    }
    for (const candidate of choices) {
      if (distractors.length >= 4) break
      if (candidate !== fact.answer && !distractors.includes(candidate)) {
        distractors.push(candidate)
      }
    }
  }
  const options = [fact.answer, ...distractors.slice(0, 4)]
  const correctIndex = seed % options.length
  ;[options[0], options[correctIndex]] = [options[correctIndex], options[0]]
  return { options, correctIndex }
}

function buildQuestion(categoryIndex: number, factIndex: number, index: number): CatQuestion {
  const categoryQuestions = factSets[categoryIndex]
  const fact = categoryQuestions[factIndex]
  const arranged = optionsFor(fact, categoryQuestions, index + 2_150)
  return {
    id: `tiu-${String(2_151 + index).padStart(4, "0")}`,
    type: "tiu",
    category: categories[categoryIndex],
    question: fact.question,
    options: arranged.options,
    correctIndex: arranged.correctIndex,
    explanation: fact.explanation,
    status: "active",
  }
}

export const tiuWawasanQuestions: CatQuestion[] = factSets.flatMap((facts, categoryIndex) => {
  const factCount = categoryIndex === 1 || categoryIndex === 5 ? 60 : 30
  return facts.slice(0, factCount).map((_, factIndex) => {
    const index =
      factSets
        .slice(0, categoryIndex)
        .reduce((total, _previous, previousIndex) => total + (previousIndex === 1 || previousIndex === 5 ? 60 : 30), 0) +
      factIndex
    return buildQuestion(categoryIndex, factIndex, index)
  })
})

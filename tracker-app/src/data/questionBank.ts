export interface Question {
  id: string;
  category: 'TWK' | 'TIU';
  subCategory: string;
  question: string;
  options: {
    key: 'A' | 'B' | 'C' | 'D' | 'E';
    text: string;
  }[];
  correctAnswer: 'A' | 'B' | 'C' | 'D' | 'E';
  explanation: string;
}

export const QUESTION_BANK: Question[] = [
  // TWK - Pancasila & Sejarah Kebangsaan
  {
    id: "TWK-01",
    category: "TWK",
    subCategory: "Pancasila & Ideologi",
    question: "Rumusan dasar negara Pancasila yang sah dan berlaku secara yuridis konstitusional tercantum di dalam...",
    options: [
      { key: "A", text: "Piagam Jakarta tanggal 22 Juni 1945" },
      { key: "B", text: "Pembukaan UUD 1945 alinea ke-4 yang disahkan PPKI 18 Agustus 1945" },
      { key: "C", text: "Dekrit Presiden 5 Juli 1959" },
      { key: "D", text: "Pidato Ir. Soekarno tanggal 1 Juni 1945" },
      { key: "E", text: "Ketetapan MPRS No. XX/MPRS/1966" }
    ],
    correctAnswer: "B",
    explanation: "Secara yuridis konstitusional, rumusan Pancasila yang sah dan mengikat tercantum dalam Pembukaan UUD Negara Republik Indonesia Tahun 1945 alinea keempat yang disahkan oleh PPKI pada tanggal 18 Agustus 1945."
  },
  {
    id: "TWK-02",
    category: "TWK",
    subCategory: "Sejarah Paskibraka & Lambang Negara",
    question: "Siapakah tokoh pencetus gagasan Pasukan Pengibar Bendera Pusaka (Paskibraka) pada masa awal kemerdekaan di Yogyakarta tahun 1946?",
    options: [
      { key: "A", text: "Soekarno" },
      { key: "B", text: "Mayor (L) Husein Mutahar" },
      { key: "C", text: "Sayuti Melik" },
      { key: "D", text: "Jenderal Soedirman" },
      { key: "E", text: "Ki Hajar Dewantara" },
    ],
    correctAnswer: "B",
    explanation: "Mayor (Laut) H. Husein Mutahar adalah tokoh yang ditugasi oleh Presiden Soekarno pada tahun 1946 untuk menyiapkan upacara peringatan HUT Proklamasi di Gedung Agung Yogyakarta dengan melibatkan 5 pemuda (3 putra, 2 putri)."
  },
  {
    id: "TWK-03",
    category: "TWK",
    subCategory: "UUD 1945 & Sistem Tata Negara",
    question: "Berdasarkan Pasal 1 Ayat (3) Undang-Undang Dasar Negara Republik Indonesia Tahun 1945, Negara Indonesia adalah negara...",
    options: [
      { key: "A", text: "Kesatuan yang berbentuk Republik" },
      { key: "B", text: "Hukum" },
      { key: "C", text: "Demokrasi berdasar Pancasila" },
      { key: "D", text: "Kepulauan yang berciri Nusantara" },
      { key: "E", text: "Birokrasi yang berdaulat" }
    ],
    correctAnswer: "B",
    explanation: "Pasal 1 ayat 3 UUD NRI 1945 berbunyi: 'Negara Indonesia adalah negara hukum'."
  },
  {
    id: "TWK-04",
    category: "TWK",
    subCategory: "Bhinneka Tunggal Ika",
    question: "Semboyan 'Bhinneka Tunggal Ika' diambil dari kitab Sutasoma karangan Mpu Tantular. Makna hakiki dari semboyan tersebut dalam konteks kebangsaan Indonesia adalah...",
    options: [
      { key: "A", text: "Perbedaan harus diseragamkan demi persatuan yang mutlak" },
      { key: "B", text: "Meskipun berbeda-beda tetapi pada hakikatnya bangsa Indonesia tetap satu kesatuan" },
      { key: "C", text: "Persatuan hanya dapat dicapai melalui asimilasi budaya total" },
      { key: "D", text: "Mengutamakan kepentingan golongan mayoritas dalam toleransi" },
      { key: "E", text: "Keberagaman suku bangsa merupakan pembatas integrasi nasional" }
    ],
    correctAnswer: "B",
    explanation: "Bhinneka Tunggal Ika berarti 'Berbeda-beda tetapi tetap satu jua', menegaskan bahwa keberagaman suku, agama, dan budaya terikat dalam satu keutuhan bangsa Indonesia."
  },
  {
    id: "TWK-05",
    category: "TWK",
    subCategory: "Peraturan Paskibraka & BPIP",
    question: "Regulasi terkini yang menjadi landasan hukum pembentukan Program Pasukan Pengibar Bendera Pusaka di bawah Badan Pembinaan Ideologi Pancasila (BPIP) adalah...",
    options: [
      { key: "A", text: "Perpres Nomor 51 Tahun 2022" },
      { key: "B", text: "Permenpora Nomor 14 Tahun 2017" },
      { key: "C", text: "UU Nomor 40 Tahun 2009" },
      { key: "D", text: "Kepres Nomor 65 Tahun 1999" },
      { key: "E", text: "Inpres Nomor 2 Tahun 2020" }
    ],
    correctAnswer: "A",
    explanation: "Perpres Nomor 51 Tahun 2022 tentang Program Pasukan Pengibar Bendera Pusaka menetapkan bahwa pengelolaan dan pembinaan Paskibraka dilaksanakan secara nasional dikoordinasikan oleh BPIP."
  },

  // TIU - Silogisme, Figural & Analogi
  {
    id: "TIU-01",
    category: "TIU",
    subCategory: "Silogisme & Logika Posisi",
    question: "Semua calon Paskibraka memiliki disiplin tinggi dan fisik prima. Sebagian siswa SMA/SMK/MA tidak memiliki fisik prima. Kesimpulan yang benar adalah...",
    options: [
      { key: "A", text: "Semua siswa SMA/SMK/MA bukan calon Paskibraka" },
      { key: "B", text: "Sebagian siswa SMA/SMK/MA bukan calon Paskibraka" },
      { key: "C", text: "Semua yang berdisiplin tinggi adalah calon Paskibraka" },
      { key: "D", text: "Siswa SMA/SMK/MA yang berdisiplin tinggi pasti terpilih Paskibraka" },
      { key: "E", text: "Sebagian calon Paskibraka tidak memiliki disiplin tinggi" }
    ],
    correctAnswer: "B",
    explanation: "Karena semua calon Paskibraka mutlak memiliki fisik prima, maka sebagian siswa yang tidak memiliki fisik prima pasti bukan calon Paskibraka."
  },
  {
    id: "TIU-02",
    category: "TIU",
    subCategory: "Analogi Verbal",
    question: "TIANG : BENDERA = ... : ...",
    options: [
      { key: "A", text: "LANGIT : BINTANG" },
      { key: "B", text: "BINGKAI : LUKISAN" },
      { key: "C", text: "SEPATU : KAOS KAKI" },
      { key: "D", text: "KERTAS : PULPEN" },
      { key: "E", text: "TENTARA : SERAGAM" }
    ],
    correctAnswer: "B",
    explanation: "Tiang berfungsi sebagai penyangga/penopang Bendera. Sama halnya dengan Bingkai yang berfungsi sebagai penopang/penjaga Lukisan."
  },
  {
    id: "TIU-03",
    category: "TIU",
    subCategory: "Deret Angka",
    question: "Tentukan angka berikutnya dari deret: 3, 6, 11, 18, 27, 38, ...",
    options: [
      { key: "A", text: "49" },
      { key: "B", text: "50" },
      { key: "C", text: "51" },
      { key: "D", text: "52" },
      { key: "E", text: "53" }
    ],
    correctAnswer: "C",
    explanation: "Pola selisih: +3, +5, +7, +9, +11. Selisih berikutnya adalah +13. Maka 38 + 13 = 51."
  },
  {
    id: "TIU-04",
    category: "TIU",
    subCategory: "Berhitung Cepat & Kecepatan",
    question: "Seorang calon Paskibraka berlari sejauh 3.200 meter dalam waktu 12 menit di lintasan atletik. Berapakah kecepatan rata-rata lari calon tersebut dalam km/jam?",
    options: [
      { key: "A", text: "14 km/jam" },
      { key: "B", text: "15 km/jam" },
      { key: "C", text: "16 km/jam" },
      { key: "D", text: "16.5 km/jam" },
      { key: "E", text: "18 km/jam" }
    ],
    correctAnswer: "C",
    explanation: "3.200 m = 3,2 km. 12 menit = 12/60 jam = 0,2 jam. Kecepatan = 3,2 km / 0,2 jam = 16 km/jam."
  },
  {
    id: "TIU-05",
    category: "TIU",
    subCategory: "Penalaran Analitis",
    question: "Dalam formasi Pasukan 8, Rafi berdiri tepat di belakang pembawa baki. Naufal berdiri di sebelah kanan Rafi. Jika Farhan berada tepat di samping kiri Rafi, maka posisi Farhan relatif terhadap pembawa baki adalah...",
    options: [
      { key: "A", text: "Tepat di depan pembawa baki" },
      { key: "B", text: "Diagonal belakang sebelah kiri pembawa baki" },
      { key: "C", text: "Di samping kanan pembawa baki" },
      { key: "D", text: "Di belakang Naufal" },
      { key: "E", text: "Sejajar dengan pembawa baki" }
    ],
    correctAnswer: "B",
    explanation: "Rafi berada di belakang Baki. Farhan berada di sebelah kiri Rafi. Maka posisi Farhan terhadap Baki adalah di sisi diagonal belakang sebelah kiri."
  }
];

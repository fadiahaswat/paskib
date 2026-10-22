import type { CatQuestion } from "../domain/selection"

type Fact = { question: string; answer: string; explanation: string; pool?: string }

const categories = [
  "Geografi RPUL",
  "Sejarah Indonesia & Dunia",
  "Ilmu Pengetahuan Alam",
  "Matematika & Pengukuran",
  "Organisasi & Kerja Sama Dunia",
  "Seni, Budaya & Bahasa",
  "Olahraga & Pengetahuan Umum",
] as const

const geography: Fact[] = [
  ["Sungai apakah yang dikenal sebagai sungai terpanjang di Indonesia?", "Kapuas", "Sungai Kapuas di Kalimantan dikenal sebagai sungai terpanjang di Indonesia.", "sungai"],
  ["Di provinsi manakah Danau Toba berada?", "Sumatera Utara", "Danau Toba berada di Provinsi Sumatera Utara.", "danau"],
  ["Gunung tertinggi di Indonesia adalah gunung apa?", "Puncak Jaya", "Puncak Jaya di Papua merupakan puncak tertinggi Indonesia.", "gunung"],
  ["Danau vulkanik apakah yang berada di Sumatera Barat?", "Danau Maninjau", "Danau Maninjau berada di Sumatera Barat.", "danau"],
  ["Sungai besar yang mengalir melalui Kalimantan Selatan bernama apa?", "Sungai Barito", "Sungai Barito merupakan salah satu sungai utama di Kalimantan.", "sungai"],
  ["Gunung apakah yang terletak di perbatasan Jawa Tengah dan Jawa Timur?", "Gunung Lawu", "Gunung Lawu berada di perbatasan Jawa Tengah dan Jawa Timur.", "gunung"],
  ["Selat apakah yang memisahkan Pulau Jawa dan Sumatra?", "Selat Sunda", "Selat Sunda memisahkan Pulau Jawa dan Sumatra.", "perairan"],
  ["Selat apakah yang berada di antara Bali dan Lombok?", "Selat Lombok", "Selat Lombok memisahkan Bali dan Lombok.", "perairan"],
  ["Samudra apakah yang membentang di sebelah barat Indonesia?", "Samudra Hindia", "Samudra Hindia berada di sebelah barat Indonesia.", "perairan"],
  ["Selat apakah yang memisahkan Pulau Sumatra dan Pulau Kalimantan?", "Selat Karimata", "Selat Karimata berada di antara Sumatra dan Kalimantan.", "perairan"],
  ["Benua terluas di dunia adalah benua apa?", "Asia", "Asia merupakan benua terluas berdasarkan luas wilayah.", "benua"],
  ["Benua terkecil di dunia adalah benua apa?", "Australia", "Australia merupakan benua terkecil.", "benua"],
  ["Samudra terluas di dunia adalah samudra apa?", "Samudra Pasifik", "Samudra Pasifik merupakan samudra terluas.", "samudra"],
  ["Garis khayal yang membagi bumi menjadi belahan utara dan selatan disebut apa?", "Khatulistiwa", "Garis khatulistiwa membagi bumi menjadi belahan utara dan selatan.", "peta"],
  ["Garis bujur 0° melewati kawasan Greenwich di negara mana?", "Britania Raya", "Meridian utama 0° melewati Greenwich di Britania Raya.", "peta"],
  ["Arah mata angin yang terletak di antara utara dan timur adalah apa?", "Timur laut", "Timur laut berada di antara utara dan timur.", "arah"],
  ["Alat pada peta yang menunjukkan perbandingan jarak peta dengan jarak sebenarnya disebut apa?", "Skala", "Skala peta menunjukkan perbandingan jarak pada peta dan jarak sebenarnya.", "peta"],
  ["Simbol pada peta yang menjelaskan arti tanda-tanda disebut apa?", "Legenda", "Legenda menjelaskan arti simbol yang digunakan pada peta.", "peta"],
  ["Garis pada peta yang menghubungkan tempat dengan ketinggian sama disebut apa?", "Garis kontur", "Garis kontur menghubungkan titik-titik berketinggian sama.", "peta"],
  ["Negara kepulauan terbesar di dunia adalah negara apa?", "Indonesia", "Indonesia dikenal sebagai negara kepulauan terbesar di dunia.", "negara"],
  ["Ibu kota negara Jepang adalah kota apa?", "Tokyo", "Tokyo adalah ibu kota Jepang.", "ibu kota"],
  ["Ibu kota negara Mesir adalah kota apa?", "Kairo", "Kairo adalah ibu kota Mesir.", "ibu kota"],
  ["Ibu kota negara Kanada adalah kota apa?", "Ottawa", "Ottawa adalah ibu kota Kanada.", "ibu kota"],
  ["Ibu kota negara Swiss adalah kota apa?", "Bern", "Bern adalah kota federal dan ibu kota Swiss.", "ibu kota"],
  ["Ibu kota negara Thailand adalah kota apa?", "Bangkok", "Bangkok adalah ibu kota Thailand.", "ibu kota"],
  ["Ibu kota negara Korea Selatan adalah kota apa?", "Seoul", "Seoul adalah ibu kota Korea Selatan.", "ibu kota"],
  ["Negara yang benderanya bergambar daun maple adalah negara apa?", "Kanada", "Daun maple terdapat pada bendera Kanada.", "bendera"],
  ["Bendera negara Jepang menampilkan lingkaran berwarna apa?", "Merah", "Bendera Jepang menampilkan cakram merah pada bidang putih.", "bendera"],
  ["Negara manakah yang memiliki bendera dengan daun cedar?", "Lebanon", "Pohon cedar ditampilkan pada bendera Lebanon.", "bendera"],
  ["Danau terbesar di Indonesia berdasarkan luas permukaan adalah danau apa?", "Danau Toba", "Danau Toba merupakan danau terbesar di Indonesia.", "danau"],
].map(([question, answer, explanation, pool]) => ({ question, answer, explanation, pool }))

const history: Fact[] = [
  ["Kerajaan maritim besar yang berkembang di Sumatra pada masa lampau adalah kerajaan apa?", "Sriwijaya", "Sriwijaya berkembang sebagai kerajaan maritim di Sumatra.", "kerajaan"],
  ["Kerajaan Majapahit didirikan oleh tokoh siapa?", "Raden Wijaya", "Raden Wijaya mendirikan Majapahit pada akhir abad ke-13.", "kerajaan"],
  ["Kitab Negarakertagama ditulis oleh siapa?", "Mpu Prapanca", "Mpu Prapanca menulis Kakawin Negarakertagama.", "kerajaan"],
  ["Patih Majapahit yang terkenal dengan Sumpah Palapa adalah siapa?", "Gajah Mada", "Gajah Mada dikenal dengan Sumpah Palapa.", "kerajaan"],
  ["Kerajaan Islam yang dikenal sebagai salah satu kerajaan awal di Aceh adalah apa?", "Samudra Pasai", "Samudra Pasai berkembang di wilayah Aceh.", "kerajaan"],
  ["Kerajaan Hindu tertua yang dikenal melalui prasasti Yupa berada di wilayah mana?", "Kutai", "Prasasti Yupa menjadi sumber sejarah Kerajaan Kutai di Kalimantan Timur.", "kerajaan"],
  ["Candi Borobudur merupakan peninggalan bercorak agama apa?", "Buddha", "Borobudur merupakan candi Buddha.", "candi"],
  ["Candi Prambanan merupakan kompleks candi bercorak agama apa?", "Hindu", "Prambanan merupakan kompleks candi Hindu.", "candi"],
  ["VOC didirikan oleh bangsa Eropa dari negara mana?", "Belanda", "VOC merupakan perusahaan dagang Belanda.", "kolonial"],
  ["Kebijakan tanam paksa di Hindia Belanda dikenal dengan istilah apa?", "Cultuurstelsel", "Cultuurstelsel adalah kebijakan tanam paksa pada masa kolonial Belanda.", "kolonial"],
  ["Organisasi Budi Utomo berdiri pada tahun berapa?", "1908", "Budi Utomo berdiri pada 20 Mei 1908.", "pergerakan"],
  ["Hari Kebangkitan Nasional diperingati setiap tanggal berapa?", "20 Mei", "Tanggal 20 Mei diperingati sebagai Hari Kebangkitan Nasional.", "pergerakan"],
  ["Sumpah Pemuda diikrarkan pada tahun berapa?", "1928", "Sumpah Pemuda diikrarkan pada 28 Oktober 1928.", "pergerakan"],
  ["Kongres Pemuda II berlangsung di kota mana?", "Batavia", "Kongres Pemuda II berlangsung di Batavia, kini Jakarta.", "pergerakan"],
  ["Siapakah tokoh yang dikenal sebagai pelopor pendidikan nasional dan pendiri Taman Siswa?", "Ki Hadjar Dewantara", "Ki Hadjar Dewantara mendirikan perguruan Taman Siswa.", "tokoh"],
  ["Siapakah tokoh emansipasi perempuan dari Jepara yang diperingati setiap 21 April?", "R.A. Kartini", "R.A. Kartini lahir pada 21 April 1879.", "tokoh"],
  ["Pangeran Diponegoro memimpin perlawanan besar terhadap Belanda pada perang apa?", "Perang Jawa", "Perang Diponegoro juga dikenal sebagai Perang Jawa.", "tokoh"],
  ["Pattimura memimpin perlawanan terhadap Belanda di wilayah mana?", "Maluku", "Pattimura memimpin perlawanan di Maluku pada 1817.", "tokoh"],
  ["Perang Dunia I berlangsung dari tahun berapa hingga tahun berapa?", "1914–1918", "Perang Dunia I berlangsung pada 1914 sampai 1918.", "dunia"],
  ["Perang Dunia II berakhir pada tahun berapa?", "1945", "Perang Dunia II berakhir pada 1945.", "dunia"],
  ["Organisasi internasional yang dibentuk setelah Perang Dunia I dan mendahului PBB bernama apa?", "Liga Bangsa-Bangsa", "Liga Bangsa-Bangsa dibentuk setelah Perang Dunia I.", "dunia"],
  ["Tembok Berlin runtuh pada tahun berapa?", "1989", "Runtuhnya Tembok Berlin pada 1989 menjadi peristiwa penting dalam sejarah Eropa.", "dunia"],
  ["Revolusi Prancis dimulai pada tahun berapa?", "1789", "Revolusi Prancis dimulai pada 1789.", "dunia"],
  ["Siapakah tokoh yang dikenal dengan teori relativitas?", "Albert Einstein", "Albert Einstein mengembangkan teori relativitas.", "tokoh dunia"],
  ["Siapakah tokoh yang dikenal mengembangkan mesin cetak Eropa dengan huruf lepas?", "Johannes Gutenberg", "Johannes Gutenberg dikenal atas pengembangan mesin cetak di Eropa.", "tokoh dunia"],
  ["Siapakah tokoh yang memimpin gerakan tanpa kekerasan di India?", "Mahatma Gandhi", "Mahatma Gandhi dikenal memimpin perjuangan kemerdekaan India dengan perlawanan tanpa kekerasan.", "tokoh dunia"],
  ["Siapakah tokoh perempuan yang menjadi ilmuwan perintis penelitian radioaktivitas?", "Marie Curie", "Marie Curie melakukan penelitian penting tentang radioaktivitas.", "tokoh dunia"],
  ["Peristiwa jatuhnya Konstantinopel oleh Kesultanan Utsmaniyah terjadi pada tahun berapa?", "1453", "Konstantinopel jatuh pada 1453.", "dunia"],
  ["Ekspedisi pertama yang berhasil mengelilingi bumi dipimpin pada awalnya oleh siapa?", "Ferdinand Magellan", "Ekspedisi Magellan-Elcano menjadi pelayaran pertama yang mengelilingi bumi.", "tokoh dunia"],
  ["Siapakah penjelajah Portugis yang mencapai India melalui jalur laut mengitari Afrika?", "Vasco da Gama", "Vasco da Gama mencapai India melalui jalur laut di sekitar Tanjung Harapan.", "tokoh dunia"],
].map(([question, answer, explanation, pool]) => ({ question, answer, explanation, pool }))

const science: Fact[] = [
  ["Planet terbesar dalam tata surya adalah planet apa?", "Jupiter", "Jupiter merupakan planet terbesar dalam tata surya.", "planet"],
  ["Planet yang paling dekat dengan Matahari adalah planet apa?", "Merkurius", "Merkurius merupakan planet terdekat dari Matahari.", "planet"],
  ["Planet yang dikenal sebagai Planet Merah adalah planet apa?", "Mars", "Mars tampak kemerahan dan dikenal sebagai Planet Merah.", "planet"],
  ["Planet yang memiliki cincin paling jelas terlihat adalah planet apa?", "Saturnus", "Saturnus dikenal dengan sistem cincinnya yang menonjol.", "planet"],
  ["Satelit alami bumi adalah benda langit apa?", "Bulan", "Bulan merupakan satelit alami bumi.", "angkasa"],
  ["Bintang yang menjadi pusat tata surya adalah apa?", "Matahari", "Matahari merupakan bintang di pusat tata surya kita.", "angkasa"],
  ["Peristiwa ketika bulan berada di antara bumi dan matahari disebut apa?", "Gerhana Matahari", "Gerhana Matahari terjadi ketika bulan menghalangi cahaya Matahari ke bumi.", "angkasa"],
  ["Perubahan wujud dari cair menjadi gas disebut apa?", "Penguapan", "Penguapan adalah perubahan zat cair menjadi gas.", "fisika"],
  ["Perubahan wujud dari gas menjadi cair disebut apa?", "Pengembunan", "Pengembunan adalah perubahan gas menjadi cair.", "fisika"],
  ["Gaya yang menarik benda menuju pusat bumi disebut apa?", "Gaya gravitasi", "Gravitasi bumi menarik benda ke arah pusat bumi.", "fisika"],
  ["Satuan SI untuk gaya adalah apa?", "Newton", "Gaya dalam Sistem Internasional diukur dengan newton.", "fisika"],
  ["Satuan SI untuk energi adalah apa?", "Joule", "Energi dalam Sistem Internasional diukur dengan joule.", "fisika"],
  ["Bahan yang mudah menghantarkan arus listrik disebut apa?", "Konduktor", "Konduktor memungkinkan arus listrik mengalir dengan mudah.", "fisika"],
  ["Bahan yang menghambat aliran arus listrik disebut apa?", "Isolator", "Isolator menghambat aliran listrik.", "fisika"],
  ["Kutub magnet yang senama jika didekatkan akan bagaimana?", "Saling menolak", "Kutub magnet senama saling menolak.", "fisika"],
  ["Organ tubuh yang memompa darah ke seluruh tubuh adalah apa?", "Jantung", "Jantung memompa darah melalui sistem peredaran darah.", "tubuh"],
  ["Organ utama untuk pertukaran oksigen dan karbon dioksida adalah apa?", "Paru-paru", "Pertukaran gas berlangsung di paru-paru, terutama pada alveolus.", "tubuh"],
  ["Organ yang menyaring darah dan menghasilkan urine adalah apa?", "Ginjal", "Ginjal menyaring darah dan membantu membentuk urine.", "tubuh"],
  ["Bagian tumbuhan yang paling banyak melakukan fotosintesis adalah apa?", "Daun", "Klorofil pada daun menangkap energi cahaya untuk fotosintesis.", "makhluk hidup"],
  ["Gas yang diserap tumbuhan ketika melakukan fotosintesis adalah apa?", "Karbon dioksida", "Tumbuhan menggunakan karbon dioksida dan air dalam fotosintesis.", "makhluk hidup"],
  ["Hewan pemakan tumbuhan disebut apa?", "Herbivor", "Herbivor memperoleh makanan terutama dari tumbuhan.", "makhluk hidup"],
  ["Hewan pemakan daging disebut apa?", "Karnivor", "Karnivor memperoleh makanan terutama dari hewan lain.", "makhluk hidup"],
  ["Hewan pemakan tumbuhan dan hewan disebut apa?", "Omnivor", "Omnivor memakan bahan pangan dari tumbuhan dan hewan.", "makhluk hidup"],
  ["Proses perubahan ulat menjadi kupu-kupu disebut apa?", "Metamorfosis", "Ulat mengalami metamorfosis hingga menjadi kupu-kupu dewasa.", "makhluk hidup"],
  ["Lapisan udara yang menyelimuti bumi disebut apa?", "Atmosfer", "Atmosfer adalah lapisan gas yang menyelimuti bumi.", "bumi"],
  ["Lapisan bumi tempat manusia hidup dan cuaca berlangsung disebut apa?", "Kerak bumi", "Kerak bumi merupakan lapisan terluar bumi yang padat.", "bumi"],
  ["Getaran yang merambat melalui bumi akibat pelepasan energi disebut apa?", "Gelombang seismik", "Gempa menghasilkan gelombang seismik yang merambat melalui bumi.", "bumi"],
  ["Alat untuk mengukur suhu disebut apa?", "Termometer", "Termometer digunakan untuk mengukur suhu.", "alat"],
  ["Alat untuk mengukur tekanan udara disebut apa?", "Barometer", "Barometer digunakan untuk mengukur tekanan udara.", "alat"],
  ["Sumber energi terbarukan yang memanfaatkan gerak udara adalah apa?", "Energi angin", "Turbin dapat mengubah energi angin menjadi energi listrik.", "energi"],
].map(([question, answer, explanation, pool]) => ({ question, answer, explanation, pool }))

const mathematics: Fact[] = [
  ["Berapakah hasil 125 + 275?", "400", "125 ditambah 275 sama dengan 400.", "hitung"],
  ["Berapakah hasil 900 − 365?", "535", "900 dikurangi 365 sama dengan 535.", "hitung"],
  ["Berapakah hasil 24 × 15?", "360", "24 dikalikan 15 sama dengan 360.", "hitung"],
  ["Berapakah hasil 864 ÷ 12?", "72", "864 dibagi 12 sama dengan 72.", "hitung"],
  ["Berapakah 15% dari 200?", "30", "15 persen dari 200 adalah 30.", "persen"],
  ["Berapakah 3/4 dalam bentuk desimal?", "0,75", "Tiga per empat sama dengan 0,75.", "pecahan"],
  ["Berapakah KPK dari 6 dan 8?", "24", "Kelipatan persekutuan terkecil dari 6 dan 8 adalah 24.", "bilangan"],
  ["Berapakah FPB dari 24 dan 36?", "12", "Faktor persekutuan terbesar dari 24 dan 36 adalah 12.", "bilangan"],
  ["Satu kilometer sama dengan berapa meter?", "1.000 meter", "Satu kilometer setara dengan 1.000 meter.", "satuan"],
  ["Satu meter sama dengan berapa sentimeter?", "100 sentimeter", "Satu meter setara dengan 100 sentimeter.", "satuan"],
  ["Satu kilogram sama dengan berapa gram?", "1.000 gram", "Satu kilogram setara dengan 1.000 gram.", "satuan"],
  ["Satu liter sama dengan berapa mililiter?", "1.000 mililiter", "Satu liter setara dengan 1.000 mililiter.", "satuan"],
  ["Satu jam sama dengan berapa detik?", "3.600 detik", "Satu jam terdiri atas 3.600 detik.", "waktu"],
  ["Keliling persegi dengan sisi 8 cm adalah berapa?", "32 cm", "Keliling persegi adalah empat kali panjang sisi.", "bangun"],
  ["Luas persegi dengan sisi 9 cm adalah berapa?", "81 cm²", "Luas persegi adalah sisi dikali sisi.", "bangun"],
  ["Luas persegi panjang dengan panjang 12 cm dan lebar 5 cm adalah berapa?", "60 cm²", "Luas persegi panjang adalah panjang dikali lebar.", "bangun"],
  ["Keliling persegi panjang dengan panjang 10 cm dan lebar 4 cm adalah berapa?", "28 cm", "Keliling persegi panjang adalah dua kali jumlah panjang dan lebar.", "bangun"],
  ["Luas segitiga dengan alas 12 cm dan tinggi 6 cm adalah berapa?", "36 cm²", "Luas segitiga adalah setengah kali alas kali tinggi.", "bangun"],
  ["Jumlah besar sudut dalam sebuah segitiga adalah berapa?", "180°", "Jumlah sudut dalam segitiga adalah 180 derajat.", "bangun"],
  ["Bangun datar yang memiliki empat sisi sama panjang dan empat sudut siku-siku disebut apa?", "Persegi", "Persegi memiliki empat sisi sama panjang dan empat sudut siku-siku.", "bangun"],
  ["Bangun ruang yang memiliki enam sisi berbentuk persegi sama besar disebut apa?", "Kubus", "Kubus memiliki enam sisi persegi yang sama besar.", "ruang"],
  ["Volume kubus dengan panjang rusuk 4 cm adalah berapa?", "64 cm³", "Volume kubus adalah rusuk pangkat tiga; 4³ sama dengan 64.", "ruang"],
  ["Bangun ruang dengan dua alas berbentuk lingkaran dan satu sisi lengkung disebut apa?", "Tabung", "Tabung memiliki dua alas lingkaran dan satu selimut lengkung.", "ruang"],
  ["Bangun ruang yang memiliki satu titik puncak dan alas lingkaran disebut apa?", "Kerucut", "Kerucut memiliki alas lingkaran dan satu titik puncak.", "ruang"],
  ["Kecepatan 60 km/jam selama 3 jam menghasilkan jarak berapa?", "180 km", "Jarak sama dengan kecepatan dikali waktu.", "gerak"],
  ["Jarak 150 km ditempuh dalam 3 jam. Berapa kecepatan rata-ratanya?", "50 km/jam", "Kecepatan rata-rata adalah jarak dibagi waktu.", "gerak"],
  ["Jika 5 buku berharga Rp40.000, berapa harga 1 buku dengan harga sama?", "Rp8.000", "Harga satu buku adalah Rp40.000 dibagi 5.", "uang"],
  ["Harga barang Rp80.000 mendapat diskon 25%. Berapa nilai diskonnya?", "Rp20.000", "25 persen dari Rp80.000 adalah Rp20.000.", "uang"],
  ["Berapakah rata-rata dari 6, 8, dan 10?", "8", "Rata-rata diperoleh dengan membagi jumlah nilai dengan banyak data.", "statistik"],
  ["Suhu 20°C naik 7°C. Berapa suhu akhirnya?", "27°C", "20 ditambah 7 sama dengan 27 derajat Celsius.", "ukur"],
].map(([question, answer, explanation, pool]) => ({ question, answer, explanation, pool }))

const organizations: Fact[] = [
  ["Kepanjangan ASEAN adalah apa?", "Association of Southeast Asian Nations", "ASEAN adalah Association of Southeast Asian Nations.", "singkatan"],
  ["Di kota manakah Sekretariat ASEAN berada?", "Jakarta", "Sekretariat ASEAN berkedudukan di Jakarta.", "markas"],
  ["ASEAN didirikan pada tahun berapa?", "1967", "ASEAN didirikan pada 8 Agustus 1967.", "tahun"],
  ["Deklarasi yang menandai berdirinya ASEAN disebut apa?", "Deklarasi Bangkok", "ASEAN didirikan melalui Deklarasi Bangkok.", "sejarah"],
  ["Di kota manakah Perserikatan Bangsa-Bangsa bermarkas?", "New York", "Markas besar PBB berada di New York.", "markas"],
  ["UNESCO bergerak di bidang apa?", "Pendidikan, ilmu pengetahuan, dan kebudayaan", "UNESCO menangani pendidikan, ilmu pengetahuan, dan kebudayaan.", "mandat"],
  ["WHO merupakan badan PBB yang menangani bidang apa?", "Kesehatan", "WHO bekerja dalam bidang kesehatan global.", "mandat"],
  ["UNICEF berfokus pada perlindungan dan kesejahteraan siapa?", "Anak-anak", "UNICEF berfokus pada hak dan kesejahteraan anak-anak.", "mandat"],
  ["UNHCR memberikan perlindungan internasional kepada kelompok apa?", "Pengungsi", "UNHCR menjalankan mandat perlindungan pengungsi.", "mandat"],
  ["Organisasi yang mengatur kerja sama perdagangan multilateral adalah apa?", "WTO", "WTO menjadi forum aturan dan perundingan perdagangan internasional.", "organisasi"],
  ["NATO merupakan aliansi yang bergerak terutama di bidang apa?", "Pertahanan kolektif", "NATO merupakan aliansi pertahanan kolektif.", "mandat"],
  ["Uni Eropa menggunakan mata uang bersama bernama apa di banyak negara anggotanya?", "Euro", "Euro digunakan sebagai mata uang bersama oleh banyak negara Uni Eropa.", "mata uang"],
  ["OPEC mengoordinasikan kebijakan negara-negara pengekspor komoditas apa?", "Minyak bumi", "OPEC merupakan organisasi negara-negara pengekspor minyak bumi.", "mandat"],
  ["Markas besar Organisasi Kesehatan Dunia berada di kota apa?", "Jenewa", "Kantor pusat WHO berada di Jenewa, Swiss.", "markas"],
  ["Markas besar UNESCO berada di kota apa?", "Paris", "Kantor pusat UNESCO berada di Paris, Prancis.", "markas"],
  ["Markas besar UNICEF berada di kota apa?", "New York", "Kantor pusat UNICEF berada di New York.", "markas"],
  ["Konferensi Asia Afrika tahun 1955 diselenggarakan di kota apa?", "Bandung", "Konferensi Asia Afrika 1955 berlangsung di Bandung.", "sejarah"],
  ["Dasasila Bandung merupakan hasil konferensi apa?", "Konferensi Asia Afrika", "Dasasila Bandung merupakan sepuluh prinsip hasil KAA.", "sejarah"],
  ["Organisasi regional yang menghimpun negara-negara Arab dikenal dengan singkatan apa?", "Liga Arab", "Liga Arab merupakan organisasi regional negara-negara Arab.", "organisasi"],
  ["Markas Mahkamah Internasional berada di kota apa?", "Den Haag", "Mahkamah Internasional berkedudukan di Den Haag, Belanda.", "markas"],
  ["FAO bekerja terutama dalam bidang apa?", "Pangan dan pertanian", "FAO menangani pangan dan pertanian.", "mandat"],
  ["ILO merupakan organisasi internasional yang menangani isu apa?", "Ketenagakerjaan", "ILO bergerak dalam bidang ketenagakerjaan dan standar kerja.", "mandat"],
  ["Organisasi internasional yang mengawasi pemanfaatan energi atom secara damai adalah apa?", "IAEA", "IAEA berperan dalam kerja sama dan pengawasan energi atom.", "organisasi"],
  ["Markas besar NATO berada di kota apa?", "Brussels", "Markas besar NATO berada di Brussels, Belgia.", "markas"],
  ["Organisasi yang menangani penerbangan sipil internasional disingkat apa?", "ICAO", "ICAO menetapkan standar dan koordinasi penerbangan sipil internasional.", "organisasi"],
  ["Organisasi internasional yang mengatur keselamatan pelayaran disingkat apa?", "IMO", "IMO menangani keselamatan pelayaran dan pencegahan pencemaran laut.", "organisasi"],
  ["Organisasi yang mendorong kerja sama kepolisian lintas negara dikenal sebagai apa?", "Interpol", "Interpol membantu kerja sama kepolisian antarnegara.", "organisasi"],
  ["Kepanjangan UNICEF dalam bahasa Inggris adalah apa?", "United Nations Children’s Fund", "UNICEF adalah United Nations Children’s Fund.", "singkatan"],
  ["Kepanjangan WHO dalam bahasa Inggris adalah apa?", "World Health Organization", "WHO adalah World Health Organization.", "singkatan"],
  ["Kepanjangan UNESCO dalam bahasa Inggris adalah apa?", "United Nations Educational, Scientific and Cultural Organization", "UNESCO adalah United Nations Educational, Scientific and Cultural Organization.", "singkatan"],
  ["Di kota manakah markas besar Uni Afrika berada?", "Addis Ababa", "Markas besar Uni Afrika berada di Addis Ababa, Etiopia.", "markas"],
].map(([question, answer, explanation, pool]) => ({ question, answer, explanation, pool }))

const culture: Fact[] = [
  ["Rumah Gadang merupakan rumah adat dari suku apa?", "Minangkabau", "Rumah Gadang merupakan rumah adat Minangkabau di Sumatera Barat.", "rumah"],
  ["Tongkonan merupakan rumah adat masyarakat dari provinsi mana?", "Sulawesi Selatan", "Tongkonan merupakan rumah adat masyarakat Toraja di Sulawesi Selatan.", "rumah"],
  ["Honai merupakan rumah tradisional masyarakat dari wilayah mana?", "Papua", "Honai dikenal sebagai rumah tradisional masyarakat Papua.", "rumah"],
  ["Rumah adat Joglo banyak dikenal berasal dari budaya daerah mana?", "Jawa", "Joglo merupakan bentuk rumah tradisional yang dikenal di Jawa.", "rumah"],
  ["Rumah Limas merupakan rumah tradisional yang berasal dari provinsi mana?", "Sumatera Selatan", "Rumah Limas dikenal sebagai rumah tradisional Sumatera Selatan.", "rumah"],
  ["Angklung dimainkan dengan cara bagaimana?", "Digoyangkan", "Angklung menghasilkan bunyi ketika rangkanya digoyangkan.", "musik"],
  ["Sasando merupakan alat musik tradisional dari daerah mana?", "Nusa Tenggara Timur", "Sasando berasal dari Pulau Rote, Nusa Tenggara Timur.", "musik"],
  ["Kolintang merupakan alat musik tradisional dari provinsi mana?", "Sulawesi Utara", "Kolintang dikenal sebagai alat musik tradisional Minahasa, Sulawesi Utara.", "musik"],
  ["Tifa merupakan alat musik tradisional yang dikenal di wilayah mana?", "Maluku dan Papua", "Tifa dikenal dalam tradisi musik Maluku dan Papua.", "musik"],
  ["Sasando dimainkan dengan cara bagaimana?", "Dipetik", "Sasando merupakan alat musik berdawai yang dimainkan dengan dipetik.", "musik"],
  ["Tari Saman berasal dari daerah mana?", "Aceh", "Tari Saman berasal dari masyarakat Gayo di Aceh.", "tari"],
  ["Tari Kecak berasal dari pulau mana?", "Bali", "Tari Kecak berkembang di Bali.", "tari"],
  ["Tari Piring berasal dari provinsi mana?", "Sumatera Barat", "Tari Piring merupakan tarian tradisional Minangkabau, Sumatera Barat.", "tari"],
  ["Tari Jaipong berasal dari provinsi mana?", "Jawa Barat", "Jaipong berkembang sebagai seni pertunjukan dari Jawa Barat.", "tari"],
  ["Tari Pakarena berasal dari provinsi mana?", "Sulawesi Selatan", "Pakarena merupakan tarian tradisional masyarakat Gowa, Sulawesi Selatan.", "tari"],
  ["Kain tradisional Indonesia yang dibuat dengan teknik perintang warna menggunakan malam disebut apa?", "Batik", "Batik dibuat dengan teknik perintang warna menggunakan malam.", "kriya"],
  ["Wayang kulit tradisional banyak berkembang di pulau mana?", "Jawa", "Wayang kulit berkembang kuat dalam tradisi pertunjukan di Jawa.", "seni"],
  ["Seni pertunjukan boneka dari kulit yang dimainkan oleh dalang disebut apa?", "Wayang kulit", "Wayang kulit dimainkan oleh dalang dengan boneka kulit.", "seni"],
  ["Lagu daerah “Ampar-Ampar Pisang” berasal dari provinsi mana?", "Kalimantan Selatan", "Ampar-Ampar Pisang merupakan lagu daerah Kalimantan Selatan.", "lagu"],
  ["Lagu daerah “Apuse” berasal dari wilayah mana?", "Papua", "Apuse dikenal sebagai lagu daerah Papua.", "lagu"],
  ["Lagu daerah “Bungong Jeumpa” berasal dari provinsi mana?", "Aceh", "Bungong Jeumpa merupakan lagu daerah Aceh.", "lagu"],
  ["Lagu daerah “Manuk Dadali” berasal dari provinsi mana?", "Jawa Barat", "Manuk Dadali merupakan lagu daerah berbahasa Sunda dari Jawa Barat.", "lagu"],
  ["Makanan pempek dikenal sebagai makanan khas kota apa?", "Palembang", "Pempek merupakan makanan khas Palembang.", "makanan"],
  ["Rendang dikenal sebagai masakan tradisional dari suku apa?", "Minangkabau", "Rendang merupakan masakan tradisional Minangkabau.", "makanan"],
  ["Gudeg dikenal sebagai makanan khas kota apa?", "Yogyakarta", "Gudeg merupakan makanan khas Yogyakarta.", "makanan"],
  ["Papeda merupakan makanan pokok tradisional yang dikenal di wilayah mana?", "Papua dan Maluku", "Papeda dikenal sebagai makanan tradisional di Papua dan Maluku.", "makanan"],
  ["Bahasa daerah yang digunakan masyarakat Sunda terutama berasal dari provinsi mana?", "Jawa Barat", "Bahasa Sunda terutama digunakan di Jawa Barat dan wilayah sekitarnya.", "bahasa"],
  ["Aksara tradisional Jawa dikenal dengan nama apa?", "Hanacaraka", "Aksara Jawa juga dikenal dengan urutan hanacaraka.", "bahasa"],
  ["Tokoh yang dikenal sebagai pelopor sastra modern Indonesia dan penulis “Layar Terkembang” adalah siapa?", "Sutan Takdir Alisjahbana", "Sutan Takdir Alisjahbana menulis novel Layar Terkembang.", "sastra"],
  ["Siapakah penulis novel “Sitti Nurbaya”?", "Marah Rusli", "Sitti Nurbaya merupakan novel karya Marah Rusli.", "sastra"],
].map(([question, answer, explanation, pool]) => ({ question, answer, explanation, pool }))

const sports: Fact[] = [
  ["Induk organisasi sepak bola dunia adalah apa?", "FIFA", "FIFA merupakan badan pengatur sepak bola internasional.", "organisasi"],
  ["Induk organisasi sepak bola Indonesia adalah apa?", "PSSI", "PSSI merupakan Persatuan Sepak Bola Seluruh Indonesia.", "organisasi"],
  ["Induk organisasi bulu tangkis dunia adalah apa?", "BWF", "BWF mengatur bulu tangkis internasional.", "organisasi"],
  ["Induk organisasi bulu tangkis Indonesia adalah apa?", "PBSI", "PBSI merupakan Persatuan Bulu Tangkis Seluruh Indonesia.", "organisasi"],
  ["Induk organisasi bola basket dunia adalah apa?", "FIBA", "FIBA merupakan federasi bola basket internasional.", "organisasi"],
  ["Induk organisasi bola voli dunia adalah apa?", "FIVB", "FIVB merupakan federasi bola voli internasional.", "organisasi"],
  ["Induk organisasi atletik dunia saat ini dikenal dengan nama apa?", "World Athletics", "World Athletics adalah badan pengatur atletik internasional.", "organisasi"],
  ["Induk organisasi renang dunia dikenal dengan nama apa?", "World Aquatics", "World Aquatics mengatur olahraga akuatik internasional.", "organisasi"],
  ["Satu regu sepak bola memainkan pertandingan dengan berapa pemain di lapangan?", "11 pemain", "Setiap regu sepak bola memainkan pertandingan dengan 11 pemain di lapangan.", "aturan"],
  ["Satu regu bola voli memainkan pertandingan dengan berapa pemain di lapangan?", "6 pemain", "Setiap regu bola voli terdiri atas enam pemain di lapangan.", "aturan"],
  ["Satu regu bola basket memainkan pertandingan dengan berapa pemain di lapangan?", "5 pemain", "Setiap regu bola basket memainkan pertandingan dengan lima pemain di lapangan.", "aturan"],
  ["Dalam permainan bulu tangkis, alat yang dipukul pemain disebut apa?", "Kok", "Bulu tangkis dimainkan dengan memukul kok menggunakan raket.", "alat"],
  ["Olimpiade modern pertama diselenggarakan di kota mana pada 1896?", "Athena", "Olimpiade modern pertama berlangsung di Athena pada 1896.", "olimpiade"],
  ["Lambang Olimpiade terdiri atas berapa cincin yang saling terkait?", "Lima cincin", "Simbol Olimpiade menampilkan lima cincin yang saling terkait.", "olimpiade"],
  ["Berapa tahun sekali Olimpiade Musim Panas biasanya diselenggarakan?", "Empat tahun", "Olimpiade Musim Panas berlangsung dalam siklus empat tahunan.", "olimpiade"],
  ["Ajang olahraga multicabang terbesar di Asia disebut apa?", "Asian Games", "Asian Games merupakan pesta olahraga multicabang negara-negara Asia.", "kompetisi"],
  ["Ajang olahraga multicabang negara-negara Asia Tenggara disebut apa?", "SEA Games", "SEA Games mempertemukan atlet negara-negara Asia Tenggara.", "kompetisi"],
  ["Cabang olahraga yang menggunakan pedang, degen, atau sabel disebut apa?", "Anggar", "Anggar mempertandingkan penggunaan senjata pedang khusus.", "cabang"],
  ["Cabang olahraga bela diri Jepang yang menggunakan teknik bantingan disebut apa?", "Judo", "Judo menekankan teknik bantingan dan kendali lawan.", "cabang"],
  ["Cabang olahraga bela diri Korea yang banyak menggunakan tendangan disebut apa?", "Taekwondo", "Taekwondo dikenal dengan teknik tendangan.", "cabang"],
  ["Dalam atletik, nomor lari jarak pendek dikenal sebagai apa?", "Sprint", "Lari jarak pendek dalam atletik dikenal sebagai sprint.", "cabang"],
  ["Cabang atletik yang menggabungkan lari, lompat, dan lempar disebut apa?", "Dasalomba", "Dasalomba menggabungkan sepuluh nomor atletik.", "cabang"],
  ["Olahraga yang menggunakan papan dan ombak sebagai media utama disebut apa?", "Selancar", "Selancar dilakukan dengan papan di atas gelombang.", "cabang"],
  ["Olahraga yang menggunakan busur untuk melesatkan anak panah disebut apa?", "Panahan", "Panahan menggunakan busur dan anak panah sebagai perlengkapan utama.", "cabang"],
  ["Thomas Cup merupakan kejuaraan beregu internasional untuk cabang olahraga apa?", "Bulu tangkis putra", "Thomas Cup adalah kejuaraan beregu putra dalam bulu tangkis.", "kompetisi"],
  ["Uber Cup merupakan kejuaraan beregu internasional untuk cabang olahraga apa?", "Bulu tangkis putri", "Uber Cup adalah kejuaraan beregu putri dalam bulu tangkis.", "kompetisi"],
  ["Wimbledon merupakan turnamen terkenal dalam cabang olahraga apa?", "Tenis", "Wimbledon merupakan salah satu turnamen tenis paling terkenal.", "kompetisi"],
  ["Tour de France merupakan perlombaan terkenal dalam olahraga apa?", "Balap sepeda", "Tour de France adalah perlombaan balap sepeda jalan raya.", "kompetisi"],
  ["Dalam catur, buah yang pergerakannya berbentuk huruf L adalah apa?", "Kuda", "Kuda bergerak dengan pola dua kotak lalu satu kotak menyamping.", "permainan"],
  ["Dalam permainan catur, tujuan akhir permainan adalah melakukan apa terhadap raja lawan?", "Skakmat", "Skakmat terjadi ketika raja diserang dan tidak memiliki langkah aman.", "permainan"],
].map(([question, answer, explanation, pool]) => ({ question, answer, explanation, pool }))

const factSets = [geography, history, science, mathematics, organizations, culture, sports]

function optionsFor(fact: Fact, facts: Fact[], seed: number) {
  const candidates = [...new Set(facts.filter((item) => item.pool === fact.pool && item.answer !== fact.answer).map((item) => item.answer))]
  const fallback = [...new Set(facts.filter((item) => item.answer !== fact.answer).map((item) => item.answer))]
  const distractors: string[] = []
  const source = candidates.length >= 4 ? candidates : fallback
  for (let offset = 0; distractors.length < 4; offset += 1) {
    const value = source[(seed + offset * 7) % source.length] ?? `Pilihan ${offset + 1}`
    if (value !== fact.answer && !distractors.includes(value)) distractors.push(value)
    if (offset > source.length * 2 && distractors.length < 4) distractors.push(`Pilihan ${offset + 1}`)
  }
  const options = [fact.answer, ...distractors]
  const correctIndex = seed % options.length
  ;[options[0], options[correctIndex]] = [options[correctIndex], options[0]]
  return { options, correctIndex }
}

function buildQuestion(index: number): CatQuestion {
  const categoryIndex = Math.floor(index / 30)
  const facts = factSets[categoryIndex]
  const localIndex = index % 30
  const factIndex = localIndex % facts.length
  const fact = facts[factIndex]
  const arranged = optionsFor(fact, facts, index + 4_250)
  return {
    id: `tiu-${String(2_421 + index).padStart(4, "0")}`,
    type: "tiu",
    category: categories[categoryIndex],
    question: fact.question,
    options: arranged.options,
    correctIndex: arranged.correctIndex,
    explanation: fact.explanation,
    status: "active",
  }
}

export const tiuRpulQuestions: CatQuestion[] = Array.from({ length: 210 }, (_, index) => buildQuestion(index))

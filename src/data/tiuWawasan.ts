import type { CatQuestion } from "../domain/selection"

type Fact = { question: string; answer: string; explanation: string; pool?: string }

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
  { question: "Pada tanggal berapakah Proklamasi Kemerdekaan Indonesia dibacakan?", answer: "17 Agustus 1945", explanation: "Proklamasi Kemerdekaan Indonesia dibacakan pada 17 Agustus 1945." },
  { question: "Siapakah yang membacakan teks Proklamasi Kemerdekaan Indonesia?", answer: "Ir. Sukarno", explanation: "Teks proklamasi dibacakan oleh Ir. Sukarno." },
  { question: "Siapakah yang mendampingi Sukarno saat membacakan teks proklamasi?", answer: "Drs. Mohammad Hatta", explanation: "Mohammad Hatta mendampingi Sukarno saat pembacaan proklamasi." },
  { question: "Di alamat manakah proklamasi dibacakan pada 17 Agustus 1945?", answer: "Jalan Pegangsaan Timur No. 56, Jakarta", explanation: "Pembacaan proklamasi berlangsung di Jalan Pegangsaan Timur No. 56, Jakarta." },
  { question: "Siapakah yang menjahit Bendera Pusaka Merah Putih?", answer: "Fatmawati", explanation: "Fatmawati menjahit Bendera Pusaka yang dikibarkan saat proklamasi." },
  { question: "Siapakah yang mengetik naskah Proklamasi Kemerdekaan Indonesia?", answer: "Sayuti Melik", explanation: "Naskah proklamasi diketik oleh Sayuti Melik." },
  { question: "Di rumah siapakah naskah proklamasi dirumuskan pada dini hari 17 Agustus 1945?", answer: "Laksamana Tadashi Maeda", explanation: "Perumusan naskah proklamasi berlangsung di rumah Laksamana Tadashi Maeda." },
  { question: "Siapakah tokoh yang mengusulkan agar teks proklamasi ditandatangani Sukarno dan Hatta atas nama bangsa Indonesia?", answer: "Sukarni", explanation: "Sukarni mengusulkan penandatanganan oleh Sukarno dan Hatta atas nama bangsa Indonesia." },
  { question: "Siapakah yang menerima tugas menyiapkan upacara pengibaran bendera pada peringatan kemerdekaan tahun 1946 di Yogyakarta?", answer: "Mayor Husein Mutahar", explanation: "Presiden Sukarno menugaskan Mayor Husein Mutahar menyiapkan upacara 17 Agustus 1946 di Yogyakarta." },
  { question: "Di gedung manakah pengibaran Bendera Pusaka dilaksanakan di Yogyakarta pada 17 Agustus 1946?", answer: "Gedung Agung", explanation: "Upacara peringatan kemerdekaan 1946 berlangsung di halaman Gedung Agung, Yogyakarta." },
  { question: "Tahun berapakah gagasan awal pasukan pengibar Bendera Pusaka dijalankan di Yogyakarta?", answer: "1946", explanation: "Gagasan awal pasukan pengibar Bendera Pusaka diwujudkan pada peringatan kemerdekaan tahun 1946." },
  { question: "Berapa orang pemuda yang ditugaskan dalam formasi awal pengibaran Bendera Pusaka di Yogyakarta?", answer: "Lima orang", explanation: "Husein Mutahar menunjuk lima pemuda yang berada di Yogyakarta untuk melaksanakan tugas pengibaran." },
  { question: "Berapa putri yang termasuk dalam kelompok awal pengibar Bendera Pusaka tahun 1946?", answer: "Tiga orang", explanation: "Kelompok awal tersebut terdiri atas tiga putri dan dua putra." },
  { question: "Berapa putra yang termasuk dalam kelompok awal pengibar Bendera Pusaka tahun 1946?", answer: "Dua orang", explanation: "Kelompok awal tersebut terdiri atas tiga putri dan dua putra." },
  { question: "Apakah kepanjangan Paskibraka?", answer: "Pasukan Pengibar Bendera Pusaka", explanation: "Paskibraka merupakan singkatan dari Pasukan Pengibar Bendera Pusaka." },
  { question: "Siapakah presiden yang menugaskan Husein Mutahar menyiapkan upacara kemerdekaan tahun 1946?", answer: "Sukarno", explanation: "Presiden Sukarno memberikan tugas tersebut kepada Husein Mutahar." },
  { question: "Apakah nama resmi bendera negara Indonesia?", answer: "Sang Merah Putih", explanation: "Undang-undang menyebut bendera negara Indonesia sebagai Sang Merah Putih." },
  { question: "Warna apakah yang berada di bagian atas Bendera Negara Indonesia?", answer: "Merah", explanation: "Bendera negara berbentuk persegi panjang dengan merah di bagian atas dan putih di bagian bawah." },
  { question: "Warna apakah yang berada di bagian bawah Bendera Negara Indonesia?", answer: "Putih", explanation: "Bagian bawah Bendera Negara Indonesia berwarna putih." },
  { question: "Jika panjang bendera 3 meter, berapa lebarnya menurut perbandingan ukuran bendera negara?", answer: "2 meter", explanation: "Lebar bendera adalah dua pertiga dari panjangnya." },
  { question: "Apakah perbandingan lebar dan panjang Bendera Negara Indonesia?", answer: "2 : 3", explanation: "Undang-undang menetapkan lebar bendera dua pertiga dari panjangnya." },
  { question: "Siapakah pencipta lagu kebangsaan Indonesia Raya?", answer: "Wage Rudolf Supratman", explanation: "Indonesia Raya diciptakan oleh Wage Rudolf Supratman." },
  { question: "Pada peristiwa apakah lagu Indonesia Raya pertama kali diperdengarkan pada 1928?", answer: "Kongres Pemuda II", explanation: "Indonesia Raya diperdengarkan pada Kongres Pemuda II tahun 1928." },
  { question: "Burung apakah yang menjadi lambang negara Republik Indonesia?", answer: "Garuda", explanation: "Lambang negara Republik Indonesia menggunakan burung Garuda." },
  { question: "Semboyan apakah yang tertulis pada pita yang dicengkeram Garuda?", answer: "Bhinneka Tunggal Ika", explanation: "Pita pada lambang negara memuat semboyan Bhinneka Tunggal Ika." },
  { question: "Ke arah manakah kepala Garuda pada lambang negara menghadap?", answer: "Ke kanan", explanation: "Kepala Garuda pada lambang negara menghadap ke kanan." },
  { question: "Apa nama organisasi yang menaungi anggota setelah menyelesaikan tugas Paskibraka?", answer: "Purna Paskibraka Indonesia", explanation: "Purna Paskibraka Indonesia menghimpun para purna anggota Paskibraka." },
  { question: "Bunga apakah yang menjadi lambang Purna Paskibraka Indonesia?", answer: "Bunga teratai", explanation: "Lambang Purna Paskibraka Indonesia menggunakan bunga teratai yang dilingkari rantai." },
  { question: "Tiga helai daun yang tumbuh ke atas pada lambang PPI melambangkan apa?", answer: "Belajar, bekerja, dan berbakti", explanation: "Tiga helai daun ke atas melambangkan belajar, bekerja, dan berbakti." },
  { question: "Tiga helai daun yang tumbuh mendatar pada lambang PPI melambangkan sikap apa?", answer: "Aktif, disiplin, dan gembira", explanation: "Tiga helai daun mendatar melambangkan sikap aktif, disiplin, dan gembira." },
] 

const geographyFacts: Fact[] = [
  ["Aceh", "Banda Aceh"], ["Sumatera Utara", "Medan"], ["Sumatera Barat", "Padang"], ["Riau", "Pekanbaru"], ["Jambi", "Jambi"],
  ["Sumatera Selatan", "Palembang"], ["Bengkulu", "Bengkulu"], ["Lampung", "Bandar Lampung"], ["Kepulauan Bangka Belitung", "Pangkalpinang"], ["Kepulauan Riau", "Tanjungpinang"],
  ["DKI Jakarta", "Jakarta"], ["Jawa Barat", "Bandung"], ["Jawa Tengah", "Semarang"], ["Daerah Istimewa Yogyakarta", "Yogyakarta"], ["Jawa Timur", "Surabaya"], ["Banten", "Serang"],
  ["Bali", "Denpasar"], ["Nusa Tenggara Barat", "Mataram"], ["Nusa Tenggara Timur", "Kupang"], ["Kalimantan Barat", "Pontianak"], ["Kalimantan Tengah", "Palangka Raya"],
  ["Kalimantan Selatan", "Banjarbaru"], ["Kalimantan Timur", "Samarinda"], ["Kalimantan Utara", "Tanjung Selor"], ["Sulawesi Utara", "Manado"], ["Sulawesi Tengah", "Palu"],
  ["Sulawesi Selatan", "Makassar"], ["Sulawesi Tenggara", "Kendari"], ["Gorontalo", "Gorontalo"], ["Sulawesi Barat", "Mamuju"], ["Maluku", "Ambon"], ["Maluku Utara", "Sofifi"],
  ["Papua", "Jayapura"], ["Papua Barat", "Manokwari"], ["Papua Selatan", "Merauke"], ["Papua Tengah", "Nabire"], ["Papua Pegunungan", "Wamena"], ["Papua Barat Daya", "Sorong"],
].map(([province, capital]) => ({ question: `Apakah ibu kota Provinsi ${province}?`, answer: capital, explanation: `Ibu kota Provinsi ${province} adalah ${capital}.`, pool: "provinsi" }))

geographyFacts.push(
  { question: "Negara apakah yang berbatasan darat dengan Indonesia di Pulau Kalimantan?", answer: "Malaysia", explanation: "Di Pulau Kalimantan, Indonesia berbatasan darat dengan Malaysia.", pool: "batas" },
  { question: "Negara apakah yang berbatasan darat dengan Indonesia di Pulau Papua?", answer: "Papua Nugini", explanation: "Indonesia dan Papua Nugini berbagi perbatasan darat di Pulau Papua.", pool: "batas" },
  { question: "Negara apakah yang berbatasan darat dengan Indonesia di Pulau Timor?", answer: "Timor-Leste", explanation: "Indonesia berbatasan darat dengan Timor-Leste di Pulau Timor.", pool: "batas" },
  { question: "Samudra apakah yang berada di sebelah barat Indonesia?", answer: "Samudra Hindia", explanation: "Samudra Hindia terletak di sebelah barat Indonesia.", pool: "geografi" },
  { question: "Samudra apakah yang berada di sebelah timur Indonesia?", answer: "Samudra Pasifik", explanation: "Samudra Pasifik terletak di sebelah timur Indonesia.", pool: "geografi" },
  { question: "Laut apakah yang memisahkan sebagian wilayah Indonesia dan Australia?", answer: "Laut Timor", explanation: "Laut Timor berada di antara wilayah Nusa Tenggara Timur dan Australia bagian utara.", pool: "geografi" },
  { question: "Selat apakah yang memisahkan Pulau Sumatra dan Semenanjung Malaya?", answer: "Selat Malaka", explanation: "Selat Malaka memisahkan Sumatra dari Semenanjung Malaya.", pool: "geografi" },
  { question: "Selat apakah yang memisahkan Pulau Jawa dan Pulau Bali?", answer: "Selat Bali", explanation: "Selat Bali terletak di antara Jawa dan Bali.", pool: "geografi" },
  { question: "Selat apakah yang memisahkan Pulau Kalimantan dan Sulawesi?", answer: "Selat Makassar", explanation: "Selat Makassar terletak di antara Kalimantan dan Sulawesi.", pool: "geografi" },
  { question: "Berapakah jumlah provinsi di Indonesia setelah pembentukan provinsi-provinsi baru di Papua?", answer: "38 provinsi", explanation: "Indonesia terdiri atas 38 provinsi setelah pembentukan provinsi baru di Papua." , pool: "geografi" },
  { question: "Siapakah Menteri Dalam Negeri Kabinet Merah Putih menurut profil kabinet pemerintah per Oktober 2026?", answer: "Muhammad Tito Karnavian", explanation: "Profil kabinet Sekretariat Kabinet mencantumkan Muhammad Tito Karnavian sebagai Menteri Dalam Negeri per Oktober 2026.", pool: "menteri" },
  { question: "Siapakah Menteri Luar Negeri Kabinet Merah Putih menurut profil kabinet pemerintah per Oktober 2026?", answer: "Sugiono", explanation: "Profil kabinet Sekretariat Kabinet mencantumkan Sugiono sebagai Menteri Luar Negeri per Oktober 2026.", pool: "menteri" },
  { question: "Siapakah Menteri Pertahanan Kabinet Merah Putih menurut profil kabinet pemerintah per Oktober 2026?", answer: "Sjafrie Sjamsoeddin", explanation: "Profil kabinet Sekretariat Kabinet mencantumkan Sjafrie Sjamsoeddin sebagai Menteri Pertahanan per Oktober 2026.", pool: "menteri" },
  { question: "Siapakah Menteri Pendidikan Dasar dan Menengah Kabinet Merah Putih menurut profil kabinet pemerintah per Oktober 2026?", answer: "Abdul Mu’ti", explanation: "Profil kabinet Sekretariat Kabinet mencantumkan Abdul Mu’ti sebagai Menteri Pendidikan Dasar dan Menengah per Oktober 2026.", pool: "menteri" },
  { question: "Siapakah Menteri Kesehatan Kabinet Merah Putih menurut profil kabinet pemerintah per Oktober 2026?", answer: "Budi Gunadi Sadikin", explanation: "Profil kabinet Sekretariat Kabinet mencantumkan Budi Gunadi Sadikin sebagai Menteri Kesehatan per Oktober 2026.", pool: "menteri" },
  { question: "Siapakah Menteri Keuangan Kabinet Merah Putih menurut profil kabinet pemerintah per Oktober 2026?", answer: "Suahasil Nazara", explanation: "Profil kabinet Sekretariat Kabinet mencantumkan Suahasil Nazara sebagai Menteri Keuangan per Oktober 2026.", pool: "menteri" },
  { question: "Siapakah Menteri Pemuda dan Olahraga Kabinet Merah Putih menurut profil kabinet pemerintah per Oktober 2026?", answer: "Erick Thohir", explanation: "Profil kabinet Sekretariat Kabinet mencantumkan Erick Thohir sebagai Menteri Pemuda dan Olahraga per Oktober 2026.", pool: "menteri" },
  { question: "Siapakah Menteri Koordinator Bidang Politik dan Keamanan menurut profil kabinet pemerintah per Oktober 2026?", answer: "Djamari Chaniago", explanation: "Profil kabinet Sekretariat Kabinet mencantumkan Djamari Chaniago sebagai Menko Polkam per Oktober 2026.", pool: "menteri" },
  { question: "Lembaga negara apakah yang memeriksa pengelolaan dan tanggung jawab keuangan negara?", answer: "Badan Pemeriksa Keuangan", explanation: "BPK bertugas memeriksa pengelolaan dan tanggung jawab keuangan negara.", pool: "lembaga" },
  { question: "Lembaga apakah yang menjalankan fungsi legislasi bersama Presiden?", answer: "Dewan Perwakilan Rakyat", explanation: "DPR memegang kekuasaan membentuk undang-undang bersama Presiden.", pool: "lembaga" },
  { question: "Lembaga apakah yang mewakili kepentingan daerah di tingkat nasional?", answer: "Dewan Perwakilan Daerah", explanation: "DPD merupakan lembaga perwakilan yang membawa aspirasi daerah.", pool: "lembaga" },
  { question: "Lembaga apakah yang mengadili perkara pada tingkat kasasi?", answer: "Mahkamah Agung", explanation: "Mahkamah Agung merupakan pengadilan tertinggi yang antara lain memeriksa perkara kasasi.", pool: "lembaga" },
  { question: "Lembaga apakah yang berwenang menguji undang-undang terhadap UUD?", answer: "Mahkamah Konstitusi", explanation: "Mahkamah Konstitusi berwenang menguji undang-undang terhadap UUD 1945.", pool: "lembaga" },
  { question: "Lembaga apakah yang menyelenggarakan pemilihan umum secara nasional?", answer: "Komisi Pemilihan Umum", explanation: "KPU menyelenggarakan pemilihan umum di Indonesia.", pool: "lembaga" },
)

const globalFacts: Fact[] = [
  { question: "Di kota manakah Konferensi Asia Afrika tahun 1955 diselenggarakan?", answer: "Bandung", explanation: "Konferensi Asia Afrika diselenggarakan di Bandung pada 18–24 April 1955." },
  { question: "Pada tahun berapakah Konferensi Asia Afrika berlangsung di Bandung?", answer: "1955", explanation: "Konferensi Asia Afrika berlangsung pada tahun 1955." },
  { question: "Berapa negara yang menghadiri Konferensi Asia Afrika tahun 1955?", answer: "29 negara", explanation: "Sebanyak 29 negara Asia dan Afrika menghadiri konferensi tersebut." },
  { question: "Apakah nama sepuluh prinsip hasil Konferensi Asia Afrika?", answer: "Dasasila Bandung", explanation: "Sepuluh prinsip hasil konferensi dikenal sebagai Dasasila Bandung." },
  { question: "Gedung apakah yang menjadi tempat sidang Konferensi Asia Afrika di Bandung?", answer: "Gedung Merdeka", explanation: "Sidang KAA berlangsung di Gedung Merdeka, yang saat itu dikenal sebagai Gedung Concordia sebelum namanya diubah." },
  { question: "Pada tanggal berapakah Konferensi Asia Afrika dibuka?", answer: "18 April 1955", explanation: "KAA dibuka pada 18 April 1955." },
  { question: "Pada tanggal berapakah Konferensi Asia Afrika ditutup?", answer: "24 April 1955", explanation: "KAA berakhir pada 24 April 1955." },
  { question: "Siapakah Perdana Menteri Indonesia yang berperan penting dalam gagasan penyelenggaraan KAA 1955?", answer: "Ali Sastroamidjojo", explanation: "Perdana Menteri Ali Sastroamidjojo berperan mendorong gagasan kerja sama negara Asia dan Afrika." },
  { question: "Apakah nama forum kerja sama negara-negara Asia Tenggara yang berdiri pada 1967?", answer: "ASEAN", explanation: "ASEAN adalah Association of Southeast Asian Nations." },
  { question: "Pada tanggal berapakah ASEAN didirikan?", answer: "8 Agustus 1967", explanation: "ASEAN didirikan pada 8 Agustus 1967 melalui Deklarasi Bangkok." },
  { question: "Di kota manakah Deklarasi ASEAN ditandatangani?", answer: "Bangkok", explanation: "Deklarasi ASEAN ditandatangani di Bangkok, Thailand." },
  { question: "Negara manakah yang menjadi anggota ke-11 ASEAN pada 2025?", answer: "Timor-Leste", explanation: "Timor-Leste diterima sebagai anggota ke-11 ASEAN pada 26 Oktober 2025." },
  { question: "Berapakah jumlah anggota ASEAN setelah penerimaan Timor-Leste pada 2025?", answer: "11 negara", explanation: "Dengan bergabungnya Timor-Leste, ASEAN memiliki 11 negara anggota." },
  { question: "Di kota manakah Sekretariat ASEAN berkedudukan?", answer: "Jakarta", explanation: "Sekretariat ASEAN berkedudukan di Jakarta." },
  { question: "Negara manakah yang menjadi ketua pertama ASEAN?", answer: "Indonesia", explanation: "Indonesia menjadi Ketua ASEAN pertama pada 1976." },
  { question: "Apakah nama organisasi global yang dibentuk setelah Perang Dunia II untuk mendorong kerja sama antarnegara?", answer: "Perserikatan Bangsa-Bangsa", explanation: "PBB didirikan pada 1945 setelah Perang Dunia II." },
  { question: "Pada tahun berapakah Perserikatan Bangsa-Bangsa didirikan?", answer: "1945", explanation: "PBB didirikan pada 1945." },
  { question: "Pada tanggal berapakah Indonesia diterima sebagai anggota PBB?", answer: "28 September 1950", explanation: "Indonesia menjadi anggota PBB pada 28 September 1950." },
  { question: "Indonesia menjadi anggota PBB urutan ke berapa?", answer: "Ke-60", explanation: "Indonesia diterima sebagai anggota ke-60 PBB." },
  { question: "Apakah nama gerakan negara-negara yang tidak secara formal berpihak pada blok kekuatan utama Perang Dingin?", answer: "Gerakan Non-Blok", explanation: "Gerakan Non-Blok menghimpun negara yang berupaya tidak berpihak pada blok utama Perang Dingin." },
  { question: "Di kota manakah Konferensi Tingkat Tinggi pertama Gerakan Non-Blok dilaksanakan pada 1961?", answer: "Beograd", explanation: "KTT pertama Gerakan Non-Blok diselenggarakan di Beograd pada 1961." },
  { question: "Negara manakah yang menjadi tuan rumah KTT G20 pada 2022?", answer: "Indonesia", explanation: "Indonesia menjadi tuan rumah KTT G20 di Bali pada 2022." },
  { question: "Di pulau manakah KTT G20 Indonesia tahun 2022 diselenggarakan?", answer: "Bali", explanation: "KTT G20 Indonesia 2022 diselenggarakan di Bali." },
  { question: "Apakah nama deklarasi yang menandai berdirinya ASEAN?", answer: "Deklarasi Bangkok", explanation: "ASEAN dibentuk melalui penandatanganan Deklarasi Bangkok." },
  { question: "Apakah nama kerja sama ekonomi Asia-Pasifik yang mencakup Indonesia dan Australia?", answer: "APEC", explanation: "APEC adalah forum kerja sama ekonomi Asia-Pasifik." },
  { question: "Apakah kepanjangan G20?", answer: "Group of Twenty", explanation: "G20 merupakan forum kerja sama ekonomi internasional yang dikenal sebagai Group of Twenty." },
  { question: "Apa tujuan utama penyelenggaraan KAA menurut tema umumnya?", answer: "Mendorong kerja sama Asia-Afrika dan menentang kolonialisme", explanation: "KAA mendorong kerja sama Asia-Afrika, solidaritas, perdamaian, dan penentangan terhadap kolonialisme." },
  { question: "Benua apakah yang menjadi pasangan wilayah dalam Konferensi Asia-Afrika?", answer: "Asia dan Afrika", explanation: "KAA mempertemukan negara-negara dari benua Asia dan Afrika." },
  { question: "Apakah istilah bagi prinsip menghormati kedaulatan dan tidak mencampuri urusan dalam negeri negara lain?", answer: "Nonintervensi", explanation: "Nonintervensi berarti tidak mencampuri urusan dalam negeri negara lain." },
  { question: "Apakah nama kota di Indonesia yang menjadi lokasi pertemuan para pemimpin ASEAN dan forum regional penting?", answer: "Jakarta", explanation: "Jakarta menjadi pusat berbagai kegiatan diplomasi dan Sekretariat ASEAN." },
]

const inventorFacts: Fact[] = [
  ["Michael Faraday", "induksi elektromagnetik"], ["Alexander Graham Bell", "telepon"], ["Thomas Alva Edison", "lampu pijar praktis"],
  ["Alexander Fleming", "penisilin"], ["Albert Einstein", "teori relativitas"], ["Johannes Gutenberg", "mesin cetak huruf lepas di Eropa"],
  ["Isaac Newton", "hukum gerak dan gravitasi klasik"], ["Marie Curie", "penelitian radioaktivitas"], ["Charles Darwin", "teori evolusi melalui seleksi alam"],
  ["Wright bersaudara", "pesawat bermesin yang berhasil terbang"], ["Nikola Tesla", "pengembangan sistem arus bolak-balik"], ["James Watt", "penyempurnaan mesin uap"],
  ["Galileo Galilei", "pengamatan astronomi dengan teleskop"], ["Nicolaus Copernicus", "model tata surya heliosentris"], ["Louis Pasteur", "pasteurisasi"],
  ["Ada Lovelace", "algoritma awal untuk mesin analitik"], ["Tim Berners-Lee", "World Wide Web"], ["Johannes Kepler", "hukum gerak planet"],
  ["Dmitri Mendeleev", "tabel periodik unsur"], ["Gregor Mendel", "dasar ilmu genetika"], ["Katherine Johnson", "perhitungan lintasan penerbangan antariksa NASA"],
  ["Grace Hopper", "pengembangan compiler komputer"], ["Alan Turing", "landasan teoretis ilmu komputasi"], ["Robert Koch", "penelitian bakteri penyebab penyakit"],
  ["Edward Jenner", "vaksin cacar"], ["Orville dan Wilbur Wright", "penerbangan bermesin terkendali"], ["Samuel Morse", "kode telegraf yang memakai namanya"],
  ["Guglielmo Marconi", "pengembangan telegrafi nirkabel"], ["Hedy Lamarr", "gagasan komunikasi spread-spectrum"], ["Tu Youyou", "penemuan artemisinin untuk pengobatan malaria"],
].map(([person, contribution]) => ({ question: `Tokoh yang dikenal atas kontribusi pada ${contribution} adalah ....`, answer: person, explanation: `${person} dikenal atas kontribusi pentingnya pada ${contribution}.` }))

const worldCapitalFacts: Fact[] = [
  ["Vietnam", "Hanoi"], ["Filipina", "Manila"], ["Myanmar", "Naypyidaw"], ["Thailand", "Bangkok"], ["Malaysia", "Kuala Lumpur"],
  ["Singapura", "Singapura"], ["Kamboja", "Phnom Penh"], ["Laos", "Vientiane"], ["Brunei Darussalam", "Bandar Seri Begawan"], ["Timor-Leste", "Dili"],
  ["Amerika Serikat", "Washington, D.C."], ["Australia", "Canberra"], ["Turki", "Ankara"], ["Brasil", "Brasília"], ["India", "New Delhi"],
  ["Jepang", "Tokyo"], ["Tiongkok", "Beijing"], ["Korea Selatan", "Seoul"], ["Pakistan", "Islamabad"], ["Bangladesh", "Dhaka"],
  ["Nepal", "Kathmandu"], ["Arab Saudi", "Riyadh"], ["Uni Emirat Arab", "Abu Dhabi"], ["Mesir", "Kairo"], ["Selandia Baru", "Wellington"],
  ["Prancis", "Paris"], ["Jerman", "Berlin"], ["Italia", "Roma"], ["Spanyol", "Madrid"], ["Britania Raya", "London"],
].map(([country, capital]) => ({ question: `Apakah ibu kota negara ${country}?`, answer: capital, explanation: `Ibu kota ${country} adalah ${capital}.`, pool: "ibu-kota" }))

const organizationFacts: Fact[] = [
  ["UNESCO", "pendidikan, ilmu pengetahuan, dan kebudayaan", "Paris"], ["UNICEF", "perlindungan dan kesejahteraan anak", "New York"],
  ["WHO", "kesehatan masyarakat dunia", "Jenewa"], ["UNHCR", "perlindungan pengungsi", "Jenewa"], ["ILO", "ketenagakerjaan dan standar kerja", "Jenewa"],
  ["FAO", "pangan dan pertanian", "Roma"], ["IMF", "stabilitas moneter dan kerja sama keuangan", "Washington, D.C."],
  ["Bank Dunia", "pembiayaan pembangunan dan pengurangan kemiskinan", "Washington, D.C."], ["ICAO", "penerbangan sipil internasional", "Montreal"],
  ["IMO", "keselamatan pelayaran dan pencegahan pencemaran laut", "London"], ["WIPO", "kekayaan intelektual", "Jenewa"],
  ["IAEA", "kerja sama dan pengawasan pemanfaatan energi atom", "Wina"], ["OPEC", "kerja sama negara-negara pengekspor minyak", "Wina"],
  ["NATO", "aliansi pertahanan kolektif negara-negara anggota", "Brussels"], ["ASEAN", "kerja sama negara-negara Asia Tenggara", "Jakarta"],
  ["PBB", "perdamaian dan keamanan internasional", "New York"], ["UNDP", "pembangunan dan pengentasan kemiskinan", "New York"],
  ["UN Women", "kesetaraan gender dan pemberdayaan perempuan", "New York"], ["UNIDO", "pembangunan industri berkelanjutan", "Wina"],
  ["WMO", "meteorologi, iklim, dan hidrologi", "Jenewa"], ["ITU", "telekomunikasi dan teknologi informasi", "Jenewa"],
  ["IFAD", "pembangunan pertanian dan pengurangan kemiskinan pedesaan", "Roma"], ["UNEP", "perlindungan lingkungan hidup global", "Nairobi"],
  ["UN Tourism", "pariwisata yang bertanggung jawab dan berkelanjutan", "Madrid"], ["ICJ", "penyelesaian sengketa hukum antarnegara", "Den Haag"],
  ["Interpol", "kerja sama kepolisian lintas negara", "Lyon"], ["WFP", "bantuan pangan kemanusiaan", "Roma"],
  ["IOM", "migrasi yang tertib dan manusiawi", "Jenewa"], ["WTO", "aturan dan perundingan perdagangan dunia", "Jenewa"],
  ["UNODC", "pemberantasan narkoba dan kejahatan lintas negara", "Wina"],
].flatMap(([org, mandate, headquarters]) => [
  { question: `Organisasi apakah yang bergerak dalam bidang ${mandate}?`, answer: org, explanation: `${org} bekerja di bidang ${mandate}.`, pool: "organisasi" },
  { question: `Di kota manakah kantor pusat ${org} berada?`, answer: headquarters, explanation: `Kantor pusat ${org} berada di ${headquarters}.`, pool: "markas" },
])

const symbolFacts: Fact[] = [
  { question: "Bunga apakah yang ditetapkan sebagai Puspa Bangsa Indonesia?", answer: "Melati putih", explanation: "Melati putih ditetapkan sebagai Puspa Bangsa." },
  { question: "Bunga apakah yang ditetapkan sebagai Puspa Pesona Indonesia?", answer: "Anggrek bulan", explanation: "Anggrek bulan ditetapkan sebagai Puspa Pesona." },
  { question: "Bunga apakah yang ditetapkan sebagai Puspa Langka Indonesia?", answer: "Padma raksasa (Rafflesia arnoldii)", explanation: "Padma raksasa atau Rafflesia arnoldii ditetapkan sebagai Puspa Langka." },
  { question: "Satwa apakah yang ditetapkan sebagai Satwa Nasional Indonesia?", answer: "Komodo", explanation: "Komodo ditetapkan sebagai Satwa Nasional." },
  { question: "Satwa apakah yang ditetapkan sebagai Satwa Pesona Indonesia?", answer: "Ikan siluk merah", explanation: "Ikan siluk merah ditetapkan sebagai Satwa Pesona." },
  { question: "Satwa apakah yang ditetapkan sebagai Satwa Langka Indonesia?", answer: "Elang Jawa", explanation: "Elang Jawa ditetapkan sebagai Satwa Langka." },
  { question: "Apakah nama ilmiah bunga melati yang menjadi Puspa Bangsa?", answer: "Jasminum sambac", explanation: "Nama ilmiah melati yang ditetapkan sebagai Puspa Bangsa adalah Jasminum sambac." },
  { question: "Di pulau apakah komodo hidup secara alami?", answer: "Nusa Tenggara Timur", explanation: "Komodo hidup di sejumlah pulau di Nusa Tenggara Timur, termasuk Komodo, Rinca, dan Flores." },
  { question: "Burung apakah yang menjadi fauna endemik khas Papua dan terkenal karena bulunya yang mencolok?", answer: "Cenderawasih", explanation: "Cenderawasih merupakan kelompok burung khas Papua yang dikenal karena bulunya yang indah." },
  { question: "Mamalia berkantung apakah yang menjadi satwa khas Papua?", answer: "Kanguru pohon", explanation: "Kanguru pohon hidup di hutan Papua dan pulau-pulau sekitarnya." },
  { question: "Satwa apakah yang dikenal sebagai mamalia endemik Sulawesi dengan tanduk pendek?", answer: "Anoa", explanation: "Anoa adalah mamalia khas Sulawesi." },
  { question: "Burung apakah yang terkenal sebagai satwa endemik Pulau Bali?", answer: "Jalak Bali", explanation: "Jalak Bali merupakan burung endemik Bali yang dilindungi." },
  { question: "Apakah nama badak bercula satu yang hidup di Ujung Kulon?", answer: "Badak Jawa", explanation: "Badak Jawa atau badak bercula satu hidup di Taman Nasional Ujung Kulon." },
  { question: "Di pulau manakah orangutan Tapanuli ditemukan?", answer: "Sumatra", explanation: "Orangutan Tapanuli hidup di kawasan Batang Toru, Sumatra Utara." },
  { question: "Di pulau manakah burung maleo merupakan satwa endemik?", answer: "Sulawesi", explanation: "Maleo merupakan burung endemik Sulawesi." },
  { question: "Hewan apakah yang menjadi maskot fauna Provinsi Nusa Tenggara Timur dan terkenal dengan leher panjang?", answer: "Komodo", explanation: "Komodo merupakan satwa ikonik dari Nusa Tenggara Timur." },
  { question: "Apakah nama tumbuhan parasit raksasa yang menjadi Puspa Langka?", answer: "Rafflesia arnoldii", explanation: "Rafflesia arnoldii dikenal sebagai padma raksasa dan Puspa Langka." },
  { question: "Apa nama lambang organisasi Purna Paskibraka Indonesia?", answer: "Bunga teratai yang dilingkari rantai", explanation: "Lambang PPI berupa bunga teratai dengan rantai yang melingkar." },
  { question: "Makna tiga daun yang tumbuh ke atas pada lambang PPI adalah ....", answer: "Belajar, bekerja, dan berbakti", explanation: "Tiga daun ke atas melambangkan belajar, bekerja, dan berbakti." },
  { question: "Makna tiga daun mendatar pada lambang PPI adalah ....", answer: "Aktif, disiplin, dan gembira", explanation: "Tiga daun mendatar melambangkan aktif, disiplin, dan gembira." },
  { question: "Rantai pada lambang PPI melambangkan apa?", answer: "Persaudaraan antaranggota dari berbagai daerah", explanation: "Rantai yang saling berkaitan melambangkan persaudaraan antarpurna anggota dari berbagai daerah." },
  { question: "Hewan apakah yang menjadi lambang negara Indonesia?", answer: "Garuda", explanation: "Lambang negara Indonesia menggunakan burung Garuda." },
  { question: "Apakah nama hewan nasional yang menjadi simbol Selandia Baru?", answer: "Kiwi", explanation: "Burung kiwi merupakan simbol nasional Selandia Baru." },
  { question: "Hewan apakah yang menjadi simbol nasional Australia dan melompat dengan kantong?", answer: "Kanguru", explanation: "Kanguru merupakan salah satu simbol fauna Australia." },
  { question: "Bunga apakah yang menjadi simbol nasional Jepang dan mekar pada musim semi?", answer: "Sakura", explanation: "Sakura merupakan bunga yang sangat dikenal sebagai simbol Jepang." },
  { question: "Bunga apakah yang menjadi simbol nasional Belanda dan identik dengan warna-warni?", answer: "Tulip", explanation: "Tulip dikenal luas sebagai bunga simbolik Belanda." },
  { question: "Apakah nama pohon yang menjadi simbol nasional Lebanon?", answer: "Pohon aras", explanation: "Pohon aras Lebanon ditampilkan pada bendera negara Lebanon." },
  { question: "Hewan apakah yang menjadi lambang negara Amerika Serikat?", answer: "Elang botak", explanation: "Elang botak menjadi lambang nasional Amerika Serikat." },
  { question: "Apakah nama bunga nasional India yang tumbuh di air?", answer: "Teratai", explanation: "Teratai merupakan bunga nasional India." },
  { question: "Apakah nama bunga nasional Ukraina yang berwarna kuning dan tumbuh menghadap matahari?", answer: "Bunga matahari", explanation: "Bunga matahari merupakan salah satu simbol nasional Ukraina." },
]

const factSets = [historyFacts, geographyFacts, globalFacts, inventorFacts, worldCapitalFacts, organizationFacts, symbolFacts]

function optionsFor(fact: Fact, facts: Fact[], seed: number) {
  const pool = fact.pool ? facts.filter((item) => item.pool === fact.pool) : facts
  const choices = [...new Set(pool.map((item) => item.answer).filter((item) => item !== fact.answer))]
  const distractors: string[] = []
  for (let offset = 0; distractors.length < 4; offset += 1) {
    const candidate = choices[(seed + offset * 7) % choices.length] ?? `Pilihan ${offset + 1}`
    if (candidate !== fact.answer && !distractors.includes(candidate)) distractors.push(candidate)
    if (offset > choices.length * 2 && distractors.length < 4) distractors.push(`Pilihan ${offset + 1}`)
  }
  const options = [fact.answer, ...distractors]
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
    const index = factSets.slice(0, categoryIndex).reduce((total, previous, previousIndex) => total + (previousIndex === 1 || previousIndex === 5 ? 60 : 30), 0) + factIndex
    return buildQuestion(categoryIndex, factIndex, index)
  })
})

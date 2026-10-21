# Rencana Implementasi Sistem Manajemen & Tracker Seleksi Paskibraka BPIP 2026/2027

## 1. Ringkasan dan hasil yang dituju

Membangun ulang scaffold React/Vite kosong menjadi aplikasi multi-pengguna untuk satu organisasi dan banyak periode seleksi, dengan dua pengalaman utama:

1. **Dashboard staf** untuk admin, pelatih, tim medis, dan juri.
2. **Portal kandidat** untuk melengkapi profil, mengikuti CAT, melihat progres, dan mengakses program latihan.

Aplikasi akan menggunakan Supabase untuk autentikasi, database, penyimpanan berkas privat, dan kontrol akses. Semua delapan tahap seleksi dimodelkan kronologis. Tahap 1–5 memakai hard-lock; hanya kandidat yang lolos seluruh tahap tersebut yang dapat masuk penilaian komposit Tahap 6–8.

PRD menjadi baseline produk, tetapi angka atau tabel yang belum lengkap/kontradiktif tidak boleh ditampilkan sebagai standar resmi. Aturan tersebut disimpan sebagai konfigurasi berversi dengan status `draft_unverified` sampai admin yang berwenang mengesahkannya berdasarkan sumber resmi.

## 2. Kondisi awal repository

- Stack tersedia: React 19, Vite 8, TypeScript 5.7, Tailwind CSS v4.
- `src/App.tsx` masih kosong dan belum ada model data, routing, komponen, state management, pengujian, autentikasi, atau backend.
- Belum ada koneksi Supabase di repository.
- Server development sudah dikelola Figma Make dan tidak boleh dijalankan ulang secara manual.

## 3. Keputusan produk yang telah disepakati

- Target: aplikasi multi-pengguna penuh, bukan sekadar demo visual.
- Organisasi: satu organisasi, mendukung banyak periode/tahun penugasan.
- Pengalaman: dashboard staf dan mode kandidat.
- Onboarding: staf diundang admin; kandidat dibuat atau diimpor staf lalu diberi akses.
- RBAC:
  - `admin`: periode, pengguna, standar, bank soal, seluruh data, ekspor, dan audit.
  - `coach`: kandidat, administrasi nonmedis, latihan, dan progres.
  - `medical`: hanya data Rikkes/antropometri yang diperlukan serta identitas minimum.
  - `judge`: hanya kandidat yang ditugaskan dan formulir penilaian Tahap 6–8.
  - `candidate`: profil, dokumen miliknya, ujian miliknya, latihan, dan hasil yang sudah dipublikasikan.
- Data asli akan digunakan, termasuk PII, data medis, dan berkas administrasi.
- Enam berkas administrasi disimpan sebagai objek privat dengan signed URL berumur singkat.
- Audit media sosial dilakukan manual dan terstruktur; tidak ada scraping.
- Ekspor: PDF laporan kandidat, CSV rekap/leaderboard, dan halaman print.
- Bank soal dirilis bertahap: engine lengkap dan seed representatif lebih dahulu; sesi resmi 50 soal hanya dapat dipublikasikan saat bank aktif memenuhi komposisi.

## 4. Batasan keamanan dan gate sebelum produksi

Figma Make bukan lingkungan yang dengan sendirinya menjamin kelayakan pengumpulan PII atau rekam medis. Implementasi dapat dibangun dan diuji, tetapi **go-live dengan data asli harus diblokir** sampai seluruh gate berikut selesai:

- persetujuan pemrosesan data dan dasar hukum ditinjau pihak legal/organisasi;
- privacy notice, tujuan penggunaan, hak akses subjek data, dan prosedur koreksi/penghapusan disahkan;
- masa retensi per jenis data dan prosedur pemusnahan ditetapkan;
- threat model dan review konfigurasi Supabase/RLS selesai;
- seluruh bucket berkas dipastikan privat, tidak ada public URL, dan akses signed URL diaudit;
- backup, pemulihan, respons insiden, rotasi kredensial, dan offboarding pengguna diuji;
- MFA diwajibkan untuk admin dan sangat dianjurkan untuk semua staf;
- data sensitif tidak pernah dimasukkan ke log aplikasi, analytics, seed, screenshot, atau error report;
- penetration/security review dilakukan di luar pemeriksaan UI biasa.

Selama gate tersebut belum selesai, gunakan data sintetis atau tersamarkan di lingkungan pengembangan.

## 5. Arsitektur aplikasi

### 5.1 Frontend

- React + TypeScript + Tailwind CSS v4.
- Tambahkan `react-router-dom` untuk route dan route guard.
- Tambahkan `@supabase/supabase-js` setelah proyek Supabase dihubungkan.
- Gunakan Context + reducer untuk state UI/session yang kecil; data server dibaca melalui lapisan repository/service agar komponen tidak memanggil Supabase secara ad hoc.
- Tambahkan ikon dari satu pustaka konsisten seperti `lucide-react`; tidak memakai emoji sebagai ikon.
- Tambahkan `@react-pdf/renderer` untuk PDF yang dapat diunduh. Sediakan stylesheet `@media print` terpisah untuk halaman cetak.
- Tambahkan `vitest` untuk unit test kalkulator dan state machine.

### 5.2 Backend Supabase

- Supabase Auth untuk login dan undangan.
- PostgreSQL untuk data relasional dan aturan integritas.
- Supabase Storage bucket privat untuk dokumen kandidat dan hasil ekspor sementara.
- Row Level Security pada seluruh tabel yang mengandung data pengguna.
- Operasi istimewa—undangan, publikasi ujian, finalisasi tahap, eliminasi, ranking, ekspor massal—dijalankan melalui RPC/Edge Function/server path, bukan dipercaya dari browser.
- Semua skor turunan dihitung ulang di server ketika difinalisasi; nilai yang dikirim browser dianggap input mentah.
- Jika perubahan pada Edge Function tidak terpantul, deploy ulang dari Make Settings sesuai prosedur Figma Make.

### 5.3 Struktur source yang dituju

```text
src/
  app/
    router.tsx
    auth.tsx
    guards.tsx
  components/
    layout/
    ui/
    status/
    forms/
    charts/
  features/
    dashboard/
    candidates/
    administration/
    exams/
    medical/
    anthropometry/
    judging/
    ranking/
    training/
    standards/
    users/
    exports/
  lib/
    supabase.ts
    permissions.ts
    dates.ts
    csv.ts
  domain/
    types.ts
    selection-engine.ts
    scoring.ts
    validation.ts
  data/
    seed/
      pipQuestions.ts
      tiuQuestions.ts
      trainingPlans.ts
  test/
```

Domain calculator harus berupa pure functions agar dapat diuji tanpa UI/Supabase. Service/repository mengubah row database menjadi domain type dan menjadi satu-satunya jalur akses data komponen.

## 6. Model data

Gunakan UUID, `created_at`, `updated_at`, serta `created_by`/`updated_by` pada entitas audit-relevant. Semua tabel periode-scoped memiliki `selection_cycle_id`.

### 6.1 Identitas, periode, dan akses

- `profiles`: referensi `auth.users`, nama, email, status aktif.
- `user_roles`: satu pengguna dapat memiliki satu atau beberapa role staf; kandidat ditautkan lewat kandidatnya.
- `invitations`: email, role, token/status, pengundang, kedaluwarsa.
- `selection_cycles`: nama periode, tahun penugasan, tanggal acuan 17 Agustus, status `draft|active|closed|archived`, standard version aktif.
- `candidates`: nomor peserta internal, user opsional, biodata minimum, tanggal lahir, jenis kelamin, sekolah, kelas, kontak, status keseluruhan, periode.
- NIK tidak disimpan sebagai teks biasa untuk kebutuhan pencarian. Simpan nilai terenkripsi/terlindungi sesuai hasil security review dan hash terpisah untuk validasi unik bila benar-benar diperlukan.
- `candidate_assignments`: penugasan juri/petugas ke kandidat atau sesi.

### 6.2 Standar seleksi

- `standard_versions`: nama, sumber/referensi, status `draft_unverified|verified|retired`, effective dates, approver, approved timestamp.
- `standard_rules`: key aturan, kategori, nilai JSON tervalidasi, unit, catatan, status verifikasi.
- `fitness_score_tables`: jenis tes, jenis kelamin bila dibedakan, batas/anchor, skor, urutan.
- Periode menunjuk satu versi yang tidak boleh berubah setelah periode aktif. Koreksi membuat versi baru dan migrasi eksplisit, bukan mengubah hasil historis diam-diam.

### 6.3 Tahap dan eliminasi

- `candidate_stage_statuses`: tahap 1–8, status `locked|not_started|in_progress|pending_review|passed|failed|finalized`, finalizer, timestamp, alasan.
- `elimination_events`: tahap, rule key, alasan manusiawi, nilai pemicu, standard version, actor, timestamp; append-only.
- `status_history`: transisi status kandidat/tahap yang append-only.
- Tahap berikutnya dibuka hanya oleh state machine server setelah prasyarat final `passed`.

### 6.4 Administrasi

- `administration_reviews`: hasil kalkulasi usia, status enam berkas, catatan reviewer, status final.
- `candidate_documents`: jenis berkas, storage path privat, mime, ukuran, checksum, versi, status review, uploader, reviewer. Jangan menyimpan signed URL.
- `social_accounts`: platform, handle/URL, status visibilitas yang dicatat manual.

### 6.5 CAT PIP dan TIU

- `question_categories`: exam type, domain/submateri, target proporsi.
- `questions`: tipe PIP/TIU, stem, opsi A–E, jawaban benar, pembahasan, rumus cepat, tingkat kesulitan, status `draft|reviewed|active|retired`, version.
- Untuk materi figural, simpan asset privat/terkontrol dan alt text.
- `exam_blueprints`: 50 soal, durasi, passing grade, komposisi kategori, scoring 2/0, status publikasi.
- `exam_sessions`: kandidat, tipe, blueprint/version snapshot, started/expires/submitted timestamps, status, skor.
- `exam_session_questions`: urutan dan snapshot soal/opsi untuk menjaga histori.
- `exam_answers`: jawaban, marked-for-review, waktu simpan.
- Timer memakai `expires_at` dari server. Autosave jawaban; submit otomatis saat kedaluwarsa; pembahasan hanya terlihat setelah submit dan sesuai kebijakan publikasi.

### 6.6 Rikkes dan antropometri

- `medical_examinations`: vital sign, visus, buta warna, gigi, THT, paru, flag kondisi kritis, catatan terbatas, examiner, final status.
- `anamnesis_items`: 21 pertanyaan berversi dan penanda critical.
- `anamnesis_responses`: jawaban boolean per item; `total_yes` dihitung server.
- `anthropometry_examinations`: tinggi, berat, BMI turunan, celah kaki, flat foot, simetri/skoliosis, status review/final.
- Pisahkan akses tabel medis dari tabel kandidat umum; coach/judge tidak boleh membaca detail diagnosis/anamnesis.

### 6.7 Penilaian Fase 2

- `pbb_assessments`: subskor statis, dinamis, vokal, catatan, juri, status draft/final.
- `fitness_assessments`: input mentah lari, push-up, sit-up, back-up, shuttle run; skor per tes dihitung dari standard version.
- `personality_assessments`: skor STAR/ideologi, integritas, toleransi, kematangan emosional, tekanan, bakat, audit sosial, catatan juri.
- `digital_audits`: platform, visibility, kategori temuan, status, reviewer, waktu; tidak menyimpan salinan konten lebih dari yang disahkan kebijakan.
- `final_scores`: snapshot PBB, Samapta, Kepribadian, bobot 30/30/40, nilai akhir, rank, band kuota, waktu kalkulasi.
- Dukungan beberapa juri: simpan setiap lembar penilaian terpisah, lalu agregasi rata-rata hanya setelah seluruh assignment final. Admin dapat membuka ulang dengan alasan yang masuk audit log.

### 6.8 Latihan, ekspor, dan audit

- `training_templates`, `training_schedule_items`, `candidate_training_completions`.
- `export_jobs`: tipe, filter, requester, status, expiry; file hasil sementara harus ikut kebijakan retensi.
- `audit_logs`: actor, action, entity type/id, metadata aman, timestamp, IP/user agent bila disahkan kebijakan. Jangan log isi medis, token, NIK, atau URL berkas.

## 7. Mesin aturan dan keputusan ambigu

### 7.1 State machine hard-lock

Urutan wajib:

1. Administrasi/usia
2. CAT PIP
3. CAT TIU
4. Rikkes
5. Parade/antropometri
6–8. PBB, Samapta, Kepribadian (dapat berjalan paralel setelah Tahap 5 lolos)
9. Ranking final

Jika Tahap 1–5 difinalisasi `failed`, buat `elimination_event`, kunci tahap sesudahnya, dan jangan masukkan kandidat ke ranking. Perubahan hasil final hanya melalui aksi `reopen` admin dengan alasan dan jejak audit.

### 7.2 Aturan yang dapat langsung dimodelkan

- PIP/TIU: 50 soal, benar 2, salah/kosong 0, lolos jika skor `>= 70`.
- Anamnesis: gagal jika `total_yes > 5`; critical flag menyebabkan gagal langsung.
- BMI: `weightKg / (heightM²)` dengan kategori PRD.
- Celah kaki: gagal pada `>= 5 cm`.
- Flat foot dan kelainan rangka yang ditetapkan: gagal sesuai hasil pemeriksa.
- Nilai akhir: `0.30 * PBB + 0.30 * Samapta + 0.40 * Kepribadian`, pembulatan hanya saat presentasi; ranking memakai presisi penuh.
- Kuota default: rank 1–2 provinsi/nasional, 3–30 inti kabupaten/kota, 31–40 cadangan; semuanya konfigurabel per periode.

### 7.3 Aturan yang wajib berstatus belum terverifikasi

- **Usia:** rentang lahir PRD memasukkan 17 Agustus 2008 untuk penugasan 2026, tetapi peserta tersebut tepat berusia 18 pada tanggal acuan dan bertentangan dengan aturan “usia ≥18 ditolak”. Implementasikan kalkulasi umur presisi, tampilkan konflik, dan jangan aktifkan rule final sampai cutoff disahkan.
- **Samapta:** PRD hanya memberi beberapa anchor, bukan tabel skor lengkap atau aturan interpolasi, serta tidak selalu membedakan putra/putri. UI admin harus menerima tabel resmi lengkap; ranking produksi diblokir jika tabel belum berstatus verified.
- **Tekanan darah:** frasa “di atas 140/90” perlu penetapan apakah salah satu komponen `>` batas sudah gagal dan bagaimana nilai tepat 140/90 diperlakukan.
- **Nadi, visus, gigi, THT:** PRD mencampur rentang normal, toleransi, dan syarat gugur. Nilai di luar rentang normal tetapi belum dinyatakan gugur masuk `pending_review`, bukan dieliminasi otomatis.
- **Tinggi badan:** PRD memberi rentang atas tetapi hanya menjelaskan kegagalan batas bawah. Batas atas harus dikonfirmasi sebagai hard fail atau review.
- **BMI kuning:** kurus/overweight tidak dinyatakan eksplisit sebagai gugur; jadikan `pending_review`, sedangkan BMI `>=30` gagal, sampai rule disahkan.
- **Agregasi Samapta:** “rata-rata tertimbang” belum menyebut bobot lima tes. Konfigurasi bobot harus berjumlah 100%.
- **Tie-break ranking:** belum ditentukan. Default yang direncanakan: Kepribadian tertinggi, lalu PBB, Samapta, kemudian nomor peserta; admin harus menyetujui sebelum periode aktif.

Setiap status/ranking menampilkan versi standar dan label “Belum terverifikasi” bila masih draft.

## 8. Route dan pengalaman pengguna

### 8.1 Route umum dan autentikasi

- `/login`, `/accept-invite`, `/forgot-password`.
- Route guard berdasarkan sesi, role, periode aktif, dan assignment.
- Halaman `403`, `404`, session expired, dan empty/error state.

### 8.2 Dashboard staf

- `/staff/dashboard`: ringkasan funnel Tahap 1–8, kandidat tereliminasi, pekerjaan menunggu review, kesiapan bank soal, dan kelengkapan standar.
- `/staff/candidates`: tabel filter/search, impor CSV tervalidasi, detail kandidat, timeline tahap, dokumen, serta riwayat status.
- `/staff/candidates/:id/stages/:stage`: formulir tahap yang sesuai role.
- `/staff/exams`: bank soal, kategori, review/publikasi, blueprint, sesi dan hasil.
- `/staff/ranking`: leaderboard terurut, formula transparan, band kuota, filter periode/gender bila dibutuhkan, publikasi hasil.
- `/staff/training`: template dan kalender latihan.
- `/staff/standards`: versi aturan, sumber, status verifikasi, tabel Samapta, validation preview.
- `/staff/users`: undangan, role, aktivasi/nonaktivasi.
- `/staff/audit`: audit log terfilter untuk admin.

### 8.3 Portal kandidat

- `/candidate/home`: progres kronologis, tahap aktif, deadline, hasil yang sudah dipublikasikan.
- `/candidate/profile`: data diri, akun sosial, persetujuan, dan berkas.
- `/candidate/exams/:type`: instruksi, pemeriksaan kesiapan, ujian satu soal per layar, navigator 1–50, flag, autosave, timer, submit, hasil/pembahasan.
- `/candidate/training`: jadwal mingguan dan checklist penyelesaian.
- Kandidat tidak melihat catatan medis internal, catatan juri privat, jawaban benar sebelum submit, kandidat lain, atau leaderboard sebelum dipublikasikan.

## 9. Arah visual dan aksesibilitas

- Bahasa antarmuka utama: Bahasa Indonesia.
- Gaya institusional modern, tidak meniru portal pemerintah secara literal: dasar putih/abu hangat, navy untuk struktur, merah sebagai aksen identitas dan status gagal, hijau untuk lolos, amber untuk review.
- Sidebar desktop yang ringkas dan bottom/top navigation yang adaptif di mobile.
- Dashboard staf dioptimalkan untuk desktop/tablet; portal kandidat dan CAT responsif hingga mobile, tetapi ujian menampilkan peringatan bila viewport terlalu sempit.
- Progress stepper Tahap 1–8 menjadi elemen orientasi utama.
- Status tidak bergantung pada warna saja; selalu sertakan ikon dan label teks.
- Gunakan semantic HTML, focus states, keyboard navigation, label form, error summary, kontras WCAG AA, dan `prefers-reduced-motion`.
- Data padat memakai tabel desktop dan card/list pada mobile; tidak memaksa horizontal scroll untuk aksi primer.

## 10. Detail implementasi per modul

### 10.1 Fondasi

- Hubungkan Supabase melalui Make sebelum kode backend dibuat.
- Tambahkan dependency, router, layout, auth provider, session restore, guards, permission map, error boundary, toast, modal konfirmasi, dan komponen form/table/status dasar.
- Buat migration/schema, RLS, seed data sintetis, dan akun uji per role.

### 10.2 Kandidat dan administrasi

- CRUD kandidat, impor CSV dengan preview dan laporan baris gagal.
- Kalkulator usia memakai tanggal acuan periode, bukan waktu browser.
- Enam slot dokumen dengan validasi tipe/ukuran, versioning, review, rejection reason, dan signed download.
- Checklist persyaratan dan finalisasi tahap bersifat transactional.

### 10.3 Engine CAT

- Authoring/review bank soal dan kategori.
- Seed awal representatif: minimal 25 PIP yang tersebar merata pada lima domain PRD dan minimal 22 TIU (dua per 11 submateri), semuanya berlabel materi review, bukan “bank resmi”.
- Blueprint validator menghitung ketersediaan per kategori. Sesi resmi 50 soal tidak dapat dipublikasikan jika kategori kekurangan soal; mode demo boleh memakai seluruh soal aktif tetapi hasilnya tidak dapat memfinalisasi tahap.
- Randomisasi soal dan opsi terjadi saat session snapshot dibuat.
- Autosave idempotent, resume aman, server expiry, submit otomatis, skor dan pembahasan setelah selesai.

### 10.4 Rikkes dan antropometri

- Form vital sign dengan unit dan batas input realistis.
- Daftar 21 anamnesis berasal dari data berversi; karena teks 21 item belum diberikan PRD, seed tidak boleh diklaim resmi dan tahap tidak bisa difinalisasi sampai daftar verified tersedia.
- Critical condition menghasilkan konfirmasi keras dan eliminasi yang diaudit.
- BMI dan lap 400 m + sisa meter dihitung langsung untuk umpan balik, lalu dihitung ulang server saat finalisasi.

### 10.5 Penilaian juri

- Form rubric PBB tiga subkomponen.
- Samapta menerima input mentah; lookup/interpolasi hanya mengikuti tabel versioned verified.
- Kepribadian menyertakan rubric STAR, audit sosial manual, psikologi, dan bakat; pisahkan skor dari catatan.
- Draft per juri dapat autosave; final tidak dapat diedit tanpa reopen admin.
- Agregasi dan completion indicator menunjukkan juri yang belum final tanpa membuka nilai juri lain sebelum kebijakan mengizinkan.

### 10.6 Ranking dan publikasi

- Hanya kandidat Fase 1 `passed` dan ketiga skor Fase 2 lengkap yang diranking.
- Kalkulasi server menghasilkan snapshot final dan urutan deterministik.
- Tampilkan kontribusi 30/30/40, alasan tidak eligible, band kuota, standard version, dan timestamp.
- Publikasi hasil merupakan aksi terpisah dari kalkulasi agar staf dapat review.

### 10.7 Latihan dan panduan

- Template Senin–Minggu dari PRD: interval, calisthenics, PBB 96 BPM, simulasi 12 menit, tryout CAT, simulasi terpadu, recovery.
- Matriks Do/Don't per tahap sebagai konten admin-manageable.
- Kandidat dapat menandai penyelesaian dan memberi catatan singkat; data latihan tidak memengaruhi nilai seleksi kecuali kelak ditentukan eksplisit.

### 10.8 Ekspor

- PDF per kandidat: identitas minimum, timeline status, hasil tahap yang boleh dibagikan, skor final, versi standar, QR/ID verifikasi opsional tanpa PII mentah.
- CSV: kandidat, status tahap, eliminasi, dan leaderboard; ekspor menghormati filter dan role.
- Print view: formulir juri kosong/terisi dan hasil seleksi dengan CSS khusus cetak.
- Ekspor massal hanya admin, dicatat dalam audit log, memiliki expiry, dan tidak membocorkan signed storage URL.

## 11. RLS dan matriks akses minimum

- Semua query mensyaratkan authenticated user dan profile aktif.
- `admin`: CRUD hampir semua data dalam organisasi; data medis tetap dicatat aksesnya.
- `coach`: baca kandidat dasar dan status; write administrasi/latihan; tidak baca detail anamnesis atau diagnosis.
- `medical`: baca identitas minimum kandidat periode aktif; CRUD pemeriksaan medis/antropometri; tidak mengelola nilai CAT atau ranking.
- `judge`: baca identitas minimum kandidat yang ditugaskan; CRUD draft penilaian sendiri; tidak dapat mengubah final atau melihat penilaian juri lain.
- `candidate`: hanya row kandidat yang tertaut ke `auth.uid()`, dokumen sendiri, session/answer sendiri, hasil published sendiri.
- Storage policy memetakan path ke candidate/period dan memeriksa role/ownership. Semua unduhan melalui signed URL singkat yang dibuat setelah authorization check.
- Service-role key hanya berada di server/Edge Function dan tidak pernah masuk bundle frontend.

## 12. Penanganan kegagalan dan edge case

- Koneksi putus saat CAT: jawaban tetap di state lokal sementara, retry dengan idempotency key, tampilkan status sinkronisasi; waktu tetap berdasarkan expiry server.
- Refresh/multi-tab: session yang sama dapat dilanjutkan; cegah dua submit; tampilkan warning multi-tab.
- Ujian kedaluwarsa saat offline: jawaban yang tersimpan sampai deadline diproses sesuai timestamp server; setelah reconnect session disubmit/ditutup.
- Dokumen gagal unggah: jangan membuat status “lengkap”; hapus object yatim melalui cleanup job.
- Perubahan standar di tengah periode: dilarang; buat versi baru. Snapshot historis mempertahankan hasil lama.
- Kandidat berpindah periode: buat enrollment/record periode baru; jangan memindahkan histori.
- Nilai sama: gunakan tie-break yang tersimpan di standard version.
- Juri belum lengkap: ranking menandai kandidat `incomplete`, tidak menganggap nilai kosong sebagai nol.
- Reopen/finalisasi ulang: wajib alasan, actor, timestamp, dan kalkulasi ranking ulang.
- Data medis invalid/outlier: validasi range teknis dan `pending_review`; jangan otomatis menggugurkan kecuali rule hard-fail verified.

## 13. Tahapan delivery

### Milestone 0 — Prasyarat dan governance

- Hubungkan proyek Supabase.
- Tetapkan pemilik data, approver standar, kebijakan privasi/retensi, daftar 21 anamnesis resmi, tabel Samapta lengkap, aturan usia, dan sumber regulasi.
- Hasil: register aturan verified/unverified dan keputusan go-live.

### Milestone 1 — Fondasi full-stack

- Auth undangan, profile, RBAC, periode, layout responsif, RLS, audit dasar, seed sintetis.
- Hasil: setiap role masuk ke shell yang benar dan akses silang ditolak.

### Milestone 2 — Kandidat, administrasi, dan storage

- Kandidat, impor, usia, enam dokumen privat, akun sosial, review, hard-lock Tahap 1.
- Hasil: kandidat dapat diproses sampai status administrasi final dengan audit lengkap.

### Milestone 3 — CAT PIP/TIU

- Bank/blueprint, seed representatif, session snapshot, timer, autosave, submit, scoring, pembahasan, hard-lock Tahap 2–3.
- Hasil: mode demo lengkap; mode resmi hanya aktif bila bank memenuhi blueprint.

### Milestone 4 — Rikkes dan parade

- Vital sign, 21 anamnesis versioned, critical rule, antropometri, BMI, kaki/rangka, hard-lock Tahap 4–5.
- Hasil: hanya kandidat lolos Fase 1 dapat dibuka ke penilaian berikutnya.

### Milestone 5 — Penjurian dan ranking

- Rubric PBB, lookup Samapta, personality/STAR, audit sosial, multi-juri, formula 30/30/40, tie-break, kuota, publikasi.
- Hasil: leaderboard dapat direproduksi dari input dan standard version.

### Milestone 6 — Latihan, panduan, ekspor

- Jadwal mingguan, Do/Don't, PDF, CSV, print.
- Hasil: kebutuhan pendukung dan pelaporan tercakup.

### Milestone 7 — Hardening dan release

- Uji RLS, akses storage, performa, accessibility, recovery, retensi, backup, security/legal review, dan training pengguna.
- Hasil: hanya setelah seluruh gate lulus, lingkungan dapat menerima data asli.

## 14. Strategi verifikasi

### 14.1 Unit test domain

- Umur tepat di kedua batas, leap year, dan tanggal konflik.
- PIP/TIU: 34 benar = 68 gagal; 35 benar = 70 lolos; kosong = 0.
- Anamnesis: 5 “ya” tidak memicu rule `>5`; 6 memicu; satu critical memicu segera.
- BMI pada 18.5, 24.9/25.0, 29.9/30.0.
- Tinggi/celah kaki pada setiap boundary setelah rule disahkan.
- Lookup/interpolasi Samapta pada semua anchor, arah shuttle run terbalik, dan bobot total 100%.
- Nilai akhir 30/30/40, presisi, tie-break, dan band rank 2/3/30/31/40/41.
- Transisi state machine valid/invalid dan efek reopen.

### 14.2 Integration/backend

- RLS matrix dengan akun admin, coach, medical, judge, kandidat A, kandidat B.
- Kandidat A tidak dapat membaca/menulis kandidat B.
- Coach/judge tidak dapat membaca detail medis.
- Judge tidak dapat menilai kandidat tanpa assignment atau mengubah final.
- Signed URL kedaluwarsa dan bucket tidak public.
- Double submit/finalize idempotent.
- Standard version lama tetap mereproduksi hasil historis.

### 14.3 UI dan alur

- Login/accept invite/expired invite.
- Import kandidat valid dan invalid.
- Upload, reject, revise, dan approve dokumen.
- CAT start–autosave–resume–timeout–submit–review.
- Eliminasi pada setiap Tahap 1–5 dan penguncian tahap berikutnya.
- Multi-juri hingga ranking dan publikasi.
- PDF/CSV/print berisi data yang benar dan tidak melebihi hak akses.
- Keyboard-only, focus order, screen-reader labels, contrast, responsive desktop/mobile, reduced motion.

### 14.4 Perintah repository

- Jalankan formatter melalui script repository: `pnpm format`.
- Jalankan unit test melalui script Vitest yang ditambahkan.
- Jalankan `pnpm build` untuk perubahan lintas aplikasi/full-stack frontend.
- Jangan menjalankan `pnpm dev`; gunakan server Figma Make yang sudah aktif.
- Investigasi `figma logs` hanya jika ada kegagalan runtime konkret.

## 15. Kriteria penerimaan akhir

- Semua role hanya melihat dan mengubah data sesuai matriks akses.
- Tahap 1–5 mengikuti state machine hard-lock dan menyimpan alasan eliminasi.
- Tahap 6–8 tidak dapat berkontribusi pada ranking sebelum Fase 1 lolos.
- Formula final 30/30/40 dan ranking dapat direproduksi dari snapshot input serta standard version.
- Aturan yang belum sah terlihat jelas dan tidak dapat dipakai untuk finalisasi produksi.
- CAT tahan refresh/koneksi sementara, menegakkan waktu server, dan tidak membocorkan jawaban.
- Berkas kandidat selalu privat dan semua akses sensitif tercatat.
- PDF, CSV, dan print bekerja sesuai role.
- UI responsif, aksesibel, dan seluruh empty/loading/error state tertangani.
- Build, unit test domain, integration/RLS checks, dan alur kritis lulus.
- Data asli hanya digunakan setelah gate keamanan/legal/governance disetujui.

## 16. Dependensi eksternal dan input yang harus tersedia saat implementasi

- Koneksi proyek Supabase melalui Figma Make sebelum Milestone 1.
- Daftar resmi 21 pertanyaan anamnesis beserta critical flags.
- Tabel skor Samapta lengkap, termasuk perbedaan gender/usia bila ada.
- Keputusan final cutoff umur, batas atas tinggi, tekanan darah, BMI kuning, bobot tes Samapta, dan tie-break.
- Referensi/salinan regulasi yang menjadi dasar setiap standard version.
- Nama organisasi, logo/aset merek yang sah, privacy notice, retention schedule, dan kontak petugas data.
- Template/format enam dokumen administrasi untuk validasi manual.
- Daftar approver standar dan staf awal yang akan diundang.

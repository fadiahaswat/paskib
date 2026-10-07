export interface Participant {
  id: string;
  registration_number: string;
  name: string;
  nickname: string;
  gender: 'L' | 'P';
  school: string;
  class: string;
  birth_date: string;
  phone: string;
  height: number;
  weight: number;
  status: 'DEVELOPING' | 'PROGRESSING' | 'NEAR READY' | 'READY' | 'RECOMMENDED' | 'PEMBINAAN KHUSUS';
  photo: string;
  visus: string;
  leg_shape: string;
  notes: string;
  updated_at?: string;

  // Akun Sosmed untuk Audit Jejak Digital BPIP
  instagram?: string;
  facebook?: string;
  twitter?: string;

  // Screening Kesehatan & Odontogram BPIP
  riwayat_penyakit_ya: number; // Maksimal 5 agar tidak terkunci otomatis
  caries_dentis: number; // Standar BPIP <= 3
  tumpatan_gigi: number; // Standar BPIP <= 5
  impaksi_gigi: number; // Standar BPIP <= 2
  kehilangan_gigi_depan: boolean; // Mutlak FALSE (Tidak ada)

  // Metrik Samapta Riil (Format BPIP)
  push_up_count: number;
  sit_up_count: number;
  back_up_count: number;
  shuttle_run_time: number; // detik
  lari_12m_distance: number; // meter
  lari_12m_laps: number;
  lari_12m_remaining: number;

  // Nilai 3 Pilar Kelulusan Akhir BPIP (PBB 30%, Samapta 30%, Wawancara 40%)
  score_pbb: number;
  score_samapta: number;
  score_wawancara: number;
  final_bpip_score: number; // (PBB*0.3 + Samapta*0.3 + Wawancara*0.4)

  // Computed metrics internal
  attendance_pct: number;
  latest_score: number;
  readiness_score: number;
  trend: 'UP' | 'STABLE' | 'DOWN';
  score_change: number;
  alerts: string[];
}

export interface TrainingSession {
  id: string;
  date: string;
  title: string;
  category: 'PBB' | 'Kesamaptaan' | 'Postur' | 'Tata Upacara' | 'Kedisiplinan' | 'Mental' | 'Wawasan' | 'Simulasi';
  location: string;
  start_time: string;
  end_time: string;
  target: string;
  description: string;
  coach_notes: string;
}

export interface AttendanceRecord {
  id: string;
  training_id: string;
  participant_id: string;
  status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa' | 'Terlambat';
  check_in: string;
  notes: string;
}

export interface Assessment {
  id: string;
  name: string;
  date: string;
  type: 'Tes Awal' | 'Tes Berkala' | 'Try Out' | 'Simulasi Seleksi' | 'Tes Akhir';
  description: string;
}

export interface AssessmentScore {
  id: string;
  assessment_id: string;
  participant_id: string;
  category: 'PBB' | 'Kesamaptaan' | 'Postur & Penampilan' | 'Disiplin' | 'Mental & Kepribadian' | 'Wawasan';
  indicator: string;
  raw_metric?: string; // e.g. "2850m (7 lap + 50m)", "42x", "15.4s"
  score: number; // 0 - 100
  strength?: string;
  weakness?: string;
  recommendation?: string;
}

export interface CoachNote {
  id: string;
  date: string;
  participant_id: string;
  category: string;
  note: string;
  priority: 'TINGGI' | 'SEDANG' | 'RENDAH';
}

// Data Peserta Terintegrasi Berdasarkan Data Riil Excel & Standar BPIP
export const INITIAL_PARTICIPANTS: Participant[] = [
  {
    id: "PAS-001",
    registration_number: "2026/012",
    name: "MUHAMMAD NUR RAFI WICAKSONO",
    nickname: "Rafi",
    gender: "L",
    school: "Madrasah Mu'allimin",
    class: "4E",
    birth_date: "2009-12-18",
    phone: "081234567001",
    height: 175,
    weight: 60.1,
    status: "RECOMMENDED",
    photo: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80",
    visus: "6/6 (Normal)",
    leg_shape: "X (2.5cm - Aman <5cm)",
    notes: "Postur sangat ideal, fisik samapta peringkat 1 sekolah (pull-up 13x, push-up 34x).",
    instagram: "@rafi.wicaksono",
    facebook: "Rafi Wicaksono",
    twitter: "@rafiwicak",
    riwayat_penyakit_ya: 1,
    caries_dentis: 0,
    tumpatan_gigi: 1,
    impaksi_gigi: 0,
    kehilangan_gigi_depan: false,
    push_up_count: 43,
    sit_up_count: 42,
    back_up_count: 52,
    shuttle_run_time: 15.4,
    lari_12m_distance: 3100,
    lari_12m_laps: 7,
    lari_12m_remaining: 300,
    score_pbb: 90,
    score_samapta: 96,
    score_wawancara: 92,
    final_bpip_score: 92.6, // (90*0.3 + 96*0.3 + 92*0.4)
    attendance_pct: 95,
    latest_score: 92.6,
    readiness_score: 95,
    trend: "UP",
    score_change: 8.5,
    alerts: []
  },
  {
    id: "PAS-002",
    registration_number: "2026/009",
    name: "RAFKA AKHDANA",
    nickname: "Rafka",
    gender: "L",
    school: "Madrasah Mu'allimin",
    class: "4D",
    birth_date: "2009-06-13",
    phone: "081234567002",
    height: 174.5,
    weight: 60.0,
    status: "READY",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
    visus: "6/6 (Normal)",
    leg_shape: "O (2.5cm - Aman <5cm)",
    notes: "PBB solid predikat A-, vokal komandan mantap, perlu pertahankan ritme pernapasan.",
    instagram: "@rafka.akhdana",
    facebook: "Rafka Akhdana",
    twitter: "@rafka_akh",
    riwayat_penyakit_ya: 0,
    caries_dentis: 1,
    tumpatan_gigi: 0,
    impaksi_gigi: 1,
    kehilangan_gigi_depan: false,
    push_up_count: 38,
    sit_up_count: 39,
    back_up_count: 45,
    shuttle_run_time: 16.2,
    lari_12m_distance: 2850,
    lari_12m_laps: 7,
    lari_12m_remaining: 50,
    score_pbb: 88,
    score_samapta: 85,
    score_wawancara: 89,
    final_bpip_score: 87.5, // (88*0.3 + 85*0.3 + 89*0.4)
    attendance_pct: 92,
    latest_score: 87.5,
    readiness_score: 88,
    trend: "UP",
    score_change: 5.0,
    alerts: []
  },
  {
    id: "PAS-003",
    registration_number: "2026/003",
    name: "ATHALLA ARYAPUTRA WIDODO",
    nickname: "Athalla",
    gender: "L",
    school: "Madrasah Mu'allimin",
    class: "4C",
    birth_date: "2008-09-05",
    phone: "081234567003",
    height: 173,
    weight: 76.8,
    status: "NEAR READY",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
    visus: "6/6 (Normal)",
    leg_shape: "Normal",
    notes: "BBI ideal 65.7 kg. Berat aktual 76.8 kg (+11 kg di atas ideal). Butuh program cutting 6 kg untuk masuk toleransi ±5kg BPIP.",
    instagram: "@athalla.aryaputra",
    facebook: "Athalla Aryaputra",
    twitter: "@athallawidodo",
    riwayat_penyakit_ya: 2,
    caries_dentis: 2,
    tumpatan_gigi: 2,
    impaksi_gigi: 0,
    kehilangan_gigi_depan: false,
    push_up_count: 35,
    sit_up_count: 36,
    back_up_count: 42,
    shuttle_run_time: 17.1,
    lari_12m_distance: 2600,
    lari_12m_laps: 6,
    lari_12m_remaining: 200,
    score_pbb: 84,
    score_samapta: 79,
    score_wawancara: 85,
    final_bpip_score: 82.9,
    attendance_pct: 88,
    latest_score: 82.9,
    readiness_score: 81,
    trend: "UP",
    score_change: 3.2,
    alerts: ["Berat badan melebihi batas toleransi BPIP (+6.1 kg di atas batas aman 70.7 kg)"]
  },
  {
    id: "PAS-004",
    registration_number: "2026/006",
    name: "RAIS WIDAYA JATI",
    nickname: "Rais",
    gender: "L",
    school: "Madrasah Mu'allimin",
    class: "4E",
    birth_date: "2009-05-04",
    phone: "081234567004",
    height: 172,
    weight: 54.8,
    status: "READY",
    photo: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80",
    visus: "6/6 (Normal)",
    leg_shape: "O (3cm - Aman <5cm)",
    notes: "Fisik stabil, push up 30x dan sit up 29x. PBB sangat luwes dan disiplin.",
    instagram: "@rais_widaya",
    facebook: "Rais Widaya Jati",
    twitter: "@raiswj",
    riwayat_penyakit_ya: 1,
    caries_dentis: 0,
    tumpatan_gigi: 1,
    impaksi_gigi: 0,
    kehilangan_gigi_depan: false,
    push_up_count: 40,
    sit_up_count: 41,
    back_up_count: 48,
    shuttle_run_time: 15.9,
    lari_12m_distance: 2900,
    lari_12m_laps: 7,
    lari_12m_remaining: 100,
    score_pbb: 89,
    score_samapta: 88,
    score_wawancara: 87,
    final_bpip_score: 87.9,
    attendance_pct: 94,
    latest_score: 87.9,
    readiness_score: 87,
    trend: "UP",
    score_change: 4.0,
    alerts: []
  },
  {
    id: "PAS-005",
    registration_number: "2026/004",
    name: "ZOLLA VAJJERO AMNESTYA",
    nickname: "Zolla",
    gender: "L",
    school: "Madrasah Mu'allimin",
    class: "4G",
    birth_date: "2009-02-05",
    phone: "081234567005",
    height: 169.7,
    weight: 51.4,
    status: "PROGRESSING",
    photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80",
    visus: "6/6 (Normal)",
    leg_shape: "O (2cm - Aman)",
    notes: "Tinggi badan 169.7 cm (butuh +0.3 cm stretching decompressing agar tembus batas mutlak 170.0 cm).",
    instagram: "@zolla_vajjero",
    facebook: "Zolla Vajjero",
    twitter: "@zollav",
    riwayat_penyakit_ya: 1,
    caries_dentis: 1,
    tumpatan_gigi: 0,
    impaksi_gigi: 0,
    kehilangan_gigi_depan: false,
    push_up_count: 36,
    sit_up_count: 37,
    back_up_count: 40,
    shuttle_run_time: 16.5,
    lari_12m_distance: 2500,
    lari_12m_laps: 6,
    lari_12m_remaining: 100,
    score_pbb: 82,
    score_samapta: 78,
    score_wawancara: 80,
    final_bpip_score: 80.0,
    attendance_pct: 85,
    latest_score: 80.0,
    readiness_score: 78,
    trend: "DOWN",
    score_change: -4.2,
    alerts: ["Tinggi badan 169.7 cm (kurang 0.3 cm dari batas mutlak BPIP 170.0 cm)"]
  },
  {
    id: "PAS-006",
    registration_number: "2026/007",
    name: "RIDWAN LATIEF ABIMANYU",
    nickname: "Ridwan",
    gender: "L",
    school: "Madrasah Mu'allimin",
    class: "4F",
    birth_date: "2008-04-26",
    phone: "081234567006",
    height: 168.5,
    weight: 49.4,
    status: "PEMBINAAN KHUSUS",
    photo: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=300&q=80",
    visus: ">50 Silinder (Kacamata Tebal)",
    leg_shape: "Kaki X >5cm (Beresiko Gugur Parade)",
    notes: "Visus silinder tinggi, celah kaki X >5cm melewati batas toleransi BPIP. Kehadiran rendah 76%.",
    instagram: "@ridwan.latief",
    facebook: "Ridwan Latief",
    twitter: "@ridwan_la",
    riwayat_penyakit_ya: 6, // Melebihi batas 5!
    caries_dentis: 4, // Melebihi standar <= 3!
    tumpatan_gigi: 3,
    impaksi_gigi: 1,
    kehilangan_gigi_depan: false,
    push_up_count: 24,
    sit_up_count: 27,
    back_up_count: 30,
    shuttle_run_time: 18.8,
    lari_12m_distance: 2100,
    lari_12m_laps: 5,
    lari_12m_remaining: 100,
    score_pbb: 65,
    score_samapta: 60,
    score_wawancara: 68,
    final_bpip_score: 64.7,
    attendance_pct: 76,
    latest_score: 64.7,
    readiness_score: 61,
    trend: "DOWN",
    score_change: -6.0,
    alerts: [
      "Riwayat penyakit > 5 item (Otomatis terkunci di portal BPIP)",
      "Caries dentis 4 gigi (Melebihi batas BPIP <= 3 gigi)",
      "Tinggi badan 168.5 cm (Kurang 1.5 cm dari batas minimal 170 cm)",
      "Celah kaki X > 5 cm (Batas maksimal BPIP 5 cm)",
      "Kehadiran < 80% (76%)"
    ]
  }
];

export const INITIAL_TRAINING_SESSIONS: TrainingSession[] = [
  {
    id: "TRN-001",
    date: "2026-10-07",
    title: "Drill PBB Dasar & Perubahan Arah",
    category: "PBB",
    location: "Lapangan Utama Mu'allimin",
    start_time: "15:30",
    end_time: "17:45",
    target: "Sikap sempurna, penghormatan, balik kanan henti & langkah tegap tempo 96 bpm",
    description: "Fokus koreksi tangan saat langkah tegap dan kekompakan banjar.",
    coach_notes: "Sebagian banjar kanan masih mendahului aba-aba pelaksanaan."
  },
  {
    id: "TRN-002",
    date: "2026-10-08",
    title: "Kesamaptaan Pagi: Lari Interval & Shuttle Run",
    category: "Kesamaptaan",
    location: "Stadion Mandala Krida",
    start_time: "06:00",
    end_time: "08:00",
    target: "Lari interval 4x400m target 1:40/lap, Shuttle Run < 16 detik",
    description: "Simulasi manuver tikungan dan titik tumpu gravitasi.",
    coach_notes: "Gunakan sepatu sol karet cengkeram kuat agar tidak selip."
  },
  {
    id: "TRN-003",
    date: "2026-10-10",
    title: "Simulasi Seleksi POS 1 & POS 2 LBB Kota",
    category: "Simulasi",
    location: "Halaman Balaikota Yogyakarta",
    start_time: "07:30",
    end_time: "11:30",
    target: "Penguasaan 15 materi gerakan POS 1 dan 14 materi POS 2 sesuai juklak LBB",
    description: "Penilaian ketat peleton (70% teknik, 30% kompak) dan komandan.",
    coach_notes: "Perhatikan batas waktu 8 menit POS 1 dan 7 menit POS 2."
  }
];

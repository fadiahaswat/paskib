import type {
  AuditLogEntry,
  Candidate,
  CatQuestion,
  SelectionCycle,
  SelectionSchedule,
  StandardRuleItem,
  SupportingDoc,
  UserProfile,
} from "../domain/selection"

export const initialCycles: SelectionCycle[] = [
  {
    id: "cycle-2026-kab",
    name: "Seleksi 2026",
    year: 2026,
    level: "Kabupaten/Kota",
    referenceDate: "2026-08-17",
    status: "active",
  },
]

export const candidates: Candidate[] = []

export const initialSchedules: SelectionSchedule[] = []

export const initialQuestions: CatQuestion[] = []

export const initialSupportingDocs: SupportingDoc[] = []

export const initialStandardRules: StandardRuleItem[] = [
  {
    id: "rule-cat",
    name: "Passing grade CAT (PIP & TIU)",
    value: "≥ 70 · Minimal 35 jawaban benar dari 50 soal",
    status: "Belum terverifikasi",
    tone: "warning",
  },
  {
    id: "rule-weights",
    name: "Bobot hasil akhir Kabupaten/Kota",
    value: "PBB 30% · Samapta 30% · Kepribadian 40%",
    status: "Belum terverifikasi",
    tone: "warning",
  },
  {
    id: "rule-samapta",
    name: "Tabel konversi Samapta 5 pos",
    value: "Anchor 5 tes tersedia · menunggu pengesahan",
    status: "Belum terverifikasi",
    tone: "warning",
  },
  {
    id: "rule-age",
    name: "Cutoff umur 17 Agustus",
    value: "16 tahun s.d. <18 tahun pada 17 Agustus tahun penugasan",
    status: "Belum terverifikasi",
    tone: "warning",
  },
]

export const initialUsers: UserProfile[] = [
  {
    id: "user-admin",
    name: "Administrator",
    email: "admin@instansi.id",
    role: "admin",
    avatar: "AD",
    title: "Administrator Sistem",
    active: true,
  },
]

export const initialAuditLogs: AuditLogEntry[] = []

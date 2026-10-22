// PRD Final — Sistem Ishihara Test (Version 1.1)
// Types & Schema Definitions for Internal Color Blindness Screening

export type AccountRole = "admin" | "operator" | "participant"

export type AuthorizedAccount = {
  id: string
  emailNormalized: string
  fullName: string
  role: AccountRole
  participantId?: string // Ditautkan ke ID santri bila ada
  isAllowed: boolean
  approvedBy: string
  approvedAt: string
  createdAt: string
  notes?: string
}

export type SessionMode = "scheduled" | "self_service"
export type SessionStatus = "draft" | "published" | "open" | "closed" | "archived"
export type ResultVisibility = "staff_only" | "participant_and_staff" | "delayed"

export type TestAssignment = {
  id: string
  sessionId: string
  participantId: string
  participantName: string
  participantNumber: string
  school: string
  assignedBy: string
  status: "assigned" | "in_progress" | "completed" | "expired" | "cancelled"
  assignedAt: string
  attemptId?: string
  startedAt?: string
  completedAt?: string
  accuracy?: number
  correctCount?: number
  totalPlates?: number
  avgTimeSec?: number
  interpretationCode?: "normal" | "partial_protan_deutan" | "total_color_blind"
}

export type IshiharaTestSession = {
  id: string
  name: string
  code: string // Contoh: ISH-2027-01
  mode: SessionMode // Mode A: 'scheduled' (dengan Pengawas) vs Mode B: 'self_service' (Mandiri)
  protocolVersion: string // Contoh: "BPIP-ISH-24-V1"
  startsAt?: string // ISO string jendela akses pengerjaan
  endsAt?: string
  status: SessionStatus
  maxAttempts: number
  allowResume: boolean
  resultVisibility: ResultVisibility
  operatorName?: string
  secondsPerPlate: number
  plateCount: number
  assignments: TestAssignment[]
  createdBy: string
  createdAt: string
  shareableToken?: string // Token aman untuk link Mode Mandiri
}

export type ScreeningInterpretation = "normal" | "partial_protan_deutan" | "total_color_blind"
export type ClinicalFollowUp = "not_required" | "pending_professional_review"
export type SelectionDecision = "pending" | "eligible" | "ineligible"

export type IshiharaScreeningResult = {
  id: string
  attemptId: string
  sessionId: string
  sessionName: string
  sessionMode: SessionMode
  participantId: string
  participantName: string
  participantNumber: string
  school: string
  // 1. Status Administratif Pelaksanaan (PRD 9.2)
  completionStatus: "completed" | "incomplete" | "technically_invalid"
  accuracy: number
  totalPlates: number
  correctCount: number
  avgTimeSec: number
  // 2. Hasil Skrining Protokol (PRD 9.3)
  screeningInterpretation: ScreeningInterpretation
  interpretationLabel: string
  protocolVersion: string
  // 3. Status Rekomendasi Tindak Lanjut Medis (PRD 9.3)
  clinicalFollowUp: ClinicalFollowUp
  followUpNote: string
  // 4. Keputusan Seleksi Lembaga (PRD 9.3)
  selectionDecision: SelectionDecision
  decisionNote?: string
  reviewedBy?: string
  reviewedAt?: string
  createdAt: string
}

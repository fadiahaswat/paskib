import React, { useState, useMemo } from "react"
import {
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Award,
  Calendar,
  Eye,
  User,
  Shield,
  Clock,
  Printer,
} from "lucide-react"
import { Button, Card, Badge } from "../../components/ui"
import { useApp } from "../../context/AppContext"
import type {
  IshiharaScreeningResult,
  ScreeningInterpretation,
  ClinicalFollowUp,
  SelectionDecision,
} from "./types"

export default function ReportView() {
  const { ishiharaResults, ishiharaSessions, candidates, showToast } = useApp()

  const [selectedSessionFilter, setSelectedSessionFilter] =
    useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [detailModalResult, setDetailModalResult] =
    useState<IshiharaScreeningResult | null>(null)

  const filteredResults = useMemo(() => {
    return ishiharaResults.filter((r) => {
      if (
        selectedSessionFilter !== "all" &&
        r.sessionId !== selectedSessionFilter
      ) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          r.participantName.toLowerCase().includes(q) ||
          r.participantNumber.toLowerCase().includes(q) ||
          r.sessionName.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [ishiharaResults, selectedSessionFilter, searchQuery])

  // Ekspor CSV Resmi (PRD P1)
  const exportToCsv = () => {
    if (filteredResults.length === 0) {
      showToast("Tidak ada data hasil skrining untuk diekspor.", "warning")
      return
    }

    const headers = [
      "No. Peserta",
      "Nama Santri",
      "Sekolah",
      "Nama Sesi",
      "Mode Sesi",
      "Versi Protokol",
      "Status Administratif",
      "Akurasi (%)",
      "Benar/Total",
      "Waktu Respon Rata-rata (s)",
      "Hasil Skrining Protokol",
      "Rekomendasi Klinis",
      "Keputusan Seleksi",
      "Tanggal Pelaksanaan",
    ]

    const rows = filteredResults.map((r) => [
      `"${r.participantNumber}"`,
      `"${r.participantName}"`,
      `"${r.school}"`,
      `"${r.sessionName}"`,
      `"${r.sessionMode === "scheduled" ? "Terjadwal" : "Mandiri"}"`,
      `"${r.protocolVersion}"`,
      `"${r.completionStatus}"`,
      `"${r.accuracy}%"`,
      `"${r.correctCount}/${r.totalPlates}"`,
      `"${r.avgTimeSec}s"`,
      `"${r.interpretationLabel}"`,
      `"${
        r.clinicalFollowUp === "not_required"
          ? "Tidak Diperlukan Rujukan"
          : "Perlu Verifikasi Klinis Spesialis Mata"
      }"`,
      `"${
        r.selectionDecision === "eligible"
          ? "Memenuhi Syarat (Eligible)"
          : r.selectionDecision === "ineligible"
            ? "Tidak Memenuhi Syarat"
            : "Menunggu Evaluasi"
      }"`,
      `"${new Date(r.createdAt).toLocaleString("id-ID")}"`,
    ])

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute(
      "download",
      `Rekap_Ishihara_Paskibraka_${new Date().toISOString().slice(0, 10)}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast("Berkas laporan CSV berhasil diunduh.", "success")
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Rekap & Laporan Skrining Ishihara
            </h2>
            <Badge tone="purple" size="sm">
              PRD Bab 9.3
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pemisahan ketat 4 lapisan: <strong>Status Administratif</strong>,{" "}
            <strong>Hasil Protokol</strong>, <strong>Rekomendasi Klinis</strong>
            , dan <strong>Keputusan Seleksi</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={exportToCsv}
            variant="secondary"
            className="font-bold gap-2 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50"
          >
            <Download className="size-4 text-emerald-600" /> Ekspor Laporan CSV
          </Button>
        </div>
      </div>

      {/* 4 Layers Summary Info */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
          <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
            1. Status Administratif
          </span>
          <p className="font-display text-lg font-bold text-slate-800 mt-1">
            {
              filteredResults.filter((r) => r.completionStatus === "completed")
                .length
            }{" "}
            Selesai
          </p>
          <span className="text-3xs text-slate-400">
            Pengerjaan lengkap seluruh plat
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
          <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
            2. Protokol Skrining
          </span>
          <p className="font-display text-lg font-bold text-emerald-600 mt-1">
            {
              filteredResults.filter(
                (r) => r.screeningInterpretation === "normal",
              ).length
            }{" "}
            Normal
          </p>
          <span className="text-3xs text-slate-400">
            Akurasi di atas ambang validitas
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
          <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
            3. Rekomendasi Medis
          </span>
          <p className="font-display text-lg font-bold text-amber-600 mt-1">
            {
              filteredResults.filter(
                (r) => r.clinicalFollowUp === "pending_professional_review",
              ).length
            }{" "}
            Perlu Telaah
          </p>
          <span className="text-3xs text-slate-400">
            Rujukan buku fisik klinis
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
          <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
            4. Keputusan Seleksi
          </span>
          <p className="font-display text-lg font-bold text-brand-600 mt-1">
            {
              filteredResults.filter((r) => r.selectionDecision === "eligible")
                .length
            }{" "}
            Memenuhi Syarat
          </p>
          <span className="text-3xs text-slate-400">
            Diverifikasi panitia seleksi
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
        <div className="relative flex-1 max-w-sm">
          <Search className="size-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau no. peserta..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Filter Sesi:</span>
          <select
            value={selectedSessionFilter}
            onChange={(e) => setSelectedSessionFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">Semua Sesi Skrining</option>
            {ishiharaSessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Table */}
      <Card className="overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-3xs">
              <tr>
                <th className="py-3 px-3.5">No & Nama Peserta</th>
                <th className="py-3 px-3.5">Sesi & Mode</th>
                <th className="py-3 px-3.5">1. Status Admin</th>
                <th className="py-3 px-3.5">2. Hasil Skrining</th>
                <th className="py-3 px-3.5">3. Rekomendasi Klinis</th>
                <th className="py-3 px-3.5">4. Keputusan Seleksi</th>
                <th className="py-3 px-3.5 text-right">Rincian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="font-bold text-sm text-slate-600">
                      Belum ada riwayat hasil tes skrining.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Jalankan tes di tab "Uji Skrining" atau melalui daftar
                      peserta di tab "Manajemen Sesi".
                    </p>
                  </td>
                </tr>
              ) : (
                filteredResults.map((result) => (
                  <tr
                    key={result.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Peserta */}
                    <td className="py-3 px-3.5">
                      <div className="font-mono text-2xs font-bold text-brand-600">
                        {result.participantNumber}
                      </div>
                      <div className="font-bold text-slate-900">
                        {result.participantName}
                      </div>
                      <div className="text-3xs text-slate-400">
                        {result.school}
                      </div>
                    </td>

                    {/* Sesi */}
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-800">
                        {result.sessionName}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-3xs font-mono text-slate-500">
                          {result.protocolVersion}
                        </span>
                        <span
                          className={`text-3xs px-1.5 py-0.2 rounded font-bold ${
                            result.sessionMode === "scheduled"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-purple-50 text-purple-700"
                          }`}
                        >
                          {result.sessionMode === "scheduled"
                            ? "Terjadwal"
                            : "Mandiri"}
                        </span>
                      </div>
                    </td>

                    {/* Layer 1: Admin */}
                    <td className="py-3 px-3.5">
                      <span
                        className={`inline-flex items-center gap-1 text-2xs font-bold px-2 py-0.5 rounded-full ${
                          result.completionStatus === "completed"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {result.completionStatus === "completed"
                          ? "Selesai Penuh"
                          : "Belum Lengkap"}
                      </span>
                      <div className="text-3xs text-slate-500 mt-1">
                        Akurasi:{" "}
                        <strong className="text-slate-800">
                          {result.accuracy}%
                        </strong>{" "}
                        ({result.correctCount}/{result.totalPlates})
                      </div>
                    </td>

                    {/* Layer 2: Protokol */}
                    <td className="py-3 px-3.5">
                      <span
                        className={`inline-flex items-center gap-1 text-2xs font-bold px-2 py-0.5 rounded-full ${
                          result.screeningInterpretation === "normal"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {result.screeningInterpretation === "normal" ? (
                          <>
                            <CheckCircle2 className="size-3 text-emerald-600" />{" "}
                            Normal Sesuai Protokol
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="size-3 text-red-600" />{" "}
                            Parsial Protan/Deutan
                          </>
                        )}
                      </span>
                    </td>

                    {/* Layer 3: Rekomendasi Klinis */}
                    <td className="py-3 px-3.5">
                      {result.clinicalFollowUp === "not_required" ? (
                        <span className="text-2xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                          Tidak Perlu Rujukan
                        </span>
                      ) : (
                        <span className="text-2xs text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Perlu Telaah Spesialis Mata
                        </span>
                      )}
                    </td>

                    {/* Layer 4: Keputusan Seleksi */}
                    <td className="py-3 px-3.5">
                      {result.selectionDecision === "eligible" ? (
                        <Badge tone="green" size="sm">
                          Memenuhi Syarat (Eligible)
                        </Badge>
                      ) : result.selectionDecision === "ineligible" ? (
                        <Badge tone="red" size="sm">
                          Tidak Memenuhi Syarat
                        </Badge>
                      ) : (
                        <Badge tone="slate" size="sm">
                          Menunggu Keputusan
                        </Badge>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="py-3 px-3.5 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setDetailModalResult(result)}
                        className="text-2xs px-2.5 py-1 gap-1"
                      >
                        <Eye className="size-3" /> Detail
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Detail Hasil */}
      {detailModalResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Rincian Hasil Skrining Ishihara
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ID Hasil:{" "}
                  <span className="font-mono">{detailModalResult.id}</span>
                </p>
              </div>
              <button
                onClick={() => setDetailModalResult(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Profil Peserta */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 block text-3xs uppercase font-bold">
                    Nama Peserta
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {detailModalResult.participantName}
                  </span>
                  <span className="text-slate-500 block">
                    No: {detailModalResult.participantNumber}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-3xs uppercase font-bold">
                    Sesi & Waktu
                  </span>
                  <span className="font-bold text-slate-800">
                    {detailModalResult.sessionName}
                  </span>
                  <span className="text-slate-500 block">
                    {new Date(detailModalResult.createdAt).toLocaleString(
                      "id-ID",
                    )}
                  </span>
                </div>
              </div>

              {/* 4 Lapisan Detail */}
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">
                      1. Status Administratif:
                    </span>
                    <span className="font-bold text-emerald-600">
                      {detailModalResult.completionStatus.toUpperCase()}{" "}
                      (Akurasi {detailModalResult.accuracy}%)
                    </span>
                  </div>
                  <p className="text-slate-500 text-2xs mt-1">
                    Berhasil menjawab benar {detailModalResult.correctCount}{" "}
                    dari {detailModalResult.totalPlates} piringan. Kecepatan
                    respon rata-rata {detailModalResult.avgTimeSec} detik per
                    pelat.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">
                      2. Hasil Skrining Protokol:
                    </span>
                    <span className="font-bold text-slate-900">
                      {detailModalResult.interpretationLabel}
                    </span>
                  </div>
                  <p className="text-slate-500 text-2xs mt-1">
                    Dievaluasi menggunakan instrumen stimulus berlisensi versi{" "}
                    {detailModalResult.protocolVersion}.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">
                      3. Rekomendasi Medis Klinis:
                    </span>
                    <span className="font-bold text-slate-800">
                      {detailModalResult.clinicalFollowUp === "not_required"
                        ? "Tidak Memerlukan Pemeriksaan Lanjutan"
                        : "Memerlukan Konfirmasi Dokter Spesialis Mata"}
                    </span>
                  </div>
                  <p className="text-slate-500 text-2xs mt-1">
                    {detailModalResult.followUpNote ||
                      "Sesuai standar skrining visual awal seleksi."}
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">
                      4. Keputusan Seleksi Lembaga:
                    </span>
                    <Badge
                      tone={
                        detailModalResult.selectionDecision === "eligible"
                          ? "green"
                          : detailModalResult.selectionDecision === "ineligible"
                            ? "red"
                            : "slate"
                      }
                      size="sm"
                    >
                      {detailModalResult.selectionDecision.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-slate-500 text-2xs mt-1">
                    Catatan:{" "}
                    {detailModalResult.decisionNote ||
                      "Memenuhi syarat kriteria kesehatan mata Rikkes Tahap 4."}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <Button
                variant="secondary"
                onClick={() => setDetailModalResult(null)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

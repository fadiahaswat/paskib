import {
  ageOnReferenceDate,
  bmi,
  finalScore,
  getQuotaBand,
  isPhaseOnePassed,
  selectionStages,
  type Candidate,
  type SelectionSchedule,
} from "../domain/selection"

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  const escapeCsv = (val: string | number | null | undefined) => {
    const str = val === null || val === undefined ? "" : String(val)
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const csvContent = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\n")

  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.setAttribute("download", filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportCandidatesCsv(candidates: Candidate[]) {
  const headers = [
    "Nomor Peserta",
    "NIK",
    "Nama Lengkap",
    "Sekolah",
    "Jenis Kelamin",
    "Tanggal Lahir",
    "Tinggi (cm)",
    "Berat (kg)",
    "Tahap Aktif",
    "Status Tahap",
    "PIP",
    "TIU",
    "PBB",
    "Samapta",
    "Kepribadian",
    "Nilai Akhir",
    "Berkas Valid (dari 6)",
  ]

  const rows = candidates.map((c) => {
    const score = finalScore(c)
    const docsCount = (c.documents ?? []).filter(Boolean).length
    return [
      c.number,
      c.nik ?? "",
      c.name,
      c.school,
      c.gender,
      c.birthDate,
      c.heightCm ?? "",
      c.weightKg ?? "",
      `${c.stage} - ${selectionStages[c.stage - 1]?.label ?? ""}`,
      c.stageStatuses[c.stage - 1] ?? "",
      c.pip ?? "",
      c.tiu ?? "",
      c.pbb ?? "",
      c.fitness ?? "",
      c.personality ?? "",
      score !== null ? score.toFixed(2) : "",
      `${docsCount}/6`,
    ]
  })

  downloadCsv("daftar-kandidat-paskibraka-2027.csv", headers, rows)
}

export function exportRankingCsv(
  ranked: { candidate: Candidate, score: number }[],
) {
  const headers = [
    "Peringkat",
    "Nomor Peserta",
    "Nama Lengkap",
    "Sekolah",
    "Jenis Kelamin",
    "PBB (30%)",
    "Samapta (30%)",
    "Kepribadian (40%)",
    "Nilai Akhir",
    "Band Kuota Simulasi",
  ]

  const rows = ranked.map(({ candidate, score }, index) => {
    const band = getQuotaBand(index + 1)
    return [
      index + 1,
      candidate.number,
      candidate.name,
      candidate.school,
      candidate.gender,
      candidate.pbb?.toFixed(1) ?? "",
      candidate.fitness?.toFixed(1) ?? "",
      candidate.personality?.toFixed(1) ?? "",
      score.toFixed(2),
      band.label,
    ]
  })

  downloadCsv("rekap-pemeringkatan-paskibraka-2027.csv", headers, rows)
}

export function downloadCandidateTemplateCsv() {
  const headers = [
    "Nama Lengkap",
    "Jenis Kelamin (Putra/Putri)",
    "Tanggal Lahir (YYYY-MM-DD)",
    "Sekolah",
    "NIK (16 Digit)",
    "Tinggi (cm)",
    "Berat (kg)",
  ]
  downloadCsv("template-impor-kandidat.csv", headers, [])
}

export function printCandidateReport(
  candidate: Candidate,
  referenceYear = 2027,
) {
  const age = ageOnReferenceDate(candidate.birthDate, referenceYear)
  const bmiInfo = bmi(candidate.weightKg ?? 0, candidate.heightCm ?? 0)
  const score = finalScore(candidate)
  const phase1 = isPhaseOnePassed(candidate)
  const docsValid = (candidate.documents ?? []).filter(Boolean).length

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Laporan Kandidat - ${candidate.name} (${candidate.number})</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; margin: 32px; line-height: 1.5; }
    .header { border-bottom: 3px solid #dc2626; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 22px; font-weight: 800; margin: 0; }
    .subtitle { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; }
    .badge { display: inline-block; background: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
    .card h3 { margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; color: #475569; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
    th { background: #f8fafc; font-weight: 700; }
    .footer { margin-top: 36px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 16px;">
    <button onclick="window.print()" style="background:#dc2626;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-weight:700;cursor:pointer;">Cetak / Simpan PDF</button>
  </div>
  <div class="header">
    <div>
      <div class="subtitle">PASKA TRACK · Sistem Pendamping Internal</div>
      <h1 class="title">Laporan Perkembangan & Evaluasi Kandidat</h1>
      <div style="font-size:13px;color:#475569;margin-top:4px;">Nomor Peserta: <strong>${candidate.number}</strong> · Periode Seleksi ${referenceYear}</div>
    </div>
    <span class="badge">DOKUMEN INTERNAL</span>
  </div>

  <div class="grid">
    <div class="card">
      <h3>Identitas & Profil</h3>
      <div><strong>Nama Lengkap:</strong> ${candidate.name}</div>
      <div><strong>Sekolah Asal:</strong> ${candidate.school}</div>
      <div><strong>Jenis Kelamin:</strong> ${candidate.gender}</div>
      <div><strong>Tanggal Lahir:</strong> ${candidate.birthDate} (${age.years} th ${age.months} bln ${age.days} hr per 17 Agt ${referenceYear})</div>
      <div><strong>Kelengkapan Berkas:</strong> ${docsValid} / 6 Dokumen Valid</div>
    </div>
    <div class="card">
      <h3>Antropometri & Status Seleksi</h3>
      <div><strong>Tinggi / Berat:</strong> ${candidate.heightCm ?? "—"} cm / ${candidate.weightKg ?? "—"} kg</div>
      <div><strong>BMI / IMT:</strong> ${
        bmiInfo ? `${bmiInfo.value} (${bmiInfo.category})` : "Belum diukur"
      }</div>
      <div><strong>Tahap Aktif:</strong> Tahap ${candidate.stage} (${selectionStages[candidate.stage - 1]?.label ?? ""})</div>
      <div><strong>Status Fase 1:</strong> ${
        phase1 ? "LOLOS SELURUH HARD-LOCK" : "Dalam Proses / Belum Lengkap"
      }</div>
      <div><strong>Nilai Akhir Sementara:</strong> ${
        score !== null ? score.toFixed(2) : "Belum lengkap"
      }</div>
    </div>
  </div>

  <h3>Rekapitulasi Tahapan 1–8</h3>
  <table>
    <thead>
      <tr>
        <th>Tahap</th>
        <th>Nama Tahapan</th>
        <th>Fase</th>
        <th>Status</th>
        <th>Nilai / Hasil</th>
      </tr>
    </thead>
    <tbody>
      ${selectionStages
        .map((st, idx) => {
          const stStatus = candidate.stageStatuses[idx] ?? "locked"
          const val =
            idx === 0
              ? `${docsValid}/6 Berkas`
              : idx === 1
                ? (candidate.pip ?? "—")
                : idx === 2
                  ? (candidate.tiu ?? "—")
                  : idx === 5
                    ? (candidate.pbb ?? "—")
                    : idx === 6
                      ? (candidate.fitness ?? "—")
                      : idx === 7
                        ? (candidate.personality ?? "—")
                        : "—"
          return `<tr>
            <td>Tahap ${st.id}</td>
            <td>${st.label}</td>
            <td>${
              st.phase === 1 ? "Fase 1 (Hard-lock)" : "Fase 2 (Pembobotan)"
            }</td>
            <td><strong>${stStatus.toUpperCase()}</strong></td>
            <td>${val}</td>
          </tr>`
        })
        .join("")}
    </tbody>
  </table>

  <div class="card" style="margin-top:20px;">
    <h3>Catatan Pelatih / Evaluasi</h3>
    <p style="margin:0;font-size:13px;">${candidate.coachNote ?? "Belum ada catatan khusus."}</p>
  </div>

  <div class="footer">
    Dicetak pada ${new Date().toLocaleString("id-ID")} melalui PASKA TRACK (Sistem Pendamping Internal). Dokumen ini bukan pengumuman resmi portal BPIP.
  </div>
</body>
</html>`

  const win = window.open("", "_blank")
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}

export function printAdmissionCard(
  candidate: Candidate,
  schedule?: SelectionSchedule,
) {
  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Kartu Ujian Internal - ${candidate.number}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; margin: 32px; }
    .card { max-width: 620px; border: 2px solid #0f172a; border-radius: 16px; overflow: hidden; }
    .banner { background: #0f172a; color: #fff; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
    .content { padding: 20px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #cbd5e1; font-size: 14px; }
    .stamp { margin-top: 20px; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 12px 16px; border-radius: 10px; font-size: 12px; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 16px;">
    <button onclick="window.print()" style="background:#dc2626;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-weight:700;cursor:pointer;">Cetak Kartu Peserta</button>
  </div>
  <div class="card">
    <div class="banner">
      <div>
        <div style="font-size:11px;color:#fca5a5;font-weight:700;letter-spacing:0.12em;">KARTU PESERTA SIMULASI & SELEKSI INTERNAL</div>
        <div style="font-size:18px;font-weight:800;margin-top:2px;">PASKA TRACK · PERIODE 2027</div>
      </div>
      <div style="background:#dc2626;padding:6px 12px;border-radius:8px;font-weight:800;font-size:14px;">${candidate.number}</div>
    </div>
    <div class="content">
      <div class="row"><span>Nama Peserta</span><strong>${candidate.name}</strong></div>
      <div class="row"><span>Asal Sekolah</span><strong>${candidate.school}</strong></div>
      <div class="row"><span>Jenis Kelamin / Tgl Lahir</span><strong>${candidate.gender} · ${candidate.birthDate}</strong></div>
      <div class="row"><span>Status Administrasi</span><strong>${
        candidate.stageStatuses[0] === "passed"
          ? "TERVERIFIKASI (LOLOS)"
          : "DALAM PROSES"
      }</strong></div>
      <div class="row"><span>Jadwal / Sesi Terdekat</span><strong>${
        schedule
          ? `${schedule.title} (${schedule.date} · ${schedule.time})`
          : "Sesuai Jadwal Tahap Aktif"
      }</strong></div>
      <div class="row"><span>Lokasi Pelaksanaan</span><strong>${schedule?.location ?? "Sekretariat / Lapangan Utama"}</strong></div>
      <div class="stamp">
        <div>
          <strong>Token Verifikasi Internal:</strong> PT-2027-${candidate.id.toUpperCase()}<br/>
          <span style="color:#64748b;">Wajib dibawa bersama kartu pelajar asli saat registrasi sesi.</span>
        </div>
        <div style="text-align:right;font-weight:700;color:#15803d;">VALID</div>
      </div>
    </div>
  </div>
</body>
</html>`

  const win = window.open("", "_blank")
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}

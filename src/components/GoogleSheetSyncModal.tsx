import { useState } from "react"
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cloud,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  HelpCircle,
  RefreshCw,
  Save,
  Wifi,
  X,
} from "lucide-react"
import { Badge, Button, Card, Input } from "./ui"
import { useApp } from "../context/AppContext"

const APPS_SCRIPT_CODE = `/**
 * PASKA TRACK 2026 - GOOGLE APPS SCRIPT DATABASE BACKEND
 * Ekstensi > Apps Script > Tempel kode ini > Deploy > Web App (Akses: Anyone)
 */

function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action || "load";

    if (action === "ping") {
      return createJsonResponse({
        ok: true,
        status: "connected",
        message: "Google Apps Script aktif & terhubung!",
        timestamp: new Date().toISOString()
      });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var rawSheet = getOrCreateSheet(ss, "_DATABASE_BACKUP", false);
    var rawData = readLargeTextFromSheet(rawSheet);

    var parsedData = null;
    if (rawData && rawData.trim().length > 0) {
      try {
        parsedData = JSON.parse(rawData);
      } catch (err) {
        parsedData = null;
      }
    }

    return createJsonResponse({
      ok: true,
      action: "load",
      data: parsedData,
      spreadsheetUrl: ss.getUrl(),
      spreadsheetName: ss.getName(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return createJsonResponse({ ok: false, error: error.toString() });
  }
}

function doPost(e) {
  try {
    var contents = (e && e.postData && e.postData.contents) ? e.postData.contents : "";
    if (!contents) {
      return createJsonResponse({ ok: false, error: "Data payload kosong" });
    }

    var payload = JSON.parse(contents);
    var action = payload.action || "sync";
    var state = payload.data || payload;

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Simpan full JSON state ke sheet _DATABASE_BACKUP (lossless)
    var rawSheet = getOrCreateSheet(ss, "_DATABASE_BACKUP", false);
    var jsonString = JSON.stringify(state);
    writeLargeTextToSheet(rawSheet, jsonString);

    // 2. Render sheet visual
    if (state.candidates && Array.isArray(state.candidates)) {
      renderCandidatesSheet(ss, state.candidates);
    }
    if (state.sessions && Array.isArray(state.sessions)) {
      renderSessionsSheet(ss, state.sessions, state.records || {});
    }
    if (state.schedules && Array.isArray(state.schedules)) {
      renderSchedulesSheet(ss, state.schedules);
    }
    if (state.auditLogs && Array.isArray(state.auditLogs)) {
      renderAuditSheet(ss, state.auditLogs);
    }

    return createJsonResponse({
      ok: true,
      action: action,
      message: "Data tersimpan otomatis di Google Sheet",
      spreadsheetUrl: ss.getUrl(),
      stats: {
        candidates: state.candidates ? state.candidates.length : 0,
        sessions: state.sessions ? state.sessions.length : 0,
        schedules: state.schedules ? state.schedules.length : 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return createJsonResponse({ ok: false, error: error.toString() });
  }
}

function renderCandidatesSheet(ss, candidates) {
  var sheet = getOrCreateSheet(ss, "Kandidat", true);
  sheet.clear();

  var headers = [
    "No", "ID", "Nomor Peserta", "Nama Lengkap", "Gender", 
    "Asal Sekolah", "Tanggal Lahir", "Nomor HP", 
    "Tinggi (cm)", "Berat (kg)", "BMI", "Kategori BMI", 
    "Tahap Aktif", "Status Seleksi", 
    "Nilai PIP", "Nilai TIU", "Nilai PBB", "Nilai Samapta", "Nilai Kepribadian",
    "Terakhir Diperbarui"
  ];

  var rows = [headers];
  for (var i = 0; i < candidates.length; i++) {
    var c = candidates[i];
    var h = c.heightCm || 0;
    var w = c.weightKg || 0;
    var bmiVal = (h > 0 && w > 0) ? (w / Math.pow(h / 100, 2)).toFixed(1) : "-";
    var bmiStatus = "-";
    if (bmiVal !== "-") {
      var bNum = parseFloat(bmiVal);
      if (bNum < 18) bmiStatus = "Kurang";
      else if (bNum <= 25) bmiStatus = "Normal (Ideal)";
      else if (bNum <= 27) bmiStatus = "Kelebihan";
      else bmiStatus = "Obesitas";
    }
    var scores = c.scores || {};
    rows.push([
      i + 1, c.id || "", c.number || "", c.name || "", c.gender || "",
      c.school || "", c.birthDate || "", c.phone || "",
      h || "-", w || "-", bmiVal, bmiStatus,
      c.stage ? ("Tahap " + c.stage) : "-",
      c.stageStatuses ? c.stageStatuses[c.stage - 1] || "aktif" : "aktif",
      scores.pip !== undefined ? scores.pip : "-",
      scores.tiu !== undefined ? scores.tiu : "-",
      scores.pbb !== undefined ? scores.pbb : "-",
      scores.samapta !== undefined ? scores.samapta : "-",
      scores.personality !== undefined ? scores.personality : "-",
      c.updatedAt || new Date().toISOString()
    ]);
  }

  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground("#DC2626");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function renderSessionsSheet(ss, sessions, records) {
  var sheet = getOrCreateSheet(ss, "Sesi_Latihan", true);
  sheet.clear();
  var headers = ["No", "ID Sesi", "Tipe Sesi", "Judul Sesi", "Tanggal", "Waktu", "Lokasi", "Pelatih / Penilai", "Status", "Total Peserta", "Peserta Diinput"];
  var rows = [headers];

  for (var i = 0; i < sessions.length; i++) {
    var s = sessions[i];
    var partCount = (s.participantIds && Array.isArray(s.participantIds)) ? s.participantIds.length : 0;
    var filledCount = 0;
    if (records) {
      for (var key in records) {
        if (key.indexOf(s.id) === 0 && records[key].result) filledCount++;
      }
    }
    rows.push([
      i + 1, s.id || "", s.type || "", s.title || "", s.date || "",
      s.time || "", s.location || "", s.coach || "", s.status || "scheduled",
      partCount, filledCount
    ]);
  }

  if (rows.length > 1) {
    sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
    var hr = sheet.getRange(1, 1, 1, headers.length);
    hr.setBackground("#1E293B");
    hr.setFontColor("#FFFFFF");
    hr.setFontWeight("bold");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
}

function renderSchedulesSheet(ss, schedules) {
  var sheet = getOrCreateSheet(ss, "Jadwal_Seleksi", true);
  sheet.clear();
  var headers = ["No", "ID Jadwal", "Judul Agenda", "Mulai", "Selesai", "Lokasi", "Tahap Terkait", "Jumlah Peserta"];
  var rows = [headers];
  for (var i = 0; i < schedules.length; i++) {
    var sch = schedules[i];
    rows.push([
      i + 1, sch.id || "", sch.title || "", sch.startDate || "", sch.endDate || "",
      sch.location || "", sch.stageIndex !== undefined ? ("Tahap " + (sch.stageIndex + 1)) : "-",
      sch.candidateIds ? sch.candidateIds.length : 0
    ]);
  }
  if (rows.length > 1) {
    sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
    var hr = sheet.getRange(1, 1, 1, headers.length);
    hr.setBackground("#2563EB");
    hr.setFontColor("#FFFFFF");
    hr.setFontWeight("bold");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
}

function renderAuditSheet(ss, auditLogs) {
  var sheet = getOrCreateSheet(ss, "Log_Aktivitas", true);
  sheet.clear();
  var headers = ["Timestamp", "Aktor", "Role", "Aksi", "Target", "Keterangan Detail"];
  var rows = [headers];
  var logsToShow = auditLogs.slice(0, 100);
  for (var i = 0; i < logsToShow.length; i++) {
    var a = logsToShow[i];
    rows.push([a.timestamp || "", a.actor || "", a.role || "", a.action || "", a.target || "", a.detail || ""]);
  }
  if (rows.length > 1) {
    sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
    var hr = sheet.getRange(1, 1, 1, headers.length);
    hr.setBackground("#475569");
    hr.setFontColor("#FFFFFF");
    hr.setFontWeight("bold");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
}

function writeLargeTextToSheet(sheet, text) {
  sheet.clear();
  var chunkSize = 40000;
  var rows = [];
  for (var i = 0; i < text.length; i += chunkSize) {
    rows.push([text.substring(i, i + chunkSize)]);
  }
  if (rows.length === 0) rows.push([""]);
  sheet.getRange(1, 1, rows.length, 1).setValues(rows);
}

function readLargeTextFromSheet(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow === 0) return "";
  var values = sheet.getRange(1, 1, lastRow, 1).getValues();
  var result = "";
  for (var i = 0; i < values.length; i++) result += values[i][0];
  return result;
}

function getOrCreateSheet(ss, name, makeVisible) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (!makeVisible) {
    try { sheet.hideSheet(); } catch (e) {}
  }
  return sheet;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`

export function GoogleSheetSyncModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const {
    googleSheetUrl,
    setGoogleSheetUrl,
    cloudSyncStatus,
    lastCloudSync,
    syncToGoogleSheet,
    testGoogleSheet,
    allCandidates,
    sessions,
  } = useApp()

  const [inputUrl, setInputUrl] = useState(googleSheetUrl)
  const [testing, setTesting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showGuide, setShowGuide] = useState(!googleSheetUrl)

  if (!open) return null

  async function handleSaveUrl(e: React.FormEvent) {
    e.preventDefault()
    setGoogleSheetUrl(inputUrl)
    setTesting(true)
    const testResult = await testGoogleSheet(inputUrl)
    setTesting(false)
    if (testResult.ok) {
      // Langsung simpan data lokal yang ada ke cloud secara otomatis
      await syncToGoogleSheet(inputUrl, false)
    }
  }

  function handleCopyScript() {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return "Belum pernah"
    try {
      const d = new Date(timestamp)
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return timestamp
    }
  }

  const isConfigured = Boolean(googleSheetUrl && googleSheetUrl.trim().length > 10)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Penyimpanan Cloud Google Sheet
              </h2>
              <p className="text-xs text-slate-500">
                Data otomatis tersimpan & tersinkron antara Localhost dan GitHub Pages
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="grid gap-5 p-6">
          {/* Status Real-time */}
          <div
            className={`rounded-2xl border p-4 transition ${
              isConfigured
                ? "border-emerald-200 bg-emerald-50/60"
                : "border-amber-200 bg-amber-50/70"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-white ${
                  isConfigured ? "bg-emerald-600" : "bg-amber-600"
                }`}
              >
                {isConfigured ? (
                  <Check className="size-3.5" />
                ) : (
                  <Cloud className="size-3.5" />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={`text-sm font-bold ${
                    isConfigured ? "text-emerald-950" : "text-amber-950"
                  }`}
                >
                  {isConfigured
                    ? "Database Aktif & Otomatis Tersimpan"
                    : "Penyimpanan Cloud Belum Dihubungkan"}
                </p>
                <p
                  className={`mt-0.5 text-xs ${
                    isConfigured ? "text-emerald-800" : "text-amber-800"
                  }`}
                >
                  {isConfigured
                    ? "Setiap kali Anda menambah kandidat atau menginput nilai, data langsung tersimpan ke Google Sheet secara otomatis tanpa perlu tombol manual."
                    : "Masukkan URL Google Apps Script di bawah sekali saja agar semua data tersimpan di Google Sheet dan tersinkron ke GitHub Pages."}
                </p>
                {isConfigured ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-md bg-white px-2 py-0.5 font-semibold text-emerald-800 border border-emerald-200">
                      {allCandidates.length} Kandidat
                    </span>
                    <span className="rounded-md bg-white px-2 py-0.5 font-semibold text-emerald-800 border border-emerald-200">
                      {sessions.length} Sesi Latihan
                    </span>
                    <span className="text-[0.7rem] text-emerald-700">
                      Terakhir simpan: {formatLastSync(lastCloudSync)}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Form Input URL */}
          <form onSubmit={handleSaveUrl} className="grid gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                URL Google Apps Script Web App
              </label>
              {isConfigured ? (
                <span className="text-[0.68rem] text-emerald-600 font-semibold">
                  ✓ Terhubung
                </span>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="url"
                required
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-normal outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50"
              />
              <Button
                type="submit"
                variant="primary"
                disabled={testing}
                className="!bg-emerald-600 hover:!bg-emerald-700 whitespace-nowrap"
              >
                {testing ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" /> Menghubungkan...
                  </>
                ) : (
                  <>
                    <Save className="size-4" /> Simpan & Sambungkan
                  </>
                )}
              </Button>
            </div>
            <p className="text-[0.72rem] text-slate-500">
              Tempelkan URL Web App yang berakhiran <code>/exec</code> dari Google Sheet Anda.
            </p>
          </form>

          {/* Panduan Pemasangan (Hanya 3 Langkah Cepat) */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setShowGuide((v) => !v)}
              className="flex w-full items-center justify-between bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
            >
              <span className="text-xs font-bold text-slate-700">
                Cara pasang di Google Sheet (Hanya 2 menit)
              </span>
              {showGuide ? (
                <ChevronUp className="size-4 text-slate-500" />
              ) : (
                <ChevronDown className="size-4 text-slate-500" />
              )}
            </button>

            {showGuide ? (
              <div className="grid gap-3 p-4 text-xs text-slate-600 leading-relaxed border-t border-slate-200">
                <div className="flex items-start gap-2.5">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-slate-800 font-bold text-white text-[0.65rem]">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">
                      Buka Google Sheet &gt; Menu Ekstensi &gt; Apps Script
                    </p>
                    <p className="text-slate-500 text-[0.72rem]">
                      Bisa buat baru di{" "}
                      <a
                        href="https://sheet.new"
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-emerald-700 underline"
                      >
                        sheet.new
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-slate-800 font-bold text-white text-[0.65rem]">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">
                      Hapus kode bawaan, lalu salin kode backend ini:
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-1.5 !px-3 !py-1 !text-xs font-bold text-emerald-800 border-emerald-300 hover:!bg-emerald-50"
                      onClick={handleCopyScript}
                    >
                      {copied ? (
                        <>
                          <Check className="size-3 text-emerald-600" /> Tersalin ke Clipboard!
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" /> Salin Kode Apps Script
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-slate-800 font-bold text-white text-[0.65rem]">
                    3
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">
                      Klik Terapkan (Deploy) &gt; Penerapan Baru &gt; Aplikasi Web
                    </p>
                    <p className="text-slate-500 text-[0.72rem]">
                      Pilih akses: <strong className="text-red-600 underline">Siapa saja (Anyone)</strong>, lalu salin URL Web App dan tempel di atas.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50 px-6 py-3.5">
          <Button variant="secondary" onClick={onClose}>
            Selesai
          </Button>
        </div>
      </div>
    </div>
  )
}

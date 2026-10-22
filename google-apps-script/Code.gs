/**
 * PASKA TRACK 2026 - GOOGLE APPS SCRIPT DATABASE BACKEND
 * ========================================================
 * Skrip ini bertindak sebagai backend API & penyimpan data cloud untuk Paskibraka Selection Tracker.
 * Berfungsi menghubungkan dan menyinkronkan data antara:
 * - Localhost (komputer pengembang/admin)
 * - GitHub Pages (versi web publik/tim juri & pelatih)
 * - Google Sheet (tampilan visual spreadsheet & backup cloud)
 * 
 * CARA PEMASANGAN (HANYA 2 MENIT):
 * 1. Buka Google Sheet baru di browser Anda (atau ketik: sheet.new).
 * 2. Beri nama spreadsheet Anda, misalnya: "Database Seleksi Paskibraka 2026".
 * 3. Klik menu "Ekstensi" (Extensions) > "Apps Script".
 * 4. Hapus seluruh kode bawaan yang ada di editor, lalu TEMPELKAN seluruh isi file ini.
 * 5. Klik tombol "Simpan" (ikon disket).
 * 6. Klik tombol biru "Terapkan" (Deploy) di kanan atas > pilih "Penerapan baru" (New deployment).
 * 7. Pada ikon gerigi "Pilih jenis" (Select type), pilih "Aplikasi web" (Web app).
 * 8. Konfigurasi:
 *    - Deskripsi: API Database Paska Track
 *    - Jalankan sebagai (Execute as): "Saya" (email Anda)
 *    - Yang memiliki akses (Who has access): "Siapa saja" (Anyone) -> PENTING! Agar GitHub Pages & localhost dapat mengakses.
 * 9. Klik "Terapkan" (Deploy), lalu izinkan izin akses (Review Permissions > pilih akun Google Anda > Advanced > Go to ...).
 * 10. Salin "URL Aplikasi Web" (akhiran /exec).
 * 11. Tempelkan URL tersebut ke dalam modal "Google Sheet Sync" di aplikasi Paska Track Anda!
 */

function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action || "load";

    // Endpoint Ping untuk cek konektivitas
    if (action === "ping") {
      return createJsonResponse({
        ok: true,
        status: "connected",
        message: "Google Apps Script aktif & terhubung!",
        timestamp: new Date().toISOString()
      });
    }

    // Endpoint Load data lengkap
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
    return createJsonResponse({
      ok: false,
      error: error.toString()
    });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (err) {
    return createJsonResponse({
      ok: false,
      error: "Server Google Apps Script sedang sibuk (antrean sinkronisasi penuh). Silakan coba lagi."
    });
  }

  try {
    var contents = "";
    if (e && e.postData && e.postData.contents) {
      contents = e.postData.contents;
    }

    if (!contents) {
      return createJsonResponse({
        ok: false,
        error: "Data payload kosong"
      });
    }

    var payload = JSON.parse(contents);
    var action = payload.action || "sync";
    var state = payload.data || payload;

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Simpan full JSON state ke sheet _DATABASE_BACKUP HANYA jika payload valid (ada kandidat/periode/sesi)
    if (state && (state.candidates || state.cycles || state.sessions || state.schedules)) {
      var rawSheet = getOrCreateSheet(ss, "_DATABASE_BACKUP", false);
      var jsonString = JSON.stringify(state);
      writeLargeTextToSheet(rawSheet, jsonString);
    }

    // 2. Format tab-tab human-readable di Google Sheet
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
      message: "Data berhasil disimpan ke Google Sheet!",
      stats: {
        candidates: state.candidates ? state.candidates.length : 0,
        sessions: state.sessions ? state.sessions.length : 0,
        schedules: state.schedules ? state.schedules.length : 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return createJsonResponse({
      ok: false,
      error: error.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Render Tab Kandidat
 */
function renderCandidatesSheet(ss, candidates) {
  var sheet = getOrCreateSheet(ss, "Kandidat", true);
  sheet.clear();

  var headers = [
    "No", "ID", "Nomor Peserta", "Nama Lengkap", "Gender", 
    "Asal Sekolah", "Tanggal Lahir", "Nomor HP", 
    "Tinggi (cm)", "Berat (kg)", "BMI", "Kategori BMI", 
    "Tahap Aktif", "Status Seleksi", "Status Berkas",
    "Nilai PIP", "Nilai TIU", "Nilai PBB", "Nilai Samapta", "Nilai Kepribadian",
    "Catatan Pelatih", "Terakhir Diperbarui"
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
    var docs = c.documents || [];
    var docsCount = Array.isArray(docs) ? docs.filter(Boolean).length : 0;
    var docsStatus = docsCount === 6 ? "Lengkap (6/6)" : (docsCount + "/6 Berkas");

    var valPip = (c.pip !== undefined && c.pip !== null) ? c.pip : (scores.pip !== undefined ? scores.pip : "-");
    var valTiu = (c.tiu !== undefined && c.tiu !== null) ? c.tiu : (scores.tiu !== undefined ? scores.tiu : "-");
    var valPbb = (c.pbb !== undefined && c.pbb !== null) ? c.pbb : (scores.pbb !== undefined ? scores.pbb : "-");
    var valSamapta = (c.fitness !== undefined && c.fitness !== null) ? c.fitness : (scores.samapta !== undefined ? scores.samapta : "-");
    var valPersonality = (c.personality !== undefined && c.personality !== null) ? c.personality : (scores.personality !== undefined ? scores.personality : "-");

    rows.push([
      i + 1,
      c.id || "",
      c.number || "",
      c.name || "",
      c.gender || "",
      c.school || "",
      c.birthDate || "",
      c.phone || "",
      h || "-",
      w || "-",
      bmiVal,
      bmiStatus,
      c.stage ? ("Tahap " + c.stage) : "-",
      c.stageStatuses ? c.stageStatuses[c.stage - 1] || "aktif" : "aktif",
      docsStatus,
      valPip,
      valTiu,
      valPbb,
      valSamapta,
      valPersonality,
      c.coachNote || "-",
      c.updatedAt || new Date().toISOString()
    ]);
  }

  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);

  // Styling Header
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground("#DC2626"); // Red-600
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  sheet.setFrozenRows(1);
}

/**
 * Render Tab Sesi & Latihan
 */
function renderSessionsSheet(ss, sessions, records) {
  var sheet = getOrCreateSheet(ss, "Sesi_Latihan", true);
  sheet.clear();

  var headers = [
    "No", "ID Sesi", "Tipe Sesi", "Judul Sesi", "Tanggal", "Waktu", 
    "Lokasi", "Pelatih / Penilai", "Status", "Total Peserta", "Peserta Diinput"
  ];

  var rows = [headers];

  for (var i = 0; i < sessions.length; i++) {
    var s = sessions[i];
    var partCount = (s.participantIds && Array.isArray(s.participantIds)) ? s.participantIds.length : 0;
    
    // Hitung peserta yang sudah ada record penilaian
    var filledCount = 0;
    if (records) {
      for (var key in records) {
        if (key.indexOf(s.id) === 0 && records[key].result) {
          filledCount++;
        }
      }
    }

    rows.push([
      i + 1,
      s.id || "",
      s.type || "",
      s.title || "",
      s.date || "",
      s.time || "",
      s.location || "",
      s.coach || "",
      s.status || "scheduled",
      partCount,
      filledCount
    ]);
  }

  if (rows.length > 1) {
    sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#1E293B"); // Slate-800
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
}

/**
 * Render Tab Jadwal
 */
function renderSchedulesSheet(ss, schedules) {
  var sheet = getOrCreateSheet(ss, "Jadwal_Seleksi", true);
  sheet.clear();

  var headers = [
    "No", "ID Jadwal", "Judul Agenda", "Mulai", "Selesai", 
    "Lokasi", "Tahap Terkait", "Jumlah Peserta"
  ];

  var rows = [headers];

  for (var i = 0; i < schedules.length; i++) {
    var sch = schedules[i];
    rows.push([
      i + 1,
      sch.id || "",
      sch.title || "",
      sch.startDate || "",
      sch.endDate || "",
      sch.location || "",
      sch.stageIndex !== undefined ? ("Tahap " + (sch.stageIndex + 1)) : "-",
      sch.candidateIds ? sch.candidateIds.length : 0
    ]);
  }

  if (rows.length > 1) {
    sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#2563EB"); // Blue-600
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
}

/**
 * Render Tab Audit Log
 */
function renderAuditSheet(ss, auditLogs) {
  var sheet = getOrCreateSheet(ss, "Log_Aktivitas", true);
  sheet.clear();

  var headers = ["Timestamp", "Aktor", "Role", "Aksi", "Target", "Keterangan Detail"];
  var rows = [headers];

  var logsToShow = auditLogs.slice(0, 100);
  for (var i = 0; i < logsToShow.length; i++) {
    var a = logsToShow[i];
    rows.push([
      a.timestamp || "",
      a.actor || "",
      a.role || "",
      a.action || "",
      a.target || "",
      a.detail || ""
    ]);
  }

  if (rows.length > 1) {
    sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#475569");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
}

/**
 * Utility: Simpan string teks panjang (JSON) ke sheet tersembunyi
 * Memecah string per baris jika panjang > 45000 karakter (limit sel Google Sheet)
 */
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
  for (var i = 0; i < values.length; i++) {
    result += values[i][0];
  }
  return result;
}

function getOrCreateSheet(ss, name, makeVisible) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (!makeVisible) {
    try {
      sheet.hideSheet();
    } catch (e) {}
  }
  return sheet;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

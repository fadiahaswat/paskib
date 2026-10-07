/**
 * PASKIBRAKA TRAINING & SELECTION TRACKER - GOOGLE APPS SCRIPT BACKEND
 * Database: Google Spreadsheet
 */

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'getInitialData';
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let result = {};
    
    if (action === 'getInitialData') {
      result = {
        participants: getSheetData(ss, 'Participants'),
        trainingSessions: getSheetData(ss, 'TrainingSessions'),
        attendance: getSheetData(ss, 'Attendance'),
        assessments: getSheetData(ss, 'Assessments'),
        scores: getSheetData(ss, 'AssessmentScores'),
        notes: getSheetData(ss, 'CoachNotes'),
        settings: getSheetData(ss, 'Settings')
      };
    } else if (action === 'getParticipants') {
      result = getSheetData(ss, 'Participants');
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(15000);
  
  try {
    const contents = JSON.parse(e.postData.contents);
    const action = contents.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'saveAttendance') {
      const sheet = ss.getSheetByName('Attendance');
      const now = new Date().toISOString();
      contents.records.forEach(r => {
        sheet.appendRow([
          'ATT-' + Utilities.getUuid().slice(0, 8),
          contents.trainingId,
          r.participantId,
          r.status,
          now,
          r.notes || ''
        ]);
      });
      return createJsonResponse({ status: 'success', message: 'Attendance recorded' });
    }
    
    if (action === 'saveParticipant') {
      const p = contents.participant;
      const sheet = ss.getSheetByName('Participants');
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == p.id) {
          rowIndex = i + 1;
          break;
        }
      }
      
      const row = [
        p.id || ('PAS-' + Utilities.getUuid().slice(0, 8)),
        p.registration_number || '',
        p.name || '',
        p.nickname || '',
        p.gender || 'L',
        p.school || '',
        p.class || '',
        p.birth_date || '',
        p.phone || '',
        p.height || 0,
        p.weight || 0,
        p.status || 'DEVELOPING',
        p.photo || '',
        p.visus || '6/6',
        p.leg_shape || 'Normal',
        p.notes || '',
        new Date().toISOString()
      ];
      
      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
      } else {
        sheet.appendRow(row);
      }
      return createJsonResponse({ status: 'success', id: row[0] });
    }
    
    if (action === 'saveScore') {
      const s = contents.score;
      const sheet = ss.getSheetByName('AssessmentScores');
      sheet.appendRow([
        'SCR-' + Utilities.getUuid().slice(0, 8),
        s.assessment_id,
        s.participant_id,
        s.category,
        s.indicator,
        s.raw_metric || '',
        s.score || 0,
        s.strength || '',
        s.weakness || '',
        s.recommendation || '',
        new Date().toISOString()
      ]);
      return createJsonResponse({ status: 'success' });
    }
    
    if (action === 'saveCoachNote') {
      const n = contents.note;
      const sheet = ss.getSheetByName('CoachNotes');
      sheet.appendRow([
        'NOT-' + Utilities.getUuid().slice(0, 8),
        new Date().toISOString(),
        n.participant_id,
        n.category,
        n.note,
        n.priority || 'SEDANG'
      ]);
      return createJsonResponse({ status: 'success' });
    }
    
    return createJsonResponse({ status: 'error', message: 'Unknown action: ' + action });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheetData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0];
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[i][j];
    }
    rows.push(row);
  }
  return rows;
}

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const sheetsToCreate = {
    'Participants': [
      'id', 'registration_number', 'name', 'nickname', 'gender', 'school', 'class',
      'birth_date', 'phone', 'height', 'weight', 'status', 'photo', 'visus', 'leg_shape', 'notes', 'updated_at'
    ],
    'TrainingSessions': [
      'id', 'date', 'title', 'category', 'location', 'start_time', 'end_time', 'target', 'description', 'coach_notes'
    ],
    'Attendance': [
      'id', 'training_id', 'participant_id', 'status', 'check_in', 'notes'
    ],
    'Assessments': [
      'id', 'name', 'date', 'type', 'description', 'total_score', 'weight'
    ],
    'AssessmentScores': [
      'id', 'assessment_id', 'participant_id', 'category', 'indicator', 'raw_metric', 'score', 'strength', 'weakness', 'recommendation', 'created_at'
    ],
    'CoachNotes': [
      'id', 'date', 'participant_id', 'category', 'note', 'priority'
    ],
    'Settings': [
      'key', 'value', 'description'
    ]
  };
  
  for (const sheetName in sheetsToCreate) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    sheet.clear();
    sheet.appendRow(sheetsToCreate[sheetName]);
    const headerRange = sheet.getRange(1, 1, 1, sheetsToCreate[sheetName].length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#FDE047');
  }
  
  const settingsSheet = ss.getSheetByName('Settings');
  settingsSheet.appendRow(['weight_pbb', '25', 'Bobot PBB (%)']);
  settingsSheet.appendRow(['weight_samapta', '25', 'Bobot Kesamaptaan Fisik (%)']);
  settingsSheet.appendRow(['weight_postur', '15', 'Bobot Postur & Penampilan (%)']);
  settingsSheet.appendRow(['weight_disiplin', '15', 'Bobot Kepribadian & Kedisiplinan (%)']);
  settingsSheet.appendRow(['weight_mental', '10', 'Bobot Mental & Kepemimpinan (%)']);
  settingsSheet.appendRow(['weight_wawasan', '10', 'Bobot Wawasan Kebangsaan (%)']);
}

// Copy of the Apps Script project "ADA_script" (web app behind WEB_APP_URL in app.js).
// Paste this whole file into Code.gs, then Deploy > Manage deployments > edit >
// Version: New version > Deploy (keeps the same URL).

const SHEET_NAME = "answers";
const RESTROOM_SHEET = "restroom_list";
const INSPECTIONS_SHEET = "inspections";
const RESTROOM_FIELDS = { floor: 1, type: 2, room: 3, done: 4, notes: 5 }; // columns A..E
const ANSWER_HEADERS = [
  "Timestamp", "InspectionID", "Floor", "Room", "Restroom Type", "Code", "Section",
  "Question", "Answer", "Recommendation", "Notes", "InspectionDate"
];
// Submissions for the same room closer together than this belong to one "session".
const SESSION_GAP_MS = 5 * 60 * 1000;


// ---------- Web app entry points ----------

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Restroom list edits send an object; inspection submits send an array.
    if (!Array.isArray(data)) return restroomPost_(data);

    return submitInspection_(data);
  } catch (err) {
    return json_({ status: "error", message: err.toString() });
  }
}

function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === 'restroomList') return restroomList_();
  if (action === 'restroomData') return restroomData_();
  if (action === 'rebuildInspections') {
    writeInspectionsTab_(analyze_());
    return json_({ ok: true });
  }
  return ContentService.createTextOutput('ok');
}


// ---------- Survey submit (idempotent, one write) ----------

function submitInspection_(data) {
  if (!data.length) return json_({ status: "error", message: "Empty submission" });

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
    var id = String(data[0].inspectionId || '').trim();

    if (sheet.getLastRow() === 0) sheet.appendRow(ANSWER_HEADERS);

    // Same InspectionID already received (double tap / retry): ignore, don't duplicate.
    if (id && sheet.getLastRow() > 1) {
      var ids = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        if (String(ids[i][0]).trim() === id) {
          return json_({ status: "duplicate", reason: "already-received", inspectionId: id });
        }
      }
    }

    var rows = data.map(function (r) {
      return Object.keys(r).map(function (k) { return safeCell_(r[k]); });
    });
    var width = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
    rows = rows.map(function (r) { while (r.length < width) r.push(''); return r; });

    var start = sheet.getLastRow() + 1;
    if (width >= 12) sheet.getRange(start, 12, rows.length, 1).setNumberFormat('@'); // keep InspectionDate as text
    sheet.getRange(start, 1, rows.length, width).setValues(rows);
    SpreadsheetApp.flush();

    var flag = '';
    try {
      var res = analyze_();
      writeInspectionsTab_(res);
      var mine = res.list.filter(function (o) { return o.id === id; })[0];
      if (mine) flag = mine.status;
    } catch (err) {
      // the answers are saved; the summary tab can be rebuilt later
    }

    return json_({ status: "success", saved: rows.length, inspectionId: id, flag: flag });
  } finally {
    lock.releaseLock();
  }
}

// Strings that start with = would be evaluated as formulas.
function safeCell_(v) {
  if (typeof v === 'string' && /^[=]/.test(v)) return "'" + v;
  return v;
}


// ---------- Inspections analysis (duplicates / current / history) ----------

function normRoom_(v) {
  return String(v).replace(/^\s*WSC\s*/i, '').trim().toUpperCase();
}

function hash_(s) {
  var h = 5381;
  for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function readAnswers_() {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(SHEET_NAME);
  var v = sheet.getDataRange().getValues();
  var list = [], total = 0;
  if (v.length < 2) return { list: list, total: total };

  var h = v[0], idx = {};
  for (var i = 0; i < h.length; i++) idx[String(h[i]).trim()] = i;
  var tz = ss.getSpreadsheetTimeZone();

  var map = {};
  for (var r = 1; r < v.length; r++) {
    var row = v[r];
    var id = String(row[idx['InspectionID']] || '').trim();
    if (!id) continue;

    var o = map[id];
    if (!o) {
      var ts = row[idx['Timestamp']];
      var ms = ts instanceof Date ? ts.getTime() : Date.parse(String(ts));
      var d = idx['InspectionDate'] != null ? row[idx['InspectionDate']] : '';
      var date = d instanceof Date ? Utilities.formatDate(d, tz, 'yyyy-MM-dd') : String(d || '').trim();
      if (!date && ms) date = new Date(ms).toISOString().slice(0, 10);
      o = map[id] = {
        id: id, room: normRoom_(row[idx['Room']]), ms: ms || 0,
        submitted: ms ? new Date(ms).toISOString() : '', date: date,
        rows: 0, answered: 0, yes: 0, no: 0, na: 0, unsure: 0, _fp: []
      };
      list.push(o);
    }
    o.rows++;
    var a = String(row[idx['Answer']]).trim().toLowerCase();
    if (a === 'yes') { o.yes++; o.answered++; }
    else if (a === 'no') { o.no++; o.answered++; }
    else if (a === 'na' || a === 'n/a') { o.na++; o.answered++; }
    else if (a === 'unsure') { o.unsure++; }
    o._fp.push(String(row[idx['Code']]) + '|' + a);
  }

  list.forEach(function (o) {
    if (o.rows > total) total = o.rows;
    o.fp = hash_(o._fp.join(';'));
    delete o._fp;
  });
  return { list: list, total: total };
}

function readOverrides_() {
  var out = {};
  var sheet = SpreadsheetApp.getActive().getSheetByName(INSPECTIONS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return out;
  var h = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var iId = h.indexOf('InspectionID'), iOv = h.indexOf('Override');
  if (iId < 0 || iOv < 0) return out;
  sheet.getRange(2, 1, sheet.getLastRow() - 1, h.length).getValues().forEach(function (r) {
    var ov = String(r[iOv]).trim().toLowerCase();
    if (ov === 'current' || ov === 'ignore') out[String(r[iId]).trim()] = ov;
  });
  return out;
}

// Statuses: Current (the one that counts), Previous (older inspection kept as history),
// Superseded (replaced inside the same session), Duplicate (same answers sent again),
// Ignored (set manually).
function analyze_() {
  var data = readAnswers_();
  var overrides = readOverrides_();
  var byRoom = {};

  data.list.forEach(function (o) {
    o.override = overrides[o.id] || '';
    o.status = '';
    o.note = '';
    (byRoom[o.room] = byRoom[o.room] || []).push(o);
  });

  Object.keys(byRoom).forEach(function (room) {
    var list = byRoom[room].sort(function (a, b) { return a.ms - b.ms; });
    var live = [];
    list.forEach(function (o) {
      if (o.override === 'ignore') { o.status = 'Ignored'; o.note = 'Ignored manually'; }
      else live.push(o);
    });

    var sessions = [], cur = null;
    live.forEach(function (o) {
      if (!cur || o.ms - cur[cur.length - 1].ms > SESSION_GAP_MS) { cur = []; sessions.push(cur); }
      cur.push(o);
    });

    var winners = [];
    sessions.forEach(function (s) {
      var seen = {}, distinct = [];
      s.forEach(function (o) {
        if (seen[o.fp]) {
          o.status = 'Duplicate';
          o.note = 'Same answers as ' + seen[o.fp].id.slice(0, 8) + ' sent moments before';
        } else {
          seen[o.fp] = o;
          distinct.push(o);
        }
      });
      var best = distinct[0];
      distinct.forEach(function (o) {
        if (o.answered > best.answered || (o.answered === best.answered && o.ms >= best.ms)) best = o;
      });
      distinct.forEach(function (o) {
        if (o !== best) { o.status = 'Superseded'; o.note = 'Replaced by a more complete or later submission in the same session'; }
      });
      winners.push(best);
    });

    // Current = the most recent session whose inspection is complete (no blank answers).
    // If none is complete, the most recent one.
    var pick = winners[winners.length - 1];
    for (var j = winners.length - 1; j >= 0; j--) {
      if (data.total - winners[j].answered - winners[j].unsure <= 0) { pick = winners[j]; break; }
    }
    winners.forEach(function (w) {
      w.status = w === pick ? 'Current' : 'Previous';
      w.note = w === pick ? '' : (w.ms > pick.ms ? 'Newer but incomplete (kept as history)' : 'Earlier inspection (history)');
    });

    var forced = live.filter(function (o) { return o.override === 'current'; }).pop();
    if (forced) {
      live.forEach(function (o) { if (o.status === 'Current') { o.status = 'Previous'; o.note = 'Earlier inspection (history)'; } });
      forced.status = 'Current';
      forced.note = 'Chosen manually';
    }
  });

  return data;
}

function writeInspectionsTab_(res) {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(INSPECTIONS_SHEET) || ss.insertSheet(INSPECTIONS_SHEET);
  var header = ['InspectionID', 'Room', 'InspectionDate', 'Submitted', 'Answered', 'Yes', 'No', 'N/A',
    'Not sure', 'Questions', 'Status', 'Override', 'Note'];

  var list = res.list.slice().sort(function (a, b) {
    return a.room < b.room ? -1 : a.room > b.room ? 1 : a.ms - b.ms;
  });
  var rows = list.map(function (o) {
    return [o.id, o.room, o.date, o.submitted, o.answered, o.yes, o.no, o.na, o.unsure, o.rows,
      o.status, o.override, o.note];
  });

  sheet.clear();
  sheet.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  if (rows.length) {
    sheet.getRange(2, 2, rows.length, 3).setNumberFormat('@');
    sheet.getRange(2, 1, rows.length, header.length).setValues(rows);
  }
}

// Progress per room taken from its Current inspection, plus the history of rooms
// that were inspected more than once.
function progressByRoom_() {
  var res = analyze_();
  var rooms = {};

  res.list.forEach(function (o) {
    var r = rooms[o.room] || (rooms[o.room] = {
      room: o.room, inspections: 0, hasCurrent: false, answered: 0, yes: 0, no: 0, na: 0, unsure: 0,
      last: '', date: '', currentId: ''
    });
    r.inspections++;
    if (o.status === 'Current') {
      r.hasCurrent = true;
      r.answered = o.answered; r.yes = o.yes; r.no = o.no; r.na = o.na; r.unsure = o.unsure;
      r.last = o.submitted; r.date = o.date; r.currentId = o.id;
    }
  });

  var history = res.list
    .filter(function (o) { return rooms[o.room].inspections > 1; })
    .sort(function (a, b) { return a.room < b.room ? -1 : a.room > b.room ? 1 : a.ms - b.ms; })
    .map(function (o) {
      return {
        id: o.id, room: o.room, date: o.date, submitted: o.submitted, answered: o.answered,
        yes: o.yes, no: o.no, na: o.na, unsure: o.unsure, status: o.status, note: o.note, override: o.override
      };
    });

  return {
    total: res.total,
    rooms: Object.keys(rooms).map(function (k) { return rooms[k]; }),
    inspections: history
  };
}

function setInspectionOverride_(data) {
  var value = String(data.override || '').toLowerCase();
  if (['current', 'ignore', ''].indexOf(value) < 0) return json_({ ok: false, error: 'Bad override' });

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = SpreadsheetApp.getActive().getSheetByName(INSPECTIONS_SHEET);
    if (!sheet) { writeInspectionsTab_(analyze_()); sheet = SpreadsheetApp.getActive().getSheetByName(INSPECTIONS_SHEET); }
    var h = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var iId = h.indexOf('InspectionID'), iOv = h.indexOf('Override');
    var ids = sheet.getRange(2, iId + 1, Math.max(sheet.getLastRow() - 1, 1), 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === String(data.inspectionId)) {
        sheet.getRange(i + 2, iOv + 1).setValue(value);
        writeInspectionsTab_(analyze_());
        return json_({ ok: true });
      }
    }
    return json_({ ok: false, error: 'Inspection not found' });
  } finally {
    lock.releaseLock();
  }
}


// ---------- Restroom list endpoints ----------

function restroomList_() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(RESTROOM_SHEET);
  var values = sheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var v = values[i];
    if (String(v[2]).trim() === '' && String(v[1]).trim() === '') continue;
    rows.push({
      row: i + 1,
      floor: String(v[0]),
      type: String(v[1]),
      room: String(v[2]),
      done: String(v[3]),
      notes: String(v[4])
    });
  }
  return json_({ ok: true, rows: rows });
}

function restroomData_() {
  var rows = JSON.parse(restroomList_().getContent()).rows;
  return json_({ ok: true, rows: rows, progress: progressByRoom_() });
}

function restroomPost_(data) {
  try {
    if (data.action === 'addRestroom') return addRestroom_(data);
    if (data.action === 'setInspectionOverride') return setInspectionOverride_(data);
    if (data.action !== 'updateRestroom') return json_({ ok: false, error: 'Unknown action' });

    var col = RESTROOM_FIELDS[data.field];
    if (!col) return json_({ ok: false, error: 'Unknown field' });

    var sheet = SpreadsheetApp.getActive().getSheetByName(RESTROOM_SHEET);
    var row = Number(data.row);
    if (!(row >= 2 && row <= sheet.getLastRow())) {
      return json_({ ok: false, error: 'Row out of range' });
    }

    var currentRoom = String(sheet.getRange(row, RESTROOM_FIELDS.room).getValue());
    if (currentRoom !== String(data.expectedRoom)) {
      return json_({ ok: false, error: 'Row changed in the sheet. Reload the list.' });
    }

    var cell = sheet.getRange(row, col);
    if (data.field === 'room') cell.setNumberFormat('@');
    cell.setValue(safeCell_(data.value));

    var cat = sheet.getRange(row, 6);
    if (!cat.getFormula()) cat.setFormula('=IF(A' + row + '="","","Floor "&A' + row + ')');

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function addRestroom_(data) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = SpreadsheetApp.getActive().getSheetByName(RESTROOM_SHEET);
    var room = String(data.room || '').trim();
    var type = String(data.type || '').trim();
    if (!room || !type) return json_({ ok: false, error: 'Room and type are required' });

    var existing = sheet.getRange(2, RESTROOM_FIELDS.room, Math.max(sheet.getLastRow() - 1, 1), 1).getValues();
    for (var i = 0; i < existing.length; i++) {
      if (String(existing[i][0]).trim().toUpperCase() === room.toUpperCase()) {
        return json_({ ok: false, error: 'Room already exists' });
      }
    }

    var row = sheet.getLastRow() + 1;
    sheet.getRange(row, RESTROOM_FIELDS.room).setNumberFormat('@');
    sheet.getRange(row, 1, 1, 5).setValues([[String(data.floor || ''), safeCell_(type), safeCell_(room), '', safeCell_(String(data.notes || ''))]]);
    sheet.getRange(row, 6).setFormula('=IF(A' + row + '="","","Floor "&A' + row + ')');
    return json_({ ok: true, row: row });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

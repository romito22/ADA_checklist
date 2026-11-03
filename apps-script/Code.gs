// Copy of the Apps Script project "ADA_script" (web app behind WEB_APP_URL in app.js).
// Paste this whole file into Code.gs, then Deploy > Manage deployments > edit >
// Version: New version > Deploy (keeps the same URL).

const SHEET_NAME = "answers"; // cambia si tu hoja tiene otro nombre

function doPost(e) {
  try {

    // Parse incoming data
    const data = JSON.parse(e.postData.contents);

    // Restroom list edits send an object; inspection submits send an array.
    if (!Array.isArray(data)) return restroomPost_(data);

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    // If sheet empty, add headers automatically
    if (sheet.getLastRow() === 0 && data.length > 0) {
      const headers = Object.keys(data[0]);
      sheet.appendRow(headers);
    }

    // Append each row
    data.forEach(row => {
      sheet.appendRow(Object.values(row));
    });

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "error",
        message: err.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


// ---------- Restroom list endpoints ----------

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'restroomList') return restroomList_();
  if (e && e.parameter && e.parameter.action === 'restroomData') return restroomData_();
  return ContentService.createTextOutput('ok');
}

var RESTROOM_SHEET = 'restroom_list';
var RESTROOM_FIELDS = { floor: 1, type: 2, room: 3, done: 4, notes: 5 }; // columns A..E

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

function restroomPost_(data) {
  try {
    if (data.action === 'addRestroom') return addRestroom_(data);
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
    cell.setValue(data.value);

    var cat = sheet.getRange(row, 6);
    if (!cat.getFormula()) cat.setFormula('=IF(A' + row + '="","","Floor "&A' + row + ')');

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


// ---------- Restroom dashboard: progress + add ----------

function normRoom_(v) {
  return String(v).replace(/^\s*WSC\s*/i, '').trim();
}

function restroomData_() {
  var rows = JSON.parse(restroomList_().getContent()).rows;
  return json_({ ok: true, rows: rows, progress: progressByRoom_() });
}

// Progress per room, taken from the most complete inspection of each room.
function progressByRoom_() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  var v = sheet.getDataRange().getValues();
  var h = v[0], idx = {};
  for (var i = 0; i < h.length; i++) idx[String(h[i]).trim()] = i;

  var inspections = {};
  for (var r = 1; r < v.length; r++) {
    var row = v[r];
    var id = row[idx['InspectionID']];
    if (!id) continue;
    var ts = row[idx['Timestamp']];
    var o = inspections[id];
    if (!o) {
      o = inspections[id] = {
        room: normRoom_(row[idx['Room']]),
        ts: ts instanceof Date ? ts.toISOString() : String(ts),
        rows: 0, answered: 0, yes: 0, no: 0, na: 0
      };
    }
    o.rows++;
    var a = String(row[idx['Answer']]).trim().toLowerCase();
    if (a) {
      o.answered++;
      if (a === 'yes') o.yes++;
      else if (a === 'no') o.no++;
      else if (a === 'na' || a === 'n/a') o.na++;
    }
  }

  var total = 0, rooms = {};
  for (var key in inspections) {
    var ins = inspections[key];
    if (ins.rows > total) total = ins.rows;
    var cur = rooms[ins.room];
    if (!cur) cur = rooms[ins.room] = { room: ins.room, inspections: 0, answered: -1, yes: 0, no: 0, na: 0, last: '' };
    cur.inspections++;
    if (ins.ts > cur.last) cur.last = ins.ts;
    if (ins.answered > cur.answered) {
      cur.answered = ins.answered; cur.yes = ins.yes; cur.no = ins.no; cur.na = ins.na;
    }
  }
  return { total: total, rooms: Object.keys(rooms).map(function (k) { return rooms[k]; }) };
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
    sheet.getRange(row, 1, 1, 5).setValues([[String(data.floor || ''), type, room, '', String(data.notes || '')]]);
    sheet.getRange(row, 6).setFormula('=IF(A' + row + '="","","Floor "&A' + row + ')');
    return json_({ ok: true, row: row });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

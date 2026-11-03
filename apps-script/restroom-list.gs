// ==========================
// Restroom list endpoints for the existing Apps Script web app.
//
// HOW TO INSTALL (in the Apps Script project attached to the ADA_checklist sheet):
//  1. Paste this whole file as a new script file (e.g. restroom-list.gs).
//  2. In your EXISTING doPost(e), right after you JSON.parse the body, add:
//
//        if (!Array.isArray(data)) return restroomPost_(data);
//
//     (inspection submits send an array; restroom edits send an object, so
//      the current Submit behaviour is untouched.)
//  3. If you do NOT already have a doGet, paste this one. If you do, add
//     the `if` line inside it:
//
//        function doGet(e) {
//          if (e.parameter.action === 'restroomList') return restroomList_();
//          return ContentService.createTextOutput('ok');
//        }
//
//  4. Deploy > Manage deployments > edit the existing deployment >
//     Version: New version > Deploy. (Keep the same URL.)
// ==========================

var RESTROOM_SHEET = 'restroom_list';
var RESTROOM_FIELDS = { floor: 1, type: 2, room: 3, done: 4, notes: 5 }; // columns A..E

function restroomList_() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(RESTROOM_SHEET);
  var values = sheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var v = values[i];
    if (String(v[2]).trim() === '' && String(v[1]).trim() === '') continue; // skip empty rows
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
    if (data.action !== 'updateRestroom') return json_({ ok: false, error: 'Unknown action' });

    var col = RESTROOM_FIELDS[data.field];
    if (!col) return json_({ ok: false, error: 'Unknown field' });

    var sheet = SpreadsheetApp.getActive().getSheetByName(RESTROOM_SHEET);
    var row = Number(data.row);
    if (!(row >= 2 && row <= sheet.getLastRow())) {
      return json_({ ok: false, error: 'Row out of range' });
    }

    // Guard against the sheet having been re-sorted/edited since the page loaded.
    var currentRoom = String(sheet.getRange(row, RESTROOM_FIELDS.room).getValue());
    if (currentRoom !== String(data.expectedRoom)) {
      return json_({ ok: false, error: 'Row changed in the sheet. Reload the list.' });
    }

    // Keep rooms like "1183A" or floors like "1" as text/number exactly as typed.
    var cell = sheet.getRange(row, col);
    if (data.field === 'room') cell.setNumberFormat('@');
    cell.setValue(data.value);

    // Make sure the Floor Category formula exists for this row.
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

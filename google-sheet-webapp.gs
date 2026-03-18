function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Scores');
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Scores');
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp', 'Group Number', 'Worksheet 1', 'Worksheet 2', 'Total Score']);
  }

  var groupNumber = (e.parameter.groupNumber || '').toString().trim();
  var worksheet1 = (e.parameter.worksheet1 || '').toString().trim();
  var worksheet2 = (e.parameter.worksheet2 || '').toString().trim();
  var totalScore = (e.parameter.totalScore || '').toString().trim();
  var timestamp = (e.parameter.timestamp || new Date().toISOString()).toString().trim();

  sheet.appendRow([timestamp, groupNumber, worksheet1, worksheet2, totalScore]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

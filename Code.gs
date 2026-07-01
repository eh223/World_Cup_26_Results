// =====================================================
// CONFIGURATION - EDIT ONLY THIS SECTION
// =====================================================
// Paste only the spreadsheet ID here, not the full Google Sheets URL.
// Example: const SPREADSHEET_ID = '1qfWV73gg20PFDuBllVcIj2YhNd9hSg1nndhsNdJ7FhQ';
const SPREADSHEET_ID = '1qfWV73gg20PFDuBllVcIj2YhNd9hSg1nndhsNdJ7FhQ';

// Sheet names used by the results website.
// Only change these if you rename tabs in the Google Sheet.
const SHEET_PREDICTIONS = 'Predictions';
const SHEET_SCOREBOARD = 'Scoreboard';
const SHEET_GAME_RESULTS = 'Game_Results';
const SHEET_MATCH_DATES = 'Match dates';
const SHEET_TEAMS = 'Teams';
const SHEET_SCORERS = 'Scorers';
const SHEET_BONUS = 'Bonus Qs';
// =====================================================

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const mode = params.mode || 'summary';
  const callback = params.callback;
  let payload;

  if (mode === 'person') {
    const name = params.name || '';
    payload = { generatedAt: new Date().toISOString(), person: name, sheet: getSheetValues_(name) };
  } else {
    payload = getSummary_();
  }

  const json = JSON.stringify(payload);
  const output = callback ? `${callback}(${json});` : json;
  return ContentService.createTextOutput(output)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}

function getSummary_() {
  return {
    generatedAt: new Date().toISOString(),
    predictions: getSheetValues_(SHEET_PREDICTIONS),
    scoreboard: getSheetValues_(SHEET_SCOREBOARD),
    gameResults: getSheetValues_(SHEET_GAME_RESULTS),
    matchDates: getSheetValues_(SHEET_MATCH_DATES),
    teams: getSheetValues_(SHEET_TEAMS),
    scorers: getSheetValues_(SHEET_SCORERS),
    bonus: getSheetValues_(SHEET_BONUS)
  };
}

function getSpreadsheet_() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.indexOf('PASTE_') === -1) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheetValues_(sheetName) {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const range = sheet.getDataRange();
  const values = range.getDisplayValues();
  return trimEmpty_(values);
}

function trimEmpty_(values) {
  let rows = values || [];
  while (rows.length && rows[rows.length - 1].every(v => String(v).trim() === '')) rows.pop();
  let lastCol = 0;
  rows.forEach(row => row.forEach((v, i) => {
    if (String(v).trim() !== '') lastCol = Math.max(lastCol, i + 1);
  }));
  return rows.map(row => row.slice(0, lastCol));
}

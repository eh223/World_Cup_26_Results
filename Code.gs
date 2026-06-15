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
    predictions: getSheetValues_('Predictions'),
    scoreboard: getSheetValues_('Scoreboard'),
    gameResults: getSheetValues_('Game_Results'),
    teams: getSheetValues_('Teams'),
    scorers: getSheetValues_('Scorers'),
    bonus: getSheetValues_('Bonus Qs')
  };
}

function getSheetValues_(sheetName) {
  https://docs.google.com/spreadsheets/d/1qfWV73gg20PFDuBllVcIj2YhNd9hSg1nndhsNdJ7FhQ/edit?gid=491008128#gid=491008128;
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

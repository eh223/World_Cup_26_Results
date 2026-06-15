// Paste your Google Apps Script /exec URL between the quotes.
// Example: const DATA_URL = 'https://script.google.com/macros/s/https://script.google.com/macros/s/AKfycbw0SJml5YcUY5IzaeFTDwQrNrL1JmuxGNTUch2y2NSQ43wfCImSUYBjkz2aJi1abauYZQ/exec';
const DATA_URL = 'https://script.google.com/macros/s/AKfycbw0SJml5YcUY5IzaeFTDwQrNrL1JmuxGNTUch2y2NSQ43wfCImSUYBjkz2aJi1abauYZQ/exec';

let STATE = { summary: null, predictionSections: [], participants: [] };

const $ = (id) => document.getElementById(id);
const clean = (v) => (v === null || v === undefined ? '' : String(v).trim());
const esc = (v) => clean(v).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function jsonp(params = {}) {
  return new Promise((resolve, reject) => {
    if (!DATA_URL || DATA_URL.includes('PASTE_')) {
      reject(new Error('DATA_URL is not configured yet.'));
      return;
    }
    const cb = 'wcData_' + Math.random().toString(36).slice(2);
    const script = document.createElement('script');
    const url = new URL(DATA_URL);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    url.searchParams.set('callback', cb);
    url.searchParams.set('_', Date.now());
    window[cb] = (data) => {
      resolve(data);
      delete window[cb];
      script.remove();
    };
    script.onerror = () => {
      delete window[cb];
      script.remove();
      reject(new Error('Could not load data from Google Apps Script.'));
    };
    script.src = url.toString();
    document.body.appendChild(script);
  });
}

function setStatus(text) { $('loadStatus').textContent = text; }

function cellContent(cell) {
  if (cell && typeof cell === 'object' && !Array.isArray(cell)) return cell.value ?? '';
  return cell;
}
function cellClass(cell, extra = '') {
  const classes = [];
  const value = cellContent(cell);
  if (typeof value === 'number' || /^-?\d+(\.\d+)?$/.test(clean(value))) classes.push('num');
  if (cell && typeof cell === 'object' && cell.className) classes.push(cell.className);
  if (extra) classes.push(extra);
  return classes.join(' ');
}
function buildTable(headers, rows, opts = {}) {
  const cls = opts.className || '';
  const rowClass = opts.rowClass || (() => '');
  const cellExtraClass = opts.cellClass || (() => '');
  return `<table class="${cls}"><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((row, rIdx) => `<tr class="${rowClass(row, rIdx)}">${row.map((cell, i) => {
    const klass = cellClass(cell, cellExtraClass(cell, i, row, rIdx));
    return `<td class="${klass}">${esc(cellContent(cell))}</td>`;
  }).join('')}</tr>`).join('')}</tbody></table>`;
}

function parseMatchDateLabel(label) {
  const m = clean(label).match(/^(\d+)(?:st|nd|rd|th)?\s*-\s*Match\s*(\d+)/i);
  if (!m) return { day: 999, match: 999 };
  return { day: Number(m[1]), match: Number(m[2]) };
}

function compareMatchOrder(a, b) {
  const ao = parseMatchDateLabel(a.dateLabel || a.orderLabel || '');
  const bo = parseMatchDateLabel(b.dateLabel || b.orderLabel || '');
  return ao.day - bo.day || ao.match - bo.match || (a.key || '').localeCompare(b.key || '');
}

function displayMatchLabel(item) {
  return item.dateLabel ? `${item.dateLabel} — ${item.label}` : item.label;
}

function actualResultsMap() {
  const table = trimTable(STATE.summary?.gameResults || []);
  const map = {};
  table.slice(1).forEach(r => {
    const key = clean(r[0]);
    if (!key) return;
    const match = clean(r[1]);
    const winner = clean(r[5]);
    const score = clean(r[6]);
    const firstGoals = clean(r[7]);
    const secondGoals = clean(r[8]);
    const complete = winner && winner !== 'N/A' && winner !== '-' && firstGoals !== '' && secondGoals !== '';
    map[key] = { key, match, winner, score, complete };
  });
  return map;
}

function predictionCell(value, row) {
  const actual = actualResultsMap()[row.key];
  if (!actual || !actual.complete || !clean(value)) return value;
  const correct = row.predictionType === 'score'
    ? clean(value) === actual.score
    : clean(value) === actual.winner;
  return { value, className: correct ? 'prediction-correct' : 'prediction-wrong' };
}

function latestCompletedMatch() {
  const actual = actualResultsMap();
  const resultRows = (STATE.predictionSections.find(s => s.id === 'results')?.rows || []);
  let latest = null;
  resultRows.forEach((row, idx) => {
    const a = actual[row.key];
    if (!a || !a.complete) return;
    latest = { ...row, idx, match: a.match || row.label };
  });
  return latest;
}

function renderUpdatedToInclude() {
  const latest = latestCompletedMatch();
  const el = $('lastIncluded');
  if (!el) return;
  el.textContent = latest ? `${latest.dateLabel || latest.key} — ${latest.match || latest.label}` : 'No completed matches yet';
}

function buildMatchPredictionsTable(headers, rows) {
  return `<table class="category-table match-order-table"><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((row, idx) => {
    const item = row.__item || {};
    const order = parseMatchDateLabel(item.dateLabel || '');
    const bandClass = Number.isFinite(order.day) && order.day % 2 === 0 ? 'date-band-a' : 'date-band-b';
    const prev = idx > 0 ? rows[idx - 1].__item : null;
    const dateStart = !prev || clean(prev.dateLabel) !== clean(item.dateLabel) ? ' date-start' : '';
    const cells = row.cells.map((cell, i) => `<td class="${cellClass(cell)}">${esc(cellContent(cell))}</td>`).join('');
    return `<tr class="${bandClass}${dateStart}">${cells}</tr>`;
  }).join('')}</tbody></table>`;
}

function rankLabels(board) {
  const counts = {};
  board.forEach(p => { counts[p.total] = (counts[p.total] || 0) + 1; });
  let currentRank = 0;
  let previousTotal = null;
  return board.map((p, i) => {
    if (p.total !== previousTotal) {
      currentRank = i + 1;
      previousTotal = p.total;
    }
    const medal = currentRank === 1 ? '🥇 ' : currentRank === 2 ? '🥈 ' : currentRank === 3 ? '🥉 ' : '';
    const tied = counts[p.total] > 1 ? '=' : '';
    return { name: p.name, label: `${medal}#${currentRank}${tied}` };
  });
}

function trimTable(table) {
  if (!Array.isArray(table)) return [];
  let rows = table.map(r => Array.isArray(r) ? r.map(clean) : []);
  while (rows.length && rows[rows.length - 1].every(v => !v)) rows.pop();
  let maxCol = 0;
  rows.forEach(r => r.forEach((v, i) => { if (v) maxCol = Math.max(maxCol, i + 1); }));
  return rows.map(r => r.slice(0, maxCol));
}

function parseScoreboard(table) {
  table = trimTable(table);
  const header = table[0] || [];
  const players = header.slice(1).filter(name => name && clean(name).toLowerCase() !== 'points');
  const rows = table.slice(1).filter(r => clean(r[0]));
  const totalRow = rows.find(r => clean(r[0]).toLowerCase() === 'total') || [];
  return players.map((name, idx) => {
    const col = idx + 1;
    const categories = rows.map(r => ({ category: r[0], points: Number(r[col]) || 0, raw: r[col] || '0' }));
    const total = Number(totalRow[col]) || categories.reduce((sum, r) => sum + (r.category.toLowerCase() === 'total' ? 0 : r.points), 0);
    return { name, total, categories };
  }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

function renderLeaderboard() {
  const board = parseScoreboard(STATE.summary.scoreboard || []);
  const q = clean($('leaderboardSearch').value).toLowerCase();
  const labels = Object.fromEntries(rankLabels(board).map(r => [r.name, r.label]));
  const filtered = board.filter(p => p.name.toLowerCase().includes(q));
  const headers = ['Rank', 'Player', 'Total'].concat((board[0]?.categories || []).filter(c => c.category.toLowerCase() !== 'total').map(c => c.category));
  const rows = filtered.map((p) => {
    const cat = p.categories.filter(c => c.category.toLowerCase() !== 'total').map(c => c.raw);
    return [labels[p.name] || '', p.name, p.total, ...cat];
  });
  $('leaderboardTable').innerHTML = buildTable(headers, rows, { className: 'leaderboard-table' });
}

function parsePredictions(table) {
  table = trimTable(table);
  const header = table[0] || [];
  const firstPlayerCol = header.findIndex(h => clean(h).toLowerCase() && clean(h).toLowerCase() !== 'name');
  const playerStart = firstPlayerCol >= 0 ? firstPlayerCol : 3;
  const participants = header.slice(playerStart).filter(Boolean);
  const rows = table.slice(1).filter(r => clean(r[1]) || clean(r[2]));
  const sections = [
    { id: 'results', title: 'Group match results', rows: [] },
    { id: 'scores', title: 'Score predictions', rows: [] },
    { id: 'group-ranks', title: 'Group finishing positions / Round of 32 picks', rows: [] },
    { id: 'r16', title: 'Last 16 picks', rows: [] },
    { id: 'r8', title: 'Quarter-finalists', rows: [] },
    { id: 'r4', title: 'Semi-finalists', rows: [] },
    { id: 'r2', title: 'Finalists', rows: [] },
    { id: 'winner', title: 'Winner', rows: [] },
    { id: 'team-goals', title: 'Goals: teams', rows: [] },
    { id: 'scorers', title: 'Goalscorers', rows: [] },
    { id: 'bonus', title: 'Bonus questions / sweepstake', rows: [] }
  ];
  const byId = Object.fromEntries(sections.map(s => [s.id, s]));
  const seenMatchCodes = {};
  const bonusNames = {
    bonus_first_knocked_out: 'First to get knocked out', bonus_minnow_furthest: 'Minnow to get furthest',
    bonus_red_card_team: 'Team to get a red card', bonus_england_penalty_miss: 'England player to miss a penalty',
    bonus_golden_glove: 'Golden Glove', bonus_elite_striker_fewest_goals: 'Elite striker with fewest goals',
    bonus_average_goals_per_game: 'Average goals per game', bonus_trump_truthsocial_posts: 'TruthSocial posts',
    sweepstakeTeam: 'Sweepstake team'
  };
  rows.forEach((r, originalIndex) => {
    const dateLabel = clean(r[0]);
    const key = clean(r[1]);
    const label = clean(r[2]) || key;
    const values = participants.map((p, i) => ({ person: p, value: clean(r[i + playerStart]) }));
    const item = { key, label, dateLabel, values, originalIndex };
    if (/^[A-L][1-6]$/i.test(key)) {
      seenMatchCodes[key] = (seenMatchCodes[key] || 0) + 1;
      const predictionType = seenMatchCodes[key] === 1 ? 'result' : 'score';
      byId[predictionType === 'result' ? 'results' : 'scores'].rows.push({ ...item, predictionType });
    } else if (['R16','R8','R4','R2','RW'].includes(key)) {
      const map = { R16:'r16', R8:'r8', R4:'r4', R2:'r2', RW:'winner' };
      byId[map[key]].rows.push(item);
    } else if (['GF','GA'].includes(key)) {
      byId['team-goals'].rows.push({ ...item, label: key === 'GF' ? 'Most goals scored' : 'Most goals conceded' });
    } else if (key === 'S') {
      byId['scorers'].rows.push({ ...item, label: label.replace('players_', '').replace('_', ' ') });
    } else if (key.startsWith('bonus_') || key === 'sweepstakeTeam') {
      byId['bonus'].rows.push({ ...item, label: bonusNames[key] || key });
    } else if (key && !clean(r[2]) && r.slice(playerStart).some(Boolean)) {
      byId['group-ranks'].rows.push(item);
    }
  });
  byId.results.rows.sort(compareMatchOrder);
  byId.scores.rows.sort(compareMatchOrder);
  STATE.participants = participants;
  return sections.filter(s => s.rows.length);
}

function renderPerson() {
  const name = $('personSelect').value;
  const html = STATE.predictionSections.map(section => {
    const pairs = section.rows.map(row => {
      const val = row.values.find(v => v.person === name)?.value || '';
      if (!val) return '';
      const label = (section.id === 'results' || section.id === 'scores') ? displayMatchLabel(row) : row.label;
      const displayVal = (section.id === 'results' || section.id === 'scores') ? predictionCell(val, row) : val;
      return `<div class="kv"><b>${esc(label)}</b><span class="${cellClass(displayVal)}">${esc(cellContent(displayVal))}</span></div>`;
    }).filter(Boolean).join('');
    return pairs ? `<div class="group"><h3>${esc(section.title)}</h3><div class="prediction-card">${pairs}</div></div>` : '';
  }).join('');
  $('personPredictions').innerHTML = html || '<p class="muted">No predictions found.</p>';
}

function splitPicks(value) {
  return clean(value)
    .split(/[,;|\n]+/)
    .map(v => v.trim())
    .filter(Boolean);
}

function normalisePick(value) {
  return clean(value).toLowerCase().replace(/\s+/g, ' ');
}

function buildPickMatrixRows(rows) {
  const items = [];
  const seen = new Set();
  rows.forEach(row => {
    row.values.forEach(v => {
      splitPicks(v.value).forEach(item => {
        const key = normalisePick(item);
        if (!seen.has(key)) {
          seen.add(key);
          items.push(item);
        }
      });
    });
  });
  return items.sort((a, b) => a.localeCompare(b)).map(item => {
    const itemKey = normalisePick(item);
    return [item].concat(STATE.participants.map(person => {
      const picked = rows.some(row => {
        const value = row.values.find(v => v.person === person)?.value || '';
        return splitPicks(value).some(pick => normalisePick(pick) === itemKey);
      });
      return picked ? '✕' : '';
    }));
  });
}

function renderPickMatrix(section) {
  const headers = ['Pick'].concat(STATE.participants);

  if (section.id === 'team-goals') {
    const tables = section.rows.map(row => {
      const title = row.label || 'Team picks';
      const matrixRows = buildPickMatrixRows([row]);
      return `<div class="group"><h3>${esc(title)}</h3><div class="table-wrap sticky-first-col">${buildTable(headers, matrixRows, { className: 'category-table pick-matrix' })}</div></div>`;
    }).join('');
    return tables || '<p class="muted">No team goal picks found.</p>';
  }

  const matrixRows = buildPickMatrixRows(section.rows);
  return `<div class="table-wrap sticky-first-col">${buildTable(headers, matrixRows, { className: 'category-table pick-matrix' })}</div>`;
}

function renderCategory() {
  const id = $('categorySelect').value;
  const section = STATE.predictionSections.find(s => s.id === id);
  if (!section) return;
  if (id === 'team-goals' || id === 'scorers') {
    $('categoryPredictions').innerHTML = renderPickMatrix(section);
    return;
  }
  const headers = ['Prediction'].concat(STATE.participants);
  if (id === 'results' || id === 'scores') {
    const matchRows = section.rows.map(row => ({
      __item: row,
      cells: [displayMatchLabel(row)].concat(STATE.participants.map(p => predictionCell(row.values.find(v => v.person === p)?.value || '', row)))
    }));
    $('categoryPredictions').innerHTML = `<div class="table-wrap sticky-first-col">${buildMatchPredictionsTable(headers, matchRows)}</div>`;
    return;
  }
  const rows = section.rows.map(row => [row.label].concat(STATE.participants.map(p => row.values.find(v => v.person === p)?.value || '')));
  $('categoryPredictions').innerHTML = `<div class="table-wrap sticky-first-col">${buildTable(headers, rows, { className: 'category-table' })}</div>`;
}

function renderScoreDetail() {
  const name = $('scorePersonSelect').value;
  const board = parseScoreboard(STATE.summary.scoreboard || []);
  const player = board.find(p => p.name === name);
  if (player) {
    $('scoreSummary').innerHTML = `<div class="cards"><div class="score-card"><h3>${esc(name)}</h3><strong>${player.total}</strong><p class="muted">total points</p></div>${player.categories.filter(c => c.category.toLowerCase() !== 'total').map(c => `<div class="score-card"><h3>${esc(c.category)}</h3><strong>${esc(c.raw)}</strong></div>`).join('')}</div>`;
  }
  $('personScoreDetail').innerHTML = '<p class="muted">Loading individual scoring sheet…</p>';
  jsonp({ mode: 'person', name }).then(data => {
    const table = trimTable(data.sheet || []);
    const rows = table.filter(r => r.some(Boolean)).slice(0, 250);
    if (!rows.length) { $('personScoreDetail').innerHTML = '<p class="muted">No individual sheet found.</p>'; return; }
    const maxCols = Math.min(16, Math.max(...rows.map(r => r.length)));
    const headers = rows[1]?.slice(0, maxCols).some(Boolean) ? rows[1].slice(0, maxCols) : rows[0].slice(0, maxCols).map((_, i) => `Col ${i + 1}`);
    const body = rows.slice(2).map(r => r.slice(0, maxCols)).filter(r => r.some(Boolean));
    $('personScoreDetail').innerHTML = buildTable(headers, body);
  }).catch(err => { $('personScoreDetail').innerHTML = `<p class="notice">${esc(err.message)}</p>`; });
}

function renderRawSheet() {
  const key = $('rawSheetSelect').value;
  const table = trimTable(STATE.summary[key] || []);
  if (!table.length) { $('rawSheet').innerHTML = '<p class="muted">No data.</p>'; return; }
  const rows = table.filter(r => r.some(Boolean)).slice(0, 220);
  const maxCols = Math.min(22, Math.max(...rows.map(r => r.length)));
  const headers = rows[0].slice(0, maxCols).map((h, i) => h || `Col ${i + 1}`);
  $('rawSheet').innerHTML = buildTable(headers, rows.slice(1).map(r => r.slice(0, maxCols)));
}

function initTabs() {
  document.querySelectorAll('.tabs button').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    $(btn.dataset.tab).classList.add('active');
  }));
}

function initControls() {
  const peopleOptions = STATE.participants.map(p => `<option>${esc(p)}</option>`).join('');
  $('personSelect').innerHTML = peopleOptions;
  $('categorySelect').innerHTML = STATE.predictionSections.map(s => `<option value="${esc(s.id)}">${esc(s.title)}</option>`).join('');
  $('leaderboardSearch').addEventListener('input', renderLeaderboard);
  $('personSelect').addEventListener('change', renderPerson);
  $('categorySelect').addEventListener('change', renderCategory);
}

function boot() {
  initTabs();
  jsonp({ mode: 'summary' }).then(data => {
    STATE.summary = data;
    STATE.predictionSections = parsePredictions(data.predictions || []);
    $('lastUpdated').textContent = data.generatedAt ? new Date(data.generatedAt).toLocaleString() : 'Just now';
    renderUpdatedToInclude();
    $('playerCount').textContent = String(STATE.participants.length);
    setStatus('Live');
    initControls();
    renderLeaderboard(); renderPerson(); renderCategory();
  }).catch(err => {
    setStatus('Setup needed');
    $('setupWarning').hidden = false;
    $('setupWarning').innerHTML = `<strong>Data connection not ready.</strong> ${esc(err.message)} Open <code>app.js</code>, paste your Apps Script Web App /exec URL into <code>DATA_URL</code>, then upload it to GitHub.`;
  });
}

boot();

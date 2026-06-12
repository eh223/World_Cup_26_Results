// Paste your Google Apps Script /exec URL between the quotes.
// Example: const DATA_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
const DATA_URL = 'https://script.google.com/macros/s/AKfycbzZLAdfkbi59J7TYDZ06XTIgGnrLYpa2RVOfiSZK_073fpkLVEPM__p5kD5asvX2Mv9/exec';

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

function buildTable(headers, rows, opts = {}) {
  const cls = opts.className || '';
  return `<table class="${cls}"><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((cell, i) => `<td class="${typeof cell === 'number' || /^-?\d+(\.\d+)?$/.test(clean(cell)) ? 'num' : ''}">${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
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
  const players = header.slice(1).filter(Boolean);
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
  const filtered = board.filter(p => p.name.toLowerCase().includes(q));
  const headers = ['Rank', 'Player', 'Total'].concat((board[0]?.categories || []).filter(c => c.category.toLowerCase() !== 'total').map(c => c.category));
  const rows = filtered.map((p, i) => {
    const rank = board.findIndex(x => x.name === p.name) + 1;
    const cat = p.categories.filter(c => c.category.toLowerCase() !== 'total').map(c => c.raw);
    return [`#${rank}`, p.name, p.total, ...cat];
  });
  $('leaderboardTable').innerHTML = buildTable(headers, rows);
}

function parsePredictions(table) {
  table = trimTable(table);
  const header = table[0] || [];
  const participants = header.slice(2).filter(Boolean);
  const rows = table.slice(1).filter(r => clean(r[0]) || clean(r[1]));
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
  rows.forEach(r => {
    const key = clean(r[0]);
    const label = clean(r[1]) || key;
    const values = participants.map((p, i) => ({ person: p, value: clean(r[i + 2]) }));
    const item = { key, label, values };
    if (/^[A-L][1-6]$/i.test(key)) {
      seenMatchCodes[key] = (seenMatchCodes[key] || 0) + 1;
      byId[seenMatchCodes[key] === 1 ? 'results' : 'scores'].rows.push(item);
    } else if (['R16','R8','R4','R2','RW'].includes(key)) {
      const map = { R16:'r16', R8:'r8', R4:'r4', R2:'r2', RW:'winner' };
      byId[map[key]].rows.push(item);
    } else if (['GF','GA'].includes(key)) {
      byId['team-goals'].rows.push({ ...item, label: key === 'GF' ? 'Most goals scored' : 'Most goals conceded' });
    } else if (key === 'S') {
      byId['scorers'].rows.push({ ...item, label: label.replace('players_', '').replace('_', ' ') });
    } else if (key.startsWith('bonus_') || key === 'sweepstakeTeam') {
      byId['bonus'].rows.push({ ...item, label: bonusNames[key] || key });
    } else if (key && !clean(r[1]) && r.slice(2).some(Boolean)) {
      byId['group-ranks'].rows.push(item);
    }
  });
  STATE.participants = participants;
  return sections.filter(s => s.rows.length);
}

function renderPerson() {
  const name = $('personSelect').value;
  const html = STATE.predictionSections.map(section => {
    const pairs = section.rows.map(row => {
      const val = row.values.find(v => v.person === name)?.value || '';
      if (!val) return '';
      return `<div class="kv"><b>${esc(row.label)}</b><span>${esc(val)}</span></div>`;
    }).filter(Boolean).join('');
    return pairs ? `<div class="group"><h3>${esc(section.title)}</h3><div class="prediction-card">${pairs}</div></div>` : '';
  }).join('');
  $('personPredictions').innerHTML = html || '<p class="muted">No predictions found.</p>';
}

function renderCategory() {
  const id = $('categorySelect').value;
  const section = STATE.predictionSections.find(s => s.id === id);
  if (!section) return;
  const headers = ['Prediction'].concat(STATE.participants);
  const rows = section.rows.map(row => [row.label].concat(STATE.participants.map(p => row.values.find(v => v.person === p)?.value || '')));
  $('categoryPredictions').innerHTML = `<div class="table-wrap">${buildTable(headers, rows)}</div>`;
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
  $('scorePersonSelect').innerHTML = peopleOptions;
  $('categorySelect').innerHTML = STATE.predictionSections.map(s => `<option value="${esc(s.id)}">${esc(s.title)}</option>`).join('');
  const rawSheets = [ ['scoreboard','Scoreboard'], ['gameResults','Game results'], ['teams','Team summary'], ['scorers','Scorers summary'], ['bonus','Bonus questions'] ];
  $('rawSheetSelect').innerHTML = rawSheets.map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
  $('leaderboardSearch').addEventListener('input', renderLeaderboard);
  $('personSelect').addEventListener('change', renderPerson);
  $('categorySelect').addEventListener('change', renderCategory);
  $('scorePersonSelect').addEventListener('change', renderScoreDetail);
  $('rawSheetSelect').addEventListener('change', renderRawSheet);
}

function boot() {
  initTabs();
  jsonp({ mode: 'summary' }).then(data => {
    STATE.summary = data;
    STATE.predictionSections = parsePredictions(data.predictions || []);
    $('lastUpdated').textContent = data.generatedAt ? new Date(data.generatedAt).toLocaleString() : 'Just now';
    $('playerCount').textContent = String(STATE.participants.length);
    setStatus('Live');
    initControls();
    renderLeaderboard(); renderPerson(); renderCategory(); renderScoreDetail(); renderRawSheet();
  }).catch(err => {
    setStatus('Setup needed');
    $('setupWarning').hidden = false;
    $('setupWarning').innerHTML = `<strong>Data connection not ready.</strong> ${esc(err.message)} Open <code>app.js</code>, paste your Apps Script Web App /exec URL into <code>DATA_URL</code>, then upload it to GitHub.`;
  });
}

boot();

const state = {
  headers: [],
  rows: [],
  currentIndex: 0,
  inputs: [],
  isDirty: false,
};

const fieldsContainer = document.getElementById('fieldsContainer');
const statusMessage = document.getElementById('statusMessage');
const recordTitle = document.getElementById('recordTitle');
const recordId = document.getElementById('recordId');
const currentIndexEl = document.getElementById('currentIndex');
const totalCountEl = document.getElementById('totalCount');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const saveBtn = document.getElementById('saveBtn');
const downloadBtn = document.getElementById('downloadBtn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const jumpInput = document.getElementById('jumpInput');
const jumpBtn = document.getElementById('jumpBtn');
const fileInput = document.getElementById('fileInput');

function setStatus(message, type = 'muted') {
  const classes = { ok: 'status-ok', warning: 'status-warning', muted: '' };
  statusMessage.textContent = message;
  statusMessage.className = `helper ${classes[type] || ''}`.trim();
}

function parseCSV(text) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
    } else if ((char === '\n' || (char === '\r' && next === '\n')) && !inQuotes) {
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
      if (char === '\r' && next === '\n') i += 1;
    } else {
      current += char;
    }
    i += 1;
  }
  if (current.length || row.length) {
    row.push(current);
    rows.push(row);
  }
  return rows.filter(r => r.some(cell => cell !== ''));
}

function toCsvValue(value = '') {
  const needsQuotes = /[",\n]/.test(value);
  let escaped = value.replace(/"/g, '""');
  if (needsQuotes) {
    escaped = `"${escaped}"`;
  }
  return escaped;
}

function toCsvText(headers, rows) {
  const allRows = [headers, ...rows];
  return allRows.map(r => r.map(v => toCsvValue(v || '')).join(',')).join('\n');
}

function padRow(row, length) {
  const padded = row.slice();
  while (padded.length < length) padded.push('');
  return padded;
}

function buildForm(headers) {
  fieldsContainer.innerHTML = '';
  state.inputs = headers.map((header, idx) => {
    const labelText = header && header.trim() ? header : `Colonne ${idx + 1}`;
    const field = document.createElement('div');
    field.className = 'field';

    const label = document.createElement('label');
    label.textContent = labelText;
    label.setAttribute('for', `field-${idx}`);

    const control = document.createElement('textarea');
    control.id = `field-${idx}`;
    control.dataset.index = idx;

    control.addEventListener('input', () => {
      state.isDirty = true;
      saveBtn.disabled = false;
      setStatus('Modifications non enregistrées', 'warning');
    });

    field.appendChild(label);
    field.appendChild(control);
    fieldsContainer.appendChild(field);
    return control;
  });
}

function displayRecord(index) {
  const row = padRow(state.rows[index] || [], state.headers.length);
  state.inputs.forEach((input, idx) => {
    input.value = row[idx] || '';
  });

  const titleIdx = state.headers.findIndex(h => h.toLowerCase() === 'title');
  recordTitle.textContent = titleIdx >= 0 ? row[titleIdx] || 'Sans titre' : `Fiche ${index + 1}`;
  recordId.textContent = row[0] || `#${index + 1}`;

  currentIndexEl.textContent = index + 1;
  totalCountEl.textContent = state.rows.length;

  prevBtn.disabled = index <= 0;
  nextBtn.disabled = index >= state.rows.length - 1;
  saveBtn.disabled = !state.isDirty;
}

function persistCurrentRecord() {
  const row = padRow(state.rows[state.currentIndex] || [], state.headers.length);
  state.inputs.forEach(input => {
    const idx = Number(input.dataset.index);
    row[idx] = input.value;
  });
  state.rows[state.currentIndex] = row;
  state.isDirty = false;
  saveBtn.disabled = true;
  setStatus('Modifications enregistrées localement.', 'ok');
}

function goTo(index) {
  if (!state.rows.length) return;
  persistCurrentRecord();
  state.currentIndex = Math.min(Math.max(index, 0), state.rows.length - 1);
  displayRecord(state.currentIndex);
}

function findRecord(term) {
  const needle = term.trim().toLowerCase();
  if (!needle) return -1;
  return state.rows.findIndex(row => row.some(cell => (cell || '').toLowerCase().includes(needle)));
}

function loadData(rows) {
  if (!rows.length) {
    setStatus('Le CSV est vide ou invalide.', 'warning');
    return;
  }
  state.headers = rows[0];
  state.rows = rows.slice(1).map(r => padRow(r, state.headers.length));
  buildForm(state.headers);
  state.currentIndex = 0;
  displayRecord(0);
  setStatus('CSV chargé avec succès.');
}

async function loadDefaultCsv() {
  try {
    const response = await fetch('base_ehpad.csv');
    if (!response.ok) throw new Error(`Statut ${response.status}`);
    const text = await response.text();
    const rows = parseCSV(text);
    loadData(rows);
  } catch (err) {
    setStatus('Impossible de charger base_ehpad.csv. Importez un fichier via "Charger un CSV".', 'warning');
    console.error(err);
  }
}

prevBtn.addEventListener('click', () => goTo(state.currentIndex - 1));
nextBtn.addEventListener('click', () => goTo(state.currentIndex + 1));
saveBtn.addEventListener('click', persistCurrentRecord);

searchBtn.addEventListener('click', () => {
  if (!state.rows.length) return;
  persistCurrentRecord();
  const index = findRecord(searchInput.value);
  if (index >= 0) {
    goTo(index);
    setStatus(`Résultat trouvé à la fiche ${index + 1}.`, 'ok');
  } else {
    setStatus('Aucun résultat pour cette recherche.', 'warning');
  }
});

jumpBtn.addEventListener('click', () => {
  const value = Number(jumpInput.value);
  if (!value || value < 1 || value > state.rows.length) {
    setStatus('Numéro de fiche invalide.', 'warning');
    return;
  }
  goTo(value - 1);
});

fileInput.addEventListener('change', event => {
  const [file] = event.target.files;
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const rows = parseCSV(e.target.result);
    loadData(rows);
  };
  reader.readAsText(file, 'utf-8');
});

downloadBtn.addEventListener('click', () => {
  if (!state.rows.length) return;
  persistCurrentRecord();
  const csv = toCsvText(state.headers, state.rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'base_ehpad_modifie.csv';
  a.click();
  URL.revokeObjectURL(url);
});

window.addEventListener('beforeunload', event => {
  if (!state.isDirty) return;
  event.preventDefault();
  event.returnValue = '';
});

loadDefaultCsv();

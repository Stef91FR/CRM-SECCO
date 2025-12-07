const state = {
  headers: [],
  rows: [],
  currentIndex: 0,
  inputs: [],
  isDirty: false,
  departments: [],
  rowDepts: [],
  filters: {
    dept: '',
    terms: [],
    filteredIndexes: [],
    selectedResult: -1,
  },
};

const fieldsContainer = document.getElementById('fieldsContainer');
const statusMessage = document.getElementById('statusMessage');
const recordTitle = document.getElementById('recordTitle');
const recordId = document.getElementById('recordId');
const prospectOrgName = document.getElementById('prospectOrgName');
const prospectCity = document.getElementById('prospectCity');
const prospectPostcode = document.getElementById('prospectPostcode');
const prospectDept = document.getElementById('prospectDept');
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
const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
const tabContents = Array.from(document.querySelectorAll('.tab-content'));

const prospectionDate1 = document.getElementById('prospectionDate1');
const prospectionDate2 = document.getElementById('prospectionDate2');
const prospectionCommentaires = document.getElementById('prospectionCommentaires');
const saveProspectionBtn = document.getElementById('saveProspectionBtn');

const deptInput = document.getElementById('deptInput');
const deptOptions = document.getElementById('deptOptions');
const deptChips = document.getElementById('deptChips');
const clearDeptBtn = document.getElementById('clearDeptBtn');
const termInput = document.getElementById('termInput');
const addTermBtn = document.getElementById('addTermBtn');
const activeTerms = document.getElementById('activeTerms');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const filterStatus = document.getElementById('filterStatus');
const resultsTitle = document.getElementById('resultsTitle');
const resultsCount = document.getElementById('resultsCount');
const resultsTableBody = document.querySelector('#resultsTable tbody');
const resultsWrapper = document.getElementById('resultsWrapper');

function normalizeDeptCode(value = '') {
  if (!value) return '';
  const raw = String(value).trim().toUpperCase();
  const match = raw.match(/^0*(\d{2,3}|2A|2B)$/);
  return match ? match[1].replace(/^0+/, '') || match[1] : raw;
}

function deriveDeptFromPostcode(postcode = '') {
  const trimmed = String(postcode || '').trim();
  if (!trimmed) return '';
  if (/^(97|98)/.test(trimmed)) {
    return trimmed.slice(0, 3);
  }
  return trimmed.slice(0, 2);
}

function setStatus(message, type = 'muted') {
  const classes = { ok: 'status-ok', warning: 'status-warning', muted: '' };
  statusMessage.textContent = message;
  statusMessage.className = `helper ${classes[type] || ''}`.trim();
}

function switchTab(targetId) {
  tabButtons.forEach(btn => {
    const isActive = btn.dataset.tab === targetId;
    btn.classList.toggle('is-active', isActive);
  });
  tabContents.forEach(section => {
    const isActive = section.id === targetId;
    section.classList.toggle('is-active', isActive);
  });
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

function getColumnIndex(name) {
  return state.headers.findIndex(h => (h || '').toLowerCase() === name.toLowerCase());
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

function loadProspectionFields(row) {
  const idxDate1 = getColumnIndex('prospection.date1ercontact');
  const idxDate2 = getColumnIndex('prospection.daterappel');
  const idxComments = getColumnIndex('prospection.commentaires');

  prospectionDate1.value = idxDate1 >= 0 ? row[idxDate1] || '' : '';
  prospectionDate2.value = idxDate2 >= 0 ? row[idxDate2] || '' : '';
  prospectionCommentaires.value = idxComments >= 0 ? row[idxComments] || '' : '';
}

function updateProspectionContext(row, index) {
  const titleIdx = getColumnIndex('title');
  const cityIdx = getColumnIndex('city');
  const postcodeIdx = getColumnIndex('postcode');
  const deptIdx = getColumnIndex('coordinates.deptcode');

  const title = titleIdx >= 0 ? row[titleIdx] : '';
  const city = cityIdx >= 0 ? row[cityIdx] : '';
  const postcode = postcodeIdx >= 0 ? row[postcodeIdx] : '';
  const deptValue = deptIdx >= 0 ? normalizeDeptCode(row[deptIdx]) : '';
  const deptFallback = normalizeDeptCode(state.rowDepts[index] || deriveDeptFromPostcode(postcode));
  const dept = deptValue || deptFallback;

  prospectOrgName.textContent = title || 'Sans titre';
  prospectCity.textContent = city || 'Ville inconnue';
  prospectPostcode.textContent = postcode ? `CP ${postcode}` : 'Code postal manquant';
  prospectDept.textContent = dept || 'Département ?';
}

function displayRecord(index) {
  const row = padRow(state.rows[index] || [], state.headers.length);
  state.inputs.forEach((input, idx) => {
    input.value = row[idx] || '';
  });

  loadProspectionFields(row);
  updateProspectionContext(row, index);

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

function renderDeptChips(departments) {
  deptChips.innerHTML = '';
  departments.forEach(code => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip ${state.filters.dept === code ? 'is-active' : ''}`;
    chip.textContent = code;
    chip.addEventListener('click', () => {
      state.filters.dept = state.filters.dept === code ? '' : code;
      deptInput.value = state.filters.dept;
      renderDeptChips(departments);
      applyFilters();
    });
    deptChips.appendChild(chip);
  });
}

function buildDeptFilters() {
  const uniqueDepts = Array.from(new Set(state.rowDepts.filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));

  state.departments = uniqueDepts;

  deptOptions.innerHTML = '';
  state.departments.forEach(code => {
    const option = document.createElement('option');
    option.value = code;
    deptOptions.appendChild(option);
  });

  renderDeptChips(state.departments.slice(0, 30));
}

function renderActiveTerms() {
  activeTerms.innerHTML = '';
  if (!state.filters.terms.length) return;
  state.filters.terms.forEach(term => {
    const chip = document.createElement('span');
    chip.className = 'chip chip--closable';
    chip.textContent = term;
    const close = document.createElement('button');
    close.textContent = '×';
    close.addEventListener('click', () => {
      state.filters.terms = state.filters.terms.filter(t => t !== term);
      applyFilters();
      renderActiveTerms();
    });
    chip.appendChild(close);
    activeTerms.appendChild(chip);
  });
}

function formatResultText(count) {
  return `${count} ${count > 1 ? 'résultats' : 'résultat'}`;
}

function renderResultsTable() {
  resultsTableBody.innerHTML = '';
  const idIdx = getColumnIndex('_id');
  const nameIdx = getColumnIndex('title');
  const deptIdx = getColumnIndex('coordinates.deptcode');
  const cityIdx = getColumnIndex('coordinates.city');
  const capacityIdx = getColumnIndex('capacity');
  const phoneIdx = getColumnIndex('coordinates.phone');

  if (!state.filters.filteredIndexes.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.textContent = 'Aucun résultat pour ces critères.';
    row.appendChild(cell);
    resultsTableBody.appendChild(row);
    resultsTitle.textContent = 'Aucun EHPAD trouvé';
    resultsCount.textContent = formatResultText(0);
    return;
  }

  const selectedGlobalIndex = state.filters.filteredIndexes[state.filters.selectedResult] ?? -1;

  state.filters.filteredIndexes.forEach((rowIndex, displayIdx) => {
    const row = state.rows[rowIndex] || [];
    const tr = document.createElement('tr');
    if (rowIndex === selectedGlobalIndex) {
      tr.classList.add('is-selected');
    }
    tr.dataset.index = rowIndex;
    const cells = [idIdx, nameIdx, deptIdx, cityIdx, capacityIdx, phoneIdx].map(idx => (idx >= 0 ? row[idx] || '' : ''));
    cells.forEach(value => {
      const td = document.createElement('td');
      td.textContent = value;
      tr.appendChild(td);
    });

    tr.addEventListener('click', () => {
      state.filters.selectedResult = displayIdx;
      renderResultsTable();
      goTo(rowIndex);
      switchTab('ficheTab');
    });

    resultsTableBody.appendChild(tr);
  });

  resultsTitle.textContent = 'EHPAD filtrés';
  resultsCount.textContent = formatResultText(state.filters.filteredIndexes.length);
}

function applyFilters() {
  const targetDept = normalizeDeptCode(state.filters.dept);
  const terms = state.filters.terms.map(t => t.toLowerCase());
  let indexes = state.rows.map((_, i) => i);

  if (targetDept) {
    indexes = indexes.filter(i => state.rowDepts[i] === targetDept);
  }

  if (terms.length) {
    indexes = indexes.filter(i =>
      terms.every(term => state.rows[i].some(cell => (cell || '').toLowerCase().includes(term)))
    );
  }

  state.filters.filteredIndexes = indexes;
  state.filters.selectedResult = indexes.length ? 0 : -1;
  filterStatus.textContent = `${indexes.length} ligne${indexes.length > 1 ? 's' : ''} trouvée${indexes.length > 1 ? 's' : ''}`;
  renderResultsTable();
}

async function saveProspection() {
  const rowIndex = state.currentIndex;
  if (rowIndex == null || rowIndex < 0 || rowIndex >= state.rows.length) {
    setStatus('Aucune fiche sélectionnée.', 'warning');
    return;
  }

  const payload = {
    rowIndex,
    date1: prospectionDate1.value,
    date2: prospectionDate2.value,
    commentaires: prospectionCommentaires.value,
  };

  try {
    const response = await fetch('/api/updateProspection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) || {};

    if (response.ok && result.success) {
      const row = padRow(state.rows[rowIndex] || [], state.headers.length);
      const idxDate1 = getColumnIndex('prospection.date1ercontact');
      const idxDate2 = getColumnIndex('prospection.daterappel');
      const idxComments = getColumnIndex('prospection.commentaires');

      if (idxDate1 >= 0) {
        row[idxDate1] = payload.date1;
        if (state.inputs[idxDate1]) state.inputs[idxDate1].value = payload.date1;
      }
      if (idxDate2 >= 0) {
        row[idxDate2] = payload.date2;
        if (state.inputs[idxDate2]) state.inputs[idxDate2].value = payload.date2;
      }
      if (idxComments >= 0) {
        row[idxComments] = payload.commentaires;
        if (state.inputs[idxComments]) state.inputs[idxComments].value = payload.commentaires;
      }

      state.rows[rowIndex] = row;
      setStatus('Prospection mise à jour.', 'ok');
    } else {
      setStatus('Erreur mise à jour prospection.', 'warning');
    }
  } catch (err) {
    console.error(err);
    setStatus('Erreur réseau.', 'warning');
  }
}

function addSearchTerm() {
  const term = termInput.value.trim();
  if (!term) return;
  if (!state.filters.terms.includes(term)) {
    state.filters.terms.push(term);
    renderActiveTerms();
    applyFilters();
  }
  termInput.value = '';
}

function loadData(rows) {
  if (!rows.length) {
    setStatus('Le CSV est vide ou invalide.', 'warning');
    return;
  }
  state.headers = rows[0];
  state.rows = rows.slice(1).map(r => padRow(r, state.headers.length));
  const deptIndex = getColumnIndex('coordinates.deptcode');
  const postcodeIndex = getColumnIndex('coordinates.postcode');
  state.rowDepts = state.rows.map(row =>
    normalizeDeptCode(
      (deptIndex >= 0 ? row[deptIndex] : '') ||
        deriveDeptFromPostcode(postcodeIndex >= 0 ? row[postcodeIndex] : '')
    )
  );
  buildForm(state.headers);
  state.currentIndex = 0;
  displayRecord(0);
  state.filters.dept = '';
  state.filters.terms = [];
  renderActiveTerms();
  buildDeptFilters();
  applyFilters();
  setStatus('CSV chargé avec succès.');
}

async function loadDefaultCsv() {
  try {
    const apiResponse = await fetch('/api/readEhpad');
    if (!apiResponse.ok) throw new Error(`Statut API ${apiResponse.status}`);
    const payload = await apiResponse.json();
    const rows = Array.isArray(payload?.data) ? payload.data : [];
    if (!rows.length) throw new Error('Données Google Sheets vides');
    loadData(rows);
    setStatus('Données Google Sheets chargées.');
    return;
  } catch (apiErr) {
    console.warn('Lecture via /api/readEhpad impossible, tentative CSV local.', apiErr);
  }

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

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

saveProspectionBtn.addEventListener('click', saveProspection);

deptInput.addEventListener('input', () => {
  state.filters.dept = deptInput.value.trim();
  renderDeptChips(state.departments.slice(0, 30));
  applyFilters();
});

clearDeptBtn.addEventListener('click', () => {
  state.filters.dept = '';
  deptInput.value = '';
  renderDeptChips(state.departments.slice(0, 30));
  applyFilters();
});

addTermBtn.addEventListener('click', addSearchTerm);
termInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    addSearchTerm();
  }
});

resetFiltersBtn.addEventListener('click', () => {
  state.filters.dept = '';
  state.filters.terms = [];
  deptInput.value = '';
  termInput.value = '';
  renderDeptChips(state.departments.slice(0, 30));
  renderActiveTerms();
  applyFilters();
});

resultsWrapper.addEventListener('keydown', event => {
  if (!state.filters.filteredIndexes.length) return;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    state.filters.selectedResult = Math.min(
      state.filters.selectedResult + 1,
      state.filters.filteredIndexes.length - 1
    );
    renderResultsTable();
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    state.filters.selectedResult = Math.max(state.filters.selectedResult - 1, 0);
    renderResultsTable();
  }
  if (event.key === 'Enter' && state.filters.selectedResult >= 0) {
    const rowIndex = state.filters.filteredIndexes[state.filters.selectedResult];
    if (rowIndex != null) {
      goTo(rowIndex);
      switchTab('ficheTab');
    }
  }
});

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

const state = {
  headers: [],
  rows: [],
  currentIndex: 0,
  inputs: [],
  isDirty: false,
  departments: [],
  legalStatuses: [],
  deptRange: 'range1',
  rowDepts: [],
  filters: {
    dept: '',
    terms: [],
    statuses: [],
    filteredIndexes: [],
    selectedResult: -1,
  },
  prospection: {
    dept: '',
    date1Start: '',
    date1End: '',
    date2Start: '',
    date2End: '',
    commentTerm: '',
    statuses: [],
    filteredIndexes: [],
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
const prospectSubtabButtons = Array.from(document.querySelectorAll('[data-prospect-pane]'));
const prospectPanes = Array.from(document.querySelectorAll('.prospect-pane'));

const prospectionDate1 = document.getElementById('prospectionDate1');
const prospectionDate2 = document.getElementById('prospectionDate2');
const prospectionCommentaires = document.getElementById('prospectionCommentaires');
const saveProspectionBtn = document.getElementById('saveProspectionBtn');
const reminderShortcuts = Array.from(document.querySelectorAll('[data-reminder-offset]'));

const prospectDeptFilter = document.getElementById('prospectDeptFilter');
const prospectDeptOptions = document.getElementById('prospectDeptOptions');
const prospectClearDept = document.getElementById('prospectClearDept');
const prospectDate1Start = document.getElementById('prospectDate1Start');
const prospectDate1End = document.getElementById('prospectDate1End');
const prospectDate2Start = document.getElementById('prospectDate2Start');
const prospectDate2End = document.getElementById('prospectDate2End');
const prospectCommentSearch = document.getElementById('prospectCommentSearch');
const prospectResetFilters = document.getElementById('prospectResetFilters');
const prospectFilterStatus = document.getElementById('prospectFilterStatus');
const prospectResultsTitle = document.getElementById('prospectResultsTitle');
const prospectResultsCount = document.getElementById('prospectResultsCount');
const prospectResultsBody = document.querySelector('#prospectResultsTable tbody');
const prospectResultsWrapper = document.getElementById('prospectResultsWrapper');

const deptInput = document.getElementById('deptInput');
const deptOptions = document.getElementById('deptOptions');
const deptChips = document.getElementById('deptChips');
const deptRangeButtons = Array.from(document.querySelectorAll('.subtab-btn'));
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
const statusFilter = document.getElementById('statusFilter');
const prospectStatusFilter = document.getElementById('prospectStatusFilter');

function normalizeDeptCode(value = '') {
  if (!value) return '';
  const raw = String(value).trim().toUpperCase();
  const match = raw.match(/^0*(\d{2,3}|2A|2B)$/);
  return match ? match[1].replace(/^0+/, '') || match[1] : raw;
}

function sanitizeDeptCode(value = '') {
  const normalized = normalizeDeptCode(value);
  if (normalized === '0' || normalized === '13.5') return '';
  return normalized;
}

function toggleSelection(list, value, checked) {
  const next = list.filter(item => item !== value);
  if (checked && value) {
    next.push(value);
  }
  return next;
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

function switchProspectPane(targetId) {
  prospectSubtabButtons.forEach(btn => {
    const isActive = btn.dataset.prospectPane === targetId;
    btn.classList.toggle('is-active', isActive);
  });
  prospectPanes.forEach(pane => {
    const isActive = pane.id === targetId;
    pane.classList.toggle('is-active', isActive);
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

function parseDate(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isWithinRange(value, start, end) {
  const date = parseDate(value);
  if (!date) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

function formatDateInputValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const normalized = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return normalized.toISOString().slice(0, 10);
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
  const cityIdx = getColumnIndex('coordinates.city');
  const cityAltIdx = cityIdx < 0 ? getColumnIndex('city') : -1;
  const postcodeIdx = getColumnIndex('coordinates.postcode');
  const postcodeAltIdx = postcodeIdx < 0 ? getColumnIndex('postcode') : -1;
  const deptIdx = getColumnIndex('coordinates.deptcode');

  const title = titleIdx >= 0 ? row[titleIdx] : '';
  const city = cityIdx >= 0 ? row[cityIdx] : cityAltIdx >= 0 ? row[cityAltIdx] : '';
  const postcode = postcodeIdx >= 0 ? row[postcodeIdx] : postcodeAltIdx >= 0 ? row[postcodeAltIdx] : '';
  const deptValue = deptIdx >= 0 ? sanitizeDeptCode(row[deptIdx]) : '';
  const deptFallback = sanitizeDeptCode(state.rowDepts[index] || deriveDeptFromPostcode(postcode));
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

function renderStatusGroup(container, selectedList, onChange) {
  if (!container) return;
  container.innerHTML = '';

  if (!state.legalStatuses.length) {
    const span = document.createElement('span');
    span.className = 'muted';
    span.textContent = 'Aucun statut légal trouvé dans la feuille';
    container.appendChild(span);
    return;
  }

  state.legalStatuses.forEach(status => {
    const label = document.createElement('label');
    label.className = 'check-chip';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = status;
    input.checked = selectedList.includes(status);
    input.addEventListener('change', () => onChange(status, input.checked));

    const text = document.createElement('span');
    text.textContent = status;

    label.appendChild(input);
    label.appendChild(text);
    container.appendChild(label);
  });
}

function renderStatusFilters() {
  renderStatusGroup(statusFilter, state.filters.statuses, (status, checked) => {
    state.filters.statuses = toggleSelection(state.filters.statuses, status, checked);
    applyFilters();
    renderStatusFilters();
  });

  renderStatusGroup(prospectStatusFilter, state.prospection.statuses, (status, checked) => {
    state.prospection.statuses = toggleSelection(state.prospection.statuses, status, checked);
    applyProspectionFilters();
    renderStatusFilters();
  });
}

function refreshDeptChips() {
  renderDeptChips(filterDepartmentsByRange(state.deptRange));
}

function filterDepartmentsByRange(rangeId) {
  const ranges = {
    range1: [1, 33],
    range2: [34, 66],
    range3: [67, 98],
  };
  const [start, end] = ranges[rangeId] || ranges.range1;
  return state.departments.filter(code => {
    const numeric = parseInt(code, 10);
    if (!Number.isNaN(numeric)) {
      if (numeric >= 970 && numeric <= 989) {
        return rangeId === 'range3';
      }
      return numeric >= start && numeric <= end;
    }
    if (code === '2A' || code === '2B') {
      return start <= 2 && end >= 2;
    }
    return false;
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

  refreshDeptChips();
  populateProspectDeptOptions();
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
  const legalIdx = getColumnIndex('legal_status');
  const capacityIdx = getColumnIndex('capacity');
  const phoneIdx = getColumnIndex('coordinates.phone');

  if (!state.filters.filteredIndexes.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 7;
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
    const cells = [idIdx, nameIdx, deptIdx, legalIdx, cityIdx, capacityIdx, phoneIdx].map(idx =>
      idx >= 0 ? row[idx] || '' : ''
    );
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
  const targetDept = sanitizeDeptCode(state.filters.dept);
  const terms = state.filters.terms.map(t => t.toLowerCase());
  const legalIdx = getColumnIndex('legal_status');
  const statusFilters = state.filters.statuses.map(s => s.toLowerCase());
  let indexes = state.rows.map((_, i) => i);

  if (targetDept) {
    indexes = indexes.filter(i => state.rowDepts[i] === targetDept);
  }

  if (statusFilters.length) {
    if (legalIdx < 0) {
      indexes = [];
    } else {
      indexes = indexes.filter(i => statusFilters.includes(String(state.rows[i][legalIdx] || '').trim().toLowerCase()));
    }
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

function getProspectionFieldIndexes() {
  return {
    idxDate1: getColumnIndex('prospection.date1ercontact'),
    idxDate2: getColumnIndex('prospection.daterappel'),
    idxComments: getColumnIndex('prospection.commentaires'),
  };
}

function getActiveProspectionIndexes() {
  const { idxDate1, idxDate2, idxComments } = getProspectionFieldIndexes();
  if (idxDate1 < 0 && idxDate2 < 0 && idxComments < 0) return [];
  return state.rows
    .map((row, i) => ({ row, i }))
    .filter(({ row }) => {
      const values = [idxDate1, idxDate2, idxComments]
        .map(idx => (idx >= 0 ? row[idx] : ''))
        .filter(Boolean)
        .map(v => String(v).trim());
      return values.some(Boolean);
    })
    .map(item => item.i);
}

function populateProspectDeptOptions() {
  prospectDeptOptions.innerHTML = '';
  state.departments.forEach(code => {
    const option = document.createElement('option');
    option.value = code;
    prospectDeptOptions.appendChild(option);
  });
}

function renderProspectionResults() {
  prospectResultsBody.innerHTML = '';
  const indexes = state.prospection.filteredIndexes;
  const { idxDate1, idxDate2, idxComments } = getProspectionFieldIndexes();
  const nameIdx = getColumnIndex('title');
  const cityIdx = getColumnIndex('coordinates.city');
  const cityAltIdx = cityIdx < 0 ? getColumnIndex('city') : -1;
  const deptIdx = getColumnIndex('coordinates.deptcode');
  const postcodeIdx = getColumnIndex('coordinates.postcode');
  const legalIdx = getColumnIndex('legal_status');

  if (!indexes.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.textContent = 'Aucune prospection active pour ces critères.';
    row.appendChild(cell);
    prospectResultsBody.appendChild(row);
    prospectResultsTitle.textContent = 'Aucun résultat';
    prospectResultsCount.textContent = formatResultText(0);
    return;
  }

  indexes.forEach(rowIndex => {
    const row = state.rows[rowIndex] || [];
    const tr = document.createElement('tr');
    const deptValue = deptIdx >= 0 ? sanitizeDeptCode(row[deptIdx]) : sanitizeDeptCode(state.rowDepts[rowIndex]);
    const city = cityIdx >= 0 ? row[cityIdx] : cityAltIdx >= 0 ? row[cityAltIdx] : '';
    const legalStatus = legalIdx >= 0 ? row[legalIdx] || '' : '';

    const cells = [
      nameIdx >= 0 ? row[nameIdx] || '' : `Fiche ${rowIndex + 1}`,
      deptValue || deriveDeptFromPostcode(postcodeIdx >= 0 ? row[postcodeIdx] : ''),
      legalStatus,
      city || '',
      idxDate1 >= 0 ? row[idxDate1] || '' : '',
      idxDate2 >= 0 ? row[idxDate2] || '' : '',
      idxComments >= 0 ? row[idxComments] || '' : '',
    ];

    cells.forEach(value => {
      const td = document.createElement('td');
      td.textContent = value || '';
      tr.appendChild(td);
    });

    tr.addEventListener('click', () => {
      goTo(rowIndex);
      switchTab('prospectionTab');
      switchProspectPane('prospectEntryPane');
    });

    prospectResultsBody.appendChild(tr);
  });

  prospectResultsTitle.textContent = 'Prospections filtrées';
  prospectResultsCount.textContent = formatResultText(indexes.length);
}

function applyProspectionFilters() {
  const { idxDate1, idxDate2, idxComments } = getProspectionFieldIndexes();
  const legalIdx = getColumnIndex('legal_status');
  const baseIndexes = getActiveProspectionIndexes();
  const targetDept = sanitizeDeptCode(state.prospection.dept);
  const start1 = parseDate(state.prospection.date1Start);
  const end1 = parseDate(state.prospection.date1End);
  const start2 = parseDate(state.prospection.date2Start);
  const end2 = parseDate(state.prospection.date2End);
  const commentTerm = (state.prospection.commentTerm || '').toLowerCase();
  const statusFilters = state.prospection.statuses.map(s => s.toLowerCase());

  let indexes = baseIndexes;

  if (targetDept) {
    indexes = indexes.filter(i => state.rowDepts[i] === targetDept);
  }

  if (statusFilters.length) {
    if (legalIdx < 0) {
      indexes = [];
    } else {
      indexes = indexes.filter(i => statusFilters.includes(String(state.rows[i][legalIdx] || '').trim().toLowerCase()));
    }
  }

  if (start1 || end1) {
    indexes = indexes.filter(i => idxDate1 >= 0 && isWithinRange(state.rows[i][idxDate1], start1, end1));
  }

  if (start2 || end2) {
    indexes = indexes.filter(i => idxDate2 >= 0 && isWithinRange(state.rows[i][idxDate2], start2, end2));
  }

  if (commentTerm) {
    indexes = indexes.filter(i =>
      idxComments >= 0 && String(state.rows[i][idxComments] || '').toLowerCase().includes(commentTerm)
    );
  }

  state.prospection.filteredIndexes = indexes;
  prospectFilterStatus.textContent = `${indexes.length} prospection${indexes.length > 1 ? 's' : ''} active${
    indexes.length > 1 ? 's' : ''
  }`;
  renderProspectionResults();
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
      applyProspectionFilters();
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
  const legalIdx = getColumnIndex('legal_status');
  const statusSet = new Set();
  state.rowDepts = state.rows.map(row =>
    sanitizeDeptCode(
      (deptIndex >= 0 ? row[deptIndex] : '') ||
        deriveDeptFromPostcode(postcodeIndex >= 0 ? row[postcodeIndex] : '')
    )
  );
  if (legalIdx >= 0) {
    state.rows.forEach(row => {
      const value = String(row[legalIdx] || '').trim();
      if (value) statusSet.add(value);
    });
  }
  state.legalStatuses = Array.from(statusSet).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  buildForm(state.headers);
  state.currentIndex = 0;
  displayRecord(0);
  state.filters.dept = '';
  state.filters.terms = [];
  state.filters.statuses = [];
  state.prospection = {
    dept: '',
    date1Start: '',
    date1End: '',
    date2Start: '',
    date2End: '',
    commentTerm: '',
    statuses: [],
    filteredIndexes: [],
  };
  renderActiveTerms();
  buildDeptFilters();
  renderStatusFilters();
  applyFilters();
  applyProspectionFilters();
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

prospectSubtabButtons.forEach(btn => {
  btn.addEventListener('click', () => switchProspectPane(btn.dataset.prospectPane));
});

reminderShortcuts.forEach(btn => {
  btn.addEventListener('click', () => {
    const offset = Number(btn.dataset.reminderOffset);
    if (Number.isNaN(offset)) return;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + offset);
    prospectionDate2.value = formatDateInputValue(targetDate);
  });
});

saveProspectionBtn.addEventListener('click', saveProspection);

deptRangeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    state.deptRange = btn.dataset.range;
    deptRangeButtons.forEach(b => b.classList.toggle('is-active', b === btn));
    refreshDeptChips();
  });
});

deptInput.addEventListener('input', () => {
  state.filters.dept = deptInput.value.trim();
  refreshDeptChips();
  applyFilters();
});

clearDeptBtn.addEventListener('click', () => {
  state.filters.dept = '';
  deptInput.value = '';
  refreshDeptChips();
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
  state.filters.statuses = [];
  deptInput.value = '';
  termInput.value = '';
  refreshDeptChips();
  renderStatusFilters();
  renderActiveTerms();
  applyFilters();
});

prospectDeptFilter.addEventListener('input', () => {
  state.prospection.dept = prospectDeptFilter.value.trim();
  applyProspectionFilters();
});

prospectClearDept.addEventListener('click', () => {
  state.prospection.dept = '';
  prospectDeptFilter.value = '';
  applyProspectionFilters();
});

[prospectDate1Start, prospectDate1End, prospectDate2Start, prospectDate2End].forEach(input => {
  input.addEventListener('change', () => {
    state.prospection.date1Start = prospectDate1Start.value;
    state.prospection.date1End = prospectDate1End.value;
    state.prospection.date2Start = prospectDate2Start.value;
    state.prospection.date2End = prospectDate2End.value;
    applyProspectionFilters();
  });
});

prospectCommentSearch.addEventListener('input', () => {
  state.prospection.commentTerm = prospectCommentSearch.value.trim();
  applyProspectionFilters();
});

prospectResetFilters.addEventListener('click', () => {
  state.prospection = {
    ...state.prospection,
    dept: '',
    date1Start: '',
    date1End: '',
    date2Start: '',
    date2End: '',
    commentTerm: '',
    statuses: [],
  };
  prospectDeptFilter.value = '';
  prospectDate1Start.value = '';
  prospectDate1End.value = '';
  prospectDate2Start.value = '';
  prospectDate2End.value = '';
  prospectCommentSearch.value = '';
  renderStatusFilters();
  applyProspectionFilters();
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

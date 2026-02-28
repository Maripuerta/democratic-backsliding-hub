/* ===================================================
   Democratic Backsliding Tracker — app.js
   =================================================== */

const DATA_URL = 'data/countryData.json';

/* Country flag emojis by ISO-2 code */
const FLAGS = {
  AR:'🇦🇷', BO:'🇧🇴', BR:'🇧🇷', CL:'🇨🇱', CO:'🇨🇴',
  CR:'🇨🇷', CU:'🇨🇺', DO:'🇩🇴', EC:'🇪🇨', SV:'🇸🇻',
  GT:'🇬🇹', HN:'🇭🇳', MX:'🇲🇽', NI:'🇳🇮', PA:'🇵🇦',
  PY:'🇵🇾', PE:'🇵🇪', UY:'🇺🇾', VE:'🇻🇪',
};

/* Map status strings to CSS class names */
const STATUS_CLASS = {
  'stable':      'stable',
  'recovering':  'recovering',
  'at risk':     'at-risk',
  'backsliding': 'backsliding',
  'autocracy':   'autocracy',
};

/* ── State ── */
let allCountries = [];
let currentView = 'grid'; // 'grid' | 'table' | 'map'
let activeFilters = { status: 'all', sortBy: 'name', sortOrder: 'asc', search: '' };

/* ── Bootstrap ── */
async function init() {
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allCountries = data.countries;
    populateSummary(allCountries);
    initMap(allCountries);
    renderView();
    bindControls();
  } catch (err) {
    document.getElementById('countryGrid').innerHTML =
      `<p style="color:#b71c1c;padding:1rem">Failed to load data: ${err.message}</p>`;
  }
}

/* ── Summary bar ── */
function populateSummary(countries) {
  const counts = { stable: 0, recovering: 0, 'at risk': 0, backsliding: 0, autocracy: 0 };
  countries.forEach(c => {
    const s = (c.status_indicator || '').toLowerCase();
    if (counts[s] !== undefined) counts[s]++;
  });
  document.getElementById('countStable').textContent     = counts['stable'];
  document.getElementById('countRecovering').textContent = counts['recovering'];
  document.getElementById('countAtRisk').textContent     = counts['at risk'];
  document.getElementById('countBacksliding').textContent= counts['backsliding'];
  document.getElementById('countAutocracy').textContent  = counts['autocracy'];
}

/* ── Filtering & sorting ── */
function getFilteredSorted() {
  const { status, sortBy, sortOrder, search } = activeFilters;

  let list = allCountries.filter(c => {
    const matchStatus = status === 'all' || (c.status_indicator || '').toLowerCase() === status;
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  list.sort((a, b) => {
    let va, vb;
    if (sortBy === 'name')      { va = a.name; vb = b.name; }
    else if (sortBy === 'polyarchy') { va = a['V-Dem_polyarchy_index'] ?? -1; vb = b['V-Dem_polyarchy_index'] ?? -1; }
    else if (sortBy === 'libdem')    { va = a.libdem_index ?? -1;             vb = b.libdem_index ?? -1; }
    else if (sortBy === 'bti')       { va = a.BTI_governance_score ?? -1;     vb = b.BTI_governance_score ?? -1; }
    else if (sortBy === 'events')    { va = a.DEED_event_counts ?? 0;         vb = b.DEED_event_counts ?? 0; }
    else { va = a.name; vb = b.name; }

    if (typeof va === 'string') return sortOrder === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortOrder === 'asc' ? va - vb : vb - va;
  });

  return list;
}

/* ── Render dispatcher ── */
function renderView() {
  const countries = getFilteredSorted();
  if (currentView === 'grid') {
    renderGrid(countries);
  } else if (currentView === 'table') {
    renderTable(countries);
  } else if (currentView === 'map') {
    renderMapView();
  }
}

/* ── Grid ── */
function renderGrid(countries) {
  document.getElementById('countryGrid').classList.remove('hidden');
  document.getElementById('countryTableWrap').classList.add('hidden');
  document.getElementById('mapContainer').classList.add('hidden');

  const grid = document.getElementById('countryGrid');

  if (countries.length === 0) {
    grid.innerHTML = '<p style="padding:1rem;color:#666">No countries match your filters.</p>';
    return;
  }

  grid.innerHTML = countries.map(c => cardHTML(c)).join('');

  // Attach click handlers
  grid.querySelectorAll('.country-card').forEach(el => {
    el.addEventListener('click', () => {
      const name = el.dataset.name;
      const country = allCountries.find(c => c.name === name);
      if (country) openModal(country);
    });
  });

  // Animate bars after paint
  requestAnimationFrame(() => {
    grid.querySelectorAll('.mini-bar').forEach(bar => {
      bar.style.width = bar.dataset.target;
    });
  });
}

function cardHTML(c) {
  const statusKey  = (c.status_indicator || 'at risk').toLowerCase();
  const statusClass = STATUS_CLASS[statusKey] || 'at-risk';
  const badgeClass  = `badge-${statusClass}`;
  const poly = c['V-Dem_polyarchy_index'];
  const lib  = c.libdem_index;
  const bti  = c.BTI_governance_score;
  const ertCount = (c.ERT_episodes || []).length;
  const flag = FLAGS[c.iso2] || '🏳';

  return `
    <div class="country-card ${statusClass}" data-name="${c.name}" tabindex="0" role="button" aria-label="View details for ${c.name}">
      <div class="card-header">
        <span class="card-name">${flag} ${c.name}</span>
        <span class="status-badge ${badgeClass}">${c.status_indicator || 'unknown'}</span>
      </div>
      <div class="card-indicators">
        ${indicatorRow('Electoral Democracy', poly, 1)}
        ${indicatorRow('Liberal Democracy',   lib,  1)}
        ${indicatorRow('BTI Governance',      bti !== null ? bti / 10 : null, 1, bti !== null ? bti.toFixed(1) + '/10' : '—')}
      </div>
      <div class="card-footer">
        <span class="ert-badge">
          <strong>${ertCount}</strong> ERT episode${ertCount !== 1 ? 's' : ''}
        </span>
        <span>${c.DEED_event_counts} key event${c.DEED_event_counts !== 1 ? 's' : ''}</span>
      </div>
    </div>`;
}

function indicatorRow(label, value, max = 1, displayVal = null) {
  const pct    = value !== null && value !== undefined ? Math.round((value / max) * 100) : 0;
  const shown  = displayVal ?? (value !== null && value !== undefined ? value.toFixed(2) : '—');
  const color  = pct >= 65 ? 'bar-high' : pct >= 40 ? 'bar-mid' : 'bar-low';

  return `
    <div class="indicator-row">
      <span class="indicator-label">${label}</span>
      <div class="mini-bar-wrap">
        <div class="mini-bar ${color}" data-target="${pct}%" style="width:0"></div>
      </div>
      <span class="indicator-val">${shown}</span>
    </div>`;
}

/* ── Table ── */
function renderMapView() {
  document.getElementById('countryGrid').classList.add('hidden');
  document.getElementById('countryTableWrap').classList.add('hidden');
  document.getElementById('mapContainer').classList.remove('hidden');
  renderMap();
}

function renderTable(countries) {
  document.getElementById('countryGrid').classList.add('hidden');
  document.getElementById('countryTableWrap').classList.remove('hidden');
  document.getElementById('mapContainer').classList.add('hidden');

  const tbody = document.getElementById('countryTableBody');

  if (countries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="padding:1rem;color:#666">No countries match your filters.</td></tr>';
    return;
  }

  tbody.innerHTML = countries.map(c => {
    const statusKey   = (c.status_indicator || 'at risk').toLowerCase();
    const statusClass = STATUS_CLASS[statusKey] || 'at-risk';
    const badgeClass  = `badge-${statusClass}`;
    const poly = c['V-Dem_polyarchy_index'];
    const lib  = c.libdem_index;
    const bti  = c.BTI_governance_score;
    const flag = FLAGS[c.iso2] || '🏳';

    return `
      <tr data-name="${c.name}">
        <td><strong>${flag} ${c.name}</strong></td>
        <td><span class="status-badge ${badgeClass}">${c.status_indicator || '—'}</span></td>
        <td>${tableBar(poly, 1)}</td>
        <td>${tableBar(lib, 1)}</td>
        <td>${tableBar(bti, 10, bti !== null ? bti.toFixed(1) : '—')}</td>
        <td>${(c.ERT_episodes || []).length}</td>
        <td>${c.DEED_event_counts ?? 0}</td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', () => {
      const country = allCountries.find(c => c.name === row.dataset.name);
      if (country) openModal(country);
    });
  });

  // Animate table bars
  requestAnimationFrame(() => {
    tbody.querySelectorAll('.table-mini-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.target;
    });
  });
}

function tableBar(value, max = 1, displayVal = null) {
  const pct   = value !== null && value !== undefined ? Math.round((value / max) * 100) : 0;
  const shown = displayVal ?? (value !== null && value !== undefined ? value.toFixed(2) : '—');
  const color = pct >= 65 ? 'bar-high' : pct >= 40 ? 'bar-mid' : 'bar-low';
  return `
    <div class="table-bar-wrap">
      <div class="table-mini-bar">
        <div class="table-mini-bar-fill ${color}" data-target="${pct}%" style="width:0"></div>
      </div>
      <span>${shown}</span>
    </div>`;
}

/* ── Modal ── */
function openModal(country) {
  const overlay = document.getElementById('modalOverlay');
  const flag    = FLAGS[country.iso2] || '🏳';
  const statusKey   = (country.status_indicator || 'at risk').toLowerCase();
  const statusClass = STATUS_CLASS[statusKey] || 'at-risk';

  document.getElementById('modalFlag').textContent = flag;
  document.getElementById('modalTitle').textContent = country.name;

  const statusBadge = document.getElementById('modalStatus');
  statusBadge.textContent  = country.status_indicator || 'unknown';
  statusBadge.className    = `status-badge badge-${statusClass}`;

  // Score bars
  setModalBar('barPolyarchy', 'valPolyarchy', country['V-Dem_polyarchy_index'], 1);
  setModalBar('barLibdem',    'valLibdem',    country.libdem_index,              1);
  const btiNorm = country.BTI_governance_score !== null ? country.BTI_governance_score / 10 : null;
  setModalBar('barBti', 'valBti', btiNorm, 1,
    country.BTI_governance_score !== null ? country.BTI_governance_score.toFixed(1) + ' / 10' : '—');

  // ERT episodes
  const ertList = document.getElementById('ertList');
  const episodes = country.ERT_episodes || [];
  if (episodes.length === 0) {
    ertList.innerHTML = '<p class="no-episodes">No recorded regime transformation episodes.</p>';
  } else {
    ertList.innerHTML = episodes.map(ep => {
      const typeClass = (ep.type || '').toLowerCase().replace(/\s+/g, '-');
      const endLabel  = ep.end_year ? ep.end_year : 'ongoing';
      return `
        <div class="ert-episode ${typeClass}">
          <div class="ert-type">${ep.type}</div>
          <div class="ert-years">${ep.start_year} – ${endLabel}</div>
          <div class="ert-desc">${ep.description}</div>
        </div>`;
    }).join('');
  }

  // Recent events
  const eventsList = document.getElementById('eventsList');
  const events = country.recent_events || [];
  if (events.length === 0) {
    eventsList.innerHTML = '<li style="font-size:0.86rem;font-style:italic;color:#666">No recent events recorded.</li>';
  } else {
    eventsList.innerHTML = events.map(ev => `
      <li>
        <span class="event-year">${ev.year}</span>
        <span class="severity-dot ${ev.severity}"></span>
        <span>${ev.event}</span>
      </li>`).join('');
  }

  // Trend chart
  renderTrendChart(country);

  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Animate bars after paint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      animateModalBars();
    });
  });
}

/* ── Trend sparkline chart ── */
function renderTrendChart(country) {
  const container = document.getElementById('trendChart');
  const pts = country.polyarchy_trend;
  if (!pts || pts.length < 2) {
    container.innerHTML = '<p style="font-size:.86rem;font-style:italic;color:#666">No trend data available.</p>';
    return;
  }

  const W = 560, H = 120, PAD = { top: 10, right: 10, bottom: 22, left: 32 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top  - PAD.bottom;

  const years  = pts.map(p => p.year);
  const values = pts.map(p => p.value);
  const minY = 0, maxY = 1;
  const minX = years[0], maxX = years[years.length - 1];

  const xScale = y => PAD.left + ((y - minX) / (maxX - minX)) * iW;
  const yScale = v => PAD.top  + (1 - (v - minY) / (maxY - minY)) * iH;

  // Determine trend color: compare first half average to last value
  const midVal  = values[Math.floor(values.length / 2)];
  const lastVal = values[values.length - 1];
  const trendColor = lastVal >= midVal ? '#2e7d32' : '#b71c1c';

  // Build SVG path
  const linePts = pts.map(p => `${xScale(p.year).toFixed(1)},${yScale(p.value).toFixed(1)}`).join(' ');
  const areaBase = yScale(0);
  const areaPts  = `${xScale(minX)},${areaBase} ` + linePts + ` ${xScale(maxX)},${areaBase}`;

  // Tick years for x-axis
  const tickYears = years.filter((_, i) => i % 3 === 0);
  const xTicks = tickYears.map(y =>
    `<line x1="${xScale(y).toFixed(1)}" y1="${PAD.top + iH}" x2="${xScale(y).toFixed(1)}" y2="${PAD.top + iH + 4}" stroke="#999" stroke-width="1"/>
     <text x="${xScale(y).toFixed(1)}" y="${H - 3}" text-anchor="middle" font-size="9" fill="#888">${y}</text>`
  ).join('');

  // Horizontal reference lines at 0.25, 0.5, 0.75
  const hLines = [0.25, 0.5, 0.75].map(v =>
    `<line x1="${PAD.left}" y1="${yScale(v).toFixed(1)}" x2="${PAD.left + iW}" y2="${yScale(v).toFixed(1)}" stroke="#e0e0e0" stroke-width="1" stroke-dasharray="3,3"/>
     <text x="${PAD.left - 4}" y="${(yScale(v) + 3).toFixed(1)}" text-anchor="end" font-size="8" fill="#aaa">${v.toFixed(2)}</text>`
  ).join('');

  // Dots for each data point
  const dots = pts.map(p =>
    `<circle cx="${xScale(p.year).toFixed(1)}" cy="${yScale(p.value).toFixed(1)}" r="3" fill="${trendColor}" stroke="#fff" stroke-width="1.5"/>`
  ).join('');

  // Last value label
  const lastX = xScale(maxX).toFixed(1);
  const lastY = yScale(lastVal).toFixed(1);

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;overflow:visible">
      ${hLines}
      <polyline points="${linePts}" fill="none" stroke="${trendColor}" stroke-width="2" stroke-linejoin="round"/>
      <polygon  points="${areaPts}" fill="${trendColor}" opacity="0.08"/>
      ${dots}
      <text x="${parseFloat(lastX) + 6}" y="${parseFloat(lastY) + 4}" font-size="10" font-weight="700" fill="${trendColor}">${lastVal.toFixed(2)}</text>
      ${xTicks}
      <line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${PAD.top + iH}" stroke="#ccc" stroke-width="1"/>
    </svg>
    <p style="font-size:0.72rem;color:#999;margin-top:0.25rem">V-Dem Electoral Democracy Index (0–1). Higher = more democratic.</p>
  `;
}

function setModalBar(barId, valId, value, max = 1, displayOverride = null) {
  const bar = document.getElementById(barId);
  const val = document.getElementById(valId);
  const pct = value !== null && value !== undefined ? Math.round((value / max) * 100) : 0;
  const color = pct >= 65 ? 'bar-high' : pct >= 40 ? 'bar-mid' : 'bar-low';
  bar.dataset.target = pct + '%';
  bar.style.width = '0';
  bar.className = `score-bar ${color}`;
  val.textContent = displayOverride ?? (value !== null && value !== undefined ? value.toFixed(2) : '—');
}

function animateModalBars() {
  ['barPolyarchy', 'barLibdem', 'barBti'].forEach(id => {
    const bar = document.getElementById(id);
    if (bar && bar.dataset.target) bar.style.width = bar.dataset.target;
  });
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
  document.body.style.overflow = '';
}

/* ── Controls ── */
function bindControls() {
  document.getElementById('statusFilter').addEventListener('change', e => {
    activeFilters.status = e.target.value;
    renderView();
  });

  document.getElementById('sortBy').addEventListener('change', e => {
    activeFilters.sortBy = e.target.value;
    renderView();
  });

  document.getElementById('sortOrder').addEventListener('change', e => {
    activeFilters.sortOrder = e.target.value;
    renderView();
  });

  document.getElementById('searchInput').addEventListener('input', e => {
    activeFilters.search = e.target.value;
    renderView();
  });

  document.getElementById('btnGrid').addEventListener('click', () => {
    currentView = 'grid';
    document.getElementById('btnGrid').classList.add('active');
    document.getElementById('btnTable').classList.remove('active');
    document.getElementById('btnMap').classList.remove('active');
    renderView();
  });

  document.getElementById('btnTable').addEventListener('click', () => {
    currentView = 'table';
    document.getElementById('btnTable').classList.add('active');
    document.getElementById('btnGrid').classList.remove('active');
    document.getElementById('btnMap').classList.remove('active');
    renderView();
  });

  document.getElementById('btnMap').addEventListener('click', () => {
    currentView = 'map';
    document.getElementById('btnMap').classList.add('active');
    document.getElementById('btnGrid').classList.remove('active');
    document.getElementById('btnTable').classList.remove('active');
    renderView();
  });

  document.getElementById('modalClose').addEventListener('click', closeModal);

  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

/* ── Run ── */
init();

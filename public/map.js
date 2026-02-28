/* ===================================================
   Democratic Backsliding Tracker — map.js
   D3 v7 choropleth of Latin America
   =================================================== */

/* ISO numeric (integer) → country name — all tracked countries */
const LATAM_ISO = {
  // Latin America
  32:  'Argentina',    68:  'Bolivia',        76:  'Brazil',
  152: 'Chile',        170: 'Colombia',       188: 'Costa Rica',
  192: 'Cuba',         214: 'Dominican Republic', 218: 'Ecuador',
  222: 'El Salvador',  320: 'Guatemala',      340: 'Honduras',
  484: 'Mexico',       558: 'Nicaragua',      591: 'Panama',
  600: 'Paraguay',     604: 'Peru',           858: 'Uruguay',
  862: 'Venezuela',
  // Europe
  348: 'Hungary',   616: 'Poland',    688: 'Serbia',
  792: 'Turkey',    268: 'Georgia',   112: 'Belarus',
  // Asia
  356: 'India',     608: 'Philippines', 360: 'Indonesia',
  // Africa
  788: 'Tunisia',   710: 'South Africa', 288: 'Ghana',
  // North America
  840: 'United States', 124: 'Canada',
  // Middle East
  376: 'Israel',
};

const STATUS_FILL = {
  'stable':      '#2e7d32',
  'recovering':  '#1565c0',
  'at risk':     '#f57f17',
  'backsliding': '#b71c1c',
  'autocracy':   '#4a148c',
};

/* Populated by initMap() */
let isoToCountry = {};

/* Cache world topology so we only fetch once */
let cachedWorld = null;
let mapRendered = false;

/* Called from app.js after country data loads */
function initMap(countries) {
  isoToCountry = {};
  countries.forEach(c => {
    for (const [isoNum, name] of Object.entries(LATAM_ISO)) {
      if (name === c.name) {
        isoToCountry[parseInt(isoNum)] = c;
        break;
      }
    }
  });
}

/* Called from app.js when map view is activated */
async function renderMap() {
  if (mapRendered) return; // already drawn
  mapRendered = true;

  const container = document.getElementById('mapContainer');
  container.innerHTML = '<p class="map-loading">Loading map data…</p>';

  try {
    if (!cachedWorld) {
      cachedWorld = await d3.json(
        'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
      );
    }
    drawMap(container, cachedWorld);
  } catch (err) {
    container.innerHTML =
      `<p style="color:#b71c1c;padding:2rem;text-align:center">
        Failed to load map: ${err.message}
      </p>`;
    mapRendered = false; // allow retry
  }
}

function drawMap(container, world) {
  container.innerHTML = '';

  const W = container.clientWidth || 960;
  const H = Math.round(W * 0.52);

  const svg = d3.select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('width', '100%')
    .style('display', 'block');

  /* Ocean background */
  svg.append('rect')
    .attr('width', W).attr('height', H)
    .attr('fill', '#cfe6f0');

  /* Natural Earth world projection */
  const projection = d3.geoNaturalEarth1()
    .fitExtent([[10, 10], [W - 10, H - 44]], { type: 'Sphere' });

  const path = d3.geoPath().projection(projection);

  const allFeatures = topojson.feature(world, world.objects.countries).features;

  /* Draw all countries */
  svg.append('g')
    .selectAll('path')
    .data(allFeatures)
    .join('path')
    .attr('d', path)
    .attr('fill', d => {
      const country = isoToCountry[d.id];
      if (!country) return '#d4d4d4';
      return STATUS_FILL[(country.status_indicator || '').toLowerCase()] || '#999';
    })
    .attr('stroke', '#fff')
    .attr('stroke-width', d => isoToCountry[d.id] ? 0.8 : 0.4)
    .attr('opacity', d => isoToCountry[d.id] ? 1 : 0.45)
    .style('cursor', d => isoToCountry[d.id] ? 'pointer' : 'default')
    .on('mouseover', function (event, d) {
      const country = isoToCountry[d.id];
      if (!country) return;
      d3.select(this).raise().attr('stroke', '#111').attr('stroke-width', 2);
      showMapTooltip(event, country);
    })
    .on('mousemove', moveMapTooltip)
    .on('mouseout', function (event, d) {
      d3.select(this)
        .attr('stroke', '#fff')
        .attr('stroke-width', isoToCountry[d.id] ? 0.8 : 0.4);
      hideMapTooltip();
    })
    .on('click', (event, d) => {
      const country = isoToCountry[d.id];
      if (country) openModal(country);
    });

  drawMapLegend(svg, W, H);
}

function drawMapLegend(svg, W, H) {
  const items = [
    { label: 'Stable',      fill: '#2e7d32' },
    { label: 'Recovering',  fill: '#1565c0' },
    { label: 'At Risk',     fill: '#f57f17' },
    { label: 'Backsliding', fill: '#b71c1c' },
    { label: 'Autocracy',   fill: '#4a148c' },
  ];

  const itemW  = 102;
  const totalW = items.length * itemW + 12;
  const lg = svg.append('g')
    .attr('transform', `translate(16, ${H - 36})`);

  lg.append('rect')
    .attr('x', -6).attr('y', -18)
    .attr('width', totalW).attr('height', 28)
    .attr('rx', 6)
    .attr('fill', 'rgba(255,255,255,0.88)');

  items.forEach((item, i) => {
    const x = i * itemW;
    lg.append('rect')
      .attr('x', x).attr('y', -9)
      .attr('width', 14).attr('height', 14)
      .attr('rx', 3)
      .attr('fill', item.fill);
    lg.append('text')
      .attr('x', x + 18).attr('y', 2)
      .attr('font-size', 11)
      .attr('fill', '#222')
      .attr('font-family', 'system-ui, sans-serif')
      .text(item.label);
  });
}

/* ── Tooltip ── */
let mapTooltip = null;

function ensureTooltip() {
  if (mapTooltip) return;
  mapTooltip = document.createElement('div');
  mapTooltip.style.cssText = [
    'position:fixed', 'pointer-events:none', 'z-index:999',
    'background:#1a1a2e', 'color:#fff', 'border-radius:8px',
    'padding:10px 14px', 'font-size:13px', 'line-height:1.6',
    'box-shadow:0 4px 16px rgba(0,0,0,0.3)',
    'max-width:230px', 'display:none',
    'font-family:system-ui,sans-serif',
  ].join(';');
  document.body.appendChild(mapTooltip);
}

function showMapTooltip(event, country) {
  ensureTooltip();
  const poly = country['V-Dem_polyarchy_index'];
  const lib  = country.libdem_index;
  const bti  = country.BTI_governance_score;
  const flag = FLAGS[country.iso2] || '';
  const statusColor = STATUS_FILL[(country.status_indicator || '').toLowerCase()] || '#aaa';

  mapTooltip.innerHTML = `
    <strong style="font-size:14px">${flag} ${country.name}</strong><br>
    <span style="
      display:inline-block;margin:3px 0 5px;
      background:${statusColor};color:#fff;
      border-radius:99px;padding:1px 8px;font-size:10px;
      font-weight:700;text-transform:uppercase;letter-spacing:.05em
    ">${country.status_indicator || '—'}</span><br>
    <span style="opacity:.75;font-size:11px">
      Electoral Democracy: <strong>${poly !== null ? poly.toFixed(2) : '—'}</strong><br>
      Liberal Democracy: <strong>${lib !== null ? lib.toFixed(2) : '—'}</strong><br>
      BTI Score: <strong>${bti !== null ? bti.toFixed(1) + '/10' : '—'}</strong>
    </span><br>
    <span style="opacity:.55;font-size:10px;margin-top:3px;display:block">Click for full details</span>
  `;
  mapTooltip.style.display = 'block';
  positionTooltip(event);
}

function moveMapTooltip(event) {
  if (mapTooltip) positionTooltip(event);
}

function hideMapTooltip() {
  if (mapTooltip) mapTooltip.style.display = 'none';
}

function positionTooltip(event) {
  const pad = 14;
  const x   = event.clientX + pad;
  const y   = event.clientY - pad;
  const tw  = mapTooltip.offsetWidth;
  const th  = mapTooltip.offsetHeight;
  mapTooltip.style.left = (x + tw > window.innerWidth  ? x - tw - pad * 2 : x) + 'px';
  mapTooltip.style.top  = (y + th > window.innerHeight ? y - th           : y) + 'px';
}

/* ============================================
   CIEŃ FESTIWAL 2026 — App JS
   ============================================ */

'use strict';

// ============================================
// STATE
// ============================================

const State = {
  data: null,
  currentView: 'teraz',
  schedule: {
    activeDay: '2026-07-03',
    activeZone: 'all'
  },
  map: {
    activePOIType: 'all'
  },
  journal: {
    activeStage: 'nigredo'
  },
  modalEvent: null
};

const ZONES_MAP = {
  podswiadomosci: { color: '#7B3F82', icon: '🌀' },
  sacrum:         { color: '#C9A84C', icon: '🔥' },
  anima:          { color: '#4A6FA5', icon: '☯' },
  umbra:          { color: '#E05C1A', icon: '⚡' },
  gnoza:          { color: '#2D7D46', icon: '🎬' },
  lochy:          { color: '#8B4513', icon: '🕯' }
};

const DAY_STAGES = {
  '2026-07-03': 'nigredo',
  '2026-07-04': 'albedo',
  '2026-07-05': 'rubedo'
};

const JOURNAL_PROMPTS = {
  nigredo: [
    'Co chcę zostawić za sobą podczas tego festiwalu? Co chcę rozpuścić?',
    'Które emocje najtrudniej mi przyjąć? Co one mówią?',
    'Co przykryłem w sobie, żeby móc funkcjonować? Co teraz wychodzi na powierzchnię?'
  ],
  albedo: [
    'Co widzę wyraźniej niż wczoraj? Co się oczyściło?',
    'Kogo spotkałem dziś — w sobie lub w innych — z czym się rozpoznałem?',
    'Jaki obraz, uczucie lub myśl wracają do mnie tego dnia?'
  ],
  rubedo: [
    'Co zabiorę ze sobą z tego doświadczenia? Co we mnie zostanie?',
    'Jak będę traktował siebie inaczej po powrocie? Co konkretnie zmienię?',
    'Komu lub czemu chcę podziękować za to, co przeżyłem?'
  ]
};

// ============================================
// INIT
// ============================================

function detectFestivalDay() {
  const now = new Date();
  const h = now.getHours();
  let y = now.getFullYear(), m = now.getMonth()+1, d = now.getDate();
  if (h < 6) {
    const prev = new Date(now); prev.setDate(prev.getDate()-1);
    y = prev.getFullYear(); m = prev.getMonth()+1; d = prev.getDate();
  }
  const today = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const days = ['2026-07-03','2026-07-04','2026-07-05'];
  if (days.includes(today)) return today;
  return now < new Date('2026-07-03T06:00:00') ? '2026-07-03' : '2026-07-05';
}

async function init() {
  State.schedule.activeDay = detectFestivalDay();
  await loadData();
  setupRouter();
  setupClock();
  setupInstallPrompt();
  registerSW();
  navigateTo(location.hash.slice(1) || 'teraz');
  const splash = document.getElementById('splash-screen');
  if (splash) setTimeout(() => splash.classList.add('hidden'), 400);
}

async function loadData() {
  try {
    const [scheduleRes, poisRes] = await Promise.all([
      fetch('data/schedule.json'),
      fetch('data/pois.json')
    ]);
    const schedule = await scheduleRes.json();
    const pois = await poisRes.json();
    State.data = { ...schedule, ...pois };
  } catch (e) {
    console.error('Failed to load data:', e);
    State.data = { events: [], zones: [], pois: [], festival: { zones: [] } };
  }
}

// ============================================
// ROUTER
// ============================================

const VIEWS = ['teraz', 'mapa', 'slowdating', 'dziennik', 'sacrum', 'info'];

function setupRouter() {
  window.addEventListener('hashchange', () => {
    const view = location.hash.slice(1) || 'teraz';
    if (VIEWS.includes(view)) navigateTo(view);
  });

  document.getElementById('bottom-nav').addEventListener('click', e => {
    const btn = e.target.closest('.nav-btn');
    if (btn) {
      const view = btn.dataset.view;
      location.hash = view;
    }
  });
}

function navigateTo(view) {
  if (!VIEWS.includes(view)) view = 'teraz';
  State.currentView = view;

  // Update nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  // Update views
  document.querySelectorAll('.view').forEach(v => {
    v.classList.toggle('active', v.id === `view-${view}`);
  });

  // Render
  renderView(view);
  updateHeader();
}

function renderView(view) {
  switch (view) {
    case 'teraz':       renderSchedule(); break;
    case 'mapa':        renderMap(); break;
    case 'slowdating':  renderSlowDating(); break;
    case 'dziennik':    renderJournal(); break;
    case 'sacrum':      renderSacrum(); break;
    case 'info':        renderInfo(); break;
  }
}

// ============================================
// HEADER + CLOCK
// ============================================

function setupClock() {
  updateClock();
  setInterval(updateClock, 60000);
}

function updateClock() {
  const el = document.getElementById('header-time');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

function updateHeader() {
  const stage = DAY_STAGES[State.schedule.activeDay];
  const stageBadge = document.getElementById('stage-badge');
  if (stageBadge) {
    const labels = { nigredo: 'Nigredo · 3 VII', albedo: 'Albedo · 4 VII', rubedo: 'Rubedo · 5 VII' };
    stageBadge.textContent = labels[stage] || 'CIEŃ 2026';
  }
}

// ============================================
// VIEW: SCHEDULE (TERAZ)
// ============================================

function renderSchedule() {
  const container = document.getElementById('schedule-content');
  if (!container || !State.data) return;

  const events = State.data.events || [];
  const zones = State.data.festival?.zones || [];

  // Day tabs
  const days = ['2026-07-03', '2026-07-04', '2026-07-05'];
  const DAY_LABELS = { '2026-07-03': '3 VII', '2026-07-04': '4 VII', '2026-07-05': '5 VII' };
  const dayTabsHTML = days.map(day => {
    const stage = DAY_STAGES[day];
    const active = State.schedule.activeDay === day;
    return `
      <button class="day-tab ${stage} ${active ? 'active' : ''}" onclick="setActiveDay('${day}')">
        <div class="tab-stage">${stage}</div>
        <div class="tab-date">${DAY_LABELS[day]}</div>
      </button>`;
  }).join('');

  // Zone chips
  const zoneChipsHTML = [
    `<button class="zone-chip all ${State.schedule.activeZone === 'all' ? 'active' : ''}" onclick="setActiveZone('all')">Wszystkie</button>`,
    ...zones.map(z => `
      <button class="zone-chip ${State.schedule.activeZone === z.id ? 'active' : ''}"
              data-zone="${z.id}"
              onclick="setActiveZone('${z.id}')">
        ${z.icon} ${z.shortName}
      </button>`)
  ].join('');

  // Events for current day + zone
  // Festival day runs 06:00–05:59, so after-midnight sets belong to the previous day
  const dayEvents = events.filter(ev => {
    const matchDay = getFestivalDay(ev.start) === State.schedule.activeDay;
    const matchZone = State.schedule.activeZone === 'all' || ev.zone === State.schedule.activeZone;
    return matchDay && matchZone;
  }).sort((a, b) => {
    // Sort: events before 06:00 come after events from the same festival day (they're late-night)
    const aH = new Date(a.start).getHours();
    const bH = new Date(b.start).getHours();
    const aOrd = aH < 6 ? aH + 24 : aH;
    const bOrd = bH < 6 ? bH + 24 : bH;
    if (aOrd !== bOrd) return aOrd - bOrd;
    return a.start.localeCompare(b.start);
  });

  // Now banner — only from the active day's events (skip before festival starts)
  const festivalStarted = new Date() >= new Date('2026-07-03T06:00:00');
  const nowHTML = festivalStarted ? renderNowBanner(dayEvents) : '';

  const eventsHTML = renderEventsList(dayEvents);

  const favs = getFavorites();
  const dayFavEvents = dayEvents.filter(e => favs.includes(e.id));
  const favHTML = dayFavEvents.length ? `
    <div class="favs-section">
      <div class="favs-title">⭐ Mój plan na dziś</div>
      ${dayFavEvents.map(ev => {
        const zone = (State.data?.festival?.zones || []).find(z => z.id === ev.zone) || {};
        const color = zone.color || ZONES_MAP[ev.zone]?.color || '#888';
        const icon = zone.icon || ZONES_MAP[ev.zone]?.icon || '●';
        return `<div class="event-card" style="border-left-color:${color}" onclick="openEventModal('${ev.id}')">
          <div class="event-time">${formatTime(ev.start)} <span class="event-duration">→ ${formatTime(ev.end)}</span></div>
          <div class="event-title">${ev.title}</div>
          <div class="event-zone-tag" style="color:${color}">${icon} ${zone.shortName || ev.zone}</div>
        </div>`;
      }).join('')}
    </div>
    <div class="divider" style="margin:0 1rem 0.5rem"></div>` : '';

  container.innerHTML = `
    <div class="day-tabs">${dayTabsHTML}</div>
    ${nowHTML}
    <div class="zone-filter">${zoneChipsHTML}</div>
    ${favHTML}
    <div class="events-list">${eventsHTML}</div>
  `;
}

function renderNowBanner(events) {
  const now = new Date();
  const nowEvents = events.filter(ev => {
    const start = new Date(ev.start);
    const end = new Date(ev.end);
    return now >= start && now <= end;
  });

  if (nowEvents.length === 0) {
    const nextUp = events.filter(ev => new Date(ev.start) > now)
                         .sort((a,b) => a.start.localeCompare(b.start))
                         .slice(0, 2);
    if (nextUp.length === 0) return '';
    return `
      <div class="now-banner">
        <div class="now-banner-label">
          <span class="now-dot"></span>
          ZA CHWILĘ
        </div>
        <div class="now-events">
          ${nextUp.map(ev => renderMiniEventCard(ev, false, true)).join('')}
        </div>
      </div>`;
  }

  return `
    <div class="now-banner">
      <div class="now-banner-label">
        <span class="now-dot"></span>
        TERAZ
      </div>
      <div class="now-events">
        ${nowEvents.map(ev => renderMiniEventCard(ev, true, false)).join('')}
      </div>
    </div>`;
}

function renderMiniEventCard(ev, isNow, isSoon) {
  const zone = (State.data?.festival?.zones || []).find(z => z.id === ev.zone) || ZONES_MAP[ev.zone] || {};
  const color = zone.color || ZONES_MAP[ev.zone]?.color || '#888';
  const icon = zone.icon || ZONES_MAP[ev.zone]?.icon || '●';
  const timeStr = formatTime(ev.start);
  return `
    <div class="event-card ${isNow ? 'is-now' : ''}" style="border-left-color:${color}" onclick="openEventModal('${ev.id}')">
      <div class="event-time">
        ${timeStr} <span class="event-duration">→ ${formatTime(ev.end)}</span>
      </div>
      <div class="event-title">${ev.title}</div>
      ${ev.artist ? `<div class="event-artist">${ev.artist}</div>` : ''}
      <div class="event-zone-tag" style="color:${color}">${icon} ${zone.shortName || zone.name || ev.zone}</div>
    </div>`;
}

function renderEventsList(events) {
  if (events.length === 0) {
    return `<div class="text-muted italic" style="padding:1rem 0;text-align:center">Brak wydarzeń dla wybranych filtrów</div>`;
  }

  const now = new Date();
  let lastHour = null;
  const parts = [];

  events.forEach(ev => {
    const hour = ev.start.slice(11, 13);
    if (hour !== lastHour) {
      parts.push(`<div class="time-separator"><span>${hour}:00</span></div>`);
      lastHour = hour;
    }

    const isNow = now >= new Date(ev.start) && now <= new Date(ev.end);
    const isPast = now > new Date(ev.end);
    const zone = (State.data?.festival?.zones || []).find(z => z.id === ev.zone) || {};
    const color = zone.color || ZONES_MAP[ev.zone]?.color || '#888';
    const icon = zone.icon || ZONES_MAP[ev.zone]?.icon || '●';

    parts.push(`
      <div class="event-card ${isNow ? 'is-now' : ''} ${isPast ? 'is-past' : ''}"
           style="border-left-color:${color}"
           onclick="openEventModal('${ev.id}')">
        <div class="event-time">
          ${formatTime(ev.start)} <span class="event-duration">→ ${formatTime(ev.end)} (${getDuration(ev.start, ev.end)})</span>
        </div>
        <div class="event-title">${ev.title}</div>
        ${ev.artist ? `<div class="event-artist">${ev.artist}</div>` : ''}
        <div class="event-zone-tag" style="color:${color}">${icon} ${zone.shortName || zone.name || ev.zone}</div>
        <button class="fav-btn ${getFavorites().includes(ev.id) ? 'active' : ''}"
                onclick="event.stopPropagation();toggleFavorite('${ev.id}')">
          ${getFavorites().includes(ev.id) ? '★' : '☆'}
        </button>
      </div>`);
  });

  return parts.join('');
}

function setActiveDay(day) {
  State.schedule.activeDay = day;
  renderSchedule();
  updateHeader();
}

function setActiveZone(zone) {
  State.schedule.activeZone = zone;
  renderSchedule();
}

// ============================================
// EVENT MODAL
// ============================================

function openEventModal(eventId) {
  const ev = (State.data?.events || []).find(e => e.id === eventId);
  if (!ev) return;

  const zone = (State.data?.festival?.zones || []).find(z => z.id === ev.zone) || {};
  const color = zone.color || ZONES_MAP[ev.zone]?.color || '#888';
  const icon = zone.icon || ZONES_MAP[ev.zone]?.icon || '●';

  const modal = document.getElementById('event-modal');
  modal.querySelector('.modal-zone-badge').style.color = color;
  modal.querySelector('.modal-zone-badge').innerHTML = `${icon} ${zone.shortName || zone.name || ev.zone}`;
  modal.querySelector('.modal-title').textContent = ev.title;
  modal.querySelector('.modal-artist').textContent = ev.artist || '';
  modal.querySelector('.modal-artist').style.display = ev.artist ? 'block' : 'none';
  modal.querySelector('.modal-time').innerHTML = `
    🕐 ${formatTime(ev.start)} – ${formatTime(ev.end)}
    <span class="event-duration">(${getDuration(ev.start, ev.end)})</span>
    <span style="color:var(--szary);margin-left:0.5rem">· ${zone.location || ''}</span>
  `;
  modal.querySelector('.modal-description').innerHTML = ev.description || '';

  const tagsEl = modal.querySelector('.modal-tags');
  if (tagsEl) {
    tagsEl.innerHTML = (ev.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
  }

  modal.querySelector('.modal-overlay').classList.add('open');
}

function closeEventModal() {
  document.querySelector('.modal-overlay').classList.remove('open');
}

// ============================================
// VIEW: MAPA
// ============================================

function renderMap() {
  const container = document.getElementById('map-content');
  if (!container || !State.data) return;

  const zones = State.data.festival?.zones || [];
  const pois = State.data.pois || [];
  const areasMap = State.data.zones_map?.areas || [];

  // Build SVG map
  const svgAreas = areasMap.map(area => `
    <g class="map-zone-area" onclick="highlightZone('${area.id}')">
      <rect x="${area.x}%" y="${area.y}%" width="${area.w}%" height="${area.h}%"
            rx="4" fill="${area.color}" fill-opacity="0.35"
            stroke="${area.color}" stroke-width="1.5" stroke-opacity="0.7"/>
      <text x="${area.x + area.w/2}%" y="${area.y + area.h/2 - 1}%"
            text-anchor="middle" dominant-baseline="middle"
            fill="#F5E6C8" font-size="9" font-family="serif" font-weight="bold">
        ${area.label.replace('\n', ' ')}
      </text>
    </g>`).join('');

  // POI type tabs
  const poiTypes = ['all', 'food', 'water', 'toilet', 'help', 'info'];
  const poiLabels = { all: 'Wszystko', food: '🍲 Jadło', water: '💧 Woda', toilet: '🚻 Toalety', help: '🛡 Pomoc', info: 'ℹ Info' };

  const poiTabsHTML = poiTypes.map(t => `
    <button class="poi-tab ${State.map.activePOIType === t ? 'active' : ''}" onclick="setPoiType('${t}')">
      ${poiLabels[t]}
    </button>`).join('');

  const filteredPois = State.map.activePOIType === 'all' ? pois : pois.filter(p => p.type === State.map.activePOIType);

  const poiListHTML = filteredPois.map(poi => `
    <div class="poi-card" onclick="openPoiModal('${poi.id}')">
      <div class="poi-icon">${poi.icon}</div>
      <div>
        <div class="poi-name">${poi.label}</div>
        <div class="poi-location">📍 ${poi.location}</div>
        <div class="poi-hours">${poi.hours}</div>
      </div>
    </div>`).join('');

  // Zone legend
  const legendHTML = zones.map(z => `
    <div class="legend-item" onclick="highlightZone('${z.id}')">
      <div class="legend-dot" style="background:${z.color}"></div>
      <span class="legend-name">${z.shortName}</span>
    </div>`).join('');

  container.innerHTML = `
    <div class="map-container">
      <div class="map-svg-wrap">
        <svg class="map-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <!-- Castle outline -->
          <rect x="10" y="15" width="80" height="70" rx="4"
                fill="none" stroke="rgba(201,168,76,0.2)" stroke-width="0.5"/>
          <!-- Towers -->
          <rect x="8" y="13" width="12" height="12" rx="2"
                fill="rgba(201,168,76,0.05)" stroke="rgba(201,168,76,0.3)" stroke-width="0.5"/>
          <rect x="80" y="13" width="12" height="12" rx="2"
                fill="rgba(201,168,76,0.05)" stroke="rgba(201,168,76,0.3)" stroke-width="0.5"/>
          <rect x="8" y="75" width="12" height="12" rx="2"
                fill="rgba(201,168,76,0.05)" stroke="rgba(201,168,76,0.3)" stroke-width="0.5"/>
          <rect x="80" y="75" width="12" height="12" rx="2"
                fill="rgba(201,168,76,0.05)" stroke="rgba(201,168,76,0.3)" stroke-width="0.5"/>
          <!-- Label -->
          <text x="50" y="95" text-anchor="middle" fill="rgba(201,168,76,0.4)"
                font-size="4" font-family="serif">Zamek Świny — schemat poglądowy</text>
          ${svgAreas}
        </svg>
      </div>

      <div class="map-legend">${legendHTML}</div>
    </div>

    <div class="divider" style="margin:0 1rem"></div>

    <div class="poi-section-title">PUNKTY NA MAPIE</div>
    <div class="poi-tabs">${poiTabsHTML}</div>
    <div class="poi-list">${poiListHTML}</div>
  `;
}

function setPoiType(type) {
  State.map.activePOIType = type;
  renderMap();
}

function highlightZone(zoneId) {
  // Navigate to schedule filtered by this zone
  State.schedule.activeZone = zoneId;
  location.hash = 'teraz';
}

function openPoiModal(poiId) {
  const poi = (State.data?.pois || []).find(p => p.id === poiId);
  if (!poi) return;
  const modal = document.getElementById('event-modal');
  modal.querySelector('.modal-zone-badge').style.color = '#C9A84C';
  modal.querySelector('.modal-zone-badge').innerHTML = poi.icon + ' ' + poi.type.toUpperCase();
  modal.querySelector('.modal-title').textContent = poi.label;
  modal.querySelector('.modal-artist').textContent = '';
  modal.querySelector('.modal-artist').style.display = 'none';
  modal.querySelector('.modal-time').innerHTML = `📍 ${poi.location} · ${poi.hours}`;
  modal.querySelector('.modal-description').innerHTML = poi.description || '';
  const tagsEl = modal.querySelector('.modal-tags');
  if (tagsEl) tagsEl.innerHTML = '';
  modal.querySelector('.modal-overlay').classList.add('open');
}

// ============================================
// VIEW: JOURNAL (DZIENNIK)
// ============================================

function renderJournal() {
  const container = document.getElementById('journal-content');
  if (!container) return;

  const stage = State.journal.activeStage;
  const prompts = JOURNAL_PROMPTS[stage] || [];
  const prompt = prompts[Math.floor(Math.random() * prompts.length)] || '';

  const stageColors = { nigredo: '#6B6BFF', albedo: '#E8E0D0', rubedo: '#8B2B2B' };
  const stageSymbols = { nigredo: '☽', albedo: '○', rubedo: '☀' };

  const arcHTML = ['nigredo', 'albedo', 'rubedo'].map((s, i) => {
    const days = { nigredo: '3.07', albedo: '4.07', rubedo: '5.07' };
    return `
      <div class="arc-stage ${s} ${stage === s ? 'active' : ''}" onclick="setJournalStage('${s}')">
        <div class="arc-stage-symbol" style="color:${stageColors[s]}">${stageSymbols[s]}</div>
        <div class="arc-stage-name">${s}</div>
        <div class="arc-stage-date">${days[s]}</div>
      </div>`;
  }).join('');

  const savedEntries = getJournalEntries();
  const currentEntry = savedEntries.find(e => e.stage === stage) || {};

  const pastEntriesHTML = savedEntries.filter(e => e.text && e.stage !== stage).map(e => `
    <div class="past-entry" onclick="toggleEntry(this)">
      <div class="past-entry-header">
        <span class="past-entry-stage" style="color:${stageColors[e.stage]}">${stageSymbols[e.stage]} ${e.stage}</span>
        <span class="past-entry-date">${e.savedAt || ''}</span>
      </div>
      <div class="past-entry-preview">${e.text}</div>
    </div>`).join('');

  container.innerHTML = `
    <div class="alchemy-arc">${arcHTML}</div>

    <div class="journal-prompt">
      <div class="prompt-label">Pytanie dnia</div>
      <div class="prompt-text">${prompt}</div>
    </div>

    <div class="journal-entry-area">
      <textarea class="journal-textarea"
                id="journal-text-${stage}"
                placeholder="Pisz tutaj — to tylko dla Ciebie. Nie ma właściwej ani złej odpowiedzi."
                oninput="autoSaveJournal('${stage}', this.value)">${currentEntry.text || ''}</textarea>
    </div>

    <div class="journal-actions">
      <button class="btn btn-gold" onclick="saveJournalEntry('${stage}')">Zapisz</button>
      <button class="btn btn-outline" onclick="emailJournalEntry('${stage}')">✉ Wyślij sobie</button>
    </div>

    ${savedEntries.filter(e => e.text && e.stage !== stage).length > 0 ? `
    <div class="section-sep"></div>
    <div class="past-entries-title">Poprzednie wpisy</div>
    ${pastEntriesHTML}` : ''}
  `;
}

function setJournalStage(stage) {
  State.journal.activeStage = stage;
  renderJournal();
}

let saveTimer = null;
function autoSaveJournal(stage, text) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const entries = getJournalEntries();
    const idx = entries.findIndex(e => e.stage === stage);
    const entry = { stage, text, savedAt: new Date().toLocaleDateString('pl-PL') };
    if (idx >= 0) entries[idx] = entry;
    else entries.push(entry);
    localStorage.setItem('cien_journal_2026', JSON.stringify(entries));
  }, 1000);
}

function saveJournalEntry(stage) {
  const textarea = document.getElementById(`journal-text-${stage}`);
  if (!textarea) return;
  autoSaveJournal(stage, textarea.value);
  showToast('Wpis zapisany lokalnie na urządzeniu');
}

function emailJournalEntry(stage) {
  const entries = getJournalEntries();
  const entry = entries.find(e => e.stage === stage);
  if (!entry || !entry.text) { showToast('Najpierw napisz coś'); return; }

  const subject = encodeURIComponent(`CIEŃ Festiwal 2026 — Dziennik ${stage}`);
  const body = encodeURIComponent(`CIEŃ Festiwal 2026 — Dziennik przemiany\nEtap: ${stage}\nData: ${entry.savedAt}\n\n${entry.text}`);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function getJournalEntries() {
  try {
    return JSON.parse(localStorage.getItem('cien_journal_2026') || '[]');
  } catch { return []; }
}

function toggleEntry(el) {
  el.classList.toggle('expanded');
}

// ============================================
// VIEW: SACRUM (HARM REDUCTION)
// ============================================

function renderSacrum() {
  const container = document.getElementById('sacrum-content');
  if (!container) return;

  container.innerHTML = `
    <div class="sacrum-hero">
      <div class="sacrum-logo-wrap">
        <svg viewBox="0 0 240 60" class="sacrum-svg-logo" aria-label="SACRUM">
          <text x="120" y="48" text-anchor="middle"
                font-family="'Helvetica Neue', Arial, sans-serif"
                font-size="52" font-weight="300" letter-spacing="14"
                fill="#3BAFBA">SACRUM</text>
        </svg>
      </div>
      <div class="sacrum-hero-sub">Punkt Pomocy · Zawsze dostępny · Bez oceniania</div>
    </div>

    <button class="emergency-btn" onclick="callHelp()">
      <span class="em-icon">🚨</span>
      <span>Potrzebuję pomocy TERAZ</span>
    </button>

    <div class="sacrum-section" style="margin-top:1rem">
      <div class="sacrum-section-title">Gdzie jest punkt pomocy?</div>
      <div class="sacrum-card">
        <div class="sacrum-card-title">🗺 Lokalizacja</div>
        <div class="sacrum-card-body">
          Cicha sala — I piętro, skrzydło wschodnie zamku.<br>
          <strong>Otwarty 24 godziny przez cały festiwal.</strong><br>
          Dyżuruje trip sitter + psycholog w godz. 18:00–08:00.
        </div>
      </div>
      <div class="sacrum-card">
        <div class="sacrum-card-title">📧 Kontakt</div>
        <div class="sacrum-card-body">
          <a href="mailto:kontakt@cienfestiwal.com" style="color:var(--zloto)">kontakt@cienfestiwal.com</a>
        </div>
      </div>
    </div>

    <div class="section-sep"></div>

    <div class="sacrum-section">
      <div class="sacrum-section-title">Zasady Harm Reduction</div>

      <div class="sacrum-card">
        <div class="sacrum-card-title">🌿 Ustaw intencję przed</div>
        <div class="sacrum-card-body">
          Wiedz, po co tu jesteś. Substancja wzmacnia to, co już jest — nie tworzy nowego. Jasna intencja to kotwa.
        </div>
      </div>

      <div class="sacrum-card">
        <div class="sacrum-card-title">👥 Zaufany towarzysz</div>
        <div class="sacrum-card-body">
          Zawsze miej przy sobie kogoś, kto wie, gdzie jesteś i co bierzesz. Trip sitter nie musi sam zażywać.
        </div>
      </div>

      <div class="sacrum-card">
        <div class="sacrum-card-title">💧 Woda i jedzenie</div>
        <div class="sacrum-card-body">
          Pij regularnie. Nie przesadzaj — nadmiar wody przy stymulantach też szkodzi. Jedz lekko przed i po.
        </div>
      </div>

      <div class="sacrum-card">
        <div class="sacrum-card-title">🌡 Dawki i mieszanki</div>
        <div class="sacrum-card-body">
          Zacznij od małej dawki. Odczekaj zanim weźmiesz więcej — efekty nie zawsze są natychmiastowe.<br>
          <strong style="color:var(--zloto)">Unikaj mieszania substancji.</strong> Szczególnie psychodeliki + stymulanty + alkohol.
        </div>
      </div>

      <div class="sacrum-card">
        <div class="sacrum-card-title">🛌 Jeśli jest trudno</div>
        <div class="sacrum-card-body">
          Znajdź spokojne miejsce. Połóż się. Oddychaj wolno i głęboko. Pamiętaj: to przejdzie.<br>
          <strong>Poproś o pomoc</strong> — trip sitterzy są po to.
        </div>
      </div>
    </div>

    <div class="section-sep"></div>

    <div class="sacrum-section">
      <div class="sacrum-section-title">Integracja — po doświadczeniu</div>

      <div class="sacrum-card">
        <div class="sacrum-card-title">📖 Zapisz, zanim zapomnisz</div>
        <div class="sacrum-card-body">
          Użyj Dziennika przemiany w tej aplikacji. Nawet fragmenty, obrazy, słowa.
        </div>
      </div>

      <div class="sacrum-card">
        <div class="sacrum-card-title">⏳ Czas integracji</div>
        <div class="sacrum-card-body">
          Głębokie doświadczenia potrzebują czasu. Nie oceniaj od razu. Daj sobie kilka dni — albo tygodni.
        </div>
      </div>

      <div class="sacrum-card">
        <div class="sacrum-card-title">🔄 Warsztaty integracyjne</div>
        <div class="sacrum-card-body">
          Sprawdź w harmonogramie sesje integracyjne — są zaplanowane każdego ranka.<br>
          SACRUM oferuje też sesje indywidualne — <a href="mailto:kontakt@cienfestiwal.com" style="color:var(--zloto)">skontaktuj się po festiwalu</a>.
        </div>
      </div>
    </div>
  `;
}

function callHelp() {
  const modal = document.getElementById('event-modal');
  modal.querySelector('.modal-zone-badge').style.color = '#FF4444';
  modal.querySelector('.modal-zone-badge').innerHTML = '🚨 POMOC';
  modal.querySelector('.modal-title').textContent = 'Potrzebujesz pomocy?';
  modal.querySelector('.modal-artist').style.display = 'none';
  modal.querySelector('.modal-time').innerHTML = '📍 Cicha sala — I piętro, skrzydło wschodnie · Otwarte 24h';
  modal.querySelector('.modal-description').innerHTML = `
    <strong style="color:#FF6B6B">Idź do punktu pomocy lub poproś kogoś w pobliżu.</strong><br><br>
    Powiedz obsłudze: <em>"Potrzebuję trip sittera"</em>. Nie musisz nic tłumaczyć.<br><br>
    <strong>Jeśli to nagłe zagrożenie zdrowia:</strong><br>
    Ratownik medyczny — namioty przy wejściu (24h).<br><br>
    Email: <a href="mailto:kontakt@cienfestiwal.com" style="color:var(--zloto)">kontakt@cienfestiwal.com</a>
  `;
  const tagsEl = modal.querySelector('.modal-tags');
  if (tagsEl) tagsEl.innerHTML = '';
  modal.querySelector('.modal-overlay').classList.add('open');
}

// ============================================
// VIEW: INFO
// ============================================

function renderInfo() {
  const container = document.getElementById('info-content');
  if (!container) return;

  container.innerHTML = `
    <div class="info-section" style="margin-top:1rem">
      <div class="info-card">
        <div class="info-card-header">
          <span class="info-card-icon">📍</span>
          <span class="info-card-title">Lokalizacja</span>
        </div>
        <div class="info-card-body">
          <strong>Zamek Świny</strong><br>
          Świny, gmina Bolków, woj. dolnośląskie<br>
          <a href="https://maps.google.com/?q=Zamek+Świny+Bolków" style="color:var(--zloto)" target="_blank">
            Otwórz w Google Maps →
          </a>
        </div>
      </div>

      <div class="info-card">
        <div class="info-card-header">
          <span class="info-card-icon">📅</span>
          <span class="info-card-title">Daty</span>
        </div>
        <div class="info-card-body">
          <strong>3–5 lipca 2026</strong><br>
          Przyjazd: czwartek 3.07 od godz. 14:00<br>
          Wyjazd: niedziela 5.07 do godz. 20:00<br>
          <br>
          <strong style="color:var(--zloto)">Nigredo</strong> (3.07) — Albedo (4.07) — <strong style="color:var(--burgund-2)">Rubedo</strong> (5.07)
        </div>
      </div>

      <div class="info-card">
        <div class="info-card-header">
          <span class="info-card-icon">🚗</span>
          <span class="info-card-title">Dojazd</span>
        </div>
        <div class="info-card-body">
          <strong>Samochodem:</strong><br>
          Autostrada A4 → Bolków → Świny (ok. 15 km od Bolkowa).<br>
          Parking przy zamku — bezpłatny dla uczestników.<br><br>
          <strong>Pociągiem:</strong><br>
          Stacja Bolków (PKP) → taxi/Bolt ok. 15 min.<br><br>
          <strong>Carpooling:</strong> szukaj w grupie festiwalu na FB.
        </div>
      </div>

      <div class="info-card">
        <div class="info-card-header">
          <span class="info-card-icon">🎒</span>
          <span class="info-card-title">Co zabrać</span>
        </div>
        <div class="info-card-body">
          <ul>
            <li>Śpiwór i materac / karimat (camping lub namioty)</li>
            <li>Ciepłe ubrania na wieczory (góry, noce chłodne)</li>
            <li>Kalosze lub wodoodporne buty</li>
            <li>Refillable bidon lub kubek (zero odpadów)</li>
            <li>Latarka czołowa (zamkowe korytarze)</li>
            <li>Słuchawki zatyczkowe do snu</li>
            <li>Leki na receptę (własne, z opisem)</li>
            <li>Dowód osobisty lub paszport</li>
          </ul>
        </div>
      </div>

      <div class="info-card">
        <div class="info-card-header">
          <span class="info-card-icon">🚫</span>
          <span class="info-card-title">Czego NIE brać</span>
        </div>
        <div class="info-card-body">
          <ul>
            <li>Zwierząt domowych</li>
            <li>Dronów bez zgody organizatora</li>
            <li>Szklanego alkoholu na terenie zamku</li>
            <li>Agresji — nasz zamek, nasze zasady</li>
          </ul>
        </div>
      </div>

      <div class="info-card">
        <div class="info-card-header">
          <span class="info-card-icon">🌦</span>
          <span class="info-card-title">Pogoda</span>
        </div>
        <div class="info-card-body">
          Lipiec w górach = nieprzewidywalny. Pakuj warstwy.<br>
          Górska burza może przyjść w ciągu godziny.<br>
          <strong style="color:var(--zloto)">Bądź gotowy na wszystko — to część doświadczenia.</strong>
        </div>
      </div>

      <div class="info-card">
        <div class="info-card-header">
          <span class="info-card-icon">📧</span>
          <span class="info-card-title">Kontakt</span>
        </div>
        <div class="info-card-body">
          <a href="mailto:kontakt@cienfestiwal.com" style="color:var(--zloto)">kontakt@cienfestiwal.com</a><br>
          <a href="https://cienfestiwal.com" style="color:var(--zloto)" target="_blank">cienfestiwal.com</a>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// INSTALL PROMPT
// ============================================

let installPromptEvent = null;

function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installPromptEvent = e;
    const banner = document.getElementById('install-banner');
    if (banner) banner.classList.add('show');
  });
}

function triggerInstall() {
  if (!installPromptEvent) return;
  installPromptEvent.prompt();
  installPromptEvent.userChoice.then(() => {
    installPromptEvent = null;
    dismissInstall();
  });
}

function dismissInstall() {
  const banner = document.getElementById('install-banner');
  if (banner) banner.classList.remove('show');
}

// ============================================
// SERVICE WORKER
// ============================================

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(console.error);
  }
}

// ============================================
// VIEW: SLOW DATING
// ============================================

const SD_TAGS = [
  'Psychodeliki', 'Hipnoza', 'Jung', 'Taniec', 'Muzyka', 'Psychologia',
  'Buddyzm', 'Sztuka', 'Natura', 'Medytacja', 'Trauma', 'NVC',
  'Filozofia', 'Ruch', 'Dźwięk', 'Integracja'
];

function getSDProfile() {
  try { return JSON.parse(localStorage.getItem('cien_sd_profile_2026') || '{}'); } catch { return {}; }
}

function saveSDProfile(profile) {
  localStorage.setItem('cien_sd_profile_2026', JSON.stringify(profile));
}

function getSDMeetings() {
  try { return JSON.parse(localStorage.getItem('cien_sd_meetings_2026') || '[]'); } catch { return []; }
}

function saveSDMeetings(meetings) {
  localStorage.setItem('cien_sd_meetings_2026', JSON.stringify(meetings));
}

function renderSlowDatingLocal() {
  const container = document.getElementById('slowdating-content');
  if (!container) return;

  const profile = getSDProfile();
  const meetings = getSDMeetings();

  const hasProfile = !!(profile.nick && profile.nick.trim());

  const cardHTML = `
    <div class="sd-card-preview">
      <div class="sd-card-nick ${hasProfile ? '' : 'placeholder'}">${profile.nick || 'Twój nick'}</div>
      <div class="sd-card-about ${profile.about ? '' : 'placeholder'}">${profile.about || 'Jedno zdanie o sobie...'}</div>
      <div class="sd-card-tags">
        ${(profile.tags || []).map(t => `<span class="sd-tag">${t}</span>`).join('')}
        ${!(profile.tags || []).length ? '<span class="sd-tag" style="opacity:0.4">tagi</span>' : ''}
      </div>
    </div>`;

  const sessionsHTML = `
    <div class="sd-anima-hero">
      <img src="icons/ksiezyc-slonce.jpg" alt="Anima Animus" class="sd-anima-img">
      <div class="sd-anima-label">Anima / Animus · Księżyc · Słońce</div>
    </div>
    <div class="sd-sessions">
      <div class="sd-session-pill">💘 Piątek 16:30–18:00 · Anima/Animus</div>
      <div class="sd-session-pill">💘 Piątek 18:30–20:00 · Anima/Animus</div>
    </div>`;

  const selectedTags = profile.tags || [];
  const tagsHTML = SD_TAGS.map(t => `
    <button class="sd-tag-btn ${selectedTags.includes(t) ? 'selected' : ''}"
            onclick="sdToggleTag('${t}')">${t}</button>`).join('');

  const meetingsHTML = meetings.length ? meetings.map((m, i) => `
    <div class="sd-meeting-card">
      <div class="sd-meeting-info">
        <div class="sd-meeting-nick">${escHtml(m.nick)}</div>
        ${m.note ? `<div class="sd-meeting-note">${escHtml(m.note)}</div>` : ''}
      </div>
      <div class="sd-meeting-actions">
        ${m.contact ? `<button class="sd-action-btn" onclick="sdContact('${escHtml(m.contact)}')" title="Kontakt">✉</button>` : ''}
        <button class="sd-action-btn" onclick="sdDeleteMeeting(${i})" title="Usuń">✕</button>
      </div>
    </div>`).join('') :
    `<div class="sd-empty-state">Nie zapisałeś jeszcze żadnego spotkania</div>`;

  container.innerHTML = `
    <div class="sd-hero">
      <div class="sd-hero-icon">💘</div>
      <div class="sd-hero-title">SLOW DATING</div>
      <div class="sd-hero-sub">Spotkanie bez algorytmów · prowadzi Maciek Kołodziejczyk EUPHIRE</div>
    </div>

    ${sessionsHTML}

    <div class="sd-section">
      <div class="sd-section-title">Twoja karta</div>
      ${cardHTML}

      <div class="sd-form">
        <div>
          <div class="sd-input-label">Nick / imię</div>
          <input class="sd-input" id="sd-nick" type="text" maxlength="30"
                 value="${escHtml(profile.nick || '')}"
                 placeholder="jak mówią na Ciebie"
                 oninput="sdUpdatePreview()">
        </div>
        <div>
          <div class="sd-input-label">Jedno zdanie o sobie</div>
          <input class="sd-input" id="sd-about" type="text" maxlength="80"
                 value="${escHtml(profile.about || '')}"
                 placeholder="Co robisz / skąd jesteś / co tu szukasz"
                 oninput="sdUpdatePreview()">
          <div class="sd-char-count" id="sd-char-count">${(profile.about || '').length}/80</div>
        </div>
        <div>
          <div class="sd-input-label">Tematy (max 4)</div>
          <div class="sd-tags-grid">${tagsHTML}</div>
        </div>
        <button class="btn btn-gold" onclick="sdSaveProfile()">Zapisz kartę</button>
      </div>
    </div>

    <div class="sd-section">
      <div class="sd-section-title">Moje spotkania</div>
      <div class="sd-meetings-list" id="sd-meetings-list">${meetingsHTML}</div>
      <button class="btn-burgund" onclick="sdOpenAddMeeting()" style="margin-top:0.75rem">+ Dodaj spotkanie</button>
    </div>
  `;
}

function sdUpdatePreview() {
  const nick = document.getElementById('sd-nick')?.value || '';
  const about = document.getElementById('sd-about')?.value || '';
  const charCount = document.getElementById('sd-char-count');
  if (charCount) charCount.textContent = `${about.length}/80`;

  const profile = getSDProfile();
  const nickEl = document.querySelector('.sd-card-nick');
  const aboutEl = document.querySelector('.sd-card-about');
  if (nickEl) {
    nickEl.textContent = nick || 'Twój nick';
    nickEl.classList.toggle('placeholder', !nick);
  }
  if (aboutEl) {
    aboutEl.textContent = about || 'Jedno zdanie o sobie...';
    aboutEl.classList.toggle('placeholder', !about);
  }
}

function sdToggleTag(tag) {
  const profile = getSDProfile();
  const tags = profile.tags || [];
  const idx = tags.indexOf(tag);
  if (idx >= 0) {
    tags.splice(idx, 1);
  } else {
    if (tags.length >= 4) { showToast('Maksymalnie 4 tagi'); return; }
    tags.push(tag);
  }
  profile.tags = tags;
  saveSDProfile(profile);

  const btn = document.querySelector(`.sd-tag-btn`);
  document.querySelectorAll('.sd-tag-btn').forEach(b => {
    if (b.textContent.trim() === tag) b.classList.toggle('selected', tags.includes(tag));
  });

  const tagsContainer = document.querySelector('.sd-card-tags');
  if (tagsContainer) {
    tagsContainer.innerHTML = tags.map(t => `<span class="sd-tag">${t}</span>`).join('') ||
      '<span class="sd-tag" style="opacity:0.4">tagi</span>';
  }
}

function sdSaveProfile() {
  const nick = document.getElementById('sd-nick')?.value?.trim() || '';
  const about = document.getElementById('sd-about')?.value?.trim() || '';
  const profile = getSDProfile();
  profile.nick = nick;
  profile.about = about;
  saveSDProfile(profile);
  showToast('Karta zapisana ✓');
}

function sdOpenAddMeeting() {
  const modal = document.getElementById('event-modal');
  modal.querySelector('.modal-zone-badge').style.color = '#8B3A52';
  modal.querySelector('.modal-zone-badge').innerHTML = '💘 Nowe spotkanie';
  modal.querySelector('.modal-title').textContent = 'Zapisz osobę';
  modal.querySelector('.modal-artist').style.display = 'none';
  modal.querySelector('.modal-time').innerHTML = '';
  modal.querySelector('.modal-description').innerHTML = `
    <div class="sd-modal-form">
      <div>
        <div class="sd-input-label">Nick / imię</div>
        <input class="sd-input" id="sd-new-nick" type="text" maxlength="40" placeholder="jak mają na imię">
      </div>
      <div>
        <div class="sd-input-label">Co mi się podobało / o czym rozmawialiśmy</div>
        <input class="sd-input" id="sd-new-note" type="text" maxlength="100" placeholder="notatka dla siebie">
      </div>
      <div>
        <div class="sd-input-label">Kontakt (email lub @) — opcjonalnie</div>
        <input class="sd-input" id="sd-new-contact" type="text" maxlength="80" placeholder="email@... lub @telegram">
      </div>
    </div>`;
  const tagsEl = modal.querySelector('.modal-tags');
  if (tagsEl) tagsEl.innerHTML = `
    <button class="btn btn-gold" onclick="sdConfirmAddMeeting()" style="width:100%;margin-top:0.5rem">Zapisz</button>`;
  modal.querySelector('.modal-overlay').classList.add('open');
  setTimeout(() => document.getElementById('sd-new-nick')?.focus(), 100);
}

function sdConfirmAddMeeting() {
  const nick = document.getElementById('sd-new-nick')?.value?.trim();
  if (!nick) { showToast('Wpisz nick lub imię'); return; }
  const note = document.getElementById('sd-new-note')?.value?.trim() || '';
  const contact = document.getElementById('sd-new-contact')?.value?.trim() || '';
  const meetings = getSDMeetings();
  meetings.unshift({ nick, note, contact, ts: Date.now() });
  saveSDMeetings(meetings);
  closeEventModal();
  showToast('Spotkanie zapisane ✓');
  const listEl = document.getElementById('sd-meetings-list');
  if (listEl) {
    listEl.innerHTML = meetings.map((m, i) => `
      <div class="sd-meeting-card">
        <div class="sd-meeting-info">
          <div class="sd-meeting-nick">${escHtml(m.nick)}</div>
          ${m.note ? `<div class="sd-meeting-note">${escHtml(m.note)}</div>` : ''}
        </div>
        <div class="sd-meeting-actions">
          ${m.contact ? `<button class="sd-action-btn" onclick="sdContact('${escHtml(m.contact)}')" title="Kontakt">✉</button>` : ''}
          <button class="sd-action-btn" onclick="sdDeleteMeeting(${i})" title="Usuń">✕</button>
        </div>
      </div>`).join('');
  }
}

function sdDeleteMeeting(idx) {
  const meetings = getSDMeetings();
  meetings.splice(idx, 1);
  saveSDMeetings(meetings);
  renderSlowDating();
}

function sdContact(contact) {
  if (contact.includes('@') && !contact.startsWith('@')) {
    window.location.href = `mailto:${contact}`;
  } else {
    showToast(contact);
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function getFavorites() {
  try { return JSON.parse(localStorage.getItem('cien_favs_2026') || '[]'); } catch { return []; }
}

function toggleFavorite(evId) {
  const favs = getFavorites();
  const idx = favs.indexOf(evId);
  if (idx >= 0) favs.splice(idx, 1); else favs.push(evId);
  localStorage.setItem('cien_favs_2026', JSON.stringify(favs));
  renderSchedule();
}

// ============================================
// UTILITIES
// ============================================

function getFestivalDay(iso) {
  const d = new Date(iso);
  if (d.getHours() < 6) d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

function getDuration(start, end) {
  const mins = Math.round((new Date(end) - new Date(start)) / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

function showToast(msg, duration = 2500) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed; bottom:calc(var(--nav-h) + 1rem); left:50%; transform:translateX(-50%);
      background:var(--noir-3); border:1px solid var(--zloto-2);
      color:var(--pergamin); padding:0.6rem 1.25rem; border-radius:20px;
      font-family:var(--font-display); font-size:0.65rem; letter-spacing:0.08em;
      z-index:400; white-space:nowrap; opacity:0; transition:opacity 200ms ease;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, duration);
}

// ============================================
// EXPOSE GLOBALS
// ============================================

Object.assign(window, {
  setActiveDay, setActiveZone, openEventModal, closeEventModal,
  setPoiType, highlightZone, openPoiModal,
  setJournalStage, autoSaveJournal, saveJournalEntry, emailJournalEntry, toggleEntry,
  callHelp, triggerInstall, dismissInstall,
  sdToggleTag, sdSaveProfile, sdUpdatePreview, sdOpenAddMeeting, sdConfirmAddMeeting, sdDeleteMeeting, sdContact,
  toggleFavorite
});

// ============================================
// BOOT
// ============================================

document.addEventListener('DOMContentLoaded', init);

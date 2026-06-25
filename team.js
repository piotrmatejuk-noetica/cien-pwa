/* ============================================
   CIEŃ FESTIWAL 2026 — Moja drużyna
   Backend: PocketBase @ sacrum.life/cien-pb
   ============================================ */

'use strict';

const PB = 'https://sacrum.life/cien-pb';

// ---- state ----
let _team       = null;
let _chatTab    = 'chat';   // 'chat' | 'notes' | 'meetings' | 'lokalizacja'
let _pollTimer  = null;
let _seenMsgIds = new Set();
let _messages   = [];
let _notes      = [];
let _meetings   = [];
let _notifTimers = [];
let _teamInitialized      = false;
let _chatInputListenerAdded = false;

// ---- radar state ----
let _myPos           = null;   // {lat, lng}
let _compassHeading  = null;   // degrees from north (null = unavailable)
let _watchId         = null;   // geolocation watch ID
let _locSharing      = false;
let _locUnsub        = null;
let _teamLocs        = {};     // uid → {name, lat, lng}
let _compassStarted  = false;
let _locWriteThrottle = null;
let _locPollTimer    = null;   // PocketBase location poll

// ============================================
// PocketBase helpers
// ============================================

async function _pb(path, opts = {}) {
  const res = await fetch(PB + path, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'PB error ' + res.status);
  }
  return res.json();
}

// ============================================
// Team management
// ============================================

function _genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function teamCreate(name) {
  const uid  = localStorage.getItem('cien_user_id') || 'guest';
  const uname = localStorage.getItem('cien_user_name') || 'Uczestnik';
  const code = _genCode();
  const team = await _pb('/api/collections/cien_teams/records', {
    method: 'POST',
    body: JSON.stringify({
      name, code,
      creator_uid: uid, creator_name: uname,
      members: JSON.stringify([{ uid, name: uname }]),
    }),
  });
  _persistTeam(team);
  return team;
}

async function teamJoin(code) {
  const uid   = localStorage.getItem('cien_user_id') || 'guest';
  const uname = localStorage.getItem('cien_user_name') || 'Uczestnik';
  const list  = await _pb(`/api/collections/cien_teams/records?filter=${encodeURIComponent(`code='${code.toUpperCase()}'`)}&perPage=1`);
  if (!list.items || !list.items.length) throw new Error('Nie znaleziono drużyny o tym kodzie');
  const team    = list.items[0];
  const members = _parseTeamMembers(team);
  if (!members.find(m => m.uid === uid)) {
    members.push({ uid, name: uname });
    await _pb(`/api/collections/cien_teams/records/${team.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ members: JSON.stringify(members) }),
    });
  }
  _persistTeam({ ...team, members });
  _syncProfileToTeam().catch(() => {});
  return team;
}

function _persistTeam(team) {
  _team = team;
  localStorage.setItem('cien_team_id',   team.id);
  localStorage.setItem('cien_team_code', team.code);
  localStorage.setItem('cien_team_name', team.name);
}

async function teamLoad() {
  const id = localStorage.getItem('cien_team_id');
  if (!id) return null;
  try {
    const team = await _pb(`/api/collections/cien_teams/records/${id}`);
    _team = team;
    _syncProfileToTeam().catch(() => {});
    return team;
  } catch (e) {
    localStorage.removeItem('cien_team_id');
    return null;
  }
}

function teamLeave() {
  localStorage.removeItem('cien_team_id');
  localStorage.removeItem('cien_team_code');
  localStorage.removeItem('cien_team_name');
  _team = null;
  _teamInitialized        = false;
  _chatInputListenerAdded = false;
  _seenMsgIds             = new Set();
  _stopPoll();
  _stopLocSharing();
  _messages = []; _notes = []; _meetings = [];
  renderTeamView();
}

// ============================================
// Messages
// ============================================

async function sendMessage(text) {
  const uid   = localStorage.getItem('cien_user_id') || 'guest';
  const uname = localStorage.getItem('cien_user_name') || 'Uczestnik';
  return _pb('/api/collections/cien_messages/records', {
    method: 'POST',
    body: JSON.stringify({
      team_id: _team.id,
      sender_uid: uid,
      sender_name: uname,
      text,
      msg_type: 'text',
    }),
  });
}

async function _fetchMessages() {
  // Note: cien_messages has no 'created' system field exposed — sort by id
  const filterExpr = `team_id='${_team.id}'`;
  const data = await _pb(`/api/collections/cien_messages/records?filter=${encodeURIComponent(filterExpr)}&sort=id&perPage=100`);
  return (data.items || []).filter(m => !_seenMsgIds.has(m.id));
}

function _startPoll() {
  _stopPoll();
  _pollMessages();
  _pollTimer = setInterval(_pollMessages, 5000);
}

function _stopPoll() {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
}

async function _pollMessages() {
  if (_chatTab !== 'chat') return;
  try {
    const newMsgs = await _fetchMessages();
    if (newMsgs.length) {
      newMsgs.forEach(m => _seenMsgIds.add(m.id));
      _messages.push(...newMsgs);
      _appendMessages(newMsgs);
    }
  } catch (_e) {}
}

// ============================================
// Notes
// ============================================

async function saveNote(title, content, lecture) {
  const uid   = localStorage.getItem('cien_user_id') || 'guest';
  const uname = localStorage.getItem('cien_user_name') || 'Uczestnik';
  const note = await _pb('/api/collections/cien_notes/records', {
    method: 'POST',
    body: JSON.stringify({
      team_id: _team.id,
      author_uid: uid, author_name: uname,
      title, content, lecture,
    }),
  });
  _notes.unshift(note);
  return note;
}

async function _fetchNotes() {
  const filterExpr = `team_id='${_team.id}'`;
  const data = await _pb(`/api/collections/cien_notes/records?filter=${encodeURIComponent(filterExpr)}&perPage=50`);
  return data.items || [];
}

// ============================================
// Meetings
// ============================================

const FESTIVAL_DAYS = {
  'Piątek 3 VII':   '2026-07-03',
  'Sobota 4 VII':   '2026-07-04',
  'Niedziela 5 VII':'2026-07-05',
};

async function createMeeting(title, zone, day, time) {
  const uid   = localStorage.getItem('cien_user_id') || 'guest';
  const uname = localStorage.getItem('cien_user_name') || 'Uczestnik';
  const m = await _pb('/api/collections/cien_meetings/records', {
    method: 'POST',
    body: JSON.stringify({
      team_id: _team.id,
      title, zone, day, time,
      creator_uid: uid, creator_name: uname,
    }),
  });
  _meetings.push(m);
  _scheduleMeetingNotif(m);
  return m;
}

async function _fetchMeetings() {
  const filterExpr = `team_id='${_team.id}'`;
  const data = await _pb(`/api/collections/cien_meetings/records?filter=${encodeURIComponent(filterExpr)}&sort=day,time&perPage=50`);
  return data.items || [];
}

// ============================================
// Notifications
// ============================================

async function _requestNotifPerm() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const r = await Notification.requestPermission();
  return r === 'granted';
}

function _scheduleMeetingNotif(m) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const date = FESTIVAL_DAYS[m.day];
  if (!date || !m.time) return;
  const meetingDt = new Date(`${date}T${m.time}:00`);
  const notifDt   = new Date(meetingDt.getTime() - 15 * 60 * 1000);
  const delay     = notifDt - Date.now();
  if (delay > 0 && delay < 48 * 3600 * 1000) {
    const t = setTimeout(() => {
      new Notification('CIEŃ — Spotkanie drużyny za 15 min!', {
        body: `${m.title || ''}${m.zone ? ' · ' + m.zone : ''} · ${m.time}`,
        icon: '/icons/cien-logo.png',
      });
    }, delay);
    _notifTimers.push(t);
  }
}

async function _scheduleAllNotifs() {
  _notifTimers.forEach(t => clearTimeout(t));
  _notifTimers = [];
  const granted = await _requestNotifPerm();
  if (!granted || !_team) return;
  try {
    const meetings = await _fetchMeetings();
    meetings.forEach(_scheduleMeetingNotif);
  } catch (_e) {}
}

// ============================================
// Rendering — no-team state
// ============================================

function renderTeamView() {
  const el = document.getElementById('team-content');
  if (!el) return;
  if (!_team) {
    el.innerHTML = _tmplNoTeam();
    return;
  }
  el.innerHTML = _tmplTeam();
  _setupChatInput();
  _renderChatTab();
  if (_chatTab === 'chat') _startPoll();
}

function _tmplNoTeam() {
  return `
<div class="team-no-team">
  <div class="team-logo-wrap">
    <img src="icons/cien-logo.png" alt="" class="team-logo-sm">
  </div>
  <h2 class="team-heading">Moja drużyna</h2>
  <p class="team-sub">Łączcie się w grupy — wymieniajcie notatki, umawiajcie spotkania, gadajcie w czasie rzeczywistym.</p>

  <div class="team-card">
    <div class="team-card-title">Utwórz drużynę</div>
    <input id="team-create-name" class="team-input" placeholder="Nazwa drużyny" maxlength="40">
    <button class="team-btn team-btn-primary" onclick="teamCreateUI()">Utwórz</button>
  </div>

  <div class="team-divider">— lub —</div>

  <div class="team-card">
    <div class="team-card-title">Dołącz do drużyny</div>
    <input id="team-join-code" class="team-input" placeholder="Kod drużyny (6 znaków)" maxlength="6" style="text-transform:uppercase;letter-spacing:0.2em;text-align:center">
    <button class="team-btn team-btn-secondary" onclick="teamJoinUI()">Dołącz</button>
  </div>

  <div id="team-error" class="team-error"></div>
</div>`;
}

function _tmplTeam() {
  const members = _parseMembersList();
  const myUid = localStorage.getItem('cien_user_id') || '';
  const at = t => _chatTab === t ? 'active' : '';
  const membersHtml = members.map(m => {
    const isMe = m.uid === myUid;
    const displayName = m.nick || m.name || 'Uczestnik';
    const initials = displayName.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const avatarHTML = m.photo
      ? `<img src="${m.photo}" class="team-member-avatar team-member-avatar--photo" alt="">`
      : `<div class="team-member-avatar">${_esc(initials)}</div>`;
    return `<div class="team-member-row" onclick="showMemberProfile('${_esc(m.uid)}')">
      ${avatarHTML}
      <div class="team-member-info">
        <div class="team-member-name">${_esc(displayName)}${isMe ? ' <span class="team-member-you">(Ty)</span>' : ''}</div>
        ${m.about ? `<div class="team-member-about">${_esc(m.about)}</div>` : ''}
      </div>
      <span class="team-member-arrow">›</span>
    </div>`;
  }).join('');
  return `
<div class="team-header">
  <div class="team-header-name">${_esc(_team.name)}</div>
  <div class="team-header-meta">Kod: <strong class="team-code">${_esc(_team.code)}</strong></div>
  <button class="team-leave-btn" onclick="if(confirm('Opuścić drużynę?')) teamLeave()">Opuść</button>
</div>

<div class="team-members-section">
  <div class="team-members-label">${members.length} ${members.length === 1 ? 'osoba' : members.length < 5 ? 'osoby' : 'osób'}</div>
  <div class="team-members-list">${membersHtml || '<div class="team-empty">Brak członków</div>'}</div>
</div>

<div class="team-tabs">
  <button class="team-tab ${at('chat')}"        data-tab="chat"        onclick="switchTeamTab('chat')">💬 Chat</button>
  <button class="team-tab ${at('notes')}"        data-tab="notes"       onclick="switchTeamTab('notes')">📝 Notatki</button>
  <button class="team-tab ${at('meetings')}"     data-tab="meetings"    onclick="switchTeamTab('meetings')">📅 Spotkania</button>
  <button class="team-tab ${at('lokalizacja')}"  data-tab="lokalizacja" onclick="switchTeamTab('lokalizacja')">📡 Radar</button>
</div>

<div id="team-tab-body"></div>`;
}

function _parseTeamMembers(team) {
  let members = (team || _team).members || [];
  if (typeof members === 'string') { try { members = JSON.parse(members); } catch (_e) { members = []; } }
  return members;
}

function _parseMembersList() {
  return _parseTeamMembers(_team);
}

// ============================================
// Tabs
// ============================================

function switchTeamTab(tab) {
  _chatTab = tab;
  if (tab !== 'chat') _stopPoll();
  document.querySelectorAll('.team-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab)
  );
  _renderChatTab();
  if (tab === 'chat') _startPoll();
}

function _renderChatTab() {
  const body = document.getElementById('team-tab-body');
  if (!body) return;
  if (_chatTab === 'chat')        { body.innerHTML = _tmplChat();          _scrollChat(); }
  if (_chatTab === 'notes')       { body.innerHTML = _tmplNotesList();     _loadNotesUI(); }
  if (_chatTab === 'meetings')    { body.innerHTML = _tmplMeetingsList();  _loadMeetingsUI(); }
  if (_chatTab === 'lokalizacja') { _renderLocTab(); }
}

// ============================================
// Chat
// ============================================

function _tmplChat() {
  const msgsHtml = _messages.length
    ? _messages.map(_msgHtml).join('')
    : '<div class="team-chat-empty">Brak wiadomości — zacznijcie rozmowę!</div>';
  return `
<div id="team-messages" class="team-messages">
  ${msgsHtml}
  <div id="team-msgs-end"></div>
</div>
<div class="team-chat-input-wrap">
  <textarea id="team-msg-input" class="team-msg-input" placeholder="Napisz wiadomość…" rows="1" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMessageUI();}"></textarea>
  <button class="team-send-btn" onclick="sendMessageUI()">➤</button>
</div>`;
}

function _msgHtml(m) {
  const mine = m.sender_uid === (localStorage.getItem('cien_user_id') || '');
  const ts   = m.created ? m.created.slice(11, 16) : '';
  return `<div class="team-msg ${mine ? 'mine' : ''}">
    ${!mine ? `<div class="team-msg-name">${_esc(m.sender_name || 'Uczestnik')}</div>` : ''}
    <div class="team-msg-bubble">${_esc(m.text)}</div>
    ${ts ? `<div class="team-msg-ts">${ts}</div>` : ''}
  </div>`;
}

function _appendMessages(newMsgs) {
  const end = document.getElementById('team-msgs-end');
  if (!end) return;
  const empty = document.querySelector('#team-messages .team-chat-empty');
  if (empty) empty.remove();
  newMsgs.forEach(m => end.insertAdjacentHTML('beforebegin', _msgHtml(m)));
  _scrollChat();
}

function _scrollChat() {
  const end = document.getElementById('team-msgs-end');
  if (end) end.scrollIntoView({ behavior: 'smooth' });
}

function _setupChatInput() {
  if (_chatInputListenerAdded) return;
  _chatInputListenerAdded = true;
  document.addEventListener('input', e => {
    if (e.target.id === 'team-msg-input') {
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    }
  });
}

async function sendMessageUI() {
  const inp = document.getElementById('team-msg-input');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text || !_team) return;
  inp.value = '';
  inp.style.height = 'auto';
  try {
    const m = await sendMessage(text);
    _seenMsgIds.add(m.id);
    _messages.push(m);
    _appendMessages([m]);
  } catch (e) {
    _showTeamError('Błąd wysyłania: ' + e.message);
  }
}

// ============================================
// Notes
// ============================================

function _tmplNotesList() {
  return `
<div class="team-section">
  <button class="team-btn team-btn-secondary" onclick="showAddNoteUI()" style="margin-bottom:1rem">+ Dodaj notatkę</button>
  <div id="team-notes-list">
    <div class="team-loading">Ładowanie notatek…</div>
  </div>
</div>
<div id="team-note-form" class="team-note-form" style="display:none">
  <input id="note-title"   class="team-input" placeholder="Tytuł notatki">
  <input id="note-lecture" class="team-input" placeholder="Wykład / warsztat (opcjonalnie)">
  <textarea id="note-content" class="team-input" placeholder="Treść notatki…" rows="5" style="resize:vertical"></textarea>
  <div style="display:flex;gap:0.5rem">
    <button class="team-btn team-btn-primary" onclick="saveNoteUI()" style="flex:1">Zapisz</button>
    <button class="team-btn team-btn-ghost"   onclick="hideAddNoteUI()">Anuluj</button>
  </div>
</div>`;
}

function showAddNoteUI() {
  document.getElementById('team-note-form').style.display = 'block';
}
function hideAddNoteUI() {
  document.getElementById('team-note-form').style.display = 'none';
}

async function saveNoteUI() {
  const title   = document.getElementById('note-title')?.value.trim();
  const lecture = document.getElementById('note-lecture')?.value.trim();
  const content = document.getElementById('note-content')?.value.trim();
  if (!content) return;
  try {
    await saveNote(title || 'Notatka', content, lecture);
    hideAddNoteUI();
    _loadNotesUI();
  } catch (e) {
    _showTeamError('Błąd zapisu: ' + e.message);
  }
}

async function _loadNotesUI() {
  const el = document.getElementById('team-notes-list');
  if (!el) return;
  try {
    const data = await _fetchNotes();
    _notes = data;
    if (!data.length) {
      el.innerHTML = '<div class="team-empty">Brak notatek. Dodajcie pierwsze notatki z wykładów!</div>';
      return;
    }
    el.innerHTML = data.map(n => `
<div class="team-note-card">
  <div class="team-note-title">${_esc(n.title || 'Notatka')}</div>
  ${n.lecture ? `<div class="team-note-lecture">📍 ${_esc(n.lecture)}</div>` : ''}
  <div class="team-note-author">${_esc(n.author_name || '')}</div>
  <div class="team-note-content">${_esc(n.content).replace(/\n/g,'<br>')}</div>
</div>`).join('');
  } catch (e) {
    el.innerHTML = '<div class="team-empty">Błąd ładowania notatek.</div>';
  }
}

// ============================================
// Meetings
// ============================================

function _tmplMeetingsList() {
  return `
<div class="team-section">
  <button class="team-btn team-btn-secondary" onclick="showAddMeetingUI()" style="margin-bottom:1rem">+ Umów spotkanie</button>
  <div id="team-meetings-list">
    <div class="team-loading">Ładowanie spotkań…</div>
  </div>
</div>
<div id="team-meeting-form" class="team-note-form" style="display:none">
  <input id="mtg-title" class="team-input" placeholder="Opis spotkania (np. Podsumowanie)">
  <select id="mtg-day" class="team-input team-select">
    <option value="">Wybierz dzień</option>
    <option>Piątek 3 VII</option>
    <option>Sobota 4 VII</option>
    <option>Niedziela 5 VII</option>
  </select>
  <input id="mtg-time" class="team-input" type="time">
  <input id="mtg-zone" class="team-input" placeholder="Miejsce / strefa (np. Wieża, Dziedziniec)">
  <div class="team-notif-hint">🔔 Dostaniesz powiadomienie 15 min przed spotkaniem</div>
  <div style="display:flex;gap:0.5rem">
    <button class="team-btn team-btn-primary" onclick="saveMeetingUI()" style="flex:1">Zaplanuj</button>
    <button class="team-btn team-btn-ghost"   onclick="hideAddMeetingUI()">Anuluj</button>
  </div>
</div>`;
}

function showAddMeetingUI() {
  document.getElementById('team-meeting-form').style.display = 'block';
  _requestNotifPerm();
}
function hideAddMeetingUI() {
  document.getElementById('team-meeting-form').style.display = 'none';
}

async function saveMeetingUI() {
  const title = document.getElementById('mtg-title')?.value.trim();
  const day   = document.getElementById('mtg-day')?.value;
  const time  = document.getElementById('mtg-time')?.value;
  const zone  = document.getElementById('mtg-zone')?.value.trim();
  if (!day || !time) { _showTeamError('Wybierz dzień i godzinę'); return; }
  try {
    await createMeeting(title || 'Spotkanie drużyny', zone, day, time);
    hideAddMeetingUI();
    _loadMeetingsUI();
  } catch (e) {
    _showTeamError('Błąd zapisu: ' + e.message);
  }
}

async function _loadMeetingsUI() {
  const el = document.getElementById('team-meetings-list');
  if (!el) return;
  try {
    const data = await _fetchMeetings();
    _meetings = data;
    if (!data.length) {
      el.innerHTML = '<div class="team-empty">Brak spotkań. Umówcie pierwsze!</div>';
      return;
    }
    el.innerHTML = data.map(m => `
<div class="team-meeting-card">
  <div class="team-meeting-day">${_esc(m.day)}</div>
  <div class="team-meeting-time">${_esc(m.time)}</div>
  <div class="team-meeting-title">${_esc(m.title || 'Spotkanie')}</div>
  ${m.zone ? `<div class="team-meeting-zone">📍 ${_esc(m.zone)}</div>` : ''}
  <div class="team-meeting-by">Dodał/a: ${_esc(m.creator_name || '')}</div>
</div>`).join('');
  } catch (e) {
    el.innerHTML = '<div class="team-empty">Błąd ładowania spotkań.</div>';
  }
}

// ============================================
// Radar / Location
// ============================================

const LOC_DESTINATIONS = [
  { id: 'camping', label: 'Camping pod lasem',    emoji: '🏕️', lat: 50.932831, lng: 16.116392 },
  { id: 'sacrum',  label: 'Strefa SACRUM / PsyCare', emoji: '✨', lat: 50.938909, lng: 16.112543 },
  { id: 'gastro',  label: 'GastroPhase (jedzenie)', emoji: '🍲', lat: 50.939216, lng: 16.112998 },
  { id: 'bar',     label: 'Bar u Alchemików',     emoji: '☕', lat: 50.938717, lng: 16.112743 },
  { id: 'umbra',   label: 'Scena UMBRA',          emoji: '⚡', lat: 50.938610, lng: 16.112732 },
  { id: 'toalety', label: 'Toalety',              emoji: '🚻', lat: 50.938865, lng: 16.113559 },
];

let _navTarget = null;  // { label, lat, lng, isTeammate?, uid? }

function _haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function _bearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

function _distLabel(m) {
  return m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(1) + ' km';
}

function _heatClass(m) {
  if (m < 20)  return 'loc-hot';
  if (m < 50)  return 'loc-warm';
  if (m < 150) return 'loc-mild';
  return 'loc-cold';
}

function _heatLabel(m) {
  if (m < 20)  return '🔥 Gorąco!';
  if (m < 50)  return '♨️ Ciepło';
  if (m < 150) return '😐 Letnio';
  return '❄️ Zimno';
}

function _startCompass() {
  if (_compassStarted) return;
  const handler = e => {
    const h = e.webkitCompassHeading != null
      ? e.webkitCompassHeading
      : (e.alpha != null ? (360 - e.alpha) : null);
    if (h != null) {
      _compassHeading = h;
      _updateLocationArrows();
    }
  };
  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
      .then(s => {
        if (s === 'granted') {
          window.addEventListener('deviceorientation', handler, true);
          _compassStarted = true;
        }
      }).catch(() => {});
  } else if (typeof DeviceOrientationEvent !== 'undefined') {
    window.addEventListener('deviceorientation', handler, true);
    _compassStarted = true;
  }
}

async function _writeMyLoc() {
  if (!_myPos || !_team) return;
  const uid   = localStorage.getItem('cien_user_id') || 'guest';
  const uname = localStorage.getItem('cien_user_name') || 'Uczestnik';
  try {
    const current = await _pb(`/api/collections/cien_teams/records/${_team.id}`);
    const members = _parseTeamMembers(current);
    const me = members.find(m => m.uid === uid);
    if (me) {
      me.lat = _myPos.lat; me.lng = _myPos.lng; me.at = Date.now();
    } else {
      members.push({ uid, name: uname, lat: _myPos.lat, lng: _myPos.lng, at: Date.now() });
    }
    await _pb(`/api/collections/cien_teams/records/${_team.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ members: JSON.stringify(members) }),
    });
  } catch (_e) {}
}

async function _fetchTeamLocsPB() {
  if (!_team) return;
  const uid = localStorage.getItem('cien_user_id') || 'guest';
  try {
    const data = await _pb(`/api/collections/cien_teams/records/${_team.id}`);
    const members = _parseTeamMembers(data);
    const cutoff = Date.now() - 90000; // stale po 90s
    _teamLocs = {};
    members.forEach(m => {
      if (m.uid !== uid && m.lat && m.lng && (!m.at || m.at > cutoff)) {
        _teamLocs[m.uid] = m;
      }
    });
    _updateLocationUI();
    _updateLocationArrows();
  } catch (_e) {}
}

function _startLocSharing() {
  if (_locSharing) return;
  _locSharing = true;
  _watchId = navigator.geolocation.watchPosition(
    pos => {
      _myPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (_locWriteThrottle) clearTimeout(_locWriteThrottle);
      _locWriteThrottle = setTimeout(_writeMyLoc, 3000);
      _updateLocationArrows();
    },
    () => {},
    { enableHighAccuracy: true, maximumAge: 5000 }
  );
  _listenTeamLocations();
  _renderLocTab();
}

function _stopLocSharing() {
  if (!_locSharing && _watchId == null) return;
  _locSharing = false;
  if (_watchId != null) { navigator.geolocation.clearWatch(_watchId); _watchId = null; }
  if (_locUnsub)         { _locUnsub(); _locUnsub = null; }
  if (_locWriteThrottle) { clearTimeout(_locWriteThrottle); _locWriteThrottle = null; }
  _myPos = null;
  _teamLocs = {};
  if (_chatTab === 'lokalizacja') _renderLocTab();
}

function _listenTeamLocations() {
  if (!_team) return;
  if (_locPollTimer) clearInterval(_locPollTimer);
  _fetchTeamLocsPB();
  _locPollTimer = setInterval(_fetchTeamLocsPB, 5000);
  _locUnsub = () => { clearInterval(_locPollTimer); _locPollTimer = null; };
}

function _updateLocationUI() {
  if (_chatTab !== 'lokalizacja') return;
  const el = document.getElementById('loc-teammates');
  if (!el) return;
  const active = Object.values(_teamLocs);
  if (!active.length) {
    el.innerHTML = '<div class="loc-empty">Nikt z drużyny nie udostępnia lokalizacji</div>';
    return;
  }
  el.innerHTML = active.map(m => {
    const dist = _myPos ? _haversine(_myPos.lat, _myPos.lng, m.lat, m.lng) : null;
    const bear = _myPos ? _bearing(_myPos.lat, _myPos.lng, m.lat, m.lng) : null;
    const rel  = (bear != null && _compassHeading != null) ? (bear - _compassHeading + 360) % 360 : null;
    const isSelected = _navTarget?.isTeammate && _navTarget.uid === m.uid;
    return `<div class="loc-member-card ${dist != null ? _heatClass(dist) : ''} ${isSelected ? 'loc-selected' : ''}"
                 onclick="setNavTarget('teammate','${m.uid}',decodeURIComponent('${encodeURIComponent(m.name || 'Uczestnik')}'),${m.lat},${m.lng})">
      <div class="loc-member-name">${_esc(m.name || 'Uczestnik')}</div>
      ${dist != null ? `<div class="loc-dist-value">${_distLabel(dist)}</div><div class="loc-heat-label">${_heatLabel(dist)}</div>` : '<div class="loc-heat-label">Pozycja znana</div>'}
      ${rel != null ? `<div class="loc-arrow" style="transform:rotate(${rel}deg)">▲</div>` : ''}
    </div>`;
  }).join('');
}

function _updateLocationArrows() {
  if (_chatTab !== 'lokalizacja') return;
  _updateLocationUI();
  const arrowEl = document.getElementById('loc-nav-arrow');
  const distEl  = document.getElementById('loc-nav-dist');
  const heatEl  = document.getElementById('loc-nav-heat');
  if (!arrowEl || !_navTarget || !_myPos) return;

  let tLat = _navTarget.lat;
  let tLng = _navTarget.lng;
  if (_navTarget.isTeammate && _teamLocs[_navTarget.uid]) {
    tLat = _teamLocs[_navTarget.uid].lat;
    tLng = _teamLocs[_navTarget.uid].lng;
  }

  const dist = _haversine(_myPos.lat, _myPos.lng, tLat, tLng);
  const bear = _bearing(_myPos.lat, _myPos.lng, tLat, tLng);
  const rel  = _compassHeading != null ? (bear - _compassHeading + 360) % 360 : bear;

  if (distEl) distEl.textContent = _distLabel(dist);
  if (heatEl) { heatEl.textContent = _heatLabel(dist); heatEl.className = 'loc-nav-heat ' + _heatClass(dist); }
  arrowEl.style.transform = `rotate(${rel}deg)`;
}

function setNavTarget(type, uid, name, lat, lng) {
  if (type === 'teammate') {
    _navTarget = { isTeammate: true, uid, label: name, lat: parseFloat(lat), lng: parseFloat(lng) };
  } else {
    _navTarget = { isTeammate: false, label: name, lat: parseFloat(lat), lng: parseFloat(lng) };
  }
  _renderLocTab();
}

function clearNavTarget() {
  _navTarget = null;
  _renderLocTab();
}

async function setCustomAddress() {
  const inp = document.getElementById('loc-custom-addr');
  if (!inp || !inp.value.trim()) return;
  const query = encodeURIComponent(inp.value.trim() + ', Dolny Śląsk, Poland');
  try {
    const res  = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
    const data = await res.json();
    if (data && data[0]) {
      _navTarget = { isTeammate: false, label: inp.value.trim(), lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      _renderLocTab();
    } else {
      alert('Nie znaleziono adresu. Spróbuj pełniejszego adresu.');
    }
  } catch (_e) {
    alert('Błąd wyszukiwania — sprawdź połączenie.');
  }
}

function _tmplLocTab() {
  return `
<div class="loc-section">
  <div class="loc-share-wrap">
    <div class="loc-share-info">
      <div class="loc-share-title">Moja lokalizacja</div>
      <div class="loc-share-sub">${_locSharing ? '📡 Udostępniasz lokalizację drużynie' : 'Ukryta — drużyna Cię nie widzi'}</div>
    </div>
    ${navigator.geolocation
      ? `<button class="loc-share-btn ${_locSharing ? 'loc-share-active' : ''}" onclick="toggleLocSharing()">
           ${_locSharing ? 'Wyłącz' : 'Włącz'}
         </button>`
      : `<span class="loc-no-gps">GPS niedostępny</span>`
    }
  </div>
</div>

${_navTarget ? `
<div class="loc-section loc-nav-display">
  <div class="loc-nav-label">${_esc(_navTarget.label)}</div>
  <div class="loc-nav-arrow-wrap">
    <div id="loc-nav-arrow" class="loc-nav-big-arrow" style="transform:rotate(0deg)">▲</div>
  </div>
  <div id="loc-nav-dist" class="loc-nav-dist-val">${_myPos ? '…' : 'Włącz lokalizację'}</div>
  <div id="loc-nav-heat" class="loc-nav-heat">${!_myPos ? '' : _compassHeading == null ? 'Skieruj telefon w górę dla strzałki' : ''}</div>
  <button class="loc-back-btn" onclick="clearNavTarget()">← Zmień cel</button>
</div>` : ''}

<div class="loc-section">
  <div class="loc-section-title">Dokąd iść?</div>
  <div class="loc-dest-grid">
    ${LOC_DESTINATIONS.map(d => `
      <button class="loc-dest-btn ${_navTarget && !_navTarget.isTeammate && _navTarget.label === d.label ? 'loc-dest-active' : ''}"
              onclick="setNavTarget('destination','',decodeURIComponent('${encodeURIComponent(d.label)}'),${d.lat},${d.lng})">
        <span class="loc-dest-emoji">${d.emoji}</span>
        <span class="loc-dest-label">${_esc(d.label)}</span>
      </button>`).join('')}
    <button class="loc-dest-btn" onclick="document.getElementById('loc-custom-wrap').style.display='block';this.style.display='none'">
      <span class="loc-dest-emoji">🏠</span>
      <span class="loc-dest-label">Własny adres</span>
    </button>
  </div>
  <div id="loc-custom-wrap" style="display:none;margin-top:0.75rem">
    <input id="loc-custom-addr" class="team-input" placeholder="np. ul. Zamkowa 1, Bolków">
    <button class="team-btn team-btn-primary" style="margin-top:0.5rem;width:100%" onclick="setCustomAddress()">Nawiguj</button>
  </div>
</div>

<div class="loc-section">
  <div class="loc-section-title">Drużyna</div>
  <div id="loc-teammates">
    ${!_locSharing
      ? '<div class="loc-empty">Włącz lokalizację, żeby zobaczyć gdzie są ziomkowie</div>'
      : '<div class="loc-empty">Ładowanie…</div>'
    }
  </div>
</div>`;
}

function _renderLocTab() {
  if (_chatTab !== 'lokalizacja') return;
  const body = document.getElementById('team-tab-body');
  if (!body) return;
  body.innerHTML = _tmplLocTab();
  if (_myPos) setTimeout(_updateLocationArrows, 50);
}

function toggleLocSharing() {
  if (_locSharing) {
    _stopLocSharing();
  } else {
    if (!navigator.geolocation) { alert('GPS niedostępny w tej przeglądarce.'); return; }
    _startCompass();
    _startLocSharing();
  }
}

// ============================================
// Create / Join — UI
// ============================================

async function teamCreateUI() {
  const inp = document.getElementById('team-create-name');
  const name = inp ? inp.value.trim() : '';
  if (!name) { _showTeamError('Podaj nazwę drużyny'); return; }
  _showTeamError('');
  inp.disabled = true;
  try {
    await teamCreate(name);
    await _scheduleAllNotifs();
    renderTeamView();
  } catch (e) {
    _showTeamError('Błąd: ' + e.message);
    if (inp) inp.disabled = false;
  }
}

async function teamJoinUI() {
  const inp  = document.getElementById('team-join-code');
  const code = inp ? inp.value.trim().toUpperCase() : '';
  if (code.length < 4) { _showTeamError('Wpisz kod drużyny'); return; }
  _showTeamError('');
  inp.disabled = true;
  try {
    await teamJoin(code);
    await _scheduleAllNotifs();
    renderTeamView();
  } catch (e) {
    _showTeamError(e.message);
    if (inp) inp.disabled = false;
  }
}

// ============================================
// Profile sync
// ============================================

async function _syncProfileToTeam() {
  if (!_team) return;
  const myUid = localStorage.getItem('cien_user_id') || '';
  if (!myUid) return;
  const p = (function() { try { return JSON.parse(localStorage.getItem('cien_sd_profile_2026') || '{}'); } catch { return {}; } })();
  const current = await _pb(`/api/collections/cien_teams/records/${_team.id}`);
  let members = current.members || [];
  if (typeof members === 'string') { try { members = JSON.parse(members); } catch { members = []; } }
  const idx = members.findIndex(m => m.uid === myUid);
  const entry = idx >= 0 ? { ...members[idx] } : { uid: myUid, name: localStorage.getItem('cien_user_name') || 'Uczestnik' };
  if (p.nick)    entry.nick    = p.nick;
  if (p.about)   entry.about   = p.about;
  if (p.tags)    entry.tags    = p.tags;
  if (p.photo)   entry.photo   = p.photo;
  if (p.shadows) entry.shadows = p.shadows;
  if (idx >= 0) members[idx] = entry; else members.push(entry);
  await _pb(`/api/collections/cien_teams/records/${_team.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ members: JSON.stringify(members) }),
  });
  _team.members = JSON.stringify(members);
}

// ============================================
// Member profile modal
// ============================================

function showMemberProfile(uid) {
  const members = _parseMembersList();
  const m = members.find(x => x.uid === uid);
  if (!m) return;
  const myUid = localStorage.getItem('cien_user_id') || '';
  const isMe = m.uid === myUid;
  const displayName = m.nick || m.name || 'Uczestnik';
  const initials = displayName.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const avatarHTML = m.photo
    ? `<img src="${m.photo}" class="member-modal-photo" alt="">`
    : `<div class="member-modal-avatar">${_esc(initials)}</div>`;
  const tagsHTML = (m.tags || []).map(t => `<span class="sd-tag">${_esc(t)}</span>`).join('');

  let modal = document.getElementById('member-profile-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'member-profile-modal';
    modal.className = 'member-modal-overlay';
    modal.onclick = e => { if (e.target === modal) closeMemberProfile(); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="member-modal-sheet">
      <button class="member-modal-close" onclick="closeMemberProfile()">✕</button>
      <div class="member-modal-header">
        ${avatarHTML}
        <div class="member-modal-name">${_esc(displayName)}${isMe ? ' <span class="team-member-you">(Ty)</span>' : ''}</div>
        ${m.about ? `<div class="member-modal-about">${_esc(m.about)}</div>` : ''}
      </div>
      ${tagsHTML ? `<div class="member-modal-tags">${tagsHTML}</div>` : ''}
      ${m.shadows ? `
        <div class="member-modal-section">
          <div class="member-modal-section-title">🌑 Moje Cienie</div>
          <div class="member-modal-section-body">${_esc(m.shadows)}</div>
        </div>` : ''}
      ${isMe ? `<button class="btn btn-gold" style="margin:1rem 0 0;width:100%" onclick="closeMemberProfile();navigateTo('profil')">Edytuj profil</button>` : ''}
    </div>`;
  modal.style.display = 'flex';
}

function closeMemberProfile() {
  const modal = document.getElementById('member-profile-modal');
  if (modal) modal.style.display = 'none';
}

// ============================================
// Utils
// ============================================

function _esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function _showTeamError(msg) {
  const el = document.getElementById('team-error');
  if (el) el.textContent = msg;
}

// ============================================
// Bootstrap — called from app.js init()
// ============================================

async function initTeam() {
  if (_teamInitialized) return;
  _teamInitialized = true;
  const team = await teamLoad();
  if (team) {
    await _scheduleAllNotifs();
    // Re-render if user already navigated to druzyna before fetch completed
    if (document.getElementById('view-druzyna')?.classList.contains('active')) {
      renderTeamView();
    }
  }
}

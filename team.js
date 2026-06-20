/* ============================================
   CIEŃ FESTIWAL 2026 — Moja drużyna
   Backend: PocketBase @ sacrum.life/cien-pb
   ============================================ */

'use strict';

const PB = 'https://sacrum.life/cien-pb';

// ---- state ----
let _team       = null;
let _chatTab    = 'chat';   // 'chat' | 'notes' | 'meetings'
let _pollTimer  = null;
let _lastMsgTs  = null;
let _messages   = [];
let _notes      = [];
let _meetings   = [];
let _notifTimers = [];

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

function _encode(v) { return encodeURIComponent(v); }

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
  const list  = await _pb(`/api/collections/cien_teams/records?filter=${_encode(`(code='${code.toUpperCase()}')`)}&perPage=1`);
  if (!list.items || !list.items.length) throw new Error('Nie znaleziono drużyny o tym kodzie');
  const team = list.items[0];
  let members = team.members || [];
  if (typeof members === 'string') members = JSON.parse(members || '[]');
  if (!members.find(m => m.uid === uid)) {
    members.push({ uid, name: uname });
    await _pb(`/api/collections/cien_teams/records/${team.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ members: JSON.stringify(members) }),
    });
  }
  _persistTeam({ ...team, members });
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
  _stopPoll();
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
  const filter = _lastMsgTs
    ? `(team_id='${_team.id}'%26%26created>'${_lastMsgTs}')`
    : `(team_id='${_team.id}')`;
  const data = await _pb(`/api/collections/cien_messages/records?filter=${filter}&sort=created&perPage=100`);
  return data.items || [];
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
      _messages = [..._messages, ...newMsgs];
      if (newMsgs.length) _lastMsgTs = newMsgs[newMsgs.length - 1].created;
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
  const data = await _pb(`/api/collections/cien_notes/records?filter=(team_id%3D'${_team.id}')&sort=-created&perPage=50`);
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
  const data = await _pb(`/api/collections/cien_meetings/records?filter=(team_id%3D'${_team.id}')&sort=day,time&perPage=50`);
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
  return `
<div class="team-header">
  <div class="team-header-name">${_esc(_team.name)}</div>
  <div class="team-header-meta">Kod: <strong class="team-code">${_esc(_team.code)}</strong> · ${members.length} os.</div>
  <button class="team-leave-btn" onclick="if(confirm('Opuścić drużynę?')) teamLeave()">Opuść</button>
</div>

<div class="team-tabs">
  <button class="team-tab ${_chatTab==='chat'     ? 'active':''}" onclick="switchTeamTab('chat')">💬 Chat</button>
  <button class="team-tab ${_chatTab==='notes'    ? 'active':''}" onclick="switchTeamTab('notes')">📝 Notatki</button>
  <button class="team-tab ${_chatTab==='meetings' ? 'active':''}" onclick="switchTeamTab('meetings')">📅 Spotkania</button>
</div>

<div id="team-tab-body"></div>`;
}

function _parseMembersList() {
  let members = _team.members || [];
  if (typeof members === 'string') { try { members = JSON.parse(members); } catch(_e) { members = []; } }
  return members;
}

// ============================================
// Tabs
// ============================================

function switchTeamTab(tab) {
  _chatTab = tab;
  if (tab !== 'chat') _stopPoll();
  document.querySelectorAll('.team-tab').forEach(t =>
    t.classList.toggle('active', t.textContent.toLowerCase().includes(
      tab === 'chat' ? 'chat' : tab === 'notes' ? 'notatk' : 'spotkania'
    ))
  );
  _renderChatTab();
  if (tab === 'chat') _startPoll();
}

function _renderChatTab() {
  const body = document.getElementById('team-tab-body');
  if (!body) return;
  if (_chatTab === 'chat')     { body.innerHTML = _tmplChat();     _scrollChat(); }
  if (_chatTab === 'notes')    { body.innerHTML = _tmplNotesList(); _loadNotesUI(); }
  if (_chatTab === 'meetings') { body.innerHTML = _tmplMeetingsList(); _loadMeetingsUI(); }
}

// ============================================
// Chat
// ============================================

function _tmplChat() {
  return `
<div id="team-messages" class="team-messages">
  ${_messages.map(_msgHtml).join('')}
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
    <div class="team-msg-ts">${ts}</div>
  </div>`;
}

function _appendMessages(newMsgs) {
  const el = document.getElementById('team-messages');
  if (!el) return;
  const end = document.getElementById('team-msgs-end');
  newMsgs.forEach(m => {
    const div = document.createElement('div');
    div.innerHTML = _msgHtml(m);
    el.insertBefore(div.firstElementChild, end);
  });
  _scrollChat();
}

function _scrollChat() {
  const end = document.getElementById('team-msgs-end');
  if (end) end.scrollIntoView({ behavior: 'smooth' });
}

function _setupChatInput() {
  // auto-grow textarea on input
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
    _messages.push(m);
    _lastMsgTs = m.created;
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
  <div class="team-note-author">${_esc(n.author_name || '')} · ${(n.created||'').slice(0,10)}</div>
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
  const team = await teamLoad();
  if (team) {
    await _scheduleAllNotifs();
  }
}

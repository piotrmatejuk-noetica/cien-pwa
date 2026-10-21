// Serwerowa warstwa CIEŃ: operacje między użytkownikami i panel organizatora.
// Tożsamość użytkownika = token PocketBase (nagłówek Authorization), nigdy UID z klienta.
// Zapis do PB kontem technicznym (superuser) z env: PB_SU_EMAIL / PB_SU_PASSWORD.
const webpush = require('web-push');

const PB = process.env.PB_URL || 'https://klauzule.tail4676a1.ts.net/cien-pb';
const EDITION = '2027';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};
const out = (statusCode, data) => ({ statusCode, headers: CORS, body: JSON.stringify(data) });
const ID_RE = /^[a-z0-9]{15}$/;
const q = s => String(s).replace(/['\\]/g, '');

let suToken = '', suExp = 0;
async function su() {
  if (suToken && Date.now() < suExp) return suToken;
  const r = await fetch(`${PB}/api/collections/_superusers/auth-with-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: process.env.PB_SU_EMAIL, password: process.env.PB_SU_PASSWORD }),
  });
  if (!r.ok) throw new Error('PB superuser auth ' + r.status);
  suToken = (await r.json()).token;
  suExp = Date.now() + 10 * 60 * 1000;
  return suToken;
}

async function pb(path, opts = {}) {
  const r = await fetch(PB + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: await su(), ...(opts.headers || {}) },
  });
  const text = await r.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!r.ok) { const e = new Error(`PB ${r.status} ${path}`); e.status = r.status; e.data = data; throw e; }
  return data;
}

async function all(col, filter = '', extra = '') {
  const items = [];
  for (let page = 1; page < 100; page++) {
    const d = await pb(`/api/collections/${col}/records?perPage=200&page=${page}${filter ? '&filter=' + encodeURIComponent(filter) : ''}${extra}`);
    items.push(...d.items);
    if (page >= d.totalPages) break;
  }
  return items;
}

// Token użytkownika → rekord (authRule blokuje konta zawieszone)
async function userFrom(event) {
  const token = event.headers.authorization || event.headers.Authorization;
  if (!token) return null;
  const r = await fetch(`${PB}/api/collections/users/auth-refresh`, { method: 'POST', headers: { Authorization: token } });
  if (!r.ok) return null;
  const d = await r.json();
  return d.record && !d.record.suspended ? d.record : null;
}

function fileUrl(rec, field) {
  return rec[field] ? `/pb/api/files/${rec.collectionId}/${rec.id}/${rec[field]}` : '';
}

function cleanTags(raw) {
  let t = raw;
  if (typeof t === 'string') { try { t = JSON.parse(t); } catch { t = []; } }
  return Array.isArray(t) ? t.filter(x => typeof x === 'string').map(x => x.slice(0, 30)).slice(0, 4) : [];
}

const publicProfile = p => ({
  id: p.id, owner: p.owner, nick: String(p.nick || '').slice(0, 30), about: String(p.about || '').slice(0, 120),
  tags: cleanTags(p.tags), emoji: String(p.emoji || '').slice(0, 8),
  photo: fileUrl(p, 'photo'),
});

// Karta widoczna dla innych: nieukryta, właściciel niezawieszony i bez blokady Slow Dating
const VISIBLE = "hidden != true && owner.suspended != true && owner.sd_banned != true";

async function myCard(me) {
  const [c] = (await pb(`/api/collections/cien_sd_profiles/records?perPage=1&filter=${encodeURIComponent(`owner='${me}' && edition='${EDITION}'`)}`)).items;
  return c || null;
}

async function blockedIds(me) {
  const bl = await all('cien_blocks', `owner='${me}' || target='${me}'`);
  return new Set(bl.map(b => (b.owner === me ? b.target : b.owner)));
}

async function pushTo(filter, payload) {
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return { sent: 0, failed: 0, total: 0 };
  webpush.setVapidDetails('mailto:kontakt@cienfestiwal.com', pub, priv);
  const subs = await all('cien_push_subs', filter);
  let sent = 0, failed = 0;
  const stale = [];
  const body = JSON.stringify(payload);
  // partiami, żeby nie otwierać setek połączeń naraz
  for (let i = 0; i < subs.length; i += 50) {
    await Promise.allSettled(subs.slice(i, i + 50).map(async s => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body);
        sent++;
      } catch (e) {
        failed++;
        if (e.statusCode === 404 || e.statusCode === 410) stale.push(s.id);
      }
    }));
  }
  await Promise.allSettled(stale.map(id => pb(`/api/collections/cien_push_subs/records/${id}`, { method: 'DELETE' })));
  return { sent, failed, total: subs.length, cleaned: stale.length };
}

function randomCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = require('crypto').randomBytes(6);
  return Array.from(b, x => A[x % A.length]).join('');
}

// ---------- akcje użytkownika ----------
const USER = {
  async 'sd-discover'(me) {
    if (!(await myCard(me.id))) return out(409, { error: 'Najpierw zapisz swoją kartę' });
    const blocked = await blockedIds(me.id);
    const list = await all('cien_sd_profiles', `owner != '' && owner != '${me.id}' && ${VISIBLE} && edition = '${EDITION}'`, '&sort=-created');
    return out(200, { items: list.filter(p => !blocked.has(p.owner)).map(publicProfile) });
  },

  async 'sd-like'(me, b) {
    if (!ID_RE.test(b.target || '') || b.target === me.id) return out(400, { error: 'Nieprawidłowa osoba' });
    const mine = await myCard(me.id);
    if (!mine || mine.hidden) return out(409, { error: 'Najpierw zapisz swoją kartę' });
    const [theirs] = (await pb(`/api/collections/cien_sd_profiles/records?perPage=1&filter=${encodeURIComponent(`owner='${q(b.target)}' && edition='${EDITION}' && ${VISIBLE}`)}`)).items;
    if (!theirs) return out(404, { error: 'Tej karty już nie ma' });
    if ((await blockedIds(me.id)).has(b.target)) return out(404, { error: 'Tej karty już nie ma' });
    try {
      await pb('/api/collections/cien_sd_likes/records', { method: 'POST', body: JSON.stringify({ owner: me.id, target: b.target, edition: EDITION }) });
    } catch (e) { if (e.status !== 400) throw e; /* już polubione */ }
    const back = await pb(`/api/collections/cien_sd_likes/records?perPage=1&filter=${encodeURIComponent(`owner='${q(b.target)}' && target='${me.id}' && edition='${EDITION}'`)}`);
    if (!back.items.length) return out(200, { match: false });
    const [a, z] = [me.id, b.target].sort();
    let fresh = false;
    try {
      await pb('/api/collections/cien_matches/records', { method: 'POST', body: JSON.stringify({ a, b: z, edition: EDITION }) });
      fresh = true;
    } catch (e) { if (e.status !== 400) throw e; }
    if (fresh) {
      await pushTo(`owner='${q(b.target)}'`, { title: 'Wzajemne dopasowanie', body: `${mine.nick || 'Ktoś'} też Cię polubił(a). Zajrzyj do Slow Dating.`, url: '/#slowdating' }).catch(() => {});
    }
    return out(200, { match: true, profile: publicProfile(theirs) });
  },

  async 'sd-likes'(me) {
    const likes = await all('cien_sd_likes', `owner='${me.id}' && edition='${EDITION}'`);
    return out(200, { targets: likes.map(l => l.target) });
  },

  async 'sd-matches'(me) {
    const ms = await all('cien_matches', `(a='${me.id}' || b='${me.id}') && edition='${EDITION}'`, '&sort=-created');
    const blocked = await blockedIds(me.id);
    const ids = ms.map(m => (m.a === me.id ? m.b : m.a)).filter(id => !blocked.has(id));
    if (!ids.length) return out(200, { items: [] });
    const profs = await all('cien_sd_profiles', `edition='${EDITION}' && ${VISIBLE} && (${ids.map(id => `owner='${id}'`).join(' || ')})`);
    return out(200, { items: ids.map(id => profs.find(p => p.owner === id)).filter(Boolean).map(publicProfile) });
  },

  async block(me, b) {
    if (!ID_RE.test(b.target || '') || b.target === me.id) return out(400, { error: 'Nieprawidłowa osoba' });
    try {
      await pb('/api/collections/cien_blocks/records', { method: 'POST', body: JSON.stringify({ owner: me.id, target: b.target }) });
    } catch (e) { if (e.status !== 400) throw e; }
    const t = q(b.target);
    const gone = [
      ...await all('cien_sd_likes', `(owner='${me.id}' && target='${t}') || (owner='${t}' && target='${me.id}')`).then(x => x.map(r => ['cien_sd_likes', r.id])),
      ...await all('cien_matches', `(a='${me.id}' && b='${t}') || (a='${t}' && b='${me.id}')`).then(x => x.map(r => ['cien_matches', r.id])),
    ];
    await Promise.allSettled(gone.map(([c, id]) => pb(`/api/collections/${c}/records/${id}`, { method: 'DELETE' })));
    return out(200, { ok: true });
  },

  async report(me, b) {
    const reason = String(b.reason || '').slice(0, 1000).trim();
    if (!reason) return out(400, { error: 'Opisz krótko, co się stało' });
    const target = ID_RE.test(b.target || '') ? b.target : '';
    await pb('/api/collections/cien_reports/records', { method: 'POST', body: JSON.stringify({ owner: me.id, target, kind: String(b.kind || '').slice(0, 20), ref: String(b.ref || '').slice(0, 40), reason, status: 'nowe' }) });
    return out(200, { ok: true });
  },

  async 'team-create'(me, b) {
    const name = String(b.name || '').trim().slice(0, 40);
    if (!name) return out(400, { error: 'Podaj nazwę drużyny' });
    for (let i = 0; i < 5; i++) {
      try {
        const t = await pb('/api/collections/cien_teams/records', { method: 'POST', body: JSON.stringify({ name, code: randomCode(), owner: me.id, members: [me.id], creator_name: me.name || '' }) });
        return out(200, { team: { id: t.id, name: t.name, code: t.code, owner: t.owner } });
      } catch (e) { if (e.status !== 400) throw e; }
    }
    return out(500, { error: 'Nie udało się utworzyć drużyny' });
  },

  async 'team-join'(me, b) {
    const code = String(b.code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) return out(400, { error: 'Nieprawidłowy kod' });
    const [t] = (await pb(`/api/collections/cien_teams/records?perPage=1&filter=${encodeURIComponent(`code='${code}'`)}`)).items;
    if (!t) return out(404, { error: 'Nie ma drużyny z takim kodem' });
    if ((t.members || []).includes(me.id)) return out(200, { team: { id: t.id, name: t.name, code: t.code, owner: t.owner } });
    if ((t.members || []).length >= 30) return out(409, { error: 'Ta drużyna jest pełna (30 osób)' });
    await pb(`/api/collections/cien_teams/records/${t.id}`, { method: 'PATCH', body: JSON.stringify({ 'members+': me.id }) });
    return out(200, { team: { id: t.id, name: t.name, code: t.code, owner: t.owner } });
  },

  async 'team-leave'(me, b) {
    if (!ID_RE.test(b.team || '')) return out(400, { error: 'Nieprawidłowa drużyna' });
    const t = await pb(`/api/collections/cien_teams/records/${b.team}`).catch(() => null);
    if (!t || !(t.members || []).includes(me.id)) return out(200, { ok: true });
    const after = await pb(`/api/collections/cien_teams/records/${t.id}`, { method: 'PATCH', body: JSON.stringify({ 'members-': me.id }) });
    const rest = after.members || [];
    if (!rest.length) {
      // drużyna pusta: sprawdź jeszcze raz tuż przed usunięciem (ktoś mógł właśnie dołączyć)
      const again = await pb(`/api/collections/cien_teams/records/${t.id}`).catch(() => null);
      if (again && !(again.members || []).length) await pb(`/api/collections/cien_teams/records/${t.id}`, { method: 'DELETE' });
    } else if (after.owner === me.id || !after.owner) {
      await pb(`/api/collections/cien_teams/records/${t.id}`, { method: 'PATCH', body: JSON.stringify({ owner: rest[0] }) });
    }
    return out(200, { ok: true });
  },

  async 'team-members'(me, b) {
    if (!ID_RE.test(b.team || '')) return out(400, { error: 'Nieprawidłowa drużyna' });
    const t = await pb(`/api/collections/cien_teams/records/${b.team}?expand=members`).catch(() => null);
    if (!t || !(t.members || []).includes(me.id)) return out(404, { error: 'Brak dostępu' });
    const members = (t.expand?.members || []).map(u => {
      let tags = []; try { tags = JSON.parse(u.tags || '[]'); } catch {}
      return { id: u.id, name: u.name || 'Uczestnik', about: u.about || '', shadows: u.shadows || '', tags: Array.isArray(tags) ? tags.slice(0, 8) : [] };
    });
    return out(200, { members, owner: t.owner, code: t.code, name: t.name });
  },

  async 'push-link'(me, b) {
    const ep = String(b.endpoint || '');
    if (!/^https:\/\//.test(ep)) return out(400, { error: 'Nieprawidłowa subskrypcja' });
    const [s] = (await pb(`/api/collections/cien_push_subs/records?perPage=1&filter=${encodeURIComponent(`endpoint='${q(ep)}'`)}`)).items;
    if (s) await pb(`/api/collections/cien_push_subs/records/${s.id}`, { method: 'PATCH', body: JSON.stringify({ owner: me.id }) });
    return out(200, { ok: !!s });
  },

  async 'push-unlink'(me, b) {
    const ep = String(b.endpoint || '');
    const subs = await all('cien_push_subs', `endpoint='${q(ep)}' && owner='${me.id}'`);
    await Promise.allSettled(subs.map(s => pb(`/api/collections/cien_push_subs/records/${s.id}`, { method: 'PATCH', body: JSON.stringify({ owner: '' }) })));
    return out(200, { ok: true });
  },

  // Drużyny, do których należę (odtworzenie po zalogowaniu na nowym telefonie)
  async 'team-mine'(me) {
    const ts = await all('cien_teams', `members.id ?= '${me.id}'`, '&sort=-created');
    return out(200, { teams: ts.map(t => ({ id: t.id, name: t.name, code: t.code, owner: t.owner })) });
  },

  // Usuwa kartę Slow Dating tej edycji razem z polubieniami w obie strony i dopasowaniami
  async 'sd-delete-card'(me) {
    const jobs = [
      ...(await all('cien_sd_profiles', `owner='${me.id}' && edition='${EDITION}'`)).map(r => ['cien_sd_profiles', r.id]),
      ...(await all('cien_sd_likes', `(owner='${me.id}' || target='${me.id}') && edition='${EDITION}'`)).map(r => ['cien_sd_likes', r.id]),
      ...(await all('cien_matches', `(a='${me.id}' || b='${me.id}') && edition='${EDITION}'`)).map(r => ['cien_matches', r.id]),
    ];
    for (const [c, id] of jobs) await pb(`/api/collections/${c}/records/${id}`, { method: 'DELETE' });
    return out(200, { ok: true });
  },

  // Usuwa konto i wszystko, co do niego należy (kaskady w PB + subskrypcje)
  async 'delete-account'(me) {
    await Promise.allSettled((await all('cien_push_subs', `owner='${me.id}'`)).map(s => pb(`/api/collections/cien_push_subs/records/${s.id}`, { method: 'DELETE' })));
    for (const t of await all('cien_teams', `members.id ?= '${me.id}'`)) {
      await USER['team-leave'](me, { team: t.id });
    }
    await pb(`/api/collections/users/records/${me.id}`, { method: 'DELETE' });
    return out(200, { ok: true });
  },
};

// Akcje dostępne bez konta
const PUBLIC = {
  async 'push-unsubscribe'(b) {
    const ep = String(b.endpoint || '');
    if (!/^https:\/\//.test(ep)) return out(400, { error: 'Nieprawidłowa subskrypcja' });
    const subs = await all('cien_push_subs', `endpoint='${q(ep)}'`);
    await Promise.allSettled(subs.map(s => pb(`/api/collections/cien_push_subs/records/${s.id}`, { method: 'DELETE' })));
    return out(200, { ok: true });
  },
};

// ---------- panel organizatora (PIN) ----------
const ADMIN = {
  async 'admin-verify'() { return out(200, { ok: true }); },

  async 'admin-announce'(b) {
    const title = String(b.title || '').trim().slice(0, 120);
    if (!title) return out(400, { error: 'Wpisz tytuł' });
    const type = ['info', 'warning', 'urgent'].includes(b.type) ? b.type : 'info';
    const rec = await pb('/api/collections/cien_announcements/records', { method: 'POST', body: JSON.stringify({ title, body: String(b.body || '').slice(0, 2000), type, published: true }) });
    let push = null;
    if (b.push) push = await pushTo('', { title, body: String(b.body || '').slice(0, 200), url: '/#info' });
    return out(200, { id: rec.id, push });
  },

  async 'admin-ann-delete'(b) {
    if (!ID_RE.test(b.id || '')) return out(400, { error: 'Nieprawidłowe ID' });
    await pb(`/api/collections/cien_announcements/records/${b.id}`, { method: 'DELETE' });
    return out(200, { ok: true });
  },

  async 'admin-stats'() {
    const count = async (col, f = '') => (await pb(`/api/collections/${col}/records?perPage=1${f ? '&filter=' + encodeURIComponent(f) : ''}`)).totalItems;
    return out(200, {
      users: await count('users'),
      profiles: await count('cien_sd_profiles', `owner != '' && edition='${EDITION}'`),
      matches: await count('cien_matches', `edition='${EDITION}'`),
      teams: await count('cien_teams', "owner != ''"),
      pushSubs: await count('cien_push_subs'),
      reportsOpen: await count('cien_reports', "status = 'nowe'"),
    });
  },

  async 'admin-reports'() {
    const reps = await all('cien_reports', '', '&sort=-created&expand=target');
    const items = [];
    for (const r of reps.slice(0, 200)) {
      const [p] = r.target ? (await pb(`/api/collections/cien_sd_profiles/records?perPage=1&filter=${encodeURIComponent(`owner='${r.target}'`)}`)).items : [];
      items.push({ id: r.id, created: r.created, kind: r.kind, ref: r.ref, reason: r.reason, status: r.status, target: r.target,
        targetEmail: r.expand?.target?.email || '', targetSuspended: !!r.expand?.target?.suspended,
        profile: p ? { id: p.id, nick: p.nick, about: p.about, hidden: !!p.hidden, photo: fileUrl(p, 'photo') } : null });
    }
    return out(200, { items });
  },

  async 'admin-report-status'(b) {
    if (!ID_RE.test(b.id || '')) return out(400, { error: 'Nieprawidłowe ID' });
    const status = ['nowe', 'w toku', 'zamknięte'].includes(b.status) ? b.status : 'zamknięte';
    await pb(`/api/collections/cien_reports/records/${b.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    return out(200, { ok: true });
  },

  async 'admin-hide-profile'(b) {
    if (!ID_RE.test(b.id || '')) return out(400, { error: 'Nieprawidłowe ID' });
    const p = await pb(`/api/collections/cien_sd_profiles/records/${b.id}`, { method: 'PATCH', body: JSON.stringify({ hidden: !!b.hidden }) });
    if (p.owner) await pb(`/api/collections/users/records/${p.owner}`, { method: 'PATCH', body: JSON.stringify({ sd_banned: !!b.hidden }) });
    return out(200, { ok: true });
  },

  async 'admin-suspend'(b) {
    if (!ID_RE.test(b.user || '')) return out(400, { error: 'Nieprawidłowe ID' });
    await pb(`/api/collections/users/records/${b.user}`, { method: 'PATCH', body: JSON.stringify({ suspended: !!b.suspended }) });
    return out(200, { ok: true });
  },
};

exports.handler = async event => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return out(405, { error: 'Method Not Allowed' });
  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { return out(400, { error: 'Nieprawidłowe dane' }); }
  const action = String(b.action || '');
  try {
    if (PUBLIC[action]) return await PUBLIC[action](b);
    if (ADMIN[action]) {
      const pin = process.env.ADMIN_PIN;
      if (!pin || typeof b.pin !== 'string' || b.pin.length < 6 || b.pin !== pin) {
        await new Promise(r => setTimeout(r, 800)); // spowalnia zgadywanie
        return out(403, { error: 'Nieprawidłowy PIN' });
      }
      return await ADMIN[action](b);
    }
    if (USER[action]) {
      const me = await userFrom(event);
      if (!me) return out(401, { error: 'Zaloguj się ponownie' });
      return await USER[action](me, b);
    }
    return out(400, { error: 'Nieznana akcja' });
  } catch (e) {
    console.error(action, e.message, JSON.stringify(e.data || ''));
    return out(502, { error: 'Serwer chwilowo nie odpowiada. Spróbuj za chwilę.' });
  }
};

// Migracja PocketBase pod konta i reguły właściciela (CIEŃ, X 2026).
// Idempotentna: dopisuje brakujące pola/kolekcje i nadpisuje reguły.
// Użycie: PB_URL=… PB_SU_EMAIL=… PB_SU_PASSWORD=… node pb/migrate-2027.mjs
// Stare rekordy 2026 nie mają `owner`, więc nowe reguły ich nie pokazują (dane zostają w bazie).

const PB = process.env.PB_URL;
const EMAIL = process.env.PB_SU_EMAIL;
const PASS = process.env.PB_SU_PASSWORD;
if (!PB || !EMAIL || !PASS) { console.error('Brak PB_URL / PB_SU_EMAIL / PB_SU_PASSWORD'); process.exit(1); }

let TOKEN = '';
async function api(path, opts = {}) {
  const r = await fetch(PB + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: TOKEN } : {}), ...(opts.headers || {}) },
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!r.ok) throw new Error(`${opts.method || 'GET'} ${path} → ${r.status} ${JSON.stringify(data)}`);
  return data;
}

// Wspólne fragmenty reguł
const A = '@request.auth.id != "" && @request.auth.suspended = false';
const O = `${A} && owner = @request.auth.id`;
const T = `${A} && team.members.id ?= @request.auth.id`;
const BODY_TEAM_MEMBER = '@collection.cien_teams:t.id ?= @request.body.team && @collection.cien_teams:t.members.id ?= @request.auth.id';

async function getCol(name) {
  try { return await api(`/api/collections/${name}`); } catch { return null; }
}

async function ensureCol(name, base) {
  const c = await getCol(name);
  if (c) return c;
  console.log('+ kolekcja', name);
  return api('/api/collections', { method: 'POST', body: JSON.stringify({ name, type: 'base', fields: [], ...base }) });
}

// Dopisuje brakujące pola, ustawia reguły i indeksy
async function patchCol(name, { fields = [], rules = {}, indexes = null, extra = {} }) {
  const c = await getCol(name);
  if (!c) throw new Error('Brak kolekcji ' + name);
  const have = new Set(c.fields.map(f => f.name));
  // Stare pola z UID-ami 2026 przestają być wymagane (nowe rekordy używają relacji)
  const LEGACY = ['uid', 'team_id', 'sender_uid', 'creator_uid', 'author_uid', 'from_uid', 'to_uid'];
  const merged = c.fields.map(f => (LEGACY.includes(f.name) ? { ...f, required: false } : f));
  for (const f of fields) if (!have.has(f.name)) { merged.push(f); console.log(`  + ${name}.${f.name}`); }
  const body = { fields: merged, ...rules, ...extra };
  if (indexes) body.indexes = Array.from(new Set([...(c.indexes || []), ...indexes]));
  await api(`/api/collections/${c.id}`, { method: 'PATCH', body: JSON.stringify(body) });
  console.log('✓', name);
}

const rel = (name, collectionId, o = {}) => ({ name, type: 'relation', collectionId, maxSelect: 1, cascadeDelete: !!o.cascade, required: !!o.required, hidden: false, presentable: false, system: false });
const relMany = (name, collectionId) => ({ name, type: 'relation', collectionId, maxSelect: 999, cascadeDelete: false, required: false, hidden: false, presentable: false, system: false });
const txt = (name, max = 0) => ({ name, type: 'text', max, required: false, hidden: false, presentable: false, system: false });
const bool = name => ({ name, type: 'bool', required: false, hidden: false, presentable: false, system: false });
const created = () => ([
  { name: 'created', type: 'autodate', onCreate: true, onUpdate: false, hidden: false, system: false },
  { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true, hidden: false, system: false },
]);

async function main() {
  const su = await api('/api/collections/_superusers/auth-with-password', { method: 'POST', body: JSON.stringify({ identity: EMAIL, password: PASS }) });
  TOKEN = su.token;

  const users = await getCol('users');
  const U = users.id;

  // users: zawieszenie konta (zmienia tylko organizator), logowanie e-mail + hasło
  await patchCol('users', {
    fields: [bool('suspended'), bool('sd_banned'), txt('about', 200), txt('shadows', 1000), txt('tags', 300)],
    rules: {
      listRule: '@request.auth.id != "" && id = @request.auth.id',
      viewRule: '@request.auth.id != "" && id = @request.auth.id',
      createRule: '@request.auth.id = "" && @request.body.verified:isset = false && @request.body.suspended:isset = false && @request.body.sd_banned:isset = false',
      updateRule: '@request.auth.id != "" && id = @request.auth.id && @request.body.verified:changed = false && @request.body.suspended:changed = false && @request.body.sd_banned:changed = false',
      deleteRule: '@request.auth.id != "" && id = @request.auth.id',
      authRule: 'suspended = false',
      manageRule: null,
    },
    extra: { passwordAuth: { enabled: true, identityFields: ['email'] } },
  });

  let teams = await getCol('cien_teams');
  // Stare pole members (JSON z UID-ami 2026) → members_legacy, żeby zrobić miejsce na relację
  const legacy = teams.fields.find(f => f.name === 'members' && f.type !== 'relation');
  if (legacy) {
    legacy.name = 'members_legacy';
    await api(`/api/collections/${teams.id}`, { method: 'PATCH', body: JSON.stringify({ fields: teams.fields }) });
    console.log('  cien_teams.members → members_legacy');
    teams = await getCol('cien_teams');
  }

  // Drużyny: członkostwo jako relacja; zapis tylko przez funkcję serwerową
  await patchCol('cien_teams', {
    fields: [rel('owner', U), relMany('members', U), ...created()],
    rules: { listRule: `${A} && members.id ?= @request.auth.id`, viewRule: `${A} && members.id ?= @request.auth.id`, createRule: null, updateRule: null, deleteRule: null },
    indexes: ['CREATE UNIQUE INDEX idx_team_code ON cien_teams (code) WHERE code != \'\''],
  });

  for (const name of ['cien_messages', 'cien_notes', 'cien_meetings']) {
    const col = await getCol(name);
    const extraFields = [rel('team', teams.id, { cascade: true }), rel('owner', U, { cascade: true }), ...created()].filter(f => !col.fields.some(x => x.name === f.name));
    const updateRule = name === 'cien_messages' ? null
      : `${O} && team.members.id ?= @request.auth.id && @request.body.owner:changed = false && @request.body.team:changed = false`;
    await patchCol(name, {
      fields: extraFields,
      rules: {
        listRule: T, viewRule: T,
        createRule: `${A} && @request.body.owner = @request.auth.id && ${BODY_TEAM_MEMBER}`,
        updateRule,
        deleteRule: `${O}`,
      },
      indexes: [`CREATE INDEX idx_${name}_team_created ON ${name} (team, created)`],
    });
  }

  await patchCol('cien_locations', {
    fields: [rel('team', teams.id, { cascade: true }), rel('owner', U, { cascade: true })],
    rules: {
      listRule: `${T} && sharing = true`, viewRule: `${T} && sharing = true`,
      createRule: `${A} && @request.body.owner = @request.auth.id && ${BODY_TEAM_MEMBER}`,
      updateRule: `${O} && @request.body.owner:changed = false && @request.body.team:changed = false`,
      deleteRule: O,
    },
  });

  // Slow Dating
  await patchCol('cien_sd_profiles', {
    fields: [rel('owner', U, { cascade: true }), txt('edition', 10), bool('hidden')],
    rules: {
      listRule: O, viewRule: O,
      createRule: `${A} && @request.auth.sd_banned != true && @request.body.owner = @request.auth.id && @request.body.hidden:isset = false && @request.body.edition = '2027'`,
      updateRule: `${O} && @request.auth.sd_banned != true && @request.body.owner:changed = false && @request.body.hidden:changed = false && @request.body.edition:changed = false`,
      deleteRule: O,
    },
    indexes: ['CREATE UNIQUE INDEX idx_sd_owner_edition ON cien_sd_profiles (owner, edition) WHERE owner != \'\''],
  });

  await patchCol('cien_sd_likes', {
    fields: [rel('owner', U, { cascade: true }), rel('target', U, { cascade: true }), txt('edition', 10)],
    rules: { listRule: O, viewRule: O, createRule: null, updateRule: null, deleteRule: O },
    indexes: ['CREATE UNIQUE INDEX idx_like_pair ON cien_sd_likes (owner, target, edition) WHERE owner != \'\''],
  });

  await ensureCol('cien_matches', {});
  await patchCol('cien_matches', {
    fields: [rel('a', U, { cascade: true }), rel('b', U, { cascade: true }), txt('edition', 10), ...created()],
    rules: { listRule: `${A} && (a = @request.auth.id || b = @request.auth.id)`, viewRule: `${A} && (a = @request.auth.id || b = @request.auth.id)`, createRule: null, updateRule: null, deleteRule: null },
    indexes: ['CREATE UNIQUE INDEX idx_match_pair ON cien_matches (a, b, edition)'],
  });

  await ensureCol('cien_blocks', {});
  await patchCol('cien_blocks', {
    fields: [rel('owner', U, { cascade: true, required: true }), rel('target', U, { cascade: true, required: true }), ...created()],
    rules: {
      listRule: O, viewRule: O,
      createRule: `${A} && @request.body.owner = @request.auth.id && @request.body.target != @request.auth.id`,
      updateRule: null, deleteRule: O,
    },
    indexes: ['CREATE UNIQUE INDEX idx_block_pair ON cien_blocks (owner, target)'],
  });

  await ensureCol('cien_reports', {});
  await patchCol('cien_reports', {
    fields: [rel('owner', U), rel('target', U), txt('kind', 20), txt('ref', 40), txt('reason', 1000), txt('status', 20), ...created()],
    rules: {
      listRule: O, viewRule: O,
      createRule: `${A} && @request.body.owner = @request.auth.id && @request.body.status:isset = false`,
      updateRule: null, deleteRule: null,
    },
  });

  // Subskrypcje push: zapis także dla gości, odczyt i usuwanie tylko przez serwer
  await patchCol('cien_push_subs', {
    fields: [rel('owner', U, { cascade: true })],
    rules: {
      listRule: null, viewRule: null,
      createRule: '@request.body.owner:isset = false || @request.body.owner = "" || @request.body.owner = @request.auth.id',
      updateRule: null, deleteRule: null,
    },
  });

  // Ogłoszenia: czytają wszyscy, piszą tylko organizatorzy (przez funkcję z PIN-em)
  await patchCol('cien_announcements', {
    fields: [bool('published')],
    rules: { listRule: 'published = true', viewRule: 'published = true', createRule: null, updateRule: null, deleteRule: null },
  });
  const anns = await api('/api/collections/cien_announcements/records?perPage=200&filter=' + encodeURIComponent('published = false'));
  for (const a of anns.items) await api(`/api/collections/cien_announcements/records/${a.id}`, { method: 'PATCH', body: JSON.stringify({ published: true }) });
  if (anns.items.length) console.log(`  ogłoszenia oznaczone jako opublikowane: ${anns.items.length}`);

  console.log('Gotowe.');
}

main().catch(e => { console.error(e.message || e); process.exit(1); });

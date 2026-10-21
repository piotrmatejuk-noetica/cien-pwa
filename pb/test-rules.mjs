// Test reguł dostępu na LOKALNEJ kopii PB (nigdy na produkcji).
const PB = process.env.PB_URL || 'http://127.0.0.1:8091';
let fails = 0;
const j = async (path, { method = 'GET', token, body } = {}) => {
  const r = await fetch(PB + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let d = null; try { d = await r.json(); } catch {}
  return { ok: r.ok, status: r.status, d };
};
const expect = (name, cond) => { console.log((cond ? 'PASS ' : 'FAIL ') + name); if (!cond) fails++; };
const su = (await j('/api/collections/_superusers/auth-with-password', { method: 'POST', body: { identity: 'local@test.pl', password: 'localtest12345' } })).d.token;
const stamp = Date.now();
async function mkUser(n) {
  const email = `t${n}${stamp}@test.pl`;
  const c = await j('/api/collections/users/records', { method: 'POST', body: { email, password: 'haslo12345', passwordConfirm: 'haslo12345', name: n } });
  if (!c.ok) throw new Error(JSON.stringify(c.d));
  const a = await j('/api/collections/users/auth-with-password', { method: 'POST', body: { identity: email, password: 'haslo12345' } });
  return { id: a.d.record.id, token: a.d.token };
}
const A = await mkUser('A'), B = await mkUser('B'), C = await mkUser('C');
expect('rejestracja nie ustawia verified/suspended', (await j('/api/collections/users/records', { method: 'POST', body: { email: `x${stamp}@test.pl`, password: 'haslo12345', passwordConfirm: 'haslo12345', suspended: true } })).status === 400);
expect('A nie widzi B w users', (await j(`/api/collections/users/records/${B.id}`, { token: A.token })).status === 404);
expect('A nie zawiesza się sam', !(await j(`/api/collections/users/records/${A.id}`, { method: 'PATCH', token: A.token, body: { suspended: true } })).ok);

const team = (await j('/api/collections/cien_teams/records', { method: 'POST', token: su, body: { name: 'T', code: 'K' + stamp, owner: A.id, members: [A.id, B.id] } })).d;
expect('klient nie tworzy drużyny', !(await j('/api/collections/cien_teams/records', { method: 'POST', token: C.token, body: { name: 'x', members: [C.id] } })).ok);
expect('C nie widzi drużyny AB', (await j(`/api/collections/cien_teams/records/${team.id}`, { token: C.token })).status === 404);
expect('B widzi drużynę', (await j(`/api/collections/cien_teams/records/${team.id}`, { token: B.token })).ok);
expect('C nie dopisze się do members', !(await j(`/api/collections/cien_teams/records/${team.id}`, { method: 'PATCH', token: C.token, body: { 'members+': C.id } })).ok);
const msg = await j('/api/collections/cien_messages/records', { method: 'POST', token: A.token, body: { team: team.id, owner: A.id, text: 'hej', sender_name: 'A' } });
expect('A pisze w swojej drużynie', msg.ok);
expect('C nie pisze w obcej drużynie', !(await j('/api/collections/cien_messages/records', { method: 'POST', token: C.token, body: { team: team.id, owner: C.id, text: 'x' } })).ok);
expect('A nie pisze jako B', !(await j('/api/collections/cien_messages/records', { method: 'POST', token: A.token, body: { team: team.id, owner: B.id, text: 'x' } })).ok);
expect('B czyta wiadomość', (await j(`/api/collections/cien_messages/records?filter=${encodeURIComponent(`team='${team.id}'`)}`, { token: B.token })).d.items.length === 1);
expect('C nie czyta wiadomości', (await j(`/api/collections/cien_messages/records?filter=${encodeURIComponent(`team='${team.id}'`)}`, { token: C.token })).d.items.length === 0);
expect('gość nie czyta wiadomości', (await j('/api/collections/cien_messages/records')).d?.items?.length === 0);
expect('B nie usuwa wiadomości A', !(await j(`/api/collections/cien_messages/records/${msg.d.id}`, { method: 'DELETE', token: B.token })).ok);

const prof = await j('/api/collections/cien_sd_profiles/records', { method: 'POST', token: A.token, body: { owner: A.id, nick: 'A', edition: '2027' } });
expect('A tworzy swój profil', prof.ok);
expect('A nie tworzy profilu za B', !(await j('/api/collections/cien_sd_profiles/records', { method: 'POST', token: A.token, body: { owner: B.id, nick: 'B', edition: '2027' } })).ok);
expect('A nie odkrywa się sam z hidden', !(await j(`/api/collections/cien_sd_profiles/records/${prof.d.id}`, { method: 'PATCH', token: A.token, body: { hidden: true } })).ok);
expect('B nie widzi profilu A bezpośrednio', (await j(`/api/collections/cien_sd_profiles/records/${prof.d.id}`, { token: B.token })).status === 404);
expect('B nie usuwa profilu A', !(await j(`/api/collections/cien_sd_profiles/records/${prof.d.id}`, { method: 'DELETE', token: B.token })).ok);
expect('stare profile 2026 niewidoczne dla gościa', (await j('/api/collections/cien_sd_profiles/records')).d?.items?.length === 0);
expect('klient nie tworzy lajka', !(await j('/api/collections/cien_sd_likes/records', { method: 'POST', token: A.token, body: { owner: A.id, target: B.id } })).ok);
expect('klient nie tworzy matcha', !(await j('/api/collections/cien_matches/records', { method: 'POST', token: A.token, body: { a: A.id, b: B.id } })).ok);
expect('A blokuje B', (await j('/api/collections/cien_blocks/records', { method: 'POST', token: A.token, body: { owner: A.id, target: B.id } })).ok);
expect('A nie blokuje siebie', !(await j('/api/collections/cien_blocks/records', { method: 'POST', token: A.token, body: { owner: A.id, target: A.id } })).ok);
expect('A zgłasza B', (await j('/api/collections/cien_reports/records', { method: 'POST', token: A.token, body: { owner: A.id, target: B.id, kind: 'profile', reason: 'test' } })).ok);
expect('zgłoszenie nie ustawia statusu', !(await j('/api/collections/cien_reports/records', { method: 'POST', token: A.token, body: { owner: A.id, target: B.id, reason: 'x', status: 'closed' } })).ok);
expect('gość zapisuje push bez właściciela', (await j('/api/collections/cien_push_subs/records', { method: 'POST', body: { endpoint: 'https://e/' + stamp, p256dh: 'x', auth: 'y' } })).ok);
expect('gość nie podszywa się pod właściciela push', !(await j('/api/collections/cien_push_subs/records', { method: 'POST', body: { owner: A.id, endpoint: 'https://e/2' + stamp, p256dh: 'x', auth: 'y' } })).ok);
expect('nikt nie czyta subskrypcji', (await j('/api/collections/cien_push_subs/records', { token: A.token })).status === 403 || (await j('/api/collections/cien_push_subs/records', { token: A.token })).d?.items?.length === 0);
expect('gość nie dodaje ogłoszenia', !(await j('/api/collections/cien_announcements/records', { method: 'POST', body: { title: 'fałsz', published: true } })).ok);
expect('gość czyta ogłoszenia', (await j('/api/collections/cien_announcements/records')).d.items.length > 0);
expect('gość nie usuwa ogłoszenia', !(await j(`/api/collections/cien_announcements/records/${(await j('/api/collections/cien_announcements/records')).d.items[0].id}`, { method: 'DELETE' })).ok);
// zawieszenie
await j(`/api/collections/users/records/${C.id}`, { method: 'PATCH', token: su, body: { suspended: true } });
expect('zawieszony nie zaloguje się', !(await j('/api/collections/users/auth-with-password', { method: 'POST', body: { identity: `tC${stamp}@test.pl`, password: 'haslo12345' } })).ok);
expect('stary token zawieszonego nie tworzy blokady', !(await j('/api/collections/cien_blocks/records', { method: 'POST', token: C.token, body: { owner: C.id, target: A.id } })).ok);
// usunięcie konta kaskadowo
await j(`/api/collections/users/records/${A.id}`, { method: 'DELETE', token: A.token });
expect('usunięcie A kasuje jego profil', (await j(`/api/collections/cien_sd_profiles/records/${prof.d.id}`, { token: su })).status === 404);
console.log(fails ? `\n${fails} FAIL` : '\nWSZYSTKO PASS');
process.exit(fails ? 1 : 0);

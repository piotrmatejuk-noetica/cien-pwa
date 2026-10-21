const webpush = require('web-push');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const PB_URL = 'https://klauzule.tail4676a1.ts.net/cien-pb';
const PUSH_COL = 'cien_push_subs';
const MATCH_SECRET = process.env.MATCH_SECRET || 'cien2026sd';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const vapidPublic  = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

  if (!vapidPublic || !vapidPrivate) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Brak konfiguracji VAPID' }) };
  }

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Nieprawidłowe dane' }) };
  }

  // ---- Match notification (no admin PIN required) ----
  if (body.action === 'match') {
    const { targetUid, matchNick, matchSecret } = body;
    if (matchSecret !== MATCH_SECRET) {
      return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Nieautoryzowane' }) };
    }
    const fromUid = body.fromUid;
    const UID_RE = /^[\w-]{3,64}$/;
    if (!targetUid || typeof targetUid !== 'string' || !UID_RE.test(targetUid) || typeof fromUid !== 'string' || !UID_RE.test(fromUid)) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Nieprawidłowe dane' }) };
    }
    // Powiadomienie tylko przy prawdziwym, wzajemnym polubieniu zapisanym w bazie
    try {
      const f = (a, b) => encodeURIComponent(`from_uid='${a}'&&to_uid='${b}'`);
      const [r1, r2] = await Promise.all([
        fetch(`${PB_URL}/api/collections/cien_sd_likes/records?filter=${f(fromUid, targetUid)}&perPage=1&fields=id`),
        fetch(`${PB_URL}/api/collections/cien_sd_likes/records?filter=${f(targetUid, fromUid)}&perPage=1&fields=id`),
      ]);
      const [d1, d2] = [await r1.json(), await r2.json()];
      if (!(d1.items && d1.items.length && d2.items && d2.items.length)) {
        return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Brak wzajemnego polubienia' }) };
      }
    } catch (e) {
      return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'PB error' }) };
    }
    let subs = [];
    try {
      const res = await fetch(`${PB_URL}/api/collections/${PUSH_COL}/records?filter=${encodeURIComponent(`uid='${targetUid}'`)}&perPage=10`);
      const data = await res.json();
      subs = data.items || [];
    } catch (e) {
      return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'PB error: ' + e.message }) };
    }
    if (!subs.length) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ sent: 0, message: 'Brak subskrypcji' }) };
    }
    webpush.setVapidDetails('mailto:kontakt@cienfestiwal.com', vapidPublic, vapidPrivate);
    const nick = String(matchNick || 'Ktoś').slice(0, 40);
    const payload = JSON.stringify({ title: 'Wzajemne dopasowanie', body: `${nick} też chce się z Tobą spotkać`, type: 'match', url: '/#slowdating' });
    let sent = 0;
    const staleIds = [];
    await Promise.allSettled(subs.map(async (sub) => {
      if (!sub.endpoint || !sub.p256dh || !sub.auth) return;
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (e) {
        if (e.statusCode === 410) staleIds.push(sub.id);
      }
    }));
    if (staleIds.length) {
      await Promise.allSettled(staleIds.map(id =>
        fetch(`${PB_URL}/api/collections/${PUSH_COL}/records/${id}`, { method: 'DELETE' })
      ));
    }
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ sent, total: subs.length }) };
  }

  // ---- Admin actions (PIN required) ----
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Brak konfiguracji serwera' }) };
  }
  if (body.pin !== adminPin) {
    return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Nieprawidłowy PIN' }) };
  }

  if (body.action === 'verify') {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
  }

  const { title, message } = body;
  if (!title || typeof title !== 'string' || title.length > 120) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Nieprawidłowy tytuł' }) };
  }

  webpush.setVapidDetails('mailto:kontakt@cienfestiwal.com', vapidPublic, vapidPrivate);

  let subs = [];
  try {
    const res = await fetch(`${PB_URL}/api/collections/${PUSH_COL}/records?perPage=500`);
    const data = await res.json();
    subs = data.items || [];
  } catch (e) {
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'Nie można pobrać subskrypcji: ' + e.message }) };
  }

  if (!subs.length) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ sent: 0, failed: 0, message: 'Brak subskrypcji' }) };
  }

  const payload = JSON.stringify({ title, body: message || '' });
  let sent = 0, failed = 0;
  const staleIds = [];

  await Promise.allSettled(subs.map(async (sub) => {
    if (!sub.endpoint || !sub.p256dh || !sub.auth) { failed++; return; }
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      sent++;
    } catch (e) {
      failed++;
      if (e.statusCode === 410) staleIds.push(sub.id);
    }
  }));

  if (staleIds.length) {
    await Promise.allSettled(staleIds.map(id =>
      fetch(`${PB_URL}/api/collections/${PUSH_COL}/records/${id}`, { method: 'DELETE' })
    ));
  }

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({ sent, failed, total: subs.length, cleaned: staleIds.length }),
  };
};

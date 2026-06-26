const webpush = require('web-push');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const PB_URL = 'https://klauzule.tail4676a1.ts.net/cien-pb';
const PUSH_COL = 'cien_push_subs';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const adminPin = process.env.ADMIN_PIN;
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

  if (!adminPin || !vapidPublic || !vapidPrivate) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Brak konfiguracji serwera' }) };
  }

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Nieprawidłowe dane' }) };
  }

  if (body.pin !== adminPin) {
    return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Nieprawidłowy PIN' }) };
  }

  // PIN-only verification — no push sent
  if (body.action === 'verify') {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
  }

  const { title, message } = body;
  if (!title || typeof title !== 'string' || title.length > 120) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Nieprawidłowy tytuł' }) };
  }

  webpush.setVapidDetails(
    'mailto:kontakt@cienfestiwal.com',
    vapidPublic,
    vapidPrivate
  );

  // Fetch all subscriptions from PocketBase
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
      // 410 Gone = subscription expired, mark for removal
      if (e.statusCode === 410) staleIds.push(sub.id);
    }
  }));

  // Clean up expired subscriptions
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

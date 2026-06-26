const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// In-memory rate limit: max 10 requests per IP per function instance lifetime
const _ipCalls = new Map();
const RATE_LIMIT = 10;

function isRateLimited(ip) {
  const count = (_ipCalls.get(ip) || 0) + 1;
  _ipCalls.set(ip, count);
  return count > RATE_LIMIT;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return { statusCode: 429, headers: CORS, body: JSON.stringify({ error: 'Zbyt wiele zapytań. Spróbuj za chwilę.' }) };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Brak klucza API' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Nieprawidłowe dane' }) };
  }

  const { areaName, score, wheelScores, planTeraz, planRegularnie, planRok, journalSnippet } = body;

  // Input validation — prevent abuse
  if (!areaName || typeof areaName !== 'string' || areaName.length > 60) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Nieprawidłowy obszar' }) };
  }
  const totalInputLen = [wheelScores, planTeraz, planRegularnie, planRok, journalSnippet]
    .map(v => String(v || '')).join('').length;
  if (totalInputLen > 3000) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Dane wejściowe zbyt duże' }) };
  }

  const systemPrompt = `Jesteś ekspertem od integracji psychologicznej i coachingu transformacyjnego, specjalizującym się w psychologii Jungowskiej. Piszesz po polsku. Twoje odpowiedzi są konkretne, praktyczne i dostosowane do osoby — bez ogólników, bez motywacyjnego pustosłowia.`;

  const userPrompt = `Uczestnik Cień Festiwal 2026 (festiwal przemiany, psychologia Jungowska — Nigredo/Albedo/Rubedo, Zamek Świny, 3–5 lipca) prosi o spersonalizowany plan integracji.

Wyniki koła życia: ${wheelScores}
Obszar do pracy: ${areaName} (samoocena: ${score !== null ? score + '/5' : 'nieoceniony'})

Wstępny plan wygenerowany przez aplikację:
- Teraz (ten tydzień): ${planTeraz}
- Regularnie (co tydzień): ${planRegularnie}
- Za rok: ${planRok}
${journalSnippet ? `\nFragmenty z dziennika festiwalowego:\n${journalSnippet}` : ''}

Wygeneruj spersonalizowany plan integracji dla obszaru "${areaName}". Odpowiedz w dokładnie tym formacie (używaj tych nagłówków):

## Pierwsze 7 dni
[3–4 konkretne działania na ten tydzień, każde w osobnej linii zaczynającej się od "• "]

## Nawyki tygodniowe
[3 nawyki do wdrożenia, każdy w osobnej linii zaczynającej się od "• "]

## Praktyka Jungowska
[1–2 konkretne praktyki: praca z Cieniem, dziennik snów, aktywna imaginacja — dopasowane do obszaru]

## Za 12 miesięcy
[Jedna konkretna wizja — jedno zdanie, bez ogólników]

Bądź konkretny. Dostosuj do obszaru "${areaName}" i do wyników tej osoby.`;

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'Błąd OpenAI: ' + err }) };
    }

    const data = await resp.json();
    const plan = data.choices?.[0]?.message?.content || '';

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ plan }),
    };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};

// Wycofane w X 2026: dopasowania i ogłoszenia obsługuje ./api.js (token konta albo PIN organizatora).
exports.handler = async () => ({
  statusCode: 410,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify({ error: 'Zaktualizuj aplikację' }),
});

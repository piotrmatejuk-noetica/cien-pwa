# Plan poprawek CIEŃ PWA (21.10.2026)

Pełny audyt Codexa: `audyt-codex-20261021.md` (ocena 4/10, nie publikować w obecnym stanie).

## Ustalenia Claude'a z serwera (VPS klauzule, PocketBase 0.23.0, /opt/pocketbase)
- Reguły: wszystkie kolekcje cien_* mają puste reguły = publiczny odczyt/zapis/usuwanie. Wyjątek: cien_sd_profiles.deleteRule `uid = @request.auth.id`, więc „Usuń profil” w appce NIE działa na produkcji (brak tokenu).
- cien_announcements: każdy może dodać fałszywe ogłoszenie organizatora (+ push przez push-sender.py, cron co minutę).
- admin.html (publiczny) ma hasło administratora jawnie w kodzie.
- users (auth) istnieje, 0 kont, SMTP wyłączone (weryfikacja i reset hasła wymagają skrzynki nadawczej).
- push-sender.py ma klucz VAPID wpisany w kod (przenieść do pliku env).
- Dysk VPS 95% (4 GB wolne) — backup data.db przed zmianami.
- Strona 2027: organizator SERENUM DIVITIS sp. z o.o., kontakt@cienfestiwal.com; appka podaje Sacrum sp. z o.o. i kontakt@sacrum.life — decyzja Piotra.
- 2027 (ze strony): 8–11.07.2027, Pałac w Roztoce; noce: Hipnagogia, Sen głęboki, REM, Przebudzenie; bilety 350/450/550 zł (link sprzedaży jeszcze pusty); program i prelegenci robocze — nie importować.

## Kolejność wdrożenia
1. Backup PB; zamknąć ogłoszenia (create/update/delete = tylko superuser), panel admina przez logowanie superusera, usunąć hasło z admin.html.
2. Prawdziwe konta PB (email+hasło, token w żądaniach), gość dla funkcji niespołecznych; SMTP do weryfikacji/resetu.
3. Reguły właściciela/członkostwa (owner relacje), blokady i zgłoszenia jako kolekcje, match tworzony w hooku PB, push z crona na VPS (bez sekretu w kliencie).
4. Bezpieczne renderowanie (dziennik, plan, AI), serwerowe usuwanie konta, retencja.
5. Konfiguracja edycji: 2027 zapowiedź (licznik, noce, miejsce), 2026 jako archiwum; stały przycisk Pomoc.
6. Offline: timeout sieci, nie kasować cache przy aktualizacji; drużyna/czat (kolejność, outbox, członkostwo offline).
7. Mój Plan: konflikty, eksport całego planu ICS z alarmami, „następne w Twoim planie”.
8. Dostępność, kontrast, tryb oszczędny.
9. Testy na TWA, nowe zrzuty i opisy, wysyłka: Google Play (konto Piotra 25 USD + weryfikacja tożsamości), App Store (99 USD, Xcode, Apple ID Piotra).

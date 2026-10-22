11# Zakładanie kont w sklepach: co kliknąć i co wpisać

Kroki, których nie da się zrobić za Ciebie: płatność Twoją kartą, zdjęcie dowodu (czasem selfie), kod SMS lub 2FA,
zgoda na umowę dewelopera w Twoim imieniu. Wszystko inne jest gotowe w tym folderze.

## Najpierw jedna decyzja: na kogo konta?

| Opcja | Plus | Minus |
|---|---|---|
| **Firma** (organizacja) | brak wymogu 12 testerów przez 14 dni w Google Play; w sklepie widać nazwę firmy | potrzebny numer **D-U-N-S** (bezpłatny, wniosek na dnb.com, zwykle kilka dni roboczych); Apple też go wymaga |
| **Prywatnie** (Piotr Matejuk) | konto od ręki | Google Play: przed publikacją 14 dni testów zamkniętych z co najmniej 12 osobami; w sklepie widać Twoje imię i nazwisko |

Uwaga: strona CIEŃ 2027 podaje jako organizatora **Serenum Divitis sp. z o.o.**, a appka i polityka prywatności **Sacrum sp. z o.o.**
Konto firmowe zakładaj na tę spółkę, która ma być administratorem danych, i daj znać, to ujednolicę teksty.

**Decyzja Piotra 21.10.2026:** faktury na **Sacrum sp. z o.o., NIP 1182326089**, więc oba konta jako **organizacja** na Sacrum
(zgodnie z polityką prywatności appki). Oba sklepy wymagają dla organizacji numeru **D-U-N-S** spółki. Sprawdzenie, czy Sacrum go ma,
oraz bezpłatny wniosek: https://developer.apple.com/enroll/duns-lookup/ (logowanie Apple ID). Wniosek trwa zwykle do 5 dni roboczych.

## Google Play Console (25 USD jednorazowo)

1. Wejdź na https://play.google.com/console/signup i zaloguj się kontem Google, które ma być właścicielem.
2. Typ konta: „Organizacja” albo „Osobiste” (patrz tabela wyżej).
3. Nazwa dewelopera (widoczna w sklepie): `CIEŃ Festiwal`
4. Kontaktowy e-mail (publiczny): `kontakt@cienfestiwal.com`
5. Strona: `https://app.cienfestiwal.com`
6. Telefon kontaktowy: Twój (Google go weryfikuje SMS-em, nie jest publiczny).
7. Pytania o doświadczenie: „mniej niż rok”, liczba aplikacji: 1, sposób zarabiania: „bez przychodów”.
8. Zapłać 25 USD, przejdź weryfikację tożsamości (dowód osobisty) i zaakceptuj umowę.
9. Napisz mi „konto Play gotowe”. Ja: tworzę aplikację `com.cienfestiwal.app`, wgrywam `~/Downloads/cien-google-play/cien-festiwal-1.0.0.aab`,
   wpisuję teksty z `opisy-sklepowe.md`, zrzuty z `zrzuty/`, formularz o danych, ankietę wiekową, adres `/usun-konto`
   i dopisuję odcisk klucza Google do `/.well-known/assetlinks.json`.
   Potrzebuję do tego Twojej zgody w Chrome na dostęp Codexa do play.google.com (ostatnio przeglądarka go zablokowała).

## Apple Developer Program (99 USD rocznie)

1. Na Macu: Ustawienia systemowe → Twoje Apple ID → upewnij się, że masz włączone 2FA.
2. Wejdź na https://developer.apple.com/programs/enroll/ → „Start your enrollment” (najprościej w aplikacji **Apple Developer** na iPhonie, tam płacisz przez Apple Pay).
3. Typ: „Individual” albo „Organization” (wtedy D-U-N-S i dane spółki).
4. Zapłać 99 USD. Aktywacja trwa zwykle od kilku godzin do 2 dni.
5. Zainstaluj **Xcode** z App Store na Macu (potrzeba ok. 30–40 GB wolnego miejsca; teraz jest ok. 15 GB).
6. Napisz mi „konto Apple gotowe”. Ja: przygotowuję projekt iOS (opakowanie appki), ustawiam identyfikator `com.cienfestiwal.app`,
   buduję, wysyłam do App Store Connect, wypełniam opis, zrzuty, prywatność i kategorię wiekową, i wysyłam do recenzji.
   Do podpisania w Xcode potrzebne będzie Twoje jednorazowe zalogowanie Apple ID w Xcode.

## Konto testowe dla recenzentów

Oba sklepy poproszą o dane logowania do Slow Dating i drużyny. Założę konto `review@cienfestiwal.com` w appce
w dniu wysyłki i wpiszę je w formularzach.

## Stan 21.10.2026

- **Google Play: konto ZAŁOŻONE i opłacone** (25 USD, karta Visa …3216, rachunek na piotr.matejuk@gmail.com).
  Konto organizacji „CIEŃ Festiwal”, ID 4715212429697029904, właściciel piotr.matejuk@gmail.com,
  profil płatności SACRUM SP Z O O (D-U-N-S 369477420, ul. Rudzka 5a-16, Warszawa).
  Publiczny e-mail piotr@sacrum.life (zweryfikowany), publiczny telefon +48 669 510 131, strona https://sacrum.life.
  Organizacja: wgrany odpis pełny KRS 0001229774 (stan 03.08.2026).
  Do zrobienia przed publikacją: (1) przedstawiciel — dowód + selfie przez kod QR na telefonie (Piotr),
  (2) potwierdzenie własności sacrum.life w Search Console (usługa https://sacrum.life/ dodana na piotr.matejuk@gmail.com,
  plik google5db174e38a93c7f5.html albo TXT w Cloudflare; metoda Analytics nie działa, bo GA ładuje się po zgodzie),
  (3) weryfikacja numerów telefonów (po 1 i 2).
- **Apple:** podstawowa umowa Apple Developer zaakceptowana. Numer D-U-N-S Sacrum: 369477420 (już istniał w D&B).
  Zapis organizacji i opłata 99 USD tylko w aplikacji Apple Developer (iPhone/Mac) — Piotr.

### Aktualizacja 21.10.2026, popołudnie
- Strona sacrum.life **zweryfikowana** w Play Console (Search Console, plik `google5db174e38a93c7f5.html` serwowany regułą nginx na VPS — nie usuwać).
- Dokumenty tożsamości przedstawiciela przesłane, status „Google weryfikuje Twoją tożsamość” (kilka dni, mail na piotr.matejuk@gmail.com).
- Tworzenie aplikacji zablokowane do weryfikacji: sprawdzanie nazwy pakietu zwraca 404, każda nazwa wygląda na „zajętą”. `com.cienfestiwal.app` nie istnieje publicznie w Play (404). Po weryfikacji spróbować ponownie; jeśli naprawdę zajęta — nowy `packageId` w `cien-android/twa-manifest.json`, przebudowa, nowy assetlinks.
- Zrzuty Google Play przerobione na 1080×2160 (Play przyjmuje najwyżej 2:1; poprzednie 1080×2340 byłyby odrzucone).
- Paczka: targetSdk 36, minSdk 24, versionCode 1. W `app/build.gradle` `versionName ""` — przy najbliższej przebudowie ustawić 1.0.0.
- Apple: Piotr nie przeszedł skanu prawa jazdy w aplikacji Apple Developer (iPhone 16 Pro nie łapie ostrości z bliska). Rady: telefon 25–35 cm, ciemne matowe tło, dowód/paszport zamiast prawa jazdy, ewentualnie inne urządzenie zalogowane jego Apple ID.

### 22.10.2026: aplikacja wysłana do sprawdzenia w Google Play
- Tożsamość zweryfikowana (mail Google 21.10 15:26), oba telefony potwierdzone SMS-em.
- Aplikacja „CIEŃ Festiwal”, pakiet `com.cienfestiwal.app` (wolny — wcześniejsze „zajęte” to był brak weryfikacji), ID aplikacji 4974778839472727471.
- Uzupełnione: polityka prywatności, dane logowania dla recenzentów (review@cienfestiwal.com, hasło w `~/Documents/cien-pb/review-account.txt`), reklamy: brak, grupa docelowa 18+, IARC → PEGI 18 (społecznościowa, randki, lokalizacja dla drużyny, blokowanie/zgłaszanie), bezpieczeństwo danych (import CSV, plik `store/google-play-data-safety.csv` (do ponownego importu)), instytucje państwowe/finanse/zdrowie: nie, identyfikator reklam: nie, kategoria Wydarzenia, kontakt kontakt@cienfestiwal.com + app.cienfestiwal.com, karta sklepu (tekst z `opisy-sklepowe.md`, ikona, grafika, 6 zrzutów 1080×1920 — Play wymaga 9:16).
- Test wewnętrzny 1.0.0 opublikowany (lista testerów „Zespół CIEŃ”: piotr.matejuk@gmail.com, link https://play.google.com/apps/internaltest/4700512939774300085).
- Produkcja 1.0.0, kraj: Polska. 10 zmian wysłanych do sprawdzenia 22.10 ~15:20 (Google: zwykle do 7 dni).
- Klucz podpisu Google Play SHA-256 `D0:55:30:F2:…:7D:9D:56:B9` dopisany do `/.well-known/assetlinks.json` (commit 4f41041, prod v88).

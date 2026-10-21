# Zakładanie kont w sklepach: co kliknąć i co wpisać

Kroki, których nie da się zrobić za Ciebie: płatność Twoją kartą, zdjęcie dowodu (czasem selfie), kod SMS lub 2FA,
zgoda na umowę dewelopera w Twoim imieniu. Wszystko inne jest gotowe w tym folderze.

## Najpierw jedna decyzja: na kogo konta?

| Opcja | Plus | Minus |
|---|---|---|
| **Firma** (organizacja) | brak wymogu 12 testerów przez 14 dni w Google Play; w sklepie widać nazwę firmy | potrzebny numer **D-U-N-S** (bezpłatny, wniosek na dnb.com, zwykle kilka dni roboczych); Apple też go wymaga |
| **Prywatnie** (Piotr Matejuk) | konto od ręki | Google Play: przed publikacją 14 dni testów zamkniętych z co najmniej 12 osobami; w sklepie widać Twoje imię i nazwisko |

Uwaga: strona CIEŃ 2027 podaje jako organizatora **Serenum Divitis sp. z o.o.**, a appka i polityka prywatności **Sacrum sp. z o.o.**
Konto firmowe zakładaj na tę spółkę, która ma być administratorem danych, i daj znać, to ujednolicę teksty.

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

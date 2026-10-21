# Publikacja CIEŃ Festiwal w Google Play i App Store

Stan na 21.10.2026. Appka to PWA (strona instalowana jak aplikacja). Do sklepów trafia jako „opakowanie”:
na Androida jako Trusted Web Activity (pełny ekran, bez paska przeglądarki), na iPhone'a jako projekt Xcode z WebView.

## Co jest gotowe (w tym folderze i w kodzie)

- `grafiki/google-play-ikona-512.png`: ikona do Google Play (512×512, bez przezroczystości)
- `grafiki/google-play-grafika-1024x500.png`: grafika promocyjna (feature graphic)
- `grafiki/app-store-ikona-1024.png`: ikona do App Store (1024×1024, bez przezroczystości)
- `zrzuty/google-play-*.png`: 6 zrzutów 1080×2340; `zrzuty/app-store-*.png`: 6 zrzutów 1290×2796 (iPhone 6,7")
- `opisy-sklepowe.md`: nazwa, opisy, słowa kluczowe, kategorie, formularz bezpieczeństwa danych, ocena wiekowa
- `manifest.json`: stałe `id` i `scope`, osobne ikony „maskable” dla Androida, kolory Śnienia, skróty
- W appce: zgłaszanie i blokowanie profili w Slow Dating (wymóg obu sklepów dla treści użytkowników),
  usuwanie konta razem z danymi na serwerze (wymóg Apple 5.1.1(v) i Google), brak instrukcji „zainstaluj
  przez przeglądarkę” w zainstalowanej wersji, przycisk „Wstecz” na Androidzie zamyka artykuły i okna.

## Co musi zrobić Piotr (konta i decyzje)

1. **Która edycja?** Appka ma program i daty CIEŃ 2026 (Zamek Świny). Publikacja w sklepach ma sens
   z treścią 2027 (Pałac w Roztoce, 8–11.07.2027): program, mapa terenu, punkty, daty w `data/*.json`
   i w `app.js` (`detectFestivalDay`, odliczanie). Bez tego recenzent i użytkownicy zobaczą archiwum.
2. **Konto Google Play Console**: jednorazowo 25 USD. Konto firmowe (Sacrum sp. z o.o.) wymaga numeru
   D-U-N-S, ale omija regułę dla nowych kont prywatnych: **12 testerów przez 14 dni zamkniętych testów**
   przed publikacją produkcyjną.
3. **Konto Apple Developer Program**: 99 USD rocznie, dla firmy też D-U-N-S.
4. **Prawdziwe logowanie na serwerze (zalecane przed sklepami).** Dziś konto istnieje tylko na telefonie;
   baza Slow Dating przyjmuje zapisy i usunięcia od każdego, kto zna jej adres. Przy funkcji randkowej
   recenzenci Apple (1.2) i Google oczekują kontroli nad treściami. Do zrobienia: konta użytkowników
   w PocketBase i reguły „tylko właściciel zmienia/usuwa swój rekord”. Wymaga dostępu admina PocketBase.
5. **Retencja danych 2026.** W bazie nadal jest 171 profili Slow Dating i 3474 polubienia, mimo że ekran
   zgody obiecywał skasowanie 30 dni po festiwalu (5.08.2026). Decyzja: usunąć teraz (zalecane).

## Android: stan 21.10.2026

ZBUDOWANE na Macu (Bubblewrap): `~/Downloads/cien-google-play/cien-festiwal-1.0.0.aab` (do Google Play)
i `cien-festiwal-1.0.0-test.apk` (do instalacji na telefonie). Projekt: `~/Desktop/Aplikacje/Cien/cien-android/`,
narzędzia: `~/Library/Developer/cien-android-tools/`. Klucz przesyłania i hasło:
`~/Documents/cien-android-klucz/` (przenieść do menedżera haseł). `/.well-known/assetlinks.json` jest na produkcji
i Google go potwierdza. Po włączeniu Play App Signing dopisać do assetlinks drugi odcisk SHA-256 z Play Console.
Nowa wersja: podnieść `appVersionCode` w `twa-manifest.json`, `bubblewrap update`, `bubblewrap build`.

## Android krok po kroku (stara ścieżka przez PWABuilder, niepotrzebna)

Dysk w Macu jest prawie pełny, więc zamiast lokalnych narzędzi Androida używamy PWABuilder (Microsoft, darmowy).

1. Wdrożyć nową wersję na https://app.cienfestiwal.com (manifest i ikony muszą być na produkcji).
2. Wejść na https://www.pwabuilder.com, wpisać `https://app.cienfestiwal.com`, „Package for stores” → Android.
3. Ustawienia: Package ID `com.cienfestiwal.app`, nazwa „CIEŃ Festiwal”, nazwa skrócona „CIEŃ”,
   kolor paska `#070B14`, „Signing key: create new”. Pobrać ZIP.
4. W ZIP-ie są: plik `.aab` (do Google Play), klucz podpisu `signing.keystore` z hasłami w
   `signing-key-info.txt` oraz `assetlinks.json`. **Klucz i hasła zapisać w menedżerze haseł, nie w vaulcie
   ani w repo.** Bez nich nie da się wydać aktualizacji.
5. `assetlinks.json` wgrać do `/.well-known/assetlinks.json` w appce i wdrożyć. Jeśli Google Play używa
   własnego podpisu (Play App Signing, domyślnie), dopisać do pliku również odcisk SHA-256 z Play Console
   (Konfiguracja → Integralność aplikacji). Bez tego appka otworzy się z paskiem przeglądarki.
6. Play Console: utworzyć aplikację, wgrać `.aab` do testów zamkniętych, uzupełnić teksty i grafiki z tego
   folderu, formularz bezpieczeństwa danych, ankietę IARC, grupę docelową 18+.

## iPhone krok po kroku

1. Potrzebny Mac z Xcode (ok. 15–40 GB wolnego miejsca; ten Mac ma za mało) i konto Apple Developer.
2. PWABuilder → iOS → pobrać projekt Xcode, otworzyć, ustawić Team i Bundle ID `com.cienfestiwal.app`.
3. Uwaga: w opakowaniu iOS **nie działają powiadomienia web push** (Slow Dating pokaże dopasowanie
   po otwarciu appki, ale nie wyśle powiadomienia). Pełne powiadomienia wymagają natywnej wtyczki (APNs).
4. Ryzyko odrzucenia z pkt 4.2 (minimalna funkcjonalność dla „opakowanej strony”) maleje dzięki
   działaniu offline, dziennikowi i kołu życia, ale go nie eliminuje.
5. Archive → upload do App Store Connect → TestFlight → zgłoszenie do recenzji z tekstami z `opisy-sklepowe.md`
   i kategorią wiekową 17+. W notatce dla recenzenta opisać zgłaszanie/blokowanie i usuwanie konta.

## Źródła wymagań

- Apple App Review Guidelines: 1.2 (treści użytkowników), 4.2 (minimalna funkcjonalność), 5.1.1(v) (usuwanie konta)
- Google Play: polityka treści użytkowników, wymóg usuwania konta i danych, testy zamknięte dla nowych kont prywatnych
- Trusted Web Activity: https://developer.chrome.com/docs/android/trusted-web-activity

# Konta sklepów — 21.10.2026

Próba kontroli wyłącznie do odczytu w Chrome użytkownika przez `cua_repl`, zgodnie z delegacją 21.10 (6).

| Panel | Wynik |
| --- | --- |
| Google Play Console | Dostęp zablokowany przez mechanizm bezpieczeństwa przeglądarki; narzędzie podało odmowę dostępu użytkownika. Nie ustalono istnienia konta, nazwy, typu, statusu weryfikacji tożsamości ani listy aplikacji. |
| Apple Developer | Dostęp zablokowany z tym samym powodem. Nie ustalono aktywności członkostwa, nazwy zespołu, typu ani daty ważności. |
| App Store Connect | Dostęp zablokowany z tym samym powodem. Nie odczytano listy aplikacji. |

Nie uzyskano widoku żadnego panelu, więc nie potwierdzono również ekranu zakładania konta, logowania ani 2FA. Brak dostępu nie oznacza braku kont lub aplikacji.

Nie obchodzono blokad, nie wpisywano danych uwierzytelniających i nie wykonywano zmian, płatności ani akceptacji umów. Dalsza kontrola wymaga umożliwienia dostępu przez użytkownika.

## Odczyt 2 (21.10)

Ponowna próba 21.10.2026 przez `cua_repl`, wyłącznie do odczytu. Przeglądarka Chrome z profilem „Piotr” jest dostępna w spisie przeglądarek, ale narzędzie zablokowało otwarcie każdego z trzech wskazanych paneli. Dla każdej domeny podało powód: „The user declined permission for this action”. Nie uzyskano dostępu do treści paneli.

| Panel | Czy konto istnieje | Nazwa dewelopera/konta | Typ (osobiste/organizacja) | Status weryfikacji/opłaty/aktywacji | Lista aplikacji |
| --- | --- | --- | --- | --- | --- |
| Google Play Console — https://play.google.com/console | Nie ustalono — dostęp zablokowany | Nie ustalono | Nie ustalono | Nie ustalono żadnego z tych statusów | Nie odczytano |
| Apple Developer — https://developer.apple.com/account | Nie ustalono — dostęp zablokowany | Nie ustalono | Nie ustalono | Nie ustalono żadnego z tych statusów | Nie odczytano |
| App Store Connect — https://appstoreconnect.apple.com | Nie ustalono — dostęp zablokowany | Nie ustalono | Nie ustalono | Nie ustalono żadnego z tych statusów | Nie odczytano |

Brak dostępu nie oznacza braku kont ani aplikacji. Sam spis otwartych kart nie potwierdza statusu kont. Nie obchodzono blokad, nie klikano płatności, umów ani formularzy, nie zmieniano ustawień i nie tworzono aplikacji.

**Ocena ogólna: 4/10. Warstwa wizualna jest mocniejsza niż niezawodność i bezpieczeństwo. Obecnej wersji nie rekomenduję do publikacji w sklepach.**

Oceny opierają się na kodzie, danych i istniejących zrzutach ekranów. Sprawdziłem składnię sześciu plików JS, spójność 80 wydarzeń i wybrane błędy w izolowanych symulacjach. Nie zmieniałem plików ani danych. Nie weryfikowałem produkcyjnych reguł PocketBase, aplikacji na fizycznych telefonach ani gotowych pakietów sklepowych.

**1. Oceny 1–10**

| Obszar | Ocena | Uzasadnienie |
|---|---:|---|
| Design/UI | **7** | „Śnienie” ma własny charakter, dobrą typografię i rozpoznawalne CTA. Za dużo dekoracji względem informacji operacyjnych; drobny tekst i słabe kontrasty części etykiet. |
| UX i nawigacja | **5** | Program i mapa są dostępne bezpośrednio. Pomoc i drużyna ukryte pod „Więcej”; Slow Dating ma większy priorytet niż bezpieczeństwo. Niespójna obsługa nakładek i przycisku Wstecz. |
| Onboarding | **4** | Jest tryb gościa i osobne objaśnienie Slow Dating. Start wymusza konfrontację z formularzem konta, którego możliwości są mylące. |
| Logowanie | **1** | Lokalny UID i SHA-256 hasła nie uwierzytelniają użytkownika wobec backendu. Brak odzyskania konta i przeniesienia na inne urządzenie. |
| Program | **7** | Dni, strefy, wyszukiwanie, prowadzący, trwające wydarzenia, udostępnianie i pojedynczy ICS. Dane przechodzą podstawową walidację. |
| Mój Plan | **5** | Ulubione działają lokalnie. Brak konfliktów, przypomnień wydarzeń, eksportu całego planu i synchronizacji. |
| Mapa | **4** | Czytelny schemat stref, lista POI i filtry. Brak georeferencji, pozycji użytkownika i związania punktów listy z rzeczywistą lokalizacją na schemacie. Mapa dotyczy starego miejsca. |
| Slow Dating | **3** | Karty, zdjęcia, wzajemne polubienia i zgłaszanie istnieją. Bezpieczna tożsamość, blokowanie, obsługa utraty sieci i skalowanie list są niewystarczające. |
| Drużyna/czat | **3** | Dużo użytecznych funkcji, ale błędy kolejności wiadomości, utrata wpisywanego tekstu i członkostwa offline. Model członków jako JSON jest podatny na nadpisywanie. |
| Dziennik | **6** | Dobry kontekst festiwalu, lokalny zapis i eksport przez e-mail. Brak odpornego backupu, separacji między użytkownikami urządzenia i bezpiecznego renderowania treści. |
| Koło życia | **6** | Kwestionariusz, wykres, historia i plan działania mają wartość. Problemy z renderowaniem HTML, prywatnością danych wysyłanych do AI i dostępnością formularza. |
| Artykuły | **6** | Kategorie, czas czytania, źródła i dostęp offline. Brak wyszukiwarki, zakładek, dat przeglądu i rozdzielenia teorii psychologicznych od ustaleń naukowych. |
| Pomoc/PsyCare | **4** | Jest przycisk pomocy i `tel:112`. Lokalizacja punktu jest niespójna, informacje są historyczne, dostęp wymaga znalezienia sekcji SACRUM. |
| Powiadomienia | **3** | Web Push organizatora i dopasowań istnieje. Ustawienia obiecują więcej niż implementacja; limit pierwszej strony odbiorców; brak niezawodnego harmonogramowania. |
| Offline | **4** | Precache obejmuje program, mapę, fonty, artykuły i dokumenty. Słaba sieć blokuje start, aktualizacja niszczy cache, funkcje społeczne nie mają kolejki operacji. |
| Dostępność | **3** | Są lokalne fonty, część etykiet ARIA i `focus-visible`. Wiele klikalnych `div`, brak obsługi fokusu dialogów, brak ograniczenia animacji. |
| Wydajność | **6** | Brak ciężkiego frameworka; JS/CSS dobrze się kompresują. Kosztowne rozmycia, ciągły canvas, polling i pełne przebudowy programu. Bez pomiarów na urządzeniu ocena jest wstępna. |
| Apple 4.2 | **4** | Funkcje osobiste dają argument za użytecznością aplikacji. Sam WebView z archiwalnym programem i niesprawnymi funkcjami społecznymi pozostaje ryzykowny. |
| Apple 1.2 | **2** | Lokalne ukrycie profilu i `mailto:` nie tworzą kompletnego systemu moderacji. Czat nie ma porównywalnych narzędzi. |
| Apple 5.1.1 | **2** | Jest polityka i przycisk usuwania, lecz opis przepływu danych oraz faktyczne usuwanie są niepełne. |
| Google Play | **3** | Manifest, ikony i assetlinks są przygotowane. Pozostają bezpieczeństwo UGC, usuwanie danych, zgodność deklaracji oraz sprawdzenie podpisanej wersji TWA. |

Warto zachować: identyfikację „Śnienie”, lokalne fonty i ikony, tryb gościa, własny plan, lokalny dziennik, przycisk 112 oraz tekstowe alternatywy dla gestów Slow Dating.

**2. Problemy, skutki i konkretne poprawki**

P0 oznacza blokadę bezpiecznego wydania; P1 — naprawę przed publicznym wydaniem; P2 — poprawę jakości po ustabilizowaniu podstaw.

| Priorytet | Miejsce | Problem i skutek dla uczestnika | Konkretna poprawka |
|---|---|---|---|
| **P0** | [app.js:90](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:90), [team.js:50](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/team.js:50) | **Pozorne konto.** Backend dostaje UID podany przez klienta, bez tokenu. Jeżeli anonimowe operacje są dozwolone, można podszywać się pod właściciela; jeśli są zablokowane, funkcje nie działają. Losowość UID tego nie rozwiązuje. | Auth collection PocketBase, relacje do użytkownika, token w każdym prywatnym żądaniu i reguły właściciela/członkostwa. |
| **P0** | [app.js:2609](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:2609), [admin.html:165](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/admin.html:165) | **Administracja chroniona interfejsem.** Publikacja i usuwanie ogłoszeń nie wysyłają poświadczeń; PIN jest sprawdzany osobno. `admin.html` zawiera hasło w kodzie. Przy otwartych regułach fałszywe ogłoszenie może wyglądać jak komunikat organizatora. | Zablokować publiczne zapisy ogłoszeń. Publikować przez panel PB lub endpoint z autoryzacją organizatora. Usunąć klientowe hasło i stary adres backendu. |
| **P0 przed 2027** | [app.js:2413](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:2413), [data/pois.json:13](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/data/pois.json:13), [team.js:687](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/team.js:687) | **Pomoc i nawigacja prowadzą według starego terenu.** PsyCare to raz Śródzamcze, raz Kaplica; radar ma współrzędne Świn. Uczestnik może szukać pomocy w złym miejscu. | Jedno zatwierdzone źródło lokalizacji, dyżurów i kontaktów dla edycji. Do potwierdzenia mapy 2027 oznaczyć 2026 jako archiwum i nie prezentować jej jako bieżącej nawigacji. |
| **P1** | [app.js:116](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:116), [app.js:797](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:797) | Hasło jest niesolonym SHA-256 w localStorage; obecność UID omija ekran logowania. Użytkownik dostaje fałszywe poczucie ochrony i nie odzyska konta po wyczyszczeniu danych. | Usunąć lokalne hasła po migracji. Korzystać z hashowania i resetu hasła PB; dodać rzeczywiste logowanie i wylogowanie. |
| **P1** | [app.js:4261](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:4261) | **Niepełne usuwanie konta.** Pomijane są przychodzące lajki, członkostwa, wiadomości, notatki, spotkania i lokalizacje. Subskrypcje usuwane są według bieżącej przeglądarki. | Serwerowa operacja usuwania konta z pełną listą zależności, plikami i wszystkimi urządzeniami; jawna polityka ewentualnego zachowania zanonimizowanych treści grupowych. |
| **P1** | [app.js:3684](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:3684) | Usunięcie profilu ignoruje błędy HTTP i sieci, kasuje lokalne dane oraz pokazuje „Profil usunięty”. Profil może nadal być widoczny. | Potwierdzać sukces serwera; przy błędzie zachować identyfikator i możliwość ponowienia. Usunięcie profilu i powiązań wykonać serwerowo. |
| **P1** | [app.js:3118](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:3118) | **Blokada jest jednostronna i lokalna.** Obietnica „nie zobaczycie się więcej” jest nieprawdziwa; druga osoba nadal może widzieć profil. | Kolekcja blokad, filtrowanie po obu stronach na serwerze, zatrzymanie dopasowań i pushów, lista zablokowanych oraz odblokowanie. |
| **P1** | [app.js:3125](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:3125), [team.js:446](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/team.js:446) | Zgłoszenie wymaga zewnętrznego klienta poczty; brak zgłoszeń wiadomości i panelu obsługi spraw. Nie ma potwierdzenia przyjęcia ani widocznego procesu moderacji. | Formularz zgłoszenia w aplikacji → PB, z ID treści, powodem i statusem. Panel moderatora, zawieszanie kont, procedura reakcji i moderacja zdjęć/profili. |
| **P1** | [app.js:1735](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:1735), [app.js:1989](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:1989), [app.js:2130](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:2130) | Treść dziennika, planu i odpowiedź AI trafiają do HTML bez bezpiecznego kodowania. Znaczniki mogą być interpretowane zamiast wyświetlane jako tekst; istnieje ryzyko XSS. | `textContent`/`.value` dla tekstu użytkownika; ograniczony renderer formatowania AI bez surowego HTML. Usunąć składanie handlerów z danymi. Potem wdrożyć CSP. |
| **P1** | [polityka-prywatnosci.html:267](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/polityka-prywatnosci.html:267), [app.js:2101](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:2101) | Polityka opisuje lokalność danych szerzej niż implementacja: drużynowe treści trafiają do PB, oceny i tekst planu do OpenAI. Tekst planu może zawierać dobrowolnie wpisane informacje osobiste. | Opisać faktyczne kategorie, odbiorców i retencję. Przed AI pokazać wysyłane pola i uzyskać świadomą zgodę. Dziennik obecnie **nie jest wysyłany** — `journalSnippet` ma pustą wartość. |
| **P1** | [polityka-prywatnosci.html:492](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/polityka-prywatnosci.html:492), [store/README.md:31](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/store/README.md:31) | Obiecany termin skasowania profili już minął. README dokumentuje pozostawione rekordy; bieżącego stanu bazy nie potwierdziłem. | Zweryfikować wykonanie retencji; usunąć dane zgodnie z obowiązującą obietnicą, uwzględnić pliki i backupy. Dodać zadanie cykliczne i raport wykonania. |
| **P1** | [sw.js:99](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/sw.js:99), [app.js:785](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:785) | **Słaby internet może być gorszy niż brak internetu.** Network-first czeka bez limitu, a start czeka na dane. Ekran pomocy też jest za tym etapem. | Shell z cache; dla aktualizacji danych krótki timeout i fallback. Niezależny dostęp do pomocy. Czytelny status „dane zapisane, aktualizacja niedostępna”. |
| **P1** | [sw.js:110](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/sw.js:110) | Program jest cache-first bez rewalidacji. Zmiana samego JSON może pozostać niewidoczna do wymiany cache. | Wersja danych i `updatedAt`; rewalidacja w tle lub network-first z timeoutem. Komunikat o zmianach zapisanych wydarzeń. |
| **P1** | [app.js:4297](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:4297), [app.js:3035](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:3035) | „Aktualizuj” usuwa wszystkie cache przed potwierdzeniem nowego pakietu. Automatyczne przeładowanie po zmianie SW może przerwać formularz. | Przygotować i sprawdzić nowy cache przed przełączeniem. Nie kasować działającego offline. Zapisać szkice i zaoferować aktualizację w dogodnym momencie. |
| **P1** | [team.js:128](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/team.js:128) | **Błąd sieci usuwa `cien_team_id`.** Potwierdzone w symulacji. Po uruchomieniu bez zasięgu użytkownik traci lokalne powiązanie z drużyną. | Zachować członkostwo i ostatni snapshot; odróżnić brak sieci od potwierdzonego usunięcia/odebrania dostępu. |
| **P1** | [team.js:178](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/team.js:178) | Czat używa `sort=-id`. ID PocketBase nie jest chronologicznym znacznikiem; nowe wiadomości mogą wypaść poza pierwszą stronę pollingu. | `sort=-created,-id`, stabilny kursor i pobieranie wszystkich wiadomości od ostatniego punktu synchronizacji. |
| **P1** | [team.js:520](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/team.js:520) | Pole wiadomości jest czyszczone przed wysłaniem. Przy błędzie tekst przepada; potwierdzone w symulacji. Miejsce wyświetlania błędu nie występuje w głównym szablonie drużyny. | Lokalny outbox z tekstem, ID operacji i statusem „oczekuje/błąd/wysłano”; przycisk ponowienia bez dublowania. |
| **P1** | [team.js:94](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/team.js:94), [team.js:142](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/team.js:142) | Równoczesne dołączenia nadpisują cały JSON członków. „Opuść” usuwa tylko dane lokalne. Grupa ma nieaktualny skład. | Relacje członkostwa i transakcyjne serwerowe `join/leave`; unikalność członkostwa i rotacja kodu zaproszenia. |
| **P1** | [app.js:3357](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:3357), [app.js:3944](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:3944) | Karta znika przed potwierdzeniem lajka. Błąd sieci jest ignorowany. Zapis profilu obiecuje późniejszą wysyłkę, ale brak automatycznego mechanizmu ponowienia. | Trwała kolejka operacji, idempotencja i jawny stan synchronizacji; ponowienie po odzyskaniu sieci/otwarciu aplikacji. |
| **P1** | [app.js:3230](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:3230), [send-push.js:116](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/netlify/functions/send-push.js:116) | Pobierana jest tylko pierwsza strona: do 200 profili i żądane 500 subskrypcji. Przy 1500 uczestnikach część osób nie zostanie pokazana lub powiadomiona; serwer może dodatkowo ograniczać rozmiar strony. | Paginacja według odpowiedzi PB. Push w partiach, z ograniczoną współbieżnością, ponawianiem i raportem kompletności. |
| **P1** | [app.js:3070](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:3070), [send-push.js:34](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/netlify/functions/send-push.js:34) | Sekret dopasowań jest w publicznym JS. Sprawdzanie wzajemnego lajka pomaga, ale nie uwierzytelnia nadawcy i nie zapobiega ponawianiu pushów. | Tworzyć dopasowanie i jedno zdarzenie powiadomienia na serwerze; nadawcę i nick wyprowadzać z konta. Usunąć klientowy sekret. |
| **P1** | [app.js:2700](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:2700), [app.js:4209](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:4209), [team.js:277](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/team.js:277) | Ustawienia obiecują przypomnienia wykładów i wiadomości, których ten mechanizm nie realizuje. Zapis subskrypcji nie sprawdza HTTP. Timery spotkań nie przetrwają zamknięcia aplikacji. | Stan opierać na zgodzie systemowej, rzeczywistej subskrypcji i potwierdzonym zapisie. Dodać prawdziwy scheduler lub kalendarz; poprawić opis dostępnych typów. |
| **P1** | [index.html:60](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/index.html:60), [app.js:1280](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:1280), [index.html:301](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/index.html:301) | Brak etykiet części pól, klikalne `div`, dialogi bez zarządzania fokusem, toasty bez live region. Czytnik i klawiatura nie mają pełnej obsługi. | Semantyczne przyciski/linki, `label`, `aria-current`/`aria-pressed`, dialog z fokusem, Escape i przywracaniem fokusu; `role=status` dla komunikatów. |
| **P1** | [app.css:4238](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.css:4238), [snienie.css:390](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/snienie.css:390) | Czas wiadomości ma ok. **1,95:1** względem bazowego tła; biel na przycisku SOS ok. **3,91:1**. Mały tekst jest trudny do odczytania. | Kontrast tekstu zwykłego ≥4,5:1; ciemniejsza czerwień SOS, jaśniejsze metadane. Zweryfikować również rzeczywiste tła gradientowe. |
| **P1** | [snienie.css:24](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/snienie.css:24), [app.js:4508](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:4508) | Brak `prefers-reduced-motion`; ciągłe chmury, obroty i gwiazdy mogą przeszkadzać osobom wrażliwym i zużywają baterię. | Statyczna wersja tła przy reduced motion; opcjonalne efekty; ograniczenie renderowania i wyłączenie canvas w trybie oszczędnym. |
| **P1** | [app.js:750](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:750), [app.js:1030](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:1030), [team.js:236](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/team.js:236) | Daty i trzy dni są powielone w wielu miejscach. Edycja 2027 trwa cztery dni; prosta zamiana roku nie wystarczy. | Konfiguracja edycji z datami 8–11.07.2027, miejscem, strefą czasową i statusami „zapowiedź/trwa/archiwum”. Program 2027 pokazać dopiero po otrzymaniu danych. |
| **P2** | [app.js:1208](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:1208), [app.js:4055](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:4055) | Mieszane są UTC i czas lokalny urządzenia, a daty wydarzeń nie mają offsetu. „Teraz/zaraz” może zachowywać się źle przy północy lub innej strefie. | Wszystkie obliczenia według `Europe/Warsaw`, daty z jednoznacznym offsetem, jeden helper dnia festiwalowego. |
| **P2** | [app.js:1087](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:1087) | „Mój Plan jest pusty” pojawia się także wtedy, gdy zapisane wydarzenia są w innym dniu lub nie pasują do wyszukiwania. | „Brak zapisanych wydarzeń w tym dniu” i akcja „Pokaż cały plan”; osobny komunikat dla pustego wyniku wyszukiwania. |
| **P2** | [app.js:1430](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:1430) | ICS nie ma `DTSTAMP`, pełnego escaping pól i kompletnej definicji strefy; cały plan nie jest eksportowany. Udostępnianie prowadzi do strony głównej. | Poprawny serializer ICS, UTC lub `VTIMEZONE`, `VALARM`, eksport wszystkich ulubionych i adres konkretnego wydarzenia. |
| **P2** | [app.js:1774](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:1774), [app.js:3081](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:3081) | Dane nie są oddzielone według konta, zapis localStorage nie obsługuje przepełnienia, autosave ma opóźnienie bez opróżnienia przy zamknięciu. | Klucze według właściciela/edycji, obsługa błędów zapisu, wskaźnik „zapisano”, zapis przy opuszczaniu widoku oraz eksport/import pliku. |
| **P2** | [team.js:1031](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/team.js:1031) | Zakładka „Radar” renderuje obecnie nawigację do stałych miejsc. Kod udostępniania pozycji i canvas radaru nie jest wystawiony w tym szablonie. | Nazwać funkcję „Nawigacja” albo dokończyć interfejs radaru. Nawigację do infrastruktury udostępnić również bez drużyny. |
| **P2** | [team.js:187](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/team.js:187), [app.js:919](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:919) | Czat może odpytywać backend po przejściu do innej zakładki; program przebudowuje się co minutę. Rosną transfer, koszt serwera i ryzyko utraty fokusu. | Polling tylko potrzebnych widoków, backoff przy błędach, odświeżanie fragmentów DOM. Przy 1500 aktywnych pollerach samo 5-sekundowe odpytywanie to około 300 żądań/s. |
| **P2** | [sw.js:113](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/sw.js:113), [app.js:4435](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:4435) | Ogólny cache-first może zapamiętać odpowiedź pogodową bez terminu ważności, mimo godzinnego TTL w localStorage. | Ograniczyć cache do jawnej listy zasobów; pogodę obsługiwać osobno z datą pomiaru i TTL. |
| **P2** | [app.js:2781](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/app.js:2781), [data/pois.json:5](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/data/pois.json:5) | Informacje praktyczne zawierają konkrety bez widocznego potwierdzenia: parking, ładowanie co 50 m, transport. Jest też pewny błąd: 3.07.2026 był piątkiem, nie czwartkiem. | Zatwierdzenie informacji przez organizatora, właściciel treści i data aktualizacji. Usunąć niepotwierdzone obietnice. |
| **P2** | [index.html:336](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/index.html:336), [dating.js:36](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/dating.js:36) | `dating.js` nie jest ładowany, zawiera alternatywną implementację i kolidujące nazwy funkcji. Audytowanie go jako aktywnej funkcji dawałoby fałszywy obraz. | Oznaczyć jako archiwum lub usunąć po sprawdzeniu zależności; utrzymywać jedną implementację. |
| **P2** | [store/opisy-sklepowe.md:29](/Users/piotrmatejuk/Desktop/Aplikacje/Cien/cien-pwa/store/opisy-sklepowe.md:29) | Opis sklepu mówi o ośmiu obszarach koła, kod zawiera sześć. Materiały deklarują też funkcje pełniej niż rzeczywista obsługa błędów. | Wygenerować checklistę zgodności opisów ze sprawdzoną wersją; nowe zrzuty po naprawach. |

Wydajność nie wymaga przepisywania aplikacji na framework. `app.js` ma około **247 kB / 73 kB gzip**, `team.js` **49/13 kB**, oba główne arkusze łącznie **152/27 kB**. Lista precache obejmuje około **2,56 MB plików przed kompresją transportową**. Większym problemem jest sposób ładowania i pracy w tle.

**3. Funkcje do dodania bez nowej płatnej infrastruktury**

Punktem odniesienia są konkretne rozwiązania: Glastonbury udostępnia konflikty planu, synchronizację ze znajomymi, „teraz/następnie” i własne pinezki; Lineup prezentuje siatkę programu z konfliktami oraz podejście offline. To wzorce funkcjonalne, nie uzasadnienie kopiowania wszystkich funkcji dużego festiwalu. [Glastonbury](https://www.glastonburyfestivals.co.uk/news/download-our-2025-app-keep-your-phone-charged/), [Lineup](https://lineupfestival.app/).

S = mała zmiana, M = kilka powiązanych elementów, L = przepływ klient–serwer lub integracja natywna.

| Funkcja | Wartość | Koszt | Zależności |
|---|---|:---:|---|
| **Konflikty w Moim Planie** | Uczestnik widzi nakładające się warsztaty przed przyjazdem. | S | `start/end`, ulubione; bez backendu. |
| **Cały plan i siatka scen/godzin** | Porównanie równoległych wydarzeń zamiast skakania po filtrach. | M | Obecny program; dostępny także widok listy. |
| **Eksport całego planu ICS z alarmami** | Przypomnienia działają przez kalendarz telefonu również bez zasięgu. | S/M | Poprawiony eksport, strefa czasowa; zachowanie alarmów trzeba sprawdzić w kalendarzach. |
| **Przypomnienia przed zapisanym wydarzeniem** | Mniej przegapionych punktów programu. | M/L | Najpierw ICS; następnie cron na istniejącym PB/VPS + Web Push. W WebView lokalne powiadomienia natywne. |
| **Udostępnienie i porównanie planów** | Znajomi łatwiej wybierają wspólne wydarzenia. | M | Link zawierający wyłącznie edycję i ID wydarzeń; opcjonalnie synchronizacja PB po wdrożeniu kont. |
| **Osobiste „Następne w Twoim Planie”** | Jedna odpowiedź na pytanie „dokąd mam teraz iść?”. | S | Rozszerzenie istniejącego „Tu i teraz”; ulubione i poprawiony czas. |
| **Zmiany i odwołania zapisanych wydarzeń** | Uczestnik nie idzie na odwołany warsztat. | M | Wersjonowany program, stabilne ID, zatwierdzone aktualizacje organizatora. |
| **Pakiet offline z potwierdzeniem gotowości** | Przed przyjazdem wiadomo, czy program, mapa i pomoc są zapisane. | M | SW, kontrola cache, data synchronizacji, retry pobierania. |
| **Tryb oszczędzania baterii / spokojny interfejs** | Przydatny przez cały dzień i dla osób wrażliwych sensorycznie. | S/M | Wyłączenie canvas/animacji/blur, rzadszy polling i GPS na żądanie. |
| **„Jesteś tutaj” na prawdziwej mapie** | Łatwiejsze odnalezienie wody, toalety i pomocy. | M | Zatwierdzona mapa 2027, georeferencja, zgoda GPS i wskaźnik dokładności. Bez płatnego API map. |
| **Pinezka namiotu/auta/miejsca spotkania** | Powrót do własnego miejsca bez internetu. | S/M | GPS, lokalny zapis, opcjonalne udostępnienie współrzędnych. Kierunek w linii prostej trzeba tak nazwać. |
| **Potwierdzane zaproszenie na spotkanie po dopasowaniu** | Obecne „+ Spotkanie” jest prywatną notatką, nie uzgodnieniem z drugą osobą. | M | Konta, dopasowanie, blokady, rekord zaproszenia z akceptacją/odrzuceniem. |
| **Powiadomienia per typ** | Kontrola nad komunikatami organizatora, planem, drużyną i Slow Dating. | M | Jedna kolekcja preferencji; filtrowanie po stronie wysyłającej. |
| **FAQ z wyszukiwaniem i danymi dostępności terenu** | Szybkie odpowiedzi o wejściu, wodzie, dojeździe, dostępnych trasach. | S/M | Rozbudowa istniejącego Info; wyłącznie odpowiedzi potwierdzone przez organizatora. |
| **PL/EN** | Program, pomoc i instrukcje dostępne dla uczestników zagranicznych. | M/L | Słowniki interfejsu, zatwierdzone tłumaczenia treści; język wydarzenia jako osobne pole. |

**Nie wpisuję jako braków:** licznika, informacji praktycznych, „Tu i teraz”, udostępniania pojedynczego wydarzenia ani pojedynczego ICS — już istnieją.

PWA nie zapewni niezawodnego alarmu offline po zamknięciu przez samo `setTimeout`. Web Push wymaga dostarczenia przez sieć. Harmonogram można uruchomić na istniejącym PocketBase, bez zakupu dodatkowej usługi. [PocketBase — zadania cykliczne](https://pocketbase.io/docs/js-jobs-scheduling/).

**4. Najprostszy bezpieczny model kont PocketBase**

**Rekomendacja: e-mail + hasło w kolekcji `users`, weryfikacja e-maila, reset hasła, tryb gościa dla funkcji niespołecznych.** OAuth nie jest potrzebny do pierwszej bezpiecznej wersji.

Program, mapa, pomoc, artykuły, plan i dziennik powinny działać bez konta. Konto jest potrzebne do drużyny, publikowania profilu, lajków i synchronizacji. Weryfikację adresu najlepiej przeprowadzić przed przyjazdem; potrzebny jest działający SMTP, np. już używany przez organizatora.

PocketBase uznaje żądanie za uwierzytelnione na podstawie tokenu w `Authorization`. Sam zapis UID w localStorage nie pełni tej funkcji. [Dokumentacja uwierzytelniania](https://pocketbase.io/docs/authentication/).

**Model danych:**

- `users`: auth; `name`, `suspended` domyślnie `false`, `sd_enabled` domyślnie `false`. Dwa ostatnie pola zmienia wyłącznie serwer.
- Wszystkie prywatne rekordy: wymagane `owner` jako relacja do `users`.
- `cien_teams`: `owner`, `members` jako wielokrotna relacja do `users`; bez JSON członków. Kody zaproszeń w osobnej, niedostępnej publicznie kolekcji.
- `cien_messages`, `cien_notes`, `cien_meetings`, `cien_locations`: relacja `team`.
- `cien_sd_likes`: `owner` oznacza autora, `target` jest relacją do drugiego użytkownika.
- Profile: `edition`, `active`, `moderation`; zgody powiązane z wersją dokumentu i edycją.
- Nowe kolekcje: `cien_blocks`, `cien_reports`, opcjonalnie `cien_matches`.
- Dziennik pozostaje lokalny; nie synchronizować go automatycznie przy zakładaniu konta.

**Poniższe reguły dotyczą tego nowego schematu, nie obecnych tekstowych UID.** Nie należy ich wklejać bez migracji pól i sprawdzenia wersji PB. W PocketBase `null` oznacza zamknięcie operacji dla zwykłego klienta, a `""` publiczny dostęp. [Reguły API](https://pocketbase.io/docs/api-rules-and-filters/).

Dla czytelności tabeli używam skrótów rozwijanych do dokładnych wyrażeń:

```text
A =
@request.auth.id != "" &&
@request.auth.verified = true &&
@request.auth.suspended = false

O =
@request.auth.id != "" &&
@request.auth.verified = true &&
@request.auth.suspended = false &&
owner = @request.auth.id

T =
@request.auth.id != "" &&
@request.auth.verified = true &&
@request.auth.suspended = false &&
team.members ?= @request.auth.id
```

`A/O/T` nie są makrami PocketBase — przed zapisaniem reguł trzeba zastąpić je powyższym tekstem.

| Kolekcja | `listRule` | `viewRule` | `createRule` | `updateRule` | `deleteRule` |
|---|---|---|---|---|---|
| `users` | `@request.auth.id != "" && id = @request.auth.id` | Jak `listRule` | Reguła U1 poniżej | Reguła U2 poniżej | `@request.auth.id != "" && id = @request.auth.id` |
| `cien_sd_profiles` | `O` | `O` | `A && @request.auth.sd_enabled = true && @request.body.owner = @request.auth.id && @request.body.moderation:isset = false` | `O && @request.body.owner:changed = false && @request.body.edition:changed = false && @request.body.moderation:changed = false` | `O` |
| `cien_sd_likes` | `O` | `O` | `null` | `null` | `O` |
| `cien_matches` | `A && participants ?= @request.auth.id` | Jak `listRule` | `null` | `null` | `null` |
| `cien_push_subs` | `O` | `O` | `A && @request.body.owner = @request.auth.id` | `O && @request.body.owner:changed = false` | `O` |
| `cien_teams` | `A && members ?= @request.auth.id` | Jak `listRule` | `null` | `O && @request.body.owner:changed = false && @request.body.members:changed = false` | `O` |
| `cien_messages` | `T` | `T` | Reguła G1 poniżej | `null` | `O && team.members ?= @request.auth.id` |
| `cien_notes` | `T` | `T` | G1 | G2 | `O && team.members ?= @request.auth.id` |
| `cien_meetings` | `T` | `T` | G1 | G2 | `O && team.members ?= @request.auth.id` |
| `cien_locations` | `O` | `O` | G1 | G2 | `O` |
| `cien_blocks` | `O` | `O` | `A && @request.body.owner = @request.auth.id && @request.body.target != @request.auth.id && @request.body.target != ""` | `null` | `O` |
| `cien_reports` | `O` | `O` | `A && @request.body.owner = @request.auth.id && @request.body.status:isset = false` | `null` | `null` |
| `cien_announcements` | `published = true` | `published = true` | `null` | `null` | `null` |
| `cien_team_invites`, rejestr migracji | `null` | `null` | `null` | `null` | `null` |

```text
U1 — users.createRule:
@request.auth.id = "" &&
@request.body.verified:isset = false &&
@request.body.suspended:isset = false &&
@request.body.sd_enabled:isset = false

U2 — users.updateRule:
@request.auth.id != "" &&
id = @request.auth.id &&
@request.body.verified:changed = false &&
@request.body.suspended:changed = false &&
@request.body.sd_enabled:changed = false

G1 — tworzenie treści drużynowej:
@request.auth.id != "" &&
@request.auth.verified = true &&
@request.auth.suspended = false &&
@request.body.owner = @request.auth.id &&
team.members ?= @request.auth.id

G2 — aktualizacja własnej treści drużynowej:
@request.auth.id != "" &&
@request.auth.verified = true &&
@request.auth.suspended = false &&
owner = @request.auth.id &&
team.members ?= @request.auth.id &&
@request.body.owner:changed = false &&
@request.body.team:changed = false
```

Dodatkowo `users.manageRule = null`, a `authRule = 'verified = true && suspended = false'`. Samo `authRule` nie zastępuje sprawdzania zawieszenia w regułach prywatnych kolekcji.

**Dlaczego profile i lokalizacje innych osób nie mają bezpośrednio szerokiego odczytu?** To najprostszy sposób, aby klient nie mógł ominąć blokad, zgód i zakresu ujawniania danych.

Potrzebna jest mała warstwa serwerowa na istniejącym PocketBase:

1. **Odkrywanie profili i zdjęcia:** uwierzytelniony endpoint zwraca wyłącznie dozwolone pola, aktywną edycję i zatwierdzone profile; sprawdza zgodę obu osób oraz blokady w obie strony. Paginacja następuje po tych filtrach.
2. **Polubienie:** endpoint ustala autora z tokenu, sprawdza dostępność profilu i blokady, zapisuje unikalną parę. Wzajemność tworzy serwerowy match i jedno zdarzenie push.
3. **Drużyny:** serwerowe tworzenie, dołączanie, opuszczanie i usuwanie, z transakcją oraz limitem prób kodu. Klient nie edytuje listy członków.
4. **Lokalizacje:** osobny odczyt pozycji członków tej samej drużyny, wyłącznie przy aktywnym udostępnianiu i świeżym znaczniku czasu. Serwer ustala czas; wyłączenie usuwa lub dezaktywuje rekord.
5. **Moderacja:** hooki walidujące i filtrujące UGC, obsługa blokad również na czacie, zgłoszenia i zawieszenia. Reguła członkostwa sama nie jest moderacją.
6. **Usunięcie konta/profilu:** hook serwerowy wykonuje pełne usuwanie zależności także przy bezpośrednim wywołaniu DELETE. Nie polega na pętli w przeglądarce.

Zdjęcia profili oznaczyć jako chronione. Przy powyższych regułach zdjęcia innych osób powinien obsługiwać autoryzowany endpoint, sprawdzający te same warunki co odkrywanie. Nie zwracać klientowi tokenu superusera. Samo ograniczenie odczytu rekordów nie chroni domyślnie publicznych URL plików PB. [Chronione pliki](https://pocketbase.io/docs/files-handling/).

Wymagane indeksy: unikalne `(owner, edition)` profilu, `(owner, target, edition)` lajka, `(owner, target)` blokady, endpoint subskrypcji oraz odpowiednie indeksy `(team, created)`. Limity długości, typów plików, wielkości zdjęć, liczby operacji i dozwolonych endpointów push muszą działać na serwerze.

**Migracja istniejących `guest_` / `u_`:**

- **Nie wolno uznać starego UID, lokalnego hasha ani adresu z localStorage za dowód własności.** UID jest przesyłany i odczytywany przez klientów; e-mail nigdy nie był zweryfikowany.
- Utworzyć nowe konto PB i zweryfikować adres. Lokalny plan można przypisać do nowego konta po zgodzie użytkownika; dziennik zachować lokalnie.
- Nie importować starego SHA-256 jako nowego hasła. Użytkownik ustawia nowe hasło.
- Nie udostępniać endpointu „podaj legacy UID, a przejmiesz rekordy”.
- Dane społeczne 2026, których retencja już wygasła, **nie powinny być automatycznie reaktywowane na 2027**. Najprostsza bezpieczna ścieżka to nowy profil i nowa zgoda.
- Jeżeli trzeba odzyskać konkretne stare dane, wymaga to niezależnego dowodu i serwerowej procedury odzyskania; samo posiadanie lokalnego UID nie wystarcza.

Przed uruchomieniem: sprawdzić każde CRUD jako gość, użytkownik A, użytkownik B, członek obcej drużyny, osoba zablokowana i konto zawieszone. Szczególnie przetestować zmianę `owner`, dopisanie siebie do `members`, dostęp do zdjęć i usuwanie konta.

**5. Gotowość do sklepów**

| Wymóg | Ocena stanu i warunek wydania |
|---|---|
| **Apple 4.2** | Program offline, osobisty plan, dziennik i mapa mogą zapewnić wystarczającą użyteczność. WebView nie oznacza automatycznego odrzucenia, ale sama obecność tych funkcji nie gwarantuje akceptacji. Potrzebne są działające przepływy i aktualna treść. |
| **Apple 1.2** | Przed wydaniem: skuteczne blokowanie, zgłoszenia, filtrowanie treści i obsługa moderacyjna obejmująca profile oraz czat. |
| **Apple 5.1.1** | Przed wydaniem: zgodna z implementacją polityka, minimalizacja danych, pełne usuwanie konta i faktyczne respektowanie zgód. |

Powyższe wymagania wynikają z aktualnych [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).

Dla Google Play potrzebne są skuteczna moderacja UGC oraz ścieżka usunięcia konta w aplikacji i **publiczny zasób WWW pozwalający zażądać usunięcia**. Zwykły zapis adresu e-mail w roboczym opisie sklepu nie jest jeszcze gotowym przepływem. [UGC](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en), [usuwanie kont](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).

Jeżeli aplikacja zostanie zaklasyfikowana jako Social/Dating lub będzie spełniać definicję anonimowego/random chatu, trzeba spełnić dodatkowe Child Safety Standards. Samo ograniczenie 18+ nie zwalnia aplikacji objętej tym zakresem. [Zakres wymagań Google](https://support.google.com/googleplay/android-developer/answer/14747720?hl=en).

Technicznie:

- **TWA:** assetlinks istnieje. Trzeba sprawdzić zgodność z certyfikatem **Play App Signing**, nie tylko lokalnego uploadu; README wskazuje to jako następny krok. [Digital Asset Links dla TWA](https://developer.chrome.com/docs/android/trusted-web-activity/multi-origin).
- **iOS WebView:** przygotować osobną obsługę powiadomień natywnych, pobierania/udostępniania ICS, wyboru zdjęć, klawiatury, linków `tel:` i `mailto:` oraz trwałości danych. Web Push dla aplikacji dodanej do ekranu początkowego nie oznacza automatycznie wsparcia w opakowaniu WebView. [Apple — Web Push](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers).
- **Offline w opakowaniu:** sprawdzić po zamknięciu procesu i ponownym uruchomieniu w trybie samolotowym. Sam manifest i SW w repo nie dowodzą poprawności pakietu iOS.
- **Deklaracje sklepowe:** uzupełnić rzeczywiste kategorie danych, przepływ AI i docelową obsługę lokalizacji. Ankiety wieku wypełnić aktualnie; nie przepisywać mechanicznie roboczego „17+”.
- **Materiały dla recenzenta:** konto testowe, instrukcja moderacji/usuwania i jednoznaczne oddzielenie archiwum 2026 od zapowiedzi 2027.

**6. Top 15 zmian w kolejności wdrożenia**

1. **Zabezpieczyć dostęp do PB i administracji:** zamknąć anonimowe operacje prywatne i publikację ogłoszeń.
2. **Wdrożyć prawdziwe konta PocketBase:** weryfikacja, reset, tokeny, właściciele rekordów i bezpieczna migracja.
3. **Usunąć niebezpieczne renderowanie HTML:** dziennik, plan, AI i dane w handlerach.
4. **Zrobić pełne serwerowe usuwanie danych oraz retencję.**
5. **Wdrożyć blokady, zgłoszenia i moderację** profili, zdjęć oraz czatu.
6. **Wydzielić konfigurację edycji:** 2026 jako archiwum, 8–11.07.2027 jako zapowiedź bez wymyślonego programu.
7. **Ujednolicić informacje o pomocy i terenie:** stały przycisk „Pomoc”, zatwierdzone dane, mapa właściwego miejsca.
8. **Naprawić start offline i aktualizacje:** szybki cache, timeout, wersjonowanie danych, brak niszczenia działającego pakietu.
9. **Naprawić drużynę i czat:** członkostwo, kolejność, szkice, outbox, odporność na równoczesne operacje.
10. **Naprawić synchronizację Slow Dating:** retry, paginacja, idempotencja i jedno powiadomienie na match.
11. **Uczynić Mój Plan pełnym narzędziem:** wszystkie dni, konflikty, osobiste „następne”.
12. **Dodać pełny ICS i przypomnienia**, z uczciwym rozróżnieniem kalendarza, Web Push i natywnych alarmów.
13. **Poprawić dostępność i czytelność:** semantyka, fokus, kontrast, większy tekst funkcyjny, reduced motion.
14. **Wprowadzić tryb oszczędny i ograniczyć pracę w tle:** animacje, blur, polling oraz GPS.
15. **Przetestować rzeczywiste TWA i WebView oraz dopiero wtedy aktualizować opisy i wysyłać do sklepów:** słaba sieć, tryb samolotowy, ponowne uruchomienie, odmowa uprawnień, nowe konto i usunięcie konta.
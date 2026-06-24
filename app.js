/* ============================================
   CIEŃ FESTIWAL 2026 — App JS
   ============================================ */

'use strict';

// ============================================
// AUTH — Google Identity Services
// ============================================

const GOOGLE_CLIENT_ID = '797161544700-dsh51dd918bdqto7fpfpamlvq409m38e.apps.googleusercontent.com';

let _fbApp = null;
let _fbAuth = null;

function initFirebase() {
  if (typeof FIREBASE_CONFIG === 'undefined' || FIREBASE_CONFIG.apiKey === 'REPLACE_ME') return;
  try {
    _fbApp = firebase.initializeApp(FIREBASE_CONFIG);
    _fbAuth = firebase.auth();
  } catch (e) {
    console.warn('[auth] Firebase init failed:', e);
  }
}

function _setUser(uid, email, name) {
  localStorage.setItem('cien_user_id', uid);
  if (email) localStorage.setItem('cien_user_email', email);
  if (name)  localStorage.setItem('cien_user_name', name);
  hideAuthScreen();
  if (typeof initTeam === 'function') initTeam();
}

function showAuthScreen() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

function hideAuthScreen() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = '';
}

function skipAuth() {
  const guestId = 'guest_' + Math.random().toString(36).slice(2, 10);
  localStorage.setItem('cien_user_id', guestId);
  hideAuthScreen();
}

// Email quick login — email jako identyfikator, hasło opcjonalne
function authEmailQuick() {
  const input = document.getElementById('auth-email');
  if (!input || !input.value.trim()) { _authError('Wpisz adres email'); return; }
  if (!input.validity.valid) { _authError('Wpisz poprawny adres email'); return; }
  const email = input.value.trim().toLowerCase();
  const uid   = 'email_' + btoa(email).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
  const name  = email.split('@')[0];
  _setUser(uid, email, name);
}

function _authError(msg) {
  const el = document.getElementById('auth-error');
  if (el) el.textContent = msg;
}

// --- GOOGLE (Google Identity Services — FedCM flow, nie wymaga konfiguracji originu) ---
let _googleInitialized = false;

function _googleCredentialCallback({ credential }) {
  try {
    const payload = JSON.parse(atob(credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    _setUser('google_' + payload.sub, payload.email, payload.name);
  } catch (e) {
    _authError('Błąd przetwarzania odpowiedzi Google');
  }
}

function _initGoogleAuth() {
  if (typeof google === 'undefined' || !google.accounts) return;
  if (_googleInitialized) return;
  _googleInitialized = true;
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: _googleCredentialCallback,
    cancel_on_tap_outside: true,
    ux_mode: 'popup',
  });
  // Prerenderuj przycisk — działa na wszystkich przeglądarkach (origin zarejestrowany)
  const container = document.getElementById('google-btn-container');
  if (container) {
    try {
      google.accounts.id.renderButton(container, {
        type: 'standard',
        shape: 'rectangular',
        theme: 'outline',
        text: 'signin_with',
        size: 'large',
        width: 280,
      });
    } catch (_) {}
  }
}

function authGoogle() {
  if (typeof google === 'undefined' || !google.accounts) {
    _authError('Google Sign-In się ładuje — spróbuj za chwilę');
    setTimeout(() => {
      if (typeof google !== 'undefined' && google.accounts) { _initGoogleAuth(); authGoogle(); }
    }, 1500);
    return;
  }
  _initGoogleAuth();
  // Pokaż wyrenderowany przycisk Google (działa na wszystkich przeglądarkach — origin zarejestrowany)
  const container = document.getElementById('google-btn-container');
  const mainGoogleBtn = document.querySelector('.auth-social-btn[onclick*="authGoogle"]');
  if (container) {
    if (mainGoogleBtn) mainGoogleBtn.style.display = 'none';
    container.style.display = 'flex';
  }
  google.accounts.id.prompt((notification) => {
    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
      // One Tap nie pokazany — przycisk już jest widoczny
      if (!container || container.style.display === 'none') {
        _authError('Google Sign-In niedostępny. Użyj email.');
      }
    }
  });
}


// ============================================
// STATE
// ============================================

const State = {
  data: null,
  currentView: 'teraz',
  schedule: {
    activeDay: '2026-07-03',
    activeZone: 'all'
  },
  map: {
    activePOIType: 'all'
  },
  journal: {
    activeStage: 'nigredo',
    activeTab: 'journal'
  },
  modalEvent: null,
  kb: { activeCategory: 'all' }
};

const ZONES_MAP = {
  podswiadomosci: { color: '#7B3F82', icon: '🌀' },
  sacrum:         { color: '#C9A84C', icon: '🔥' },
  anima:          { color: '#4A6FA5', icon: '☯' },
  umbra:          { color: '#E05C1A', icon: '⚡' },
  gnoza:          { color: '#2D7D46', icon: '🎬' },
  lochy:          { color: '#8B4513', icon: '🕯' }
};

const DAY_STAGES = {
  '2026-07-03': 'nigredo',
  '2026-07-04': 'albedo',
  '2026-07-05': 'rubedo'
};

const JOURNAL_PROMPTS = {
  nigredo: [
    'Co chcę zostawić za sobą podczas tego festiwalu? Co chcę rozpuścić?',
    'Które emocje najtrudniej mi przyjąć? Co one próbują mi powiedzieć?',
    'Co przykryłem w sobie, żeby móc funkcjonować? Co teraz wychodzi na powierzchnię?',
    'Jaki fragment siebie przywiozłem tu, który dawno nie był widziany?',
    'Co mnie tu sprowadziło naprawdę — pod warstwą oczywistej odpowiedzi?',
    'Czego boję się zobaczyć w sobie na tym festiwalu?',
    'Co w zachowaniu innych dziś mnie drażniło lub irytowało? Co to mówi o mnie?',
    'Jakie słowa, obrazy lub dźwięki z dzisiejszego dnia wracają bez zaproszenia?',
    'Gdyby twój Cień mógł tu przemówić — co by powiedział?',
    'Co schowałem do torby zanim tu przyjechałem — i czy czas to wyjąć?'
  ],
  albedo: [
    'Co widzę wyraźniej niż wczoraj? Co się oczyściło?',
    'Kogo spotkałem dziś — w sobie lub w innych — z czym się rozpoznałem?',
    'Jaki obraz, uczucie lub myśl wracają do mnie tego dnia?',
    'Które doświadczenie z dzisiejszego dnia poruszyło coś, czego się nie spodziewałem?',
    'Co do tej pory zatrzymujesz dla siebie? Co chciałbyś wyrazić głośno?',
    'Który moment dziś był najbliższy ciszy w środku — bez myśli, bez oceny?',
    'Z kim nawiązałem kontakt, który wydaje się nieprzypadkowy? Co to połączenie mówi?',
    'Co ze stref festiwalu (Sacrum, Anima/Animus, Umbra) zostaje w moim ciele?',
    'Jak czuje się moje ciało teraz, kiedy siadam i naprawdę słucham siebie?',
    'Która stara historia o sobie staje się dziś mniej prawdziwa?'
  ],
  rubedo: [
    'Co zabiorę ze sobą z tego doświadczenia? Co we mnie zostanie?',
    'Jak będę traktował siebie inaczej po powrocie? Co konkretnie zmienię?',
    'Komu lub czemu chcę podziękować za to, co przeżyłem?',
    'Jedno zdanie, które opisuje to, czego nauczyłem się o sobie na CIEŃ Festiwalu.',
    'Co z tego co przeżyłem wcielę w codzienne życie — konkretne działanie, nie hasło?',
    'Jaką historię o sobie zabierasz z Zamku Świny, żeby opowiedzieć ją inaczej?',
    'Który archetyp — Cień, Anima/Animus, Jaźń, Bohater — był tu dla mnie najgłośniejszy?',
    'Co chcę powiedzieć sobie sprzed festiwalu?',
    'Jak to doświadczenie zmienia sposób, w jaki będę patrzeć na relacje z innymi?',
    'Zamknij oczy. Zrób wdech. Co czujesz w ciele teraz, gdy festiwal dobiega końca?'
  ]
};

// ============================================
// KOŁO ŻYCIA — DATA (WAR Kwestionariusz)
// ============================================

const WHEEL_AREAS = [
  {
    id: 'finanse', name: 'Finanse i praca', shortName: 'Praca', color: '#C9A84C',
    questions: [
      'Czuję satysfakcję z poziomu swoich zarobków',
      'Czuję entuzjazm i sens myśląc o swojej pracy',
      'Czuję się szanowany/a w miejscu pracy',
      'Czuję, że w pracy mogę w pełni rozwinąć skrzydła',
      'Zachowuję zdrowy balans między pracą a życiem prywatnym',
      'Czuję bezpieczeństwo finansowe',
      'W moim środowisku pracy panuje pozytywna atmosfera',
      'Moje pomysły i sugestie w pracy są brane pod uwagę',
      'Stanowisko, które zajmuję, odpowiada moim kwalifikacjom i ambicjom',
      'Odczuwam ogólną satysfakcję z pracy i poziomu zarobków'
    ]
  },
  {
    id: 'relacje', name: 'Rodzina i relacje', shortName: 'Relacje', color: '#E07070',
    questions: [
      'Czuję się kochany/a i akceptowany/a przez bliskich',
      'W moich relacjach panuje otwartość i zaufanie',
      'Mam kogoś, do kogo mogę się zwrócić w trudnych chwilach',
      'Jestem zadowolony/a z ilości czasu spędzanego z bliskimi',
      'W mojej rodzinie sprawnie rozwiązujemy nieporozumienia',
      'Czuję bliskość z osobami, które są dla mnie ważne',
      'Każdy w mojej rodzinie może swobodnie wyrażać swoje zdanie',
      'Jestem zadowolony/a z komunikacji w moich relacjach',
      'Czuję, że moje relacje dają mi siłę i wsparcie',
      'Odczuwam ogólną satysfakcję z mojego życia rodzinnego i partnerskiego'
    ]
  },
  {
    id: 'zdrowie', name: 'Zdrowie i ciało', shortName: 'Zdrowie', color: '#5BAD92',
    questions: [
      'Ogólnie jestem zadowolony/a ze swojego stanu zdrowia',
      'Jestem sprawny/a fizycznie i mam dużo energii',
      'Regularnie dbam o ciało — ruch, sen, odżywianie',
      'Sypiam dobrze i budzę się wypoczęty/a',
      'W ostatnim miesiącu byłem/am pełen/pełna energii i animuszu',
      'W ostatnim miesiącu byłem/am wyciszony/a i spokojny/a',
      'Czynności wymagające wysiłku fizycznego nie sprawiają mi problemu',
      'Dzięki regularnym badaniom jestem świadomy/a swojego stanu zdrowia',
      'Mój organizm funkcjonuje prawidłowo',
      'Stan mojego zdrowia pozwala mi w pełni cieszyć się życiem'
    ]
  },
  {
    id: 'pasje', name: 'Czas wolny i pasje', shortName: 'Pasje', color: '#7B5EA7',
    questions: [
      'Mam czas i przestrzeń na to, co mnie pasjonuje',
      'Moje hobby sprawia mi autentyczną radość',
      'Moja pasja daje mi poczucie wolności i sensu',
      'Potrafię skutecznie odpoczywać i regenerować siły',
      'W ostatnim miesiącu spałem/am wystarczająco długo',
      'W ostatnim miesiącu nie czułem/am się przytłoczony/a obowiązkami',
      'Moje życie nie ogranicza się tylko do pracy i obowiązków',
      'W ostatnim miesiącu miałem/am wystarczająco dużo czasu tylko dla siebie',
      'Mam wystarczająco dużo dni wolnych i urlopu w ciągu roku',
      'Jestem zadowolony/a ze sposobu, w jaki spędzam czas wolny'
    ]
  },
  {
    id: 'rozwoj', name: 'Rozwój osobisty', shortName: 'Rozwój', color: '#4A90D9',
    questions: [
      'Wiem, dokąd zmierzam w swoim życiu',
      'Mam konkretny plan działania na swoje cele',
      'Biorę pełną odpowiedzialność za własny rozwój',
      'Potrafię się skutecznie motywować do działania',
      'Znam swoje zalety i potrafię je wykorzystać',
      'Moje cele życiowe motywują mnie do ich realizacji',
      'Rozumiem i akceptuję etap rozwoju, na którym się teraz znajduję',
      'Wiem, jak zmienić konkretne rzeczy, by poprawić jakość swojego życia',
      'Mam poczucie, że nieustannie dowiaduję się czegoś nowego o sobie',
      'Z czasem staję się coraz lepszą wersją siebie'
    ]
  },
  {
    id: 'sens', name: 'Duchowość i sens', shortName: 'Sens', color: '#3BAFBA',
    questions: [
      'Czuję, że moje życie ma głębszy sens',
      'Żyję w zgodzie ze swoimi wartościami',
      'Akceptuję to, co przynosi mi życie',
      'Odczuwam wewnętrzny spokój i harmonię',
      'Dążę do wewnętrznej wolności i spokoju ducha',
      'We wszystkim staram się znaleźć coś pozytywnego',
      'Mój światopogląd pomaga mi radzić sobie z trudnościami',
      'Moje cele życiowe są źródłem satysfakcji, nie frustracji',
      'Akceptuję to, że w życiu nie wszystko jest pewne i przewidywalne',
      'Czuję się częścią czegoś większego niż ja sam/a'
    ]
  }
];

// PSH-based per-area solution-focused forms (5 questions each)
const WHEEL_AREA_FORMS = {
  finanse: [
    'Co już działa w Twojej pracy lub finansach — choćby jedna rzecz, z której możesz być dumny/a?',
    'Wyobraź sobie za rok: ten obszar jest na 10/10. Co konkretnie widzisz, czujesz, robisz inaczej?',
    'Jaka wartość jest dla Ciebie najważniejsza w pracy i zarządzaniu finansami?',
    'Co najczęściej stoi między Tobą a tym, czego chcesz — nawyk, lęk, przekonanie?',
    'Jeden konkretny krok możliwy w tym tygodniu, niezależnie od nastroju?'
  ],
  relacje: [
    'Kiedy Twoje relacje były najlepsze — co wtedy było inaczej niż dziś?',
    'Gdybyś był/a dokładnie taką osobą w relacjach, jaką chcesz być — co robiłbyś/aś inaczej?',
    'Co jest dla Ciebie naprawdę ważne w głębokim kontakcie z ludźmi?',
    'Jaki wzorzec lub nawyk najczęściej psuje lub utrudnia Twoje relacje?',
    'Jeden konkretny gest wobec bliskiej osoby — możliwy już tego tygodnia?'
  ],
  zdrowie: [
    'Za co Twoje ciało zasługuje na wdzięczność — co Ci daje, mimo że może nie jest idealne?',
    'Przypomnij moment, gdy czułeś/aś się naprawdę dobrze fizycznie. Co wtedy robiłeś/aś?',
    'Jaką osobą chcesz być w stosunku do swojego ciała i zdrowia?',
    'Co najczęściej zatrzymuje Cię przed dbaniem o siebie — nawyk, czas, przekonanie?',
    'Jaka najmniejsza codzienna czynność zdrowotna jest w zasięgu nawet w gorszy dzień?'
  ],
  pasje: [
    'Kiedy ostatnio naprawdę wypoczywałeś/aś albo robiłeś/aś coś wyłącznie dla siebie?',
    'Gdybyś miał/a 3 godziny więcej w tygodniu — na co konkretnie byś je przeznaczył/a?',
    'Co sprawia, że czas wolny jest dla Ciebie naprawdę wartościowy?',
    'Co najczęściej kradnie Ci czas lub energię, która mogłaby iść na pasje i odpoczynek?',
    'Jedna czynność regenerująca lub przyjemna — możliwa do zaplanowania w tym tygodniu?'
  ],
  rozwoj: [
    'Czego nauczyłeś/aś się o sobie w ostatnim roku — co Cię zaskoczyło lub przetrwało próbę czasu?',
    'Za rok, gdy naprawdę się rozwinąłeś/aś — kto to pierwszy zauważy i co powie?',
    'Co jest dla Ciebie najważniejsze w tym, kim się stajesz?',
    'Co najczęściej zatrzymuje Cię przed rozwojem — lęk, brak czasu, wewnętrzny krytyk?',
    'Jedno małe działanie spójne z kierunkiem, który chcesz obrać — możliwe w tym tygodniu?'
  ],
  sens: [
    'Kiedy ostatnio czułeś/aś, że Twoje życie ma głęboki sens — co się wtedy działo?',
    'Co chcesz, żeby zostało po Tobie — w ludziach, w pracy, w świecie?',
    'Jakie wartości są dla Ciebie święte — których nie poświęcisz niczemu?',
    'Co odpycha Cię od głębszego kontaktu ze sobą lub z tym, co uważasz za naprawdę ważne?',
    'Jeden rytuał lub chwila uważności — możliwa już jutro rano lub wieczorem?'
  ]
};

// ============================================
// BAZA WIEDZY — DANE ARTYKUŁÓW
// ============================================

const KB_CATEGORIES = [
  { id: 'all',        label: 'Wszystko', color: '#C9A84C' },
  { id: 'historia',   label: 'Historia',  color: '#C9A84C' },
  { id: 'psychologia',label: 'Psychologia', color: '#7B3F82' },
  { id: 'nauka',      label: 'Nauka',     color: '#4A6FA5' },
];

const KB_CAT_COLORS = { historia:'#C9A84C', psychologia:'#7B3F82', nauka:'#4A6FA5' };

const ARTICLES_DATA = [
  {
    id: 'zamek-historia',
    title: 'Zamek Świny — 900 lat historii',
    category: 'historia', emoji: '🏰', readTime: '4 min',
    teaser: 'Pierwsza wzmianka pochodzi z 1108 roku. W XVII wieku liczył ponad 300 komnat — największy zamek Śląska.',
    content: `<p>Zamek Świny to jeden z najstarszych zamków prywatnych w Polsce. Pierwsza wzmianka pochodzi z <em>Chronica Bohemorum</em> Kosmasa z Pragi z 1108 roku, gdzie wymieniony jest jako <em>Zvini in Polonia</em><sup>[1]</sup>. Przez ponad pół tysiąclecia był siedzibą rodu von Schweinichen — jednej z najpotężniejszych śląskich rodzin rycerskich.</p><p>W połowie XIV wieku wzniesiono rycerską wieżę mieszkalną. Około 1371 roku Günzel von Schweinichen znacząco rozbudował kompleks. Szczyt potęgi przypadł na wiek XVII — Świny liczyć miały ponad 300 komnat, co czyniło je największą warownią Śląska<sup>[2]</sup>. Najsilniejszy z rodu, Heinrich von Schweinichen, uczestniczył w krucjacie i władał 24 wsiami.</p><p>Upadek był gwałtowny. Podczas wojny siedmioletniej zamek splądrowany został przez wojska rosyjskie. W 1769 roku sprzedany na licytacji pruskiemu ministrowi stanu Janowi Henrykowi hrabiemu von Churschwandt. Do 1941 roku właścicielami byli austriaccy hrabiowie Hoyos von Sprinzenstein, którzy w 1905 roku zlecili pierwsze prace restauracyjne<sup>[3]</sup>.</p><p>Dziś zamek stoi jako malownicza ruina — i właśnie ta ruinowość jest częścią jego siły. Miejsce między historią a rozpadem, między tym co było i tym, co mogłoby być znów.</p>`,
    sources: [
      {n:1, text:'Kosmas z Pragi, Chronica Bohemorum (1108); Wikipedia PL — Zamek Świny', url:'https://pl.wikipedia.org/wiki/Zamek_%C5%9Awiny'},
      {n:2, text:'Gorytajemnic.pl — Fascynująca historia Zamku Świny', url:'https://www.gorytajemnic.pl/ciekawe-miejsca/od-murow-obronnych-do-ksiegozbioru-mistykow-fascynujaca-historia-zamku-swiny.html'},
      {n:3, text:'Wikipedia DE — Burg Świny', url:'https://de.wikipedia.org/wiki/Burg_%C5%9Awiny'},
    ]
  },
  {
    id: 'bohme-mistyczny-krag',
    title: 'Jakob Böhme i mistyczny krąg Zamku Świny',
    category: 'historia', emoji: '🔮', readTime: '5 min',
    teaser: 'W 1624 roku na zamku schronił się Jakob Böhme — pierwszy filozof piszący po niemiecku. Jego mecenas Jan Zygmunt von Schweinichen zamienił warownię w centrum europejskiej myśli mistycznej.',
    content: `<p>W XVII wieku Zamek Świny stał się centrum myśli teozoficzno-mistycznej. Jan Zygmunt von Schweinichen założył tu bogatą bibliotekę i utrzymywał kontakty z mistykami, alchemikami i różokrzyżowcami z całej Europy<sup>[1]</sup>.</p><p><strong>Jakob Böhme</strong> (1575–1624) — szewski czeladnik z Görlitz, który stał się pierwszym filozofem piszącym w języku niemieckim — przebywał na zamku w ostatnim roku swojego życia. W marcu 1624 roku napisał tu <em>„Przesłanie do spragnionej i głodnej duszy"</em>. Na zlecenie von Schweinichena rozpoczął <em>„177 Pytań teozoficznych"</em> — dzieło pozostało nieukończone po jego śmierci w tym samym roku<sup>[2]</sup>.</p><p>Böhme głosił, że Bóg poznaje siebie przez człowieka, a ciemność i światło są równie niezbędnymi aspektami rzeczywistości. Nie ma bytu bez jego przeciwieństwa. Trzy stulecia później Carl Jung powie to samo — choć innymi słowami — opisując relację ego i Cienia.</p><p>Zamek Świny był dla tej idei żywym laboratorium. Ruiny, które chodzisz teraz po zmierzchu, pamiętają rozmowy, które zmieniły historię filozofii.</p>`,
    sources: [
      {n:1, text:'Gorytajemnic.pl — Fascynująca historia Zamku Świny', url:'https://www.gorytajemnic.pl/ciekawe-miejsca/od-murow-obronnych-do-ksiegozbioru-mistykow-fascynujaca-historia-zamku-swiny.html'},
      {n:2, text:'Wikipedia EN — Jakob Böhme', url:'https://en.wikipedia.org/wiki/Jakob_B%C3%B6hme'},
    ]
  },
  {
    id: 'franckenberg-alchemik',
    title: 'Abraham von Franckenberg — alchemik i mistyk Śląska',
    category: 'historia', emoji: '⚗️', readTime: '4 min',
    teaser: 'Śląski szlachcic, matematyk i alchemik, który spotkał Böhmego właśnie na Zamku Świny. Jego krąg uczniów rozszerzył się w europejski Zakon Złotego Krzyża.',
    content: `<p>Mało kto wie, że nici między mistyką Zamku Świny a europejskim ruchem różokrzyżowym prowadzą przez jedną postać: <strong>Abrahama von Franckenberga</strong> (1593–1652). Śląski szlachcic, matematyk, mistyk i alchemik spotkał Jakoba Böhmego właśnie na Zamku Świny w 1623 roku<sup>[1]</sup>.</p><p>Franckenberg łączył kabałę, alchemię paracelsyjską i myśl gnostycką w spójną „alchemię duchową" — rozumianą nie jako transformację metali, ale jako wewnętrzną przemianę człowieka. Jego krąg uczniów rozszerzył się w znany <em>Orden des Gold- und Rosenkreuz</em> (Zakon Złotego i Różanego Krzyża)<sup>[2]</sup>.</p><p>Franckenberg sformułował ideę, że starożytna mądrość — niezależnie od tradycji, czy to chrześcijańskiej, gnostyckiej czy pogańskiej — wskazuje na ten sam proces wewnętrznej przemiany. Nigredo jako oczyszczenie. Albedo jako rozpoznanie. Rubedo jako integracja.</p><p>Zamek Świny nie był przypadkowym tłem dla tych rozmów. Był miejscem, które je umożliwiało.</p>`,
    sources: [
      {n:1, text:'Wikipedia EN — Abraham von Franckenberg', url:'https://en.wikipedia.org/wiki/Abraham_von_Franckenberg'},
      {n:2, text:'ResearchGate — Franckenberg and the Ancient Wisdom of Rebirth', url:'https://www.researchgate.net/publication/357206212_Abraham_von_Franckenberg_and_the_Ancient_Wisdom_of_Rebirth'},
    ]
  },
  {
    id: 'sedziwoj-tlen',
    title: 'Michał Sędziwój — Polak, który odkrył tlen',
    category: 'historia', emoji: '🔬', readTime: '4 min',
    teaser: 'W 1604 roku w Pradze polak opisał substancję życiodajną w powietrzu — 170 lat przed Scheelem. Na dworze Rudolfa II przez 42 lata. Potem na Śląsku.',
    content: `<p>W 1604 roku ukazało się dzieło, które przez 150 lat kształtowało europejską chemię. <em>Novum Lumen Chymicum</em> (Nowe Światło Alchemii) napisał Polak — <strong>Michał Sędziwój</strong> (1566–1636). Opisał w nim powietrze zawierające tajemniczą „substancję życiodajną" — pierwiastek, który dziś nazywamy tlenem. Scheele i Priestley „odkryli" go 170 lat później<sup>[1]</sup>.</p><p>Sędziwój był ulubieńcem cesarza Rudolfa II w Pradze — centrum europejskiego okultyzmu i alchemii przełomu XVI/XVII wieku. Przez 42 lata służył na dworze habsburskim — rekordowy czas dla kogokolwiek w tej roli<sup>[2]</sup>. Około 1619 roku przeszedł na służbę Ferdynanda II i zakładał huty ołowiu i żelaza na Śląsku.</p><p>Jego śląski okres oznacza, że działał w tej samej geografii co mistyczny krąg Zamku Świny — choć bezpośredniego kontaktu z von Schweinichenem nie potwierdzono. Sędziwój jest dowodem, że granica między alchemią a nowoczesną nauką była w XVII wieku cienka jak błona. I że Śląsk był miejscem, gdzie tę granicę przekraczano.</p>`,
    sources: [
      {n:1, text:'Wikipedia EN — Michael Sendivogius', url:'https://en.wikipedia.org/wiki/Michael_Sendivogius'},
      {n:2, text:'Krakow.wiki — Michał Sędziwój', url:'https://krakow.wiki/sedziwoj-michal/'},
    ]
  },
  {
    id: 'nigredo-albedo-rubedo',
    title: 'Nigredo, Albedo, Rubedo — Jung i mapa przemiany',
    category: 'psychologia', emoji: '☽', readTime: '5 min',
    teaser: 'W 1944 roku Jung opublikował „Psychologię i Alchemię" — tezę, że alchemicy projektowali procesy nieświadome na materię. Trzy etapy Magnum Opus to mapa psyche, nie przepis na złoto.',
    content: `<p>W 1944 roku Carl Gustav Jung opublikował <em>Psychologie und Alchemie</em> — książkę, która zmieniła sposób patrzenia na starożytne teksty alchemiczne. Teza Junga była prosta i rewolucyjna: alchemicy nie próbowali zamienić ołowiu w złoto. Projektowali swoje nieświadome procesy na materię<sup>[1]</sup>.</p><p>Magnum Opus przebiega przez cztery etapy. <strong>Nigredo</strong> (czernienie): rozpad, konfrontacja z tym co ciemne — analogia do spotkania z Cieniem. <strong>Albedo</strong> (bielenie): oczyszczenie, rozpoznanie dwóch odrębnych zasad dążących do zjednoczenia. <strong>Citrinitas</strong> (żółknienie): przebudzenie słoneczne, często pomijany etap. <strong>Rubedo</strong> (czerwienienie): integracja, osiągnięcie Jaźni<sup>[2]</sup>. Dlatego dni Cień Festiwalu noszą te właśnie nazwy.</p><p>Jung pisał: „Alchemia opisuje to, co dzieje się w człowieku, gdy w pełni przeżywa siebie." Dla niego Nigredo to nie porażka — to konieczny punkt wyjścia każdej prawdziwej przemiany. Nie ma Rubedo bez przejścia przez czerń. Jesteś teraz na festiwalu. Gdzieś w tym procesie.</p>`,
    sources: [
      {n:1, text:'Jung C.G., Psychologie und Alchemie (1944); scottjeffrey.com — Jung and Alchemy', url:'https://scottjeffrey.com/jung-and-alchemy-magnum-opus/'},
      {n:2, text:'Wikipedia EN — Nigredo', url:'https://en.wikipedia.org/wiki/Nigredo'},
    ]
  },
  {
    id: 'cien-archetyp',
    title: 'Archetyp Cienia — czym jest to, czym nie chcemy być',
    category: 'psychologia', emoji: '🌑', readTime: '4 min',
    teaser: '„Cień jest tym, czym człowiek nie chce być" — Jung. To suma odrzuconych treści psychicznych: agresja, seksualność, ale też talenty i siła, których się wstydzimy.',
    content: `<p>„Cień jest tym, czym człowiek nie chce być" — to definicja, którą Jung zawarł w <em>Zebranych Dziełach</em><sup>[1]</sup>. Cień to suma treści psychicznych odrzuconych jako „nie-ja": cechy, impulsy, emocje, których ego odmawia uznania za własne. Stają się niewidzialne dla nas — ale bardzo widoczne dla innych.</p><p>Cień nie jest zły z natury. Zawiera zarówno to, co kulturowo odrzucone (agresja, seksualność, chciwość), jak i to, co zostało stłumione bez powodu — talenty, spontaniczność, siłę. Jung mówił o „złotym Cieniu": projekcji własnych wartości na innych, która wywołuje idealizację lub zazdrość<sup>[2]</sup>.</p><p>Konfrontacja z Cieniem to pierwszy i najtrudniejszy etap indywiduacji. Nie chodzi o to, by Cień „wyleczyć" lub usunąć — ale by go uznać. Powiedzieć: „Tak, to też jest mną." Dopiero wtedy przestaje kierować nami zza zasłony nieświadomości. Festiwal Cień bierze swoją nazwę właśnie od tego etapu.</p>`,
    sources: [
      {n:1, text:'Jung C.G., Collected Works, Vol. 16; The Jungian Shadow — thesap.org.uk', url:'https://www.thesap.org.uk/articles-on-jungian-psychology-2/about-analysis-and-therapy/the-shadow/'},
      {n:2, text:'Wikipedia EN — Shadow (psychology)', url:'https://en.wikipedia.org/wiki/Shadow_(psychology)'},
    ]
  },
  {
    id: 'anima-animus',
    title: 'Anima i Animus — spotkanie z drugą połową siebie',
    category: 'psychologia', emoji: '☯', readTime: '4 min',
    teaser: 'W psychice mężczyzny żyje kobiecy aspekt (Anima), w psychice kobiety — męski (Animus). Niezintegrowane, projektujemy je na partnerów. Zintegrowane — stają się źródłem kreatywności.',
    content: `<p>Jung zauważył, że psyche człowieka nie jest jednorodna płciowo. W psychice mężczyzny żyje kobiecy aspekt — <strong>Anima</strong>. W psychice kobiety — męski <strong>Animus</strong>. Etymologia prosta: łacińskie <em>anima</em> i <em>animus</em> oznaczają po prostu duszę<sup>[1]</sup>.</p><p>Anima i Animus to archetypy — wzorce ponadosobowe zakorzenione w nieświadomości zbiorowej. Działają jako mosty między ego a głębszymi warstwami psyche. Kiedy nie są zintegrowane, projektujemy je na partnerów: zakochujemy się w projekcji, nie w człowieku. Kiedy są uświadomione — stają się źródłem kreatywności, empatii i pełni<sup>[2]</sup>.</p><p>Strefa Anima/Animus na festiwalu to przestrzeń tego spotkania — z contra-sexualem, z tym co w sobie tłumimy ze względu na płeć kulturową. Slow Dating to nie aplikacja randkowa. To ćwiczenie w byciu widzianym przez drugiego człowieka bez maski roli.</p>`,
    sources: [
      {n:1, text:'Wikipedia EN — Anima and animus', url:'https://en.wikipedia.org/wiki/Anima_and_animus'},
      {n:2, text:'Jung C.G., Collected Works Vol. 9ii (Aion); thesap.org.uk', url:'https://www.thesap.org.uk/articles-on-jungian-psychology-2/about-analysis-and-therapy/the-anima-and-animus/'},
    ]
  },
  {
    id: 'indywiduacja',
    title: 'Indywiduacja — po co nam festiwal przemiany',
    category: 'psychologia', emoji: '🌀', readTime: '3 min',
    teaser: 'Indywiduacja to Jungowski proces integracji świadomości i nieświadomości. Trwa całe życie. Festiwale przemiany, rytuały przejścia, odosobnienia — to starożytne formy stwarzania na nią przestrzeni.',
    content: `<p>Indywiduacja — jedno z centralnych pojęć psychologii Junga — to proces integracji świadomych i nieświadomych elementów psyche<sup>[1]</sup>. Nie chodzi o stanie się kimś innym. Chodzi o stanie się w pełni tym, kim się jest. Jung widział w tym zadanie życia — trwające całe życie, nigdy nie ukończone.</p><p>Festiwal przemiany, rytuał przejścia, odosobnienie z intencją — to starożytne formy stwarzania przestrzeni dla indywiduacji. Wychodzimy z codzienności, zawieszamy zwykłe role i odpowiedzi, i stajemy przed pytaniem: kim jestem poza tym, czym muszę być?</p><p>Cień Festiwal jest zaprojektowany jako taki kontener. Trzy dni odpowiadają trzem etapom alchemicznym — Nigredo, Albedo, Rubedo. Zamek Świny jest tłem nieprzypadkowym: miejsce stare, z historią mistyczną (Böhme, Franckenberg), poza zasięgiem codzienności. Kontener działa, kiedy wiesz, że jesteś w kontenerze.</p>`,
    sources: [
      {n:1, text:'Wikipedia EN — Individuation', url:'https://en.wikipedia.org/wiki/Individuation'},
      {n:2, text:'Pacifica Graduate Institute — Jung\'s Collected Works', url:'https://pacifica.libguides.com/Jung/shadow'},
    ]
  },
  {
    id: 'zamek-bolkow',
    title: 'Zamek Bolków — piastowski strażnik gór',
    category: 'historia', emoji: '🗡', readTime: '3 min',
    teaser: '8 km od Zamku Świny stoi jeden z najlepiej zachowanych zamków Dolnego Śląska. Unikalną cechą jest wieża-dziób — jedyna taka w Polsce. Legenda mówi o ukrytej tu Bursztynowej Komnacie.',
    content: `<p>Osiem kilometrów od Zamku Świny stoi jeden z najlepiej zachowanych zamków Dolnego Śląska. Zamek Bolków (niem. Bolkenstein) pojawia się w dokumentach po raz pierwszy w 1277 roku<sup>[1]</sup>. Jego rozbudowę przypisuje się Bolkowi I Surowemu — temu samemu piastowskiemu władcy, którego imię nosi miasto.</p><p>Wyróżnik Bolkowa to unikalna <strong>wieża-dziób</strong> — wysoka na 25 metrów, ostrym narożnikiem skierowana w stronę potencjalnego ataku. W całej Polsce istnieją tylko dwie takie wieże: w Bolkowie i w Niesytnie<sup>[2]</sup>. Lochy służyły jako więzienie, a legendy mówią o ukrytym tu skarbie — i o Bursztynowej Komnacie, która nigdy nie trafiła do Berlina.</p><p>Bolków leży na <strong>Szlaku Zamków Piastowskich</strong> — trasie liczącej 152 km łączącej 15 warowni Dolnego Śląska. Zamek Świny to najstarszy punkt szlaku (wzmianka z 1108 r.). Zamek Książ — największy na Dolnym Śląsku, trzeci w Polsce — to jego zachodnia kotwica.</p>`,
    sources: [
      {n:1, text:'Wikipedia PL — Zamek Bolków', url:'https://pl.wikipedia.org/wiki/Zamek_Bo%C5%82k%C3%B3w'},
      {n:2, text:'Zamkiobronne.pl — Bolków', url:'https://zamkiobronne.pl/zamek/bolkow/'},
    ]
  },
  {
    id: 'zamek-grodno',
    title: 'Zamek Grodno — rycerze-rozbójnicy i Biała Dama',
    category: 'historia', emoji: '👻', readTime: '3 min',
    teaser: 'W XV wieku był siedzibą bandy rabusiów łupiących kupców na sudeckich traktach. Zamurowana kasztelanka, studnia tureckiego jeńca i krwawy bunt chłopski z 1680 roku.',
    content: `<p>Zamek Grodno w Zagórzu Śląskim to jeden z najlepiej zachowanych zamków Dolnego Śląska. Pierwsza wzmianka pochodzi z 1315 roku (burgrabia Kilian von Haugwitz), a budowę przypisuje się Bolkowi I Surowemu<sup>[1]</sup>. W 1392 roku włączony do Korony Czeskiej.</p><p>XV wiek to epoka rycerzy-rozbójników. W latach 1443–1450 zamek był siedzibą Jerzego Mühlheima i jego bandy łupiących kupców na sudeckich traktach<sup>[2]</sup>. W wojnie trzydziestoletniej zajęty przez Szwedów. W 1680 roku na zamku krwawo stłumiony bunt chłopski.</p><p>Legendy nie brakuje: Biała Dama — kasztelanka zamurowana żywcem za zdradę. Studnia wykopana przez tureckiego jeńca. I ta najsłynniejsza: ukryty skarb, którego nie znalazł jeszcze nikt. Grodno warte jest wizyty nie ze względu na legendy — ale dlatego, że mury XIII-wieczne stoją wciąż tam, gdzie je postawiono.</p>`,
    sources: [
      {n:1, text:'zamekgrodno.pl — Historia', url:'https://zamekgrodno.pl/historia/'},
      {n:2, text:'Wikipedia PL — Zamek Grodno', url:'https://pl.wikipedia.org/wiki/Zamek_Grodno_(zamek)'},
    ]
  },
  {
    id: 'zamek-czocha',
    title: 'Zamek Czocha — SS, Abwehra i łóżko z zapadnią',
    category: 'historia', emoji: '🕵', readTime: '4 min',
    teaser: 'Zbudowany w XIII wieku przez czeskiego króla. W 1941 roku przejęty przez SS jako ośrodek szkolenia oficerów. Według źródeł mieściła się tu szkoła szpiegowska Abwehry.',
    content: `<p>Zamek Czocha (niem. Tzschocha) w Leśnej to jeden z najlepiej zachowanych zamków w Polsce. Zbudowany w XIII wieku przez króla czeskiego Wacława I jako strażnica pogranicza nad rzeką Kwisą<sup>[1]</sup>. Przez wieki zmieniał właścicieli; w XIX wieku przekształcony w romantyczną rezydencję.</p><p>Historia najciemniejsza: w 1941 roku zamek przejęty przez SS jako ośrodek szkoleniowy oficerów. Według różnych źródeł mieściła się tu szkoła szpiegowska Abwehry — wojskowego wywiadu III Rzeszy<sup>[2]</sup>. Werner von Braun, twórca rakiet V-2, miał wizytować zamek w tym okresie. Tajne pomieszczenia i tunele do dziś nie są w pełni zbadane.</p><p>Legendy są wbudowane w kamień: łóżko z zapadnią, przez które zazdrosny mąż strącił żonę do lochu. Biała Dama Gertruda — kasztelanka ścięta za zdanie zamku husytom w XV wieku. Dziś Czocha jest hotelem i najczęściej odwiedzaną atrakcją turystyczną Dolnego Śląska.</p>`,
    sources: [
      {n:1, text:'Wikipedia PL — Zamek Czocha', url:'https://pl.wikipedia.org/wiki/Zamek_Czocha'},
      {n:2, text:'Zwiedzajacswiat.com — Zamek Czocha: historia, legendy i tajemnice', url:'https://zwiedzajacswiat.com/2016/09/01/zamek-czocha-historia-legendy-i-tajemnice/'},
    ]
  },
  {
    id: 'historia-hipnozy',
    title: 'Historia hipnozy — od Mesmera do fMRI',
    category: 'nauka', emoji: '🧠', readTime: '5 min',
    teaser: 'Franz Anton Mesmer był w połowie szarlatanem, w połowie geniuszem. To, co po nim zostało, otworzyło naukę hipnozy. Dziś fMRI pokazuje: to nie magia — to mierzalny stan mózgu.',
    content: `<p><strong>Franz Anton Mesmer</strong> (1734–1815) był w połowie szarlatanem, w połowie geniuszem. Jego „magnetyzm zwierzęcy" — idea kosmicznego przepływu manipulowanego przez ciało — odrzuciła komisja Akademii Francuskiej w 1784 roku<sup>[1]</sup>. Ale coś nieoczekiwanego zostało: pacjenci reagowali. Pytanie „co właściwie się tu dzieje" otworzyło naukę hipnozy.</p><p><strong>James Braid</strong> wprowadził słowo „hipnotyzm" i wykazał, że mechanizm jest neurologiczny, nie magnetyczny. <strong>Jean-Martin Charcot</strong> używał hipnozy do badań nad „histerią" w paryskim Salpêtrière. <strong>Milton Erickson</strong> (1901–1980) zrewolucjonizował podejście: zamiast autorytatywnych komend — pośrednie, permisywne indukcje dostosowane do konkretnego człowieka<sup>[2]</sup>.</p><p>Dziś hipnoza ma swoje miejsce w neuronauce. Badania fMRI pokazują: podczas hipnozy spada aktywność sieci domyślnej (default mode network) i wzrasta łączność między siecią kontroli wykonawczej a obszarami przetwarzania doznań cielesnych<sup>[3]</sup>. To nie magia — to odmieniony stan mózgu, mierzalny i replikowalny.</p>`,
    sources: [
      {n:1, text:'Wikipedia EN — History of hypnosis', url:'https://en.wikipedia.org/wiki/History_of_hypnosis'},
      {n:2, text:'PMC — Neuro-Hypnotism (Robson & Woollams)', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC3528837/'},
      {n:3, text:'PMC 2025 — Hypnosis Neural Correlates (fMRI)', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC13024316/'},
    ]
  },
  {
    id: 'psylocybina-badania',
    title: 'Psylocybina w klinice — co mówią badania',
    category: 'nauka', emoji: '🍄', readTime: '5 min',
    teaser: 'Johns Hopkins 2020: dwie dawki psylocybiny zredukowały depresję z 22,8 do 7,7 w skali HAMD po 12 miesiącach. FDA przyznała status Breakthrough Therapy. Co to oznacza dla terapii?',
    content: `<p>W 2020 roku <em>JAMA Psychiatry</em> opublikowała wyniki przełomowego badania Johns Hopkins University. Dwie dawki psylocybiny w połączeniu z terapią wspomagającą: wynik depresji (GRID-HAMD) spadł z 22,8 do 7,7 po 12 miesiącach<sup>[1]</sup>. FDA przyznała psylocybinie status <em>Breakthrough Therapy</em> dla dużej depresji i depresji opornej na leczenie.</p><p>Bezpieczeństwo: Hopkins śledził 250 wolontariuszy w 380 sesjach przez 16 lat. Brak poważnych incydentów psychologicznych. Jedynie 0,9% uczestników zgłosiło przejściowe trudności<sup>[2]</sup>. W badaniach MAPS Phase 3 nad MDMA w leczeniu PTSD: 71% uczestników po zakończeniu nie spełniało już kryteriów PTSD (wobec 47,6% w grupie placebo)<sup>[3]</sup>.</p><p>FDA odrzuciło wniosek o rejestrację MDMA w sierpniu 2024 roku (głosowanie 2:9), wymagając dodatkowego badania Phase 3. Kierunek jest jednak wyraźny. Psylocybina i MDMA przechodzą z marginesu do mainstreamu klinicznego. Pytanie nie brzmi już „czy działają" — ale „jak i dla kogo".</p>`,
    sources: [
      {n:1, text:'JAMA Psychiatry — Psilocybin-Assisted Treatment for MDD (2020)', url:'https://pubmed.ncbi.nlm.nih.gov/33146667/'},
      {n:2, text:'Hopkins Psychedelic Research Center', url:'https://www.hopkinspsychedelic.org/'},
      {n:3, text:'MAPS.org — MDMA-Assisted Therapy for PTSD', url:'https://maps.org/mdma/ptsd/'},
    ]
  },
  {
    id: 'harm-reduction-historia',
    title: 'Harm reduction — Liverpool, Amsterdam i narodziny ruchu',
    category: 'nauka', emoji: '🛡', readTime: '4 min',
    teaser: 'Ruch harm reduction narodził się nie z ideologii, ale z pragmatyzmu wobec epidemii HIV. Amsterdam 1984, Liverpool Mersey Model. W 1990 roku — pierwsza globalna konferencja.',
    content: `<p>Ruch harm reduction (ograniczania szkód) narodził się nie z ideologii, ale z pragmatyzmu wobec epidemii. W <strong>Amsterdamie w 1984 roku</strong> organizacja użytkowników narkotyków <em>Junkiebond</em> uruchomiła pierwsze na świecie formalne programy wymiany igieł — początkowo jako odpowiedź na wirusowe zapalenie wątroby B, szybko przekształcone w ochronę przed HIV<sup>[1]</sup>.</p><p>Równolegle w <strong>Liverpoolu</strong> rozwinął się „Model Mersey": outreach workers wychodzący na ulicę, czyste igły, edukacja bez moralizowania<sup>[2]</sup>. Merseyside jako jeden z niewielu regionów Anglii nie doświadczyło epidemii HIV wśród osób używających narkotyków. W 1990 roku odbyła się w Liverpoolu I Międzynarodowa Konferencja na temat Skutków Używania Narkotyków — narodziny globalnego ruchu.</p><p>Harm reduction nie mówi „nie używaj". Mówi: jeśli używasz, rób to bezpieczniej. To zmiana paradygmatu — od kary do zdrowia publicznego. Punkt SACRUM na festiwalu Cień jest dokładnie tym: przestrzenią bez osądzania, gdzie można zapytać o to, co trudno zapytać gdzie indziej.</p>`,
    sources: [
      {n:1, text:'NCBI — History of Amsterdam Needle Exchange', url:'https://www.ncbi.nlm.nih.gov/books/NBK236662/'},
      {n:2, text:'ResearchGate — Merseyside: the first harm reduction conferences', url:'https://www.researchgate.net/publication/6150957_Merseyside_the_first_harm_reduction_conferences_and_the_early_history_of_harm_reduction'},
    ]
  },
  {
    id: 'integracja-psychodeliczna',
    title: 'Integracja psychodeliczna — co robić po doświadczeniu',
    category: 'nauka', emoji: '🌱', readTime: '4 min',
    teaser: 'Integracja to faza postdoświadczeniowa kluczowa dla trwałej zmiany. Badania są zgodne: nie samo doświadczenie tworzy zmianę — to co z nim robimy po.',
    content: `<p>Integracja psychodeliczna — według definicji opublikowanej w <em>Frontiers in Psychology</em> (2022) — to „proces powracania i aktywnego nadawania sensu, przepracowywania, tłumaczenia i przetwarzania treści doświadczenia psychodelicznego... dążenie ku większej równowadze i pełni"<sup>[1]</sup>. To faza postdoświadczeniowa, kluczowa dla trwałej zmiany terapeutycznej.</p><p>Badania są zgodne: nie samo doświadczenie tworzy zmianę — to co z nim robimy po. Sesja bez integracji to sen bez interpretacji: coś się wydarzyło, ale znaczenie zostaje nieprzepracowane. Narzędzia integracji: pisanie (dziennik), rozmowa z terapeutą lub zaufaną osobą, medytacja, zmiana konkretnych nawyków<sup>[2]</sup>.</p><p>Dziennik Przemiany w tej aplikacji jest zaprojektowany właśnie jako narzędzie integracyjne. Pytania Nigredo, Albedo i Rubedo odpowiadają etapom procesu — od konfrontacji, przez rozpoznanie, po zobowiązanie do zmiany. Możesz go wypełnić podczas festiwalu i wrócić do niego po tygodniu. Integracja nie kończy się w niedzielę wieczorem.</p>`,
    sources: [
      {n:1, text:'Frontiers in Psychology — What is psychedelic integration? (2022)', url:'https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.824077/full'},
      {n:2, text:'MAPS.org — Integration Resources', url:'https://maps.org/resources/'},
    ]
  },
];

// Google Calendar token (in-memory only)
let _gcalToken = null;
let _gcalTokenClient = null;

// ============================================
// INIT
// ============================================

function detectFestivalDay() {
  const now = new Date();
  const h = now.getHours();
  let y = now.getFullYear(), m = now.getMonth()+1, d = now.getDate();
  if (h < 6) {
    const prev = new Date(now); prev.setDate(prev.getDate()-1);
    y = prev.getFullYear(); m = prev.getMonth()+1; d = prev.getDate();
  }
  const today = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const days = ['2026-07-03','2026-07-04','2026-07-05'];
  if (days.includes(today)) return today;
  return now < new Date('2026-07-03T06:00:00') ? '2026-07-03' : '2026-07-05';
}

function setupModalSwipeToClose() {
  const overlay = document.querySelector('.modal-overlay');
  const sheet   = document.querySelector('.modal-sheet');
  if (!sheet || !overlay) return;

  let startY = 0, startScroll = 0;

  sheet.addEventListener('touchstart', e => {
    startY      = e.touches[0].clientY;
    startScroll = sheet.scrollTop;
  }, { passive: true });

  sheet.addEventListener('touchend', e => {
    const deltaY = e.changedTouches[0].clientY - startY;
    if (startScroll === 0 && deltaY > 80) closeEventModal();
  }, { passive: true });
}

async function init() {
  initFirebase();
  State.schedule.activeDay = detectFestivalDay();
  await loadData();
  setupRouter();
  setupClock();
  setupInstallPrompt();
  setupModalSwipeToClose();
  registerSW();
  navigateTo(location.hash.slice(1) || 'teraz');
  const splash = document.getElementById('splash-screen');
  if (splash) setTimeout(() => splash.classList.add('hidden'), 400);

  const loggedIn = localStorage.getItem('cien_user_id');
  if (!loggedIn) {
    setTimeout(() => showAuthScreen(), 450);
  }
  // Init team feature after auth check
  if (loggedIn && typeof initTeam === 'function') initTeam();
  // Inicjuj Google One Tap
  if (typeof google !== 'undefined' && google.accounts) {
    _initGoogleAuth();
  } else {
    window.addEventListener('load', () => setTimeout(_initGoogleAuth, 300));
  }
  if (_fbAuth) {
    _fbAuth.onAuthStateChanged(user => {
      if (user) {
        _setUser(user.uid, user.email, user.displayName);
      }
    });
  }
}

async function loadData() {
  try {
    const [scheduleRes, poisRes, speakersRes] = await Promise.all([
      fetch('data/schedule.json'),
      fetch('data/pois.json'),
      fetch('data/speakers.json').catch(() => null)
    ]);
    const schedule = await scheduleRes.json();
    const pois = await poisRes.json();
    const speakers = speakersRes ? await speakersRes.json().catch(() => ({})) : {};
    State.data = { ...schedule, ...pois, speakers };
  } catch (e) {
    console.error('Failed to load data:', e);
    State.data = { events: [], zones: [], pois: [], festival: { zones: [] }, speakers: {} };
  }
}

// ============================================
// ROUTER
// ============================================

const VIEWS = ['teraz', 'mapa', 'slowdating', 'dziennik', 'sacrum', 'druzyna', 'info', 'wiedza'];

function setupRouter() {
  window.addEventListener('hashchange', () => {
    const view = location.hash.slice(1) || 'teraz';
    if (VIEWS.includes(view)) navigateTo(view);
  });

  document.getElementById('bottom-nav').addEventListener('click', e => {
    const btn = e.target.closest('.nav-btn');
    if (btn) {
      const view = btn.dataset.view;
      location.hash = view;
    }
  });
}

function navigateTo(view) {
  if (!VIEWS.includes(view)) view = 'teraz';
  State.currentView = view;

  // Update nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  // Update views
  document.querySelectorAll('.view').forEach(v => {
    v.classList.toggle('active', v.id === `view-${view}`);
  });

  // Render
  renderView(view);
  updateHeader();
}

function renderView(view) {
  switch (view) {
    case 'teraz':       renderSchedule(); break;
    case 'mapa':        renderMap(); break;
    case 'slowdating':  renderSlowDating(); break;
    case 'dziennik':    renderJournal(); break;
    case 'sacrum':      renderSacrum(); break;
    case 'druzyna':     renderTeamView(); break;
    case 'info':        renderInfo(); break;
    case 'wiedza':      renderKnowledge(); break;
  }
}

// ============================================
// HEADER + CLOCK
// ============================================

function setupClock() {
  updateClock();
  setInterval(updateClock, 60000);
}

function updateClock() {
  const el = document.getElementById('header-time');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

function updateHeader() {
  const stage = DAY_STAGES[State.schedule.activeDay];
  const stageBadge = document.getElementById('stage-badge');
  if (stageBadge) {
    const labels = { nigredo: 'Nigredo · 3 VII', albedo: 'Albedo · 4 VII', rubedo: 'Rubedo · 5 VII' };
    stageBadge.textContent = labels[stage] || 'CIEŃ 2026';
  }
}

// ============================================
// VIEW: SCHEDULE (TERAZ)
// ============================================

function dismissOnboarding() {
  localStorage.setItem('cien_ob', '1');
  const el = document.getElementById('onb-card');
  if (el) el.remove();
}

function _onboardingCard() {
  if (localStorage.getItem('cien_ob')) return '';

  const shareIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`;
  const dotIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`;

  return `
<div class="onb-card" id="onb-card">
  <div class="onb-head">
    <div>
      <div class="onb-title">Instrukcja aplikacji</div>
      <div class="onb-sub">Dodaj do pulpitu — działa offline podczas festiwalu</div>
    </div>
    <button class="onb-dismiss" onclick="dismissOnboarding()" aria-label="Zamknij">✕</button>
  </div>

  <div class="onb-section">
    <div class="onb-section-title">Jak zainstalować</div>
    <div class="onb-platforms">
      <div class="onb-platform">
        <div class="onb-platform-name">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
          iPhone / iPad
        </div>
        <ul class="onb-steps">
          <li data-n="1">Otwórz w Safari</li>
          <li data-n="2">Tap <span class="onb-step-icon">${shareIcon}</span> Udostępnij</li>
          <li data-n="3">„Dodaj do ekranu<br>głównego"</li>
        </ul>
      </div>
      <div class="onb-platform">
        <div class="onb-platform-name">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 15.341L14 6H10L6.477 15.341C5.58 15.638 5 16.476 5 17.5 5 18.881 6.119 20 7.5 20s2.5-1.119 2.5-2.5c0-.277-.046-.544-.13-.793L12 16l2.13.707c-.084.249-.13.516-.13.793 0 1.381 1.119 2.5 2.5 2.5s2.5-1.119 2.5-2.5c0-1.024-.58-1.862-1.477-2.159zM12 4.5a.5.5 0 100-1 .5.5 0 000 1z"/></svg>
          Android
        </div>
        <ul class="onb-steps">
          <li data-n="1">Otwórz w Chrome</li>
          <li data-n="2">Tap <span class="onb-step-icon">${dotIcon}</span> menu</li>
          <li data-n="3">„Dodaj do ekranu<br>głównego"</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="onb-rules">
    <div class="onb-section-title">Zasady Cienia</div>
    <ul class="onb-rules-list">
      <li><span>🤝</span><span>Szanuj granice innych. Pytaj zanim dotkniesz.</span></li>
      <li><span>📸</span><span>Zdjęcia i nagrania tylko za wyraźną zgodą osoby.</span></li>
<li><span>🛡</span><span>Coś się dzieje? Czill &amp; Heal, punkt Help lub kamizelka organizatora.</span></li>
      <li><span>🌙</span><span>Cisza w strefach nocnych i namiotowych po 4:00.</span></li>
    </ul>
  </div>

  <button class="onb-btn" onclick="dismissOnboarding()">Rozumiem, gotowy na Cień →</button>
</div>`;
}

function renderSchedule() {
  const container = document.getElementById('schedule-content');
  if (!container || !State.data) return;

  const events = State.data.events || [];
  const zones = State.data.festival?.zones || [];

  // TU I TERAZ — zawsze na górze, wszystkie strefy
  const festivalStarted = new Date() >= new Date('2026-07-03T06:00:00');
  const tuITerazHTML = festivalStarted ? renderTuITeraz(events) : '';

  // Day tabs
  const days = ['2026-07-03', '2026-07-04', '2026-07-05'];
  const DAY_LABELS = { '2026-07-03': '3 VII', '2026-07-04': '4 VII', '2026-07-05': '5 VII' };
  const dayTabsHTML = days.map(day => {
    const stage = DAY_STAGES[day];
    const active = State.schedule.activeDay === day;
    return `
      <button class="day-tab ${stage} ${active ? 'active' : ''}" onclick="setActiveDay('${day}')">
        <div class="tab-stage">${stage}</div>
        <div class="tab-date">${DAY_LABELS[day]}</div>
      </button>`;
  }).join('');

  // Zone chips
  const zoneChipsHTML = [
    `<button class="zone-chip all ${State.schedule.activeZone === 'all' ? 'active' : ''}" onclick="setActiveZone('all')">Wszystkie</button>`,
    ...zones.map(z => `
      <button class="zone-chip ${State.schedule.activeZone === z.id ? 'active' : ''}"
              data-zone="${z.id}"
              onclick="setActiveZone('${z.id}')">
        ${z.icon} ${z.shortName}
      </button>`)
  ].join('');

  // Events for current day + zone
  // Festival day runs 06:00–05:59, so after-midnight sets belong to the previous day
  const dayEvents = events.filter(ev => {
    const matchDay = getFestivalDay(ev.start) === State.schedule.activeDay;
    const matchZone = State.schedule.activeZone === 'all' || ev.zone === State.schedule.activeZone;
    return matchDay && matchZone;
  }).sort((a, b) => {
    // Sort: events before 06:00 come after events from the same festival day (they're late-night)
    const aH = new Date(a.start).getHours();
    const bH = new Date(b.start).getHours();
    const aOrd = aH < 6 ? aH + 24 : aH;
    const bOrd = bH < 6 ? bH + 24 : bH;
    if (aOrd !== bOrd) return aOrd - bOrd;
    return a.start.localeCompare(b.start);
  });

  const eventsHTML = renderEventsList(dayEvents);

  const favs = getFavorites();
  const dayFavEvents = dayEvents.filter(e => favs.includes(e.id));
  const favHTML = dayFavEvents.length ? `
    <div class="favs-section">
      <div class="favs-title">⭐ Mój plan na dziś</div>
      ${dayFavEvents.map(ev => {
        const zone = (State.data?.festival?.zones || []).find(z => z.id === ev.zone) || {};
        const color = zone.color || ZONES_MAP[ev.zone]?.color || '#888';
        const icon = zone.icon || ZONES_MAP[ev.zone]?.icon || '●';
        return `<div class="event-card" style="border-left-color:${color}" onclick="openEventModal('${ev.id}')">
          <div class="event-time">${formatTime(ev.start)} <span class="event-duration">→ ${formatTime(ev.end)}</span></div>
          <div class="event-title">${ev.title}</div>
          <div class="event-zone-tag" style="color:${color}">${icon} ${zone.shortName || ev.zone}</div>
        </div>`;
      }).join('')}
    </div>
    <div class="divider" style="margin:0 1rem 0.5rem"></div>` : '';

  container.innerHTML = `
    ${_onboardingCard()}
    ${tuITerazHTML}
    <div class="day-tabs">${dayTabsHTML}</div>
    <div class="zone-filter">${zoneChipsHTML}</div>
    ${favHTML}
    <div class="events-list">${eventsHTML}</div>
  `;
}

function renderTuITeraz(allEvents) {
  const now = new Date();

  // Eventy trwające teraz — ze WSZYSTKICH stref i dni
  const nowEvents = allEvents.filter(ev => {
    const start = new Date(ev.start);
    const end = new Date(ev.end);
    return now >= start && now <= end;
  });

  let content = '';
  let labelText = '';

  if (nowEvents.length > 0) {
    labelText = 'TU I TERAZ';
    content = nowEvents.map(ev => {
      const zone = (State.data?.festival?.zones || []).find(z => z.id === ev.zone) || {};
      const color = zone.color || ZONES_MAP[ev.zone]?.color || '#888';
      const icon = zone.icon || ZONES_MAP[ev.zone]?.icon || '●';
      const isMainStage = ev.zone === 'umbra';
      return `
        <div class="tu-i-teraz-card ${isMainStage ? 'tu-i-teraz-main' : ''}"
             style="border-left-color:${color}"
             onclick="openEventModal('${ev.id}')">
          ${isMainStage ? `<div class="tu-i-teraz-main-label">🎵 SCENA GŁÓWNA — TERAZ</div>` : ''}
          <div class="event-time">
            ${formatTime(ev.start)} <span class="event-duration">→ ${formatTime(ev.end)}</span>
          </div>
          <div class="event-title">${ev.title}</div>
          ${ev.artist ? `<div class="event-artist">${ev.artist}</div>` : ''}
          <div class="event-zone-tag" style="color:${color}">${icon} ${zone.shortName || zone.name || ev.zone}</div>
        </div>`;
    }).join('');
  } else {
    // Za chwilę — kolejne 2-3 wydarzenia ze wszystkich stref
    const upcoming = allEvents
      .filter(ev => new Date(ev.start) > now)
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 3);

    if (upcoming.length === 0) return '';

    labelText = 'ZA CHWILĘ';
    content = upcoming.map(ev => {
      const zone = (State.data?.festival?.zones || []).find(z => z.id === ev.zone) || {};
      const color = zone.color || ZONES_MAP[ev.zone]?.color || '#888';
      const icon = zone.icon || ZONES_MAP[ev.zone]?.icon || '●';
      return `
        <div class="tu-i-teraz-card"
             style="border-left-color:${color}"
             onclick="openEventModal('${ev.id}')">
          <div class="event-time">
            ${formatTime(ev.start)} <span class="event-duration">→ ${formatTime(ev.end)}</span>
          </div>
          <div class="event-title">${ev.title}</div>
          ${ev.artist ? `<div class="event-artist">${ev.artist}</div>` : ''}
          <div class="event-zone-tag" style="color:${color}">${icon} ${zone.shortName || zone.name || ev.zone}</div>
        </div>`;
    }).join('');
  }

  return `
    <div class="tu-i-teraz-section">
      <div class="tu-i-teraz-header">
        <span class="tu-i-teraz-dot"></span>
        <span class="tu-i-teraz-label">${labelText}</span>
      </div>
      <div class="tu-i-teraz-events">${content}</div>
    </div>
    <div class="tu-i-teraz-separator"></div>
  `;
}

function renderNowBanner(events) {
  const now = new Date();
  const nowEvents = events.filter(ev => {
    const start = new Date(ev.start);
    const end = new Date(ev.end);
    return now >= start && now <= end;
  });

  if (nowEvents.length === 0) {
    const nextUp = events.filter(ev => new Date(ev.start) > now)
                         .sort((a,b) => a.start.localeCompare(b.start))
                         .slice(0, 2);
    if (nextUp.length === 0) return '';
    return `
      <div class="now-banner">
        <div class="now-banner-label">
          <span class="now-dot"></span>
          ZA CHWILĘ
        </div>
        <div class="now-events">
          ${nextUp.map(ev => renderMiniEventCard(ev, false, true)).join('')}
        </div>
      </div>`;
  }

  return `
    <div class="now-banner">
      <div class="now-banner-label">
        <span class="now-dot"></span>
        TERAZ
      </div>
      <div class="now-events">
        ${nowEvents.map(ev => renderMiniEventCard(ev, true, false)).join('')}
      </div>
    </div>`;
}

function renderMiniEventCard(ev, isNow, isSoon) {
  const zone = (State.data?.festival?.zones || []).find(z => z.id === ev.zone) || ZONES_MAP[ev.zone] || {};
  const color = zone.color || ZONES_MAP[ev.zone]?.color || '#888';
  const icon = zone.icon || ZONES_MAP[ev.zone]?.icon || '●';
  const timeStr = formatTime(ev.start);
  return `
    <div class="event-card ${isNow ? 'is-now' : ''}" style="border-left-color:${color}" onclick="openEventModal('${ev.id}')">
      <div class="event-time">
        ${timeStr} <span class="event-duration">→ ${formatTime(ev.end)}</span>
      </div>
      <div class="event-title">${ev.title}</div>
      ${ev.artist ? `<div class="event-artist">${ev.artist}</div>` : ''}
      <div class="event-zone-tag" style="color:${color}">${icon} ${zone.shortName || zone.name || ev.zone}</div>
    </div>`;
}

function renderEventsList(events) {
  if (events.length === 0) {
    return `<div class="text-muted italic" style="padding:1rem 0;text-align:center">Brak wydarzeń dla wybranych filtrów</div>`;
  }

  const now = new Date();
  let lastHour = null;
  const parts = [];

  events.forEach(ev => {
    const hour = ev.start.slice(11, 13);
    if (hour !== lastHour) {
      parts.push(`<div class="time-separator"><span>${hour}:00</span></div>`);
      lastHour = hour;
    }

    const isNow = now >= new Date(ev.start) && now <= new Date(ev.end);
    const isPast = now > new Date(ev.end);
    const zone = (State.data?.festival?.zones || []).find(z => z.id === ev.zone) || {};
    const color = zone.color || ZONES_MAP[ev.zone]?.color || '#888';
    const icon = zone.icon || ZONES_MAP[ev.zone]?.icon || '●';

    parts.push(`
      <div class="event-card ${isNow ? 'is-now' : ''} ${isPast ? 'is-past' : ''}"
           style="border-left-color:${color}"
           onclick="openEventModal('${ev.id}')">
        <div class="event-time">
          ${formatTime(ev.start)} <span class="event-duration">→ ${formatTime(ev.end)} (${getDuration(ev.start, ev.end)})</span>
        </div>
        <div class="event-title">${ev.title}</div>
        ${ev.artist ? `<div class="event-artist">${ev.artist}</div>` : ''}
        <div class="event-zone-tag" style="color:${color}">${icon} ${zone.shortName || zone.name || ev.zone}</div>
        <button class="fav-btn ${getFavorites().includes(ev.id) ? 'active' : ''}"
                onclick="event.stopPropagation();toggleFavorite('${ev.id}')">
          ${getFavorites().includes(ev.id) ? '★' : '☆'}
        </button>
      </div>`);
  });

  return parts.join('');
}

function setActiveDay(day) {
  State.schedule.activeDay = day;
  renderSchedule();
  updateHeader();
}

function setActiveZone(zone) {
  State.schedule.activeZone = zone;
  renderSchedule();
}

// ============================================
// EVENT MODAL
// ============================================

function openEventModal(eventId) {
  const ev = (State.data?.events || []).find(e => e.id === eventId);
  if (!ev) return;

  const zone = (State.data?.festival?.zones || []).find(z => z.id === ev.zone) || {};
  const color = zone.color || ZONES_MAP[ev.zone]?.color || '#888';
  const icon = zone.icon || ZONES_MAP[ev.zone]?.icon || '●';

  const modal = document.getElementById('event-modal');
  modal.querySelector('.modal-zone-badge').style.color = color;
  modal.querySelector('.modal-zone-badge').innerHTML = `${icon} ${zone.shortName || zone.name || ev.zone}`;
  modal.querySelector('.modal-title').textContent = ev.title;
  modal.querySelector('.modal-artist').style.display = 'none';
  modal.querySelector('.modal-time').innerHTML = `
    🕐 ${formatTime(ev.start)} – ${formatTime(ev.end)}
    <span class="event-duration">(${getDuration(ev.start, ev.end)})</span>
    <span style="color:var(--szary);margin-left:0.5rem">· ${zone.location || ''}</span>
  `;
  modal.querySelector('.modal-description').innerHTML = ev.description || '';

  const tagsEl = modal.querySelector('.modal-tags');
  if (tagsEl) {
    tagsEl.innerHTML = (ev.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
  }

  // Speaker card
  const speakerEl = modal.querySelector('.modal-speaker');
  if (speakerEl) {
    const speakers = State.data?.speakers || {};
    const artistName = ev.artist || '';
    const speakerData = artistName ? (speakers[artistName] ||
      Object.entries(speakers).find(([k]) => artistName.includes(k) || k.includes(artistName.split(' ').pop()))?.[1]) : null;

    if (artistName) {
      speakerEl.style.display = 'block';
      const img = speakerEl.querySelector('.modal-speaker-photo');
      if (speakerData?.photo) {
        img.src = speakerData.photo;
        img.style.display = 'block';
      } else {
        img.style.display = 'none';
      }
      const bioEl = speakerEl.querySelector('.modal-speaker-bio');
      const nameHtml = `<strong style="color:var(--pergamin);font-size:0.95rem">${artistName}</strong>`;
      const roleHtml = speakerData?.role ? `<span style="color:var(--szary);font-size:0.8rem;display:block;margin:0.15rem 0 0.4rem">${speakerData.role}</span>` : '<br>';
      const bioHtml = speakerData?.bio ? `<span>${speakerData.bio}</span>` : '';
      bioEl.innerHTML = nameHtml + roleHtml + bioHtml;
    } else {
      speakerEl.style.display = 'none';
    }
  }

  modal.querySelector('.modal-overlay').classList.add('open');
}

function closeEventModal() {
  document.querySelector('.modal-overlay').classList.remove('open');
}

// ============================================
// VIEW: MAPA
// ============================================

function renderMap() {
  const container = document.getElementById('map-content');
  if (!container || !State.data) return;

  const zones = State.data.festival?.zones || [];
  const pois  = State.data.pois || [];

  const poiTypes  = ['all', 'food', 'water', 'toilet', 'help', 'info'];
  const poiLabels = { all:'Wszystko', food:'🍲 Jadło', water:'💧 Woda', toilet:'🚻 Toalety', help:'🛡 Pomoc', info:'ℹ Info' };

  const poiTabsHTML = poiTypes.map(t =>
    `<button class="poi-tab ${State.map.activePOIType===t?'active':''}" onclick="setPoiType('${t}')">${poiLabels[t]}</button>`
  ).join('');

  const filteredPois = State.map.activePOIType === 'all' ? pois : pois.filter(p => p.type === State.map.activePOIType);

  const poiListHTML = filteredPois.map(poi =>
    `<div class="poi-card" onclick="openPoiModal('${poi.id}')">
      <div class="poi-icon">${poi.icon}</div>
      <div>
        <div class="poi-name">${poi.label}</div>
        <div class="poi-location">📍 ${poi.location}</div>
        <div class="poi-hours">${poi.hours}</div>
      </div>
    </div>`
  ).join('');

  const legendHTML = zones.map(z =>
    `<div class="legend-item" onclick="highlightZone('${z.id}')">
      <div class="legend-dot" style="background:${z.color}"></div>
      <span class="legend-name">${z.shortName}</span>
    </div>`
  ).join('');

  container.innerHTML = `
    <div class="map-3d-wrap">
      <button class="map-3d-tile" onclick="openMap3D()">
        <div class="map-3d-tile-icon">🏰</div>
        <div class="map-3d-tile-label">Mapa 3D Zamku Świny</div>
        <div class="map-3d-tile-sub">Dotknij, by otworzyć · działa offline</div>
        <div class="map-3d-tile-arrow">→</div>
      </button>
    </div>
    <div class="divider" style="margin:0 1rem"></div>
    <div class="poi-section-title">PUNKTY NA MAPIE</div>
    <div class="poi-tabs">${poiTabsHTML}</div>
    <div class="poi-list">${poiListHTML}</div>
  `;
}

function openMap3D() {
  let overlay = document.getElementById('map3d-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'map3d-overlay';
    overlay.innerHTML = `
      <button class="map3d-close" onclick="closeMap3D()">✕</button>
      <iframe src="maps/zamek.html" class="map3d-frame"
              sandbox="allow-scripts allow-same-origin"
              allow="fullscreen"></iframe>`;
    document.body.appendChild(overlay);
  }
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMap3D() {
  const overlay = document.getElementById('map3d-overlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function _buildCastleSVG() {
  const Z = {
    umbra:  '#E05C1A',
    sacrum: '#C9A84C',
    anima:  '#4A6FA5',
    podsw:  '#7B3F82',
    gnoza:  '#2D7D46',
    lochy:  '#8B4513',
  };

  function zLabel(x, y, text, color, size) {
    size = size || 8;
    const lines = text.split('\n');
    const lh    = size * 1.4;
    const maxW  = Math.max(...lines.map(l => l.length)) * size * 0.6 + 10;
    const bgH   = lines.length * lh + 6;
    const bg    = `<rect x="${+(x - maxW / 2).toFixed(1)}" y="${+(y - bgH / 2).toFixed(1)}" width="${+maxW.toFixed(1)}" height="${+bgH.toFixed(1)}" rx="2.5" fill="rgba(10,9,8,0.82)"/>`;
    const txts  = lines.map((l, i) =>
      `<text x="${x}" y="${+(y + (i - (lines.length - 1) / 2) * lh + size * 0.38).toFixed(1)}" text-anchor="middle" fill="${color}" font-size="${size}" font-family="'EB Garamond',serif" font-weight="bold" letter-spacing="0.04em">${l}</text>`
    ).join('');
    return bg + txts;
  }

  // Castle outer wall polygon (main complex + UMBRA left wing)
  const walls = 'M 102,62 L 228,62 L 256,82 L 274,126 L 274,182 L 266,230 L 244,262 L 198,274 L 152,274 L 108,264 L 88,242 L 68,214 L 68,155 L 40,155 L 40,100 L 68,100 L 68,80 L 84,68 Z';

  return `<svg class="castle-map-svg" viewBox="0 0 340 385" width="100%" overflow="hidden" xmlns="http://www.w3.org/2000/svg">
<defs>
  <pattern id="fp" x="0" y="0" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
    <line x1="0" y1="0" x2="0" y2="9" stroke="#182313" stroke-width="1.4"/>
  </pattern>
  <clipPath id="tc"><ellipse cx="170" cy="192" rx="163" ry="178"/></clipPath>
</defs>

<!-- Background -->
<rect width="340" height="385" fill="#0a0908"/>
<!-- Forest terrain -->
<ellipse cx="170" cy="192" rx="163" ry="178" fill="#0e1509"/>
<rect width="340" height="385" fill="url(#fp)" clip-path="url(#tc)" opacity="0.8"/>
<ellipse cx="170" cy="192" rx="163" ry="178" fill="#0e1509" fill-opacity="0.5"/>

<!-- Castle grounds fill -->
<path d="${walls}" fill="#14120f"/>
<!-- Castle outer walls — double line for thickness effect -->
<path d="${walls}" fill="none" stroke="rgba(201,168,76,0.12)" stroke-width="6"/>
<path d="${walls}" fill="none" stroke="rgba(201,168,76,0.6)" stroke-width="1.8" stroke-linejoin="round"/>

<!-- Dashed path to Czill pavilion -->
<path d="M 256,82 C 265,76 275,72 292,70" stroke="rgba(201,168,76,0.38)" stroke-width="1.2" fill="none" stroke-dasharray="3,2.5"/>

<!-- ZONE: Wieża — Anima/Animus (upper) -->
<rect x="102" y="62" width="126" height="50" fill="rgba(74,111,165,0.16)" stroke="${Z.anima}" stroke-width="1.2" stroke-opacity="0.55"/>
<!-- Wieża internal divisions -->
<line x1="102" y1="112" x2="228" y2="112" stroke="rgba(201,168,76,0.18)" stroke-width="0.7"/>
<line x1="165" y1="112" x2="165" y2="152" stroke="rgba(201,168,76,0.18)" stroke-width="0.7"/>
<!-- ZONE: Wieża — Podświadomości (lower-left) -->
<rect x="102" y="112" width="63" height="40" fill="rgba(123,63,130,0.16)" stroke="${Z.podsw}" stroke-width="1.2" stroke-opacity="0.55"/>
<!-- ZONE: Wieża — VIP Sala Świnek (lower-right) -->
<rect x="165" y="112" width="63" height="40" fill="rgba(201,168,76,0.06)" stroke="rgba(201,168,76,0.28)" stroke-width="0.7"/>

<!-- ZONE: Scena UMBRA -->
<rect x="40" y="100" width="28" height="55" fill="rgba(224,92,26,0.2)" stroke="${Z.umbra}" stroke-width="1.5" stroke-opacity="0.75"/>
<line x1="40" y1="118" x2="68" y2="118" stroke="rgba(224,92,26,0.22)" stroke-width="0.5"/>
<line x1="40" y1="136" x2="68" y2="136" stroke="rgba(224,92,26,0.22)" stroke-width="0.5"/>

<!-- ZONE: Kino Gnoza -->
<rect x="118" y="205" width="104" height="55" fill="rgba(45,125,70,0.2)" stroke="${Z.gnoza}" stroke-width="1.5" stroke-opacity="0.7"/>

<!-- ZONE: SACRUM (right-side pavilion) -->
<rect x="238" y="132" width="58" height="64" fill="rgba(201,168,76,0.12)" stroke="${Z.sacrum}" stroke-width="1.5" stroke-opacity="0.72"/>
<polyline points="238,142 267,128 296,142" stroke="${Z.sacrum}" stroke-width="1" stroke-opacity="0.35" fill="none"/>

<!-- ZONE: Lochy (circular) -->
<circle cx="72" cy="238" r="40" fill="rgba(139,69,19,0.2)" stroke="${Z.lochy}" stroke-width="1.5" stroke-opacity="0.78"/>
<circle cx="72" cy="238" r="22" fill="none" stroke="rgba(139,69,19,0.22)" stroke-width="0.6"/>
<circle cx="72" cy="238" r="8" fill="rgba(139,69,19,0.18)" stroke="rgba(139,69,19,0.32)" stroke-width="0.6"/>
<line x1="72" y1="216" x2="72" y2="200" stroke="rgba(139,69,19,0.22)" stroke-width="0.6"/>
<line x1="72" y1="260" x2="72" y2="276" stroke="rgba(139,69,19,0.22)" stroke-width="0.6"/>
<line x1="50" y1="238" x2="34" y2="238" stroke="rgba(139,69,19,0.22)" stroke-width="0.6"/>
<line x1="94" y1="238" x2="110" y2="238" stroke="rgba(139,69,19,0.22)" stroke-width="0.6"/>
<line x1="57" y1="223" x2="46" y2="212" stroke="rgba(139,69,19,0.18)" stroke-width="0.5"/>
<line x1="87" y1="223" x2="98" y2="212" stroke="rgba(139,69,19,0.18)" stroke-width="0.5"/>
<line x1="57" y1="253" x2="46" y2="264" stroke="rgba(139,69,19,0.18)" stroke-width="0.5"/>
<line x1="87" y1="253" x2="98" y2="264" stroke="rgba(139,69,19,0.18)" stroke-width="0.5"/>

<!-- Czill & Heal pavilion (separate) -->
<circle cx="292" cy="70" r="28" fill="rgba(30,60,30,0.14)" stroke="rgba(201,168,76,0.48)" stroke-width="1.5"/>
<circle cx="292" cy="70" r="15" fill="none" stroke="rgba(201,168,76,0.18)" stroke-width="0.6"/>
<polyline points="278,72 292,58 306,72" stroke="rgba(201,168,76,0.28)" stroke-width="0.8" fill="none"/>

<!-- Bar U Alchemików -->
<rect x="108" y="262" width="78" height="22" rx="2" fill="rgba(201,168,76,0.07)" stroke="rgba(201,168,76,0.3)" stroke-width="0.8"/>
<!-- Gastro-Phase -->
<rect x="196" y="248" width="64" height="38" rx="2" fill="rgba(80,60,30,0.14)" stroke="rgba(201,168,76,0.28)" stroke-width="0.8"/>

<!-- Courtyard -->
<rect x="110" y="158" width="122" height="44" rx="2" fill="none" stroke="rgba(201,168,76,0.1)" stroke-width="0.5" stroke-dasharray="3,3"/>

<!-- Labels -->
${zLabel(165, 88, 'ANIMA / ANIMUS', Z.anima, 7.5)}
${zLabel(133, 134, 'PODŚW.', Z.podsw, 7)}
${zLabel(196, 130, 'VIP', 'rgba(201,168,76,0.65)', 6)}
${zLabel(54, 130, 'SCENA\nUMBRA', Z.umbra, 6.5)}
${zLabel(72, 238, 'LOCHY', Z.lochy, 9)}
${zLabel(267, 164, 'SACRUM', Z.sacrum, 8.5)}
${zLabel(170, 233, 'KINO GNOZA', Z.gnoza, 8)}
${zLabel(148, 273, 'Bar U Alchemików', 'rgba(201,168,76,0.7)', 5.5)}
${zLabel(228, 267, 'Gastro\nPhase', 'rgba(201,168,76,0.62)', 5.5)}
${zLabel(292, 70, 'Czill\n& Heal', 'rgba(201,168,76,0.82)', 6)}

<!-- Attribution -->
<text x="170" y="372" text-anchor="middle" fill="rgba(201,168,76,0.22)" font-size="4.5" font-family="serif" letter-spacing="0.14em">ZAMEK ŚWINY · MAPA STREF</text>
<!-- North indicator -->
<line x1="22" y1="356" x2="22" y2="344" stroke="rgba(201,168,76,0.38)" stroke-width="1.2"/>
<polygon points="22,340 19,349 22,346 25,349" fill="rgba(201,168,76,0.38)"/>
<text x="22" y="362" text-anchor="middle" fill="rgba(201,168,76,0.38)" font-size="5.5" font-family="serif">N</text>
</svg>`;
}

function setPoiType(type) {
  State.map.activePOIType = type;
  renderMap();
}

function highlightZone(zoneId) {
  // Navigate to schedule filtered by this zone
  State.schedule.activeZone = zoneId;
  location.hash = 'teraz';
}

function openPoiModal(poiId) {
  const poi = (State.data?.pois || []).find(p => p.id === poiId);
  if (!poi) return;
  const modal = document.getElementById('event-modal');
  modal.querySelector('.modal-zone-badge').style.color = '#C9A84C';
  modal.querySelector('.modal-zone-badge').innerHTML = poi.icon + ' ' + poi.type.toUpperCase();
  modal.querySelector('.modal-title').textContent = poi.label;
  modal.querySelector('.modal-artist').textContent = '';
  modal.querySelector('.modal-artist').style.display = 'none';
  modal.querySelector('.modal-time').innerHTML = `📍 ${poi.location} · ${poi.hours}`;
  modal.querySelector('.modal-description').innerHTML = poi.description || '';
  const tagsEl = modal.querySelector('.modal-tags');
  if (tagsEl) tagsEl.innerHTML = '';
  modal.querySelector('.modal-overlay').classList.add('open');
}

// ============================================
// VIEW: JOURNAL (DZIENNIK)
// ============================================

function renderJournal() {
  const container = document.getElementById('journal-content');
  if (!container) return;
  const tab = State.journal.activeTab || 'journal';

  const tabsHTML = `<div class="dziennik-tabs">
    <button class="dziennik-tab ${tab==='journal'?'active':''}" onclick="setDziennikTab('journal')">☽ Dziennik</button>
    <button class="dziennik-tab ${tab==='wheel'?'active':''}" onclick="setDziennikTab('wheel')">⊙ Koło życia</button>
  </div>`;

  if (tab === 'wheel') {
    const wd = getWheelData();
    if (wd.showResults) {
      container.innerHTML = tabsHTML + buildWheelResultsHTML(wd.answers || {});
      drawWheelChart();
    } else {
      container.innerHTML = tabsHTML + buildWheelQuestionnaireHTML(wd.answers || {});
      drawWheelChart();
    }
    return;
  }

  const stage = State.journal.activeStage;
  const prompts = JOURNAL_PROMPTS[stage] || [];
  const prompt = prompts[Math.floor(Math.random() * prompts.length)] || '';

  const stageColors = { nigredo: '#6B6BFF', albedo: '#E8E0D0', rubedo: '#8B2B2B' };
  const stageSymbols = { nigredo: '☽', albedo: '○', rubedo: '☀' };

  const arcHTML = ['nigredo', 'albedo', 'rubedo'].map(s => {
    const days = { nigredo: '3.07', albedo: '4.07', rubedo: '5.07' };
    return `<div class="arc-stage ${s} ${stage===s?'active':''}" onclick="setJournalStage('${s}')">
        <div class="arc-stage-symbol" style="color:${stageColors[s]}">${stageSymbols[s]}</div>
        <div class="arc-stage-name">${s}</div>
        <div class="arc-stage-date">${days[s]}</div>
      </div>`;
  }).join('');

  const savedEntries = getJournalEntries();
  const currentEntry = savedEntries.find(e => e.stage === stage) || {};
  const pastEntriesHTML = savedEntries.filter(e => e.text && e.stage !== stage).map(e => `
    <div class="past-entry" onclick="toggleEntry(this)">
      <div class="past-entry-header">
        <span class="past-entry-stage" style="color:${stageColors[e.stage]}">${stageSymbols[e.stage]} ${e.stage}</span>
        <span class="past-entry-date">${e.savedAt || ''}</span>
      </div>
      <div class="past-entry-preview">${e.text}</div>
    </div>`).join('');

  container.innerHTML = tabsHTML + `
    <div class="alchemy-arc">${arcHTML}</div>
    <div class="journal-prompt">
      <div class="prompt-label">Pytanie dnia</div>
      <div class="prompt-text">${prompt}</div>
    </div>
    <div class="journal-entry-area">
      <textarea class="journal-textarea" id="journal-text-${stage}"
        placeholder="Pisz tutaj — to tylko dla Ciebie. Nie ma właściwej ani złej odpowiedzi."
        oninput="autoSaveJournal('${stage}', this.value)">${currentEntry.text || ''}</textarea>
    </div>
    <div class="journal-actions">
      <button class="btn btn-gold" onclick="saveJournalEntry('${stage}')">Zapisz</button>
      <button class="btn btn-outline" onclick="emailJournalEntry('${stage}')">✉ Wyślij sobie</button>
    </div>
    ${savedEntries.filter(e => e.text && e.stage !== stage).length > 0 ? `
      <div class="section-sep"></div>
      <div class="past-entries-title">Poprzednie wpisy</div>
      ${pastEntriesHTML}` : ''}
  `;
}

function setJournalStage(stage) {
  State.journal.activeStage = stage;
  renderJournal();
}

function setDziennikTab(tab) {
  State.journal.activeTab = tab;
  renderJournal();
}

let saveTimer = null;
function autoSaveJournal(stage, text) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const entries = getJournalEntries();
    const idx = entries.findIndex(e => e.stage === stage);
    const entry = { stage, text, savedAt: new Date().toLocaleDateString('pl-PL') };
    if (idx >= 0) entries[idx] = entry;
    else entries.push(entry);
    localStorage.setItem('cien_journal_2026', JSON.stringify(entries));
  }, 1000);
}

function saveJournalEntry(stage) {
  const textarea = document.getElementById(`journal-text-${stage}`);
  if (!textarea) return;
  autoSaveJournal(stage, textarea.value);
  showToast('Wpis zapisany lokalnie na urządzeniu');
}

function emailJournalEntry(stage) {
  const entries = getJournalEntries();
  const entry = entries.find(e => e.stage === stage);
  if (!entry || !entry.text) { showToast('Najpierw napisz coś'); return; }

  const subject = encodeURIComponent(`CIEŃ Festiwal 2026 — Dziennik ${stage}`);
  const body = encodeURIComponent(`CIEŃ Festiwal 2026 — Dziennik przemiany\nEtap: ${stage}\nData: ${entry.savedAt}\n\n${entry.text}`);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function getJournalEntries() {
  try {
    return JSON.parse(localStorage.getItem('cien_journal_2026') || '[]');
  } catch { return []; }
}

function toggleEntry(el) {
  el.classList.toggle('expanded');
}

// ============================================
// KOŁO ŻYCIA — FUNCTIONS
// ============================================

const _wAnim = { cur: null, raf: null };

function getWheelData() {
  try { return JSON.parse(localStorage.getItem('cien_wheel_2026') || '{}'); }
  catch { return {}; }
}

function saveWheelData(data) {
  localStorage.setItem('cien_wheel_2026', JSON.stringify(data));
}

function setWheelAnswer(areaId, qi, val) {
  const wd = getWheelData();
  if (!wd.answers) wd.answers = {};
  if (!wd.answers[areaId]) wd.answers[areaId] = [];
  wd.answers[areaId][qi] = val;
  saveWheelData(wd);

  const area = WHEEL_AREAS.find(a => a.id === areaId);
  [1,2,3,4,5].forEach(n => {
    const btn = document.getElementById(`wbtn-${areaId}-${qi}-${n}`);
    if (!btn) return;
    if (n === val) {
      btn.classList.add('active');
      btn.style.background = area.color;
      btn.style.borderColor = area.color;
      btn.style.color = '#1a1a1a';
    } else {
      btn.classList.remove('active');
      btn.style.background = '';
      btn.style.borderColor = '';
      btn.style.color = '';
    }
  });

  const allAnswers = wd.answers;
  const completed = WHEEL_AREAS.filter(a => {
    const ans = allAnswers[a.id] || [];
    return a.questions.every((_, i) => (ans[i] || 0) > 0);
  }).length;

  const fill = document.getElementById('wheel-prog-fill');
  const text = document.getElementById('wheel-prog-text');
  if (fill) fill.style.width = `${(completed / WHEEL_AREAS.length) * 100}%`;
  if (text) text.textContent = `${completed} z ${WHEEL_AREAS.length} obszarów`;

  const areaAnswers = allAnswers[areaId] || [];
  const areaOk = area.questions.every((_, i) => (areaAnswers[i] || 0) > 0);
  const areaBlock = document.getElementById(`warea-${areaId}`);
  if (areaBlock) {
    areaBlock.classList.toggle('done', areaOk);
    const check = document.getElementById(`wcheck-${areaId}`);
    if (check) check.style.display = areaOk ? '' : 'none';
  }

  const allDone = completed === WHEEL_AREAS.length;
  const resultsBtn = document.getElementById('wheel-results-btn');
  if (resultsBtn) resultsBtn.style.display = allDone ? '' : 'none';

  drawWheelChart();
}

function showWheelResults() {
  const wd = getWheelData();
  wd.showResults = true;
  saveWheelData(wd);
  renderJournal();
}

function resetWheel() {
  saveWheelData({});
  renderJournal();
}

function saveWheelFormAnswer(areaId, qi, val) {
  const wd = getWheelData();
  if (!wd.forms) wd.forms = {};
  if (!wd.forms[areaId]) wd.forms[areaId] = {};
  wd.forms[areaId][qi] = val;
  saveWheelData(wd);
}

function generateAndShowPlan(areaId) {
  const wd = getWheelData();
  const forms = (wd.forms && wd.forms[areaId]) || {};
  const area = WHEEL_AREAS.find(a => a.id === areaId);

  const a0 = (forms[0] || '').trim();
  const a1 = (forms[1] || '').trim();
  const a2 = (forms[2] || '').trim();
  const a3 = (forms[3] || '').trim();
  const a4 = (forms[4] || '').trim();

  const teraz = [];
  if (a4) teraz.push(a4);
  if (a3) teraz.push(`Kiedy pojawi się: „${a3.slice(0, 60)}${a3.length > 60 ? '…' : ''}" — zatrzymaj się, oddech, wróć do wartości`);
  if (!teraz.length) teraz.push(`Jeden konkretny krok w obszarze: ${area.name}`);

  const regularnie = [];
  if (a2) regularnie.push(`Działaj zgodnie z wartością: ${a2}`);
  if (a4) regularnie.push(`Powtarzaj co tydzień: ${a4}`);
  if (!regularnie.length) regularnie.push(`Cotygodniowy przegląd obszaru: ${area.name}`);

  const rok = a1 || (a0
    ? `Rozwijam to, co już działa: ${a0}`
    : `Moje życie w obszarze „${area.name}" jest pełne i satysfakcjonujące`);

  const plan = { teraz, regularnie, rok, tracking: {}, createdAt: new Date().toISOString().slice(0, 10) };

  if (!wd.plans) wd.plans = {};
  wd.plans[areaId] = plan;
  saveWheelData(wd);

  const planEl = document.getElementById(`plan-${areaId}`);
  if (planEl) {
    planEl.innerHTML = buildPlanHTML(area, plan);
    planEl.style.display = '';
    setTimeout(() => planEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }
}

function buildPlanHTML(area, plan) {
  const makeItems = (items, horizon) => items.map((item, i) => {
    const key = `${horizon}-${i}`;
    const done = plan.tracking && plan.tracking[key];
    return `<div class="plan-item${done ? ' done' : ''}">
      <input type="checkbox" class="plan-check" id="pc-${area.id}-${key}"
        ${done ? 'checked' : ''}
        onchange="togglePlanItem('${area.id}','${horizon}',${i})">
      <label for="pc-${area.id}-${key}">${item}</label>
    </div>`;
  }).join('') || '<div class="plan-empty">—</div>';

  return `<div class="wplan-header">Plan integracji — ${area.name}</div>
  <div class="wplan-grid">
    <div class="wplan-col">
      <div class="wplan-col-title" style="color:${area.color}">⚡ TERAZ</div>
      <div class="wplan-col-sub">Ten tydzień</div>
      ${makeItems(plan.teraz || [], 'teraz')}
    </div>
    <div class="wplan-col">
      <div class="wplan-col-title" style="color:${area.color}">🔄 REGULARNIE</div>
      <div class="wplan-col-sub">Co tydzień</div>
      ${makeItems(plan.regularnie || [], 'regularnie')}
    </div>
    <div class="wplan-col">
      <div class="wplan-col-title" style="color:${area.color}">🌟 ZA ROK</div>
      <div class="wplan-col-sub">Moja wizja za 12 miesięcy</div>
      <div class="plan-vision">${plan.rok || '—'}</div>
    </div>
  </div>
  <div class="wplan-date">Wygenerowano: ${plan.createdAt || ''}</div>
  <button class="btn btn-outline" style="font-size:0.78rem;padding:0.45rem 0.75rem;margin-top:0.5rem;width:100%"
    onclick="saveAreaPlanToGCal('${area.id}')">📅 Zapisz w Google Kalendarzu</button>`;
}

function togglePlanItem(areaId, horizon, idx) {
  const wd = getWheelData();
  if (!wd.plans || !wd.plans[areaId]) return;
  const key = `${horizon}-${idx}`;
  if (!wd.plans[areaId].tracking) wd.plans[areaId].tracking = {};
  wd.plans[areaId].tracking[key] = !wd.plans[areaId].tracking[key];
  saveWheelData(wd);
  const item = document.getElementById(`pc-${areaId}-${key}`)?.closest('.plan-item');
  if (item) item.classList.toggle('done', !!wd.plans[areaId].tracking[key]);
}

function connectGCal() {
  if (typeof google === 'undefined' || !google.accounts) {
    showToast('Google nie załadowany — sprawdź połączenie');
    return;
  }
  if (!_gcalTokenClient) {
    _gcalTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/calendar.events',
      callback: (resp) => {
        if (resp.error) { showToast('Błąd autoryzacji Google'); return; }
        _gcalToken = resp.access_token;
        showToast('Google Kalendarz połączony ✓');
        // refresh gcal banner
        const banner = document.querySelector('.gcal-banner');
        if (banner) {
          banner.querySelector('.gcal-text span').textContent = 'Połączony — możesz zapisywać plany';
          const btn = banner.querySelector('button');
          if (btn) { btn.textContent = '✓ Połączono'; btn.className = 'btn btn-outline'; }
        }
      }
    });
  }
  _gcalTokenClient.requestAccessToken();
}

async function saveAreaPlanToGCal(areaId) {
  if (!_gcalToken) { connectGCal(); showToast('Najpierw połącz Google Kalendarz'); return; }
  const wd = getWheelData();
  const plan = wd.plans && wd.plans[areaId];
  if (!plan) { showToast('Brak planu — najpierw go wygeneruj'); return; }
  const area = WHEEL_AREAS.find(a => a.id === areaId);

  const today = new Date();
  const fmtDate = (d) => d.toISOString().slice(0, 10);
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
  const nextYear = new Date(today); nextYear.setFullYear(today.getFullYear() + 1);

  const events = [
    ...(plan.teraz || []).map((item, i) => ({
      summary: `CIEŃ · ${area.name} [TERAZ] ${item.slice(0, 60)}`,
      start: { date: fmtDate(today) },
      end: { date: fmtDate(nextWeek) },
      description: `Plan integracji CIEŃ Festiwal 2026 — obszar: ${area.name}\n\nKrok TERAZ:\n${item}`,
      colorId: '5'
    })),
    ...(plan.regularnie || []).map((item) => ({
      summary: `CIEŃ · ${area.name} [REGULARNIE] ${item.slice(0, 50)}`,
      recurrence: ['RRULE:FREQ=WEEKLY;COUNT=12'],
      start: { date: fmtDate(nextWeek) },
      end: { date: fmtDate(new Date(nextWeek.getTime() + 86400000)) },
      description: `Plan integracji CIEŃ Festiwal 2026 — obszar: ${area.name}\n\nNawyk regularny:\n${item}`,
      colorId: '2'
    })),
    {
      summary: `CIEŃ · ${area.name} [ROK] ${plan.rok.slice(0, 60)}`,
      start: { date: fmtDate(nextYear) },
      end: { date: fmtDate(new Date(nextYear.getTime() + 86400000)) },
      description: `Plan integracji CIEŃ Festiwal 2026 — obszar: ${area.name}\n\nMoja wizja za rok:\n${plan.rok}`,
      colorId: '11'
    }
  ];

  let saved = 0;
  for (const ev of events) {
    try {
      const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${_gcalToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(ev)
      });
      if (r.ok) saved++;
    } catch { /* ignore individual failures */ }
  }
  showToast(saved > 0 ? `Zapisano ${saved} wydarzeń w kalendarzu ✓` : 'Błąd zapisu — spróbuj ponownie');
}

function buildWheelQuestionnaireHTML(answers) {
  const completed = WHEEL_AREAS.filter(a => {
    const ans = answers[a.id] || [];
    return a.questions.every((_, i) => (ans[i] || 0) > 0);
  }).length;
  const allDone = completed === WHEEL_AREAS.length;

  const areasHTML = WHEEL_AREAS.map(area => {
    const ans = answers[area.id] || [];
    const areaOk = area.questions.every((_, i) => (ans[i] || 0) > 0);
    const questionsHTML = area.questions.map((q, qi) => {
      const val = ans[qi] || 0;
      const btns = [1,2,3,4,5].map(n =>
        `<button class="wheel-rating-btn${val===n?' active':''}"
          id="wbtn-${area.id}-${qi}-${n}"
          onclick="setWheelAnswer('${area.id}',${qi},${n})"
          ${val===n?`style="background:${area.color};border-color:${area.color};color:#1a1a1a"`:''}>
          ${n}</button>`).join('');
      return `<div class="wheel-question">
        <div class="wheel-q-text">${q}</div>
        <div class="wheel-rating-row">${btns}</div>
      </div>`;
    }).join('');
    return `<div class="wheel-area-block${areaOk?' done':''}" id="warea-${area.id}">
      <div class="wheel-area-hdr" style="border-left:3px solid ${area.color}">
        <span>${area.name}</span>
        <span id="wcheck-${area.id}" class="wheel-check" style="color:${area.color};display:${areaOk?'':'none'}">✓</span>
      </div>
      ${questionsHTML}
    </div>`;
  }).join('');

  return `<div class="wheel-intro-card">
    <div class="wheel-title">Moje koło życia</div>
    <p class="wheel-desc">Oceń każde stwierdzenie w skali 1–5 (1 = wcale, 5 = w pełni).</p>
    <div class="wheel-chart-wrap" style="margin:0.75rem 0"><canvas id="wheel-chart"></canvas></div>
    <div class="wheel-prog-bar"><div class="wheel-prog-fill" id="wheel-prog-fill" style="width:${(completed/WHEEL_AREAS.length)*100}%"></div></div>
    <div class="wheel-prog-text" id="wheel-prog-text">${completed} z ${WHEEL_AREAS.length} obszarów</div>
  </div>
  ${areasHTML}
  <button id="wheel-results-btn" class="btn btn-gold" style="width:100%;margin:1rem 0 1.5rem;display:${allDone?'':'none'}" onclick="showWheelResults()">Pokaż moje koło →</button>`;
}

function buildWheelResultsHTML(answers) {
  const scores = WHEEL_AREAS.map(area => {
    const ans = answers[area.id] || [];
    const avg = ans.length ? ans.reduce((a,b)=>a+b,0)/ans.length : 0;
    return { area, score: Math.round(avg * 2 * 10) / 10 };
  });
  const avg = (scores.reduce((s,x)=>s+x.score,0)/scores.length).toFixed(1);
  const wd = getWheelData();

  const areasHTML = scores.map(({area, score}) => {
    const forms = (wd.forms && wd.forms[area.id]) || {};
    const plan = (wd.plans && wd.plans[area.id]) || null;
    const formQs = WHEEL_AREA_FORMS[area.id] || [];

    const formHTML = formQs.map((q, qi) => `
      <div class="wf-question">
        <div class="wf-q-label">${q}</div>
        <textarea class="wf-textarea" rows="2" placeholder="Twoja odpowiedź..."
          oninput="saveWheelFormAnswer('${area.id}',${qi},this.value)">${forms[qi] || ''}</textarea>
      </div>`).join('');

    return `<div class="wheel-result-area">
      <div class="wheel-result-row">
        <span class="wheel-result-name" style="color:${area.color}">${area.name}</span>
        <span class="wheel-result-score" style="color:${area.color}">${score}/10</span>
      </div>
      <div class="wheel-result-bar">
        <div class="wheel-result-fill" style="width:${score*10}%;background:${area.color}"></div>
      </div>
      <div class="wf-section">
        <div class="wf-section-title" style="border-left-color:${area.color}">Pytania rozwiązaniowe</div>
        ${formHTML}
        <button class="btn btn-gold" style="width:100%;margin-top:0.75rem"
          onclick="generateAndShowPlan('${area.id}')">Generuj plan integracji →</button>
      </div>
      <div id="plan-${area.id}" class="wplan-section"${plan ? '' : ' style="display:none"'}>
        ${plan ? buildPlanHTML(area, plan) : ''}
      </div>
    </div>`;
  }).join('');

  const gcalHTML = `<div class="gcal-banner">
    <div class="gcal-text">
      <strong>Google Kalendarz</strong>
      <span>${_gcalToken ? 'Połączony — zapisuj plany jako wydarzenia' : 'Połącz i zapisuj plany do swojego kalendarza'}</span>
    </div>
    <button class="btn ${_gcalToken ? 'btn-outline' : 'btn-gold'}"
      onclick="connectGCal()" style="flex-shrink:0;font-size:0.78rem;padding:0.45rem 0.75rem">
      ${_gcalToken ? '✓ Połączono' : 'Połącz'}
    </button>
  </div>`;

  return `<div class="wheel-results-header">
    <div class="wheel-results-title">Twoje koło życia</div>
    <div class="wheel-results-avg">Średnia: <strong>${avg}/10</strong></div>
  </div>
  <div class="wheel-chart-wrap"><canvas id="wheel-chart"></canvas></div>
  ${gcalHTML}
  ${areasHTML}
  <button class="btn btn-outline" style="width:100%;margin:0.5rem 0" onclick="emailWheelResults()">✉ Wyślij sobie wyniki</button>
  <button class="btn btn-outline" style="width:100%;margin-bottom:1.5rem" onclick="resetWheel()">Wypełnij ponownie</button>`;
}

function _getWheelScores(answers) {
  return WHEEL_AREAS.map(area => {
    const ans = (answers[area.id] || []).filter(v => v > 0);
    const avg = ans.length ? ans.reduce((a,b)=>a+b,0)/ans.length : 0;
    return avg * 2; // 0-10
  });
}

function drawWheelChart() {
  const canvas = document.getElementById('wheel-chart');
  if (!canvas) return;
  const wd = getWheelData();
  const targets = _getWheelScores(wd.answers || {});

  if (!_wAnim.cur || _wAnim.cur.length !== targets.length) {
    _wAnim.cur = targets.map(() => 0);
  }
  if (_wAnim.raf) { cancelAnimationFrame(_wAnim.raf); _wAnim.raf = null; }

  const dpr = window.devicePixelRatio || 1;
  const wrap = canvas.parentElement;
  const size = Math.min(wrap.offsetWidth || 260, 260);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';

  function tick() {
    let settled = true;
    for (let i = 0; i < _wAnim.cur.length; i++) {
      const diff = targets[i] - _wAnim.cur[i];
      if (Math.abs(diff) > 0.05) { _wAnim.cur[i] += diff * 0.2; settled = false; }
      else _wAnim.cur[i] = targets[i];
    }
    _drawWheelFrame(canvas, size, dpr, _wAnim.cur);
    if (!settled) _wAnim.raf = requestAnimationFrame(tick);
    else _wAnim.raf = null;
  }
  _wAnim.raf = requestAnimationFrame(tick);
}

function _drawWheelFrame(canvas, size, dpr, scores) {
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(dpr, dpr);

  const cx = size / 2, cy = size / 2;
  const radius = size / 2 - 38;
  const n = WHEEL_AREAS.length;
  const sectorAngle = (2 * Math.PI) / n;
  const startOff = -Math.PI / 2;

  // Grid rings (hexagonal)
  [0.2, 0.4, 0.6, 0.8, 1.0].forEach(f => {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = startOff + i * sectorAngle;
      const x = cx + radius * f * Math.cos(a);
      const y = cy + radius * f * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = f === 1.0 ? 'rgba(245,240,232,0.18)' : 'rgba(245,240,232,0.07)';
    ctx.lineWidth = 1; ctx.stroke();
  });

  // Spoke dividers
  for (let i = 0; i < n; i++) {
    const a = startOff + i * sectorAngle;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + radius * Math.cos(a), cy + radius * Math.sin(a));
    ctx.strokeStyle = 'rgba(245,240,232,0.12)';
    ctx.lineWidth = 1; ctx.stroke();
  }

  // FIFA sectors — each area is a colored pie wedge
  for (let i = 0; i < n; i++) {
    const startA = startOff + i * sectorAngle;
    const endA = startA + sectorAngle;
    const r = radius * Math.max(0, Math.min(scores[i], 10)) / 10;
    if (r < 1) continue;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startA, endA);
    ctx.closePath();
    ctx.fillStyle = WHEEL_AREAS[i].color + '50';
    ctx.fill();
    ctx.strokeStyle = WHEEL_AREAS[i].color;
    ctx.lineWidth = 1.5; ctx.stroke();
  }

  // Labels at midpoint of each sector
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    const midA = startOff + i * sectorAngle + sectorAngle / 2;
    const lr = radius + 24;
    ctx.fillStyle = WHEEL_AREAS[i].color;
    ctx.font = `bold 10px 'Helvetica Neue', Arial, sans-serif`;
    ctx.fillText(WHEEL_AREAS[i].shortName, cx + lr * Math.cos(midA), cy + lr * Math.sin(midA));

    const score = scores[i];
    if (score >= 1) {
      const scoreR = radius * Math.min(score, 10) / 10 * 0.55;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `bold 9px 'Helvetica Neue', Arial, sans-serif`;
      ctx.fillText(score.toFixed(1), cx + scoreR * Math.cos(midA), cy + scoreR * Math.sin(midA));
    }
  }
}

function emailWheelResults() {
  const wd = getWheelData();
  const answers = wd.answers || {};
  const lines = WHEEL_AREAS.map(area => {
    const ans = answers[area.id] || [];
    const avg = ans.length ? ans.reduce((a,b)=>a+b,0)/ans.length : 0;
    return `${area.name}: ${(avg*2).toFixed(1)}/10`;
  });
  const subject = encodeURIComponent('Moje koło życia — CIEŃ Festiwal 2026');
  const body = encodeURIComponent(`Moje koło życia — CIEŃ Festiwal 2026\n\n${lines.join('\n')}`);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

// ============================================
// VIEW: SACRUM (HARM REDUCTION)
// ============================================

function renderSacrum() {
  const container = document.getElementById('sacrum-content');
  if (!container) return;

  container.innerHTML = `
    <div class="sacrum-hero">
      <div class="sacrum-logo-wrap">
        <img src="icons/ksiezyc-slonce.jpg" class="sacrum-mandala-img" alt="SACRUM">
        <img src="icons/sacrum-logo.png" class="sacrum-svg-logo" alt="SACRUM">
      </div>
      <div class="sacrum-hero-sub">Punkt Pomocy · Zawsze dostępny · Bez oceniania</div>
    </div>

    <button class="emergency-btn" onclick="callHelp()">
      <span class="em-icon">🚨</span>
      <span>Potrzebuję pomocy TERAZ</span>
    </button>

    <div class="sacrum-section" style="margin-top:1rem">
      <div class="sacrum-section-title">Gdzie jest punkt pomocy?</div>
      <div class="sacrum-card">
        <div class="sacrum-card-title">🗺 Lokalizacja</div>
        <div class="sacrum-card-body">
          Cicha sala — I piętro, skrzydło wschodnie zamku.<br>
          <strong>Otwarty 24 godziny przez cały festiwal.</strong><br>
          Dyżuruje trip sitter + psycholog w godz. 18:00–08:00.
        </div>
      </div>
      <div class="sacrum-card">
        <div class="sacrum-card-title">📧 Kontakt</div>
        <div class="sacrum-card-body">
          <a href="mailto:kontakt@cienfestiwal.com" style="color:var(--zloto)">kontakt@cienfestiwal.com</a>
        </div>
      </div>
    </div>

    <div class="section-sep"></div>

    <div class="sacrum-section">
      <div class="sacrum-section-title">Zasady Harm Reduction</div>

      <div class="sacrum-card">
        <div class="sacrum-card-title">🌿 Ustaw intencję przed</div>
        <div class="sacrum-card-body">
          Wiedz, po co tu jesteś. Substancja wzmacnia to, co już jest — nie tworzy nowego. Jasna intencja to kotwa.
        </div>
      </div>

      <div class="sacrum-card">
        <div class="sacrum-card-title">👥 Zaufany towarzysz</div>
        <div class="sacrum-card-body">
          Zawsze miej przy sobie kogoś, kto wie, gdzie jesteś i co bierzesz. Trip sitter nie musi sam zażywać.
        </div>
      </div>

      <div class="sacrum-card">
        <div class="sacrum-card-title">💧 Woda i jedzenie</div>
        <div class="sacrum-card-body">
          Pij regularnie. Nie przesadzaj — nadmiar wody przy stymulantach też szkodzi. Jedz lekko przed i po.
        </div>
      </div>

      <div class="sacrum-card">
        <div class="sacrum-card-title">🌡 Dawki i mieszanki</div>
        <div class="sacrum-card-body">
          Zacznij od małej dawki. Odczekaj zanim weźmiesz więcej — efekty nie zawsze są natychmiastowe.<br>
          <strong style="color:var(--zloto)">Unikaj mieszania substancji.</strong> Szczególnie psychodeliki + stymulanty + alkohol.
        </div>
      </div>

      <div class="sacrum-card">
        <div class="sacrum-card-title">🛌 Jeśli jest trudno</div>
        <div class="sacrum-card-body">
          Znajdź spokojne miejsce. Połóż się. Oddychaj wolno i głęboko. Pamiętaj: to przejdzie.<br>
          <strong>Poproś o pomoc</strong> — trip sitterzy są po to.
        </div>
      </div>
    </div>

    <div class="section-sep"></div>

    <div class="sacrum-section">
      <div class="sacrum-section-title">Integracja — po doświadczeniu</div>

      <div class="sacrum-card">
        <div class="sacrum-card-title">📖 Zapisz, zanim zapomnisz</div>
        <div class="sacrum-card-body">
          Użyj Dziennika przemiany w tej aplikacji. Nawet fragmenty, obrazy, słowa.
        </div>
      </div>

      <div class="sacrum-card">
        <div class="sacrum-card-title">⏳ Czas integracji</div>
        <div class="sacrum-card-body">
          Głębokie doświadczenia potrzebują czasu. Nie oceniaj od razu. Daj sobie kilka dni — albo tygodni.
        </div>
      </div>

      <div class="sacrum-card">
        <div class="sacrum-card-title">🔄 Warsztaty integracyjne</div>
        <div class="sacrum-card-body">
          Sprawdź w harmonogramie sesje integracyjne — są zaplanowane każdego ranka.<br>
          SACRUM oferuje też sesje indywidualne — <a href="mailto:kontakt@cienfestiwal.com" style="color:var(--zloto)">skontaktuj się po festiwalu</a>.
        </div>
      </div>
    </div>

    <div class="section-sep"></div>

    <div class="sacrum-section">
      <div class="sacrum-section-title">Darmowe konsultacje terapeutyczne</div>
      <p style="color:var(--szary);font-size:0.9rem;margin:0 0 1rem">
        Przez cały festiwal możesz porozmawiać z terapeutą. Bezpłatnie. Bez zapisu. Bez oceniania.<br>
        Zgłoś się do punktu SACRUM lub złap terapeutę w kuluarach.
      </p>

      <div class="sacrum-card" style="border-left:3px solid #3BAFBA">
        <div class="sacrum-card-title" style="color:#3BAFBA">🌿 Team SACRUM</div>
        <div class="sacrum-card-body">
          Centrum Terapii Psychodelicznych — hipnoterapia, terapia integracyjna, psychotraumatologia.<br><br>
          <strong>Piotr Matejuk</strong> — hipnoterapeuta, psychotraumatolog, doktorant PAN<br>
          <span style="color:var(--szary);font-size:0.85rem">Hipnoza kliniczna · Terapia psychodeliczna · Praca z traumą</span><br><br>
          <a href="https://sacrum.life" target="_blank" style="color:#3BAFBA">sacrum.life →</a>
        </div>
      </div>

      <div class="sacrum-card" style="border-left:3px solid #C9A84C;margin-top:0.75rem">
        <div class="sacrum-card-title" style="color:#C9A84C">🎓 Team PSH</div>
        <div class="sacrum-card-body">
          Profesjonalna Szkoła Hipnoterapii — kadra wykładowców i absolwentów.<br><br>
          Konsultacje z zakresu: hipnoterapia, praca z nieświadomością, integracja doświadczeń.<br><br>
          <a href="https://hipnoterapia.edu.pl" target="_blank" style="color:#C9A84C">hipnoterapia.edu.pl →</a>
        </div>
      </div>

      <div class="sacrum-card" style="margin-top:0.75rem;background:rgba(201,168,76,0.06)">
        <div class="sacrum-card-body" style="font-size:0.88rem;color:var(--szary)">
          Konsultacje mają charakter wsparcia i orientacji — nie zastępują długoterminowej psychoterapii.
          Jeśli coś trudnego wychodzi na powierzchni podczas festiwalu — jesteśmy tu po to.
        </div>
      </div>
    </div>
  `;
}

function callHelp() {
  const modal = document.getElementById('event-modal');
  modal.querySelector('.modal-zone-badge').style.color = '#FF4444';
  modal.querySelector('.modal-zone-badge').innerHTML = '🚨 POMOC';
  modal.querySelector('.modal-title').textContent = 'Potrzebujesz pomocy?';
  modal.querySelector('.modal-artist').style.display = 'none';
  modal.querySelector('.modal-time').innerHTML = '📍 Cicha sala — I piętro, skrzydło wschodnie · Otwarte 24h';
  modal.querySelector('.modal-description').innerHTML = `
    <strong style="color:#FF6B6B">Idź do punktu pomocy lub poproś kogoś w pobliżu.</strong><br><br>
    Powiedz obsłudze: <em>"Potrzebuję trip sittera"</em>. Nie musisz nic tłumaczyć.<br><br>
    <strong>Jeśli to nagłe zagrożenie zdrowia:</strong><br>
    Ratownik medyczny — namioty przy wejściu (24h).<br><br>
    Email: <a href="mailto:kontakt@cienfestiwal.com" style="color:var(--zloto)">kontakt@cienfestiwal.com</a>
  `;
  const tagsEl = modal.querySelector('.modal-tags');
  if (tagsEl) tagsEl.innerHTML = '';
  modal.querySelector('.modal-overlay').classList.add('open');
}

// ============================================
// VIEW: INFO
// ============================================

function renderInfo() {
  const container = document.getElementById('info-content');
  if (!container) return;

  container.innerHTML = `
    <div class="info-section" style="margin-top:1rem">
      <div class="info-card">
        <div class="info-card-header">
          <span class="info-card-icon">📍</span>
          <span class="info-card-title">Lokalizacja</span>
        </div>
        <div class="info-card-body">
          <strong>Zamek Świny</strong><br>
          Świny, gmina Bolków, woj. dolnośląskie<br>
          <a href="https://maps.google.com/?q=Zamek+Świny+Bolków" style="color:var(--zloto)" target="_blank">
            Otwórz w Google Maps →
          </a>
        </div>
      </div>

      <div class="info-card">
        <div class="info-card-header">
          <span class="info-card-icon">📅</span>
          <span class="info-card-title">Daty</span>
        </div>
        <div class="info-card-body">
          <strong>3–5 lipca 2026</strong><br>
          Przyjazd: czwartek 3.07 od godz. 14:00<br>
          Wyjazd: niedziela 5.07 do godz. 20:00<br>
          <br>
          <strong style="color:var(--zloto)">Nigredo</strong> (3.07) — Albedo (4.07) — <strong style="color:var(--burgund-2)">Rubedo</strong> (5.07)
        </div>
      </div>

      <div class="info-card">
        <div class="info-card-header">
          <span class="info-card-icon">🚗</span>
          <span class="info-card-title">Dojazd</span>
        </div>
        <div class="info-card-body">
          <strong>Samochodem:</strong><br>
          Autostrada A4 → Bolków → Świny (ok. 15 km od Bolkowa).<br>
          Parking przy zamku — bezpłatny dla uczestników.<br><br>
          <strong>Pociągiem:</strong><br>
          Stacja Bolków (PKP) → taxi/Bolt ok. 15 min.<br><br>
          <strong>Carpooling:</strong> szukaj w grupie festiwalu na FB.
        </div>
      </div>

      <div class="info-card">
        <div class="info-card-header">
          <span class="info-card-icon">🎒</span>
          <span class="info-card-title">Co zabrać</span>
        </div>
        <div class="info-card-body">
          <ul>
            <li>Śpiwór i materac / karimat (camping lub namioty)</li>
            <li>Ciepłe ubrania na wieczory (góry, noce chłodne)</li>
            <li>Kalosze lub wodoodporne buty</li>
            <li>Refillable bidon lub kubek (zero odpadów)</li>
            <li>Latarka czołowa (zamkowe korytarze)</li>
            <li>Słuchawki zatyczkowe do snu</li>
            <li>Leki na receptę (własne, z opisem)</li>
            <li>Dowód osobisty lub paszport</li>
          </ul>
        </div>
      </div>

      <div class="info-card">
        <div class="info-card-header">
          <span class="info-card-icon">🚫</span>
          <span class="info-card-title">Czego NIE brać</span>
        </div>
        <div class="info-card-body">
          <ul>
            <li>Zwierząt domowych</li>
            <li>Dronów bez zgody organizatora</li>
            <li>Szklanego alkoholu na terenie zamku</li>
            <li>Agresji — nasz zamek, nasze zasady</li>
          </ul>
        </div>
      </div>

      <div class="info-card">
        <div class="info-card-header">
          <span class="info-card-icon">🌦</span>
          <span class="info-card-title">Pogoda</span>
        </div>
        <div class="info-card-body">
          Lipiec w górach = nieprzewidywalny. Pakuj warstwy.<br>
          Górska burza może przyjść w ciągu godziny.<br>
          <strong style="color:var(--zloto)">Bądź gotowy na wszystko — to część doświadczenia.</strong>
        </div>
      </div>

      <div class="info-card">
        <div class="info-card-header">
          <span class="info-card-icon">📧</span>
          <span class="info-card-title">Kontakt</span>
        </div>
        <div class="info-card-body">
          <a href="mailto:kontakt@cienfestiwal.com" style="color:var(--zloto)">kontakt@cienfestiwal.com</a><br>
          <a href="https://cienfestiwal.com" style="color:var(--zloto)" target="_blank">cienfestiwal.com</a>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// VIEW: BAZA WIEDZY
// ============================================

function renderKnowledge() {
  const container = document.getElementById('wiedza-content');
  if (!container) return;

  const activeCategory = State.kb.activeCategory;

  const chipsHTML = KB_CATEGORIES.map(cat => `
    <button class="kb-chip ${activeCategory === cat.id ? 'active' : ''}"
            style="${activeCategory === cat.id ? `background:${cat.color};border-color:${cat.color};color:#0A0A0A` : ''}"
            onclick="setKBCategory('${cat.id}')">
      ${cat.label}
    </button>`).join('');

  const filtered = activeCategory === 'all'
    ? ARTICLES_DATA
    : ARTICLES_DATA.filter(a => a.category === activeCategory);

  const gridHTML = filtered.map(art => {
    const catColor = KB_CAT_COLORS[art.category] || '#C9A84C';
    const catLabel = KB_CATEGORIES.find(c => c.id === art.category)?.label || '';
    return `
      <div class="kb-card" onclick="openArticle('${art.id}')">
        <span class="kb-card-emoji">${art.emoji}</span>
        <div class="kb-card-cat" style="color:${catColor}">${catLabel}</div>
        <div class="kb-card-title">${art.title}</div>
        <div class="kb-card-teaser">${art.teaser}</div>
        <div class="kb-card-meta">${art.readTime} czytania</div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="kb-filter">${chipsHTML}</div>
    <div class="kb-grid">${gridHTML}</div>
  `;
}

function setKBCategory(cat) {
  State.kb.activeCategory = cat;
  renderKnowledge();
}

function openArticle(id) {
  const art = ARTICLES_DATA.find(a => a.id === id);
  if (!art) return;

  const catColor = KB_CAT_COLORS[art.category] || '#C9A84C';
  const catLabel = KB_CATEGORIES.find(c => c.id === art.category)?.label || '';

  const sourcesHTML = art.sources.map(s =>
    `<div class="art-source">
      <span class="art-source-n">[${s.n}]</span>
      <span>${s.url
        ? `<a href="${s.url}" target="_blank" rel="noopener">${s.text}</a>`
        : s.text
      }</span>
    </div>`
  ).join('');

  document.getElementById('article-body').innerHTML = `
    <div class="art-cat" style="color:${catColor}">${catLabel}</div>
    <span class="art-emoji">${art.emoji}</span>
    <h1 class="art-title">${art.title}</h1>
    <div class="art-meta">${art.readTime} czytania · źródła: ${art.sources.length}</div>
    <div class="art-content">${art.content}</div>
    <div class="art-sources">
      <div class="art-sources-title">Źródła</div>
      ${sourcesHTML}
    </div>
  `;

  const overlay = document.getElementById('article-overlay');
  overlay.classList.add('open');
  overlay.scrollTop = 0;
  document.body.style.overflow = 'hidden';
}

function closeArticle() {
  document.getElementById('article-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ============================================
// INSTALL PROMPT
// ============================================

let installPromptEvent = null;

function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installPromptEvent = e;
    const banner = document.getElementById('install-banner');
    if (banner) banner.classList.add('show');
  });
}

function triggerInstall() {
  if (!installPromptEvent) return;
  installPromptEvent.prompt();
  installPromptEvent.userChoice.then(() => {
    installPromptEvent = null;
    dismissInstall();
  });
}

function dismissInstall() {
  const banner = document.getElementById('install-banner');
  if (banner) banner.classList.remove('show');
}

// ============================================
// SERVICE WORKER
// ============================================

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(console.error);
  }
}

// ============================================
// VIEW: SLOW DATING
// ============================================

const SD_TAGS = [
  'Psychodeliki', 'Hipnoza', 'Jung', 'Taniec', 'Muzyka', 'Psychologia',
  'Buddyzm', 'Sztuka', 'Natura', 'Medytacja', 'Trauma', 'NVC',
  'Filozofia', 'Ruch', 'Dźwięk', 'Integracja'
];

function getSDProfile() {
  try { return JSON.parse(localStorage.getItem('cien_sd_profile_2026') || '{}'); } catch { return {}; }
}

function saveSDProfile(profile) {
  localStorage.setItem('cien_sd_profile_2026', JSON.stringify(profile));
}

function getSDMeetings() {
  try { return JSON.parse(localStorage.getItem('cien_sd_meetings_2026') || '[]'); } catch { return []; }
}

function saveSDMeetings(meetings) {
  localStorage.setItem('cien_sd_meetings_2026', JSON.stringify(meetings));
}

function renderSlowDatingLocal() {
  const container = document.getElementById('slowdating-content');
  if (!container) return;

  const profile = getSDProfile();
  const meetings = getSDMeetings();

  const hasProfile = !!(profile.nick && profile.nick.trim());

  const cardHTML = `
    <div class="sd-card-preview">
      <div class="sd-card-nick ${hasProfile ? '' : 'placeholder'}">${profile.nick || 'Twój nick'}</div>
      <div class="sd-card-about ${profile.about ? '' : 'placeholder'}">${profile.about || 'Jedno zdanie o sobie...'}</div>
      <div class="sd-card-tags">
        ${(profile.tags || []).map(t => `<span class="sd-tag">${t}</span>`).join('')}
        ${!(profile.tags || []).length ? '<span class="sd-tag" style="opacity:0.4">tagi</span>' : ''}
      </div>
    </div>`;

  const sessionsHTML = `
    <div class="sd-anima-hero">
      <img src="icons/ksiezyc-slonce.jpg" alt="Anima Animus" class="sd-anima-img">
      <div class="sd-anima-label">Anima / Animus · Księżyc · Słońce</div>
    </div>
    <div class="sd-sessions">
      <div class="sd-session-pill">💘 Piątek 16:30–18:00 · Anima/Animus</div>
      <div class="sd-session-pill">💘 Piątek 18:30–20:00 · Anima/Animus</div>
    </div>`;

  const selectedTags = profile.tags || [];
  const tagsHTML = SD_TAGS.map(t => `
    <button class="sd-tag-btn ${selectedTags.includes(t) ? 'selected' : ''}"
            onclick="sdToggleTag('${t}')">${t}</button>`).join('');

  const meetingsHTML = meetings.length ? meetings.map((m, i) => `
    <div class="sd-meeting-card">
      <div class="sd-meeting-info">
        <div class="sd-meeting-nick">${escHtml(m.nick)}</div>
        ${m.note ? `<div class="sd-meeting-note">${escHtml(m.note)}</div>` : ''}
      </div>
      <div class="sd-meeting-actions">
        ${m.contact ? `<button class="sd-action-btn" onclick="sdContact('${escHtml(m.contact)}')" title="Kontakt">✉</button>` : ''}
        <button class="sd-action-btn" onclick="sdDeleteMeeting(${i})" title="Usuń">✕</button>
      </div>
    </div>`).join('') :
    `<div class="sd-empty-state">Nie zapisałeś jeszcze żadnego spotkania</div>`;

  container.innerHTML = `
    <div class="sd-hero">
      <div class="sd-hero-icon">💘</div>
      <div class="sd-hero-title">SLOW DATING</div>
      <div class="sd-hero-sub">Spotkanie bez algorytmów · prowadzi Maciek Kołodziejczyk EUPHIRE</div>
    </div>

    ${sessionsHTML}

    <div class="sd-section">
      <div class="sd-section-title">Twoja karta</div>
      ${cardHTML}

      <div class="sd-form">
        <div>
          <div class="sd-input-label">Nick / imię</div>
          <input class="sd-input" id="sd-nick" type="text" maxlength="30"
                 value="${escHtml(profile.nick || '')}"
                 placeholder="jak mówią na Ciebie"
                 oninput="sdUpdatePreview()">
        </div>
        <div>
          <div class="sd-input-label">Jedno zdanie o sobie</div>
          <input class="sd-input" id="sd-about" type="text" maxlength="80"
                 value="${escHtml(profile.about || '')}"
                 placeholder="Co robisz / skąd jesteś / co tu szukasz"
                 oninput="sdUpdatePreview()">
          <div class="sd-char-count" id="sd-char-count">${(profile.about || '').length}/80</div>
        </div>
        <div>
          <div class="sd-input-label">Tematy (max 4)</div>
          <div class="sd-tags-grid">${tagsHTML}</div>
        </div>
        <button class="btn btn-gold" onclick="sdSaveProfile()">Zapisz kartę</button>
      </div>
    </div>

    <div class="sd-section">
      <div class="sd-section-title">Moje spotkania</div>
      <div class="sd-meetings-list" id="sd-meetings-list">${meetingsHTML}</div>
      <button class="btn-burgund" onclick="sdOpenAddMeeting()" style="margin-top:0.75rem">+ Dodaj spotkanie</button>
    </div>
  `;
}

function sdUpdatePreview() {
  const nick = document.getElementById('sd-nick')?.value || '';
  const about = document.getElementById('sd-about')?.value || '';
  const charCount = document.getElementById('sd-char-count');
  if (charCount) charCount.textContent = `${about.length}/80`;

  const profile = getSDProfile();
  const nickEl = document.querySelector('.sd-card-nick');
  const aboutEl = document.querySelector('.sd-card-about');
  if (nickEl) {
    nickEl.textContent = nick || 'Twój nick';
    nickEl.classList.toggle('placeholder', !nick);
  }
  if (aboutEl) {
    aboutEl.textContent = about || 'Jedno zdanie o sobie...';
    aboutEl.classList.toggle('placeholder', !about);
  }
}

function sdToggleTag(tag) {
  const profile = getSDProfile();
  const tags = profile.tags || [];
  const idx = tags.indexOf(tag);
  if (idx >= 0) {
    tags.splice(idx, 1);
  } else {
    if (tags.length >= 4) { showToast('Maksymalnie 4 tagi'); return; }
    tags.push(tag);
  }
  profile.tags = tags;
  saveSDProfile(profile);

  const btn = document.querySelector(`.sd-tag-btn`);
  document.querySelectorAll('.sd-tag-btn').forEach(b => {
    if (b.textContent.trim() === tag) b.classList.toggle('selected', tags.includes(tag));
  });

  const tagsContainer = document.querySelector('.sd-card-tags');
  if (tagsContainer) {
    tagsContainer.innerHTML = tags.map(t => `<span class="sd-tag">${t}</span>`).join('') ||
      '<span class="sd-tag" style="opacity:0.4">tagi</span>';
  }
}

function sdSaveProfile() {
  const nick = document.getElementById('sd-nick')?.value?.trim() || '';
  const about = document.getElementById('sd-about')?.value?.trim() || '';
  const profile = getSDProfile();
  profile.nick = nick;
  profile.about = about;
  saveSDProfile(profile);
  showToast('Karta zapisana ✓');
}

function sdOpenAddMeeting() {
  const modal = document.getElementById('event-modal');
  modal.querySelector('.modal-zone-badge').style.color = '#8B3A52';
  modal.querySelector('.modal-zone-badge').innerHTML = '💘 Nowe spotkanie';
  modal.querySelector('.modal-title').textContent = 'Zapisz osobę';
  modal.querySelector('.modal-artist').style.display = 'none';
  modal.querySelector('.modal-time').innerHTML = '';
  modal.querySelector('.modal-description').innerHTML = `
    <div class="sd-modal-form">
      <div>
        <div class="sd-input-label">Nick / imię</div>
        <input class="sd-input" id="sd-new-nick" type="text" maxlength="40" placeholder="jak mają na imię">
      </div>
      <div>
        <div class="sd-input-label">Co mi się podobało / o czym rozmawialiśmy</div>
        <input class="sd-input" id="sd-new-note" type="text" maxlength="100" placeholder="notatka dla siebie">
      </div>
      <div>
        <div class="sd-input-label">Kontakt (email lub @) — opcjonalnie</div>
        <input class="sd-input" id="sd-new-contact" type="text" maxlength="80" placeholder="email@... lub @telegram">
      </div>
    </div>`;
  const tagsEl = modal.querySelector('.modal-tags');
  if (tagsEl) tagsEl.innerHTML = `
    <button class="btn btn-gold" onclick="sdConfirmAddMeeting()" style="width:100%;margin-top:0.5rem">Zapisz</button>`;
  modal.querySelector('.modal-overlay').classList.add('open');
  setTimeout(() => document.getElementById('sd-new-nick')?.focus(), 100);
}

function sdConfirmAddMeeting() {
  const nick = document.getElementById('sd-new-nick')?.value?.trim();
  if (!nick) { showToast('Wpisz nick lub imię'); return; }
  const note = document.getElementById('sd-new-note')?.value?.trim() || '';
  const contact = document.getElementById('sd-new-contact')?.value?.trim() || '';
  const meetings = getSDMeetings();
  meetings.unshift({ nick, note, contact, ts: Date.now() });
  saveSDMeetings(meetings);
  closeEventModal();
  showToast('Spotkanie zapisane ✓');
  const listEl = document.getElementById('sd-meetings-list');
  if (listEl) {
    listEl.innerHTML = meetings.map((m, i) => `
      <div class="sd-meeting-card">
        <div class="sd-meeting-info">
          <div class="sd-meeting-nick">${escHtml(m.nick)}</div>
          ${m.note ? `<div class="sd-meeting-note">${escHtml(m.note)}</div>` : ''}
        </div>
        <div class="sd-meeting-actions">
          ${m.contact ? `<button class="sd-action-btn" onclick="sdContact('${escHtml(m.contact)}')" title="Kontakt">✉</button>` : ''}
          <button class="sd-action-btn" onclick="sdDeleteMeeting(${i})" title="Usuń">✕</button>
        </div>
      </div>`).join('');
  }
}

function sdDeleteMeeting(idx) {
  const meetings = getSDMeetings();
  meetings.splice(idx, 1);
  saveSDMeetings(meetings);
  renderSlowDating();
}

function sdContact(contact) {
  if (contact.includes('@') && !contact.startsWith('@')) {
    window.location.href = `mailto:${contact}`;
  } else {
    showToast(contact);
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function getFavorites() {
  try { return JSON.parse(localStorage.getItem('cien_favs_2026') || '[]'); } catch { return []; }
}

function toggleFavorite(evId) {
  const favs = getFavorites();
  const idx = favs.indexOf(evId);
  if (idx >= 0) favs.splice(idx, 1); else favs.push(evId);
  localStorage.setItem('cien_favs_2026', JSON.stringify(favs));
  renderSchedule();
}

// ============================================
// UTILITIES
// ============================================

function getFestivalDay(iso) {
  const d = new Date(iso);
  if (d.getHours() < 6) d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

function getDuration(start, end) {
  const mins = Math.round((new Date(end) - new Date(start)) / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

function showToast(msg, duration = 2500) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed; bottom:calc(var(--nav-h) + 1rem); left:50%; transform:translateX(-50%);
      background:var(--noir-3); border:1px solid var(--zloto-2);
      color:var(--pergamin); padding:0.6rem 1.25rem; border-radius:20px;
      font-family:var(--font-display); font-size:0.65rem; letter-spacing:0.08em;
      z-index:400; white-space:nowrap; opacity:0; transition:opacity 200ms ease;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, duration);
}

// ============================================
// EXPOSE GLOBALS
// ============================================

Object.assign(window, {
  setActiveDay, setActiveZone, openEventModal, closeEventModal,
  setPoiType, highlightZone, openPoiModal,
  setJournalStage, autoSaveJournal, saveJournalEntry, emailJournalEntry, toggleEntry,
  callHelp, triggerInstall, dismissInstall,
  sdToggleTag, sdSaveProfile, sdUpdatePreview, sdOpenAddMeeting, sdConfirmAddMeeting, sdDeleteMeeting, sdContact,
  toggleFavorite,
  setKBCategory, openArticle, closeArticle,
  dismissOnboarding
});

// ============================================
// BOOT
// ============================================

document.addEventListener('DOMContentLoaded', init);

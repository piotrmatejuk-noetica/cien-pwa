/* ============================================
   CIEŃ FESTIWAL 2026 — App JS
   ============================================ */

'use strict';

// ============================================
// AUTH
// ============================================

function initFirebase() {} // Firebase not used

function _setUser(uid, email, name) {
  localStorage.setItem('cien_user_id', uid);
  if (email) localStorage.setItem('cien_user_email', email);
  if (name)  localStorage.setItem('cien_user_name', name);
  // Persist ghost record so returning users get instant re-login
  if (email) localStorage.setItem('cien_prev_email', email);
  if (name)  localStorage.setItem('cien_prev_name', name);
  if (uid)   localStorage.setItem('cien_prev_uid', uid);
  localStorage.setItem('cien_terms_accepted', '1');
  hideAuthScreen();
  showToast('Witaj na Cieniu 🌙', 2000);
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
  renderSchedule();
}

// Returning user re-login — requires password if one was set
function authContinue() {
  const uid   = localStorage.getItem('cien_prev_uid');
  const email = localStorage.getItem('cien_prev_email');
  const name  = localStorage.getItem('cien_prev_name');
  if (!uid) { _authSwitchToFull(); return; }
  const stored = localStorage.getItem('cien_pass_hash');
  if (!stored) { _setUser(uid, email, name); return; }
  // Has password — show password field in returning panel
  const retPanel = document.getElementById('auth-returning');
  let passInput = retPanel?.querySelector('#auth-return-pass');
  if (!passInput) {
    passInput = document.createElement('input');
    passInput.id = 'auth-return-pass';
    passInput.type = 'password';
    passInput.placeholder = 'Hasło';
    passInput.className = 'auth-input';
    passInput.style.cssText = 'margin-top:0.75rem;width:100%';
    retPanel?.querySelector('.auth-returning-actions')?.prepend(passInput);
  }
  passInput.style.display = '';
  const pass = passInput.value;
  if (!pass) { passInput.focus(); return; }
  _hashPass(pass).then(hash => {
    if (hash !== stored) { _authError('Błędne hasło'); return; }
    _setUser(uid, email, name);
  });
}

function authSwitchUser() {
  localStorage.removeItem('cien_prev_uid');
  localStorage.removeItem('cien_prev_email');
  localStorage.removeItem('cien_prev_name');
  _authSwitchToFull();
}

function _authSwitchToFull() {
  const ret = document.getElementById('auth-returning');
  const main = document.getElementById('auth-panel-main');
  if (ret) ret.style.display = 'none';
  if (main) main.style.display = '';
}

function authRegister() {
  if (!_authTermsOk()) return;
  const emailEl = document.getElementById('auth-email');
  const passEl  = document.getElementById('auth-password');
  if (!emailEl || !emailEl.value.trim()) { _authError('Wpisz adres email'); return; }
  if (!emailEl.validity.valid) { _authError('Wpisz poprawny adres email'); return; }
  if (!passEl || !passEl.value || passEl.value.length < 6) { _authError('Hasło musi mieć co najmniej 6 znaków'); return; }
  const email = emailEl.value.trim().toLowerCase();
  // UID is random per device — not guessable from email
  const existingUid = localStorage.getItem('cien_prev_uid');
  const existingEmail = localStorage.getItem('cien_prev_email');
  if (existingUid && existingEmail === email) {
    // Same email on this device — verify password
    _verifyPassAndLogin(existingUid, email, passEl.value);
    return;
  }
  // New account on this device
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b => b.toString(16).padStart(2,'0')).join('');
  const uid  = 'u_' + rand;
  const name = email.split('@')[0];
  _hashPass(passEl.value).then(hash => {
    localStorage.setItem('cien_pass_hash', hash);
    _setUser(uid, email, name);
  });
}

async function _hashPass(pass) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pass));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function _verifyPassAndLogin(uid, email, pass) {
  const stored = localStorage.getItem('cien_pass_hash');
  if (!stored) { _setUser(uid, email, email.split('@')[0]); return; }
  const hash = await _hashPass(pass);
  if (hash !== stored) { _authError('Błędne hasło'); return; }
  _setUser(uid, email, localStorage.getItem('cien_prev_name') || email.split('@')[0]);
}

function _authTermsOk() {
  if (localStorage.getItem('cien_terms_accepted')) return true;
  const cb = document.getElementById('auth-terms-check');
  if (!cb || cb.closest('#auth-terms-block').style.display === 'none') return true;
  if (!cb.checked) {
    _authError('Zaakceptuj Regulamin i Politykę Prywatności');
    const label = document.querySelector('.auth-terms-label');
    if (label) { label.style.color = '#ff6b6b'; setTimeout(() => label.style.color = '', 1800); }
    return false;
  }
  return true;
}

function _authError(msg) {
  const el = document.getElementById('auth-error');
  if (el) el.textContent = msg;
}

function _prepareAuthScreen() {
  const prevUid  = localStorage.getItem('cien_prev_uid');
  const prevName = localStorage.getItem('cien_prev_name');
  const prevEmail= localStorage.getItem('cien_prev_email');
  const termsOk  = localStorage.getItem('cien_terms_accepted');

  const returningBlock = document.getElementById('auth-returning');
  const mainPanel      = document.getElementById('auth-panel-main');
  const termsBlock     = document.getElementById('auth-terms-block');
  const returnName     = document.getElementById('auth-return-name');

  if (prevUid) {
    // Returning user — show quick button, hide main form
    if (returningBlock) returningBlock.style.display = '';
    if (mainPanel)      mainPanel.style.display = 'none';
    if (returnName)     returnName.textContent = prevName || prevEmail || 'poprzednie konto';
  } else {
    // New user — show form, hide returning block, show terms if not accepted
    if (returningBlock) returningBlock.style.display = 'none';
    if (mainPanel)      mainPanel.style.display = '';
    if (termsBlock)     termsBlock.style.display = termsOk ? 'none' : '';
  }

  // Pre-fill email if available
  const emailInput = document.getElementById('auth-email');
  if (emailInput && prevEmail && !prevUid) emailInput.value = prevEmail;
}

// ============================================
// STATE
// ============================================

const State = {
  data: null,
  currentView: 'teraz',
  schedule: {
    activeDay: '2026-07-03',
    activeZone: 'all',
    showFavOnly: false,
    searchQuery: ''
  },
  map: {
    activePOIType: 'all',
    view: 'svg'
  },
  journal: {
    activeStage: 'nigredo',
    activeTab: 'journal',
    cachedPrompts: {}
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
  if (splash) splash.classList.add('hidden');
  initParticles();
  _fetchWeather();

  const loggedIn = localStorage.getItem('cien_user_id');
  if (!loggedIn) {
    _prepareAuthScreen();
    showAuthScreen();
  }
  // Init team feature after auth check
  if (loggedIn && typeof initTeam === 'function') initTeam();
  if (typeof _fbAuth !== 'undefined' && _fbAuth) {
    _fbAuth.onAuthStateChanged(user => {
      if (user) {
        _setUser(user.uid, user.email, user.displayName);
      }
    });
  }
}

async function loadData() {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const [scheduleRes, poisRes, speakersRes] = await Promise.all([
        fetch('data/schedule.json'),
        fetch('data/pois.json'),
        fetch('data/speakers.json').catch(() => null)
      ]);
      // Guard: SW may return index.html as offline fallback — detect and retry
      const ct = scheduleRes.headers.get('content-type') || '';
      if (ct.includes('html')) throw new Error('SW returned HTML for JSON');
      const schedule = await scheduleRes.json();
      const pois = await poisRes.json();
      const speakers = speakersRes ? await speakersRes.json().catch(() => ({})) : {};
      State.data = { ...schedule, ...pois, speakers };
      State.dataLoadError = false;
      return;
    } catch (e) {
      console.warn('loadData attempt', attempt + 1, e.message);
      if (attempt < 2) await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  State.data = { events: [], zones: [], pois: [], festival: { zones: [] }, speakers: {} };
  State.dataLoadError = true;
}

// ============================================
// ROUTER
// ============================================

const VIEWS = ['teraz', 'mapa', 'slowdating', 'dziennik', 'sacrum', 'druzyna', 'info', 'wiedza', 'profil', 'ustawienia'];

function setupRouter() {
  window.addEventListener('popstate', () => {
    if (document.getElementById('article-overlay')?.classList.contains('open')) {
      closeArticle(); return;
    }
    if (document.querySelector('.modal-overlay.open')) {
      closeEventModal(); return;
    }
  });

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

  // Update nav — "Więcej" btn highlights for secondary views
  const moreViews = ['profil', 'dziennik', 'sacrum', 'wiedza', 'ustawienia'];
  document.querySelectorAll('.nav-btn').forEach(btn => {
    if (btn.id === 'nav-more-btn') {
      btn.classList.toggle('active', moreViews.includes(view));
    } else {
      btn.classList.toggle('active', btn.dataset.view === view);
    }
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
    case 'slowdating':  renderSlowDating(); document.getElementById('content')?.scrollTo({top:0}); break;
    case 'dziennik':    renderJournal(); break;
    case 'sacrum':      renderSacrum(); break;
    case 'druzyna':     renderTeamView(); break;
    case 'info':        renderInfo(); break;
    case 'wiedza':      renderKnowledge(); break;
    case 'profil':      renderProfil(); break;
    case 'ustawienia':  renderUstawienia(); break;
  }
}

// ============================================
// HEADER + CLOCK
// ============================================

function setupClock() {
  updateClock();
  setInterval(() => {
    updateClock();
    if (State.currentView === 'teraz') renderSchedule();
  }, 60000);
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
<li><span>🛡</span><span>Coś się dzieje? PsyCare SACRUM, konsultacje poranne, punkt medyczny lub kamizelka/koszulka Strażników CIEŃa.</span></li>
      <li><span>🌙</span><span>Cisza w strefach nocnych i namiotowych po 4:00.</span></li>
    </ul>
  </div>

  <button class="onb-btn" onclick="dismissOnboarding()">Rozumiem, gotowy na Cień →</button>
</div>`;
}

function renderSchedule() {
  const container = document.getElementById('schedule-content');
  if (!container || !State.data) return;
  if (State.dataLoadError) {
    container.innerHTML = `<div style="padding:3rem 2rem;text-align:center">
      <div style="font-size:2rem;margin-bottom:0.75rem">📡</div>
      <div style="color:var(--pergamin);margin-bottom:0.5rem;font-family:var(--font-display)">Brak połączenia</div>
      <div style="color:var(--szary);font-size:0.9rem;line-height:1.5;margin-bottom:1.25rem">Program nie mógł się załadować. Sprawdź połączenie i spróbuj ponownie.</div>
      <button class="btn-burgund" onclick="loadData().then(renderSchedule)">Spróbuj ponownie</button>
    </div>`;
    return;
  }

  const events = State.data.events || [];
  const zones  = State.data.festival?.zones || [];

  const festivalStarted = new Date() >= new Date('2026-07-03T06:00:00');
  const tuITerazHTML    = festivalStarted ? renderTuITeraz(events) : '';
  const countdownHTML   = !festivalStarted ? _renderCountdown() : '';
  const weatherHTML     = `<div id="weather-widget-slot" style="margin:0 0 0.5rem">${_renderWeatherWidget()}</div>`;

  const DAYS = ['2026-07-03', '2026-07-04', '2026-07-05'];
  const DAY_META = {
    '2026-07-03': { stage: 'nigredo', label: 'Nigredo', date: 'Pt 3 VII' },
    '2026-07-04': { stage: 'albedo',  label: 'Albedo',  date: 'Sb 4 VII' },
    '2026-07-05': { stage: 'rubedo',  label: 'Rubedo',  date: 'Nd 5 VII' },
  };

  const activeDay = State.schedule.activeDay || '2026-07-03';

  // Day tabs
  const dayTabsHTML = DAYS.map(d => {
    const m = DAY_META[d];
    const isActive = d === activeDay;
    return `<button class="day-tab ${m.stage}${isActive ? ' active' : ''}" onclick="setActiveDay('${d}')">
      <div class="tab-stage">${m.label}</div>
      <div class="tab-date">${m.date}</div>
    </button>`;
  }).join('');

  // Zone chips
  const favCount = getFavorites().length;
  const zoneChipsHTML = [
    `<button class="zone-chip favs ${State.schedule.showFavOnly ? 'active' : ''}" onclick="setFavOnly(${!State.schedule.showFavOnly})">★ Mój Plan${favCount ? ` (${favCount})` : ''}</button>`,
    `<button class="zone-chip all ${!State.schedule.showFavOnly && State.schedule.activeZone === 'all' ? 'active' : ''}" onclick="setActiveZone('all')">Wszystkie</button>`,
    ...zones.map(z => `
      <button class="zone-chip ${!State.schedule.showFavOnly && State.schedule.activeZone === z.id ? 'active' : ''}"
              data-zone="${z.id}"
              onclick="setActiveZone('${z.id}')">
        ${z.icon} ${z.shortName}
      </button>`)
  ].join('');

  // Events for active day only
  const dayEvts = events.filter(ev => {
    const matchDay  = getFestivalDay(ev.start) === activeDay;
    const matchZone = State.schedule.activeZone === 'all' || ev.zone === State.schedule.activeZone;
    const matchFav  = !State.schedule.showFavOnly || getFavorites().includes(ev.id);
    return matchDay && matchZone && matchFav;
  }).sort((a, b) => {
    const aH = new Date(a.start).getHours();
    const bH = new Date(b.start).getHours();
    const aOrd = aH < 6 ? aH + 24 : aH;
    const bOrd = bH < 6 ? bH + 24 : bH;
    return aOrd !== bOrd ? aOrd - bOrd : a.start.localeCompare(b.start);
  });

  const q = (State.schedule.searchQuery || '').toLowerCase().trim();
  const filteredEvts = q
    ? dayEvts.filter(ev =>
        ev.title.toLowerCase().includes(q) ||
        (ev.artist || '').toLowerCase().includes(q) ||
        (ev.description || '').toLowerCase().includes(q))
    : dayEvts;

  let eventsHTML;
  if (filteredEvts.length) {
    eventsHTML = `<div class="events-list">${renderEventsList(filteredEvts)}</div>`;
  } else if (State.schedule.showFavOnly) {
    eventsHTML = `<div class="empty-favs">
      <div class="empty-favs-icon">☆</div>
      <div class="empty-favs-title">Mój Plan jest pusty</div>
      <div class="empty-favs-hint">Tap ☆ na wydarzeniu żeby dodać je do planu. Twój plan zapisuje się na urządzeniu.</div>
    </div>`;
  } else if (q) {
    eventsHTML = `<div style="padding:2.5rem 1rem;text-align:center;color:var(--szary)">
      Brak wyników dla <em style="color:var(--pergamin)">"${escHtml(q)}"</em>
    </div>`;
  } else {
    eventsHTML = `<div style="padding:2rem 1rem;text-align:center;color:var(--szary)">Brak wydarzeń w tej strefie.</div>`;
  }

  const searchVal = escHtml(State.schedule.searchQuery || '');
  const quoteHTML = !festivalStarted ? _renderAlchemicQuote() : '';

  container.innerHTML = `
    <div id="ann-teraz-slot"></div>
    ${countdownHTML}
    ${quoteHTML}
    ${_onboardingCard()}
    ${tuITerazHTML}
    ${weatherHTML}
    <div class="day-tabs">${dayTabsHTML}</div>
    <div class="zone-filter">${zoneChipsHTML}</div>
    <div class="schedule-search-wrap">
      <span class="schedule-search-icon">🔍</span>
      <input class="schedule-search" type="search" placeholder="Szukaj — wykład, strefa, prowadzący..."
             value="${searchVal}"
             oninput="scheduleSearch(this.value)">
    </div>
    ${eventsHTML}
  `;
  _startCountdownTimer();
  _loadAnnTeraz();
}

async function _loadAnnTeraz() {
  const slot = document.getElementById('ann-teraz-slot');
  if (!slot) return;
  try {
    const r = await fetch(`${ANN_PB}/api/collections/${ANN_COL}/records?sort=-created&perPage=1`);
    if (!r.ok) return;
    const d = await r.json();
    const ann = d.items?.[0];
    if (!ann) return;

    if (localStorage.getItem(`cien_ann_dismissed_${ann.id}`)) return;

    const TYPE_META = {
      urgent:  { border: '#E05C5C', bg: 'rgba(224,92,92,0.1)',        icon: '🚨', label: 'PILNE' },
      warning: { border: '#C9A84C', bg: 'rgba(201,168,76,0.1)',        icon: '⚠️', label: 'UWAGA' },
      info:    { border: 'rgba(201,168,76,0.35)', bg: 'rgba(201,168,76,0.06)', icon: '📢', label: 'INFO' },
    };
    const m  = TYPE_META[ann.type] || TYPE_META.info;
    const ts = new Date(ann.created).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const lastSeen = localStorage.getItem('cien_ann_last_seen') || '';
    const isNew = lastSeen && ann.id > lastSeen;
    const annId  = escHtml(ann.id);

    slot.innerHTML = `
      <div class="ann-teraz-card" style="border-left-color:${m.border};background:${m.bg}" id="ann-teraz-${annId}">
        <div class="ann-teraz-top">
          <span class="ann-teraz-badge" style="background:${m.border}">${m.icon} ${m.label}</span>
          ${isNew ? '<span class="ann-teraz-new">NOWE</span>' : ''}
          <button class="ann-teraz-dismiss" data-ann-id="${annId}" onclick="_dismissAnnTeraz(this.dataset.annId)">✕</button>
        </div>
        <div class="ann-teraz-title">${escHtml(ann.title)}</div>
        ${ann.body ? `<div class="ann-teraz-body">${escHtml(ann.body)}</div>` : ''}
        <div class="ann-teraz-footer">
          <span class="ann-teraz-ts">${ts}</span>
          <button class="ann-teraz-more" onclick="navigateTo('info')">Wszystkie →</button>
        </div>
      </div>`;

    localStorage.setItem('cien_ann_last_seen', ann.id);
  } catch {}
}

function _dismissAnnTeraz(id) {
  localStorage.setItem(`cien_ann_dismissed_${id}`, '1');
  const card = document.getElementById(`ann-teraz-${id}`);
  if (card) card.remove();
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
    // Za chwilę — kolejne 2-3 wydarzenia ze wszystkich stref, tylko dzisiaj
    const todayStr = now.toISOString().slice(0, 10);
    const upcoming = allEvents
      .filter(ev => new Date(ev.start) > now && ev.start.startsWith(todayStr))
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


function renderEventsList(events) {
  if (events.length === 0) {
    return `<div class="text-muted italic" style="padding:1rem 0;text-align:center">Brak wydarzeń dla wybranych filtrów</div>`;
  }

  const now = new Date();
  let lastSlot = null;
  const parts = [];

  events.forEach(ev => {
    const slot = ev.start.slice(11, 16); // HH:MM
    if (slot !== lastSlot) {
      parts.push(`<div class="time-separator"><span>${slot}</span></div>`);
      lastSlot = slot;
    }

    const isNow = now >= new Date(ev.start) && now <= new Date(ev.end);
    const isPast = now > new Date(ev.end);
    const isFav = getFavorites().includes(ev.id);
    const zone = (State.data?.festival?.zones || []).find(z => z.id === ev.zone) || {};
    const color = zone.color || ZONES_MAP[ev.zone]?.color || '#888';
    const icon = zone.icon || ZONES_MAP[ev.zone]?.icon || '●';

    let progressBar = '';
    if (isNow) {
      const totalMs = new Date(ev.end) - new Date(ev.start);
      const elapsed = now - new Date(ev.start);
      const pct = Math.min(100, Math.round((elapsed / totalMs) * 100));
      progressBar = `<div class="event-progress"><div class="event-progress-fill" style="width:${pct}%"></div></div>`;
    }

    parts.push(`
      <div class="event-card ${isNow ? 'is-now' : ''} ${isPast ? 'is-past' : ''} ${isFav ? 'is-fav' : ''}"
           style="border-left-color:${color}"
           onclick="openEventModal('${ev.id}')">
        ${progressBar}
        <div class="event-time">
          ${isNow ? '<span class="live-dot" title="Teraz">●</span> ' : ''}${formatTime(ev.start)} <span class="event-duration">→ ${formatTime(ev.end)} (${getDuration(ev.start, ev.end)})</span>
        </div>
        <div class="event-title">${ev.title}</div>
        ${ev.artist ? `<div class="event-artist">${ev.artist}</div>` : ''}
        <div class="event-zone-tag" style="color:${color}">${icon} ${zone.shortName || zone.name || ev.zone}</div>
        <button class="fav-btn ${isFav ? 'active' : ''}"
                onclick="event.stopPropagation();toggleFavorite('${ev.id}')"
                title="${isFav ? 'Usuń z Mojego Planu' : 'Dodaj do Mojego Planu'}">
          ${isFav ? '★' : '☆'}
        </button>
      </div>`);
  });

  return parts.join('');
}

function setActiveDay(day) {
  State.schedule.activeDay = day;
  renderSchedule();
  updateHeader();
  document.getElementById('schedule-content')?.scrollTo({ top: 0 });
}

function setActiveZone(zone) {
  State.schedule.activeZone = zone;
  State.schedule.showFavOnly = false;
  renderSchedule();
}

function setFavOnly(val) {
  State.schedule.showFavOnly = val;
  if (val) State.schedule.activeZone = 'all';
  State.schedule.searchQuery = '';
  renderSchedule();
}

let _scheduleSearchTimer = null;
function scheduleSearch(q) {
  State.schedule.searchQuery = q;
  clearTimeout(_scheduleSearchTimer);
  _scheduleSearchTimer = setTimeout(renderSchedule, 250);
}

// ============================================
// EVENT MODAL
// ============================================

function openEventModal(eventId) {
  const ev = (State.data?.events || []).find(e => e.id === eventId);
  if (!ev) return;
  history.pushState({ overlay: 'event' }, '');

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

  const actionsEl = document.getElementById('modal-actions');
  if (actionsEl) {
    const isFav = getFavorites().includes(ev.id);
    actionsEl.innerHTML = `
      <button class="modal-action-btn fav-btn ${isFav ? 'is-fav' : ''}" onclick="toggleFavorite('${ev.id}'); this.classList.toggle('is-fav'); this.textContent = this.classList.contains('is-fav') ? '★ W Moim Planie' : '☆ Dodaj do Planu'">
        ${isFav ? '★ W Moim Planie' : '☆ Dodaj do Planu'}
      </button>
      <div class="modal-action-row">
        <button class="modal-action-sm" onclick="shareEvent('${ev.id}')">↗ Udostępnij</button>
        <button class="modal-action-sm" onclick="addToCalendar('${ev.id}')">📅 Kalendarze</button>
      </div>`;
  }

  modal.querySelector('.modal-overlay').classList.add('open');
}

function shareEvent(eventId) {
  const ev = (State.data?.events || []).find(e => e.id === eventId);
  if (!ev) return;
  const text = `${ev.title}${ev.artist ? ` — ${ev.artist}` : ''}\n${formatTime(ev.start)}–${formatTime(ev.end)} · Cień Festiwal 3–5 VII 2026`;
  if (navigator.share) {
    navigator.share({ title: ev.title, text, url: 'https://app.cienfestiwal.com' }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => showToast('Skopiowano do schowka'));
  }
}

function shareApp() {
  const url = 'https://app.cienfestiwal.com';
  if (navigator.share) {
    navigator.share({ title: 'CIEŃ Festiwal 2026', text: 'Masz bilet na Cień? Pobierz aplikację uczestnika 📱', url }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(url).then(() => showToast('Link skopiowany!')).catch(() => showToast(url));
  }
}

function addToCalendar(eventId) {
  const ev = (State.data?.events || []).find(e => e.id === eventId);
  if (!ev) return;
  // Convert ISO 2026-07-03T12:00:00 → 20260703T120000
  const toICS = iso => iso.replace(/-/g, '').replace(/:/g, '').replace('T', 'T');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0',
    'PRODID:-//CIEŃ Festiwal//App//PL',
    'X-WR-CALNAME:CIEŃ Festiwal 2026',
    'BEGIN:VEVENT',
    `UID:${ev.id}@cienfestiwal.com`,
    `DTSTART;TZID=Europe/Warsaw:${toICS(ev.start)}`,
    `DTEND;TZID=Europe/Warsaw:${toICS(ev.end)}`,
    `SUMMARY:${ev.title}${ev.artist ? ` — ${ev.artist}` : ''}`,
    `DESCRIPTION:${(ev.description || '').replace(/[\n\r]/g, '\\n')}`,
    'LOCATION:Zamek Świny\\, Świny\\, Bolków\\, Polska',
    'GEO:50.8561;16.0464',
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `cien-${ev.id}.ics`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📅 Plik .ics pobrany');
}

function closeEventModal() {
  document.querySelector('.modal-overlay').classList.remove('open');
}

// ============================================
// VIEW: MAPA
// ============================================

const MAP_LEGEND = [
  { color: '#E05C1A', icon: '⚡', name: 'Scena UMBRA' },
  { color: '#4A6FA5', icon: '☯',  name: 'Wieża Anima / Animus' },
  { color: '#7B3F82', icon: '🌀', name: 'Wieża Podświadomości' },
  { color: '#C9A84C', icon: '🔥', name: 'Pawilon SACRUM' },
  { color: '#2D7D46', icon: '🎬', name: 'Kino Gnoza' },
  { color: '#8B4513', icon: '🕯',  name: 'Lochy' },
];

function renderMap() {
  const container = document.getElementById('map-content');
  if (!container || !State.data) return;

  const pois = State.data.pois || [];

  const poiTypes  = ['all', 'food', 'water', 'toilet', 'help', 'info'];
  const poiLabels = { all:'Wszystko', food:'🍲 GastroPhase', water:'💧 Woda', toilet:'🚻 Toalety', help:'🛡 Pomoc', info:'ℹ Info' };

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

  const legendHTML = MAP_LEGEND.map(z =>
    `<div class="map-legend-item">
      <div class="map-legend-dot" style="background:${z.color}"></div>
      <span class="map-legend-name">${z.icon} ${z.name}</span>
    </div>`
  ).join('');

  const mapAreaHTML = `<div class="castle-map-wrap">
      ${_buildCastleSVG()}
     </div>
     <div class="map-legend">${legendHTML}</div>`;

  container.innerHTML = `
    <div class="map-view-toggle" id="map-view-toggle">
      <button class="map-toggle-btn active" id="map-btn-svg">🗺 Mapa stref</button>
      <button class="map-toggle-btn" id="map-btn-3d" onclick="openMap3D()">🏰 Widok 3D ↗</button>
    </div>
    ${mapAreaHTML}
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
  document.getElementById('map-btn-svg')?.classList.remove('active');
  document.getElementById('map-btn-3d')?.classList.add('active');
}

function closeMap3D() {
  const overlay = document.getElementById('map3d-overlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
  document.getElementById('map-btn-svg')?.classList.add('active');
  document.getElementById('map-btn-3d')?.classList.remove('active');
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
  const actionsEl = document.getElementById('modal-actions');
  if (actionsEl) actionsEl.innerHTML = '';
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
  if (!State.journal.cachedPrompts[stage]) {
    State.journal.cachedPrompts[stage] = prompts[Math.floor(Math.random() * prompts.length)] || '';
  }
  const prompt = State.journal.cachedPrompts[stage];

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
    <div class="journal-privacy-note">🔒 Dziennik jest prywatny — zapisuje się tylko na Twoim urządzeniu i nigdy nie opuszcza telefonu.</div>
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
      <button class="btn btn-outline" onclick="emailJournalEntry('${stage}')">✉ Ten wpis</button>
      <button class="btn btn-outline" onclick="emailAllJournalEntries()">✉ Wszystkie</button>
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

function emailAllJournalEntries() {
  const entries = getJournalEntries().filter(e => e.text);
  if (!entries.length) { showToast('Brak wpisów do wysłania'); return; }
  const stageOrder = ['nigredo', 'albedo', 'rubedo'];
  const sorted = [...entries].sort((a, b) => stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage));
  const body = sorted.map(e => `=== ${e.stage.toUpperCase()} (${e.savedAt}) ===\n\n${e.text}`).join('\n\n\n');
  const subject = encodeURIComponent('CIEŃ Festiwal 2026 — Dziennik przemiany');
  window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`;
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
  <div style="display:flex;gap:0.5rem;margin-top:0.5rem">
    <button class="btn btn-outline" style="flex:1;font-size:0.78rem;padding:0.45rem 0.5rem"
      onclick="sharePlan('${area.id}')">📤 Zapisz / Wyślij</button>
    <button class="btn btn-gold" style="flex:1;font-size:0.78rem;padding:0.45rem 0.5rem"
      onclick="aiCustomizePlan('${area.id}')">✨ Generuj plan</button>
  </div>`;
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

function _buildPlanText(area, plan) {
  const lines = [
    `CIEŃ Festiwal 2026 — Plan integracji`,
    `Obszar: ${area.name}`,
    `Wygenerowano: ${plan.createdAt || ''}`,
    ``,
    `⚡ TERAZ (ten tydzień)`,
    ...(plan.teraz || []).map((x, i) => `${i+1}. ${x}`),
    ``,
    `🔄 REGULARNIE (co tydzień)`,
    ...(plan.regularnie || []).map((x, i) => `${i+1}. ${x}`),
    ``,
    `🌟 ZA ROK`,
    plan.rok || '—',
  ];
  return lines.join('\n');
}

async function sharePlan(areaId) {
  const wd = getWheelData();
  const plan = wd.plans && wd.plans[areaId];
  if (!plan) { showToast('Brak planu — najpierw go wygeneruj'); return; }
  const area = WHEEL_AREAS.find(a => a.id === areaId);
  const text = _buildPlanText(area, plan);
  const title = `Plan integracji — ${area.name} · CIEŃ 2026`;

  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  // fallback: mailto
  const mailto = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`;
  window.open(mailto);
}

async function aiCustomizePlan(areaId) {
  const wd = getWheelData();
  const plan = wd.plans && wd.plans[areaId];
  if (!plan) { showToast('Brak planu — najpierw go wygeneruj'); return; }
  const area = WHEEL_AREAS.find(a => a.id === areaId);
  const answers = (wd.answers || {})[areaId] || [];
  const score = answers.length ? Math.round(answers.reduce((s,v)=>s+(v||0),0)/answers.length*10)/10 : null;

  const journalEntries = (() => {
    try { return JSON.parse(localStorage.getItem('cien_journal_2026') || '[]'); } catch { return []; }
  })();
  const journalSnippet = journalEntries.slice(0, 3).map(e =>
    `[${e.stage || ''}] ${(e.answers || []).filter(Boolean).slice(0,2).join(' / ')}`
  ).filter(Boolean).join('\n');

  const wheelScores = WHEEL_AREAS.map(a => {
    const ans = (wd.answers || {})[a.id] || [];
    const avg = ans.length ? (ans.reduce((s,v)=>s+(v||0),0)/ans.length).toFixed(1) : '?';
    return `${a.name}: ${avg}/5`;
  }).join(', ');

  _showAIPlanModal(area, null); // loading state

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    const resp = await fetch('/.netlify/functions/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        areaName: area.name,
        score,
        wheelScores,
        planTeraz: (plan.teraz || []).join('; '),
        planRegularnie: (plan.regularnie || []).join('; '),
        planRok: plan.rok || '',
        journalSnippet,
      }),
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`Błąd serwera (${resp.status})`);
    const data = await resp.json();
    if (data.error) throw new Error(data.error);
    _showAIPlanModal(area, data.plan);
  } catch (e) {
    const msg = e.name === 'AbortError' ? 'Przekroczono czas — spróbuj ponownie' : (e.message || 'Spróbuj ponownie');
    _showAIPlanModal(area, null, msg);
  }
}

function _showAIPlanModal(area, planText, errorMsg) {
  const existing = document.getElementById('ai-plan-modal');
  if (existing) existing.remove();

  const content = errorMsg
    ? `<div class="aipm-error">⚠️ ${errorMsg}</div>`
    : planText === null
    ? `<div class="aipm-loading"><div class="aipm-spinner"></div><div>Generuję plan dla <strong>${escHtml(area.name)}</strong>…</div></div>`
    : `<div class="aipm-result">${planText.replace(/^## (.+)$/gm, '<div class="aipm-section-title">$1</div>').replace(/^• (.+)$/gm, '<div class="aipm-item">• $1</div>').replace(/\n/g, '<br>')}</div>`;

  const shareBtn = planText ? `<button class="btn btn-outline" style="flex:0 0 auto;font-size:0.8rem" onclick="
    navigator.share ? navigator.share({title:'Plan AI — ${escHtml(area.name)}',text:document.querySelector('#ai-plan-modal .aipm-result')?.innerText||''}) : showToast('Udostępnianie niedostępne')
  ">📤</button>` : '';

  const m = document.createElement('div');
  m.id = 'ai-plan-modal';
  m.innerHTML = `
    <div class="aipm-inner">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem">
        <div class="aipm-title">🤖 Plan AI — ${escHtml(area.name)}</div>
        <button class="btn btn-outline" style="flex:0 0 auto;padding:0.3rem 0.6rem;font-size:0.8rem" onclick="document.getElementById('ai-plan-modal').remove()">✕</button>
      </div>
      ${content}
      ${planText ? `<div style="display:flex;gap:0.5rem;margin-top:0.75rem">${shareBtn}<button class="btn btn-gold" style="flex:1;font-size:0.82rem" onclick="document.getElementById('ai-plan-modal').remove()">Zamknij</button></div>` : ''}
    </div>`;
  m.onclick = e => { if (e.target === m) m.remove(); };
  document.body.appendChild(m);
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

  return `<div class="wheel-results-header">
    <div class="wheel-results-title">Twoje koło życia</div>
    <div class="wheel-results-avg">Średnia: <strong>${avg}/10</strong></div>
  </div>
  <div class="wheel-chart-wrap"><canvas id="wheel-chart"></canvas></div>
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
  ctx.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    const midA = startOff + i * sectorAngle + sectorAngle / 2;
    const lr = radius + 16;
    const lx = cx + lr * Math.cos(midA);
    const ly = cy + lr * Math.sin(midA);
    const cosA = Math.cos(midA);
    ctx.textAlign = cosA > 0.4 ? 'right' : cosA < -0.4 ? 'left' : 'center';
    ctx.fillStyle = WHEEL_AREAS[i].color;
    ctx.font = `bold 10px 'Helvetica Neue', Arial, sans-serif`;
    ctx.fillText(WHEEL_AREAS[i].shortName, lx, ly);

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
      <div class="sacrum-hero-sub">PsyCare · Pt–Sb 19:00–04:00 · Strefa SACRUM</div>
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
          Strefa SACRUM — Śródzamcze.<br>
          <strong>Piątek i sobota, godz. 19:00–04:00.</strong><br>
          Dyżuruje team PsyCare — wsparcie emocjonalne, harm reduction, pierwsza pomoc psychologiczna.
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

    <div class="sacrum-disclaimer">
      <div class="sacrum-disclaimer-title">Ważna informacja</div>
      <p>Cień Festiwal jest wydarzeniem kulturalnym i edukacyjnym. Organizatorzy <strong>nie zachęcają do przyjmowania żadnych substancji psychoaktywnych</strong>, w tym substancji nielegalnych na terenie Rzeczypospolitej Polskiej.</p>
      <p>Punkt SACRUM prowadzi wyłącznie działalność z zakresu <strong>psychoedukacji, wsparcia emocjonalnego i redukcji szkód</strong> — rozumianej jako neutralna i nieoceniająca informacja o bezpieczeństwie psychicznym. Nie świadczymy usług medycznych ani nie udzielamy porad lekarskich.</p>
      <p>Zachęcamy wszystkich uczestników do <strong>pełnego przeżywania festiwalu w stanie trzeźwości</strong> — wiele osób odkrywa, że odmienne stany świadomości są dostępne bez substancji: przez ruch, oddech, medytację, muzykę i kontakt z innymi.</p>
      <p>Jeśli znajdziesz się lub będziesz świadkiem trudnego stanu emocjonalnego lub psychicznego — niezależnie od przyczyny — nasz team jest dostępny. Zapewniamy przestrzeń bez oceniania i bez zadawania zbędnych pytań. W sytuacji zagrożenia zdrowia lub życia wzywamy pomoc medyczną (112).</p>
      <div class="sacrum-disclaimer-legal">Działalność punktu SACRUM nie stanowi świadczenia usług zdrowotnych w rozumieniu ustawy o działalności leczniczej z dnia 15 kwietnia 2011 r. (Dz.U. 2011 nr 112 poz. 654 ze zm.). Wsparcie emocjonalne i psychoedukacja prowadzone są przez osoby posiadające kwalifikacje z zakresu psychologii i psychoterapii, wyłącznie na zasadach dobrowolności i na wniosek uczestnika.</div>
    </div>
  `;
}

function callHelp() {
  const modal = document.getElementById('event-modal');
  modal.querySelector('.modal-zone-badge').style.color = '#FF4444';
  modal.querySelector('.modal-zone-badge').innerHTML = '🚨 POMOC';
  modal.querySelector('.modal-title').textContent = 'Potrzebujesz pomocy?';
  modal.querySelector('.modal-artist').style.display = 'none';
  modal.querySelector('.modal-time').innerHTML = '📍 Strefa SACRUM — Śródzamcze · Pt–Sb 19:00–04:00';
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

// ---- NEWS FEED ----
const ANN_PB   = '/pb';
const ANN_COL  = 'cien_announcements';
const PUSH_COL = 'cien_push_subs';
const VAPID_PUBLIC_KEY = 'BOwqgma2codWLDw8kCO6aSpSVIGBQxA0d5fMGRvthDbqVdPInyHeRm9L1X6VZtIaVA3j9mqnWpZe91YlrUiylJo';

let _annAdminMode = false;
let _annAdminPin = null;
let _annHeaderTaps = 0;
let _annHeaderTapTimer = null;

async function _annTapHeader() {
  _annHeaderTaps++;
  clearTimeout(_annHeaderTapTimer);
  _annHeaderTapTimer = setTimeout(() => { _annHeaderTaps = 0; }, 2000);
  if (_annHeaderTaps >= 5) {
    _annHeaderTaps = 0;
    const pin = prompt('PIN admina:');
    if (!pin) return;
    // Weryfikacja przez serwer — PIN nie jest w source code
    try {
      const r = await fetch('/.netlify/functions/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, action: 'verify' }),
      });
      if (r.ok) {
        _annAdminPin = pin;
        _annAdminMode = true;
        renderInfo();
        showToast('Tryb admina aktywny');
      } else {
        showToast('Nieprawidłowy PIN');
      }
    } catch { showToast('Błąd połączenia'); }
  }
}

async function annPost(e) {
  e.preventDefault();
  const title = document.getElementById('ann-title-in')?.value?.trim();
  const body  = document.getElementById('ann-body-in')?.value?.trim();
  const type  = document.getElementById('ann-type-in')?.value || 'info';
  if (!title) return;
  const btn = e.submitter || document.querySelector('#ann-form button[type=submit]');
  if (btn) btn.disabled = true;
  try {
    await fetch(`${ANN_PB}/api/collections/${ANN_COL}/records`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ title, body: body||'', type }),
    });
    showToast('✓ Ogłoszenie dodane');
    document.getElementById('ann-title-in').value = '';
    document.getElementById('ann-body-in').value  = '';
    _loadAnnouncements();
  } catch { showToast('Błąd zapisu'); }
  finally { if (btn) btn.disabled = false; }
}

async function annSendPush() {
  const title = document.getElementById('ann-title-in')?.value?.trim();
  const message = document.getElementById('ann-body-in')?.value?.trim() || '';
  if (!title) { showToast('Wpisz tytuł ogłoszenia'); return; }
  if (!_annAdminPin) { showToast('Brak tokenu admina — zaloguj się ponownie'); return; }
  const statusEl = document.getElementById('ann-push-status');
  if (statusEl) statusEl.textContent = 'Wysyłanie...';
  try {
    const r = await fetch('/.netlify/functions/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: _annAdminPin, title, message }),
    });
    const data = await r.json();
    if (!r.ok) {
      if (statusEl) statusEl.textContent = '✗ ' + (data.error || 'Błąd');
      showToast('Błąd: ' + (data.error || r.status));
    } else {
      if (statusEl) statusEl.textContent = `✓ Wysłano do ${data.sent} urządzeń (${data.failed} błędów)`;
      showToast(`🔔 Push wysłany do ${data.sent} urządzeń`);
    }
  } catch (e) {
    if (statusEl) statusEl.textContent = '✗ Błąd połączenia';
    showToast('Błąd: ' + e.message);
  }
}

async function annDelete(id) {
  if (!confirm('Usunąć ogłoszenie?')) return;
  await fetch(`${ANN_PB}/api/collections/${ANN_COL}/records/${id}`, { method: 'DELETE' });
  _loadAnnouncements();
}

async function _loadAnnouncements() {
  const el = document.getElementById('ann-list');
  if (!el) return;
  try {
    const r = await fetch(`${ANN_PB}/api/collections/${ANN_COL}/records?sort=-created&perPage=20`);
    const d = await r.json();
    const items = d.items || [];
    const lastSeen = localStorage.getItem('cien_ann_last_seen') || '';
    if (items.length) localStorage.setItem('cien_ann_last_seen', items[0].id);

    if (!items.length) {
      el.innerHTML = `<div style="padding:1rem;color:var(--szary);font-size:0.85rem;text-align:center">Brak ogłoszeń</div>`;
      return;
    }
    const TYPE_META = {
      urgent: { icon:'🚨', color:'#E05C5C', label:'PILNE' },
      warning:{ icon:'⚠️', color:'#C9A84C', label:'UWAGA' },
      info:   { icon:'📢', color:'var(--zloto-2)', label:'INFO' },
    };
    el.innerHTML = items.map(a => {
      const m = TYPE_META[a.type] || TYPE_META.info;
      const isNew = lastSeen && a.id > lastSeen ? '<span style="background:#E05C5C;color:#fff;font-size:0.6rem;padding:0.1rem 0.4rem;border-radius:8px;margin-left:0.4rem;vertical-align:middle">NOWE</span>' : '';
      const ts = new Date(a.created).toLocaleString('pl-PL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
      return `<div class="ann-item ann-${a.type||'info'}">
        <div class="ann-header">
          <span class="ann-icon">${m.icon}</span>
          <span class="ann-title">${escHtml(a.title)}${isNew}</span>
          ${_annAdminMode ? `<button class="ann-del" onclick="annDelete('${a.id}')">✕</button>` : ''}
        </div>
        ${a.body ? `<div class="ann-body">${escHtml(a.body)}</div>` : ''}
        <div class="ann-ts">${ts}</div>
      </div>`;
    }).join('');
  } catch {
    el.innerHTML = `<div style="padding:1rem;color:var(--szary);font-size:0.85rem">Brak połączenia</div>`;
  }
}

function _urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function subscribePush() {
  const btn = document.getElementById('push-sub-btn');
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    showToast('Push nie jest obsługiwany w tej przeglądarce'); return;
  }
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { showToast('Powiadomienia zablokowane — zmień w ustawieniach'); return; }
    const reg  = await navigator.serviceWorker.ready;
    const sub  = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: _urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    const j = sub.toJSON();
    await fetch(`${ANN_PB}/api/collections/${PUSH_COL}/records`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ uid: getSDUid(), endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }),
    });
    localStorage.setItem('cien_push_subscribed', '1');
    if (btn) { btn.textContent = '🔔 Powiadomienia aktywne'; btn.disabled = true; }
    showToast('🔔 Powiadomienia włączone!');
  } catch (e) { showToast('Błąd: ' + e.message); }
}

function renderInfo() {
  const container = document.getElementById('info-content');
  if (!container) return;
  const pushSub = localStorage.getItem('cien_push_subscribed');

  container.innerHTML = `
    <div class="ann-section">
      <div class="ann-section-header" onclick="_annTapHeader()">
        <span>📢 Ogłoszenia organizatorów</span>
        ${!pushSub ? `<button class="ann-push-btn" id="push-sub-btn" onclick="subscribePush();event.stopPropagation()">🔔 Powiadomienia</button>` : `<span style="color:var(--szary);font-size:0.75rem">🔔 aktywne</span>`}
      </div>
      <div id="ann-list"><div style="padding:1rem;color:var(--szary);font-size:0.85rem;text-align:center">Ładowanie...</div></div>
    </div>

    ${_annAdminMode ? `
    <div class="ann-admin-panel">
      <div class="ann-admin-title">⚙️ Panel admina</div>
      <form id="ann-form" onsubmit="annPost(event)">
        <input class="sd-input" id="ann-title-in" placeholder="Tytuł ogłoszenia" required maxlength="120">
        <textarea class="sd-input" id="ann-body-in" placeholder="Treść (opcjonalnie)" maxlength="1000" rows="3" style="resize:vertical;margin-top:0.5rem"></textarea>
        <select class="sd-input" id="ann-type-in" style="margin-top:0.5rem">
          <option value="info">📢 Info</option>
          <option value="warning">⚠️ Uwaga</option>
          <option value="urgent">🚨 Pilne</option>
        </select>
        <div style="display:flex;gap:0.5rem;margin-top:0.75rem">
          <button type="submit" class="btn btn-gold" style="flex:1">Opublikuj</button>
          <button type="button" class="btn" style="flex:0 0 auto;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);color:var(--pergamin);border-radius:10px;padding:0 1rem;font-size:0.85rem" onclick="annSendPush()">🔔 Push</button>
        </div>
      </form>
      <div id="ann-push-status" style="font-size:0.8rem;color:var(--szary);margin-top:0.4rem;min-height:1.2em"></div>
      <button class="btn-burgund" style="margin-top:0.5rem;width:100%" onclick="_annAdminMode=false;_annAdminPin=null;renderInfo()">Wyjdź z trybu admina</button>
    </div>` : ''}

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
  _loadAnnouncements();
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
  history.pushState({ overlay: 'article' }, '');

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
  const isStandalone = window.navigator.standalone === true ||
                       window.matchMedia('(display-mode: standalone)').matches;
  if (isStandalone) return;

  const isIOS = /iP(hone|ad|od)/i.test(navigator.userAgent) && !window.MSStream;

  if (isIOS) {
    return;
  }

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installPromptEvent = e;
    const banner = document.getElementById('install-banner');
    if (banner) banner.classList.add('show');
  });
}

function showInstallGuide(platform) {
  const isIOS = platform === 'ios' || /iP(hone|ad|od)/i.test(navigator.userAgent);
  const steps = isIOS
    ? [
        ['⬆', 'Kliknij ikonę <strong>Udostępnij</strong> na dole Safari'],
        ['➕', 'Wybierz <strong>„Dodaj do ekranu głównego"</strong>'],
        ['✓',  'Kliknij <strong>„Dodaj"</strong> w prawym górnym rogu'],
      ]
    : [
        ['⋮',  'Otwórz menu przeglądarki (trzy kropki)'],
        ['📱', 'Wybierz <strong>„Dodaj do ekranu głównego"</strong>'],
        ['✓',  'Kliknij <strong>„Zainstaluj"</strong>'],
      ];

  const stepsEl = document.getElementById('install-guide-steps');
  if (stepsEl) {
    stepsEl.innerHTML = steps.map(([icon, text], i) =>
      `<div class="install-guide-step">
        <span class="install-guide-step-num">${i + 1}</span>
        <span class="install-guide-step-text">${text}</span>
      </div>`
    ).join('');
  }

  const cta = document.getElementById('install-guide-cta');
  if (cta) cta.style.display = (!isIOS && installPromptEvent) ? 'block' : 'none';

  const guide = document.getElementById('install-guide');
  if (guide) guide.classList.add('show');
}

function dismissInstallModal() {
  const guide = document.getElementById('install-guide');
  if (guide) guide.classList.remove('show');
  localStorage.setItem('cien_install_dismissed', '1');
}

function triggerInstall() {
  if (!installPromptEvent) return;
  installPromptEvent.prompt();
  installPromptEvent.userChoice.then(() => {
    installPromptEvent = null;
    dismissInstall();
    dismissInstallModal();
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
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    // Reload page when new SW takes over — ensures fresh app.js on every update
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());

    // If a new SW is waiting, send it a skip-waiting message immediately
    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      }
    });
  }).catch(console.error);
}

// ============================================
// VIEW: SLOW DATING (v2 — swipe deck + PocketBase)
// PocketBase collections needed (public List/View/Create):
//   cien_sd_profiles: uid, nick, about, tags, emoji
//   cien_sd_likes:    from_uid, to_uid
// ============================================

const SD_TAGS = [
  'Psychodeliki', 'Hipnoza', 'Jung', 'Taniec', 'Muzyka', 'Psychologia',
  'Buddyzm', 'Sztuka', 'Natura', 'Medytacja', 'Trauma', 'NVC',
  'Filozofia', 'Ruch', 'Dźwięk', 'Integracja'
];

const SD_EMOJIS = ['💫','🌙','☀️','🌊','🔥','🌿','⚡','🦋','🌸','🐺'];

const SD_PB = '/pb';
const SD_COL_PROFILES = 'cien_sd_profiles';
const SD_COL_LIKES    = 'cien_sd_likes';

let _sdTab    = 'odkryj';
let _sdDeck   = [];
let _sdDeckOk = false;

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

function getSDUid() {
  let uid = localStorage.getItem('cien_user_id');
  if (!uid) {
    uid = 'u_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem('cien_user_id', uid);
  }
  return uid;
}

function getSDSeen() {
  try { return new Set(JSON.parse(localStorage.getItem('cien_sd_seen_2026') || '[]')); }
  catch { return new Set(); }
}

function addSDSeen(uid) {
  const seen = getSDSeen();
  seen.add(uid);
  localStorage.setItem('cien_sd_seen_2026', JSON.stringify([...seen]));
}

function _sdParseTags(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

// ---- main render ----

function renderSlowDating() {
  const container = document.getElementById('slowdating-content');
  if (!container) return;

  if (!localStorage.getItem('cien_sd_consent_v1')) {
    container.innerHTML = `
      <div class="sd-consent-screen">
        <div class="sd-consent-title">💘 Slow Dating</div>
        <div class="sd-consent-subtitle">Jak to działa?</div>
        <div class="sd-consent-points">
          <div class="sd-consent-point">👤 Twój profil (nick, zdjęcie, opis, tagi) jest widoczny dla wszystkich zalogowanych uczestników festiwalu</div>
          <div class="sd-consent-point">💘 Dopasowanie następuje gdy oboje się polubiecie — tylko wtedy widzicie się nawzajem</div>
          <div class="sd-consent-point">🗑 Profile są trwale kasowane 30 dni po zakończeniu festiwalu (5 VIII 2026)</div>
        </div>
        <button class="btn btn-gold" style="width:100%;margin-top:1rem" onclick="localStorage.setItem('cien_sd_consent_v1','1');renderSlowDating()">Rozumiem i dołączam →</button>
        <button class="dating-btn-text" style="margin-top:0.75rem" onclick="navigateTo('teraz')">Nie chcę brać udziału</button>
        <div class="sd-consent-fine-print">Administratorem danych jest Sacrum sp. z o.o., ul. Klaudyny 34c, 01-684 Warszawa. Podstawa prawna: zgoda (art. 6 ust. 1 lit. a RODO). Możesz wycofać zgodę usuwając profil w zakładce Moja karta.</div>
      </div>`;
    return;
  }

  const profile = getSDProfile();
  const emoji   = profile.emoji || '💘';
  const nick    = profile.nick  || '';
  container.innerHTML = `
    <div class="dating-user-bar">
      <div class="dating-user-avatar">${emoji}</div>
      <div class="dating-user-name">${nick ? escHtml(nick) : '<span style="color:var(--szary)">Uzupełnij profil</span>'}</div>
    </div>
    <div class="dating-tabs">
      <button class="dating-tab${_sdTab==='odkryj'?' active':''}" onclick="sdSetTab('odkryj')">Odkryj</button>
      <button class="dating-tab${_sdTab==='karta'?' active':''}" onclick="sdSetTab('karta')">Moja karta</button>
      <button class="dating-tab${_sdTab==='dopasowania'?' active':''}" onclick="sdSetTab('dopasowania')" id="sd-tab-match-btn">Dopasowania</button>
    </div>
    <div id="sd-tab-content" class="sd-tab-body"></div>`;
  _sdRenderTab();
}

function sdSetTab(tab) {
  _sdTab = tab;
  renderSlowDating();
}

function _sdRenderTab() {
  const el = document.getElementById('sd-tab-content');
  if (!el) return;
  if (_sdTab === 'odkryj')       _sdRenderDiscover(el);
  else if (_sdTab === 'karta')   _sdRenderCardForm(el);
  else                           _sdRenderMatches(el);
}

// ---- TAB: Odkryj ----

const _SD_DEMO = [
  { uid:'_demo1', nick:'Marta', about:'Psycholożka z Krakowa. Szukam rozmów o snach i cieniu.', tags:'["Jung","Psychologia","Medytacja"]', emoji:'🌙' },
  { uid:'_demo2', nick:'Kuba', about:'Muzykant i psychonauta. Gram, podróżuję, integruję.', tags:'["Muzyka","Psychodeliki","Integracja"]', emoji:'🎵' },
  { uid:'_demo3', nick:'Ania', about:'Terapeutka traumy. Tu po raz pierwszy.', tags:'["Trauma","NVC","Ruch"]', emoji:'🌿' },
  { uid:'_demo4', nick:'Maciek', about:'Reżyser dźwięku, miłośnik misek gongowych.', tags:'["Dźwięk","Buddyzm","Natura"]', emoji:'🔔' },
  { uid:'_demo5', nick:'Zuza', about:'Filozofka, doktorantka. Cień to mój ulubiony koncept.', tags:'["Filozofia","Jung","Sztuka"]', emoji:'⚡' },
];

function _sdRenderDiscover(el) {
  // Pokaż demo karty natychmiast — zero czekania
  _sdDeck = [..._SD_DEMO];
  el.innerHTML = `<div id="sd-deck-wrap"></div>`;
  _sdRenderDeck(document.getElementById('sd-deck-wrap'));
  // W tle sprawdź czy są prawdziwe profile i podmień
  _sdFetchReal();
}

async function _sdFetchReal() {
  const myUid = getSDUid();
  try {
    const res = await fetch(`${SD_PB}/api/collections/${SD_COL_PROFILES}/records?perPage=100&sort=-created`, { headers: {'Content-Type':'application/json'} });
    if (!res.ok) return;
    const data = await res.json();
    const seen = getSDSeen();
    const real = (data.items || []).filter(p => p.uid !== myUid && !seen.has(p.uid));
    if (!real.length) return;
    _sdDeck = real;
    const wrap = document.getElementById('sd-deck-wrap');
    if (wrap) _sdRenderDeck(wrap);
  } catch { /* zostają demo */ }
}

function _sdRenderDeck(wrap) {
  if (!wrap) return;
  if (_sdDeck.length === 0) {
    wrap.innerHTML = `
      <div style="padding:3rem 2rem;text-align:center">
        <div style="font-size:2.5rem;margin-bottom:1rem">✨</div>
        <div style="color:var(--pergamin);margin-bottom:0.5rem;font-family:var(--font-display)">Przeswipowałeś wszystkich!</div>
        <div style="color:var(--szary);font-size:0.85rem;line-height:1.5">Nowe profile pojawią się w dniu festiwalu.</div>
        <button class="btn-burgund" style="margin-top:1.25rem" onclick="localStorage.removeItem('cien_sd_seen_2026');_sdDeckOk=false;_sdRenderDiscover(document.getElementById('sd-tab-content'))">Zacznij od nowa</button>
      </div>`;
    return;
  }
  const total   = _sdDeck.length;
  const visible = _sdDeck.slice(0, 3);
  const cards   = visible.map((p, i) => {
    const tags    = _sdParseTags(p.tags);
    const scale   = 1 - i * 0.025;
    const yOff    = i * 7;
    const photoUrl = p.photoUrl || (p.photo ? `${SD_PB}/api/files/${p.collectionId}/${p.id}/${p.photo}?thumb=400x400` : '');
    const _gradients = [
      'linear-gradient(145deg,#1a1035 0%,#3d1a5c 60%,#1a2535 100%)',
      'linear-gradient(145deg,#0d2535 0%,#1a4a3a 60%,#2d1a10 100%)',
      'linear-gradient(145deg,#2d1a10 0%,#4a2d1a 60%,#1a1535 100%)',
      'linear-gradient(145deg,#1a2d10 0%,#2d4a1a 60%,#10251a 100%)',
      'linear-gradient(145deg,#10151a 0%,#1a2d40 60%,#2d1a3a 100%)',
    ];
    const gradIdx = p.uid ? p.uid.charCodeAt(p.uid.length - 1) % _gradients.length : i % _gradients.length;
    const bgStyle  = photoUrl
      ? `background-image:url(${photoUrl});background-size:cover;background-position:center 25%;`
      : `background:${_gradients[gradIdx]};`;
    const hintClass = (i === 0 && !localStorage.getItem('cien_sd_hinted')) ? ' swipe-hint' : '';
    return `<div class="dating-card${i===0?' is-top':''}${photoUrl?' has-photo':''}${hintClass}" data-uid="${escHtml(p.uid)}"
              style="transform:scale(${scale}) translateY(${yOff}px);z-index:${3-i};${bgStyle}">
      <div class="dating-card-overlay">
        <div class="dating-card-name">${escHtml(p.emoji||'💫')} ${escHtml(p.nick||'')}</div>
        ${p.about ? `<div class="dating-card-bio">${escHtml(p.about)}</div>` : ''}
        ${tags.length ? `<div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-top:0.5rem">${tags.map(t=>`<span class="sd-tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
      </div>
      <div class="dating-swipe-indicator left">NOPE</div>
      <div class="dating-swipe-indicator right">LIKE</div>
    </div>`;
  }).join('');
  wrap.innerHTML = `
    <div class="dating-deck-info">${total} profil${total===1?'':'e'} do odkrycia</div>
    <div class="dating-stack" id="sd-stack">${cards}</div>
    <div class="dating-actions">
      <button class="dating-action-btn dating-action-no"  onclick="sdSwipe('left')">✕</button>
      <button class="dating-action-btn dating-action-yes" onclick="sdSwipe('right')">♡</button>
    </div>`;
  _sdAttachSwipe();
}

function _sdAttachSwipe() {
  const card = document.querySelector('.dating-card.is-top');
  if (!card) return;
  let startX = 0, currX = 0, dragging = false;

  const onStart = (x) => { startX = currX = x; dragging = true; card.style.transition = 'none'; card.classList.remove('swipe-hint'); localStorage.setItem('cien_sd_hinted','1'); };
  const onMove  = (x) => {
    if (!dragging) return;
    currX = x;
    const dx  = currX - startX;
    const rot = dx * 0.07;
    card.style.transform = `translate(${dx}px,${Math.abs(dx)*0.04}px) rotate(${rot}deg)`;
    const pct = Math.min(1, Math.abs(dx) / 80);
    card.querySelector('.dating-swipe-indicator.left').style.opacity  = dx < 0 ? pct : 0;
    card.querySelector('.dating-swipe-indicator.right').style.opacity = dx > 0 ? pct : 0;
  };
  const onEnd = () => {
    if (!dragging) return;
    dragging = false;
    const dx = currX - startX;
    card.style.transition = 'transform 300ms ease';
    if (Math.abs(dx) > 75) {
      _sdFlyOut(card, dx > 0 ? 'right' : 'left');
    } else {
      card.style.transform = '';
      card.querySelectorAll('.dating-swipe-indicator').forEach(i => i.style.opacity = 0);
      setTimeout(() => { card.style.transition = ''; }, 300);
    }
  };

  card.addEventListener('touchstart', e => { e.stopPropagation(); onStart(e.touches[0].clientX); }, { passive: true });
  card.addEventListener('touchmove',  e => { e.preventDefault(); onMove(e.touches[0].clientX); },  { passive: false });
  card.addEventListener('touchend',   onEnd);

  const _mmove = e => onMove(e.clientX);
  const _mup   = () => { onEnd(); document.removeEventListener('mousemove', _mmove); document.removeEventListener('mouseup', _mup); };
  card.addEventListener('mousedown', e => { e.preventDefault(); onStart(e.clientX); document.addEventListener('mousemove', _mmove); document.addEventListener('mouseup', _mup); });
}

function sdSwipe(dir) {
  const card = document.querySelector('.dating-card.is-top');
  if (!card) return;
  card.style.transition = 'transform 300ms ease';
  _sdFlyOut(card, dir);
}

function _sdFlyOut(card, dir) {
  const x = dir === 'right' ? '130vw' : '-130vw';
  card.querySelector('.dating-swipe-indicator.' + (dir==='right'?'right':'left')).style.opacity = 1;
  card.style.transform = `translate(${x}, 15px) rotate(${dir==='right'?25:-25}deg)`;
  setTimeout(() => _sdHandleSwipe(dir), 320);
}

function _sdHandleSwipe(dir) {
  const top = _sdDeck[0];
  if (!top) return;
  addSDSeen(top.uid);
  _sdDeck.shift();
  if (dir === 'right') {
    _sdSendLike(top);
    if ('vibrate' in navigator) navigator.vibrate([15, 30, 15]);
  }
  const wrap = document.getElementById('sd-deck-wrap');
  if (wrap) _sdRenderDeck(wrap);
}

async function _sdSendLike(profile) {
  const toUid = typeof profile === 'string' ? profile : profile.uid;
  if (toUid.startsWith('_demo')) return;
  const profileObj = typeof profile === 'object' ? profile : { uid: toUid };
  const myUid = getSDUid();
  try {
    await fetch(`${SD_PB}/api/collections/${SD_COL_LIKES}/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_uid: myUid, to_uid: toUid }),
    });
    const check = await fetch(`${SD_PB}/api/collections/${SD_COL_LIKES}/records?filter=${encodeURIComponent(`from_uid='${toUid}'&&to_uid='${myUid}'`)}&perPage=1`, { headers:{'Content-Type':'application/json'} });
    const cd    = await check.json();
    if (cd.items && cd.items.length) showMatchModal(profileObj);
  } catch { /* offline */ }
}

async function _sdPushProfile(photoBlob) {
  const profile = getSDProfile();
  if (!profile.nick) return;
  const myUid = getSDUid();
  try {
    const chk  = await fetch(`${SD_PB}/api/collections/${SD_COL_PROFILES}/records?filter=${encodeURIComponent(`uid='${myUid}'`)}&perPage=1`, { headers:{'Content-Type':'application/json'} });
    const data = await chk.json();
    let body, headers;
    if (photoBlob) {
      const fd = new FormData();
      fd.append('uid',   myUid);
      fd.append('nick',  profile.nick);
      fd.append('about', profile.about || '');
      fd.append('tags',  JSON.stringify(profile.tags || []));
      fd.append('emoji', profile.emoji || '💫');
      fd.append('photo', photoBlob, 'photo.jpg');
      body = fd; headers = {};
    } else {
      body = JSON.stringify({ uid:myUid, nick:profile.nick, about:profile.about||'', tags:JSON.stringify(profile.tags||[]), emoji:profile.emoji||'💫' });
      headers = {'Content-Type':'application/json'};
    }
    if (data.items && data.items.length) {
      const existingId = data.items[0].id;
      await fetch(`${SD_PB}/api/collections/${SD_COL_PROFILES}/records/${existingId}`, { method:'PATCH', headers, body });
      const p2 = getSDProfile(); p2.pbId = existingId; saveSDProfile(p2);
    } else {
      const res = await fetch(`${SD_PB}/api/collections/${SD_COL_PROFILES}/records`, { method:'POST', headers, body });
      if (res.ok) { const created = await res.json(); const p2 = getSDProfile(); p2.pbId = created.id; saveSDProfile(p2); }
    }
    if (photoBlob) { window._sdPendingPhoto = null; localStorage.setItem('cien_sd_photo_pushed', 'true'); }
    _sdDeckOk = false;
  } catch { /* offline */ }
}

// ---- TAB: Dopasowania ----

async function _sdRenderMatches(el) {
  el.innerHTML = `<div style="padding:2.5rem;text-align:center;color:var(--szary)">Ładowanie...</div>`;
  const myUid = getSDUid();
  try {
    const [r1, r2] = await Promise.all([
      fetch(`${SD_PB}/api/collections/${SD_COL_LIKES}/records?filter=${encodeURIComponent(`from_uid='${myUid}'`)}&perPage=200`, {headers:{'Content-Type':'application/json'}}),
      fetch(`${SD_PB}/api/collections/${SD_COL_LIKES}/records?filter=${encodeURIComponent(`to_uid='${myUid}'`)}&perPage=200`,   {headers:{'Content-Type':'application/json'}}),
    ]);
    const iLiked   = new Set((await r1.json()).items?.map(l=>l.to_uid) || []);
    const likedMe  = new Set((await r2.json()).items?.map(l=>l.from_uid) || []);
    const matchUids= [...iLiked].filter(uid => likedMe.has(uid));
    if (!matchUids.length) {
      el.innerHTML = `<div style="padding:3rem 2rem;text-align:center">
        <div style="font-size:2.5rem;margin-bottom:1rem">🌙</div>
        <div style="color:var(--pergamin);margin-bottom:0.5rem;font-family:var(--font-display)">Brak dopasowań</div>
        <div style="color:var(--szary);font-size:0.85rem">Odkryj więcej profili — dopasowania pojawią się tu, gdy ktoś polubi Cię wzajemnie.</div></div>`;
      return;
    }
    const filter = matchUids.map(u => `uid='${u}'`).join('||');
    const pr = await fetch(`${SD_PB}/api/collections/${SD_COL_PROFILES}/records?filter=${encodeURIComponent(filter)}&perPage=100`, {headers:{'Content-Type':'application/json'}});
    const profiles = (await pr.json()).items || [];
    el.innerHTML = `<div class="dating-matches-list">${profiles.map(p=>{
      const photoUrl = p.photo && p.collectionId && p.id
        ? `${SD_PB}/api/files/${p.collectionId}/${p.id}/${p.photo}?thumb=80x80` : '';
      const avatarStyle = photoUrl
        ? `background-image:url(${photoUrl});background-size:cover;background-position:center;`
        : '';
      return `<div class="dating-match-item">
        <div class="dating-match-avatar" style="${avatarStyle}">${photoUrl ? '' : (p.emoji||'💫')}</div>
        <div style="flex:1;min-width:0">
          <div class="dating-match-name">${escHtml(p.nick||'')}</div>
          <div class="dating-match-last">${escHtml(p.about||'')}</div>
        </div>
        <button class="btn-burgund" style="font-size:0.75rem;padding:0.3rem 0.6rem;flex-shrink:0" onclick="sdOpenAddMeeting('${escHtml(p.nick||'')}')">+ Spotkanie</button>
      </div>`;
    }).join('')}</div>`;
  } catch {
    el.innerHTML = `<div style="padding:3rem;text-align:center;color:var(--szary)">Brak połączenia — sprawdź internet</div>`;
  }
}

// ---- TAB: Moja karta ----

function _sdRenderCardForm(el) {
  const profile = getSDProfile();
  const meetings = getSDMeetings();

  const selectedTags = profile.tags || [];
  const tagsHTML = SD_TAGS.map(t => `
    <button class="sd-tag-btn ${selectedTags.includes(t)?'selected':''}" onclick="sdToggleTag('${t}')">${t}</button>`).join('');

  const emojiHTML = SD_EMOJIS.map(e => `
    <button class="sd-emoji-btn${(profile.emoji||'💫')===e?' selected':''}" onclick="sdSetEmoji('${e}')" style="font-size:1.4rem;background:none;border:2px solid ${(profile.emoji||'💫')===e?'var(--zloto)':'transparent'};border-radius:50%;width:2.5rem;height:2.5rem;cursor:pointer;transition:border-color 200ms">${e}</button>`).join('');

  const meetingsHTML = meetings.length ? meetings.map((m,i) => `
    <div class="sd-meeting-card">
      <div class="sd-meeting-info">
        <div class="sd-meeting-nick">${escHtml(m.nick)}</div>
        ${m.note ? `<div class="sd-meeting-note">${escHtml(m.note)}</div>` : ''}
      </div>
      <div class="sd-meeting-actions">
        ${m.contact ? `<button class="sd-action-btn" data-contact="${escHtml(m.contact)}" onclick="sdContact(this.dataset.contact)" title="Kontakt">✉</button>` : ''}
        <button class="sd-action-btn" onclick="sdDeleteMeeting(${i})" title="Usuń">✕</button>
      </div>
    </div>`).join('') :
    `<div class="sd-empty-state">Nie zapisałeś jeszcze żadnego spotkania</div>`;

  const photoDataUrl = localStorage.getItem('cien_sd_photo') || '';
  const _c = _sdGetCrop();
  const _cx = _c.x||0, _cy = _c.y||0, _cz = _c.z||1;
  const cardBgStyle  = photoDataUrl
    ? `background-image:url(${photoDataUrl});background-size:${_cz>1?_cz*100+'%':'cover'};background-position:calc(50% - ${_cx*0.6}%) calc(50% - ${_cy*0.6}%);`
    : '';

  el.innerHTML = `
    <div class="sd-hero">
      <div class="sd-hero-icon">💘</div>
      <div class="sd-hero-title">SLOW DATING</div>
      <div class="sd-hero-sub">Spotkanie bez algorytmów · prowadzi Maciek Kołodziejczyk EUPHIRE</div>
    </div>
    <div class="sd-anima-hero">
      <img src="icons/ksiezyc-slonce.jpg" alt="Anima Animus" class="sd-anima-img">
      <div class="sd-anima-label">Anima / Animus · Księżyc · Słońce</div>
    </div>
    <div class="sd-sessions">
      <div class="sd-session-pill">💘 Piątek 16:30–18:00 · Anima/Animus</div>
      <div class="sd-session-pill">💘 Piątek 18:30–20:00 · Anima/Animus</div>
    </div>
    <div class="sd-section">
      <div class="sd-section-title">Twoja karta</div>
      <div class="sd-card-preview" id="sd-card-preview" style="${cardBgStyle}">
        <div class="sd-card-preview-info">
          <div class="sd-card-nick ${profile.nick?'':'placeholder'}" id="sd-prev-nick">${profile.nick ? escHtml(profile.nick) : 'Twój nick'}</div>
          <div class="sd-card-about ${profile.about?'':'placeholder'}" id="sd-prev-about">${profile.about ? escHtml(profile.about) : 'Jedno zdanie o sobie...'}</div>
          <div class="sd-card-tags" id="sd-prev-tags">
            ${selectedTags.length ? selectedTags.map(t=>`<span class="sd-tag">${t}</span>`).join('') : '<span class="sd-tag" style="opacity:0.4">tagi</span>'}
          </div>
        </div>
      </div>
      <div class="sd-form">
        <div>
          <div class="sd-input-label">Zdjęcie profilowe</div>
          <input type="file" id="sd-photo-input" accept="image/*" style="display:none" onchange="sdPhotoSelected(this)">
          ${photoDataUrl ? `
          <div class="sd-photo-saved" onclick="document.getElementById('sd-photo-input').click()">
            <img src="${photoDataUrl}" class="sd-photo-thumb" id="sd-photo-thumb-img" alt="Twoje zdjęcie">
            <div class="sd-photo-saved-overlay">
              <span class="sd-photo-saved-label">✓ Zdjęcie ustawione</span>
              <span class="sd-photo-saved-change">Zmień</span>
            </div>
          </div>
          ` : `
          <button class="sd-photo-add-btn" onclick="document.getElementById('sd-photo-input').click()">
            <span class="sd-photo-add-icon">📷</span>
            <span class="sd-photo-add-text">Dodaj zdjęcie profilowe</span>
            <span class="sd-photo-add-sub">Tapnij żeby wybrać</span>
          </button>`}
        </div>
        <div>
          <div class="sd-input-label">Emoji avatara</div>
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.25rem" id="sd-emoji-grid">${emojiHTML}</div>
        </div>
        <div>
          <div class="sd-input-label">Nick / imię</div>
          <input class="sd-input" id="sd-nick" type="text" maxlength="30"
                 value="${escHtml(profile.nick||'')}" placeholder="jak mówią na Ciebie"
                 oninput="sdUpdatePreview()">
        </div>
        <div>
          <div class="sd-input-label">Jedno zdanie o sobie</div>
          <input class="sd-input" id="sd-about" type="text" maxlength="80"
                 value="${escHtml(profile.about||'')}" placeholder="Co robisz / skąd jesteś / co tu szukasz"
                 oninput="sdUpdatePreview()">
          <div class="sd-char-count" id="sd-char-count">${(profile.about||'').length}/80</div>
        </div>
        <div>
          <div class="sd-input-label">Tematy (max 4)</div>
          <div class="sd-tags-grid">${tagsHTML}</div>
        </div>
        <div style="display:flex;gap:0.6rem;margin-top:0.25rem">
          <button class="btn btn-gold" style="flex:1" onclick="sdSaveProfile()">Zapisz kartę</button>
          <button class="btn" style="flex:0 0 auto;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);color:var(--pergamin);border-radius:10px;padding:0 1rem;font-size:0.85rem" onclick="sdShowPreview()">👁</button>
          <button class="btn" style="flex:0 0 auto;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);color:var(--pergamin);border-radius:10px;padding:0 1rem;font-size:0.85rem" onclick="sdShareCard()">↑</button>
        </div>
      </div>
    </div>
    <div class="sd-section">
      <div class="sd-section-title">Moje spotkania</div>
      <div class="sd-meetings-list" id="sd-meetings-list">${meetingsHTML}</div>
      <button class="btn-burgund" onclick="sdOpenAddMeeting()" style="margin-top:0.75rem">+ Dodaj spotkanie</button>
    </div>
    <div class="sd-section sd-danger-zone">
      <div class="sd-section-title">Usuń profil</div>
      <div style="font-size:0.78rem;color:var(--szary);margin-bottom:0.75rem">Usuwa Twój profil, zdjęcie i wszystkie lajki z serwera. Nieodwracalne.</div>
      <button class="btn-burgund" onclick="sdDeleteProfile()">Usuń mój profil Slow Dating</button>
    </div>`;
}

async function sdDeleteProfile() {
  if (!confirm('Czy na pewno chcesz usunąć profil? Ta operacja jest nieodwracalna.')) return;
  const profile = getSDProfile();
  const pbId = profile.pbId || profile.id;
  if (pbId) {
    await fetch(`${SD_PB}/api/collections/cien_sd_profiles/records/${pbId}`, {
      method: 'DELETE',
    }).catch(() => {});
  }
  ['cien_sd_photo','cien_sd_crop','cien_sd_photo_pos','cien_sd_profile_2026','cien_sd_consent_v1','cien_sd_photo_pushed'].forEach(k => localStorage.removeItem(k));
  showToast('Profil usunięty');
  renderSlowDating();
}

function sdShowPreview() {
  const profile = getSDProfile();
  const photoDataUrl = localStorage.getItem('cien_sd_photo') || '';
  const tags = _sdParseTags(profile.tags || []);
  const bgStyle = photoDataUrl
    ? `background-image:url(${photoDataUrl});background-size:cover;background-position:center;`
    : '';
  const existing = document.getElementById('sd-preview-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'sd-preview-overlay';
  overlay.innerHTML = `
    <button class="sdpv-x" onclick="document.getElementById('sd-preview-overlay').remove()">✕</button>
    <div class="sdpv-inner">
      <div class="sdpv-label">Tak widzą Cię inni</div>
      <div class="dating-card has-photo sdpv-card" style="${bgStyle}">
        <div class="dating-card-overlay">
          <div class="dating-card-name">${escHtml(profile.emoji||'💫')} ${escHtml(profile.nick||'Twój nick')}</div>
          ${profile.about ? `<div class="dating-card-bio">${escHtml(profile.about)}</div>` : ''}
          ${tags.length ? `<div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-top:0.5rem">${tags.map(t=>`<span class="sd-tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
        </div>
      </div>
      <button class="sdpv-close-btn" onclick="document.getElementById('sd-preview-overlay').remove()">← Wróć</button>
    </div>`;
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}

function sdShareCard() {
  const profile = getSDProfile();
  if (!profile.nick) { showToast('Najpierw wypełnij kartę'); return; }
  const tags = _sdParseTags(profile.tags || []);
  const text = `${profile.emoji||'💫'} ${profile.nick}\n${profile.about ? profile.about + '\n' : ''}${tags.length ? tags.join(' · ') + '\n' : ''}\nSłow Dating @ Cień Festiwal 2026 🌙\napp.cienfestiwal.com`;
  if (navigator.share) {
    navigator.share({ title: `${profile.nick} @ Cień Festiwal`, text }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showToast('Skopiowano do schowka ✓')).catch(() => showToast(text));
  }
}

function sdSetEmoji(emoji) {
  const profile = getSDProfile();
  profile.emoji = emoji;
  saveSDProfile(profile);
  if (_sdTab === 'karta') _sdRenderCardForm(document.getElementById('sd-tab-content'));
  else renderSlowDating();
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

function _sdGetCrop() {
  try { return JSON.parse(localStorage.getItem('cien_sd_crop') || '{}'); } catch { return {}; }
}

function _sdApplyCrop(c) {
  const x = c.x || 0, y = c.y || 0, z = c.z || 1;
  const thumb = document.getElementById('sd-photo-thumb-img');
  if (thumb) {
    thumb.style.transform = `translate(${x}%, ${y}%) scale(${z})`;
    thumb.style.transformOrigin = 'center center';
  }
  const preview = document.getElementById('sd-card-preview');
  if (preview) {
    preview.style.backgroundPosition = `calc(50% - ${x * 0.6}%) calc(50% - ${y * 0.6}%)`;
    preview.style.backgroundSize = z > 1 ? `${z * 100}%` : 'cover';
  }
}

function sdCrop(dir) {
  const c = _sdGetCrop();
  const STEP = 6, ZS = 0.15, MAX = 45, ZMAX = 3, ZMIN = 1;
  if (dir === 'up')    c.y = Math.max(-MAX, (c.y||0) - STEP);
  if (dir === 'down')  c.y = Math.min( MAX, (c.y||0) + STEP);
  if (dir === 'left')  c.x = Math.max(-MAX, (c.x||0) - STEP);
  if (dir === 'right') c.x = Math.min( MAX, (c.x||0) + STEP);
  if (dir === 'in')    c.z = Math.min(ZMAX, +((c.z||1) + ZS).toFixed(2));
  if (dir === 'out')   c.z = Math.max(ZMIN, +((c.z||1) - ZS).toFixed(2));
  localStorage.setItem('cien_sd_crop', JSON.stringify(c));
  _sdApplyCrop(c);
}

function sdCropReset() {
  localStorage.removeItem('cien_sd_crop');
  _sdApplyCrop({});
}

function sdSetPhotoPos(pos) {
  // legacy — redirect to crop
  const map = { top: { y: -25 }, center: {}, bottom: { y: 25 } };
  const c = { ..._sdGetCrop(), ...(map[pos] || {}) };
  localStorage.setItem('cien_sd_crop', JSON.stringify(c));
  _sdApplyCrop(c);
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

let _sdCropper = null;

function sdPhotoSelected(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  const reader = new FileReader();
  reader.onload = e => {
    const modal = document.getElementById('sd-crop-modal');
    const img   = document.getElementById('sdc-img');
    if (!modal || !img) return;
    img.src = e.target.result;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    if (_sdCropper) { _sdCropper.destroy(); _sdCropper = null; }
    img.onload = () => {
      _sdCropper = new Cropper(img, {
        aspectRatio: 3 / 4,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.85,
        restore: false,
        guides: false,
        center: false,
        highlight: false,
        cropBoxMovable: false,
        cropBoxResizable: false,
        toggleDragModeOnDblclick: false,
        ready() {
          // round crop box via CSS
          const box = document.querySelector('.cropper-crop-box');
          if (box) box.style.borderRadius = '16px';
          const face = document.querySelector('.cropper-face');
          if (face) face.style.borderRadius = '16px';
        },
      });
    };
  };
  reader.readAsDataURL(file);
}

function sdCropDone() {
  if (!_sdCropper) return;
  const canvas = _sdCropper.getCroppedCanvas({ width: 600, height: 800, imageSmoothingQuality: 'high' });
  canvas.toBlob(blob => {
    window._sdPendingPhoto = blob;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    localStorage.setItem('cien_sd_photo', dataUrl);
    localStorage.setItem('cien_sd_photo_pushed', 'false');
    localStorage.removeItem('cien_sd_crop');
    _sdCropper.destroy(); _sdCropper = null;
    document.getElementById('sd-crop-modal').style.display = 'none';
    document.body.style.overflow = '';
    // update card preview
    const preview = document.getElementById('sd-card-preview');
    if (preview) { preview.style.backgroundImage = `url(${dataUrl})`; preview.style.backgroundSize = 'cover'; preview.style.backgroundPosition = 'center'; }
    // re-render the form section to show the saved photo
    if (_sdTab === 'karta') _sdRenderCardForm(document.getElementById('sd-tab-content'));
  }, 'image/jpeg', 0.88);
}

function sdCropCancel() {
  if (_sdCropper) { _sdCropper.destroy(); _sdCropper = null; }
  document.getElementById('sd-crop-modal').style.display = 'none';
  document.body.style.overflow = '';
}

async function sdSaveProfile() {
  const nick  = document.getElementById('sd-nick')?.value?.trim()  || '';
  const about = document.getElementById('sd-about')?.value?.trim() || '';
  const profile = getSDProfile();
  profile.nick  = nick;
  profile.about = about;
  saveSDProfile(profile);
  if (typeof _syncProfileToTeam === 'function') _syncProfileToTeam().catch(() => {});
  let photoBlob = window._sdPendingPhoto || null;
  if (!photoBlob && localStorage.getItem('cien_sd_photo_pushed') === 'false') {
    const dataUrl = localStorage.getItem('cien_sd_photo');
    if (dataUrl) {
      try { const r = await fetch(dataUrl); photoBlob = await r.blob(); } catch {}
    }
  }
  _sdPushProfile(photoBlob);
  showToast('Karta zapisana ✓');
  renderSlowDating();
}

function sdOpenAddMeeting(prefillNick) {
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
        <input class="sd-input" id="sd-new-nick" type="text" maxlength="40" placeholder="jak mają na imię" value="${escHtml(prefillNick||'')}">
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
  const nickInput = document.getElementById('sd-new-nick');
  setTimeout(() => { if (prefillNick) nickInput?.select(); else nickInput?.focus(); }, 100);
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
          ${m.contact ? `<button class="sd-action-btn" data-contact="${escHtml(m.contact)}" onclick="sdContact(this.dataset.contact)" title="Kontakt">✉</button>` : ''}
          <button class="sd-action-btn" onclick="sdDeleteMeeting(${i})" title="Usuń">✕</button>
        </div>
      </div>`).join('');
  }
}

function sdDeleteMeeting(idx) {
  const meetings = getSDMeetings();
  meetings.splice(idx, 1);
  saveSDMeetings(meetings);
  if (_sdTab === 'karta') _sdRenderCardForm(document.getElementById('sd-tab-content'));
  else renderSlowDating();
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
  const adding = idx < 0;
  if (idx >= 0) favs.splice(idx, 1); else favs.push(evId);
  localStorage.setItem('cien_favs_2026', JSON.stringify(favs));
  if ('vibrate' in navigator) navigator.vibrate(adding ? [20] : [10]);
  renderSchedule();
  if (adding) showToast('★ Dodano do Mojego Planu');
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
// PROFIL — unified profile (alias of SD profile, extended)
// ============================================

function getProfile() {
  try { return JSON.parse(localStorage.getItem('cien_sd_profile_2026') || '{}'); } catch { return {}; }
}
function saveProfile(p) {
  localStorage.setItem('cien_sd_profile_2026', JSON.stringify(p));
}

function renderProfil() {
  const container = document.getElementById('profil-content');
  if (!container) return;
  const p = getProfile();
  const photoHTML = p.photo
    ? `<img src="${p.photo}" class="profil-photo" alt="Zdjęcie">`
    : `<div class="profil-photo-placeholder">👤</div>`;
  const tagsHTML = SD_TAGS.map(t => `
    <button class="sd-tag-btn ${(p.tags || []).includes(t) ? 'selected' : ''}"
            onclick="sdToggleTag('${t}')">${escHtml(t)}</button>`).join('');

  container.innerHTML = `
    <div class="profil-hero">
      <div class="profil-photo-wrap" onclick="profilePhotoUpload()">
        ${photoHTML}
        <div class="profil-photo-edit">📷</div>
      </div>
      <div class="profil-nick">${escHtml(p.nick || 'Bez nicka')}</div>
      ${p.about ? `<div class="profil-about">${escHtml(p.about)}</div>` : ''}
    </div>

    <div class="sd-section">
      <div class="sd-section-title">Karta uczestnika</div>
      <div class="sd-form">
        <div>
          <div class="sd-input-label">Nick / imię</div>
          <input class="sd-input" id="profil-nick" type="text" maxlength="30"
                 value="${escHtml(p.nick || '')}" placeholder="jak mówią na Ciebie">
        </div>
        <div>
          <div class="sd-input-label">Jedno zdanie o sobie</div>
          <input class="sd-input" id="profil-about" type="text" maxlength="80"
                 value="${escHtml(p.about || '')}" placeholder="Co robisz / skąd jesteś / co tu szukasz">
        </div>
        <div>
          <div class="sd-input-label">Zainteresowania (max 4)</div>
          <div class="sd-tags-grid">${tagsHTML}</div>
        </div>
        <div>
          <div class="sd-input-label">Moje Cienie</div>
          <textarea class="sd-input profil-shadows-input" id="profil-shadows" maxlength="300"
                    placeholder="Co przynoszę na ten festiwal? Co chcę zobaczyć w sobie?">${escHtml(p.shadows || '')}</textarea>
          <div class="sd-char-hint">Widoczne dla członków drużyny</div>
        </div>
        <button class="btn btn-gold" onclick="profileSave()">Zapisz profil</button>
      </div>
    </div>

    <input type="file" id="profil-photo-input" accept="image/*" style="display:none"
           onchange="profilePhotoSelected(event)">
  `;
}

function profileSave() {
  const nick    = document.getElementById('profil-nick')?.value?.trim() || '';
  const about   = document.getElementById('profil-about')?.value?.trim() || '';
  const shadows = document.getElementById('profil-shadows')?.value?.trim() || '';
  const p = getProfile();
  p.nick = nick; p.about = about; p.shadows = shadows;
  saveProfile(p);
  if (typeof _syncProfileToTeam === 'function') _syncProfileToTeam().catch(() => {});
  showToast('Profil zapisany ✓');
  renderProfil();
}

function profilePhotoUpload() {
  document.getElementById('profil-photo-input')?.click();
}

function profilePhotoSelected(evt) {
  const file = evt.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 200;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
      else        { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
      const p = getProfile();
      p.photo = dataUrl;
      saveProfile(p);
      if (typeof _syncProfileToTeam === 'function') _syncProfileToTeam().catch(() => {});
      renderProfil();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ============================================
// USTAWIENIA
// ============================================

function renderUstawienia() {
  const container = document.getElementById('ustawienia-content');
  if (!container) return;
  const pushEnabled = localStorage.getItem('cien_push_enabled') === '1';
  container.innerHTML = `
    <div class="view-header">
      <div class="view-title">Ustawienia</div>
    </div>
    <div class="ustawienia-list">
      <div class="ustawienia-item">
        <div class="ustawienia-label">
          <div class="ustawienia-title">Powiadomienia push</div>
          <div class="ustawienia-sub">Przypomnienia o wykładach i wiadomościach od drużyny</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="push-toggle" ${pushEnabled ? 'checked' : ''} onchange="togglePushNotifs(this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="ustawienia-sep"></div>
      <button class="ustawienia-item ustawienia-danger" onclick="if(confirm('Usunąć konto? Dane zostaną usunięte z tego urządzenia.')) deleteAccount()">
        <div>
          <div class="ustawienia-title">Usuń konto</div>
          <div class="ustawienia-sub">Usuwa wszystkie dane z urządzenia</div>
        </div>
      </button>
      <div class="ustawienia-sep"></div>
      <button class="ustawienia-item" onclick="shareApp()">
        <div>
          <div class="ustawienia-title">↗ Podziel się aplikacją</div>
          <div class="ustawienia-sub">Wyślij link znajomym jadącym na festiwal</div>
        </div>
      </button>
      <div class="ustawienia-sep"></div>
      <a class="ustawienia-item" href="/polityka-prywatnosci.html" target="_blank">
        <div class="ustawienia-title">Polityka prywatności</div>
      </a>
      <a class="ustawienia-item" href="/regulamin.html" target="_blank">
        <div class="ustawienia-title">Regulamin</div>
      </a>
    </div>
  `;
}

function togglePushNotifs(enabled) {
  localStorage.setItem('cien_push_enabled', enabled ? '1' : '0');
  if (enabled) {
    subscribePush();
  } else {
    showToast('Powiadomienia wyłączone');
  }
}

function deleteAccount() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('cien_'));
  keys.forEach(k => localStorage.removeItem(k));
  location.reload();
}

async function updateApp() {
  closeMoreMenu();
  showToast('Aktualizowanie…');
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update();
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (_e) {}
  location.reload(true);
}

// ============================================
// WIĘCEJ MENU
// ============================================

function toggleMoreMenu() {
  const panel = document.getElementById('more-panel');
  if (!panel) return;
  panel.style.display !== 'none' ? closeMoreMenu() : openMoreMenu();
}

function openMoreMenu() {
  const panel = document.getElementById('more-panel');
  if (!panel) return;
  panel.style.display = 'flex';
  requestAnimationFrame(() => panel.classList.add('open'));
}

function closeMoreMenu() {
  const panel = document.getElementById('more-panel');
  if (!panel) return;
  panel.classList.remove('open');
  setTimeout(() => { panel.style.display = 'none'; }, 250);
}

// ============================================
// ALCHEMIC QUOTE
// ============================================

const _ALCHEMIC_QUOTES = [
  { text: 'Złoto nie pochodzi ze złota. Pochodzi z ołowiu, który zrozumiał samego siebie.', attr: '— Alchemia' },
  { text: 'Nigredo to nie koniec. To gleba, z której wyrasta wszystko inne.', attr: '— Cień Festiwal' },
  { text: 'To, co odrzucasz w sobie, rządzi tobą z cienia.', attr: '— C.G. Jung' },
  { text: 'Rubedo nie jest nagrodą za cierpienie. Jest naturą ognia, który przeżył własne wygaśnięcie.', attr: '— Alchemia' },
  { text: 'Zamek nie szuka. Zamek czeka. Ty przychodzisz z pytaniem, które już jest odpowiedzią.', attr: '— Zamek Świny' },
  { text: 'Każda transformacja zaczyna się od rozkładu. Bój się stagnacji, nie ciemności.', attr: '— Tradycja hermetyczna' },
  { text: 'Solve et coagula. Rozpuść i scal. Nie inaczej.', attr: '— Paracelsus' },
];

function _renderAlchemicQuote() {
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const q = _ALCHEMIC_QUOTES[dayOfYear % _ALCHEMIC_QUOTES.length];
  return `<div class="alchemic-quote">
    <div class="alchemic-quote-text">${q.text}</div>
    <div class="alchemic-quote-attr">${q.attr}</div>
  </div>`;
}

// ============================================
// FESTIVAL COUNTDOWN
// ============================================

function _renderCountdown() {
  const festival = new Date('2026-07-03T12:00:00');
  const diff = festival - new Date();
  if (diff <= 0) return '';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `
<div class="countdown-block" id="cien-countdown">
  <div class="countdown-label">DO ZAMKU ŚWINY</div>
  <div class="countdown-units">
    <div class="countdown-unit"><span class="countdown-num" id="cd-d">${d}</span><span class="countdown-lbl">dni</span></div>
    <span class="countdown-colon">:</span>
    <div class="countdown-unit"><span class="countdown-num" id="cd-h">${String(h).padStart(2,'0')}</span><span class="countdown-lbl">godz</span></div>
    <span class="countdown-colon">:</span>
    <div class="countdown-unit"><span class="countdown-num" id="cd-m">${String(m).padStart(2,'0')}</span><span class="countdown-lbl">min</span></div>
    <span class="countdown-colon">:</span>
    <div class="countdown-unit"><span class="countdown-num" id="cd-s">${String(s).padStart(2,'0')}</span><span class="countdown-lbl">sek</span></div>
  </div>
  <div class="countdown-sub">3–5 LIPCA · ZAMEK ŚWINY · BOLKÓW</div>
</div>`;
}

let _cdTimer = null;
function _startCountdownTimer() {
  if (_cdTimer) { clearInterval(_cdTimer); _cdTimer = null; }
  const cd = document.getElementById('cien-countdown');
  if (!cd) return;
  _cdTimer = setInterval(() => {
    const festival = new Date('2026-07-03T12:00:00');
    const diff = festival - new Date();
    if (diff <= 0) { clearInterval(_cdTimer); _cdTimer = null; return; }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const block = document.getElementById('cien-countdown');
    if (!block) { clearInterval(_cdTimer); _cdTimer = null; return; }
    const dEl = document.getElementById('cd-d'); if (dEl) dEl.textContent = d;
    const hEl = document.getElementById('cd-h'); if (hEl) hEl.textContent = String(h).padStart(2,'0');
    const mEl = document.getElementById('cd-m'); if (mEl) mEl.textContent = String(m).padStart(2,'0');
    const sEl = document.getElementById('cd-s'); if (sEl) sEl.textContent = String(s).padStart(2,'0');
  }, 1000);
}

// ============================================
// WEATHER WIDGET
// ============================================

let _weatherData = null;
async function _fetchWeather() {
  try {
    const cached = localStorage.getItem('cien_weather_v3');
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < 60 * 60 * 1000) {
        _weatherData = data;
        _updateWeatherWidget();
        return;
      }
    }
    // Fetch current + 3-day daily for festival dates
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=50.8561&longitude=16.0464&current=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&timezone=Europe%2FWarsaw&forecast_days=14');
    if (!res.ok) return;
    const json = await res.json();
    _weatherData = json;
    localStorage.setItem('cien_weather_v3', JSON.stringify({ data: _weatherData, ts: Date.now() }));
    _updateWeatherWidget();
  } catch { /* offline */ }
}

function _weatherEmoji(code) {
  if (code === 0) return '☀️';
  if (code <= 2)  return '🌤';
  if (code <= 3)  return '☁️';
  if (code <= 48) return '🌫';
  if (code <= 55) return '🌦';
  if (code <= 67) return '🌧';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦';
  if (code <= 99) return '⛈';
  return '🌡';
}

function _renderWeatherWidget() {
  if (!_weatherData) return `<div id="weather-widget-slot-inner" style="display:none"></div>`;

  // Try to show 3-day festival forecast if daily data available
  const daily = _weatherData.daily;
  if (daily && daily.time) {
    const festDays = ['2026-07-03', '2026-07-04', '2026-07-05'];
    const labels   = ['Pt 3 VII',  'Sb 4 VII',  'Nd 5 VII'];
    const dayItems = festDays.map((date, i) => {
      const idx = daily.time.indexOf(date);
      if (idx < 0) return null;
      const code = daily.weathercode?.[idx] ?? 0;
      const max  = Math.round(daily.temperature_2m_max?.[idx] ?? 0);
      const min  = Math.round(daily.temperature_2m_min?.[idx] ?? 0);
      const rain = Math.round(daily.precipitation_sum?.[idx] ?? 0);
      const icon = _weatherEmoji(code);
      return `<div class="weather-fday">
        <div class="weather-fday-label">${labels[i]}</div>
        <div class="weather-fday-icon">${icon}</div>
        <div class="weather-fday-temp">${max}°<span class="weather-fday-min">/${min}°</span></div>
        ${rain > 0 ? `<div style="font-size:0.6rem;color:var(--szary)">💧${rain}mm</div>` : ''}
      </div>`;
    }).filter(Boolean).join('');

    if (dayItems) {
      return `<div class="weather-forecast">
        <div class="weather-forecast-title">Pogoda na festiwal · Zamek Świny</div>
        <div class="weather-forecast-days">${dayItems}</div>
      </div>`;
    }
  }

  // Fallback: current weather pill
  const cur = _weatherData.current || _weatherData;
  const temp = Math.round(cur.temperature_2m ?? 0);
  const emoji = _weatherEmoji(cur.weathercode ?? 0);
  return `<div class="weather-widget" onclick="_fetchWeather()" title="Kliknij, żeby odświeżyć">
    <span class="weather-loc">Zamek Świny</span>
    <span class="weather-temp">${emoji} ${temp}°C</span>
  </div>`;
}

function _updateWeatherWidget() {
  const el = document.getElementById('weather-widget-slot');
  if (el) el.innerHTML = _renderWeatherWidget();
}

// ============================================
// PARTICLE BACKGROUND
// ============================================

function initParticles() {
  const canvas = document.createElement('canvas');
  canvas.id = 'particle-bg';
  document.body.insertBefore(canvas, document.body.firstChild);
  const ctx = canvas.getContext('2d');

  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize);

  // Reduced count + squared distance avoids sqrt on every pair
  const COUNT = 38;
  const DIST_SQ = 110 * 110;
  const pts = Array.from({ length: COUNT }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.2 + 0.4,
    vx: (Math.random() - 0.5) * 0.12,
    vy: (Math.random() - 0.5) * 0.12,
    a: Math.random() * 0.5 + 0.25,
  }));

  let _rafId = null;
  const draw = () => {
    if (document.hidden) { _rafId = requestAnimationFrame(draw); return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        const dsq = dx*dx + dy*dy;
        if (dsq < DIST_SQ) {
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = `rgba(201,168,76,${(1 - Math.sqrt(dsq)/110) * 0.12})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(201,168,76,${p.a})`;
      ctx.fill();
    });
    _rafId = requestAnimationFrame(draw);
  };
  _rafId = requestAnimationFrame(draw);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !_rafId) _rafId = requestAnimationFrame(draw);
  });
}

// ============================================
// CONFETTI
// ============================================

function fireConfetti() {
  const canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const colors = ['#C9A84C','#F0CB70','#F5E6C8','#6B2D3E','#8B3A52','#ffffff','#E8D4A8'];
  const particles = Array.from({ length: 90 }, () => ({
    x: Math.random() * canvas.width,
    y: -Math.random() * 40 - 10,
    vx: (Math.random() - 0.5) * 5,
    vy: Math.random() * 3 + 1.5,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 9 + 4,
    rotation: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.25,
    isCircle: Math.random() > 0.5,
    opacity: 1,
  }));
  let frame = 0;
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.09; p.rotation += p.vr;
      if (frame > 80) p.opacity = Math.max(0, p.opacity - 0.025);
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      if (p.isCircle) {
        ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      ctx.restore();
    });
    frame++;
    if (frame < 140) requestAnimationFrame(animate);
    else canvas.remove();
  };
  requestAnimationFrame(animate);
}

// ============================================
// MATCH MODAL
// ============================================

function showMatchModal(profile) {
  const modal = document.getElementById('dating-match-modal');
  if (!modal) return;
  const theirPhoto = modal.querySelector('.match-their-photo');
  if (theirPhoto) {
    const photoUrl = profile.photo && profile.collectionId && profile.id
      ? `${SD_PB}/api/files/${profile.collectionId}/${profile.id}/${profile.photo}?thumb=200x200` : '';
    if (photoUrl) {
      theirPhoto.style.cssText = `background-image:url(${photoUrl});background-size:cover;background-position:center;`;
      theirPhoto.textContent = '';
    } else {
      theirPhoto.textContent = profile.emoji || '💫';
    }
  }
  const ownPhoto = modal.querySelector('.match-own-photo');
  if (ownPhoto) {
    const myPhoto = localStorage.getItem('cien_sd_photo');
    if (myPhoto) {
      ownPhoto.style.cssText = `background-image:url(${myPhoto});background-size:cover;background-position:center;`;
      ownPhoto.textContent = '';
    } else {
      ownPhoto.textContent = getSDProfile().emoji || '💘';
    }
  }
  const nameEl = modal.querySelector('.match-their-name');
  if (nameEl) nameEl.textContent = profile.nick || '';
  modal.dataset.matchUid = profile.uid;
  modal.classList.add('open');
  setTimeout(fireConfetti, 50);
}

function closeMatchModal() {
  const modal = document.getElementById('dating-match-modal');
  if (modal) modal.classList.remove('open');
}

function goToMatchChat() {
  const modal = document.getElementById('dating-match-modal');
  const matchedNick = modal?.querySelector('.match-their-name')?.textContent?.trim() || '';
  closeMatchModal();
  sdSetTab('karta');
  setTimeout(() => {
    sdOpenAddMeeting();
    if (matchedNick) {
      const nickInput = document.getElementById('sd-new-nick');
      if (nickInput) nickInput.value = matchedNick;
    }
  }, 220);
}

// ============================================
// EXPOSE GLOBALS
// ============================================

Object.assign(window, {
  setActiveDay, setActiveZone, openEventModal, closeEventModal,
  setPoiType, highlightZone, openPoiModal,
  setJournalStage, autoSaveJournal, saveJournalEntry, emailJournalEntry, emailAllJournalEntries, toggleEntry,
  callHelp, triggerInstall, dismissInstall, showInstallGuide, dismissInstallModal, _dismissAnnTeraz,
  sdToggleTag, sdSaveProfile, sdUpdatePreview, sdSetPhotoPos, sdCropDone, sdCropCancel, sdShowPreview, sdShareCard, sdDeleteProfile, sdOpenAddMeeting, sdConfirmAddMeeting, sdDeleteMeeting, sdContact,
  toggleFavorite, setFavOnly, scheduleSearch,
  setKBCategory, openArticle, closeArticle,
  dismissOnboarding,
  renderProfil, renderUstawienia, profileSave, profilePhotoUpload, profilePhotoSelected,
  togglePushNotifs, deleteAccount,
  toggleMoreMenu, openMoreMenu, closeMoreMenu,
  closeMatchModal, goToMatchChat,
  shareEvent, shareApp, addToCalendar,
  generateAndShowPlan, togglePlanItem, sharePlan, aiCustomizePlan,
  _fetchWeather,
  updateApp,
  annPost, annDelete, annSendPush, subscribePush, _annTapHeader,
});

// ============================================
// BOOT
// ============================================

document.addEventListener('DOMContentLoaded', init);

/* ============================================
   CIEŃ FESTIWAL 2026 — Coniunctio / Slow Dating
   Firebase Auth + Firestore + Storage
   ============================================ */

'use strict';

// ============================================
// STATE
// ============================================

const DatingState = {
  user: null,          // firebase.auth().currentUser
  profile: null,       // own Firestore profile
  deck: [],            // profiles to swipe (array of {uid, ...})
  deckIdx: 0,
  swipedUIDs: new Set(),
  matches: [],
  activeMatchId: null,
  activeMatchProfile: null,
  subView: 'deck',     // deck | matches | chat
  chatUnsub: null,
  matchesUnsub: null,
  dragState: null,
};

let db = null;
let auth = null;
let storage = null;
let firebaseReady = false;

// ============================================
// INIT
// ============================================

function initFirebase() {
  if (firebaseReady) return;
  if (typeof FIREBASE_CONFIG === 'undefined') return;
  if (FIREBASE_CONFIG.apiKey === 'REPLACE_ME') {
    firebaseReady = false;
    return;
  }
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    auth     = firebase.auth();
    db       = firebase.firestore();
    storage  = firebase.storage();
    firebaseReady = true;

    auth.onAuthStateChanged(async (user) => {
      DatingState.user = user;
      if (user) {
        DatingState.profile = await loadOwnProfile(user.uid);
        subscribeMatches(user.uid);
      } else {
        DatingState.profile = null;
        DatingState.matches = [];
        if (DatingState.matchesUnsub) { DatingState.matchesUnsub(); DatingState.matchesUnsub = null; }
      }
      if (document.getElementById('slowdating-content')) {
        renderSlowDating();
      }
    });
  } catch (e) {
    console.error('Firebase init failed:', e);
    firebaseReady = false;
  }
}

// ============================================
// MAIN RENDER ENTRY POINT (overrides app.js)
// ============================================

function renderSlowDating() {
  const container = document.getElementById('slowdating-content');
  if (!container) return;

  if (!firebaseReady) {
    if (typeof renderSlowDatingLocal === 'function') renderSlowDatingLocal();
    else renderDatingComingSoon(container);
    return;
  }

  if (!DatingState.user) {
    renderAuthScreen(container);
    return;
  }

  if (!DatingState.profile) {
    renderProfileSetup(container);
    return;
  }

  renderDatingMain(container);
}

// ============================================
// COMING SOON (firebase not configured)
// ============================================

function renderDatingComingSoon(container) {
  container.innerHTML = `
    <div class="dating-hero">
      <div class="dating-hero-icon">💘</div>
      <div class="dating-hero-title">CONIUNCTIO</div>
      <div class="dating-hero-sub">Slow Dating Festiwalowe</div>
    </div>
    <div class="dating-info-box">
      <div style="font-size:0.9rem;line-height:1.7;color:var(--pergamin)">
        Prawdziwe spotkanie. Bez algorytmów.<br>
        Swipe left/right, match, wiadomość.<br><br>
        <strong style="color:var(--zloto)">Prowadzi: Maciek Kołodziejczyk EUPHIRE</strong><br>
        Piątek 16:30 i 18:30 · Strefa Anima/Animus
      </div>
    </div>
    <div class="dating-info-box" style="margin-top:0.5rem;border-color:var(--burgund-2)">
      <div style="font-size:0.8rem;color:var(--szary);line-height:1.6">
        Firebase nie skonfigurowany.<br>
        Uzupełnij <code>firebase-config.js</code> i odśwież.
      </div>
    </div>`;
}

// ============================================
// AUTH
// ============================================

function renderAuthScreen(container) {
  container.innerHTML = `
    <div class="dating-hero">
      <div class="dating-hero-icon">💘</div>
      <div class="dating-hero-title">CONIUNCTIO</div>
      <div class="dating-hero-sub">Slow Dating Festiwalowe<br>Swipe · Match · Wiadomość</div>
    </div>

    <div class="dating-auth-box">
      <button class="dating-btn-google" onclick="datingLoginGoogle()">
        <svg width="18" height="18" viewBox="0 0 18 18" style="margin-right:8px">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
        </svg>
        Zaloguj przez Google
      </button>

      <div class="dating-auth-divider">lub emailem</div>

      <div id="dating-auth-email-form">
        <input class="dating-input" id="dating-email" type="email" placeholder="email@...">
        <input class="dating-input" id="dating-pass" type="password" placeholder="hasło (min. 6 znaków)">
        <div style="display:flex;gap:0.5rem;margin-top:0.25rem">
          <button class="dating-btn-outline" onclick="datingLoginEmail()" style="flex:1">Zaloguj</button>
          <button class="dating-btn-outline" onclick="datingSignup()" style="flex:1">Utwórz konto</button>
        </div>
        <div id="dating-auth-error" class="dating-error" style="display:none"></div>
      </div>

      <p style="text-align:center;font-size:0.75rem;color:var(--szary);margin-top:1rem;line-height:1.5">
        Logując się, akceptujesz zasady festiwalu.<br>
        Profil widoczny tylko dla uczestników CIEŃ 2026.
      </p>
    </div>`;
}

async function datingLoginGoogle() {
  if (!auth) return;
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
  } catch (e) {
    showDatingError(e.message);
  }
}

async function datingLoginEmail() {
  const email = document.getElementById('dating-email')?.value?.trim();
  const pass  = document.getElementById('dating-pass')?.value;
  if (!email || !pass) { showDatingError('Wpisz email i hasło'); return; }
  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch (e) {
    showDatingError(e.code === 'auth/wrong-password' ? 'Złe hasło' :
      e.code === 'auth/user-not-found' ? 'Nie ma takiego konta' : e.message);
  }
}

async function datingSignup() {
  const email = document.getElementById('dating-email')?.value?.trim();
  const pass  = document.getElementById('dating-pass')?.value;
  if (!email || !pass) { showDatingError('Wpisz email i hasło'); return; }
  if (pass.length < 6) { showDatingError('Hasło min. 6 znaków'); return; }
  try {
    await auth.createUserWithEmailAndPassword(email, pass);
  } catch (e) {
    showDatingError(e.code === 'auth/email-already-in-use' ? 'Ten email już istnieje — zaloguj się' : e.message);
  }
}

async function datingLogout() {
  if (DatingState.chatUnsub) { DatingState.chatUnsub(); DatingState.chatUnsub = null; }
  if (DatingState.matchesUnsub) { DatingState.matchesUnsub(); DatingState.matchesUnsub = null; }
  await auth.signOut();
}

function showDatingError(msg) {
  const el = document.getElementById('dating-auth-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
  else showToast(msg);
}

// ============================================
// PROFILE
// ============================================

async function loadOwnProfile(uid) {
  const doc = await db.collection('profiles').doc(uid).get();
  return doc.exists ? { uid, ...doc.data() } : null;
}

function renderProfileSetup(container) {
  const u = DatingState.user;
  const displayName = u.displayName || '';
  const photoURL = u.photoURL || '';

  container.innerHTML = `
    <div class="dating-hero" style="padding-top:1rem">
      <div class="dating-hero-title" style="font-size:1.3rem">Stwórz profil</div>
      <div class="dating-hero-sub">Pokazany innym uczestnikom</div>
    </div>

    <div class="dating-profile-form">
      <div class="dating-photo-upload" onclick="document.getElementById('dating-photo-input').click()">
        <div id="dating-photo-preview" class="dating-photo-preview">
          ${photoURL
            ? `<img src="${photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
            : `<div class="dating-photo-placeholder">📷<br><span>Dodaj zdjęcie</span></div>`}
        </div>
      </div>
      <input id="dating-photo-input" type="file" accept="image/*" capture="user"
             style="display:none" onchange="datingPreviewPhoto(this)">

      <div>
        <div class="dating-input-label">Imię lub nick *</div>
        <input class="dating-input" id="p-name" type="text" maxlength="30"
               value="${escHtml(displayName)}" placeholder="Jak mówią na Ciebie">
      </div>

      <div>
        <div class="dating-input-label">Wiek (opcjonalnie)</div>
        <input class="dating-input" id="p-age" type="number" min="18" max="99"
               placeholder="np. 28">
      </div>

      <div>
        <div class="dating-input-label">Jedno zdanie o sobie *</div>
        <textarea class="dating-input" id="p-bio" maxlength="120" rows="3"
                  placeholder="Co tu szukasz / skąd jesteś / co Cię pochłania"
                  style="resize:none"></textarea>
        <div class="dating-char-count" id="p-bio-count">0/120</div>
      </div>

      <div>
        <div class="dating-input-label">Czego szukasz</div>
        <div class="dating-intention-chips">
          <button class="dating-chip" data-intention="Rozmowa" onclick="datingToggleIntention(this)">Rozmowy</button>
          <button class="dating-chip" data-intention="Przyjaźń" onclick="datingToggleIntention(this)">Przyjaźni</button>
          <button class="dating-chip" data-intention="Randka" onclick="datingToggleIntention(this)">Randki</button>
        </div>
      </div>

      <div id="dating-profile-error" class="dating-error" style="display:none"></div>

      <button class="dating-btn-gold" onclick="datingSaveProfile()" style="margin-top:0.5rem">
        Gotowe — pokaż mnie innym ›
      </button>

      <button onclick="datingLogout()" class="dating-btn-text">Wyloguj</button>
    </div>`;

  document.getElementById('p-bio')?.addEventListener('input', function() {
    const el = document.getElementById('p-bio-count');
    if (el) el.textContent = `${this.value.length}/120`;
  });
}

function datingPreviewPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById('dating-photo-preview');
    if (preview) {
      preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    }
  };
  reader.readAsDataURL(file);
}

function datingToggleIntention(btn) {
  document.querySelectorAll('.dating-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

async function datingSaveProfile() {
  const name = document.getElementById('p-name')?.value?.trim();
  const age  = parseInt(document.getElementById('p-age')?.value) || null;
  const bio  = document.getElementById('p-bio')?.value?.trim();
  const intention = document.querySelector('.dating-chip.active')?.dataset.intention || 'Rozmowa';
  const photoFile = document.getElementById('dating-photo-input')?.files[0];

  if (!name) { showProfileError('Wpisz imię lub nick'); return; }
  if (!bio)  { showProfileError('Napisz jedno zdanie o sobie'); return; }

  const saveBtn = document.querySelector('.dating-btn-gold');
  if (saveBtn) { saveBtn.textContent = 'Zapisuję...'; saveBtn.disabled = true; }

  try {
    let photoURL = DatingState.user.photoURL || '';

    if (photoFile) {
      const ref = storage.ref(`profiles/${DatingState.user.uid}/photo`);
      await ref.put(photoFile);
      photoURL = await ref.getDownloadURL();
    }

    const profileData = {
      name, bio, intention, photoURL,
      ...(age ? { age } : {}),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      uid: DatingState.user.uid
    };

    await db.collection('profiles').doc(DatingState.user.uid).set(profileData, { merge: true });
    DatingState.profile = { uid: DatingState.user.uid, ...profileData };
    renderSlowDating();
  } catch (e) {
    showProfileError('Błąd zapisu: ' + e.message);
    if (saveBtn) { saveBtn.textContent = 'Gotowe — pokaż mnie innym ›'; saveBtn.disabled = false; }
  }
}

function showProfileError(msg) {
  const el = document.getElementById('dating-profile-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
  else showToast(msg);
}

// ============================================
// MAIN DATING UI
// ============================================

function renderDatingMain(container) {
  const matchCount = DatingState.matches.length;
  container.innerHTML = `
    <div class="dating-user-bar">
      <div class="dating-user-avatar" style="background-image:url('${DatingState.profile.photoURL || ''}')">
        ${!DatingState.profile.photoURL ? '👤' : ''}
      </div>
      <div class="dating-user-name">${escHtml(DatingState.profile.name)}</div>
      <button onclick="datingLogout()" class="dating-btn-text" style="margin-left:auto;font-size:0.7rem">Wyloguj</button>
    </div>

    <div class="dating-tabs">
      <button class="dating-tab ${DatingState.subView === 'deck' ? 'active' : ''}"
              onclick="datingSwitch('deck')">Odkryj</button>
      <button class="dating-tab ${DatingState.subView === 'matches' ? 'active' : ''}"
              onclick="datingSwitch('matches')">
        💘 Matche ${matchCount > 0 ? `<span class="dating-badge">${matchCount}</span>` : ''}
      </button>
      <button class="dating-tab ${DatingState.subView === 'chat' ? 'active' : ''}"
              onclick="datingSwitch('chat')">Czat</button>
    </div>

    <div id="dating-subview"></div>`;

  renderDatingSubView();
}

async function datingSwitch(view) {
  if (DatingState.chatUnsub && view !== 'chat') {
    DatingState.chatUnsub();
    DatingState.chatUnsub = null;
  }
  DatingState.subView = view;
  if (view !== 'chat') DatingState.activeMatchId = null;

  document.querySelectorAll('.dating-tab').forEach(t => {
    t.classList.toggle('active', t.textContent.trim().startsWith(
      view === 'deck' ? 'Odkryj' : view === 'matches' ? '💘' : 'Czat'
    ));
  });
  renderDatingSubView();
}

function renderDatingSubView() {
  const container = document.getElementById('dating-subview');
  if (!container) return;
  switch (DatingState.subView) {
    case 'deck':    renderDeck(container); break;
    case 'matches': renderMatches(container); break;
    case 'chat':    renderChat(container); break;
  }
}

// ============================================
// SWIPE DECK
// ============================================

async function renderDeck(container) {
  container.innerHTML = `<div class="dating-loading">Ładuję profile…</div>`;
  await loadDeck();
  buildDeckHTML(container);
}

async function loadDeck() {
  const uid = DatingState.user.uid;
  DatingState.swipedUIDs = new Set();

  // Get profiles I already swiped
  const swipesSnap = await db.collection('swipes').where('from', '==', uid).get();
  swipesSnap.forEach(d => DatingState.swipedUIDs.add(d.data().to));

  // Get all profiles
  const snap = await db.collection('profiles').orderBy('createdAt', 'desc').limit(200).get();
  DatingState.deck = snap.docs
    .map(d => ({ uid: d.id, ...d.data() }))
    .filter(p => p.uid !== uid && !DatingState.swipedUIDs.has(p.uid));
  DatingState.deckIdx = 0;
}

function buildDeckHTML(container) {
  const deck = DatingState.deck;
  if (deck.length === 0) {
    container.innerHTML = `
      <div class="dating-empty">
        <div style="font-size:3rem">✨</div>
        <div style="margin-top:1rem;font-size:1.1rem;color:var(--pergamin)">To wszyscy!</div>
        <div style="color:var(--szary);font-size:0.9rem;margin-top:0.5rem">
          Wróć za chwilę — może ktoś nowy dołączy.
        </div>
      </div>`;
    return;
  }

  const visible = deck.slice(0, Math.min(3, deck.length));
  const cards = visible.map((p, i) => {
    const isTop = i === 0;
    const bgStyle = p.photoURL
      ? `background-image:url('${p.photoURL}');background-size:cover;background-position:center top`
      : `background:linear-gradient(135deg,var(--noir-3),var(--noir-4))`;
    return `
      <div class="dating-card ${isTop ? 'is-top' : ''}"
           data-uid="${p.uid}" data-idx="${i}"
           style="${bgStyle};z-index:${10 - i};transform:scale(${1 - i * 0.03}) translateY(${i * 10}px)">
        <div class="dating-card-overlay">
          <div class="dating-card-name">${escHtml(p.name)}${p.age ? `, ${p.age}` : ''}</div>
          <div class="dating-card-intention">${p.intention || 'Rozmowa'}</div>
          <div class="dating-card-bio">${escHtml(p.bio || '')}</div>
        </div>
        <div class="dating-swipe-indicator left" id="swipe-ind-left-${i}">✕</div>
        <div class="dating-swipe-indicator right" id="swipe-ind-right-${i}">❤</div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="dating-stack" id="dating-stack">
      ${cards}
    </div>
    <div class="dating-actions">
      <button class="dating-action-btn dating-action-no" onclick="datingSwipeLeft()">✕</button>
      <button class="dating-action-btn dating-action-yes" onclick="datingSwipeRight()">❤</button>
    </div>
    <div class="dating-deck-info">${deck.length} profil${deck.length === 1 ? '' : deck.length < 5 ? 'e' : 'i'} do odkrycia</div>`;

  initSwipeGestures();
}

function initSwipeGestures() {
  const card = document.querySelector('.dating-card.is-top');
  if (!card) return;

  let startX = 0, startY = 0, currentX = 0, isDragging = false;

  function onStart(e) {
    isDragging = true;
    startX = e.touches ? e.touches[0].clientX : e.clientX;
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    card.style.transition = 'none';
  }

  function onMove(e) {
    if (!isDragging) return;
    currentX = (e.touches ? e.touches[0].clientX : e.clientX) - startX;
    const currentY = (e.touches ? e.touches[0].clientY : e.clientY) - startY;
    const rotate = currentX * 0.08;
    const threshold = 60;

    card.style.transform = `translateX(${currentX}px) translateY(${currentY * 0.3}px) rotate(${rotate}deg)`;

    const indLeft  = card.querySelector('.dating-swipe-indicator.left');
    const indRight = card.querySelector('.dating-swipe-indicator.right');
    if (indLeft)  indLeft.style.opacity  = currentX < -threshold ? Math.min(1, Math.abs(currentX) / 150) : '0';
    if (indRight) indRight.style.opacity = currentX >  threshold ? Math.min(1, Math.abs(currentX) / 150) : '0';

    if (e.touches) e.preventDefault();
  }

  function onEnd() {
    if (!isDragging) return;
    isDragging = false;
    card.style.transition = 'transform 300ms ease, opacity 300ms ease';

    const threshold = 100;
    if (currentX > threshold)       datingSwipeRight();
    else if (currentX < -threshold) datingSwipeLeft();
    else {
      card.style.transform = '';
      const indLeft  = card.querySelector('.dating-swipe-indicator.left');
      const indRight = card.querySelector('.dating-swipe-indicator.right');
      if (indLeft)  indLeft.style.opacity  = '0';
      if (indRight) indRight.style.opacity = '0';
    }
  }

  card.addEventListener('touchstart', onStart, { passive: true });
  card.addEventListener('touchmove',  onMove,  { passive: false });
  card.addEventListener('touchend',   onEnd);
  card.addEventListener('mousedown',  onStart);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup',   onEnd);
}

async function datingSwipeRight() {
  await doSwipe('right');
}

async function datingSwipeLeft() {
  await doSwipe('left');
}

async function doSwipe(direction) {
  const deck = DatingState.deck;
  if (deck.length === 0) return;

  const target = deck[DatingState.deckIdx];
  if (!target) return;

  const card = document.querySelector('.dating-card.is-top');
  if (card) {
    const flyX = direction === 'right' ? window.innerWidth + 200 : -window.innerWidth - 200;
    card.style.transition = 'transform 350ms ease, opacity 350ms ease';
    card.style.transform  = `translateX(${flyX}px) rotate(${direction === 'right' ? 25 : -25}deg)`;
    card.style.opacity    = '0';
  }

  // Save swipe
  try {
    await db.collection('swipes').doc(`${DatingState.user.uid}_${target.uid}`).set({
      from: DatingState.user.uid,
      to:   target.uid,
      direction,
      at:   firebase.firestore.FieldValue.serverTimestamp()
    });

    if (direction === 'right') {
      await checkAndCreateMatch(target.uid, target);
    }
  } catch (e) {
    console.error('Swipe save failed:', e);
  }

  // Remove from deck after animation
  setTimeout(() => {
    DatingState.deck.shift();
    const container = document.getElementById('dating-subview');
    if (container) buildDeckHTML(container);
  }, 350);
}

async function checkAndCreateMatch(targetUid, targetProfile) {
  // Check if target swiped right on me
  const reverseSwipe = await db.collection('swipes')
    .doc(`${targetUid}_${DatingState.user.uid}`)
    .get();

  if (reverseSwipe.exists && reverseSwipe.data().direction === 'right') {
    const matchId = [DatingState.user.uid, targetUid].sort().join('_');
    await db.collection('matches').doc(matchId).set({
      users:     [DatingState.user.uid, targetUid],
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastMessage: '',
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    showMatchModal(targetProfile);
  }
}

function showMatchModal(profile) {
  const modal = document.getElementById('dating-match-modal');
  if (!modal) return;
  modal.querySelector('.match-their-photo').style.backgroundImage =
    `url('${profile.photoURL || ''}')`;
  modal.querySelector('.match-their-name').textContent = profile.name;
  modal.querySelector('.match-own-photo').style.backgroundImage =
    `url('${DatingState.profile.photoURL || ''}')`;
  modal.classList.add('open');
}

function closeMatchModal() {
  const modal = document.getElementById('dating-match-modal');
  if (modal) modal.classList.remove('open');
}

function goToMatchChat() {
  closeMatchModal();
  datingSwitch('matches');
}

// ============================================
// MATCHES
// ============================================

function subscribeMatches(uid) {
  if (DatingState.matchesUnsub) DatingState.matchesUnsub();
  DatingState.matchesUnsub = db.collection('matches')
    .where('users', 'array-contains', uid)
    .orderBy('lastMessageAt', 'desc')
    .onSnapshot(async (snap) => {
      const matches = [];
      for (const doc of snap.docs) {
        const data = doc.data();
        const otherUid = data.users.find(u => u !== uid);
        const pDoc = await db.collection('profiles').doc(otherUid).get();
        if (pDoc.exists) {
          matches.push({
            matchId: doc.id,
            profile: { uid: otherUid, ...pDoc.data() },
            lastMessage: data.lastMessage || '',
            lastMessageAt: data.lastMessageAt?.toDate() || new Date(),
          });
        }
      }
      DatingState.matches = matches;
      if (DatingState.subView === 'matches') {
        const container = document.getElementById('dating-subview');
        if (container) renderMatches(container);
      }
      // Update badge
      const badge = document.querySelector('.dating-badge');
      if (badge) badge.textContent = matches.length;
    }, () => {});
}

function renderMatches(container) {
  if (DatingState.matches.length === 0) {
    container.innerHTML = `
      <div class="dating-empty">
        <div style="font-size:3rem">💘</div>
        <div style="margin-top:1rem;color:var(--pergamin)">Brak matchów</div>
        <div style="color:var(--szary);font-size:0.9rem;margin-top:0.5rem">
          Swipe'uj w zakładce Odkryj
        </div>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="dating-matches-list">
      ${DatingState.matches.map(m => `
        <div class="dating-match-item" onclick="datingOpenChat('${m.matchId}','${m.profile.uid}')">
          <div class="dating-match-avatar"
               style="background-image:url('${m.profile.photoURL || ''}')">
            ${!m.profile.photoURL ? '👤' : ''}
          </div>
          <div class="dating-match-info">
            <div class="dating-match-name">${escHtml(m.profile.name)}</div>
            <div class="dating-match-last">${m.lastMessage ? escHtml(m.lastMessage) : '✨ Nowy match! Napisz pierwszy.'}</div>
          </div>
        </div>`).join('')}
    </div>`;
}

// ============================================
// CHAT
// ============================================

async function datingOpenChat(matchId, profileUid) {
  DatingState.activeMatchId = matchId;
  const match = DatingState.matches.find(m => m.matchId === matchId);
  DatingState.activeMatchProfile = match?.profile || null;

  if (!DatingState.activeMatchProfile) {
    const pDoc = await db.collection('profiles').doc(profileUid).get();
    if (pDoc.exists) DatingState.activeMatchProfile = { uid: profileUid, ...pDoc.data() };
  }

  DatingState.subView = 'chat';
  document.querySelectorAll('.dating-tab').forEach(t =>
    t.classList.toggle('active', t.textContent.trim() === 'Czat'));
  const container = document.getElementById('dating-subview');
  if (container) renderChat(container);
}

function renderChat(container) {
  if (!DatingState.activeMatchId) {
    container.innerHTML = `
      <div class="dating-empty">
        <div style="color:var(--szary)">Wybierz match z listy</div>
        <button class="dating-btn-outline" onclick="datingSwitch('matches')"
                style="margin-top:1rem">Pokaż Matche</button>
      </div>`;
    return;
  }

  const p = DatingState.activeMatchProfile;
  container.innerHTML = `
    <div class="chat-header">
      <button onclick="datingSwitch('matches')" class="chat-back">‹</button>
      <div class="chat-header-avatar" style="background-image:url('${p?.photoURL || ''}')">
        ${!p?.photoURL ? '👤' : ''}
      </div>
      <div class="chat-header-name">${escHtml(p?.name || '')}</div>
    </div>
    <div class="chat-messages" id="chat-messages">
      <div class="dating-loading">Ładuję wiadomości…</div>
    </div>
    <div class="chat-input-row">
      <input class="chat-input" id="chat-msg-input" type="text" maxlength="500"
             placeholder="Wiadomość…"
             onkeydown="if(event.key==='Enter')datingSendMessage()">
      <button class="chat-send-btn" onclick="datingSendMessage()">→</button>
    </div>`;

  listenMessages(DatingState.activeMatchId);
}

function listenMessages(matchId) {
  if (DatingState.chatUnsub) { DatingState.chatUnsub(); DatingState.chatUnsub = null; }

  DatingState.chatUnsub = db.collection('matches').doc(matchId).collection('msgs')
    .orderBy('at', 'asc')
    .onSnapshot((snap) => {
      const myUid = DatingState.user.uid;
      const container = document.getElementById('chat-messages');
      if (!container) return;

      if (snap.empty) {
        container.innerHTML = `
          <div class="chat-start-msg">Dopiero zaczęliście 💘<br>Napisz coś pierwsz${myUid < DatingState.activeMatchId.split('_')[0] ? 'y' : 'a'}!</div>`;
        return;
      }

      container.innerHTML = snap.docs.map(d => {
        const data = d.data();
        const isMine = data.from === myUid;
        const time = data.at?.toDate().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) || '';
        return `
          <div class="chat-bubble ${isMine ? 'mine' : 'theirs'}">
            <div class="chat-bubble-text">${escHtml(data.text)}</div>
            <div class="chat-bubble-time">${time}</div>
          </div>`;
      }).join('');

      container.scrollTop = container.scrollHeight;
    }, (e) => console.error('Chat listen error:', e));
}

async function datingSendMessage() {
  const input = document.getElementById('chat-msg-input');
  const text = input?.value?.trim();
  if (!text || !DatingState.activeMatchId) return;

  input.value = '';
  const matchId = DatingState.activeMatchId;
  const uid = DatingState.user.uid;

  try {
    const ts = firebase.firestore.FieldValue.serverTimestamp();
    await db.collection('matches').doc(matchId).collection('msgs').add({
      from: uid, text, at: ts
    });
    await db.collection('matches').doc(matchId).update({
      lastMessage: text, lastMessageAt: ts
    });
  } catch (e) {
    showToast('Błąd wysyłania — sprawdź połączenie');
  }
}

// ============================================
// EXPOSE GLOBALS (overrides app.js)
// ============================================

Object.assign(window, {
  renderSlowDating,
  datingLoginGoogle, datingLoginEmail, datingSignup, datingLogout,
  datingPreviewPhoto, datingToggleIntention, datingSaveProfile,
  datingSwitch, datingSwipeLeft, datingSwipeRight,
  datingOpenChat, datingSendMessage,
  closeMatchModal, goToMatchChat,
});

// ============================================
// BOOT — init Firebase when DOM ready
// ============================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFirebase);
} else {
  initFirebase();
}

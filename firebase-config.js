// ============================================
// CIEŃ FESTIWAL 2026 — Auth Config
// ============================================
//
// GOOGLE SIGN-IN ✓ — działa, używa client ID z projektu SACRUM
//   ⚠ Jeśli pojawi się błąd "origin mismatch" po deploy na Netlify:
//   → console.cloud.google.com → projekt scenic-cedar-268716
//   → APIs & Services → Credentials → kliknij OAuth 2.0 Client ID
//   → Authorized JavaScript Origins → dodaj: https://cien-festiwal-2026.netlify.app
//
// FACEBOOK SIGN-IN ✓ — App ID wklejony, kod gotowy
//   ⚠ Aby działało dla uczestników (nie tylko admina):
//   → developers.facebook.com/apps/937795249248975
//   → Settings → Basic → App Domains → dodaj: cien-festiwal-2026.netlify.app
//   → Facebook Login → Settings → Valid OAuth Redirect URIs → dodaj domenę
//   → App Review → zmień status na LIVE
//
// EMAIL SIGN-IN ✓ — działa od razu (localStorage fallback, bez backendu)
//
// FIREBASE (opcjonalnie — tylko do Firestore sync slow dating):
//   → firebase.google.com → projekt cien-festiwal-2026 → Authentication → Enable Email
//   → Project Settings → Add web app → skopiuj config poniżej
// ============================================

// Facebook App ID (ten sam co Matejuk AI Publisher)
window.CIEN_FB_APP_ID = '937795249248975';

// Firebase config (opcjonalny — zostaw REPLACE_ME jeśli nie używasz Firestore):
const FIREBASE_CONFIG = {
  apiKey:            "REPLACE_ME",
  authDomain:        "REPLACE_ME.firebaseapp.com",
  projectId:         "REPLACE_ME",
  storageBucket:     "REPLACE_ME.appspot.com",
  messagingSenderId: "REPLACE_ME",
  appId:             "REPLACE_ME"
};

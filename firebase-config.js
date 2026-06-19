// ============================================
// FIREBASE CONFIG — CIEŃ Festiwal 2026
// ============================================
// 1. Idź do https://console.firebase.google.com/
// 2. Utwórz projekt "cien-festiwal-2026"
// 3. Project Settings → Your apps → Add app → Web
// 4. Wklej swój config poniżej
// 5. W Authentication → Sign-in method: włącz Google + Email/Password
// 6. W Firestore → Create database (production mode)
// 7. W Storage → Get started
// ============================================
// FIRESTORE SECURITY RULES (wklej w Console → Firestore → Rules):
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /profiles/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
    match /swipes/{swipeId} {
      allow read: if request.auth != null && resource.data.from == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.from == request.auth.uid;
    }
    match /matches/{matchId} {
      allow read: if request.auth != null && request.auth.uid in resource.data.users;
      allow create, update: if request.auth != null;
    }
    match /matches/{matchId}/msgs/{msgId} {
      allow read, create: if request.auth != null &&
        request.auth.uid in get(/databases/$(database)/documents/matches/$(matchId)).data.users;
    }
  }
}
*/
// STORAGE RULES (wklej w Console → Storage → Rules):
/*
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profiles/{uid}/photo {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
*/
// ============================================

const FIREBASE_CONFIG = {
  apiKey:            "REPLACE_ME",
  authDomain:        "REPLACE_ME.firebaseapp.com",
  projectId:         "REPLACE_ME",
  storageBucket:     "REPLACE_ME.appspot.com",
  messagingSenderId: "REPLACE_ME",
  appId:             "REPLACE_ME"
};

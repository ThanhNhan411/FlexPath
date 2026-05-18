import { initializeApp } from 'firebase/app';
import { 
  getAuth,
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// Read Firebase configurations from environment variables, fallback to project defaults
const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0499809255",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:654813650039:web:663a96fca672099477ba72",
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBliVif20UYTGp0Fq2Z-r2NRjgyL6L5Gz0",
  authDomain: typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
    ? window.location.hostname
    : (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0499809255.firebaseapp.com"),
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-724aaa22-5b41-42c4-a3e1-80f0ff203059",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0499809255.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "654813650039",
  measurementId: ""
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const loginWithGoogle = async () => {
  try {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
    const isInApp = /FBAN|FBAV|Instagram|Zalo|Messenger/i.test(userAgent); // detects Zalo, FB, Instagram WebViews

    if (isMobile || isSafari || isInApp) {
      await signInWithRedirect(auth, googleProvider);
    } else {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};
